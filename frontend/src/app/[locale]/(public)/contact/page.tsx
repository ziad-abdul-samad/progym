import type { Metadata } from 'next';
import type { PublicLocale } from '@progym/shared';

import { ContactPage } from '@/features/public/public-pages';
import { createPublicMetadata } from '@/lib/public/seo';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return createPublicMetadata(locale as PublicLocale, 'contact');
}

export default async function ContactRoute({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;

  return <ContactPage locale={locale as PublicLocale} />;
}
