import { createPortal } from 'react-dom';
import { ChevronLeft, UserPlus, UserMinus, Grid, Heart, Bookmark } from 'lucide-react';
import { useState } from 'react';
import { CompactWallpaperCard } from './CompactWallpaperCard';
import type { UserProfile as UserProfileType, Wallpaper } from '../types';

type UserProfileProps = {
  user: UserProfileType | null;
  wallpapers: Wallpaper[];
  onClose: () => void;
  onWallpaperClick: (wallpaper: Wallpaper) => void;
  onToggleFollow: (userId: string) => void;
  isLoading?: boolean;
};

type TabType = 'posts' | 'liked' | 'saved';

export const UserProfile = ({ 
  user, 
  wallpapers, 
  onClose, 
  onWallpaperClick, 
  onToggleFollow,
  isLoading = false 
}: UserProfileProps) => {
  const [activeTab, setActiveTab] = useState<TabType>('posts');

  const userWallpapers = user ? wallpapers.filter(wp => wp.userId === user.id) : [];
  const likedWallpapers = user ? wallpapers.filter(wp => Math.random() > 0.7) : []; // Mock liked
  const savedWallpapers = user ? wallpapers.filter(wp => Math.random() > 0.8) : []; // Mock saved

  const getTabWallpapers = () => {
    switch (activeTab) {
      case 'posts':
        return userWallpapers;
      case 'liked':
        return likedWallpapers;
      case 'saved':
        return savedWallpapers;
      default:
        return userWallpapers;
    }
  };

  const currentWallpapers = getTabWallpapers();

  const modalContent = (
    <div className="fixed inset-0 bg-black z-50 flex flex-col slide-up overflow-y-auto no-scrollbar">
      <button
        onClick={onClose}
        className="sticky top-4 left-4 z-10 p-3 bg-black/60 backdrop-blur-md hover:bg-black/80 rounded-full transition-all w-fit"
      >
        <ChevronLeft className="w-6 h-6" />
      </button>

      <div className="max-w-2xl mx-auto w-full p-4 -mt-14">
        {isLoading || !user ? (
          // Skeleton Loader
          <div className="text-center mb-6 pt-16 animate-pulse">
            {/* Avatar Skeleton */}
            <div className="w-24 h-24 rounded-full mx-auto mb-4 bg-white/10" />
            
            {/* Name Skeleton */}
            <div className="h-8 w-48 bg-white/10 rounded-lg mx-auto mb-2" />
            
            {/* Bio Skeleton */}
            <div className="h-4 w-64 bg-white/10 rounded-lg mx-auto mb-4" />

            {/* Stats Skeleton */}
            <div className="flex items-center justify-center gap-6 mb-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="text-center">
                  <div className="h-7 w-12 bg-white/10 rounded-lg mx-auto mb-1" />
                  <div className="h-4 w-16 bg-white/10 rounded-lg mx-auto" />
                </div>
              ))}
            </div>

            {/* Button Skeleton */}
            <div className="h-10 w-32 bg-white/10 rounded-full mx-auto mb-6" />

            {/* Tabs Skeleton */}
            <div className="border-t border-white/10 pt-6">
              <div className="flex items-center gap-4 mb-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-10 w-24 bg-white/10 rounded-full" />
                ))}
              </div>

              {/* Grid Skeleton */}
              <div className="grid grid-cols-4 gap-2">
                {[...Array(12)].map((_, i) => (
                  <div key={i} className="aspect-[9/16] bg-white/10 rounded-lg" />
                ))}
              </div>
            </div>
          </div>
        ) : (
          // Actual Content
          <>
            <div className="text-center mb-6 pt-16">
              <img
                src={user.avatar}
                alt={user.name}
                className="w-24 h-24 rounded-full mx-auto mb-4 border-2 border-white/20"
              />
              <h2 className="text-2xl font-bold mb-1">{user.name}</h2>
              <p className="text-white/60 mb-4">{user.bio}</p>

              <div className="flex items-center justify-center gap-6 mb-6">
                {[
                  { label: 'Posts', count: user.posts },
                  { label: 'Followers', count: user.followers },
                  { label: 'Following', count: user.following }
                ].map(({ label, count }) => (
                  <div key={label} className="text-center">
                    <p className="text-xl font-bold">
                      {count > 1000 ? `${(count / 1000).toFixed(1)}k` : count}
                    </p>
                    <p className="text-sm text-white/60">{label}</p>
                  </div>
                ))}
              </div>

              <button
                onClick={() => onToggleFollow(user.id)}
                className={`px-8 py-2.5 rounded-full font-semibold transition-all ${
                  user.isFollowing
                    ? 'bg-white/10 hover:bg-white/20 border border-white/20'
                    : 'bg-white text-black hover:bg-gray-200'
                }`}
              >
                {user.isFollowing ? (
                  <span className="flex items-center gap-2">
                    <UserMinus className="w-4 h-4" />
                    Unfollow
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <UserPlus className="w-4 h-4" />
                    Follow
                  </span>
                )}
              </button>
            </div>

            <div className="border-t border-white/10 pt-6">
              {/* Tabs */}
              <div className="flex items-center gap-2 mb-4 overflow-x-auto no-scrollbar">
                <button
                  onClick={() => setActiveTab('posts')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-full font-medium transition-all whitespace-nowrap ${
                    activeTab === 'posts'
                      ? 'bg-white text-black'
                      : 'bg-white/5 hover:bg-white/10 text-white/80'
                  }`}
                >
                  <Grid className="w-4 h-4" />
                  Posts
                  <span className="text-xs opacity-60">({userWallpapers.length})</span>
                </button>

                <button
                  onClick={() => setActiveTab('liked')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-full font-medium transition-all whitespace-nowrap ${
                    activeTab === 'liked'
                      ? 'bg-white text-black'
                      : 'bg-white/5 hover:bg-white/10 text-white/80'
                  }`}
                >
                  <Heart className="w-4 h-4" />
                  Liked
                  <span className="text-xs opacity-60">({likedWallpapers.length})</span>
                </button>

                <button
                  onClick={() => setActiveTab('saved')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-full font-medium transition-all whitespace-nowrap ${
                    activeTab === 'saved'
                      ? 'bg-white text-black'
                      : 'bg-white/5 hover:bg-white/10 text-white/80'
                  }`}
                >
                  <Bookmark className="w-4 h-4" />
                  Saved
                  <span className="text-xs opacity-60">({savedWallpapers.length})</span>
                </button>
              </div>

              {/* Wallpapers Grid */}
              {currentWallpapers.length > 0 ? (
                <div className="grid grid-cols-4 gap-2">
                  {currentWallpapers.map((wp) => (
                    <CompactWallpaperCard key={wp.id} wp={wp} onClick={() => onWallpaperClick(wp)} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="w-16 h-16 mx-auto mb-4 bg-white/5 rounded-full flex items-center justify-center">
                    {activeTab === 'posts' && <Grid className="w-8 h-8 text-white/40" />}
                    {activeTab === 'liked' && <Heart className="w-8 h-8 text-white/40" />}
                    {activeTab === 'saved' && <Bookmark className="w-8 h-8 text-white/40" />}
                  </div>
                  <p className="text-white/60">
                    {activeTab === 'posts' && 'No posts yet'}
                    {activeTab === 'liked' && 'No liked wallpapers'}
                    {activeTab === 'saved' && 'No saved wallpapers'}
                  </p>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};