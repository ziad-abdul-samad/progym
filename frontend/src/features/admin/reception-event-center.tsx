'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeftRight,
  BadgeCheck,
  CalendarClock,
  ScanLine,
  ShieldX,
  UserRoundPlus,
} from 'lucide-react';
import Image from 'next/image';
import { useEffect, useState, type ReactNode } from 'react';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog, DialogCancelButton, DialogForm } from '@/components/ui/dialog';
import { Input, Textarea } from '@/components/ui/input';
import type { PaginatedResponse } from '@/components/ui/pagination';
import { StatusBadge } from '@/components/ui/status-badge';
import { useToast } from '@/components/ui/toast';
import { apiRequest, jsonBody } from '@/lib/api/client';
import { useAuth } from '@/lib/auth/use-auth';
import { formatCompactDateTime } from '@/lib/utils';

type ShiftObserver = {
  fullName: string;
  id: string;
  status: string;
};

type ReceptionEvent = {
  id: string;
  attemptedBranch?: BranchSummary;
  denialCode?: 'BRANCH_NOT_ALLOWED' | 'NO_ACTIVE_SUBSCRIPTION' | 'SUBSCRIPTION_INACTIVE';
  kind: 'ATTENDANCE' | 'DENIED_ENTRY' | 'REGISTRATION';
  member: {
    age: number;
    avatarUrl: string | null;
    fitnessGoal: string;
    gender: string;
    heightCm: string | number;
    homeBranch: BranchSummary;
    id: string;
    name: string;
    phone: string;
    username: string;
    weightKg: string | number;
  };
  membership: {
    branch: BranchSummary | null;
    plan: string | null;
    remainingDays: number;
    status: string;
  } | null;
  occurredAt: string;
  previousCheckIn: string | null;
  requestId?: string | null;
};

type BranchSummary = {
  code: string;
  id: string;
  nameAr: string;
  nameEn: string;
};

const SEEN_EVENTS_KEY = 'progym-reception-seen-events';

function readSeenEvents(): string[] {
  try {
    return JSON.parse(window.sessionStorage.getItem(SEEN_EVENTS_KEY) ?? '[]') as string[];
  } catch {
    return [];
  }
}

export function ReceptionEventCenter() {
  const auth = useAuth();
  const queryClient = useQueryClient();
  const { push } = useToast();
  const [activeEvent, setActiveEvent] = useState<ReceptionEvent | null>(null);
  const feed = useQuery({
    queryFn: () => apiRequest<ReceptionEvent[]>('/admin/reception-feed'),
    queryKey: ['reception-feed'],
    refetchInterval: 1_000,
  });
  const observers = useQuery({
    queryFn: () =>
      apiRequest<PaginatedResponse<ShiftObserver>>(
        '/admin/observers?page=1&pageSize=100&status=ACTIVE',
      ),
    queryKey: ['shift-observers', 'reception-select'],
  });
  const review = useMutation({
    mutationFn: (payload: {
      approve: boolean;
      days?: number;
      observerId?: string;
      reason: string;
    }) =>
      apiRequest(`/admin/registration-requests/${activeEvent?.requestId}/review`, {
        body: jsonBody(payload),
        method: 'POST',
      }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['subscriptions'] }),
        queryClient.invalidateQueries({ queryKey: ['admin-members'] }),
        queryClient.invalidateQueries({ queryKey: ['reception-feed'] }),
      ]);
      markSeenAndClose();
      push({ title: 'تمت مراجعة طلب اللاعب', tone: 'success' });
    },
  });
  const subscribeHere = useMutation({
    mutationFn: (payload: {
      days: number;
      memberId: string;
      observerId?: string;
      reason: string;
    }) =>
      apiRequest('/memberships/subscriptions', {
        body: jsonBody(payload),
        method: 'POST',
      }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['subscriptions'] }),
        queryClient.invalidateQueries({ queryKey: ['reception-feed'] }),
        queryClient.invalidateQueries({ queryKey: ['admin-overview'] }),
      ]);
      markSeenAndClose();
      push({
        title: 'تم تفعيل الفرع. اطلب من اللاعب مسح الرمز مرة أخرى.',
        tone: 'success',
      });
    },
  });

  useEffect(() => {
    if (activeEvent || !feed.data?.length) return;
    const seen = new Set(readSeenEvents());
    const next = feed.data.find((event) => !seen.has(event.id));
    if (next) setActiveEvent(next);
  }, [activeEvent, feed.data]);

  function markSeenAndClose() {
    if (!activeEvent) return;
    const seen = Array.from(new Set([...readSeenEvents(), activeEvent.id])).slice(-100);
    window.sessionStorage.setItem(SEEN_EVENTS_KEY, JSON.stringify(seen));
    setActiveEvent(null);
  }

  return (
    <Dialog
      description={
        activeEvent?.kind === 'REGISTRATION'
          ? 'اكتمل تسجيل لاعب جديد. راجع البيانات وحدد مدة اشتراكه قبل إغلاق النافذة.'
          : activeEvent?.kind === 'DENIED_ENTRY'
            ? 'لم يتم تسجيل حضور. راجع فرع اشتراك اللاعب، ويمكنك بدء اشتراك جديد له في هذا الفرع بعد استلام الدفع.'
            : 'تم تسجيل دخول اللاعب بنجاح. هذه البطاقة مخصصة للتحقق السريع في الاستقبال.'
      }
      onClose={markSeenAndClose}
      open={Boolean(activeEvent)}
      title={
        activeEvent?.kind === 'REGISTRATION'
          ? 'تسجيل لاعب جديد'
          : activeEvent?.kind === 'DENIED_ENTRY'
            ? 'محاولة دخول غير مسموحة'
            : 'دخول ناجح للنادي'
      }
    >
      {activeEvent ? (
        <div className="space-y-4">
          <div className="relative overflow-hidden rounded-lg border border-brand-accent/35 bg-foreground p-5 text-background dark:bg-black">
            <div className="absolute -end-10 -top-12 h-36 w-36 rounded-full bg-brand-accent/25 blur-3xl" />
            <div className="relative flex items-center gap-4">
              {activeEvent.member.avatarUrl ? (
                <Image
                  alt={activeEvent.member.name}
                  className="h-28 w-24 rounded-lg bg-black/20 object-contain p-0.5 ring-2 ring-brand-accent"
                  height={112}
                  src={activeEvent.member.avatarUrl}
                  width={96}
                />
              ) : (
                <div className="flex h-24 w-24 items-center justify-center rounded-lg bg-white/10">
                  <ScanLine className="h-10 w-10 text-brand-accent" />
                </div>
              )}
              <div className="min-w-0">
                <div className="mb-2 flex items-center gap-2 text-brand-accent">
                  {activeEvent.kind === 'REGISTRATION' ? (
                    <UserRoundPlus className="h-5 w-5" />
                  ) : activeEvent.kind === 'DENIED_ENTRY' ? (
                    <ShieldX className="h-5 w-5 text-red-300" />
                  ) : (
                    <BadgeCheck className="h-5 w-5" />
                  )}
                  <span className="text-xs font-black">
                    {activeEvent.kind === 'REGISTRATION'
                      ? 'حساب جديد'
                      : activeEvent.kind === 'DENIED_ENTRY'
                        ? 'تم رفض الدخول ولم يُسجل حضور'
                        : 'تم التحقق من الدخول'}
                  </span>
                </div>
                <h2 className="truncate text-2xl font-black">{activeEvent.member.name}</h2>
                <p className="mt-1 text-sm font-semibold text-white/65">
                  @{activeEvent.member.username} · {activeEvent.member.phone}
                </p>
              </div>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Info label="الهدف" value={activeEvent.member.fitnessGoal} />
            <Info label="العمر" value={`${activeEvent.member.age} سنة`} />
            <Info label="الطول" value={`${activeEvent.member.heightCm} سم`} />
            <Info label="الوزن" value={`${activeEvent.member.weightKg} كغ`} />
          </div>

          {activeEvent.kind === 'ATTENDANCE' && activeEvent.membership ? (
            <Card className="grid gap-4 sm:grid-cols-3">
              <Info
                label="حالة الاشتراك"
                value={<StatusBadge status={activeEvent.membership.status} />}
              />
              <Info label="الأيام المتبقية" value={`${activeEvent.membership.remainingDays} يوم`} />
              <Info
                label="آخر دخول سابق"
                value={
                  activeEvent.previousCheckIn
                    ? formatCompactDateTime(activeEvent.previousCheckIn)
                    : 'أول دخول'
                }
              />
              <div className="flex items-center gap-2 text-sm font-black text-green-700 dark:text-brand-accent sm:col-span-3">
                <CalendarClock className="h-4 w-4" />
                دخول اليوم: {formatCompactDateTime(activeEvent.occurredAt)}
              </div>
            </Card>
          ) : activeEvent.kind === 'DENIED_ENTRY' ? (
            <div className="space-y-4">
              <Card className="grid gap-3 border-red-500/25 bg-red-500/[0.04] sm:grid-cols-2">
                <Info label="فرع التسجيل الأصلي" value={activeEvent.member.homeBranch.nameAr} />
                <Info
                  label="فرع الاشتراك المدفوع الحالي"
                  value={activeEvent.membership?.branch?.nameAr ?? 'لا يوجد اشتراك فعال'}
                />
                <Info
                  label="الفرع الذي تم مسحه"
                  value={activeEvent.attemptedBranch?.nameAr ?? '-'}
                />
                <Info
                  label="سبب الرفض"
                  value={
                    activeEvent.denialCode === 'BRANCH_NOT_ALLOWED'
                      ? 'الاشتراك الحالي لا يسمح بدخول هذا الفرع'
                      : 'الاشتراك غير فعال أو منتهي'
                  }
                />
              </Card>
              <DialogForm
                actions={
                  <>
                    <DialogCancelButton onClick={markSeenAndClose} />
                    <Button isLoading={subscribeHere.isPending} loadingText="جاري تفعيل الفرع">
                      <ArrowLeftRight className="h-4 w-4" />
                      اشتراك جديد في هذا الفرع
                    </Button>
                  </>
                }
                onSubmit={(event) => {
                  event.preventDefault();
                  const form = new FormData(event.currentTarget);
                  subscribeHere.mutate({
                    days: Number(form.get('days')),
                    memberId: activeEvent.member.id,
                    observerId:
                      typeof form.get('observerId') === 'string'
                        ? (form.get('observerId') as string)
                        : undefined,
                    reason:
                      typeof form.get('reason') === 'string' ? (form.get('reason') as string) : '',
                  });
                }}
              >
                <p className="text-sm leading-7 text-muted-foreground">
                  بعد التأكد من الدفع، سيُنهي النظام الاشتراك السابق ويبدأ اشتراكاً جديداً بسعر هذا
                  الفرع. سيبقى فرع التسجيل الأصلي محفوظاً ولن تضيع أي بيانات.
                </p>
                <Input defaultValue={30} min={1} name="days" required type="number" />
                {auth.data?.role !== 'OBSERVER' ? (
                  <select
                    className="min-h-11 w-full rounded-lg border border-input bg-background px-3 text-sm font-bold"
                    name="observerId"
                    required
                  >
                    <option value="">اختر مراقب الشفت</option>
                    {observers.data?.items.map((observer) => (
                      <option key={observer.id} value={observer.id}>
                        {observer.fullName}
                      </option>
                    ))}
                  </select>
                ) : null}
                <Textarea
                  defaultValue={`اشتراك جديد في ${activeEvent.attemptedBranch?.nameAr ?? 'الفرع'} بعد استلام الدفع`}
                  name="reason"
                  required
                />
              </DialogForm>
            </div>
          ) : (
            <DialogForm
              actions={
                <>
                  <DialogCancelButton onClick={markSeenAndClose} />
                  <Button
                    disabled={review.isPending}
                    isLoading={review.isPending && review.variables?.approve === false}
                    loadingText="جاري رفض الطلب"
                    onClick={() =>
                      review.mutate({ approve: false, reason: 'رفض الطلب من نافذة الاستقبال' })
                    }
                    type="button"
                    variant="danger"
                  >
                    رفض
                  </Button>
                  <Button
                    disabled={review.isPending}
                    isLoading={review.isPending && review.variables?.approve === true}
                    loadingText="جاري تفعيل الاشتراك"
                  >
                    تفعيل مدة اللاعب
                  </Button>
                </>
              }
              onSubmit={(event) => {
                event.preventDefault();
                const form = new FormData(event.currentTarget);
                review.mutate({
                  approve: true,
                  days: Number(form.get('days')),
                  observerId:
                    typeof form.get('observerId') === 'string'
                      ? (form.get('observerId') as string)
                      : '',
                  reason:
                    typeof form.get('reason') === 'string' ? (form.get('reason') as string) : '',
                });
              }}
            >
              <Input
                defaultValue={30}
                min={1}
                name="days"
                placeholder="عدد أيام الاشتراك"
                required
                type="number"
              />
              {auth.data?.role !== 'OBSERVER' ? (
                <select
                  className="min-h-11 w-full rounded-lg border border-input bg-background px-3 text-sm font-bold"
                  name="observerId"
                  required
                >
                  <option value="">اختر مراقب الشفت</option>
                  {observers.data?.items.map((observer) => (
                    <option key={observer.id} value={observer.id}>
                      {observer.fullName}
                    </option>
                  ))}
                </select>
              ) : null}
              <Textarea
                defaultValue="تفعيل الاشتراك بعد التسجيل لأول مرة"
                name="reason"
                placeholder="سبب التفعيل"
                required
              />
            </DialogForm>
          )}

          {activeEvent.kind === 'ATTENDANCE' ? (
            <div className="flex justify-end">
              <Button onClick={markSeenAndClose}>تم التحقق</Button>
            </div>
          ) : null}
        </div>
      ) : null}
    </Dialog>
  );
}

function Info({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="rounded-lg border border-border bg-muted/35 p-3">
      <p className="text-xs font-black text-muted-foreground">{label}</p>
      <div className="mt-1 text-sm font-black text-foreground">{value}</div>
    </div>
  );
}
