'use client';
import { useQuery } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { apiRequest } from '@/lib/api/client';
import { ErrorState } from '@/components/ui/state';
import { Button } from '@/components/ui/button';

export type BranchPlan = {
  id: string;
  nameAr: string;
  nameEn: string;
  durationDays: number;
  priceMinor: number;
  currency: string;
  isActive: boolean;
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
  return useQuery({
    queryKey: ['branch-plans', params.branchCode],
    queryFn: () => apiRequest<BranchPlan[]>('/memberships/plans'),
  });
}
export function RequestKey() {
  const [key, setKey] = useState('');
  useEffect(() => setKey(crypto.randomUUID()), []);
  return <input name="requestKey" type="hidden" value={key} />;
}
export function PlanPicker({ onChange }: { onChange?: (plan: BranchPlan | null) => void }) {
  const plans = useBranchPlans();
  const [selected, setSelected] = useState<BranchPlan | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  return (
    <div className="min-w-0 space-y-3 rounded-xl border border-brand-accent/35 bg-brand-accent/5 p-4">
      <label className="grid min-w-0 gap-2 text-sm font-bold">
        باقة الاشتراك المدفوعة
        <select
          className="min-h-12 w-full min-w-0 rounded-lg border border-input bg-card px-3 text-sm"
          required
          value={selected?.id ?? ''}
          onChange={(e) => {
            setSelected(plans.data?.find((p) => p.id === e.target.value) ?? null);
            setConfirmed(false);
            onChange?.(null);
          }}
        >
          <option value="">
            {plans.isLoading ? 'جاري تحميل الباقات…' : 'اختر الباقة — السعر والمدة'}
          </option>
          {plans.data
            ?.filter((p) => p.isActive)
            .map((p) => (
              <option key={p.id} value={p.id}>
                {p.nameAr} · {p.durationDays} يوم · {money(p.priceMinor, p.currency)}
              </option>
            ))}
        </select>
      </label>
      <Button
        type="button"
        variant="ghost"
        className="min-h-9 px-0 text-xs"
        isLoading={plans.isFetching}
        onClick={() => {
          setSelected(null);
          setConfirmed(false);
          onChange?.(null);
          void plans.refetch();
        }}
      >
        تحديث الباقات والأسعار
      </Button>
      {plans.error ? <ErrorState message={plans.error.message} /> : null}
      {plans.data && !plans.data.some((p) => p.isActive) ? (
        <p className="text-sm text-amber-700 dark:text-amber-300">
          أضف باقة فعالة من صفحة «باقات الاشتراك» أولاً.
        </p>
      ) : null}
      {selected ? (
        <>
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
                setConfirmed(e.target.checked);
                onChange?.(e.target.checked ? selected : null);
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
