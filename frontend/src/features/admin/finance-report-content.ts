import type { FinanceReport } from './branch-finance-pages';
import { money } from './finance-format';
export type FamiliarSection = {
  title: string;
  hint: string;
  icon: 'income' | 'expense' | 'withdrawal' | 'balance' | 'plans' | 'people' | 'receipt';
  rows: { title: string; lines: string[] }[];
};
const audienceLabel = (value: string) =>
  value === 'MEN' ? 'رجال' : value === 'WOMEN' ? 'نساء' : 'تصنيف غير محفوظ';
const amount = (minor: number, currency: string) => '\u2066' + money(minor, currency) + '\u2069';
const equation = (minor: number, operation: string, result: number, currency: string) =>
  '\u2066' + money(minor, currency) + ' ' + operation + ' = ' + money(result, currency) + '\u2069';
export function familiarReportSections(report: FinanceReport): FamiliarSection[] {
  const sections: FamiliarSection[] = [];
  for (const total of report.totals) {
    const currency = total.currency,
      unit =
        currency === 'USD'
          ? 'الدولار الأمريكي'
          : currency === 'SYP_NEW'
            ? 'الليرة السورية الجديدة'
            : 'عملة السجل السابق: ' + currency;
    const bar = report.bar?.totals.find((t) => t.currency === currency);
    const roster = (report.salaryRoster ?? report.salaries).filter((s) => s.currency === currency);
    sections.push({
      title: 'رواتب الموظفين — ' + unit,
      hint: 'المدفوع فعلًا خلال الفترة فقط؛ الراتب المرجعي ليس مصروفًا. الصفر يعني عدم وجود دفعة في الفترة.',
      icon: 'people',
      rows: [
        ...roster.map((s) => ({
          title: s.name + (s.jobTitle ? ' · ' + s.jobTitle : ''),
          lines: ['المدفوع: ' + amount(s.totalMinor, currency)],
        })),
        { title: 'مجموع الرواتب', lines: [amount(total.salaryMinor, currency)] },
      ],
    });
    sections.push({
      title: 'مصاريف النادي — ' + unit,
      hint: 'المصاريف الأخرى دون الرواتب؛ مجموع مصاريف النادي أدناه يشمل الرواتب مرة واحدة.',
      icon: 'expense',
      rows: [
        ...(report.clubExpenseGroups ?? [])
          .filter((e) => e.currency === currency)
          .map((e) => ({
            title: e.title,
            lines: [
              amount(e.totalMinor, currency) + (e.count > 1 ? ' · ' + e.count + ' عمليات' : ''),
            ],
          })),
        { title: 'المصاريف الأخرى', lines: [amount(total.otherExpenseMinor, currency)] },
        { title: 'مجموع مصاريف النادي', lines: [amount(total.expenseMinor, currency)] },
      ],
    });
    if (
      bar &&
      (currency === 'SYP_NEW' ||
        bar.incomeMinor ||
        bar.expenseMinor ||
        bar.openingMinor !== null ||
        bar.closingMinor !== null ||
        bar.unwithdrawnMinor > 0)
    ) {
      sections.push({
        title: 'مصاريف البار — ' + unit,
        hint: 'منفصلة عن مصاريف النادي؛ تسجيل الرصيد السابق ليس مصروفًا.',
        icon: 'expense',
        rows: [
          ...(report.bar.expenseGroups ?? [])
            .filter((e) => e.currency === currency)
            .map((e) => ({ title: e.title, lines: [amount(e.totalMinor, currency)] })),
          { title: 'مجموع مصاريف البار', lines: [amount(bar.expenseMinor, currency)] },
        ],
      });
      const days = [];
      for (
        let d = new Date(report.range.from + 'T12:00:00+03:00');
        d <= new Date(report.range.to + 'T12:00:00+03:00');
        d = new Date(d.getTime() + 86400000)
      ) {
        const day = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Damascus' }).format(d),
          row = report.bar.daily.find((t) => t.day === day && t.currency === currency);
        days.push({
          title: new Intl.DateTimeFormat('ar-SY', {
            timeZone: 'Asia/Damascus',
            weekday: 'long',
            day: 'numeric',
            month: 'short',
            year: 'numeric',
          }).format(d),
          lines: [
            amount(row?.amountMinor ?? 0, currency) + (row ? ' · ' + row.quantity + ' قطعة' : ''),
          ],
        });
      }
      sections.push({
        title: 'مبيعات البار اليومية — ' + unit,
        hint: 'كل يوم ضمن الفترة بتاريخ دمشق؛ المقبوضات حسب سعر البيع الفعلي، لا سعر المنتج الحالي.',
        icon: 'income',
        rows:
          bar.incomeMinor || report.bar.daily.some((d) => d.currency === currency)
            ? days
            : [{ title: 'لا توجد مبيعات خلال الفترة', lines: [amount(0, currency)] }],
      });
      sections.push({
        title: 'مجموع البار — ' + unit,
        hint: 'الجديد: مبيعات هذه الفترة المقبوضة التي لم يستلمها المالك حتى نهايتها. القديم: مبيعات ما قبل الفترة غير المسلّمة حتى نهايتها. التسليم المخصص للبار يخصم من الأقدم أولًا. هذه المجاميع إجمالي مبيعات غير مسلّمة، وليست رصيد الصندوق بعد المصاريف؛ القديم ليس إيرادًا جديدًا ولا يدخل مجددًا في قسمة أرباح الفترة.',
        icon: 'balance',
        rows: [
          { title: 'مجموع بار جديد', lines: [amount(bar.newUnwithdrawnMinor, currency)] },
          {
            title: 'مجموع بار قديم',
            lines: [amount(bar.oldUnwithdrawnMinor, currency)],
          },
          {
            title: 'مجموع بار قديم وجديد',
            lines: [amount(bar.unwithdrawnMinor, currency)],
          },
          {
            title: 'استلم المالك من البار خلال الفترة (جزء من سحوبات المالك)',
            lines: [amount(bar.handedOverMinor, currency)],
          },
          { title: 'مصاريف بار', lines: [amount(bar.expenseMinor, currency)] },
          { title: 'صافي بار خلال الفترة', lines: [amount(bar.netMinor, currency)] },
        ],
      });
      if (report.bar.products.some((p) => p.currency === currency))
        sections.push({
          title: 'تفصيل مبيعات البار — ' + unit,
          hint: 'الكمية × السعر المقبوض فعليًا؛ الأسعار المختلفة للمنتج الواحد تبقى مستقلة.',
          icon: 'receipt',
          rows: report.bar.products
            .filter((p) => p.currency === currency)
            .map((p) => ({
              title: p.name + ' · ' + p.label,
              lines: [
                p.quantity + ' قطعة × ' + amount(p.unitPriceMinor, currency),
                'المجموع: ' + amount(p.amountMinor, currency),
              ],
            })),
        });
    }
    sections.push({
      title: 'الاشتراكات — ' + unit,
      hint:
        'العدد = عمليات الاشتراك والتجديد المدفوعة خلال الفترة، وليس عدد اللاعبين دون تكرار. أسعار المدفوعات السابقة محفوظة.' +
        (report.plans.some((p) => p.currency === currency && p.inferredAudienceCount > 0)
          ? ' تصنيف رجال/نساء للسجلات القديمة حسب الباقة الحالية؛ لا تتغير أسعارها.'
          : ''),
      icon: 'plans',
      rows: [
        ...report.plans
          .filter((p) => p.currency === currency)
          .map((p) => ({
            title: audienceLabel(p.audience) + ' · ' + p.name,
            lines: [
              'مبلغ: ' +
                amount(p.unitPriceMinor, currency) +
                ' · المدة: ' +
                (p.durationDays ?? 'غير محفوظة') +
                ' يوم',
              'عدد: ' + p.count + ' · المجموع: ' + amount(p.totalMinor, currency),
            ],
          })),
        { title: 'المجموع الكلي للاشتراكات', lines: [amount(total.incomeMinor, currency)] },
      ],
    });
    const rows = [
      { title: 'مجموع النادي', lines: [amount(total.incomeMinor, currency)] },
      {
        title: 'مجموع المصاريف (رواتب + مصاريف أخرى)',
        lines: [amount(total.expenseMinor, currency)],
      },
      { title: 'صافي النادي', lines: [amount(total.netMinor, currency)] },
      {
        title: 'صافي البار خلال الفترة',
        lines: [amount((total.barIncomeMinor ?? 0) - (total.barExpenseMinor ?? 0), currency)],
      },
      {
        title: 'مجموع الصافي للنادي والبار',
        lines: [amount(total.combinedNetMinor ?? total.netMinor, currency)],
      },
    ];
    if (report.branch.code === 'b3')
      rows.push({
        title: equation(
          total.fixedBaseMinor ?? Math.max(0, total.netMinor),
          '× 0.03',
          total.fixedMinor ?? 0,
          currency,
        ),
        lines: [
          'الصافي: ' +
            amount((total.combinedNetMinor ?? total.netMinor) - (total.fixedMinor ?? 0), currency),
        ],
      });
    rows.push(
      { title: 'المصاري يلي سحبها المالك', lines: [amount(total.ownerWithdrawalMinor, currency)] },
      {
        title: 'الصافي بعد السحوبات',
        lines: [amount(total.remainingMinor ?? total.cashMovementMinor, currency)],
      },
      {
        title: equation(
          total.remainingMinor ?? total.cashMovementMinor,
          '÷ 2',
          total.halfMinor ?? Math.trunc(total.cashMovementMinor / 2),
          currency,
        ),
        lines: total.roundingMinor
          ? ['فرق التقريب غير الموزّع: ' + amount(total.roundingMinor, currency)]
          : [],
      },
    );
    sections.push({
      title: 'الحساب النهائي — ' + unit,
      hint: 'حركة الفترة فقط؛ كل عملة مستقلة. مصاريف ورواتب النادي تُطرح مرة واحدة، والسحوبات تُطرح قبل القسمة. الرصيد السابق ليس دخلًا جديدًا.',
      icon: 'balance',
      rows,
    });
  }
  return sections;
}
export function financialReportMessage(report: FinanceReport) {
  return [
    'تقرير ' + report.branch.nameAr,
    'من ' + report.range.from + ' إلى ' + report.range.to + ' — توقيت دمشق',
    '',
    ...familiarReportSections(report).flatMap((section) => [
      section.title,
      section.hint,
      '',
      ...section.rows.flatMap((row) => [row.title, ...row.lines, '']),
      '_________________________',
      '',
    ]),
  ].join('\n');
}
