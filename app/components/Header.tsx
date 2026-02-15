import { RefreshCw } from 'lucide-react';
import type { Filter } from '../types';

interface HeaderProps {
  filter: Filter;
  setFilter: (filter: Filter) => void;
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

export const Header = ({ filter, setFilter, onRefresh, isRefreshing = false }: HeaderProps) => {
  const filters: { value: Filter; label: string }[] = [
    { value: 'all', label: 'All' },
    { value: 'trending', label: 'Trending' },
    { value: 'recent', label: 'Recent' },
    { value: 'popular', label: 'Popular' },
  ];

  return (
    <header className="bg-black/80 backdrop-blur-xl border-b border-white/10">
      {/* Scrollable title section */}
      <div className="max-w-7xl mx-auto px-4 pt-4 pb-3">
        <h1 className="text-2xl font-bold bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent">
          Wallpapers
        </h1>
      </div>

      {/* Sticky filter bar */}
      <div className="sticky top-0 z-40 bg-black/80 backdrop-blur-xl border-t border-white/5">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center gap-2">
            {/* Filters - scrollable horizontally */}
            <div className="flex-1 flex gap-2 overflow-x-auto scrollbar-hide">
              {filters.map(({ value, label }) => (
                <button
                  key={value}
                  onClick={() => setFilter(value)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                    filter === value
                      ? 'bg-white text-black'
                      : 'bg-white/5 text-white/70 hover:bg-white/10'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Refresh button - always visible */}
            {onRefresh && (
              <button
                onClick={onRefresh}
                disabled={isRefreshing}
                className="flex-shrink-0 p-2 hover:bg-white/5 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                title="Refresh wallpapers"
              >
                <RefreshCw 
                  className={`w-5 h-5 text-white/70 ${isRefreshing ? 'animate-spin' : ''}`}
                />
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};