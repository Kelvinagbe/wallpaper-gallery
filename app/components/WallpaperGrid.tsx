'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { WallpaperCard, NativeAdCard } from './WallpaperCard';
import { usePrefetch } from '@/app/hooks/usePrefetch';
import type { Wallpaper, Ad } from '../types';

/* ─── responsive helpers ─────────────────────────────────────────────── */
const getColCount = (w: number) => w >= 1024 ? 5 : w >= 768 ? 4 : w >= 480 ? 3 : 2;
const getGap      = (w: number) => w >= 1024 ? 10 : w >= 768 ? 8 : w >= 480 ? 6 : 5;
// Tight side padding: 4px on mobile, slightly more on larger screens
const getPad      = (w: number) => w >= 1024 ? 8 : w >= 768 ? 6 : 2;
const getItemGap  = (cols: number) => cols >= 4 ? 12 : cols >= 3 ? 10 : 8;

/* ─── shimmer ─────────────────────────────────────────────────────────── */
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

const Shimmer = ({ i, o = 1 }: { i: number; o?: number }) => {
  const c = COLORS[i % COLORS.length];
  const anim = { backgroundSize: '200% 100%', animation: 'shimmerSweep 1.6s ease-in-out infinite' };
  return (
    <div style={{ opacity: o }}>
      <div style={{ position: 'relative', width: '100%', borderRadius: 16, overflow: 'hidden', aspectRatio: '9/16', background: c.bg }}>
        <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(105deg,transparent 40%,${c.shimmer}80 50%,transparent 60%)`, ...anim }} />
      </div>
      {/* shimmer info rows — no horizontal padding */}
      <div style={{ padding: '5px 0 0', display: 'flex', flexDirection: 'column', gap: 4 }}>
        <div style={{ height: 10, borderRadius: 4, background: c.bg, width: '80%', ...anim }} />
        <div style={{ height: 8, borderRadius: 4, background: c.bg, width: '50%', ...anim, animationDelay: '0.1s' }} />
      </div>
    </div>
  );
};

const ShimmerGrid = ({ count, opacity, cols, gap, pad, itemGap }: {
  count: number; opacity?: number; cols: number; gap: number; pad: number; itemGap: number;
}) => {
  const columns: number[][] = Array.from({ length: cols }, () => []);
  for (let i = 0; i < count; i++) columns[i % cols].push(i);
  return (
    <div style={{ width: '100%', boxSizing: 'border-box', overflow: 'hidden', display: 'flex', gap: `${gap}px`, padding: `12px ${pad}px`, alignItems: 'flex-start' }}>
      {columns.map((col, ci) => (
        <div key={ci} style={{ flex: '1 1 0', minWidth: 0, display: 'flex', flexDirection: 'column', gap: `${itemGap}px` }}>
          {col.map(i => <Shimmer key={i} i={i} o={opacity} />)}
        </div>
      ))}
    </div>
  );
};

/* ─── feed types ──────────────────────────────────────────────────────── */
type MasonryItem = { kind: 'wallpaper'; wp: Wallpaper } | { kind: 'native'; ad: Ad };

/* ─── masonry block ───────────────────────────────────────────────────── */
const MasonryBlock = ({
  items, cols, gap, pad, itemGap, chunkOffset, onWallpaperClick,
}: {
  items: MasonryItem[];
  cols: number; gap: number; pad: number; itemGap: number;
  chunkOffset: number;
  onWallpaperClick?: (w: Wallpaper) => void;
}) => {
  const columns = useMemo(() => {
    const result: MasonryItem[][] = Array.from({ length: cols }, () => []);
    items.forEach((item, i) => result[i % cols].push(item));
    return result;
  }, [items, cols]);

  return (
    <div style={{
      width: '100%', boxSizing: 'border-box', overflow: 'hidden',
      display: 'flex', gap: `${gap}px`, padding: `0 ${pad}px`, alignItems: 'flex-start',
    }}>
      {columns.map((col, ci) => (
        <div key={ci} style={{ flex: '1 1 0', minWidth: 0, display: 'flex', flexDirection: 'column', gap: `${itemGap}px` }}>
          {col.map((entry, idx) =>
            entry.kind === 'native'
              ? (
                <NativeAdCard
                  key={`native_${entry.ad.id}_${ci}`}
                  ad={entry.ad}
                  placeholderIndex={ci + idx * cols}
                />
              )
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
  wallpapers:        Wallpaper[];
  isLoading:         boolean;
  onWallpaperClick?: (w: Wallpaper) => void;
  onLoadMore?:       () => Promise<void>;
  hasMore?:          boolean;
  /** Native ad frequency (1 per N wallpapers). Default 7 */
  nativeEvery?:      number;
};

/* ─── main component ──────────────────────────────────────────────────── */
export const WallpaperGrid = ({
  wallpapers,
  isLoading,
  onWallpaperClick,
  onLoadMore,
  hasMore = true,
  nativeEvery = 7,
}: Props) => {
  const [loadingMore, setLoadingMore]     = useState(false);
  const [hasEverLoaded, setHasEverLoaded] = useState(false);
  const [dims, setDims] = useState(() => {
    const w = typeof window !== 'undefined' ? window.innerWidth : 390;
    return { cols: getColCount(w), gap: getGap(w), pad: getPad(w) };
  });
  const triggerRef = useRef<HTMLDivElement>(null);
  const loadingRef = useRef(false);
  const failedRef  = useRef(false);

  const nativeAds = useMemo<Ad[]>(() =>
    typeof window === 'undefined'
      ? []
      : ((window as any).MY_ADS ?? []).filter((a: Ad) => a.adType === 'native'),
  []);

  usePrefetch(useMemo(() => wallpapers.slice(20, 30).map(w => w.url), [wallpapers]));

  useEffect(() => {
    const fn = () => {
      const w = window.innerWidth;
      setDims({ cols: getColCount(w), gap: getGap(w), pad: getPad(w) });
    };
    window.addEventListener('resize', fn, { passive: true });
    return () => window.removeEventListener('resize', fn);
  }, []);

  useEffect(() => {
    if (wallpapers.length > 0 && !hasEverLoaded) setHasEverLoaded(true);
  }, [wallpapers.length, hasEverLoaded]);

  useEffect(() => {
    if (!onLoadMore || !hasMore) return;
    const retry = async () => {
      if (!failedRef.current || loadingRef.current) return;
      failedRef.current = false;
      loadingRef.current = true;
      setLoadingMore(true);
      try { await onLoadMore(); }
      catch { failedRef.current = true; console.error('Retry on reconnect failed'); }
      finally { loadingRef.current = false; setLoadingMore(false); }
    };
    window.addEventListener('online', retry);
    return () => window.removeEventListener('online', retry);
  }, [onLoadMore, hasMore]);

  useEffect(() => {
    if (!triggerRef.current || !onLoadMore || !hasMore) return;
    const el = triggerRef.current;
    const ob = new IntersectionObserver(async ([e]) => {
      if (!e.isIntersecting || loadingRef.current || !hasMore) return;
      loadingRef.current = true;
      setLoadingMore(true);
      try {
        await onLoadMore();
        failedRef.current = false;
        ob.unobserve(el);
        ob.observe(el);
      }
      catch {
        failedRef.current = true;
        console.error('Load more failed');
      }
      finally { loadingRef.current = false; setLoadingMore(false); }
    }, { threshold: 0, rootMargin: '1200px' });
    ob.observe(el);
    return () => ob.disconnect();
  }, [onLoadMore, hasMore]);

  const { cols, gap, pad } = dims;
  const itemGap = getItemGap(cols);

  const items = useMemo<MasonryItem[]>(() => {
    const result: MasonryItem[] = [];
    let nativeIdx = 0;
    wallpapers.forEach((wp, i) => {
      result.push({ kind: 'wallpaper', wp });
      if (nativeAds.length && (i + 1) % nativeEvery === 0)
        result.push({ kind: 'native', ad: nativeAds[nativeIdx++ % nativeAds.length] });
    });
    return result;
  }, [wallpapers, nativeAds, nativeEvery]);

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
  return (
    <>
      <div style={{ paddingTop: 12 }}>
        <MasonryBlock
          items={items}
          cols={cols}
          gap={gap}
          pad={pad}
          itemGap={itemGap}
          chunkOffset={0}
          onWallpaperClick={onWallpaperClick}
        />
      </div>

      {hasMore && <div ref={triggerRef} style={{ height: 1 }} />}

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

      {!hasMore && wallpapers.length > 0 && (
        <div style={{ textAlign: 'center', padding: '48px 0 32px', color: '#6b7280', fontSize: 15, fontWeight: 500 }}>
          You've seen all wallpapers ✨
        </div>
      )}

      <style>{CSS}</style>
    </>
  );
};
