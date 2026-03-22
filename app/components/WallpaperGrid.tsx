'use client';

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { WallpaperCard } from './WallpaperCard';
import { usePrefetch } from '@/app/hooks/usePrefetch';
import type { Wallpaper } from '../types';

/* ─── Placeholder palette ─── */
const COLORS = [
  { bg: '#e8eaf0', shimmer: '#d0d4e8' },
  { bg: '#ede8f0', shimmer: '#d8cce8' },
  { bg: '#e8f0ea', shimmer: '#cce0d0' },
  { bg: '#f0e8e8', shimmer: '#e8cccc' },
  { bg: '#f0ede8', shimmer: '#e8dcc8' },
];

/* ─── Column counts per breakpoint ─── */
const BREAKPOINTS = [
  { minWidth: 1024, cols: 5 },
  { minWidth: 768,  cols: 4 },
  { minWidth: 480,  cols: 3 },
  { minWidth: 0,    cols: 2 },
];

const getColCount = (width: number) =>
  (BREAKPOINTS.find(b => width >= b.minWidth) ?? BREAKPOINTS[BREAKPOINTS.length - 1]).cols;

/* ─── Gap per breakpoint ─── */
const getGap = (width: number) => {
  if (width >= 1024) return 12;
  if (width >= 768)  return 10;
  if (width >= 480)  return 8;
  return 6;
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
    <div style={{ marginBottom: 10, opacity }}>
      <div style={{ position: 'relative', width: '100%', borderRadius: 16, overflow: 'hidden', aspectRatio: '9/16', background: c.bg }}>
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

/* ─── Shimmer grid (initial load) — still uses column-count, safe here because
       it's a static placeholder count that never changes ─── */
const ShimmerGrid = ({ count, opacity, cols, gap }: { count: number; opacity?: number; cols: number; gap: number }) => {
  // Split shimmers evenly across columns
  const columns: number[][] = Array.from({ length: cols }, () => []);
  for (let i = 0; i < count; i++) columns[i % cols].push(i);

  return (
    <div style={{ display: 'flex', gap, padding: '6px 0', alignItems: 'flex-start' }}>
      {columns.map((col, ci) => (
        <div key={ci} style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
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
  const [colCount,      setColCount]      = useState(2);
  const [gap,           setGap]           = useState(6);

  const triggerRef   = useRef<HTMLDivElement>(null);
  const loadingRef   = useRef(false);

  /*
   * colAssignment: permanent map of wallpaper.id → column index.
   * Once assigned, a card's column NEVER changes, even across re-renders
   * or when more wallpapers are appended. This eliminates reflow flicker.
   */
  const colAssignment = useRef<Map<string, number>>(new Map());

  /*
   * colHeights tracks the *count* of items per column so we can
   * assign new items to the shortest column. This is purely for
   * initial distribution balance — it's never used to re-sort
   * already-assigned items.
   */
  const colHeights = useRef<number[]>([]);

  usePrefetch(useMemo(() => wallpapers.slice(20, 30).map(wp => wp.url), [wallpapers]));

  /* ── Responsive column/gap tracking ── */
  useEffect(() => {
    const update = () => {
      const w = window.innerWidth;
      setColCount(getColCount(w));
      setGap(getGap(w));
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(document.documentElement);
    return () => ro.disconnect();
  }, []);

  /* ── When col count changes (resize), reset all assignments ── */
  useEffect(() => {
    colAssignment.current.clear();
    colHeights.current = Array(colCount).fill(0);
    // Re-assign all current wallpapers in order
    for (const wp of wallpapers) {
      const shortest = colHeights.current.indexOf(Math.min(...colHeights.current));
      colAssignment.current.set(wp.id, shortest);
      colHeights.current[shortest]++;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [colCount]);

  /* ── Assign column to any new wallpapers not yet in the map ── */
  const assignNewWallpapers = useCallback((wps: Wallpaper[], cols: number) => {
    if (colHeights.current.length !== cols) {
      colHeights.current = Array(cols).fill(0);
    }
    // Recount heights from existing assignments to stay in sync
    const counts = Array(cols).fill(0);
    for (const col of colAssignment.current.values()) counts[col]++;
    colHeights.current = counts;

    for (const wp of wps) {
      if (colAssignment.current.has(wp.id)) continue;
      const shortest = colHeights.current.indexOf(Math.min(...colHeights.current));
      colAssignment.current.set(wp.id, shortest);
      colHeights.current[shortest]++;
    }
  }, []);

  // Run assignment whenever wallpapers or colCount changes
  useMemo(() => {
    assignNewWallpapers(wallpapers, colCount);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wallpapers, colCount]);

  /* ── Build stable column arrays ── */
  const columns = useMemo<Wallpaper[][]>(() => {
    const cols: Wallpaper[][] = Array.from({ length: colCount }, () => []);
    for (const wp of wallpapers) {
      const col = colAssignment.current.get(wp.id) ?? 0;
      cols[col].push(wp);
    }
    return cols;
  }, [wallpapers, colCount]);

  /* ── Lifecycle ── */
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

  /* ── Padding per breakpoint ── */
  const padding = colCount >= 5 ? '12px 10px' : colCount >= 4 ? '10px 8px' : colCount >= 3 ? '8px 6px' : '6px 0';
  const itemGap = colCount >= 4 ? 14 : colCount >= 3 ? 12 : 10;

  /* ── Render states ── */
  if (!hasEverLoaded && isLoading)
    return (
      <>
        <ShimmerGrid count={10} cols={colCount} gap={gap} />
        <style>{GLOBAL_CSS}</style>
      </>
    );

  if (hasEverLoaded && wallpapers.length === 0 && isLoading)
    return (
      <>
        <ShimmerGrid count={6} opacity={0.5} cols={colCount} gap={gap} />
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
      {/* ── Stable column layout ── */}
      <div style={{ display: 'flex', gap, padding, alignItems: 'flex-start' }}>
        {columns.map((col, ci) => (
          <div key={ci} style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: itemGap }}>
            {col.map((wp, idx) => (
              <WallpaperCard
                key={wp.id}
                wp={wp}
                priority={ci * col.length + idx < 6}
                placeholderIndex={ci * col.length + idx}
                onClick={onWallpaperClick ? () => onWallpaperClick(wp) : undefined}
              />
            ))}
          </div>
        ))}
      </div>

      {hasMore && <div ref={triggerRef} style={{ height: 1 }} />}

      {loadingMore && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '32px 0', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
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
