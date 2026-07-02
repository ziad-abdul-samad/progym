import type { MetadataRoute } from 'next';

import { siteUrl } from '@/lib/public/content';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        allow: ['/', '/ar', '/en'],
        disallow: ['/api/', '/ar/dashboard/', '/en/dashboard/'],
        userAgent: '*',
      },
    ],
    sitemap: new URL('/sitemap.xml', siteUrl).toString(),
  };
}
