import type { ReactNode } from 'react';
import type { PublicLocale } from '@progym/shared';

import { PublicShell } from '@/components/public/public-shell';

export default async function PublicLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  return <PublicShell locale={locale as PublicLocale}>{children}</PublicShell>;
}
