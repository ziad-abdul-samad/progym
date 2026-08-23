'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Activity,
  ArrowLeftRight,
  BadgeCheck,
  CalendarCheck,
  CalendarDays,
  Clock3,
  ClipboardList,
  DoorOpen,
  Eye,
  Dumbbell,
  IdCard,
  KeyRound,
  ListFilter,
  Pencil,
  QrCode,
  Search,
  ShieldAlert,
  SlidersHorizontal,
  Trash2,
  UserCheck,
  UserCog,
  Users,
  UserX,
  WalletCards,
  type LucideIcon,
} from 'lucide-react';
import Image from 'next/image';
import dynamic from 'next/dynamic';
import {
  useDeferredValue,
  useMemo,
  useState,
  type ChangeEventHandler,
  type ReactNode,
} from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardTitle } from '@/components/ui/card';
import { Dialog, DialogCancelButton, DialogForm } from '@/components/ui/dialog';
import { Input, Textarea } from '@/components/ui/input';
import { Pagination, type PaginatedResponse } from '@/components/ui/pagination';
import { QrPreviewCard } from '@/components/ui/qr-preview';
import { DashboardLoader, EmptyState, ErrorState } from '@/components/ui/state';
import { StatusBadge } from '@/components/ui/status-badge';
import { useToast } from '@/components/ui/toast';
import { apiRequest, jsonBody } from '@/lib/api/client';
import { useAuth } from '@/lib/auth/use-auth';
import { cn, formatCompactDate, formatCompactDateTime, formatShiftTime } from '@/lib/utils';

type Member = {
  assignments?: Array<{ coach: { user: { fullName: string } } }>;
  age?: number;
  currentWeightKg?: string | number;
  dateOfBirth?: string;
  emergencyContactName?: string | null;
  emergencyContactPhone?: string | null;
  fitnessGoal: string;
  gender?: string;
  heightCm?: string | number;
  id: string;
  joinedAt?: string;
  memberCode?: string;
  notes?: string | null;
  subscriptions: Array<{ endsAt: string; id: string; startsAt?: string; status: string }>;
  user: {
    avatarUrl?: string | null;
    fullName: string;
    id: string;
    phone: string;
    role: 'MEMBER' | 'COACH' | 'ADMIN' | 'OBSERVER';
    status: string;
    username: string;
  };
};

type Coach = {
  _count: { assignments: number };
  assignments?: Array<{
    coachingEndsAt: string | null;
    member: {
      id: string;
      fitnessGoal: string;
      user: { fullName: string; phone?: string | null; username?: string };
    };
    status: 'ACTIVE' | 'PAUSED';
  }>;
  id: string;
  specialties?: string[];
  user: { fullName: string; id: string; status: string; username: string };
};

type CoachSubscriptionEvent = {
  action: 'ADDED' | 'DEACTIVATED' | 'ENDED' | 'EXPIRED' | 'RENEWED' | 'RESUMED' | 'STARTED';
  assignment: {
    coachingEndsAt: string | null;
    coachingStartsAt: string | null;
    planRequirement: string;
    status: string;
  };
  coach: { user: { fullName: string; username: string } };
  createdAt: string;
  days: number | null;
  id: string;
  member: {
    user: { avatarUrl: string | null; fullName: string; username: string };
  };
  newEndsAt: string | null;
  previousEndsAt: string | null;
};

type CoachProfileChangeRequest = {
  coach: { user: { fullName: string; phone: string; username: string } };
  createdAt: string;
  id: string;
  requestedData: Record<string, string>;
  reviewReason?: string | null;
  status: string;
};

type MemberProfileChangeRequest = {
  createdAt: string;
  id: string;
  member: {
    currentWeightKg: string | number;
    heightCm: string | number;
    user: {
      avatarUrl: string | null;
      fullName: string;
      phone: string;
      username: string;
    };
  };
  requestedData: Record<string, boolean | number | string>;
  reviewReason?: string | null;
  stagedAvatarId?: string | null;
  status: 'APPROVED' | 'PENDING' | 'REJECTED';
};

type ShiftObserver = {
  _count?: { membershipAuditLogs: number };
  createdAt: string;
  fullName: string;
  id: string;
  notes?: string | null;
  phone?: string | null;
  status: string;
  shiftEnd?: string | null;
  shiftStart?: string | null;
  updatedAt: string;
  user?: { lastLoginAt: string | null; username: string } | null;
  userId?: string | null;
};

type Subscription = {
  branch: BranchSummary;
  endsAt: string;
  id: string;
  member: { homeBranch: BranchSummary; user: { fullName: string } };
  plan: { nameAr: string } | null;
  startsAt?: string;
  status: string;
};

type BranchSummary = {
  code: string;
  id: string;
  nameAr: string;
  nameEn: string;
};

type MemberSubscriptionSearchResult = {
  currentSubscription: {
    branch: BranchSummary;
    endsAt: string;
    id: string;
    status: string;
  } | null;
  homeBranch: BranchSummary;
  id: string;
  memberCode: string;
  user: {
    avatarUrl: string | null;
    fullName: string;
    phone: string;
    status: string;
    username: string;
  };
};

type MembershipAuditItem = {
  action: string;
  adminName: string;
  createdAt: string;
  id: string;
  member: { user: { fullName: string; username?: string } };
  newValue: Record<string, unknown>;
  observerName?: string | null;
  observer?: ShiftObserver | null;
  previousValue: Record<string, unknown>;
  reason: string;
};

type GeneralAuditItem = {
  action: string;
  actor: {
    fullName: string;
    role: 'ADMIN' | 'COACH' | 'MEMBER' | 'OBSERVER';
    username: string;
  } | null;
  createdAt: string;
  entityId: string | null;
  entityType: string;
  id: string;
  metadata: Record<string, unknown> | null;
};

type AdminExercise = {
  category: { id: string; nameAr: string };
  categoryId?: string;
  descriptionAr?: string | null;
  id: string;
  instructionsAr?: string | null;
  isActive?: boolean;
  nameAr: string;
  nameEn?: string | null;
  trainingDay?: number | null;
  videoUrl?: string | null;
};

type QrPayload = { expiresAt: string; id: string; token: string; url: string };

type AttendanceRecord = {
  checkedInAt: string;
  id: string;
  source: string;
  voidedAt?: string | null;
  voidReason?: string | null;
  member: {
    subscriptions?: Array<{ endsAt: string; status: string }>;
    user: { avatarUrl?: string | null; fullName: string };
  };
};

type RecentCheckIn = {
  checkedInAt: string;
  id: string;
  member: { avatarUrl?: string | null; goal: string; name: string; phone: string };
  membership: { plan: string | null; remainingDays: number; status: string };
  source: string;
};

type AnalyticsOverview = {
  attendance: {
    daily: number;
    hourlyToday: Array<{ count: number; hour: string }>;
    liveInGym: number;
    monthly: number;
    weekly: number;
  };
  coaches: {
    clientsPerCoach: Array<{ clients: number; coach: string; coachId: string }>;
    total: number;
  };
  growth: {
    attendanceTrend: Array<{ count: number; date: string }>;
    memberGrowth: Array<{ count: number; date: string }>;
  };
  members: { active: number; expired: number; expiringSoon: number; frozen: number; total: number };
};

const ADMIN_PAGE_SIZE = 12;

const ShadcnBarChart = dynamic(
  () => import('@/components/ui/chart').then((module) => module.ShadcnBarChart),
  { loading: () => <Card className="h-80 animate-pulse bg-muted/40" />, ssr: false },
);

const ShadcnDonutChart = dynamic(
  () => import('@/components/ui/chart').then((module) => module.ShadcnDonutChart),
  { loading: () => <Card className="h-80 animate-pulse bg-muted/40" />, ssr: false },
);

function pagedPath(path: string, input: Record<string, number | string | undefined>): string {
  const params = new URLSearchParams();
  Object.entries(input).forEach(([key, value]) => {
    if (value !== undefined && value !== '' && value !== 'ALL') {
      params.set(key, String(value));
    }
  });
  const query = params.toString();
  return query ? `${path}?${query}` : path;
}

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

function objectFromForm(form: HTMLFormElement): Record<string, FormDataEntryValue> {
  return Object.fromEntries(new FormData(form));
}

function formText(value: FormDataEntryValue | null | undefined): string {
  return typeof value === 'string' ? value : '';
}

function auditValue(value: unknown): string {
  if (value === null || value === undefined) return '-';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean' || typeof value === 'bigint') {
    return `${value}`;
  }
  return JSON.stringify(value) ?? '-';
}

function PageHeader({
  body,
  icon: Icon,
  title,
}: {
  body: string;
  icon: LucideIcon;
  title: string;
}) {
  return (
    <div className="glass-panel flex flex-col gap-4 rounded-lg p-5 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="text-xs font-black uppercase tracking-[0.2em] text-green-700 dark:text-brand-accent">
          Pro Gym
        </p>
        <h1 className="mt-2 text-2xl font-black text-foreground md:text-3xl">{title}</h1>
        <p className="mt-2 max-w-2xl text-sm leading-7 text-muted-foreground">{body}</p>
      </div>
      <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-foreground text-background dark:bg-brand-accent dark:text-black">
        <Icon className="h-7 w-7" />
      </div>
    </div>
  );
}

function SelectField({
  children,
  className,
  defaultValue,
  name,
  onChange,
  required,
  value,
}: {
  children: ReactNode;
  className?: string;
  defaultValue?: string;
  name: string;
  onChange?: ChangeEventHandler<HTMLSelectElement>;
  required?: boolean;
  value?: string;
}) {
  return (
    <select
      className={cn(
        'min-h-11 rounded-lg border border-input bg-white/62 px-3 text-sm font-semibold text-foreground shadow-inner outline-none transition hover:border-foreground/20 focus:border-brand-accent focus:ring-2 focus:ring-ring dark:bg-white/5',
        className,
      )}
      defaultValue={defaultValue}
      name={name}
      onChange={onChange}
      required={required}
      value={value}
    >
      {children}
    </select>
  );
}

function DetailRow({ label, value }: { label: string; value?: ReactNode }) {
  return (
    <div className="rounded-lg border border-border bg-muted/35 p-3">
      <p className="text-xs font-black text-muted-foreground">{label}</p>
      <div className="mt-1 text-sm font-bold text-foreground">{value ?? '-'}</div>
    </div>
  );
}

function JsonPreview({ value }: { value: Record<string, unknown> }) {
  const entries = Object.entries(value ?? {});

  if (!entries.length) {
    return <p className="text-sm text-muted-foreground">لا توجد قيمة مسجلة</p>;
  }

  return (
    <div className="grid gap-2">
      {entries.map(([key, item]) => (
        <div
          className="flex items-center justify-between gap-3 rounded-lg border border-border bg-muted/35 px-3 py-2 text-sm"
          key={key}
        >
          <span className="font-black text-muted-foreground">{key}</span>
          <span className="break-all text-end font-bold text-foreground">{auditValue(item)}</span>
        </div>
      ))}
    </div>
  );
}

function actionLabel(action: string) {
  const labels: Record<string, string> = {
    ADD_DAYS: 'إضافة أيام',
    CREATE: 'إنشاء اشتراك',
    EXPIRE: 'إنهاء الاشتراك',
    FREEZE: 'تجميد',
    REMOVE_DAYS: 'حذف أيام',
    RENEW: 'تجديد',
    RESUME: 'استئناف',
  };

  return labels[action] ?? action;
}

function subscriptionRemainingDays(endsAt: string) {
  return Math.max(0, Math.ceil((new Date(endsAt).getTime() - Date.now()) / 86_400_000));
}

function ratio(value: number, total: number) {
  return total > 0 ? Math.min(100, Math.round((value / total) * 100)) : 0;
}

function OperationLine({
  icon: Icon,
  label,
  value,
  total,
}: {
  icon: LucideIcon;
  label: string;
  total: number;
  value: number;
}) {
  const percent = ratio(value, total);

  return (
    <div className="rounded-lg border border-border bg-white/55 p-4 shadow-sm dark:bg-white/5">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-foreground text-background dark:bg-brand-accent dark:text-black">
            <Icon className="h-5 w-5" />
          </span>
          <div>
            <p className="text-sm font-black text-foreground">{label}</p>
            <p className="text-xs font-semibold text-muted-foreground">{percent}% من الإجمالي</p>
          </div>
        </div>
        <p className="text-2xl font-black text-foreground">{value}</p>
      </div>
      <div className="mt-4 h-2 overflow-hidden rounded-full bg-muted">
        <div className="h-full rounded-full bg-brand-accent" style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}

function lastEightHourlyBars(items: Array<{ count: number; hour: string }>) {
  const currentHour = new Date().getHours();
  return Array.from({ length: 8 }, (_, index) => {
    const hour = (currentHour - 7 + index + 24) % 24;
    return items[hour] ?? { count: 0, hour: `${hour.toString().padStart(2, '0')}:00` };
  });
}

function LiveOccupancyPanel({
  daily,
  hourlyToday,
  liveInGym,
}: {
  daily: number;
  hourlyToday: Array<{ count: number; hour: string }>;
  liveInGym: number;
}) {
  const bars = lastEightHourlyBars(hourlyToday);

  return (
    <div className="grid gap-4">
      <Card className="relative overflow-hidden">
        <div className="absolute -end-16 -top-20 h-56 w-56 rounded-full bg-brand-accent/20 blur-3xl" />
        <div className="relative">
          <div className="flex items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-foreground text-background shadow-xl dark:bg-brand-accent dark:text-black">
              <DoorOpen className="h-6 w-6" />
            </span>
            <div>
              <CardTitle>داخل النادي الآن</CardTitle>
              <p className="mt-1 text-xs font-bold text-muted-foreground">
                يحسب كل دخول خلال آخر 60 دقيقة تلقائياً
              </p>
            </div>
          </div>
          <div className="mt-6 grid grid-cols-2 gap-3">
            <div className="rounded-lg bg-foreground p-5 text-background dark:bg-brand-accent dark:text-black">
              <p className="text-5xl font-black">{liveInGym}</p>
              <p className="mt-2 text-xs font-black">داخل النادي الآن</p>
            </div>
            <div className="rounded-lg border border-border bg-muted/30 p-5">
              <p className="text-5xl font-black text-foreground">{daily}</p>
              <p className="mt-2 text-xs font-black text-muted-foreground">إجمالي حضور اليوم</p>
            </div>
          </div>
        </div>
      </Card>
      <ShadcnBarChart
        data={bars.map((bar) => ({ label: bar.hour.replace(':00', ''), value: bar.count }))}
        label="حركة الاستقبال خلال آخر 8 ساعات"
        subtitle="عدد عمليات تسجيل الدخول في كل ساعة"
      />
    </div>
  );
}

function MembershipRiskPanel({
  active,
  expired,
  expiringSoon,
  frozen,
  total,
}: {
  active: number;
  expired: number;
  expiringSoon: number;
  frozen: number;
  total: number;
}) {
  const rows = [
    { color: '#22ff00', label: 'نشط', value: active },
    { color: '#f59e0b', label: 'ينتهي خلال 5 أيام', value: expiringSoon },
    { color: '#38bdf8', label: 'مجمّد', value: frozen },
    { color: '#ef4444', label: 'منتهي', value: expired },
  ];
  const risk = expiringSoon + frozen + expired;

  return (
    <ShadcnDonutChart
      data={rows}
      label="حالة اشتراكات اللاعبين"
      subtitle={`${risk} حالة تحتاج متابعة من أصل ${total} لاعب`}
    />
  );
}

export function AdminOverviewPage() {
  const query = useQuery({
    queryFn: () => apiRequest<AnalyticsOverview>('/analytics/overview'),
    queryKey: ['analytics'],
    refetchInterval: 60_000,
  });

  return (
    <QueryState query={query}>
      {(data) => (
        <div className="space-y-4">
          <PageHeader
            body="نظرة تشغيلية سريعة على اللاعبين، الاشتراكات، الحضور، والمدربين داخل النادي."
            icon={Activity}
            title="لوحة الإدارة"
          />
          <section className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
            <Card className="relative overflow-hidden p-0">
              <div className="absolute -end-16 -top-20 h-56 w-56 rounded-full bg-brand-accent/25 blur-3xl" />
              <div className="relative p-6">
                <p className="text-sm font-black text-muted-foreground">حالة النادي الآن</p>
                <div className="mt-5 grid gap-5 md:grid-cols-[0.9fr_1.1fr] md:items-end">
                  <div>
                    <p className="text-7xl font-black leading-none tracking-tight text-foreground">
                      {data.members.total}
                    </p>
                    <p className="mt-2 text-sm font-bold text-muted-foreground">
                      لاعب مسجل في Pro Gym
                    </p>
                  </div>
                  <div className="grid gap-3">
                    <OperationLine
                      icon={UserCheck}
                      label="اشتراكات نشطة"
                      total={data.members.total}
                      value={data.members.active}
                    />
                    <OperationLine
                      icon={UserX}
                      label="اشتراكات منتهية"
                      total={data.members.total}
                      value={data.members.expired}
                    />
                  </div>
                </div>
              </div>
            </Card>

            <div className="grid gap-4 sm:grid-cols-3 xl:grid-cols-1">
              <Card className="border-green-500/25 bg-green-500/10">
                <CalendarCheck className="h-5 w-5 text-green-700 dark:text-brand-accent" />
                <p className="mt-4 text-3xl font-black">{data.attendance.daily}</p>
                <p className="text-sm font-bold text-muted-foreground">حضور اليوم</p>
              </Card>
              <Card>
                <Clock3 className="h-5 w-5 text-green-700 dark:text-brand-accent" />
                <p className="mt-4 text-3xl font-black">{data.attendance.weekly}</p>
                <p className="text-sm font-bold text-muted-foreground">حضور الأسبوع</p>
              </Card>
              <Card>
                <UserCog className="h-5 w-5 text-green-700 dark:text-brand-accent" />
                <p className="mt-4 text-3xl font-black">{data.coaches.total}</p>
                <p className="text-sm font-bold text-muted-foreground">مدرب نشط</p>
              </Card>
            </div>
          </section>

          <section className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
            <LiveOccupancyPanel
              daily={data.attendance.daily}
              hourlyToday={data.attendance.hourlyToday}
              liveInGym={data.attendance.liveInGym}
            />
            <MembershipRiskPanel
              active={data.members.active}
              expired={data.members.expired}
              expiringSoon={data.members.expiringSoon}
              frozen={data.members.frozen}
              total={data.members.total}
            />
          </section>
        </div>
      )}
    </QueryState>
  );
}

export function AdminMembersPage() {
  const queryClient = useQueryClient();
  const { push } = useToast();
  const [registrationQr, setRegistrationQr] = useState<QrPayload | null>(null);
  const [memberQuery, setMemberQuery] = useState('');
  const deferredMemberQuery = useDeferredValue(memberQuery);
  const [memberPage, setMemberPage] = useState(1);
  const [memberStatus, setMemberStatus] = useState('ALL');
  const [membershipStatus, setMembershipStatus] = useState('ALL');
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [passwordMember, setPasswordMember] = useState<Member | null>(null);
  const [profileReview, setProfileReview] = useState<{
    approve: boolean;
    request: MemberProfileChangeRequest;
  } | null>(null);
  const members = useQuery({
    queryFn: () =>
      apiRequest<PaginatedResponse<Member>>(
        pagedPath('/admin/members', {
          membershipStatus,
          page: memberPage,
          pageSize: ADMIN_PAGE_SIZE,
          q: deferredMemberQuery,
          status: memberStatus,
        }),
      ),
    queryKey: ['admin-members', deferredMemberQuery, memberPage, memberStatus, membershipStatus],
  });
  const profileChanges = useQuery({
    queryFn: () =>
      apiRequest<MemberProfileChangeRequest[]>('/admin/members/profile-change-requests'),
    queryKey: ['member-profile-change-requests', 'admin'],
  });
  const create = useMutation({
    mutationFn: (payload: Record<string, FormDataEntryValue>) =>
      apiRequest('/admin/members', { body: jsonBody(payload), method: 'POST' }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['admin-members'] });
      push({ title: 'تم إنشاء اللاعب', tone: 'success' });
    },
  });
  const createRegistrationQr = useMutation({
    mutationFn: () =>
      apiRequest<QrPayload>('/admin/registration-qr', {
        body: jsonBody({ expiresInDays: 30 }),
        method: 'POST',
      }),
    onSuccess: (data) => setRegistrationQr(data),
  });
  const userAction = useMutation({
    mutationFn: ({
      action,
      body,
      id,
    }: {
      action: string;
      body?: Record<string, string>;
      id: string;
    }) =>
      apiRequest(`/admin/users/${id}/${action}`, { body: jsonBody(body ?? {}), method: 'PATCH' }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['admin-members'] });
      setPasswordMember(null);
      push({ title: 'تم تحديث اللاعب', tone: 'success' });
    },
  });
  const reviewProfile = useMutation({
    mutationFn: ({ approve, id, reason }: { approve: boolean; id: string; reason?: string }) =>
      apiRequest(`/admin/members/profile-change-requests/${id}/${approve ? 'approve' : 'reject'}`, {
        body: jsonBody({ reason }),
        method: 'POST',
      }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['member-profile-change-requests'] }),
        queryClient.invalidateQueries({ queryKey: ['admin-members'] }),
      ]);
      setProfileReview(null);
      push({ title: 'تمت مراجعة طلب تعديل اللاعب', tone: 'success' });
    },
  });

  const visibleMembers = members.data?.items ?? [];

  return (
    <div className="space-y-4">
      <PageHeader
        body="إدارة اللاعبين، توليد QR التسجيل، تعليق الحسابات، وإعادة تعيين كلمات المرور."
        icon={Users}
        title="إدارة اللاعبين"
      />

      {profileChanges.data?.some((request) => request.status === 'PENDING') ? (
        <Card className="border-amber-400/35 bg-amber-400/10">
          <div className="flex items-center justify-between gap-3">
            <div>
              <CardTitle>طلبات تعديل بيانات اللاعبين</CardTitle>
              <p className="mt-2 text-sm font-semibold text-muted-foreground">
                قارن القيم الحالية والمقترحة قبل الموافقة أو الرفض.
              </p>
            </div>
            <span className="rounded-full bg-amber-400 px-3 py-1 text-sm font-black text-black">
              {profileChanges.data.filter((request) => request.status === 'PENDING').length} قيد
              المراجعة
            </span>
          </div>
          <div className="mt-5 grid gap-3 lg:grid-cols-2">
            {profileChanges.data
              .filter((request) => request.status === 'PENDING')
              .map((request) => (
                <div
                  className="rounded-lg border border-border bg-card p-4 shadow-sm"
                  key={request.id}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-black">{request.member.user.fullName}</p>
                      <p className="text-xs font-semibold text-muted-foreground">
                        @{request.member.user.username} · {formatCompactDateTime(request.createdAt)}
                      </p>
                    </div>
                    <StatusBadge status={request.status} />
                  </div>
                  <p className="mt-3 text-sm font-bold text-muted-foreground">
                    {Object.keys(request.requestedData).map(memberChangeFieldLabel).join(' · ')}
                  </p>
                  <div className="mt-4 flex gap-2">
                    <Button
                      onClick={() => setProfileReview({ approve: true, request })}
                      variant="primary"
                    >
                      مراجعة وقبول
                    </Button>
                    <Button
                      onClick={() => setProfileReview({ approve: false, request })}
                      variant="danger"
                    >
                      رفض
                    </Button>
                  </div>
                </div>
              ))}
          </div>
        </Card>
      ) : null}

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle>QR التسجيل لأول مرة</CardTitle>
            <p className="mt-2 text-sm leading-7 text-muted-foreground">
              هذا الكود يوضع في شاشة الاستقبال. اللاعب الجديد يمسحه ويفتح نموذج التسجيل مباشرة.
            </p>
          </div>
          <Button
            className="gap-2"
            isLoading={createRegistrationQr.isPending}
            loadingText="جاري الإنشاء"
            onClick={() => createRegistrationQr.mutate()}
          >
            <QrCode className="h-4 w-4" />
            إنشاء QR
          </Button>
        </div>
      </Card>
      {registrationQr ? (
        <QrPreviewCard
          description="استخدم هذا الكود للتسجيل الأول فقط. عند تجربة الموبايل محلياً استخدم عنوان الشبكة أو tunnel."
          expiresAt={registrationQr.expiresAt}
          pathOrUrl={registrationQr.url}
          title="QR تسجيل اللاعبين"
        />
      ) : null}

      {process.env.NEXT_PUBLIC_ENABLE_MANUAL_MEMBER_CREATION === 'true' ? (
        <Card>
          <CardTitle>إنشاء لاعب يدوياً (بيئة التطوير فقط)</CardTitle>
          <form
            className="mt-4 grid gap-3 md:grid-cols-3"
            onSubmit={(event) => {
              event.preventDefault();
              create.mutate(objectFromForm(event.currentTarget));
            }}
          >
            <Input name="fullName" placeholder="الاسم الكامل" required />
            <Input name="username" placeholder="اسم المستخدم" required />
            <Input name="password" placeholder="كلمة المرور" required type="password" />
            <Input name="phone" placeholder="الهاتف" required />
            <Input name="dateOfBirth" aria-label="تاريخ الميلاد" required type="date" />
            <SelectField name="gender" required>
              <option value="MALE">ذكر</option>
              <option value="FEMALE">أنثى</option>
            </SelectField>
            <Input name="heightCm" placeholder="الطول" required type="number" />
            <Input name="weightKg" placeholder="الوزن" required type="number" />
            <Input name="fitnessGoal" placeholder="الهدف" required />
            <Button
              className="md:col-span-3"
              isLoading={create.isPending}
              loadingText="جاري الإنشاء"
            >
              إنشاء اللاعب
            </Button>
          </form>
        </Card>
      ) : null}

      <Card>
        <div className="grid gap-3 lg:grid-cols-[1.4fr_0.8fr_0.8fr_auto] lg:items-center">
          <div className="relative">
            <Search className="pointer-events-none absolute end-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pe-10"
              onChange={(event) => {
                setMemberQuery(event.target.value);
                setMemberPage(1);
              }}
              placeholder="بحث بالاسم أو اسم المستخدم أو الهاتف"
              value={memberQuery}
            />
          </div>
          <SelectField
            name="memberStatus"
            onChange={(event) => {
              setMemberStatus(event.target.value);
              setMemberPage(1);
            }}
            value={memberStatus}
          >
            <option value="ALL">كل حالات الحساب</option>
            <option value="ACTIVE">نشط</option>
            <option value="SUSPENDED">موقوف</option>
            <option value="INACTIVE">غير نشط</option>
          </SelectField>
          <SelectField
            name="membershipStatus"
            onChange={(event) => {
              setMembershipStatus(event.target.value);
              setMemberPage(1);
            }}
            value={membershipStatus}
          >
            <option value="ALL">كل الاشتراكات</option>
            <option value="ACTIVE">نشط</option>
            <option value="FROZEN">مجمد</option>
            <option value="EXPIRED">منتهي</option>
            <option value="NONE">بدون اشتراك</option>
          </SelectField>
          <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/35 px-3 py-2 text-sm font-black text-muted-foreground">
            <ListFilter className="h-4 w-4" />
            {members.data?.meta.total ?? 0} لاعب
          </div>
        </div>
      </Card>

      <QueryState query={members}>
        {() => (
          <div className="grid gap-3">
            {visibleMembers.map((member) => (
              <Card
                className="transition hover:-translate-y-0.5 hover:border-brand-accent/45"
                key={member.id}
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-black text-foreground">{member.user.fullName}</p>
                    <p className="text-sm text-muted-foreground">
                      {member.user.username} - {member.user.phone}
                    </p>
                    <p className="mt-1 text-xs font-semibold text-muted-foreground">
                      الهدف: {member.fitnessGoal}
                      {member.assignments?.[0]?.coach.user.fullName
                        ? ` - المدرب: ${member.assignments[0].coach.user.fullName}`
                        : ''}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge status={member.user.role} />
                    <StatusBadge status={member.user.status} />
                    <StatusBadge status={member.subscriptions[0]?.status ?? 'NONE'} />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      className="gap-2"
                      onClick={() => setSelectedMember(member)}
                      variant="secondary"
                    >
                      <Eye className="h-4 w-4" />
                      التفاصيل
                    </Button>
                    <Button
                      className="gap-2"
                      onClick={() => userAction.mutate({ action: 'suspend', id: member.user.id })}
                      variant="danger"
                    >
                      <ShieldAlert className="h-4 w-4" />
                      إيقاف
                    </Button>
                    <Button
                      className="gap-2"
                      onClick={() =>
                        userAction.mutate({ action: 'reactivate', id: member.user.id })
                      }
                      variant="secondary"
                    >
                      <BadgeCheck className="h-4 w-4" />
                      تفعيل
                    </Button>
                    <Button
                      className="gap-2"
                      onClick={() => setPasswordMember(member)}
                      variant="secondary"
                    >
                      <KeyRound className="h-4 w-4" />
                      كلمة المرور
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
            {!visibleMembers.length ? <EmptyState title="لا يوجد لاعبين مطابقين للفلاتر" /> : null}
          </div>
        )}
      </QueryState>
      {members.data ? <Pagination meta={members.data.meta} onPageChange={setMemberPage} /> : null}
      <Dialog
        description="عرض سريع للبيانات التشغيلية بدون مغادرة الصفحة."
        onClose={() => setSelectedMember(null)}
        open={Boolean(selectedMember)}
        title={selectedMember?.user.fullName ?? 'تفاصيل اللاعب'}
      >
        {selectedMember ? (
          <div className="space-y-4">
            <div className="grid gap-4 rounded-xl border border-border bg-muted/25 p-4 sm:grid-cols-[13rem_1fr]">
              <div className="relative h-64 overflow-hidden rounded-xl border border-border bg-background sm:h-72">
                {selectedMember.user.avatarUrl ? (
                  <Image
                    alt={selectedMember.user.fullName}
                    className="object-contain"
                    fill
                    sizes="(max-width: 640px) 100vw, 208px"
                    src={selectedMember.user.avatarUrl}
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-sm font-black text-muted-foreground">
                    لا توجد صورة
                  </div>
                )}
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <DetailRow label="الاسم الكامل" value={selectedMember.user.fullName} />
                <DetailRow label="اسم المستخدم" value={selectedMember.user.username} />
                <DetailRow label="الهاتف" value={selectedMember.user.phone} />
                <DetailRow label="كود اللاعب" value={selectedMember.memberCode ?? 'لا يوجد'} />
                <DetailRow
                  label="الحساب"
                  value={<StatusBadge status={selectedMember.user.status} />}
                />
                <DetailRow
                  label="الدور"
                  value={<StatusBadge status={selectedMember.user.role} />}
                />
                <DetailRow
                  label="تاريخ الميلاد"
                  value={
                    selectedMember.dateOfBirth
                      ? formatCompactDate(selectedMember.dateOfBirth)
                      : 'لا يوجد'
                  }
                />
                <DetailRow
                  label="العمر"
                  value={selectedMember.age ? `${selectedMember.age} سنة` : 'لا يوجد'}
                />
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <DetailRow label="الجنس" value={selectedMember.gender ?? 'لا يوجد'} />
              <DetailRow
                label="الطول"
                value={selectedMember.heightCm ? `${selectedMember.heightCm} سم` : 'لا يوجد'}
              />
              <DetailRow
                label="الوزن الحالي"
                value={
                  selectedMember.currentWeightKg
                    ? `${selectedMember.currentWeightKg} كغ`
                    : 'لا يوجد'
                }
              />
              <DetailRow label="الهدف" value={selectedMember.fitnessGoal} />
              <DetailRow
                label="تاريخ الانضمام"
                value={
                  selectedMember.joinedAt ? formatCompactDate(selectedMember.joinedAt) : 'لا يوجد'
                }
              />
              <DetailRow
                label="المدرب"
                value={selectedMember.assignments?.[0]?.coach.user.fullName ?? 'لا يوجد'}
              />
              <DetailRow
                label="الاشتراك"
                value={<StatusBadge status={selectedMember.subscriptions[0]?.status ?? 'NONE'} />}
              />
              <DetailRow
                label="بداية الاشتراك"
                value={
                  selectedMember.subscriptions[0]?.startsAt
                    ? formatCompactDate(selectedMember.subscriptions[0].startsAt)
                    : 'لا يوجد'
                }
              />
              <DetailRow
                label="نهاية الاشتراك"
                value={
                  selectedMember.subscriptions[0]?.endsAt
                    ? formatCompactDate(selectedMember.subscriptions[0].endsAt)
                    : 'لا يوجد'
                }
              />
              <DetailRow
                label="الأيام المتبقية"
                value={
                  selectedMember.subscriptions[0]
                    ? `${subscriptionRemainingDays(selectedMember.subscriptions[0].endsAt)} يوم`
                    : 'بدون اشتراك'
                }
              />
              <DetailRow
                label="جهة اتصال الطوارئ"
                value={selectedMember.emergencyContactName ?? 'لا يوجد'}
              />
              <DetailRow
                label="هاتف الطوارئ"
                value={selectedMember.emergencyContactPhone ?? 'لا يوجد'}
              />
            </div>
            {selectedMember.notes ? (
              <DetailRow label="ملاحظات" value={selectedMember.notes} />
            ) : null}
          </div>
        ) : null}
      </Dialog>
      <Dialog
        description="سيتم إلغاء جلسات اللاعب الحالية بعد تغيير كلمة المرور."
        onClose={() => setPasswordMember(null)}
        open={Boolean(passwordMember)}
        title="إعادة تعيين كلمة المرور"
      >
        {passwordMember ? (
          <DialogForm
            actions={
              <>
                <DialogCancelButton onClick={() => setPasswordMember(null)} />
                <Button isLoading={userAction.isPending} loadingText="جاري الحفظ">
                  حفظ كلمة المرور
                </Button>
              </>
            }
            onSubmit={(event) => {
              event.preventDefault();
              const form = objectFromForm(event.currentTarget);
              userAction.mutate({
                action: 'reset-password',
                body: { newPassword: formText(form.newPassword) },
                id: passwordMember.user.id,
              });
            }}
          >
            <DetailRow label="اللاعب" value={passwordMember.user.fullName} />
            <Input
              minLength={8}
              name="newPassword"
              placeholder="كلمة المرور الجديدة"
              required
              type="password"
            />
          </DialogForm>
        ) : null}
      </Dialog>
      <Dialog
        description="لن تتغير بيانات اللاعب إلا بعد تأكيد هذا القرار."
        onClose={() => setProfileReview(null)}
        open={Boolean(profileReview)}
        title={profileReview?.approve ? 'اعتماد تعديل بيانات اللاعب' : 'رفض طلب التعديل'}
      >
        {profileReview ? (
          <DialogForm
            actions={
              <>
                <DialogCancelButton onClick={() => setProfileReview(null)} />
                <Button
                  isLoading={reviewProfile.isPending}
                  loadingText="جاري تنفيذ القرار"
                  variant={profileReview.approve ? 'primary' : 'danger'}
                >
                  {profileReview.approve ? 'تأكيد الموافقة' : 'تأكيد الرفض'}
                </Button>
              </>
            }
            onSubmit={(event) => {
              event.preventDefault();
              const form = new FormData(event.currentTarget);
              reviewProfile.mutate({
                approve: profileReview.approve,
                id: profileReview.request.id,
                reason: formText(form.get('reason')),
              });
            }}
          >
            <DetailRow label="اللاعب" value={profileReview.request.member.user.fullName} />
            <div className="grid gap-2">
              {Object.entries(profileReview.request.requestedData).map(([field, value]) => (
                <div
                  className="grid gap-2 rounded-lg border border-border bg-muted/25 p-3 sm:grid-cols-[0.7fr_1fr_1fr]"
                  key={field}
                >
                  <p className="text-xs font-black text-muted-foreground">
                    {memberChangeFieldLabel(field)}
                  </p>
                  <p className="text-sm font-bold">
                    الحالي: {memberChangeCurrentValue(profileReview.request, field)}
                  </p>
                  <p className="text-sm font-black text-green-700 dark:text-brand-accent">
                    المقترح: {field === 'avatarChanged' ? 'صورة جديدة' : String(value)}
                  </p>
                </div>
              ))}
            </div>
            {profileReview.request.stagedAvatarId ? (
              <div className="rounded-xl border border-border bg-muted/25 p-3">
                <p className="mb-3 text-xs font-black text-muted-foreground">
                  الصورة الشخصية المقترحة بالحجم الكامل
                </p>
                <div className="relative mx-auto aspect-[3/4] max-h-[32rem] w-full max-w-sm overflow-hidden rounded-lg bg-background">
                  <Image
                    alt="الصورة الشخصية المقترحة"
                    className="object-contain p-1"
                    fill
                    sizes="(max-width: 640px) 100vw, 384px"
                    src={`/api/v1/files/${profileReview.request.stagedAvatarId}`}
                  />
                </div>
              </div>
            ) : null}
            <Textarea
              name="reason"
              placeholder={profileReview.approve ? 'ملاحظة إدارية اختيارية' : 'سبب الرفض'}
              required={!profileReview.approve}
            />
          </DialogForm>
        ) : null}
      </Dialog>
    </div>
  );
}

function memberChangeFieldLabel(field: string) {
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

function memberChangeCurrentValue(request: MemberProfileChangeRequest, field: string) {
  if (field === 'fullName') return request.member.user.fullName;
  if (field === 'phone') return request.member.user.phone;
  if (field === 'heightCm') return `${request.member.heightCm} سم`;
  if (field === 'currentWeightKg') return `${request.member.currentWeightKg} كغ`;
  if (field === 'avatarChanged')
    return request.member.user.avatarUrl ? 'توجد صورة' : 'لا توجد صورة';
  return '-';
}

function coachEventLabel(action: CoachSubscriptionEvent['action']) {
  return {
    ADDED: 'إضافة لاعب',
    DEACTIVATED: 'إيقاف تدريب خاص',
    ENDED: 'إنهاء العلاقة',
    EXPIRED: 'انتهاء تدريب خاص',
    RENEWED: 'تجديد تدريب خاص',
    RESUMED: 'استئناف تدريب خاص',
    STARTED: 'بدء تدريب خاص',
  }[action];
}

export function AdminCoachesPage() {
  const queryClient = useQueryClient();
  const { push } = useToast();
  const [coachQuery, setCoachQuery] = useState('');
  const deferredCoachQuery = useDeferredValue(coachQuery);
  const [promotionQuery, setPromotionQuery] = useState('');
  const deferredPromotionQuery = useDeferredValue(promotionQuery);
  const [promotionMember, setPromotionMember] = useState<Member | null>(null);
  const [coachPage, setCoachPage] = useState(1);
  const [selectedCoach, setSelectedCoach] = useState<Coach | null>(null);
  const [demoteCoach, setDemoteCoach] = useState<Coach | null>(null);
  const [profileReview, setProfileReview] = useState<{
    approve: boolean;
    request: CoachProfileChangeRequest;
  } | null>(null);
  const members = useQuery({
    queryFn: () =>
      apiRequest<PaginatedResponse<Member>>(
        pagedPath('/admin/members', {
          page: 1,
          pageSize: 30,
          q: deferredPromotionQuery,
        }),
      ),
    queryKey: ['admin-members', 'coach-select', deferredPromotionQuery],
  });
  const coaches = useQuery({
    queryFn: () =>
      apiRequest<PaginatedResponse<Coach>>(
        pagedPath('/admin/coaches', {
          page: coachPage,
          pageSize: ADMIN_PAGE_SIZE,
          q: deferredCoachQuery,
        }),
      ),
    queryKey: ['admin-coaches', coachPage, deferredCoachQuery],
  });
  const profileChanges = useQuery({
    queryFn: () =>
      apiRequest<CoachProfileChangeRequest[]>('/admin/coaches/profile-change-requests'),
    queryKey: ['coach-profile-change-requests'],
  });
  const subscriptionEvents = useQuery({
    queryFn: () => apiRequest<CoachSubscriptionEvent[]>('/admin/coaches/subscription-events'),
    queryKey: ['coach-subscription-events'],
  });
  const promotableMembers = useMemo(
    () => members.data?.items.filter((member) => member.user.role === 'MEMBER') ?? [],
    [members.data],
  );
  const promote = useMutation({
    mutationFn: (userId: string) =>
      apiRequest(`/admin/coaches/promote/${userId}`, { body: jsonBody({}), method: 'POST' }),
    onSuccess: async () => {
      await queryClient.invalidateQueries();
      setPromotionMember(null);
      setPromotionQuery('');
      push({ title: 'تمت ترقية اللاعب إلى مدرب', tone: 'success' });
    },
  });
  const demote = useMutation({
    mutationFn: ({ reason, userId }: { reason: string; userId: string }) =>
      apiRequest(`/admin/coaches/demote/${userId}`, { body: jsonBody({ reason }), method: 'POST' }),
    onSuccess: async () => {
      await queryClient.invalidateQueries();
      setDemoteCoach(null);
      push({ title: 'تمت إعادة المدرب إلى لاعب', tone: 'success' });
    },
  });
  const reviewProfile = useMutation({
    mutationFn: ({ approve, id, reason }: { approve: boolean; id: string; reason: string }) =>
      apiRequest(`/admin/coaches/profile-change-requests/${id}/${approve ? 'approve' : 'reject'}`, {
        body: jsonBody({ reason }),
        method: 'POST',
      }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['admin-coaches'] }),
        queryClient.invalidateQueries({ queryKey: ['coach-profile-change-requests'] }),
      ]);
      setProfileReview(null);
      push({ title: 'تمت مراجعة طلب تعديل المدرب', tone: 'success' });
    },
  });
  const visibleCoaches = coaches.data?.items ?? [];

  return (
    <div className="space-y-4">
      <PageHeader
        body="لا يوجد إنشاء مدرب منفصل. المدرب هو لاعب موجود يتم ترقيته أو إعادته إلى لاعب حسب قرار الإدارة."
        icon={UserCog}
        title="إدارة المدربين"
      />

      {profileChanges.data?.some((request) => request.status === 'PENDING') ? (
        <Card className="border-amber-300/45 bg-amber-100/45 dark:bg-amber-400/5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <CardTitle>طلبات تعديل بيانات المدربين</CardTitle>
              <p className="mt-1 text-sm font-semibold text-muted-foreground">
                لا يُطبق أي تعديل قبل موافقة الإدارة.
              </p>
            </div>
            <span className="rounded-full bg-amber-500 px-3 py-1 text-xs font-black text-black">
              {profileChanges.data.filter((request) => request.status === 'PENDING').length} قيد
              الانتظار
            </span>
          </div>
          <div className="mt-4 grid gap-3">
            {profileChanges.data
              .filter((request) => request.status === 'PENDING')
              .map((request) => (
                <div className="rounded-lg border border-border bg-card p-4" key={request.id}>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-black">{request.coach.user.fullName}</p>
                      <p className="mt-1 text-xs font-bold text-muted-foreground">
                        @{request.coach.user.username} · {formatCompactDateTime(request.createdAt)}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={() => setProfileReview({ approve: true, request })}>
                        موافقة
                      </Button>
                      <Button
                        onClick={() => setProfileReview({ approve: false, request })}
                        variant="danger"
                      >
                        رفض
                      </Button>
                    </div>
                  </div>
                  <div className="mt-3 grid gap-2 sm:grid-cols-3">
                    {Object.entries(request.requestedData).map(([field, value]) => (
                      <DetailRow key={field} label={coachProfileFieldLabel(field)} value={value} />
                    ))}
                  </div>
                </div>
              ))}
          </div>
        </Card>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <Card className="h-fit">
          <CardTitle>ترقية لاعب إلى مدرب</CardTitle>
          <p className="mt-2 text-sm leading-7 text-muted-foreground">
            اختر لاعباً من قاعدة اللاعبين الحالية، وسيحصل على صلاحيات المدرب مع بقاء تاريخه كلاعب
            محفوظاً.
          </p>
          <form
            className="mt-5 space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              if (promotionMember) promote.mutate(promotionMember.user.id);
            }}
          >
            <label className="relative block">
              <span className="sr-only">ابحث عن لاعب لترقيته</span>
              <Search className="pointer-events-none absolute end-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pe-11"
                onChange={(event) => setPromotionQuery(event.target.value)}
                placeholder="ابحث بالاسم، اسم المستخدم، أو رقم الهاتف"
                value={promotionQuery}
              />
            </label>
            <div className="max-h-64 space-y-2 overflow-y-auto rounded-xl border border-border bg-muted/20 p-2">
              {members.isLoading ? (
                <p className="p-5 text-center text-sm font-bold text-muted-foreground">
                  جارٍ البحث عن اللاعبين...
                </p>
              ) : members.error ? (
                <ErrorState message={members.error.message} />
              ) : promotableMembers.length ? (
                promotableMembers.map((member) => {
                  const selected = promotionMember?.user.id === member.user.id;
                  return (
                    <button
                      aria-pressed={selected}
                      className={cn(
                        'flex w-full items-center justify-between gap-3 rounded-lg border p-3 text-start transition',
                        selected
                          ? 'border-brand-accent bg-brand-accent/12 shadow-sm'
                          : 'border-transparent bg-card hover:border-brand-accent/45',
                      )}
                      key={member.user.id}
                      onClick={() => setPromotionMember(member)}
                      type="button"
                    >
                      <span className="min-w-0">
                        <strong className="block truncate text-sm">{member.user.fullName}</strong>
                        <span className="mt-1 block truncate text-xs text-muted-foreground">
                          @{member.user.username} · {member.user.phone}
                        </span>
                      </span>
                      <span
                        className={cn(
                          'grid h-8 w-8 shrink-0 place-items-center rounded-full border',
                          selected
                            ? 'border-brand-accent bg-brand-accent text-black'
                            : 'border-border text-muted-foreground',
                        )}
                      >
                        <UserCheck className="h-4 w-4" />
                      </span>
                    </button>
                  );
                })
              ) : (
                <p className="p-5 text-center text-sm font-bold text-muted-foreground">
                  لا يوجد لاعب مطابق. جرّب الاسم أو رقم الهاتف.
                </p>
              )}
            </div>
            {promotionMember ? (
              <div className="rounded-lg border border-brand-accent/35 bg-brand-accent/[0.07] p-3 text-sm">
                اللاعب المحدد: <strong>{promotionMember.user.fullName}</strong>
              </div>
            ) : null}
            <Button
              className="w-full gap-2"
              disabled={!promotionMember}
              isLoading={promote.isPending}
              loadingText="جاري الترقية"
            >
              <UserCheck className="h-4 w-4" />
              ترقية
            </Button>
          </form>
        </Card>

        <Card>
          <div className="flex items-center justify-between gap-3">
            <div>
              <CardTitle>حركة اشتراكات التدريب الخاص</CardTitle>
              <p className="mt-1 text-sm font-semibold text-muted-foreground">
                التجديدات والبدايات والإيقافات التي نفذها المدربون.
              </p>
            </div>
            <span className="rounded-full bg-brand-accent px-3 py-1 text-xs font-black text-black">
              {subscriptionEvents.data?.filter((event) => event.action === 'RENEWED').length ?? 0}{' '}
              تجديد
            </span>
          </div>
          <div className="mt-4 grid max-h-[390px] gap-2 overflow-y-auto pe-1">
            {subscriptionEvents.isLoading ? (
              <DashboardLoader />
            ) : subscriptionEvents.error ? (
              <ErrorState message={subscriptionEvents.error.message} />
            ) : subscriptionEvents.data?.length ? (
              subscriptionEvents.data.slice(0, 12).map((event) => (
                <div
                  className="grid gap-3 rounded-lg border border-border bg-muted/25 p-3 sm:grid-cols-[1fr_auto] sm:items-center"
                  key={event.id}
                >
                  <div>
                    <p className="font-black">
                      {coachEventLabel(event.action)} · {event.member.user.fullName}
                    </p>
                    <p className="mt-1 text-xs font-bold text-muted-foreground">
                      الكوتش {event.coach.user.fullName} · {formatCompactDateTime(event.createdAt)}
                    </p>
                  </div>
                  <div className="text-start sm:text-end">
                    {event.days ? (
                      <p className="font-black text-brand-accent-foreground">+{event.days} يوم</p>
                    ) : null}
                    <StatusBadge status={event.assignment.status} />
                  </div>
                </div>
              ))
            ) : (
              <EmptyState title="لا توجد حركة اشتراكات خاصة بعد" />
            )}
          </div>
        </Card>
      </div>

      <Card>
        <div className="relative max-w-xl">
          <Search className="pointer-events-none absolute end-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pe-10"
            onChange={(event) => {
              setCoachQuery(event.target.value);
              setCoachPage(1);
            }}
            placeholder="بحث عن مدرب"
            value={coachQuery}
          />
        </div>
      </Card>

      <QueryState query={coaches}>
        {() => (
          <div className="grid gap-3 md:grid-cols-2">
            {visibleCoaches.map((coach) => (
              <Card
                className="transition hover:-translate-y-0.5 hover:border-brand-accent/45"
                key={coach.id}
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-black text-foreground">{coach.user.fullName}</p>
                    <p className="mt-1 text-sm text-muted-foreground">@{coach.user.username}</p>
                    <p className="mt-3 text-sm font-semibold text-muted-foreground">
                      {coach._count.assignments} عميل في السجل
                    </p>
                  </div>
                  <StatusBadge status={coach.user.status} />
                </div>
                <div className="mt-5 grid gap-2 sm:grid-cols-2">
                  <Button
                    className="gap-2"
                    onClick={() => setSelectedCoach(coach)}
                    variant="secondary"
                  >
                    <Eye className="h-4 w-4" />
                    التفاصيل
                  </Button>
                  <Button
                    className="gap-2"
                    isLoading={demote.isPending}
                    loadingText="جاري التحديث"
                    onClick={() => setDemoteCoach(coach)}
                    variant="secondary"
                  >
                    <UserX className="h-4 w-4" />
                    إعادته إلى لاعب
                  </Button>
                </div>
              </Card>
            ))}
            {!visibleCoaches.length ? <EmptyState title="لا يوجد مدربين مطابقين للبحث" /> : null}
          </div>
        )}
      </QueryState>
      {coaches.data ? <Pagination meta={coaches.data.meta} onPageChange={setCoachPage} /> : null}
      <Dialog
        description="معلومات سريعة عن المدرب واللاعبين الذين يتابعهم حالياً."
        onClose={() => setSelectedCoach(null)}
        open={Boolean(selectedCoach)}
        title={selectedCoach?.user.fullName ?? 'تفاصيل المدرب'}
      >
        {selectedCoach ? (
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <DetailRow label="اسم المستخدم" value={selectedCoach.user.username} />
              <DetailRow
                label="حالة الحساب"
                value={<StatusBadge status={selectedCoach.user.status} />}
              />
              <DetailRow label="العملاء في السجل" value={selectedCoach._count.assignments} />
              <DetailRow
                label="الاشتراكات الخاصة النشطة"
                value={
                  selectedCoach.assignments?.filter((assignment) => assignment.status === 'ACTIVE')
                    .length ?? 0
                }
              />
            </div>
            <Card>
              <CardTitle>اللاعبون تحت إشرافه</CardTitle>
              <div className="mt-4 grid gap-2">
                {selectedCoach.assignments?.length ? (
                  selectedCoach.assignments.map((assignment) => (
                    <div
                      className="flex items-center justify-between gap-3 rounded-lg border border-border bg-muted/35 p-3"
                      key={assignment.member.id}
                    >
                      <div>
                        <p className="font-black text-foreground">
                          {assignment.member.user.fullName}
                        </p>
                        <p className="mt-1 text-xs font-semibold text-muted-foreground">
                          {assignment.member.fitnessGoal}
                        </p>
                      </div>
                      <span className="text-xs font-bold text-muted-foreground">
                        {assignment.status === 'ACTIVE' && assignment.coachingEndsAt
                          ? `نشط حتى ${formatCompactDate(assignment.coachingEndsAt)}`
                          : 'بانتظار البدء أو التجديد'}
                      </span>
                    </div>
                  ))
                ) : (
                  <EmptyState title="لا يوجد لاعبين نشطين تحت إشراف هذا المدرب" />
                )}
              </div>
            </Card>
          </div>
        ) : null}
      </Dialog>
      <Dialog
        description="سيتم إنهاء تعيينات العملاء النشطة لهذا المدرب مع حفظ التاريخ والسبب في سجل التدقيق."
        onClose={() => setDemoteCoach(null)}
        open={Boolean(demoteCoach)}
        title="إعادة المدرب إلى لاعب"
      >
        {demoteCoach ? (
          <DialogForm
            actions={
              <>
                <DialogCancelButton onClick={() => setDemoteCoach(null)} />
                <Button isLoading={demote.isPending} loadingText="جاري الإعادة" variant="danger">
                  تأكيد الإعادة
                </Button>
              </>
            }
            onSubmit={(event) => {
              event.preventDefault();
              const form = objectFromForm(event.currentTarget);
              demote.mutate({ reason: formText(form.reason), userId: demoteCoach.user.id });
            }}
          >
            <DetailRow label="المدرب" value={demoteCoach.user.fullName} />
            <Textarea name="reason" placeholder="اكتب سبب إعادة المدرب إلى لاعب" required />
          </DialogForm>
        ) : null}
      </Dialog>
      <Dialog
        description={
          profileReview?.approve
            ? 'سيتم تطبيق البيانات الجديدة مباشرة على حساب المدرب.'
            : 'لن تتغير بيانات المدرب وسيظهر له سبب الرفض.'
        }
        onClose={() => setProfileReview(null)}
        open={Boolean(profileReview)}
        title={profileReview?.approve ? 'الموافقة على التعديل' : 'رفض التعديل'}
      >
        {profileReview ? (
          <DialogForm
            actions={
              <>
                <DialogCancelButton onClick={() => setProfileReview(null)} />
                <Button
                  isLoading={reviewProfile.isPending}
                  loadingText="جاري الحفظ"
                  variant={profileReview.approve ? 'primary' : 'danger'}
                >
                  {profileReview.approve ? 'تأكيد الموافقة' : 'تأكيد الرفض'}
                </Button>
              </>
            }
            onSubmit={(event) => {
              event.preventDefault();
              const form = new FormData(event.currentTarget);
              reviewProfile.mutate({
                approve: profileReview.approve,
                id: profileReview.request.id,
                reason: formText(form.get('reason')),
              });
            }}
          >
            <DetailRow label="المدرب" value={profileReview.request.coach.user.fullName} />
            <Textarea
              name="reason"
              placeholder={profileReview.approve ? 'ملاحظة إدارية اختيارية' : 'سبب الرفض'}
              required={!profileReview.approve}
            />
          </DialogForm>
        ) : null}
      </Dialog>
    </div>
  );
}

function coachProfileFieldLabel(field: string) {
  return (
    {
      bioAr: 'النبذة',
      fullName: 'الاسم',
      phone: 'الهاتف',
    }[field] ?? field
  );
}

export function AdminMembershipsPage() {
  const auth = useAuth();
  const queryClient = useQueryClient();
  const { push } = useToast();
  const [subscriptionQuery, setSubscriptionQuery] = useState('');
  const deferredSubscriptionQuery = useDeferredValue(subscriptionQuery);
  const [subscriptionPage, setSubscriptionPage] = useState(1);
  const [subscriptionStatus, setSubscriptionStatus] = useState('ALL');
  const [newSubscriptionQuery, setNewSubscriptionQuery] = useState('');
  const deferredNewSubscriptionQuery = useDeferredValue(newSubscriptionQuery);
  const [newSubscriptionMember, setNewSubscriptionMember] =
    useState<MemberSubscriptionSearchResult | null>(null);
  const [selectedSubscription, setSelectedSubscription] = useState<Subscription | null>(null);
  const [subscriptionAction, setSubscriptionAction] = useState<{
    action: string;
    needsDays?: boolean;
    subscription: Subscription;
  } | null>(null);
  const observers = useQuery({
    queryFn: () =>
      apiRequest<PaginatedResponse<ShiftObserver>>(
        '/admin/observers?page=1&pageSize=100&status=ACTIVE',
      ),
    queryKey: ['shift-observers', 'active-select'],
  });
  const subscriptions = useQuery({
    queryFn: () =>
      apiRequest<PaginatedResponse<Subscription>>(
        pagedPath('/memberships/subscriptions', {
          page: subscriptionPage,
          pageSize: ADMIN_PAGE_SIZE,
          q: deferredSubscriptionQuery,
          status: subscriptionStatus,
        }),
      ),
    queryKey: ['subscriptions', deferredSubscriptionQuery, subscriptionPage, subscriptionStatus],
  });
  const memberSearch = useQuery({
    enabled: deferredNewSubscriptionQuery.trim().length >= 2,
    queryFn: () =>
      apiRequest<MemberSubscriptionSearchResult[]>(
        pagedPath('/memberships/members/search', { q: deferredNewSubscriptionQuery.trim() }),
      ),
    queryKey: ['membership-global-member-search', deferredNewSubscriptionQuery],
  });
  const createSubscription = useMutation({
    mutationFn: (payload: {
      days: string;
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
        queryClient.invalidateQueries({ queryKey: ['membership-global-member-search'] }),
        queryClient.invalidateQueries({ queryKey: ['admin-overview'] }),
      ]);
      setNewSubscriptionMember(null);
      setNewSubscriptionQuery('');
      push({ title: 'تم بدء الاشتراك في الفرع الحالي وتوثيق العملية', tone: 'success' });
    },
  });
  const mutateSub = useMutation({
    mutationFn: ({
      action,
      body,
      id,
    }: {
      action: string;
      body: Record<string, string>;
      id: string;
    }) =>
      apiRequest(`/memberships/subscriptions/${id}/${action}`, {
        body: jsonBody(body),
        method: 'PATCH',
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['subscriptions'] });
      setSubscriptionAction(null);
      push({ title: 'تم تعديل الاشتراك', tone: 'success' });
    },
  });

  const visibleSubscriptions = subscriptions.data?.items ?? [];

  return (
    <div className="space-y-4">
      <PageHeader
        body="ابحث عن أي لاعب للاشتراك في هذا الفرع أو نقله إليه بعد الدفع. يُحفظ فرع تسجيله الأصلي وتُوثق كل عملية باسم مراقب الشفت."
        icon={WalletCards}
        title="الاشتراكات"
      />
      <Card className="overflow-hidden border-brand-accent/25">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex items-center gap-2 text-green-700 dark:text-brand-accent">
              <ArrowLeftRight className="h-5 w-5" />
              <p className="font-black">اشتراك أو نقل لاعب إلى هذا الفرع</p>
            </div>
            <p className="mt-2 max-w-2xl text-sm leading-7 text-muted-foreground">
              ابحث بالاسم أو اسم المستخدم أو رقم الهاتف. عند تأكيد الدفع يبدأ اشتراك جديد بسعر الفرع
              الحالي، وينتهي الاشتراك السابق تلقائياً من دون حذف تاريخه.
            </p>
          </div>
          <div className="w-full lg:max-w-md">
            <div className="relative">
              <Search className="pointer-events-none absolute end-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pe-10"
                onChange={(event) => setNewSubscriptionQuery(event.target.value)}
                placeholder="ابحث عن اللاعب في جميع الفروع"
                value={newSubscriptionQuery}
              />
            </div>
            {newSubscriptionQuery.trim().length === 1 ? (
              <p className="mt-2 text-xs text-muted-foreground">اكتب حرفين على الأقل للبحث.</p>
            ) : null}
          </div>
        </div>

        {deferredNewSubscriptionQuery.trim().length >= 2 ? (
          <div className="mt-5 grid gap-2 border-t border-border pt-4">
            {memberSearch.isLoading ? <DashboardLoader /> : null}
            {memberSearch.error ? <ErrorState message={memberSearch.error.message} /> : null}
            {memberSearch.data?.map((member) => (
              <button
                className="flex w-full flex-col gap-3 rounded-lg border border-border bg-muted/25 p-3 text-start transition hover:border-brand-accent/55 hover:bg-brand-accent/[0.04] sm:flex-row sm:items-center"
                key={member.id}
                onClick={() => setNewSubscriptionMember(member)}
                type="button"
              >
                {member.user.avatarUrl ? (
                  <Image
                    alt={member.user.fullName}
                    className="h-16 w-14 rounded-lg bg-muted object-contain"
                    height={64}
                    src={member.user.avatarUrl}
                    width={56}
                  />
                ) : (
                  <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-muted">
                    <Users className="h-6 w-6 text-muted-foreground" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="font-black">{member.user.fullName}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    @{member.user.username} · {member.user.phone} · {member.memberCode}
                  </p>
                </div>
                <div className="grid gap-1 text-xs font-bold text-muted-foreground sm:text-end">
                  <span>فرع التسجيل: {member.homeBranch.nameAr}</span>
                  <span>
                    الاشتراك الحالي: {member.currentSubscription?.branch.nameAr ?? 'لا يوجد'}
                  </span>
                </div>
              </button>
            ))}
            {memberSearch.data && !memberSearch.data.length ? (
              <EmptyState title="لم نجد لاعباً مطابقاً في الفروع" />
            ) : null}
          </div>
        ) : null}
      </Card>
      <Card>
        <div className="grid gap-3 lg:grid-cols-[1fr_0.8fr_auto] lg:items-center">
          <div className="relative">
            <Search className="pointer-events-none absolute end-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pe-10"
              onChange={(event) => {
                setSubscriptionQuery(event.target.value);
                setSubscriptionPage(1);
              }}
              placeholder="بحث باسم اللاعب"
              value={subscriptionQuery}
            />
          </div>
          <SelectField
            name="subscriptionStatus"
            onChange={(event) => {
              setSubscriptionStatus(event.target.value);
              setSubscriptionPage(1);
            }}
            value={subscriptionStatus}
          >
            <option value="ALL">كل حالات الاشتراك</option>
            <option value="ACTIVE">نشط</option>
            <option value="FROZEN">مجمد</option>
            <option value="EXPIRED">منتهي</option>
            <option value="PENDING">قيد الانتظار</option>
          </SelectField>
          <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/35 px-3 py-2 text-sm font-black text-muted-foreground">
            <SlidersHorizontal className="h-4 w-4" />
            {subscriptions.data?.meta.total ?? 0} اشتراك
          </div>
        </div>
      </Card>

      <QueryState query={subscriptions}>
        {() => (
          <div className="grid gap-3">
            {visibleSubscriptions.map((sub) => (
              <Card key={sub.id}>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-black">{sub.member.user.fullName}</p>
                    <p className="text-sm text-muted-foreground">
                      {sub.plan?.nameAr ?? 'اشتراك مخصص'} - ينتهي {formatCompactDate(sub.endsAt)}
                    </p>
                  </div>
                  <StatusBadge status={sub.status} />
                  <div className="flex flex-wrap gap-2">
                    <Button onClick={() => setSelectedSubscription(sub)} variant="secondary">
                      التفاصيل
                    </Button>
                    {['ACTIVE', 'FROZEN'].includes(sub.status) ? (
                      <Button
                        onClick={() =>
                          setSubscriptionAction({
                            action: 'add-days',
                            needsDays: true,
                            subscription: sub,
                          })
                        }
                        variant="secondary"
                      >
                        إضافة أيام
                      </Button>
                    ) : null}
                    {['ACTIVE', 'FROZEN'].includes(sub.status) ? (
                      <Button
                        onClick={() =>
                          setSubscriptionAction({
                            action: 'remove-days',
                            needsDays: true,
                            subscription: sub,
                          })
                        }
                        variant="secondary"
                      >
                        حذف أيام
                      </Button>
                    ) : null}
                    {sub.status === 'ACTIVE' ? (
                      <Button
                        onClick={() =>
                          setSubscriptionAction({ action: 'freeze', subscription: sub })
                        }
                        variant="secondary"
                      >
                        تجميد
                      </Button>
                    ) : null}
                    {sub.status === 'FROZEN' ? (
                      <Button
                        onClick={() =>
                          setSubscriptionAction({ action: 'resume', subscription: sub })
                        }
                        variant="secondary"
                      >
                        استئناف
                      </Button>
                    ) : null}
                    {['ACTIVE', 'FROZEN', 'EXPIRED'].includes(sub.status) ? (
                      <Button
                        onClick={() =>
                          setSubscriptionAction({
                            action: 'renew',
                            needsDays: true,
                            subscription: sub,
                          })
                        }
                        variant="secondary"
                      >
                        تجديد
                      </Button>
                    ) : null}
                    {['ACTIVE', 'FROZEN', 'PENDING'].includes(sub.status) ? (
                      <Button
                        onClick={() =>
                          setSubscriptionAction({ action: 'expire', subscription: sub })
                        }
                        variant="danger"
                      >
                        إنهاء
                      </Button>
                    ) : null}
                  </div>
                </div>
              </Card>
            ))}
            {!visibleSubscriptions.length ? <EmptyState title="لا توجد اشتراكات مطابقة" /> : null}
          </div>
        )}
      </QueryState>
      {subscriptions.data ? (
        <Pagination meta={subscriptions.data.meta} onPageChange={setSubscriptionPage} />
      ) : null}
      <Dialog
        description="بعد استلام الدفع سيبدأ اشتراك جديد في الفرع الحالي. إذا كان هناك اشتراك فعال، سيُنهيه النظام ويحفظه في السجل قبل بدء الاشتراك الجديد."
        onClose={() => setNewSubscriptionMember(null)}
        open={Boolean(newSubscriptionMember)}
        title="تأكيد الاشتراك في الفرع الحالي"
      >
        {newSubscriptionMember ? (
          <DialogForm
            actions={
              <>
                <DialogCancelButton onClick={() => setNewSubscriptionMember(null)} />
                <Button isLoading={createSubscription.isPending} loadingText="جاري تفعيل الاشتراك">
                  تأكيد الدفع والاشتراك
                </Button>
              </>
            }
            onSubmit={(event) => {
              event.preventDefault();
              const form = objectFromForm(event.currentTarget);
              createSubscription.mutate({
                days: formText(form.days),
                memberId: newSubscriptionMember.id,
                observerId: formText(form.observerId) || undefined,
                reason: formText(form.reason),
              });
            }}
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <DetailRow label="اللاعب" value={newSubscriptionMember.user.fullName} />
              <DetailRow label="فرع التسجيل" value={newSubscriptionMember.homeBranch.nameAr} />
              <DetailRow
                label="الاشتراك المدفوع الحالي"
                value={newSubscriptionMember.currentSubscription?.branch.nameAr ?? 'لا يوجد'}
              />
              <DetailRow
                label="حالته"
                value={
                  newSubscriptionMember.currentSubscription ? (
                    <StatusBadge status={newSubscriptionMember.currentSubscription.status} />
                  ) : (
                    'لا يوجد اشتراك'
                  )
                }
              />
            </div>
            <Input defaultValue={30} min={1} name="days" required type="number" />
            {auth.data?.role !== 'OBSERVER' ? (
              <SelectField name="observerId" required>
                <option value="">اختر مراقب الشفت</option>
                {observers.data?.items.map((observer) => (
                  <option key={observer.id} value={observer.id}>
                    {observer.fullName}
                  </option>
                ))}
              </SelectField>
            ) : null}
            <Textarea
              defaultValue="اشتراك جديد في الفرع الحالي بعد استلام الدفع"
              name="reason"
              required
            />
          </DialogForm>
        ) : null}
      </Dialog>
      <Dialog
        description="تفاصيل الاشتراك الحالية لهذا اللاعب."
        onClose={() => setSelectedSubscription(null)}
        open={Boolean(selectedSubscription)}
        title={selectedSubscription?.member.user.fullName ?? 'تفاصيل الاشتراك'}
      >
        {selectedSubscription ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <DetailRow label="الخطة" value={selectedSubscription.plan?.nameAr ?? 'اشتراك مخصص'} />
            <DetailRow label="فرع الاشتراك" value={selectedSubscription.branch.nameAr} />
            <DetailRow
              label="الحالة"
              value={<StatusBadge status={selectedSubscription.status} />}
            />
            <DetailRow
              label="تاريخ البداية"
              value={
                selectedSubscription.startsAt
                  ? formatCompactDate(selectedSubscription.startsAt)
                  : '-'
              }
            />
            <DetailRow
              label="تاريخ الانتهاء"
              value={formatCompactDate(selectedSubscription.endsAt)}
            />
            <DetailRow
              label="الأيام المتبقية"
              value={`${subscriptionRemainingDays(selectedSubscription.endsAt)} يوم`}
            />
          </div>
        ) : null}
      </Dialog>
      <Dialog
        description={
          subscriptionAction?.action === 'renew'
            ? 'مدة التجديد الافتراضية 30 يوماً ويمكن تعديلها قبل التأكيد. لا حاجة لكتابة سبب عند التجديد.'
            : 'اكتب سبباً واضحاً لهذا التعديل ليظهر للمالك في سجل التدقيق.'
        }
        onClose={() => setSubscriptionAction(null)}
        open={Boolean(subscriptionAction)}
        title={
          subscriptionAction
            ? actionLabel(subscriptionAction.action.replace('-', '_').toUpperCase())
            : 'تعديل الاشتراك'
        }
      >
        {subscriptionAction ? (
          <DialogForm
            actions={
              <>
                <DialogCancelButton onClick={() => setSubscriptionAction(null)} />
                <Button isLoading={mutateSub.isPending} loadingText="جاري الحفظ">
                  تأكيد التعديل
                </Button>
              </>
            }
            onSubmit={(event) => {
              event.preventDefault();
              const form = objectFromForm(event.currentTarget);
              mutateSub.mutate({
                action: subscriptionAction.action,
                body: {
                  observerId: formText(form.observerId),
                  ...(subscriptionAction.action !== 'renew'
                    ? { reason: formText(form.reason) }
                    : {}),
                  ...(subscriptionAction.needsDays ? { days: formText(form.days) } : {}),
                },
                id: subscriptionAction.subscription.id,
              });
            }}
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <DetailRow
                label="اللاعب"
                value={subscriptionAction.subscription.member.user.fullName}
              />
              <DetailRow
                label="الحالة الحالية"
                value={<StatusBadge status={subscriptionAction.subscription.status} />}
              />
              <DetailRow
                label="ينتهي في"
                value={formatCompactDate(subscriptionAction.subscription.endsAt)}
              />
              <DetailRow
                label="المتبقي"
                value={`${subscriptionRemainingDays(subscriptionAction.subscription.endsAt)} يوم`}
              />
            </div>
            {subscriptionAction.needsDays ? (
              <label className="grid gap-2 text-sm font-black">
                عدد الأيام
                <Input
                  defaultValue={subscriptionAction.action === 'renew' ? 30 : undefined}
                  min={1}
                  name="days"
                  placeholder="عدد الأيام"
                  required
                  type="number"
                />
                {subscriptionAction.action === 'renew' ? (
                  <span className="text-xs font-medium text-muted-foreground">
                    القيمة الافتراضية 30 يوماً، ويمكنك تعديلها.
                  </span>
                ) : null}
              </label>
            ) : null}
            <SelectField name="observerId" required>
              <option value="">اختر مراقب الشفت</option>
              {observers.data?.items.map((observer) => (
                <option key={observer.id} value={observer.id}>
                  {observer.fullName}
                </option>
              ))}
            </SelectField>
            {subscriptionAction.action !== 'renew' ? (
              <Textarea name="reason" placeholder="سبب التعديل للمالك" required />
            ) : null}
          </DialogForm>
        ) : null}
      </Dialog>
    </div>
  );
}

export function AdminAttendancePage() {
  const queryClient = useQueryClient();
  const { push } = useToast();
  const [qr, setQr] = useState<QrPayload | null>(null);
  const [attendancePage, setAttendancePage] = useState(1);
  const [attendanceQuery, setAttendanceQuery] = useState('');
  const deferredAttendanceQuery = useDeferredValue(attendanceQuery);
  const [manualMemberQuery, setManualMemberQuery] = useState('');
  const deferredManualMemberQuery = useDeferredValue(manualMemberQuery);
  const records = useQuery({
    queryFn: () =>
      apiRequest<PaginatedResponse<AttendanceRecord>>(
        pagedPath('/attendance', {
          page: attendancePage,
          pageSize: ADMIN_PAGE_SIZE,
          q: deferredAttendanceQuery,
        }),
      ),
    queryKey: ['admin-attendance', attendancePage, deferredAttendanceQuery],
  });
  const recent = useQuery({
    queryFn: () => apiRequest<RecentCheckIn[]>('/attendance/recent'),
    queryKey: ['attendance-recent'],
    refetchInterval: 10_000,
  });
  const createQr = useMutation({
    mutationFn: () =>
      apiRequest<QrPayload>('/attendance/qr', {
        body: jsonBody({ expiresInMinutes: 60 }),
        method: 'POST',
      }),
    onSuccess: (data) => setQr(data),
  });
  const manualMembers = useQuery({
    enabled: deferredManualMemberQuery.trim().length >= 2,
    queryFn: () =>
      apiRequest<PaginatedResponse<Member>>(
        pagedPath('/admin/members', {
          page: 1,
          pageSize: 6,
          q: deferredManualMemberQuery,
        }),
      ),
    queryKey: ['manual-attendance-members', deferredManualMemberQuery],
  });
  const manualAttendance = useMutation({
    mutationFn: ({ memberId, notes }: { memberId: string; notes?: string }) =>
      apiRequest('/attendance/manual', {
        body: jsonBody({ memberId, notes }),
        method: 'POST',
      }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['admin-attendance'] }),
        queryClient.invalidateQueries({ queryKey: ['attendance-recent'] }),
        queryClient.invalidateQueries({ queryKey: ['admin-overview'] }),
      ]);
      setManualMemberQuery('');
      push({ title: 'تم تسجيل الحضور يدوياً', tone: 'success' });
    },
  });
  const voidAttendance = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      apiRequest(`/attendance/${id}/void`, {
        body: jsonBody({ reason }),
        method: 'PATCH',
      }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['admin-attendance'] }),
        queryClient.invalidateQueries({ queryKey: ['attendance-recent'] }),
        queryClient.invalidateQueries({ queryKey: ['admin-overview'] }),
      ]);
      push({ title: 'تم إلغاء تسجيل الحضور', tone: 'success' });
    },
  });

  return (
    <div className="space-y-4">
      <PageHeader
        body="شاشة الاستقبال تعرض QR الحضور. اللاعب المسجل يمسحه من هاتفه، والنظام يعرض نتيجة الدخول للعضو والإدارة."
        icon={CalendarCheck}
        title="الحضور والاستقبال"
      />
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle>QR الحضور اليومي</CardTitle>
            <p className="mt-2 text-sm leading-7 text-muted-foreground">
              اجعل هذا الكود ظاهراً على شاشة الاستقبال. للاختبار بالموبايل استخدم عنوان الشبكة
              المحلي.
            </p>
          </div>
          <Button
            className="gap-2"
            isLoading={createQr.isPending}
            loadingText="جاري الإنشاء"
            onClick={() => createQr.mutate()}
          >
            <QrCode className="h-4 w-4" />
            إنشاء QR
          </Button>
        </div>
      </Card>
      {qr ? (
        <QrPreviewCard
          description="هذا QR مخصص للحضور. اللاعب يجب أن يكون مسجلاً دخوله على هاتفه قبل المسح."
          expiresAt={qr.expiresAt}
          pathOrUrl={qr.url}
          title="QR الحضور"
        />
      ) : null}

      <Card>
        <CardTitle>تسجيل حضور يدوي احتياطي</CardTitle>
        <p className="mt-2 text-sm text-muted-foreground">
          يستخدمه الاستقبال فقط عند تعذر QR. ابحث عن اللاعب ثم سجل السبب أو الملاحظة.
        </p>
        <Input
          className="mt-4"
          onChange={(event) => setManualMemberQuery(event.target.value)}
          placeholder="اسم اللاعب أو الهاتف أو اسم المستخدم"
          value={manualMemberQuery}
        />
        <div className="mt-3 grid gap-2">
          {manualMembers.data?.items.map((member) => (
            <div
              className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border p-3"
              key={member.id}
            >
              <div>
                <p className="font-black">{member.user.fullName}</p>
                <p className="text-xs text-muted-foreground">
                  @{member.user.username} · {member.user.phone}
                </p>
              </div>
              <Button
                isLoading={manualAttendance.isPending}
                loadingText="جاري التسجيل"
                onClick={() => {
                  const noteInput = window.prompt('ملاحظة التسجيل اليدوي (اختياري)');
                  if (noteInput === null) return;
                  const notes = noteInput.trim() || undefined;
                  manualAttendance.mutate({ memberId: member.id, notes });
                }}
              >
                تسجيل الحضور
              </Button>
            </div>
          ))}
        </div>
        {manualAttendance.error ? <ErrorState message={manualAttendance.error.message} /> : null}
      </Card>

      <Card className="overflow-hidden p-0">
        <div className="border-b border-border bg-gradient-to-l from-brand-accent/15 to-transparent p-5">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <CardTitle>دخول مباشر للاستقبال</CardTitle>
              <p className="mt-2 text-sm font-semibold text-muted-foreground">
                آخر عمليات المسح تظهر تلقائياً مع صورة اللاعب وحالة اشتراكه.
              </p>
            </div>
            <span className="rounded-full bg-foreground px-3 py-1 text-xs font-black text-background dark:bg-brand-accent dark:text-black">
              تحديث مباشر
            </span>
          </div>
        </div>
        <div className="p-5">
          <QueryState query={recent}>
            {(items) => (
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                {items.map((item) => (
                  <div
                    className="group relative overflow-hidden rounded-lg border border-border bg-card p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-brand-accent/50 hover:shadow-lg"
                    key={item.id}
                  >
                    <div className="flex items-center gap-3">
                      {item.member.avatarUrl ? (
                        <Image
                          alt={item.member.name}
                          className="h-16 w-16 rounded-lg object-cover ring-2 ring-brand-accent/25"
                          height={64}
                          src={item.member.avatarUrl}
                          width={64}
                        />
                      ) : (
                        <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-foreground text-background">
                          <IdCard className="h-7 w-7" />
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-black text-foreground">{item.member.name}</p>
                        <p className="mt-1 truncate text-xs font-semibold text-muted-foreground">
                          {item.member.goal}
                        </p>
                      </div>
                    </div>
                    <div className="mt-4 flex items-center justify-between border-t border-border pt-3">
                      <span className="text-xs font-bold text-muted-foreground">
                        {formatCompactDateTime(item.checkedInAt)}
                      </span>
                      <div className="text-end">
                        <StatusBadge status={item.membership.status} />
                        <p className="mt-1 text-xs font-black text-green-700 dark:text-brand-accent">
                          {item.membership.remainingDays} يوم
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </QueryState>
        </div>
      </Card>

      <Card>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>أرشيف الحضور</CardTitle>
            <p className="mt-2 text-sm text-muted-foreground">
              للبحث والمراجعة التاريخية، وليس لمراقبة الدخول المباشر.
            </p>
          </div>
          <div className="relative w-full sm:max-w-sm">
            <Search className="pointer-events-none absolute end-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pe-10"
              onChange={(event) => {
                setAttendanceQuery(event.target.value);
                setAttendancePage(1);
              }}
              placeholder="بحث باسم اللاعب أو الهاتف"
              value={attendanceQuery}
            />
          </div>
        </div>
        <QueryState query={records}>
          {(page) => (
            <div className="mt-4 overflow-hidden rounded-lg border border-border">
              {page.items.map((record) => (
                <div
                  className={cn(
                    'grid gap-2 border-b border-border p-3 last:border-0 sm:grid-cols-[1fr_auto_auto_auto] sm:items-center',
                    record.voidedAt && 'opacity-55',
                  )}
                  key={record.id}
                >
                  <div className="flex items-center gap-3">
                    {record.member.user.avatarUrl ? (
                      <Image
                        alt={record.member.user.fullName}
                        className="h-10 w-10 rounded-lg object-cover"
                        height={40}
                        src={record.member.user.avatarUrl}
                        width={40}
                      />
                    ) : (
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                        <IdCard className="h-4 w-4" />
                      </div>
                    )}
                    <span className="font-black">{record.member.user.fullName}</span>
                  </div>
                  <span className="text-xs font-bold text-muted-foreground">
                    {record.source === 'QR' ? 'مسح QR' : 'إدخال إداري'}
                  </span>
                  <span className="text-sm font-semibold text-muted-foreground">
                    {formatCompactDateTime(record.checkedInAt)}
                  </span>
                  {record.voidedAt ? (
                    <span className="text-xs font-black text-red-600">
                      ملغى: {record.voidReason}
                    </span>
                  ) : (
                    <Button
                      disabled={voidAttendance.isPending}
                      onClick={() => {
                        const reason = window.prompt('سبب إلغاء تسجيل الحضور');
                        if (reason?.trim()) voidAttendance.mutate({ id: record.id, reason });
                      }}
                      variant="danger"
                    >
                      إلغاء
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </QueryState>
      </Card>
      {records.data ? (
        <Pagination meta={records.data.meta} onPageChange={setAttendancePage} />
      ) : null}
    </div>
  );
}

export function AdminExercisesPage() {
  const queryClient = useQueryClient();
  const { push } = useToast();
  const [exerciseQuery, setExerciseQuery] = useState('');
  const deferredExerciseQuery = useDeferredValue(exerciseQuery);
  const [exercisePage, setExercisePage] = useState(1);
  const [exerciseCategory, setExerciseCategory] = useState('ALL');
  const [exerciseDay, setExerciseDay] = useState('ALL');
  const [selectedExercise, setSelectedExercise] = useState<AdminExercise | null>(null);
  const [editingExercise, setEditingExercise] = useState<AdminExercise | null>(null);
  const [deletingExercise, setDeletingExercise] = useState<AdminExercise | null>(null);
  const categories = useQuery({
    queryFn: () => apiRequest<Array<{ id: string; nameAr: string }>>('/exercises/categories'),
    queryKey: ['exercise-categories'],
  });
  const exercises = useQuery({
    queryFn: () =>
      apiRequest<PaginatedResponse<AdminExercise>>(
        pagedPath('/exercises/admin', {
          categoryId: exerciseCategory,
          page: exercisePage,
          pageSize: ADMIN_PAGE_SIZE,
          q: deferredExerciseQuery,
          trainingDay: exerciseDay,
        }),
      ),
    queryKey: [
      'admin-exercises',
      deferredExerciseQuery,
      exerciseCategory,
      exerciseDay,
      exercisePage,
    ],
  });
  const create = useMutation({
    mutationFn: (payload: Record<string, FormDataEntryValue>) =>
      apiRequest('/exercises', { body: jsonBody(payload), method: 'POST' }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['admin-exercises'] });
      push({ title: 'تمت إضافة التمرين', tone: 'success' });
    },
  });
  const update = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Record<string, unknown> }) =>
      apiRequest(`/exercises/${id}`, { body: jsonBody(payload), method: 'PATCH' }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['admin-exercises'] });
      setEditingExercise(null);
      setSelectedExercise(null);
      push({ title: 'تم تحديث التمرين', tone: 'success' });
    },
  });
  const remove = useMutation({
    mutationFn: (id: string) => apiRequest(`/exercises/${id}`, { method: 'DELETE' }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['admin-exercises'] });
      setDeletingExercise(null);
      setSelectedExercise(null);
      push({ title: 'تم حذف التمرين', tone: 'success' });
    },
  });
  const visibleExercises = useMemo(() => exercises.data?.items ?? [], [exercises.data?.items]);
  const exerciseGroups = useMemo(
    () =>
      Array.from(
        visibleExercises.reduce((groups, exercise) => {
          const day = exercise.trainingDay ?? 0;
          groups.set(day, [...(groups.get(day) ?? []), exercise]);
          return groups;
        }, new Map<number, AdminExercise[]>()),
      ).sort(([firstDay], [secondDay]) => firstDay - secondDay),
    [visibleExercises],
  );

  return (
    <div className="space-y-4">
      <PageHeader
        body="نظّم المكتبة حسب أيام التدريب: يوم للأرجل، يوم للصدر والترايسبس، ثم أضف تمارين كل يوم وفيديوهاتها."
        icon={Dumbbell}
        title="مكتبة التمارين"
      />
      <Card>
        <CardTitle>إدارة التمارين</CardTitle>
        <div className="mt-4 grid gap-3 lg:grid-cols-[1fr_0.8fr_0.65fr_auto]">
          <div className="relative">
            <Search className="pointer-events-none absolute end-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pe-10"
              onChange={(event) => {
                setExerciseQuery(event.target.value);
                setExercisePage(1);
              }}
              placeholder="بحث عن تمرين"
              value={exerciseQuery}
            />
          </div>
          <SelectField
            name="exerciseCategory"
            onChange={(event) => {
              setExerciseCategory(event.target.value);
              setExercisePage(1);
            }}
            value={exerciseCategory}
          >
            <option value="ALL">كل التصنيفات</option>
            {categories.data?.map((category) => (
              <option key={category.id} value={category.id}>
                {category.nameAr}
              </option>
            ))}
          </SelectField>
          <SelectField
            name="exerciseDay"
            onChange={(event) => {
              setExerciseDay(event.target.value);
              setExercisePage(1);
            }}
            value={exerciseDay}
          >
            <option value="ALL">كل الأيام</option>
            {Array.from({ length: 7 }, (_, index) => (
              <option key={index + 1} value={index + 1}>
                اليوم {index + 1}
              </option>
            ))}
          </SelectField>
          <div className="rounded-lg border border-border bg-muted/35 px-3 py-2 text-sm font-black text-muted-foreground">
            {exercises.data?.meta.total ?? 0} تمرين
          </div>
        </div>
        <form
          className="mt-4 grid gap-3 md:grid-cols-2"
          onSubmit={(event) => {
            event.preventDefault();
            create.mutate(objectFromForm(event.currentTarget));
          }}
        >
          <SelectField name="categoryId" required>
            {categories.data?.map((category) => (
              <option key={category.id} value={category.id}>
                {category.nameAr}
              </option>
            ))}
          </SelectField>
          <Input
            max={31}
            min={1}
            name="trainingDay"
            placeholder="رقم يوم التدريب، مثال: 1"
            required
            type="number"
          />
          <Input name="nameAr" placeholder="اسم التمرين" required />
          <Textarea className="md:col-span-2" name="instructionsAr" placeholder="التعليمات" />
          <Input className="md:col-span-2" name="videoUrl" placeholder="رابط الفيديو" />
          <Button className="md:col-span-2" isLoading={create.isPending} loadingText="جاري الإضافة">
            إضافة
          </Button>
        </form>
      </Card>
      <QueryState query={exercises}>
        {() => (
          <div className="space-y-4">
            {exerciseGroups.map(([day, dayExercises]) => {
              const focuses = Array.from(
                new Set(dayExercises.map((exercise) => exercise.category.nameAr)),
              ).join(' + ');
              return (
                <section
                  className="overflow-hidden rounded-lg border border-border bg-card shadow-sm"
                  key={day}
                >
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-black px-5 py-4 text-white">
                    <div className="flex items-center gap-3">
                      <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-accent font-black text-black">
                        {day || '-'}
                      </span>
                      <div>
                        <p className="font-black">
                          {day ? `اليوم ${day}` : 'تمارين غير موزعة على يوم'}
                        </p>
                        <p className="mt-1 text-xs font-bold text-white/60">
                          {focuses || 'بدون تصنيف'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-xs font-black text-white/70">
                      <CalendarDays className="h-4 w-4 text-brand-accent" />
                      {dayExercises.length} تمارين
                    </div>
                  </div>
                  <div className="grid gap-3 p-4 md:grid-cols-2 xl:grid-cols-3">
                    {dayExercises.map((exercise) => (
                      <Card className="border-border/70 bg-muted/20" key={exercise.id}>
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <Dumbbell className="h-5 w-5 text-green-700 dark:text-brand-accent" />
                            <p className="mt-3 font-black">{exercise.nameAr}</p>
                            <p className="mt-1 text-sm text-muted-foreground">
                              {exercise.category.nameAr}
                            </p>
                          </div>
                          <StatusBadge
                            status={exercise.isActive === false ? 'INACTIVE' : 'ACTIVE'}
                          />
                        </div>
                        <div className="mt-4 grid gap-2 sm:grid-cols-3">
                          <Button
                            className="gap-2"
                            onClick={() => setSelectedExercise(exercise)}
                            variant="secondary"
                          >
                            <Eye className="h-4 w-4" />
                            التفاصيل
                          </Button>
                          <Button
                            className="gap-2"
                            onClick={() => setEditingExercise(exercise)}
                            variant="secondary"
                          >
                            <Pencil className="h-4 w-4" />
                            تعديل
                          </Button>
                          <Button
                            className="gap-2"
                            onClick={() => setDeletingExercise(exercise)}
                            variant="danger"
                          >
                            <Trash2 className="h-4 w-4" />
                            حذف
                          </Button>
                        </div>
                      </Card>
                    ))}
                  </div>
                </section>
              );
            })}
            {!visibleExercises.length ? <EmptyState title="لا توجد تمارين مطابقة" /> : null}
          </div>
        )}
      </QueryState>
      {exercises.data ? (
        <Pagination meta={exercises.data.meta} onPageChange={setExercisePage} />
      ) : null}
      <Dialog
        description="تفاصيل التمرين كما ستظهر في المكتبة وخطط المدربين."
        onClose={() => setSelectedExercise(null)}
        open={Boolean(selectedExercise)}
        title={selectedExercise?.nameAr ?? 'تفاصيل التمرين'}
      >
        {selectedExercise ? (
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <DetailRow
                label="يوم التدريب"
                value={
                  selectedExercise.trainingDay
                    ? `اليوم ${selectedExercise.trainingDay}`
                    : 'غير موزع'
                }
              />
              <DetailRow label="التصنيف" value={selectedExercise.category.nameAr} />
              <DetailRow
                label="الحالة"
                value={
                  <StatusBadge
                    status={selectedExercise.isActive === false ? 'INACTIVE' : 'ACTIVE'}
                  />
                }
              />
              <DetailRow label="رابط الفيديو" value={selectedExercise.videoUrl ?? 'لا يوجد'} />
            </div>
            <DetailRow label="الوصف" value={selectedExercise.descriptionAr ?? 'لا يوجد'} />
            <DetailRow label="التعليمات" value={selectedExercise.instructionsAr ?? 'لا يوجد'} />
          </div>
        ) : null}
      </Dialog>
      <Dialog
        description="عدّل بيانات التمرين التي تظهر في مكتبة اللاعبين وخطط المدربين."
        onClose={() => setEditingExercise(null)}
        open={Boolean(editingExercise)}
        title={editingExercise ? `تعديل ${editingExercise.nameAr}` : 'تعديل التمرين'}
      >
        {editingExercise ? (
          <DialogForm
            actions={
              <>
                <DialogCancelButton onClick={() => setEditingExercise(null)} />
                <Button isLoading={update.isPending} loadingText="جاري الحفظ">
                  حفظ التعديل
                </Button>
              </>
            }
            onSubmit={(event) => {
              event.preventDefault();
              const form = objectFromForm(event.currentTarget);
              update.mutate({
                id: editingExercise.id,
                payload: {
                  categoryId: formText(form.categoryId),
                  descriptionAr: formText(form.descriptionAr),
                  instructionsAr: formText(form.instructionsAr),
                  isActive: formText(form.isActive) === 'true',
                  nameAr: formText(form.nameAr),
                  nameEn: formText(form.nameEn),
                  trainingDay: Number(form.trainingDay),
                  videoUrl: formText(form.videoUrl),
                },
              });
            }}
          >
            <SelectField defaultValue={editingExercise.category.id} name="categoryId" required>
              {categories.data?.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.nameAr}
                </option>
              ))}
            </SelectField>
            <SelectField
              defaultValue={String(editingExercise.isActive !== false)}
              name="isActive"
              required
            >
              <option value="true">نشط</option>
              <option value="false">مخفي</option>
            </SelectField>
            <Input
              defaultValue={editingExercise.trainingDay ?? 1}
              max={31}
              min={1}
              name="trainingDay"
              placeholder="رقم يوم التدريب"
              required
              type="number"
            />
            <Input
              defaultValue={editingExercise.nameAr}
              name="nameAr"
              placeholder="اسم التمرين"
              required
            />
            <Input
              defaultValue={editingExercise.nameEn ?? ''}
              name="nameEn"
              placeholder="الاسم الإنجليزي"
            />
            <Textarea
              defaultValue={editingExercise.descriptionAr ?? ''}
              name="descriptionAr"
              placeholder="الوصف"
            />
            <Textarea
              defaultValue={editingExercise.instructionsAr ?? ''}
              name="instructionsAr"
              placeholder="التعليمات"
            />
            <Input
              defaultValue={editingExercise.videoUrl ?? ''}
              name="videoUrl"
              placeholder="رابط الفيديو"
            />
          </DialogForm>
        ) : null}
      </Dialog>
      <Dialog
        description="سيتم حذف التمرين من المكتبة. الخطط القديمة ستحتفظ باسم التمرين التاريخي إذا كان محفوظاً داخل الخطة."
        onClose={() => setDeletingExercise(null)}
        open={Boolean(deletingExercise)}
        title="حذف التمرين"
      >
        {deletingExercise ? (
          <div className="space-y-4">
            <DetailRow label="التمرين" value={deletingExercise.nameAr} />
            <div className="flex flex-wrap justify-end gap-2">
              <DialogCancelButton onClick={() => setDeletingExercise(null)} />
              <Button
                isLoading={remove.isPending}
                loadingText="جاري الحذف"
                onClick={() => remove.mutate(deletingExercise.id)}
                variant="danger"
              >
                حذف نهائي
              </Button>
            </div>
          </div>
        ) : null}
      </Dialog>
    </div>
  );
}

export function AdminObserversPage() {
  const queryClient = useQueryClient();
  const { push } = useToast();
  const [observerQuery, setObserverQuery] = useState('');
  const deferredObserverQuery = useDeferredValue(observerQuery);
  const [observerPage, setObserverPage] = useState(1);
  const [creatingObserver, setCreatingObserver] = useState(false);
  const [selectedObserver, setSelectedObserver] = useState<ShiftObserver | null>(null);
  const [editingObserver, setEditingObserver] = useState<ShiftObserver | null>(null);
  const [deletingObserver, setDeletingObserver] = useState<ShiftObserver | null>(null);
  const observers = useQuery({
    queryFn: () =>
      apiRequest<PaginatedResponse<ShiftObserver>>(
        pagedPath('/admin/observers', {
          page: observerPage,
          pageSize: ADMIN_PAGE_SIZE,
          q: deferredObserverQuery,
        }),
      ),
    queryKey: ['shift-observers', deferredObserverQuery, observerPage],
  });
  const activity = useQuery({
    enabled: Boolean(selectedObserver),
    queryFn: () =>
      apiRequest<ShiftObserver & { membershipAuditLogs: MembershipAuditItem[] }>(
        `/admin/observers/${selectedObserver?.id}/activity`,
      ),
    queryKey: ['shift-observer-activity', selectedObserver?.id],
  });
  const status = useMutation({
    mutationFn: ({ action, id }: { action: 'activate' | 'deactivate'; id: string }) =>
      apiRequest(`/admin/observers/${id}/${action}`, { body: jsonBody({}), method: 'PATCH' }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['shift-observers'] });
      push({ title: 'تم تحديث حالة المراقب', tone: 'success' });
    },
  });
  const createObserver = useMutation({
    mutationFn: (payload: Record<string, string>) =>
      apiRequest('/admin/observers', {
        body: jsonBody(payload),
        method: 'POST',
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['shift-observers'] });
      setCreatingObserver(false);
      push({ title: 'تم إنشاء حساب المراقب', tone: 'success' });
    },
  });
  const updateObserver = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Record<string, string> }) =>
      apiRequest(`/admin/observers/${id}`, { body: jsonBody(payload), method: 'PATCH' }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['shift-observers'] });
      setEditingObserver(null);
      setSelectedObserver(null);
      push({ title: 'تم تعديل بيانات المراقب', tone: 'success' });
    },
  });
  const deleteObserver = useMutation({
    mutationFn: (id: string) => apiRequest(`/admin/observers/${id}`, { method: 'DELETE' }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['shift-observers'] });
      setDeletingObserver(null);
      setSelectedObserver(null);
      push({ title: 'تم حذف المراقب', tone: 'success' });
    },
  });

  return (
    <div className="space-y-4">
      <PageHeader
        body="لكل وردية حساب مراقب مستقل بصلاحيات تشغيلية محددة. كل تسجيل دخول أو تعديل أو اعتماد يُحفظ باسم صاحب الحساب ليتمكن المالك من مراجعة النشاط بالكامل."
        icon={ClipboardList}
        title="حسابات المراقبين والورديات"
      />
      <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <Card>
          <CardTitle>إدارة حسابات مراقبي الفرع</CardTitle>
          <div className="mt-4 space-y-3 text-sm font-bold leading-7 text-muted-foreground">
            <p>الوردية الأولى: من 7:00 AM حتى 2:00 PM</p>
            <p>الوردية الثانية: من 2:00 PM حتى 7:00 PM</p>
            <p>الوردية الثالثة: من 7:00 PM حتى 12:00 AM</p>
          </div>
          <p className="mt-4 rounded-lg border border-brand-accent/30 bg-brand-accent/10 p-3 text-xs font-black leading-6 text-foreground">
            يستطيع المالك إنشاء الحسابات وتعديل أسماء الدخول والورديات وتغيير كلمات المرور أو حذف
            الحساب نهائياً. لا تُعرض كلمة المرور القديمة بعد حفظها.
          </p>
          <Button className="mt-4 w-full" onClick={() => setCreatingObserver(true)}>
            <UserCheck className="h-4 w-4" />
            إضافة حساب مراقب
          </Button>
        </Card>
        <Card>
          <CardTitle>بحث سريع</CardTitle>
          <div className="relative mt-4">
            <Search className="pointer-events-none absolute end-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pe-10"
              onChange={(event) => {
                setObserverQuery(event.target.value);
                setObserverPage(1);
              }}
              placeholder="بحث باسم المراقب أو الهاتف"
              value={observerQuery}
            />
          </div>
          <p className="mt-4 text-sm font-semibold text-muted-foreground">
            اختر مراقباً من القائمة لمراجعة نشاطه في تعديلات الاشتراكات.
          </p>
        </Card>
      </div>
      <QueryState query={observers}>
        {(page) => (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {page.items.map((observer) => (
              <Card className="transition hover:border-brand-accent/45" key={observer.id}>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-black text-foreground">{observer.fullName}</p>
                    <p className="mt-1 text-sm font-semibold text-muted-foreground">
                      {observer.phone ?? 'لا يوجد هاتف'}
                    </p>
                    {observer.user ? (
                      <>
                        <p className="mt-2 text-sm font-black text-foreground" dir="ltr">
                          @{observer.user.username}
                        </p>
                        <p className="mt-1 text-xs font-bold text-green-700 dark:text-brand-accent">
                          الوردية: {formatShiftTime(observer.shiftStart)} —{' '}
                          {formatShiftTime(observer.shiftEnd)}
                        </p>
                        <p className="mt-1 text-xs font-semibold text-muted-foreground">
                          آخر دخول:{' '}
                          {observer.user.lastLoginAt
                            ? formatCompactDateTime(observer.user.lastLoginAt)
                            : 'لم يسجل الدخول بعد'}
                        </p>
                      </>
                    ) : null}
                    <p className="mt-3 text-xs font-bold text-muted-foreground">
                      {observer._count?.membershipAuditLogs ?? 0} عملية مسجلة
                    </p>
                  </div>
                  <StatusBadge status={observer.status} />
                </div>
                <div className="mt-5 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                  <Button onClick={() => setSelectedObserver(observer)} variant="secondary">
                    التفاصيل
                  </Button>
                  <Button onClick={() => setEditingObserver(observer)} variant="secondary">
                    تعديل
                  </Button>
                  <Button
                    disabled={status.isPending}
                    isLoading={status.isPending && status.variables?.id === observer.id}
                    onClick={() =>
                      status.mutate({
                        action: observer.status === 'ACTIVE' ? 'deactivate' : 'activate',
                        id: observer.id,
                      })
                    }
                    variant={observer.status === 'ACTIVE' ? 'danger' : 'secondary'}
                  >
                    {observer.status === 'ACTIVE' ? 'تعطيل' : 'تفعيل'}
                  </Button>
                  <Button onClick={() => setDeletingObserver(observer)} variant="danger">
                    حذف
                  </Button>
                </div>
              </Card>
            ))}
            {!page.items.length ? <EmptyState title="لا يوجد مراقبين بعد" /> : null}
          </div>
        )}
      </QueryState>
      {observers.data ? (
        <Pagination meta={observers.data.meta} onPageChange={setObserverPage} />
      ) : null}
      <Dialog
        description="أنشئ حساب دخول مستقل لمراقب هذا الفرع وحدد ورديته. يمكن تعديله أو حذفه لاحقاً من نفس الصفحة."
        onClose={() => setCreatingObserver(false)}
        open={creatingObserver}
        title="إضافة حساب مراقب"
      >
        <DialogForm
          actions={
            <>
              <DialogCancelButton onClick={() => setCreatingObserver(false)} />
              <Button isLoading={createObserver.isPending} loadingText="جاري إنشاء الحساب">
                إنشاء الحساب
              </Button>
            </>
          }
          onSubmit={(event) => {
            event.preventDefault();
            const form = objectFromForm(event.currentTarget);
            const shiftParts = formText(form.shiftPreset).split('|');
            const shiftStart = shiftParts[0] ?? '07:00';
            const shiftEnd = shiftParts[1] ?? '14:00';
            createObserver.mutate({
              fullName: formText(form.fullName),
              notes: formText(form.notes),
              password: formText(form.password),
              phone: formText(form.phone),
              shiftEnd,
              shiftStart,
              username: formText(form.username),
            });
          }}
        >
          <Input name="fullName" placeholder="اسم المراقب" required />
          <Input dir="ltr" name="username" placeholder="اسم المستخدم" required />
          <Input
            autoComplete="new-password"
            dir="ltr"
            minLength={8}
            name="password"
            placeholder="كلمة مرور قوية"
            required
            type="password"
          />
          <Input dir="ltr" name="phone" placeholder="رقم الهاتف" required />
          <SelectField defaultValue="07:00|14:00" name="shiftPreset" required>
            <option value="07:00|14:00">7:00 AM — 2:00 PM</option>
            <option value="14:00|19:00">2:00 PM — 7:00 PM</option>
            <option value="19:00|00:00">7:00 PM — 12:00 AM</option>
          </SelectField>
          <Textarea name="notes" placeholder="ملاحظات اختيارية" />
        </DialogForm>
      </Dialog>
      <Dialog
        description="نشاط المراقب يظهر للمالك لمعرفة من كان على الشفت عند كل تعديل."
        onClose={() => setSelectedObserver(null)}
        open={Boolean(selectedObserver)}
        title={selectedObserver?.fullName ?? 'تفاصيل المراقب'}
      >
        {selectedObserver ? (
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <DetailRow
                label="اسم المستخدم"
                value={selectedObserver.user?.username ? `@${selectedObserver.user.username}` : '-'}
              />
              <DetailRow label="الهاتف" value={selectedObserver.phone ?? 'لا يوجد'} />
              <DetailRow label="الحالة" value={<StatusBadge status={selectedObserver.status} />} />
              <DetailRow
                label="الوردية"
                value={`${formatShiftTime(selectedObserver.shiftStart)} — ${formatShiftTime(selectedObserver.shiftEnd)}`}
              />
              <DetailRow label="ملاحظات" value={selectedObserver.notes ?? 'لا يوجد'} />
              <DetailRow
                label="آخر تحديث"
                value={formatCompactDateTime(selectedObserver.updatedAt)}
              />
            </div>
            <Card>
              <CardTitle>نشاط الاشتراكات</CardTitle>
              <QueryState query={activity}>
                {(data) => (
                  <div className="mt-4 grid gap-3">
                    {data.membershipAuditLogs.map((item) => (
                      <div
                        className="rounded-lg border border-border bg-muted/35 p-3"
                        key={item.id}
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="font-black text-foreground">
                            {actionLabel(item.action)} - {item.member.user.fullName}
                          </p>
                          <span className="text-xs font-bold text-muted-foreground">
                            {formatCompactDateTime(item.createdAt)}
                          </span>
                        </div>
                        <p className="mt-2 text-sm font-semibold text-muted-foreground">
                          السبب: {item.reason}
                        </p>
                      </div>
                    ))}
                    {!data.membershipAuditLogs.length ? (
                      <EmptyState title="لا يوجد نشاط لهذا المراقب بعد" />
                    ) : null}
                  </div>
                )}
              </QueryState>
            </Card>
          </div>
        ) : null}
      </Dialog>
      <Dialog
        description="عدّل بيانات الحساب والوردية. اترك كلمة المرور الجديدة فارغة إذا لم ترغب بتغييرها."
        onClose={() => setEditingObserver(null)}
        open={Boolean(editingObserver)}
        title={editingObserver ? `تعديل ${editingObserver.fullName}` : 'تعديل المراقب'}
      >
        {editingObserver ? (
          <DialogForm
            actions={
              <>
                <DialogCancelButton onClick={() => setEditingObserver(null)} />
                <Button isLoading={updateObserver.isPending} loadingText="جاري الحفظ">
                  حفظ التعديل
                </Button>
              </>
            }
            onSubmit={(event) => {
              event.preventDefault();
              const form = objectFromForm(event.currentTarget);
              const shiftParts = formText(form.shiftPreset).split('|');
              const shiftStart = shiftParts[0] ?? '07:00';
              const shiftEnd = shiftParts[1] ?? '14:00';
              const newPassword = formText(form.newPassword);
              updateObserver.mutate({
                id: editingObserver.id,
                payload: {
                  fullName: formText(form.fullName),
                  notes: formText(form.notes),
                  phone: formText(form.phone),
                  shiftEnd,
                  shiftStart,
                  username: formText(form.username),
                  ...(newPassword ? { newPassword } : {}),
                },
              });
            }}
          >
            <Input
              defaultValue={editingObserver.fullName}
              name="fullName"
              placeholder="اسم المراقب"
              required
            />
            <Input defaultValue={editingObserver.phone ?? ''} name="phone" placeholder="الهاتف" />
            <Input
              defaultValue={editingObserver.user?.username ?? ''}
              dir="ltr"
              name="username"
              placeholder="اسم المستخدم"
              required={Boolean(editingObserver.userId)}
            />
            <Input
              autoComplete="new-password"
              dir="ltr"
              minLength={8}
              name="newPassword"
              placeholder="كلمة مرور جديدة (اختياري)"
              type="password"
            />
            <SelectField
              defaultValue={`${editingObserver.shiftStart ?? '07:00'}|${editingObserver.shiftEnd ?? '14:00'}`}
              name="shiftPreset"
              required
            >
              <option value="07:00|14:00">7:00 AM — 2:00 PM</option>
              <option value="14:00|19:00">2:00 PM — 7:00 PM</option>
              <option value="19:00|00:00">7:00 PM — 12:00 AM</option>
            </SelectField>
            <Textarea
              defaultValue={editingObserver.notes ?? ''}
              name="notes"
              placeholder="ملاحظات أو الشفت المعتاد"
            />
          </DialogForm>
        ) : null}
      </Dialog>
      <Dialog
        description="سيتم حذف حساب الدخول وإغلاق جلساته وإخفاؤه من الإدارة. سيبقى اسمه محفوظاً فقط داخل سجلات التدقيق القديمة."
        onClose={() => setDeletingObserver(null)}
        open={Boolean(deletingObserver)}
        title="حذف المراقب"
      >
        {deletingObserver ? (
          <div className="space-y-4">
            <DetailRow label="المراقب" value={deletingObserver.fullName} />
            <DetailRow
              label="عمليات مسجلة"
              value={deletingObserver._count?.membershipAuditLogs ?? 0}
            />
            <div className="flex flex-wrap justify-end gap-2">
              <DialogCancelButton onClick={() => setDeletingObserver(null)} />
              <Button
                isLoading={deleteObserver.isPending}
                loadingText="جاري الحذف"
                onClick={() => deleteObserver.mutate(deletingObserver.id)}
                variant="danger"
              >
                حذف الحساب نهائياً
              </Button>
            </div>
          </div>
        ) : null}
      </Dialog>
    </div>
  );
}

export function AdminPhotosPage() {
  return (
    <Card className="text-center">
      <CardTitle>صور التقدم مخفية عن الإدارة</CardTitle>
      <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-muted-foreground">
        حسب قرار الخصوصية الحالي، صور التقدم تظهر فقط للاعب نفسه وللمدرب المسؤول عنه. الإدارة تتابع
        الأداء من الإحصائيات والاشتراكات والحضور بدون فتح الصور الخاصة.
      </p>
    </Card>
  );
}

function MembershipAuditHistory() {
  const [auditQuery, setAuditQuery] = useState('');
  const deferredAuditQuery = useDeferredValue(auditQuery);
  const [auditPage, setAuditPage] = useState(1);
  const [auditAction, setAuditAction] = useState('ALL');
  const [selectedAudit, setSelectedAudit] = useState<MembershipAuditItem | null>(null);
  const audit = useQuery({
    queryFn: () =>
      apiRequest<PaginatedResponse<MembershipAuditItem>>(
        pagedPath('/memberships/audit', {
          action: auditAction,
          page: auditPage,
          pageSize: ADMIN_PAGE_SIZE,
          q: deferredAuditQuery,
        }),
      ),
    queryKey: ['membership-audit', auditAction, auditPage, deferredAuditQuery],
  });
  const visibleAudit = audit.data?.items ?? [];
  const actionOptions = [
    'CREATE',
    'ADD_DAYS',
    'REMOVE_DAYS',
    'FREEZE',
    'RESUME',
    'RENEW',
    'EXPIRE',
  ];

  return (
    <div className="space-y-4">
      <Card>
        <div className="grid gap-3 lg:grid-cols-[1fr_0.7fr_auto] lg:items-center">
          <div className="relative">
            <Search className="pointer-events-none absolute end-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pe-10"
              onChange={(event) => {
                setAuditQuery(event.target.value);
                setAuditPage(1);
              }}
              placeholder="بحث باسم اللاعب، المسؤول، أو سبب التعديل"
              value={auditQuery}
            />
          </div>
          <SelectField
            name="auditAction"
            onChange={(event) => {
              setAuditAction(event.target.value);
              setAuditPage(1);
            }}
            value={auditAction}
          >
            <option value="ALL">كل العمليات</option>
            {actionOptions.map((action) => (
              <option key={action} value={action}>
                {actionLabel(action)}
              </option>
            ))}
          </SelectField>
          <div className="rounded-lg border border-border bg-muted/35 px-3 py-2 text-sm font-black text-muted-foreground">
            {audit.data?.meta.total ?? 0} عملية
          </div>
        </div>
      </Card>
      <QueryState query={audit}>
        {() => (
          <div className="grid gap-3">
            {visibleAudit.map((item) => (
              <Card className="transition hover:border-brand-accent/45" key={item.id}>
                <div className="grid gap-3 lg:grid-cols-[1fr_auto] lg:items-start">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-foreground px-3 py-1 text-xs font-black text-background">
                        {actionLabel(item.action)}
                      </span>
                      <span className="font-black text-foreground">
                        {item.member.user.fullName}
                      </span>
                      <span className="text-sm font-bold text-muted-foreground">
                        بواسطة {item.adminName}
                      </span>
                      <span className="text-sm font-bold text-muted-foreground">
                        المراقب: {item.observerName ?? item.observer?.fullName ?? 'غير محدد'}
                      </span>
                    </div>
                    <p className="mt-3 rounded-lg border border-amber-300/45 bg-amber-100/55 p-3 text-sm font-bold leading-7 text-amber-950 dark:bg-amber-400/10 dark:text-amber-200">
                      السبب: {item.reason}
                    </p>
                    <p className="mt-2 text-xs font-semibold text-muted-foreground">
                      {formatCompactDateTime(item.createdAt)}
                    </p>
                  </div>
                  <Button
                    className="gap-2"
                    onClick={() => setSelectedAudit(item)}
                    variant="secondary"
                  >
                    <Eye className="h-4 w-4" />
                    التفاصيل
                  </Button>
                </div>
              </Card>
            ))}
            {!visibleAudit.length ? <EmptyState title="لا توجد عمليات مطابقة" /> : null}
          </div>
        )}
      </QueryState>
      {audit.data ? <Pagination meta={audit.data.meta} onPageChange={setAuditPage} /> : null}
      <Dialog
        description="القيم السابقة والجديدة محفوظة حتى يعرف المالك ماذا تغير ولماذا."
        onClose={() => setSelectedAudit(null)}
        open={Boolean(selectedAudit)}
        title={selectedAudit ? actionLabel(selectedAudit.action) : 'تفاصيل التدقيق'}
      >
        {selectedAudit ? (
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <DetailRow label="اللاعب" value={selectedAudit.member.user.fullName} />
              <DetailRow label="المسؤول" value={selectedAudit.adminName} />
              <DetailRow
                label="مراقب الشفت"
                value={selectedAudit.observerName ?? selectedAudit.observer?.fullName ?? 'غير محدد'}
              />
              <DetailRow label="التاريخ" value={formatCompactDateTime(selectedAudit.createdAt)} />
              <DetailRow label="السبب" value={selectedAudit.reason} />
            </div>
            <div className="grid gap-4 lg:grid-cols-2">
              <Card>
                <CardTitle>قبل التعديل</CardTitle>
                <div className="mt-4">
                  <JsonPreview value={selectedAudit.previousValue} />
                </div>
              </Card>
              <Card>
                <CardTitle>بعد التعديل</CardTitle>
                <div className="mt-4">
                  <JsonPreview value={selectedAudit.newValue} />
                </div>
              </Card>
            </div>
          </div>
        ) : null}
      </Dialog>
    </div>
  );
}

function generalAuditActionLabel(action: string) {
  return (
    {
      ATTENDANCE: 'تسجيل أو تعديل حضور',
      CREATE: 'إنشاء',
      DELETE: 'حذف',
      LOGIN: 'تسجيل دخول',
      LOGOUT: 'تسجيل خروج',
      MEMBERSHIP_CHANGE: 'تعديل اشتراك',
      PASSWORD_RESET: 'إعادة تعيين كلمة مرور',
      PAYMENT: 'عملية دفع',
      QR_SCAN: 'مسح QR',
      ROLE_CHANGE: 'تغيير صلاحية',
      UPDATE: 'تعديل',
    }[action] ?? action
  );
}

export function AdminAuditPage() {
  const [auditQuery, setAuditQuery] = useState('');
  const deferredAuditQuery = useDeferredValue(auditQuery);
  const [auditPage, setAuditPage] = useState(1);
  const [auditAction, setAuditAction] = useState('ALL');
  const [actorRole, setActorRole] = useState('ALL');
  const [selectedAudit, setSelectedAudit] = useState<GeneralAuditItem | null>(null);
  const [showMembershipHistory, setShowMembershipHistory] = useState(false);
  const audit = useQuery({
    queryFn: () =>
      apiRequest<PaginatedResponse<GeneralAuditItem>>(
        pagedPath('/admin/audit-log', {
          action: auditAction,
          page: auditPage,
          pageSize: ADMIN_PAGE_SIZE,
          q: deferredAuditQuery,
          status: actorRole,
        }),
      ),
    queryKey: ['general-audit', actorRole, auditAction, auditPage, deferredAuditQuery],
  });

  return (
    <div className="space-y-4">
      <PageHeader
        body="يسجل النظام اسم الحساب الذي نفذ كل عملية ووقتها وتفاصيلها. استخدم فلتر المراقبين لمراجعة أعمال كل وردية بشكل مباشر."
        icon={ShieldAlert}
        title="سجل نشاط الإدارة والمراقبين"
      />
      <Card>
        <div className="grid gap-3 lg:grid-cols-[1fr_0.65fr_0.65fr_auto] lg:items-center">
          <div className="relative">
            <Search className="pointer-events-none absolute end-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pe-10"
              onChange={(event) => {
                setAuditQuery(event.target.value);
                setAuditPage(1);
              }}
              placeholder="ابحث باسم المسؤول أو نوع العملية"
              value={auditQuery}
            />
          </div>
          <SelectField
            name="auditActorRole"
            onChange={(event) => {
              setActorRole(event.target.value);
              setAuditPage(1);
            }}
            value={actorRole}
          >
            <option value="ALL">كل الحسابات</option>
            <option value="OBSERVER">المراقبون فقط</option>
            <option value="ADMIN">المالك فقط</option>
          </SelectField>
          <SelectField
            name="generalAuditAction"
            onChange={(event) => {
              setAuditAction(event.target.value);
              setAuditPage(1);
            }}
            value={auditAction}
          >
            <option value="ALL">كل العمليات</option>
            {[
              'LOGIN',
              'LOGOUT',
              'CREATE',
              'UPDATE',
              'DELETE',
              'ATTENDANCE',
              'MEMBERSHIP_CHANGE',
              'PASSWORD_RESET',
              'ROLE_CHANGE',
            ].map((action) => (
              <option key={action} value={action}>
                {generalAuditActionLabel(action)}
              </option>
            ))}
          </SelectField>
          <div className="rounded-lg border border-border bg-muted/35 px-3 py-2 text-sm font-black text-muted-foreground">
            {audit.data?.meta.total ?? 0} عملية
          </div>
        </div>
      </Card>

      <QueryState query={audit}>
        {(page) => (
          <div className="grid gap-3">
            {page.items.map((item) => (
              <Card className="transition hover:border-brand-accent/45" key={item.id}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-foreground px-3 py-1 text-xs font-black text-background">
                        {generalAuditActionLabel(item.action)}
                      </span>
                      <span className="font-black">
                        {item.actor?.fullName ?? 'عملية آلية من النظام'}
                      </span>
                      {item.actor ? <StatusBadge status={item.actor.role} /> : null}
                    </div>
                    <p className="mt-3 text-sm font-bold text-muted-foreground">
                      {item.entityType}
                      {item.actor?.username ? ` · @${item.actor.username}` : ''}
                    </p>
                    <p className="mt-1 text-xs font-semibold text-muted-foreground">
                      {formatCompactDateTime(item.createdAt)}
                    </p>
                  </div>
                  <Button onClick={() => setSelectedAudit(item)} variant="secondary">
                    <Eye className="h-4 w-4" />
                    التفاصيل
                  </Button>
                </div>
              </Card>
            ))}
            {!page.items.length ? <EmptyState title="لا توجد عمليات مطابقة" /> : null}
          </div>
        )}
      </QueryState>
      {audit.data ? <Pagination meta={audit.data.meta} onPageChange={setAuditPage} /> : null}

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle>السجل التفصيلي لتعديلات الاشتراكات</CardTitle>
            <p className="mt-2 text-sm font-semibold text-muted-foreground">
              يعرض القيم قبل وبعد التعديل والسبب ومراقب الوردية.
            </p>
          </div>
          <Button onClick={() => setShowMembershipHistory((value) => !value)} variant="secondary">
            {showMembershipHistory ? 'إخفاء السجل التفصيلي' : 'فتح السجل التفصيلي'}
          </Button>
        </div>
      </Card>
      {showMembershipHistory ? <MembershipAuditHistory /> : null}

      <Dialog
        description="التفاصيل الفنية المحفوظة مع العملية لمساعدة المالك في مراجعة ما حدث."
        onClose={() => setSelectedAudit(null)}
        open={Boolean(selectedAudit)}
        title={selectedAudit ? generalAuditActionLabel(selectedAudit.action) : 'تفاصيل العملية'}
      >
        {selectedAudit ? (
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <DetailRow
                label="المسؤول"
                value={selectedAudit.actor?.fullName ?? 'عملية آلية من النظام'}
              />
              <DetailRow label="اسم المستخدم" value={selectedAudit.actor?.username ?? '—'} />
              <DetailRow label="نوع العنصر" value={selectedAudit.entityType} />
              <DetailRow label="التاريخ" value={formatCompactDateTime(selectedAudit.createdAt)} />
            </div>
            <Card>
              <CardTitle>بيانات العملية</CardTitle>
              <div className="mt-4">
                <JsonPreview
                  value={selectedAudit.metadata ?? { message: 'لا توجد بيانات إضافية' }}
                />
              </div>
            </Card>
          </div>
        ) : null}
      </Dialog>
    </div>
  );
}
