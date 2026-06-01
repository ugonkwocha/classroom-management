import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getActiveSessionUser } from '@/lib/auth';
import { checkPermission, PERMISSIONS } from '@/lib/permissions';
import {
  ensureConfirmedEnrollment,
  ensurePaidStudent,
  PaidRegistrationChildInput,
  requireText,
  toOptionalText,
  toPositiveInt,
} from '@/lib/paid-registration-utils';
import { syncPaidCustomerToCrm } from '@/lib/fluent-crm-sync';

type RouteParams = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: RouteParams) {
  const sessionUser = await getActiveSessionUser(request);
  if (!sessionUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    checkPermission(sessionUser.role, PERMISSIONS.CREATE_EXISTING_FAMILY_PAYMENT);
  } catch {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const { id: familyId } = await params;
    const data = await request.json();
    const programId = requireText(data.programId, 'Program');
    const batchNumber = toPositiveInt(data.batchNumber, 1);
    const confirmedAmount = toPositiveInt(data.confirmedAmount, 0);
    const children = Array.isArray(data.children) ? (data.children as PaidRegistrationChildInput[]) : [];

    if (confirmedAmount <= 0) {
      return NextResponse.json({ error: 'Confirmed amount must be greater than zero' }, { status: 400 });
    }

    if (children.length === 0) {
      return NextResponse.json({ error: 'At least one child is required' }, { status: 400 });
    }

    const result = await prisma.$transaction(async (tx) => {
      const family = await tx.family.findUnique({
        where: { id: familyId },
        include: { guardians: { orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }] } },
      });

      if (!family) throw new Error('Family not found');
      const records = [];

      for (const child of children) {
        const priceType = child.priceType || data.priceType || 'FULL_PRICE';
        const priceAmount = toPositiveInt(child.priceAmount, Math.round(confirmedAmount / children.length));
        const student = await ensurePaidStudent(tx, family, child);
        const enrollment = await ensureConfirmedEnrollment(tx, {
          studentId: student.id,
          programId: child.programId || programId,
          batchNumber: toPositiveInt(child.batchNumber, batchNumber),
          priceType,
          priceAmount,
        });
        const existingPaymentRecord = await tx.enrollmentPaymentRecord.findFirst({
          where: { enrollmentId: enrollment.id },
        });

        if (existingPaymentRecord) {
          throw new Error(`A confirmed payment already exists for this student, program, and batch`);
        }

        await tx.student.update({
          where: { id: student.id },
          data: { paymentStatus: 'CONFIRMED' },
        });

        const record = await tx.enrollmentPaymentRecord.create({
          data: {
            source: 'EXISTING_FAMILY',
            familyId,
            studentId: student.id,
            enrollmentId: enrollment.id,
            amountConfirmed: priceAmount,
            paymentProofNote: toOptionalText(data.paymentProofNote),
            crmSyncStatus: 'PENDING',
            crmTag: toOptionalText(data.paidTag),
            confirmedById: sessionUser.userId,
          },
        });
        records.push(record);
      }

      return { family, records };
    });

    const primaryGuardian = result.family.guardians.find((guardian) => guardian.isPrimary) || result.family.guardians[0];
    const crmResult = await syncPaidCustomerToCrm({
      parentEmail: primaryGuardian?.email,
      parentPhone: primaryGuardian?.phone,
      parentFirstName: primaryGuardian?.firstName,
      parentLastName: primaryGuardian?.lastName,
      paidTag: toOptionalText(data.paidTag),
    });

    await prisma.enrollmentPaymentRecord.updateMany({
      where: { id: { in: result.records.map((record) => record.id) } },
      data: {
        crmSyncStatus: crmResult.status,
        crmContactId: crmResult.contactId || null,
        crmError: crmResult.error || null,
      },
    });

    const records = await prisma.enrollmentPaymentRecord.findMany({
      where: { id: { in: result.records.map((record) => record.id) } },
      include: {
        student: true,
        enrollment: { include: { program: true, class: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ records, crmResult }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to add paid enrollment' },
      { status: 500 }
    );
  }
}
