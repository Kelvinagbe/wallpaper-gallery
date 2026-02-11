import { useState } from 'react';
import { Heart, Download, Loader2 } from 'lucide-react';
import type { Wallpaper } from '../types';

type WallpaperCardProps = {
  wp: Wallpaper;
  onClick: () => void;
};

export const WallpaperCard = ({ wp, onClick }: WallpaperCardProps) => {
  const [loaded, setLoaded] = useState(false);

  return (
    <div className="card group relative rounded-xl overflow-hidden cursor-pointer transition-all duration-300" onClick={onClick}>
      {!loaded && (
        <div className="skeleton rounded-xl flex items-center justify-center" style={{ height: '250px' }}>
          <Loader2 className="w-8 h-8 text-white/40 animate-spin" />
        </div>
      )}
      <img
        src={wp.thumbnail}
        alt={wp.title}
        className={`w-full h-auto transition-opacity duration-300 ${loaded ? 'opacity-100' : 'opacity-0 absolute'}`}
        onLoad={() => setLoaded(true)}
      />
      {loaded && (
        <>
          <div className="card-overlay absolute inset-0 bg-black/40 backdrop-blur-[2px] flex items-center justify-center gap-3">
            <button
              onClick={(e) => {
                e.stopPropagation();
                console.log('Like:', wp.title);
              }}
              className="p-2.5 rounded-full bg-white hover:bg-gray-200 transition-all hover:scale-110"
            >
              <Heart className="w-4 h-4 text-black" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                console.log('Download:', wp.title);
              }}
              className="p-2.5 rounded-full bg-white hover:bg-gray-200 transition-all hover:scale-110"
            >
              <Download className="w-4 h-4 text-black" />
            </button>
          </div>
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-2.5">
            <h3 className="font-medium mb-1.5 line-clamp-1 text-xs">{wp.title}</h3>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <img src={wp.userAvatar} alt={wp.uploadedBy} className="w-5 h-5 rounded-full" />
                <span className="text-[11px] text-white/80">{wp.uploadedBy}</span>
              </div>
              <span className="text-[11px] text-white/70">
                {wp.views > 1000 ? `${(wp.views / 1000).toFixed(1)}k` : wp.views}
              </span>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
