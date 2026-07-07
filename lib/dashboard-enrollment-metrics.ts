import type { ProgramEnrollment, Student } from '@/types';

const FALLBACK_PRICE_AMOUNT = 60000;

function normalizePaymentStatus(status?: ProgramEnrollment['paymentStatus']) {
  return status === 'COMPLETED' ? 'CONFIRMED' : status;
}

export function getStudentEnrollments(student: Student) {
  return student.programEnrollments || student.enrollments || [];
}

export function isConfirmedPaidEnrollment(enrollment: ProgramEnrollment) {
  return normalizePaymentStatus(enrollment.paymentStatus) === 'CONFIRMED' && enrollment.status !== 'DROPPED';
}

export function isAssignedEnrollment(enrollment: ProgramEnrollment) {
  return enrollment.status === 'ASSIGNED' && Boolean(enrollment.classId);
}

export function getConfirmedEnrollmentAmount(enrollment: ProgramEnrollment) {
  const paymentRecords = (enrollment as ProgramEnrollment & {
    paymentRecords?: Array<{ amountConfirmed?: number | null }>;
  }).paymentRecords;
  const confirmedAmount = paymentRecords?.find((record) => typeof record.amountConfirmed === 'number')?.amountConfirmed;

  return confirmedAmount || enrollment.priceAmount || FALLBACK_PRICE_AMOUNT;
}

export function getConfirmedPaidEnrollmentRows(students: Student[]) {
  const seenEnrollmentIds = new Set<string>();

  return students.flatMap((student) =>
    getStudentEnrollments(student)
      .filter(isConfirmedPaidEnrollment)
      .filter((enrollment) => {
        if (seenEnrollmentIds.has(enrollment.id)) return false;
        seenEnrollmentIds.add(enrollment.id);
        return true;
      })
      .map((enrollment) => ({
        student,
        enrollment,
        amount: getConfirmedEnrollmentAmount(enrollment),
      }))
  );
}
