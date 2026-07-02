import type { Metadata } from 'next';
import type { PublicLocale } from '@progym/shared';

import { AboutPage } from '@/features/public/public-pages';
import { createPublicMetadata } from '@/lib/public/seo';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return createPublicMetadata(locale as PublicLocale, 'about');
}

export default async function AboutRoute({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;

  return <AboutPage locale={locale as PublicLocale} />;
}
