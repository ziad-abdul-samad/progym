import type { Metadata } from 'next';
import type { PublicLocale } from '@progym/shared';

import { HomePage } from '@/features/public/home-page';
import { createPublicMetadata } from '@/lib/public/seo';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return createPublicMetadata(locale as PublicLocale, 'home');
}

export default async function PublicHomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;

  return <HomePage locale={locale as PublicLocale} />;
}
