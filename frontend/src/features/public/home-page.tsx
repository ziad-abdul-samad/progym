import type { PublicLocale } from '@progym/shared';

import { HomeExperience } from '@/components/public/home-experience';
import { HomeHero } from '@/components/public/home-hero';

export function HomePage({ locale }: { locale: PublicLocale }) {
  return (
    <main>
      <HomeHero locale={locale} />
      <HomeExperience locale={locale} />
    </main>
  );
}
