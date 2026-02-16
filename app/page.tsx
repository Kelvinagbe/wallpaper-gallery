'use client';

import { useState, useEffect } from 'react';
import { useAuth } from './components/AuthProvider';
import { fetchWallpapers } from '@/lib/stores/wallpaperStore';
import { Header } from './components/Header';
import { Navigation } from './components/Navigation';
import { SearchModal } from './components/SearchModal';
import { UploadModal } from './components/UploadModal';
import { UserProfile } from './components/UserProfile';
import { WallpaperDetail } from './components/WallpaperDetail';
import { WallpaperGrid } from './components/WallpaperGrid';
import { GlobalStyles } from './components/GlobalStyles';
import { ProfileNav } from './components/ProfileNav';
import { NotificationNav } from './components/NotificationNav';
import type { Wallpaper, ActiveTab, Filter } from './types';

export default function WallpaperGallery() {
  const { session } = useAuth();
  const [showSplash, setShowSplash] = useState(true);
  const [wallpapers, setWallpapers] = useState<Wallpaper[]>([]);
  const [hasMore, setHasMore] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [selectedWallpaper, setSelectedWallpaper] = useState<Wallpaper | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [filter, setFilter] = useState<Filter>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<ActiveTab>('home');

  const ITEMS_PER_PAGE = 30;

  // Hide splash after 6 seconds
  useEffect(() => {
    const splashTimer = setTimeout(() => setShowSplash(false), 6000);
    return () => clearTimeout(splashTimer);
  }, []);

  // Load app data in background
  useEffect(() => {
    const loadData = async () => {
      try {
        const data = await fetchWallpapers(0, ITEMS_PER_PAGE);
        setWallpapers(data.wallpapers);
        setHasMore(data.hasMore);
        setTotal(data.total);
        setPage(1);
      } catch (error) {
        console.error('Failed to load wallpapers:', error);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, []);

  // Refresh wallpapers
  const handleRefresh = async () => {
    try {
      const data = await fetchWallpapers(0, ITEMS_PER_PAGE);
      setWallpapers(data.wallpapers);
      setHasMore(data.hasMore);
      setTotal(data.total);
      setPage(1);
    } catch (error) {
      console.error('Failed to refresh:', error);
    }
  };

  // Load more wallpapers
  const handleLoadMore = async () => {
    if (!hasMore || isLoading) return;
    
    try {
      const data = await fetchWallpapers(page * ITEMS_PER_PAGE, ITEMS_PER_PAGE);
      
      // Append new wallpapers, avoiding duplicates
      setWallpapers(prev => {
        const existingIds = new Set(prev.map((wp: Wallpaper) => wp.id));
        const newWallpapers = data.wallpapers.filter((wp: Wallpaper) => !existingIds.has(wp.id));
        return [...prev, ...newWallpapers];
      });
      
      setHasMore(data.hasMore);
      setPage(prev => prev + 1);
    } catch (error) {
      console.error('Failed to load more:', error);
    }
  };

  const isFullScreenViewOpen = selectedWallpaper || selectedUserId || activeTab === 'profile' || activeTab === 'notifications';

  return (
    <>
      {/* Splash Screen */}
      {showSplash && (
        <div className="splash-screen">
          <div className="splash-content">
            <img src="/favicon.ico" alt="Logo" className="splash-logo" />
            <div className="splash-loader">
              <div className="splash-loader-bar"></div>
            </div>
          </div>
        </div>
      )}

      {/* Main App */}
      <div className="min-h-screen bg-black text-white pb-16">
        <GlobalStyles />

        {!isFullScreenViewOpen && (
          <Header 
            filter={filter} 
            setFilter={setFilter} 
            onRefresh={handleRefresh}
            isRefreshing={false}
          />
        )}

        <main className="max-w-7xl mx-auto px-4 py-8">
          <WallpaperGrid 
            wallpapers={wallpapers} 
            isLoading={isLoading} 
            onWallpaperClick={setSelectedWallpaper}
            onRefresh={handleRefresh}
            onLoadMore={handleLoadMore}
            hasMore={hasMore}
          />
        </main>

        <Navigation
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          onSearchOpen={() => setIsSearchOpen(true)}
          onUploadOpen={() => setIsUploadOpen(true)}
        />

        {/* SearchModal now manages its own state */}
        <SearchModal
          isOpen={isSearchOpen}
          onClose={() => setIsSearchOpen(false)}
          onWallpaperClick={(wp) => { setIsSearchOpen(false); setSelectedWallpaper(wp); }}
          onUserClick={(userId) => { setIsSearchOpen(false); setSelectedUserId(userId); }}
        />

        <UploadModal 
          isOpen={isUploadOpen} 
          onClose={() => setIsUploadOpen(false)}
          onSuccess={handleRefresh}
        />

        {activeTab === 'profile' && (
          <ProfileNav
            onClose={() => setActiveTab('home')}
            wallpapers={wallpapers}
            onWallpaperClick={(wp) => { setActiveTab('home'); setSelectedWallpaper(wp); }}
          />
        )}

        {activeTab === 'notifications' && <NotificationNav onClose={() => setActiveTab('home')} />}

        {selectedUserId && (
          <UserProfile
            userId={selectedUserId}
            wallpapers={wallpapers}
            onClose={() => setSelectedUserId(null)}
            onWallpaperClick={(wp) => { setSelectedUserId(null); setSelectedWallpaper(wp); }}
          />
        )}

        {selectedWallpaper && (
          <WallpaperDetail
            wallpaper={selectedWallpaper}
            relatedWallpapers={wallpapers.filter(wp => wp.id !== selectedWallpaper.id).slice(0, 4)}
            onClose={() => setSelectedWallpaper(null)}
            onUserClick={() => setSelectedUserId(selectedWallpaper.userId)}
            onRelatedClick={setSelectedWallpaper}
          />
        )}
      </div>
    </>
  );
}
