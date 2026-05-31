'use client';

import { useState, useEffect, useRef, useMemo, memo, useCallback } from 'react';
import { WallpaperCard, NativeAdCard } from './WallpaperCard';
import type { Wallpaper, Ad } from '../types';

/* ─── layout ─────────────────────────────────────────────────────────── */
const getColCount = (w: number) => w >= 1024 ? 5 : w >= 768 ? 4 : w >= 480 ? 3 : 2;
const GAP = 6;
const PAD = 4;
const FETCH_TIMEOUT = 10_000; // 10s before showing slow network warning
const MAX_RETRIES   = 3;

const COLORS = [
  { bg: '#e8eaf0', shimmer: '#d0d4e8' },
  { bg: '#ede8f0', shimmer: '#d8cce8' },
  { bg: '#e8f0ea', shimmer: '#cce0d0' },
  { bg: '#f0e8e8', shimmer: '#e8cccc' },
  { bg: '#f0ede8', shimmer: '#e8dcc8' },
];

/* ─── shimmer card ───────────────────────────────────────────────────── */
const ShimmerCard = ({ i, o = 1 }: { i: number; o?: number }) => {
  const c = COLORS[i % COLORS.length];
  const sweep: React.CSSProperties = {
    backgroundSize: '200% 100%',
    animation: 'shimmerSweep 1.6s ease-in-out infinite',
  };
  return (
    <div style={{ opacity: o, flex: '1 1 0', minWidth: 0 }}>
      <div style={{ position: 'relative', width: '100%', borderRadius: 16, overflow: 'hidden', aspectRatio: '9/16', background: c.bg }}>
        <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(105deg,transparent 40%,${c.shimmer}80 50%,transparent 60%)`, ...sweep }} />
      </div>
      <div style={{ padding: '6px 0 0', display: 'flex', flexDirection: 'column', gap: 5 }}>
        <div style={{ height: 10, borderRadius: 6, background: c.bg, width: '75%', ...sweep }} />
        <div style={{ height: 8,  borderRadius: 6, background: c.bg, width: '45%', ...sweep, animationDelay: '.12s' }} />
      </div>
    </div>
  );
};

const ShimmerRow = ({ cols, opacity }: { cols: number; opacity?: number }) => (
  <div style={{ display: 'flex', gap: GAP, padding: `12px ${PAD}px`, alignItems: 'flex-start' }}>
    {Array.from({ length: cols }, (_, i) => <ShimmerCard key={i} i={i} o={opacity} />)}
  </div>
);

/* ─── three-dot loader ───────────────────────────────────────────────── */
const DotLoader = () => (
  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 6, padding: '20px 0' }}>
    {[0, 1, 2].map(i => (
      <span key={i} style={{
        display: 'inline-block', width: 8, height: 8, borderRadius: '50%',
        background: '#d1d5db',
        animation: 'dotPulse 1.2s ease-in-out infinite',
        animationDelay: `${i * 0.18}s`,
      }} />
    ))}
  </div>
);

/* ─── network status banner ──────────────────────────────────────────── */
type NetStatus = 'idle' | 'slow' | 'offline' | 'error';

const NetworkBanner = ({ status, onRetry }: { status: NetStatus; onRetry: () => void }) => {
  if (status === 'idle') return null;

  const cfg = {
    slow:    { emoji: '🐢', msg: 'Slow network detected — still loading…', color: '#92400e', bg: '#fffbeb', border: '#fde68a', showRetry: false },
    offline: { emoji: '📵', msg: 'No internet connection',                 color: '#991b1b', bg: '#fff1f2', border: '#fecaca', showRetry: true  },
    error:   { emoji: '⚠️', msg: 'Failed to load — tap to retry',          color: '#7c3aed', bg: '#f5f3ff', border: '#ddd6fe', showRetry: true  },
  }[status];

  return (
    <div style={{
      margin: `4px ${PAD}px 0`,
      padding: '12px 14px',
      borderRadius: 14,
      background: cfg.bg,
      border: `1px solid ${cfg.border}`,
      display: 'flex',
      alignItems: 'center',
      gap: 10,
    }}>
      <span style={{ fontSize: 18, flexShrink: 0 }}>{cfg.emoji}</span>
      <p style={{ flex: 1, margin: 0, fontSize: 12, fontWeight: 600, color: cfg.color, lineHeight: 1.4 }}>
        {cfg.msg}
      </p>
      {cfg.showRetry && (
        <button
          onClick={onRetry}
          style={{
            flexShrink: 0, padding: '6px 14px', borderRadius: 99,
            border: `1.5px solid ${cfg.border}`, background: '#fff',
            fontSize: 12, fontWeight: 700, color: cfg.color, cursor: 'pointer',
          }}
        >
          Retry
        </button>
      )}
    </div>
  );
};

/* ─── types ──────────────────────────────────────────────────────────── */
type MasonryItem = { kind: 'wallpaper'; wp: Wallpaper } | { kind: 'native'; ad: Ad };

/* ─── row ────────────────────────────────────────────────────────────── */
const Row = memo(({ items, cols, chunkOffset, onWallpaperClick }: {
  items: MasonryItem[];
  cols: number;
  chunkOffset: number;
  onWallpaperClick?: (w: Wallpaper) => void;
}) => (
  <div style={{ display: 'flex', gap: GAP, padding: `0 ${PAD}px`, alignItems: 'flex-start' }}>
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
  const [isFetching,    setIsFetching]    = useState(false);
  const [netStatus,     setNetStatus]     = useState<NetStatus>('idle');
  const [retryCount,    setRetryCount]    = useState(0);

  const loadingRef   = useRef(false);
  const sentinelRef  = useRef<HTMLDivElement>(null);
  const slowTimer    = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fetchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* responsive cols */
  useEffect(() => {
    const fn = () => setCols(getColCount(window.innerWidth));
    window.addEventListener('resize', fn, { passive: true });
    return () => window.removeEventListener('resize', fn);
  }, []);

  /* track first successful load */
  useEffect(() => {
    if (wallpapers.length > 0 && !hasEverLoaded) setHasEverLoaded(true);
  }, [wallpapers.length, hasEverLoaded]);

  /* online/offline listener */
  useEffect(() => {
    const goOffline = () => setNetStatus('offline');
    const goOnline  = () => {
      if (netStatus === 'offline') setNetStatus('idle');
    };
    window.addEventListener('offline', goOffline);
    window.addEventListener('online',  goOnline);
    return () => {
      window.removeEventListener('offline', goOffline);
      window.removeEventListener('online',  goOnline);
    };
  }, [netStatus]);

  /* ── fetch with timeout + slow-network detection ── */
  const doFetch = useCallback(async (isRetry = false) => {
    if (!onLoadMore || loadingRef.current || !hasMore) return;
    if (!navigator.onLine) { setNetStatus('offline'); return; }

    loadingRef.current = true;
    setIsFetching(true);
    if (!isRetry) setNetStatus('idle');

    // Show "slow network" banner after 4s if still loading
    slowTimer.current = setTimeout(() => {
      if (loadingRef.current) setNetStatus('slow');
    }, 4_000);

    // Hard timeout — give up after FETCH_TIMEOUT and let user retry
    fetchTimeout.current = setTimeout(() => {
      if (loadingRef.current) {
        loadingRef.current = false;
        setIsFetching(false);
        setNetStatus('error');
        if (slowTimer.current) clearTimeout(slowTimer.current);
      }
    }, FETCH_TIMEOUT);

    try {
      await onLoadMore();
      setNetStatus('idle');
      setRetryCount(0);
    } catch {
      if (navigator.onLine) {
        setNetStatus('error');
      } else {
        setNetStatus('offline');
      }
    } finally {
      if (slowTimer.current)    clearTimeout(slowTimer.current);
      if (fetchTimeout.current) clearTimeout(fetchTimeout.current);
      loadingRef.current = false;
      setIsFetching(false);
    }
  }, [onLoadMore, hasMore]);

  /* retry handler */
  const handleRetry = useCallback(() => {
    if (retryCount >= MAX_RETRIES) {
      setNetStatus('error');
      return;
    }
    setRetryCount(c => c + 1);
    setNetStatus('idle');
    doFetch(true);
  }, [doFetch, retryCount]);

  /* ── infinite scroll sentinel ── */
  useEffect(() => {
    if (!onLoadMore) return;
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && hasMore && !loadingRef.current) {
          doFetch();
        }
      },
      { rootMargin: '500px' }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [onLoadMore, hasMore, doFetch]);

  /* ── build rows ── */
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
    return (
      <>
        <ShimmerRow cols={cols} />
        <ShimmerRow cols={cols} opacity={0.6} />
        <ShimmerRow cols={cols} opacity={0.3} />
      </>
    );

  if (hasEverLoaded && wallpapers.length === 0 && isLoading)
    return <ShimmerRow cols={cols} opacity={0.5} />;

  if (!wallpapers.length && !isLoading)
    return (
      <div style={{ textAlign: 'center', padding: '80px 20px' }}>
        <div style={{ fontSize: 56, marginBottom: 12 }}>🔍</div>
        <h3 style={{ fontSize: 18, fontWeight: 700, color: '#1f2937', margin: '0 0 6px' }}>No wallpapers found</h3>
        <p style={{ color: '#9ca3af', fontSize: 13, margin: 0 }}>Try adjusting your search or filters</p>
      </div>
    );

  /* ─── main render ─── */
  return (
    <div style={{ paddingTop: 12, display: 'flex', flexDirection: 'column', gap: GAP }}>

      {/* grid rows */}
      {rows.map((row, i) => (
        <Row
          key={i}
          items={row}
          cols={cols}
          chunkOffset={i * cols}
          onWallpaperClick={onWallpaperClick}
        />
      ))}

      {/* sentinel — invisible div that triggers load more */}
      <div ref={sentinelRef} style={{ height: 1 }} />

      {/* network banner — slow / offline / error */}
      <NetworkBanner status={netStatus} onRetry={handleRetry} />

      {/* three-dot loader while fetching */}
      {isFetching && netStatus !== 'slow' && <DotLoader />}

      {/* slow network: show dots + banner simultaneously */}
      {isFetching && netStatus === 'slow' && <DotLoader />}

      {/* end of feed */}
      {!hasMore && wallpapers.length > 0 && netStatus === 'idle' && (
        <div style={{
          textAlign: 'center', padding: '40px 0 28px',
          color: '#9ca3af', fontSize: 13, fontWeight: 500,
        }}>
          You're all caught up ✨
        </div>
      )}

      <style>{`
        @keyframes shimmerSweep {
          0%   { background-position: -200% 0 }
          100% { background-position:  200% 0 }
        }
        @keyframes dotPulse {
          0%, 80%, 100% { transform: scale(0.55); opacity: 0.35; }
          40%           { transform: scale(1);    opacity: 1;    }
        }
        img { -webkit-user-drag: none }
      `}</style>
    </div>
  );
};
