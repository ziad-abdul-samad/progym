import Image from 'next/image';
import Link from 'next/link';
import type { PublicLocale } from '@progym/shared';

import { brand, localizedPath, publicCopy, publicRoutes } from '@/lib/public/content';

export function PublicFooter({ locale }: { locale: PublicLocale }) {
  const copy = publicCopy[locale];
  const year = new Date().getFullYear();

  return (
    <footer className="px-4 py-12 md:px-6 md:py-16">
      <div className="glass-panel mx-auto grid max-w-7xl gap-10 rounded-lg p-6 lg:grid-cols-[1.2fr_0.8fr_0.8fr] lg:p-10">
        <div>
          <Link className="inline-flex items-center gap-3" href={localizedPath(locale)}>
            <span className="relative h-14 w-14 overflow-hidden rounded-lg border border-border bg-white">
              <Image alt="Pro Gym logo" className="object-cover" fill sizes="56px" src={brand.logoColor} />
            </span>
            <span className="text-xl font-black uppercase tracking-[0.2em] text-foreground">Pro Gym</span>
          </Link>
          <p className="mt-5 max-w-md text-sm leading-7 text-muted-foreground">{copy.footer.body}</p>
        </div>

        <div>
          <p className="text-sm font-black uppercase tracking-[0.18em] text-brand-accent">
            {copy.footer.quick}
          </p>
          <div className="mt-5 grid gap-3">
            {publicRoutes.map((route) => (
              <Link
                className="text-sm font-semibold text-muted-foreground transition hover:text-foreground"
                href={localizedPath(locale, route.path)}
                key={route.key}
              >
                {copy.nav[route.key]}
              </Link>
            ))}
          </div>
        </div>

        <div>
          <p className="text-sm font-black uppercase tracking-[0.18em] text-brand-accent">
            {copy.nav.contact}
          </p>
          <div className="mt-5 grid gap-3 text-sm text-muted-foreground">
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
                className="rounded-full border border-border bg-white/50 px-3 py-2 text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground transition hover:border-brand-accent hover:text-green-700 dark:bg-white/5 dark:hover:text-brand-accent"
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

      <div className="mx-auto mt-8 flex max-w-7xl flex-col gap-3 border-t border-border pt-6 text-xs text-muted-foreground md:flex-row md:items-center md:justify-between">
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
