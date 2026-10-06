import type { Metadata } from 'next';
import localFont from 'next/font/local';
import type { ReactNode } from 'react';
import { Analytics } from '@vercel/analytics/next';

import { AppProviders } from '@/components/providers/app-providers';
import { siteUrl } from '@/lib/public/content';

import '../styles/globals.css';

// Vendored OFL fonts keep builds deterministic, without a Google Fonts network dependency.
const arabicFont = localFont({
  src: [
    { path: './fonts/IBMPlexSansArabic-Regular.ttf', weight: '400' },
    { path: './fonts/IBMPlexSansArabic-Medium.ttf', weight: '500' },
    { path: './fonts/IBMPlexSansArabic-SemiBold.ttf', weight: '600' },
    { path: './fonts/IBMPlexSansArabic-Bold.ttf', weight: '700' },
  ],
  display: 'swap',
  variable: '--font-ar',
});

const arabicDisplayFont = localFont({
  src: './fonts/Alexandria.ttf',
  display: 'swap',
  variable: '--font-ar-display',
  weight: '100 900',
});

const englishFont = localFont({
  src: './fonts/Manrope.ttf',
  display: 'swap',
  variable: '--font-en',
  weight: '200 800',
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
        <Analytics />
      </body>
    </html>
  );
}
