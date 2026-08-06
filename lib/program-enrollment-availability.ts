type ProgramType = 'WEEKEND_CLUB' | 'HOLIDAY_CAMP';

type BatchSchedule = {
  batchNumber: number;
  startDate: string | Date;
};

export type ProgramWithBatchSchedules = {
  type: ProgramType;
  batches: number;
  startDate: string | Date;
  batchSchedules?: BatchSchedule[] | null;
};

export type BatchEnrollmentAvailability = {
  allowed: boolean;
  batchNumber: number;
  startDate?: string;
  usesLegacyStartDate: boolean;
  reason?: string;
};

const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;

function startOfUtcDay(value: string | Date) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

export function getBatchEnrollmentAvailability(
  program: ProgramWithBatchSchedules,
  batchNumber: number,
  now: Date = new Date()
): BatchEnrollmentAvailability {
  if (!Number.isInteger(batchNumber) || batchNumber < 1 || batchNumber > program.batches) {
    return {
      allowed: false,
      batchNumber,
      usesLegacyStartDate: false,
      reason: `Batch ${batchNumber} is not configured for this program.`,
    };
  }

  const batchSchedule = program.batchSchedules?.find(
    (schedule) => schedule.batchNumber === batchNumber
  );
  const effectiveStartDate = batchSchedule?.startDate || program.startDate;
  const usesLegacyStartDate = !batchSchedule;
  const startDay = startOfUtcDay(effectiveStartDate);
  const today = startOfUtcDay(now);

  if (startDay === null || today === null) {
    return {
      allowed: false,
      batchNumber,
      usesLegacyStartDate,
      reason: `Batch ${batchNumber} does not have a valid start date.`,
    };
  }

  const daysPassed = Math.floor((today - startDay) / MILLISECONDS_PER_DAY);
  const enrollmentWindowDays = program.type === 'WEEKEND_CLUB' ? 28 : 5;
  const programLabel = program.type === 'WEEKEND_CLUB' ? 'weekend program' : 'holiday program';

  if (daysPassed > enrollmentWindowDays) {
    return {
      allowed: false,
      batchNumber,
      startDate: new Date(startDay).toISOString(),
      usesLegacyStartDate,
      reason: `Batch ${batchNumber} is closed. New enrollment in this ${programLabel} ended ${enrollmentWindowDays} days after the batch start date.`,
    };
  }

  return {
    allowed: true,
    batchNumber,
    startDate: new Date(startDay).toISOString(),
    usesLegacyStartDate,
  };
}
