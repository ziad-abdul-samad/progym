import type { InputHTMLAttributes, TextareaHTMLAttributes } from 'react';

import { cn } from '@/lib/utils';

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        'min-h-11 w-full rounded-lg border border-input bg-white/62 px-4 py-2.5 text-sm font-medium text-foreground shadow-inner outline-none ring-ring transition placeholder:text-muted-foreground hover:border-foreground/20 focus:border-brand-accent focus:ring-2 dark:bg-white/5',
        className,
      )}
      {...props}
    />
  );
}

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        'min-h-28 w-full rounded-lg border border-input bg-white/62 px-4 py-3 text-sm font-medium text-foreground shadow-inner outline-none ring-ring transition placeholder:text-muted-foreground hover:border-foreground/20 focus:border-brand-accent focus:ring-2 dark:bg-white/5',
        className,
      )}
      {...props}
    />
  );
}
