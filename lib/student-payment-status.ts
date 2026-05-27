import { Student } from '@/types';

type PaymentStatus = Student['paymentStatus'];
export type OperationalPaymentStatus = Exclude<PaymentStatus, 'COMPLETED'>;

export function normalizePaymentStatus(status: PaymentStatus | undefined | null): OperationalPaymentStatus {
  return status === 'CONFIRMED' || status === 'COMPLETED' ? 'CONFIRMED' : 'PENDING';
}

export function getStudentPaymentStatus(student: Student): OperationalPaymentStatus {
  const enrollments = student.programEnrollments || student.enrollments || [];

  if (enrollments.length === 0) {
    return normalizePaymentStatus(student.paymentStatus);
  }

  const activeEnrollments = enrollments.filter((enrollment) => enrollment.status !== 'DROPPED');

  if (activeEnrollments.length === 0) {
    return normalizePaymentStatus(student.paymentStatus);
  }

  if (activeEnrollments.some((enrollment) => enrollment.paymentStatus === 'PENDING')) {
    return 'PENDING';
  }

  return 'CONFIRMED';
}
