import { Search, X, ChevronLeft, Clock } from 'lucide-react';
import { WallpaperCard } from './WallpaperCard';
import type { Wallpaper, UserProfile } from '../types';

type SearchModalProps = {
  isOpen: boolean;
  onClose: () => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  filteredWallpapers: Wallpaper[];
  userProfiles: UserProfile[];
  onWallpaperClick: (wallpaper: Wallpaper) => void;
  onUserClick: (userId: string) => void;
};

export const SearchModal = ({
  isOpen,
  onClose,
  searchQuery,
  setSearchQuery,
  filteredWallpapers,
  userProfiles,
  onWallpaperClick,
  onUserClick
}: SearchModalProps) => {
  if (!isOpen) return null;

  // Mock recent searches - in a real app, this would come from localStorage
  const recentSearches = ['Nature', 'Dark', 'Abstract'];

  return (
    <div className="fixed inset-0 z-50 bg-black slide-up">
      <div className="sticky top-0 z-10 bg-black/95 backdrop-blur-xl border-b border-white/10 p-3">
        <div className="flex items-center gap-2">
          <button onClick={onClose} className="p-1.5 hover:bg-white/10 rounded-full transition-colors">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search wallpapers..."
              className="w-full pl-10 pr-10 py-2 bg-white/5 border border-white/10 rounded-full text-sm text-white placeholder:text-white/40 focus:outline-none focus:border-white/30 focus:bg-white/10 transition-all"
              autoFocus
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-white/10 rounded-full transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="overflow-y-auto no-scrollbar" style={{ height: 'calc(100vh - 60px)' }}>
        {searchQuery === '' ? (
          <div className="p-4">
            {recentSearches.length > 0 && (
              <>
                <h3 className="text-xs font-semibold text-white/50 mb-2 px-1">RECENT</h3>
                <div className="space-y-1 mb-5">
                  {recentSearches.map((term, idx) => (
                    <button
                      key={idx}
                      onClick={() => setSearchQuery(term)}
                      className="w-full flex items-center gap-3 p-2 hover:bg-white/5 rounded-lg transition-colors group"
                    >
                      <Clock className="w-4 h-4 text-white/40 group-hover:text-white/60" />
                      <span className="text-sm text-white/80">{term}</span>
                    </button>
                  ))}
                </div>
              </>
            )}

            <h3 className="text-xs font-semibold text-white/50 mb-2 px-1">TRENDING</h3>
            <div className="flex flex-wrap gap-1.5">
              {['Nature', 'Abstract', 'Dark', 'Minimal', 'Anime', 'Space', 'Ocean', 'Mountains'].map((tag) => (
                <button
                  key={tag}
                  onClick={() => setSearchQuery(tag)}
                  className="px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full text-xs transition-colors"
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="p-4">
            <h3 className="text-xs font-semibold text-white/50 mb-3 px-1">
              {filteredWallpapers.length} RESULTS
            </h3>
            <div className="masonry">
              {filteredWallpapers.map((wp) => (
                <div key={wp.id}>
                  <WallpaperCard wp={wp} onClick={() => onWallpaperClick(wp)} />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );