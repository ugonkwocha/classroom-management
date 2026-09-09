import { describe, expect, it } from 'vitest';
import {
  normalizeReturningEnrollmentRows,
  resolveReturningBatchConfiguration,
} from '@/lib/returning-customer-enrollment';

describe('returning customer enrollment validation', () => {
  it('preserves exact per-enrollment amounts without splitting the total', () => {
    const rows = normalizeReturningEnrollmentRows([
      { studentKey: 'child-a', batchNumber: 1, priceType: 'FULL_PRICE', amountConfirmed: 60_000 },
      { studentKey: 'child-b', batchNumber: 1, priceType: 'SIBLING', amountConfirmed: 54_000 },
      { studentKey: 'child-a', batchNumber: 2, priceType: 'FULL_PRICE', amountConfirmed: 60_000 },
    ], new Set(['child-a', 'child-b']));

    expect(rows.map((row) => row.amountConfirmed)).toEqual([60_000, 54_000, 60_000]);
    expect(rows.reduce((sum, row) => sum + row.amountConfirmed, 0)).toBe(174_000);
  });

  it('rejects duplicate child and batch rows', () => {
    expect(() => normalizeReturningEnrollmentRows([
      { studentKey: 'child-a', batchNumber: 2, priceType: 'FULL_PRICE', amountConfirmed: 60_000 },
      { studentKey: 'child-a', batchNumber: 2, priceType: 'FULL_PRICE', amountConfirmed: 60_000 },
    ], new Set(['child-a']))).toThrow('The same child and batch was added more than once');
  });

  it('requires a paid CRM tag for every selected batch', () => {
    expect(() => resolveReturningBatchConfiguration({
      name: 'Summer Holiday Program',
      type: 'HOLIDAY_CAMP',
      batches: 1,
      startDate: '2026-09-08T00:00:00.000Z',
      batchSchedules: [{ batchNumber: 1, startDate: '2026-09-08T00:00:00.000Z', paidCrmTag: null }],
    }, [{ studentKey: 'child-a', batchNumber: 1, priceType: 'FULL_PRICE', amountConfirmed: 60_000 }], {
      canOverrideClosedBatch: false,
      now: new Date('2026-09-09T12:00:00.000Z'),
    })).toThrow('Configure the paid FluentCRM tag for Batch 1 before saving');
  });

  it('requires manager access and a reason for a closed batch', () => {
    const program = {
      name: 'Summer Holiday Program',
      type: 'HOLIDAY_CAMP' as const,
      batches: 1,
      startDate: '2026-08-01T00:00:00.000Z',
      batchSchedules: [{ batchNumber: 1, startDate: '2026-08-01T00:00:00.000Z', paidCrmTag: 'Paid Summer B1' }],
    };
    const rows = [{ studentKey: 'child-a', batchNumber: 1, priceType: 'FULL_PRICE', amountConfirmed: 60_000 }];

    expect(() => resolveReturningBatchConfiguration(program, rows, {
      canOverrideClosedBatch: false,
      now: new Date('2026-09-09T12:00:00.000Z'),
    })).toThrow('Only an admin or superadmin');
    expect(() => resolveReturningBatchConfiguration(program, rows, {
      canOverrideClosedBatch: true,
      now: new Date('2026-09-09T12:00:00.000Z'),
    })).toThrow('Enter a reason');

    expect(resolveReturningBatchConfiguration(program, rows, {
      canOverrideClosedBatch: true,
      overrideReason: 'Payment was received before the deadline.',
      now: new Date('2026-09-09T12:00:00.000Z'),
    }).closedBatches).toEqual([1]);
  });
});
