'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { fetchWallpapers } from '@/lib/stores/wallpaperStore';
import { feedCache } from '@/lib/feedCache';
import { Header } from './components/Header';
import { Navigation } from './components/Navigation';
import { WallpaperGrid } from './components/WallpaperGrid';
import { GlobalStyles } from './components/GlobalStyles';
import type { Wallpaper, Filter } from './types';

const ITEMS_PER_PAGE = 30;

export default function WallpaperGallery() {
  const [wallpapers,    setWallpapers]    = useState<Wallpaper[]>(feedCache.wallpapers);
  const [hasMore,       setHasMore]       = useState(feedCache.hasMore);
  const [page,          setPage]          = useState(feedCache.page);
  const [filter,        setFilter]        = useState<Filter>(feedCache.filter);
  const [isInitialLoad, setIsInitialLoad] = useState(!feedCache.populated);
  const [isRefreshing,  setIsRefreshing]  = useState(false);

  const loadingMoreRef   = useRef(false);
  const filterChangedRef = useRef(false);

  // ── Mount: restore from cache OR first-ever fetch ───────────────────────────
  useEffect(() => {
    if (feedCache.populated) {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          window.scrollTo({ top: feedCache.scrollY, behavior: 'instant' });
        });
      });
      return;
    }

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
  }, []);

  // ── Filter change ───────────────────────────────────────────────────────────
  useEffect(() => {
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
        console.error('Failed to load on filter change:', e);
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

  // ── Safety net: save scroll on page hide ───────────────────────────────────
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