'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { fetchWallpapers } from '@/lib/stores/wallpaperStore';
import { Header } from './components/Header';
import { Navigation } from './components/Navigation';
import { WallpaperGrid } from './components/WallpaperGrid';
import { GlobalStyles } from './components/GlobalStyles';
import type { Wallpaper, Filter } from './types';

const ITEMS_PER_PAGE = 30;

// ─── Module-level feed cache ──────────────────────────────────────────────────
// Survives component unmount/remount (back navigation).
// Cleared only on hard browser refresh — never on route change.
export const feedCache: {
  wallpapers: Wallpaper[];
  page: number;
  filter: Filter;
  scrollY: number;
  hasMore: boolean;
  populated: boolean;
} = {
  wallpapers: [],
  page: 0,
  filter: 'all',
  scrollY: 0,
  hasMore: true,
  populated: false,
};

// Called by WallpaperCard right before router.push to capture scroll position
export const saveFeedScroll = () => {
  feedCache.scrollY = window.scrollY;
};

export default function WallpaperGallery() {
  // Initialise directly from cache so first render already has data if returning
  const [wallpapers,    setWallpapers]    = useState<Wallpaper[]>(feedCache.wallpapers);
  const [hasMore,       setHasMore]       = useState(feedCache.hasMore);
  const [page,          setPage]          = useState(feedCache.page);
  const [filter,        setFilter]        = useState<Filter>(feedCache.filter);
  const [isInitialLoad, setIsInitialLoad] = useState(!feedCache.populated);
  const [isRefreshing,  setIsRefreshing]  = useState(false);

  const loadingMoreRef   = useRef(false);
  const filterChangedRef = useRef(false); // prevents double-fetch on mount

  // ── Mount: restore from cache OR do first-ever fetch ───────────────────────
  useEffect(() => {
    if (feedCache.populated) {
      // Back navigation — grid already has data from useState init above.
      // Just restore scroll position after the grid has painted.
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          window.scrollTo({ top: feedCache.scrollY, behavior: 'instant' });
        });
      });
      return;
    }

    // True first load
    let cancelled = false;
    (async () => {
      try {
        const data = await fetchWallpapers(0, ITEMS_PER_PAGE, filter);
        if (cancelled) return;
        setWallpapers(data.wallpapers);
        setHasMore(data.hasMore);
        setPage(1);
        feedCache.wallpapers = data.wallpapers;
        feedCache.page       = 1;
        feedCache.hasMore    = data.hasMore;
        feedCache.filter     = filter;
        feedCache.populated  = true;
      } catch (e) {
        console.error('Failed to load wallpapers:', e);
      } finally {
        if (!cancelled) setIsInitialLoad(false);
      }
    })();
    return () => { cancelled = true; };
  }, []); // runs once on mount only

  // ── Filter change: re-fetch, update cache ──────────────────────────────────
  useEffect(() => {
    // Skip on initial mount
    if (!filterChangedRef.current) { filterChangedRef.current = true; return; }

    let cancelled = false;
    setWallpapers([]);
    setPage(0);
    setHasMore(true);
    feedCache.populated  = false;
    feedCache.wallpapers = [];
    feedCache.scrollY    = 0;

    (async () => {
      try {
        const data = await fetchWallpapers(0, ITEMS_PER_PAGE, filter);
        if (cancelled) return;
        setWallpapers(data.wallpapers);
        setHasMore(data.hasMore);
        setPage(1);
        feedCache.wallpapers = data.wallpapers;
        feedCache.page       = 1;
        feedCache.hasMore    = data.hasMore;
        feedCache.filter     = filter;
        feedCache.populated  = true;
      } catch (e) {
        console.error('Failed to load wallpapers on filter change:', e);
      }
    })();
    return () => { cancelled = true; };
  }, [filter]);

  // ── Refresh ─────────────────────────────────────────────────────────────────
  const handleRefresh = useCallback(async () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    try {
      const data = await fetchWallpapers(0, ITEMS_PER_PAGE, filter);
      setWallpapers(data.wallpapers);
      setHasMore(data.hasMore);
      setPage(1);
      feedCache.wallpapers = data.wallpapers;
      feedCache.page       = 1;
      feedCache.hasMore    = data.hasMore;
      feedCache.scrollY    = 0;
    } catch (e) {
      console.error('Failed to refresh:', e);
    } finally {
      setIsRefreshing(false);
    }
  }, [filter, isRefreshing]);

  // ── Load more ───────────────────────────────────────────────────────────────
  const handleLoadMore = useCallback(async () => {
    if (!hasMore || loadingMoreRef.current) return;
    loadingMoreRef.current = true;
    try {
      const data = await fetchWallpapers(page, ITEMS_PER_PAGE, filter);
      setWallpapers(prev => {
        const seen = new Set(prev.map((wp: Wallpaper) => wp.id));
        const next = [...prev, ...data.wallpapers.filter((wp: Wallpaper) => !seen.has(wp.id))];
        // Keep cache in sync — back navigation restores the full scrolled list
        feedCache.wallpapers = next;
        feedCache.page       = page + 1;
        feedCache.hasMore    = data.hasMore;
        return next;
      });
      setHasMore(data.hasMore);
      setPage(p => p + 1);
    } catch (e) {
      console.error('Failed to load more:', e);
    } finally {
      loadingMoreRef.current = false;
    }
  }, [hasMore, page, filter]);

  // ── Filter change handler ───────────────────────────────────────────────────
  const handleFilterChange = useCallback((newFilter: Filter) => {
    if (newFilter === filter) return;
    window.scrollTo({ top: 0, behavior: 'instant' });
    setFilter(newFilter);
  }, [filter]);

  // ── Safety net: save scroll on any navigation away ─────────────────────────
  useEffect(() => {
    const save = () => { feedCache.scrollY = window.scrollY; };
    window.addEventListener('pagehide', save);
    return () => window.removeEventListener('pagehide', save);
  }, []);

  return (
    <div className="min-h-screen bg-black text-white pb-16">
      <GlobalStyles />
      <Header
        filter={filter}
        setFilter={handleFilterChange}
        onRefresh={handleRefresh}
        isRefreshing={isRefreshing}
      />
      <main className="max-w-7xl mx-auto px-4 py-8">
        <WallpaperGrid
          wallpapers={wallpapers}
          isLoading={isInitialLoad}
          onRefresh={handleRefresh}
          onLoadMore={handleLoadMore}
          hasMore={hasMore}
        />
      </main>
      <Navigation />
    </div>
  );
}
