import { describe, expect, it } from 'vitest';
import { financialReportMessage, familiarReportSections } from './finance-report-content';
import type { FinanceReport } from './branch-finance-pages';
const fixture: FinanceReport = {
  branch: { code: 'b3', nameAr: 'بروجيم 8 آذار' },
  range: { from: '2026-10-12', to: '2026-10-12' },
  generatedAt: '2026-10-12T00:00:00Z',
  totals: [
    {
      currency: 'SYP_NEW',
      incomeMinor: 100000,
      expenseMinor: 20000,
      netMinor: 80000,
      salaryMinor: 5000,
      otherExpenseMinor: 15000,
      ownerWithdrawalMinor: 20000,
      cashMovementMinor: 60000,
      barIncomeMinor: 15000,
      barExpenseMinor: 5000,
      combinedNetMinor: 90000,
      fixedBaseMinor: 80000,
      fixedMinor: 2400,
      remainingMinor: 67600,
      halfMinor: 33800,
      roundingMinor: 0,
    },
  ],
  salaries: [],
  salaryRoster: [
    { name: 'عامل مدفوع', jobTitle: 'استقبال', currency: 'SYP_NEW', count: 1, totalMinor: 5000 },
    { name: 'عامل غير مدفوع', jobTitle: null, currency: 'SYP_NEW', count: 0, totalMinor: 0 },
  ],
  clubExpenseGroups: [{ title: 'مرآة', currency: 'SYP_NEW', count: 1, totalMinor: 15000 }],
  bar: {
    sales: [],
    cashEntries: [],
    saleCount: 0,
    cashCount: 0,
    daily: [{ day: '2026-10-12', currency: 'SYP_NEW', amountMinor: 15000, quantity: 2 }],
    products: [],
    expenseGroups: [{ title: 'شراء مشروبات', currency: 'SYP_NEW', count: 1, totalMinor: 5000 }],
    totals: [
      {
        currency: 'SYP_NEW',
        incomeMinor: 15000,
        expenseMinor: 5000,
        netMinor: 10000,
        openingMinor: 999999,
        openingAt: '2026-10-01T00:00:00Z',
        totalAvailableMinor: 1014999,
        closingMinor: 1009999,
      },
    ],
  },
  plans: [
    {
      name: 'شهري',
      audience: 'MEN',
      inferredAudienceCount: 0,
      currency: 'SYP_NEW',
      durationDays: 30,
      unitPriceMinor: 100000,
      count: 1,
      players: 1,
      totalMinor: 100000,
    },
  ],
  receivers: [],
  receipts: [],
  expenses: [],
  withdrawals: [],
  receiptCount: 0,
  expenseCount: 0,
  withdrawalCount: 0,
  page: 1,
  pageSize: 50,
};
describe('same familiar financial content on screen, PDF and copied message', () => {
  it('matches salary/expenses/bar/subscriptions/final order and labels actual paid counts', () => {
    const sections = familiarReportSections(fixture),
      text = financialReportMessage(fixture);
    expect(sections[0]?.title).toContain('رواتب الموظفين');
    expect(sections[1]?.title).toContain('مصاريف النادي');
    expect(text.indexOf('مصاريف البار')).toBeLessThan(text.indexOf('الاشتراكات —'));
    expect(text).toContain('عامل غير مدفوع');
    expect(text).toContain('عدد: 1');
    expect(text).toContain('رجال · شهري');
  });
  it('keeps old bar balance separate, applies0.03 and places withdrawal BEFORE divide2', () => {
    const text = financialReportMessage(fixture);
    expect(text).toContain('× 0.03');
    expect(text).toContain('676.00');
    expect(text).toContain('338.00');
    expect(text.indexOf('المصاري يلي سحبها المالك')).toBeLessThan(text.indexOf('÷ 2'));
    expect(text).toContain('ليس إيرادًا جديدًا');
  });
  it('does not fabricate old cash or apply3% to other branches', () => {
    const copy: FinanceReport = {
      ...fixture,
      branch: { ...fixture.branch, code: 'b1' },
      bar: {
        ...fixture.bar,
        totals: fixture.bar.totals.map((t) => ({
          ...t,
          openingMinor: null,
          totalAvailableMinor: null,
          closingMinor: null,
        })),
      },
    };
    const text = financialReportMessage(copy);
    expect(text).toContain('غير مسجل');
    expect(text).not.toContain('× 0.03');
    expect(text).toContain('÷ 2');
  });
});
