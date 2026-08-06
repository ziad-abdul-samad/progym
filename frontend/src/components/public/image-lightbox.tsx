'use client';

import { X } from 'lucide-react';
import Image from 'next/image';
import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import type { PublicLocale } from '@progym/shared';

type LightboxImage = {
  alt: string;
  src: string;
};

export function ImageLightbox({
  image,
  locale,
  onClose,
}: {
  image: LightboxImage | null;
  locale: PublicLocale;
  onClose: () => void;
}) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!image) return;
    const previousOverflow = document.body.style.overflow;
    const previousFocus =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
      if (event.key === 'Tab') {
        event.preventDefault();
        closeButtonRef.current?.focus();
      }
    };

    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKeyDown);
    closeButtonRef.current?.focus();

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKeyDown);
      previousFocus?.focus();
    };
  }, [image, onClose]);

  if (!image || typeof document === 'undefined') return null;

  const closeLabel = locale === 'ar' ? 'إغلاق الصورة' : 'Close image';

  return createPortal(
    <div
      aria-label={image.alt}
      aria-modal="true"
      className="fixed inset-0 z-[220] flex items-center justify-center bg-black/90 p-3 backdrop-blur-lg sm:p-6"
      role="dialog"
    >
      <button
        aria-label={closeLabel}
        className="absolute inset-0 cursor-zoom-out"
        onClick={onClose}
        tabIndex={-1}
        type="button"
      />
      <figure className="relative z-10 flex max-h-[92dvh] w-full max-w-6xl flex-col overflow-hidden border border-white/15 bg-[#070907] shadow-[0_35px_120px_rgba(0,0,0,0.8)]">
        <div className="flex min-h-14 items-center justify-between gap-4 border-b border-white/12 px-4 text-white sm:px-5">
          <figcaption className="min-w-0 truncate text-xs font-black sm:text-sm">
            {image.alt}
          </figcaption>
          <button
            aria-label={closeLabel}
            className="flex h-10 w-10 shrink-0 items-center justify-center border border-white/15 text-white/70 transition hover:border-[#39ff14] hover:bg-[#39ff14] hover:text-black"
            onClick={onClose}
            ref={closeButtonRef}
            type="button"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="relative h-[min(78dvh,52rem)] w-full bg-black">
          <Image
            alt={image.alt}
            className="object-contain"
            fill
            priority
            sizes="(max-width: 768px) 100vw, 1152px"
            src={image.src}
          />
        </div>
      </figure>
    </div>,
    document.body,
  );
}
