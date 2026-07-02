'use client';

import { X } from 'lucide-react';
import { type FormHTMLAttributes, type ReactNode } from 'react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export function Dialog({
  children,
  description,
  onClose,
  open,
  title,
}: {
  children: ReactNode;
  description?: string;
  onClose: () => void;
  open: boolean;
  title: string;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center p-3 sm:items-center">
      <button
        aria-label="إغلاق النافذة"
        className="absolute inset-0 bg-black/45 backdrop-blur-sm"
        onClick={onClose}
        type="button"
      />
      <section
        aria-modal="true"
        className="relative max-h-[88vh] w-full max-w-2xl overflow-hidden rounded-lg border border-border bg-card text-card-foreground shadow-2xl"
        role="dialog"
      >
        <div className="flex items-start justify-between gap-4 border-b border-border p-5">
          <div>
            <h2 className="text-xl font-black tracking-tight text-foreground">{title}</h2>
            {description ? (
              <p className="mt-2 text-sm leading-7 text-muted-foreground">{description}</p>
            ) : null}
          </div>
          <button
            aria-label="إغلاق"
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border bg-muted/50 text-foreground transition hover:border-brand-accent hover:bg-muted"
            onClick={onClose}
            type="button"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="max-h-[calc(88vh-6.5rem)] overflow-y-auto p-5">{children}</div>
      </section>
    </div>
  );
}

export function DialogForm({
  actions,
  children,
  className,
  ...props
}: FormHTMLAttributes<HTMLFormElement> & {
  actions: ReactNode;
}) {
  return (
    <form className={cn('space-y-4', className)} {...props}>
      <div className="space-y-3">{children}</div>
      <div className="flex flex-col-reverse gap-2 border-t border-border pt-4 sm:flex-row sm:justify-end">
        {actions}
      </div>
    </form>
  );
}

export function DialogCancelButton({ onClick }: { onClick: () => void }) {
  return (
    <Button onClick={onClick} type="button" variant="secondary">
      إلغاء
    </Button>
  );
}
