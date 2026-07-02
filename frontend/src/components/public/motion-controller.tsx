'use client';

import { useEffect } from 'react';

export function MotionController() {
  useEffect(() => {
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reducedMotion) return;

    let cleanup = () => {};

    void Promise.all([import('gsap'), import('gsap/ScrollTrigger')]).then(([gsapModule, scrollModule]) => {
      const gsap = gsapModule.gsap;
      const ScrollTrigger = scrollModule.ScrollTrigger;
      gsap.registerPlugin(ScrollTrigger);

      const reveals = gsap.utils.toArray<HTMLElement>('[data-reveal]');
      reveals.forEach((element) => {
        gsap.fromTo(
          element,
          { opacity: 0, y: 36 },
          {
            duration: 0.9,
            ease: 'power3.out',
            opacity: 1,
            scrollTrigger: {
              start: 'top 82%',
              trigger: element,
            },
            y: 0,
          },
        );
      });

      const parallaxLayers = gsap.utils.toArray<HTMLElement>('[data-parallax]');
      parallaxLayers.forEach((element) => {
        const depth = Number(element.dataset.parallax || 12);
        gsap.to(element, {
          ease: 'none',
          scrollTrigger: {
            scrub: true,
            start: 'top bottom',
            end: 'bottom top',
            trigger: element.closest('section') ?? element,
          },
          yPercent: depth,
        });
      });

      const storyCards = gsap.utils.toArray<HTMLElement>('[data-story-card]');
      storyCards.forEach((element) => {
        ScrollTrigger.create({
          end: 'bottom 45%',
          onEnter: () => element.classList.add('is-active'),
          onEnterBack: () => element.classList.add('is-active'),
          onLeave: () => element.classList.remove('is-active'),
          onLeaveBack: () => element.classList.remove('is-active'),
          start: 'top 62%',
          trigger: element,
        });
      });

      const counters = gsap.utils.toArray<HTMLElement>('[data-count]');
      counters.forEach((element) => {
        const rawValue = element.dataset.count ?? '0';
        const suffix = rawValue.replace(/[\d.]/g, '');
        const target = Number(rawValue.replace(/[^\d.]/g, ''));
        if (!Number.isFinite(target)) return;

        const state = { value: 0 };
        gsap.to(state, {
          duration: 1.4,
          ease: 'power2.out',
          onUpdate: () => {
            element.textContent = `${Math.round(state.value).toLocaleString()}${suffix}`;
          },
          scrollTrigger: {
            once: true,
            start: 'top 86%',
            trigger: element,
          },
          value: target,
        });
      });

      cleanup = () => {
        ScrollTrigger.getAll().forEach((trigger) => trigger.kill());
      };
    });

    return () => cleanup();
  }, []);

  return null;
}
