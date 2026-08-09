import { NextRequest, NextResponse } from 'next/server';
import { getActiveSessionUser } from '@/lib/auth';
import { checkPermission, PERMISSIONS } from '@/lib/permissions';
import { getCertificateRoster, getApplicationUrl, getDefaultCompletionDate } from '@/lib/certificate-service';
import { generateCertificatePdf } from '@/lib/certificate-pdf';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getActiveSessionUser(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try { checkPermission(user.role, PERMISSIONS.ISSUE_CERTIFICATE); } catch { return NextResponse.json({ error: 'Forbidden' }, { status: 403 }); }
  const { id } = await params;
  const body = await request.json();
  const roster = await getCertificateRoster(id);
  if (!roster) return NextResponse.json({ error: 'Class not found' }, { status: 404 });
  const row = roster.rows.find((item) => item.student.id === body.studentId);
  if (!row?.decision || row.decision.outcome !== 'COMPLETED') return NextResponse.json({ error: 'Select a student marked Completed' }, { status: 400 });
  const template = roster.classData.course.certificateTemplate;
  const settings = roster.settings;
  if (!settings?.isActive || !settings.signaturePath || !settings.signatoryName || !settings.signatoryTitle) return NextResponse.json({ error: 'Certificate settings are incomplete or inactive' }, { status: 400 });
  if (!template?.isActive) return NextResponse.json({ error: 'This course certificate template is inactive' }, { status: 400 });
  const defaultCompletion = getDefaultCompletionDate(roster.classData);
  if (body.completionDate && user.role === 'STAFF' && body.completionDate !== defaultCompletion.date.toISOString().slice(0, 10)) {
    return NextResponse.json({ error: 'Only admins can override the certificate date' }, { status: 403 });
  }
  const completionDate = body.completionDate
    ? new Date(`${body.completionDate}T12:00:00.000Z`)
    : defaultCompletion.date;
  if (Number.isNaN(completionDate.getTime())) return NextResponse.json({ error: 'Completion date is invalid' }, { status: 400 });
  const bytes = await generateCertificatePdf({
    studentName: `${row.student.firstName} ${row.student.lastName}`.trim(),
    courseTitle: template.certificateTitle,
    achievementWording: template.achievementWording,
    completionDate,
    signatoryName: settings.signatoryName,
    signatoryTitle: settings.signatoryTitle,
    signaturePath: settings.signaturePath,
    certificateNumber: '9CK-PREVIEW',
    verificationUrl: `${getApplicationUrl(request.nextUrl.origin)}/verify/certificate/preview`,
    preview: true,
  });
  return new NextResponse(new Blob([new Uint8Array(bytes)], { type: 'application/pdf' }), { headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': 'inline; filename="certificate-preview.pdf"', 'Cache-Control': 'no-store' } });
}
