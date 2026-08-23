'use client';

import {
  Activity,
  Archive,
  Bell,
  BellRing,
  Building2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Dumbbell,
  FileText,
  Gauge,
  Home,
  LineChart,
  Loader2,
  LockKeyhole,
  LogOut,
  Menu,
  NotebookText,
  Shield,
  Sparkles,
  UserCog,
  UserRoundCheck,
  Users,
  WalletCards,
  X,
  type LucideIcon,
} from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'framer-motion';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { PublicLocale } from '@progym/shared';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog, DialogCancelButton } from '@/components/ui/dialog';
import type { PaginatedResponse } from '@/components/ui/pagination';
import { DashboardLoader, ErrorState } from '@/components/ui/state';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { apiRequest, jsonBody } from '@/lib/api/client';
import { brand } from '@/lib/public/content';
import { useAuth, type SessionUser } from '@/lib/auth/use-auth';
import { cn, formatCompactDateTime, formatShiftTime } from '@/lib/utils';
import { ReceptionEventCenter } from '@/features/admin/reception-event-center';
import { MemberLocaleProvider } from '@/features/member/member-locale';

type NavItem = {
  badgeKey?: AdminSidebarBadgeKey;
  href: string;
  icon: LucideIcon;
  label: string;
};

type AdminSidebarBadgeKey = 'attendance' | 'members' | 'registrations';

type AdminSidebarBadgeSource = {
  attendance: Array<{ checkedInAt: string }>;
  members: Array<{ createdAt?: string; joinedAt?: string }>;
  profileChanges: Array<{ createdAt: string; status: string }>;
  registrations: Array<{ createdAt: string }>;
};

const navItems: Record<SessionUser['role'], NavItem[]> = {
  ADMIN: [
    { href: '/ar/dashboard/admin', icon: Gauge, label: 'لوحة التحكم' },
    { badgeKey: 'members', href: '/ar/dashboard/admin/members', icon: Users, label: 'الأعضاء' },
    {
      badgeKey: 'registrations',
      href: '/ar/dashboard/admin/registrations',
      icon: UserRoundCheck,
      label: 'طلبات التسجيل',
    },
    { href: '/ar/dashboard/admin/coaches', icon: UserCog, label: 'المدربون' },
    { href: '/ar/dashboard/admin/memberships', icon: WalletCards, label: 'الاشتراكات' },
    { href: '/ar/dashboard/admin/reports', icon: FileText, label: 'التقارير' },
    { href: '/ar/dashboard/admin/observers', icon: ClipboardList, label: 'المراقبون' },
    {
      badgeKey: 'attendance',
      href: '/ar/dashboard/admin/attendance',
      icon: Activity,
      label: 'الحضور',
    },
    { href: '/ar/dashboard/admin/exercises', icon: Dumbbell, label: 'التمارين' },
    { href: '/ar/dashboard/admin/audit', icon: Shield, label: 'التدقيق' },
  ],
  OBSERVER: [
    { href: '/ar/dashboard/admin', icon: Gauge, label: 'لوحة التشغيل' },
    { badgeKey: 'members', href: '/ar/dashboard/admin/members', icon: Users, label: 'الأعضاء' },
    {
      badgeKey: 'registrations',
      href: '/ar/dashboard/admin/registrations',
      icon: UserRoundCheck,
      label: 'طلبات التسجيل',
    },
    { href: '/ar/dashboard/admin/memberships', icon: WalletCards, label: 'الاشتراكات' },
    { href: '/ar/dashboard/admin/coaches', icon: UserCog, label: 'المدربون' },
    {
      badgeKey: 'attendance',
      href: '/ar/dashboard/admin/attendance',
      icon: Activity,
      label: 'الحضور',
    },
    { href: '/ar/dashboard/admin/exercises', icon: Dumbbell, label: 'التمارين' },
  ],
  COACH: [
    { href: '/ar/dashboard/coach', icon: Gauge, label: 'لوحة المدرب' },
    { href: '/ar/dashboard/coach/clients', icon: Users, label: 'العملاء' },
    { href: '/ar/dashboard/coach/archive', icon: Archive, label: 'أرشيف الاشتراكات' },
    { href: '/ar/dashboard/coach/plans', icon: NotebookText, label: 'برامج اللاعبين' },
    { href: '/ar/dashboard/coach/account', icon: UserCog, label: 'حسابي' },
  ],
  MEMBER: [
    { href: '/ar/dashboard/member', icon: Home, label: 'ملخصي' },
    { href: '/ar/dashboard/member/profile', icon: UserCog, label: 'الملف الشخصي' },
    { href: '/ar/dashboard/member/progress', icon: LineChart, label: 'التقدم' },
    { href: '/ar/dashboard/member/attendance', icon: Activity, label: 'الحضور' },
    {
      href: '/ar/dashboard/member/memberships',
      icon: WalletCards,
      label: 'سجل الاشتراكات',
    },
    { href: '/ar/dashboard/member/workouts', icon: Dumbbell, label: 'التمارين' },
    { href: '/ar/dashboard/member/nutrition', icon: NotebookText, label: 'التغذية' },
    { href: '/ar/dashboard/member/requests', icon: Bell, label: 'الطلبات' },
    { href: '/ar/dashboard/member/calculators', icon: Sparkles, label: 'الحاسبات' },
  ],
};

const roleLabel: Record<SessionUser['role'], string> = {
  ADMIN: 'مدير النظام',
  COACH: 'مدرب',
  MEMBER: 'عضو',
  OBSERVER: 'مراقب الوردية',
};

const dashboardBranchLabels: Record<string, string> = {
  b1: 'الإنشاءات مقابل الفرن الآلي',
  b2: 'جورة الشياح مقابل المشفى الوطني',
  b3: 'بروجيم 8 آذار',
};

const memberNavEnglish = [
  'Overview',
  'Profile',
  'Progress',
  'Attendance',
  'Membership history',
  'Workouts',
  'Nutrition',
  'Requests',
  'Calculators',
] as const;

function dashboardBranchCode(pathname: string): string | null {
  return (
    pathname.match(/\/dashboard\/admin\/(b[1-9][a-z0-9-]*)(?:\/|$)/i)?.[1]?.toLowerCase() ?? null
  );
}

function localizedNavItems(
  role: SessionUser['role'],
  locale: PublicLocale,
  branchCode?: string | null,
): NavItem[] {
  if (role === 'ADMIN' || role === 'OBSERVER') {
    const source = navItems[role];
    if (!branchCode) return source.slice(0, 1);
    return source.map((item) => ({
      ...item,
      href: item.href.replace('/dashboard/admin', `/dashboard/admin/${branchCode}`),
    }));
  }
  if (role !== 'MEMBER' || locale === 'ar') return navItems[role];

  return navItems.MEMBER.map((item, index) => ({
    ...item,
    href: item.href.replace('/ar/', '/en/'),
    label: memberNavEnglish[index] ?? item.label,
  }));
}

function localizedRoleLabel(role: SessionUser['role'], locale: PublicLocale): string {
  if (locale === 'en' && role === 'MEMBER') return 'Player';
  return roleLabel[role];
}

function homeForRole(role: SessionUser['role'], locale: PublicLocale = 'ar'): string {
  if (role === 'ADMIN' || role === 'OBSERVER') return '/ar/dashboard/admin';
  if (role === 'COACH') return '/ar/dashboard/coach';
  return `/${locale}/dashboard/member`;
}

const ADMIN_SIDEBAR_SEEN_KEY = 'progym-admin-sidebar-seen-at';

function defaultAdminSidebarSeenAt(): Record<AdminSidebarBadgeKey, string> {
  const now = new Date().toISOString();
  return { attendance: now, members: now, registrations: now };
}

function adminBadgeKeyForPath(pathname: string): AdminSidebarBadgeKey | null {
  const path = pathname
    .replace(/^\/(ar|en)/, '')
    .replace(/\/dashboard\/admin\/b[1-9][a-z0-9-]*/i, '/dashboard/admin');
  if (path === '/dashboard/admin/members') return 'members';
  if (path === '/dashboard/admin/registrations') return 'registrations';
  if (path === '/dashboard/admin/attendance') return 'attendance';
  return null;
}

function adminSidebarSeenStorageKey(branchCode?: string | null): string {
  return branchCode ? `${ADMIN_SIDEBAR_SEEN_KEY}:${branchCode}` : ADMIN_SIDEBAR_SEEN_KEY;
}

function readAdminSidebarSeenAt(branchCode?: string | null): Record<AdminSidebarBadgeKey, string> {
  if (typeof window === 'undefined') return defaultAdminSidebarSeenAt();
  const fallback = defaultAdminSidebarSeenAt();
  try {
    const storageKey = adminSidebarSeenStorageKey(branchCode);
    const stored = window.localStorage.getItem(storageKey);
    if (!stored) {
      window.localStorage.setItem(storageKey, JSON.stringify(fallback));
      return fallback;
    }
    return {
      ...fallback,
      ...(JSON.parse(stored) as Partial<Record<AdminSidebarBadgeKey, string>>),
    };
  } catch {
    return fallback;
  }
}

function countNewerThan(
  items: Array<{ checkedInAt?: string; createdAt?: string; joinedAt?: string }>,
  seenAt: string,
  dateKey: 'checkedInAt' | 'createdAt' | 'joinedAt',
): number {
  const seenTime = new Date(seenAt).getTime();
  return items.filter((item) => {
    const value = item[dateKey];
    return value ? new Date(value).getTime() > seenTime : false;
  }).length;
}

function Sidebar({
  badges,
  collapsed,
  items,
  onNavigate,
  onLogout,
  pathname,
  user,
  locale,
}: {
  badges?: Partial<Record<AdminSidebarBadgeKey, number>>;
  collapsed: boolean;
  items: NavItem[];
  onNavigate?: (href: string) => void;
  onLogout: () => void;
  pathname: string;
  user: SessionUser;
  locale: PublicLocale;
}) {
  const navigationRef = useRef<HTMLElement>(null);
  const [hasMoreNavigation, setHasMoreNavigation] = useState(false);

  const updateNavigationOverflow = useCallback(() => {
    const navigation = navigationRef.current;
    if (!navigation) return;
    const canScroll = navigation.scrollHeight > navigation.clientHeight + 4;
    const reachedEnd =
      navigation.scrollTop + navigation.clientHeight >= navigation.scrollHeight - 4;
    setHasMoreNavigation(canScroll && !reachedEnd);
  }, []);

  useEffect(() => {
    const navigation = navigationRef.current;
    if (!navigation) return;
    const frame = window.requestAnimationFrame(updateNavigationOverflow);
    const observer = new ResizeObserver(updateNavigationOverflow);
    observer.observe(navigation);
    return () => {
      window.cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [collapsed, items.length, updateNavigationOverflow]);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <Link
        className={cn(
          'flex items-center gap-3 rounded-md px-3 py-3 transition hover:bg-muted',
          collapsed && 'justify-center px-2',
        )}
        href={items[0]?.href ?? homeForRole(user.role, locale)}
        onClick={() => onNavigate?.(items[0]?.href ?? homeForRole(user.role, locale))}
      >
        <span className="relative h-11 w-11 shrink-0 overflow-hidden rounded-lg border border-border bg-white shadow-sm">
          <Image alt="Pro Gym logo" className="object-cover" fill sizes="44px" src={brand.logoBw} />
        </span>
        {!collapsed ? (
          <span>
            <span className="block text-sm font-black uppercase tracking-[0.16em] text-foreground">
              Pro Gym
            </span>
            <span className="text-xs font-semibold text-muted-foreground">Dashboard</span>
          </span>
        ) : null}
      </Link>

      <div className="relative mt-5 min-h-0 flex-1">
        <nav
          aria-label={locale === 'en' ? 'Dashboard pages' : 'صفحات لوحة التحكم'}
          className={cn(
            'h-full overflow-y-auto overscroll-contain pe-1 [scrollbar-color:rgba(57,255,20,0.65)_transparent] [scrollbar-width:thin]',
            hasMoreNavigation && 'pb-14',
            collapsed && 'pe-0',
          )}
          onScroll={updateNavigationOverflow}
          ref={navigationRef}
        >
          <div className="grid gap-1">
            {items.map((item) => {
              const active = pathname === item.href;
              const badgeCount = item.badgeKey ? (badges?.[item.badgeKey] ?? 0) : 0;
              const Icon = item.icon;

              return (
                <Link
                  className={cn(
                    'group relative flex min-h-11 items-center gap-3 rounded-md px-3 text-sm font-bold transition-colors duration-150',
                    active
                      ? 'bg-black text-white shadow-sm hover:bg-black hover:text-white'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                    collapsed ? 'justify-center px-2' : 'justify-between',
                  )}
                  href={item.href}
                  key={item.href}
                  onClick={() => onNavigate?.(item.href)}
                  title={collapsed ? item.label : undefined}
                >
                  <span
                    className={cn('flex min-w-0 items-center gap-3', collapsed && 'justify-center')}
                  >
                    <Icon className="h-5 w-5 shrink-0" />
                    {!collapsed ? <span className="truncate">{item.label}</span> : null}
                  </span>
                  {badgeCount ? (
                    <span
                      className={cn(
                        'inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-red-600 px-1.5 text-[10px] font-black leading-none text-white shadow-sm',
                        collapsed && 'absolute -end-0.5 -top-0.5 h-4 min-w-4 px-1 text-[9px]',
                      )}
                    >
                      {badgeCount > 99 ? '99+' : badgeCount}
                    </span>
                  ) : null}
                </Link>
              );
            })}
          </div>
        </nav>

        <AnimatePresence initial={false}>
          {hasMoreNavigation ? (
            <motion.button
              animate={{ opacity: 1, y: 0 }}
              aria-label={locale === 'en' ? 'Show more dashboard pages' : 'إظهار صفحات إضافية'}
              className="absolute inset-x-2 bottom-1 z-10 flex min-h-10 items-center justify-center gap-2 rounded-md border border-brand-accent/50 bg-background/95 px-3 text-xs font-black text-foreground shadow-[0_-10px_24px_rgba(0,0,0,0.12)] backdrop-blur"
              exit={{ opacity: 0, y: 6 }}
              initial={{ opacity: 0, y: 6 }}
              onClick={() =>
                navigationRef.current?.scrollBy({
                  behavior: 'smooth',
                  top: Math.max(160, navigationRef.current.clientHeight * 0.65),
                })
              }
              type="button"
            >
              <ChevronDown className="h-4 w-4 animate-bounce text-green-700 dark:text-brand-accent" />
              {!collapsed ? (
                <span>
                  {locale === 'en' ? 'More pages — scroll down' : 'صفحات أخرى — مرّر للأسفل'}
                </span>
              ) : null}
            </motion.button>
          ) : null}
        </AnimatePresence>
      </div>

      <div className="relative z-10 mt-3 shrink-0 rounded-md border border-border bg-background p-3 shadow-[0_-8px_24px_rgba(0,0,0,0.08)]">
        {user.role === 'MEMBER' && user.assignedCoach ? (
          <div
            className={cn('mb-3 border-b border-border pb-3', collapsed && 'flex justify-center')}
            title={
              collapsed
                ? `${locale === 'en' ? 'Coach' : 'المدرب'}: ${user.assignedCoach.fullName}`
                : undefined
            }
          >
            {collapsed ? (
              <UserRoundCheck className="h-5 w-5 text-green-700 dark:text-brand-accent" />
            ) : (
              <>
                <p className="flex items-center gap-2 text-xs font-black text-green-700 dark:text-brand-accent">
                  <UserRoundCheck className="h-4 w-4" />
                  {locale === 'en' ? 'Your private coach' : 'مدربك الخاص'}
                </p>
                <p className="mt-1 truncate text-sm font-black text-foreground">
                  {user.assignedCoach.fullName}
                </p>
                <p className="text-xs font-semibold text-muted-foreground">
                  {user.assignedCoach.status === 'ACTIVE'
                    ? locale === 'en'
                      ? 'Coaching active'
                      : 'التدريب نشط'
                    : locale === 'en'
                      ? 'Coaching paused'
                      : 'التدريب متوقف مؤقتاً'}
                </p>
              </>
            )}
          </div>
        ) : null}
        <p className={cn('text-xs font-bold text-muted-foreground', collapsed && 'sr-only')}>
          {locale === 'en' ? 'Account' : 'الحساب'}
        </p>
        <p
          className={cn('mt-1 truncate text-sm font-black text-foreground', collapsed && 'sr-only')}
        >
          {user.fullName}
        </p>
        <p className={cn('text-xs font-semibold text-muted-foreground', collapsed && 'sr-only')}>
          {localizedRoleLabel(user.role, locale)}
        </p>
        {user.role === 'OBSERVER' && user.shiftObserver ? (
          <p
            className={cn(
              'mt-1 text-xs font-black text-green-700 dark:text-brand-accent',
              collapsed && 'sr-only',
            )}
          >
            {formatShiftTime(user.shiftObserver.shiftStart)} —{' '}
            {formatShiftTime(user.shiftObserver.shiftEnd)}
          </p>
        ) : null}
        {collapsed ? <UserCog className="mx-auto h-5 w-5 text-muted-foreground" /> : null}
        <button
          className={cn(
            'mt-3 flex min-h-10 w-full items-center justify-center gap-2 rounded-md border border-border bg-card px-3 text-xs font-black text-foreground transition hover:border-red-400/60 hover:bg-red-500/10 hover:text-red-600',
            collapsed && 'px-2',
          )}
          onClick={onLogout}
          title={locale === 'en' ? 'Log out' : 'تسجيل الخروج'}
          type="button"
        >
          <LogOut className="h-4 w-4" />
          {!collapsed ? <span>{locale === 'en' ? 'Log out' : 'تسجيل الخروج'}</span> : null}
        </button>
      </div>
    </div>
  );
}

type DashboardNotification = {
  actionUrl: string | null;
  bodyAr: string;
  createdAt: string;
  id: string;
  readAt: string | null;
  titleAr: string;
  type: string;
};

function NotificationCenter({ locale }: { locale: PublicLocale }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();
  const query = useQuery({
    queryFn: () => apiRequest<{ items: DashboardNotification[]; unread: number }>('/notifications'),
    queryKey: ['notifications'],
    refetchInterval: 60_000,
  });
  const markAll = useMutation({
    mutationFn: () => apiRequest('/notifications/read-all', { body: jsonBody({}), method: 'POST' }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['notifications'] });
      setOpen(false);
    },
  });
  const unread = query.data?.unread ?? 0;

  useEffect(() => {
    if (!open) return;
    const closeOutside = (event: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('pointerdown', closeOutside);
    return () => document.removeEventListener('pointerdown', closeOutside);
  }, [open]);

  return (
    <div className="relative" ref={rootRef}>
      <button
        aria-label={locale === 'en' ? 'Notifications' : 'الإشعارات'}
        className="relative inline-flex h-10 w-10 items-center justify-center rounded-md border border-border bg-white/58 text-foreground shadow-sm transition hover:border-brand-accent hover:bg-muted dark:bg-white/5"
        onClick={() => setOpen((value) => !value)}
        type="button"
      >
        <Bell className="h-5 w-5" />
        {unread ? (
          <span className="absolute -end-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-brand-accent px-1 text-[10px] font-black text-black">
            {unread}
          </span>
        ) : null}
      </button>
      <AnimatePresence>
        {open ? (
          <motion.div
            animate={{ opacity: 1, y: 0, scale: 1 }}
            className="fixed inset-x-3 top-[5.25rem] z-50 flex max-h-[calc(100dvh-6rem)] flex-col overflow-hidden rounded-xl border border-border bg-popover text-popover-foreground shadow-2xl sm:absolute sm:inset-x-auto sm:end-0 sm:top-12 sm:max-h-none sm:w-[min(24rem,calc(100vw-2rem))]"
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.18 }}
          >
            <div className="flex shrink-0 items-start justify-between gap-3 border-b border-border p-3 sm:items-center sm:p-4">
              <div className="min-w-0">
                <p className="font-black text-foreground">
                  {locale === 'en' ? 'Notifications' : 'الإشعارات'}
                </p>
                <p className="text-xs font-semibold text-muted-foreground">
                  {locale === 'en'
                    ? 'Membership, plan, and coach request alerts'
                    : 'تنبيهات الاشتراك، الخطط، وطلبات المدرب'}
                </p>
              </div>
              <button
                className="inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-md border border-brand-accent/30 bg-brand-accent/10 px-3 text-xs font-black text-green-700 transition hover:bg-brand-accent hover:text-black disabled:cursor-not-allowed disabled:opacity-55 dark:text-brand-accent"
                disabled={!unread || markAll.isPending}
                onClick={() => markAll.mutate()}
                type="button"
              >
                {markAll.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                {markAll.isPending
                  ? locale === 'en'
                    ? 'Marking...'
                    : 'جارٍ التحديد...'
                  : locale === 'en'
                    ? 'Mark all read'
                    : 'قراءة الكل'}
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-1.5 sm:max-h-96 sm:flex-none sm:p-2">
              {query.data?.items.length ? (
                query.data.items.slice(0, 12).map((item) => (
                  <Link
                    className={cn(
                      'block rounded-lg p-3 transition hover:bg-muted',
                      !item.readAt && 'bg-brand-accent/10',
                    )}
                    href={
                      locale === 'en'
                        ? (item.actionUrl?.replace(
                            '/ar/dashboard/member',
                            '/en/dashboard/member',
                          ) ?? '#')
                        : (item.actionUrl ?? '#')
                    }
                    key={item.id}
                    onClick={() => setOpen(false)}
                  >
                    <div className="flex items-start gap-3">
                      <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-foreground text-background dark:bg-brand-accent dark:text-black">
                        <BellRing className="h-4 w-4" />
                      </span>
                      <span className="min-w-0">
                        <span className="block font-black text-foreground">{item.titleAr}</span>
                        <span className="mt-1 line-clamp-2 block text-sm leading-6 text-muted-foreground">
                          {item.bodyAr}
                        </span>
                        <span className="mt-2 block text-xs font-semibold text-muted-foreground">
                          {formatCompactDateTime(item.createdAt)}
                        </span>
                      </span>
                    </div>
                  </Link>
                ))
              ) : (
                <div className="p-6 text-center text-sm font-bold text-muted-foreground">
                  {locale === 'en' ? 'No notifications currently' : 'لا توجد إشعارات حالياً'}
                </div>
              )}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

export function DashboardShell({
  children,
  locale,
}: {
  children: ReactNode;
  locale: PublicLocale;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const auth = useAuth();
  const queryClient = useQueryClient();
  const [collapsed, setCollapsed] = useState(false);
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [navigatingTo, setNavigatingTo] = useState<string | null>(null);
  const selectedBranchCode = dashboardBranchCode(pathname);
  const logout = useMutation({
    mutationFn: () => apiRequest('/auth/logout', { body: jsonBody({}), method: 'POST' }),
    onSuccess: () => {
      queryClient.clear();
      setLogoutOpen(false);
      router.replace(`/${locale}/login`);
      router.refresh();
    },
  });
  const [adminSidebarSeenAt, setAdminSidebarSeenAt] = useState(defaultAdminSidebarSeenAt);
  const isAdminWorkspace =
    Boolean(selectedBranchCode) && (auth.data?.role === 'ADMIN' || auth.data?.role === 'OBSERVER');
  const activeAdminBadgeKey = isAdminWorkspace ? adminBadgeKeyForPath(pathname) : null;
  const adminSidebarBadgeSource = useQuery({
    enabled: isAdminWorkspace,
    queryFn: async (): Promise<AdminSidebarBadgeSource> => {
      const [members, profileChanges, registrations, attendance] = await Promise.all([
        apiRequest<PaginatedResponse<{ createdAt?: string; joinedAt?: string }>>(
          '/admin/members?page=1&pageSize=100',
        ),
        apiRequest<Array<{ createdAt: string; status: string }>>(
          '/admin/members/profile-change-requests',
        ),
        apiRequest<PaginatedResponse<{ createdAt: string }>>(
          '/admin/registration-requests?page=1&pageSize=100&status=PENDING',
        ),
        apiRequest<PaginatedResponse<{ checkedInAt: string }>>('/attendance?page=1&pageSize=100'),
      ]);
      return {
        attendance: attendance.items,
        members: members.items,
        profileChanges,
        registrations: registrations.items,
      };
    },
    queryKey: ['admin-sidebar-badges', selectedBranchCode],
    refetchInterval: 15_000,
  });
  const adminSidebarBadges = useMemo<Partial<Record<AdminSidebarBadgeKey, number>>>(() => {
    if (!isAdminWorkspace || !adminSidebarBadgeSource.data) return {};
    return {
      attendance: countNewerThan(
        adminSidebarBadgeSource.data.attendance,
        adminSidebarSeenAt.attendance,
        'checkedInAt',
      ),
      members:
        countNewerThan(
          adminSidebarBadgeSource.data.members,
          adminSidebarSeenAt.members,
          'joinedAt',
        ) +
        countNewerThan(
          adminSidebarBadgeSource.data.profileChanges.filter(
            (request) => request.status === 'PENDING',
          ),
          adminSidebarSeenAt.members,
          'createdAt',
        ),
      registrations: countNewerThan(
        adminSidebarBadgeSource.data.registrations,
        adminSidebarSeenAt.registrations,
        'createdAt',
      ),
    };
  }, [adminSidebarBadgeSource.data, adminSidebarSeenAt, isAdminWorkspace]);

  useEffect(() => {
    const stored = window.localStorage.getItem('progym-sidebar-collapsed');
    if (stored) setCollapsed(stored === 'true');
    setAdminSidebarSeenAt(readAdminSidebarSeenAt(selectedBranchCode));
  }, [selectedBranchCode]);

  useEffect(() => {
    if (!selectedBranchCode) return;
    void queryClient.invalidateQueries({
      predicate: (query) => query.queryKey[0] !== 'auth',
    });
  }, [queryClient, selectedBranchCode]);

  useEffect(() => {
    if (!activeAdminBadgeKey) return;
    const next = {
      ...readAdminSidebarSeenAt(selectedBranchCode),
      [activeAdminBadgeKey]: new Date().toISOString(),
    };
    window.localStorage.setItem(
      adminSidebarSeenStorageKey(selectedBranchCode),
      JSON.stringify(next),
    );
    setAdminSidebarSeenAt(next);
  }, [activeAdminBadgeKey, selectedBranchCode]);

  useEffect(() => {
    window.localStorage.setItem('progym-sidebar-collapsed', String(collapsed));
  }, [collapsed]);

  useEffect(() => {
    if (auth.isError) router.replace(`/${locale}/login`);
  }, [auth.isError, locale, router]);

  useEffect(() => {
    if (auth.data) {
      if (locale === 'en' && auth.data.role !== 'MEMBER') {
        const branchCode =
          auth.data.role === 'OBSERVER' ? (auth.data.branch?.code ?? 'b1') : selectedBranchCode;
        router.replace(
          branchCode ? `/ar/dashboard/admin/${branchCode}` : homeForRole(auth.data.role),
        );
        return;
      }
      const expected =
        auth.data.role === 'OBSERVER'
          ? `/ar/dashboard/admin/${auth.data.branch?.code ?? 'b1'}`
          : homeForRole(auth.data.role, locale);
      if (
        auth.data.role === 'OBSERVER' &&
        pathname !== `/${locale}/dashboard` &&
        (!selectedBranchCode || selectedBranchCode !== auth.data.branch?.code)
      ) {
        router.replace(expected);
        return;
      }
      if (auth.data.role === 'OBSERVER') {
        if (pathname === `/${locale}/dashboard`) router.replace(expected);
        return;
      }
      if (
        auth.data.role === 'ADMIN' &&
        pathname.startsWith(`/${locale}/dashboard/admin/`) &&
        !selectedBranchCode
      ) {
        router.replace(`/${locale}/dashboard/admin`);
        return;
      }
      const roleSegment = expected.split('/').at(-1);
      if (!pathname.includes(`/dashboard/${roleSegment}`) && pathname !== `/${locale}/dashboard`) {
        router.replace(expected);
      }
      if (pathname === `/${locale}/dashboard`) router.replace(expected);
    }
  }, [auth.data, locale, pathname, router, selectedBranchCode]);

  useEffect(() => setMobileOpen(false), [pathname]);

  useEffect(() => setNavigatingTo(null), [pathname]);

  function handleNavigate(href: string) {
    if (href !== pathname) setNavigatingTo(href);
    setMobileOpen(false);
  }

  if (auth.isLoading) {
    return (
      <main className="min-h-screen bg-background p-4">
        <DashboardLoader label={locale === 'en' ? 'Opening dashboard' : 'جاري فتح لوحة التحكم'} />
      </main>
    );
  }

  if (auth.isError || !auth.data) {
    return (
      <ErrorState
        message={
          locale === 'en'
            ? 'You must log in to access the dashboard'
            : 'يجب تسجيل الدخول للوصول إلى لوحة التحكم'
        }
      />
    );
  }

  const user = auth.data;
  const items = localizedNavItems(user.role, locale, selectedBranchCode);
  const isExpiredMember = user.role === 'MEMBER' && user.membership?.isExpired;
  const isExpiredContentLocked =
    isExpiredMember &&
    (pathname.includes('/dashboard/member/workouts') ||
      pathname.includes('/dashboard/member/nutrition') ||
      pathname.includes('/dashboard/member/progress') ||
      pathname.includes('/dashboard/member/calculators'));
  const pendingPhotoRequest = user.role === 'MEMBER' ? user.pendingPhotoRequest : null;
  const isPhotoLocked =
    Boolean(pendingPhotoRequest) && pathname.includes('/dashboard/member/nutrition');
  const sidebarWidth = collapsed ? 'lg:grid-cols-[5.25rem_1fr]' : 'lg:grid-cols-[17rem_1fr]';
  const pageTitle =
    items.find((item) => item.href === pathname)?.label ??
    (locale === 'en' && user.role === 'MEMBER' ? 'Player dashboard' : 'لوحة التحكم');

  return (
    <div className={cn('min-h-screen bg-background text-foreground lg:grid', sidebarWidth)}>
      {(user.role === 'ADMIN' || user.role === 'OBSERVER') && selectedBranchCode ? (
        <ReceptionEventCenter />
      ) : null}
      <aside className="relative hidden h-screen p-3 lg:sticky lg:top-0 lg:block">
        <Card className="h-full border-border/80 bg-card/92 p-2 shadow-sm backdrop-blur">
          <Sidebar
            badges={adminSidebarBadges}
            collapsed={collapsed}
            items={items}
            locale={locale}
            onNavigate={handleNavigate}
            onLogout={() => setLogoutOpen(true)}
            pathname={pathname}
            user={user}
          />
        </Card>
        <button
          aria-label={collapsed ? 'توسيع القائمة' : 'تصغير القائمة'}
          className="absolute -end-1 top-10 inline-flex h-9 w-9 items-center justify-center rounded-full border border-border bg-card text-foreground shadow-md transition hover:border-brand-accent"
          onClick={() => setCollapsed((value) => !value)}
          type="button"
        >
          {collapsed ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </button>
      </aside>

      <div className="min-w-0">
        <AnimatePresence>
          {navigatingTo ? (
            <>
              <motion.div
                animate={{ opacity: 1 }}
                className="fixed inset-x-0 top-0 z-[90] h-1 overflow-hidden bg-foreground/10"
                exit={{ opacity: 0 }}
                initial={{ opacity: 0 }}
              >
                <motion.span
                  animate={{ x: ['-100%', '330%'] }}
                  className="block h-full w-1/3 bg-brand-accent shadow-[0_0_20px_var(--brand-accent)]"
                  transition={{ duration: 1, ease: [0.65, 0, 0.35, 1], repeat: Infinity }}
                />
              </motion.div>
              <motion.div
                animate={{ opacity: 1, scale: 1, y: 0 }}
                className="fixed left-1/2 top-5 z-[70] flex -translate-x-1/2 items-center gap-3 rounded-full border border-border bg-card/95 px-4 py-2 text-sm font-black text-foreground shadow-2xl backdrop-blur"
                exit={{ opacity: 0, scale: 0.96, y: -8 }}
                initial={{ opacity: 0, scale: 0.96, y: -8 }}
              >
                <Dumbbell className="h-4 w-4 animate-[loader-lift_0.9s_ease-in-out_infinite] text-green-700 dark:text-brand-accent" />
                {locale === 'en' ? 'Opening page' : 'جاري فتح الصفحة'}
              </motion.div>
            </>
          ) : null}
        </AnimatePresence>
        <header className="sticky top-0 z-30 px-3 pt-3">
          <div className="glass-panel mx-auto flex max-w-[96rem] items-center justify-between gap-3 rounded-lg px-4 py-3">
            <div className="flex items-center gap-2">
              <button
                aria-label={locale === 'en' ? 'Open menu' : 'فتح القائمة'}
                className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-border bg-white/58 text-foreground shadow-sm dark:bg-white/5 lg:hidden"
                onClick={() => setMobileOpen(true)}
                type="button"
              >
                <Menu className="h-5 w-5" />
              </button>
              <div>
                <p className="text-xs font-bold text-muted-foreground">
                  {selectedBranchCode
                    ? `Pro Gym / ${dashboardBranchLabels[selectedBranchCode] ?? selectedBranchCode.toUpperCase()}`
                    : 'Pro Gym'}
                </p>
                <h1 className="text-xl font-black tracking-tight">{pageTitle}</h1>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {user.role === 'ADMIN' && selectedBranchCode ? (
                <Link
                  aria-label="تبديل الفرع"
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-brand-accent/45 bg-brand-accent/10 px-2.5 text-xs font-black text-green-800 transition hover:bg-brand-accent hover:text-black dark:text-brand-accent sm:px-3"
                  href="/ar/dashboard/admin"
                >
                  <Building2 className="h-4 w-4" />
                  <span className="hidden md:inline">تبديل الفرع</span>
                </Link>
              ) : null}
              <Link
                aria-label={locale === 'en' ? 'Back to public site' : 'العودة للموقع العام'}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-border bg-white/58 px-2.5 text-xs font-black text-foreground shadow-sm transition hover:border-brand-accent hover:text-green-700 dark:bg-white/5 dark:hover:text-brand-accent sm:px-3"
                href={`/${locale}`}
              >
                <Home className="h-4 w-4" />
                <span className="hidden xl:inline">
                  {locale === 'en' ? 'Public site' : 'الموقع العام'}
                </span>
              </Link>
              <NotificationCenter locale={locale} />
              <ThemeToggle className="rounded-md" />
              {user.role === 'MEMBER' ? (
                <Link
                  aria-label={locale === 'ar' ? 'English' : 'العربية'}
                  className="inline-flex h-10 min-w-10 items-center justify-center rounded-md border border-border bg-white/58 px-2 text-xs font-black uppercase text-foreground shadow-sm transition hover:border-brand-accent dark:bg-white/5"
                  href={pathname.replace(`/${locale}/`, `/${locale === 'ar' ? 'en' : 'ar'}/`)}
                >
                  {locale === 'ar' ? 'EN' : 'AR'}
                </Link>
              ) : null}
              <div className="hidden rounded-md border border-border bg-white/58 px-4 py-2 text-sm shadow-sm dark:bg-white/5 sm:block">
                <p className="font-black leading-4">{user.fullName}</p>
                <p className="text-xs font-semibold text-muted-foreground">
                  {localizedRoleLabel(user.role, locale)}
                </p>
              </div>
            </div>
          </div>
        </header>

        <div className="mx-auto max-w-[96rem] px-4 py-4">
          <aside className="hidden">
            <div className="sticky top-20 h-[calc(100vh-6rem)]">
              <Card className="h-full border-border/80 bg-card/92 p-2 shadow-sm backdrop-blur">
                <Sidebar
                  badges={adminSidebarBadges}
                  collapsed={collapsed}
                  items={items}
                  locale={locale}
                  onNavigate={handleNavigate}
                  onLogout={() => {
                    setMobileOpen(false);
                    setLogoutOpen(true);
                  }}
                  pathname={pathname}
                  user={user}
                />
              </Card>
              <button
                aria-label={collapsed ? 'توسيع القائمة' : 'تصغير القائمة'}
                className="absolute -end-3 top-8 inline-flex h-9 w-9 items-center justify-center rounded-full border border-border bg-card text-foreground shadow-md transition hover:border-brand-accent"
                onClick={() => setCollapsed((value) => !value)}
                type="button"
              >
                {collapsed ? (
                  <ChevronLeft className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </button>
            </div>
          </aside>

          <main className="min-w-0 max-w-full overflow-x-clip">
            {isExpiredContentLocked ? (
              <Card className="flex min-h-[60vh] flex-col items-center justify-center text-center shadow-sm">
                <h1 className="text-3xl font-black">
                  {locale === 'en' ? 'Your membership has expired' : 'انتهى اشتراكك'}
                </h1>
                <p className="mt-3 max-w-md text-muted-foreground">
                  Your subscription has expired. Please contact Pro Gym administration.
                </p>
                <Button
                  className="mt-6"
                  onClick={() => router.push(`/${locale}/contact`)}
                  variant="secondary"
                >
                  {locale === 'en' ? 'View renewal options' : 'عرض طرق التجديد'}
                </Button>
              </Card>
            ) : isPhotoLocked ? (
              <Card className="flex min-h-[62vh] flex-col items-center justify-center overflow-hidden text-center shadow-sm">
                <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-foreground text-background dark:bg-brand-accent dark:text-black">
                  <LockKeyhole className="h-8 w-8" />
                </div>
                <h1 className="mt-5 text-3xl font-black">
                  {locale === 'en' ? 'New progress photos required' : 'مطلوب رفع صور تقدم جديدة'}
                </h1>
                <p className="mt-3 max-w-xl text-sm leading-7 text-muted-foreground">
                  {locale === 'en'
                    ? `Coach ${pendingPhotoRequest?.coach?.user?.fullName ?? ''} requested new progress photos. The rest of the dashboard will unlock after you upload the required photos from Progress.`
                    : `المدرب ${pendingPhotoRequest?.coach?.user?.fullName ?? ''} طلب صور تقدم جديدة. سيتم فتح بقية اللوحة بعد رفع الصورة المطلوبة من صفحة التقدم.`}
                </p>
                {pendingPhotoRequest?.message ? (
                  <p className="mt-4 max-w-xl rounded-lg border border-border bg-muted/45 p-4 text-sm font-bold leading-7 text-foreground">
                    {pendingPhotoRequest.message}
                  </p>
                ) : null}
                <Button
                  className="mt-6"
                  onClick={() => router.push(`/${locale}/dashboard/member/progress`)}
                >
                  {locale === 'en' ? 'Upload progress photos' : 'رفع صور التقدم'}
                </Button>
              </Card>
            ) : (
              <AnimatePresence mode="wait">
                <motion.div
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  initial={{ opacity: 0, y: 12 }}
                  key={pathname}
                  transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                >
                  <MemberLocaleProvider locale={locale}>{children}</MemberLocaleProvider>
                </motion.div>
              </AnimatePresence>
            )}
          </main>
        </div>
      </div>

      <AnimatePresence>
        {mobileOpen ? (
          <>
            <motion.button
              aria-label={locale === 'en' ? 'Close menu' : 'إغلاق القائمة'}
              animate={{ opacity: 1 }}
              className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm lg:hidden"
              exit={{ opacity: 0 }}
              initial={{ opacity: 0 }}
              onClick={() => setMobileOpen(false)}
              type="button"
            />
            <motion.aside
              animate={{ x: 0 }}
              className={cn(
                'fixed inset-y-0 z-50 flex w-[20rem] max-w-[86vw] flex-col overflow-hidden bg-background px-3 pb-0 pt-3 shadow-2xl lg:hidden',
                locale === 'ar'
                  ? 'right-0 border-l border-border'
                  : 'left-0 border-r border-border',
              )}
              exit={{ x: locale === 'ar' ? '100%' : '-100%' }}
              initial={{ x: locale === 'ar' ? '100%' : '-100%' }}
              transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            >
              <div className="mb-3 flex shrink-0 justify-end">
                <button
                  aria-label={locale === 'en' ? 'Close menu' : 'إغلاق القائمة'}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-border bg-card"
                  onClick={() => setMobileOpen(false)}
                  type="button"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="min-h-0 flex-1 overflow-hidden pb-[env(safe-area-inset-bottom)]">
                <Sidebar
                  badges={adminSidebarBadges}
                  collapsed={false}
                  items={items}
                  locale={locale}
                  onNavigate={handleNavigate}
                  onLogout={() => {
                    setMobileOpen(false);
                    setLogoutOpen(true);
                  }}
                  pathname={pathname}
                  user={user}
                />
              </div>
            </motion.aside>
          </>
        ) : null}
      </AnimatePresence>
      <Dialog
        description={
          locale === 'en'
            ? 'Your current session will end and you will return to the login page.'
            : 'سيتم إنهاء الجلسة الحالية والعودة إلى صفحة تسجيل الدخول.'
        }
        onClose={() => setLogoutOpen(false)}
        open={logoutOpen}
        title={locale === 'en' ? 'Confirm logout' : 'تأكيد تسجيل الخروج'}
      >
        <div className="space-y-4">
          <p className="rounded-lg border border-border bg-muted/35 p-4 text-sm font-bold">
            {locale === 'en'
              ? `Do you want to log out of ${user.fullName}'s account?`
              : `هل تريد تسجيل الخروج من حساب ${user.fullName}؟`}
          </p>
          <div className="flex justify-end gap-2">
            <DialogCancelButton
              label={locale === 'en' ? 'Cancel' : 'إلغاء'}
              onClick={() => setLogoutOpen(false)}
            />
            <Button
              className="gap-2"
              isLoading={logout.isPending}
              loadingText={locale === 'en' ? 'Logging out' : 'جاري تسجيل الخروج'}
              onClick={() => logout.mutate()}
              variant="danger"
            >
              <LogOut className="h-4 w-4" />
              {locale === 'en' ? 'Log out' : 'تسجيل الخروج'}
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
