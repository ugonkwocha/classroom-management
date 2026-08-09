import { NextRequest, NextResponse } from 'next/server';
import { getActiveSessionUser } from '@/lib/auth';
import { checkPermission, PERMISSIONS } from '@/lib/permissions';
import { getCertificateRoster, getDefaultCompletionDate, resolveCertificateRecipients } from '@/lib/certificate-service';
import prisma from '@/lib/prisma';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getActiveSessionUser(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try { checkPermission(user.role, PERMISSIONS.READ_CERTIFICATES); } catch { return NextResponse.json({ error: 'Forbidden' }, { status: 403 }); }
  const { id } = await params;
  const roster = await getCertificateRoster(id);
  if (!roster) return NextResponse.json({ error: 'Class not found' }, { status: 404 });
  const certificateIds = roster.rows.flatMap((row) => row.certificate ? [row.certificate.id] : []);
  const deliveryLogs = certificateIds.length > 0
    ? await prisma.emailLog.findMany({
        where: { certificateId: { in: certificateIds }, eventType: 'CERTIFICATE_DELIVERY' },
        orderBy: { createdAt: 'desc' },
      })
    : [];
  const rows = roster.rows.map((row) => ({
    student: { id: row.student.id, firstName: row.student.firstName, lastName: row.student.lastName, email: row.student.email },
    enrollmentId: row.enrollment.id,
    enrollmentStatus: row.enrollment.status,
    decision: row.decision ? { id: row.decision.id, outcome: row.decision.outcome, reason: row.decision.reason, reviewedAt: row.decision.reviewedAt } : null,
    certificate: row.certificate ? {
      id: row.certificate.id,
      certificateNumber: row.certificate.certificateNumber,
      status: row.certificate.status,
      version: row.certificate.version,
      issuedAt: row.certificate.issuedAt,
      completionDate: row.certificate.completionDate,
      revocationReason: row.certificate.revocationReason,
      deliveryStatus: deliveryLogs.find((log) => log.certificateId === row.certificate?.id)?.status || null,
    } : null,
    recipients: resolveCertificateRecipients(row.student),
  }));
  const defaultCompletion = getDefaultCompletionDate(roster.classData);
  return NextResponse.json({
    class: { id: roster.classData.id, name: roster.classData.name, isArchived: roster.classData.isArchived, batch: roster.classData.batch },
    course: { id: roster.classData.course.id, name: roster.classData.course.name, certificateTemplate: roster.classData.course.certificateTemplate },
    program: { id: roster.classData.program.id, name: roster.classData.program.name },
    settingsReady: Boolean(roster.settings?.isActive && roster.settings.signaturePath && roster.settings.signatoryName && roster.settings.signatoryTitle),
    defaultCompletionDate: defaultCompletion.date.toISOString().slice(0, 10),
    defaultDateIsFallback: defaultCompletion.isFallback,
    rows,
  });
}
