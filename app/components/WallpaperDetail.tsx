import { useState } from 'react';
import { ChevronLeft, Eye, Heart, Download, Share2, Copy, Trash2, Loader2 } from 'lucide-react';
import type { Wallpaper } from '../types';

type WallpaperDetailProps = {
  wallpaper: Wallpaper;
  relatedWallpapers: Wallpaper[];
  onClose: () => void;
  onUserClick: () => void;
  onRelatedClick: (wallpaper: Wallpaper) => void;
};

const ImageWithLoader = ({ src, alt }: { src: string; alt: string }) => {
  const [loaded, setLoaded] = useState(false);
  return (
    <div className="relative">
      {!loaded && (
        <div className="absolute inset-0 skeleton flex items-center justify-center">
          <Loader2 className="w-10 h-10 text-white animate-spin" />
        </div>
      )}
      <img
        src={src}
        alt={alt}
        className={`w-full h-auto transition-opacity duration-300 ${loaded ? 'opacity-100' : 'opacity-0'}`}
        onLoad={() => setLoaded(true)}
      />
    </div>
  );
};

export const WallpaperDetail = ({
  wallpaper,
  relatedWallpapers,
  onClose,
  onUserClick,
  onRelatedClick
}: WallpaperDetailProps) => {
  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col slide-up">
      <button
        onClick={onClose}
        className="absolute top-4 left-4 z-10 p-3 bg-black/60 backdrop-blur-md hover:bg-black/80 rounded-full transition-all"
      >
        <ChevronLeft className="w-6 h-6" />
      </button>

      <div className="flex-1 overflow-y-auto no-scrollbar">
        <div className="max-w-2xl mx-auto p-4">
          <div className="relative rounded-2xl overflow-hidden">
            <ImageWithLoader src={wallpaper.url} alt={wallpaper.title} />
          </div>

          <div className="space-y-4 mt-4">
            <button
              onClick={onUserClick}
              className="flex items-center gap-3 w-full hover:bg-white/5 p-2 rounded-xl transition-colors"
            >
              <img
                src={wallpaper.userAvatar}
                alt={wallpaper.uploadedBy}
                className="w-10 h-10 rounded-full border border-white/20"
              />
              <div className="flex-1 text-left">
                <p className="font-semibold text-white">{wallpaper.uploadedBy}</p>
                <p className="text-sm text-white/60">Just now</p>
              </div>
              <ChevronLeft className="w-5 h-5 rotate-180 text-white/40" />
            </button>

            <div>
              <h3 className="font-semibold text-white mb-1">{wallpaper.title}</h3>
              <p className="text-sm text-white/70 leading-relaxed">{wallpaper.description}</p>
            </div>

            <div className="flex items-center gap-6 text-sm text-white/50">
              {[
                { icon: Eye, count: wallpaper.views },
                { icon: Heart, count: wallpaper.likes },
                { icon: Download, count: wallpaper.downloads }
              ].map(({ icon: Icon, count }, i) => (
                <span key={i} className="flex items-center gap-1.5">
                  <Icon className="w-4 h-4" />
                  {count > 1000 ? `${(count / 1000).toFixed(1)}k` : count}
                </span>
              ))}
            </div>

            <button
              onClick={() => console.log('Download:', wallpaper.title)}
              className="w-full px-6 py-3 bg-white text-black rounded-full font-semibold hover:bg-gray-200 transition-colors"
            >
              Save
            </button>

            <div className="grid grid-cols-3 gap-2">
              {[
                { icon: Share2, label: 'Share' },
                { icon: Copy, label: 'Copy' },
                { icon: Trash2, label: 'Delete' }
              ].map(({ icon: Icon, label }) => (
                <button
                  key={label}
                  className="flex flex-col items-center gap-1.5 p-3 bg-white/5 rounded-lg hover:bg-white/10 transition-colors"
                >
                  <Icon className="w-5 h-5" />
                  <span className="text-xs text-white/60">{label}</span>
                </button>
              ))}
            </div>

            <div className="bg-white/5 rounded-2xl p-4">
              <h4 className="font-semibold text-white mb-3">More to explore</h4>
              <div className="grid grid-cols-2 gap-3">
                {relatedWallpapers.map((img) => (
                  <div
                    key={img.id}
                    onClick={() => onRelatedClick(img)}
                    className="relative rounded-xl overflow-hidden cursor-pointer"
                    style={{ aspectRatio: `1/${img.aspectRatio}` }}
                  >
                    <img src={img.thumbnail} alt={img.title} className="w-full h-full object-cover" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
