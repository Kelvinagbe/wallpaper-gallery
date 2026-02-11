import type { Filter } from '../types';

type HeaderProps = {
  filter: Filter;
  setFilter: (filter: Filter) => void;
};

export const Header = ({ filter, setFilter }: HeaderProps) => (
  <header className="sticky top-0 z-40 backdrop-blur-xl bg-black/80 border-b border-white/10">
    <div className="max-w-7xl mx-auto px-4 py-4 flex items-center gap-4 justify-between">
      <div className="flex items-center gap-2">
        <img src="/favicon.ico" alt="Logo" className="w-8 h-8" />
        <span className="text-xl font-semibold hidden sm:inline">Gallery</span>
      </div>
      <div className="flex gap-2 overflow-x-auto no-scrollbar">
        {(['all', 'popular', 'recent'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all whitespace-nowrap ${
              filter === f
                ? 'bg-white text-black'
                : 'bg-white/5 hover:bg-white/10 border border-white/10'
            }`}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>
    </div>
  </header>
);
