'use client';

import { useState, useEffect, useRef, useMemo, memo } from 'react';
import { WallpaperCard, NativeAdCard } from './WallpaperCard';
import type { Wallpaper, Ad } from '../types';

/* ─── layout helpers ─────────────────────────────────────────────────── */
const getColCount = (w: number) => w >= 1024 ? 5 : w >= 768 ? 4 : w >= 480 ? 3 : 2;
const GAP = 6;
const PAD = 4;

const COLORS = [
  { bg: '#e8eaf0', shimmer: '#d0d4e8' },
  { bg: '#ede8f0', shimmer: '#d8cce8' },
  { bg: '#e8f0ea', shimmer: '#cce0d0' },
  { bg: '#f0e8e8', shimmer: '#e8cccc' },
  { bg: '#f0ede8', shimmer: '#e8dcc8' },
];

/* ─── shimmer ────────────────────────────────────────────────────────── */
const Shimmer = ({ i, o = 1 }: { i: number; o?: number }) => {
  const c = COLORS[i % COLORS.length];
  const anim: React.CSSProperties = {
    backgroundSize: '200% 100%',
    animation: 'shimmerSweep 1.6s ease-in-out infinite',
  };
  return (
    <div style={{ opacity: o, flex: '1 1 0', minWidth: 0 }}>
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

const ShimmerGrid = ({ opacity, cols }: { opacity?: number; cols: number }) => (
  <div style={{ display: 'flex', gap: GAP, padding: `12px ${PAD}px`, alignItems: 'flex-start' }}>
    {Array.from({ length: cols }, (_, i) => (
      <Shimmer key={i} i={i} o={opacity} />
    ))}
  </div>
);

/* ─── types ──────────────────────────────────────────────────────────── */
type MasonryItem = { kind: 'wallpaper'; wp: Wallpaper } | { kind: 'native'; ad: Ad };

/* ─── row ────────────────────────────────────────────────────────────── */
const Row = memo(({ items, cols, chunkOffset, onWallpaperClick }: {
  items: MasonryItem[];
  cols: number;
  chunkOffset: number;
  onWallpaperClick?: (w: Wallpaper) => void;
}) => (
  <div style={{
    display: 'flex',
    gap: GAP,
    padding: `0 ${PAD}px`,
    alignItems: 'flex-start', // ← KEY FIX: was 'stretch', caused white gap below cards
  }}>
    {items.map((entry, idx) =>
      entry.kind === 'native'
        ? <NativeAdCard key={`native_${entry.ad.id}`} ad={entry.ad} placeholderIndex={idx} />
        : <WallpaperCard
            key={entry.wp.id}
            wp={entry.wp}
            priority={chunkOffset + idx < 6}
            placeholderIndex={idx}
            onClick={onWallpaperClick ? () => onWallpaperClick(entry.wp) : undefined}
          />
    )}
    {/* fill empty slots so last row stays same width */}
    {Array.from({ length: cols - items.length }, (_, i) => (
      <div key={`empty_${i}`} style={{ flex: '1 1 0', minWidth: 0 }} />
    ))}
  </div>
));
Row.displayName = 'Row';

/* ─── props ──────────────────────────────────────────────────────────── */
type Props = {
  wallpapers: Wallpaper[];
  isLoading: boolean;
  onWallpaperClick?: (w: Wallpaper) => void;
  onLoadMore?: () => Promise<void>;
  hasMore?: boolean;
  nativeEvery?: number;
};

/* ─── main ───────────────────────────────────────────────────────────── */
export const WallpaperGrid = ({
  wallpapers,
  isLoading,
  onWallpaperClick,
  onLoadMore,
  hasMore = true,
  nativeEvery = 7,
}: Props) => {
  const [cols, setCols] = useState(() =>
    typeof window !== 'undefined' ? getColCount(window.innerWidth) : 2
  );
  const [hasEverLoaded, setHasEverLoaded] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const loadingRef = useRef(false);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* responsive cols */
  useEffect(() => {
    const fn = () => setCols(getColCount(window.innerWidth));
    window.addEventListener('resize', fn, { passive: true });
    return () => window.removeEventListener('resize', fn);
  }, []);

  /* track first load */
  useEffect(() => {
    if (wallpapers.length > 0 && !hasEverLoaded) setHasEverLoaded(true);
  }, [wallpapers.length, hasEverLoaded]);

  /* infinite scroll */
  useEffect(() => {
    if (!onLoadMore) return;
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      async ([entry]) => {
        if (!entry.isIntersecting || !hasMore || loadingRef.current) return;
        loadingRef.current = true;
        setLoadError(false);

        timeoutRef.current = setTimeout(() => {
          loadingRef.current = false;
          setLoadError(true);
        }, 10_000);

        try {
          await onLoadMore();
          setLoadError(false);
        } catch {
          setLoadError(true);
        } finally {
          if (timeoutRef.current) clearTimeout(timeoutRef.current);
          loadingRef.current = false;
        }
      },
      { rootMargin: '400px' }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [onLoadMore, hasMore]);

  /* build rows */
  const nativeAds = useMemo<Ad[]>(() =>
    typeof window === 'undefined'
      ? []
      : ((window as any).MY_ADS ?? []).filter((a: Ad) => a.adType === 'native'),
  []);

  const rows = useMemo<MasonryItem[][]>(() => {
    const items: MasonryItem[] = [];
    let nativeIdx = 0;
    wallpapers.forEach((wp, i) => {
      items.push({ kind: 'wallpaper', wp });
      if (nativeAds.length && (i + 1) % nativeEvery === 0)
        items.push({ kind: 'native', ad: nativeAds[nativeIdx++ % nativeAds.length] });
    });
    const result: MasonryItem[][] = [];
    for (let i = 0; i < items.length; i += cols)
      result.push(items.slice(i, i + cols));
    return result;
  }, [wallpapers, nativeAds, nativeEvery, cols]);

  /* ─── early states ─── */
  if (!hasEverLoaded && isLoading)
    return <ShimmerGrid cols={cols} />;

  if (hasEverLoaded && wallpapers.length === 0 && isLoading)
    return <ShimmerGrid opacity={0.5} cols={cols} />;

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
    <div style={{ paddingTop: 12, display: 'flex', flexDirection: 'column', gap: GAP }}>
      {rows.map((row, i) => (
        <Row
          key={i}
          items={row}
          cols={cols}
          chunkOffset={i * cols}
          onWallpaperClick={onWallpaperClick}
        />
      ))}

      {/* infinite scroll sentinel */}
      <div ref={sentinelRef} style={{ height: 1 }} />

      {/* loading spinner — only shown while more pages exist */}
      {hasMore && !loadError && (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '16px 0' }}>
          <span style={{
            display: 'inline-block', width: 20, height: 20,
            border: '2px solid #d1d5db', borderTopColor: '#6b7280',
            borderRadius: '50%', animation: 'spin .7s linear infinite',
          }} />
        </div>
      )}

      {/* network error + retry */}
      {loadError && (
        <div style={{ textAlign: 'center', padding: '16px 0' }}>
          <p style={{ color: '#9ca3af', fontSize: 13, marginBottom: 8 }}>
            Slow connection — couldn't load more
          </p>
          <button
            onClick={() => { setLoadError(false); onLoadMore?.(); }}
            style={{
              padding: '8px 24px', borderRadius: 99, border: '1.5px solid #e5e7eb',
              background: '#fff', color: '#374151', fontSize: 13,
              fontWeight: 600, cursor: 'pointer',
            }}
          >
            Retry
          </button>
        </div>
      )}

      {/* end of feed */}
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
