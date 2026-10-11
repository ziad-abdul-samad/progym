'use client';
import { useDeferredValue, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import { Plus, Coffee, Pencil, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog, DialogCancelButton, DialogForm } from '@/components/ui/dialog';
import { Input, Textarea } from '@/components/ui/input';
import { DashboardLoader, EmptyState, ErrorState } from '@/components/ui/state';
import { useToast } from '@/components/ui/toast';
import { apiRequest, jsonBody } from '@/lib/api/client';
import { money, RequestKey } from './plan-picker';
import { businessDate, financialTime } from './finance-format';
export type BarProduct = {
  id: string;
  name: string;
  currency: string;
  prices: { label: string; unitPriceMinor: number }[];
  isActive: boolean;
  updatedAt: string;
};
export type BarSale = {
  id: string;
  productNameSnapshot: string;
  priceLabelSnapshot: string;
  quantity: number;
  unitPriceMinor: number;
  amountMinor: number;
  currency: string;
  soldAt: string;
  createdAt: string;
  createdByName: string;
  notes: string | null;
  voidedAt: string | null;
  voidReason: string | null;
};
export type BarCash = {
  id: string;
  kind: 'EXPENSE' | 'OPENING';
  title: string;
  amountMinor: number;
  currency: string;
  spentAt: string;
  createdAt: string;
  createdByName: string;
  notes: string | null;
  voidedAt: string | null;
  voidReason: string | null;
};
export type BarReport = {
  sales: BarSale[];
  cashEntries: BarCash[];
  saleCount: number;
  cashCount: number;
  daily: { day: string; currency: string; amountMinor: number; quantity: number }[];
  products: {
    name: string;
    label: string;
    currency: string;
    unitPriceMinor: number;
    quantity: number;
    amountMinor: number;
  }[];
  expenseGroups: { title: string; currency: string; count: number; totalMinor: number }[];
  totals: {
    currency: string;
    incomeMinor: number;
    expenseMinor: number;
    netMinor: number;
    openingMinor: number | null;
    openingAt: string | null;
    totalAvailableMinor: number | null;
    closingMinor: number | null;
    closingAt?: string | null;
    balanceResetDuringPeriod?: boolean;
  }[];
};
const priceRows = (product?: BarProduct) =>
  product?.prices.map((p) => ({ label: p.label, amount: String(p.unitPriceMinor / 100) })) ?? [
    { label: 'لاعب', amount: '' },
    { label: 'مراقب / موظف', amount: '' },
  ];
export function BarTab({ report }: { report: BarReport }) {
  const params = useParams(),
    client = useQueryClient(),
    { push } = useToast();
  const [tab, setTab] = useState<'products' | 'sales' | 'cash'>('products'),
    [q, setQ] = useState(''),
    [page, setPage] = useState(1),
    [status, setStatus] = useState('ACTIVE');
  const search = useDeferredValue(q);
  const products = useQuery({
    queryKey: ['bar-products', params.branchCode, status, search, page],
    queryFn: () =>
      apiRequest<{ items: BarProduct[]; meta: { totalPages: number; total: number } }>(
        '/finance/bar/products?' + new URLSearchParams({ q: search, status, page: String(page) }),
      ),
  });
  const [editing, setEditing] = useState<BarProduct | null | undefined>(undefined),
    [prices, setPrices] = useState(() => priceRows()),
    [currency, setCurrency] = useState('SYP_NEW');
  const [selling, setSelling] = useState(false),
    [selected, setSelected] = useState<BarProduct | null>(null),
    [label, setLabel] = useState(''),
    [unit, setUnit] = useState(''),
    [quantity, setQuantity] = useState('1');
  const [cashKind, setCashKind] = useState<'EXPENSE' | 'OPENING' | null>(null),
    [voiding, setVoiding] = useState<{ id: string; type: 'sales' | 'cash' } | null>(null);
  const refresh = (message: string) => {
    push({ title: message, tone: 'success' });
    void client.invalidateQueries({ queryKey: ['bar-products'] });
    void client.invalidateQueries({ queryKey: ['finance-expenses'] });
  };
  const saveProduct = useMutation({
    mutationFn: (form: FormData) =>
      apiRequest('/finance/bar/products' + (editing?.id ? '/' + editing.id : ''), {
        method: editing?.id ? 'PATCH' : 'POST',
        body: jsonBody({
          name: form.get('name'),
          currency,
          prices: prices.map((p) => ({
            label: p.label,
            unitPriceMinor: Math.round(Number(p.amount) * 100),
          })),
          isActive: form.get('active') === 'on',
          ...(editing ? { expectedUpdatedAt: editing.updatedAt } : {}),
        }),
      }),
    onSuccess: () => {
      setEditing(undefined);
      refresh('تم حفظ المنتج دون تغيير المبيعات السابقة');
    },
  });
  const sale = useMutation({
    mutationFn: (form: FormData) =>
      apiRequest('/finance/bar/sales', {
        method: 'POST',
        body: jsonBody({
          productId: selected?.id,
          expectedUpdatedAt: selected?.updatedAt,
          priceLabel: label,
          quantity: Number(quantity),
          unitPriceMinor: Math.round(Number(unit) * 100),
          soldOn: form.get('date'),
          notes: form.get('notes'),
          requestKey: form.get('requestKey'),
        }),
      }),
    onSuccess: () => {
      setSelling(false);
      refresh('تم تسجيل البيع والمبلغ المقبوض');
    },
    onError: (error) => {
      void client.invalidateQueries({ queryKey: ['bar-products'] });
      push({
        title: error.message,
        body: 'إن تغيّر سعر المنتج، أغلق النافذة وافتح البيع مجددًا بعد تحديث القائمة.',
        tone: 'error',
      });
    },
  });
  const cash = useMutation({
    mutationFn: (form: FormData) =>
      apiRequest('/finance/bar/cash', {
        method: 'POST',
        body: jsonBody({
          kind: cashKind,
          title: form.get('title'),
          amountMinor: Math.round(Number(form.get('amount')) * 100),
          currency: form.get('currency'),
          spentOn: form.get('date'),
          notes: form.get('notes'),
          requestKey: form.get('requestKey'),
        }),
      }),
    onSuccess: () => {
      setCashKind(null);
      refresh('تم حفظ قيد البار بنجاح');
    },
  });
  const cancel = useMutation({
    mutationFn: (form: FormData) =>
      apiRequest('/finance/bar/' + voiding?.type + '/' + voiding?.id + '/void', {
        method: 'PATCH',
        body: jsonBody({ reason: form.get('reason') }),
      }),
    onSuccess: () => {
      setVoiding(null);
      refresh('تم إلغاء القيد مع الاحتفاظ بسجله');
    },
  });
  const openProduct = (product?: BarProduct) => {
    saveProduct.reset();
    setPrices(priceRows(product));
    setCurrency(product?.currency ?? 'SYP_NEW');
    setEditing(product ?? null);
  };
  const dateField = (
    <label className="grid min-w-0 gap-2 text-sm font-bold">
      تاريخ العملية
      <Input
        className="min-w-0 max-w-full"
        style={{ width: '100%', minWidth: 0 }}
        name="date"
        type="date"
        required
        max={businessDate()}
        defaultValue={businessDate()}
      />
    </label>
  );
  const pending = saveProduct.isPending || sale.isPending || cash.isPending || cancel.isPending;
  return (
    <div className="min-w-0 space-y-4">
      <Card>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 text-xl font-black">
              <Coffee className="h-5 w-5" /> بار الفرع
            </h2>
            <p className="mt-2 text-sm leading-7 text-muted-foreground">
              منتجات وأسعار محفوظة، ومبيعات بالكمية والسعر الفعلي. مصاريف البار منفصلة عن مصاريف
              النادي.
            </p>
          </div>
          <Button onClick={() => openProduct()}>
            <Plus className="h-4 w-4" /> إضافة منتج ثابت
          </Button>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button
            variant="secondary"
            onClick={() => {
              sale.reset();
              setSelected(null);
              setQuantity('1');
              setUnit('');
              setLabel('');
              setStatus('ACTIVE');
              setQ('');
              setPage(1);
              setSelling(true);
            }}
          >
            تسجيل بيع
          </Button>
          <Button
            variant="secondary"
            onClick={() => {
              cash.reset();
              setCashKind('EXPENSE');
            }}
          >
            تسجيل مصروف بار
          </Button>
          <Button
            variant="secondary"
            onClick={() => {
              cash.reset();
              setCashKind('OPENING');
            }}
          >
            تسجيل رصيد سابق معلوم
          </Button>
        </div>
      </Card>
      <div className="grid gap-3 sm:grid-cols-2">
        {report.totals.map((t) => (
          <Card key={t.currency}>
            <p className="text-sm text-muted-foreground">حركة البار خلال الفترة</p>
            <p className="mt-3 font-bold">مبيعات: {money(t.incomeMinor, t.currency)}</p>
            <p className="mt-2">مصاريف: {money(t.expenseMinor, t.currency)}</p>
            <p className="mt-2 font-bold">صافي الفترة: {money(t.netMinor, t.currency)}</p>
            <p className="mt-3 text-xs leading-6 text-muted-foreground">
              الرصيد السابق:{' '}
              {t.openingMinor === null ? 'غير مسجل' : money(t.openingMinor, t.currency)} · الرصيد
              بعد حركة الفترة:{' '}
              {t.closingMinor === null ? 'غير معلوم' : money(t.closingMinor, t.currency)}
            </p>
          </Card>
        ))}
      </div>
      <div className="flex flex-wrap gap-2" role="group" aria-label="أقسام البار">
        {(
          [
            ['products', 'المنتجات والأسعار'],
            ['sales', 'سجل المبيعات'],
            ['cash', 'مصاريف وأرصدة البار'],
          ] as const
        ).map(([key, title]) => (
          <Button
            key={key}
            variant={tab === key ? 'primary' : 'secondary'}
            aria-pressed={tab === key}
            onClick={() => setTab(key)}
          >
            {title}
          </Button>
        ))}
      </div>
      {tab === 'products' ? (
        <>
          <Card>
            <label className="grid gap-2 text-sm font-bold">
              <span className="flex items-center gap-2">
                <Search className="h-4 w-4" /> البحث عن منتج
              </span>
              <Input
                value={q}
                onChange={(e) => {
                  setQ(e.target.value);
                  setPage(1);
                }}
                placeholder="اسم المنتج"
              />
            </label>
            <div className="mt-3 flex gap-2">
              {['ACTIVE', 'ARCHIVED'].map((s) => (
                <Button
                  key={s}
                  variant={status === s ? 'primary' : 'secondary'}
                  onClick={() => {
                    setStatus(s);
                    setPage(1);
                  }}
                >
                  {s === 'ACTIVE' ? 'المتاحة' : 'الموقوفة'}
                </Button>
              ))}
            </div>
          </Card>
          {products.isLoading ? (
            <DashboardLoader />
          ) : products.error ? (
            <ErrorState message={products.error.message} />
          ) : (
            <div className="grid gap-3 lg:grid-cols-2">
              {products.data?.items.map((p) => (
                <Card key={p.id}>
                  <div className="flex flex-wrap justify-between gap-2">
                    <h3 className="font-black">{p.name}</h3>
                    <Button variant="secondary" onClick={() => openProduct(p)}>
                      <Pencil className="h-4 w-4" /> تعديل
                    </Button>
                  </div>
                  <div className="mt-4 grid gap-2">
                    {p.prices.map((price) => (
                      <p
                        key={price.label}
                        className="flex flex-wrap justify-between gap-2 rounded-lg bg-muted p-3 text-sm"
                      >
                        <span>{price.label}</span>
                        <strong dir="ltr">{money(price.unitPriceMinor, p.currency)}</strong>
                      </p>
                    ))}
                  </div>
                  {p.isActive && (
                    <Button
                      className="mt-4"
                      onClick={() => {
                        sale.reset();
                        const first = p.prices[0];
                        if (!first) return;
                        setSelected(p);
                        setLabel(first.label);
                        setUnit(String(first.unitPriceMinor / 100));
                        setQuantity('1');
                        setSelling(true);
                      }}
                    >
                      بيع هذا المنتج
                    </Button>
                  )}
                </Card>
              ))}
            </div>
          )}
          {!products.isLoading && !products.data?.items.length && (
            <EmptyState title="لا توجد منتجات مطابقة" />
          )}
          <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
            <span>
              صفحة {page} من {products.data?.meta.totalPages ?? 1}
            </span>
            <div className="flex gap-2">
              <Button variant="secondary" disabled={page === 1} onClick={() => setPage(page - 1)}>
                السابق
              </Button>
              <Button
                variant="secondary"
                disabled={page >= (products.data?.meta.totalPages ?? 1)}
                onClick={() => setPage(page + 1)}
              >
                التالي
              </Button>
            </div>
          </div>
        </>
      ) : tab === 'sales' ? (
        <div className="grid gap-3 lg:grid-cols-2">
          {report.sales.map((s) => (
            <Card key={s.id}>
              <h3 className="font-black">{s.productNameSnapshot}</h3>
              <p className="mt-3 text-sm">
                {s.quantity} قطعة × {money(s.unitPriceMinor, s.currency)} · {s.priceLabelSnapshot}
              </p>
              <p className="mt-2 font-black">المقبوض: {money(s.amountMinor, s.currency)}</p>
              <p className="mt-2 text-xs leading-6 text-muted-foreground">
                {businessDate(new Date(s.soldAt))} · سجّله {s.createdByName} ·{' '}
                {financialTime(s.createdAt)}
              </p>
              {s.notes && <p className="mt-2 whitespace-pre-wrap break-words text-sm">{s.notes}</p>}
              {s.voidedAt ? (
                <p className="mt-3 text-amber-700 dark:text-amber-300">
                  ملغى وغير محتسب: {s.voidReason}
                </p>
              ) : (
                <Button
                  className="mt-4"
                  variant="secondary"
                  onClick={() => {
                    cancel.reset();
                    setVoiding({ id: s.id, type: 'sales' });
                  }}
                >
                  إلغاء قيد خاطئ
                </Button>
              )}
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {report.cashEntries.map((c) => (
            <Card key={c.id}>
              <p className="text-xs text-muted-foreground">
                {c.kind === 'OPENING' ? 'رصيد افتتاحي معلوم — ليس مصروفًا' : 'مصروف بار'}
              </p>
              <h3 className="mt-2 font-black">{c.title}</h3>
              <p className="mt-3 font-bold">{money(c.amountMinor, c.currency)}</p>
              <p className="mt-2 text-xs leading-6 text-muted-foreground">
                {businessDate(new Date(c.spentAt))} · سجّله {c.createdByName} ·{' '}
                {financialTime(c.createdAt)}
              </p>
              {c.notes && <p className="mt-2 whitespace-pre-wrap break-words text-sm">{c.notes}</p>}
              {c.voidedAt ? (
                <p className="mt-3 text-amber-700 dark:text-amber-300">ملغى: {c.voidReason}</p>
              ) : (
                <Button
                  className="mt-4"
                  variant="secondary"
                  onClick={() => {
                    cancel.reset();
                    setVoiding({ id: c.id, type: 'cash' });
                  }}
                >
                  إلغاء قيد خاطئ
                </Button>
              )}
            </Card>
          ))}
        </div>
      )}
      <Dialog
        open={editing !== undefined}
        onClose={() => {
          if (!pending) setEditing(undefined);
        }}
        title={editing ? 'تعديل منتج البار' : 'إضافة منتج ثابت'}
        description="يمكن حفظ أسعار مختلفة للاعب والموظف أو أسعار أخرى. المبيعات السابقة تحتفظ بسعرها واسمها الأصليين."
      >
        {editing !== undefined && (
          <DialogForm
            onSubmit={(e) => {
              e.preventDefault();
              saveProduct.mutate(new FormData(e.currentTarget));
            }}
            actions={
              <>
                <DialogCancelButton
                  disabled={saveProduct.isPending}
                  onClick={() => setEditing(undefined)}
                />
                <Button isLoading={saveProduct.isPending}>حفظ المنتج</Button>
              </>
            }
          >
            <label className="grid gap-2 text-sm font-bold">
              اسم المنتج
              <Input
                name="name"
                required
                minLength={2}
                maxLength={120}
                defaultValue={editing?.name}
              />
            </label>
            <label className="grid gap-2 text-sm font-bold">
              عملة المنتج
              <select
                className="min-h-12 w-full rounded-lg border border-input bg-card px-3"
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
              >
                <option value="SYP_NEW">ليرة سورية جديدة</option>
                <option value="USD">دولار أمريكي</option>
              </select>
            </label>
            <div className="space-y-3">
              {prices.map((price, i) => (
                <div
                  key={i}
                  className="grid min-w-0 gap-3 rounded-lg border border-border p-3 sm:grid-cols-2"
                >
                  <label className="grid min-w-0 gap-2 text-sm">
                    عنوان السعر
                    <Input
                      required
                      minLength={2}
                      maxLength={60}
                      value={price.label}
                      onChange={(e) =>
                        setPrices(
                          prices.map((p, j) => (j === i ? { ...p, label: e.target.value } : p)),
                        )
                      }
                    />
                  </label>
                  <label className="grid min-w-0 gap-2 text-sm">
                    سعر القطعة
                    <Input
                      dir="ltr"
                      type="number"
                      min="0"
                      max="20000000"
                      step="0.01"
                      required
                      value={price.amount}
                      onChange={(e) =>
                        setPrices(
                          prices.map((p, j) => (j === i ? { ...p, amount: e.target.value } : p)),
                        )
                      }
                    />
                  </label>
                  {prices.length > 1 && (
                    <Button
                      type="button"
                      variant="secondary"
                      disabled={saveProduct.isPending}
                      onClick={() => setPrices(prices.filter((_, j) => j !== i))}
                    >
                      إزالة هذا السعر
                    </Button>
                  )}
                </div>
              ))}
            </div>
            <Button
              type="button"
              variant="secondary"
              disabled={prices.length >= 10 || saveProduct.isPending}
              onClick={() => setPrices([...prices, { label: '', amount: '' }])}
            >
              <Plus className="h-4 w-4" /> إضافة سعر آخر
            </Button>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="active" defaultChecked={editing?.isActive ?? true} />{' '}
              المنتج متاح للبيع (إلغاء التفعيل يوقف البيع ولا يحذف التاريخ)
            </label>
            {saveProduct.error && <ErrorState message={saveProduct.error.message} />}
          </DialogForm>
        )}
      </Dialog>
      <Dialog
        open={selling}
        onClose={() => {
          if (!sale.isPending) setSelling(false);
        }}
        title="تسجيل بيع من البار"
        description="اختر السعر المناسب، أو أدخل سعرًا خاصًا حسب المبلغ الذي استلمته فعليًا."
      >
        {selling && (
          <DialogForm
            onSubmit={(e) => {
              e.preventDefault();
              sale.mutate(new FormData(e.currentTarget));
            }}
            actions={
              <>
                <DialogCancelButton disabled={sale.isPending} onClick={() => setSelling(false)} />
                <Button disabled={!selected} isLoading={sale.isPending}>
                  تأكيد البيع والمبلغ
                </Button>
              </>
            }
          >
            <RequestKey />
            {!selected ? (
              <>
                <label className="grid gap-2 text-sm">
                  ابحث عن المنتج
                  <Input
                    value={q}
                    onChange={(e) => {
                      setStatus('ACTIVE');
                      setPage(1);
                      setQ(e.target.value);
                    }}
                  />
                </label>
                <div className="max-h-60 overflow-y-auto space-y-2">
                  {products.data?.items
                    .filter((p) => p.isActive)
                    .map((p) => (
                      <Button
                        key={p.id}
                        className="w-full justify-start"
                        type="button"
                        variant="secondary"
                        onClick={() => {
                          const first = p.prices[0];
                          if (!first) return;
                          setSelected(p);
                          setLabel(first.label);
                          setUnit(String(first.unitPriceMinor / 100));
                        }}
                      >
                        {p.name}
                      </Button>
                    ))}
                </div>
              </>
            ) : (
              <>
                <p className="font-black">{selected.name}</p>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    setSelected(null);
                    setPage(1);
                    setStatus('ACTIVE');
                    setQ('');
                  }}
                >
                  تغيير المنتج
                </Button>
                <div className="flex flex-wrap gap-2">
                  {selected.prices.map((p) => (
                    <Button
                      type="button"
                      key={p.label}
                      variant={label === p.label ? 'primary' : 'secondary'}
                      onClick={() => {
                        setLabel(p.label);
                        setUnit(String(p.unitPriceMinor / 100));
                      }}
                    >
                      {p.label} · {money(p.unitPriceMinor, selected.currency)}
                    </Button>
                  ))}
                </div>
              </>
            )}
            <div className="grid min-w-0 gap-3 sm:grid-cols-2">
              <label className="grid min-w-0 gap-2 text-sm font-bold">
                الكمية المباعة
                <Input
                  dir="ltr"
                  type="number"
                  min="1"
                  max="10000"
                  step="1"
                  required
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                />
              </label>
              <label className="grid min-w-0 gap-2 text-sm font-bold">
                سعر القطعة المستلم فعليًا
                <Input
                  dir="ltr"
                  type="number"
                  min="0"
                  max="20000000"
                  step="0.01"
                  required
                  value={unit}
                  onChange={(e) => {
                    setUnit(e.target.value);
                    setLabel('سعر مخصص');
                  }}
                />
              </label>
            </div>
            {dateField}
            <Textarea name="notes" maxLength={2000} placeholder="ملاحظات اختيارية" />
            <p className="rounded-lg bg-green-100 p-4 font-bold text-green-950 dark:bg-green-950 dark:text-green-100">
              المجموع:{' '}
              {money(
                Math.round(Number(quantity) * Number(unit) * 100),
                selected?.currency ?? 'SYP_NEW',
              )}
            </p>
            {sale.error && <ErrorState message={sale.error.message} />}
          </DialogForm>
        )}
      </Dialog>
      <Dialog
        open={!!cashKind}
        onClose={() => {
          if (!cash.isPending) setCashKind(null);
        }}
        title={cashKind === 'OPENING' ? 'رصيد البار السابق المعلوم' : 'مصروف بار جديد'}
        description={
          cashKind === 'OPENING'
            ? 'أدخل الرصيد قبل أي حركة في بداية اليوم المحدد. ليس دخلًا جديدًا ولا يُضاف للربح. لا تفترض صفرًا إذا لم تعرف الرصيد.'
            : 'سجّل ما دفعته للبار بتاريخ الدفع الفعلي؛ لا تعِد تسجيله ضمن مصاريف النادي.'
        }
      >
        {cashKind && (
          <DialogForm
            onSubmit={(e) => {
              e.preventDefault();
              cash.mutate(new FormData(e.currentTarget));
            }}
            actions={
              <>
                <DialogCancelButton disabled={cash.isPending} onClick={() => setCashKind(null)} />
                <Button isLoading={cash.isPending}>حفظ القيد</Button>
              </>
            }
          >
            <RequestKey />
            <label className="grid gap-2 text-sm font-bold">
              {cashKind === 'OPENING' ? 'وصف الرصيد' : 'اسم المصروف'}
              <Input
                name="title"
                minLength={2}
                maxLength={160}
                required
                defaultValue={cashKind === 'OPENING' ? 'رصيد البار المرحّل' : undefined}
              />
            </label>
            <div className="grid min-w-0 gap-3 sm:grid-cols-2">
              <label className="grid min-w-0 gap-2 text-sm">
                المبلغ
                <Input
                  name="amount"
                  type="number"
                  dir="ltr"
                  min={cashKind === 'OPENING' ? '0' : '0.01'}
                  max="20000000"
                  step="0.01"
                  required
                />
              </label>
              <label className="grid min-w-0 gap-2 text-sm">
                العملة
                <select
                  name="currency"
                  className="min-h-12 w-full rounded-lg border border-input bg-card px-3"
                >
                  <option value="SYP_NEW">ليرة سورية جديدة</option>
                  <option value="USD">دولار أمريكي</option>
                </select>
              </label>
            </div>
            {dateField}
            <Textarea name="notes" maxLength={2000} placeholder="ملاحظات أو رقم فاتورة (اختياري)" />
            {cash.error && <ErrorState message={cash.error.message} />}
          </DialogForm>
        )}
      </Dialog>
      <Dialog
        open={!!voiding}
        onClose={() => {
          if (!cancel.isPending) setVoiding(null);
        }}
        title="إلغاء قيد بار خاطئ"
        description="يبقى القيد في السجل، ويُستبعد من الحساب مع حفظ السبب واسم المراقب."
      >
        <DialogForm
          onSubmit={(e) => {
            e.preventDefault();
            cancel.mutate(new FormData(e.currentTarget));
          }}
          actions={
            <>
              <DialogCancelButton disabled={cancel.isPending} onClick={() => setVoiding(null)} />
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
            placeholder="سبب التصحيح"
          />
          {cancel.error && <ErrorState message={cancel.error.message} />}
        </DialogForm>
      </Dialog>
    </div>
  );
}
