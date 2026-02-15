import { useState, useEffect, useRef } from 'react';
import { WallpaperCard } from './WallpaperCard';
import type { Wallpaper } from '../types';

type WallpaperGridProps = {
  wallpapers: Wallpaper[];
  isLoading: boolean;
  onWallpaperClick: (wallpaper: Wallpaper) => void;
};

export const WallpaperGrid = ({ wallpapers, isLoading, onWallpaperClick }: WallpaperGridProps) => {
  const [showRefresh, setShowRefresh] = useState(false);
  const wasLoadingRef = useRef(false);

  useEffect(() => {
    if (wasLoadingRef.current && !isLoading && wallpapers.length > 0) {
      setShowRefresh(true);
      const timer = setTimeout(() => setShowRefresh(false), 2000);
      return () => clearTimeout(timer);
    }
    wasLoadingRef.current = isLoading;
  }, [isLoading, wallpapers.length]);

  if (isLoading && wallpapers.length === 0) {
    return (
      <div className="masonry">
        {Array.from({ length: 15 }, (_, i) => (
          <div key={i} style={{ marginBottom: '40px' }}>
            <div className="skeleton-shimmer rounded-xl" style={{ height: `${Math.floor(Math.random() * 150) + 200}px`, width: '100%' }} />
          </div>
        ))}
      </div>
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
      {showRefresh && (
        <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50 bg-emerald-500/90 backdrop-blur-sm px-4 py-2 rounded-full shadow-lg flex items-center gap-2" style={{ animation: 'slideDown 0.3s ease-out' }}>
          <span className="text-white text-sm font-medium">✓ Refreshed</span>
        </div>
      )}
      <div className="masonry">
        {wallpapers.map((wp) => (
          <div key={wp.id} style={{ marginBottom: '40px' }}>
            <WallpaperCard wp={wp} onClick={() => onWallpaperClick(wp)} />
          </div>
        ))}
      </div>
      {isLoading && wallpapers.length > 0 && (
        <div className="flex items-center justify-center py-8 gap-2">
          {[0, 150, 300].map((delay, i) => (
            <div key={i} className="w-2 h-2 bg-white/60 rounded-full animate-bounce" style={{ animationDelay: `${delay}ms` }} />
          ))}
        </div>
      )}
    </>
  );
};