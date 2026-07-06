'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { ExternalLink, MapPin, Maximize2, X } from 'lucide-react';
import { useMemo, useState } from 'react';

function tilePosition(latitude: number, longitude: number, zoom: number) {
  const scale = 2 ** zoom;
  const x = ((longitude + 180) / 360) * scale;
  const latRad = (latitude * Math.PI) / 180;
  const y = ((1 - Math.asinh(Math.tan(latRad)) / Math.PI) / 2) * scale;
  return { x, y };
}

export function ExpandedMap({
  label,
  latitude,
  longitude,
  mapUrl,
}: {
  label: string;
  latitude: number;
  longitude: number;
  mapUrl: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const zoom = 17;
  const mapData = useMemo(() => {
    const center = tilePosition(latitude, longitude, zoom);
    const baseX = Math.floor(center.x);
    const baseY = Math.floor(center.y);
    const offsets = [-3, -2, -1, 0, 1, 2, 3];
    return {
      centerOffsetX: (3 + (center.x - baseX)) * 256,
      centerOffsetY: (3 + (center.y - baseY)) * 256,
      tiles: offsets.flatMap((dy) =>
        offsets.map((dx) => ({
        dx,
        dy,
          url: `https://a.basemaps.cartocdn.com/dark_all/${zoom}/${baseX + dx}/${baseY + dy}.png`,
      })),
      ),
    };
  }, [latitude, longitude]);

  const map = (
    <motion.div
      className={`relative overflow-hidden border border-white/12 bg-[#111] ${expanded ? 'h-full w-full rounded-lg' : 'min-h-[34rem] w-full'}`}
      layout
    >
      <button aria-label="Expand map" className="absolute inset-0 z-10 cursor-zoom-in" onClick={() => setExpanded(true)} type="button" />
      <div
        className="absolute left-1/2 top-1/2 h-[1792px] w-[1792px] opacity-95"
        style={{ transform: `translate(${-mapData.centerOffsetX}px, ${-mapData.centerOffsetY}px)` }}
      >
        {mapData.tiles.map((tile) => (
          <div
            className="absolute h-64 w-64 bg-no-repeat"
            key={`${tile.dx}:${tile.dy}`}
            style={{
              backgroundImage: `url("${tile.url}")`,
              backgroundSize: '256px 256px',
              left: `${(tile.dx + 3) * 256}px`,
              top: `${(tile.dy + 3) * 256}px`,
            }}
          />
        ))}
      </div>
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_15%,rgba(0,0,0,0.55)_100%)]" />
      <div className="pointer-events-none absolute left-1/2 top-1/2 z-20 -translate-x-1/2 -translate-y-1/2">
        <span className="absolute inset-0 animate-ping rounded-full bg-[#39ff14]/35" />
        <span className="relative flex h-14 w-14 items-center justify-center rounded-full border-4 border-black bg-[#39ff14] text-black shadow-[0_0_36px_#39ff14]">
          <MapPin className="h-7 w-7" />
        </span>
      </div>
      <div className="absolute inset-x-5 bottom-5 z-30 flex items-center justify-between gap-4 border border-white/12 bg-black/90 p-4">
        <div>
          <p className="text-[0.55rem] font-black uppercase tracking-[0.18em] text-[#39ff14]">Pro Gym / Location</p>
          <p className="mt-1 text-sm font-black text-white">{label}</p>
        </div>
        <a className="relative z-40 flex h-11 w-11 shrink-0 items-center justify-center border border-white/15 text-white transition hover:border-[#39ff14] hover:text-[#39ff14]" href={mapUrl} rel="noreferrer" target="_blank">
          <ExternalLink className="h-4 w-4" />
        </a>
      </div>
      {!expanded ? <Maximize2 className="pointer-events-none absolute end-5 top-5 z-20 h-5 w-5 text-white" /> : null}
    </motion.div>
  );

  return (
    <>
      {!expanded ? map : null}
      <AnimatePresence>
        {expanded ? (
          <motion.div animate={{ opacity: 1 }} className="fixed inset-0 z-[100] bg-black/90 p-3 md:p-8" exit={{ opacity: 0 }} initial={{ opacity: 0 }}>
            {map}
            <button aria-label="Close map" className="absolute end-6 top-6 z-[120] flex h-12 w-12 items-center justify-center rounded-full border border-white/20 bg-black text-white" onClick={() => setExpanded(false)} type="button">
              <X className="h-5 w-5" />
            </button>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}
