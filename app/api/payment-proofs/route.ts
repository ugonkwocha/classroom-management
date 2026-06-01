import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getActiveSessionUser } from '@/lib/auth';
import { checkPermission, PERMISSIONS } from '@/lib/permissions';
import { savePaymentProofFile } from '@/lib/payment-proof-storage';

export async function POST(request: NextRequest) {
  const sessionUser = await getActiveSessionUser(request);
  if (!sessionUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    checkPermission(sessionUser.role, PERMISSIONS.CREATE_EXISTING_FAMILY_PAYMENT);
  } catch {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get('file');
    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'Payment proof file is required' }, { status: 400 });
    }

    const saved = await savePaymentProofFile(file);
    const proof = await prisma.paymentProof.create({
      data: {
        importId: String(formData.get('importId') || '') || null,
        paymentRecordId: String(formData.get('paymentRecordId') || '') || null,
        enrollmentId: String(formData.get('enrollmentId') || '') || null,
        note: String(formData.get('note') || '').trim() || null,
        uploadedById: sessionUser.userId,
        ...saved,
      },
    });

    return NextResponse.json(proof, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to upload payment proof' },
      { status: 500 }
    );
  }
}
