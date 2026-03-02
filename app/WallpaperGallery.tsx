'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { fetchWallpapers } from '@/lib/stores/wallpaperStore';
import { feedCache } from '@/lib/feedCache';
import { Header } from './components/Header';
import { Navigation } from './components/Navigation';
import { WallpaperGrid } from './components/WallpaperGrid';
import { GlobalStyles } from './components/GlobalStyles';
import type { Wallpaper, Filter } from './types';

const ITEMS_PER_PAGE = 10;

type Props = { initialWallpapers: Wallpaper[]; initialHasMore: boolean; };

export default function WallpaperGallery({ initialWallpapers, initialHasMore }: Props) {
  const [wallpapers,    setWallpapers]    = useState<Wallpaper[]>(feedCache.populated ? feedCache.wallpapers : initialWallpapers);
  const [hasMore,       setHasMore]       = useState(feedCache.populated ? feedCache.hasMore : initialHasMore);
  const [page,          setPage]          = useState(feedCache.page);
  const [filter,        setFilter]        = useState<Filter>(feedCache.filter);
  const [isInitialLoad, setIsInitialLoad] = useState(false);
  const [isRefreshing,  setIsRefreshing]  = useState(false);
  const [sidebarOpen,   setSidebarOpen]   = useState(false);

  const loadingMoreRef   = useRef(false);
  const filterChangedRef = useRef(false);

  useEffect(() => {
    if (feedCache.populated) {
      requestAnimationFrame(() => requestAnimationFrame(() => window.scrollTo({ top: feedCache.scrollY, behavior: 'instant' })));
      return;
    }
    feedCache.wallpapers = initialWallpapers;
    feedCache.page       = 1;
    feedCache.hasMore    = initialHasMore;
    feedCache.filter     = filter;
    feedCache.populated  = true;
  }, []);

  useEffect(() => {
    if (!filterChangedRef.current) { filterChangedRef.current = true; return; }
    let cancelled = false;
    setWallpapers([]); setPage(0); setHasMore(true); setIsInitialLoad(true);
    Object.assign(feedCache, { populated: false, wallpapers: [], scrollY: 0 });

    (async () => {
      try {
        const data = await fetchWallpapers(0, ITEMS_PER_PAGE, filter);
        if (cancelled) return;
        setWallpapers(data.wallpapers); setHasMore(data.hasMore); setPage(1);
        Object.assign(feedCache, { wallpapers: data.wallpapers, page: 1, hasMore: data.hasMore, filter, populated: true });
      } catch (e) { console.error('Failed to load on filter change:', e); }
      finally { if (!cancelled) setIsInitialLoad(false); }
    })();
    return () => { cancelled = true; };
  }, [filter]);

  const handleRefresh = useCallback(async () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    try {
      const data = await fetchWallpapers(0, ITEMS_PER_PAGE, filter);
      setWallpapers(data.wallpapers); setHasMore(data.hasMore); setPage(1);
      Object.assign(feedCache, { wallpapers: data.wallpapers, page: 1, hasMore: data.hasMore, scrollY: 0 });
    } catch (e) { console.error('Failed to refresh:', e); }
    finally { setIsRefreshing(false); }
  }, [filter, isRefreshing]);

  const handleLoadMore = useCallback(async () => {
    if (!hasMore || loadingMoreRef.current) return;
    loadingMoreRef.current = true;
    try {
      const data = await fetchWallpapers(page, ITEMS_PER_PAGE, filter);
      setWallpapers(prev => {
        const seen = new Set(prev.map(wp => wp.id));
        const next = [...prev, ...data.wallpapers.filter((wp: Wallpaper) => !seen.has(wp.id))];
        Object.assign(feedCache, { wallpapers: next, page: page + 1, hasMore: data.hasMore });
        return next;
      });
      setHasMore(data.hasMore); setPage(p => p + 1);
    } catch (e) { console.error('Failed to load more:', e); }
    finally { loadingMoreRef.current = false; }
  }, [hasMore, page, filter]);

  const handleFilterChange = useCallback((newFilter: Filter) => {
    if (newFilter === filter) return;
    window.scrollTo({ top: 0, behavior: 'instant' });
    setFilter(newFilter);
  }, [filter]);

  useEffect(() => {
    const save = () => { feedCache.scrollY = window.scrollY; };
    window.addEventListener('pagehide', save);
    return () => window.removeEventListener('pagehide', save);
  }, []);

  return (
    <div className="min-h-screen bg-gray-400 text-gray-900">
      <GlobalStyles />
      <Navigation isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="sidebar-offset">
        <Header filter={filter} setFilter={handleFilterChange} onMenuOpen={() => setSidebarOpen(true)} />
        <main className="max-w-7xl mx-auto px-4 py-6 pb-8">
          <WallpaperGrid
            wallpapers={wallpapers}
            isLoading={isInitialLoad}
            onRefresh={handleRefresh}
            onLoadMore={handleLoadMore}
            hasMore={hasMore}
          />
        </main>
      </div>
    </div>
  );
}