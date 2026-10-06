'use client';

import { useDeferredValue, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import { Archive, Banknote, Pencil, Plus, RotateCcw, Search, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog, DialogCancelButton, DialogForm } from '@/components/ui/dialog';
import { Input, Textarea } from '@/components/ui/input';
import { Pagination, type PaginatedResponse } from '@/components/ui/pagination';
import { DashboardLoader, EmptyState, ErrorState } from '@/components/ui/state';
import { useToast } from '@/components/ui/toast';
import { ApiClientError, apiRequest, jsonBody } from '@/lib/api/client';
import { businessDate, salaryMonthLabel } from './finance-format';
import { money, RequestKey } from './plan-picker';

type Person = {
  id: string;
  name: string;
  jobTitle: string | null;
  salaryMinor: number;
  currency: string;
  updatedAt: string;
  archivedAt: string | null;
  paid: { currency: string; amountMinor: number; count: number }[];
  paymentCount: number;
};
function CurrencyField({ value }: { value: string }) {
  return (
    <label className="grid min-w-0 gap-2 text-sm font-bold">
      العملة
      <select
        name="currency"
        defaultValue={value}
        className="min-h-11 w-full min-w-0 rounded-lg border border-input bg-card px-3"
      >
        <option value="SYP_NEW">ليرة سورية جديدة</option>
        <option value="USD">دولار أمريكي</option>
      </select>
    </label>
  );
}
function PaidSummary({ person }: { person: Person }) {
  return person.paid.length ? (
    <div className="space-y-1">
      {person.paid.map((p) => (
        <p
          dir="ltr"
          className="break-words font-black text-green-800 dark:text-green-200"
          key={p.currency}
        >
          {money(p.amountMinor, p.currency)}
        </p>
      ))}
      <p className="text-xs text-muted-foreground">{person.paymentCount} دفعة فعلية</p>
    </div>
  ) : (
    <span className="text-sm text-muted-foreground">لم يُسجّل دفع</span>
  );
}
function PersonActions({
  person,
  disabled,
  onPay,
  onEdit,
  onStatus,
}: {
  person: Person;
  disabled: boolean;
  onPay: (person: Person) => void;
  onEdit: (person: Person) => void;
  onStatus: (person: Person) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {!person.archivedAt ? (
        <Button disabled={disabled} onClick={() => onPay(person)}>
          <Banknote className="me-2 h-4 w-4" />
          تسجيل دفعة
        </Button>
      ) : null}
      <Button
        disabled={disabled}
        variant="secondary"
        onClick={() => onEdit(person)}
        aria-label={`تعديل ${person.name}`}
        title="تعديل الاسم والراتب المعتاد"
      >
        <Pencil className="h-4 w-4" />
      </Button>
      <Button
        disabled={disabled}
        variant="secondary"
        onClick={() => onStatus(person)}
        aria-label={`${person.archivedAt ? 'إعادة تفعيل' : 'إيقاف'} ${person.name}`}
        title={person.archivedAt ? 'إعادة تفعيل' : 'إيقاف العامل دون حذف دفعاته'}
      >
        {person.archivedAt ? <RotateCcw className="h-4 w-4" /> : <Archive className="h-4 w-4" />}
      </Button>
    </div>
  );
}

export function PayrollTab() {
  const params = useParams(),
    client = useQueryClient(),
    { push } = useToast();
  const [month, setMonth] = useState(() => businessDate().slice(0, 7));
  const [q, setQ] = useState(''),
    search = useDeferredValue(q);
  const [status, setStatus] = useState('ACTIVE'),
    [page, setPage] = useState(1);
  const [editing, setEditing] = useState<Person | 'new' | null>(null);
  const [paying, setPaying] = useState<Person | null>(null),
    [statusPerson, setStatusPerson] = useState<Person | null>(null);
  const people = useQuery({
    queryKey: ['salary-recipients', params.branchCode, month, status, search, page],
    enabled: !!month,
    queryFn: () =>
      apiRequest<PaginatedResponse<Person>>(
        '/finance/salary-recipients?' +
          new URLSearchParams({ month, status, q: search, page: String(page) }),
      ),
  });
  function refresh() {
    void client.invalidateQueries({ queryKey: ['salary-recipients'] });
    void client.invalidateQueries({ queryKey: ['finance-expenses'] });
  }
  const save = useMutation({
    mutationFn: (form: FormData) => {
      const data = {
        name: form.get('name'),
        jobTitle: form.get('jobTitle'),
        currency: form.get('currency'),
        salaryMinor: Math.round(Number(form.get('amount')) * 100),
      };
      const person = editing && editing !== 'new' ? editing : null;
      return apiRequest('/finance/salary-recipients' + (person ? '/' + person.id : ''), {
        method: person ? 'PATCH' : 'POST',
        body: jsonBody({ ...data, ...(person ? { expectedUpdatedAt: person.updatedAt } : {}) }),
      });
    },
    onSuccess: () => {
      setEditing(null);
      refresh();
      push({ title: 'تم حفظ العامل في قائمة رواتب الفرع', tone: 'success' });
    },
  });
  const pay = useMutation({
    mutationFn: (form: FormData) =>
      apiRequest('/finance/salary-payments', {
        method: 'POST',
        body: jsonBody({
          recipientId: paying?.id,
          expectedUpdatedAt: paying?.updatedAt,
          month,
          previousPaymentCount: paying?.paymentCount,
          confirmAdditional: form.get('confirmAdditional') === 'on',
          amountMinor: Math.round(Number(form.get('amount')) * 100),
          currency: form.get('currency'),
          spentOn: form.get('spentOn'),
          notes: form.get('notes'),
          requestKey: form.get('requestKey'),
        }),
      }),
    onSuccess: () => {
      setPaying(null);
      refresh();
      push({ title: 'تم تسجيل دفعة الراتب ضمن المصاريف والتقارير', tone: 'success' });
    },
    onError: (error) => {
      if (error instanceof ApiClientError && error.status === 409) {
        setPaying(null);
        refresh();
        push({
          title: error.message,
          body: 'راجع القائمة المحدّثة ثم افتح تسجيل الدفعة مجدداً.',
          tone: 'error',
        });
      }
    },
  });
  const changeStatus = useMutation({
    mutationFn: () =>
      apiRequest('/finance/salary-recipients/' + statusPerson?.id + '/status', {
        method: 'PATCH',
        body: jsonBody({
          archived: !statusPerson?.archivedAt,
          expectedUpdatedAt: statusPerson?.updatedAt,
        }),
      }),
    onSuccess: () => {
      setStatusPerson(null);
      refresh();
      push({ title: 'تم تحديث حالة العامل دون تغيير الدفعات السابقة', tone: 'success' });
    },
  });
  function openEdit(person: Person) {
    save.reset();
    setEditing(person);
  }
  function openPay(person: Person) {
    pay.reset();
    setPaying(person);
  }
  function openStatus(person: Person) {
    changeStatus.reset();
    setStatusPerson(person);
  }
  const current = editing && editing !== 'new' ? editing : null;
  const defaultPaymentMinor = Math.max(
    0,
    (paying?.salaryMinor ?? 0) -
      (paying?.paid.find((p) => p.currency === paying.currency)?.amountMinor ?? 0),
  );
  return (
    <div className="min-w-0 space-y-4">
      <Card>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-green-700 dark:text-brand-accent" />
              <h2 className="text-xl font-black">رواتب العاملين والمراقبين</h2>
            </div>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-muted-foreground">
              احفظ الاسم والراتب المعتاد مرة واحدة، ثم سجّل ما دفعته فعلياً. لا يُحتسب أي مصروف
              بمجرد إضافة عامل؛ يُحتسب عند حفظ دفعة الراتب فقط.
            </p>
          </div>
          <Button
            onClick={() => {
              save.reset();
              setEditing('new');
            }}
          >
            <Plus className="me-2 h-4 w-4" />
            إضافة عامل
          </Button>
        </div>
        <div className="mt-5 grid min-w-0 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <label className="grid min-w-0 gap-2 text-sm font-bold">
            الشهر الذي تخصّه الدفعات
            <Input
              type="month"
              value={month}
              required
              className="min-w-0 max-w-full appearance-none"
              style={{ width: '100%', minWidth: 0 }}
              onChange={(e) => {
                setMonth(e.target.value);
                setPage(1);
              }}
            />
          </label>
          <label className="grid min-w-0 gap-2 text-sm font-bold">
            البحث بالاسم أو الوظيفة
            <div className="relative min-w-0">
              <Search aria-hidden className="absolute end-3 top-3 h-5 w-5 text-muted-foreground" />
              <Input
                value={q}
                maxLength={120}
                className="pe-11"
                placeholder="مثال: أحمد، مراقب، تنظيف"
                onChange={(e) => {
                  setQ(e.target.value);
                  setPage(1);
                }}
              />
            </div>
          </label>
          <label className="grid min-w-0 gap-2 text-sm font-bold">
            قائمة العاملين
            <select
              className="min-h-11 w-full rounded-lg border border-input bg-card px-3"
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(1);
              }}
            >
              <option value="ACTIVE">العاملون الحاليون</option>
              <option value="ARCHIVED">العاملون الموقوفون</option>
            </select>
          </label>
        </div>
        <p className="mt-4 text-xs leading-6 text-muted-foreground">
          «المدفوع عن الشهر» يجمع الدفعات غير الملغاة عن الشهر المختار. أما التقرير المالي فيحتسب
          الراتب في يوم دفعه الفعلي، حتى لو كان عن شهر سابق. العملات منفصلة.
        </p>
      </Card>
      {!month ? (
        <ErrorState message="اختر شهر الراتب لعرض الدفعات" />
      ) : people.isLoading ? (
        <DashboardLoader />
      ) : people.error ? (
        <ErrorState message={people.error.message} />
      ) : people.data ? (
        <>
          {people.data.items.length ? (
            <>
              <Card className="hidden min-w-0 md:block">
                <table className="w-full table-fixed text-start text-sm">
                  <caption className="mb-4 text-start font-black">
                    دفعات {salaryMonthLabel(month)}
                  </caption>
                  <thead>
                    <tr className="border-b border-border text-muted-foreground">
                      <th className="w-[25%] p-3 text-start">الاسم والوظيفة</th>
                      <th className="w-[22%] p-3 text-start">الراتب المعتاد</th>
                      <th className="w-[23%] p-3 text-start">المدفوع عن الشهر</th>
                      <th className="w-[30%] p-3 text-start">الإجراءات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {people.data.items.map((person) => (
                      <tr key={person.id} className="border-b border-border last:border-0">
                        <td className="break-words p-3">
                          <strong>{person.name}</strong>
                          <p className="mt-2 text-xs text-muted-foreground">
                            {person.jobTitle || 'عامل بالفرع'}
                          </p>
                        </td>
                        <td className="break-words p-3" dir="ltr">
                          {person.salaryMinor
                            ? money(person.salaryMinor, person.currency)
                            : 'غير محدد'}
                        </td>
                        <td className="p-3">
                          <PaidSummary person={person} />
                        </td>
                        <td className="p-3">
                          <PersonActions
                            person={person}
                            disabled={people.isFetching}
                            onPay={openPay}
                            onEdit={openEdit}
                            onStatus={openStatus}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Card>
              <div className="grid min-w-0 gap-3 md:hidden">
                {people.data.items.map((person) => (
                  <Card key={person.id}>
                    <h3 className="break-words text-lg font-black">{person.name}</h3>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {person.jobTitle || 'عامل بالفرع'}
                    </p>
                    <dl className="my-4 grid min-w-0 grid-cols-2 gap-3 rounded-lg bg-muted p-3 text-sm">
                      <div className="min-w-0">
                        <dt className="mb-2 text-xs text-muted-foreground">الراتب المعتاد</dt>
                        <dd className="break-words" dir="ltr">
                          {person.salaryMinor
                            ? money(person.salaryMinor, person.currency)
                            : 'غير محدد'}
                        </dd>
                      </div>
                      <div className="min-w-0">
                        <dt className="mb-2 text-xs text-muted-foreground">المدفوع عن الشهر</dt>
                        <dd>
                          <PaidSummary person={person} />
                        </dd>
                      </div>
                    </dl>
                    <PersonActions
                      person={person}
                      disabled={people.isFetching}
                      onPay={openPay}
                      onEdit={openEdit}
                      onStatus={openStatus}
                    />
                  </Card>
                ))}
              </div>
            </>
          ) : (
            <EmptyState
              title={
                status === 'ACTIVE' ? 'أضف أسماء العاملين في هذا الفرع' : 'لا يوجد عاملون موقوفون'
              }
              body="تُحفظ الأسماء لتسجيل الرواتب القادمة دون إعادة كتابتها."
            />
          )}
          <Pagination meta={people.data.meta} onPageChange={setPage} />
        </>
      ) : null}
      <Dialog
        open={!!editing}
        title={current ? 'تعديل بيانات العامل' : 'إضافة عامل إلى قائمة الرواتب'}
        onClose={() => {
          if (!save.isPending) setEditing(null);
        }}
        description="الراتب المعتاد اقتراح للدفعة القادمة فقط. تعديل الاسم أو الراتب لا يغيّر أي قيد سابق."
      >
        {editing ? (
          <DialogForm
            key={typeof editing === 'string' ? 'new' : editing.id}
            onSubmit={(e) => {
              e.preventDefault();
              save.mutate(new FormData(e.currentTarget));
            }}
            actions={
              <>
                <DialogCancelButton
                  disabled={save.isPending}
                  onClick={() => {
                    if (!save.isPending) setEditing(null);
                  }}
                />
                <Button isLoading={save.isPending} loadingText="جارٍ الحفظ">
                  حفظ العامل
                </Button>
              </>
            }
          >
            <label className="grid gap-2 text-sm font-bold">
              اسم العامل أو المراقب
              <Input
                name="name"
                minLength={2}
                maxLength={120}
                required
                defaultValue={current?.name}
                placeholder="اكتب الاسم الكامل"
              />
            </label>
            <label className="grid gap-2 text-sm font-bold">
              الوظيفة أو الوردية (اختياري)
              <Input
                name="jobTitle"
                maxLength={100}
                defaultValue={current?.jobTitle ?? ''}
                placeholder="مثال: مراقب استقبال - الوردية الأولى"
              />
            </label>
            <div className="grid min-w-0 gap-3 sm:grid-cols-2">
              <label className="grid min-w-0 gap-2 text-sm font-bold">
                الراتب المعتاد
                <Input
                  dir="ltr"
                  type="number"
                  name="amount"
                  required
                  min="0"
                  max="20000000"
                  step="0.01"
                  defaultValue={(current?.salaryMinor ?? 0) / 100}
                />
              </label>
              <CurrencyField value={current?.currency ?? 'SYP_NEW'} />
            </div>
            <p className="text-xs leading-6 text-muted-foreground">
              يمكن ترك الراتب صفرًا إن كان متغيرًا؛ اكتب المبلغ الفعلي عند الدفع. إذا غادر العامل،
              أوقفه وأضف العامل الجديد للحفاظ على هويته وتاريخه.
            </p>
            {save.error ? <ErrorState message={save.error.message} /> : null}
          </DialogForm>
        ) : null}
      </Dialog>
      <Dialog
        open={!!paying}
        title="تسجيل دفعة راتب فعلية"
        onClose={() => {
          if (!pay.isPending) setPaying(null);
        }}
        description="تأكيد الحفظ يعني أن المبلغ سُلّم للعامل فعلاً، وسيُضاف مرة واحدة إلى المصاريف."
      >
        {paying ? (
          <DialogForm
            key={paying.id}
            onSubmit={(e) => {
              e.preventDefault();
              pay.mutate(new FormData(e.currentTarget));
            }}
            actions={
              <>
                <DialogCancelButton
                  disabled={pay.isPending}
                  onClick={() => {
                    if (!pay.isPending) setPaying(null);
                  }}
                />
                <Button isLoading={pay.isPending} loadingText="جارٍ تسجيل الدفعة">
                  تأكيد دفع الراتب
                </Button>
              </>
            }
          >
            <RequestKey />
            <div className="rounded-lg border border-brand-accent/30 bg-muted p-4">
              <strong className="break-words text-lg">{paying.name}</strong>
              <p className="mt-2 text-sm">
                عن {salaryMonthLabel(month)} · {paying.jobTitle || 'عامل بالفرع'}
              </p>
              <p className="mt-3 text-xs text-muted-foreground">المدفوع سابقًا عن الشهر</p>
              <PaidSummary person={paying} />
            </div>
            <div className="grid min-w-0 gap-3 sm:grid-cols-2">
              <label className="grid min-w-0 gap-2 text-sm font-bold">
                المبلغ المُسلّم الآن
                <Input
                  type="number"
                  dir="ltr"
                  name="amount"
                  min="0.01"
                  max="20000000"
                  step="0.01"
                  required
                  defaultValue={defaultPaymentMinor ? defaultPaymentMinor / 100 : ''}
                />
              </label>
              <CurrencyField value={paying.currency} />
            </div>
            <label className="grid min-w-0 gap-2 text-sm font-bold">
              تاريخ الدفع الفعلي
              <Input
                name="spentOn"
                type="date"
                required
                defaultValue={businessDate()}
                max={businessDate()}
                className="min-w-0 max-w-full appearance-none"
                style={{ width: '100%', minWidth: 0 }}
              />
            </label>
            <label className="grid gap-2 text-sm font-bold">
              ملاحظة (اختياري)
              <Textarea
                name="notes"
                maxLength={2000}
                placeholder="مثال: جزء من الراتب أو سلفة عن هذا الشهر"
              />
            </label>
            {paying.paymentCount > 0 ? (
              <label className="flex items-start gap-3 rounded-lg border border-amber-400/60 bg-amber-50 p-3 text-sm leading-7 text-amber-950 dark:bg-amber-950 dark:text-amber-100">
                <input
                  type="checkbox"
                  name="confirmAdditional"
                  required
                  className="mt-2 h-4 w-4 shrink-0"
                />
                توجد دفعات سابقة. أؤكد أن هذا مبلغ إضافي مقصود، وليس تكرارًا للدفعة السابقة.
              </label>
            ) : null}
            {pay.error ? <ErrorState message={pay.error.message} /> : null}
          </DialogForm>
        ) : null}
      </Dialog>
      <Dialog
        open={!!statusPerson}
        title={statusPerson?.archivedAt ? 'إعادة تفعيل العامل' : 'إيقاف العامل'}
        onClose={() => {
          if (!changeStatus.isPending) setStatusPerson(null);
        }}
      >
        <DialogForm
          onSubmit={(e) => {
            e.preventDefault();
            changeStatus.mutate();
          }}
          actions={
            <>
              <DialogCancelButton
                disabled={changeStatus.isPending}
                onClick={() => {
                  if (!changeStatus.isPending) setStatusPerson(null);
                }}
              />
              <Button
                variant={statusPerson?.archivedAt ? 'primary' : 'danger'}
                isLoading={changeStatus.isPending}
                loadingText="جارٍ التحديث"
              >
                {statusPerson?.archivedAt ? 'إعادة تفعيل' : 'تأكيد الإيقاف'}
              </Button>
            </>
          }
        >
          <p className="break-words font-black">{statusPerson?.name}</p>
          <p className="text-sm leading-7 text-muted-foreground">
            {statusPerson?.archivedAt
              ? 'سيعود إلى قائمة العاملين ويمكن تسجيل دفعات جديدة له.'
              : 'سيُنقل إلى قائمة الموقوفين ولن تُسجّل له دفعات جديدة. تبقى جميع رواتبه السابقة محفوظة في المصاريف والتقارير.'}
          </p>
          {changeStatus.error ? <ErrorState message={changeStatus.error.message} /> : null}
        </DialogForm>
      </Dialog>
    </div>
  );
}
