'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { WallpaperCard } from './WallpaperCard';
import { usePrefetch } from '@/app/hooks/usePrefetch';
import Image from 'next/image';
import type { Wallpaper, Ad } from '../types';

/* ─── responsive helpers ─────────────────────────────────────────────── */
const getColCount = (w: number) => w >= 1024 ? 5 : w >= 768 ? 4 : w >= 480 ? 3 : 2;
const getGap      = (w: number) => w >= 1024 ? 12 : w >= 768 ? 10 : w >= 480 ? 8 : 6;
const getPad      = (w: number) => w >= 1024 ? '12px 10px' : w >= 768 ? '10px 8px' : w >= 480 ? '8px 6px' : '6px 0px';
const getItemGap  = (cols: number) => cols >= 4 ? 14 : cols >= 3 ? 12 : 10;

/* ─── shimmer palette ─────────────────────────────────────────────────── */
const COLORS = [
  { bg: '#e8eaf0', shimmer: '#d0d4e8' },
  { bg: '#ede8f0', shimmer: '#d8cce8' },
  { bg: '#e8f0ea', shimmer: '#cce0d0' },
  { bg: '#f0e8e8', shimmer: '#e8cccc' },
  { bg: '#f0ede8', shimmer: '#e8dcc8' },
];

const CSS = `
  @keyframes shimmerSweep {
    0%   { background-position: -200% 0 }
    100% { background-position:  200% 0 }
  }
  @keyframes dotBounce {
    0%,80%,100% { transform: scale(0.6); opacity: 0.4 }
    40%         { transform: scale(1);   opacity: 1   }
  }
`;

/* ─── feed item types ─────────────────────────────────────────────────── */
/**
 * The feed is split into "chunks".
 * Each chunk = a masonry block of wallpapers (+ native ads inline),
 * optionally followed by a full-width banner ad.
 *
 * Banner ads NEVER enter the masonry columns, so they cannot
 * shift heights or break the layout.
 */
type NativeFeedItem  = { kind: 'wallpaper'; wp: Wallpaper } | { kind: 'native'; ad: Ad };
type Chunk = {
  items:  NativeFeedItem[];   // goes into masonry columns
  banner: Ad | null;          // rendered BELOW this chunk, full-width
};

/* ─── shimmer ─────────────────────────────────────────────────────────── */
const Shimmer = ({ i, o = 1 }: { i: number; o?: number }) => {
  const c = COLORS[i % COLORS.length];
  const anim = { backgroundSize: '200% 100%', animation: 'shimmerSweep 1.6s ease-in-out infinite' };
  return (
    <div style={{ opacity: o }}>
      <div style={{ position: 'relative', width: '100%', borderRadius: 16, overflow: 'hidden', aspectRatio: '9/16', background: c.bg }}>
        <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(105deg,transparent 40%,${c.shimmer}80 50%,transparent 60%)`, ...anim }} />
      </div>
      <div style={{ padding: '6px 2px 0', display: 'flex', flexDirection: 'column', gap: 4 }}>
        <div style={{ height: 10, borderRadius: 4, background: c.bg, width: '80%', ...anim }} />
        <div style={{ height: 8,  borderRadius: 4, background: c.bg, width: '50%', ...anim, animationDelay: '0.1s' }} />
      </div>
    </div>
  );
};

const ShimmerGrid = ({ count, opacity, cols, gap, pad, itemGap }: {
  count: number; opacity?: number; cols: number; gap: number; pad: string; itemGap: number;
}) => {
  const columns: number[][] = Array.from({ length: cols }, () => []);
  for (let i = 0; i < count; i++) columns[i % cols].push(i);
  return (
    <div style={{ width: '100%', boxSizing: 'border-box', overflow: 'hidden', display: 'flex', gap: `${gap}px`, padding: pad, alignItems: 'flex-start' }}>
      {columns.map((col, ci) => (
        <div key={ci} style={{ flex: '1 1 0', minWidth: 0, display: 'flex', flexDirection: 'column', gap: `${itemGap}px` }}>
          {col.map(i => <Shimmer key={i} i={i} o={opacity} />)}
        </div>
      ))}
    </div>
  );
};

/* ─── native ad card (inside masonry) ────────────────────────────────── */
const NativeAdCard = ({ ad }: { ad: Ad }) => (
  <a
    href={ad.ctaUrl}
    target="_blank"
    rel="noopener noreferrer sponsored"
    style={{ display: 'block', textDecoration: 'none' }}
    onClick={() =>
      fetch('/api/ads/click', {
        method: 'POST',
        body: JSON.stringify({ adId: ad.id }),
        headers: { 'Content-Type': 'application/json' },
      }).catch(() => {})
    }
  >
    <div style={{ position: 'relative', width: '100%', borderRadius: 16, overflow: 'hidden', aspectRatio: '9/16', background: '#e8eaf0' }}>
      {ad.imageUrl && (
        <Image
          src={ad.imageUrl}
          alt={ad.title}
          fill
          draggable={false}
          className="object-cover"
          sizes="(max-width:480px) 50vw,(max-width:768px) 33vw,20vw"
        />
      )}
      <div style={{
        position: 'absolute', bottom: 10, left: 8, right: 8, zIndex: 5,
        background: '#1d4ed8', borderRadius: 10, padding: '8px 10px',
        display: 'flex', alignItems: 'center', gap: 6,
      }}>
        {ad.brandLogoUrl && (
          <img src={ad.brandLogoUrl} alt={ad.brandName} style={{ width: 18, height: 18, borderRadius: 4, objectFit: 'cover', flexShrink: 0 }} />
        )}
        <span style={{ flex: 1, fontSize: 10, fontWeight: 700, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {ad.title}
        </span>
        <span style={{ fontSize: 9, fontWeight: 800, color: '#1d4ed8', background: '#fff', borderRadius: 5, padding: '3px 8px', flexShrink: 0 }}>
          {ad.ctaLabel ?? 'View'}
        </span>
      </div>
    </div>
    <div style={{ padding: '6px 2px 0', display: 'flex', flexDirection: 'column', gap: 3 }}>
      <p style={{ fontSize: 11, fontWeight: 600, color: '#0a0a0a', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
        {ad.title}
      </p>
      <span style={{ display: 'inline-flex', alignSelf: 'flex-start', fontSize: 9, fontWeight: 800, color: '#fff', background: '#1d4ed8', borderRadius: 4, padding: '2px 6px' }}>
        SPONSORED
      </span>
    </div>
  </a>
);

/* ─── banner ad card (full-width, outside masonry) ───────────────────── */
const BannerAdCard = ({ ad, pad }: { ad: Ad; pad: string }) => (
  <a
    href={ad.ctaUrl}
    target="_blank"
    rel="noopener noreferrer sponsored"
    style={{ display: 'block', textDecoration: 'none', padding: `0 ${pad.split(' ')[1] ?? '0'}` }}
    onClick={() =>
      fetch('/api/ads/click', {
        method: 'POST',
        body: JSON.stringify({ adId: ad.id }),
        headers: { 'Content-Type': 'application/json' },
      }).catch(() => {})
    }
  >
    <div style={{
      borderRadius: 16,
      padding: '18px 20px',
      marginBottom: 4,
      background: ad.backgroundColor ?? '#1e1b4b',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
      boxShadow: '0 2px 12px rgba(0,0,0,0.10)',
    }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 3, flex: 1, minWidth: 0 }}>
        <p style={{ margin: 0, fontWeight: 700, color: '#fff', fontSize: 15, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {ad.title}
        </p>
        {ad.subtitle && (
          <p style={{ margin: 0, color: ad.accentColor ?? '#818cf8', fontSize: 12 }}>
            {ad.subtitle}
          </p>
        )}
        <span style={{ display: 'inline-flex', alignSelf: 'flex-start', fontSize: 9, fontWeight: 800, color: '#ffffff80', background: '#ffffff18', borderRadius: 4, padding: '2px 6px', marginTop: 2 }}>
          SPONSORED
        </span>
      </div>
      <span style={{
        fontSize: 12, fontWeight: 800,
        color: ad.backgroundColor ?? '#1e1b4b',
        background: ad.accentColor ?? '#818cf8',
        borderRadius: 10, padding: '8px 18px',
        whiteSpace: 'nowrap', flexShrink: 0,
      }}>
        {ad.ctaLabel ?? 'Learn More'}
      </span>
    </div>
  </a>
);

/* ─── masonry block ───────────────────────────────────────────────────── */
const MasonryBlock = ({
  items, cols, gap, pad, itemGap, chunkOffset,
  onWallpaperClick,
}: {
  items: NativeFeedItem[];
  cols: number; gap: number; pad: string; itemGap: number;
  chunkOffset: number;
  onWallpaperClick?: (w: Wallpaper) => void;
}) => {
  const columns = useMemo(() => {
    const result: NativeFeedItem[][] = Array.from({ length: cols }, () => []);
    items.forEach((item, i) => result[i % cols].push(item));
    return result;
  }, [items, cols]);

  return (
    <div style={{
      width: '100%', boxSizing: 'border-box', overflow: 'hidden',
      display: 'flex', gap: `${gap}px`, padding: pad, alignItems: 'flex-start',
    }}>
      {columns.map((col, ci) => (
        <div key={ci} style={{ flex: '1 1 0', minWidth: 0, display: 'flex', flexDirection: 'column', gap: `${itemGap}px` }}>
          {col.map((entry, idx) =>
            entry.kind === 'native'
              ? <NativeAdCard key={`native_${entry.ad.id}_${ci}`} ad={entry.ad} />
              : (
                <WallpaperCard
                  key={entry.wp.id}
                  wp={entry.wp}
                  priority={chunkOffset + ci + idx * cols < 6}
                  placeholderIndex={ci + idx * cols}
                  onClick={onWallpaperClick ? () => onWallpaperClick(entry.wp) : undefined}
                />
              )
          )}
        </div>
      ))}
    </div>
  );
};

/* ─── props ───────────────────────────────────────────────────────────── */
type Props = {
  wallpapers:       Wallpaper[];
  isLoading:        boolean;
  onWallpaperClick?: (w: Wallpaper) => void;
  onLoadMore?:      () => Promise<void>;
  hasMore?:         boolean;
  /** How many wallpapers per masonry chunk before a banner is injected. Default 14 */
  bannerEvery?:     number;
  /** How many native ads to inject (1 per N wallpapers). Default 7 */
  nativeEvery?:     number;
};

/* ─── main component ──────────────────────────────────────────────────── */
export const WallpaperGrid = ({
  wallpapers,
  isLoading,
  onWallpaperClick,
  onLoadMore,
  hasMore = true,
  bannerEvery = 14,
  nativeEvery = 7,
}: Props) => {
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasEverLoaded, setHasEverLoaded] = useState(false);
  const [dims, setDims] = useState(() => {
    const w = typeof window !== 'undefined' ? window.innerWidth : 390;
    return { cols: getColCount(w), gap: getGap(w), pad: getPad(w) };
  });
  const triggerRef  = useRef<HTMLDivElement>(null);
  const loadingRef  = useRef(false);

  /* ── ads from window ── */
  const nativeAds = useMemo<Ad[]>(() =>
    typeof window === 'undefined' ? [] : ((window as any).MY_ADS ?? []).filter((a: Ad) => a.adType === 'native'), []);

  const bannerAds = useMemo<Ad[]>(() =>
    typeof window === 'undefined' ? [] : ((window as any).MY_ADS ?? []).filter((a: Ad) => a.adType === 'banner'), []);

  /* ── prefetch ── */
  usePrefetch(useMemo(() => wallpapers.slice(20, 30).map(w => w.url), [wallpapers]));

  /* ── resize ── */
  useEffect(() => {
    const fn = () => {
      const w = window.innerWidth;
      setDims({ cols: getColCount(w), gap: getGap(w), pad: getPad(w) });
    };
    window.addEventListener('resize', fn, { passive: true });
    return () => window.removeEventListener('resize', fn);
  }, []);

  /* ── first load ── */
  useEffect(() => {
    if (wallpapers.length > 0 && !hasEverLoaded) setHasEverLoaded(true);
  }, [wallpapers.length, hasEverLoaded]);

  /* ── infinite scroll ── */
  useEffect(() => {
    if (!triggerRef.current || !onLoadMore || !hasMore) return;
    const ob = new IntersectionObserver(async ([e]) => {
      if (!e.isIntersecting || loadingRef.current || !hasMore) return;
      loadingRef.current = true; setLoadingMore(true);
      try { await onLoadMore(); }
      catch { console.error('Load more failed'); }
      finally { loadingRef.current = false; setLoadingMore(false); }
    }, { threshold: 0.1, rootMargin: '600px' });
    ob.observe(triggerRef.current);
    return () => ob.disconnect();
  }, [onLoadMore, hasMore]);

  const { cols, gap, pad } = dims;
  const itemGap = getItemGap(cols);

  /**
   * Build chunks.
   * Each chunk contains `bannerEvery` wallpapers (+ native ads inline).
   * After each chunk we optionally append a banner ad.
   * Banners NEVER enter the masonry columns.
   */
  const chunks = useMemo<Chunk[]>(() => {
    const result: Chunk[] = [];
    let nativeIdx = 0;
    let bannerIdx = 0;

    for (let base = 0; base < wallpapers.length; base += bannerEvery) {
      const slice = wallpapers.slice(base, base + bannerEvery);
      const items: NativeFeedItem[] = [];

      slice.forEach((wp, i) => {
        items.push({ kind: 'wallpaper', wp });
        // inject a native ad after every `nativeEvery` wallpapers within the chunk
        if (nativeAds.length && (i + 1) % nativeEvery === 0) {
          items.push({ kind: 'native', ad: nativeAds[nativeIdx++ % nativeAds.length] });
        }
      });

      const banner = bannerAds.length
        ? bannerAds[bannerIdx++ % bannerAds.length]
        : null;

      result.push({ items, banner });
    }

    return result;
  }, [wallpapers, nativeAds, bannerAds, bannerEvery, nativeEvery]);

  /* ─── early states ─── */
  if (!hasEverLoaded && isLoading)
    return <><ShimmerGrid count={10} cols={cols} gap={gap} pad={pad} itemGap={itemGap} /><style>{CSS}</style></>;

  if (hasEverLoaded && wallpapers.length === 0 && isLoading)
    return <><ShimmerGrid count={6} opacity={0.5} cols={cols} gap={gap} pad={pad} itemGap={itemGap} /><style>{CSS}</style></>;

  if (!wallpapers.length && !isLoading)
    return (
      <div style={{ textAlign: 'center', padding: '80px 0' }}>
        <div style={{ fontSize: 64, marginBottom: 16 }}>🔍</div>
        <h3 style={{ fontSize: 20, fontWeight: 600, color: '#1f2937', marginBottom: 8 }}>No wallpapers found</h3>
        <p style={{ color: '#9ca3af' }}>Try adjusting your search or filters</p>
      </div>
    );

  /* ─── main render ─── */
  let wallpaperOffset = 0;

  return (
    <>
      {chunks.map((chunk, ci) => {
        const block = (
          <div key={`chunk_${ci}`}>
            {/* masonry block — native ads live here, banner does NOT */}
            <MasonryBlock
              items={chunk.items}
              cols={cols}
              gap={gap}
              pad={pad}
              itemGap={itemGap}
              chunkOffset={wallpaperOffset}
              onWallpaperClick={onWallpaperClick}
            />

            {/* full-width banner — rendered OUTSIDE the masonry columns */}
            {chunk.banner && (
              <BannerAdCard ad={chunk.banner} pad={pad} />
            )}
          </div>
        );

        wallpaperOffset += chunk.items.filter(i => i.kind === 'wallpaper').length;
        return block;
      })}

      {/* infinite scroll trigger */}
      {hasMore && <div ref={triggerRef} style={{ height: 1 }} />}

      {/* loading more indicator */}
      {loadingMore && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '48px 0 32px', gap: 10 }}>
          <div style={{ display: 'flex', gap: 6 }}>
            {[0, 1, 2].map(i => (
              <div key={i} style={{ width: 10, height: 10, borderRadius: '50%', background: '#d1d5db', animation: `dotBounce 1.2s ease-in-out ${i * 0.2}s infinite` }} />
            ))}
          </div>
          <span style={{ color: '#6b7280', fontSize: 15, fontWeight: 500 }}>Loading more...</span>
        </div>
      )}

      {/* end of feed */}
      {!hasMore && wallpapers.length > 0 && (
        <div style={{ textAlign: 'center', padding: '48px 0 32px', color: '#6b7280', fontSize: 15, fontWeight: 500 }}>
          You've seen all wallpapers ✨
        </div>
      )}

      <style>{CSS}</style>
    </>
  );
};
