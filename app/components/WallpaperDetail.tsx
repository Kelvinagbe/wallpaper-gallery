import { useState } from 'react';
import { ChevronLeft, Eye, Heart, Download, Share2, Copy, Trash2, Loader2, Bookmark } from 'lucide-react';
import type { Wallpaper } from '../types';

type WallpaperDetailProps = {
  wallpaper: Wallpaper | null;
  relatedWallpapers: Wallpaper[];
  onClose: () => void;
  onUserClick: () => void;
  onRelatedClick: (wallpaper: Wallpaper) => void;
  isLoading?: boolean;
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
  onRelatedClick,
  isLoading = false,
}: WallpaperDetailProps) => {
  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(false);
  const [downloaded, setDownloaded] = useState(false);
  const [likeCount, setLikeCount] = useState(wallpaper?.likes || 0);
  const [downloadCount, setDownloadCount] = useState(wallpaper?.downloads || 0);

  const handleLike = () => {
    setLiked((prev) => {
      setLikeCount((c) => (prev ? c - 1 : c + 1));
      return !prev;
    });
  };

  const handleSave = () => {
    setSaved((prev) => !prev);
  };

  const handleDownload = () => {
    if (!downloaded) {
      setDownloadCount((c) => c + 1);
      setDownloaded(true);
    }
    console.log('Download:', wallpaper?.title);
  };

  const fmt = (n: number) => (n > 1000 ? `${(n / 1000).toFixed(1)}k` : n);

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
          {isLoading || !wallpaper ? (
            // Skeleton Loader
            <div className="space-y-4 animate-pulse">
              {/* Image Skeleton */}
              <div className="relative rounded-2xl overflow-hidden bg-white/10 aspect-[9/16] flex items-center justify-center">
                <Loader2 className="w-10 h-10 text-white/40 animate-spin" />
              </div>

              {/* User Info Skeleton */}
              <div className="flex items-center gap-3 p-2">
                <div className="w-10 h-10 rounded-full bg-white/10" />
                <div className="flex-1">
                  <div className="h-4 w-32 bg-white/10 rounded mb-2" />
                  <div className="h-3 w-20 bg-white/10 rounded" />
                </div>
              </div>

              {/* Title & Description Skeleton */}
              <div>
                <div className="h-5 w-48 bg-white/10 rounded mb-2" />
                <div className="h-4 w-full bg-white/10 rounded mb-1" />
                <div className="h-4 w-3/4 bg-white/10 rounded" />
              </div>

              {/* Stats Skeleton */}
              <div className="flex items-center gap-6">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-4 w-16 bg-white/10 rounded" />
                ))}
              </div>

              {/* Buttons Skeleton */}
              <div className="flex gap-3">
                <div className="flex-1 h-12 bg-white/10 rounded-full" />
                <div className="w-12 h-12 bg-white/10 rounded-full" />
                <div className="w-12 h-12 bg-white/10 rounded-full" />
              </div>

              {/* Action Grid Skeleton */}
              <div className="grid grid-cols-3 gap-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-20 bg-white/10 rounded-lg" />
                ))}
              </div>

              {/* Related Wallpapers Skeleton */}
              <div className="bg-white/5 rounded-2xl p-4">
                <div className="h-5 w-40 bg-white/10 rounded mb-3" />
                <div className="grid grid-cols-2 gap-3">
                  {[1, 2].map((i) => (
                    <div key={i} className="aspect-[9/16] bg-white/10 rounded-xl" />
                  ))}
                </div>
              </div>
            </div>
          ) : (
            // Actual Content
            <>
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

                {/* Stats row */}
                <div className="flex items-center gap-6 text-sm text-white/50">
                  <span className="flex items-center gap-1.5">
                    <Eye className="w-4 h-4" />
                    {fmt(wallpaper.views)}
                  </span>
                  <span className={`flex items-center gap-1.5 transition-colors ${liked ? 'text-rose-400' : ''}`}>
                    <Heart className={`w-4 h-4 transition-all ${liked ? 'fill-rose-400 text-rose-400 scale-110' : ''}`} />
                    {fmt(likeCount)}
                  </span>
                  <span className={`flex items-center gap-1.5 transition-colors ${downloaded ? 'text-emerald-400' : ''}`}>
                    <Download className={`w-4 h-4 transition-all ${downloaded ? 'text-emerald-400 scale-110' : ''}`} />
                    {fmt(downloadCount)}
                  </span>
                </div>

                {/* Save + Like + Download CTAs */}
                <div className="flex gap-3">
                  <button
                    onClick={handleSave}
                    className={`flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-full font-semibold transition-all ${
                      saved
                        ? 'bg-blue-500 text-white hover:bg-blue-600'
                        : 'bg-white text-black hover:bg-gray-200'
                    }`}
                  >
                    <Bookmark className={`w-5 h-5 transition-all ${saved ? 'fill-white' : ''}`} />
                    {saved ? 'Saved' : 'Save'}
                  </button>

                  <button
                    onClick={handleLike}
                    className={`flex items-center justify-center px-4 py-3 rounded-full border transition-all ${
                      liked
                        ? 'bg-rose-500/15 border-rose-500/40 text-rose-400 hover:bg-rose-500/25'
                        : 'bg-white/5 border-white/10 text-white/70 hover:bg-white/10'
                    }`}
                  >
                    <Heart className={`w-5 h-5 transition-all ${liked ? 'fill-rose-400 text-rose-400 scale-110' : ''}`} />
                  </button>

                  <button
                    onClick={handleDownload}
                    className={`flex items-center justify-center px-4 py-3 rounded-full border transition-all ${
                      downloaded
                        ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/25'
                        : 'bg-white/5 border-white/10 text-white/70 hover:bg-white/10'
                    }`}
                  >
                    <Download className={`w-5 h-5 transition-all ${downloaded ? 'text-emerald-400 scale-110' : ''}`} />
                  </button>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  {[
                    { icon: Share2, label: 'Share' },
                    { icon: Copy, label: 'Copy' },
                    { icon: Trash2, label: 'Delete' },
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
            </>
          )}
        </div>
      </div>
    </div>
  );
};