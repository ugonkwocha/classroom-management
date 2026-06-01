import prisma from '@/lib/prisma';
import type { Prisma } from '@prisma/client';

type EmailLogInput = {
  eventType: 'CLASS_ASSIGNMENT' | 'TEACHER_ASSIGNMENT' | 'USER_INVITATION' | 'PASSWORD_RESET';
  recipientEmail: string;
  recipientName?: string;
  recipientRole?: string;
  subject?: string;
  providerMessageId?: string;
  error?: string;
  success: boolean;
  studentId?: string | null;
  classId?: string | null;
  enrollmentId?: string | null;
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
      providerMessageId: input.providerMessageId,
      error: input.success ? null : input.error || 'Email delivery failed',
      studentId: input.studentId || null,
      classId: input.classId || null,
      enrollmentId: input.enrollmentId || null,
      triggeredById: input.triggeredById || null,
      payload: input.payload,
      sentAt: input.success ? new Date() : null,
    },
  });
}
