import { notFound } from 'next/navigation';
import type { ReactNode } from 'react';

import { LocaleSync } from '@/components/public/locale-sync';
import { PUBLIC_LOCALES, type PublicLocale } from '@progym/shared';

export function generateStaticParams(): Array<{ locale: PublicLocale }> {
  return PUBLIC_LOCALES.map((locale) => ({ locale }));
}

function isPublicLocale(locale: string): locale is PublicLocale {
  return PUBLIC_LOCALES.includes(locale as PublicLocale);
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  if (!isPublicLocale(locale)) {
    notFound();
  }

  return (
    <div lang={locale} dir={locale === 'ar' ? 'rtl' : 'ltr'}>
      <LocaleSync locale={locale} />
      {children}
    </div>
  );
}
