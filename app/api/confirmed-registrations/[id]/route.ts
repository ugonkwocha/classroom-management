import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getActiveSessionUser } from '@/lib/auth';
import { checkPermission, PERMISSIONS } from '@/lib/permissions';

type RouteParams = { params: Promise<{ id: string }> };

type PaymentCorrection = {
  paymentRecordId: string;
  priceType: string;
  amountConfirmed: number;
};

const MAX_ENROLLMENT_AMOUNT = 10000000;

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const sessionUser = await getActiveSessionUser(request);
  if (!sessionUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    checkPermission(sessionUser.role, PERMISSIONS.UPDATE_CONFIRMED_REGISTRATION);
  } catch {
    return NextResponse.json({ error: 'Only admins and superadmins can correct imported payments' }, { status: 403 });
  }

  try {
    const { id } = await params;
    const body = await request.json();
    const corrections = Array.isArray(body.records) ? body.records as PaymentCorrection[] : [];
    const paymentProofNote = typeof body.paymentProofNote === 'string'
      ? body.paymentProofNote.trim().slice(0, 2000)
      : null;

    if (corrections.length === 0) {
      return NextResponse.json({ error: 'At least one enrollment payment is required' }, { status: 400 });
    }

    const submittedIds = corrections.map((record) => record.paymentRecordId);
    if (submittedIds.some((recordId) => typeof recordId !== 'string' || !recordId.trim())) {
      return NextResponse.json({ error: 'Every payment record must have a valid ID' }, { status: 400 });
    }
    if (new Set(submittedIds).size !== submittedIds.length) {
      return NextResponse.json({ error: 'A payment record was submitted more than once' }, { status: 400 });
    }

    for (const correction of corrections) {
      if (
        typeof correction.priceType !== 'string' ||
        !correction.priceType.trim() ||
        !Number.isInteger(correction.amountConfirmed) ||
        correction.amountConfirmed <= 0 ||
        correction.amountConfirmed > MAX_ENROLLMENT_AMOUNT
      ) {
        return NextResponse.json(
          { error: 'Each enrollment needs a pricing option and a whole-number amount between 1 and 10,000,000 Naira' },
          { status: 400 }
        );
      }
    }

    const priceTypes = Array.from(new Set(corrections.map((record) => record.priceType.trim())));
    const pricingOptions = await prisma.pricingConfig.findMany({
      where: { priceType: { in: priceTypes }, isActive: true },
      select: { priceType: true },
    });
    if (pricingOptions.length !== priceTypes.length) {
      return NextResponse.json({ error: 'One or more selected pricing options are unavailable' }, { status: 400 });
    }

    const result = await prisma.$transaction(async (tx) => {
      const registrationImport = await tx.confirmedRegistrationImport.findUnique({
        where: { id },
        include: {
          paymentRecords: {
            include: { enrollment: true, student: true },
            orderBy: { createdAt: 'asc' },
          },
        },
      });

      if (!registrationImport) throw new Error('Paid import not found');
      if (registrationImport.paymentRecords.length === 0) {
        throw new Error('This import has no linked payment records to edit');
      }

      const existingIds = new Set(registrationImport.paymentRecords.map((record) => record.id));
      if (existingIds.size !== submittedIds.length || submittedIds.some((recordId) => !existingIds.has(recordId))) {
        throw new Error('Submit every payment allocation belonging to this import');
      }

      const oldTotal = registrationImport.paymentRecords.reduce(
        (sum, record) => sum + record.amountConfirmed,
        0
      );
      const newTotal = corrections.reduce((sum, record) => sum + record.amountConfirmed, 0);

      for (const correction of corrections) {
        const currentRecord = registrationImport.paymentRecords.find(
          (record) => record.id === correction.paymentRecordId
        );
        if (!currentRecord) throw new Error('Payment record not found');

        const priceType = correction.priceType.trim();
        await tx.enrollmentPaymentRecord.update({
          where: { id: currentRecord.id },
          data: {
            amountConfirmed: correction.amountConfirmed,
            ...(paymentProofNote !== null ? { paymentProofNote } : {}),
          },
        });
        await tx.programEnrollment.update({
          where: { id: currentRecord.enrollmentId },
          data: { priceType, priceAmount: correction.amountConfirmed },
        });
        await tx.confirmedRegistrationImportChild.updateMany({
          where: { importId: id, enrollmentId: currentRecord.enrollmentId },
          data: { priceType, priceAmount: correction.amountConfirmed },
        });
      }

      await tx.confirmedRegistrationImport.update({
        where: { id },
        data: {
          confirmedAmount: newTotal,
          ...(paymentProofNote !== null ? { paymentProofNote } : {}),
        },
      });

      await tx.importActivityLog.create({
        data: {
          importId: id,
          action: 'PAYMENT_CORRECTED',
          message: `Corrected imported payment total from ${oldTotal} to ${newTotal}`,
          metadata: {
            oldTotal,
            newTotal,
            records: corrections.map((record) => ({
              paymentRecordId: record.paymentRecordId,
              priceType: record.priceType.trim(),
              amountConfirmed: record.amountConfirmed,
            })),
          },
          actorId: sessionUser.userId,
        },
      });

      return { oldTotal, newTotal };
    });

    return NextResponse.json({
      message: 'Enrollment payment details updated successfully',
      ...result,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update enrollment payment details';
    const status = message === 'Paid import not found' ? 404 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
