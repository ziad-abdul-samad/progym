import { redirect } from 'next/navigation';

export default async function DashboardIndex({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  redirect(`/${locale === 'en' ? 'en' : 'ar'}/dashboard/member`);
}
