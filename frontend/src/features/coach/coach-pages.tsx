'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Activity,
  Archive,
  ArrowLeft,
  CalendarCheck,
  Camera,
  ChevronLeft,
  CircleDollarSign,
  Clock3,
  ClipboardList,
  Dumbbell,
  Eye,
  FileClock,
  History,
  PauseCircle,
  Pencil,
  PlayCircle,
  Plus,
  RefreshCcw,
  Search,
  Trash2,
  TrendingDown,
  TrendingUp,
  UserRound,
  UserRoundPlus,
  UserRoundX,
  Users,
  Utensils,
  Weight,
  type LucideIcon,
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useParams } from 'next/navigation';
import { useDeferredValue, useMemo, useState, type ReactNode } from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardTitle } from '@/components/ui/card';
import { Dialog, DialogCancelButton } from '@/components/ui/dialog';
import { Input, Textarea } from '@/components/ui/input';
import { Pagination, type PaginatedResponse } from '@/components/ui/pagination';
import { DashboardLoader, EmptyState, ErrorState } from '@/components/ui/state';
import { StatusBadge } from '@/components/ui/status-badge';
import { useToast } from '@/components/ui/toast';
import {
  NutritionPlanEditor,
  WorkoutPlanEditor,
  type NutritionPlanData,
  type WorkoutPlanData,
} from '@/features/coach/coach-plan-editors';
import { apiRequest, jsonBody } from '@/lib/api/client';
import { cn, formatCompactDate, formatCompactDateTime } from '@/lib/utils';

const PremiumAreaChart = dynamic(
  () => import('@/components/ui/chart').then((module) => module.ShadcnAreaChart),
  { loading: () => <Card className="h-80 animate-pulse bg-muted/40" />, ssr: false },
);

const PremiumBarChart3D = dynamic(
  () => import('@/components/ui/chart').then((module) => module.ShadcnBarChart),
  { loading: () => <Card className="h-80 animate-pulse bg-muted/40" />, ssr: false },
);

type CoachingState = {
  canResume: boolean;
  endsAt: string | null;
  isActive: boolean;
  planRequirement: 'BOTH' | 'EITHER' | 'NUTRITION' | 'WORKOUT';
  remainingDays: number;
  reminderEnabled: boolean;
  startsAt: string | null;
  status: 'ACTIVE' | 'PAUSED';
};

type CoachingEvent = {
  action: 'ADDED' | 'DEACTIVATED' | 'ENDED' | 'EXPIRED' | 'RENEWED' | 'RESUMED' | 'STARTED';
  createdAt: string;
  days: number | null;
  id: string;
  newEndsAt: string | null;
  previousEndsAt: string | null;
};

type SubscriptionHistory = {
  events: CoachingEvent[];
  firstSubscriptionAt: string | null;
  lastActivityAt: string | null;
  renewalCount: number;
  subscriptionCount: number;
  totalDays: number;
};

type ClientAssignment = {
  coaching: CoachingState;
  member: {
    attendanceRecords: Array<{ checkedInAt: string }>;
    currentWeightKg: string | number;
    fitnessGoal: string;
    id: string;
    progressEntries: Array<{ measuredAt: string; weightKg: string | number | null }>;
    subscriptions: Array<{ endsAt: string; status: string }>;
    user: { avatarUrl: string | null; fullName: string; phone: string; username: string };
  };
};

type AvailableMember = {
  currentWeightKg: string | number;
  fitnessGoal: string;
  id: string;
  memberCode: string;
  user: { fullName: string; maskedPhone: string; username: string };
};

type ArchivedClient = {
  currentCoaching: CoachingState | null;
  fitnessGoal: string;
  id: string;
  memberCode: string;
  subscriptionHistory: SubscriptionHistory;
  user: {
    avatarUrl: string | null;
    fullName: string;
    phone: string;
    username: string;
  };
};

type CoachDashboard = {
  attendanceTrend: Array<{ count: number; date: string }>;
  clientPulse: Array<{
    attendanceCount: number;
    avatarUrl: string | null;
    coaching: CoachingState;
    goal: string;
    id: string;
    name: string;
    subscriptionStatus: string;
    weight: number;
    weightChange: number;
  }>;
  clients: CoachDashboard['clientPulse'];
  metrics: {
    activeNutritionPlans: number;
    activeCoachingSubscriptions: number;
    activeWorkoutPlans: number;
    pendingRequests: number;
    totalClients: number;
  };
};

type ClientDetail = {
  age: number;
  attendanceRecords: Array<{ checkedInAt: string; id: string }>;
  currentWeightKg: string | number;
  coaching: CoachingState;
  fitnessGoal: string;
  gender: string;
  heightCm: string | number;
  id: string;
  nutritionPlans: NutritionPlanData[];
  planArchive: {
    nutrition: NutritionPlanData[];
    workouts: WorkoutPlanData[];
  };
  progressEntries: Array<{
    id: string;
    measuredAt: string;
    waistCm: string | number | null;
    weightKg: string | number | null;
  }>;
  progressPhotos: Array<{
    createdAt: string;
    fileAsset: { id: string };
    id: string;
    type: string;
  }>;
  subscriptions: Array<{ endsAt: string; status: string }>;
  subscriptionHistory: SubscriptionHistory;
  user: { avatarUrl: string | null; fullName: string; phone: string };
  workoutPlans: WorkoutPlanData[];
};

type CoachAccount = {
  bioAr: string | null;
  changeRequests: Array<{
    createdAt: string;
    id: string;
    requestedData: Record<string, string>;
    reviewReason: string | null;
    status: string;
  }>;
  user: {
    avatarUrl: string | null;
    email: string | null;
    fullName: string;
    phone: string;
    username: string;
  };
};

function QueryState<T>({
  children,
  query,
}: {
  children: (data: T) => ReactNode;
  query: { data?: T; error: Error | null; isLoading: boolean };
}) {
  if (query.isLoading) return <DashboardLoader />;
  if (query.error) return <ErrorState message={query.error.message} />;
  if (!query.data) return <EmptyState title="لا توجد بيانات" />;
  return children(query.data);
}

function CoachPageHeader({
  body,
  icon: Icon,
  title,
}: {
  body: string;
  icon: typeof Users;
  title: string;
}) {
  return (
    <div className="relative min-w-0 max-w-full overflow-hidden rounded-lg bg-black p-4 text-white shadow-xl sm:p-6">
      <div className="absolute -end-20 -top-24 h-64 w-64 rounded-full bg-brand-accent/20 blur-3xl" />
      <div className="relative flex items-start justify-between gap-3 sm:items-center sm:gap-4">
        <div className="min-w-0">
          <p className="text-xs font-black text-brand-accent">PRO GYM COACH</p>
          <h1 className="mt-2 break-words text-2xl font-black md:text-3xl">{title}</h1>
          <p className="mt-2 max-w-2xl text-sm leading-7 text-white/60">{body}</p>
        </div>
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-brand-accent text-black sm:h-14 sm:w-14">
          <Icon className="h-6 w-6 sm:h-7 sm:w-7" />
        </span>
      </div>
    </div>
  );
}

function CoachMetric({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Users;
  label: string;
  value: number;
}) {
  return (
    <Card className="group relative overflow-hidden border-border p-5 transition hover:-translate-y-1 hover:border-brand-accent/50 hover:shadow-xl">
      <div className="absolute -end-8 -top-10 h-28 w-28 rounded-full bg-brand-accent/10 blur-2xl" />
      <div className="relative flex items-center justify-between">
        <div>
          <p className="text-sm font-bold text-muted-foreground">{label}</p>
          <p className="mt-2 text-4xl font-black">{value}</p>
        </div>
        <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-black text-brand-accent">
          <Icon className="h-6 w-6" />
        </span>
      </div>
      <div className="mt-5 h-1 overflow-hidden rounded-full bg-muted">
        <div className="h-full w-2/3 bg-brand-accent transition-all group-hover:w-full" />
      </div>
    </Card>
  );
}

export function CoachDashboardPage() {
  const query = useQuery({
    queryFn: () => apiRequest<CoachDashboard>('/coaches/dashboard'),
    queryKey: ['coach-dashboard'],
  });

  return (
    <QueryState query={query}>
      {(data) => (
        <div className="space-y-4">
          <CoachPageHeader
            body="تابع التزام لاعبيك، برامجهم، وآخر تحديثات التقدم من مكان واحد."
            icon={Activity}
            title="مركز قيادة المدرب"
          />
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <CoachMetric
              icon={Users}
              label="اللاعبون تحت إشرافي"
              value={data.metrics.totalClients}
            />
            <CoachMetric
              icon={Dumbbell}
              label="برامج التدريب النشطة"
              value={data.metrics.activeWorkoutPlans}
            />
            <CoachMetric
              icon={Utensils}
              label="خطط الغذاء النشطة"
              value={data.metrics.activeNutritionPlans}
            />
            <CoachMetric
              icon={FileClock}
              label="طلبات المتابعة المفتوحة"
              value={data.metrics.pendingRequests}
            />
          </div>
          <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
            <PremiumAreaChart
              data={data.attendanceTrend.map((item) => ({
                label: new Date(item.date).toLocaleDateString('ar', { weekday: 'short' }),
                value: item.count,
              }))}
              label="نبض حضور اللاعبين"
              subtitle="حضور اللاعبين المعيّنين لك خلال آخر سبعة أيام"
            />
            <PremiumBarChart3D
              data={
                data.clientPulse.length
                  ? data.clientPulse.map((client) => ({
                      label: client.name.split(' ')[0] ?? client.name,
                      value: client.attendanceCount,
                    }))
                  : [{ label: 'لا يوجد', value: 0 }]
              }
              label="التزام اللاعبين"
              subtitle="عدد الزيارات خلال آخر 30 يوماً"
            />
          </div>
          <Card>
            <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle>اللاعبون</CardTitle>
                <p className="mt-1 text-sm text-muted-foreground">
                  افتح ملف اللاعب لإدارة التدريب والغذاء والمتابعة.
                </p>
              </div>
              <Link className="self-start" href="/ar/dashboard/coach/clients">
                <Button className="gap-2" variant="secondary">
                  عرض الجميع
                  <ChevronLeft className="h-4 w-4" />
                </Button>
              </Link>
            </div>
            <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {data.clients.slice(0, 6).map((client) => (
                <ClientCard client={client} key={client.id} />
              ))}
            </div>
          </Card>
        </div>
      )}
    </QueryState>
  );
}

function ClientCard({
  client,
}: {
  client: {
    attendanceCount: number;
    avatarUrl: string | null;
    coaching: CoachingState;
    goal: string;
    id: string;
    name: string;
    subscriptionStatus: string;
    weight: number;
    weightChange: number;
  };
}) {
  return (
    <Link className="block min-w-0 max-w-full" href={`/ar/dashboard/coach/clients/${client.id}`}>
      <article className="group h-full min-w-0 max-w-full overflow-hidden rounded-lg border border-border bg-muted/20 p-4 transition hover:-translate-y-0.5 hover:border-brand-accent/50 hover:bg-card hover:shadow-lg">
        <div className="grid min-w-0 grid-cols-[3.5rem_minmax(0,1fr)] items-center gap-3 sm:grid-cols-[3.5rem_minmax(0,1fr)_auto]">
          <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-muted">
            {client.avatarUrl ? (
              <Image
                alt={client.name}
                className="object-cover"
                fill
                sizes="56px"
                src={client.avatarUrl}
              />
            ) : (
              <UserRound className="m-4 h-6 w-6" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate font-black">{client.name}</p>
            <p className="mt-1 truncate text-xs font-bold text-muted-foreground">{client.goal}</p>
          </div>
          <div className="col-span-2 min-w-0 justify-self-start sm:col-span-1">
            <StatusBadge status={client.coaching.status} />
          </div>
        </div>
        <div className="mt-4 grid grid-cols-1 gap-2 border-t border-border pt-3 text-center min-[360px]:grid-cols-3">
          <ClientStat label="الوزن" value={`${client.weight} كغ`} />
          <ClientStat label="الحضور" value={String(client.attendanceCount)} />
          <ClientStat
            label="التدريب الخاص"
            value={
              client.coaching.isActive ? `${client.coaching.remainingDays} يوم` : 'بانتظار البدء'
            }
          />
        </div>
      </article>
    </Link>
  );
}

function ClientStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="break-words text-[10px] font-bold leading-4 text-muted-foreground sm:text-xs">
        {label}
      </p>
      <p className="mt-1 break-words text-sm font-black">{value}</p>
    </div>
  );
}

export function CoachClientsPage() {
  const queryClient = useQueryClient();
  const { push } = useToast();
  const [q, setQ] = useState('');
  const deferredQuery = useDeferredValue(q);
  const [page, setPage] = useState(1);
  const [addOpen, setAddOpen] = useState(false);
  const [memberQuery, setMemberQuery] = useState('');
  const deferredMemberQuery = useDeferredValue(memberQuery);
  const query = useQuery({
    queryFn: () =>
      apiRequest<PaginatedResponse<ClientAssignment>>(
        `/coaches/clients?page=${page}&pageSize=12${
          deferredQuery ? `&q=${encodeURIComponent(deferredQuery)}` : ''
        }`,
      ),
    queryKey: ['coach-clients', deferredQuery, page],
  });
  const availableMembers = useQuery({
    enabled: addOpen && deferredMemberQuery.trim().length >= 2,
    queryFn: () =>
      apiRequest<PaginatedResponse<AvailableMember>>(
        `/coaches/available-members?page=1&pageSize=10&q=${encodeURIComponent(
          deferredMemberQuery.trim(),
        )}`,
      ),
    queryKey: ['available-coach-members', deferredMemberQuery],
  });
  const addClient = useMutation({
    mutationFn: (memberId: string) =>
      apiRequest('/coaches/clients', {
        body: jsonBody({ memberId }),
        method: 'POST',
      }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['coach-clients'] }),
        queryClient.invalidateQueries({ queryKey: ['coach-dashboard'] }),
        queryClient.invalidateQueries({ queryKey: ['available-coach-members'] }),
      ]);
      setAddOpen(false);
      setMemberQuery('');
      push({
        body: 'يمكنك فتح ملفه الآن وتجهيز برنامج التدريب أو خطة الغذاء قبل بدء الاشتراك.',
        title: 'تمت إضافة اللاعب إلى فريقك',
        tone: 'success',
      });
    },
  });

  return (
    <div className="space-y-4">
      <CoachPageHeader
        body="كل لاعب تحت إشرافك له ملف مستقل للقياسات والحضور والصور وبرامج التدريب والغذاء."
        icon={Users}
        title="لاعبيّ"
      />
      <Card>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full max-w-xl">
            <Search className="pointer-events-none absolute end-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pe-10"
              onChange={(event) => {
                setQ(event.target.value);
                setPage(1);
              }}
              placeholder="بحث داخل لاعبيك"
              value={q}
            />
          </div>
          <Button className="gap-2" onClick={() => setAddOpen(true)}>
            <UserRoundPlus className="h-4 w-4" />
            إضافة لاعب
          </Button>
        </div>
      </Card>
      <QueryState query={query}>
        {(response) => (
          <>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {response.items.map(({ coaching, member }) => (
                <ClientCard
                  client={{
                    attendanceCount: member.attendanceRecords.length,
                    avatarUrl: member.user.avatarUrl,
                    coaching,
                    goal: member.fitnessGoal,
                    id: member.id,
                    name: member.user.fullName,
                    subscriptionStatus: member.subscriptions[0]?.status ?? 'NONE',
                    weight: Number(member.currentWeightKg),
                    weightChange: 0,
                  }}
                  key={member.id}
                />
              ))}
            </div>
            {!response.items.length ? <EmptyState title="لا يوجد لاعبون مطابقون للبحث" /> : null}
            <Pagination meta={response.meta} onPageChange={setPage} />
          </>
        )}
      </QueryState>
      <Dialog
        description="ابحث عن اللاعب ثم طابق كود العضو واسم المستخدم وآخر أرقام الهاتف قبل إضافته."
        onClose={() => setAddOpen(false)}
        open={addOpen}
        title="إضافة لاعب إلى فريقك"
      >
        <div className="space-y-4">
          <div className="relative">
            <Search className="pointer-events-none absolute end-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              autoFocus
              className="pe-10"
              onChange={(event) => setMemberQuery(event.target.value)}
              placeholder="اكتب الاسم، كود العضو، اسم المستخدم أو الهاتف"
              value={memberQuery}
            />
          </div>
          <div className="rounded-lg border border-brand-accent/30 bg-brand-accent/10 p-3 text-sm font-semibold leading-6">
            عند تكرار الاسم، اعتمد على كود العضو واسم المستخدم والهاتف المختصر الظاهر في النتيجة.
          </div>
          {deferredMemberQuery.trim().length < 2 ? (
            <EmptyState title="اكتب حرفين على الأقل لبدء البحث" />
          ) : availableMembers.isLoading ? (
            <DashboardLoader />
          ) : availableMembers.error ? (
            <ErrorState message={availableMembers.error.message} />
          ) : availableMembers.data?.items.length ? (
            <div className="max-h-[420px] space-y-2 overflow-y-auto pe-1">
              {availableMembers.data.items.map((member) => (
                <div
                  className="flex flex-col gap-3 rounded-lg border border-border p-4 sm:flex-row sm:items-center"
                  key={member.id}
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-black">{member.user.fullName}</p>
                    <p className="mt-1 text-xs font-bold text-muted-foreground">
                      {member.memberCode} · @{member.user.username} · {member.user.maskedPhone}
                    </p>
                    <p className="mt-2 text-sm font-semibold text-muted-foreground">
                      {member.fitnessGoal} · {member.currentWeightKg} كغ
                    </p>
                  </div>
                  <Button
                    className="gap-2"
                    isLoading={addClient.isPending && addClient.variables === member.id}
                    loadingText="جاري الإضافة"
                    onClick={() => addClient.mutate(member.id)}
                  >
                    <Plus className="h-4 w-4" />
                    إضافة
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState title="لا يوجد لاعب متاح مطابق للبحث" />
          )}
          {addClient.error ? <ErrorState message={addClient.error.message} /> : null}
        </div>
      </Dialog>
    </div>
  );
}

function coachingEventLabel(action: CoachingEvent['action']) {
  return {
    ADDED: 'تمت إضافة اللاعب',
    DEACTIVATED: 'تم إيقاف الاشتراك',
    ENDED: 'تم إنهاء العلاقة',
    EXPIRED: 'انتهت مدة الاشتراك',
    RENEWED: 'تم تجديد الاشتراك',
    RESUMED: 'تم استئناف الاشتراك',
    STARTED: 'بدأ اشتراك جديد',
  }[action];
}

function SubscriptionHistoryPanel({
  history,
  title = 'سجل الاشتراك مع الكوتش',
}: {
  history: SubscriptionHistory;
  title?: string;
}) {
  return (
    <Card>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle>{title}</CardTitle>
          <p className="mt-1 text-sm font-semibold text-muted-foreground">
            كل بداية وتجديد وإيقاف محفوظ بالتاريخ والمدة.
          </p>
        </div>
        <div className="grid w-full min-w-0 grid-cols-1 gap-2 text-center min-[360px]:grid-cols-3 sm:w-auto">
          <ClientStat label="مرات الاشتراك" value={String(history.subscriptionCount)} />
          <ClientStat label="التجديدات" value={String(history.renewalCount)} />
          <ClientStat label="مجموع الأيام" value={String(history.totalDays)} />
        </div>
      </div>
      <div className="relative mt-6 space-y-3 before:absolute before:bottom-3 before:start-[17px] before:top-3 before:w-px before:bg-border">
        {history.events.length ? (
          history.events.map((event) => (
            <div className="relative flex gap-3" key={event.id}>
              <span
                className={cn(
                  'relative z-10 mt-3 h-9 w-9 shrink-0 rounded-full border-4 border-card',
                  event.action === 'STARTED' && 'bg-brand-accent',
                  event.action === 'RENEWED' && 'bg-emerald-500',
                  event.action === 'ADDED' && 'bg-blue-500',
                  (event.action === 'DEACTIVATED' || event.action === 'EXPIRED') && 'bg-zinc-400',
                )}
              />
              <div className="min-w-0 flex-1 rounded-lg border border-border bg-muted/25 p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-black">{coachingEventLabel(event.action)}</p>
                    <p className="mt-1 text-xs font-bold text-muted-foreground">
                      {formatCompactDateTime(event.createdAt)}
                    </p>
                  </div>
                  {event.days ? (
                    <span className="rounded-full bg-brand-accent/15 px-3 py-1 text-xs font-black text-brand-accent-foreground">
                      {event.days} يوم
                    </span>
                  ) : null}
                </div>
                {event.action === 'STARTED' && event.newEndsAt ? (
                  <p className="mt-3 text-sm font-semibold text-muted-foreground">
                    من {formatCompactDate(event.createdAt)} حتى {formatCompactDate(event.newEndsAt)}
                  </p>
                ) : null}
                {event.action === 'RENEWED' && event.newEndsAt ? (
                  <p className="mt-3 text-sm font-semibold text-muted-foreground">
                    تاريخ الانتهاء الجديد: {formatCompactDate(event.newEndsAt)}
                    {event.previousEndsAt
                      ? ` · كان ${formatCompactDate(event.previousEndsAt)}`
                      : ''}
                  </p>
                ) : null}
                {(event.action === 'DEACTIVATED' || event.action === 'EXPIRED') &&
                event.previousEndsAt ? (
                  <p className="mt-3 text-sm font-semibold text-muted-foreground">
                    تاريخ الانتهاء المسجل: {formatCompactDate(event.previousEndsAt)}
                  </p>
                ) : null}
              </div>
            </div>
          ))
        ) : (
          <EmptyState title="لا توجد عمليات اشتراك مسجلة لهذا اللاعب" />
        )}
      </div>
    </Card>
  );
}

export function CoachSubscriptionArchivePage() {
  const [q, setQ] = useState('');
  const deferredQuery = useDeferredValue(q);
  const [page, setPage] = useState(1);
  const [selectedClient, setSelectedClient] = useState<ArchivedClient | null>(null);
  const query = useQuery({
    queryFn: () =>
      apiRequest<PaginatedResponse<ArchivedClient>>(
        `/coaches/subscription-archive?page=${page}&pageSize=12${
          deferredQuery ? `&q=${encodeURIComponent(deferredQuery)}` : ''
        }`,
      ),
    queryKey: ['coach-subscription-archive', deferredQuery, page],
  });

  return (
    <div className="space-y-4">
      <CoachPageHeader
        body="سجل كامل لكل لاعب تدرب معك، وعدد مرات الاشتراك والتجديد ومجموع الأيام والتواريخ."
        icon={Archive}
        title="أرشيف الاشتراكات"
      />
      <Card>
        <div className="relative max-w-xl">
          <Search className="pointer-events-none absolute end-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pe-10"
            onChange={(event) => {
              setQ(event.target.value);
              setPage(1);
            }}
            placeholder="بحث بالاسم أو كود العضو أو الهاتف"
            value={q}
          />
        </div>
      </Card>
      <QueryState query={query}>
        {(response) => (
          <>
            <div className="grid min-w-0 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {response.items.map((client) => (
                <Card
                  className="group min-w-0 max-w-full overflow-hidden transition hover:-translate-y-0.5 hover:border-brand-accent/45 hover:shadow-lg"
                  key={client.id}
                >
                  <div className="grid min-w-0 grid-cols-[3.5rem_minmax(0,1fr)] items-center gap-3 sm:grid-cols-[3.5rem_minmax(0,1fr)_auto]">
                    <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-muted">
                      {client.user.avatarUrl ? (
                        <Image
                          alt={client.user.fullName}
                          className="object-cover"
                          fill
                          sizes="56px"
                          src={client.user.avatarUrl}
                        />
                      ) : (
                        <UserRound className="m-4 h-6 w-6" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-black">{client.user.fullName}</p>
                      <p className="mt-1 truncate text-xs font-bold text-muted-foreground">
                        {client.memberCode} · @{client.user.username}
                      </p>
                    </div>
                    <div className="col-span-2 min-w-0 justify-self-start sm:col-span-1">
                      <StatusBadge status={client.currentCoaching?.status ?? 'ARCHIVED'} />
                    </div>
                  </div>
                  <div className="mt-4 grid grid-cols-1 gap-2 border-y border-border py-3 text-center min-[360px]:grid-cols-3">
                    <ClientStat
                      label="مرات الاشتراك"
                      value={String(client.subscriptionHistory.subscriptionCount)}
                    />
                    <ClientStat
                      label="التجديدات"
                      value={String(client.subscriptionHistory.renewalCount)}
                    />
                    <ClientStat
                      label="مجموع الأيام"
                      value={String(client.subscriptionHistory.totalDays)}
                    />
                  </div>
                  <div className="mt-4 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <p className="min-w-0 break-words text-xs font-bold text-muted-foreground">
                      {client.subscriptionHistory.lastActivityAt
                        ? `آخر حركة ${formatCompactDateTime(
                            client.subscriptionHistory.lastActivityAt,
                          )}`
                        : 'لم يبدأ اشتراك بعد'}
                    </p>
                    <Button
                      className="w-full gap-2 sm:w-auto"
                      onClick={() => setSelectedClient(client)}
                      variant="secondary"
                    >
                      <History className="h-4 w-4" />
                      السجل
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
            {!response.items.length ? <EmptyState title="لا توجد نتائج في الأرشيف" /> : null}
            <Pagination meta={response.meta} onPageChange={setPage} />
          </>
        )}
      </QueryState>
      <Dialog
        description="تفاصيل كل دورة اشتراك وتجديد لهذا اللاعب معك."
        onClose={() => setSelectedClient(null)}
        open={Boolean(selectedClient)}
        title={selectedClient ? `أرشيف ${selectedClient.user.fullName}` : 'أرشيف اللاعب'}
      >
        {selectedClient ? (
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg border border-border bg-muted/30 p-4">
                <p className="text-xs font-bold text-muted-foreground">اللاعب</p>
                <p className="mt-1 font-black">{selectedClient.user.fullName}</p>
                <p className="mt-1 text-xs font-bold text-muted-foreground">
                  {selectedClient.memberCode} · @{selectedClient.user.username}
                </p>
              </div>
              <div className="rounded-lg border border-border bg-muted/30 p-4">
                <p className="text-xs font-bold text-muted-foreground">إجمالي العلاقة التدريبية</p>
                <p className="mt-1 text-2xl font-black">
                  {selectedClient.subscriptionHistory.totalDays} يوم
                </p>
              </div>
            </div>
            <SubscriptionHistoryPanel
              history={selectedClient.subscriptionHistory}
              title="التسلسل الزمني"
            />
            {selectedClient.currentCoaching ? (
              <Link
                className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-foreground px-4 text-sm font-black text-background transition hover:bg-brand-accent hover:text-black"
                href={`/ar/dashboard/coach/clients/${selectedClient.id}`}
              >
                <Eye className="h-4 w-4" />
                فتح ملف اللاعب الحالي
              </Link>
            ) : null}
          </div>
        ) : null}
      </Dialog>
    </div>
  );
}

type ClientSection = 'history' | 'nutrition' | 'overview' | 'photos' | 'workouts';
const clientSections: Array<[ClientSection, string, LucideIcon]> = [
  ['overview', 'نظرة عامة', Eye],
  ['workouts', 'برامج التدريب', Dumbbell],
  ['nutrition', 'خطط الغذاء', Utensils],
  ['photos', 'صور التقدم', Camera],
  ['history', 'سجل الاشتراك', Clock3],
];

export function CoachClientDetailPage() {
  const params = useParams<{ memberId: string }>();
  const queryClient = useQueryClient();
  const { push } = useToast();
  const [section, setSection] = useState<ClientSection>('overview');
  const [photoConfirmOpen, setPhotoConfirmOpen] = useState(false);
  const [subscriptionMode, setSubscriptionMode] = useState<'renew' | 'start' | null>(null);
  const [deactivateConfirmOpen, setDeactivateConfirmOpen] = useState(false);
  const [endRelationshipOpen, setEndRelationshipOpen] = useState(false);
  const [subscriptionDays, setSubscriptionDays] = useState('30');
  const [planRequirement, setPlanRequirement] =
    useState<CoachingState['planRequirement']>('EITHER');
  const [reminderEnabled, setReminderEnabled] = useState(true);
  const [workoutEditor, setWorkoutEditor] = useState<WorkoutPlanData | 'new' | null>(null);
  const [nutritionEditor, setNutritionEditor] = useState<NutritionPlanData | 'new' | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{
    id: string;
    title: string;
    type: 'nutrition' | 'workout';
  } | null>(null);
  const query = useQuery({
    queryFn: () => apiRequest<ClientDetail>(`/coaches/clients/${params.memberId}`),
    queryKey: ['coach-client', params.memberId],
  });
  const requestPhotos = useMutation({
    mutationFn: () =>
      apiRequest('/coaches/requests', {
        body: jsonBody({
          memberId: params.memberId,
          message: 'يرجى رفع صور تقدم جديدة حتى نراجع الخطة ونكمل المتابعة.',
          type: 'NEW_PHOTOS',
        }),
        method: 'POST',
      }),
    onSuccess: () => {
      setPhotoConfirmOpen(false);
      push({
        body: 'سيظهر الطلب للاعب وسيتم قفل بقية صفحاته حتى يرفع الصور.',
        title: 'تم طلب صور جديدة',
        tone: 'success',
      });
    },
  });
  const removePlan = useMutation({
    mutationFn: (target: NonNullable<typeof deleteTarget>) =>
      apiRequest(
        `/coaches/${target.type === 'workout' ? 'workout' : 'nutrition'}-plans/${target.id}`,
        {
          method: 'DELETE',
        },
      ),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['coach-client', params.memberId] });
      setDeleteTarget(null);
      push({ title: 'تم حذف الخطة', tone: 'success' });
    },
  });
  const manageSubscription = useMutation({
    mutationFn: (mode: 'renew' | 'start') =>
      apiRequest(`/coaches/clients/${params.memberId}/${mode}`, {
        body: jsonBody({
          days: Number(subscriptionDays),
          planRequirement,
          reminderEnabled,
        }),
        method: 'POST',
      }),
    onSuccess: async (_, mode) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['coach-client', params.memberId] }),
        queryClient.invalidateQueries({ queryKey: ['coach-clients'] }),
        queryClient.invalidateQueries({ queryKey: ['coach-dashboard'] }),
      ]);
      setSubscriptionMode(null);
      push({
        body: 'سيظهر عدد الأيام المتبقية للاعب ولك، وستعمل تذكيرات الخمسة أيام تلقائياً.',
        title: mode === 'renew' ? 'تم تجديد الاشتراك الخاص' : 'تم بدء الاشتراك الخاص',
        tone: 'success',
      });
    },
  });
  const deactivateSubscription = useMutation({
    mutationFn: () =>
      apiRequest(`/coaches/clients/${params.memberId}/deactivate`, { method: 'PATCH' }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['coach-client', params.memberId] }),
        queryClient.invalidateQueries({ queryKey: ['coach-clients'] }),
        queryClient.invalidateQueries({ queryKey: ['coach-dashboard'] }),
      ]);
      setDeactivateConfirmOpen(false);
      push({
        body: 'بقي حساب النادي فعالاً، وأصبح اللاعب يستخدم تجربة اللاعب العادي.',
        title: 'تم إيقاف التدريب الخاص',
        tone: 'success',
      });
    },
  });
  const resumeSubscription = useMutation({
    mutationFn: () => apiRequest(`/coaches/clients/${params.memberId}/resume`, { method: 'PATCH' }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['coach-client', params.memberId] }),
        queryClient.invalidateQueries({ queryKey: ['coach-clients'] }),
        queryClient.invalidateQueries({ queryKey: ['coach-dashboard'] }),
      ]);
      push({
        body: 'تم نقل تاريخ الانتهاء مع الاحتفاظ بكل الأيام التي كانت متبقية وقت الإيقاف.',
        title: 'تم استئناف التدريب الخاص',
        tone: 'success',
      });
    },
  });
  const endRelationship = useMutation({
    mutationFn: () => apiRequest(`/coaches/clients/${params.memberId}/end`, { method: 'PATCH' }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['coach-clients'] }),
        queryClient.invalidateQueries({ queryKey: ['coach-dashboard'] }),
      ]);
      setEndRelationshipOpen(false);
      push({ title: 'تم إنهاء العلاقة مع اللاعب', tone: 'success' });
      window.location.href = '/ar/dashboard/coach/clients';
    },
  });

  return (
    <QueryState query={query}>
      {(client) => (
        <div className="space-y-4">
          <Link
            className="inline-flex items-center gap-2 text-sm font-black text-muted-foreground hover:text-foreground"
            href="/ar/dashboard/coach/clients"
          >
            <ArrowLeft className="h-4 w-4 rotate-180" />
            العودة إلى اللاعبين
          </Link>
          <Card className="overflow-hidden p-0">
            <div className="bg-black p-5 text-white">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div className="flex items-center gap-4">
                  <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-lg border border-white/20 bg-white/10 shadow-xl">
                    {client.user.avatarUrl ? (
                      <Image
                        alt={client.user.fullName}
                        className="object-cover"
                        fill
                        sizes="96px"
                        src={client.user.avatarUrl}
                      />
                    ) : (
                      <UserRound className="m-7 h-8 w-8" />
                    )}
                  </div>
                  <div>
                    <h1 className="text-2xl font-black text-white">{client.user.fullName}</h1>
                    <p className="mt-1 text-sm font-bold text-white/60">
                      {client.fitnessGoal} · {client.user.phone}
                    </p>
                    <p className="mt-2 text-xs font-bold text-brand-accent">
                      {client.age} سنة · {client.heightCm} سم · {client.currentWeightKg} كغ
                    </p>
                    <div className="mt-3 flex flex-wrap items-center gap-2 text-xs font-black">
                      <span
                        className={cn(
                          'rounded-full px-3 py-1',
                          client.coaching.isActive
                            ? 'bg-brand-accent text-black'
                            : 'bg-white/10 text-white/75',
                        )}
                      >
                        {client.coaching.isActive
                          ? `نشط · ${client.coaching.remainingDays} يوم متبقٍ`
                          : client.coaching.canResume
                            ? `متوقف مؤقتاً · ${client.coaching.remainingDays} يوم محفوظ`
                            : 'بانتظار بدء الاشتراك الخاص'}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {client.coaching.isActive ? (
                    <>
                      <Button
                        className="gap-2 border-white/20 bg-brand-accent text-black hover:bg-brand-accent/85"
                        onClick={() => setSubscriptionMode('renew')}
                      >
                        <RefreshCcw className="h-4 w-4" />
                        تجديد
                      </Button>
                      <Button
                        className="gap-2 border-white/20 bg-white/10 text-white hover:bg-white/20 hover:text-white"
                        onClick={() => setDeactivateConfirmOpen(true)}
                        variant="secondary"
                      >
                        <PauseCircle className="h-4 w-4" />
                        إيقاف
                      </Button>
                    </>
                  ) : client.coaching.canResume ? (
                    <Button
                      className="gap-2 bg-brand-accent text-black hover:bg-brand-accent/85"
                      isLoading={resumeSubscription.isPending}
                      loadingText="جاري الاستئناف"
                      onClick={() => resumeSubscription.mutate()}
                    >
                      <PlayCircle className="h-4 w-4" />
                      استئناف المدة المحفوظة
                    </Button>
                  ) : (
                    <Button
                      className="gap-2 bg-brand-accent text-black hover:bg-brand-accent/85"
                      onClick={() => setSubscriptionMode('start')}
                    >
                      <PlayCircle className="h-4 w-4" />
                      بدء الاشتراك
                    </Button>
                  )}
                  <Button
                    className="gap-2 border-white/20 bg-white/10 text-white hover:bg-white/20 hover:text-white"
                    onClick={() => setPhotoConfirmOpen(true)}
                    variant="secondary"
                  >
                    <Camera className="h-4 w-4" />
                    طلب صور
                  </Button>
                  <Button
                    className="gap-2 border-red-400/40 bg-red-950/40 text-white hover:bg-red-900/60 hover:text-white"
                    onClick={() => setEndRelationshipOpen(true)}
                    variant="secondary"
                  >
                    <UserRoundX className="h-4 w-4" />
                    إنهاء العلاقة
                  </Button>
                </div>
              </div>
            </div>
          </Card>

          <div className="grid grid-cols-2 gap-2 rounded-lg border border-border bg-card p-2 md:grid-cols-5">
            {clientSections.map(([value, label, Icon]) => (
              <button
                className={cn(
                  'flex min-h-11 items-center justify-center gap-2 rounded-lg px-3 text-sm font-black transition',
                  section === value
                    ? 'bg-black text-white'
                    : 'text-muted-foreground hover:bg-muted',
                )}
                key={String(value)}
                onClick={() => setSection(value as ClientSection)}
                type="button"
              >
                <Icon className="h-4 w-4" />
                {label}
              </button>
            ))}
          </div>

          {section === 'overview' ? <ClientOverview client={client} /> : null}
          {section === 'workouts' ? (
            <div className="space-y-4">
              <WorkoutPlans
                onCreate={() => setWorkoutEditor('new')}
                onDelete={(plan) =>
                  setDeleteTarget({ id: plan.id, title: plan.title, type: 'workout' })
                }
                onEdit={setWorkoutEditor}
                plans={client.workoutPlans}
              />
              <PlanVersionArchive plans={client.planArchive.workouts} />
            </div>
          ) : null}
          {section === 'nutrition' ? (
            <div className="space-y-4">
              <NutritionPlans
                onCreate={() => setNutritionEditor('new')}
                onDelete={(plan) =>
                  setDeleteTarget({ id: plan.id, title: plan.title, type: 'nutrition' })
                }
                onEdit={setNutritionEditor}
                plans={client.nutritionPlans}
              />
              <PlanVersionArchive plans={client.planArchive.nutrition} />
            </div>
          ) : null}
          {section === 'photos' ? <ProgressPhotos client={client} /> : null}
          {section === 'history' ? (
            <SubscriptionHistoryPanel history={client.subscriptionHistory} />
          ) : null}

          {workoutEditor ? (
            <WorkoutPlanEditor
              memberId={client.id}
              onClose={() => setWorkoutEditor(null)}
              plan={workoutEditor === 'new' ? null : workoutEditor}
            />
          ) : null}
          {nutritionEditor ? (
            <NutritionPlanEditor
              memberId={client.id}
              metrics={{
                age: client.age,
                gender: client.gender,
                heightCm: Number(client.heightCm),
                weightKg: Number(client.currentWeightKg),
              }}
              onClose={() => setNutritionEditor(null)}
              plan={nutritionEditor === 'new' ? null : nutritionEditor}
            />
          ) : null}
          <Dialog
            description="سيصل الطلب إلى اللاعب وسيتم تقييد بقية صفحات حسابه حتى يرفع صور تقدم جديدة."
            onClose={() => setPhotoConfirmOpen(false)}
            open={photoConfirmOpen}
            title="تأكيد طلب صور التقدم"
          >
            <div className="space-y-4">
              <div className="rounded-lg border border-border bg-muted/35 p-4">
                <p className="font-black">{client.user.fullName}</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  تأكد أن الوقت مناسب لطلب صور أمامية وجانبية وخلفية جديدة.
                </p>
              </div>
              <div className="flex justify-end gap-2">
                <DialogCancelButton onClick={() => setPhotoConfirmOpen(false)} />
                <Button
                  isLoading={requestPhotos.isPending}
                  loadingText="جاري إرسال الطلب"
                  onClick={() => requestPhotos.mutate()}
                >
                  تأكيد وإرسال الطلب
                </Button>
              </div>
            </div>
          </Dialog>
          <Dialog
            description="حدد المدة والخطط المطلوبة. لا يبدأ الاشتراك قبل وجود الخطة التي تختارها."
            onClose={() => setSubscriptionMode(null)}
            open={Boolean(subscriptionMode)}
            title={subscriptionMode === 'renew' ? 'تجديد التدريب الخاص' : 'بدء التدريب الخاص'}
          >
            <form
              className="space-y-4"
              onSubmit={(event) => {
                event.preventDefault();
                if (subscriptionMode) manageSubscription.mutate(subscriptionMode);
              }}
            >
              <div className="rounded-lg border border-brand-accent/35 bg-brand-accent/10 p-4">
                <div className="flex items-center gap-3">
                  <CircleDollarSign className="h-5 w-5 text-brand-accent-foreground" />
                  <div>
                    <p className="font-black">{client.user.fullName}</p>
                    <p className="mt-1 text-sm font-semibold text-muted-foreground">
                      {subscriptionMode === 'renew'
                        ? `المتبقي حالياً ${client.coaching.remainingDays} يوم، وستضاف المدة الجديدة إليه.`
                        : 'ستبدأ الأيام من لحظة التأكيد.'}
                    </p>
                  </div>
                </div>
              </div>
              <label className="grid gap-2 text-sm font-black">
                عدد أيام التدريب الخاص
                <Input
                  max={730}
                  min={1}
                  onChange={(event) => setSubscriptionDays(event.target.value)}
                  required
                  type="number"
                  value={subscriptionDays}
                />
              </label>
              <label className="grid gap-2 text-sm font-black">
                متى يعتبر اللاعب جاهزاً للبدء؟
                <select
                  className="min-h-11 rounded-lg border border-input bg-background px-3 text-sm font-bold"
                  onChange={(event) =>
                    setPlanRequirement(event.target.value as CoachingState['planRequirement'])
                  }
                  value={planRequirement}
                >
                  <option value="EITHER">بعد تجهيز خطة تدريب أو غذاء واحدة</option>
                  <option value="WORKOUT">بعد تجهيز برنامج التدريب</option>
                  <option value="NUTRITION">بعد تجهيز خطة الغذاء</option>
                  <option value="BOTH">بعد تجهيز البرنامج والخطة معاً</option>
                </select>
              </label>
              <label className="flex items-center gap-3 rounded-lg border border-border p-3 text-sm font-bold">
                <input
                  checked={reminderEnabled}
                  onChange={(event) => setReminderEnabled(event.target.checked)}
                  type="checkbox"
                />
                إرسال تذكير تلقائي للكوتش واللاعب عندما يتبقى 5 أيام
              </label>
              {manageSubscription.error ? (
                <ErrorState message={manageSubscription.error.message} />
              ) : null}
              <div className="flex justify-end gap-2">
                <DialogCancelButton onClick={() => setSubscriptionMode(null)} />
                <Button isLoading={manageSubscription.isPending} loadingText="جاري حفظ الاشتراك">
                  تأكيد
                </Button>
              </div>
            </form>
          </Dialog>
          <Dialog
            description="سيتوقف وصول اللاعب إلى الخطط الخاصة، لكن حسابه واشتراك النادي لن يتأثرا."
            onClose={() => setDeactivateConfirmOpen(false)}
            open={deactivateConfirmOpen}
            title="إيقاف التدريب الخاص"
          >
            <div className="space-y-4">
              <p className="rounded-lg border border-border bg-muted/40 p-4 font-semibold">
                هل تريد إيقاف اشتراك {client.user.fullName} وإعادته إلى تجربة اللاعب العادي؟
              </p>
              {deactivateSubscription.error ? (
                <ErrorState message={deactivateSubscription.error.message} />
              ) : null}
              <div className="flex justify-end gap-2">
                <DialogCancelButton onClick={() => setDeactivateConfirmOpen(false)} />
                <Button
                  isLoading={deactivateSubscription.isPending}
                  loadingText="جاري الإيقاف"
                  onClick={() => deactivateSubscription.mutate()}
                  variant="danger"
                >
                  تأكيد الإيقاف
                </Button>
              </div>
            </div>
          </Dialog>
          <Dialog
            description="هذا يختلف عن الإيقاف المؤقت: سيُنقل اللاعب إلى الأرشيف ويمكن إسناده إلى مدرب آخر."
            onClose={() => setEndRelationshipOpen(false)}
            open={endRelationshipOpen}
            title="إنهاء العلاقة مع اللاعب"
          >
            <div className="space-y-4">
              <p className="rounded-lg border border-red-500/30 bg-red-500/10 p-4 font-semibold">
                هل تريد إنهاء علاقة التدريب مع {client.user.fullName} نهائياً؟
              </p>
              {endRelationship.error ? (
                <ErrorState message={endRelationship.error.message} />
              ) : null}
              <div className="flex justify-end gap-2">
                <DialogCancelButton onClick={() => setEndRelationshipOpen(false)} />
                <Button
                  isLoading={endRelationship.isPending}
                  loadingText="جاري الإنهاء"
                  onClick={() => endRelationship.mutate()}
                  variant="danger"
                >
                  تأكيد إنهاء العلاقة
                </Button>
              </div>
            </div>
          </Dialog>
          <Dialog
            description="سيختفي محتوى الخطة من حساب اللاعب بعد الحذف."
            onClose={() => setDeleteTarget(null)}
            open={Boolean(deleteTarget)}
            title="حذف الخطة"
          >
            {deleteTarget ? (
              <div className="space-y-4">
                <p className="rounded-lg border border-border bg-muted/40 p-4 font-black">
                  {deleteTarget.title}
                </p>
                <div className="flex justify-end gap-2">
                  <DialogCancelButton onClick={() => setDeleteTarget(null)} />
                  <Button
                    isLoading={removePlan.isPending}
                    loadingText="جاري الحذف"
                    onClick={() => removePlan.mutate(deleteTarget)}
                    variant="danger"
                  >
                    حذف نهائي
                  </Button>
                </div>
              </div>
            ) : null}
          </Dialog>
        </div>
      )}
    </QueryState>
  );
}

function ClientOverview({ client }: { client: ClientDetail }) {
  const weightData = client.progressEntries.slice(-8).map((entry) => ({
    label: formatCompactDate(entry.measuredAt),
    value: Number(entry.weightKg ?? 0),
  }));
  const attendanceByMonth = useMemo(() => {
    const groups = new Map<string, number>();
    client.attendanceRecords.forEach((record) => {
      const key = new Date(record.checkedInAt).toLocaleDateString('ar', {
        month: 'short',
      });
      groups.set(key, (groups.get(key) ?? 0) + 1);
    });
    return Array.from(groups, ([label, value]) => ({ label, value })).slice(-6);
  }, [client.attendanceRecords]);
  const latest = client.progressEntries.at(-1);
  const previous = client.progressEntries.at(-2);
  const change =
    latest?.weightKg && previous?.weightKg
      ? Number(latest.weightKg) - Number(previous.weightKg)
      : 0;

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <CoachMetric
          icon={Weight}
          label="الوزن الحالي"
          value={Math.round(Number(client.currentWeightKg))}
        />
        <CoachMetric
          icon={CalendarCheck}
          label="إجمالي الحضور"
          value={client.attendanceRecords.length}
        />
        <CoachMetric
          icon={ClipboardList}
          label="قياسات مسجلة"
          value={client.progressEntries.length}
        />
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-muted-foreground">تغير الوزن</p>
              <p className="mt-2 text-3xl font-black">{change.toFixed(1)} كغ</p>
            </div>
            {change <= 0 ? (
              <TrendingDown className="h-7 w-7 text-green-600" />
            ) : (
              <TrendingUp className="h-7 w-7 text-amber-500" />
            )}
          </div>
        </Card>
      </div>
      <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <PremiumAreaChart
          data={weightData.length ? weightData : [{ label: 'لا يوجد', value: 0 }]}
          label="مسار الوزن"
          subtitle="آخر القياسات المسجلة"
        />
        <PremiumBarChart3D
          data={attendanceByMonth.length ? attendanceByMonth : [{ label: 'لا يوجد', value: 0 }]}
          label="توزيع الحضور"
          subtitle="الحضور بحسب الشهر"
        />
      </div>
      <Card>
        <CardTitle>آخر النشاطات</CardTitle>
        <div className="mt-4 grid gap-2 md:grid-cols-2">
          {client.attendanceRecords.slice(0, 8).map((record) => (
            <div
              className="flex items-center justify-between rounded-lg border border-border bg-muted/30 p-3"
              key={record.id}
            >
              <span className="flex items-center gap-2 font-bold">
                <Activity className="h-4 w-4 text-green-700 dark:text-brand-accent" />
                حضور للنادي
              </span>
              <span className="text-xs font-bold text-muted-foreground">
                {formatCompactDateTime(record.checkedInAt)}
              </span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

function WorkoutPlans({
  onCreate,
  onDelete,
  onEdit,
  plans,
}: {
  onCreate: () => void;
  onDelete: (plan: WorkoutPlanData) => void;
  onEdit: (plan: WorkoutPlanData) => void;
  plans: WorkoutPlanData[];
}) {
  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button className="gap-2" onClick={onCreate}>
          <Plus className="h-4 w-4" />
          برنامج جديد
        </Button>
      </div>
      {plans.map((plan) => {
        const days = Array.from(new Set(plan.items.map((item) => item.dayIndex))).sort(
          (a, b) => a - b,
        );
        return (
          <Card key={plan.id}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <CardTitle>{plan.title}</CardTitle>
                <p className="mt-1 text-sm text-muted-foreground">{plan.notes ?? 'بدون ملاحظات'}</p>
              </div>
              <PlanActions onDelete={() => onDelete(plan)} onEdit={() => onEdit(plan)} />
            </div>
            <div className="mt-5 grid gap-3 lg:grid-cols-2">
              {days.map((day) => (
                <section className="overflow-hidden rounded-lg border border-border" key={day}>
                  <div className="flex items-center justify-between gap-3 bg-black px-4 py-3 font-black text-white">
                    <span>اليوم {day + 1}</span>
                    <span className="text-xs text-brand-accent">
                      {plan.items.find((item) => item.dayIndex === day)?.dayTitle || 'بدون عنوان'}
                    </span>
                  </div>
                  <div className="divide-y divide-border">
                    {plan.items
                      .filter((item) => item.dayIndex === day)
                      .map((item) => (
                        <div className="p-3" key={item.id}>
                          <p className="font-black">
                            {item.exerciseName ?? item.exercise?.nameAr ?? 'تمرين مخصص'}
                          </p>
                          <p className="mt-1 text-xs font-bold text-muted-foreground">
                            {item.sets ?? '-'} مجموعات · {item.reps ?? '-'} تكرار
                          </p>
                          {item.notes ? (
                            <p className="mt-2 text-sm text-muted-foreground">{item.notes}</p>
                          ) : null}
                        </div>
                      ))}
                  </div>
                </section>
              ))}
            </div>
          </Card>
        );
      })}
      {!plans.length ? <EmptyState title="لا يوجد برنامج تدريب لهذا اللاعب" /> : null}
    </div>
  );
}

function NutritionPlans({
  onCreate,
  onDelete,
  onEdit,
  plans,
}: {
  onCreate: () => void;
  onDelete: (plan: NutritionPlanData) => void;
  onEdit: (plan: NutritionPlanData) => void;
  plans: NutritionPlanData[];
}) {
  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button className="gap-2" onClick={onCreate}>
          <Plus className="h-4 w-4" />
          خطة غذاء جديدة
        </Button>
      </div>
      {plans.map((plan) => (
        <Card key={plan.id}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle>{plan.title}</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">{plan.notes ?? 'بدون ملاحظات'}</p>
            </div>
            <PlanActions onDelete={() => onDelete(plan)} onEdit={() => onEdit(plan)} />
          </div>
          <div className="mt-5 grid gap-3 lg:grid-cols-2">
            {plan.targetCalories ? (
              <div className="grid grid-cols-4 gap-2 rounded-lg border border-brand-accent/25 bg-brand-accent/5 p-3 text-center lg:col-span-2">
                <Macro label="السعرات المستهدفة" value={plan.targetCalories} />
                <Macro label="البروتين" value={Number(plan.targetProteinG ?? 0)} />
                <Macro label="الكارب" value={Number(plan.targetCarbsG ?? 0)} />
                <Macro label="الدهون" value={Number(plan.targetFatG ?? 0)} />
              </div>
            ) : null}
            {plan.meals.map((meal) => {
              const totals = meal.items.reduce(
                (sum, item) => ({
                  calories: sum.calories + Number(item.calories ?? 0),
                  carbs: sum.carbs + Number(item.carbsG ?? 0),
                  fat: sum.fat + Number(item.fatG ?? 0),
                  protein: sum.protein + Number(item.proteinG ?? 0),
                }),
                { calories: 0, carbs: 0, fat: 0, protein: 0 },
              );
              return (
                <section className="overflow-hidden rounded-lg border border-border" key={meal.id}>
                  <div className="flex items-center justify-between gap-3 bg-black px-4 py-3 text-white">
                    <p className="font-black">{meal.name}</p>
                    <span className="text-xs font-bold text-brand-accent">
                      {meal.timing ?? 'بدون توقيت'}
                    </span>
                  </div>
                  <div className="divide-y divide-border">
                    {meal.items.map((item) => (
                      <div className="flex items-center justify-between gap-3 p-3" key={item.id}>
                        <div>
                          <p className="font-bold">{item.name}</p>
                          <p className="text-xs text-muted-foreground">{item.quantity}</p>
                        </div>
                        <span className="text-xs font-black">{item.calories ?? 0} سعرة</span>
                      </div>
                    ))}
                  </div>
                  <div className="grid grid-cols-4 gap-1 border-t border-border bg-muted/30 p-3 text-center">
                    <Macro label="سعرة" value={totals.calories} />
                    <Macro label="بروتين" value={totals.protein} />
                    <Macro label="كارب" value={totals.carbs} />
                    <Macro label="دهون" value={totals.fat} />
                  </div>
                </section>
              );
            })}
          </div>
        </Card>
      ))}
      {!plans.length ? <EmptyState title="لا توجد خطة غذاء لهذا اللاعب" /> : null}
    </div>
  );
}

function PlanVersionArchive({ plans }: { plans: Array<NutritionPlanData | WorkoutPlanData> }) {
  if (!plans.length) return null;
  return (
    <Card>
      <CardTitle>أرشيف الإصدارات السابقة</CardTitle>
      <p className="mt-2 text-sm text-muted-foreground">
        للقراءة والتدقيق فقط؛ لا يمكن تعديل إصدار مؤرشف.
      </p>
      <div className="mt-4 grid gap-2 md:grid-cols-2">
        {plans.map((plan) => (
          <div className="rounded-lg border border-border bg-muted/25 p-3" key={plan.id}>
            <div className="flex items-center justify-between gap-2">
              <p className="font-black">{plan.title}</p>
              <StatusBadge status="ARCHIVED" />
            </div>
            <p className="mt-2 text-xs font-bold text-muted-foreground">
              الإصدار {plan.version} · {formatCompactDateTime(plan.updatedAt)}
            </p>
            <details className="mt-3 text-sm">
              <summary className="cursor-pointer font-black">عرض محتوى الإصدار</summary>
              <div className="mt-2 grid gap-1 text-muted-foreground">
                {'items' in plan
                  ? plan.items.map((item) => (
                      <span key={item.id}>
                        {item.exerciseName ?? item.exercise?.nameAr ?? 'تمرين مخصص'} ·{' '}
                        {item.sets ?? '-'} × {item.reps ?? '-'}
                      </span>
                    ))
                  : plan.meals.map((meal) => (
                      <span key={meal.id}>
                        {meal.name}: {meal.items.map((item) => item.name).join('، ')}
                      </span>
                    ))}
              </div>
            </details>
          </div>
        ))}
      </div>
    </Card>
  );
}

function PlanActions({ onDelete, onEdit }: { onDelete: () => void; onEdit: () => void }) {
  return (
    <div className="flex gap-2">
      <Button className="gap-2" onClick={onEdit} variant="secondary">
        <Pencil className="h-4 w-4" />
        تعديل
      </Button>
      <Button aria-label="حذف الخطة" className="px-3" onClick={onDelete} variant="danger">
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}

function Macro({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <p className="text-xs font-black">{Math.round(value)}</p>
      <p className="text-[10px] font-bold text-muted-foreground">{label}</p>
    </div>
  );
}

function ProgressPhotos({ client }: { client: ClientDetail }) {
  if (!client.progressPhotos.length) {
    return <EmptyState title="لم يرفع اللاعب صور تقدم بعد" />;
  }
  return (
    <div className="space-y-4">
      <Card>
        <CardTitle>مقارنة حسب الزاوية</CardTitle>
        <div className="mt-4 grid gap-4 lg:grid-cols-3">
          {(['FRONT', 'SIDE', 'BACK'] as const).map((type) => {
            const matching = client.progressPhotos.filter((photo) => photo.type === type);
            const latest = matching[0] ?? null;
            const baseline = matching.at(-1) ?? null;
            return (
              <section className="rounded-lg border border-border p-3" key={type}>
                <StatusBadge status={type} />
                <div className="mt-3 grid grid-cols-2 gap-2">
                  {[baseline, latest].map((photo, index) =>
                    photo ? (
                      <Image
                        alt={`${type}-${index}`}
                        className="aspect-[3/4] rounded-md object-cover"
                        height={320}
                        key={`${photo.id}-${index}`}
                        src={`/api/v1/files/${photo.fileAsset.id}`}
                        width={240}
                      />
                    ) : (
                      <div className="aspect-[3/4] rounded-md bg-muted" key={index} />
                    ),
                  )}
                </div>
              </section>
            );
          })}
        </div>
      </Card>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {client.progressPhotos.map((photo) => (
          <Card className="overflow-hidden p-0" key={photo.id}>
            <Image
              alt={photo.type}
              className="aspect-square w-full object-cover"
              height={420}
              src={`/api/v1/files/${photo.fileAsset.id}`}
              width={420}
            />
            <div className="flex items-center justify-between p-3">
              <StatusBadge status={photo.type} />
              <span className="text-xs font-bold text-muted-foreground">
                {formatCompactDate(photo.createdAt)}
              </span>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

export function CoachPlansPage() {
  const query = useQuery({
    queryFn: () =>
      apiRequest<PaginatedResponse<ClientAssignment>>('/coaches/clients?page=1&pageSize=100'),
    queryKey: ['coach-clients', 'plans-index'],
  });

  return (
    <div className="space-y-4">
      <CoachPageHeader
        body="اختر اللاعب أولاً، ثم افتح ملفه لإدارة برنامج التدريب وخطة الغذاء الخاصة به."
        icon={ClipboardList}
        title="برامج اللاعبين"
      />
      <QueryState query={query}>
        {(response) => (
          <div className="grid min-w-0 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {response.items.map(({ member }) => (
              <Link
                className="block min-w-0 max-w-full"
                href={`/ar/dashboard/coach/clients/${member.id}`}
                key={member.id}
              >
                <Card className="group h-full min-w-0 max-w-full overflow-hidden transition hover:-translate-y-1 hover:border-brand-accent/50 hover:shadow-xl">
                  <div className="grid min-w-0 grid-cols-[3.5rem_minmax(0,1fr)_auto] items-center gap-3">
                    <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-muted">
                      {member.user.avatarUrl ? (
                        <Image
                          alt={member.user.fullName}
                          className="object-cover"
                          fill
                          sizes="56px"
                          src={member.user.avatarUrl}
                        />
                      ) : null}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-black">{member.user.fullName}</p>
                      <p className="mt-1 truncate text-xs font-bold text-muted-foreground">
                        {member.fitnessGoal}
                      </p>
                    </div>
                    <ChevronLeft className="h-5 w-5 transition group-hover:-translate-x-1" />
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </QueryState>
    </div>
  );
}

export function CoachAccountPage() {
  const queryClient = useQueryClient();
  const { push } = useToast();
  const query = useQuery({
    queryFn: () => apiRequest<CoachAccount>('/coaches/account'),
    queryKey: ['coach-account'],
  });
  const requestChange = useMutation({
    mutationFn: (payload: Record<string, FormDataEntryValue>) =>
      apiRequest('/coaches/account/change-requests', {
        body: jsonBody(payload),
        method: 'POST',
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['coach-account'] });
      push({ title: 'تم إرسال التعديل إلى الإدارة للموافقة', tone: 'success' });
    },
  });
  const cancel = useMutation({
    mutationFn: (id: string) =>
      apiRequest(`/coaches/account/change-requests/${id}`, { method: 'DELETE' }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['coach-account'] });
      push({ title: 'تم إلغاء طلب التعديل', tone: 'success' });
    },
  });

  return (
    <QueryState query={query}>
      {(account) => {
        const pending = account.changeRequests.find((request) => request.status === 'PENDING');
        return (
          <div className="space-y-4">
            <CoachPageHeader
              body="أي تعديل على بيانات الحساب يبقى معلقاً حتى يراجعه مدير النظام ويوافق عليه."
              icon={UserRound}
              title="حساب المدرب"
            />
            <div className="grid gap-4 xl:grid-cols-[0.8fr_1.2fr]">
              <Card>
                <div className="flex items-center gap-4">
                  <div className="relative h-20 w-20 overflow-hidden rounded-lg bg-muted">
                    {account.user.avatarUrl ? (
                      <Image
                        alt={account.user.fullName}
                        className="object-cover"
                        fill
                        sizes="80px"
                        src={account.user.avatarUrl}
                      />
                    ) : (
                      <UserRound className="m-6 h-8 w-8" />
                    )}
                  </div>
                  <div>
                    <CardTitle>{account.user.fullName}</CardTitle>
                    <p className="mt-1 text-sm font-bold text-muted-foreground">
                      @{account.user.username}
                    </p>
                  </div>
                </div>
                <div className="mt-5 grid gap-2">
                  <AccountRow label="الهاتف" value={account.user.phone} />
                  <AccountRow label="البريد" value={account.user.email ?? 'غير مضاف'} />
                  <AccountRow label="النبذة" value={account.bioAr ?? 'غير مضافة'} />
                </div>
              </Card>
              <Card>
                <CardTitle>طلب تعديل البيانات</CardTitle>
                {pending ? (
                  <div className="mt-4 space-y-4">
                    <div className="rounded-lg border border-amber-300/50 bg-amber-100/60 p-4 dark:bg-amber-400/10">
                      <div className="flex items-center gap-2 font-black text-amber-900 dark:text-amber-200">
                        <FileClock className="h-5 w-5" />
                        الطلب بانتظار موافقة الإدارة
                      </div>
                      <div className="mt-3 grid gap-2 text-sm">
                        {Object.entries(pending.requestedData).map(([key, value]) => (
                          <AccountRow key={key} label={profileFieldLabel(key)} value={value} />
                        ))}
                      </div>
                    </div>
                    <Button
                      isLoading={cancel.isPending}
                      loadingText="جاري الإلغاء"
                      onClick={() => cancel.mutate(pending.id)}
                      variant="danger"
                    >
                      إلغاء الطلب
                    </Button>
                  </div>
                ) : (
                  <form
                    className="mt-4 grid gap-3"
                    onSubmit={(event) => {
                      event.preventDefault();
                      requestChange.mutate(
                        Object.fromEntries(new FormData(event.currentTarget)) as Record<
                          string,
                          FormDataEntryValue
                        >,
                      );
                    }}
                  >
                    <Input
                      defaultValue={account.user.fullName}
                      name="fullName"
                      placeholder="الاسم"
                    />
                    <Input defaultValue={account.user.phone} name="phone" placeholder="الهاتف" />
                    <Textarea
                      defaultValue={account.bioAr ?? ''}
                      name="bioAr"
                      placeholder="نبذة المدرب"
                    />
                    <Button isLoading={requestChange.isPending} loadingText="جاري إرسال الطلب">
                      إرسال للموافقة
                    </Button>
                  </form>
                )}
              </Card>
            </div>
            <Card>
              <CardTitle>سجل طلبات التعديل</CardTitle>
              <div className="mt-4 grid gap-2">
                {account.changeRequests.map((request) => (
                  <div
                    className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-muted/25 p-3"
                    key={request.id}
                  >
                    <div>
                      <p className="font-black">
                        {Object.keys(request.requestedData).map(profileFieldLabel).join(' · ')}
                      </p>
                      <p className="mt-1 text-xs font-bold text-muted-foreground">
                        {formatCompactDateTime(request.createdAt)}
                      </p>
                    </div>
                    <StatusBadge status={request.status} />
                    {request.reviewReason ? (
                      <p className="text-sm font-bold text-muted-foreground">
                        {request.reviewReason}
                      </p>
                    ) : null}
                  </div>
                ))}
                {!account.changeRequests.length ? <EmptyState title="لا توجد طلبات سابقة" /> : null}
              </div>
            </Card>
          </div>
        );
      }}
    </QueryState>
  );
}

function AccountRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="rounded-lg border border-border bg-muted/30 p-3">
      <p className="text-xs font-black text-muted-foreground">{label}</p>
      <div className="mt-1 text-sm font-bold">{value}</div>
    </div>
  );
}

function profileFieldLabel(field: string) {
  return (
    {
      bioAr: 'النبذة',
      fullName: 'الاسم',
      phone: 'الهاتف',
    }[field] ?? field
  );
}
