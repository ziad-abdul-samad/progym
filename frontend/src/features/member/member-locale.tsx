'use client';

import { createContext, type ReactNode, useContext } from 'react';
import type { PublicLocale } from '@progym/shared';

const MemberLocaleContext = createContext<PublicLocale>('ar');

export function MemberLocaleProvider({
  children,
  locale,
}: {
  children: ReactNode;
  locale: PublicLocale;
}) {
  return <MemberLocaleContext.Provider value={locale}>{children}</MemberLocaleContext.Provider>;
}

export function useMemberLocale() {
  const locale = useContext(MemberLocaleContext);
  return {
    isEnglish: locale === 'en',
    locale,
    text: (arabic: string, english: string) => (locale === 'en' ? english : arabic),
  };
}
