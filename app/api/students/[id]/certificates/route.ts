import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getActiveSessionUser } from '@/lib/auth';
import { checkPermission, PERMISSIONS } from '@/lib/permissions';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getActiveSessionUser(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try { checkPermission(user.role, PERMISSIONS.READ_CERTIFICATES); } catch { return NextResponse.json({ error: 'Forbidden' }, { status: 403 }); }
  const { id } = await params;
  const certificates = await prisma.studentCertificate.findMany({
    where: { studentId: id },
    include: { course: { select: { name: true } }, class: { select: { name: true } } },
    orderBy: { issuedAt: 'desc' },
  });
  const logs = certificates.length ? await prisma.emailLog.findMany({
    where: { certificateId: { in: certificates.map((certificate) => certificate.id) }, eventType: 'CERTIFICATE_DELIVERY' },
    orderBy: { createdAt: 'desc' },
  }) : [];
  return NextResponse.json(certificates.map((certificate) => ({
    ...certificate,
    deliveryStatus: logs.find((log) => log.certificateId === certificate.id)?.status || null,
  })));
}
