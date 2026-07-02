'use client';

import { useMutation } from '@tanstack/react-query';
import Image from 'next/image';
import { useSearchParams } from 'next/navigation';
import { CheckCircle2, Clock3, Dumbbell } from 'lucide-react';
import { useEffect } from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardTitle } from '@/components/ui/card';
import { ErrorState, Skeleton } from '@/components/ui/state';
import { StatusBadge } from '@/components/ui/status-badge';
import { apiRequest, jsonBody } from '@/lib/api/client';
import { formatCompactDateTime } from '@/lib/utils';

type AttendanceResult = {
  member: { name: string; photoUrl: string | null; goal: string };
  membership: { status: string; remainingDays: number };
  message: string;
  previousCheckIn: string | null;
};

export function AttendanceScan() {
  const token = useSearchParams().get('token');
  const scan = useMutation({
    mutationFn: () =>
      apiRequest<AttendanceResult>('/attendance/scan', {
        body: jsonBody({ token }),
        method: 'POST',
      }),
  });

  useEffect(() => {
    if (token && scan.isIdle) scan.mutate();
  }, [scan, token]);

  if (!token) return <ErrorState message="رمز الحضور غير موجود" />;
  if (scan.isPending || scan.isIdle) return <Skeleton className="mx-auto h-80 max-w-xl" />;
  if (scan.error) return <ErrorState message={scan.error.message} />;

  const result = scan.data;

  return (
    <Card className="mx-auto max-w-xl overflow-hidden border-brand-accent/40 p-0 shadow-2xl">
      <div className="relative overflow-hidden bg-foreground p-7 text-center text-background dark:bg-black">
        <div className="absolute -start-20 -top-24 h-64 w-64 rounded-full bg-brand-accent/20 blur-3xl" />
        <CheckCircle2 className="relative mx-auto h-10 w-10 text-brand-accent" />
        <CardTitle className="relative mt-3 text-2xl text-white">{result.message}</CardTitle>
        <div className="relative mx-auto mt-6 h-28 w-28 overflow-hidden rounded-full border-4 border-brand-accent bg-muted">
          {result.member.photoUrl ? (
            <Image
              alt={result.member.name}
              className="h-full w-full object-cover"
              height={112}
              src={result.member.photoUrl}
              width={112}
            />
          ) : null}
        </div>
        <h1 className="relative mt-4 text-3xl font-black text-white">{result.member.name}</h1>
        <p className="relative mt-2 text-sm font-bold text-white/65">{result.member.goal}</p>
      </div>
      <div className="p-6">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-lg border border-border bg-muted/40 p-4 text-center">
            <Clock3 className="mx-auto h-5 w-5 text-green-700 dark:text-brand-accent" />
            <p className="mt-2 text-xs font-bold text-muted-foreground">آخر دخول سابق</p>
            <p className="mt-1 font-black">
              {result.previousCheckIn
                ? formatCompactDateTime(result.previousCheckIn)
                : 'هذه أول زيارة مسجلة'}
            </p>
          </div>
          <div className="rounded-lg border border-border bg-muted/40 p-4 text-center">
            <Dumbbell className="mx-auto h-5 w-5 text-green-700 dark:text-brand-accent" />
            <p className="mt-2 text-xs font-bold text-muted-foreground">الاشتراك</p>
            <p className="mt-1 font-black">{result.membership.remainingDays} يوم متبقٍ</p>
          </div>
        </div>
        <div className="mt-5 flex items-center justify-center gap-3">
          <StatusBadge status={result.membership.status} />
        </div>
        <Button className="mt-6 w-full" onClick={() => scan.mutate()} variant="secondary">
          إعادة المحاولة
        </Button>
      </div>
    </Card>
  );
}
