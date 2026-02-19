'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { RefreshCw } from 'lucide-react';
import { WallpaperCard } from './WallpaperCard';
import { usePrefetch } from '@/app/hooks/usePrefetch';
import type { Wallpaper } from '../types';

// ─── 5 placeholder color palettes — no Math.random, cycles by index ──────────
// Each card gets a deterministic color based on its position, just like Pinterest
const PLACEHOLDER_COLORS = [
  { bg: '#1a1a2e', shimmer: '#16213e' }, // deep navy
  { bg: '#1e1a2e', shimmer: '#2d1b4e' }, // deep purple
  { bg: '#1a2e1e', shimmer: '#1b3a20' }, // deep forest
  { bg: '#2e1a1a', shimmer: '#4e1b1b' }, // deep rose
  { bg: '#2e2a1a', shimmer: '#4e3d1b' }, // deep amber
];

// ─── Fixed aspect ratios for masonry variety — no Math.random ────────────────
// Pinterest uses a fixed-width masonry where image heights vary by content.
// We simulate this with 5 aspect ratio "slots" cycling by index.
const ASPECT_RATIOS = [
  '140%', // tall portrait
  '120%', // medium portrait
  '150%', // extra tall
  '125%', // standard portrait
  '135%', // slightly taller
];

// ─── Skeleton card component ──────────────────────────────────────────────────
const SkeletonCard = ({ index }: { index: number }) => {
  const color  = PLACEHOLDER_COLORS[index % PLACEHOLDER_COLORS.length];
  const aspect = ASPECT_RATIOS[index % ASPECT_RATIOS.length];

  return (
    <div className="relative w-full rounded-2xl overflow-hidden" style={{ marginBottom: 12 }}>
      <div style={{ position: 'relative', width: '100%', paddingBottom: aspect }}>
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: color.bg,
            borderRadius: 16,
            overflow: 'hidden',
          }}
        >
          {/* Shimmer sweep */}
          <div style={{
            position: 'absolute',
            inset: 0,
            background: `linear-gradient(105deg, transparent 40%, ${color.shimmer}80 50%, transparent 60%)`,
            backgroundSize: '200% 100%',
            animation: 'shimmerSweep 1.6s ease-in-out infinite',
          }} />

          {/* Bottom info placeholder */}
          <div style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            padding: '12px',
            background: 'linear-gradient(to top, rgba(0,0,0,0.7), transparent)',
          }}>
            {/* Title bar */}
            <div style={{
              height: 10,
              width: `${55 + (index % 5) * 9}%`,
              borderRadius: 5,
              background: 'rgba(255,255,255,0.12)',
              marginBottom: 8,
            }} />
            {/* Avatar + name row */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{
                width: 20, height: 20,
                borderRadius: '50%',
                background: 'rgba(255,255,255,0.15)',
                flexShrink: 0,
              }} />
              <div style={{
                height: 8,
                width: `${30 + (index % 3) * 12}%`,
                borderRadius: 4,
                background: 'rgba(255,255,255,0.1)',
              }} />
            </div>
          </div>
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
      { threshold: 0.1, rootMargin: '300px' },
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

  // ─────────────────────────────────────────────────────────────────────────────
  // ✅ PINTEREST PATTERN:
  //
  // 1. FULL skeleton — only on very first page load (isLoading=true, no wallpapers)
  //    Shows 10 skeleton cards that look like a complete page.
  //
  // 2. MIX skeleton + real — when filter changes (wallpapers=[]) but isLoading=false
  //    WallpaperCard renders immediately with its own color placeholder,
  //    then fades in when the image loads. No waiting for all images.
  //
  // 3. No skeleton at all on load-more — cards just append at the bottom.
  // ─────────────────────────────────────────────────────────────────────────────

  // Case 1: True initial page load — show full skeleton page
  if (isLoading && wallpapers.length === 0) {
    return (
      <>
        <div className="masonry">
          {Array.from({ length: 10 }, (_, i) => (
            <SkeletonCard key={i} index={i} />
          ))}
        </div>
        <style>{`
          @keyframes shimmerSweep {
            0%   { background-position: -200% 0; }
            100% { background-position: 200% 0; }
          }
        `}</style>
      </>
    );
  }

  // Case 2: Empty after filter change
  if (wallpapers.length === 0 && !isLoading) {
    return (
      <div className="text-center py-20">
        <div className="text-6xl mb-4">🔍</div>
        <h3 className="text-xl font-semibold mb-2">No wallpapers found</h3>
        <p className="text-white/60">Try adjusting your search or filters</p>
      </div>
    );
  }

  // Case 3: Main grid — cards render individually, each owns its own placeholder
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
        ✅ Cards render IMMEDIATELY — each card shows its own color placeholder
        while its image loads. Exactly like Pinterest: you see cards right away,
        images pop in one by one. No waiting for all data.
      */}
      <div ref={gridRef} className="masonry">
        {wallpapers.map((wp, idx) => (
          <WallpaperCard
            key={wp.id}
            wp={wp}
            priority={idx < 6}
            placeholderIndex={idx}
          />
        ))}
      </div>

      {/* Load more sentinel */}
      {hasMore && (
        <div ref={loadMoreTriggerRef} className="flex items-center justify-center py-8 gap-2">
          {loadingMore &&
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
        @keyframes shimmerSweep {
          0%   { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
      `}</style>
    </>
  );
};
