import { Loader2 } from 'lucide-react';
import { WallpaperCard } from './WallpaperCard';
import type { Wallpaper } from '../types';

type WallpaperGridProps = {
  wallpapers: Wallpaper[];
  isLoading: boolean;
  onWallpaperClick: (wallpaper: Wallpaper) => void;
  onLikeToggle?: (wallpaperId: string) => void;
  likedWallpapers?: Set<string>;
};

export const WallpaperGrid = ({ 
  wallpapers, 
  isLoading, 
  onWallpaperClick,
  onLikeToggle,
  likedWallpapers = new Set()
}: WallpaperGridProps) => {
  if (isLoading) {
    return (
      <div className="masonry">
        {Array.from({ length: 12 }, (_, i) => (
          <div key={i}>
            <div className="skeleton rounded-xl" style={{ height: `${200 + Math.random() * 150}px` }} />
          </div>
        ))}
      </div>
    );
  }

  if (wallpapers.length === 0) {
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
            onLikeToggle={onLikeToggle}
            isLiked={likedWallpapers.has(wp.id)}
          />
        </div>
      ))}
    </div>
  );
};