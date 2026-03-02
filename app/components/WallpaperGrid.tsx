'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { WallpaperCard } from './WallpaperCard';
import { usePrefetch } from '@/app/hooks/usePrefetch';
import type { Wallpaper } from '../types';

const COLORS = [
  { bg: '#e8eaf0', shimmer: '#d0d4e8' },
  { bg: '#ede8f0', shimmer: '#d8cce8' },
  { bg: '#e8f0ea', shimmer: '#cce0d0' },
  { bg: '#f0e8e8', shimmer: '#e8cccc' },
  { bg: '#f0ede8', shimmer: '#e8dcc8' },
];

const ShimmerCard = ({ index, opacity = 1 }: { index: number; opacity?: number }) => {
  const c = COLORS[index % COLORS.length];
  return (
    <div className="relative w-full rounded-xl overflow-hidden" style={{ aspectRatio: '9/16', background: c.bg, opacity }}>
      <div className="absolute inset-0" style={{ background: `linear-gradient(105deg,transparent 40%,${c.shimmer}80 50%,transparent 60%)`, backgroundSize: '200% 100%', animation: 'shimmerSweep 1.6s ease-in-out infinite' }} />
    </div>
  );
};

type WallpaperGridProps = {
  wallpapers: Wallpaper[];
  isLoading: boolean;
  onWallpaperClick?: (wallpaper: Wallpaper) => void;
  onLoadMore?: () => Promise<void>;
  hasMore?: boolean;
};

export const WallpaperGrid = ({ wallpapers, isLoading, onWallpaperClick, onLoadMore, hasMore = true }: WallpaperGridProps) => {
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasEverLoaded, setHasEverLoaded] = useState(false);
  const loadMoreTriggerRef = useRef<HTMLDivElement>(null);

  usePrefetch(useMemo(() => wallpapers.slice(20, 30).map(wp => wp.url), [wallpapers]));

  useEffect(() => { if (wallpapers.length > 0 && !hasEverLoaded) setHasEverLoaded(true); }, [wallpapers.length]);

  useEffect(() => {
    if (!loadMoreTriggerRef.current || !onLoadMore || !hasMore) return;
    const observer = new IntersectionObserver(async ([entry]) => {
      if (entry.isIntersecting && !loadingMore && !isLoading && hasMore) {
        setLoadingMore(true);
        try { await onLoadMore(); } catch { console.error('Load more failed'); }
        finally { setLoadingMore(false); }
      }
    }, { threshold: 0.1, rootMargin: '400px' });
    observer.observe(loadMoreTriggerRef.current);
    return () => observer.disconnect();
  }, [onLoadMore, loadingMore, isLoading, hasMore]);

  if (!hasEverLoaded && isLoading) return (
    <>
      <div className="wallpaper-grid">{Array.from({ length: 10 }, (_, i) => <ShimmerCard key={i} index={i} />)}</div>
      <style>{`@keyframes shimmerSweep{0%{background-position:-200% 0}100%{background-position:200% 0}}`}</style>
    </>
  );

  if (hasEverLoaded && wallpapers.length === 0 && isLoading) return (
    <>
      <div className="wallpaper-grid">{Array.from({ length: 6 }, (_, i) => <ShimmerCard key={i} index={i} opacity={0.5} />)}</div>
      <style>{`@keyframes shimmerSweep{0%{background-position:-200% 0}100%{background-position:200% 0}}`}</style>
    </>
  );

  if (wallpapers.length === 0 && !isLoading) return (
    <div className="text-center py-20">
      <div className="text-6xl mb-4">🔍</div>
      <h3 className="text-xl font-semibold text-gray-800 mb-2">No wallpapers found</h3>
      <p className="text-gray-400">Try adjusting your search or filters</p>
    </div>
  );

  return (
    <>
      <div className="wallpaper-grid">
        {wallpapers.map((wp, idx) => (
          <WallpaperCard key={wp.id} wp={wp} priority={idx < 6} placeholderIndex={idx}
            onClick={onWallpaperClick ? () => onWallpaperClick(wp) : undefined} />
        ))}
      </div>

      {hasMore && <div ref={loadMoreTriggerRef} className="h-1" />}

      {loadingMore && (
        <div className="flex flex-col items-center justify-center py-8 gap-2">
          <div className="flex items-center gap-1.5">
            {[0, 1, 2].map(i => <div key={i} className="w-2 h-2 rounded-full bg-gray-300" style={{ animation: `dotBounce 1.2s ease-in-out ${i * 0.2}s infinite` }} />)}
          </div>
          <span className="text-gray-400 text-xs">Loading more...</span>
        </div>
      )}

      {!hasMore && wallpapers.length > 0 && (
        <div className="text-center py-8 text-gray-400 text-sm">You've seen all wallpapers</div>
      )}

      <style>{`
        .wallpaper-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:14px;padding:6px;}
        @media(min-width:480px){.wallpaper-grid{grid-template-columns:repeat(3,1fr)}}
        @media(min-width:768px){.wallpaper-grid{grid-template-columns:repeat(4,1fr)}}
        @media(min-width:1024px){.wallpaper-grid{grid-template-columns:repeat(5,1fr)}}
        @keyframes shimmerSweep{0%{background-position:-200% 0}100%{background-position:200% 0}}
        @keyframes dotBounce{0%,80%,100%{transform:scale(0.6);opacity:0.4}40%{transform:scale(1);opacity:1}}
      `}</style>
    </>
  );
};