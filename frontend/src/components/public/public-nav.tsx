'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { ArrowUpRight, Menu, X } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useMemo, useState } from 'react';
import type { PublicLocale } from '@progym/shared';

const navCopy = {
  ar: {
    about: 'من نحن',
    contact: 'تواصل',
    dashboard: 'لوحة التحكم',
    features: 'المميزات',
    home: 'الرئيسية',
    menu: 'القائمة',
    pricing: 'الاشتراكات',
    start: 'ابدأ الإدارة',
    status: 'نظام النادي يعمل الآن',
  },
  en: {
    about: 'About us',
    contact: 'Contact',
    dashboard: 'Dashboard',
    features: 'Features',
    home: 'Home',
    menu: 'Menu',
    pricing: 'Pricing',
    start: 'Start Managing',
    status: 'Gym system operating live',
  },
} as const;

export function PublicNav({ locale }: { locale: PublicLocale }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const content = navCopy[locale];
  const otherLocale: PublicLocale = locale === 'ar' ? 'en' : 'ar';
  const switchedPath = useMemo(() => {
    const parts = pathname.split('/').filter(Boolean);
    if (parts[0] === 'ar' || parts[0] === 'en') {
      parts[0] = otherLocale;
      return `/${parts.join('/')}`;
    }
    return `/${otherLocale}`;
  }, [otherLocale, pathname]);

  const links = [
    { href: `/${locale}`, label: content.home },
    { href: `/${locale}#features`, label: content.features },
    { href: `/${locale}/about`, label: content.about },
    { href: `/${locale}/login`, label: content.dashboard },
    { href: `/${locale}/membership`, label: content.pricing },
    { href: `/${locale}/contact`, label: content.contact },
  ];

  return (
    <header className="fixed inset-x-0 top-0 z-[70] px-4 pt-4 text-white md:px-7 md:pt-5">
      <nav className="relative z-[72] mx-auto flex h-16 max-w-[94rem] items-center justify-between border-b border-white/14 bg-black/25 px-1 backdrop-blur-md">
        <Link aria-label="Pro Gym" className="group flex items-center gap-3" href={`/${locale}`}>
          <span className="relative h-11 w-9 overflow-hidden bg-black">
            <Image
              alt="Pro Gym"
              className="scale-[1.42] object-cover transition duration-500 group-hover:scale-[1.52]"
              fill
              priority
              sizes="36px"
              src="/images/gym/log_bw.jpeg"
            />
          </span>
          <span className="text-xs font-black uppercase tracking-[0.22em]">Pro Gym®</span>
        </Link>

        <div className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-3 text-[0.52rem] font-bold uppercase tracking-[0.2em] text-white/34 lg:flex">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#39ff14] shadow-[0_0_12px_#39ff14]" />
          {content.status}
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden items-center gap-2 lg:flex">
            <Link
              className="border border-white/12 bg-white/[0.045] px-4 py-2.5 text-[0.56rem] font-black uppercase tracking-[0.16em] text-white/62 backdrop-blur-md transition duration-300 hover:border-[#39ff14]/60 hover:bg-[#39ff14]/10 hover:text-[#39ff14]"
              href={`/${locale}/about`}
            >
              {content.about}
            </Link>
            <Link
              className="border border-white/12 bg-white/[0.045] px-4 py-2.5 text-[0.56rem] font-black uppercase tracking-[0.16em] text-white/62 backdrop-blur-md transition duration-300 hover:border-[#39ff14]/60 hover:bg-[#39ff14]/10 hover:text-[#39ff14]"
              href={`/${locale}/contact`}
            >
              {content.contact}
            </Link>
          </div>
          <Link
            className="hidden text-[0.58rem] font-black uppercase tracking-[0.18em] text-white/45 transition hover:text-[#39ff14] sm:block"
            href={switchedPath}
          >
            {otherLocale}
          </Link>
          <Link
            className="group hidden items-center gap-4 bg-[#39ff14] px-4 py-3 text-[0.62rem] font-black text-black transition hover:bg-white md:flex"
            href={`/${locale}/register`}
          >
            {content.start}
            <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
          </Link>
          <button
            aria-expanded={open}
            aria-label={content.menu}
            className="flex h-11 items-center gap-3 border border-white/14 bg-black/35 px-4 text-[0.62rem] font-black uppercase tracking-[0.16em] transition hover:border-[#39ff14]/55 hover:text-[#39ff14]"
            onClick={() => setOpen((value) => !value)}
            type="button"
          >
            {content.menu}
            {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>
      </nav>

      <AnimatePresence>
        {open ? (
          <motion.div
            animate={{ clipPath: 'inset(0 0 0% 0)' }}
            className="fixed inset-0 z-[71] overflow-hidden bg-[#070907]"
            exit={{ clipPath: 'inset(0 0 100% 0)' }}
            initial={{ clipPath: 'inset(0 0 100% 0)' }}
            transition={{ duration: 0.78, ease: [0.76, 0, 0.24, 1] }}
          >
            <div className="home-hero-grid absolute inset-0 opacity-20" />
            <div className="home-hero-noise absolute inset-0 opacity-10" />
            <div className="mx-auto grid h-full max-w-[94rem] grid-cols-1 px-5 pb-7 pt-28 md:grid-cols-[1.1fr_0.9fr] md:px-8 md:pt-32">
              <div className="relative z-10 flex flex-col justify-center">
                {links.map((link, index) => (
                  <motion.div
                    animate={{ opacity: 1, y: 0 }}
                    initial={{ opacity: 0, y: 42 }}
                    key={link.href}
                    transition={{ delay: 0.25 + index * 0.06, duration: 0.55 }}
                  >
                    <Link
                      className="group flex items-center gap-5 border-b border-white/10 py-3 text-[clamp(2.4rem,5.2vw,5.5rem)] font-black uppercase leading-none tracking-[-0.06em] text-white transition hover:text-[#39ff14]"
                      href={link.href}
                      onClick={() => setOpen(false)}
                    >
                      <span className="w-6 text-[0.55rem] font-black tracking-normal text-[#39ff14]">0{index + 1}</span>
                      {link.label}
                      <ArrowUpRight className="ms-auto h-6 w-6 translate-y-2 opacity-0 transition duration-300 group-hover:translate-y-0 group-hover:opacity-100 md:h-9 md:w-9" />
                    </Link>
                  </motion.div>
                ))}
              </div>

              <div className="relative hidden items-center justify-center md:flex">
                <div className="relative aspect-[4/5] w-[62%] overflow-hidden border border-white/12">
                  <Image
                    alt="Pro Gym"
                    className="object-cover grayscale"
                    fill
                    sizes="32vw"
                    src="/images/gym/WhatsApp Image 2026-07-01 at 2.31.30 PM (6).jpeg"
                  />
                  <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent,rgba(0,0,0,0.68))]" />
                  <div className="absolute inset-x-4 bottom-4 flex items-end justify-between">
                    <p className="max-w-32 text-xs font-bold uppercase tracking-[0.14em] text-white/62">Real gym. One smart system.</p>
                    <span className="text-3xl font-black text-[#39ff14]">PG</span>
                  </div>
                </div>
              </div>

              <div className="absolute inset-x-5 bottom-5 flex items-end justify-between border-t border-white/10 pt-4 text-[0.52rem] font-bold uppercase tracking-[0.18em] text-white/30 md:inset-x-8">
                <span>Homs / Syria</span>
                <span>© 2026 Pro Gym System</span>
              </div>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </header>
  );
}
