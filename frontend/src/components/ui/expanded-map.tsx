'use client';

import type { PublicLocale } from '@progym/shared';
import { motion, useMotionValue, useReducedMotion, useSpring } from 'framer-motion';
import { ExternalLink, MapPin, Maximize2, Minimize2 } from 'lucide-react';
import { useId, useState } from 'react';

// JolyUI expanded-map interaction adapted for responsive Pro Gym branch cards.
// OSM tiles need no API key. Fractional tile offsets keep the location pin accurate.
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
  const [expanded, setExpanded] = useState(false),
    [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(0);
  const id = useId(),
    reduced = useReducedMotion(),
    ar = locale === 'ar';
  const x = useMotionValue(0),
    y = useMotionValue(0);
  const rotateX = useSpring(x, { stiffness: 300, damping: 30 });
  const rotateY = useSpring(y, { stiffness: 300, damping: 30 });
  const zoom = 16,
    n = 2 ** zoom,
    lat = (latitude * Math.PI) / 180;
  const tileX = ((longitude + 180) / 360) * n;
  const tileY = ((1 - Math.asinh(Math.tan(lat)) / Math.PI) / 2) * n;
  const tiles = [-1, 0, 1].flatMap((dy) =>
    [-1, 0, 1].map((dx) => ({
      dx,
      dy,
      url: `https://tile.openstreetmap.org/${zoom}/${Math.floor(tileX) + dx}/${Math.floor(tileY) + dy}.png`,
    })),
  );
  return (
    <div
      className="min-w-0 py-2"
      style={{ perspective: 1000 }}
      onPointerMove={(event) => {
        if (event.pointerType !== 'mouse' || reduced) return;
        const rect = event.currentTarget.getBoundingClientRect();
        x.set(-((event.clientY - rect.top) / rect.height - 0.5) * 7);
        y.set(((event.clientX - rect.left) / rect.width - 0.5) * 7);
      }}
      onPointerLeave={() => {
        x.set(0);
        y.set(0);
      }}
    >
      <motion.div
        className="overflow-hidden rounded-2xl border border-white/20 bg-[#101510] shadow-[0_20px_55px_-25px_#39ff1440]"
        style={{ rotateX, rotateY }}
      >
        <button
          type="button"
          className="flex min-h-24 w-full items-center gap-3 p-5 text-start focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#39ff14]"
          aria-expanded={expanded}
          aria-controls={id}
          onClick={() => setExpanded((value) => !value)}
        >
          <span className="rounded-full bg-[#39ff14]/15 p-3 text-[#39ff14]">
            <MapPin className="h-5 w-5" />
          </span>
          <span className="min-w-0 flex-1">
            <strong className="block text-base leading-7 text-white">{label}</strong>
            <span className="mt-1 block text-xs text-white/55">
              {ar
                ? expanded
                  ? 'اضغط لتصغير الخريطة'
                  : 'اضغط لاستكشاف الموقع'
                : expanded
                  ? 'Tap to collapse'
                  : 'Tap to explore the location'}
            </span>
          </span>
          {expanded ? (
            <Minimize2 className="h-4 w-4 shrink-0 text-[#39ff14]" />
          ) : (
            <Maximize2 className="h-4 w-4 shrink-0 text-[#39ff14]" />
          )}
        </button>
        <motion.div
          id={id}
          className="relative isolate overflow-hidden bg-[#e7eadf]"
          initial={false}
          animate={{ height: expanded ? 340 : 165 }}
          transition={reduced ? { duration: 0 } : { type: 'spring', stiffness: 260, damping: 30 }}
        >
          <div
            className="absolute top-1/2 h-[768px] w-[768px]"
            dir="ltr"
            style={{
              left: '50%',
              transform: `translate(${-256 - (tileX % 1) * 256}px, ${-256 - (tileY % 1) * 256}px)`,
            }}
          >
            {tiles.map((tile) => (
              // Provider tiles are fixed-size rasters; retain their URLs and attribution.
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={tile.url}
                alt=""
                loading="lazy"
                decoding="async"
                width={256}
                height={256}
                src={tile.url}
                className="absolute max-w-none"
                style={{ left: (tile.dx + 1) * 256, top: (tile.dy + 1) * 256 }}
                onLoad={() => setLoaded((value) => value + 1)}
                onError={() => setFailed(true)}
              />
            ))}
          </div>
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/15 via-transparent to-transparent" />
          <span className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-full drop-shadow-xl">
            <MapPin className="h-12 w-12 fill-[#39ff14] text-[#152015]" strokeWidth={1.8} />
          </span>
          {!loaded && !failed ? (
            <p
              className="absolute inset-x-4 top-4 rounded-lg bg-white/95 px-3 py-2 text-xs text-black"
              role="status"
            >
              {ar ? 'جاري تحميل الخريطة…' : 'Loading map…'}
            </p>
          ) : null}
          {failed ? (
            <p className="absolute inset-x-4 top-4 rounded-lg bg-white/95 p-3 text-xs leading-6 text-black">
              {ar
                ? 'تعذر تحميل بعض أجزاء الخريطة. يمكنك فتح الموقع من الرابط أدناه.'
                : 'Some map tiles could not load. Use the link below to view the location.'}
            </p>
          ) : null}
          <a
            className="absolute bottom-0 right-0 bg-white/95 px-2 py-1 text-[10px] text-black underline"
            href="https://www.openstreetmap.org/copyright"
            target="_blank"
            rel="noreferrer"
          >
            © OpenStreetMap contributors
          </a>
        </motion.div>
        <a
          href={mapUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex min-h-14 items-center justify-between gap-3 p-5 text-sm font-bold text-[#39ff14] hover:bg-white/5"
        >
          {ar ? 'افتح الموقع في خرائط Google' : 'Open location in Google Maps'}
          <ExternalLink className="h-4 w-4 shrink-0" />
        </a>
      </motion.div>
    </div>
  );
}
