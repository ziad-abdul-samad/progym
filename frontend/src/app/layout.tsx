import type { Metadata } from 'next';
import { Alexandria, IBM_Plex_Sans_Arabic, Manrope } from 'next/font/google';
import type { ReactNode } from 'react';

import { AppProviders } from '@/components/providers/app-providers';
import { siteUrl } from '@/lib/public/content';

import '../styles/globals.css';

const arabicFont = IBM_Plex_Sans_Arabic({
  display: 'swap',
  subsets: ['arabic', 'latin'],
  variable: '--font-ar',
  weight: ['400', '500', '600', '700'],
});

const arabicDisplayFont = Alexandria({
  display: 'swap',
  subsets: ['arabic', 'latin'],
  variable: '--font-ar-display',
  weight: ['500', '600', '700', '800'],
});

const englishFont = Manrope({
  display: 'swap',
  subsets: ['latin'],
  variable: '--font-en',
  weight: ['400', '500', '600', '700', '800'],
});

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'Pro Gym',
    template: '%s | Pro Gym',
  },
  description: 'Pro Gym premium public website and Arabic gym management dashboard.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      className={`${arabicFont.variable} ${arabicDisplayFont.variable} ${englishFont.variable}`}
      dir="rtl"
      lang="ar"
      suppressHydrationWarning
    >
      <body>
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
