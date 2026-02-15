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