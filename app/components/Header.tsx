'use client';

import { Menu } from 'lucide-react';
import { useRouter } from 'next/navigation';
import type { Filter } from '../types';

interface HeaderProps {
  filter: Filter;
  setFilter: (filter: Filter) => void;
  onMenuOpen: () => void; // ← triggers sidebar on mobile
}

export const Header = ({ filter, setFilter, onMenuOpen }: HeaderProps) => {
  const router = useRouter();

  const filters: { value: Filter; label: string }[] = [
    { value: 'all',      label: 'All'      },
    { value: 'trending', label: 'Trending' },
    { value: 'recent',   label: 'Recent'   },
    { value: 'popular',  label: 'Popular'  },
  ];

  return (
    <header className="sticky top-0 z-50 bg-black border-b border-white/8">
      <div className="max-w-7xl mx-auto px-4 h-14 flex items-center gap-4">

        {/* Hamburger — mobile only */}
        <button
          onClick={onMenuOpen}
          className="lg:hidden p-1.5 rounded-lg hover:bg-white/8 transition-colors flex-shrink-0"
          aria-label="Open menu"
        >
          <Menu className="w-5 h-5 text-white/70" />
        </button>

        {/* Logo */}
        <span
          onClick={() => router.push('/')}
          className="text-white font-bold text-base cursor-pointer flex-shrink-0"
        >
          Wallpaper
        </span>

        {/* Filter tabs */}
        <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide flex-1">
          {filters.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => setFilter(value)}
              className={`
                px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap
                transition-all active:scale-95 flex-shrink-0
                ${filter === value
                  ? 'bg-white text-black'
                  : 'text-white/50 hover:text-white hover:bg-white/8'
                }
              `}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Right actions */}
        <div className="hidden sm:flex items-center gap-3 flex-shrink-0">
          <button
            onClick={() => router.push('/upload')}
            className="text-white/70 hover:text-white text-sm font-medium transition-colors"
          >
            Upload
          </button>
          <button
            onClick={() => router.push('/auth/login')}
            className="text-white/70 hover:text-white text-sm font-medium transition-colors"
          >
            Sign in
          </button>
        </div>

      </div>
    </header>
  );
};
