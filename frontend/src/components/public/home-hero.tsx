'use client';

import { gsap } from 'gsap';
import { ArrowDown, ArrowUpRight, Check, ScanLine } from 'lucide-react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useLayoutEffect, useRef } from 'react';
import type { PublicLocale } from '@progym/shared';

import { HeroSplash } from '@/components/public/hero-splash';

const HeroBoltScene = dynamic(
  () => import('@/components/public/hero-bolt-scene').then((module) => module.HeroBoltScene),
  {
    loading: () => <div className="hero-bolt-fallback h-full w-full" />,
    ssr: false,
  },
);

const copy = {
  ar: {
    attendance: 'الحضور',
    body: 'الأعضاء، المدربون، الاشتراكات، الحضور، التمارين والتقدم — منظومة واحدة تدير كل شيء.',
    coaches: 'المدربون',
    eyebrow: 'نظام إدارة الأندية الرياضية',
    members: 'الأعضاء النشطون',
    primary: 'ابدأ الإدارة',
    proof: 'تشغيل لحظي. رؤية كاملة. قرارات أسرع.',
    secondary: 'شاهد لوحة التحكم',
    titleBottom: 'كمنظومة ذكية.',
    titleTop: 'أدر ناديك',
  },
  en: {
    attendance: 'Attendance',
    body: 'Members, coaches, subscriptions, attendance, workouts, and progress — one operating system controlling everything.',
    coaches: 'Coaches',
    eyebrow: 'The gym management operating system',
    members: 'Active members',
    primary: 'Start Managing',
    proof: 'Live operations. Total visibility. Faster decisions.',
    secondary: 'View Dashboard',
    titleBottom: 'like a machine.',
    titleTop: 'Manage your gym',
  },
} as const;

function HeroStats({
  content,
  locale,
}: {
  content: (typeof copy)[PublicLocale];
  locale: PublicLocale;
}) {
  return (
    <div
      className={`relative z-20 order-3 w-full border border-white/12 bg-white/[0.035] p-4 backdrop-blur-md lg:row-start-2 lg:mb-4 ${
        locale === 'ar'
          ? 'lg:col-start-2 lg:ms-8 lg:w-[calc(100%-2rem)]'
          : 'lg:col-start-1'
      }`}
      data-hero-copy
    >
      <div className="flex items-center justify-between border-b border-white/10 pb-3">
        <div className="flex items-center gap-2 text-[0.55rem] font-black uppercase tracking-[0.18em] text-white/48">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#39ff14] shadow-[0_0_12px_#39ff14]" />
          {locale === 'ar' ? 'العمليات المباشرة' : 'Live operations'}
        </div>
        <span className="text-[0.5rem] font-bold uppercase tracking-[0.16em] text-white/24">
          System / 02.07
        </span>
      </div>
      <div className="grid grid-cols-3 pt-4">
        {[
          ['248', content.members, [30, 52, 44, 72, 58, 88]],
          ['18', content.coaches, [45, 62, 54, 78, 68, 92]],
          ['94%', content.attendance, [38, 48, 64, 59, 82, 94]],
        ].map(([value, label, bars], metricIndex) => (
          <div
            className={`min-w-0 ${metricIndex > 0 ? 'border-s border-white/10 ps-3 sm:ps-4' : 'pe-3 sm:pe-4'}`}
            key={String(label)}
          >
            <div className="flex items-end justify-between gap-1 sm:gap-2">
              <p className="text-xl font-black tracking-[-0.06em] text-white sm:text-2xl">
                {String(value)}
              </p>
              <span className="mb-1 hidden text-[0.48rem] font-black text-[#39ff14] min-[390px]:inline">
                +{metricIndex + 3}.2%
              </span>
            </div>
            <p className="mt-1 truncate text-[0.55rem] font-semibold text-white/38 sm:text-[0.58rem]">
              {String(label)}
            </p>
            <div className="mt-3 flex h-5 items-end gap-1">
              {(bars as number[]).map((height, index) => (
                <span
                  className="flex-1 bg-[#39ff14]/65 shadow-[0_0_8px_rgba(57,255,20,0.14)]"
                  key={`${height}-${index}`}
                  style={{ height: `${height}%` }}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function HomeHero({ locale }: { locale: PublicLocale }) {
  const rootRef = useRef<HTMLElement>(null);
  const content = copy[locale];

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const context = gsap.context(() => {
      const timeline = gsap.timeline({
        delay: 2.25,
        defaults: { ease: 'power4.out' },
      });

      timeline
        .from('[data-hero-kicker]', { duration: 0.72, opacity: 0, y: 18 })
        .from(
          '[data-massive-line]',
          {
            duration: 1.05,
            opacity: 0,
            rotateX: -22,
            stagger: 0.12,
            transformOrigin: '50% 100%',
            yPercent: 112,
          },
          '-=0.38',
        )
        .from('[data-hero-copy]', { duration: 0.75, opacity: 0, y: 24 }, '-=0.62')
        .from('[data-hero-action]', { duration: 0.68, opacity: 0, stagger: 0.08, y: 18 }, '-=0.52')
        .from('[data-bolt-stage]', { duration: 0.95, opacity: 0, scale: 0.96, x: 46 }, '-=1.08')
        .from('[data-orbit-label]', { duration: 0.58, opacity: 0, scale: 0.82, stagger: 0.08 }, '-=0.58');
    }, root);

    return () => context.revert();
  }, []);

  return (
    <>
      <HeroSplash locale={locale} />
      <section
        className="home-cinematic-hero relative isolate min-h-[100svh] overflow-x-hidden bg-[#050605] text-white lg:h-[100svh] lg:min-h-0 lg:overflow-hidden"
        id="home"
        ref={rootRef}
      >
        <div className="home-hero-grid absolute inset-0 opacity-25" />
        <div className="home-hero-noise absolute inset-0 opacity-[0.1]" />
        <div className="absolute right-[-8rem] top-[42%] h-[44rem] w-[44rem] -translate-y-1/2 rounded-full bg-[#39ff14]/[0.065] blur-[125px]" />
        <div className="absolute inset-x-0 top-[5.9rem] h-px bg-white/10" />

        <div
          className="relative z-10 mx-auto grid min-h-[100svh] max-w-[94rem] grid-cols-1 grid-rows-[auto_26rem_auto] gap-3 px-5 pb-6 pt-24 [direction:ltr] md:grid-rows-[auto_32rem_auto] md:px-8 md:pt-28 lg:h-full lg:min-h-0 lg:grid-cols-[0.92fr_1.08fr] lg:grid-rows-[1fr_auto] lg:gap-x-5 lg:gap-y-0 lg:px-10 lg:pb-5 lg:pt-24 xl:px-14"
        >
          <div
            className={`relative z-20 order-1 flex flex-col justify-center py-4 lg:row-start-1 ${
              locale === 'ar'
                ? 'lg:col-start-2 lg:py-8 lg:ps-8'
                : 'lg:col-start-1 lg:py-4 xl:py-8'
            }`}
            dir={locale === 'ar' ? 'rtl' : 'ltr'}
          >
            <div
              className="inline-flex w-fit items-center gap-3 text-[0.58rem] font-black uppercase tracking-[0.28em] text-white/48"
              data-hero-kicker
            >
              <span className="h-2 w-2 rounded-full bg-[#39ff14] shadow-[0_0_16px_#39ff14]" />
              {content.eyebrow}
            </div>

            <h1
              className={`mt-5 uppercase ${
                locale === 'ar'
                  ? 'font-ar-display font-extrabold leading-[0.98] tracking-[-0.045em]'
                  : 'font-black leading-[0.84] tracking-[-0.07em]'
              }`}
            >
              <span className="block overflow-hidden pb-[0.16em]">
                <span
                  className={`block text-white ${
                    locale === 'ar'
                      ? 'text-[clamp(2.45rem,3.7vw,4.4rem)]'
                      : 'text-[clamp(3.15rem,5.65vw,6.35rem)]'
                  }`}
                  data-massive-line
                >
                  {content.titleTop}
                </span>
              </span>
              <span className="block overflow-hidden pb-[0.16em]">
                <span
                  className={`block text-[#39ff14] ${
                    locale === 'ar'
                      ? 'text-[clamp(2.05rem,3.25vw,3.8rem)]'
                      : 'text-[clamp(2.8rem,5vw,5.65rem)]'
                  }`}
                  data-massive-line
                >
                  {content.titleBottom}
                </span>
              </span>
            </h1>

            <div
              className={`mt-4 max-w-xl border-s border-white/16 ps-5 ${
                locale === 'ar' ? 'lg:mt-6' : 'lg:mt-4'
              }`}
              data-hero-copy
            >
              <p className="text-sm font-medium leading-7 text-white/52 md:text-base md:leading-8">{content.body}</p>
              <div className="mt-3 flex items-center gap-2 text-[0.58rem] font-bold uppercase tracking-[0.15em] text-white/30">
                <Check className="h-3.5 w-3.5 shrink-0 text-[#39ff14]" />
                {content.proof}
              </div>
            </div>

            <div
              className={`mt-5 flex flex-col gap-2 sm:flex-row ${
                locale === 'ar' ? 'lg:mt-8' : 'lg:mt-5'
              }`}
            >
              <Link
                className="group inline-flex min-h-14 items-center justify-between gap-8 bg-[#39ff14] px-6 text-xs font-black text-black transition hover:bg-white"
                data-hero-action
                href={`/${locale}/register`}
              >
                {content.primary}
                <ArrowUpRight className="h-4 w-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 rtl:group-hover:-translate-x-0.5" />
              </Link>
              <Link
                className="inline-flex min-h-14 items-center justify-between gap-8 border border-white/18 bg-black/35 px-6 text-xs font-bold text-white backdrop-blur-md transition hover:border-white/50"
                data-hero-action
                href={`/${locale}/login`}
              >
                {content.secondary}
                <ScanLine className="h-4 w-4 text-[#39ff14]" />
              </Link>
            </div>

          </div>

          <div
            className={`relative z-10 order-2 min-h-0 lg:row-span-2 lg:row-start-1 ${
              locale === 'ar' ? 'lg:col-start-1' : 'lg:col-start-2'
            }`}
            data-bolt-stage
          >
            <div className="absolute inset-y-0 left-1/2 w-[108%] -translate-x-1/2 sm:w-full lg:inset-y-[5%] lg:w-[112%]">
              <div
                aria-hidden="true"
                className="absolute inset-0 z-0 flex items-center justify-center overflow-hidden"
              >
                <span
                  className="select-none whitespace-nowrap text-[clamp(5.8rem,10vw,10.5rem)] font-black uppercase leading-none tracking-[-0.09em] text-transparent opacity-35"
                  style={{ WebkitTextStroke: '1px rgba(255,255,255,0.3)' }}
                >
                  PRO<span className="text-[#39ff14]/10" style={{ WebkitTextStroke: '1px rgba(57,255,20,0.48)' }}>GYM</span>
                </span>
              </div>
              <div
                className="hero-orbit-line absolute z-[1] rounded-[50%] border border-[#39ff14]/28 shadow-[0_0_80px_rgba(57,255,20,0.11)]"
                style={{ animationDuration: '13s', inset: '21% 27%' }}
              />
              <div
                className="hero-orbit-line absolute z-[1] rounded-[50%] border border-white/16"
                style={{ animationDirection: 'reverse', animationDuration: '17s', inset: '16% 21%' }}
              />
              <div
                className="hero-orbit-line absolute z-[1] rounded-[50%] border border-dashed border-[#39ff14]/16"
                style={{ animationDuration: '22s', inset: '11% 15%' }}
              />
              <div
                className="hero-orbit-line absolute z-[1] rounded-[50%] border border-white/8"
                style={{ animationDirection: 'reverse', animationDuration: '27s', inset: '7% 10%' }}
              />
              <div
                className="hero-orbit-line absolute z-[1] rounded-[50%] border border-dotted border-[#39ff14]/12"
                style={{ animationDuration: '32s', inset: '3% 5%' }}
              />
              <div className="relative z-[2] h-full w-full">
                <HeroBoltScene />
              </div>
            </div>

            <div
              className="absolute left-[6%] top-[21%] hidden items-center gap-3 text-[0.5rem] font-bold uppercase tracking-[0.17em] text-white/30 md:flex"
              data-orbit-label
            >
              <span className="h-px w-10 bg-white/18" />
              <span>Energy / control</span>
            </div>
            <div
              className="absolute bottom-[18%] right-[3%] hidden items-center gap-3 text-[0.5rem] font-bold uppercase tracking-[0.17em] text-white/30 md:flex"
              data-orbit-label
            >
              <span>System online</span>
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#39ff14] shadow-[0_0_12px_#39ff14]" />
            </div>
          </div>

          <HeroStats content={content} locale={locale} />
        </div>

        <a
          aria-label="Scroll to features"
          className="absolute bottom-6 left-1/2 z-30 hidden h-12 w-12 -translate-x-1/2 items-center justify-center rounded-full border border-white/16 text-white/45 transition hover:border-[#39ff14] hover:text-[#39ff14] lg:flex"
          href="#features"
        >
          <ArrowDown className="h-4 w-4" />
        </a>
        <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-[#39ff14]/50 to-transparent" />
      </section>
    </>
  );
}
