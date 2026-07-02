import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import type { ReactNode } from 'react';

import { DashboardShell } from '@/components/layout/dashboard-shell';

export function generateStaticParams(): Array<{ locale: 'ar' }> {
  return [{ locale: 'ar' }];
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

  if (locale !== 'ar') {
    notFound();
  }

  return <DashboardShell locale={locale}>{children}</DashboardShell>;
}
