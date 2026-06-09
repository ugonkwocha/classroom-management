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
        toOptionalText(data.familyId)
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

      for (const child of children) {
        const childProgramId = child.programId || mapping.programId;
        const sourceOptionText = toOptionalText((child as any).sourceOptionText);
        const mappedOption = sourceOptionText
          ? activeOptionMappings.find((option) => option.sourceOptionText === sourceOptionText)
          : null;
        const childBatch = mappedOption?.batchNumber || toPositiveInt(child.batchNumber, 0);

        if (!childBatch) {
          throw new Error(`No mapped CMS batch was provided for ${child.firstName} ${child.lastName}`);
        }

        if (sourceOptionText && !mappedOption) {
          throw new Error(`The selected form option "${sourceOptionText}" is not mapped to a CMS batch yet.`);
        }

        const priceType = child.priceType || data.priceType || 'FULL_PRICE';
        const priceAmount = toPositiveInt(child.priceAmount, Math.round(confirmedAmount / children.length));
        batchNumbers.add(childBatch);
        const student = await ensurePaidStudent(tx, family, child);
        const enrollment = await ensureConfirmedEnrollment(tx, {
          studentId: student.id,
          programId: childProgramId,
          batchNumber: childBatch,
          priceType,
          priceAmount,
        });
        const existingPaymentRecord = await tx.enrollmentPaymentRecord.findFirst({
          where: { enrollmentId: enrollment.id },
        });

        if (existingPaymentRecord) {
          throw new Error(`A confirmed payment already exists for ${child.firstName} ${child.lastName} in this program and batch`);
        }

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
          message: `Imported ${children.length} paid child${children.length === 1 ? '' : 'ren'} from Fluent Forms`,
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
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to import confirmed registration' },
      { status: 500 }
    );
  }
}
