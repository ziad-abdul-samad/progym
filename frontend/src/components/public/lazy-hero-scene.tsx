'use client';

import dynamic from 'next/dynamic';

const DeferredHeroScene = dynamic(
  () => import('@/components/public/hero-scene').then((module) => module.HeroScene),
  {
    loading: () => null,
    ssr: false,
  },
);

export function LazyHeroScene() {
  return <DeferredHeroScene />;
}
