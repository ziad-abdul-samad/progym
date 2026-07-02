import { Dumbbell } from 'lucide-react';

import { cn } from '@/lib/utils';

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded-md bg-muted', className)} />;
}

export function DashboardLoader({ label = 'جاري التحميل' }: { label?: string }) {
  return (
    <div
      aria-busy="true"
      aria-live="polite"
      className="relative min-h-[24rem] overflow-hidden rounded-lg border border-border bg-card p-5 shadow-sm"
    >
      <div className="absolute inset-x-0 top-0 h-1 overflow-hidden bg-muted">
        <div className="h-full w-1/3 animate-[loader-slide_1.15s_cubic-bezier(0.65,0,0.35,1)_infinite] bg-brand-accent shadow-[0_0_18px_var(--brand-accent)]" />
      </div>
      <div className="mb-6 flex items-center justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-7 w-44" />
          <Skeleton className="h-4 w-64 max-w-[60vw]" />
        </div>
        <div className="relative flex h-12 w-12 items-center justify-center rounded-lg bg-foreground text-background dark:bg-brand-accent dark:text-black">
          <span className="absolute inset-0 animate-ping rounded-lg border border-brand-accent/35" />
          <Dumbbell className="h-5 w-5 animate-[loader-lift_1s_ease-in-out_infinite]" />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <Skeleton className="h-28" />
        <Skeleton className="h-28 [animation-delay:120ms]" />
        <Skeleton className="h-28 [animation-delay:240ms]" />
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-[1.25fr_0.75fr]">
        <Skeleton className="h-64 [animation-delay:160ms]" />
        <div className="space-y-3">
          <Skeleton className="h-[4.9rem] [animation-delay:80ms]" />
          <Skeleton className="h-[4.9rem] [animation-delay:180ms]" />
          <Skeleton className="h-[4.9rem] [animation-delay:280ms]" />
        </div>
      </div>
      <p className="sr-only">{label}</p>
    </div>
  );
}

export function EmptyState({ title, body }: { title: string; body?: string }) {
  return (
    <div className="rounded-lg border border-dashed border-border p-8 text-center">
      <p className="font-semibold text-foreground">{title}</p>
      {body ? <p className="mt-2 text-sm text-muted-foreground">{body}</p> : null}
    </div>
  );
}

export function ErrorState({ message }: { message: string }) {
  return (
    <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-red-100">
      {message}
    </div>
  );
}
