import { describe, expect, it } from 'vitest';
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { businessRange } from './finance.service';
import { ExpenseDto, FinanceRangeDto } from './finance.dto';

describe('financial date and amount validation', () => {
  it('includes the entire final Damascus day and excludes the next midnight', () => {
    const range = businessRange('2026-09-01', '2026-09-30');
    expect(range.gte.toISOString()).toBe('2026-08-31T21:00:00.000Z');
    expect(range.lt.toISOString()).toBe('2026-09-30T21:00:00.000Z');
  });
  it('rejects invalid, reversed and excessively large ranges', () => {
    expect(() => businessRange('2026-02-30', '2026-03-01')).toThrow();
    expect(() => businessRange('2026-09-30', '2026-09-01')).toThrow();
    expect(() => businessRange('2024-01-01', '2026-01-01')).toThrow();
  });
  it('rejects fractional cents, negative money and unsupported currencies', () => {
    const base = {
      title: 'صيانة جهاز',
      amountMinor: 10000,
      currency: 'SYP_NEW',
      spentOn: '2026-09-28',
      requestKey: 'unique-test-request-123',
    };
    expect(validateSync(plainToInstance(ExpenseDto, base))).toHaveLength(0);
    for (const bad of [
      { amountMinor: -1 },
      { amountMinor: 1.5 },
      { currency: 'SYP' },
      { amountMinor: 3000000000 },
    ])
      expect(validateSync(plainToInstance(ExpenseDto, { ...base, ...bad })).length).toBeGreaterThan(
        0,
      );
  });
  it('defaults report pagination and rejects unsafe page sizes', () => {
    expect(plainToInstance(FinanceRangeDto, { from: '2026-09-01', to: '2026-09-30' }).page).toBe(1);
    expect(
      validateSync(
        plainToInstance(FinanceRangeDto, { from: '2026-09-01', to: '2026-09-30', page: 0 }),
      ).length,
    ).toBeGreaterThan(0);
  });
});
