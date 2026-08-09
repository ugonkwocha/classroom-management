import { NextRequest, NextResponse } from 'next/server';
import { getActiveSessionUser } from '@/lib/auth';
import { checkPermission, PERMISSIONS } from '@/lib/permissions';
import { createCertificate, getCertificateRoster, getDefaultCompletionDate, sendStoredCertificate } from '@/lib/certificate-service';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getActiveSessionUser(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try { checkPermission(user.role, PERMISSIONS.ISSUE_CERTIFICATE); } catch { return NextResponse.json({ error: 'Forbidden' }, { status: 403 }); }
  const { id } = await params;
  const body = await request.json();
  const studentIds = Array.isArray(body.studentIds)
    ? [...new Set<string>(body.studentIds.map((value: unknown) => String(value)))]
    : [];
  if (studentIds.length === 0) return NextResponse.json({ error: 'Select at least one completed student' }, { status: 400 });
  const roster = await getCertificateRoster(id);
  if (!roster) return NextResponse.json({ error: 'Class not found' }, { status: 404 });
  const defaultCompletion = getDefaultCompletionDate(roster.classData);
  if (body.completionDate && user.role === 'STAFF' && body.completionDate !== defaultCompletion.date.toISOString().slice(0, 10)) {
    return NextResponse.json({ error: 'Only admins can override the certificate date' }, { status: 403 });
  }
  const completionDate = body.completionDate
    ? new Date(`${body.completionDate}T12:00:00.000Z`)
    : defaultCompletion.date;
  if (Number.isNaN(completionDate.getTime())) return NextResponse.json({ error: 'Completion date is invalid' }, { status: 400 });

  const results = [];
  for (const studentId of studentIds) {
    const row = roster.rows.find((item) => item.student.id === studentId);
    const studentName = row ? `${row.student.firstName} ${row.student.lastName}`.trim() : studentId;
    try {
      const issued = await createCertificate({ classId: id, studentId, completionDate, issuedById: user.userId, requestOrigin: request.nextUrl.origin });
      const delivery = await sendStoredCertificate(issued.certificate.id, user.userId, request.nextUrl.origin);
      results.push({ studentId, studentName, certificateId: issued.certificate.id, certificateNumber: issued.certificate.certificateNumber, created: issued.created, ...delivery });
    } catch (error) {
      results.push({ studentId, studentName, success: false, sent: 0, failed: 0, error: error instanceof Error ? error.message : 'Certificate issuance failed' });
    }
  }
  return NextResponse.json({ success: results.some((result) => 'certificateId' in result), results });
}
