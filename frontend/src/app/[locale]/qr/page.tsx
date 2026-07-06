import type { PublicLocale } from '@progym/shared';

import { QrStand } from '@/features/public/qr-stand';

export default async function QrRoute({ params }: { params: Promise<{ locale: PublicLocale }> }) {
  const { locale } = await params;
  return <QrStand locale={locale} />;
}
