'use client';

import { gsap } from 'gsap';
import { useLayoutEffect, useRef, useState } from 'react';
import type { PublicLocale } from '@progym/shared';

export function HeroSplash({ locale }: { locale: PublicLocale }) {
  const [visible, setVisible] = useState(true);
  const rootRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef<HTMLSpanElement>(null);
  const isArabic = locale === 'ar';

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setVisible(false);
      return;
    }

    const state = { progress: 0 };
    const context = gsap.context(() => {
      const timeline = gsap.timeline({
        delay: 0.08,
        onComplete: () => setVisible(false),
      });

      timeline
        .from('[data-splash-frame]', {
          duration: 0.8,
          ease: 'power3.out',
          opacity: 0,
          scale: 0.84,
          stagger: 0.04,
        })
        .from(
          '[data-splash-core]',
          {
            duration: 0.9,
            ease: 'back.out(1.5)',
            filter: 'blur(14px)',
            opacity: 0,
            rotateY: -24,
            scale: 0.58,
          },
          '-=0.6',
        )
        .from(
          '[data-splash-orbit]',
          {
            duration: 0.9,
            ease: 'power3.out',
            opacity: 0,
            rotate: -34,
            scale: 0.55,
            stagger: 0.07,
          },
          '-=0.72',
        )
        .from(
          '[data-splash-bolt-layer]',
          {
            duration: 0.68,
            ease: 'back.out(1.8)',
            opacity: 0,
            rotate: -12,
            scale: 0.7,
            stagger: 0.08,
          },
          '-=0.68',
        )
        .from(
          '[data-splash-ray]',
          {
            duration: 0.35,
            ease: 'power2.out',
            opacity: 0,
            scaleX: 0,
            stagger: 0.035,
          },
          '-=0.32',
        )
        .fromTo(
          '[data-splash-word]',
          { opacity: 0, yPercent: 110 },
          {
            duration: 0.65,
            ease: 'power4.out',
            opacity: 1,
            stagger: 0.06,
            yPercent: 0,
          },
          '-=0.2',
        )
        .to(
          state,
          {
            duration: 1.45,
            ease: 'power2.inOut',
            onUpdate: () => {
              if (progressRef.current) {
                progressRef.current.textContent = String(Math.round(state.progress)).padStart(3, '0');
              }
            },
            progress: 100,
          },
          '-=0.38',
        )
        .to('[data-splash-progress]', { duration: 1.45, ease: 'power2.inOut', scaleX: 1 }, '<')
        .to('[data-splash-segment]', { duration: 0.12, opacity: 1, stagger: 0.06 }, '<')
        .to(
          '[data-splash-panel]',
          {
            duration: 1.45,
            ease: 'power2.inOut',
            opacity: 0,
            scale: 0.08,
          },
          '<',
        )
        .to('[data-splash-core]', {
          duration: 0.28,
          ease: 'power4.in',
          filter: 'brightness(2.8)',
          scale: 1.08,
        })
        .to('[data-splash-flash]', { duration: 0.07, ease: 'none', opacity: 1 }, '-=0.07')
        .to('[data-splash-curtain="left"]', { duration: 0.72, ease: 'power4.inOut', xPercent: -102 })
        .to('[data-splash-curtain="right"]', { duration: 0.72, ease: 'power4.inOut', xPercent: 102 }, '<')
        .to('[data-splash-flash]', { duration: 0.2, ease: 'power2.out', opacity: 0 }, '<')
        .to(root, { duration: 0.08, opacity: 0 });
    }, root);

    return () => context.revert();
  }, []);

  if (!visible) return null;

  return (
    <div
      aria-label="Loading Pro Gym"
      aria-live="polite"
      className="fixed inset-0 z-[100] overflow-hidden bg-[#050605] text-white"
      ref={rootRef}
      role="status"
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(57,255,20,0.12),transparent_32%)]" />
      <div className="home-hero-grid absolute inset-0 opacity-25" />
      <div className="home-hero-noise absolute inset-0 opacity-10" />

      <div className="absolute inset-4 border border-white/8 md:inset-7" data-splash-frame />
      <div className="absolute inset-y-0 left-1/2 w-px bg-white/7" data-splash-frame />
      <div className="absolute inset-x-0 top-1/2 h-px bg-white/7" data-splash-frame />
      <div className="absolute left-[15%] top-0 h-full w-px bg-white/[0.035]" data-splash-frame />
      <div className="absolute right-[15%] top-0 h-full w-px bg-white/[0.035]" data-splash-frame />

      <div className="relative z-10 flex h-full w-full flex-col justify-between p-5 md:p-9">
        <div className="flex items-start justify-between text-[0.55rem] font-bold uppercase tracking-[0.24em] text-white/35">
          <div>
            <span className="block text-white/70">Pro Gym®</span>
            <span className="mt-2 block">Management operating system</span>
          </div>
          <div className="text-end">
            <span className="block text-[#39ff14]">Energy online</span>
            <span className="mt-2 block">Boot sequence / 2026</span>
          </div>
        </div>

        <div className="absolute left-1/2 top-1/2 h-[23rem] w-[23rem] -translate-x-1/2 -translate-y-1/2 [perspective:1200px] md:h-[31rem] md:w-[31rem]">
          <div
            className="absolute inset-[4%] rounded-full border border-[#39ff14]/20"
            data-splash-orbit
          />
          <div
            className="absolute inset-[12%] rotate-[28deg] rounded-[48%] border border-dashed border-white/16"
            data-splash-orbit
          />
          <div
            className="absolute inset-[20%] -rotate-[36deg] rounded-[46%] border border-[#39ff14]/24"
            data-splash-orbit
          />
          <div
            className="absolute inset-[28%] rotate-[58deg] rounded-[44%] border border-dotted border-white/25"
            data-splash-orbit
          />

          <div
            className="absolute left-1/2 top-1/2 flex h-[78%] w-[58%] -translate-x-1/2 -translate-y-1/2 items-center justify-center [transform-style:preserve-3d]"
            data-splash-core
          >
            <div
              className="absolute -inset-[5%] border border-white/20 bg-white/[0.055] shadow-[0_0_110px_rgba(57,255,20,0.2)] backdrop-blur-xl"
              data-splash-panel
            >
              <div className="absolute inset-3 border border-[#39ff14]/20 bg-black/20" />
              <div className="absolute inset-y-0 left-1/2 w-px bg-[#39ff14]/30 shadow-[0_0_14px_#39ff14]" />
              <div className="splash-scan-line absolute inset-x-0 top-0 h-px bg-white shadow-[0_0_18px_white]" />
            </div>

            <svg
              aria-hidden="true"
              className="relative z-10 h-[82%] w-[82%] overflow-visible"
              viewBox="0 0 100 160"
            >
              <defs>
                <linearGradient id="splash-glass" x1="0" x2="1" y1="0" y2="1">
                  <stop offset="0" stopColor="#ecffe8" stopOpacity="0.98" />
                  <stop offset="0.34" stopColor="#39ff14" stopOpacity="0.9" />
                  <stop offset="0.7" stopColor="#0d8f00" stopOpacity="0.58" />
                  <stop offset="1" stopColor="#d9ffd2" stopOpacity="0.86" />
                </linearGradient>
                <filter id="splash-glow" x="-100%" y="-100%" width="300%" height="300%">
                  <feGaussianBlur result="blur" stdDeviation="3.5" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>
              <path
                d="M32 4h54L58 62h32L18 156l22-67H10z"
                data-splash-bolt-layer
                fill="#39ff14"
                opacity="0.14"
                stroke="#39ff14"
                strokeWidth="7"
                transform="translate(2 3)"
              />
              <path
                d="M32 4h54L58 62h32L18 156l22-67H10z"
                data-splash-bolt-layer
                fill="url(#splash-glass)"
                filter="url(#splash-glow)"
                stroke="#f2ffef"
                strokeLinejoin="round"
                strokeWidth="1.2"
              />
              <path
                d="M38 14h34L48 67h23L31 127l16-47H27z"
                data-splash-bolt-layer
                fill="rgba(255,255,255,0.2)"
                stroke="rgba(255,255,255,0.55)"
                strokeWidth="0.6"
              />
            </svg>

            {[
              '-left-16 top-[18%] w-20 -rotate-[18deg]',
              '-right-16 top-[28%] w-20 rotate-[16deg]',
              '-left-20 top-[52%] w-24 rotate-[10deg]',
              '-right-20 top-[62%] w-24 -rotate-[13deg]',
              '-left-14 bottom-[15%] w-16 -rotate-[28deg]',
              '-right-14 bottom-[10%] w-16 rotate-[24deg]',
            ].map((className, index) => (
              <span
                className={`absolute h-px origin-center shadow-[0_0_13px_currentColor] ${
                  index % 2 === 0 ? 'bg-[#39ff14] text-[#39ff14]' : 'bg-white text-white'
                } ${className}`}
                data-splash-ray
                key={className}
              />
            ))}
          </div>
        </div>

        <div
          className="absolute left-1/2 top-[76%] flex -translate-x-1/2 overflow-hidden text-xl font-black uppercase tracking-[0.3em] md:top-[79%] md:text-3xl"
          dir="ltr"
        >
          <span data-splash-word>PRO</span>
          <span className="ms-3 text-[#39ff14]" data-splash-word>GYM</span>
        </div>

        <div className="flex items-end gap-4 md:gap-6" dir={isArabic ? 'rtl' : 'ltr'}>
          <span className="text-4xl font-black tabular-nums tracking-[-0.07em] md:text-6xl" ref={progressRef}>
            000
          </span>
          <div className="mb-2 flex-1">
            <div className="h-px overflow-hidden bg-white/12">
              <div
                className={`h-full scale-x-0 bg-[#39ff14] shadow-[0_0_18px_#39ff14] ${
                  isArabic ? 'origin-right' : 'origin-left'
                }`}
                data-splash-progress
              />
            </div>
            <div className="mt-2 grid grid-cols-12 gap-1">
              {Array.from({ length: 12 }).map((_, index) => (
                <span
                  className="h-1 bg-[#39ff14] opacity-10"
                  data-splash-segment
                  key={index}
                />
              ))}
            </div>
          </div>
          <span className="mb-1 hidden text-[0.55rem] font-bold uppercase tracking-[0.22em] text-white/35 sm:block">
            Calibrating energy
          </span>
        </div>
      </div>

      <div className="pointer-events-none absolute inset-y-0 left-0 z-0 w-1/2 bg-[#050605]" data-splash-curtain="left" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-0 w-1/2 bg-[#050605]" data-splash-curtain="right" />
      <div className="pointer-events-none absolute inset-0 z-20 bg-white opacity-0" data-splash-flash />
    </div>
  );
}
