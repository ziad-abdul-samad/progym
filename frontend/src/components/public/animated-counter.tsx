'use client';

import { CountUp } from 'countup.js';
import { useEffect, useRef } from 'react';

export function AnimatedCounter({
  suffix = '',
  value,
}: {
  suffix?: string;
  value: number;
}) {
  const counterRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const element = counterRef.current;
    if (!element) return;

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      element.textContent = `${value.toLocaleString()}${suffix}`;
      return;
    }

    const counter = new CountUp(element, value, {
      autoAnimate: true,
      autoAnimateDelay: 120,
      autoAnimateOnce: true,
      duration: 2.1,
      suffix,
      useEasing: true,
    });

    return () => counter.onDestroy();
  }, [suffix, value]);

  return <span ref={counterRef}>0{suffix}</span>;
}
