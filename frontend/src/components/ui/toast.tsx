'use client';

import { createContext, type ReactNode, useContext, useMemo, useState } from 'react';

type Toast = { id: string; title: string; body?: string; tone?: 'success' | 'error' | 'info' };
type ToastContextValue = { push: (toast: Omit<Toast, 'id'>) => void };

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const value = useMemo<ToastContextValue>(
    () => ({
      push: (toast) => {
        const id = crypto.randomUUID();
        setToasts((current) => [...current, { ...toast, id }]);
        window.setTimeout(
          () => setToasts((current) => current.filter((item) => item.id !== id)),
          4500,
        );
      },
    }),
    [],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed bottom-4 left-4 z-50 flex w-[min(24rem,calc(100vw-2rem))] flex-col gap-2">
        {toasts.map((toast) => (
          <div
            className="rounded-lg border border-border bg-card p-4 text-sm text-foreground shadow-xl"
            key={toast.id}
          >
            <p className="font-semibold">{toast.title}</p>
            {toast.body ? <p className="mt-1 text-muted-foreground">{toast.body}</p> : null}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used within ToastProvider');
  return context;
}
