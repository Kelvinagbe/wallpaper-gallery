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
  }, []);

  const filteredWallpapers = wallpapers.filter(wp =>
    wp.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    wp.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase())) ||
    wp.uploadedBy.toLowerCase().includes(searchQuery.toLowerCase())
  );

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

  return (
    <div className="min-h-screen bg-black text-white pb-16">
      <GlobalStyles />

      {!selectedWallpaper && !selectedUser && (
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
        onClose={() => setIsSearchOpen(false)}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
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
