import { useState, useEffect, useRef } from 'react';
import { useInView } from 'react-intersection-observer';
import { RefreshCw } from 'lucide-react';
import { WallpaperCard } from './WallpaperCard';
import { usePrefetch } from '@/app/hooks/usePrefetch';
import type { Wallpaper } from '../types';

type WallpaperGridProps = {
  wallpapers: Wallpaper[];
  isLoading: boolean;
  onWallpaperClick: (wallpaper: Wallpaper) => void;
  onRefresh?: () => Promise<void>;
};

export const WallpaperGrid = ({ wallpapers, isLoading, onWallpaperClick, onRefresh }: WallpaperGridProps) => {
  const [showRefresh, setShowRefresh] = useState(false);
  const [visibleRange, setVisibleRange] = useState({ start: 0, end: 20 });
  const [pullState, setPullState] = useState({ 
    pulling: false, 
    distance: 0, 
    refreshing: false, 
    canRefresh: false 
  });
  
  const wasLoadingRef = useRef(false);
  const gridRef = useRef<HTMLDivElement>(null);
  const startY = useRef(0);
  const pullContainerRef = useRef<HTMLDivElement>(null);

  // Intersection observer for load more trigger
  const { ref: loadMoreRef, inView } = useInView({
    threshold: 0.5,
  });

  // Prefetch next batch of images
  const nextBatchUrls = wallpapers
    .slice(visibleRange.end, visibleRange.end + 10)
    .map(wp => wp.url);

  usePrefetch(nextBatchUrls);

  // Pull to refresh touch handlers
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
      const maxDistance = 120;
      const dampened = Math.min(distance * 0.5, maxDistance);
      setPullState(s => ({ 
        ...s, 
        distance: dampened, 
        canRefresh: dampened >= 80 
      }));
    }
  };

  const handleTouchEnd = async () => {
    if (pullState.canRefresh && !pullState.refreshing && onRefresh) {
      setPullState(s => ({ ...s, refreshing: true, distance: 80 }));
      navigator.vibrate?.(50);
      
      try {
        await onRefresh();
      } catch (error) {
        console.error('Refresh failed:', error);
      }
      
      setPullState({ 
        pulling: false, 
        distance: 0, 
        refreshing: false, 
        canRefresh: false 
      });
    } else {
      setPullState({ 
        pulling: false, 
        distance: 0, 
        refreshing: false, 
        canRefresh: false 
      });
    }
  };

  // Setup pull to refresh listeners
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

  // Track scroll position for prefetching
  useEffect(() => {
    const handleScroll = () => {
      if (!gridRef.current) return;

      const scrollPosition = window.scrollY + window.innerHeight;
      const gridHeight = gridRef.current.offsetHeight;
      const scrollPercentage = (scrollPosition / gridHeight) * 100;

      // When user scrolls past 60%, prefetch next batch
      if (scrollPercentage > 60) {
        setVisibleRange(prev => ({
          start: prev.start,
          end: Math.min(prev.end + 10, wallpapers.length)
        }));
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [wallpapers.length]);

  // Show refresh notification after loading
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
        {Array.from({ length: 15 }, (_, i) => (
          <div key={i} style={{ marginBottom: '40px' }}>
            <div 
              className="skeleton-shimmer rounded-xl" 
              style={{ 
                height: `${Math.floor(Math.random() * 150) + 200}px`, 
                width: '100%' 
              }} 
            />
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
      {/* Pull to Refresh Indicator */}
      <div 
        ref={pullContainerRef} 
        className="fixed top-0 left-0 right-0 z-50 pointer-events-none"
      >
        <div 
          className="flex justify-center items-center transition-all duration-200"
          style={{ 
            transform: `translateY(${pullState.distance - 80}px)`,
            opacity: pullState.distance / 80,
          }}
        >
          <div 
            className={`mt-4 p-3 rounded-full backdrop-blur-md shadow-lg transition-all duration-300 ${
              pullState.refreshing ? 'bg-blue-500 scale-110' : 
              pullState.canRefresh ? 'bg-emerald-500 scale-105' : 
              'bg-white/20 scale-100'
            }`}
          >
            <RefreshCw 
              className={`w-6 h-6 text-white transition-transform duration-200 ${
                pullState.refreshing ? 'animate-spin' : ''
              }`}
              style={{
                transform: pullState.refreshing ? '' : `rotate(${pullState.distance * 3}deg)`
              }}
            />
          </div>
        </div>
      </div>

      {/* Success message after refresh */}
      {showRefresh && (
        <div 
          className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50 bg-emerald-500/90 backdrop-blur-sm px-4 py-2 rounded-full shadow-lg flex items-center gap-2" 
          style={{ animation: 'slideDown 0.3s ease-out' }}
        >
          <span className="text-white text-sm font-medium">✓ Refreshed</span>
        </div>
      )}

      {/* Wallpaper Grid */}
      <div ref={gridRef} className="masonry">
        {wallpapers.map((wp) => (
          <div key={wp.id} style={{ marginBottom: '40px' }}>
            <WallpaperCard 
              wp={wp} 
              onClick={() => onWallpaperClick(wp)} 
            />
          </div>
        ))}
      </div>

      {/* Load more trigger */}
      <div ref={loadMoreRef} className="flex items-center justify-center py-8 gap-2">
        {isLoading && wallpapers.length > 0 && (
          <>
            {[0, 150, 300].map((delay, i) => (
              <div 
                key={i} 
                className="w-2 h-2 bg-white/60 rounded-full animate-bounce" 
                style={{ animationDelay: `${delay}ms` }} 
              />
            ))}
          </>
        )}
      </div>

      {/* Animations */}
      <style jsx>{`
        @keyframes slideDown {
          from {
            transform: translate(-50%, -100%);
            opacity: 0;
          }
          to {
            transform: translate(-50%, 0);
            opacity: 1;
          }
        }
      `}</style>
    </>
  );
};
