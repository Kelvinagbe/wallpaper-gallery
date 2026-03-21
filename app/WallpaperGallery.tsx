'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { fetchWallpapers } from '@/lib/stores/wallpaperStore';
import { feedCache } from '@/lib/feedCache';
import { Header } from './components/Header';
import { Navigation } from './components/Navigation';
import { WallpaperGrid } from './components/WallpaperGrid';
import { PCWallpaperRow } from './components/DesktopWallpaperRow';
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
  const [sidebarOpen,   setSidebarOpen]   = useState(false);

  const loadingMoreRef   = useRef(false);
  const filterChangedRef = useRef(false);

  // Restore scroll or seed cache on first mount
  useEffect(() => {
    if (feedCache.populated) {
      requestAnimationFrame(() => requestAnimationFrame(() =>
        window.scrollTo({ top: feedCache.scrollY, behavior: 'instant' })
      ));
      return;
    }
    Object.assign(feedCache, { wallpapers: initialWallpapers, page: 1, hasMore: initialHasMore, filter, populated: true });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Re-fetch when filter changes (skip first run)
  useEffect(() => {
    if (!filterChangedRef.current) { filterChangedRef.current = true; return; }
    let cancelled = false;
    setWallpapers([]); setPage(0); setHasMore(true); setIsInitialLoad(true);
    Object.assign(feedCache, { populated: false, wallpapers: [], scrollY: 0 });

    fetchWallpapers(0, ITEMS_PER_PAGE, filter)
      .then(data => {
        if (cancelled) return;
        setWallpapers(data.wallpapers);
        setHasMore(data.hasMore);
        setPage(1);
        Object.assign(feedCache, { wallpapers: data.wallpapers, page: 1, hasMore: data.hasMore, filter, populated: true });
      })
      .catch(e => console.error('Filter change failed:', e))
      .finally(() => { if (!cancelled) setIsInitialLoad(false); });

    return () => { cancelled = true; };
  }, [filter]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleLoadMore = useCallback(async () => {
    if (!hasMore || loadingMoreRef.current) return;
    loadingMoreRef.current = true;
    try {
      const data = await fetchWallpapers(page, ITEMS_PER_PAGE, filter);
      const seen = new Set(wallpapers.map(w => w.id));
      const fresh = data.wallpapers.filter((w: Wallpaper) => !seen.has(w.id));
      setWallpapers(prev => {
        const next = [...prev, ...fresh];
        Object.assign(feedCache, { wallpapers: next, page: page + 1, hasMore: data.hasMore });
        return next;
      });
      setHasMore(data.hasMore);
      setPage(p => p + 1);
    } catch (e) {
      console.error('Load more failed:', e);
    } finally {
      loadingMoreRef.current = false;
    }
  }, [hasMore, page, filter, wallpapers]);

  const handleFilterChange = useCallback((newFilter: Filter) => {
    if (newFilter === filter) return;
    window.scrollTo({ top: 0, behavior: 'instant' });
    setFilter(newFilter);
  }, [filter]);

  // Save scroll position before unload
  useEffect(() => {
    const save = () => { feedCache.scrollY = window.scrollY; };
    window.addEventListener('pagehide', save);
    return () => window.removeEventListener('pagehide', save);
  }, []);

  // Split wallpapers by type
  const pcWalls     = wallpapers.filter(wp => wp.type === 'pc');
  const mobileWalls = wallpapers.filter(wp => wp.type !== 'pc');

  return (
    <div className="min-h-screen bg-white text-gray-900">
      <GlobalStyles />
      <Navigation isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="sidebar-offset">
        <Header filter={filter} setFilter={handleFilterChange} onMenuOpen={() => setSidebarOpen(true)} />
        <main className="max-w-7xl mx-auto px-4 py-6 pb-8">
          {pcWalls.length > 0 && <DesktopWallpaperRow wallpapers={pcWalls} />}
          <WallpaperGrid
            wallpapers={mobileWalls}
            isLoading={isInitialLoad}
            onLoadMore={handleLoadMore}
            hasMore={hasMore}
          />
        </main>
      </div>
    </div>
  );
}
