'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, Search, UserCheck, X } from 'lucide-react';
import Image from 'next/image';
import { useDeferredValue, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardTitle } from '@/components/ui/card';
import { Dialog } from '@/components/ui/dialog';
import { Input, Textarea } from '@/components/ui/input';
import { Pagination, type PaginatedResponse } from '@/components/ui/pagination';
import { DashboardLoader, EmptyState, ErrorState } from '@/components/ui/state';
import { StatusBadge } from '@/components/ui/status-badge';
import { apiRequest, jsonBody } from '@/lib/api/client';
import { formatCompactDateTime } from '@/lib/utils';

type Observer = { fullName: string; id: string };
type Request = {
  approvedDays: number | null;
  createdAt: string;
  id: string;
  member: {
    currentWeightKg: number | string;
    dateOfBirth: string;
    fitnessGoal: string;
    heightCm: number | string;
    user: { avatarUrl: string | null; fullName: string; phone: string; username: string };
  };
  observer: Observer | null;
  reviewReason: string | null;
  reviewedAt: string | null;
  reviewer: { fullName: string } | null;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
};

export function RegistrationRequestsPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const [query, setQuery] = useState('');
  const deferredQuery = useDeferredValue(query);
  const [selected, setSelected] = useState<Request | null>(null);
  const [observerId, setObserverId] = useState('');
  const [days, setDays] = useState(30);
  const [reason, setReason] = useState('');

  const requests = useQuery({
    queryFn: () =>
      apiRequest<PaginatedResponse<Request>>(
        `/admin/registration-requests?page=${page}&pageSize=12&status=${status}&q=${encodeURIComponent(deferredQuery)}`,
      ),
    queryKey: ['registration-requests', page, status, deferredQuery],
    refetchInterval: 1_500,
  });
  const observers = useQuery({
    queryFn: () =>
      apiRequest<PaginatedResponse<Observer>>('/admin/observers?page=1&pageSize=100&status=ACTIVE'),
    queryKey: ['shift-observers', 'registration-requests'],
  });
  const review = useMutation({
    mutationFn: ({ approve }: { approve: boolean }) =>
      apiRequest(`/admin/registration-requests/${selected?.id}/review`, {
        body: jsonBody({ approve, days, observerId: approve ? observerId : undefined, reason }),
        method: 'POST',
      }),
    onSuccess: async () => {
      setSelected(null);
      setReason('');
      setDays(30);
      await queryClient.invalidateQueries({ queryKey: ['admin-sidebar-badges'] });
      await queryClient.invalidateQueries({ queryKey: ['registration-requests'] });
      await queryClient.invalidateQueries({ queryKey: ['reception-feed'] });
    },
  });

  function open(request: Request) {
    setSelected(request);
    setObserverId(observers.data?.items[0]?.id ?? '');
    setDays(30);
    setReason('');
  }

  return (
    <div className="space-y-5">
      <Card>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.16em] text-brand-accent">
              Pro Gym / Reception
            </p>
            <CardTitle className="mt-2 text-2xl">طلبات إنشاء الحسابات</CardTitle>
            <p className="mt-2 text-sm leading-7 text-muted-foreground">
              سجل كامل للطلبات الجديدة والطلبات المعتمدة أو المرفوضة.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-[minmax(14rem,1fr)_12rem]">
            <label className="relative">
              <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="ps-10"
                onChange={(event) => {
                  setQuery(event.target.value);
                  setPage(1);
                }}
                placeholder="الاسم، المستخدم، الهاتف"
                value={query}
              />
            </label>
            <select
              className="min-h-11 rounded-lg border border-input bg-card px-4 text-sm font-bold"
              onChange={(event) => {
                setStatus(event.target.value);
                setPage(1);
              }}
              value={status}
            >
              <option value="">كل الحالات</option>
              <option value="PENDING">قيد الانتظار</option>
              <option value="APPROVED">مقبول</option>
              <option value="REJECTED">مرفوض</option>
            </select>
          </div>
        </div>
      </Card>

      {requests.isLoading ? (
        <DashboardLoader />
      ) : requests.error ? (
        <ErrorState message={requests.error.message} />
      ) : !requests.data?.items.length ? (
        <EmptyState body="لا توجد طلبات مطابقة للتصفية الحالية." title="لا توجد طلبات" />
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {requests.data.items.map((request) => (
            <Card className="flex flex-col gap-5 sm:flex-row" key={request.id}>
              <div className="relative h-40 w-full shrink-0 overflow-hidden rounded-lg border border-border bg-muted sm:h-36 sm:w-36">
                {request.member.user.avatarUrl ? (
                  <Image
                    alt={request.member.user.fullName}
                    fill
                    sizes="(max-width: 640px) 100vw, 144px"
                    className="object-contain"
                    src={request.member.user.avatarUrl}
                  />
                ) : null}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <h2 className="font-black">{request.member.user.fullName}</h2>
                    <p className="mt-1 text-xs text-muted-foreground">
                      @{request.member.user.username} · {request.member.user.phone}
                    </p>
                  </div>
                  <StatusBadge status={request.status} />
                </div>
                <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">
                  {request.member.fitnessGoal}
                </p>
                <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-3">
                  <span className="text-xs text-muted-foreground">
                    {formatCompactDateTime(request.createdAt)}
                  </span>
                  {request.status === 'PENDING' ? (
                    <Button className="h-10" onClick={() => open(request)}>
                      <UserCheck className="h-4 w-4" /> مراجعة الطلب
                    </Button>
                  ) : (
                    <span className="text-xs font-bold">
                      {request.reviewer?.fullName ?? '—'} ·{' '}
                      {request.approvedDays
                        ? `${request.approvedDays} يوم`
                        : (request.reviewReason ?? '—')}
                    </span>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
      {requests.data ? <Pagination meta={requests.data.meta} onPageChange={setPage} /> : null}

      <Dialog
        description="راجع صورة اللاعب وبياناته، ثم حدد المراقب ومدة الاشتراك عند القبول."
        onClose={() => setSelected(null)}
        open={Boolean(selected)}
        title="مراجعة طلب التسجيل"
      >
        {selected ? (
          <div className="space-y-5">
            <div className="grid gap-4 rounded-lg border border-border p-4 sm:grid-cols-[14rem_1fr]">
              <div className="relative h-64 overflow-hidden rounded-lg border border-border bg-muted sm:h-72">
                {selected.member.user.avatarUrl ? (
                  <Image
                    alt={selected.member.user.fullName}
                    fill
                    sizes="(max-width: 640px) 100vw, 224px"
                    className="object-contain"
                    src={selected.member.user.avatarUrl}
                  />
                ) : null}
              </div>
              <div className="text-sm leading-7">
                <strong className="block text-lg">{selected.member.user.fullName}</strong>
                <span className="block text-muted-foreground">
                  {selected.member.user.phone} · @{selected.member.user.username}
                </span>
                <span className="block">
                  الطول: {selected.member.heightCm} سم · الوزن: {selected.member.currentWeightKg} كغ
                </span>
                <span className="block">الهدف: {selected.member.fitnessGoal}</span>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="space-y-2 text-sm font-bold">
                <span>المراقب</span>
                <select
                  className="min-h-11 w-full rounded-lg border border-input bg-card px-3"
                  onChange={(event) => setObserverId(event.target.value)}
                  value={observerId}
                >
                  <option value="">اختر المراقب</option>
                  {observers.data?.items.map((observer) => (
                    <option key={observer.id} value={observer.id}>
                      {observer.fullName}
                    </option>
                  ))}
                </select>
              </label>
              <label className="space-y-2 text-sm font-bold">
                <span>عدد أيام الاشتراك</span>
                <Input
                  min={1}
                  onChange={(event) => setDays(Number(event.target.value))}
                  type="number"
                  value={days}
                />
              </label>
            </div>
            <Textarea
              onChange={(event) => setReason(event.target.value)}
              placeholder="ملاحظة اختيارية، وتظهر للاعب عند الرفض"
              value={reason}
            />
            {review.error ? <ErrorState message={review.error.message} /> : null}
            <div className="grid gap-3 sm:grid-cols-2">
              <Button
                disabled={review.isPending || !observerId || days < 1}
                isLoading={review.isPending && review.variables?.approve === true}
                loadingText="جاري القبول"
                onClick={() => review.mutate({ approve: true })}
              >
                <Check className="h-4 w-4" /> قبول وتفعيل الاشتراك
              </Button>
              <Button
                disabled={review.isPending}
                isLoading={review.isPending && review.variables?.approve === false}
                loadingText="جاري الرفض"
                onClick={() => review.mutate({ approve: false })}
                variant="danger"
              >
                <X className="h-4 w-4" /> رفض الطلب
              </Button>
            </div>
          </div>
        ) : null}
      </Dialog>
    </div>
  );
}
