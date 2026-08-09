import { randomBytes } from 'crypto';
import prisma from '@/lib/prisma';
import { generateCertificatePdf } from '@/lib/certificate-pdf';
import { readCertificateAsset, saveCertificatePdf } from '@/lib/certificate-storage';
import { sendCertificateEmail } from '@/lib/email';
import { logEmailDelivery } from '@/lib/email-logs';

export function getApplicationUrl(requestOrigin?: string | null) {
  const configuredUrl = [
    process.env.NEXT_PUBLIC_APP_URL,
    process.env.APP_URL,
    requestOrigin,
    process.env.COOLIFY_URL,
    process.env.COOLIFY_FQDN,
  ].find((value) => value?.trim());
  const firstUrl = configuredUrl?.split(',')[0].trim() || 'http://localhost:3000';
  const withProtocol = /^https?:\/\//i.test(firstUrl) ? firstUrl : `https://${firstUrl}`;
  return withProtocol.replace(/\/$/, '');
}

export async function getCertificateRoster(classId: string) {
  const classData = await prisma.class.findUnique({
    where: { id: classId },
    include: {
      course: { include: { certificateTemplate: true } },
      program: { include: { batchSchedules: true } },
      completionDecisions: {
        include: { student: { include: { family: { include: { guardians: true } } } }, enrollment: true },
        orderBy: { reviewedAt: 'asc' },
      },
      certificates: { orderBy: [{ studentId: 'asc' }, { version: 'desc' }] },
      enrollments: {
        where: { status: 'ASSIGNED' },
        include: {
          student: {
            include: {
              family: { include: { guardians: true } },
            },
          },
        },
        orderBy: { student: { firstName: 'asc' } },
      },
    },
  });
  if (!classData) return null;

  const decisionsByStudent = new Map(classData.completionDecisions.map((decision) => [decision.studentId, decision]));
  const latestCertificates = new Map<string, (typeof classData.certificates)[number]>();
  for (const certificate of classData.certificates) {
    if (!latestCertificates.has(certificate.studentId)) latestCertificates.set(certificate.studentId, certificate);
  }

  const rows = [
    ...classData.enrollments.map((enrollment) => ({
      student: enrollment.student,
      enrollment,
      decision: decisionsByStudent.get(enrollment.studentId) || null,
      certificate: latestCertificates.get(enrollment.studentId) || null,
    })),
    ...classData.completionDecisions
      .filter((decision) => !classData.enrollments.some((enrollment) => enrollment.studentId === decision.studentId))
      .map((decision) => ({
        student: decision.student,
        enrollment: decision.enrollment,
        decision,
        certificate: latestCertificates.get(decision.studentId) || null,
      })),
  ].sort((a, b) => `${a.student.firstName} ${a.student.lastName}`.localeCompare(`${b.student.firstName} ${b.student.lastName}`));

  const settings = await prisma.certificateSettings.findUnique({ where: { id: 'default' } });
  return { classData, settings, rows };
}

export function resolveCertificateRecipients(student: {
  email: string | null;
  parentEmail: string | null;
  family: { guardians: Array<{ firstName: string; lastName: string; email: string | null; isPrimary: boolean; isActive: boolean }> } | null;
}) {
  const recipients: Array<{ email: string; name: string; role: 'parent' | 'student' }> = [];
  const guardians = student.family?.guardians || [];
  const primary = guardians.find((guardian) => guardian.isPrimary && guardian.isActive && guardian.email)
    || guardians.find((guardian) => guardian.isActive && guardian.email);
  if (primary?.email) recipients.push({ email: primary.email, name: `${primary.firstName} ${primary.lastName}`.trim(), role: 'parent' });
  else if (student.parentEmail) recipients.push({ email: student.parentEmail, name: 'Parent/Guardian', role: 'parent' });
  if (student.email) recipients.push({ email: student.email, name: 'Student', role: 'student' });

  const seen = new Set<string>();
  return recipients.filter((recipient) => {
    const email = recipient.email.trim().toLowerCase();
    if (!email || seen.has(email)) return false;
    seen.add(email);
    recipient.email = email;
    return true;
  });
}

export function getDefaultCompletionDate(classData: {
  batch: number;
  program: { batchSchedules: Array<{ batchNumber: number; endDate: Date | null }> };
}) {
  const endDate = classData.program.batchSchedules.find(
    (schedule) => schedule.batchNumber === classData.batch,
  )?.endDate;

  return {
    date: endDate || new Date(),
    isFallback: !endDate,
  };
}

function replaceTemplateVariables(value: string, studentName: string, courseName: string) {
  return value.replace(/{{studentName}}/g, studentName).replace(/{{courseName}}/g, courseName);
}

export async function sendStoredCertificate(certificateId: string, triggeredById: string | null, requestOrigin?: string | null) {
  const certificate = await prisma.studentCertificate.findUnique({
    where: { id: certificateId },
    include: { student: { include: { family: { include: { guardians: true } } } } },
  });
  if (!certificate) throw new Error('Certificate not found');
  if (certificate.status !== 'ISSUED') throw new Error('Revoked certificates cannot be sent');

  const settings = await prisma.certificateSettings.findUnique({ where: { id: 'default' } });
  if (!settings) throw new Error('Certificate email settings are not configured');
  const recipients = resolveCertificateRecipients(certificate.student);
  if (recipients.length === 0) {
    return { success: true, sent: 0, failed: 0, generatedForManualDelivery: true, results: [] };
  }

  const pdf = await readCertificateAsset(certificate.pdfPath);
  const verificationUrl = `${getApplicationUrl(requestOrigin)}/verify/certificate/${certificate.verificationToken}`;
  const results = [];
  for (const recipient of recipients) {
    const result = await sendCertificateEmail({
      recipient: { email: recipient.email, name: recipient.role === 'student' ? certificate.studentNameSnapshot : recipient.name },
      studentName: certificate.studentNameSnapshot,
      courseName: certificate.courseTitleSnapshot,
      certificateNumber: certificate.certificateNumber,
      verificationUrl,
      subjectTemplate: replaceTemplateVariables(settings.emailSubject, certificate.studentNameSnapshot, certificate.courseTitleSnapshot),
      messageTemplate: replaceTemplateVariables(settings.emailMessage, certificate.studentNameSnapshot, certificate.courseTitleSnapshot),
      pdf,
    });
    await logEmailDelivery({
      eventType: 'CERTIFICATE_DELIVERY',
      recipientEmail: recipient.email,
      recipientName: recipient.name,
      recipientRole: recipient.role,
      subject: replaceTemplateVariables(settings.emailSubject, certificate.studentNameSnapshot, certificate.courseTitleSnapshot),
      provider: result.provider,
      providerMessageId: result.messageId,
      error: result.error,
      success: result.success,
      studentId: certificate.studentId,
      classId: certificate.classId,
      enrollmentId: certificate.enrollmentId,
      certificateId: certificate.id,
      triggeredById,
      payload: {
        certificateNumber: certificate.certificateNumber,
        certificateVersion: certificate.version,
        attemptedProviders: result.attemptedProviders || [],
        providerFallbackError: result.fallbackError || null,
      },
    });
    results.push({ email: recipient.email, role: recipient.role, ...result });
  }
  const sent = results.filter((result) => result.success).length;
  return { success: sent > 0, sent, failed: results.length - sent, generatedForManualDelivery: false, results };
}

export async function createCertificate(params: {
  classId: string;
  studentId: string;
  completionDate: Date;
  issuedById: string;
  reissue?: boolean;
  requestOrigin?: string | null;
}) {
  const roster = await getCertificateRoster(params.classId);
  if (!roster) throw new Error('Class not found');
  const row = roster.rows.find((item) => item.student.id === params.studentId);
  if (!row?.decision || row.decision.outcome !== 'COMPLETED') throw new Error('Only students marked Completed can receive a certificate');
  const template = roster.classData.course.certificateTemplate;
  const settings = roster.settings;
  if (!settings?.isActive || !settings.signatoryName.trim() || !settings.signatoryTitle.trim() || !settings.signaturePath) {
    throw new Error('Certificate settings must be completed and activated by the superadmin');
  }
  if (!template?.isActive || !template.certificateTitle.trim() || !template.achievementWording.trim()) {
    throw new Error(`Activate certificate wording for ${roster.classData.course.name} before issuing certificates`);
  }

  const current = await prisma.studentCertificate.findFirst({
    where: { classId: params.classId, studentId: params.studentId, status: 'ISSUED' },
    orderBy: { version: 'desc' },
  });
  if (current && !params.reissue) return { certificate: current, created: false };
  if (current && params.reissue) throw new Error('Revoke the current certificate before reissuing it');

  const latest = await prisma.studentCertificate.findFirst({
    where: { classId: params.classId, studentId: params.studentId },
    orderBy: { version: 'desc' },
  });
  const version = (latest?.version || 0) + 1;
  const token = randomBytes(24).toString('base64url');
  const number = `9CK-${params.completionDate.getUTCFullYear()}-${randomBytes(4).toString('hex').toUpperCase()}`;
  const studentName = `${row.student.firstName} ${row.student.lastName}`.trim();
  const verificationUrl = `${getApplicationUrl(params.requestOrigin)}/verify/certificate/${token}`;
  const bytes = await generateCertificatePdf({
    studentName,
    courseTitle: template.certificateTitle,
    achievementWording: template.achievementWording,
    completionDate: params.completionDate,
    signatoryName: settings.signatoryName,
    signatoryTitle: settings.signatoryTitle,
    signaturePath: settings.signaturePath,
    certificateNumber: number,
    verificationUrl,
  });
  const pdfPath = await saveCertificatePdf(number, bytes);

  try {
    const certificate = await prisma.studentCertificate.create({
      data: {
        classId: params.classId,
        studentId: params.studentId,
        enrollmentId: row.enrollment.id,
        courseId: roster.classData.courseId,
        programId: roster.classData.programId,
        certificateNumber: number,
        verificationToken: token,
        version,
        studentNameSnapshot: studentName,
        courseTitleSnapshot: template.certificateTitle,
        achievementSnapshot: template.achievementWording,
        classNameSnapshot: roster.classData.name,
        programNameSnapshot: roster.classData.program.name,
        completionDate: params.completionDate,
        signatoryNameSnapshot: settings.signatoryName,
        signatoryTitleSnapshot: settings.signatoryTitle,
        signaturePathSnapshot: settings.signaturePath,
        pdfPath,
        issuedById: params.issuedById,
      },
    });
    return { certificate, created: true };
  } catch (error) {
    const existing = await prisma.studentCertificate.findFirst({
      where: { classId: params.classId, studentId: params.studentId, status: 'ISSUED' },
      orderBy: { version: 'desc' },
    });
    if (existing && !params.reissue) return { certificate: existing, created: false };
    throw error;
  }
}
