export type ProgramBatchSchedulePayload = {
  batchNumber: number;
  startDate: Date;
};

export class ProgramBatchScheduleValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ProgramBatchScheduleValidationError';
  }
}

export function parseProgramBatchSchedules(
  value: unknown,
  batches: number
): ProgramBatchSchedulePayload[] {
  if (!Number.isInteger(batches) || batches < 1 || batches > 10) {
    throw new ProgramBatchScheduleValidationError('Number of batches must be between 1 and 10.');
  }

  if (!Array.isArray(value)) return [];

  const schedules = new Map<number, ProgramBatchSchedulePayload>();

  for (const item of value) {
    const batchNumber = Number(item?.batchNumber);
    const startDate = new Date(item?.startDate);

    if (!Number.isInteger(batchNumber) || batchNumber < 1 || batchNumber > batches) {
      throw new ProgramBatchScheduleValidationError(
        `Batch schedule must use a batch number between 1 and ${batches}.`
      );
    }

    if (Number.isNaN(startDate.getTime())) {
      throw new ProgramBatchScheduleValidationError(`Batch ${batchNumber} must have a valid start date.`);
    }

    schedules.set(batchNumber, { batchNumber, startDate });
  }

  return [...schedules.values()].sort((a, b) => a.batchNumber - b.batchNumber);
}
