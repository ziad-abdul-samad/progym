import type { Metadata } from 'next';
import type { PublicLocale } from '@progym/shared';

import {
  brand,
  publicCopy,
  publicRoutes,
  resolvePublicLocale,
  siteUrl,
  type PublicPageKey,
} from '@/lib/public/content';

const localeMap: Record<PublicLocale, string> = {
  ar: 'ar_SY',
  en: 'en_US',
};

export function absoluteUrl(path: string): string {
  return new URL(path, siteUrl).toString();
}

export function pagePath(locale: PublicLocale, page: PublicPageKey): string {
  const safeLocale = resolvePublicLocale(locale);
  const route = publicRoutes.find((item) => item.key === page);
  return `/${safeLocale}${route?.path ?? ''}`;
}

export function createPublicMetadata(locale: PublicLocale, page: PublicPageKey): Metadata {
  const safeLocale = resolvePublicLocale(locale);
  const seo = publicCopy[safeLocale].seo[page];
  const path = pagePath(safeLocale, page);
  const alternatePath = page === 'home' ? '' : publicRoutes.find((item) => item.key === page)?.path ?? '';

  return {
    alternates: {
      canonical: absoluteUrl(path),
      languages: {
        ar: absoluteUrl(`/ar${alternatePath}`),
        en: absoluteUrl(`/en${alternatePath}`),
        'x-default': absoluteUrl(`/ar${alternatePath}`),
      },
    },
    description: seo.description,
    metadataBase: new URL(siteUrl),
    openGraph: {
      description: seo.description,
      images: [
        {
          alt: brand.name,
          height: 900,
          url: brand.logoBw,
          width: 1200,
        },
      ],
      locale: localeMap[safeLocale],
      siteName: brand.name,
      title: seo.title,
      type: 'website',
      url: absoluteUrl(path),
    },
    title: seo.title,
    twitter: {
      card: 'summary_large_image',
      description: seo.description,
      images: [brand.logoBw],
      title: seo.title,
    },
  };
}

export function organizationJsonLd(locale: PublicLocale) {
  const safeLocale = resolvePublicLocale(locale);
  return {
    '@context': 'https://schema.org',
    '@type': 'HealthClub',
    address: {
      '@type': 'PostalAddress',
      addressLocality: brand.address[safeLocale],
    },
    image: absoluteUrl(brand.logoBw),
    name: brand.name,
    telephone: brand.phone,
    url: absoluteUrl(`/${safeLocale}`),
  };
}

export function websiteJsonLd(locale: PublicLocale) {
  const safeLocale = resolvePublicLocale(locale);
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    inLanguage: safeLocale,
    name: brand.name,
    potentialAction: {
      '@type': 'SearchAction',
      query: 'required name=search_term_string',
      target: absoluteUrl(`/${safeLocale}?q={search_term_string}`),
    },
    url: absoluteUrl(`/${safeLocale}`),
  };
}

export function breadcrumbJsonLd(locale: PublicLocale, items: Array<{ label: string; path: string }>) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      item: absoluteUrl(item.path),
      name: item.label,
      position: index + 1,
    })),
  };
}

export function coachesJsonLd(locale: PublicLocale) {
  const safeLocale = resolvePublicLocale(locale);
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    inLanguage: safeLocale,
    itemListElement: [
      {
        '@type': 'ListItem',
        name: safeLocale === 'ar' ? 'مدربو Pro Gym' : 'Pro Gym Coaches',
        position: 1,
        url: absoluteUrl(`/${safeLocale}/coaches`),
      },
    ],
  };
}

export function membershipJsonLd(locale: PublicLocale) {
  const safeLocale = resolvePublicLocale(locale);
  return {
    '@context': 'https://schema.org',
    '@type': 'OfferCatalog',
    inLanguage: safeLocale,
    name: safeLocale === 'ar' ? 'عضويات Pro Gym' : 'Pro Gym Memberships',
    url: absoluteUrl(`/${safeLocale}/membership`),
  };
}
