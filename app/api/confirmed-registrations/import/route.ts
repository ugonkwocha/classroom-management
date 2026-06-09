import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getActiveSessionUser } from '@/lib/auth';
import { checkPermission, PERMISSIONS } from '@/lib/permissions';
import {
  ensureConfirmedEnrollment,
  ensurePaidFamily,
  ensurePaidStudent,
  PaidRegistrationChildInput,
  requireText,
  toOptionalText,
  toPositiveInt,
} from '@/lib/paid-registration-utils';
import { syncPaidCustomerToCrm } from '@/lib/fluent-crm-sync';

type DuplicatePaymentContext = {
  familyId?: string | null;
  familyName?: string | null;
  familyIsArchived?: boolean;
  studentId?: string | null;
  studentName: string;
  programName: string;
  batchNumber: number;
};

class DuplicatePaymentError extends Error {
  context: DuplicatePaymentContext;

  constructor(message: string, context: DuplicatePaymentContext) {
    super(message);
    this.name = 'DuplicatePaymentError';
    this.context = context;
  }
}

export async function POST(request: NextRequest) {
  const sessionUser = await getActiveSessionUser(request);
  if (!sessionUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    checkPermission(sessionUser.role, PERMISSIONS.IMPORT_CONFIRMED_REGISTRATION);
  } catch {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const data = await request.json();
    const sourceFormId = requireText(data.sourceFormId, 'Fluent Form ID');
    const sourceSubmissionId = requireText(data.sourceSubmissionId, 'Submission ID');
    const mapping = await prisma.fluentFormMapping.findUnique({
      where: { formId: sourceFormId },
      include: {
        program: true,
        optionMappings: true,
      },
    });

    if (!mapping?.isActive) {
      return NextResponse.json(
        { error: 'This Fluent Form does not have an active mapping in the CMS' },
        { status: 400 }
      );
    }

    const existingImport = await prisma.confirmedRegistrationImport.findFirst({
      where: {
        source: 'FLUENT_FORM_IMPORT',
        sourceFormId,
        sourceSubmissionId,
      },
      include: {
        family: true,
        children: true,
        paymentRecords: true,
        paymentProofs: true,
      },
    });

    if (existingImport) {
      return NextResponse.json({ import: existingImport, duplicate: true });
    }

    const children = Array.isArray(data.children) ? (data.children as PaidRegistrationChildInput[]) : [];
    if (children.length === 0) {
      return NextResponse.json({ error: 'At least one paid child is required' }, { status: 400 });
    }

    const activeOptionMappings = mapping.optionMappings.filter((option) => option.isActive);
    if (activeOptionMappings.length === 0) {
      return NextResponse.json(
        { error: `Form ${sourceFormId} has no active date/batch option mappings. Add option mappings before importing.` },
        { status: 400 }
      );
    }

    const parentFirstName = requireText(data.parentFirstName, 'Parent first name');
    const parentLastName = requireText(data.parentLastName, 'Parent last name');
    const confirmedAmount = toPositiveInt(data.confirmedAmount, 0);
    if (confirmedAmount <= 0) {
      return NextResponse.json({ error: 'Confirmed amount must be greater than zero' }, { status: 400 });
    }

    const resolvedChildren: PaidRegistrationChildInput[] = [];
    const requestedEnrollmentKeys = new Set<string>();

    for (const child of children) {
      const childProgramId = child.programId || mapping.programId;
      const sourceOptionText = toOptionalText((child as any).sourceOptionText);
      const mappedOption = sourceOptionText
        ? activeOptionMappings.find((option) => option.sourceOptionText === sourceOptionText)
        : null;
      const childBatch = mappedOption?.batchNumber || toPositiveInt(child.batchNumber, 0);

      if (!childBatch) {
        return NextResponse.json(
          { error: `No mapped CMS batch was provided for ${child.firstName} ${child.lastName}` },
          { status: 400 }
        );
      }

      if (sourceOptionText && !mappedOption) {
        return NextResponse.json(
          { error: `The selected form option "${sourceOptionText}" is not mapped to a CMS batch yet.` },
          { status: 400 }
        );
      }

      const childKey = [
        childProgramId,
        childBatch,
        child.existingStudentId || '',
        requireText(child.firstName, 'Child first name').toLowerCase(),
        requireText(child.lastName, 'Child last name').toLowerCase(),
        child.dateOfBirth || '',
        toOptionalText(child.email) || '',
      ].join('|');

      if (requestedEnrollmentKeys.has(childKey)) continue;
      requestedEnrollmentKeys.add(childKey);

      resolvedChildren.push({
        ...child,
        programId: childProgramId,
        batchNumber: childBatch,
        sourceOptionText,
        priceType: child.priceType || data.priceType || 'FULL_PRICE',
      });
    }

    if (resolvedChildren.length === 0) {
      return NextResponse.json({ error: 'No unique paid enrollment batch was found to import' }, { status: 400 });
    }

    const removedDuplicateEnrollmentRequests = resolvedChildren.length < children.length;

    const result = await prisma.$transaction(async (tx) => {
      const family = await ensurePaidFamily(
        tx,
        {
          firstName: parentFirstName,
          lastName: parentLastName,
          email: toOptionalText(data.parentEmail),
          phone: toOptionalText(data.parentPhone),
          phoneCountryCode: toOptionalText(data.parentPhoneCountryCode) || 'NG',
        },
        toOptionalText(data.familyId),
        { forceCreate: Boolean(data.forceCreateFamily) }
      );

      const registrationImport = await tx.confirmedRegistrationImport.create({
        data: {
          source: 'FLUENT_FORM_IMPORT',
          sourceFormId,
          sourceSubmissionId,
          formMappingId: mapping.id,
          parentFirstName,
          parentLastName,
          parentEmail: toOptionalText(data.parentEmail),
          parentPhone: toOptionalText(data.parentPhone),
          parentPhoneCountryCode: toOptionalText(data.parentPhoneCountryCode) || null,
          programId: mapping.programId,
          defaultBatch: toPositiveInt(data.defaultBatch, mapping.defaultBatch),
          expectedAmount: data.expectedAmount !== undefined ? toPositiveInt(data.expectedAmount, 0) : null,
          confirmedAmount,
          paymentProofNote: toOptionalText(data.paymentProofNote),
          rawPayload: data.rawPayload || data,
          crmSyncStatus: 'PENDING',
          crmTag: mapping.paidTag,
          familyId: family.id,
          importedById: sessionUser.userId,
        },
      });

      const paymentRecords = [];
      const batchNumbers = new Set<number>();
      const processedEnrollmentKeys = new Set<string>();
      const fallbackPriceAmount = Math.round(confirmedAmount / resolvedChildren.length);

      for (const child of resolvedChildren) {
        const childProgramId = child.programId || mapping.programId;
        const childBatch = toPositiveInt(child.batchNumber, 0);

        const priceType = child.priceType || data.priceType || 'FULL_PRICE';
        const priceAmount = removedDuplicateEnrollmentRequests
          ? fallbackPriceAmount
          : toPositiveInt(child.priceAmount, fallbackPriceAmount);
        batchNumbers.add(childBatch);
        const student = await ensurePaidStudent(tx, family, child);

        const processedKey = `${student.id}:${childProgramId}:${childBatch}`;
        if (processedEnrollmentKeys.has(processedKey)) continue;
        processedEnrollmentKeys.add(processedKey);

        const existingEnrollment = await tx.programEnrollment.findFirst({
          where: {
            studentId: student.id,
            programId: childProgramId,
            batchNumber: childBatch,
            status: { not: 'DROPPED' },
          },
        });

        if (existingEnrollment) {
          const existingPaymentRecord = await tx.enrollmentPaymentRecord.findFirst({
            where: { enrollmentId: existingEnrollment.id },
            include: {
              family: true,
              student: {
                include: {
                  family: true,
                },
              },
              enrollment: {
                include: {
                  program: true,
                },
              },
            },
          });

          if (existingPaymentRecord) {
            const studentName = `${child.firstName} ${child.lastName}`;
            const resolvedFamily = existingPaymentRecord.family || existingPaymentRecord.student.family || null;
            const familyLabel = resolvedFamily
              ? `${resolvedFamily.displayName}${resolvedFamily.isArchived ? ' (archived)' : ''}`
              : 'a missing family record';
            throw new DuplicatePaymentError(
              `A confirmed payment already exists for ${studentName} in ${existingPaymentRecord.enrollment.program.name} Batch ${childBatch}. Existing family: ${familyLabel}.`,
              {
                familyId: resolvedFamily?.id || null,
                familyName: resolvedFamily?.displayName || null,
                familyIsArchived: resolvedFamily?.isArchived || false,
                studentId: existingPaymentRecord.studentId,
                studentName,
                programName: existingPaymentRecord.enrollment.program.name,
                batchNumber: childBatch,
              }
            );
          }
        }

        const enrollment = await ensureConfirmedEnrollment(tx, {
          studentId: student.id,
          programId: childProgramId,
          batchNumber: childBatch,
          priceType,
          priceAmount,
        });

        await tx.student.update({
          where: { id: student.id },
          data: { paymentStatus: 'CONFIRMED' },
        });

        await tx.confirmedRegistrationImportChild.create({
          data: {
            importId: registrationImport.id,
            firstName: child.firstName,
            lastName: child.lastName,
            email: toOptionalText(child.email),
            phone: toOptionalText(child.phone),
            phoneCountryCode: toOptionalText(child.phoneCountryCode),
            dateOfBirth: child.dateOfBirth ? new Date(child.dateOfBirth) : null,
            courseId: toOptionalText(child.courseId),
            programId: childProgramId,
            batchNumber: childBatch,
            priceType,
            priceAmount,
            studentId: student.id,
            enrollmentId: enrollment.id,
          },
        });

        const paymentRecord = await tx.enrollmentPaymentRecord.create({
          data: {
            source: 'FLUENT_FORM_IMPORT',
            familyId: family.id,
            studentId: student.id,
            enrollmentId: enrollment.id,
            importId: registrationImport.id,
            amountConfirmed: priceAmount,
            paymentProofNote: toOptionalText(data.paymentProofNote),
            crmSyncStatus: 'PENDING',
            crmTag: mapping.paidTag,
            confirmedById: sessionUser.userId,
          },
        });
        paymentRecords.push(paymentRecord);
      }

      await tx.importActivityLog.create({
        data: {
          importId: registrationImport.id,
          action: 'IMPORT_CREATED',
          message: `Imported ${resolvedChildren.length} paid enrollment${resolvedChildren.length === 1 ? '' : 's'} from Fluent Forms`,
          actorId: sessionUser.userId,
        },
      });

      if (batchNumbers.size > 0) {
        await tx.confirmedRegistrationImport.update({
          where: { id: registrationImport.id },
          data: { defaultBatch: [...batchNumbers][0] },
        });
      }

      return { registrationImport, paymentRecords };
    });

    const crmResult = await syncPaidCustomerToCrm({
      parentEmail: data.parentEmail,
      parentPhone: data.parentPhone,
      parentFirstName,
      parentLastName,
      paidTag: mapping.paidTag,
      leadTag: mapping.leadTag,
      removeLeadTagOnPaid: mapping.removeLeadTagOnPaid,
    });

    const updatedImport = await prisma.confirmedRegistrationImport.update({
      where: { id: result.registrationImport.id },
      data: {
        crmSyncStatus: crmResult.status,
        crmContactId: crmResult.contactId || null,
        crmError: crmResult.error || null,
      },
      include: {
        family: true,
        children: true,
        paymentRecords: true,
        paymentProofs: true,
      },
    });

    await prisma.enrollmentPaymentRecord.updateMany({
      where: { id: { in: result.paymentRecords.map((record) => record.id) } },
      data: {
        crmSyncStatus: crmResult.status,
        crmContactId: crmResult.contactId || null,
        crmError: crmResult.error || null,
      },
    });

    return NextResponse.json({ import: updatedImport, duplicate: false }, { status: 201 });
  } catch (error) {
    if (error instanceof DuplicatePaymentError) {
      return NextResponse.json(
        {
          error: error.message,
          duplicatePayment: true,
          ...error.context,
        },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to import confirmed registration' },
      { status: 500 }
    );
  }
}
