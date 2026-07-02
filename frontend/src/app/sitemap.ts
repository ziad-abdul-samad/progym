import type { MetadataRoute } from 'next';
import { PUBLIC_LOCALES } from '@progym/shared';

import { publicRoutes, siteUrl } from '@/lib/public/content';

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  return PUBLIC_LOCALES.flatMap((locale) =>
    publicRoutes.map((route) => {
      const path = `/${locale}${route.path}`;
      const alternates = Object.fromEntries(
        PUBLIC_LOCALES.map((alternateLocale) => [
          alternateLocale,
          new URL(`/${alternateLocale}${route.path}`, siteUrl).toString(),
        ]),
      );

      return {
        alternates: {
          languages: {
            ...alternates,
            'x-default': new URL(`/ar${route.path}`, siteUrl).toString(),
          },
        },
        changeFrequency: route.key === 'home' ? 'weekly' : 'monthly',
        lastModified: now,
        priority: route.key === 'home' ? 1 : 0.8,
        url: new URL(path, siteUrl).toString(),
      };
    }),
  );
}
