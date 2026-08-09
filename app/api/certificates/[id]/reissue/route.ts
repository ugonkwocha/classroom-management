import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getActiveSessionUser } from '@/lib/auth';
import { checkPermission, PERMISSIONS } from '@/lib/permissions';
import { createCertificate, sendStoredCertificate } from '@/lib/certificate-service';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getActiveSessionUser(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try { checkPermission(user.role, PERMISSIONS.REVOKE_CERTIFICATE); } catch { return NextResponse.json({ error: 'Forbidden' }, { status: 403 }); }
  const { id } = await params;
  const previous = await prisma.studentCertificate.findUnique({ where: { id } });
  if (!previous) return NextResponse.json({ error: 'Certificate not found' }, { status: 404 });
  if (previous.status !== 'REVOKED') return NextResponse.json({ error: 'Revoke the current certificate before reissuing it' }, { status: 400 });
  const body = await request.json().catch(() => ({}));
  const completionDate = body.completionDate ? new Date(`${body.completionDate}T12:00:00.000Z`) : previous.completionDate;
  try {
    const issued = await createCertificate({ classId: previous.classId, studentId: previous.studentId, completionDate, issuedById: user.userId, reissue: true });
    const delivery = await sendStoredCertificate(issued.certificate.id, user.userId);
    return NextResponse.json({ success: delivery.success, certificate: issued.certificate, delivery });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to reissue certificate' }, { status: 400 });
  }
}
