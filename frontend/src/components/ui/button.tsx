import { Loader2 } from 'lucide-react';
import type { ButtonHTMLAttributes } from 'react';

import { cn } from '@/lib/utils';

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';

export function Button({
  children,
  className,
  isLoading,
  loadingText,
  variant = 'primary',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  isLoading?: boolean;
  loadingText?: string;
  variant?: ButtonVariant;
}) {
  return (
    <button
      className={cn(
        'inline-flex min-h-11 items-center justify-center rounded-lg px-4 py-2.5 text-sm font-black transition-[color,background-color,border-color,box-shadow,transform,opacity] duration-300 disabled:pointer-events-none disabled:translate-y-0 disabled:opacity-50',
        variant === 'primary' &&
          'bg-foreground text-background shadow-sm hover:-translate-y-0.5 hover:bg-brand-accent hover:text-black',
        variant === 'secondary' &&
          'border border-border bg-white/58 text-secondary-foreground shadow-sm hover:-translate-y-0.5 hover:bg-muted dark:bg-white/5',
        variant === 'danger' && 'bg-destructive text-white hover:brightness-110',
        variant === 'ghost' && 'bg-transparent text-foreground hover:bg-muted',
        className,
      )}
      aria-busy={isLoading || undefined}
      {...props}
      disabled={props.disabled || isLoading}
    >
      {isLoading ? (
        <span className="inline-flex min-w-0 items-center justify-center gap-2" role="status">
          <Loader2 aria-hidden="true" className="h-4 w-4 shrink-0 animate-spin" />
          {loadingText ? <span>{loadingText}</span> : null}
        </span>
      ) : (
        children
      )}
    </button>
  );
}
