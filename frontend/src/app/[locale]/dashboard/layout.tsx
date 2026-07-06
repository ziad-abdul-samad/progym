import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import type { PublicLocale } from '@progym/shared';

import { DashboardShell } from '@/components/layout/dashboard-shell';

export function generateStaticParams(): Array<{ locale: PublicLocale }> {
  return [{ locale: 'ar' }, { locale: 'en' }];
}

export const metadata: Metadata = {
  robots: {
    follow: false,
    index: false,
  },
};

export default async function DashboardLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  return <DashboardShell locale={locale as PublicLocale}>{children}</DashboardShell>;
}
