'use client';

import { useState, useEffect } from 'react';
import { fetchWallpapers } from '@/lib/stores/wallpaperStore';
import { Header } from './components/Header';
import { Navigation } from './components/Navigation';
import { WallpaperGrid } from './components/WallpaperGrid';
import { GlobalStyles } from './components/GlobalStyles';
import type { Wallpaper, Filter } from './types';

const ITEMS_PER_PAGE = 30;
 
export default function WallpaperGallery() {
  const [showSplash, setShowSplash] = useState(false);
  const [wallpapers, setWallpapers] = useState<Wallpaper[]>([]);
  const [hasMore, setHasMore]       = useState(true);
  const [page, setPage]             = useState(0);
  const [isLoading, setIsLoading]   = useState(true);
  const [filter, setFilter]         = useState<Filter>('all');

  // Splash screen
  useEffect(() => {
    const t = setTimeout(() => setShowSplash(false), 6000);
    return () => clearTimeout(t);
  }, []);

  // Initial load
  useEffect(() => {
    (async () => {
      try {
        const data = await fetchWallpapers(0, ITEMS_PER_PAGE);
        setWallpapers(data.wallpapers);
        setHasMore(data.hasMore);
        setPage(1);
      } catch (e) {
        console.error('Failed to load wallpapers:', e);
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const handleRefresh = async () => {
    try {
      const data = await fetchWallpapers(0, ITEMS_PER_PAGE);
      setWallpapers(data.wallpapers);
      setHasMore(data.hasMore);
      setPage(1);
    } catch (e) {
      console.error('Failed to refresh:', e);
    }
  };

  const handleLoadMore = async () => {
    if (!hasMore || isLoading) return;
    try {
      const data = await fetchWallpapers(page, ITEMS_PER_PAGE);
      setWallpapers(prev => {
        const seen = new Set(prev.map((wp: Wallpaper) => wp.id));
        return [...prev, ...data.wallpapers.filter((wp: Wallpaper) => !seen.has(wp.id))];
      });
      setHasMore(data.hasMore);
      setPage(p => p + 1);
    } catch (e) {
      console.error('Failed to load more:', e);
    }
  };

  return (
    <>
      {showSplash && (
        <div className="splash-screen">
          <div className="splash-content">
            <img src="/favicon.ico" alt="Logo" className="splash-logo" />
            <div className="splash-loader"><div className="splash-loader-bar" /></div>
          </div>
        </div>
      )}

      <div className="min-h-screen bg-black text-white pb-16">
        <GlobalStyles />
        <Header filter={filter} setFilter={setFilter} onRefresh={handleRefresh} isRefreshing={false} />

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
    </>
  );
}
