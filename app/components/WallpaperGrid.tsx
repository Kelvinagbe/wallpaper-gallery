import { useState, useEffect, useRef, useMemo } from 'react';
import { RefreshCw } from 'lucide-react';
import { WallpaperCard } from './WallpaperCard';   // Card still imported here for rendering
import { usePrefetch } from '@/app/hooks/usePrefetch';
import type { Wallpaper } from '../types';

// ─── Stable skeleton heights (SSR-safe — no Math.random) ─────────────────────
const SKELETON_HEIGHTS = [220,280,200,260,240,300,210,270,230,290,205,265,245,215,285];

type WallpaperGridProps = {
  wallpapers: Wallpaper[];
  isLoading: boolean;
  onWallpaperClick?: (wallpaper: Wallpaper) => void;
  onRefresh?: () => Promise<void>;
  onLoadMore?: () => Promise<void>;
  hasMore?: boolean;
};

export const WallpaperGrid = ({
  wallpapers,
  isLoading,
  onWallpaperClick,
  onRefresh,
  onLoadMore,
  hasMore = true,
}: WallpaperGridProps) => {
  const [showRefreshToast, setShowRefreshToast] = useState(false);
  const [visibleEnd, setVisibleEnd]             = useState(20);
  const [loadingMore, setLoadingMore]           = useState(false);
  const [pullState, setPullState]               = useState({
    pulling: false, distance: 0, refreshing: false, canRefresh: false,
  });

  const wasLoadingRef      = useRef(false);
  const gridRef            = useRef<HTMLDivElement>(null);
  const pullContainerRef   = useRef<HTMLDivElement>(null);
  const loadMoreTriggerRef = useRef<HTMLDivElement>(null);
  const startY             = useRef(0);

  // ── Prefetch next batch URLs ────────────────────────────────────────────────
  const nextBatchUrls = useMemo(
    () => wallpapers.slice(visibleEnd, visibleEnd + 10).map(wp => wp.url),
    [wallpapers, visibleEnd],
  );
  usePrefetch(nextBatchUrls);

  // ── IntersectionObserver: load more ────────────────────────────────────────
  useEffect(() => {
    if (!loadMoreTriggerRef.current || !onLoadMore || !hasMore) return;
    const observer = new IntersectionObserver(
      async ([entry]) => {
        if (entry.isIntersecting && !loadingMore && !isLoading && hasMore) {
          setLoadingMore(true);
          try   { await onLoadMore(); }
          catch { console.error('Load more failed'); }
          finally { setLoadingMore(false); }
        }
      },
      { threshold: 0.1, rootMargin: '200px' },
    );
    observer.observe(loadMoreTriggerRef.current);
    return () => observer.disconnect();
  }, [onLoadMore, loadingMore, isLoading, hasMore]);

  // ── Scroll: expand prefetch window ─────────────────────────────────────────
  useEffect(() => {
    const handleScroll = () => {
      if (!gridRef.current) return;
      const pct = ((window.scrollY + window.innerHeight) / gridRef.current.offsetHeight) * 100;
      if (pct > 60) setVisibleEnd(prev => Math.min(prev + 10, wallpapers.length));
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [wallpapers.length]);

  // ── Pull to refresh handlers ────────────────────────────────────────────────
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
      const dampened = Math.min(distance * 0.4, 100);
      setPullState(s => ({ ...s, distance: dampened, canRefresh: dampened >= 60 }));
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

  // ── Refresh toast trigger ───────────────────────────────────────────────────
  useEffect(() => {
    if (wasLoadingRef.current && !isLoading && wallpapers.length > 0) {
      setShowRefreshToast(true);
      const t = setTimeout(() => setShowRefreshToast(false), 2000);
      return () => clearTimeout(t);
    }
    wasLoadingRef.current = isLoading;
  }, [isLoading, wallpapers.length]);

  // ── Skeleton: shown only on first load (no wallpapers yet) ─────────────────
  // ✅ Uses fixed heights — no Math.random(), no hydration mismatch
  // ✅ Each WallpaperCard replaces its own skeleton the moment its image loads,
  //    so the grid becomes interactive card by card — not all at once.
  if (isLoading && wallpapers.length === 0) {
    return (
      <div className="masonry">
        {SKELETON_HEIGHTS.map((h, i) => (
          <div key={i} style={{ marginBottom: 40 }}>
            <div
              className="skeleton-shimmer rounded-xl"
              style={{ height: h }}
            />
          </div>
        ))}
      </div>
    );
  }

  // ── Empty state ─────────────────────────────────────────────────────────────
  if (wallpapers.length === 0 && !isLoading) {
    return (
      <div className="text-center py-20">
        <div className="text-6xl mb-4">🔍</div>
        <h3 className="text-xl font-semibold mb-2">No wallpapers found</h3>
        <p className="text-white/60">Try adjusting your search or filters</p>
      </div>
    );
  }

  // ── Main grid ───────────────────────────────────────────────────────────────
  return (
    <>
      {/* Pull-to-refresh indicator */}
      <div ref={pullContainerRef}
        style={{ position:'fixed', top:0, left:0, right:0, zIndex:50, pointerEvents:'none' }}>
        <div style={{
          display:'flex', justifyContent:'center', alignItems:'center',
          transform:`translateY(${pullState.distance - 60}px)`,
          opacity: pullState.distance / 60,
          transition:'opacity 0.2s',
        }}>
          <div style={{
            marginTop:16, padding:12, borderRadius:'9999px',
            backdropFilter:'blur(12px)',
            boxShadow:'0 10px 30px rgba(0,0,0,0.3)',
            background: pullState.refreshing ? '#3b82f6' : pullState.canRefresh ? '#10b981' : 'rgba(255,255,255,0.2)',
            transform: pullState.refreshing ? 'scale(1.1)' : pullState.canRefresh ? 'scale(1.05)' : 'scale(1)',
            transition:'all 0.3s',
          }}>
            <RefreshCw style={{ width:24, height:24, color:'white',
              animation: pullState.refreshing ? 'spin 1s linear infinite' : 'none' }} />
          </div>
        </div>
      </div>

      {/* Refresh toast */}
      {showRefreshToast && (
        <div style={{
          position:'fixed', top:80, left:'50%', transform:'translateX(-50%)',
          zIndex:50, background:'rgba(16,185,129,0.9)', backdropFilter:'blur(8px)',
          padding:'8px 16px', borderRadius:'9999px',
          boxShadow:'0 10px 30px rgba(0,0,0,0.3)',
          animation:'slideDown 0.3s ease-out',
        }}>
          <span style={{ color:'white', fontSize:14, fontWeight:500 }}>✓ Refreshed</span>
        </div>
      )}

      {/*
        ✅ ARCHITECTURE NOTE:
        WallpaperGrid is now a thin layout shell.
        WallpaperCard owns ALL its own state, the NavLoader singleton, and
        the BottomSheet portal — the grid just maps cards into a masonry layout.
        
        The first 6 cards get priority=true → Next.js emits fetchpriority="high"
        and skips lazy loading, which directly improves LCP.
      */}
      <div ref={gridRef} className="masonry">
        {wallpapers.map((wp, idx) => (
          <div key={wp.id} style={{ marginBottom: 40 }}>
            <WallpaperCard
              wp={wp}
              priority={idx < 6}          // ← above-fold cards load eagerly
            />
          </div>
        ))}
      </div>

      {/* Load more sentinel */}
      {hasMore && (
        <div ref={loadMoreTriggerRef} className="flex items-center justify-center py-8 gap-2">
          {(loadingMore || isLoading) &&
            [0, 150, 300].map((delay, i) => (
              <div key={i} className="w-2 h-2 bg-white/60 rounded-full animate-bounce"
                style={{ animationDelay:`${delay}ms` }} />
            ))
          }
        </div>
      )}

      {!hasMore && wallpapers.length > 0 && (
        <div className="text-center py-8 text-white/40 text-sm">
          You've reached the end
        </div>
      )}

      <style>{`
        @keyframes slideDown { from{transform:translate(-50%,-100%);opacity:0} to{transform:translate(-50%,0);opacity:1} }
        @keyframes spin      { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
      `}</style>
    </>
  );
};
