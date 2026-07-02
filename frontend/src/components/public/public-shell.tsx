import type { ReactNode } from 'react';
import type { PublicLocale } from '@progym/shared';

import { JsonLd } from '@/components/public/json-ld';
import { MotionController } from '@/components/public/motion-controller';
import { PublicFooter } from '@/components/public/public-footer';
import { PublicNav } from '@/components/public/public-nav';
import { PublicRouteTransition } from '@/components/public/route-transition';
import { organizationJsonLd, websiteJsonLd } from '@/lib/public/seo';

export function PublicShell({ children, locale }: { children: ReactNode; locale: PublicLocale }) {
  return (
    <>
      <JsonLd data={organizationJsonLd(locale)} />
      <JsonLd data={websiteJsonLd(locale)} />
      <MotionController />
      <PublicNav locale={locale} />
      <PublicRouteTransition>{children}</PublicRouteTransition>
      <PublicFooter locale={locale} />
    </>
  );
}
