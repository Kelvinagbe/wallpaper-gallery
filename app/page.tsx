'use client';

import { useState, useEffect } from 'react';
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
import { generateMockData } from './utils/mockData';
import type { Wallpaper, UserProfile as UserProfileType, ActiveTab, Filter } from './types';

export default function WallpaperGallery() {
  const [wallpapers, setWallpapers] = useState<Wallpaper[]>([]);
  const [userProfiles, setUserProfiles] = useState<UserProfileType[]>([]);
  const [selectedWallpaper, setSelectedWallpaper] = useState<Wallpaper | null>(null);
  const [selectedUser, setSelectedUser] = useState<UserProfileType | null>(null);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [filter, setFilter] = useState<Filter>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<ActiveTab>('home');

  useEffect(() => {
    const { wallpapers: mockWallpapers, profiles: mockProfiles } = generateMockData();
    setTimeout(() => {
      setWallpapers(mockWallpapers);
      setUserProfiles(mockProfiles);
      setIsLoading(false);
    }, 1000);

    // Load recent searches from localStorage
    const savedSearches = localStorage.getItem('recentSearches');
    if (savedSearches) {
      setRecentSearches(JSON.parse(savedSearches));
    }
  }, []);

  const filteredWallpapers = wallpapers.filter(wp =>
    wp.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    wp.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase())) ||
    wp.uploadedBy.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSearchQuery = (query: string) => {
    setSearchQuery(query);
    
    // Save to recent searches if query is not empty and has actual results
    if (query.trim() && filteredWallpapers.length > 0) {
      const updated = [
        query.trim(),
        ...recentSearches.filter(s => s.toLowerCase() !== query.trim().toLowerCase())
      ].slice(0, 5); // Keep only 5 most recent
      
      setRecentSearches(updated);
      localStorage.setItem('recentSearches', JSON.stringify(updated));
    }
  };

  const clearRecentSearch = (searchTerm: string) => {
    const updated = recentSearches.filter(s => s !== searchTerm);
    setRecentSearches(updated);
    localStorage.setItem('recentSearches', JSON.stringify(updated));
  };

  const clearAllRecentSearches = () => {
    setRecentSearches([]);
    localStorage.removeItem('recentSearches');
  };

  const toggleFollow = (userId: string) => {
    setUserProfiles(prev => prev.map(user =>
      user.id === userId
        ? { ...user, isFollowing: !user.isFollowing, followers: user.isFollowing ? user.followers - 1 : user.followers + 1 }
        : user
    ));
  };

  const openUserProfile = (userId: string) => {
    const user = userProfiles.find(u => u.id === userId);
    if (user) setSelectedUser(user);
  };

  // Check if any full-screen view is open
  const isFullScreenViewOpen = selectedWallpaper || selectedUser || activeTab === 'profile' || activeTab === 'notifications';

  return (
    <div className="min-h-screen bg-black text-white pb-16">
      <GlobalStyles />

      {!isFullScreenViewOpen && (
        <Header filter={filter} setFilter={setFilter} />
      )}

      <main className="max-w-7xl mx-auto px-4 py-8">
        <WallpaperGrid
          wallpapers={filteredWallpapers}
          isLoading={isLoading}
          onWallpaperClick={setSelectedWallpaper}
        />
      </main>

      <Navigation
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onSearchOpen={() => setIsSearchOpen(true)}
        onUploadOpen={() => setIsUploadOpen(true)}
      />

      <SearchModal
        isOpen={isSearchOpen}
        onClose={() => {
          setIsSearchOpen(false);
          setSearchQuery('');
        }}
        searchQuery={searchQuery}
        setSearchQuery={handleSearchQuery}
        recentSearches={recentSearches}
        onClearRecentSearch={clearRecentSearch}
        onClearAllRecentSearches={clearAllRecentSearches}
        filteredWallpapers={filteredWallpapers}
        userProfiles={userProfiles}
        onWallpaperClick={(wp) => {
          setIsSearchOpen(false);
          setSelectedWallpaper(wp);
        }}
        onUserClick={(userId) => {
          setIsSearchOpen(false);
          openUserProfile(userId);
        }}
      />

      <UploadModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
      />

      {activeTab === 'profile' && (
        <ProfileNav
          onClose={() => setActiveTab('home')}
          wallpapers={wallpapers}
          onWallpaperClick={(wp) => {
            setActiveTab('home');
            setSelectedWallpaper(wp);
          }}
        />
      )}

      {activeTab === 'notifications' && (
        <NotificationNav
          onClose={() => setActiveTab('home')}
        />
      )}

      {selectedUser && (
        <UserProfile
          user={selectedUser}
          wallpapers={wallpapers}
          onClose={() => setSelectedUser(null)}
          onWallpaperClick={(wp) => {
            setSelectedUser(null);
            setSelectedWallpaper(wp);
          }}
          onToggleFollow={toggleFollow}
        />
      )}

      {selectedWallpaper && (
        <WallpaperDetail
          wallpaper={selectedWallpaper}
          relatedWallpapers={filteredWallpapers.filter(wp => wp.id !== selectedWallpaper.id).slice(0, 4)}
          onClose={() => setSelectedWallpaper(null)}
          onUserClick={() => openUserProfile(selectedWallpaper.userId)}
          onRelatedClick={setSelectedWallpaper}
        />
      )}
    </div>
  );
}