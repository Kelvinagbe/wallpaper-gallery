'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { RefreshCw } from 'lucide-react';
import { WallpaperCard } from './WallpaperCard';
import { usePrefetch } from '@/app/hooks/usePrefetch';
import type { Wallpaper } from '../types';

const PLACEHOLDER_COLORS = [
  { bg: '#1a1a2e', shimmer: '#16213e' },
  { bg: '#1e1a2e', shimmer: '#2d1b4e' },
  { bg: '#1a2e1e', shimmer: '#1b3a20' },
  { bg: '#2e1a1a', shimmer: '#4e1b1b' },
  { bg: '#2e2a1a', shimmer: '#4e3d1b' },
];
const ASPECT_RATIOS = ['180%', '160%', '190%', '170%', '185%'];

// Full skeleton — only ever shown on cold first load
const SkeletonCard = ({ index }: { index: number }) => {
  const color  = PLACEHOLDER_COLORS[index % PLACEHOLDER_COLORS.length];
  const aspect = ASPECT_RATIOS[index % ASPECT_RATIOS.length];
  return (
    <div className="relative w-full rounded-2xl overflow-hidden" style={{ marginBottom: 12 }}>
      <div className="relative w-full" style={{ paddingBottom: aspect }}>
        <div className="absolute inset-0 rounded-2xl overflow-hidden" style={{ background: color.bg }}>
          <div className="absolute inset-0" style={{
            background: `linear-gradient(105deg, transparent 40%, ${color.shimmer}80 50%, transparent 60%)`,
            backgroundSize: '200% 100%',
            animation: 'shimmerSweep 1.6s ease-in-out infinite',
          }} />
          <div className="absolute bottom-0 left-0 right-0 p-3"
            style={{ background: 'linear-gradient(to top,rgba(0,0,0,0.7),transparent)' }}>
            <div className="h-2.5 rounded mb-2"
              style={{ width: `${55 + (index % 5) * 9}%`, background: 'rgba(255,255,255,0.12)' }} />
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-full flex-shrink-0" style={{ background: 'rgba(255,255,255,0.15)' }} />
              <div className="h-2 rounded"
                style={{ width: `${30 + (index % 3) * 12}%`, background: 'rgba(255,255,255,0.1)' }} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Ghost card — shown during filter change and load-more (not a full page block)
const GhostCard = ({ index }: { index: number }) => {
  const color  = PLACEHOLDER_COLORS[index % PLACEHOLDER_COLORS.length];
  const aspect = ASPECT_RATIOS[index % ASPECT_RATIOS.length];
  return (
    <div className="relative w-full rounded-2xl overflow-hidden" style={{ marginBottom: 12, opacity: 0.55 }}>
      <div className="relative w-full" style={{ paddingBottom: aspect }}>
        <div className="absolute inset-0 rounded-2xl overflow-hidden" style={{ background: color.bg }}>
          <div className="absolute inset-0" style={{
            background: `linear-gradient(105deg, transparent 40%, ${color.shimmer}60 50%, transparent 60%)`,
            backgroundSize: '200% 100%',
            animation: 'shimmerSweep 2s ease-in-out infinite',
          }} />
        </div>
      </div>
    </div>
  );
};

type WallpaperGridProps = {
  wallpapers: Wallpaper[];
  isLoading: boolean;
  onWallpaperClick?: (wallpaper: Wallpaper) => void;
  onRefresh?: () => Promise<void>;
  onLoadMore?: () => Promise<void>;
  hasMore?: boolean;
};

export const WallpaperGrid = ({
  wallpapers, isLoading, onWallpaperClick, onRefresh, onLoadMore, hasMore = true,
}: WallpaperGridProps) => {
  const [showRefreshToast, setShowRefreshToast] = useState(false);
  const [loadingMore,      setLoadingMore]      = useState(false);
  const [hasEverLoaded,    setHasEverLoaded]    = useState(false);
  const [pullState, setPullState] = useState({
    pulling: false, distance: 0, refreshing: false, canRefresh: false,
  });

  const gridRef            = useRef<HTMLDivElement>(null);
  const pullContainerRef   = useRef<HTMLDivElement>(null);
  const loadMoreTriggerRef = useRef<HTMLDivElement>(null);
  const startY             = useRef(0);

  const nextBatchUrls = useMemo(
    () => wallpapers.slice(20, 30).map(wp => wp.url),
    [wallpapers],
  );
  usePrefetch(nextBatchUrls);

  // Once data arrives, mark as ever-loaded — never show full skeleton again
  useEffect(() => {
    if (wallpapers.length > 0 && !hasEverLoaded) setHasEverLoaded(true);
  }, [wallpapers.length]);

  // ── Load more intersection observer ────────────────────────────────────────
  useEffect(() => {
    if (!loadMoreTriggerRef.current || !onLoadMore || !hasMore) return;
    const observer = new IntersectionObserver(
      async ([entry]) => {
        if (entry.isIntersecting && !loadingMore && !isLoading && hasMore) {
          setLoadingMore(true);
          try { await onLoadMore(); }
          catch { console.error('Load more failed'); }
          finally { setLoadingMore(false); }
        }
      },
      { threshold: 0.1, rootMargin: '300px' },
    );
    observer.observe(loadMoreTriggerRef.current);
    return () => observer.disconnect();
  }, [onLoadMore, loadingMore, isLoading, hasMore]);

  // ── Pull to refresh ─────────────────────────────────────────────────────────
  const handleTouchStart = (e: TouchEvent) => {
    if (window.scrollY === 0) {
      startY.current = e.touches[0].clientY;
      setPullState(s => ({ ...s, pulling: true }));
    }
  };
  const handleTouchMove = (e: TouchEvent) => {
    if (!pullState.pulling || window.scrollY > 0) return;
    const distance = Math.max(0, e.touches[0].clientY - startY.current);
    if (distance > 0) {
      e.preventDefault();
      const d = Math.min(distance * 0.4, 100);
      setPullState(s => ({ ...s, distance: d, canRefresh: d >= 60 }));
    }
  };
  const handleTouchEnd = async () => {
    if (pullState.canRefresh && !pullState.refreshing && onRefresh) {
      setPullState(s => ({ ...s, refreshing: true, distance: 60 }));
      navigator.vibrate?.(50);
      try {
        await onRefresh();
        setShowRefreshToast(true);
        setTimeout(() => setShowRefreshToast(false), 2000);
      } catch { console.error('Refresh failed'); }
      setPullState({ pulling: false, distance: 0, refreshing: false, canRefresh: false });
    } else {
      setPullState({ pulling: false, distance: 0, refreshing: false, canRefresh: false });
    }
  };

  useEffect(() => {
    const c = pullContainerRef.current;
    if (!c) return;
    c.addEventListener('touchstart', handleTouchStart, { passive: false });
    c.addEventListener('touchmove',  handleTouchMove,  { passive: false });
    c.addEventListener('touchend',   handleTouchEnd);
    return () => {
      c.removeEventListener('touchstart', handleTouchStart);
      c.removeEventListener('touchmove',  handleTouchMove);
      c.removeEventListener('touchend',   handleTouchEnd);
    };
  }, [pullState.pulling, pullState.canRefresh, pullState.refreshing, onRefresh]);

  // ── LOADING STRATEGY ────────────────────────────────────────────────────────
  // 1. Cold first load              → full skeleton page (10 cards)
  // 2. Filter change / empty+loading → inline ghost cards (no full page block)
  // 3. Empty + not loading           → empty state
  // 4. Normal / back navigation      → real cards instantly, ghost cards at bottom during load-more

  if (!hasEverLoaded && isLoading) {
    return (
      <>
        <div className="masonry">
          {Array.from({ length: 10 }, (_, i) => <SkeletonCard key={i} index={i} />)}
        </div>
        <style>{`@keyframes shimmerSweep{0%{background-position:-200% 0}100%{background-position:200% 0}}`}</style>
      </>
    );
  }

  if (hasEverLoaded && wallpapers.length === 0 && isLoading) {
    return (
      <>
        <div className="masonry">
          {Array.from({ length: 6 }, (_, i) => <GhostCard key={i} index={i} />)}
        </div>
        <style>{`@keyframes shimmerSweep{0%{background-position:-200% 0}100%{background-position:200% 0}}`}</style>
      </>
    );
  }

  if (wallpapers.length === 0 && !isLoading) {
    return (
      <div className="text-center py-20">
        <div className="text-6xl mb-4">🔍</div>
        <h3 className="text-xl font-semibold mb-2">No wallpapers found</h3>
        <p className="text-white/60">Try adjusting your search or filters</p>
      </div>
    );
  }

  return (
    <>
      {/* Pull-to-refresh indicator */}
      <div ref={pullContainerRef} className="fixed top-0 left-0 right-0 z-50 pointer-events-none">
        <div className="flex justify-center items-center"
          style={{ transform: `translateY(${pullState.distance - 60}px)`, opacity: pullState.distance / 60, transition: 'opacity 0.2s' }}>
          <div className="mt-4 p-3 rounded-full shadow-xl transition-all duration-300"
            style={{
              backdropFilter: 'blur(12px)',
              background: pullState.refreshing ? '#3b82f6' : pullState.canRefresh ? '#10b981' : 'rgba(255,255,255,0.2)',
            }}>
            <RefreshCw className="w-6 h-6 text-white"
              style={{ animation: pullState.refreshing ? 'spin 1s linear infinite' : 'none' }} />
          </div>
        </div>
      </div>

      {/* Refresh toast */}
      {showRefreshToast && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-emerald-500/90 backdrop-blur-md px-4 py-2 rounded-full shadow-xl"
          style={{ animation: 'slideDown 0.3s ease-out' }}>
          <span className="text-white text-sm font-medium">✓ Refreshed</span>
        </div>
      )}

      {/* Main masonry grid */}
      <div ref={gridRef} className="masonry">
        {wallpapers.map((wp, idx) => (
          <WallpaperCard
            key={wp.id}
            wp={wp}
            priority={idx < 6}
            placeholderIndex={idx}
            onClick={onWallpaperClick ? () => onWallpaperClick(wp) : undefined}
          />
        ))}
        {/* Ghost cards during load-more — inside the grid, not a spinner below */}
        {loadingMore && Array.from({ length: 4 }, (_, i) => (
          <GhostCard key={`more-${i}`} index={wallpapers.length + i} />
        ))}
      </div>

      {hasMore && <div ref={loadMoreTriggerRef} className="h-1" />}

      {!hasMore && wallpapers.length > 0 && (
        <div className="text-center py-8 text-white/40 text-sm">You've reached the end</div>
      )}

      <style>{`
        @keyframes slideDown{from{transform:translate(-50%,-100%);opacity:0}to{transform:translate(-50%,0);opacity:1}}
        @keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
        @keyframes shimmerSweep{0%{background-position:-200% 0}100%{background-position:200% 0}}
      `}</style>
    </>
  );
};
