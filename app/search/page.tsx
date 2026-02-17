'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Search, X, ChevronLeft, Clock } from 'lucide-react';
import { WallpaperCard } from '@/app/components/WallpaperCard';
import { searchWallpapers } from '@/lib/stores/wallpaperStore';
import type { Wallpaper } from '@/app/types';

export default function SearchPage() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  const [searchQuery, setSearchQuery]     = useState('');
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [results, setResults]             = useState<Wallpaper[]>([]);
  const [isSearching, setIsSearching]     = useState(false);
  const debounceRef                        = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load recent searches
  useEffect(() => {
    try {
      const saved = localStorage.getItem('recentSearches');
      if (saved) setRecentSearches(JSON.parse(saved));
    } catch {}
    // Auto-focus input on mount
    inputRef.current?.focus();
  }, []);

  const saveRecent = (query: string) => {
    const updated = [
      query.trim(),
      ...recentSearches.filter(s => s.toLowerCase() !== query.trim().toLowerCase()),
    ].slice(0, 5);
    setRecentSearches(updated);
    localStorage.setItem('recentSearches', JSON.stringify(updated));
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

  // Debounced search
  const handleSearch = (query: string) => {
    setSearchQuery(query);

    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!query.trim()) {
      setResults([]);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setIsSearching(true);
      try {
        const { wallpapers } = await searchWallpapers(query.trim());
        setResults(wallpapers);
        saveRecent(query.trim());
      } catch (e) {
        console.error('Search error:', e);
        setResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 400);
  };

  const handleRecentClick = (term: string) => {
    setSearchQuery(term);
    handleSearch(term);
  };

  const handleClear = () => {
    setSearchQuery('');
    setResults([]);
    inputRef.current?.focus();
  };

  const TRENDING_TAGS = ['Nature', 'Abstract', 'Dark', 'Minimal', 'Anime', 'Space', 'Ocean', 'Mountains'];

  return (
    <div className="min-h-screen bg-black text-white">
      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>

      {/* Header */}
      <div className="sticky top-0 z-10 bg-black/95 backdrop-blur-xl border-b border-white/10 p-3">
        <div className="flex items-center gap-2 max-w-2xl mx-auto">
          <button
            onClick={() => router.back()}
            className="p-1.5 hover:bg-white/10 rounded-full transition-colors flex-shrink-0"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
            <input
              ref={inputRef}
              type="text"
              value={searchQuery}
              onChange={e => handleSearch(e.target.value)}
              placeholder="Search wallpapers..."
              className="w-full pl-10 pr-10 py-2 bg-white/5 border border-white/10 rounded-full text-sm text-white placeholder:text-white/40 focus:outline-none focus:border-white/30 focus:bg-white/10 transition-all"
            />
            {searchQuery && (
              <button
                onClick={handleClear}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-white/10 rounded-full transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="overflow-y-auto no-scrollbar max-w-2xl mx-auto">
        {searchQuery === '' ? (
          <div className="p-4">
            {/* Recent searches */}
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
                        onClick={() => handleRecentClick(term)}
                        className="flex-1 flex items-center gap-3 text-left"
                      >
                        <Clock className="w-4 h-4 text-white/40 group-hover:text-white/60" />
                        <span className="text-sm text-white/80">{term}</span>
                      </button>
                      <button
                        onClick={e => { e.stopPropagation(); clearRecentSearch(term); }}
                        className="p-1 hover:bg-white/10 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="w-3.5 h-3.5 text-white/40" />
                      </button>
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* Trending tags */}
            <h3 className="text-xs font-semibold text-white/50 mb-2 px-1">TRENDING</h3>
            <div className="flex flex-wrap gap-1.5">
              {TRENDING_TAGS.map(tag => (
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
                    <div
                      key={i}
                      className="w-2 h-2 bg-white/60 rounded-full animate-bounce"
                      style={{ animationDelay: `${delay}ms` }}
                    />
                  ))}
                </div>
              </div>
            ) : results.length > 0 ? (
              <>
                <h3 className="text-xs font-semibold text-white/50 mb-3 px-1">
                  {results.length} RESULT{results.length !== 1 ? 'S' : ''}
                </h3>
                {/* WallpaperCard handles navigation + nav loader internally */}
                <div className="masonry">
                  {results.map(wp => (
                    <div key={wp.id} style={{ marginBottom: '40px' }}>
                      <WallpaperCard wp={wp} />
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="text-center py-12">
                <Search className="w-12 h-12 text-white/20 mx-auto mb-3" />
                <p className="text-white/60">No results for &ldquo;{searchQuery}&rdquo;</p>
                <p className="text-sm text-white/40 mt-1">Try different keywords</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
