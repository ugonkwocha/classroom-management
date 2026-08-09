import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getActiveSessionUser } from '@/lib/auth';
import { checkPermission, PERMISSIONS } from '@/lib/permissions';
import { readCertificateAsset } from '@/lib/certificate-storage';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getActiveSessionUser(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try { checkPermission(user.role, PERMISSIONS.READ_CERTIFICATES); } catch { return NextResponse.json({ error: 'Forbidden' }, { status: 403 }); }
  const { id } = await params;
  const certificate = await prisma.studentCertificate.findUnique({ where: { id } });
  if (!certificate) return NextResponse.json({ error: 'Certificate not found' }, { status: 404 });
  try {
    const pdf = await readCertificateAsset(certificate.pdfPath);
    return new NextResponse(new Blob([new Uint8Array(pdf)], { type: 'application/pdf' }), { headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': `attachment; filename="${certificate.certificateNumber}.pdf"`, 'Cache-Control': 'private, no-store' } });
  } catch {
    return NextResponse.json({ error: 'Certificate file is unavailable' }, { status: 404 });
  }
}
