import 'reflect-metadata';
import { describe, it, expect } from 'vitest';
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { BarCashDto, BarProductDto, BarSaleDto } from './bar.dto';
import { reportDistribution } from './report-calculations';
describe('bar money and familiar report rules', () => {
  it('accepts labeled player/observer prices and rejects malformed or too many prices', () => {
    const dto = {
      name: 'منتج',
      currency: 'SYP_NEW',
      prices: [
        { label: 'لاعب', unitPriceMinor: 7500 },
        { label: 'موظف', unitPriceMinor: 5000 },
      ],
    };
    expect(validateSync(plainToInstance(BarProductDto, dto))).toHaveLength(0);
    for (const prices of [
      [],
      [{ label: 'x', unitPriceMinor: 1 }],
      [{ label: 'لاعب', unitPriceMinor: -1 }],
      [{ label: 'لاعب', unitPriceMinor: 0.5 }],
      Array.from({ length: 11 }, () => ({ label: 'لاعب', unitPriceMinor: 7500 })),
    ])
      expect(
        validateSync(plainToInstance(BarProductDto, { ...dto, prices })).length,
      ).toBeGreaterThan(0);
  });
  it('validates sale quantities, integer minor units and revision', () => {
    const dto = {
      productId: 'p',
      priceLabel: 'موظف',
      quantity: 2,
      unitPriceMinor: 5000,
      soldOn: '2026-10-12',
      requestKey: 'sale-request-test-123',
      expectedUpdatedAt: '2026-10-12T00:00:00Z',
    };
    expect(validateSync(plainToInstance(BarSaleDto, dto))).toHaveLength(0);
    for (const bad of [
      { quantity: 0 },
      { quantity: 1.5 },
      { quantity: 10001 },
      { unitPriceMinor: -1 },
      { unitPriceMinor: 1.1 },
      { expectedUpdatedAt: undefined },
    ])
      expect(validateSync(plainToInstance(BarSaleDto, { ...dto, ...bad })).length).toBeGreaterThan(
        0,
      );
  });
  it('never accepts old-currency bar entries', () => {
    const dto = {
      kind: 'OPENING',
      title: 'رصيد معلوم',
      amountMinor: 0,
      currency: 'SYP_NEW',
      spentOn: '2026-10-12',
      requestKey: 'opening-request-test-123',
    };
    expect(validateSync(plainToInstance(BarCashDto, dto))).toHaveLength(0);
    expect(
      validateSync(plainToInstance(BarCashDto, { ...dto, currency: 'SYP' })).length,
    ).toBeGreaterThan(0);
  });
  it('uses0.03 only in8Azar, on club net not bar, then subtracts draws BEFORE halves', () => {
    const t = reportDistribution('b3', 100000, 20000, 20000);
    expect(t.fixedMinor).toBe(3000);
    expect(t.combinedNetMinor).toBe(120000);
    expect(t.remainingMinor).toBe(97000);
    expect(t.halfMinor).toBe(48500);
    for (const branch of ['b1', 'b2'])
      expect(reportDistribution(branch, 100000, 20000, 20000).halfMinor).toBe(50000);
  });
  it('shows rounding separately, conserves cents, and does not create a fee credit on loss', () => {
    for (const net of [1, 3, -1, -3, 12345]) {
      const t = reportDistribution('b3', net, 0, 0);
      expect(t.halfMinor * 2 + t.roundingMinor).toBe(t.remainingMinor);
    }
    expect(reportDistribution('b3', -10000, 0, 0).fixedMinor).toBe(0);
  });
});
