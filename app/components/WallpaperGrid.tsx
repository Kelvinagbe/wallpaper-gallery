'use client';

import { useState, useEffect, useRef, useMemo, memo } from 'react';
import { WallpaperCard, NativeAdCard } from './WallpaperCard';
import type { Wallpaper, Ad } from '../types';

/* ─── layout ─────────────────────────────────────────────────────────── */
const getColCount = (w: number) => w >= 1024 ? 5 : w >= 768 ? 4 : w >= 480 ? 3 : 2;
const GAP              = 6;
const PAD              = 4;
const SLOW_AFTER       = 4_000;
const HARD_TIMEOUT     = 10_000;
const MAX_RETRIES      = 3;
const SCROLL_THRESHOLD = 700;
const BANNER_EVERY     = 5; // show banner every N rows (adjust between 4–6 as needed)

/* ─── iOS detection (run once, client-side) ──────────────────────────── */
const isIOS = (): boolean => {
  if (typeof navigator === 'undefined') return false;
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    // iPad on iOS 13+ reports as MacIntel but has touch
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  );
};

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
        <div style={{ height: 8,  borderRadius: 6, background: c.bg, width: '45%', ...sweep, animationDelay: '.12s' }} />
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

/* ─── app install banner (Android only) ─────────────────────────────── */
const AppInstallBanner = () => {
  const [visible, setVisible] = useState(false);

  // Don't render at all for iOS users
  if (isIOS()) return null;

  // eslint-disable-next-line react-hooks/rules-of-hooks
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 50);
    return () => clearTimeout(t);
  }, []);

  const handleClick = () => {
    window.location.href = '/download/android';
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={e => e.key === 'Enter' && handleClick()}
      style={{
        display: 'block',
        margin: `4px ${PAD}px`,
        borderRadius: 16,
        overflow: 'hidden',
        cursor: 'pointer',
        transform: visible ? 'translateY(0) scale(1)' : 'translateY(12px) scale(0.98)',
        opacity: visible ? 1 : 0,
        transition: 'transform 0.35s cubic-bezier(.34,1.4,.64,1), opacity 0.3s ease',
        WebkitTapHighlightColor: 'transparent',
        outline: 'none',
      }}
    >
      <img
        src="/app_download.png"
        alt="Download Walls app for the best experience"
        draggable={false}
        style={{
          display: 'block',
          width: '100%',
          height: 'auto',
          borderRadius: 16,
          pointerEvents: 'none',
          userSelect: 'none',
        }}
      />
    </div>
  );
};

/* ─── types ──────────────────────────────────────────────────────────── */
type MasonryItem =
  | { kind: 'wallpaper'; wp: Wallpaper }
  | { kind: 'native'; ad: Ad }
  | { kind: 'appbanner'; id: number };

/* ─── row ────────────────────────────────────────────────────────────── */
const Row = memo(({ items, cols, chunkOffset, onWallpaperClick }: {
  items: MasonryItem[]; cols: number;
  chunkOffset: number;
  onWallpaperClick?: (w: Wallpaper) => void;
}) => {
  // App banner — full width, not a card column
  if (items.length === 1 && items[0].kind === 'appbanner') {
    return <AppInstallBanner />;
  }

  return (
    <div style={{ display: 'flex', gap: GAP, padding: `0 ${PAD}px`, alignItems: 'flex-start' }}>
      {items.map((entry, idx) =>
        entry.kind === 'native'
          ? <NativeAdCard key={`native_${entry.ad.id}`} ad={entry.ad} placeholderIndex={idx} />
          : entry.kind === 'wallpaper'
            ? <WallpaperCard
                key={entry.wp.id} wp={entry.wp}
                priority={chunkOffset + idx < 6} placeholderIndex={idx}
                onClick={onWallpaperClick ? () => onWallpaperClick(entry.wp) : undefined}
              />
            : null
      )}
      {Array.from({ length: cols - items.filter(e => e.kind !== 'appbanner').length }, (_, i) => (
        <div key={`empty_${i}`} style={{ flex: '1 1 0', minWidth: 0 }} />
      ))}
    </div>
  );
});
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

  const isFetchingRef = useRef(false);
  const hasMoreRef    = useRef(hasMore);
  const onLoadMoreRef = useRef(onLoadMore);
  const retryCountRef = useRef(retryCount);
  const slowTimer     = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hardTimer     = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  /* ── scroll-based infinite scroll ── */
  useEffect(() => {
    if (!onLoadMore) return;
    const onScroll = () => {
      if (!hasMoreRef.current || isFetchingRef.current) return;
      const distanceFromBottom =
        document.documentElement.scrollHeight - window.scrollY - window.innerHeight;
      if (distanceFromBottom < SCROLL_THRESHOLD) doFetch();
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, [onLoadMore]);

  const handleRetry = () => {
    if (retryCountRef.current >= MAX_RETRIES) return;
    setRetryCount(c => c + 1);
    setNetStatus('idle');
    doFetch();
  };

  /* ── build rows with banner injected every BANNER_EVERY rows ── */
  const nativeAds = useMemo<Ad[]>(() =>
    typeof window === 'undefined'
      ? []
      : ((window as any).MY_ADS ?? []).filter((a: Ad) => a.adType === 'native'),
  []);

  const rows = useMemo<MasonryItem[][]>(() => {
    // iOS users never see the app install banner rows
    const showBanner = !isIOS();

    // 1. Build flat item list
    const items: MasonryItem[] = [];
    let nativeIdx = 0;
    wallpapers.forEach((wp, i) => {
      items.push({ kind: 'wallpaper', wp });
      if (nativeAds.length && (i + 1) % nativeEvery === 0)
        items.push({ kind: 'native', ad: nativeAds[nativeIdx++ % nativeAds.length] });
    });

    // 2. Split into rows of `cols`
    const rawRows: MasonryItem[][] = [];
    for (let i = 0; i < items.length; i += cols)
      rawRows.push(items.slice(i, i + cols));

    // 3. Inject banner row after every BANNER_EVERY rows (Android only)
    const result: MasonryItem[][] = [];
    rawRows.forEach((row, rowIdx) => {
      result.push(row);
      if (showBanner && (rowIdx + 1) % BANNER_EVERY === 0) {
        result.push([{ kind: 'appbanner', id: rowIdx }]);
      }
    });

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
        <Row
          key={i} items={row} cols={cols} chunkOffset={i * cols}
          onWallpaperClick={onWallpaperClick}
        />
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
