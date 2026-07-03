import type { Metadata } from 'next';
import type { PublicLocale } from '@progym/shared';

import { MembershipPage } from '@/features/public/immersive-public-pages';
import { createPublicMetadata } from '@/lib/public/seo';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return createPublicMetadata(locale as PublicLocale, 'membership');
}

export default async function MembershipRoute({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;

  return <MembershipPage locale={locale as PublicLocale} />;
}
