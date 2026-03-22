'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { WallpaperCard } from './WallpaperCard';
import { usePrefetch } from '@/app/hooks/usePrefetch';
import type { Wallpaper } from '../types';

/* ─── Palette ─── */
const COLORS = [
  { bg: '#e8eaf0', shimmer: '#d0d4e8' },
  { bg: '#ede8f0', shimmer: '#d8cce8' },
  { bg: '#e8f0ea', shimmer: '#cce0d0' },
  { bg: '#f0e8e8', shimmer: '#e8cccc' },
  { bg: '#f0ede8', shimmer: '#e8dcc8' },
];

/* ─── Helpers ─── */
const getColCount = (w: number) => w >= 1024 ? 5 : w >= 768 ? 4 : w >= 480 ? 3 : 2;
const getGap      = (w: number) => w >= 1024 ? 12 : w >= 768 ? 10 : w >= 480 ? 8 : 6;
const getPad      = (w: number) => w >= 1024 ? '12px 10px' : w >= 768 ? '10px 8px' : w >= 480 ? '8px 6px' : '6px 0px';
const getItemGap  = (cols: number) => cols >= 4 ? 14 : cols >= 3 ? 12 : 10;

/** Safe shortest-column finder — no spread operator, no stack risk */
const shortestCol = (heights: number[]): number => {
  let idx = 0;
  for (let i = 1; i < heights.length; i++) {
    if (heights[i] < heights[idx]) idx = i;
  }
  return idx;
};

const GLOBAL_CSS = `
  @keyframes shimmerSweep { 0%{background-position:-200% 0} 100%{background-position:200% 0} }
  @keyframes dotBounce    { 0%,80%,100%{transform:scale(0.6);opacity:0.4} 40%{transform:scale(1);opacity:1} }
`;

/* ════════════════════════════════════════
   SHIMMER CARD
════════════════════════════════════════ */
const ShimmerCard = ({ index, opacity = 1 }: { index: number; opacity?: number }) => {
  const c = COLORS[index % COLORS.length];
  return (
    <div style={{ opacity }}>
      <div style={{
        position: 'relative', width: '100%', borderRadius: 16,
        overflow: 'hidden', aspectRatio: '9/16', background: c.bg,
      }}>
        <div style={{
          position: 'absolute', inset: 0,
          background: `linear-gradient(105deg,transparent 40%,${c.shimmer}80 50%,transparent 60%)`,
          backgroundSize: '200% 100%',
          animation: 'shimmerSweep 1.6s ease-in-out infinite',
        }} />
      </div>
      <div style={{ padding: '6px 2px 0', display: 'flex', flexDirection: 'column', gap: 4 }}>
        <div style={{ height: 10, borderRadius: 4, background: c.bg, width: '80%', animation: 'shimmerSweep 1.6s ease-in-out infinite' }} />
        <div style={{ height: 8,  borderRadius: 4, background: c.bg, width: '50%', animation: 'shimmerSweep 1.6s ease-in-out 0.1s infinite' }} />
      </div>
    </div>
  );
};

const ShimmerGrid = ({ count, opacity, cols, gap, pad, itemGap }: {
  count: number; opacity?: number; cols: number;
  gap: number; pad: string; itemGap: number;
}) => {
  const columns: number[][] = Array.from({ length: cols }, () => []);
  for (let i = 0; i < count; i++) columns[i % cols].push(i);
  return (
    <div style={{
      width: '100%', boxSizing: 'border-box', overflow: 'hidden',
      display: 'flex', gap: `${gap}px`, padding: pad, alignItems: 'flex-start',
    }}>
      {columns.map((col, ci) => (
        <div key={ci} style={{ flex: '1 1 0', minWidth: 0, display: 'flex', flexDirection: 'column', gap: `${itemGap}px` }}>
          {col.map(i => <ShimmerCard key={i} index={i} opacity={opacity} />)}
        </div>
      ))}
    </div>
  );
};

/* ════════════════════════════════════════
   WALLPAPER GRID
════════════════════════════════════════ */
type WallpaperGridProps = {
  wallpapers: Wallpaper[];
  isLoading: boolean;
  onWallpaperClick?: (wallpaper: Wallpaper) => void;
  onLoadMore?: () => Promise<void>;
  hasMore?: boolean;
};

export const WallpaperGrid = ({
  wallpapers, isLoading, onWallpaperClick, onLoadMore, hasMore = true,
}: WallpaperGridProps) => {
  const [loadingMore,   setLoadingMore]   = useState(false);
  const [hasEverLoaded, setHasEverLoaded] = useState(false);

  const [dims, setDims] = useState(() => {
    const w = typeof window !== 'undefined' ? window.innerWidth : 390;
    return { cols: getColCount(w), gap: getGap(w), pad: getPad(w) };
  });

  const triggerRef = useRef<HTMLDivElement>(null);
  const loadingRef = useRef(false);

  /*
   * colMap:    wallpaper.id → column index (permanent, never reassigned)
   * colCounts: item count per column (used only to balance new assignments)
   * lastCols:  detects when col count changes so we can rebuild on resize
   */
  const colMap    = useRef<Map<string, number>>(new Map());
  const colCounts = useRef<number[]>([]);
  const lastCols  = useRef(dims.cols);

  usePrefetch(useMemo(() => wallpapers.slice(20, 30).map(wp => wp.url), [wallpapers]));

  /* ── Window resize ── */
  useEffect(() => {
    const onResize = () => {
      const w = window.innerWidth;
      setDims({ cols: getColCount(w), gap: getGap(w), pad: getPad(w) });
    };
    window.addEventListener('resize', onResize, { passive: true });
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const { cols, gap, pad } = dims;
  const itemGap = getItemGap(cols);

  /* ── On col-count change (resize): wipe and rebuild all assignments ── */
  if (cols !== lastCols.current) {
    colMap.current.clear();
    colCounts.current = new Array(cols).fill(0);
    lastCols.current  = cols;
  }

  /* ── Ensure colCounts is always sized correctly ── */
  if (colCounts.current.length !== cols) {
    colCounts.current = new Array(cols).fill(0);
  }

  /* ── Assign any new wallpapers not yet in the map ── */
  for (const wp of wallpapers) {
    if (colMap.current.has(wp.id)) continue;
    const col = shortestCol(colCounts.current);
    colMap.current.set(wp.id, col);
    colCounts.current[col]++;
  }

  /* ── Build stable column arrays for render ── */
  const columns = useMemo(() => {
    const result: Wallpaper[][] = Array.from({ length: cols }, () => []);
    for (const wp of wallpapers) {
      const col = colMap.current.get(wp.id) ?? 0;
      result[col].push(wp);
    }
    return result;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wallpapers, cols]);

  /* ── hasEverLoaded ── */
  useEffect(() => {
    if (wallpapers.length > 0 && !hasEverLoaded) setHasEverLoaded(true);
  }, [wallpapers.length, hasEverLoaded]);

  /* ── Infinite scroll observer ── */
  useEffect(() => {
    if (!triggerRef.current || !onLoadMore || !hasMore) return;
    const observer = new IntersectionObserver(async ([entry]) => {
      if (!entry.isIntersecting || loadingRef.current || !hasMore) return;
      loadingRef.current = true;
      setLoadingMore(true);
      try { await onLoadMore(); }
      catch { console.error('Load more failed'); }
      finally { loadingRef.current = false; setLoadingMore(false); }
    }, { threshold: 0.1, rootMargin: '400px' });
    observer.observe(triggerRef.current);
    return () => observer.disconnect();
  }, [onLoadMore, hasMore]);

  /* ── Render states ── */
  if (!hasEverLoaded && isLoading)
    return (
      <>
        <ShimmerGrid count={10} cols={cols} gap={gap} pad={pad} itemGap={itemGap} />
        <style>{GLOBAL_CSS}</style>
      </>
    );

  if (hasEverLoaded && wallpapers.length === 0 && isLoading)
    return (
      <>
        <ShimmerGrid count={6} opacity={0.5} cols={cols} gap={gap} pad={pad} itemGap={itemGap} />
        <style>{GLOBAL_CSS}</style>
      </>
    );

  if (wallpapers.length === 0 && !isLoading)
    return (
      <div style={{ textAlign: 'center', padding: '80px 0' }}>
        <div style={{ fontSize: 64, marginBottom: 16 }}>🔍</div>
        <h3 style={{ fontSize: 20, fontWeight: 600, color: '#1f2937', marginBottom: 8 }}>No wallpapers found</h3>
        <p style={{ color: '#9ca3af' }}>Try adjusting your search or filters</p>
      </div>
    );

  return (
    <>
      <div style={{
        width: '100%',
        boxSizing: 'border-box',
        overflow: 'hidden',        /* hard stops any child from bleeding outside */
        display: 'flex',
        gap: `${gap}px`,           /* gap must be a CSS string with px unit */
        padding: pad,
        alignItems: 'flex-start',
      }}>
        {columns.map((col, ci) => (
          <div key={ci} style={{
            flex: '1 1 0',
            minWidth: 0,           /* critical: prevents flex child from overflowing */
            display: 'flex',
            flexDirection: 'column',
            gap: `${itemGap}px`,
          }}>
            {col.map((wp, idx) => (
              <WallpaperCard
                key={wp.id}
                wp={wp}
                priority={ci + idx * cols < 6}
                placeholderIndex={ci + idx * cols}
                onClick={onWallpaperClick ? () => onWallpaperClick(wp) : undefined}
              />
            ))}
          </div>
        ))}
      </div>

      {hasMore && <div ref={triggerRef} style={{ height: 1 }} />}

      {loadingMore && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '32px 0', gap: 8 }}>
          <div style={{ display: 'flex', gap: 6 }}>
            {[0, 1, 2].map(i => (
              <div key={i} style={{
                width: 8, height: 8, borderRadius: '50%', background: '#d1d5db',
                animation: `dotBounce 1.2s ease-in-out ${i * 0.2}s infinite`,
              }} />
            ))}
          </div>
          <span style={{ color: '#9ca3af', fontSize: 12 }}>Loading more...</span>
        </div>
      )}

      {!hasMore && wallpapers.length > 0 && (
        <div style={{ textAlign: 'center', padding: '32px 0', color: '#9ca3af', fontSize: 14 }}>
          You've seen all wallpapers
        </div>
      )}

      <style>{GLOBAL_CSS}</style>
    </>
  );
};
