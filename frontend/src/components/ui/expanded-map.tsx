'use client';

import type { PublicLocale } from '@progym/shared';
import { ExternalLink, MapPin, Maximize2, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

export function ExpandedMap({
  label,
  latitude,
  longitude,
  mapUrl,
  locale,
}: {
  label: string;
  latitude: number;
  longitude: number;
  mapUrl: string;
  locale: PublicLocale;
}) {
  const [expanded, setExpanded] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const ar = locale === 'ar';
  const embedUrl = `https://www.openstreetmap.org/export/embed.html?${new URLSearchParams({
    bbox: [longitude - 0.0065, latitude - 0.0045, longitude + 0.0065, latitude + 0.0045].join(','),
    layer: 'mapnik',
    marker: `${latitude},${longitude}`,
  })}`;

  useEffect(() => {
    if (!expanded) return;
    const dialog = dialogRef.current;
    const previousOverflow = document.body.style.overflow;
    dialog?.showModal();
    document.body.style.overflow = 'hidden';
    return () => {
      dialog?.close();
      document.body.style.overflow = previousOverflow;
    };
  }, [expanded]);

  const mapFrame = (large: boolean) => (
    <iframe
      className={
        large
          ? 'min-h-0 w-full flex-1 border-0 bg-[#e4eadf]'
          : 'h-[22rem] w-full border-0 bg-[#e4eadf] sm:h-[28rem]'
      }
      loading="lazy"
      referrerPolicy="strict-origin-when-cross-origin"
      src={embedUrl}
      title={`${ar ? 'خريطة' : 'Map'} — ${label}`}
    />
  );

  return (
    <>
      <div className="overflow-hidden border border-white/15 bg-[#0b0e0b]">
        <div className="flex items-center justify-between gap-3 border-b border-white/15 p-4 text-white">
          <div className="flex min-w-0 items-center gap-3">
            <MapPin aria-hidden="true" className="h-5 w-5 shrink-0 text-[#39ff14]" />
            <p className="text-sm font-bold leading-7">{label}</p>
          </div>
          <button
            aria-label={ar ? 'تكبير الخريطة' : 'Expand map'}
            className="flex h-11 w-11 shrink-0 items-center justify-center border border-white/20 text-[#39ff14] transition hover:bg-white/10"
            onClick={() => setExpanded(true)}
            type="button"
          >
            <Maximize2 className="h-5 w-5" />
          </button>
        </div>
        {mapFrame(false)}
        <a
          className="flex min-h-14 items-center justify-between gap-3 px-4 py-3 text-sm font-bold text-[#39ff14] transition hover:bg-white/5"
          href={mapUrl}
          rel="noopener noreferrer"
          target="_blank"
        >
          {ar ? 'عرض الموقع في خرائط Google' : 'View location in Google Maps'}
          <ExternalLink aria-hidden="true" className="h-4 w-4 shrink-0" />
        </a>
      </div>
      <dialog
        aria-label={ar ? 'خريطة فرع الإنشاءات' : 'Al-Inshaat branch map'}
        className="fixed inset-0 m-auto h-[85dvh] max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-6xl overflow-hidden border border-white/20 bg-[#0b0e0b] p-0 text-white backdrop:bg-black/85 open:flex open:flex-col"
        dir={ar ? 'rtl' : 'ltr'}
        onCancel={() => setExpanded(false)}
        onClose={() => setExpanded(false)}
        ref={dialogRef}
      >
        <div className="flex shrink-0 items-center justify-between gap-3 p-4">
          <p className="text-sm font-bold leading-7">{label}</p>
          <button
            aria-label={ar ? 'إغلاق الخريطة' : 'Close map'}
            className="flex h-11 w-11 shrink-0 items-center justify-center border border-white/20 transition hover:bg-white/10"
            onClick={() => setExpanded(false)}
            type="button"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        {expanded ? mapFrame(true) : null}
      </dialog>
    </>
  );
}
