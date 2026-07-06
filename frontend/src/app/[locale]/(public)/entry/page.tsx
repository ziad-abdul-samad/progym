import type { PublicLocale } from '@progym/shared';

import { EntryPage } from '@/features/public/entry-page';

export default async function EntryRoute({ params }: { params: Promise<{ locale: PublicLocale }> }) {
  const { locale } = await params;
  return <EntryPage locale={locale} />;
}
