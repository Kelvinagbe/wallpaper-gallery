import { useState, useEffect } from 'react';
import { Search, X, ChevronLeft, Clock } from 'lucide-react';
import { WallpaperCard } from './WallpaperCard';
import { useSearch } from '@/hooks/useSearch';
import type { Wallpaper } from '../types';

type SearchModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onWallpaperClick: (wallpaper: Wallpaper) => void;
  onUserClick: (userId: string) => void;
};

export const SearchModal = ({
  isOpen,
  onClose,
  onWallpaperClick,
  onUserClick
}: SearchModalProps) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const { results, isSearching, search } = useSearch();

  // Load recent searches from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('recentSearches');
    if (saved) setRecentSearches(JSON.parse(saved));
  }, []);

  // Search handler
  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    
    if (query.trim()) {
      await search(query);
      
      // Save to recent searches
      const updated = [
        query.trim(), 
        ...recentSearches.filter(s => s.toLowerCase() !== query.trim().toLowerCase())
      ].slice(0, 5);
      setRecentSearches(updated);
      localStorage.setItem('recentSearches', JSON.stringify(updated));
    }
  };

  const clearRecentSearch = (term: string) => {
    const updated = recentSearches.filter(s => s !== term);
    setRecentSearches(updated);
    localStorage.setItem('recentSearches', JSON.stringify(updated));
  };

  const clearAllRecentSearches = () => {
    setRecentSearches([]);
    localStorage.removeItem('recentSearches');
  };

  if (!isOpen) return null;

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
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="Search wallpapers..."
              className="w-full pl-10 pr-10 py-2 bg-white/5 border border-white/10 rounded-full text-sm text-white placeholder:text-white/40 focus:outline-none focus:border-white/30 focus:bg-white/10 transition-all"
              autoFocus
            />
            {searchQuery && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  search(''); // Clear results
                }}
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
                <div className="flex items-center justify-between mb-2 px-1">
                  <h3 className="text-xs font-semibold text-white/50">RECENT</h3>
                  <button
                    onClick={clearAllRecentSearches}
                    className="text-xs text-white/40 hover:text-white/60 transition-colors"
                  >
                    Clear all
                  </button>
                </div>
                <div className="space-y-1 mb-5">
                  {recentSearches.map((term, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-3 p-2 hover:bg-white/5 rounded-lg transition-colors group"
                    >
                      <button
                        onClick={() => handleSearch(term)}
                        className="flex-1 flex items-center gap-3 text-left"
                      >
                        <Clock className="w-4 h-4 text-white/40 group-hover:text-white/60" />
                        <span className="text-sm text-white/80">{term}</span>
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          clearRecentSearch(term);
                        }}
                        className="p-1 hover:bg-white/10 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="w-3.5 h-3.5 text-white/40" />
                      </button>
                    </div>
                  ))}
                </div>
              </>
            )}

            <h3 className="text-xs font-semibold text-white/50 mb-2 px-1">TRENDING</h3>
            <div className="flex flex-wrap gap-1.5">
              {['Nature', 'Abstract', 'Dark', 'Minimal', 'Anime', 'Space', 'Ocean', 'Mountains'].map((tag) => (
                <button
                  key={tag}
                  onClick={() => handleSearch(tag)}
                  className="px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full text-xs transition-colors"
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="p-4">
            {isSearching ? (
              <div className="flex items-center justify-center py-12">
                <div className="flex gap-2">
                  {[0, 150, 300].map((delay, i) => (
                    <div key={i} className="w-2 h-2 bg-white/60 rounded-full animate-bounce" style={{ animationDelay: `${delay}ms` }} />
                  ))}
                </div>
              </div>
            ) : results.length > 0 ? (
              <>
                <h3 className="text-xs font-semibold text-white/50 mb-3 px-1">
                  {results.length} RESULT{results.length !== 1 ? 'S' : ''}
                </h3>
                <div className="masonry">
                  {results.map((wp: any) => (
                    <div key={wp.id}>
                      <WallpaperCard 
                        wp={{
                          ...wp,
                          url: wp.image_url,
                          thumbnail: wp.thumbnail || wp.thumbnail_url || wp.image_url,
                          uploadedBy: 'User', // You'll need to join users table for this
                          userAvatar: '/default-avatar.png', // Default avatar
                          verified: false,
                          likes: 0,
                          userId: wp.user_id
                        }} 
                        onClick={() => onWallpaperClick(wp as any)} 
                      />
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="text-center py-12">
                <Search className="w-12 h-12 text-white/20 mx-auto mb-3" />
                <p className="text-white/60">No results found for "{searchQuery}"</p>
                <p className="text-sm text-white/40 mt-1">Try different keywords</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};