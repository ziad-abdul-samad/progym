import type { Metadata } from 'next';
import type { PublicLocale } from '@progym/shared';

import { CoachesPage } from '@/features/public/public-pages';
import { createPublicMetadata } from '@/lib/public/seo';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return createPublicMetadata(locale as PublicLocale, 'coaches');
}

export default async function CoachesRoute({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;

  return <CoachesPage locale={locale as PublicLocale} />;
}
