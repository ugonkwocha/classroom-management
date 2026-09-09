import { NextRequest, NextResponse } from 'next/server';
import { Prisma, type UserRole } from '@prisma/client';
import prisma from '@/lib/prisma';
import { getActiveSessionUser } from '@/lib/auth';
import { checkPermission, PERMISSIONS } from '@/lib/permissions';
import { normalizeEmail, normalizePhone, buildFamilyDisplayName } from '@/lib/family-utils';
import { normalizeGuardianInput, primaryGuardianLegacyData } from '@/lib/family-server';
import { ensureConfirmedEnrollment, requireText, toOptionalText } from '@/lib/paid-registration-utils';
import { syncPaidCustomerToCrm } from '@/lib/fluent-crm-sync';
import { sendPaidEnrollmentConfirmation } from '@/lib/paid-enrollment-confirmation';
import { normalizeReturningEnrollmentRows, resolveReturningBatchConfiguration } from '@/lib/returning-customer-enrollment';

const PROFILE_FIELDS = new Set(['firstName', 'lastName', 'email', 'phone', 'phoneCountryCode', 'dateOfBirth']);

type GuardianInput = {
  id?: string | null;
  firstName?: string;
  lastName?: string;
  email?: string | null;
  phone?: string | null;
  phoneCountryCode?: string | null;
  updateFields?: string[];
};

type StudentInput = {
  key?: string;
  existingStudentId?: string | null;
  firstName?: string;
  lastName?: string;
  email?: string | null;
  phone?: string | null;
  phoneCountryCode?: string | null;
  dateOfBirth?: string | null;
  updateFields?: string[];
  fromWordPressHistory?: boolean;
};

type EnrollmentInput = {
  studentKey?: string;
  batchNumber?: number;
  priceType?: string;
  amountConfirmed?: number;
};

function canManageClosedBatches(role: UserRole) {
  return role === 'ADMIN' || role === 'SUPERADMIN';
}

function selectedFields(value: unknown) {
  return Array.isArray(value)
    ? value.filter((field): field is string => typeof field === 'string' && PROFILE_FIELDS.has(field))
    : [];
}

function parseOptionalDate(value: unknown) {
  if (!value) return null;
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) throw new Error('A student date of birth is invalid');
  return date;
}

async function runSerializable<T>(operation: () => Promise<T>, retries = 3): Promise<T> {
  for (let attempt = 1; attempt <= retries; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2034' && attempt < retries) {
        continue;
      }
      throw error;
    }
  }
  throw new Error('The enrollment could not be saved because another update happened at the same time');
}

export async function POST(request: NextRequest) {
  const sessionUser = await getActiveSessionUser(request);
  if (!sessionUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    checkPermission(sessionUser.role, PERMISSIONS.CREATE_RETURNING_CUSTOMER_ENROLLMENT);
  } catch {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const data = await request.json();
    const familyMode = data.familyMode === 'existing' ? 'existing' : 'new';
    const familyId = toOptionalText(data.familyId);
    const guardian = (data.guardian || {}) as GuardianInput;
    const students = Array.isArray(data.students) ? data.students as StudentInput[] : [];
    const enrollments = Array.isArray(data.enrollments) ? data.enrollments as EnrollmentInput[] : [];
    const programId = requireText(data.programId, 'Program');
    const paymentProofNote = toOptionalText(data.paymentProofNote)?.slice(0, 2000) || null;
    const closedBatchOverrideReason = toOptionalText(data.closedBatchOverrideReason)?.slice(0, 1000) || null;
    const sendConfirmation = data.sendConfirmation !== false;

    if (familyMode === 'existing' && !familyId) {
      return NextResponse.json({ error: 'Choose an existing family' }, { status: 400 });
    }
    if (students.length === 0 || enrollments.length === 0) {
      return NextResponse.json({ error: 'Add at least one child and paid enrollment' }, { status: 400 });
    }

    const studentByKey = new Map<string, StudentInput>();
    for (const student of students) {
      const key = requireText(student.key, 'Student row key');
      if (studentByKey.has(key)) return NextResponse.json({ error: 'A child was submitted more than once' }, { status: 400 });
      studentByKey.set(key, student);
    }

    const normalizedEnrollments = normalizeReturningEnrollmentRows(enrollments, new Set(studentByKey.keys()));

    const program = await prisma.program.findUnique({
      where: { id: programId },
      include: { batchSchedules: true },
    });
    if (!program) return NextResponse.json({ error: 'Program not found' }, { status: 404 });

    let batchConfiguration;
    try {
      batchConfiguration = resolveReturningBatchConfiguration(program, normalizedEnrollments, {
        canOverrideClosedBatch: canManageClosedBatches(sessionUser.role),
        overrideReason: closedBatchOverrideReason,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Invalid batch selection';
      const forbidden = message.startsWith('Only an admin or superadmin');
      return NextResponse.json({ error: message }, { status: forbidden ? 403 : 400 });
    }
    const { closedBatches, paidTags, schedules: batchSchedules, totalAmount } = batchConfiguration;

    const priceTypes = [...new Set(normalizedEnrollments.map((row) => row.priceType))];
    const activePricing = await prisma.pricingConfig.findMany({
      where: { priceType: { in: priceTypes }, isActive: true },
      select: { priceType: true },
    });
    if (activePricing.length !== priceTypes.length) throw new Error('One or more pricing options are no longer available');

    const result = await runSerializable(() => prisma.$transaction(async (tx) => {
      let family;
      let primaryGuardian;
      const changedGuardianFields = selectedFields(guardian.updateFields);

      if (familyMode === 'existing') {
        family = await tx.family.findUnique({
          where: { id: familyId! },
          include: { guardians: { orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }] } },
        });
        if (!family) throw new Error('Selected family was not found');
        if (family.isArchived) {
          if (!data.reactivateFamily || !canManageClosedBatches(sessionUser.role)) {
            throw new Error('This family is archived. An admin or superadmin must reactivate it before enrollment');
          }
          family = await tx.family.update({
            where: { id: family.id },
            data: { isArchived: false },
            include: { guardians: { orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }] } },
          });
        }
        primaryGuardian = guardian.id
          ? family.guardians.find((item) => item.id === guardian.id)
          : family.guardians.find((item) => item.isPrimary) || family.guardians[0];
        if (!primaryGuardian) throw new Error('The selected family does not have a guardian');

        if (changedGuardianFields.length > 0) {
          const next = normalizeGuardianInput({
            ...primaryGuardian,
            ...Object.fromEntries(changedGuardianFields.map((field) => [field, guardian[field as keyof GuardianInput]])),
            isPrimary: primaryGuardian.isPrimary,
            isActive: primaryGuardian.isActive,
          });
          primaryGuardian = await tx.parentGuardian.update({ where: { id: primaryGuardian.id }, data: next });
          await tx.student.updateMany({
            where: { familyId: family.id },
            data: primaryGuardianLegacyData(primaryGuardian),
          });
        }
      } else {
        const guardianData = normalizeGuardianInput({ ...guardian, isPrimary: true, isActive: true });
        if (!guardianData.firstName || !guardianData.lastName || (!guardianData.email && !guardianData.phone)) {
          throw new Error('Parent first name, last name, and an email or phone are required');
        }
        const contactMatch = await tx.family.findFirst({
          where: {
            guardians: {
              some: {
                OR: [
                  ...(guardianData.emailNormalized ? [{ emailNormalized: guardianData.emailNormalized }] : []),
                  ...(guardianData.phoneNormalized ? [{ phoneNormalized: guardianData.phoneNormalized }] : []),
                ],
              },
            },
          },
          select: { id: true, displayName: true, isArchived: true },
        });
        if (contactMatch) throw new Error(`A matching ${contactMatch.isArchived ? 'archived ' : ''}family already exists: ${contactMatch.displayName}`);
        family = await tx.family.create({
          data: {
            displayName: toOptionalText(data.familyDisplayName) || buildFamilyDisplayName(null, guardianData.lastName),
            guardians: { create: { ...guardianData, isPrimary: true } },
          },
          include: { guardians: { orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }] } },
        });
        primaryGuardian = family.guardians[0];
      }

      const resolvedStudents = new Map<string, { id: string; firstName: string; lastName: string; email: string | null; phone: string | null; phoneCountryCode: string | null; dateOfBirth: Date | null }>();
      const profileChanges: Array<{ studentId: string; fields: string[] }> = [];
      for (const [key, input] of studentByKey.entries()) {
        if (input.existingStudentId) {
          const existing = await tx.student.findUnique({ where: { id: input.existingStudentId } });
          if (!existing || existing.familyId !== family.id) throw new Error('A selected child does not belong to the chosen family');
          const fields = selectedFields(input.updateFields);
          const dataToUpdate: Record<string, unknown> = {};
          fields.forEach((field) => {
            if (field === 'dateOfBirth') dataToUpdate.dateOfBirth = parseOptionalDate(input.dateOfBirth);
            else dataToUpdate[field] = toOptionalText(input[field as keyof StudentInput]);
          });
          const updated = fields.length > 0
            ? await tx.student.update({ where: { id: existing.id }, data: dataToUpdate })
            : existing;
          resolvedStudents.set(key, updated);
          if (fields.length > 0) profileChanges.push({ studentId: existing.id, fields });
          continue;
        }

        const firstName = requireText(input.firstName, 'Child first name');
        const lastName = requireText(input.lastName, 'Child last name');
        const sameName = await tx.student.findFirst({
          where: {
            familyId: family.id,
            firstName: { equals: firstName, mode: 'insensitive' },
            lastName: { equals: lastName, mode: 'insensitive' },
          },
        });
        if (sameName) throw new Error(`${firstName} ${lastName} already exists in this family. Match the historical child to that CMS student.`);
        const created = await tx.student.create({
          data: {
            firstName,
            lastName,
            email: toOptionalText(input.email),
            phone: toOptionalText(input.phone),
            phoneCountryCode: input.phone ? toOptionalText(input.phoneCountryCode) || 'NG' : null,
            dateOfBirth: parseOptionalDate(input.dateOfBirth),
            isReturningStudent: Boolean(input.fromWordPressHistory),
            paymentStatus: 'CONFIRMED',
            familyId: family.id,
            ...primaryGuardianLegacyData(primaryGuardian),
          },
        });
        resolvedStudents.set(key, created);
      }

      for (const row of normalizedEnrollments) {
        const student = resolvedStudents.get(row.studentKey)!;
        const existingPayment = await tx.enrollmentPaymentRecord.findFirst({
          where: {
            studentId: student.id,
            enrollment: { programId, batchNumber: row.batchNumber },
          },
          select: { id: true },
        });
        if (existingPayment) {
          throw new Error(`A confirmed payment already exists for ${student.firstName} ${student.lastName} in ${program.name} Batch ${row.batchNumber}`);
        }
      }

      const uniqueTags = paidTags;
      const historicalReference = data.historicalReference && typeof data.historicalReference === 'object'
        ? {
            formId: toOptionalText(data.historicalReference.formId),
            submissionId: toOptionalText(data.historicalReference.submissionId),
            submittedAt: toOptionalText(data.historicalReference.submittedAt),
          }
        : null;
      const auditSnapshot = JSON.parse(JSON.stringify({
        workflow: 'RETURNING_CUSTOMER',
        historicalReference,
        profileChanges,
        closedBatchOverride: closedBatches.length > 0
          ? { batches: closedBatches, reason: closedBatchOverrideReason }
          : null,
      })) as Prisma.InputJsonValue;
      const registrationImport = await tx.confirmedRegistrationImport.create({
        data: {
          source: 'RETURNING_CUSTOMER',
          parentFirstName: primaryGuardian.firstName,
          parentLastName: primaryGuardian.lastName,
          parentEmail: primaryGuardian.email,
          parentPhone: primaryGuardian.phone,
          parentPhoneCountryCode: primaryGuardian.phoneCountryCode,
          programId,
          defaultBatch: normalizedEnrollments[0].batchNumber,
          confirmedAmount: totalAmount,
          paymentProofNote,
          rawPayload: auditSnapshot,
          crmSyncStatus: 'PENDING',
          crmTag: uniqueTags.join(', '),
          familyId: family.id,
          importedById: sessionUser.userId,
        },
      });

      const paymentRecords = [];
      for (const row of normalizedEnrollments) {
        const student = resolvedStudents.get(row.studentKey)!;
        const enrollment = await ensureConfirmedEnrollment(tx, {
          studentId: student.id,
          programId,
          batchNumber: row.batchNumber,
          priceType: row.priceType,
          priceAmount: row.amountConfirmed,
        });
        await tx.student.update({ where: { id: student.id }, data: { paymentStatus: 'CONFIRMED' } });
        await tx.confirmedRegistrationImportChild.create({
          data: {
            importId: registrationImport.id,
            firstName: student.firstName,
            lastName: student.lastName,
            email: student.email,
            phone: student.phone,
            phoneCountryCode: student.phoneCountryCode,
            dateOfBirth: student.dateOfBirth,
            programId,
            batchNumber: row.batchNumber,
            priceType: row.priceType,
            priceAmount: row.amountConfirmed,
            studentId: student.id,
            enrollmentId: enrollment.id,
          },
        });
        paymentRecords.push(await tx.enrollmentPaymentRecord.create({
          data: {
            source: 'RETURNING_CUSTOMER',
            familyId: family.id,
            studentId: student.id,
            enrollmentId: enrollment.id,
            importId: registrationImport.id,
            amountConfirmed: row.amountConfirmed,
            paymentProofNote,
            crmSyncStatus: 'PENDING',
            crmTag: batchSchedules.get(row.batchNumber)!.paidCrmTag!.trim(),
            confirmedById: sessionUser.userId,
          },
        }));
      }

      await tx.importActivityLog.create({
        data: {
          importId: registrationImport.id,
          action: 'RETURNING_CUSTOMER_ENROLLED',
          message: `Recorded ${paymentRecords.length} confirmed paid enrollment${paymentRecords.length === 1 ? '' : 's'} for a returning customer`,
          metadata: { totalAmount, paidTags: uniqueTags, closedBatches, closedBatchOverrideReason },
          actorId: sessionUser.userId,
        },
      });

      return { registrationImport, paymentRecords, family, guardian: primaryGuardian, totalAmount, paidTags: uniqueTags };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }));

    const crmResult = await syncPaidCustomerToCrm({
      parentEmail: result.guardian.email,
      parentPhone: result.guardian.phone,
      parentFirstName: result.guardian.firstName,
      parentLastName: result.guardian.lastName,
      paidTags: result.paidTags,
    });
    await prisma.$transaction([
      prisma.confirmedRegistrationImport.update({
        where: { id: result.registrationImport.id },
        data: { crmSyncStatus: crmResult.status, crmContactId: crmResult.contactId || null, crmError: crmResult.error || null },
      }),
      prisma.enrollmentPaymentRecord.updateMany({
        where: { id: { in: result.paymentRecords.map((record) => record.id) } },
        data: { crmSyncStatus: crmResult.status, crmContactId: crmResult.contactId || null, crmError: crmResult.error || null },
      }),
    ]);

    let confirmation = { success: false, skipped: true, error: null as string | null };
    if (sendConfirmation && result.guardian.email) {
      try {
        const sent = await sendPaidEnrollmentConfirmation(result.registrationImport.id, sessionUser.userId);
        confirmation = { success: sent.success, skipped: false, error: sent.error };
      } catch (error) {
        confirmation = { success: false, skipped: false, error: error instanceof Error ? error.message : 'Confirmation email failed' };
      }
    }

    return NextResponse.json({
      success: true,
      importId: result.registrationImport.id,
      familyId: result.family.id,
      paymentRecordIds: result.paymentRecords.map((record) => record.id),
      enrollmentCount: result.paymentRecords.length,
      totalAmount: result.totalAmount,
      crm: crmResult,
      confirmation,
    }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create returning customer enrollment';
    const duplicate = message.includes('already exists') || message.includes('already exists for') || message.includes('confirmed payment already exists');
    return NextResponse.json({ error: message, duplicate }, { status: duplicate ? 409 : 400 });
  }
}
