import { useState, useEffect, useRef } from 'react';
import { WallpaperCard } from './WallpaperCard';
import type { Wallpaper } from '../types';

type WallpaperGridProps = {
  wallpapers: Wallpaper[];
  isLoading: boolean;
  onWallpaperClick: (wallpaper: Wallpaper) => void;
};

export const WallpaperGrid = ({ 
  wallpapers, 
  isLoading, 
  onWallpaperClick
}: WallpaperGridProps) => {
  const [showRefreshSuccess, setShowRefreshSuccess] = useState(false);
  const wasLoadingRef = useRef(false);

  // Detect when refresh completes
  useEffect(() => {
    // If was loading and now not loading, and we have wallpapers
    if (wasLoadingRef.current && !isLoading && wallpapers.length > 0) {
      setShowRefreshSuccess(true);
      const timer = setTimeout(() => setShowRefreshSuccess(false), 2000);
      return () => clearTimeout(timer);
    }
    
    // Update the ref
    wasLoadingRef.current = isLoading;
  }, [isLoading, wallpapers.length]);

  // Show skeleton loaders on initial load
  if (isLoading && wallpapers.length === 0) {
    return (
      <div className="masonry">
        {Array.from({ length: 15 }, (_, i) => (
          <div key={i} style={{ marginBottom: '40px' }}>
            <div 
              className="skeleton-shimmer rounded-xl" 
              style={{ 
                height: `${Math.floor(Math.random() * (350 - 200 + 1)) + 200}px`,
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

  // Main grid with wallpapers
  return (
    <>
      {/* Refresh success notification */}
      {showRefreshSuccess && (
        <div 
          className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50 bg-emerald-500/90 backdrop-blur-sm px-4 py-2 rounded-full shadow-lg flex items-center gap-2"
          style={{ animation: 'slideDown 0.3s ease-out' }}
        >
          <span className="text-white text-sm font-medium">✓ Refreshed</span>
        </div>
      )}

      <div className="masonry">
        {wallpapers.map((wp) => (
          <div key={wp.id} style={{ marginBottom: '40px' }}>
            <WallpaperCard 
              wp={wp} 
              onClick={() => onWallpaperClick(wp)}
            />
          </div>
        ))}
      </div>

      {/* Loading more indicator at bottom */}
      {isLoading && wallpapers.length > 0 && (
        <div className="flex items-center justify-center py-8 gap-2">
          <div className="w-2 h-2 bg-white/60 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
          <div className="w-2 h-2 bg-white/60 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
          <div className="w-2 h-2 bg-white/60 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
      )}
    </>
  );
};