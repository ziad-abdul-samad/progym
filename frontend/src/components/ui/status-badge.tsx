import { cn } from '@/lib/utils';
import { useMemberLocale } from '@/features/member/member-locale';

export function StatusBadge({ status }: { status: string }) {
  const { isEnglish } = useMemberLocale();
  const normalized = status.toUpperCase();
  const translatedStatus = isEnglish
    ? ({
        ACTIVE: 'Active',
        APPROVED: 'Approved',
        BACK: 'Back',
        COMPLETED: 'Completed',
        EXPIRED: 'Expired',
        FRONT: 'Front',
        FROZEN: 'Frozen',
        INACTIVE: 'Inactive',
        MEMBER: 'Player',
        NONE: 'No subscription',
        PAUSED: 'Paused',
        PENDING: 'Pending',
        REJECTED: 'Rejected',
        SIDE: 'Side',
        SUSPENDED: 'Suspended',
      }[normalized] ?? status)
    : status;

  const tone =
    {
      ACTIVE:
        'border-emerald-500/25 bg-emerald-50 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-200',
      ADMIN:
        'border-violet-500/25 bg-violet-50 text-violet-800 dark:bg-violet-500/15 dark:text-violet-200',
      APPROVED:
        'border-emerald-500/25 bg-emerald-50 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-200',
      COACH: 'border-sky-500/25 bg-sky-50 text-sky-800 dark:bg-sky-500/15 dark:text-sky-200',
      COMPLETED:
        'border-emerald-500/25 bg-emerald-50 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-200',
      EXPIRED: 'border-rose-500/25 bg-rose-50 text-rose-800 dark:bg-rose-500/15 dark:text-rose-200',
      FROZEN: 'border-cyan-500/25 bg-cyan-50 text-cyan-800 dark:bg-cyan-500/15 dark:text-cyan-200',
      INACTIVE:
        'border-slate-500/25 bg-slate-100 text-slate-700 dark:bg-slate-500/15 dark:text-slate-200',
      MEMBER:
        'border-indigo-500/25 bg-indigo-50 text-indigo-800 dark:bg-indigo-500/15 dark:text-indigo-200',
      NONE: 'border-slate-500/25 bg-slate-100 text-slate-700 dark:bg-slate-500/15 dark:text-slate-200',
      PAUSED:
        'border-amber-500/25 bg-amber-50 text-amber-800 dark:bg-amber-500/15 dark:text-amber-200',
      PENDING:
        'border-amber-500/25 bg-amber-50 text-amber-800 dark:bg-amber-500/15 dark:text-amber-200',
      REJECTED:
        'border-rose-500/25 bg-rose-50 text-rose-800 dark:bg-rose-500/15 dark:text-rose-200',
      SUSPENDED:
        'border-rose-500/25 bg-rose-50 text-rose-800 dark:bg-rose-500/15 dark:text-rose-200',
    }[normalized] ?? 'border-border bg-muted text-foreground dark:bg-white/10 dark:text-white/85';

  return (
    <span
      className={cn(
        'inline-flex rounded-full border px-2.5 py-1 text-xs font-black shadow-sm',
        tone,
      )}
    >
      {translatedStatus}
    </span>
  );
}
