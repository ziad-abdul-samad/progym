import Image from 'next/image';
import Link from 'next/link';
import type { PublicLocale } from '@progym/shared';

import { brand, localizedPath, publicCopy, publicRoutes } from '@/lib/public/content';

export function PublicFooter({ locale }: { locale: PublicLocale }) {
  const copy = publicCopy[locale];
  const year = new Date().getFullYear();

  return (
    <footer className="relative overflow-hidden border-t border-white/10 bg-[#050605] px-5 py-16 text-white md:px-8 md:py-24 lg:px-10 xl:px-14">
      <div className="home-hero-grid absolute inset-0 opacity-10" />
      <div className="relative mx-auto grid max-w-[94rem] gap-12 border-b border-white/10 pb-14 lg:grid-cols-[1.2fr_0.8fr_0.8fr]">
        <div>
          <Link className="inline-flex items-center gap-3" href={localizedPath(locale)}>
            <span className="relative h-14 w-12 overflow-hidden bg-black">
              <Image alt="Pro Gym logo" className="object-cover" fill sizes="56px" src={brand.logoColor} />
            </span>
            <span className="text-xl font-black uppercase tracking-[0.2em] text-white">Pro Gym</span>
          </Link>
          <p className="mt-5 max-w-md text-sm leading-7 text-white/42">{copy.footer.body}</p>
        </div>

        <div>
            <p className="text-sm font-black uppercase tracking-[0.18em] text-[#39ff14]">
            {copy.footer.quick}
          </p>
          <div className="mt-5 grid gap-3">
            {publicRoutes.map((route) => (
              <Link
                className="text-sm font-semibold text-white/42 transition hover:text-white"
                href={localizedPath(locale, route.path)}
                key={route.key}
              >
                {copy.nav[route.key]}
              </Link>
            ))}
          </div>
        </div>

        <div>
          <p className="text-sm font-black uppercase tracking-[0.18em] text-[#39ff14]">
            {copy.nav.contact}
          </p>
          <div className="mt-5 grid gap-3 text-sm text-white/42">
            <a className="transition hover:text-foreground" href={`tel:${brand.phone}`}>
              {brand.phone}
            </a>
            <a className="transition hover:text-foreground" href={`mailto:${brand.email}`}>
              {brand.email}
            </a>
            <p>{brand.address[locale]}</p>
          </div>
          <div className="mt-6 flex flex-wrap gap-2">
            {brand.social.map((item) => (
              <a
                className="border border-white/12 bg-white/[0.035] px-3 py-2 text-xs font-bold uppercase tracking-[0.12em] text-white/42 transition hover:border-[#39ff14] hover:text-[#39ff14]"
                href={item.href}
                key={item.label}
                rel="noreferrer"
                target="_blank"
              >
                {item.label}
              </a>
            ))}
          </div>
        </div>
      </div>

      <div className="relative mx-auto mt-8 flex max-w-[94rem] flex-col gap-3 text-xs text-white/28 md:flex-row md:items-center md:justify-between">
        <p>
          © {year} {brand.name}. {copy.footer.rights}
        </p>
        <p>
          {locale === 'ar'
            ? 'هوية خضراء وبيضاء وسوداء مستوحاة من علامة Pro Gym.'
            : 'Green, white, and black brand system powered by the Pro Gym mark.'}
        </p>
      </div>
    </footer>
  );
}
