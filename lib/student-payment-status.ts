import { Student } from '@/types';

type PaymentStatus = Student['paymentStatus'];

export function getStudentPaymentStatus(student: Student): PaymentStatus {
  const enrollments = student.programEnrollments || student.enrollments || [];

  if (enrollments.length === 0) {
    return student.paymentStatus || 'PENDING';
  }

  const activeEnrollments = enrollments.filter((enrollment) => enrollment.status !== 'DROPPED');

  if (activeEnrollments.length === 0) {
    return student.paymentStatus || 'PENDING';
  }

  if (activeEnrollments.some((enrollment) => enrollment.paymentStatus === 'PENDING')) {
    return 'PENDING';
  }

  if (activeEnrollments.every((enrollment) => enrollment.paymentStatus === 'COMPLETED')) {
    return 'COMPLETED';
  }

  return 'CONFIRMED';
}
