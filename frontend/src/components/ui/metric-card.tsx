import type { LucideIcon } from 'lucide-react';

import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export function MetricCard({
  icon: Icon,
  label,
  tone = 'default',
  value,
}: {
  icon: LucideIcon;
  label: string;
  tone?: 'default' | 'success' | 'warning';
  value: number | string;
}) {
  return (
    <Card className="group overflow-hidden border-border bg-card p-5 shadow-sm transition hover:-translate-y-1 hover:border-brand-accent/60 hover:shadow-xl">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-muted-foreground">{label}</p>
          <p className="mt-2 text-3xl font-black tracking-tight text-foreground">{value}</p>
        </div>
        <div
          className={cn(
            'flex h-12 w-12 items-center justify-center rounded-lg',
            tone === 'default' && 'bg-muted text-foreground',
            tone === 'success' && 'bg-brand-accent/15 text-green-700 dark:text-brand-accent',
            tone === 'warning' &&
              'bg-amber-100 text-amber-700 dark:bg-amber-400/15 dark:text-amber-300',
          )}
        >
          <Icon className="h-6 w-6" />
        </div>
      </div>
      <div className="mt-5 h-1.5 overflow-hidden rounded-full bg-muted">
        <div className="h-full w-2/3 rounded-full bg-brand-accent transition-all group-hover:w-full" />
      </div>
    </Card>
  );
}
