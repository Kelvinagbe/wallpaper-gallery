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
  // Pinterest style - show placeholders only on first load
  if (isLoading && wallpapers.length === 0) {
    return (
      <div className="masonry">
        {Array.from({ length: 12 }, (_, i) => (
          <div key={i}>
            <div 
              className="rounded-xl bg-white/5" 
              style={{ 
                height: `${200 + Math.random() * 150}px`,
                marginBottom: '12px'
              }} 
            />
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
        <p className="text-white/60">Try adjusting your search</p>
      </div>
    );
  }

  return (
    <div className="masonry">
      {wallpapers.map((wp) => (
        <div key={wp.id}>
          <WallpaperCard 
            wp={wp} 
            onClick={() => onWallpaperClick(wp)}
          />
        </div>
      ))}
      
      {/* Show loading indicator at bottom when loading more */}
      {isLoading && wallpapers.length > 0 && (
        <div className="col-span-full text-center py-8">
          <div className="inline-flex items-center gap-2 text-white/60">
            <div className="w-2 h-2 bg-white/60 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
            <div className="w-2 h-2 bg-white/60 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
            <div className="w-2 h-2 bg-white/60 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
        </div>
      )}
    </div>
  );
};