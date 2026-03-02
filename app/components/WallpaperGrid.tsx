'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { RefreshCw, Loader2 } from 'lucide-react';
import { WallpaperCard } from './WallpaperCard';
import { usePrefetch } from '@/app/hooks/usePrefetch';
import type { Wallpaper } from '../types';

const PLACEHOLDER_COLORS = [
  { bg: '#e8eaf0', shimmer: '#d0d4e8' },
  { bg: '#ede8f0', shimmer: '#d8cce8' },
  { bg: '#e8f0ea', shimmer: '#cce0d0' },
  { bg: '#f0e8e8', shimmer: '#e8cccc' },
  { bg: '#f0ede8', shimmer: '#e8dcc8' },
];

// Full skeleton — only ever shown on cold first load
const SkeletonCard = ({ index }: { index: number }) => {
  const color = PLACEHOLDER_COLORS[index % PLACEHOLDER_COLORS.length];
  return (
    <div
      className="relative w-full rounded-xl overflow-hidden"
      style={{ aspectRatio: '9/16', background: color.bg }}
    >
      <div
        className="absolute inset-0"
        style={{
          background: `linear-gradient(105deg, transparent 40%, ${color.shimmer}80 50%, transparent 60%)`,
          backgroundSize: '200% 100%',
          animation: 'shimmerSweep 1.6s ease-in-out infinite',
        }}
      />
    </div>
  );
};

// Ghost card — shown during filter change
const GhostCard = ({ index }: { index: number }) => {
  const color = PLACEHOLDER_COLORS[index % PLACEHOLDER_COLORS.length];
  return (
    <div
      className="relative w-full rounded-xl overflow-hidden"
      style={{ aspectRatio: '9/16', background: color.bg, opacity: 0.5 }}
    >
      <div
        className="absolute inset-0"
        style={{
          background: `linear-gradient(105deg, transparent 40%, ${color.shimmer}60 50%, transparent 60%)`,
          backgroundSize: '200% 100%',
          animation: 'shimmerSweep 2s ease-in-out infinite',
        }}
      />
    </div>
  );
};

// Bottom loader — shown when fetching next page
const BottomLoader = () => (
  <div className="col-span-full flex flex-col items-center justify-center py-8 gap-3">
    <div className="flex items-center gap-1.5">
      {[0, 1, 2].map(i => (
        <div
          key={i}
          className="w-2 h-2 rounded-full bg-white/40"
          style={{ animation: `dotBounce 1.2s ease-in-out ${i * 0.2}s infinite` }}
        />
      ))}
    </div>
    <span className="text-white/30 text-xs">Loading more...</span>
  </div>
);

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
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasEverLoaded, setHasEverLoaded] = useState(false);
  const [pullState, setPullState] = useState({
    pulling: false, distance: 0, refreshing: false, canRefresh: false,
  });

  const pullContainerRef = useRef<HTMLDivElement>(null);
  const loadMoreTriggerRef = useRef<HTMLDivElement>(null);
  const startY = useRef(0);

  const nextBatchUrls = useMemo(
    () => wallpapers.slice(20, 30).map(wp => wp.url),
    [wallpapers],
  );
  usePrefetch(nextBatchUrls);

  useEffect(() => {
    if (wallpapers.length > 0 && !hasEverLoaded) setHasEverLoaded(true);
  }, [wallpapers.length]);

  // ── Infinite scroll observer ──────────────────────────────────────────────
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
      { threshold: 0.1, rootMargin: '400px' },
    );
    observer.observe(loadMoreTriggerRef.current);
    return () => observer.disconnect();
  }, [onLoadMore, loadingMore, isLoading, hasMore]);

  // ── Pull to refresh ───────────────────────────────────────────────────────
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
    c.addEventListener('touchmove', handleTouchMove, { passive: false });
    c.addEventListener('touchend', handleTouchEnd);
    return () => {
      c.removeEventListener('touchstart', handleTouchStart);
      c.removeEventListener('touchmove', handleTouchMove);
      c.removeEventListener('touchend', handleTouchEnd);
    };
  }, [pullState.pulling, pullState.canRefresh, pullState.refreshing, onRefresh]);

  // ── Loading states ────────────────────────────────────────────────────────
  if (!hasEverLoaded && isLoading) {
    return (
      <>
        <div className="wallpaper-grid">
          {Array.from({ length: 10 }, (_, i) => <SkeletonCard key={i} index={i} />)}
        </div>
        <style>{`@keyframes shimmerSweep{0%{background-position:-200% 0}100%{background-position:200% 0}}`}</style>
      </>
    );
  }

  if (hasEverLoaded && wallpapers.length === 0 && isLoading) {
    return (
      <>
        <div className="wallpaper-grid">
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
        <div
          className="flex justify-center items-center"
          style={{
            transform: `translateY(${pullState.distance - 60}px)`,
            opacity: pullState.distance / 60,
            transition: 'opacity 0.2s',
          }}
        >
          <div
            className="mt-4 p-3 rounded-full shadow-xl transition-all duration-300"
            style={{
              backdropFilter: 'blur(12px)',
              background: pullState.refreshing ? '#3b82f6' : pullState.canRefresh ? '#10b981' : 'rgba(255,255,255,0.2)',
            }}
          >
            <RefreshCw
              className="w-6 h-6 text-white"
              style={{ animation: pullState.refreshing ? 'spin 1s linear infinite' : 'none' }}
            />
          </div>
        </div>
      </div>

      {/* Refresh toast */}
      {showRefreshToast && (
        <div
          className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-emerald-500/90 backdrop-blur-md px-4 py-2 rounded-full shadow-xl"
          style={{ animation: 'slideDown 0.3s ease-out' }}
        >
          <span className="text-white text-sm font-medium">✓ Refreshed</span>
        </div>
      )}

      {/* Main grid */}
      <div className="wallpaper-grid">
        {wallpapers.map((wp, idx) => (
          <WallpaperCard
            key={wp.id}
            wp={wp}
            priority={idx < 6}
            placeholderIndex={idx}
            onClick={onWallpaperClick ? () => onWallpaperClick(wp) : undefined}
          />
        ))}
      </div>

      {/* Infinite scroll trigger — sits just below the grid */}
      {hasMore && <div ref={loadMoreTriggerRef} className="h-1" />}

      {/* Bottom loader shown while fetching next page */}
      {loadingMore && (
        <div className="flex flex-col items-center a-center py-8 gap-2">
          <div className="flex items-center gap-1.5">
            {[0, 1, 2].map(i => (
              <div
                key={i}
                className="w-2 h-2 rounded-full bg-black/900"
                style={{ animation: `dotBounce 1.2s ease-in-out ${i * 0.2}s infinite` }}
              />
            ))}
          </div>
          <span className="text-black/900 text-xs">Loading more...</span>
        </div>
      )}

      {/* End of feed */}
      {!hasMore && wallpapers.length > 0 && (
        <div className="text-center py-8 text-white/30 text-sm">
          You've seen all wallpapers
        </div>
      )}

      <style>{`
        .wallpaper-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 14px;
          padding: 6px;
        }
        @media (min-width: 480px) { .wallpaper-grid { grid-template-columns: repeat(3, 1fr); } }
        @media (min-width: 768px) { .wallpaper-grid { grid-template-columns: repeat(4, 1fr); } }
        @media (min-width: 1024px) { .wallpaper-grid { grid-template-columns: repeat(5, 1fr); } }

        @keyframes slideDown { from { transform: translate(-50%, -100%); opacity: 0; } to { transform: translate(-50%, 0); opacity: 1; } }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes shimmerSweep { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
        @keyframes dotBounce { 0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; } 40% { transform: scale(1); opacity: 1; } }
      `}</style>
    </>
  );
};
