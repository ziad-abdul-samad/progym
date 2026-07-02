'use client';

import { useEffect, useRef, useState } from 'react';

export function useSceneVisibility(rootMargin = '25% 0px') {
  const containerRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new IntersectionObserver(
      ([entry]) => setVisible(Boolean(entry?.isIntersecting)),
      { rootMargin, threshold: 0.01 },
    );
    observer.observe(container);

    return () => observer.disconnect();
  }, [rootMargin]);

  return { containerRef, visible };
}
