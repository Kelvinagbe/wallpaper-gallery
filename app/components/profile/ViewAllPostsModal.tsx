import { X, Grid, Download, Eye } from 'lucide-react';
import type { Wallpaper } from '../../types';

type ViewAllPostsModalProps = {
  onClose: () => void;
  wallpapers: Wallpaper[];
  onWallpaperClick: (wallpaper: Wallpaper) => void;
  userName: string;
};

export const ViewAllPostsModal = ({
  onClose,
  wallpapers,
  onWallpaperClick,
  userName,
}: ViewAllPostsModalProps) => {
  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-gradient-to-b from-zinc-900 to-black w-full sm:max-w-4xl sm:rounded-2xl overflow-hidden max-h-[90vh] flex flex-col">

        {/* Header */}
        <div className="sticky top-0 bg-zinc-900/95 backdrop-blur-xl border-b border-white/10 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/5 rounded-lg">
                <Grid className="w-5 h-5 text-white/80" />
              </div>
              <div>
                <h2 className="text-xl font-bold">My Posts</h2>
                <p className="text-sm text-white/60">{wallpapers.length} wallpapers</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/10 rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="overflow-y-auto flex-1 p-4">
          {wallpapers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="p-6 rounded-full bg-white/5 mb-4">
                <Grid className="w-12 h-12 text-white/40" />
              </div>
              <h3 className="text-xl font-semibold mb-2">No posts yet</h3>
              <p className="text-white/60 max-w-sm">
                Wallpapers you upload will appear here.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {wallpapers.map((wallpaper) => (
                <PostItem
                  key={wallpaper.id}
                  wallpaper={wallpaper}
                  onClick={() => {
                    onWallpaperClick(wallpaper);
                  }}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── Post Item ────────────────────────────────────────────────────────────────

type PostItemProps = {
  wallpaper: Wallpaper;
  onClick: () => void;
};

const PostItem = ({ wallpaper, onClick }: PostItemProps) => {
  return (
    <div
      onClick={onClick}
      className="group relative aspect-[3/4] rounded-xl overflow-hidden cursor-pointer bg-white/5"
    >
      <img
        src={wallpaper.thumbnail}
        alt={wallpaper.title}
        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
      />

      {/* Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
        <div className="absolute bottom-0 left-0 right-0 p-3">
          <h3 className="font-semibold text-sm mb-2 line-clamp-1">{wallpaper.title}</h3>
          <div className="flex items-center gap-3 text-xs text-white/70">
            <span className="flex items-center gap-1">
              <Eye className="w-3 h-3" />
              {wallpaper.views > 1000
                ? `${(wallpaper.views / 1000).toFixed(1)}k`
                : wallpaper.views}
            </span>
            <span className="flex items-center gap-1">
              <Download className="w-3 h-3" />
              {wallpaper.downloads > 1000
                ? `${(wallpaper.downloads / 1000).toFixed(1)}k`
                : wallpaper.downloads}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
