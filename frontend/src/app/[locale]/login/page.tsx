import { Activity, ArrowLeft, ArrowRight, ShieldCheck } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import type { PublicLocale } from '@progym/shared';

import { LoginForm } from '@/features/auth/auth-forms';

const pageCopy = {
  ar: {
    back: 'العودة للرئيسية',
    badge: 'بوابة الأعضاء الآمنة',
    caption: 'نظام واحد يربط تدريبك، حضورك، خطتك، وتقدمك.',
    eyebrow: 'أهلاً بعودتك',
    metric: 'النظام يعمل الآن',
    title: 'عد إلى خطتك. واصل من حيث توقفت.',
  },
  en: {
    back: 'Back to home',
    badge: 'Secure member gateway',
    caption: 'One system connecting your training, attendance, plan, and progress.',
    eyebrow: 'Welcome back',
    metric: 'System operating live',
    title: 'Return to your plan. Continue where you stopped.',
  },
} as const;

export default async function LoginPage({ params }: { params: Promise<{ locale: PublicLocale }> }) {
  const { locale } = await params;
  const copy = pageCopy[locale];
  const otherLocale = locale === 'ar' ? 'en' : 'ar';
  const DirectionArrow = locale === 'ar' ? ArrowRight : ArrowLeft;

  return (
    <main className="home-cinematic-hero relative min-h-screen overflow-hidden bg-[#050605] text-white">
      <div className="home-hero-grid absolute inset-0 opacity-20" />
      <div className="home-hero-noise absolute inset-0 opacity-[0.08]" />
      <div className="absolute start-[48%] top-1/2 h-[34rem] w-[34rem] -translate-y-1/2 rounded-full bg-[#39ff14]/[0.055] blur-3xl" />

      <header className="absolute inset-x-0 top-0 z-30 flex items-center justify-between px-5 py-5 md:px-8 lg:px-10">
        <Link className="group flex items-center gap-3" href={`/${locale}`}>
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
        <div className="flex items-center gap-3">
          <Link
            className="text-[0.58rem] font-black uppercase tracking-[0.18em] text-white/42 transition hover:text-[#39ff14]"
            href={`/${otherLocale}/login`}
          >
            {otherLocale}
          </Link>
          <Link
            className="group flex items-center gap-3 border border-white/12 bg-white/[0.035] px-4 py-3 text-[0.58rem] font-black uppercase tracking-[0.14em] text-white/62 backdrop-blur-md transition hover:border-[#39ff14]/60 hover:text-[#39ff14]"
            href={`/${locale}`}
          >
            <DirectionArrow className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5 rtl:group-hover:translate-x-0.5" />
            <span className="hidden sm:inline">{copy.back}</span>
          </Link>
        </div>
      </header>

      <div className="relative z-10 grid min-h-screen lg:grid-cols-[1.08fr_0.92fr]">
        <section className="relative hidden min-h-screen overflow-hidden border-e border-white/10 lg:block">
          <Image
            alt="Pro Gym training floor"
            className="object-cover grayscale"
            fill
            priority
            sizes="55vw"
            src="/images/gym/optimized/gym-05.webp"
          />
          <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(3,5,3,0.2),rgba(3,5,3,0.82)),linear-gradient(180deg,rgba(3,5,3,0.15),rgba(3,5,3,0.88))]" />
          <div className="home-hero-grid absolute inset-0 opacity-20" />
          <div className="absolute inset-x-10 bottom-10">
            <div className="mb-8 flex items-center gap-3 text-[0.58rem] font-black uppercase tracking-[0.2em] text-[#39ff14]">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#39ff14] shadow-[0_0_12px_#39ff14]" />
              {copy.metric}
            </div>
            <h1
              className={`max-w-4xl font-black ${
                locale === 'ar'
                  ? 'font-ar-display text-[clamp(3.2rem,5.5vw,6.6rem)] leading-[1.14] tracking-[-0.04em]'
                  : 'text-[clamp(3.6rem,6.2vw,7.4rem)] uppercase leading-[0.93] tracking-[-0.07em]'
              }`}
            >
              {copy.title}
            </h1>
            <div className="mt-8 flex max-w-2xl items-center justify-between gap-8 border-t border-white/18 pt-5">
              <p className="max-w-md text-sm leading-7 text-white/48">{copy.caption}</p>
              <span className="shrink-0 text-[0.56rem] font-black uppercase tracking-[0.18em] text-white/30">Homs / 2026</span>
            </div>
          </div>
          <div className="absolute start-8 top-28 flex items-center gap-3 border border-white/14 bg-black/35 px-4 py-3 text-[0.56rem] font-black uppercase tracking-[0.16em] text-white/55 backdrop-blur-md">
            <ShieldCheck className="h-4 w-4 text-[#39ff14]" />
            {copy.badge}
          </div>
        </section>

        <section className="relative flex min-h-screen items-center px-5 pb-12 pt-28 md:px-12 lg:px-[clamp(3rem,6vw,7rem)]">
          <div className="mx-auto w-full max-w-xl">
            <div className="mb-8 lg:hidden">
              <div className="flex items-center gap-3 text-[0.58rem] font-black uppercase tracking-[0.2em] text-[#39ff14]">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#39ff14] shadow-[0_0_12px_#39ff14]" />
                {copy.metric}
              </div>
              <h1
                className={`mt-5 max-w-2xl font-black leading-[0.96] ${
                  locale === 'ar'
                    ? 'font-ar-display text-[clamp(2.35rem,7vw,4.2rem)] leading-[1.16]'
                    : 'text-[clamp(2.5rem,7vw,4rem)] uppercase leading-[0.96] tracking-[-0.055em]'
                }`}
              >
                {copy.title}
              </h1>
            </div>

            <div className="mb-7 flex items-center justify-between border-b border-white/10 pb-5">
              <div>
                <p className="text-[0.58rem] font-black uppercase tracking-[0.2em] text-[#39ff14]">{copy.eyebrow}</p>
                <p className="mt-2 text-xs text-white/32">{copy.badge}</p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center border border-white/12 bg-white/[0.035]">
                <Activity className="h-5 w-5 text-[#39ff14]" />
              </div>
            </div>
            <LoginForm locale={locale} />
          </div>
        </section>
      </div>
    </main>
  );
}
