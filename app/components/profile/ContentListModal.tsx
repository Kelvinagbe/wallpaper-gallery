import { X, Heart, Bookmark, Clock, Trash2, Download } from 'lucide-react';
import { useState } from 'react';
import {
  getLiked,
  getSaved,
  getRecent,
  unlikeWallpaper,
  unsaveWallpaper,
  clearLiked,
  clearSaved,
  clearRecent,
  type LikedWallpaper,
  type SavedWallpaper,
  type RecentWallpaper,
} from '../../utils/userStore';
import type { Wallpaper } from '../../types';

type ContentType = 'liked' | 'saved' | 'recent';

type ContentListModalProps = {
  type: ContentType;
  onClose: () => void;
  onWallpaperClick: (wallpaper: Wallpaper) => void;
};

type StoreItem = LikedWallpaper | SavedWallpaper | RecentWallpaper;

// Convert a store item to the minimal Wallpaper shape needed for the detail view
const toWallpaper = (item: StoreItem): Wallpaper => ({
  id: item.id,
  url: item.url,
  thumbnail: item.thumbnail,
  title: item.title,
  description: '',
  tags: [],
  downloads: 0,
  likes: 0,
  views: 0,
  uploadedBy: item.uploadedBy,
  userId: '',
  userAvatar: '',
  aspectRatio: 1.5,
});

export const ContentListModal = ({ type, onClose, onWallpaperClick }: ContentListModalProps) => {
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

  // ─── State ────────────────────────────────────────────────────────────────
  // We keep a local copy so removals update the UI immediately

  const loadItems = (): StoreItem[] => {
    if (type === 'liked') return getLiked();
    if (type === 'saved') return getSaved();
    return getRecent();
  };

  const [items, setItems] = useState<StoreItem[]>(loadItems);

  const handleClearAll = () => {
    if (!confirm(`Are you sure you want to clear all ${title.toLowerCase()}?`)) return;
    if (type === 'liked') clearLiked();
    if (type === 'saved') clearSaved();
    if (type === 'recent') clearRecent();
    setItems([]);
  };

  const handleRemove = (id: string) => {
    if (type === 'liked') unlikeWallpaper(id);
    if (type === 'saved') unsaveWallpaper(id);
    // recent: we don't remove individual items (only clear all)
    setItems(prev => prev.filter(w => w.id !== id));
  };

  const getTimestamp = (item: StoreItem): number => {
    if ('likedAt' in item) return item.likedAt;
    if ('savedAt' in item) return item.savedAt;
    if ('viewedAt' in item) return item.viewedAt;
    return 0;
  };

  const formatTime = (ts: number): string => {
    const diff = Date.now() - ts;
    const mins = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-gradient-to-b from-zinc-900 to-black w-full sm:max-w-4xl sm:rounded-2xl overflow-hidden max-h-[90vh] flex flex-col">

        {/* Header */}
        <div className="sticky top-0 bg-zinc-900/95 backdrop-blur-xl border-b border-white/10 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-white/5">
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
              <div className="p-6 rounded-full bg-white/5 mb-4">
                <Icon className={`w-12 h-12 ${iconColor}`} />
              </div>
              <h3 className="text-xl font-semibold mb-2">{emptyMessage}</h3>
              <p className="text-white/60 max-w-sm">{emptySubtext}</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {items.map((item) => (
                <WallpaperItem
                  key={item.id}
                  item={item}
                  type={type}
                  timestamp={formatTime(getTimestamp(item))}
                  onClick={() => onWallpaperClick(toWallpaper(item))}
                  onRemove={() => handleRemove(item.id)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── Wallpaper Item ───────────────────────────────────────────────────────────

type WallpaperItemProps = {
  item: StoreItem;
  type: ContentType;
  timestamp: string;
  onClick: () => void;
  onRemove: () => void;
};

const WallpaperItem = ({ item, type, timestamp, onClick, onRemove }: WallpaperItemProps) => {
  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (type === 'recent') return; // can't remove individual recent items
    if (confirm('Remove this wallpaper?')) onRemove();
  };

  const handleDownload = (e: React.MouseEvent) => {
    e.stopPropagation();
    const link = document.createElement('a');
    link.href = item.url;
    link.download = `${item.title}.jpg`;
    link.target = '_blank';
    link.click();
  };

  return (
    <div
      onClick={onClick}
      className="group relative aspect-[3/4] rounded-xl overflow-hidden cursor-pointer bg-white/5"
    >
      <img
        src={item.thumbnail}
        alt={item.title}
        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
      />

      {/* Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
        <div className="absolute bottom-0 left-0 right-0 p-3">
          <h3 className="font-semibold text-sm mb-1 line-clamp-1">{item.title}</h3>
          <p className="text-xs text-white/60 line-clamp-1">by {item.uploadedBy}</p>
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
        {type !== 'recent' && (
          <button
            onClick={handleRemove}
            className="p-2 bg-red-500/60 hover:bg-red-500/80 backdrop-blur-sm rounded-full transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
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
            <p className="text-xs text-purple-400 font-medium">{timestamp}</p>
          </div>
        )}
      </div>
    </div>
  );
};
