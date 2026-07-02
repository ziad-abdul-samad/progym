import { cn } from '@/lib/utils';

export function StatusBadge({ status }: { status: string }) {
  const normalized = status.toUpperCase();

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
      {status}
    </span>
  );
}
