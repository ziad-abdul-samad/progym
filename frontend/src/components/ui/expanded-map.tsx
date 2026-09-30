'use client';

// JolyUI LocationMap, Copyright (c) 2025 Johuniq, MIT.
// Official source: https://jolyui.dev/r/expanded-map
// Adapted for Pro Gym locale, accessibility, mobile sizing and exact pin coordinates.
// License: /THIRD_PARTY_NOTICES.md

import {
  AnimatePresence,
  motion,
  useMotionValue,
  useSpring,
  useTransform,
  useReducedMotion,
} from 'framer-motion';
import NextImage from 'next/image';
import type React from 'react';
import { useEffect, useId, useMemo, useRef, useState } from 'react';

interface LocationMapProps {
  locale: 'ar' | 'en';
  mapUrl: string;
  /** Location name to display */
  location?: string;
  /** Latitude coordinate */
  latitude?: number;
  /** Longitude coordinate */
  longitude?: number;
  /** Zoom level for the map (1-18) */
  zoom?: number;
  /** Additional CSS classes */
  className?: string;
  /** Map tile provider */
  tileProvider?: 'openstreetmap' | 'carto-light' | 'carto-dark';
}

// Convert lat/lng to tile coordinates
function latLngToTile(lat: number, lng: number, zoom: number) {
  const n = 2 ** zoom;
  const x = ((lng + 180) / 360) * n;
  const latRad = (lat * Math.PI) / 180;
  const y = ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n;
  return { x, y };
}

// Get tile URL based on provider
function getTileUrl(provider: string, x: number, y: number, z: number) {
  switch (provider) {
    case 'carto-light':
      return `https://cartodb-basemaps-a.global.ssl.fastly.net/light_all/${z}/${x}/${y}.png`;
    case 'carto-dark':
      return `https://cartodb-basemaps-a.global.ssl.fastly.net/dark_all/${z}/${x}/${y}.png`;
    default:
      return `https://tile.openstreetmap.org/${z}/${x}/${y}.png`;
  }
}

// Format coordinates for display
function formatCoordinates(lat: number, lng: number) {
  const latDir = lat >= 0 ? 'N' : 'S';
  const lngDir = lng >= 0 ? 'E' : 'W';
  return `${Math.abs(lat).toFixed(4)}° ${latDir}, ${Math.abs(lng).toFixed(4)}° ${lngDir}`;
}

export function LocationMap({
  location = 'San Francisco, CA',
  latitude = 37.7749,
  longitude = -122.4194,
  zoom = 16,
  locale,
  mapUrl,
  className,
  tileProvider = 'openstreetmap',
}: LocationMapProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [tilesLoaded, setTilesLoaded] = useState(false);
  const [tilesFailed, setTilesFailed] = useState(false);
  const reduced = useReducedMotion();
  const gridId = useId().replace(/:/g, '');
  const containerRef = useRef<HTMLDivElement>(null);

  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const rotateX = useTransform(mouseY, [-50, 50], [8, -8]);
  const rotateY = useTransform(mouseX, [-50, 50], [-8, 8]);

  const springRotateX = useSpring(rotateX, { stiffness: 300, damping: 30 });
  const springRotateY = useSpring(rotateY, { stiffness: 300, damping: 30 });

  const coordinates = useMemo(() => formatCoordinates(latitude, longitude), [latitude, longitude]);

  // Generate tile URLs for a 3x3 grid around the center tile
  const center = useMemo(
    () => latLngToTile(latitude, longitude, zoom),
    [latitude, longitude, zoom],
  );
  const tiles = useMemo(() => {
    const centerTile = latLngToTile(latitude, longitude, zoom);
    const tileUrls: { url: string; offsetX: number; offsetY: number }[] = [];

    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        tileUrls.push({
          url: getTileUrl(
            tileProvider,
            Math.floor(centerTile.x) + dx,
            Math.floor(centerTile.y) + dy,
            zoom,
          ),
          offsetX: dx,
          offsetY: dy,
        });
      }
    }

    return tileUrls;
  }, [latitude, longitude, zoom, tileProvider]);

  // Preload tiles
  useEffect(() => {
    if (!isExpanded) return;
    let cancelled = false;
    setTilesLoaded(false);
    setTilesFailed(false);
    let loadedCount = 0;
    const totalTiles = tiles.length;

    const images = tiles.map((tile) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        if (cancelled) return;
        loadedCount++;
        if (loadedCount === totalTiles) {
          setTilesLoaded(true);
        }
      };
      img.onerror = () => {
        if (cancelled) return;
        setTilesFailed(true);
        loadedCount++;
        if (loadedCount === totalTiles) {
          setTilesLoaded(true);
        }
      };
      img.src = tile.url;
      return img;
    });
    return () => {
      cancelled = true;
      images.forEach((img) => {
        img.onload = null;
        img.onerror = null;
      });
    };
  }, [tiles, isExpanded]);

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!containerRef.current || reduced) return;
    const rect = containerRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    mouseX.set(e.clientX - centerX);
    mouseY.set(e.clientY - centerY);
  };

  const handleMouseLeave = () => {
    mouseX.set(0);
    mouseY.set(0);
    setIsHovered(false);
  };

  const handleClick = () => {
    setIsExpanded(!isExpanded);
  };

  return (
    <div className="mx-auto grid w-full max-w-[360px] justify-items-center gap-3">
      <motion.div
        ref={containerRef}
        className={`relative max-w-full cursor-pointer select-none rounded-2xl outline-none focus-visible:ring-2 focus-visible:ring-[#39ff14] ${className ?? ''}`}
        role="button"
        tabIndex={0}
        aria-expanded={isExpanded}
        aria-label={`${location} — ${locale === 'ar' ? (isExpanded ? 'تصغير الخريطة' : 'توسيع الخريطة') : isExpanded ? 'Collapse map' : 'Expand map'}`}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleClick();
          } else if (e.key === 'Escape') setIsExpanded(false);
        }}
        style={{
          perspective: 1000,
        }}
        onMouseMove={handleMouseMove}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={handleMouseLeave}
        onClick={handleClick}
      >
        <motion.div
          className="relative overflow-hidden rounded-2xl border border-white/20 bg-[#101510]"
          style={{
            rotateX: reduced ? 0 : springRotateX,
            rotateY: reduced ? 0 : springRotateY,
            maxWidth: '100%',
            transformStyle: 'preserve-3d',
          }}
          animate={{
            width: isExpanded ? 360 : 240,
            height: isExpanded ? 280 : 140,
          }}
          transition={{
            type: reduced ? 'tween' : 'spring',
            stiffness: 400,
            damping: 35,
            ...(reduced ? { duration: 0 } : {}),
          }}
        >
          {/* Subtle gradient overlay */}
          <div className="pointer-events-none absolute inset-0 z-20 bg-gradient-to-br from-white/5 via-transparent to-black/10" />

          <AnimatePresence>
            {isExpanded && (
              <motion.div
                className="pointer-events-none absolute inset-0"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.4, delay: 0.1 }}
              >
                {/* Real map tiles */}
                <div className="absolute inset-0 overflow-hidden">
                  <div
                    className="absolute"
                    style={{
                      width: '768px', // 3 tiles * 256px
                      height: '768px',
                      left: '50%',
                      top: '50%',
                      transform: `translate(${-256 - (center.x % 1) * 256}px, ${-256 - (center.y % 1) * 256}px)`,
                    }}
                  >
                    {tiles.map((tile, index) => (
                      <motion.div
                        key={index}
                        className="absolute"
                        style={{
                          width: '256px',
                          height: '256px',
                          left: `${(tile.offsetX + 1) * 256}px`,
                          top: `${(tile.offsetY + 1) * 256}px`,
                        }}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: tilesLoaded ? 1 : 0 }}
                        transition={{ duration: 0.3, delay: index * 0.05 }}
                      >
                        <NextImage
                          src={tile.url}
                          alt=""
                          width={256}
                          height={256}
                          unoptimized
                          crossOrigin="anonymous"
                          className="h-full w-full"
                        />
                      </motion.div>
                    ))}
                  </div>
                </div>

                {/* Map loading placeholder */}
                {!tilesLoaded && <div className="absolute inset-0 animate-pulse bg-white/10" />}

                {/* Location marker */}
                <motion.div
                  className="absolute top-1/2 left-1/2 z-10 -translate-x-1/2 -translate-y-full"
                  initial={{ scale: 0, y: -20 }}
                  animate={{ scale: 1, y: 0 }}
                  transition={{
                    type: 'spring',
                    stiffness: 400,
                    damping: 20,
                    delay: 0.3,
                  }}
                >
                  <svg
                    width="32"
                    height="32"
                    viewBox="0 0 24 24"
                    fill="none"
                    className="drop-shadow-lg"
                    style={{
                      filter: 'drop-shadow(0 0 10px rgba(52, 211, 153, 0.5))',
                    }}
                  >
                    <path
                      d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"
                      fill="#39ff14"
                    />
                    <circle cx="12" cy="9" r="2.5" className="fill-[#101510]" />
                  </svg>
                </motion.div>

                {/* Gradient overlays for better text readability */}
                <div className="absolute inset-0 z-10 bg-gradient-to-t from-[#101510] via-transparent to-transparent opacity-70" />
                <div className="absolute inset-0 z-10 bg-gradient-to-b from-[#101510]/50 via-transparent to-transparent" />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Grid pattern - only show when collapsed */}
          <motion.div
            className="absolute inset-0 opacity-[0.03]"
            animate={{ opacity: isExpanded ? 0 : 0.03 }}
            transition={{ duration: 0.3 }}
          >
            <svg width="100%" height="100%" className="absolute inset-0">
              <defs>
                <pattern id={gridId} width="20" height="20" patternUnits="userSpaceOnUse">
                  <path
                    d="M 20 0 L 0 0 0 20"
                    fill="none"
                    className="stroke-white"
                    strokeWidth="0.5"
                  />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill={`url(#${gridId})`} />
            </svg>
          </motion.div>

          {/* Content */}
          <div className="relative z-20 flex h-full flex-col justify-between p-5">
            {/* Top section */}
            <div className="flex items-start justify-between">
              <div className="relative">
                <motion.div
                  className="relative"
                  animate={{
                    opacity: isExpanded ? 0 : 1,
                  }}
                  transition={{ duration: 0.3 }}
                >
                  {/* Map Icon SVG */}
                  <motion.svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="text-[#39ff14]"
                    animate={{
                      filter: isHovered
                        ? 'drop-shadow(0 0 8px rgba(52, 211, 153, 0.6))'
                        : 'drop-shadow(0 0 4px rgba(52, 211, 153, 0.3))',
                    }}
                    transition={{ duration: 0.3 }}
                  >
                    <polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21" />
                    <line x1="9" x2="9" y1="3" y2="18" />
                    <line x1="15" x2="15" y1="6" y2="21" />
                  </motion.svg>
                </motion.div>
              </div>
            </div>

            {/* Bottom section */}
            <div className="space-y-1">
              <motion.h3
                className="font-medium text-white text-sm tracking-tight"
                animate={{
                  x: isHovered ? 4 : 0,
                }}
                transition={{ type: 'spring', stiffness: 400, damping: 25 }}
              >
                {location}
              </motion.h3>

              <AnimatePresence>
                {isExpanded && (
                  <motion.p
                    dir="ltr"
                    className="font-mono text-white/65 text-[10px]"
                    initial={{ opacity: 0, y: -10, height: 0 }}
                    animate={{ opacity: 1, y: 0, height: 'auto' }}
                    exit={{ opacity: 0, y: -10, height: 0 }}
                    transition={{ duration: 0.25 }}
                  >
                    {coordinates}
                  </motion.p>
                )}
              </AnimatePresence>

              {/* Animated underline */}
              {!isExpanded && (
                <p className="text-[11px] text-white/55">
                  {locale === 'ar' ? 'اضغط لعرض الخريطة' : 'Click to reveal the map'}
                </p>
              )}
              <motion.div
                className="h-px bg-gradient-to-r from-[#39ff14]/50 via-[#39ff14]/30 to-transparent"
                initial={{ scaleX: 0, originX: 0 }}
                animate={{
                  scaleX: isHovered || isExpanded ? 1 : 0.3,
                }}
                transition={{ duration: 0.4, ease: 'easeOut' }}
              />
            </div>
          </div>
        </motion.div>
      </motion.div>
      {tilesFailed && isExpanded ? (
        <p role="status" className="text-xs text-amber-200">
          {locale === 'ar'
            ? 'تعذر تحميل بعض أجزاء الخريطة؛ افتح الموقع من الرابط.'
            : 'Some tiles could not load; open the location below.'}
        </p>
      ) : null}
      <a
        href={mapUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="text-sm font-bold text-[#39ff14] underline underline-offset-4"
      >
        {locale === 'ar' ? 'الاتجاهات على خرائط Google ↗' : 'Directions on Google Maps ↗'}
      </a>
      {isExpanded && (
        <p className="text-[10px] text-white/55" dir="ltr">
          ©{' '}
          <a
            href="https://www.openstreetmap.org/copyright"
            target="_blank"
            rel="noreferrer"
            className="underline"
          >
            OpenStreetMap
          </a>
          {tileProvider !== 'openstreetmap' && (
            <>
              {' '}
              · ©{' '}
              <a
                href="https://carto.com/attributions"
                target="_blank"
                rel="noreferrer"
                className="underline"
              >
                CARTO
              </a>
            </>
          )}
        </p>
      )}
    </div>
  );
}
