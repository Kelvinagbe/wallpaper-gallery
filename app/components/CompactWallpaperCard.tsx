import { useState } from 'react';
import { Heart, Download, Loader2 } from 'lucide-react';
import type { Wallpaper } from '../types';

type CompactWallpaperCardProps = {
  wp: Wallpaper;
  onClick: () => void;
};

export const CompactWallpaperCard = ({ wp, onClick }: CompactWallpaperCardProps) => {
  const [loaded, setLoaded] = useState(false);

  return (
    <div className="card group relative rounded-lg overflow-hidden cursor-pointer transition-all duration-300" onClick={onClick}>
      {!loaded && (
        <div className="skeleton rounded-lg flex items-center justify-center h-32">
          <Loader2 className="w-6 h-6 text-white/40 animate-spin" />
        </div>
      )}
      <img
        src={wp.thumbnail}
        alt={wp.title}
        className={`w-full h-auto transition-opacity duration-300 ${loaded ? 'opacity-100' : 'opacity-0 absolute'}`}
        onLoad={() => setLoaded(true)}
      />
      {loaded && (
        <div className="card-overlay absolute inset-0 bg-black/40 backdrop-blur-[2px] flex items-center justify-center gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              console.log('Like:', wp.title);
            }}
            className="p-2 rounded-full bg-white hover:bg-gray-200 transition-all hover:scale-110"
          >
            <Heart className="w-3.5 h-3.5 text-black" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              console.log('Download:', wp.title);
            }}
            className="p-2 rounded-full bg-white hover:bg-gray-200 transition-all hover:scale-110"
          >
            <Download className="w-3.5 h-3.5 text-black" />
          </button>
        </div>
      )}
    </div>
  );
};