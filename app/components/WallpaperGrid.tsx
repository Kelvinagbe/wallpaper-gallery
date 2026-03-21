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

const CSS = `
  .wg{display:grid;grid-template-columns:repeat(2,1fr);gap:14px;padding:6px;}
  @media(min-width:480px){.wg{grid-template-columns:repeat(3,1fr)}}
  @media(min-width:768px){.wg{grid-template-columns:repeat(4,1fr)}}
  @media(min-width:1024px){.wg{grid-template-columns:repeat(5,1fr)}}
  @keyframes shimmerSweep{0%{background-position:-200% 0}100%{background-position:200% 0}}
  @keyframes dotBounce{0%,80%,100%{transform:scale(0.6);opacity:0.4}40%{transform:scale(1);opacity:1}}
`;

const ShimmerCard = ({ index, opacity = 1 }: { index: number; opacity?: number }) => {
  const c = COLORS[index % COLORS.length];
  return (
    <div className="relative w-full rounded-xl overflow-hidden" style={{ aspectRatio: '9/16', background: c.bg, opacity }}>
      <div className="absolute inset-0" style={{ background: `linear-gradient(105deg,transparent 40%,${c.shimmer}80 50%,transparent 60%)`, backgroundSize: '200% 100%', animation: 'shimmerSweep 1.6s ease-in-out infinite' }} />
    </div>
  );
};

const Shimmers = ({ count, opacity }: { count: number; opacity?: number }) => (
  <><div className="wg">{Array.from({ length: count }, (_, i) => <ShimmerCard key={i} index={i} opacity={opacity} />)}</div><style>{CSS}</style></>
);

type WallpaperGridProps = {
  wallpapers: Wallpaper[];
  isLoading: boolean;
  onWallpaperClick?: (wallpaper: Wallpaper) => void;
  onLoadMore?: () => Promise<void>;
  hasMore?: boolean;
};

export const WallpaperGrid = ({ wallpapers, isLoading, onWallpaperClick, onLoadMore, hasMore = true }: WallpaperGridProps) => {
  const [loadingMore,   setLoadingMore]   = useState(false);
  const [hasEverLoaded, setHasEverLoaded] = useState(false);
  const triggerRef    = useRef<HTMLDivElement>(null);
  const loadingRef    = useRef(false);

  // Filter out PC wallpapers — they belong in DesktopWallpaperRow
  const mobileWallpapers = useMemo(() => wallpapers.filter(wp => wp.type !== 'pc'), [wallpapers]);

  usePrefetch(useMemo(() => mobileWallpapers.slice(20, 30).map(wp => wp.url), [mobileWallpapers]));

  useEffect(() => {
    if (mobileWallpapers.length > 0 && !hasEverLoaded) setHasEverLoaded(true);
  }, [mobileWallpapers.length, hasEverLoaded]);

  useEffect(() => {
    if (!triggerRef.current || !onLoadMore || !hasMore) return;
    const observer = new IntersectionObserver(async ([entry]) => {
      if (!entry.isIntersecting || loadingRef.current || !hasMore) return;
      loadingRef.current = true; setLoadingMore(true);
      try { await onLoadMore(); }
      catch { console.error('Load more failed'); }
      finally { loadingRef.current = false; setLoadingMore(false); }
    }, { threshold: 0.1, rootMargin: '400px' });
    observer.observe(triggerRef.current);
    return () => observer.disconnect();
  }, [onLoadMore, hasMore]);

  // ── States ────────────────────────────────────────────────────
  if (!hasEverLoaded && isLoading)                        return <Shimmers count={10} />;
  if (hasEverLoaded && mobileWallpapers.length === 0 && isLoading) return <Shimmers count={6} opacity={0.5} />;

  if (mobileWallpapers.length === 0 && !isLoading) return (
    <div className="text-center py-20">
      <div className="text-6xl mb-4">🔍</div>
      <h3 className="text-xl font-semibold text-gray-800 mb-2">No wallpapers found</h3>
      <p className="text-gray-400">Try adjusting your search or filters</p>
    </div>
  );

  return (
    <>
      <div className="wg">
        {mobileWallpapers.map((wp, idx) => (
          <WallpaperCard
            key={wp.id} wp={wp}
            priority={idx < 6}
            placeholderIndex={idx}
            onClick={onWallpaperClick ? () => onWallpaperClick(wp) : undefined}
          />
        ))}
      </div>

      {hasMore && <div ref={triggerRef} className="h-1" />}

      {loadingMore && (
        <div className="flex flex-col items-center justify-center py-8 gap-2">
          <div className="flex items-center gap-1.5">
            {[0,1,2].map(i => <div key={i} className="w-2 h-2 rounded-full bg-gray-300" style={{ animation: `dotBounce 1.2s ease-in-out ${i*0.2}s infinite` }} />)}
          </div>
          <span className="text-gray-400 text-xs">Loading more...</span>
        </div>
      )}

      {!hasMore && mobileWallpapers.length > 0 && (
        <div className="text-center py-8 text-gray-400 text-sm">You've seen all wallpapers</div>
      )}

      <style>{CSS}</style>
    </>
  );
};
