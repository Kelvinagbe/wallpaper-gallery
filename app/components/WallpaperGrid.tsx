'use client';

import { useState, useEffect, useRef, useMemo, memo } from 'react';
import { WallpaperCard, NativeAdCard } from './WallpaperCard';
import type { Wallpaper, Ad } from '../types';

/* ─── layout ─────────────────────────────────────────────────────────── */
const getColCount = (w: number) => w >= 1024 ? 5 : w >= 768 ? 4 : w >= 480 ? 3 : 2;
const GAP          = 6;
const PAD          = 4;
const SLOW_AFTER   = 4_000;
const HARD_TIMEOUT = 10_000;
const MAX_RETRIES  = 3;
const SCROLL_THRESHOLD = 500; // px from bottom to trigger load

const COLORS = [
  { bg: '#e8eaf0', shimmer: '#d0d4e8' },
  { bg: '#ede8f0', shimmer: '#d8cce8' },
  { bg: '#e8f0ea', shimmer: '#cce0d0' },
  { bg: '#f0e8e8', shimmer: '#e8cccc' },
  { bg: '#f0ede8', shimmer: '#e8dcc8' },
];

/* ─── shimmer ────────────────────────────────────────────────────────── */
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
        <div style={{ height: 8, borderRadius: 6, background: c.bg, width: '45%', ...sweep, animationDelay: '.12s' }} />
      </div>
    </div>
  );
};

const ShimmerRow = ({ cols, opacity }: { cols: number; opacity?: number }) => (
  <div style={{ display: 'flex', gap: GAP, padding: `0 ${PAD}px`, alignItems: 'flex-start' }}>
    {Array.from({ length: cols }, (_, i) => <ShimmerCard key={i} i={i} o={opacity} />)}
  </div>
);

/* ─── dot loader ─────────────────────────────────────────────────────── */
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

/* ─── network banner ─────────────────────────────────────────────────── */
type NetStatus = 'idle' | 'slow' | 'offline' | 'error';

const NetworkBanner = ({ status, retryCount, onRetry }: {
  status: NetStatus; retryCount: number; onRetry: () => void;
}) => {
  if (status === 'idle') return null;
  const cfg = {
    slow:    { emoji: '🐢', msg: 'Slow network — still loading…', color: '#92400e', bg: '#fffbeb', border: '#fde68a', btn: false },
    offline: { emoji: '📵', msg: 'No internet connection',        color: '#991b1b', bg: '#fff1f2', border: '#fecaca', btn: true  },
    error:   { emoji: '⚠️', msg: 'Failed to load more',           color: '#7c3aed', bg: '#f5f3ff', border: '#ddd6fe', btn: true  },
  }[status];

  return (
    <div style={{
      margin: `4px ${PAD}px 0`, padding: '12px 14px', borderRadius: 14,
      background: cfg.bg, border: `1px solid ${cfg.border}`,
      display: 'flex', alignItems: 'center', gap: 10,
    }}>
      <span style={{ fontSize: 18, flexShrink: 0 }}>{cfg.emoji}</span>
      <p style={{ flex: 1, margin: 0, fontSize: 12, fontWeight: 600, color: cfg.color, lineHeight: 1.4 }}>
        {cfg.msg}
        {retryCount > 0 && status === 'error' && (
          <span style={{ opacity: 0.7, fontWeight: 400 }}> · attempt {retryCount}/{MAX_RETRIES}</span>
        )}
      </p>
      {cfg.btn && (
        retryCount < MAX_RETRIES
          ? <button onClick={onRetry} style={{ flexShrink: 0, padding: '6px 14px', borderRadius: 99, border: `1.5px solid ${cfg.border}`, background: '#fff', fontSize: 12, fontWeight: 700, color: cfg.color, cursor: 'pointer' }}>Retry</button>
          : <span style={{ fontSize: 11, color: cfg.color, opacity: 0.7 }}>Check connection</span>
      )}
    </div>
  );
};

/* ─── types ──────────────────────────────────────────────────────────── */
type MasonryItem = { kind: 'wallpaper'; wp: Wallpaper } | { kind: 'native'; ad: Ad };

/* ─── row ────────────────────────────────────────────────────────────── */
const Row = memo(({ items, cols, chunkOffset, onWallpaperClick }: {
  items: MasonryItem[]; cols: number;
  chunkOffset: number; onWallpaperClick?: (w: Wallpaper) => void;
}) => (
  <div style={{ display: 'flex', gap: GAP, padding: `0 ${PAD}px`, alignItems: 'flex-start' }}>
    {items.map((entry, idx) =>
      entry.kind === 'native'
        ? <NativeAdCard key={`native_${entry.ad.id}`} ad={entry.ad} placeholderIndex={idx} />
        : <WallpaperCard
            key={entry.wp.id} wp={entry.wp}
            priority={chunkOffset + idx < 6} placeholderIndex={idx}
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
  wallpapers, isLoading, onWallpaperClick,
  onLoadMore, hasMore = true, nativeEvery = 7,
}: Props) => {
  const [cols, setCols] = useState(() =>
    typeof window !== 'undefined' ? getColCount(window.innerWidth) : 2
  );
  const [hasEverLoaded, setHasEverLoaded] = useState(false);
  const [isFetching,    setIsFetching]    = useState(false);
  const [netStatus,     setNetStatus]     = useState<NetStatus>('idle');
  const [retryCount,    setRetryCount]    = useState(0);

  // All mutable values that scroll handler reads go in refs
  // so the scroll listener never becomes stale
  const isFetchingRef = useRef(false);
  const hasMoreRef    = useRef(hasMore);
  const onLoadMoreRef = useRef(onLoadMore);
  const retryCountRef = useRef(retryCount);
  const slowTimer     = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hardTimer     = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Keep refs in sync with latest props/state
  useEffect(() => { hasMoreRef.current    = hasMore;    }, [hasMore]);
  useEffect(() => { onLoadMoreRef.current = onLoadMore; }, [onLoadMore]);
  useEffect(() => { retryCountRef.current = retryCount; }, [retryCount]);

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

  /* online/offline */
  useEffect(() => {
    const goOffline = () => setNetStatus('offline');
    const goOnline  = () => setNetStatus(s => s === 'offline' ? 'idle' : s);
    window.addEventListener('offline', goOffline);
    window.addEventListener('online',  goOnline);
    return () => {
      window.removeEventListener('offline', goOffline);
      window.removeEventListener('online',  goOnline);
    };
  }, []);

  /* ── core fetch ── */
  const clearTimers = () => {
    if (slowTimer.current) { clearTimeout(slowTimer.current); slowTimer.current = null; }
    if (hardTimer.current) { clearTimeout(hardTimer.current); hardTimer.current = null; }
  };

  const doFetch = async () => {
    const fn = onLoadMoreRef.current;
    if (!fn || isFetchingRef.current || !hasMoreRef.current) return;
    if (!navigator.onLine) { setNetStatus('offline'); return; }

    isFetchingRef.current = true;
    setIsFetching(true);
    setNetStatus('idle');

    slowTimer.current = setTimeout(() => {
      if (isFetchingRef.current) setNetStatus('slow');
    }, SLOW_AFTER);

    hardTimer.current = setTimeout(() => {
      if (isFetchingRef.current) {
        clearTimers();
        isFetchingRef.current = false;
        setIsFetching(false);
        setNetStatus('error');
      }
    }, HARD_TIMEOUT);

    try {
      await fn();
      clearTimers();
      setNetStatus('idle');
      setRetryCount(0);
    } catch {
      clearTimers();
      setNetStatus(navigator.onLine ? 'error' : 'offline');
    } finally {
      isFetchingRef.current = false;
      setIsFetching(false);
    }
  };

  /* ── scroll-based infinite scroll ──
     Uses window scroll instead of IntersectionObserver.
     Fires when user is within SCROLL_THRESHOLD px of the bottom.
     Reads from refs so it never goes stale.                       */
  useEffect(() => {
    if (!onLoadMore) return;

    const onScroll = () => {
      if (!hasMoreRef.current || isFetchingRef.current) return;
      const distanceFromBottom =
        document.documentElement.scrollHeight -
        window.scrollY -
        window.innerHeight;
      if (distanceFromBottom < SCROLL_THRESHOLD) {
        doFetch();
      }
    };

    window.addEventListener('scroll', onScroll, { passive: true });

    // Also check immediately in case content doesn't fill the screen yet
    onScroll();

    return () => window.removeEventListener('scroll', onScroll);
  }, [onLoadMore]); // only depends on onLoadMore — everything else via refs

  /* ── retry ── */
  const handleRetry = () => {
    if (retryCountRef.current >= MAX_RETRIES) return;
    setRetryCount(c => c + 1);
    setNetStatus('idle');
    doFetch();
  };

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
      <div style={{ display: 'flex', flexDirection: 'column', gap: GAP, paddingTop: 12 }}>
        <ShimmerRow cols={cols} />
        <ShimmerRow cols={cols} opacity={0.6} />
        <ShimmerRow cols={cols} opacity={0.3} />
      </div>
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

      {rows.map((row, i) => (
        <Row key={i} items={row} cols={cols} chunkOffset={i * cols} onWallpaperClick={onWallpaperClick} />
      ))}

      {isFetching && <DotLoader />}

      <NetworkBanner status={netStatus} retryCount={retryCount} onRetry={handleRetry} />

      {!hasMore && wallpapers.length > 0 && !isFetching && (
        <div style={{ textAlign: 'center', padding: '40px 0 28px', color: '#9ca3af', fontSize: 13, fontWeight: 500 }}>
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
