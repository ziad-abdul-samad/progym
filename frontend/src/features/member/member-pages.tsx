'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Activity,
  Beef,
  Bot,
  CalendarDays,
  Calculator,
  Camera,
  CheckCircle2,
  CirclePause,
  Dumbbell,
  ExternalLink,
  Filter,
  Flame,
  Gauge,
  History,
  Leaf,
  MessageCircle,
  Search,
  Send,
  Sparkles,
  Target,
  TimerReset,
  Trophy,
  Upload,
  Weight,
  Wheat,
} from 'lucide-react';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import { type FormEvent, useMemo, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardTitle } from '@/components/ui/card';
import { Dialog, DialogCancelButton, DialogForm } from '@/components/ui/dialog';
import { MetricCard } from '@/components/ui/metric-card';
import { Input, Textarea } from '@/components/ui/input';
import { Pagination, type PageMeta } from '@/components/ui/pagination';
import { DashboardLoader, EmptyState, ErrorState } from '@/components/ui/state';
import { StatusBadge } from '@/components/ui/status-badge';
import { useToast } from '@/components/ui/toast';
import { apiRequest, jsonBody } from '@/lib/api/client';
import { cn, formatCompactDate, formatCompactDateTime } from '@/lib/utils';

const MemberRadialLabelChart = dynamic(
  () =>
    import('@/components/member/member-radial-label-chart').then(
      (module) => module.MemberRadialLabelChart,
    ),
  {
    loading: () => <Card className="h-[28rem] animate-pulse bg-muted/40" />,
    ssr: false,
  },
);

const ShadcnLineChart = dynamic(
  () => import('@/components/ui/chart').then((module) => module.ShadcnLineChart),
  {
    loading: () => <Card className="h-80 animate-pulse bg-muted/40" />,
    ssr: false,
  },
);

type Dashboard = {
  attendanceCount: number;
  assignedCoach: string | null;
  currentWeight: number;
  goal: string;
  lastAttendance: { checkedInAt: string } | null;
  member: {
    user: { fullName: string; phone: string; avatarUrl: string | null };
    heightCm: string | number;
  };
  membership: { status: string; remainingDays: number; endsAt: string | null };
  pendingRequests: Array<{ id: string; type: string; message: string | null }>;
  privateCoaching: {
    coachName: string;
    endsAt: string | null;
    hasNutritionPlan: boolean;
    hasWorkoutPlan: boolean;
    isActive: boolean;
    isReady: boolean;
    planRequirement: string;
    remainingDays: number;
    startsAt: string | null;
    status: 'ACTIVE' | 'PAUSED';
    waitingMessage: string | null;
  } | null;
};

type ProgressEntry = {
  id: string;
  measuredAt: string;
  weightKg: string | number | null;
  chestCm: string | number | null;
  waistCm: string | number | null;
  armsCm: string | number | null;
  notes: string | null;
};

type AttendanceHistory = {
  meta: PageMeta;
  monthlyCount: number;
  totalCount: number;
  records: Array<{ id: string; checkedInAt: string; source: string }>;
};

type MembershipHistoryItem = {
  auditLogs: Array<{
    action: string;
    adminName: string;
    createdAt: string;
    reason: string;
  }>;
  createdAt: string;
  endsAt: string;
  id: string;
  plan: { nameAr: string } | null;
  startsAt: string;
  status: string;
};

type Plan = {
  id: string;
  title: string;
  notes: string | null;
  items?: Array<{
    dayIndex: number;
    dayTitle?: string | null;
    id: string;
    reps: string | null;
    sets: number | null;
    exerciseName?: string | null;
    notes?: string | null;
    videoUrl?: string | null;
    exercise?: {
      category: { nameAr: string };
      id: string;
      nameAr: string;
      videoUrl: string | null;
    } | null;
  }>;
  meals?: Array<{
    id: string;
    name: string;
    notes?: string | null;
    timing?: string | null;
    items: Array<{
      calories?: number | null;
      carbsG?: string | number | null;
      fatG?: string | number | null;
      id: string;
      name: string;
      proteinG?: string | number | null;
      quantity: string | null;
    }>;
  }>;
  targetCalories?: number | null;
  targetCarbsG?: string | number | null;
  targetFatG?: string | number | null;
  targetMode?: string | null;
  targetProteinG?: string | number | null;
};

type ExerciseLibraryItem = {
  category: { id: string; nameAr: string };
  descriptionAr?: string | null;
  id: string;
  instructionsAr?: string | null;
  nameAr: string;
  videoUrl?: string | null;
};

type WorkoutLog = {
  completed: boolean;
  exercise: { nameAr: string } | null;
  id: string;
  isPersonalRecord: boolean;
  load: string | null;
  performedAt: string;
  planItem: { exerciseName: string | null } | null;
  repsCompleted: string | null;
  setsCompleted: number | null;
  source: string;
};
type CoachRequest = {
  id: string;
  type: string;
  status: string;
  message: string | null;
  requiredPhotoTypes?: string[];
  submittedPhotoTypes?: string[];
  createdAt: string;
  coach: { user: { fullName: string } };
};

type ProgressPhoto = {
  createdAt: string;
  fileAsset: { id: string };
  id: string;
  type: string;
};

type ProgressComparison = Record<
  'BACK' | 'FRONT' | 'SIDE',
  {
    baseline: ProgressPhoto | null;
    latest: ProgressPhoto | null;
    monthThree: ProgressPhoto | null;
    weekEight: ProgressPhoto | null;
  }
>;

type MemberProfileChangeRequest = {
  createdAt: string;
  id: string;
  requestedData: Record<string, boolean | number | string>;
  reviewReason: string | null;
  reviewer: { fullName: string } | null;
  status: 'APPROVED' | 'PENDING' | 'REJECTED';
};

function PageState<T>({
  query,
  children,
}: {
  query: { isLoading: boolean; error: Error | null; data?: T };
  children: (data: T) => React.ReactNode;
}) {
  if (query.isLoading) return <DashboardLoader />;
  if (query.error) return <ErrorState message={query.error.message} />;
  if (!query.data) return <EmptyState title="لا توجد بيانات" />;
  return children(query.data);
}

export function MemberOverviewPage() {
  const query = useQuery({
    queryFn: () => apiRequest<Dashboard>('/members/dashboard'),
    queryKey: ['member-dashboard'],
  });

  return (
    <PageState query={query}>
      {(data) => (
        <div className="space-y-4">
          <div>
            <h1 className="text-3xl font-bold">مرحبا {data.member.user.fullName}</h1>
            <p className="text-muted-foreground">ملخص سريع لحالتك داخل Pro Gym</p>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <MetricCard
              icon={TimerReset}
              label="الأيام المتبقية"
              tone="success"
              value={data.membership.remainingDays}
            />
            <MetricCard icon={Activity} label="عدد الحضور" value={data.attendanceCount} />
            <MetricCard icon={Weight} label="الوزن الحالي" value={`${data.currentWeight} كغ`} />
          </div>
          <MemberRadialLabelChart
            attendance={data.attendanceCount}
            remainingDays={data.membership.remainingDays}
            requests={data.pendingRequests.length}
          />
          {data.privateCoaching ? (
            <Card
              className={
                data.privateCoaching.isActive
                  ? 'overflow-hidden border-brand-accent/40 bg-brand-accent/5'
                  : 'overflow-hidden border-dashed'
              }
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-3">
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-foreground text-brand-accent">
                    {data.privateCoaching.isActive ? (
                      <Dumbbell className="h-6 w-6" />
                    ) : (
                      <CirclePause className="h-6 w-6" />
                    )}
                  </span>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <CardTitle>التدريب الخاص مع {data.privateCoaching.coachName}</CardTitle>
                      <StatusBadge status={data.privateCoaching.status} />
                    </div>
                    <p className="mt-2 text-sm font-semibold leading-7 text-muted-foreground">
                      {data.privateCoaching.isActive
                        ? 'خطتك الخاصة فعالة الآن. حافظ على التزامك وتابع تحديثات مدربك.'
                        : data.privateCoaching.waitingMessage}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2 text-xs font-black">
                      <span className="rounded-full bg-muted px-3 py-1.5">
                        {data.privateCoaching.hasWorkoutPlan
                          ? 'برنامج التدريب جاهز'
                          : 'برنامج التدريب قيد التجهيز'}
                      </span>
                      <span className="rounded-full bg-muted px-3 py-1.5">
                        {data.privateCoaching.hasNutritionPlan
                          ? 'خطة الغذاء جاهزة'
                          : 'خطة الغذاء قيد التجهيز'}
                      </span>
                    </div>
                  </div>
                </div>
                {data.privateCoaching.isActive ? (
                  <div className="shrink-0 rounded-lg bg-foreground px-5 py-4 text-center text-background">
                    <p className="text-3xl font-black text-brand-accent">
                      {data.privateCoaching.remainingDays}
                    </p>
                    <p className="mt-1 text-xs font-black">يوم متبقٍ</p>
                  </div>
                ) : (
                  <div className="flex shrink-0 items-center gap-2 rounded-lg bg-muted px-4 py-3 text-sm font-black">
                    <Sparkles className="h-4 w-4 text-brand-accent-foreground" />
                    سنخبرك عند الجاهزية
                  </div>
                )}
              </div>
            </Card>
          ) : null}
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <p className="text-sm text-muted-foreground">حالة الاشتراك</p>
              <div className="mt-3">
                <StatusBadge status={data.membership.status} />
              </div>
            </Card>
            <Card>
              <p className="text-sm text-muted-foreground">الأيام المتبقية</p>
              <p className="mt-2 text-3xl font-bold">{data.membership.remainingDays}</p>
            </Card>
            <Card>
              <p className="text-sm text-muted-foreground">عدد الحضور</p>
              <p className="mt-2 text-3xl font-bold">{data.attendanceCount}</p>
            </Card>
            <Card>
              <p className="text-sm text-muted-foreground">آخر حضور</p>
              <p className="mt-2 font-semibold">
                {data.lastAttendance
                  ? formatCompactDateTime(data.lastAttendance.checkedInAt)
                  : 'لا يوجد'}
              </p>
            </Card>
            <Card>
              <p className="text-sm text-muted-foreground">الوزن الحالي</p>
              <p className="mt-2 text-3xl font-bold">{data.currentWeight} كغ</p>
            </Card>
            <Card>
              <p className="text-sm text-muted-foreground">الهدف</p>
              <p className="mt-2 font-semibold">{data.goal}</p>
            </Card>
          </div>
          <Card>
            <CardTitle>الطلبات النشطة</CardTitle>
            <div className="mt-4 grid gap-3">
              {data.pendingRequests.length ? (
                data.pendingRequests.map((request) => (
                  <div className="rounded-md bg-muted p-3" key={request.id}>
                    <p className="font-semibold">{request.type}</p>
                    <p className="text-sm text-muted-foreground">
                      {request.message ?? 'طلب متابعة من المدرب'}
                    </p>
                  </div>
                ))
              ) : (
                <EmptyState title="لا توجد طلبات حاليا" />
              )}
            </div>
          </Card>
        </div>
      )}
    </PageState>
  );
}

export function MemberProfilePage() {
  const queryClient = useQueryClient();
  const { push } = useToast();
  const [photo, setPhoto] = useState<File | null>(null);
  const query = useQuery({
    queryFn: () => apiRequest<Dashboard>('/members/dashboard'),
    queryKey: ['member-dashboard'],
  });
  const requests = useQuery({
    queryFn: () => apiRequest<MemberProfileChangeRequest[]>('/members/profile/change-requests'),
    queryKey: ['member-profile-change-requests'],
  });
  const pendingRequest = requests.data?.find((request) => request.status === 'PENDING');
  const mutation = useMutation({
    mutationFn: (form: FormData) => apiRequest('/members/profile', { body: form, method: 'PATCH' }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['member-profile-change-requests'] });
      setPhoto(null);
      push({
        title: 'تم إرسال طلب التعديل',
        body: 'ستظهر البيانات الجديدة بعد موافقة الإدارة.',
        tone: 'success',
      });
    },
  });

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    if (photo) form.set('photo', photo);
    mutation.mutate(form);
  }

  return (
    <PageState query={query}>
      {(data) => (
        <div className="space-y-4">
          {pendingRequest ? (
            <Card className="border-amber-400/40 bg-amber-400/10">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <CardTitle>طلب التعديل قيد المراجعة</CardTitle>
                  <p className="mt-2 text-sm font-semibold text-muted-foreground">
                    أرسلت الطلب في {formatCompactDateTime(pendingRequest.createdAt)}. لا يمكن إرسال
                    طلب جديد حتى تراجعه الإدارة.
                  </p>
                </div>
                <StatusBadge status="PENDING" />
              </div>
            </Card>
          ) : null}

          <Card>
            <CardTitle>إدارة الملف الشخصي</CardTitle>
            <p className="mt-2 text-sm text-muted-foreground">
              أي تعديل ترسله سيبقى قيد المراجعة ولن يغيّر حسابك قبل موافقة الإدارة.
            </p>
            <form className="mt-6 grid gap-4 md:grid-cols-2" onSubmit={submit}>
              <Input
                defaultValue={data.member.user.fullName}
                disabled={Boolean(pendingRequest)}
                name="fullName"
                placeholder="الاسم"
              />
              <Input
                defaultValue={data.member.user.phone}
                disabled={Boolean(pendingRequest)}
                name="phone"
                placeholder="الهاتف"
              />
              <Input
                defaultValue={String(data.member.heightCm)}
                disabled={Boolean(pendingRequest)}
                name="heightCm"
                placeholder="الطول"
                type="number"
              />
              <Input
                defaultValue={String(data.currentWeight)}
                disabled={Boolean(pendingRequest)}
                name="weightKg"
                placeholder="الوزن"
                type="number"
              />
              <Input
                accept="image/jpeg,image/png,image/webp"
                className="md:col-span-2"
                disabled={Boolean(pendingRequest)}
                onChange={(event) => setPhoto(event.target.files?.[0] ?? null)}
                type="file"
              />
              {mutation.error ? (
                <div className="md:col-span-2">
                  <ErrorState message={mutation.error.message} />
                </div>
              ) : null}
              <Button
                className="md:col-span-2"
                disabled={Boolean(pendingRequest)}
                isLoading={mutation.isPending}
                loadingText="جاري إرسال الطلب"
              >
                إرسال طلب التعديل
              </Button>
            </form>
          </Card>

          {requests.data?.length ? (
            <Card>
              <CardTitle>سجل طلبات التعديل</CardTitle>
              <div className="mt-4 grid gap-3">
                {requests.data.map((request) => (
                  <div
                    className="flex flex-col gap-3 rounded-lg border border-border bg-muted/25 p-4 sm:flex-row sm:items-center sm:justify-between"
                    key={request.id}
                  >
                    <div>
                      <p className="font-black">{formatCompactDateTime(request.createdAt)}</p>
                      <p className="mt-1 text-xs font-semibold text-muted-foreground">
                        {Object.keys(request.requestedData)
                          .map(memberProfileFieldLabel)
                          .join(' · ')}
                      </p>
                      {request.reviewReason ? (
                        <p className="mt-2 text-sm font-bold text-foreground">
                          ملاحظة الإدارة: {request.reviewReason}
                        </p>
                      ) : null}
                    </div>
                    <StatusBadge status={request.status} />
                  </div>
                ))}
              </div>
            </Card>
          ) : null}
        </div>
      )}
    </PageState>
  );
}

function memberProfileFieldLabel(field: string) {
  return (
    {
      avatarChanged: 'الصورة الشخصية',
      currentWeightKg: 'الوزن',
      fullName: 'الاسم',
      heightCm: 'الطول',
      phone: 'الهاتف',
    }[field] ?? field
  );
}

export function MemberProgressPage() {
  const queryClient = useQueryClient();
  const { push } = useToast();
  const [progressPhoto, setProgressPhoto] = useState<File | null>(null);
  const query = useQuery({
    queryFn: () => apiRequest<ProgressEntry[]>('/progress'),
    queryKey: ['progress'],
  });
  const requests = useQuery({
    queryFn: () => apiRequest<CoachRequest[]>('/members/requests'),
    queryKey: ['member-requests'],
  });
  const comparison = useQuery({
    queryFn: () => apiRequest<ProgressComparison>('/progress/photos/comparison'),
    queryKey: ['progress-photo-comparison'],
  });
  const mutation = useMutation({
    mutationFn: (payload: Record<string, FormDataEntryValue>) =>
      apiRequest('/progress', { body: jsonBody(payload), method: 'POST' }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['progress'] });
      push({ title: 'تم حفظ القياس', tone: 'success' });
    },
  });
  const photoMutation = useMutation({
    mutationFn: (form: FormData) => apiRequest('/progress/photos', { body: form, method: 'POST' }),
    onSuccess: async () => {
      setProgressPhoto(null);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['auth', 'me'] }),
        queryClient.invalidateQueries({ queryKey: ['member-requests'] }),
        queryClient.invalidateQueries({ queryKey: ['progress'] }),
        queryClient.invalidateQueries({ queryKey: ['progress-photo-comparison'] }),
      ]);
      push({
        title: 'تم رفع صورة التقدم',
        body: 'تم إرسالها للمدرب وفتح القفل إن وجد.',
        tone: 'success',
      });
    },
  });
  const chartPoints = useMemo(
    () => query.data?.filter((entry) => entry.weightKg).slice(-8) ?? [],
    [query.data],
  );
  const pendingPhotoRequest = requests.data?.find(
    (request) => request.status === 'PENDING' && request.type === 'NEW_PHOTOS',
  );

  return (
    <div className="space-y-4">
      <Card>
        <CardTitle>إضافة قياس جديد</CardTitle>
        <form
          className="mt-4 grid gap-3 md:grid-cols-4"
          onSubmit={(event) => {
            event.preventDefault();
            mutation.mutate(Object.fromEntries(new FormData(event.currentTarget)));
          }}
        >
          <Input name="weightKg" placeholder="الوزن" type="number" />
          <Input name="chestCm" placeholder="الصدر" type="number" />
          <Input name="waistCm" placeholder="الخصر" type="number" />
          <Input name="armsCm" placeholder="الذراع" type="number" />
          <Textarea className="md:col-span-4" name="notes" placeholder="ملاحظات" />
          {mutation.error ? (
            <div className="md:col-span-4">
              <ErrorState message={mutation.error.message} />
            </div>
          ) : null}
          <Button
            className="md:col-span-4"
            isLoading={mutation.isPending}
            loadingText="جاري حفظ القياس"
          >
            حفظ القياس
          </Button>
        </form>
      </Card>
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle>رفع صور التقدم</CardTitle>
            <p className="mt-2 text-sm leading-7 text-muted-foreground">
              عند طلب المدرب صور جديدة، ارفع صورة أمامية أو جانبية أو خلفية. بعد الرفع يتم إغلاق طلب
              الصور تلقائياً.
            </p>
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-foreground text-background dark:bg-brand-accent dark:text-black">
            <Camera className="h-6 w-6" />
          </div>
        </div>
        {pendingPhotoRequest ? (
          <div className="mt-4 rounded-lg border border-brand-accent/35 bg-brand-accent/10 p-4">
            <p className="font-black">
              تم رفع {pendingPhotoRequest.submittedPhotoTypes?.length ?? 0} من{' '}
              {pendingPhotoRequest.requiredPhotoTypes?.length ?? 3} صور مطلوبة
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {(pendingPhotoRequest.requiredPhotoTypes ?? ['FRONT', 'SIDE', 'BACK']).map((type) => (
                <StatusBadge
                  key={type}
                  status={
                    pendingPhotoRequest.submittedPhotoTypes?.includes(type) ? 'COMPLETED' : type
                  }
                />
              ))}
            </div>
          </div>
        ) : null}
        <form
          className="mt-5 grid gap-3 md:grid-cols-[0.7fr_1.3fr_auto]"
          onSubmit={(event) => {
            event.preventDefault();
            if (!progressPhoto) return;
            const form = new FormData(event.currentTarget);
            form.set('photo', progressPhoto);
            photoMutation.mutate(form);
          }}
        >
          <select
            className="min-h-11 rounded-lg border border-input bg-white/62 px-3 text-sm font-semibold text-foreground shadow-inner outline-none transition hover:border-foreground/20 focus:border-brand-accent focus:ring-2 focus:ring-ring dark:bg-white/5"
            name="type"
            required
          >
            <option value="FRONT">أمامية</option>
            <option value="SIDE">جانبية</option>
            <option value="BACK">خلفية</option>
          </select>
          <Input
            accept="image/jpeg,image/png,image/webp"
            name="photo"
            onChange={(event) => setProgressPhoto(event.target.files?.[0] ?? null)}
            required
            type="file"
          />
          <Button
            className="gap-2"
            disabled={!progressPhoto}
            isLoading={photoMutation.isPending}
            loadingText="جاري الرفع"
          >
            <Upload className="h-4 w-4" />
            رفع الصورة
          </Button>
          {photoMutation.error ? (
            <div className="md:col-span-3">
              <ErrorState message={photoMutation.error.message} />
            </div>
          ) : null}
        </form>
      </Card>
      {comparison.data ? (
        <Card>
          <CardTitle>مقارنة الصور حسب الزاوية</CardTitle>
          <div className="mt-4 grid gap-4 lg:grid-cols-3">
            {(['FRONT', 'SIDE', 'BACK'] as const).map((type) => {
              const pair = comparison.data[type];
              return (
                <section className="rounded-lg border border-border p-3" key={type}>
                  <div className="mb-3 flex items-center justify-between">
                    <StatusBadge status={type} />
                    <span className="text-xs font-bold text-muted-foreground">الأقدم ← الأحدث</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {[pair.baseline, pair.latest].map((photo, index) =>
                      photo ? (
                        <Image
                          alt={`${type}-${index}`}
                          className="aspect-[3/4] rounded-md object-cover"
                          height={320}
                          key={photo.id}
                          src={`/api/v1/files/${photo.fileAsset.id}`}
                          width={240}
                        />
                      ) : (
                        <div
                          className="flex aspect-[3/4] items-center justify-center rounded-md bg-muted text-xs text-muted-foreground"
                          key={index}
                        >
                          لا توجد صورة
                        </div>
                      ),
                    )}
                  </div>
                </section>
              );
            })}
          </div>
        </Card>
      ) : null}
      <PageState query={query}>
        {(items) => (
          <div className="space-y-4">
            <ShadcnLineChart
              data={chartPoints.map((entry) => ({
                label: formatCompactDate(entry.measuredAt),
                value: Number(entry.weightKg),
              }))}
              label="تطور الوزن"
              subtitle="التغير في قياسات الوزن المسجلة بمرور الوقت"
            />
            <Card>
              <CardTitle>سجل القياسات</CardTitle>
              <div className="mt-6 grid gap-2">
                {items.map((entry) => (
                  <div className="rounded-md bg-muted p-3 text-sm" key={entry.id}>
                    {formatCompactDate(entry.measuredAt)} - وزن {entry.weightKg ?? '-'} كغ - خصر{' '}
                    {entry.waistCm ?? '-'} سم
                  </div>
                ))}
              </div>
            </Card>
          </div>
        )}
      </PageState>
    </div>
  );
}

export function MemberAttendancePage() {
  const [page, setPage] = useState(1);
  const query = useQuery({
    queryFn: () => apiRequest<AttendanceHistory>(`/attendance/me?page=${page}&pageSize=12`),
    queryKey: ['attendance-me', page],
  });
  return (
    <PageState query={query}>
      {(data) => (
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <p className="text-muted-foreground">حضور هذا الشهر</p>
              <p className="mt-2 text-3xl font-bold">{data.monthlyCount}</p>
            </Card>
            <Card>
              <p className="text-muted-foreground">إجمالي الحضور</p>
              <p className="mt-2 text-3xl font-bold">{data.totalCount}</p>
            </Card>
          </div>
          <Card>
            <CardTitle>سجل الحضور</CardTitle>
            <div className="mt-4 grid gap-2">
              {data.records.map((record) => (
                <div
                  className="flex items-center justify-between rounded-md bg-muted p-3"
                  key={record.id}
                >
                  <span>{formatCompactDateTime(record.checkedInAt)}</span>
                  <span className="text-sm text-muted-foreground">{record.source}</span>
                </div>
              ))}
            </div>
          </Card>
          <Pagination meta={data.meta} onPageChange={setPage} />
        </div>
      )}
    </PageState>
  );
}

export function MemberMembershipHistoryPage() {
  const query = useQuery({
    queryFn: () => apiRequest<MembershipHistoryItem[]>('/members/membership-history'),
    queryKey: ['member-membership-history'],
  });
  return (
    <PageState query={query}>
      {(items) => (
        <div className="space-y-4">
          <h1 className="text-2xl font-black">سجل اشتراكات النادي</h1>
          {items.map((subscription) => (
            <Card key={subscription.id}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <CardTitle>{subscription.plan?.nameAr ?? 'اشتراك مخصص'}</CardTitle>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {formatCompactDate(subscription.startsAt)} —{' '}
                    {formatCompactDate(subscription.endsAt)}
                  </p>
                </div>
                <StatusBadge status={subscription.status} />
              </div>
              {subscription.auditLogs.length ? (
                <div className="mt-4 grid gap-2 border-t border-border pt-4">
                  {subscription.auditLogs.map((log, index) => (
                    <div className="rounded-md bg-muted/40 p-3 text-sm" key={`${log.createdAt}-${index}`}>
                      <span className="font-black">{log.action}</span>
                      <span className="text-muted-foreground">
                        {' '}
                        · {log.reason} · {formatCompactDateTime(log.createdAt)}
                      </span>
                    </div>
                  ))}
                </div>
              ) : null}
            </Card>
          ))}
          {!items.length ? <EmptyState title="لا يوجد سجل اشتراكات بعد" /> : null}
        </div>
      )}
    </PageState>
  );
}

function WorkoutLogButton({
  exerciseId,
  exerciseName,
  planItemId,
}: {
  exerciseId?: string;
  exerciseName: string;
  planItemId?: string;
}) {
  const queryClient = useQueryClient();
  const { push } = useToast();
  const [open, setOpen] = useState(false);
  const mutation = useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      apiRequest('/members/workout-logs', { body: jsonBody(payload), method: 'POST' }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['workout-logs'] });
      setOpen(false);
      push({ title: 'تم تسجيل تنفيذ التمرين', tone: 'success' });
    },
  });

  return (
    <>
      <Button className="gap-2" onClick={() => setOpen(true)} variant="secondary">
        <CheckCircle2 className="h-4 w-4" />
        تسجيل التنفيذ
      </Button>
      <Dialog
        description="سجل الأداء الفعلي ليظهر في تاريخ تمارينك وأرقامك الشخصية."
        onClose={() => setOpen(false)}
        open={open}
        title={exerciseName}
      >
        <DialogForm
          actions={
            <>
              <DialogCancelButton onClick={() => setOpen(false)} />
              <Button isLoading={mutation.isPending} loadingText="جاري حفظ التمرين">
                حفظ التنفيذ
              </Button>
            </>
          }
          onSubmit={(event) => {
            event.preventDefault();
            const form = new FormData(event.currentTarget);
            mutation.mutate({
              completed: true,
              exerciseId,
              isPersonalRecord: form.get('isPersonalRecord') === 'on',
              load: String(form.get('load') ?? '').trim() || undefined,
              notes: String(form.get('notes') ?? '').trim() || undefined,
              planItemId,
              repsCompleted: String(form.get('repsCompleted') ?? '').trim() || undefined,
              setsCompleted: Number(form.get('setsCompleted')),
            });
          }}
        >
          <div className="grid gap-3 sm:grid-cols-3">
            <label className="grid gap-2 text-sm font-black">
              المجموعات الفعلية
              <Input min={0} name="setsCompleted" required type="number" />
            </label>
            <label className="grid gap-2 text-sm font-black">
              التكرارات الفعلية
              <Input name="repsCompleted" placeholder="مثال: 12، 10، 8" />
            </label>
            <label className="grid gap-2 text-sm font-black">
              الوزن المستخدم
              <Input name="load" placeholder="مثال: 40 كغ" />
            </label>
          </div>
          <Textarea name="notes" placeholder="ملاحظة عن الأداء أو التقنية (اختياري)" />
          <label className="flex items-center gap-3 rounded-md border border-border bg-muted/35 p-3 text-sm font-black">
            <input className="h-4 w-4 accent-black" name="isPersonalRecord" type="checkbox" />
            <Trophy className="h-4 w-4 text-amber-500" />
            هذا رقم شخصي جديد
          </label>
          {mutation.error ? <ErrorState message={mutation.error.message} /> : null}
        </DialogForm>
      </Dialog>
    </>
  );
}

function GeneralExerciseLibrary() {
  const [categoryId, setCategoryId] = useState('');
  const [search, setSearch] = useState('');
  const categories = useQuery({
    queryFn: () => apiRequest<Array<{ id: string; nameAr: string }>>('/exercises/categories'),
    queryKey: ['member-exercise-categories'],
  });
  const exercises = useQuery({
    queryFn: () => apiRequest<ExerciseLibraryItem[]>('/exercises'),
    queryKey: ['member-exercises'],
  });
  const visibleExercises = useMemo(() => {
    const normalized = search.trim().toLocaleLowerCase('ar');
    return (exercises.data ?? []).filter((exercise) => {
      const matchesCategory = !categoryId || exercise.category.id === categoryId;
      const matchesSearch =
        !normalized ||
        exercise.nameAr.toLocaleLowerCase('ar').includes(normalized) ||
        exercise.category.nameAr.toLocaleLowerCase('ar').includes(normalized);
      return matchesCategory && matchesSearch;
    });
  }, [categoryId, exercises.data, search]);

  return (
    <Card className="overflow-hidden p-0">
      <div className="border-b border-border bg-muted/35 p-5">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Filter className="h-5 w-5 text-green-700 dark:text-brand-accent" />
              <CardTitle>مكتبة التمارين العامة</CardTitle>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              ابحث بالاسم أو اختر العضلة، ثم سجل أداءك بدون مغادرة الصفحة.
            </p>
          </div>
          <span className="rounded-md border border-border bg-card px-3 py-2 text-xs font-black text-muted-foreground">
            {visibleExercises.length} تمرين
          </span>
        </div>
        <div className="relative mt-4">
          <Search className="pointer-events-none absolute end-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="bg-card pe-10"
            onChange={(event) => setSearch(event.target.value)}
            placeholder="ابحث عن تمرين أو عضلة..."
            value={search}
          />
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            className={cn(
              'min-h-9 rounded-md border px-3 text-xs font-black transition',
              !categoryId
                ? 'border-black bg-black text-white dark:border-brand-accent dark:bg-brand-accent dark:text-black'
                : 'border-border bg-card text-muted-foreground hover:border-foreground/30 hover:text-foreground',
            )}
            onClick={() => setCategoryId('')}
            type="button"
          >
            الكل
          </button>
          {categories.data?.map((category) => (
            <button
              className={cn(
                'min-h-9 rounded-md border px-3 text-xs font-black transition',
                categoryId === category.id
                  ? 'border-black bg-black text-white dark:border-brand-accent dark:bg-brand-accent dark:text-black'
                  : 'border-border bg-card text-muted-foreground hover:border-foreground/30 hover:text-foreground',
              )}
              key={category.id}
              onClick={() => setCategoryId(category.id)}
              type="button"
            >
              {category.nameAr}
            </button>
          ))}
        </div>
      </div>
      {exercises.error ? <ErrorState message={exercises.error.message} /> : null}
      <div className="grid gap-3 p-5 md:grid-cols-2 xl:grid-cols-3">
        {visibleExercises.map((exercise) => (
          <article
            className="group flex min-h-52 flex-col border border-border bg-card p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-brand-accent/60 hover:shadow-lg"
            key={exercise.id}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-md bg-black text-white dark:bg-brand-accent dark:text-black">
                <Dumbbell className="h-5 w-5" />
              </div>
              <span className="rounded-md bg-muted px-2 py-1 text-[11px] font-black text-muted-foreground">
                {exercise.category.nameAr}
              </span>
            </div>
            <p className="mt-4 text-lg font-black">{exercise.nameAr}</p>
            {exercise.descriptionAr ? (
              <p className="mt-2 line-clamp-2 text-sm leading-6 text-muted-foreground">
                {exercise.descriptionAr}
              </p>
            ) : null}
            <div className="mt-auto flex flex-wrap gap-2 pt-4">
              <WorkoutLogButton exerciseId={exercise.id} exerciseName={exercise.nameAr} />
              {exercise.videoUrl ? (
                <a
                  className="inline-flex min-h-11 items-center gap-2 rounded-md border border-border px-4 text-sm font-black transition hover:bg-muted"
                  href={exercise.videoUrl}
                  rel="noreferrer"
                  target="_blank"
                >
                  <ExternalLink className="h-4 w-4" />
                  فيديو الشرح
                </a>
              ) : null}
            </div>
          </article>
        ))}
      </div>
      {!exercises.isLoading && !visibleExercises.length ? (
        <div className="p-5 pt-0">
          <EmptyState title="لا توجد تمارين مطابقة للفلتر" />
        </div>
      ) : null}
    </Card>
  );
}

function WorkoutHistory() {
  const logs = useQuery({
    queryFn: () => apiRequest<WorkoutLog[]>('/members/workout-logs'),
    queryKey: ['workout-logs'],
  });
  const personalRecords = logs.data?.filter((log) => log.isPersonalRecord).length ?? 0;
  return (
    <Card className="overflow-hidden p-0">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-black p-5 text-white">
        <div>
          <p className="flex items-center gap-2 text-lg font-black text-white">
            <History className="h-5 w-5 text-brand-accent" />
            سجل التنفيذ
          </p>
          <p className="mt-1 text-sm font-semibold text-white/60">
            آخر التمارين والأوزان والتكرارات الفعلية.
          </p>
        </div>
        <div className="flex gap-2">
          <span className="rounded-md bg-white/10 px-3 py-2 text-xs font-black">
            {logs.data?.length ?? 0} تسجيل
          </span>
          <span className="rounded-md bg-brand-accent px-3 py-2 text-xs font-black text-black">
            {personalRecords} رقم شخصي
          </span>
        </div>
      </div>
      {logs.error ? <ErrorState message={logs.error.message} /> : null}
      <div className="grid gap-0 divide-y divide-border">
        {logs.data?.slice(0, 12).map((log) => (
          <div
            className="grid gap-3 p-4 transition hover:bg-muted/35 sm:grid-cols-[1fr_auto] sm:items-center"
            key={log.id}
          >
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-black">
                  {log.exercise?.nameAr ?? log.planItem?.exerciseName ?? 'تمرين'}
                </p>
                {log.isPersonalRecord ? (
                  <span className="inline-flex items-center gap-1 rounded-md bg-brand-accent px-2 py-0.5 text-xs font-black text-black">
                    <Trophy className="h-3 w-3" />
                    رقم شخصي
                  </span>
                ) : null}
              </div>
              <p className="mt-1 text-xs font-bold text-muted-foreground">
                {log.setsCompleted ?? 0} مجموعات · {log.repsCompleted ?? '-'} تكرار ·{' '}
                {log.load ?? 'بدون وزن مسجل'}
              </p>
            </div>
            <span className="text-xs font-bold text-muted-foreground">
              {formatCompactDateTime(log.performedAt)}
            </span>
          </div>
        ))}
        {logs.data && !logs.data.length ? <EmptyState title="لم تسجل تنفيذ أي تمرين بعد" /> : null}
      </div>
    </Card>
  );
}

export function MemberPlansPage({ type }: { type: 'workouts' | 'nutrition' }) {
  const path = type === 'workouts' ? '/members/workout-plans' : '/members/nutrition-plans';
  const query = useQuery({
    queryFn: () => apiRequest<Plan[]>(path),
    queryKey: ['member-plans', type],
  });
  return (
    <PageState query={query}>
      {(plans) => (
        <div className="space-y-5">
          {type === 'workouts' ? (
            <section className="relative overflow-hidden rounded-lg bg-black p-6 text-white shadow-xl">
              <div className="absolute -end-14 -top-20 h-48 w-48 bg-brand-accent/20 blur-3xl" />
              <div className="relative flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.2em] text-brand-accent">
                    WORKOUT CENTER
                  </p>
                  <h1 className="mt-3 text-3xl font-black text-white">مركز التمرين</h1>
                  <p className="mt-2 max-w-2xl text-sm font-semibold leading-7 text-white/60">
                    برنامج المدرب، مكتبة التمارين، وتسجيل أدائك في مساحة واحدة واضحة.
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-2 text-center">
                  <div className="min-w-24 border border-white/15 bg-white/5 px-4 py-3">
                    <p className="text-xl font-black text-brand-accent">{plans.length}</p>
                    <p className="text-[11px] font-bold text-white/55">خطط نشطة</p>
                  </div>
                  <div className="min-w-24 border border-white/15 bg-white/5 px-4 py-3">
                    <Dumbbell className="mx-auto h-5 w-5 text-brand-accent" />
                    <p className="mt-1 text-[11px] font-bold text-white/55">جاهز للتدريب</p>
                  </div>
                </div>
              </div>
            </section>
          ) : (
            <h1 className="text-2xl font-bold">خطط التغذية</h1>
          )}
          {type === 'workouts' ? (
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-green-700 dark:text-brand-accent">
                COACH PROGRAM
              </p>
              <h2 className="mt-1 text-2xl font-black">برنامجك التدريبي الخاص</h2>
            </div>
          ) : null}
          {plans.length ? (
            plans.map((plan) => (
              <Card className="overflow-hidden p-0" key={plan.id}>
                <div className="border-b border-border bg-muted/30 p-5">
                  <CardTitle>{plan.title}</CardTitle>
                  {plan.notes ? <p className="mt-2 text-muted-foreground">{plan.notes}</p> : null}
                </div>
                <div className="grid gap-3 p-5">
                  {plan.items?.length
                    ? Array.from(new Set(plan.items.map((item) => item.dayIndex)))
                        .sort((a, b) => a - b)
                        .map((dayIndex) => (
                          <section
                            className="overflow-hidden rounded-lg border border-border"
                            key={dayIndex}
                          >
                            <div className="flex items-center justify-between gap-3 border-b border-border bg-foreground px-4 py-3 text-background dark:bg-brand-accent dark:text-black">
                              <span className="flex items-center gap-2">
                                <CalendarDays className="h-4 w-4" />
                                <span className="font-black">اليوم {dayIndex + 1}</span>
                              </span>
                              <span className="text-xs font-black">
                                {plan.items?.find((item) => item.dayIndex === dayIndex)?.dayTitle ||
                                  'بدون عنوان'}
                              </span>
                            </div>
                            <div className="divide-y divide-border">
                              {plan.items
                                ?.filter((item) => item.dayIndex === dayIndex)
                                .map((item) => (
                                  <div className="grid gap-3 p-4 lg:grid-cols-[1fr_auto] lg:items-center" key={item.id}>
                                    <div>
                                      <p className="font-black">
                                        {item.exercise?.nameAr ?? item.exerciseName}
                                      </p>
                                      <p className="mt-1 text-xs font-bold text-muted-foreground">
                                        {item.exercise?.category.nameAr ?? 'تمرين مخصص'} ·{' '}
                                        {item.sets ?? '-'} مجموعات · {item.reps ?? '-'} تكرار
                                      </p>
                                      {item.notes ? (
                                        <p className="mt-2 text-sm text-muted-foreground">
                                          {item.notes}
                                        </p>
                                      ) : null}
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                      {item.videoUrl || item.exercise?.videoUrl ? (
                                        <a
                                          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-border bg-muted px-3 text-sm font-black transition hover:border-brand-accent"
                                          href={item.videoUrl ?? item.exercise?.videoUrl ?? '#'}
                                          rel="noreferrer"
                                          target="_blank"
                                        >
                                          <ExternalLink className="h-4 w-4" />
                                          فيديو الشرح
                                        </a>
                                      ) : null}
                                      <WorkoutLogButton
                                        exerciseId={item.exercise?.id}
                                        exerciseName={item.exercise?.nameAr ?? item.exerciseName ?? 'تمرين'}
                                        planItemId={item.id}
                                      />
                                    </div>
                                  </div>
                                ))}
                            </div>
                          </section>
                        ))
                    : null}
                  {plan.targetCalories ? (
                    <div className="grid grid-cols-2 gap-2 rounded-lg border border-brand-accent/25 bg-brand-accent/5 p-3 text-center sm:grid-cols-4">
                      {[
                        ['السعرات', plan.targetCalories],
                        ['البروتين', plan.targetProteinG ?? 0],
                        ['الكارب', plan.targetCarbsG ?? 0],
                        ['الدهون', plan.targetFatG ?? 0],
                      ].map(([label, value]) => (
                        <div key={String(label)}>
                          <p className="font-black">{String(value)}</p>
                          <p className="text-xs font-bold text-muted-foreground">{label}</p>
                        </div>
                      ))}
                    </div>
                  ) : null}
                  {plan.meals?.map((meal) => (
                    <section
                      className="overflow-hidden rounded-lg border border-border"
                      key={meal.id}
                    >
                      <div className="flex items-center justify-between gap-3 bg-black px-4 py-3 text-white">
                        <p className="font-black">{meal.name}</p>
                        <span className="text-xs font-bold text-brand-accent">
                          {meal.timing ?? 'بدون توقيت'}
                        </span>
                      </div>
                      <div className="divide-y divide-border">
                        {meal.items.map((item) => (
                          <div
                            className="grid gap-2 p-3 sm:grid-cols-[1fr_auto] sm:items-center"
                            key={item.id}
                          >
                            <div>
                              <p className="font-bold">{item.name}</p>
                              <p className="text-xs text-muted-foreground">{item.quantity}</p>
                            </div>
                            <p className="text-xs font-black text-muted-foreground">
                              {item.calories ?? 0} سعرة · {item.proteinG ?? 0}P · {item.carbsG ?? 0}
                              C · {item.fatG ?? 0}F
                            </p>
                          </div>
                        ))}
                      </div>
                      {meal.notes ? (
                        <p className="border-t border-border bg-muted/30 p-3 text-sm text-muted-foreground">
                          {meal.notes}
                        </p>
                      ) : null}
                    </section>
                  ))}
                </div>
              </Card>
            ))
          ) : (
            <EmptyState
              title={
                type === 'workouts'
                  ? 'لا توجد خطة خاصة من المدرب حالياً'
                  : 'لا توجد خطط بعد'
              }
            />
          )}
          {type === 'workouts' ? <GeneralExerciseLibrary /> : null}
          {type === 'workouts' ? <WorkoutHistory /> : null}
        </div>
      )}
    </PageState>
  );
}

export function MemberRequestsPage() {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryFn: () => apiRequest<CoachRequest[]>('/members/requests'),
    queryKey: ['member-requests'],
  });
  const complete = useMutation({
    mutationFn: (id: string) =>
      apiRequest(`/members/requests/${id}/complete`, { body: jsonBody({}), method: 'PATCH' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['member-requests'] }),
  });
  return (
    <PageState query={query}>
      {(requests) => (
        <div className="space-y-3">
          {requests.map((request) => (
            <Card key={request.id}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-semibold">{request.type}</p>
                  <p className="text-sm text-muted-foreground">
                    {request.coach.user.fullName} - {request.message ?? 'طلب متابعة'}
                  </p>
                  {request.type === 'NEW_PHOTOS' && request.status === 'PENDING' ? (
                    <p className="mt-2 text-xs font-black text-brand-accent-foreground">
                      {request.submittedPhotoTypes?.length ?? 0} من{' '}
                      {request.requiredPhotoTypes?.length ?? 3} زوايا تم رفعها
                    </p>
                  ) : null}
                </div>
                <StatusBadge status={request.status} />
                {request.status === 'PENDING' && request.type !== 'NEW_PHOTOS' ? (
                  <Button onClick={() => complete.mutate(request.id)} variant="secondary">
                    تم التنفيذ
                  </Button>
                ) : null}
              </div>
            </Card>
          ))}
          {complete.error ? <ErrorState message={complete.error.message} /> : null}
          {!requests.length ? <EmptyState title="لا توجد طلبات" /> : null}
        </div>
      )}
    </PageState>
  );
}

export function MemberCalculatorsPage() {
  type CalculatorMode = 'bulking' | 'cutting' | 'maintenance';
  type CalculatorResult = {
    calories: { bulking: number; cutting: number; maintenance: number };
    macros: { carbohydratesG: number; fatG: number; proteinG: number };
    profile: {
      activityMultiplier: number;
      age: number;
      fitnessGoal: string;
      heightCm: number;
      weightKg: number;
    };
    selectedMode: CalculatorMode;
  };
  type FoodAnalysis = {
    confidence: 'HIGH' | 'LOW' | 'MEDIUM';
    disclaimer: string;
    items: Array<{
      calories: number;
      carbsG: number;
      fatG: number;
      name: string;
      proteinG: number;
      quantity: string;
    }>;
    replyAr: string;
    responseType: 'CLARIFICATION' | 'FOOD_ANALYSIS' | 'NUTRITION_ANSWER';
    source: 'GEMINI';
    totals: { calories: number; carbsG: number; fatG: number; proteinG: number };
  };
  type ChatMessage =
    | { id: string; role: 'assistant' | 'user'; text: string }
    | { analysis: FoodAnalysis; id: string; role: 'analysis' };

  const [mode, setMode] = useState<CalculatorMode>('maintenance');
  const [activityMultiplier, setActivityMultiplier] = useState(1.45);
  const [foodMessage, setFoodMessage] = useState('');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      text: 'اكتب وجبتك بالكميات أو اسألني عن التغذية. سأجيب حسب وزنك وطولك وعمرك وهدفك الحالي.',
    },
  ]);
  const calculator = useMutation({
    mutationFn: (payload: { activityMultiplier: number; mode: CalculatorMode }) =>
      apiRequest<CalculatorResult>('/members/calculators', {
        body: jsonBody(payload),
        method: 'POST',
      }),
  });
  const nutritionChat = useMutation({
    mutationFn: (payload: {
      history: Array<{ content: string; role: 'assistant' | 'user' }>;
      message: string;
    }) =>
      apiRequest<FoodAnalysis>('/members/nutrition-chat', {
        body: jsonBody(payload),
        method: 'POST',
      }),
    onSuccess: (analysis) => {
      setChatMessages((current) => [
        ...current,
        { analysis, id: `analysis-${Date.now()}`, role: 'analysis' },
      ]);
    },
  });

  const modes: Array<{
    body: string;
    icon: typeof Target;
    label: string;
    value: CalculatorMode;
  }> = [
    { body: 'عجز معتدل لخسارة الدهون', icon: Flame, label: 'تنشيف', value: 'cutting' },
    { body: 'للحفاظ على الوزن الحالي', icon: Gauge, label: 'ثبات', value: 'maintenance' },
    { body: 'فائض محسوب لبناء الكتلة', icon: Dumbbell, label: 'تضخيم', value: 'bulking' },
  ];
  const activityLabel =
    activityMultiplier < 1.35
      ? 'نشاط خفيف'
      : activityMultiplier < 1.55
        ? 'نشاط متوسط'
        : activityMultiplier < 1.75
          ? 'نشاط مرتفع'
          : 'نشاط رياضي قوي';

  function sendFoodMessage(message = foodMessage) {
    const cleanMessage = message.trim();
    if (cleanMessage.length < 3 || nutritionChat.isPending) return;
    const history = chatMessages
      .filter((item) => item.id !== 'welcome')
      .map((item) =>
        item.role === 'analysis'
          ? { content: item.analysis.replyAr, role: 'assistant' as const }
          : { content: item.text, role: item.role },
      )
      .slice(-8);
    setChatMessages((current) => [
      ...current,
      { id: `user-${Date.now()}`, role: 'user', text: cleanMessage },
    ]);
    setFoodMessage('');
    nutritionChat.mutate({ history, message: cleanMessage });
  }

  return (
    <div className="space-y-5">
      <section className="calculator-reveal relative overflow-hidden rounded-lg bg-black px-5 py-7 text-white shadow-2xl md:px-8">
        <div className="absolute -end-20 -top-24 h-64 w-64 rounded-full bg-brand-accent/20 blur-3xl" />
        <div className="relative flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-brand-accent/15 px-3 py-1 text-xs font-black text-brand-accent">
              <Sparkles className="h-4 w-4" />
              PRO GYM SMART NUTRITION
            </span>
            <h1 className="mt-4 text-2xl font-black md:text-3xl">حاسباتك الغذائية الذكية</h1>
            <p className="mt-2 max-w-2xl text-sm font-semibold leading-7 text-white/65">
              احسب احتياجك حسب بيانات حسابك، ثم حلل وجبتك بمحادثة بسيطة بدون جداول معقدة.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <span className="flex h-14 w-14 items-center justify-center rounded-lg bg-brand-accent text-black">
              <Calculator className="h-7 w-7" />
            </span>
            <span className="flex h-14 w-14 items-center justify-center rounded-lg border border-white/15 bg-white/10 text-brand-accent">
              <Bot className="h-7 w-7" />
            </span>
          </div>
        </div>
      </section>

      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1.05fr)_minmax(24rem,0.95fr)]">
        <div className="calculator-reveal [animation-delay:80ms]">
          <Card className="overflow-hidden p-0">
            <div className="border-b border-border p-5 md:p-6">
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-foreground text-brand-accent">
                  <Target className="h-5 w-5" />
                </span>
                <div>
                  <CardTitle>السعرات والماكروز اليومية</CardTitle>
                  <p className="mt-1 text-sm font-semibold text-muted-foreground">
                    اختر هدفك ومستوى نشاطك، وسنستخدم بيانات ملفك تلقائياً.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-6 p-5 md:p-6">
              <div className="grid gap-3 sm:grid-cols-3">
                {modes.map((option) => {
                  const Icon = option.icon;
                  const active = mode === option.value;
                  return (
                    <button
                      className={cn(
                        'rounded-lg border p-4 text-start transition duration-300',
                        active
                          ? 'border-foreground bg-foreground text-background shadow-lg'
                          : 'border-border bg-muted/25 hover:-translate-y-0.5 hover:border-brand-accent',
                      )}
                      key={option.value}
                      onClick={() => setMode(option.value)}
                      type="button"
                    >
                      <Icon
                        className={cn(
                          'h-5 w-5',
                          active ? 'text-brand-accent' : 'text-muted-foreground',
                        )}
                      />
                      <p className="mt-3 font-black">{option.label}</p>
                      <p
                        className={cn(
                          'mt-1 text-xs font-semibold leading-5',
                          active ? 'text-white/60' : 'text-muted-foreground',
                        )}
                      >
                        {option.body}
                      </p>
                    </button>
                  );
                })}
              </div>

              <div className="rounded-lg border border-border bg-muted/25 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-black">مستوى النشاط اليومي</p>
                    <p className="mt-1 text-xs font-bold text-muted-foreground">{activityLabel}</p>
                  </div>
                  <span className="rounded-full bg-brand-accent/15 px-3 py-1 text-sm font-black text-brand-accent-foreground">
                    {activityMultiplier.toFixed(2)}
                  </span>
                </div>
                <input
                  aria-label="مستوى النشاط"
                  className="mt-5 h-2 w-full cursor-pointer accent-green-500"
                  max="1.9"
                  min="1.2"
                  onChange={(event) => setActivityMultiplier(Number(event.target.value))}
                  step="0.05"
                  type="range"
                  value={activityMultiplier}
                />
                <div className="mt-2 flex justify-between text-[11px] font-bold text-muted-foreground">
                  <span>قليل الحركة</span>
                  <span>تمارين منتظمة</span>
                  <span>نشاط قوي</span>
                </div>
              </div>

              <Button
                className="w-full gap-2"
                isLoading={calculator.isPending}
                loadingText="نحسب احتياجك"
                onClick={() => calculator.mutate({ activityMultiplier, mode })}
              >
                <Calculator className="h-4 w-4" />
                احسب احتياجي الآن
              </Button>

              {calculator.error ? <ErrorState message={calculator.error.message} /> : null}

              <>
                {calculator.data ? (
                  <div
                    className="calculator-reveal space-y-4"
                    key={`${calculator.data.selectedMode}-${calculator.data.profile.activityMultiplier}`}
                  >
                    <div className="grid gap-3 sm:grid-cols-3">
                      {[
                        {
                          calories: calculator.data.calories.cutting,
                          icon: Flame,
                          label: 'تنشيف',
                          value: 'cutting',
                        },
                        {
                          calories: calculator.data.calories.maintenance,
                          icon: Gauge,
                          label: 'ثبات',
                          value: 'maintenance',
                        },
                        {
                          calories: calculator.data.calories.bulking,
                          icon: Dumbbell,
                          label: 'تضخيم',
                          value: 'bulking',
                        },
                      ].map(({ calories, icon: Icon, label, value }) => {
                        const selected = calculator.data?.selectedMode === value;
                        const ResultIcon = Icon as typeof Flame;
                        return (
                          <div
                            className={cn(
                              'rounded-lg border p-4',
                              selected
                                ? 'border-brand-accent bg-brand-accent/10'
                                : 'border-border bg-muted/20',
                            )}
                            key={String(value)}
                          >
                            <div className="flex items-center justify-between">
                              <ResultIcon className="h-5 w-5 text-muted-foreground" />
                              {selected ? (
                                <span className="rounded-full bg-brand-accent px-2 py-0.5 text-[10px] font-black text-black">
                                  هدفك
                                </span>
                              ) : null}
                            </div>
                            <p className="mt-4 text-xs font-bold text-muted-foreground">{label}</p>
                            <p className="mt-1 text-2xl font-black">{String(calories)}</p>
                            <p className="text-xs font-bold text-muted-foreground">سعرة / يوم</p>
                          </div>
                        );
                      })}
                    </div>

                    <div className="rounded-lg bg-foreground p-5 text-background">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="font-black">توزيع الماكروز لهدفك</p>
                          <p className="mt-1 text-xs font-semibold text-background/55">
                            محسوب من وزنك وهدفك الحالي
                          </p>
                        </div>
                        <Leaf className="h-6 w-6 text-brand-accent" />
                      </div>
                      <div className="mt-5 grid gap-3 sm:grid-cols-3">
                        <MacroResult
                          color="bg-brand-accent"
                          icon={Beef}
                          label="بروتين"
                          value={calculator.data.macros.proteinG}
                        />
                        <MacroResult
                          color="bg-amber-300"
                          icon={Wheat}
                          label="كربوهيدرات"
                          value={calculator.data.macros.carbohydratesG}
                        />
                        <MacroResult
                          color="bg-cyan-300"
                          icon={Flame}
                          label="دهون"
                          value={calculator.data.macros.fatG}
                        />
                      </div>
                    </div>

                    <p className="text-center text-xs font-semibold text-muted-foreground">
                      الحساب مبني على {calculator.data.profile.weightKg} كغ ·{' '}
                      {calculator.data.profile.heightCm} سم · عمر {calculator.data.profile.age} سنة
                    </p>
                  </div>
                ) : (
                  <div
                    className="calculator-reveal rounded-lg border border-dashed border-border p-8 text-center"
                    key="calculator-empty"
                  >
                    <Gauge className="mx-auto h-8 w-8 text-muted-foreground" />
                    <p className="mt-3 font-black">نتيجتك ستظهر هنا</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      اختر هدفك ثم اضغط على زر الحساب.
                    </p>
                  </div>
                )}
              </>
            </div>
          </Card>
        </div>

        <div className="calculator-reveal [animation-delay:140ms]">
          <Card className="overflow-hidden p-0">
            <div className="flex items-center justify-between gap-3 bg-foreground p-5 text-background">
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-brand-accent text-black">
                  <Bot className="h-6 w-6" />
                </span>
                <div>
                  <CardTitle className="text-background">مساعد التغذية الذكي</CardTitle>
                  <p className="mt-1 text-xs font-semibold text-background/55">
                    اكتب بالعربية أو الإنجليزية
                  </p>
                </div>
              </div>
              <span className="flex items-center gap-2 rounded-full bg-brand-accent/15 px-3 py-1 text-xs font-black text-brand-accent">
                <span className="h-2 w-2 animate-pulse rounded-full bg-brand-accent" />
                AI
              </span>
            </div>

            <div className="flex h-[34rem] flex-col">
              <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
                <>
                  {chatMessages.map((message) =>
                    message.role === 'analysis' ? (
                      <FoodAnalysisMessage analysis={message.analysis} key={message.id} />
                    ) : (
                      <div
                        className={cn(
                          'calculator-message',
                          'max-w-[88%] rounded-lg px-4 py-3 text-sm font-semibold leading-7',
                          message.role === 'user'
                            ? 'ms-auto bg-foreground text-background'
                            : 'me-auto border border-border bg-muted/40',
                        )}
                        key={message.id}
                      >
                        {message.text}
                      </div>
                    ),
                  )}
                </>
                {nutritionChat.isPending ? (
                  <div className="calculator-message me-auto flex items-center gap-2 rounded-lg border border-border bg-muted/40 px-4 py-3">
                    {[0, 1, 2].map((dot) => (
                      <span
                        className="h-2 w-2 animate-bounce rounded-full bg-brand-accent-foreground"
                        key={dot}
                        style={{ animationDelay: `${dot * 120}ms` }}
                      />
                    ))}
                    <span className="ms-1 text-xs font-bold text-muted-foreground">
                      أجهز إجابة مخصصة لك...
                    </span>
                  </div>
                ) : null}
                {nutritionChat.error ? <ErrorState message={nutritionChat.error.message} /> : null}
              </div>

              <div className="border-t border-border p-4">
                <div className="mb-3 flex gap-2 overflow-x-auto pb-1">
                  {[
                    '200 غرام دجاج و150 غرام رز',
                    'ما أفضل وجبة بعد التمرين لهدفي؟',
                    'أكلت صحن كبسة دجاج متوسط، كم تقريباً؟',
                  ].map((example) => (
                    <button
                      className="shrink-0 rounded-full border border-border bg-muted/30 px-3 py-1.5 text-xs font-bold transition hover:border-brand-accent"
                      key={example}
                      onClick={() => sendFoodMessage(example)}
                      type="button"
                    >
                      {example}
                    </button>
                  ))}
                </div>
                <form
                  className="flex items-end gap-2"
                  onSubmit={(event) => {
                    event.preventDefault();
                    sendFoodMessage();
                  }}
                >
                  <Textarea
                    aria-label="اكتب ما أكلته"
                    className="min-h-12 resize-none"
                    maxLength={500}
                    onChange={(event) => setFoodMessage(event.target.value)}
                    placeholder="اكتب وجبتك أو اسأل سؤالاً عن التغذية..."
                    value={foodMessage}
                  />
                  <Button
                    aria-label="إرسال للتحليل"
                    className="h-12 min-h-12 w-12 shrink-0 p-0"
                    disabled={foodMessage.trim().length < 3}
                    isLoading={nutritionChat.isPending}
                  >
                    <Send className="h-5 w-5 rotate-180" />
                  </Button>
                </form>
                <p className="mt-2 flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground">
                  <MessageCircle className="h-3.5 w-3.5" />
                  يعرف بيانات جسمك وهدفك ويطلب توضيحاً عندما تكون الكمية غير كافية.
                </p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

function MacroResult({
  color,
  icon: Icon,
  label,
  value,
}: {
  color: string;
  icon: typeof Beef;
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-lg bg-background/10 p-3">
      <div className="flex items-center justify-between">
        <Icon className="h-4 w-4 text-brand-accent" />
        <span className={cn('h-2 w-8 rounded-full', color)} />
      </div>
      <p className="mt-3 text-2xl font-black">{value}g</p>
      <p className="text-xs font-bold text-background/55">{label}</p>
    </div>
  );
}

function FoodAnalysisMessage({
  analysis,
}: {
  analysis: {
    confidence: 'HIGH' | 'LOW' | 'MEDIUM';
    disclaimer: string;
    items: Array<{
      calories: number;
      carbsG: number;
      fatG: number;
      name: string;
      proteinG: number;
      quantity: string;
    }>;
    replyAr: string;
    responseType: 'CLARIFICATION' | 'FOOD_ANALYSIS' | 'NUTRITION_ANSWER';
    source: 'GEMINI';
    totals: { calories: number; carbsG: number; fatG: number; proteinG: number };
  };
}) {
  return (
    <div className="calculator-message me-auto max-w-[96%] overflow-hidden rounded-lg border border-border bg-card">
      <div className="flex items-center justify-between gap-3 border-b border-border bg-brand-accent/10 px-4 py-3">
        <div className="flex items-center gap-2">
          <Bot className="h-4 w-4 text-brand-accent-foreground" />
          <span className="text-xs font-black">مساعد Pro Gym AI</span>
        </div>
        <span className="text-[10px] font-black text-muted-foreground">
          ثقة{' '}
          {analysis.confidence === 'HIGH'
            ? 'مرتفعة'
            : analysis.confidence === 'MEDIUM'
              ? 'متوسطة'
              : 'منخفضة'}
        </span>
      </div>
      <div className="space-y-3 p-4">
        <p className="text-sm font-semibold leading-6">{analysis.replyAr}</p>
        {analysis.items.length ? (
          <div className="space-y-2">
            {analysis.items.map((item, index) => (
              <div
                className="flex items-center justify-between gap-3 rounded-lg bg-muted/35 p-3"
                key={`${item.name}-${index}`}
              >
                <div>
                  <p className="text-sm font-black">{item.name}</p>
                  <p className="text-xs font-bold text-muted-foreground">{item.quantity}</p>
                </div>
                <p className="text-xs font-black">{item.calories} سعرة</p>
              </div>
            ))}
          </div>
        ) : null}
        {analysis.responseType === 'FOOD_ANALYSIS' ? (
          <div className="grid grid-cols-4 gap-1.5 text-center">
            {[
              ['سعرة', analysis.totals.calories],
              ['P', analysis.totals.proteinG],
              ['C', analysis.totals.carbsG],
              ['F', analysis.totals.fatG],
            ].map(([label, value]) => (
              <div className="rounded-md bg-foreground p-2 text-background" key={String(label)}>
                <p className="text-sm font-black text-brand-accent">{String(value)}</p>
                <p className="text-[10px] font-bold text-background/55">{label}</p>
              </div>
            ))}
          </div>
        ) : null}
        <p className="text-[10px] font-semibold leading-5 text-muted-foreground">
          {analysis.disclaimer}
        </p>
      </div>
    </div>
  );
}
