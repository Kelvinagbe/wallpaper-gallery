'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { fetchWallpapers } from '@/lib/stores/wallpaperStore';
import { Header } from './components/Header';
import { Navigation } from './components/Navigation';
import { WallpaperGrid } from './components/WallpaperGrid';
import { GlobalStyles } from './components/GlobalStyles';
import type { Wallpaper, Filter } from './types';

const ITEMS_PER_PAGE = 15;

export default function WallpaperGallery() {
  const [wallpapers,   setWallpapers]   = useState<Wallpaper[]>([]);
  const [hasMore,      setHasMore]      = useState(true);
  const [page,         setPage]         = useState(0);
  const [isLoading,    setIsLoading]    = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [filter,       setFilter]       = useState<Filter>('all');

  const loadingMoreRef = useRef(false);

  // ── Initial load + re-fetch on filter change ────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const data = await fetchWallpapers(0, ITEMS_PER_PAGE, filter);
        setWallpapers(data.wallpapers);
        setHasMore(data.hasMore);
        setPage(1);
      } catch (e) {
        console.error('Failed to load wallpapers:', e);
      } finally {
        setIsLoading(false);
      }
    })();
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
        return [...prev, ...data.wallpapers.filter((wp: Wallpaper) => !seen.has(wp.id))];
      });
      setHasMore(data.hasMore);
      setPage(p => p + 1);
    } catch (e) {
      console.error('Failed to load more:', e);
    } finally {
      loadingMoreRef.current = false;
    }
  }, [hasMore, page, filter]);

  // ── Filter change: reset pagination ────────────────────────────────────────
  const handleFilterChange = useCallback((newFilter: Filter) => {
    setFilter(newFilter);
    setWallpapers([]);
    setPage(0);
    setHasMore(true);
    setIsLoading(true);
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
          isLoading={isLoading}
          onRefresh={handleRefresh}
          onLoadMore={handleLoadMore}
          hasMore={hasMore}
        />
      </main>

      <Navigation />
    </div>
  );
}
