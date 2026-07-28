'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { ArrowUpRight, LogIn, LogOut, Menu, UserRound, X } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import type { PublicLocale } from '@progym/shared';

import { useAuth, type SessionUser } from '@/lib/auth/use-auth';
import { apiRequest, jsonBody } from '@/lib/api/client';

const navCopy = {
  ar: {
    about: 'من نحن',
    contact: 'تواصل',
    dashboard: 'لوحة التحكم',
    features: 'المميزات',
    home: 'الرئيسية',
    login: 'دخول',
    logout: 'تسجيل الخروج',
    logoutBody: 'هل تريد تسجيل الخروج من حسابك؟',
    logoutCancel: 'البقاء',
    logoutConfirm: 'تأكيد تسجيل الخروج',
    logoutConfirmBody: 'سيتم إنهاء جلستك الحالية وإعادتك إلى الموقع العام. هل أنت متأكد؟',
    logoutConfirmTitle: 'تأكيد الخروج',
    logoutTitle: 'حساب Pro Gym',
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
    login: 'Login',
    logout: 'Log out',
    logoutBody: 'Do you want to log out of your account?',
    logoutCancel: 'Stay signed in',
    logoutConfirm: 'Confirm logout',
    logoutConfirmBody:
      'Your current session will end and you will return to the public site. Are you sure?',
    logoutConfirmTitle: 'Confirm logout',
    logoutTitle: 'Pro Gym account',
    menu: 'Menu',
    pricing: 'Pricing',
    start: 'Start Managing',
    status: 'Gym system operating live',
  },
} as const;

function accountGreeting(user: SessionUser, locale: PublicLocale) {
  if (locale === 'en') {
    const username = user.username.split('.').at(-1) ?? user.username;
    const name = `${username.charAt(0).toUpperCase()}${username.slice(1)}`;
    return user.role === 'COACH' ? `Hello Coach ${name}` : `Hello ${name}`;
  }

  const firstName = user.fullName.trim().split(/\s+/)[0] || user.username;
  return user.role === 'COACH' ? `مرحباً كابتن ${firstName}` : `مرحباً ${firstName}`;
}

function dashboardPath(user: SessionUser, locale: PublicLocale) {
  if (user.role === 'ADMIN' || user.role === 'OBSERVER') return '/ar/dashboard/admin';
  if (user.role === 'COACH') return '/ar/dashboard/coach';
  return `/${locale}/dashboard/member`;
}

export function PublicNav({ locale }: { locale: PublicLocale }) {
  const [open, setOpen] = useState(false);
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [logoutConfirming, setLogoutConfirming] = useState(false);
  const auth = useAuth();
  const queryClient = useQueryClient();
  const pathname = usePathname();
  const content = navCopy[locale];
  const user = auth.data;
  const logout = useMutation({
    mutationFn: () => apiRequest('/auth/logout', { body: jsonBody({}), method: 'POST' }),
    onSuccess: () => {
      queryClient.clear();
      setLogoutOpen(false);
      setLogoutConfirming(false);
    },
  });
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
    { href: `/${locale}/about`, label: content.about },
    { href: `/${locale}/contact`, label: content.contact },
  ];
  const isActive = (href: string) =>
    href === `/${locale}`
      ? pathname === href
      : pathname === href || pathname.startsWith(`${href}/`);
  const closeAccountDialog = () => {
    setLogoutOpen(false);
    setLogoutConfirming(false);
  };

  useEffect(() => {
    if (!logoutOpen) return;
    const previousOverflow = document.body.style.overflow;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeAccountDialog();
    };
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [logoutOpen]);

  return (
    <header className="fixed inset-x-0 top-0 z-[70] text-white">
      <nav className="relative z-[72] flex h-[4.75rem] w-full items-center justify-between gap-2 border-b border-white/14 bg-black/55 px-3 backdrop-blur-xl sm:px-5 md:px-8 lg:px-10">
        <Link
          aria-label="Pro Gym"
          className="group flex shrink-0 items-center gap-3"
          href={`/${locale}`}
        >
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
          <span className="hidden text-xs font-black uppercase tracking-[0.22em] min-[470px]:inline">
            Pro Gym®
          </span>
        </Link>

        <div className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-2 lg:flex">
          {links.map((link) => (
            <Link
              aria-current={isActive(link.href) ? 'page' : undefined}
              className={`border px-4 py-2.5 text-[0.56rem] font-black uppercase tracking-[0.16em] transition duration-300 ${
                isActive(link.href)
                  ? 'border-[#39ff14] bg-[#39ff14] text-black'
                  : 'border-white/12 bg-white/[0.045] text-white/62 hover:border-[#39ff14]/60 hover:bg-[#39ff14]/10 hover:text-[#39ff14]'
              }`}
              href={link.href}
              key={link.href}
            >
              {link.label}
            </Link>
          ))}
        </div>

        <div className="flex min-w-0 items-center gap-1.5 sm:gap-2 lg:gap-3">
          <Link
            aria-label={otherLocale === 'ar' ? 'العربية' : 'English'}
            className="flex h-10 min-w-9 items-center justify-center border border-white/12 bg-white/[0.035] px-1.5 text-[0.55rem] font-black uppercase tracking-[0.1em] text-white/55 transition hover:border-[#39ff14] hover:text-[#39ff14] sm:min-w-10 sm:px-2 sm:text-[0.58rem]"
            href={switchedPath}
          >
            {otherLocale}
          </Link>
          {user ? (
            <button
              className="group flex h-10 min-w-0 max-w-[8.8rem] items-center gap-1.5 bg-[#39ff14] px-2.5 text-[0.58rem] font-black text-black transition hover:bg-white sm:max-w-[12rem] sm:px-3 md:h-auto md:max-w-none md:gap-3 md:px-4 md:py-3 md:text-[0.62rem]"
              onClick={() => {
                setLogoutConfirming(false);
                setLogoutOpen(true);
              }}
              type="button"
            >
              <UserRound className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{accountGreeting(user, locale)}</span>
            </button>
          ) : (
            <Link
              className="group flex h-10 items-center gap-1.5 bg-[#39ff14] px-2.5 text-[0.58rem] font-black text-black transition hover:bg-white sm:px-3 md:h-auto md:gap-3 md:px-4 md:py-3 md:text-[0.62rem]"
              href={`/${locale}/login`}
            >
              <LogIn className="h-3.5 w-3.5 shrink-0" />
              <span>{content.login}</span>
            </Link>
          )}
          <button
            aria-expanded={open}
            aria-label={content.menu}
            className="flex h-10 shrink-0 items-center gap-2 border border-white/14 bg-black/35 px-3 text-[0.58rem] font-black uppercase tracking-[0.12em] transition hover:border-[#39ff14]/55 hover:text-[#39ff14] sm:h-11 sm:px-4 sm:text-[0.62rem]"
            onClick={() => setOpen((value) => !value)}
            type="button"
          >
            <span className="hidden sm:inline">{content.menu}</span>
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
                      aria-current={isActive(link.href) ? 'page' : undefined}
                      className={`group flex items-center gap-5 border-b border-white/10 px-4 py-3 text-[clamp(2.4rem,5.2vw,5.5rem)] font-black uppercase leading-none tracking-[-0.06em] transition ${
                        isActive(link.href)
                          ? 'bg-[#39ff14] text-black'
                          : 'text-white hover:text-[#39ff14]'
                      }`}
                      href={link.href}
                      onClick={() => setOpen(false)}
                    >
                      <span className="w-6 text-[0.55rem] font-black tracking-normal text-[#39ff14]">
                        0{index + 1}
                      </span>
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
                    src="/images/gym/optimized/gym-06.webp"
                  />
                  <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent,rgba(0,0,0,0.68))]" />
                  <div className="absolute inset-x-4 bottom-4 flex items-end justify-between">
                    <p className="max-w-32 text-xs font-bold uppercase tracking-[0.14em] text-white/62">
                      Real gym. One smart system.
                    </p>
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

      {typeof document !== 'undefined' && logoutOpen && user
        ? createPortal(
            <div className="fixed inset-0 z-[160] flex items-end justify-center bg-black/80 p-3 backdrop-blur-md sm:items-center">
              <button
                aria-label={content.logoutCancel}
                className="absolute inset-0"
                onClick={closeAccountDialog}
                type="button"
              />
              <section
                aria-modal="true"
                aria-labelledby="public-account-dialog-title"
                className="relative z-10 w-full max-w-md overflow-hidden border border-white/14 bg-[#080a08] p-6 text-white shadow-[0_30px_100px_rgba(0,0,0,0.7)]"
                role="dialog"
              >
                <div className="absolute inset-x-0 top-0 h-1 bg-[#39ff14]" />
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[0.58rem] font-black uppercase tracking-[0.2em] text-[#39ff14]">
                      {logoutConfirming ? content.logoutConfirmTitle : content.logoutTitle}
                    </p>
                    <h2 className="mt-3 text-2xl font-black" id="public-account-dialog-title">
                      {accountGreeting(user, locale)}
                    </h2>
                  </div>
                  <button
                    aria-label={content.logoutCancel}
                    className="flex h-10 w-10 shrink-0 items-center justify-center border border-white/14 text-white/60 transition hover:border-[#39ff14] hover:text-[#39ff14]"
                    onClick={closeAccountDialog}
                    type="button"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <p className="mt-5 border-s border-white/16 ps-4 text-sm leading-7 text-white/52">
                  {logoutConfirming ? content.logoutConfirmBody : content.logoutBody}
                </p>
                {logoutConfirming ? (
                  <div className="mt-7 grid grid-cols-2 gap-2">
                    <button
                      className="min-h-12 border border-white/14 px-4 text-xs font-black transition hover:border-white/45"
                      onClick={() => setLogoutConfirming(false)}
                      type="button"
                    >
                      {content.logoutCancel}
                    </button>
                    <button
                      className="flex min-h-12 items-center justify-center gap-2 bg-red-500 px-4 text-xs font-black text-white transition hover:bg-red-400 disabled:opacity-50"
                      disabled={logout.isPending}
                      onClick={() => logout.mutate()}
                      type="button"
                    >
                      <LogOut className="h-4 w-4" />
                      {content.logoutConfirm}
                    </button>
                  </div>
                ) : (
                  <div className="mt-7 grid grid-cols-2 gap-2">
                    <Link
                      className="col-span-2 flex min-h-12 items-center justify-center gap-2 border border-[#39ff14]/50 bg-[#39ff14]/10 px-4 text-xs font-black text-[#39ff14] transition hover:bg-[#39ff14] hover:text-black"
                      href={dashboardPath(user, locale)}
                      onClick={closeAccountDialog}
                    >
                      {content.dashboard}
                      <ArrowUpRight className="h-4 w-4" />
                    </Link>
                    <button
                      className="min-h-12 border border-white/14 px-4 text-xs font-black transition hover:border-white/45"
                      onClick={closeAccountDialog}
                      type="button"
                    >
                      {content.logoutCancel}
                    </button>
                    <button
                      className="flex min-h-12 items-center justify-center gap-2 bg-[#39ff14] px-4 text-xs font-black text-black transition hover:bg-white"
                      onClick={() => setLogoutConfirming(true)}
                      type="button"
                    >
                      <LogOut className="h-4 w-4" />
                      {content.logout}
                    </button>
                  </div>
                )}
              </section>
            </div>,
            document.body,
          )
        : null}
    </header>
  );
}
