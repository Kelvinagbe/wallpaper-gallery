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
  const [hasMore, setHasMore] = useState(false);
  const [total, setTotal] = useState(0);
  const [selectedWallpaper, setSelectedWallpaper] = useState<Wallpaper | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [filter, setFilter] = useState<Filter>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<ActiveTab>('home');

  useEffect(() => {
    const splashTimer = setTimeout(() => setShowSplash(false), 4000);
    return () => clearTimeout(splashTimer);
  }, []);

  useEffect(() => {
    (async () => {
      setIsLoading(true);
      const data = await fetchWallpapers(0, 50);
      setWallpapers(data.wallpapers);
      setHasMore(data.hasMore);
      setTotal(data.total);
      setIsLoading(false);
    })();

    const savedSearches = localStorage.getItem('recentSearches');
    if (savedSearches) setRecentSearches(JSON.parse(savedSearches));
  }, []);

  const filteredWallpapers = wallpapers.filter(wp =>
    wp.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    wp.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase())) ||
    wp.uploadedBy.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSearchQuery = (query: string) => {
    setSearchQuery(query);
    if (query.trim() && filteredWallpapers.length > 0) {
      const updated = [query.trim(), ...recentSearches.filter(s => s.toLowerCase() !== query.trim().toLowerCase())].slice(0, 5);
      setRecentSearches(updated);
      localStorage.setItem('recentSearches', JSON.stringify(updated));
    }
  };

  const isFullScreenViewOpen = selectedWallpaper || selectedUserId || activeTab === 'profile' || activeTab === 'notifications';

  if (showSplash) {
    return (
      <div className="splash-screen">
        <div className="splash-content">
          <img src="/favicon.ico" alt="Logo" className="splash-logo" />
          <div className="splash-loader">
            <div className="splash-loader-bar"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white pb-16">
      <GlobalStyles />
      {!isFullScreenViewOpen && <Header filter={filter} setFilter={setFilter} />}
      <main className="max-w-7xl mx-auto px-4 py-8">
        <WallpaperGrid wallpapers={filteredWallpapers} isLoading={isLoading} onWallpaperClick={setSelectedWallpaper} />
      </main>
      <Navigation activeTab={activeTab} setActiveTab={setActiveTab} onSearchOpen={() => setIsSearchOpen(true)} onUploadOpen={() => setIsUploadOpen(true)} />
      <SearchModal isOpen={isSearchOpen} onClose={() => { setIsSearchOpen(false); setSearchQuery(''); }} searchQuery={searchQuery} setSearchQuery={handleSearchQuery} recentSearches={recentSearches} onClearRecentSearch={(term) => { const updated = recentSearches.filter(s => s !== term); setRecentSearches(updated); localStorage.setItem('recentSearches', JSON.stringify(updated)); }} onClearAllRecentSearches={() => { setRecentSearches([]); localStorage.removeItem('recentSearches'); }} filteredWallpapers={filteredWallpapers} onWallpaperClick={(wp) => { setIsSearchOpen(false); setSelectedWallpaper(wp); }} onUserClick={(userId) => { setIsSearchOpen(false); setSelectedUserId(userId); }} />
      <UploadModal isOpen={isUploadOpen} onClose={() => setIsUploadOpen(false)} />
      {activeTab === 'profile' && <ProfileNav onClose={() => setActiveTab('home')} wallpapers={wallpapers} onWallpaperClick={(wp) => { setActiveTab('home'); setSelectedWallpaper(wp); }} />}
      {activeTab === 'notifications' && <NotificationNav onClose={() => setActiveTab('home')} />}
      {selectedUserId && <UserProfile userId={selectedUserId} wallpapers={wallpapers} onClose={() => setSelectedUserId(null)} onWallpaperClick={(wp) => { setSelectedUserId(null); setSelectedWallpaper(wp); }} />}
      {selectedWallpaper && <WallpaperDetail wallpaper={selectedWallpaper} relatedWallpapers={filteredWallpapers.filter(wp => wp.id !== selectedWallpaper.id).slice(0, 4)} onClose={() => setSelectedWallpaper(null)} onUserClick={() => setSelectedUserId(selectedWallpaper.userId)} onRelatedClick={setSelectedWallpaper} />}
    </div>
  );
}