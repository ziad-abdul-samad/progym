'use client';
import { useQuery } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import { useEffect, useId, useState } from 'react';
import { CalendarDays, Check, CreditCard, RefreshCw, Search } from 'lucide-react';
import { apiRequest } from '@/lib/api/client';
import { useAuth } from '@/lib/auth/use-auth';
import { cn } from '@/lib/utils';
import { ErrorState } from '@/components/ui/state';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export type BranchPlan = {
  id: string;
  nameAr: string;
  nameEn: string;
  durationDays: number;
  priceMinor: number;
  currency: string;
  isActive: boolean;
  audience: 'MEN' | 'WOMEN';
  updatedAt: string;
};
export function money(minor: number, currency: string) {
  const label =
    currency === 'USD'
      ? '$'
      : currency === 'SYP_NEW'
        ? 'ل.س جديدة'
        : currency === 'SYP'
          ? 'ل.س (سجل سابق)'
          : currency;
  return `${(minor / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${label}`;
}
export function useBranchPlans() {
  const params = useParams();
  const auth = useAuth();
  return useQuery({
    queryKey: [
      'branch-plans',
      params.branchCode,
      auth.data?.id,
      auth.data?.shiftObserver?.audience ?? 'ALL',
    ],
    queryFn: () => apiRequest<BranchPlan[]>('/memberships/plans'),
    enabled: !!auth.data,
  });
}

export function PlanAudienceField({ defaultValue = 'MEN' }: { defaultValue?: 'MEN' | 'WOMEN' }) {
  return (
    <fieldset className="min-w-0 space-y-2">
      <legend className="text-sm font-bold">القسم</legend>
      <div className="grid grid-cols-2 gap-3">
        {(['MEN', 'WOMEN'] as const).map((audience) => (
          <label key={audience} className="cursor-pointer">
            <input
              className="peer sr-only"
              type="radio"
              name="audience"
              value={audience}
              defaultChecked={defaultValue === audience}
              required
            />
            <span className="flex min-h-12 items-center justify-center rounded-xl border border-input bg-card px-3 text-sm font-bold transition peer-checked:border-green-600 peer-checked:bg-green-600/10 peer-checked:text-green-800 peer-focus-visible:ring-2 peer-focus-visible:ring-ring dark:peer-checked:border-brand-accent dark:peer-checked:text-brand-accent">
              {audience === 'WOMEN' ? 'السيدات' : 'الرجال'}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
export function RequestKey() {
  const [key, setKey] = useState('');
  useEffect(() => setKey(crypto.randomUUID()), []);
  return <input name="requestKey" type="hidden" value={key} />;
}
export function PlanPicker({ onChange }: { onChange?: (plan: BranchPlan | null) => void }) {
  const plans = useBranchPlans();
  const auth = useAuth();
  const radioName = useId();
  const [selectedId, setSelectedId] = useState('');
  const [confirmedVersion, setConfirmedVersion] = useState('');
  const [search, setSearch] = useState('');
  const activePlans = (plans.data ?? []).filter((p) => p.isActive);
  const selected = activePlans.find((p) => p.id === selectedId) ?? null;
  const confirmed = !!selected && confirmedVersion === selected.updatedAt;
  const visiblePlans = activePlans.filter((p) =>
    `${p.nameAr} ${p.nameEn} ${p.durationDays} ${money(p.priceMinor, p.currency)}`
      .toLocaleLowerCase()
      .includes(search.trim().toLocaleLowerCase()),
  );
  useEffect(() => {
    onChange?.(confirmed ? selected : null);
  }, [onChange, confirmed, selected]);
  return (
    <div className="min-w-0 space-y-3 rounded-xl border border-brand-accent/35 bg-brand-accent/5 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="flex items-center gap-2 text-sm font-black">
          <CreditCard
            className="h-5 w-5 text-green-700 dark:text-brand-accent"
            aria-hidden="true"
          />
          باقة الاشتراك المدفوعة
        </p>
        {auth.data?.role === 'OBSERVER' ? (
          <span className="rounded-full bg-muted px-3 py-1 text-xs font-bold">
            {auth.data.shiftObserver?.audience === 'WOMEN' ? 'قسم السيدات' : 'قسم الرجال'}
          </span>
        ) : null}
      </div>
      <p className="text-xs leading-6 text-muted-foreground">
        اختر البطاقة المناسبة، ثم أكّد استلام المبلغ.
      </p>
      {activePlans.length > 4 ? (
        <label className="relative block">
          <span className="sr-only">البحث في الباقات</span>
          <Search
            className="pointer-events-none absolute right-3 top-3 h-5 w-5 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            className="min-w-0 pr-10"
            type="search"
            placeholder="ابحث بالاسم أو المدة أو السعر…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
      ) : null}
      {plans.isPending ? (
        <p role="status" className="animate-pulse py-4 text-sm text-muted-foreground">
          جاري تحميل الباقات…
        </p>
      ) : (
        <fieldset className="min-w-0">
          <legend className="sr-only">اختر باقة الاشتراك المدفوعة</legend>
          <div className="grid max-h-80 min-w-0 grid-cols-1 gap-2 overflow-y-auto p-1 sm:grid-cols-2">
            {visiblePlans.map((plan) => (
              <label key={plan.id} className="relative min-w-0 cursor-pointer">
                <input
                  type="radio"
                  name={radioName}
                  value={plan.id}
                  className="peer sr-only"
                  required={!selected}
                  checked={selectedId === plan.id}
                  onChange={() => {
                    setSelectedId(plan.id);
                    setConfirmedVersion('');
                  }}
                />
                <span
                  className={cn(
                    'flex h-full min-h-28 min-w-0 flex-col gap-3 rounded-xl border bg-card p-3.5 transition peer-focus-visible:ring-2 peer-focus-visible:ring-ring',
                    selectedId === plan.id
                      ? 'border-green-600 bg-green-600/10 shadow-sm dark:border-brand-accent dark:bg-brand-accent/10'
                      : 'border-border hover:border-green-600/60 dark:hover:border-brand-accent/60',
                  )}
                >
                  <span className="flex items-start justify-between gap-2">
                    <span className="min-w-0 break-words text-sm font-bold leading-6">
                      {plan.nameAr}
                    </span>
                    <span
                      className={cn(
                        'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border',
                        selectedId === plan.id
                          ? 'border-green-600 bg-green-600 text-white dark:border-brand-accent dark:bg-brand-accent dark:text-black'
                          : 'border-input',
                      )}
                      aria-hidden="true"
                    >
                      {selectedId === plan.id ? <Check className="h-3.5 w-3.5" /> : null}
                    </span>
                  </span>
                  <span className="mt-auto flex flex-wrap items-center justify-between gap-2">
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
                      {plan.durationDays} يوم
                    </span>
                    <span
                      className="break-words text-base font-black text-green-800 dark:text-brand-accent"
                      dir="ltr"
                    >
                      {money(plan.priceMinor, plan.currency)}
                    </span>
                  </span>
                </span>
              </label>
            ))}
          </div>
          {activePlans.length > 0 && visiblePlans.length === 0 ? (
            <p role="status" className="py-3 text-sm text-muted-foreground">
              لا توجد باقة مطابقة للبحث.
            </p>
          ) : null}
        </fieldset>
      )}
      <Button
        type="button"
        variant="ghost"
        className="min-h-9 px-0 text-xs"
        isLoading={plans.isFetching}
        onClick={() => {
          setSelectedId('');
          setConfirmedVersion('');
          setSearch('');
          void plans.refetch();
        }}
      >
        <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" /> تحديث الباقات والأسعار
      </Button>
      {plans.error ? <ErrorState message={plans.error.message} /> : null}
      {plans.data && !plans.data.some((p) => p.isActive) ? (
        <p className="text-sm text-amber-700 dark:text-amber-300">
          أضف باقة فعالة من صفحة «باقات الاشتراك» أولاً.
        </p>
      ) : null}
      {selected ? (
        <>
          <p className="text-sm font-bold leading-6">الباقة المختارة: {selected.nameAr}</p>
          <div className="flex flex-wrap justify-between gap-3 text-sm">
            <strong>{selected.durationDays} يوم</strong>
            <strong className="text-lg" dir="ltr">
              {money(selected.priceMinor, selected.currency)}
            </strong>
          </div>
          <label className="flex items-start gap-3 text-sm leading-7">
            <input
              className="mt-1.5 h-5 w-5 shrink-0 accent-green-600"
              type="checkbox"
              required
              checked={confirmed}
              onChange={(e) => {
                setConfirmedVersion(e.target.checked ? selected.updatedAt : '');
              }}
            />
            أؤكد استلام المبلغ المعروض من اللاعب. سيتم تسجيله في تقرير الفرع باسمي.
          </label>
        </>
      ) : null}
      <input name="planId" type="hidden" value={confirmed ? (selected?.id ?? '') : ''} />
      <input name="planUpdatedAt" type="hidden" value={selected?.updatedAt ?? ''} />
      <RequestKey />
    </div>
  );
}
