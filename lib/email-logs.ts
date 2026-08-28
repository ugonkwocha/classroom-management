import prisma from '@/lib/prisma';
import type { Prisma } from '@prisma/client';

type EmailLogInput = {
  eventType: 'CLASS_ASSIGNMENT' | 'PREPARATION_INSTRUCTIONS' | 'TEACHER_ASSIGNMENT' | 'TUTOR_ROSTER_UPDATE' | 'USER_INVITATION' | 'PASSWORD_RESET' | 'CERTIFICATE_DELIVERY' | 'PARENT_PORTAL_ACTIVATION';
  recipientEmail: string;
  recipientName?: string;
  recipientRole?: string;
  subject?: string;
  provider?: string;
  providerMessageId?: string;
  error?: string;
  success: boolean;
  studentId?: string | null;
  classId?: string | null;
  enrollmentId?: string | null;
  certificateId?: string | null;
  triggeredById?: string | null;
  payload?: Prisma.InputJsonValue;
};

export async function logEmailDelivery(input: EmailLogInput) {
  return prisma.emailLog.create({
    data: {
      eventType: input.eventType,
      status: input.success ? 'SENT' : 'FAILED',
      recipientEmail: input.recipientEmail,
      recipientName: input.recipientName,
      recipientRole: input.recipientRole,
      subject: input.subject,
      provider: input.provider || 'resend',
      providerMessageId: input.providerMessageId,
      error: input.success ? null : input.error || 'Email delivery failed',
      studentId: input.studentId || null,
      classId: input.classId || null,
      enrollmentId: input.enrollmentId || null,
      certificateId: input.certificateId || null,
      triggeredById: input.triggeredById || null,
      payload: input.payload,
      sentAt: input.success ? new Date() : null,
    },
  });
}
