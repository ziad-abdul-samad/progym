'use client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth/use-auth';
import { useState } from 'react';
import { Download, Plus, ReceiptText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog, DialogCancelButton, DialogForm } from '@/components/ui/dialog';
import { Input, Textarea } from '@/components/ui/input';
import { DashboardLoader, EmptyState, ErrorState } from '@/components/ui/state';
import { apiRequest, jsonBody } from '@/lib/api/client';
import { money, RequestKey } from './plan-picker';
import { PayrollTab } from './payroll-tab';
import { BarTab, type BarReport } from './bar-tab';
import { familiarReportSections, financialReportMessage } from './finance-report-content';
import { useToast } from '@/components/ui/toast';
import { OwnerWithdrawalsTab, type OwnerWithdrawal } from './owner-withdrawals-tab';
import { businessDate, financialTime, salaryMonthLabel } from './finance-format';
export { businessDate, financialTime } from './finance-format';

export type Receipt = {
  id: string;
  paidAt: string;
  amountMinor: number;
  currency: string;
  planNameSnapshot: string | null;
  durationDaysSnapshot: number | null;
  memberNameSnapshot: string | null;
  memberIdSnapshot: string | null;
  receiverNameSnapshot: string | null;
  observerNameSnapshot: string | null;
  subscription: { member: { user: { fullName: string } } };
};
export type Expense = {
  id: string;
  title: string;
  notes: string | null;
  amountMinor: number;
  currency: string;
  spentAt: string;
  createdAt: string;
  createdByName: string;
  voidedAt: string | null;
  voidReason: string | null;
  kind: 'GENERAL' | 'SALARY';
  salaryNameSnapshot: string | null;
  salaryJobSnapshot: string | null;
  salaryMonth: string | null;
};
export type FinanceReport = {
  branch: { code: string; nameAr: string };
  range: { from: string; to: string };
  generatedAt: string;
  totals: {
    currency: string;
    incomeMinor: number;
    expenseMinor: number;
    netMinor: number;
    salaryMinor: number;
    otherExpenseMinor: number;
    ownerWithdrawalMinor: number;
    cashMovementMinor: number;
    barIncomeMinor: number;
    barExpenseMinor: number;
    combinedNetMinor: number;
    fixedBaseMinor: number;
    fixedMinor: number;
    remainingMinor: number;
    halfMinor: number;
    roundingMinor: number;
  }[];
  salaries: {
    name: string;
    jobTitle: string | null;
    month: string;
    currency: string;
    count: number;
    totalMinor: number;
  }[];
  salaryRoster: {
    name: string;
    jobTitle: string | null;
    currency: string;
    count: number;
    totalMinor: number;
  }[];
  clubExpenseGroups: { title: string; currency: string; count: number; totalMinor: number }[];
  bar: BarReport;
  plans: {
    name: string;
    audience: string;
    inferredAudienceCount: number;
    currency: string;
    durationDays: number | null;
    unitPriceMinor: number;
    count: number;
    players: number;
    totalMinor: number;
  }[];
  receivers: { name: string; currency: string; count: number; totalMinor: number }[];
  receipts: Receipt[];
  expenses: Expense[];
  receiptCount: number;
  expenseCount: number;
  withdrawals: OwnerWithdrawal[];
  withdrawalCount: number;
  page: number;
  pageSize: number;
};
function rangeFor(days: number) {
  const to = businessDate(),
    from = businessDate(new Date(Date.now() - (days - 1) * 86400000));
  return { from, to };
}
function RangeControls({
  value,
  onChange,
}: {
  value: { from: string; to: string };
  onChange: (value: { from: string; to: string }) => void;
}) {
  return (
    <div className="min-w-0 space-y-4">
      <div className="flex flex-wrap gap-2">
        {[
          [1, 'اليوم'],
          [7, 'آخر 7 أيام'],
          [30, 'آخر 30 يوماً'],
        ].map(([days, label]) => (
          <Button
            key={days}
            type="button"
            variant="secondary"
            onClick={() => onChange(rangeFor(Number(days)))}
          >
            {label}
          </Button>
        ))}
      </div>
      <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="grid min-w-0 gap-2 text-sm font-bold">
          من تاريخ
          <Input
            className="block min-w-0 max-w-full appearance-none [&::-webkit-date-and-time-value]:text-start"
            style={{ width: '100%', minWidth: 0 }}
            type="date"
            required
            max={value.to}
            value={value.from}
            onChange={(e) => onChange({ ...value, from: e.target.value })}
          />
        </label>
        <label className="grid min-w-0 gap-2 text-sm font-bold">
          إلى تاريخ
          <Input
            className="block min-w-0 max-w-full appearance-none [&::-webkit-date-and-time-value]:text-start"
            style={{ width: '100%', minWidth: 0 }}
            type="date"
            required
            min={value.from}
            value={value.to}
            onChange={(e) => onChange({ ...value, to: e.target.value })}
          />
        </label>
      </div>
      <p className="text-xs leading-6 text-muted-foreground">
        يشمل التقرير يوم البداية والنهاية بالكامل بتوقيت دمشق. تُعرض العملات منفصلة، دون تحويل أو
        جمع بين الدولار والليرة.
      </p>
    </div>
  );
}
function reportUrl(range: { from: string; to: string }, page = 1) {
  return '/finance/report?' + new URLSearchParams({ ...range, page: String(page) });
}
function Pager({
  page,
  count,
  onChange,
}: {
  page: number;
  count: number;
  onChange: (page: number) => void;
}) {
  const pages = Math.max(1, Math.ceil(count / 50));
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 pt-4 text-sm">
      <span>
        {count} سجل · صفحة {page} من {pages}
      </span>
      <div className="flex gap-2">
        <Button variant="secondary" disabled={page === 1} onClick={() => onChange(page - 1)}>
          السابق
        </Button>
        <Button variant="secondary" disabled={page >= pages} onClick={() => onChange(page + 1)}>
          التالي
        </Button>
      </div>
    </div>
  );
}
function ExpenseCards({
  expenses,
  onVoid,
}: {
  expenses: Expense[];
  onVoid?: (expense: Expense) => void;
}) {
  return (
    <div className="grid gap-3 lg:grid-cols-2">
      {expenses.map((expense) => (
        <Card key={expense.id} className={expense.voidedAt ? 'border-amber-500/30' : ''}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <h3 className="font-black">{expense.title}</h3>
            <strong dir="ltr">{money(expense.amountMinor, expense.currency)}</strong>
          </div>
          {expense.kind === 'SALARY' && expense.salaryMonth ? (
            <p className="mt-3 inline-block rounded-lg bg-green-100 px-3 py-1 text-xs font-bold text-green-900 dark:bg-green-950 dark:text-green-200">
              راتب {salaryMonthLabel(expense.salaryMonth)}
              {expense.salaryJobSnapshot ? ` · ${expense.salaryJobSnapshot}` : ''}
            </p>
          ) : null}
          <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-7 text-muted-foreground">
            {expense.notes}
          </p>
          <p className="mt-3 text-xs">تاريخ المصروف: {businessDate(new Date(expense.spentAt))}</p>
          <p className="mt-2 text-xs text-muted-foreground">
            سجّله {expense.createdByName} · {financialTime(expense.createdAt)}
          </p>
          {expense.voidedAt ? (
            <p className="mt-3 text-sm text-amber-700 dark:text-amber-300">
              ملغى، غير محتسب: {expense.voidReason}
            </p>
          ) : onVoid ? (
            <Button className="mt-4" variant="secondary" onClick={() => onVoid(expense)}>
              إلغاء قيد خاطئ
            </Button>
          ) : null}
        </Card>
      ))}
    </div>
  );
}
export function ExpensesPage() {
  const params = useParams();
  return <ExpensesContent key={String(params.branchCode)} />;
}
function ExpensesContent() {
  const params = useParams(),
    client = useQueryClient();
  const [range, setRange] = useState(() => rangeFor(30)),
    [page, setPage] = useState(1);
  const [tab, setTab] = useState<'expenses' | 'payroll' | 'withdrawals' | 'bar'>('expenses');
  const [adding, setAdding] = useState(false),
    [voiding, setVoiding] = useState<Expense | null>(null);
  const report = useQuery({
    queryKey: ['finance-expenses', params.branchCode, range, page],
    queryFn: () => apiRequest<FinanceReport>(reportUrl(range, page)),
    enabled: tab !== 'payroll',
  });
  const refresh = () => {
    setAdding(false);
    setVoiding(null);
    void client.invalidateQueries({ queryKey: ['finance-expenses'] });
    void client.invalidateQueries({ queryKey: ['salary-recipients'] });
  };
  const add = useMutation({
    mutationFn: (form: FormData) =>
      apiRequest('/finance/expenses', {
        method: 'POST',
        body: jsonBody({
          title: form.get('title'),
          notes: form.get('notes'),
          amountMinor: Math.round(Number(form.get('amount')) * 100),
          currency: form.get('currency'),
          spentOn: form.get('spentOn'),
          requestKey: form.get('requestKey'),
        }),
      }),
    onSuccess: refresh,
  });
  const cancel = useMutation({
    mutationFn: (reason: string) =>
      apiRequest('/finance/expenses/' + voiding?.id + '/void', {
        method: 'PATCH',
        body: jsonBody({ reason }),
      }),
    onSuccess: refresh,
  });
  return (
    <div className="min-w-0 space-y-5" dir="rtl">
      <Card>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold text-green-700 dark:text-brand-accent">
              PRO GYM / سجل المصاريف
            </p>
            <h1 className="mt-2 text-2xl font-black">كل مصروف، بتفاصيله</h1>
            <p className="mt-2 text-sm leading-7 text-muted-foreground">
              سجّل المشتريات والصيانة بتاريخ الدفع الفعلي. لا تُحذف السجلات؛ يمكن إلغاء القيد الخاطئ
              بسبب موثّق ثم إضافة الصحيح.
            </p>
          </div>
          {tab === 'expenses' ? (
            <Button
              onClick={() => {
                add.reset();
                setAdding(true);
              }}
            >
              <Plus className="h-4 w-4" /> تسجيل مصروف
            </Button>
          ) : null}
        </div>
      </Card>
      <div className="flex flex-wrap gap-2" role="group" aria-label="أقسام المصاريف">
        <Button
          variant={tab === 'expenses' ? 'primary' : 'secondary'}
          aria-pressed={tab === 'expenses'}
          onClick={() => setTab('expenses')}
        >
          سجل المصاريف والرواتب
        </Button>
        <Button
          variant={tab === 'payroll' ? 'primary' : 'secondary'}
          aria-pressed={tab === 'payroll'}
          onClick={() => setTab('payroll')}
        >
          رواتب العاملين والمراقبين
        </Button>
        <Button
          variant={tab === 'withdrawals' ? 'primary' : 'secondary'}
          aria-pressed={tab === 'withdrawals'}
          onClick={() => {
            setTab('withdrawals');
            setPage(1);
          }}
        >
          سحوبات المالك
        </Button>
        <Button
          variant={tab === 'bar' ? 'primary' : 'secondary'}
          aria-pressed={tab === 'bar'}
          onClick={() => {
            setTab('bar');
            setPage(1);
          }}
        >
          البار والمنتجات
        </Button>
      </div>
      {tab === 'payroll' ? (
        <PayrollTab />
      ) : (
        <>
          <Card>
            <RangeControls
              value={range}
              onChange={(value) => {
                setRange(value);
                setPage(1);
              }}
            />
          </Card>
          {report.isLoading ? (
            <DashboardLoader />
          ) : report.error ? (
            <ErrorState message={report.error.message} />
          ) : report.data ? (
            <>
              {tab === 'withdrawals' ? (
                <>
                  <OwnerWithdrawalsTab withdrawals={report.data.withdrawals ?? []} />
                  <Pager page={page} count={report.data.withdrawalCount ?? 0} onChange={setPage} />
                </>
              ) : tab === 'bar' ? (
                <>
                  <BarTab report={report.data.bar} />
                  <Pager
                    page={page}
                    count={Math.max(report.data.bar.saleCount, report.data.bar.cashCount)}
                    onChange={setPage}
                  />
                </>
              ) : (
                <>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {report.data.totals.map((total) => (
                      <Card key={total.currency}>
                        <p className="text-sm text-muted-foreground">المصاريف خلال الفترة</p>
                        <strong className="mt-2 block text-2xl" dir="ltr">
                          {money(total.expenseMinor, total.currency)}
                        </strong>
                        <p className="mt-3 text-xs leading-6 text-muted-foreground">
                          منها رواتب: {money(total.salaryMinor ?? 0, total.currency)} · مصاريف أخرى:{' '}
                          {money(total.otherExpenseMinor ?? total.expenseMinor, total.currency)}
                        </p>
                      </Card>
                    ))}
                  </div>
                  {report.data.expenses.length ? (
                    <ExpenseCards
                      expenses={report.data.expenses}
                      onVoid={(e) => {
                        cancel.reset();
                        setVoiding(e);
                      }}
                    />
                  ) : (
                    <EmptyState title="لا توجد مصاريف في هذه الفترة" />
                  )}
                  <Pager page={page} count={report.data.expenseCount} onChange={setPage} />
                </>
              )}
            </>
          ) : null}
        </>
      )}
      <Dialog
        open={adding}
        onClose={() => {
          if (!add.isPending) setAdding(false);
        }}
        title="تسجيل مصروف جديد"
      >
        {adding ? (
          <DialogForm
            onSubmit={(e) => {
              e.preventDefault();
              add.mutate(new FormData(e.currentTarget));
            }}
            actions={
              <>
                <DialogCancelButton
                  onClick={() => {
                    if (!add.isPending) setAdding(false);
                  }}
                />
                <Button isLoading={add.isPending}>حفظ المصروف</Button>
              </>
            }
          >
            <RequestKey />
            <label className="grid gap-2 text-sm">
              اسم الشيء أو الخدمة
              <Input
                name="title"
                minLength={2}
                maxLength={160}
                required
                placeholder="مثال: صيانة جهاز أو شراء مرآة"
              />
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="grid min-w-0 gap-2 text-sm">
                المبلغ المدفوع
                <Input
                  name="amount"
                  dir="ltr"
                  type="number"
                  min="0.01"
                  max="20000000"
                  step="0.01"
                  required
                />
              </label>
              <label className="grid min-w-0 gap-2 text-sm">
                العملة
                <select
                  className="min-h-12 rounded-lg border border-input bg-card px-3"
                  name="currency"
                >
                  <option value="SYP_NEW">ليرة سورية جديدة</option>
                  <option value="USD">دولار أمريكي</option>
                </select>
              </label>
            </div>
            <label className="grid min-w-0 gap-2 text-sm">
              تاريخ الدفع
              <Input
                className="min-w-0 max-w-full"
                name="spentOn"
                type="date"
                required
                defaultValue={businessDate()}
                max={businessDate()}
              />
            </label>
            <Textarea
              name="notes"
              maxLength={2000}
              placeholder="تفاصيل إضافية، اسم المورد أو رقم الفاتورة (اختياري)"
            />
            {add.error ? <ErrorState message={add.error.message} /> : null}
          </DialogForm>
        ) : null}
      </Dialog>
      <Dialog
        open={!!voiding}
        onClose={() => {
          if (!cancel.isPending) setVoiding(null);
        }}
        title="إلغاء قيد مصروف"
        description="سيبقى القيد في السجل، ويُستبعد من إجمالي المصاريف مع حفظ السبب واسمك."
      >
        <DialogForm
          onSubmit={(e) => {
            e.preventDefault();
            cancel.mutate(String(new FormData(e.currentTarget).get('reason')));
          }}
          actions={
            <>
              <DialogCancelButton
                onClick={() => {
                  if (!cancel.isPending) setVoiding(null);
                }}
              />
              <Button variant="danger" isLoading={cancel.isPending}>
                تأكيد إلغاء القيد
              </Button>
            </>
          }
        >
          <Textarea
            name="reason"
            minLength={3}
            maxLength={1000}
            required
            placeholder="سبب تصحيح القيد"
          />
          {cancel.error ? <ErrorState message={cancel.error.message} /> : null}
        </DialogForm>
      </Dialog>
    </div>
  );
}

export function BranchReportsPage() {
  const params = useParams();
  return <BranchReportsContent key={String(params.branchCode)} />;
}
function BranchReportsContent() {
  const params = useParams();
  const auth = useAuth();
  const { push } = useToast();
  const [message, setMessage] = useState<string | null>(null);
  const [range, setRange] = useState(() => rangeFor(30)),
    [report, setReport] = useState<FinanceReport | null>(null);
  const [tab, setTab] = useState<'financial' | 'members'>('financial');
  const generate = useMutation({
    mutationFn: ({ page, dates }: { page: number; dates: { from: string; to: string } }) =>
      apiRequest<FinanceReport>(reportUrl(dates, page)),
    onSuccess: setReport,
  });
  const copy = useMutation({
    mutationFn: async () => {
      if (!report) return;
      const value = financialReportMessage(report);
      try {
        await navigator.clipboard.writeText(value);
        push({ title: 'تم نسخ التقرير كرسالة جاهزة للمشاركة', tone: 'success' });
      } catch {
        setMessage(value);
      }
    },
  });
  const pdf = useMutation({
    mutationFn: async () => {
      if (!report) return;
      // Export a consistent bounded detail set; do not silently truncate a report.
      const count = Math.max(report.receiptCount, report.expenseCount, report.withdrawalCount ?? 0);
      if (count > 3000)
        throw new Error(
          'للحفاظ على سرعة تنزيل PDF، اختر فترة أقصر تحتوي على 3000 سجل أو أقل. الملخص على الشاشة يشمل الفترة كاملة.',
        );
      const fresh = await apiRequest<FinanceReport>(reportUrl(report.range));
      if (Math.max(fresh.receiptCount, fresh.expenseCount, fresh.withdrawalCount ?? 0) > 3000)
        throw new Error('ازدادت السجلات أثناء التصدير. اختر فترة أقصر ثم أعد إنشاء التقرير.');
      const receipts = [...fresh.receipts],
        expenses = [...fresh.expenses],
        withdrawals = [...(fresh.withdrawals ?? [])];
      for (
        let page = 2;
        page <=
        Math.ceil(
          Math.max(fresh.receiptCount, fresh.expenseCount, fresh.withdrawalCount ?? 0) / 50,
        );
        page++
      ) {
        const next = await apiRequest<FinanceReport>(reportUrl(report.range, page));
        if (
          next.receiptCount !== fresh.receiptCount ||
          next.expenseCount !== fresh.expenseCount ||
          next.withdrawalCount !== fresh.withdrawalCount ||
          JSON.stringify(next.totals) !== JSON.stringify(fresh.totals)
        )
          throw new Error(
            'تغيرت البيانات أثناء تجهيز التقرير، أعد المحاولة للحصول على نسخة متطابقة.',
          );
        receipts.push(...next.receipts);
        expenses.push(...next.expenses);
        withdrawals.push(...(next.withdrawals ?? []));
      }
      const { downloadFinanceReport } = await import('@/lib/reports/branch-finance-report');
      await downloadFinanceReport({ ...fresh, receipts, expenses, withdrawals }, tab);
    },
  });
  return (
    <div className="min-w-0 space-y-5" dir="rtl">
      <Card>
        <p className="text-xs font-bold text-green-700 dark:text-brand-accent">
          PRO GYM / التقارير
        </p>
        <h1 className="mt-2 text-2xl font-black">صورة واضحة عن حركة الفرع</h1>
        {auth.data?.role === 'ADMIN' ? (
          <Link
            className="mt-4 inline-block text-sm font-bold underline"
            href={`/ar/dashboard/admin/${params.branchCode}/operational-reports`}
          >
            تقارير الحضور والأعضاء والتشغيل
          </Link>
        ) : null}
        <p className="mt-2 text-sm leading-7 text-muted-foreground">
          إيرادات مؤكدة، مصاريف موثّقة، وقائمة اشتراكات. تُحفظ أسماء الباقات والأسعار وقت الدفع، حتى
          بعد تعديلها.
        </p>
      </Card>
      <Card>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            generate.mutate({ page: 1, dates: range });
          }}
        >
          <RangeControls value={range} onChange={setRange} />
          <Button isLoading={generate.isPending}>
            <ReceiptText className="h-4 w-4" /> إنشاء التقرير
          </Button>
        </form>
      </Card>
      {generate.error ? <ErrorState message={generate.error.message} /> : null}
      {report ? (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-black">{report.branch.nameAr}</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                {report.range.from} — {report.range.to} · بتوقيت دمشق
              </p>
            </div>
            <Button variant="secondary" isLoading={pdf.isPending} onClick={() => pdf.mutate()}>
              <Download className="h-4 w-4" /> تنزيل{' '}
              {tab === 'financial' ? 'التقرير المالي' : 'قائمة المشتركين'} PDF
            </Button>
          </div>
          {pdf.error ? <ErrorState message={pdf.error.message} /> : null}
          <div className="flex flex-wrap gap-2">
            <Button
              variant={tab === 'financial' ? 'primary' : 'secondary'}
              onClick={() => setTab('financial')}
            >
              التقرير المالي
            </Button>
            <Button
              variant={tab === 'members' ? 'primary' : 'secondary'}
              onClick={() => setTab('members')}
            >
              تقرير المشتركين
            </Button>
          </div>
          {tab === 'financial' ? (
            <>
              <Button variant="secondary" isLoading={copy.isPending} onClick={() => copy.mutate()}>
                نسخ التقرير كرسالة
              </Button>
              <p className="text-xs leading-6 text-muted-foreground">
                المجاميع والتفاصيل المجمّعة تشمل الفترة كاملة. الرواتب المدفوعة فقط، والرصيد السابق
                منفصل عن دخل الفترة.
              </p>
              {familiarReportSections(report).map((section, i) => (
                <Card key={i}>
                  <h3 className="text-lg font-black">{section.title}</h3>
                  <p className="mt-2 text-xs leading-6 text-muted-foreground">{section.hint}</p>
                  <div className="mt-4 grid gap-3 lg:grid-cols-2">
                    {section.rows.map((row, j) => (
                      <div key={j} className="min-w-0 rounded-lg border border-border p-3">
                        <h4 className="break-words font-bold">{row.title}</h4>
                        {row.lines.map((line, k) => (
                          <p key={k} className="mt-2 break-words text-sm leading-7">
                            {line}
                          </p>
                        ))}
                      </div>
                    ))}
                  </div>
                </Card>
              ))}
              <Dialog
                open={message !== null}
                onClose={() => setMessage(null)}
                title="التقرير جاهز للنسخ"
                description="المتصفح لم يسمح بالنسخ التلقائي؛ حدّد النص وانسخه يدويًا."
              >
                <Textarea
                  className="min-h-80"
                  readOnly
                  value={message ?? ''}
                  onFocus={(e) => e.target.select()}
                />
              </Dialog>
            </>
          ) : (
            <>
              <Card>
                <h3 className="font-black">
                  الاشتراكات المدفوعة خلال الفترة — {report.receiptCount} عملية
                </h3>
                <p className="mt-2 text-xs text-muted-foreground">
                  كل صف يمثل دفعة اشتراك؛ قد يظهر اللاعب أكثر من مرة عند التجديد.
                </p>
              </Card>
              <div className="grid gap-3 lg:grid-cols-2">
                {report.receipts.map((receipt) => (
                  <Card key={receipt.id}>
                    <div className="flex flex-wrap justify-between gap-3">
                      <h3 className="font-black">
                        {receipt.memberNameSnapshot ?? receipt.subscription.member.user.fullName}
                      </h3>
                      <strong dir="ltr">{money(receipt.amountMinor, receipt.currency)}</strong>
                    </div>
                    <p className="mt-3 text-sm">
                      {receipt.planNameSnapshot ?? 'اشتراك سابق — الباقة غير محفوظة'} ·{' '}
                      {receipt.durationDaysSnapshot ?? '—'} يوم
                    </p>
                    <p className="mt-2 text-xs text-muted-foreground">
                      {financialTime(receipt.paidAt)}
                    </p>
                    <p className="mt-2 text-xs">
                      المراقب:{' '}
                      {receipt.observerNameSnapshot ?? receipt.receiverNameSnapshot ?? 'سجل سابق'}
                    </p>
                    <p className="mt-2 break-all text-[10px] text-muted-foreground">
                      رقم الدفعة: {receipt.id}
                    </p>
                  </Card>
                ))}
              </div>
            </>
          )}
          {tab === 'members' ? (
            <Pager
              page={report.page}
              count={report.receiptCount}
              onChange={(page) => generate.mutate({ page, dates: report.range })}
            />
          ) : null}
        </>
      ) : (
        <EmptyState
          title="اختر الفترة ثم أنشئ تقريرك"
          body="سيظهر الملخص هنا، ويمكن تنزيل نسخة عربية PDF مع التفاصيل."
        />
      )}
    </div>
  );
}
