import prisma from '@/lib/prisma';
import { sendPaidEnrollmentConfirmationEmail } from '@/lib/email';
import { logEmailDelivery } from '@/lib/email-logs';

export async function sendPaidEnrollmentConfirmation(
  importId: string,
  triggeredById: string,
  options: { resendOfLogId?: string | null } = {}
) {
  const transaction = await prisma.confirmedRegistrationImport.findUnique({
    where: { id: importId },
    include: {
      family: {
        include: {
          guardians: { orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }] },
        },
      },
      program: true,
      paymentRecords: {
        include: { student: true, enrollment: true },
        orderBy: { createdAt: 'asc' },
      },
    },
  });

  if (!transaction) throw new Error('Paid enrollment transaction not found');
  const guardian = transaction.family?.guardians.find((item) => item.isPrimary && item.isActive)
    || transaction.family?.guardians.find((item) => item.isActive)
    || transaction.family?.guardians[0];

  if (!guardian?.email) throw new Error('The primary guardian does not have an email address');

  const priceTypes = [...new Set(transaction.paymentRecords.map((record) => record.enrollment.priceType))];
  const pricing = await prisma.pricingConfig.findMany({
    where: { priceType: { in: priceTypes } },
    select: { priceType: true, label: true },
  });
  const priceLabels = new Map(pricing.map((item) => [item.priceType, item.label]));
  const enrollments = transaction.paymentRecords.map((record) => ({
    studentName: `${record.student.firstName} ${record.student.lastName}`.trim(),
    batchNumber: record.enrollment.batchNumber,
    priceLabel: priceLabels.get(record.enrollment.priceType) || record.enrollment.priceType,
    amount: record.amountConfirmed,
  }));
  const totalAmount = enrollments.reduce((sum, item) => sum + item.amount, 0);
  const recipientName = `${guardian.firstName} ${guardian.lastName}`.trim();
  const subject = `Enrollment confirmed: ${transaction.program.name}`;
  const result = await sendPaidEnrollmentConfirmationEmail({
    recipient: { email: guardian.email, name: recipientName },
    programName: transaction.program.name,
    programYear: transaction.program.year,
    enrollments,
    totalAmount,
  });

  const log = await logEmailDelivery({
    eventType: 'PAID_ENROLLMENT_CONFIRMATION',
    recipientEmail: guardian.email,
    recipientName,
    recipientRole: 'parent',
    subject,
    provider: result.provider,
    providerMessageId: result.messageId,
    error: result.error,
    success: result.success,
    enrollmentId: transaction.paymentRecords.length === 1 ? transaction.paymentRecords[0].enrollmentId : null,
    triggeredById,
    payload: {
      importId: transaction.id,
      programId: transaction.programId,
      enrollmentCount: enrollments.length,
      totalAmount,
      enrollments,
      resendOfLogId: options.resendOfLogId || null,
      attemptedProviders: result.attemptedProviders || [],
      providerFallbackError: result.fallbackError || null,
    },
  });

  return {
    success: result.success,
    error: result.error || null,
    provider: result.provider || null,
    recipientEmail: guardian.email,
    emailLogId: log.id,
  };
}
