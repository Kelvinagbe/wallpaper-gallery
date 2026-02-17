import { useState, useEffect, useRef, useMemo } from 'react';
import { RefreshCw } from 'lucide-react';
import { WallpaperCard } from './WallpaperCard';
import { usePrefetch } from '@/app/hooks/usePrefetch';
import type { Wallpaper } from '../types';

type WallpaperGridProps = {
  wallpapers: Wallpaper[];
  isLoading: boolean;
  onWallpaperClick?: (wallpaper: Wallpaper) => void; // now optional
  onRefresh?: () => Promise<void>;
  onLoadMore?: () => Promise<void>;
  hasMore?: boolean;
};

export const WallpaperGrid = ({ 
  wallpapers, 
  isLoading, 
  onWallpaperClick,   // kept for backwards compat but no longer passed to card
  onRefresh,
  onLoadMore,
  hasMore = true
}: WallpaperGridProps) => {
  const [showRefresh, setShowRefresh] = useState(false);
  const [visibleRange, setVisibleRange] = useState({ start: 0, end: 20 });
  const [pullState, setPullState] = useState({ pulling: false, distance: 0, refreshing: false, canRefresh: false });
  const [loadingMore, setLoadingMore] = useState(false);

  const wasLoadingRef = useRef(false);
  const gridRef = useRef<HTMLDivElement>(null);
  const startY = useRef(0);
  const pullContainerRef = useRef<HTMLDivElement>(null);
  const loadMoreTriggerRef = useRef<HTMLDivElement>(null);

  // Prefetch next batch
  const nextBatchUrls = useMemo(() => 
    wallpapers.slice(visibleRange.end, visibleRange.end + 10).map(wp => wp.url),
    [wallpapers, visibleRange.end]
  );
  usePrefetch(nextBatchUrls);

  // Intersection Observer for load more
  useEffect(() => {
    if (!loadMoreTriggerRef.current || !onLoadMore || !hasMore) return;

    const observer = new IntersectionObserver(
      async ([entry]) => {
        if (entry.isIntersecting && !loadingMore && !isLoading && hasMore) {
          setLoadingMore(true);
          try {
            await onLoadMore();
          } catch (err) {
            console.error('Load more failed:', err);
          } finally {
            setLoadingMore(false);
          }
        }
      },
      { threshold: 0.1, rootMargin: '200px' }
    );

    observer.observe(loadMoreTriggerRef.current);
    return () => observer.disconnect();
  }, [onLoadMore, loadingMore, isLoading, hasMore]);

  // Pull to refresh
  const handleTouchStart = (e: TouchEvent) => {
    if (window.scrollY === 0) {
      startY.current = e.touches[0].clientY;
      setPullState(s => ({ ...s, pulling: true }));
    }
  };

  const handleTouchMove = (e: TouchEvent) => {
    if (!pullState.pulling || window.scrollY > 0) return;
    const currentY = e.touches[0].clientY;
    const distance = Math.max(0, currentY - startY.current);
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
        setShowRefresh(true);
        setTimeout(() => setShowRefresh(false), 2000);
      } catch (err) {
        console.error('Refresh failed:', err);
      }
      setPullState({ pulling: false, distance: 0, refreshing: false, canRefresh: false });
    } else {
      setPullState({ pulling: false, distance: 0, refreshing: false, canRefresh: false });
    }
  };

  useEffect(() => {
    const container = pullContainerRef.current;
    if (!container) return;
    container.addEventListener('touchstart', handleTouchStart, { passive: false });
    container.addEventListener('touchmove', handleTouchMove, { passive: false });
    container.addEventListener('touchend', handleTouchEnd);
    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
    };
  }, [pullState.pulling, pullState.canRefresh, pullState.refreshing, onRefresh]);

  // Track scroll for prefetching
  useEffect(() => {
    const handleScroll = () => {
      if (!gridRef.current) return;
      const scrollPos = window.scrollY + window.innerHeight;
      const gridHeight = gridRef.current.offsetHeight;
      const scrollPct = (scrollPos / gridHeight) * 100;
      if (scrollPct > 60) {
        setVisibleRange(prev => ({
          start: prev.start,
          end: Math.min(prev.end + 10, wallpapers.length)
        }));
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [wallpapers.length]);

  // Show refresh notification
  useEffect(() => {
    if (wasLoadingRef.current && !isLoading && wallpapers.length > 0) {
      setShowRefresh(true);
      const timer = setTimeout(() => setShowRefresh(false), 2000);
      return () => clearTimeout(timer);
    }
    wasLoadingRef.current = isLoading;
  }, [isLoading, wallpapers.length]);

  // Loading skeleton
  if (isLoading && wallpapers.length === 0) {
    return (
      <div className="masonry">
        {Array.from({ length: 15 }).map((_, i) => (
          <div key={i} style={{ marginBottom: '40px' }}>
            <div className="skeleton-shimmer rounded-xl" style={{ height: `${200 + Math.random() * 200}px` }} />
          </div>
        ))}
      </div>
    );
  }

  // Empty state
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
      {/* Pull to refresh */}
      <div ref={pullContainerRef} style={{ position:'fixed', top:0, left:0, right:0, zIndex:50, pointerEvents:'none' }}>
        <div style={{ display:'flex', justifyContent:'center', alignItems:'center', transform:`translateY(${pullState.distance - 60}px)`, opacity: pullState.distance / 60, transition:'opacity 0.2s' }}>
          <div style={{ marginTop:'16px', padding:'12px', borderRadius:'9999px', backdropFilter:'blur(12px)', boxShadow:'0 10px 30px rgba(0,0,0,0.3)', background: pullState.refreshing ? '#3b82f6' : pullState.canRefresh ? '#10b981' : 'rgba(255,255,255,0.2)', transform: pullState.refreshing ? 'scale(1.1)' : pullState.canRefresh ? 'scale(1.05)' : 'scale(1)', transition:'all 0.3s' }}>
            <RefreshCw style={{ width:'24px', height:'24px', color:'white', animation: pullState.refreshing ? 'spin 1s linear infinite' : 'none' }} />
          </div>
        </div>
      </div>

      {/* Success message */}
      {showRefresh && (
        <div style={{ position:'fixed', top:'80px', left:'50%', transform:'translateX(-50%)', zIndex:50, background:'rgba(16,185,129,0.9)', backdropFilter:'blur(8px)', padding:'8px 16px', borderRadius:'9999px', boxShadow:'0 10px 30px rgba(0,0,0,0.3)', animation:'slideDown 0.3s ease-out' }}>
          <span style={{ color:'white', fontSize:'14px', fontWeight:500 }}>✓ Refreshed</span>
        </div>
      )}

      {/* Masonry grid — no onClick passed so WallpaperCard handles nav + loader itself */}
      <div ref={gridRef} className="masonry">
        {wallpapers.map((wp) => (
          <div key={wp.id} style={{ marginBottom: '40px' }}>
            <WallpaperCard wp={wp} />
          </div>
        ))}
      </div>

      {/* Load more trigger */}
      {hasMore && (
        <div ref={loadMoreTriggerRef} className="flex items-center justify-center py-8 gap-2">
          {(loadingMore || isLoading) && (
            <>
              {[0, 150, 300].map((delay, i) => (
                <div key={i} className="w-2 h-2 bg-white/60 rounded-full animate-bounce" style={{ animationDelay:`${delay}ms` }} />
              ))}
            </>
          )}
        </div>
      )}

      {!hasMore && wallpapers.length > 0 && (
        <div className="text-center py-8 text-white/40 text-sm">You've reached the end</div>
      )}

      <style>{`
        @keyframes slideDown { from{transform:translate(-50%,-100%);opacity:0} to{transform:translate(-50%,0);opacity:1} }
        @keyframes spin      { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
      `}</style>
    </>
  );
};
