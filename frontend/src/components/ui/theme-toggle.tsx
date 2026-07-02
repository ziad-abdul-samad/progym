'use client';

import { Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';

import { cn } from '@/lib/utils';

export function ThemeToggle({ className }: { className?: string }) {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const isDark = mounted && resolvedTheme === 'dark';

  return (
    <button
      aria-label={isDark ? 'تفعيل الوضع الفاتح' : 'تفعيل الوضع الداكن'}
      className={cn(
        'inline-flex h-10 w-10 items-center justify-center rounded-full border border-border bg-white/58 text-foreground shadow-sm transition hover:-translate-y-0.5 hover:border-brand-accent hover:text-green-700 focus:outline-none focus:ring-2 focus:ring-brand-accent dark:bg-white/5 dark:hover:text-brand-accent',
        className,
      )}
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      type="button"
    >
      {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
  );
}
