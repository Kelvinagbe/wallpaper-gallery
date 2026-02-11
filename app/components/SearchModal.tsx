import { Search, X, ChevronLeft, UserPlus } from 'lucide-react';
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

  return (
    <div className="fixed inset-0 z-50 bg-black slide-up">
      <div className="sticky top-0 z-10 bg-black/95 backdrop-blur-xl border-b border-white/10 p-4">
        <div className="flex items-center gap-3">
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
            <ChevronLeft className="w-6 h-6" />
          </button>
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search wallpapers, users..."
              className="w-full pl-12 pr-4 py-3 bg-white/5 border border-white/10 rounded-full text-white placeholder:text-white/40 focus:outline-none focus:border-white/30 focus:bg-white/10 transition-all"
              autoFocus
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-1 hover:bg-white/10 rounded-full transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="overflow-y-auto no-scrollbar" style={{ height: 'calc(100vh - 80px)' }}>
        {searchQuery === '' ? (
          <div className="p-4">
            <h3 className="text-sm font-semibold text-white/60 mb-3 px-2">TRENDING SEARCHES</h3>
            <div className="flex flex-wrap gap-2">
              {['Nature', 'Abstract', 'Dark', 'Minimal', 'Anime', 'Space', 'Ocean', 'Mountains'].map((tag) => (
                <button
                  key={tag}
                  onClick={() => setSearchQuery(tag)}
                  className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full text-sm transition-colors"
                >
                  {tag}
                </button>
              ))}
            </div>

            <h3 className="text-sm font-semibold text-white/60 mb-3 px-2 mt-6">POPULAR CREATORS</h3>
            <div className="space-y-2">
              {userProfiles.slice(0, 5).map((user) => (
                <button
                  key={user.id}
                  onClick={() => onUserClick(user.id)}
                  className="w-full flex items-center gap-3 p-3 hover:bg-white/5 rounded-xl transition-colors"
                >
                  <img src={user.avatar} alt={user.name} className="w-12 h-12 rounded-full" />
                  <div className="flex-1 text-left">
                    <p className="font-semibold text-white">{user.name}</p>
                    <p className="text-sm text-white/60">
                      {user.followers > 1000 ? `${(user.followers / 1000).toFixed(1)}k` : user.followers} followers
                    </p>
                  </div>
                  <UserPlus className="w-5 h-5 text-white/40" />
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="p-4">
            <h3 className="text-sm font-semibold text-white/60 mb-3 px-2">RESULTS ({filteredWallpapers.length})</h3>
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
};
