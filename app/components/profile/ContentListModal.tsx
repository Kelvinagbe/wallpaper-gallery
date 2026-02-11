import { X, Heart, Bookmark, Clock, Trash2, Download } from 'lucide-react';
import type { Wallpaper } from '../../types';

type ContentType = 'liked' | 'saved' | 'recent';

type ContentListModalProps = {
  type: ContentType;
  onClose: () => void;
  wallpapers: Wallpaper[];
  onWallpaperClick: (wallpaper: Wallpaper) => void;
};

export const ContentListModal = ({ type, onClose, wallpapers, onWallpaperClick }: ContentListModalProps) => {
  const config = {
    liked: {
      title: 'Liked Wallpapers',
      icon: Heart,
      iconColor: 'text-red-400',
      emptyMessage: 'No liked wallpapers yet',
      emptySubtext: 'Wallpapers you like will appear here',
    },
    saved: {
      title: 'Saved Collections',
      icon: Bookmark,
      iconColor: 'text-blue-400',
      emptyMessage: 'No saved collections',
      emptySubtext: 'Save wallpapers to collections for easy access',
    },
    recent: {
      title: 'Recently Viewed',
      icon: Clock,
      iconColor: 'text-purple-400',
      emptyMessage: 'No recent views',
      emptySubtext: 'Wallpapers you view will appear here',
    },
  };

  const { title, icon: Icon, iconColor, emptyMessage, emptySubtext } = config[type];

  // Mock data - in real app, this would be filtered based on type
  const items = wallpapers.slice(0, 12);

  const handleClearAll = () => {
    if (confirm(`Are you sure you want to clear all ${title.toLowerCase()}?`)) {
      alert('Cleared successfully!');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-gradient-to-b from-zinc-900 to-black w-full sm:max-w-4xl sm:rounded-2xl overflow-hidden slide-up max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="sticky top-0 bg-zinc-900/95 backdrop-blur-xl border-b border-white/10 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg bg-white/5`}>
                <Icon className={`w-5 h-5 ${iconColor}`} />
              </div>
              <div>
                <h2 className="text-xl font-bold">{title}</h2>
                <p className="text-sm text-white/60">{items.length} items</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {items.length > 0 && (
                <button
                  onClick={handleClearAll}
                  className="px-3 py-1.5 text-sm bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg transition-colors border border-red-500/20"
                >
                  Clear All
                </button>
              )}
              <button
                onClick={onClose}
                className="p-2 hover:bg-white/10 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="overflow-y-auto flex-1 p-4">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className={`p-6 rounded-full bg-white/5 mb-4`}>
                <Icon className={`w-12 h-12 ${iconColor}`} />
              </div>
              <h3 className="text-xl font-semibold mb-2">{emptyMessage}</h3>
              <p className="text-white/60 max-w-sm">{emptySubtext}</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {items.map((wallpaper) => (
                <WallpaperItem
                  key={wallpaper.id}
                  wallpaper={wallpaper}
                  type={type}
                  onClick={() => onWallpaperClick(wallpaper)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

type WallpaperItemProps = {
  wallpaper: Wallpaper;
  type: ContentType;
  onClick: () => void;
};

const WallpaperItem = ({ wallpaper, type, onClick }: WallpaperItemProps) => {
  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Remove this wallpaper?')) {
      alert('Removed!');
    }
  };

  const handleDownload = (e: React.MouseEvent) => {
    e.stopPropagation();
    alert('Downloading...');
  };

  return (
    <div
      onClick={onClick}
      className="group relative aspect-[3/4] rounded-xl overflow-hidden cursor-pointer bg-white/5"
    >
      <img
        src={wallpaper.thumbnail}
        alt={wallpaper.title}
        className="w-full h-full object-cover transition-transform group-hover:scale-110"
      />

      {/* Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
        <div className="absolute bottom-0 left-0 right-0 p-3">
          <h3 className="font-semibold text-sm mb-1 line-clamp-1">{wallpaper.title}</h3>
          <p className="text-xs text-white/60 line-clamp-1">by {wallpaper.uploadedBy}</p>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={handleDownload}
          className="p-2 bg-black/60 hover:bg-black/80 backdrop-blur-sm rounded-full transition-colors"
        >
          <Download className="w-4 h-4" />
        </button>
        <button
          onClick={handleRemove}
          className="p-2 bg-red-500/60 hover:bg-red-500/80 backdrop-blur-sm rounded-full transition-colors"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {/* Type indicator */}
      <div className="absolute top-2 left-2">
        {type === 'liked' && (
          <div className="p-1.5 bg-red-500/20 backdrop-blur-sm rounded-full border border-red-500/30">
            <Heart className="w-3 h-3 text-red-400 fill-red-400" />
          </div>
        )}
        {type === 'saved' && (
          <div className="p-1.5 bg-blue-500/20 backdrop-blur-sm rounded-full border border-blue-500/30">
            <Bookmark className="w-3 h-3 text-blue-400 fill-blue-400" />
          </div>
        )}
        {type === 'recent' && (
          <div className="px-2 py-1 bg-purple-500/20 backdrop-blur-sm rounded-full border border-purple-500/30">
            <p className="text-xs text-purple-400 font-medium">2h ago</p>
          </div>
        )}
      </div>
    </div>
  );
};