import { notFound } from 'next/navigation';
import type { PublicLocale } from '@progym/shared';

import { EntryPage } from '@/features/public/entry-page';

const branchCodes = new Set(['b1', 'b2', 'b3']);

export default async function BranchEntryRoute({
  params,
}: {
  params: Promise<{ branchCode: string; locale: PublicLocale }>;
}) {
  const { branchCode, locale } = await params;
  if (!branchCodes.has(branchCode)) notFound();
  return <EntryPage branchCode={branchCode} locale={locale} />;
}
