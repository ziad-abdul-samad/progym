import { DASHBOARD_LOCALE, PUBLIC_LOCALES, type PublicLocale } from '@progym/shared';

export const defaultLocale = DASHBOARD_LOCALE;
export const publicLocales = PUBLIC_LOCALES;

export function isPublicLocale(value: string): value is PublicLocale {
  return publicLocales.includes(value as PublicLocale);
}

export function getDirection(locale: PublicLocale): 'rtl' | 'ltr' {
  return locale === 'ar' ? 'rtl' : 'ltr';
}
