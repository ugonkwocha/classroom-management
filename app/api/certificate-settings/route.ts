import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getActiveSessionUser } from '@/lib/auth';
import { checkPermission, PERMISSIONS } from '@/lib/permissions';
import { saveCertificateSignature } from '@/lib/certificate-storage';

export async function GET(request: NextRequest) {
  const user = await getActiveSessionUser(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try { checkPermission(user.role, PERMISSIONS.READ_CERTIFICATES); } catch { return NextResponse.json({ error: 'Forbidden' }, { status: 403 }); }
  const settings = await prisma.certificateSettings.upsert({ where: { id: 'default' }, create: { id: 'default' }, update: {} });
  return NextResponse.json(settings);
}
export async function PUT(request: NextRequest) {
  const user = await getActiveSessionUser(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try { checkPermission(user.role, PERMISSIONS.MANAGE_CERTIFICATE_SETTINGS); } catch { return NextResponse.json({ error: 'Forbidden' }, { status: 403 }); }

  try {
    const formData = await request.formData();
    const file = formData.get('signature');
    const existing = await prisma.certificateSettings.findUnique({ where: { id: 'default' } });
    const signaturePath = file instanceof File && file.size > 0 ? await saveCertificateSignature(file) : existing?.signaturePath || null;
    const signatoryName = String(formData.get('signatoryName') || '').trim();
    const signatoryTitle = String(formData.get('signatoryTitle') || '').trim();
    const emailSubject = String(formData.get('emailSubject') || '').trim();
    const emailMessage = String(formData.get('emailMessage') || '').trim();
    const isActive = String(formData.get('isActive')) === 'true';
    if (!signatoryName || !signatoryTitle || !emailSubject || !emailMessage) {
      return NextResponse.json({ error: 'Signatory name, title, email subject, and message are required' }, { status: 400 });
    }
    if (isActive && !signaturePath) return NextResponse.json({ error: 'Upload a signature before activating certificate issuance' }, { status: 400 });

    const settings = await prisma.certificateSettings.upsert({
      where: { id: 'default' },
      create: { id: 'default', signatoryName, signatoryTitle, signaturePath, emailSubject, emailMessage, isActive, updatedById: user.userId },
      update: { signatoryName, signatoryTitle, signaturePath, emailSubject, emailMessage, isActive, updatedById: user.userId },
    });
    return NextResponse.json(settings);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to update certificate settings' }, { status: 500 });
  }
}
