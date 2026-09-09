import { getBatchEnrollmentAvailability, type ProgramWithBatchSchedules } from '@/lib/program-enrollment-availability';

export type ReturningEnrollmentRow = {
  studentKey: string;
  batchNumber: number;
  priceType: string;
  amountConfirmed: number;
};

type BatchScheduleWithTag = {
  batchNumber: number;
  startDate: string | Date;
  paidCrmTag?: string | null;
};

type ProgramWithReturningSettings = Omit<ProgramWithBatchSchedules, 'batchSchedules'> & {
  name: string;
  batchSchedules?: BatchScheduleWithTag[] | null;
};

export function normalizeReturningEnrollmentRows(
  values: unknown[],
  studentKeys: Set<string>,
  maxAmount = 10_000_000
): ReturningEnrollmentRow[] {
  const seen = new Set<string>();

  return values.map((value) => {
    const row = value && typeof value === 'object' ? value as Record<string, unknown> : {};
    const studentKey = typeof row.studentKey === 'string' ? row.studentKey.trim() : '';
    const batchNumber = Number(row.batchNumber);
    const priceType = typeof row.priceType === 'string' ? row.priceType.trim() : '';
    const amountConfirmed = Number(row.amountConfirmed);

    if (!studentKey || !studentKeys.has(studentKey)) throw new Error('An enrollment references an unknown child');
    if (!Number.isInteger(batchNumber) || batchNumber < 1) throw new Error('Every enrollment needs a valid batch');
    if (!priceType) throw new Error('Every enrollment needs a pricing option');
    if (!Number.isInteger(amountConfirmed) || amountConfirmed <= 0 || amountConfirmed > maxAmount) {
      throw new Error('Every enrollment amount must be between 1 and 10,000,000 Naira');
    }

    const key = `${studentKey}:${batchNumber}`;
    if (seen.has(key)) throw new Error('The same child and batch was added more than once');
    seen.add(key);
    return { studentKey, batchNumber, priceType, amountConfirmed };
  });
}

export function resolveReturningBatchConfiguration(
  program: ProgramWithReturningSettings,
  enrollments: ReturningEnrollmentRow[],
  options: { canOverrideClosedBatch: boolean; overrideReason?: string | null; now?: Date }
) {
  const batchNumbers = [...new Set(enrollments.map((row) => row.batchNumber))];
  const schedules = new Map(program.batchSchedules?.map((schedule) => [schedule.batchNumber, schedule]) || []);
  const closedBatches: number[] = [];
  const paidTags: string[] = [];

  batchNumbers.forEach((batchNumber) => {
    const schedule = schedules.get(batchNumber);
    if (!schedule) throw new Error(`Batch ${batchNumber} does not have a configured schedule`);
    if (!schedule.paidCrmTag?.trim()) throw new Error(`Configure the paid FluentCRM tag for Batch ${batchNumber} before saving`);
    paidTags.push(schedule.paidCrmTag.trim());
    if (!getBatchEnrollmentAvailability(program, batchNumber, options.now).allowed) closedBatches.push(batchNumber);
  });

  if (closedBatches.length > 0 && !options.canOverrideClosedBatch) {
    throw new Error('Only an admin or superadmin can enroll a customer into a closed batch');
  }
  if (closedBatches.length > 0 && !options.overrideReason?.trim()) {
    throw new Error('Enter a reason for enrolling into the closed batch');
  }

  return {
    batchNumbers,
    closedBatches,
    paidTags: [...new Set(paidTags)],
    schedules,
    totalAmount: enrollments.reduce((sum, row) => sum + row.amountConfirmed, 0),
  };
}
