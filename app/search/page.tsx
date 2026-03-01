'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Search, X, ChevronLeft, Clock, TrendingUp } from 'lucide-react';
import { WallpaperCard } from '@/app/components/WallpaperCard';
import { searchWallpapers } from '@/lib/stores/wallpaperStore';
import type { Wallpaper } from '@/app/types';

const TRENDING_TAGS = ['Nature', 'Abstract', 'Dark', 'Minimal', 'Anime', 'Space', 'Ocean', 'Mountains'];

export default function SearchPage() {
  const router   = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [query,   setQuery]   = useState('');
  const [recent,  setRecent]  = useState<string[]>([]);
  const [results, setResults] = useState<Wallpaper[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    try { const s = localStorage.getItem('recentSearches'); if (s) setRecent(JSON.parse(s)); } catch {}
    setTimeout(() => inputRef.current?.focus(), 100);
  }, []);

  const saveRecent = (q: string) => {
    const updated = [q, ...recent.filter(s => s.toLowerCase() !== q.toLowerCase())].slice(0, 5);
    setRecent(updated);
    localStorage.setItem('recentSearches', JSON.stringify(updated));
  };

  const removeRecent = (term: string) => {
    const updated = recent.filter(s => s !== term);
    setRecent(updated);
    localStorage.setItem('recentSearches', JSON.stringify(updated));
  };

  const clearRecent = () => { setRecent([]); localStorage.removeItem('recentSearches'); };

  const handleSearch = (q: string) => {
    setQuery(q);
    if (debounce.current) clearTimeout(debounce.current);
    if (!q.trim()) { setResults([]); return; }
    debounce.current = setTimeout(async () => {
      setLoading(true);
      try {
        const { wallpapers } = await searchWallpapers(q.trim());
        setResults(wallpapers);
        saveRecent(q.trim());
      } catch { setResults([]); }
      finally { setLoading(false); }
    }, 400);
  };

  const handleClear = () => { setQuery(''); setResults([]); inputRef.current?.focus(); };

  return (
    <div className="min-h-screen bg-white">
      <style>{`
        @keyframes fadeUp { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        .fade-up { animation: fadeUp 0.25s ease forwards; }
        @keyframes pulse-dot { 0%, 100% { opacity: 0.3; transform: scale(0.8); } 50% { opacity: 1; transform: scale(1); } }
        .pulse-dot { animation: pulse-dot 1.2s ease-in-out infinite; }
      `}</style>

      {/* ── Header ── */}
      <div className="sticky top-0 z-20 bg-white border-b border-gray-100">
        <div className="flex items-center gap-3 px-4 py-3 max-w-3xl mx-auto">
          <button
            onClick={() => router.back()}
            className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-gray-100 active:scale-95 transition-all flex-shrink-0"
          >
            <ChevronLeft className="w-5 h-5 text-gray-700" strokeWidth={2} />
          </button>

          {/* Search bar */}
          <div className="flex-1 flex items-center gap-2.5 px-4 py-2.5 bg-gray-50 rounded-2xl border border-gray-200 focus-within:border-gray-400 focus-within:bg-white transition-all">
            <Search className="w-4 h-4 text-gray-400 flex-shrink-0" strokeWidth={2} />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={e => handleSearch(e.target.value)}
              placeholder="Search wallpapers..."
              className="flex-1 bg-transparent text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none"
            />
            {query && (
              <button onClick={handleClear} className="w-5 h-5 flex items-center justify-center rounded-full bg-gray-300 hover:bg-gray-400 transition-colors flex-shrink-0">
                <X className="w-3 h-3 text-white" strokeWidth={2.5} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Body ── */}
      <div className="max-w-3xl mx-auto px-4 py-5 scrollbar-hide">

        {!query ? (
          <div className="fade-up space-y-7">

            {/* Recent searches */}
            {recent.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5 text-gray-400" />
                    <span className="text-xs font-semibold text-gray-400 tracking-widest">RECENT</span>
                  </div>
                  <button onClick={clearRecent} className="text-xs text-gray-400 hover:text-gray-600 transition-colors">
                    Clear
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {recent.map((term, i) => (
                    <div key={i} className="flex items-center gap-1.5 pl-3 pr-2 py-1.5 bg-gray-50 border border-gray-200 rounded-full group hover:border-gray-300 transition-colors">
                      <button onClick={() => handleSearch(term)} className="text-sm text-gray-700">
                        {term}
                      </button>
                      <button onClick={e => { e.stopPropagation(); removeRecent(term); }} className="w-4 h-4 flex items-center justify-center rounded-full hover:bg-gray-200 transition-colors">
                        <X className="w-2.5 h-2.5 text-gray-400" strokeWidth={2.5} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Trending */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp className="w-3.5 h-3.5 text-gray-400" />
                <span className="text-xs font-semibold text-gray-400 tracking-widest">TRENDING</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {TRENDING_TAGS.map((tag, i) => (
                  <button
                    key={tag}
                    onClick={() => handleSearch(tag)}
                    className="px-4 py-2 bg-white border border-gray-200 hover:border-gray-900 hover:bg-gray-900 hover:text-white rounded-full text-sm text-gray-700 font-medium transition-all duration-200 active:scale-95"
                    style={{ animationDelay: `${i * 40}ms` }}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>

          </div>
        ) : (
          <div className="fade-up">
            {loading ? (
              <div className="flex items-center justify-center py-20 gap-1.5">
                {[0, 200, 400].map((delay, i) => (
                  <div key={i} className="w-1.5 h-1.5 bg-gray-300 rounded-full pulse-dot" style={{ animationDelay: `${delay}ms` }} />
                ))}
              </div>
            ) : results.length > 0 ? (
              <>
                <p className="text-xs font-semibold text-gray-400 tracking-widest mb-4">
                  {results.length} RESULT{results.length !== 1 ? 'S' : ''} FOR &ldquo;{query.toUpperCase()}&rdquo;
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {results.map((wp, i) => (
                    <WallpaperCard key={wp.id} wp={wp} placeholderIndex={i} />
                  ))}
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center py-24 gap-3">
                <div className="w-12 h-12 rounded-2xl bg-gray-50 border border-gray-200 flex items-center justify-center">
                  <Search className="w-5 h-5 text-gray-300" strokeWidth={1.5} />
                </div>
                <p className="text-sm font-medium text-gray-900">No results found</p>
                <p className="text-xs text-gray-400">Try &ldquo;{query}&rdquo; with different keywords</p>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
