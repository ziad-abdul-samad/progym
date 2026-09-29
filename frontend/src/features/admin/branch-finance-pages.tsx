'use client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth/use-auth';
import { useState } from 'react';
import { Download, Plus, ReceiptText, TrendingUp, TrendingDown, Wallet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog, DialogCancelButton, DialogForm } from '@/components/ui/dialog';
import { Input, Textarea } from '@/components/ui/input';
import { DashboardLoader, EmptyState, ErrorState } from '@/components/ui/state';
import { apiRequest, jsonBody } from '@/lib/api/client';
import { money, RequestKey } from './plan-picker';

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
};
export type FinanceReport = {
  branch: { code: string; nameAr: string };
  range: { from: string; to: string };
  generatedAt: string;
  totals: { currency: string; incomeMinor: number; expenseMinor: number; netMinor: number }[];
  plans: {
    name: string;
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
  page: number;
  pageSize: number;
};
export function businessDate(date = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Damascus',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}
export function financialTime(value: string) {
  return new Intl.DateTimeFormat('ar-SY', {
    timeZone: 'Asia/Damascus',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(new Date(value));
}
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
  const [adding, setAdding] = useState(false),
    [voiding, setVoiding] = useState<Expense | null>(null);
  const report = useQuery({
    queryKey: ['finance-expenses', params.branchCode, range, page],
    queryFn: () => apiRequest<FinanceReport>(reportUrl(range, page)),
  });
  const refresh = async () => {
    await client.invalidateQueries({ queryKey: ['finance-expenses'] });
    setAdding(false);
    setVoiding(null);
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
          <Button
            onClick={() => {
              add.reset();
              setAdding(true);
            }}
          >
            <Plus className="h-4 w-4" /> تسجيل مصروف
          </Button>
        </div>
      </Card>
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
          <div className="grid gap-3 sm:grid-cols-2">
            {report.data.totals.map((total) => (
              <Card key={total.currency}>
                <p className="text-sm text-muted-foreground">المصاريف خلال الفترة</p>
                <strong className="mt-2 block text-2xl" dir="ltr">
                  {money(total.expenseMinor, total.currency)}
                </strong>
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
      ) : null}
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
  const [range, setRange] = useState(() => rangeFor(30)),
    [report, setReport] = useState<FinanceReport | null>(null);
  const [tab, setTab] = useState<'financial' | 'members'>('financial');
  const generate = useMutation({
    mutationFn: ({ page, dates }: { page: number; dates: { from: string; to: string } }) =>
      apiRequest<FinanceReport>(reportUrl(dates, page)),
    onSuccess: setReport,
  });
  const pdf = useMutation({
    mutationFn: async () => {
      if (!report) return;
      // Export a consistent bounded detail set; do not silently truncate a report.
      const count = Math.max(report.receiptCount, report.expenseCount);
      if (count > 3000)
        throw new Error(
          'للحفاظ على سرعة تنزيل PDF، اختر فترة أقصر تحتوي على 3000 سجل أو أقل. الملخص على الشاشة يشمل الفترة كاملة.',
        );
      const fresh = await apiRequest<FinanceReport>(reportUrl(report.range));
      if (Math.max(fresh.receiptCount, fresh.expenseCount) > 3000)
        throw new Error('ازدادت السجلات أثناء التصدير. اختر فترة أقصر ثم أعد إنشاء التقرير.');
      const receipts = [...fresh.receipts],
        expenses = [...fresh.expenses];
      for (
        let page = 2;
        page <= Math.ceil(Math.max(fresh.receiptCount, fresh.expenseCount) / 50);
        page++
      ) {
        const next = await apiRequest<FinanceReport>(reportUrl(report.range, page));
        if (
          next.receiptCount !== fresh.receiptCount ||
          next.expenseCount !== fresh.expenseCount ||
          JSON.stringify(next.totals) !== JSON.stringify(fresh.totals)
        )
          throw new Error(
            'تغيرت البيانات أثناء تجهيز التقرير، أعد المحاولة للحصول على نسخة متطابقة.',
          );
        receipts.push(...next.receipts);
        expenses.push(...next.expenses);
      }
      const { downloadFinanceReport } = await import('@/lib/reports/branch-finance-report');
      await downloadFinanceReport({ ...fresh, receipts, expenses }, tab);
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
              {report.totals.length ? (
                report.totals.map((total) => (
                  <div key={total.currency} className="grid gap-3 sm:grid-cols-3">
                    {[
                      [TrendingUp, 'الإيرادات', total.incomeMinor],
                      [TrendingDown, 'المصاريف', total.expenseMinor],
                      [Wallet, 'الصافي', total.netMinor],
                    ].map(([Icon, label, value]) => {
                      const Symbol = Icon as typeof Wallet;
                      return (
                        <Card key={String(label)} className="border-brand-accent/20">
                          <Symbol className="mb-3 h-5 w-5 text-green-700 dark:text-brand-accent" />
                          <p className="text-sm text-muted-foreground">{String(label)}</p>
                          <strong className="mt-2 block break-words text-xl" dir="ltr">
                            {money(Number(value), total.currency)}
                          </strong>
                        </Card>
                      );
                    })}
                  </div>
                ))
              ) : (
                <EmptyState title="لا توجد حركة مالية في الفترة المختارة" />
              )}
              <Card>
                <h3 className="mb-4 text-lg font-black">الإيراد حسب الباقة والسعر وقت الدفع</h3>
                <div className="grid gap-3 lg:grid-cols-2">
                  {report.plans.map((plan, i) => (
                    <div className="rounded-lg border border-border p-4" key={i}>
                      <strong>{plan.name}</strong>
                      <p className="mt-2 text-sm">
                        {plan.durationDays ?? '—'} يوم · {money(plan.unitPriceMinor, plan.currency)}
                      </p>
                      <p className="mt-2 text-sm text-muted-foreground">
                        {plan.players} لاعب · {plan.count} عملية دفع
                      </p>
                      <p className="mt-3 font-black" dir="ltr">
                        {money(plan.totalMinor, plan.currency)}
                      </p>
                    </div>
                  ))}
                </div>
                <p className="mt-4 text-xs leading-6 text-muted-foreground">
                  قد يدفع اللاعب أكثر من مرة. عدد اللاعبين فريد داخل كل باقة وسعر؛ لا يُجمع كعدد
                  فريد للفرع. لا تُعاد تسعيرة السجلات السابقة.
                </p>
              </Card>
              <Card>
                <h3 className="mb-4 font-black">استلام الدفعات حسب المراقب</h3>
                <div className="grid gap-3 sm:grid-cols-2">
                  {report.receivers.map((receiver, i) => (
                    <div className="rounded-lg bg-muted p-3 text-sm" key={i}>
                      <strong>{receiver.name}</strong>
                      <p className="mt-2">
                        {receiver.count} دفعة · {money(receiver.totalMinor, receiver.currency)}
                      </p>
                    </div>
                  ))}
                </div>
              </Card>
              <h3 className="font-black">تفاصيل المصاريف</h3>
              <ExpenseCards expenses={report.expenses} />
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
          <Pager
            page={report.page}
            count={tab === 'financial' ? report.expenseCount : report.receiptCount}
            onChange={(page) => generate.mutate({ page, dates: report.range })}
          />
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
