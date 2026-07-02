'use client';

import { useEffect } from 'react';
import type { PublicLocale } from '@progym/shared';

import { getDirection } from '@/lib/i18n/config';

export function LocaleSync({ locale }: { locale: PublicLocale }) {
  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dir = getDirection(locale);
  }, [locale]);

  return null;
}
