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
        PAUSED: 'Paused',
        PENDING: 'Pending',
        REJECTED: 'Rejected',
        SIDE: 'Side',
      }[normalized] ?? status)
    : status;

  return (
    <span
      className={cn(
        'inline-flex rounded-full px-2.5 py-1 text-xs font-semibold',
        normalized === 'ACTIVE' && 'bg-lime-400/15 text-lime-300',
        normalized === 'FROZEN' && 'bg-cyan-400/15 text-cyan-300',
        normalized === 'EXPIRED' && 'bg-red-400/15 text-red-300',
        normalized !== 'ACTIVE' &&
          normalized !== 'FROZEN' &&
          normalized !== 'EXPIRED' &&
          'bg-muted text-muted-foreground',
      )}
    >
      {translatedStatus}
    </span>
  );
}
