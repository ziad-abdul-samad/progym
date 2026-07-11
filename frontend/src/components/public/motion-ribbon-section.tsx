'use client';

import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { ArrowUpRight } from 'lucide-react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useLayoutEffect, useRef } from 'react';
import type { PublicLocale } from '@progym/shared';

const MotionRibbonScene = dynamic(
  () =>
    import('@/components/public/motion-ribbon-scene').then((module) => module.MotionRibbonScene),
  {
    loading: () => (
      <div className="h-full w-full bg-[radial-gradient(circle_at_center,rgba(57,255,20,0.12),transparent_42%)]" />
    ),
    ssr: false,
  },
);

const copy = {
  ar: {
    body: 'واجهات وبيانات وصور حقيقية تتحرك معاً لتعرض نبض النادي كنظام واحد.',
    leftWord: 'حركة',
    link: 'شاهد النظام',
    rightWord: 'تصميم',
    tag: 'تجارب النظام',
  },
  en: {
    body: 'Interfaces, live data, and real photography move together to reveal the gym as one connected system.',
    leftWord: 'MOTION',
    link: 'Explore the system',
    rightWord: 'DESIGNING',
    tag: 'System explorations',
  },
} as const;

export function MotionRibbonSection({ locale }: { locale: PublicLocale }) {
  const sectionRef = useRef<HTMLElement>(null);
  const progressRef = useRef(0);
  const content = copy[locale];
  const isArabic = locale === 'ar';

  useLayoutEffect(() => {
    const section = sectionRef.current;
    if (!section || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    gsap.registerPlugin(ScrollTrigger);
    const context = gsap.context(() => {
      const wipeStrips = gsap.utils.toArray<HTMLElement>('[data-ribbon-wipe]');
      const desktop = window.matchMedia('(min-width: 1024px)').matches;
      const wipeStart = desktop ? 0.769 : 0.667;
      const wipeEase = gsap.parseEase('power2.out');
      const leftWord = section.querySelector<HTMLElement>('[data-ribbon-word="left"]');
      const rightWord = section.querySelector<HTMLElement>('[data-ribbon-word="right"]');
      const words = gsap.utils.toArray<HTMLElement>('[data-ribbon-word]');
      const copyElements = gsap.utils.toArray<HTMLElement>('[data-ribbon-copy]');
      const moveLeftWord = leftWord
        ? gsap.quickTo(leftWord, 'x', { duration: 0.6, ease: 'power2.out' })
        : null;
      const moveRightWord = rightWord
        ? gsap.quickTo(rightWord, 'x', { duration: 0.6, ease: 'power2.out' })
        : null;

      gsap.set(wipeStrips, { scaleY: 0, transformOrigin: 'bottom' });
      gsap.set(words, { opacity: 1 });
      gsap.set(copyElements, { opacity: 1, y: 0 });
      ScrollTrigger.create({
        end: 'bottom bottom',
        onUpdate: (trigger) => {
          progressRef.current = trigger.progress;
          const wordEnd = desktop ? 0.35 : 0.29;
          const wordProgress = gsap.utils.clamp(0, 1, trigger.progress / wordEnd);
          moveLeftWord?.(
            gsap.utils.interpolate(
              window.innerWidth * 0.65,
              window.innerWidth * -0.45,
              wordProgress,
            ),
          );
          moveRightWord?.(
            gsap.utils.interpolate(
              window.innerWidth * -0.65,
              window.innerWidth * 0.45,
              wordProgress,
            ),
          );

          const fadeStart = desktop ? 0.3 : 0.25;
          const fadeEnd = desktop ? 0.39 : 0.34;
          const fadeProgress = gsap.utils.clamp(
            0,
            1,
            (trigger.progress - fadeStart) / (fadeEnd - fadeStart),
          );
          gsap.set(words, { opacity: 1 - fadeProgress });
          gsap.set(copyElements, { opacity: 1 - fadeProgress, y: -28 * fadeProgress });

          const wipeProgress = gsap.utils.clamp(
            0,
            1,
            (trigger.progress - wipeStart) / (1 - wipeStart),
          );

          wipeStrips.forEach((strip, index) => {
            const order = wipeStrips.length - 1 - index;
            const stagger = order * 0.08;
            const localProgress = gsap.utils.clamp(
              0,
              1,
              (wipeProgress - stagger) / Math.max(0.001, 1 - stagger),
            );
            gsap.set(strip, { scaleY: wipeEase(localProgress) });
          });
        },
        scrub: true,
        start: 'top top',
        trigger: section,
      });
    }, section);

    return () => context.revert();
  }, []);

  return (
    <section
      className="relative h-[550svh] bg-[#c9c9c6] text-[#242422] lg:h-[750vh]"
      data-motion-ribbon-section
      ref={sectionRef}
    >
      <div className="sticky top-0 h-[100svh] overflow-hidden lg:h-screen">
        <div className="absolute inset-x-5 top-6 z-20 flex items-center justify-between text-[0.58rem] font-black uppercase tracking-[0.2em] md:inset-x-10">
          <span>PRO GYM®</span>
          <span>{content.tag}</span>
        </div>

        <p
          className={`pointer-events-none absolute bottom-[25%] left-[2.5%] z-0 font-medium leading-none tracking-[-0.075em] ${
            isArabic
              ? 'font-ar-display text-[clamp(3.6rem,6vw,7rem)]'
              : 'text-[clamp(4.4rem,9.3vw,10.8rem)]'
          }`}
          data-ribbon-word="left"
        >
          {content.leftWord}
        </p>
        <p
          className={`pointer-events-none absolute right-[1.5%] top-[34%] z-0 font-medium leading-none tracking-[-0.075em] ${
            isArabic
              ? 'font-ar-display text-[clamp(3.4rem,5.7vw,6.7rem)]'
              : 'text-[clamp(4.2rem,8.5vw,9.8rem)]'
          }`}
          data-ribbon-word="right"
        >
          {content.rightWord}
        </p>

        <div className="absolute inset-x-0 inset-y-[7%] z-10 md:inset-x-[1%]">
          <MotionRibbonScene progress={progressRef} />
        </div>

        <div
          className="absolute inset-x-5 bottom-7 z-20 grid gap-6 md:inset-x-10 md:grid-cols-[1fr_auto] md:items-end"
          data-ribbon-copy
        >
          <p className="max-w-sm text-sm leading-6 text-black/58 md:text-base">{content.body}</p>
          <Link
            className="group flex min-w-56 items-center justify-between border-b border-black/45 pb-3 text-[0.65rem] font-black uppercase tracking-[0.18em]"
            href={`/${locale}/login`}
          >
            {content.link}
            <ArrowUpRight className="h-4 w-4 transition-transform group-hover:-translate-y-1 group-hover:translate-x-1" />
          </Link>
        </div>

        <div className="absolute right-4 top-1/2 z-20 hidden -translate-y-1/2 flex-col items-center gap-3 text-[0.5rem] font-black uppercase tracking-[0.16em] text-black/38 md:flex">
          <span>01</span>
          <span className="h-24 w-px bg-black/20">
            <span className="block h-1/2 w-full bg-black" />
          </span>
          <span>07</span>
        </div>

        <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-50 flex flex-col">
          {Array.from({ length: 5 }, (_, index) => (
            <span
              className="block min-h-0 flex-1 origin-bottom scale-y-0 bg-[#050605] [will-change:transform]"
              data-ribbon-wipe
              key={index}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
