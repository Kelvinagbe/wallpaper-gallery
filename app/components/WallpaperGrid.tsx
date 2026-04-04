'use client';

import { useState, useEffect, useRef, useMemo, memo } from 'react';
import { WallpaperCard, NativeAdCard } from './WallpaperCard';
import type { Wallpaper, Ad } from '../types';

/* ─── responsive helpers ─────────────────────────────────────────────── */
const getColCount = (w: number) => w >= 1024 ? 5 : w >= 768 ? 4 : w >= 480 ? 3 : 2;
const getGap      = (w: number) => w >= 1024 ? 10 : w >= 768 ? 8 : w >= 480 ? 6 : 5;
const getPad      = (w: number) => w >= 1024 ? 8 : w >= 768 ? 4 : 0;
const getItemGap  = (cols: number) => cols >= 4 ? 12 : cols >= 3 ? 10 : 8;

const COLORS = [
  { bg: '#e8eaf0', shimmer: '#d0d4e8' }, { bg: '#ede8f0', shimmer: '#d8cce8' },
  { bg: '#e8f0ea', shimmer: '#cce0d0' }, { bg: '#f0e8e8', shimmer: '#e8cccc' },
  { bg: '#f0ede8', shimmer: '#e8dcc8' },
];

/* ─── shimmer ─────────────────────────────────────────────────────────── */
const Shimmer = ({ i, o = 1 }: { i: number; o?: number }) => {
  const c = COLORS[i % COLORS.length];
  const anim: React.CSSProperties = { backgroundSize: '200% 100%', animation: 'shimmerSweep 1.6s ease-in-out infinite' };
  return (
    <div style={{ opacity: o }}>
      <div style={{ position: 'relative', width: '100%', borderRadius: 16, overflow: 'hidden', aspectRatio: '9/16', background: c.bg }}>
        <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(105deg,transparent 40%,${c.shimmer}80 50%,transparent 60%)`, ...anim }} />
      </div>
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
    <div style={{ width: '100%', boxSizing: 'border-box', display: 'flex', gap: `${gap}px`, padding: `12px ${pad}px`, alignItems: 'flex-start' }}>
      {columns.map((col, ci) => (
        <div key={ci} style={{ flex: '1 1 0', minWidth: 0, display: 'flex', flexDirection: 'column', gap: `${itemGap}px` }}>
          {col.map(i => <Shimmer key={i} i={i} o={opacity} />)}
        </div>
      ))}
    </div>
  );
};

/* ─── types ──────────────────────────────────────────────────────────── */
type MasonryItem = { kind: 'wallpaper'; wp: Wallpaper } | { kind: 'native'; ad: Ad };
type Dims = { cols: number; gap: number; pad: number };

/* ─── frozen masonry chunk — memo so it never re-renders ─────────────── */
const MasonryChunk = memo(({ items, cols, gap, pad, itemGap, chunkOffset, onWallpaperClick }: {
  items: MasonryItem[]; cols: number; gap: number; pad: number; itemGap: number;
  chunkOffset: number; onWallpaperClick?: (w: Wallpaper) => void;
}) => {
  // Build columns once — frozen by memo, never reshuffles
  const columns = useMemo(() => {
    const result: MasonryItem[][] = Array.from({ length: cols }, () => []);
    items.forEach((item, i) => result[i % cols].push(item));
    return result;
  }, [items, cols]);

  return (
    <div style={{ width: '100%', boxSizing: 'border-box', display: 'flex', gap: `${gap}px`, padding: `0 ${pad}px`, alignItems: 'flex-start' }}>
      {columns.map((col, ci) => (
        <div key={ci} style={{ flex: '1 1 0', minWidth: 0, display: 'flex', flexDirection: 'column', gap: `${itemGap}px` }}>
          {col.map((entry, idx) =>
            entry.kind === 'native'
              ? <NativeAdCard key={`native_${entry.ad.id}_${ci}`} ad={entry.ad} placeholderIndex={ci + idx * cols} />
              : <WallpaperCard key={entry.wp.id} wp={entry.wp}
                  priority={chunkOffset + ci + idx * cols < 6}
                  placeholderIndex={ci + idx * cols}
                  onClick={onWallpaperClick ? () => onWallpaperClick(entry.wp) : undefined}
                />
          )}
        </div>
      ))}
    </div>
  );
});
MasonryChunk.displayName = 'MasonryChunk';

/* ─── props ──────────────────────────────────────────────────────────── */
type Props = {
  wallpapers:        Wallpaper[];
  isLoading:         boolean;
  onWallpaperClick?: (w: Wallpaper) => void;
  onLoadMore?:       () => Promise<void>;
  hasMore?:          boolean;
  nativeEvery?:      number;
  chunkSize?:        number;
};

const CHUNK_SIZE = 10;

/* ─── main ───────────────────────────────────────────────────────────── */
export const WallpaperGrid = ({
  wallpapers, isLoading, onWallpaperClick, onLoadMore, hasMore = true, nativeEvery = 7, chunkSize = CHUNK_SIZE,
}: Props) => {
  const [loadingMore, setLoadingMore]     = useState(false);
  const [hasEverLoaded, setHasEverLoaded] = useState(false);
  const [dims, setDims] = useState<Dims>(() => {
    const w = typeof window !== 'undefined' ? window.innerWidth : 390;
    return { cols: getColCount(w), gap: getGap(w), pad: getPad(w) };
  });

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

  const { cols, gap, pad } = dims;
  const itemGap = getItemGap(cols);

  // Build flat items list with native ads injected
  const nativeAds = useMemo<Ad[]>(() =>
    typeof window === 'undefined' ? [] : ((window as any).MY_ADS ?? []).filter((a: Ad) => a.adType === 'native'),
  []);

  const allItems = useMemo<MasonryItem[]>(() => {
    const result: MasonryItem[] = [];
    let nativeIdx = 0;
    wallpapers.forEach((wp, i) => {
      result.push({ kind: 'wallpaper', wp });
      if (nativeAds.length && (i + 1) % nativeEvery === 0)
        result.push({ kind: 'native', ad: nativeAds[nativeIdx++ % nativeAds.length] });
    });
    return result;
  }, [wallpapers, nativeAds, nativeEvery]);

  // Split into frozen chunks — each chunk is a stable slice that never changes
  const chunks = useMemo(() => {
    const result: MasonryItem[][] = [];
    for (let i = 0; i < allItems.length; i += chunkSize)
      result.push(allItems.slice(i, i + chunkSize));
    return result;
  }, [allItems, chunkSize]);

  const handleLoadMore = async () => {
    if (!onLoadMore || loadingMore) return;
    setLoadingMore(true);
    try { await onLoadMore(); }
    catch { console.error('Load more failed'); }
    finally { setLoadingMore(false); }
  };

  /* ─── early states ─── */
  if (!hasEverLoaded && isLoading)
    return <ShimmerGrid count={10} cols={cols} gap={gap} pad={pad} itemGap={itemGap} />;

  if (hasEverLoaded && wallpapers.length === 0 && isLoading)
    return <ShimmerGrid count={6} opacity={0.5} cols={cols} gap={gap} pad={pad} itemGap={itemGap} />;

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
    <div style={{ paddingTop: 12, display: 'flex', flexDirection: 'column', gap: `${itemGap}px` }}>

      {/* Each chunk is frozen by memo — already-loaded cards never re-render or shift */}
      {chunks.map((chunk, i) => (
        <MasonryChunk
          key={i}
          items={chunk}
          cols={cols}
          gap={gap}
          pad={pad}
          itemGap={itemGap}
          chunkOffset={i * chunkSize}
          onWallpaperClick={onWallpaperClick}
        />
      ))}

      {/* Load More button */}
      {hasMore && onLoadMore && (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '32px 0 16px' }}>
          <button
            onClick={handleLoadMore}
            disabled={loadingMore}
            style={{
              padding: '12px 36px', borderRadius: 99, border: '1.5px solid #e5e7eb',
              background: loadingMore ? '#f9fafb' : '#fff', color: loadingMore ? '#9ca3af' : '#374151',
              fontSize: 14, fontWeight: 600, cursor: loadingMore ? 'not-allowed' : 'pointer',
              transition: 'all .15s', display: 'flex', alignItems: 'center', gap: 8,
            }}
            onMouseEnter={e => { if (!loadingMore) e.currentTarget.style.background = '#f3f4f6'; }}
            onMouseLeave={e => { e.currentTarget.style.background = loadingMore ? '#f9fafb' : '#fff'; }}
          >
            {loadingMore ? (
              <>
                <span style={{ display: 'inline-block', width: 14, height: 14, border: '2px solid #d1d5db', borderTopColor: '#6b7280', borderRadius: '50%', animation: 'spin .7s linear infinite' }} />
                Loading…
              </>
            ) : 'Load more'}
          </button>
        </div>
      )}

      {!hasMore && wallpapers.length > 0 && (
        <div style={{ textAlign: 'center', padding: '48px 0 32px', color: '#6b7280', fontSize: 15, fontWeight: 500 }}>
          You've seen all wallpapers ✨
        </div>
      )}

      <style>{`
        @keyframes shimmerSweep { 0%{background-position:-200% 0} 100%{background-position:200% 0} }
        @keyframes spin { to{transform:rotate(360deg)} }
        img { -webkit-user-drag: none }
      `}</style>
    </div>
  );
};
