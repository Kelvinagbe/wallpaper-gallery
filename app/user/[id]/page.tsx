'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ChevronLeft, UserPlus, UserMinus, Grid, Heart, Bookmark } from 'lucide-react';
import { VerifiedBadge } from '@/app/components/VerifiedBadge';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/app/components/AuthProvider';
import {
  fetchProfile,
  fetchUserWallpapers,
  getUserCounts,
  checkIsFollowing,
  followUser,
  unfollowUser,
} from '@/lib/stores/wallpaperStore';
import type { Wallpaper } from '@/app/types';

// Shimmer skeleton
const Shimmer = ({ className = '' }: { className?: string }) => (
  <div className={`shimmer rounded ${className}`} />
);

// Wallpaper grid card
const WallpaperCard = ({ wp, onClick }: { wp: Wallpaper; onClick: () => void }) => (
  <button
    onClick={onClick}
    className="relative aspect-[9/16] rounded-xl overflow-hidden hover:scale-[1.02] transition-transform active:scale-95 bg-zinc-900"
  >
    <img
      src={wp.thumbnail || wp.url}
      alt={wp.title}
      className="w-full h-full object-cover"
      loading="lazy"
    />
    <div
      style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.5), transparent)' }}
    />
    <p className="absolute bottom-1.5 left-1.5 right-1.5 text-xs text-white font-medium line-clamp-1">{wp.title}</p>
  </button>
);

type TabType = 'posts' | 'liked' | 'saved';

export default function UserProfilePage() {
  const router = useRouter();
  const params = useParams();
  const userId = params?.id as string;
  const { session } = useAuth();
  const supabase = createClient();

  const [profile, setProfile] = useState<any>(null);
  const [stats, setStats] = useState({ followers: 0, following: 0, posts: 0 });
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);

  const [activeTab, setActiveTab] = useState<TabType>('posts');
  const [posts, setPosts] = useState<Wallpaper[]>([]);
  const [liked, setLiked] = useState<Wallpaper[]>([]);
  const [saved, setSaved] = useState<Wallpaper[]>([]);
  const [tabLoading, setTabLoading] = useState(false);

  const isOwnProfile = session?.user.id === userId;
  const fmt = (n: number) =>
    n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M` :
    n >= 1_000     ? `${(n / 1_000).toFixed(1)}k`     : String(n);

  // Load profile + stats + follow state
  useEffect(() => {
    if (!userId) return;
    (async () => {
      try {
        const [userProfile, userStats] = await Promise.all([
          fetchProfile(userId),
          getUserCounts(userId),
        ]);

        if (!userProfile) { router.replace('/'); return; }
        setProfile(userProfile);
        setStats(userStats);

        if (session) {
          const following = await checkIsFollowing(session.user.id, userId);
          setIsFollowing(following);
        }
      } catch (e) {
        console.error('Profile load error:', e);
        router.replace('/');
      } finally {
        setPageLoading(false);
      }
    })();
  }, [userId, session]);

  // Load posts tab on mount
  useEffect(() => {
    if (!userId) return;
    (async () => {
      try {
        const { wallpapers } = await fetchUserWallpapers(userId, 0, 24);
        setPosts(wallpapers);
      } catch (e) {
        console.error('Posts load error:', e);
      }
    })();
  }, [userId]);

  // Load liked/saved tabs on demand (own profile only)
  useEffect(() => {
    if (!isOwnProfile || !session) return;
    if (activeTab === 'liked' && liked.length === 0) {
      setTabLoading(true);
      (async () => {
        try {
          const { data } = await supabase
            .from('likes')
            .select('wallpaper_id, wallpapers(*, profiles:user_id(username, full_name, avatar_url, verified))')
            .eq('user_id', session.user.id)
            .order('created_at', { ascending: false })
            .limit(24);
          if (data) {
            setLiked(data.map((row: any) => ({
              id:          row.wallpapers.id,
              url:         row.wallpapers.image_url,
              thumbnail:   row.wallpapers.thumbnail_url || row.wallpapers.image_url,
              title:       row.wallpapers.title,
              description: row.wallpapers.description || '',
              tags:        row.wallpapers.tags || [],
              downloads:   row.wallpapers.downloads || 0,
              likes:       row.wallpapers.likes || 0,
              views:       row.wallpapers.views || 0,
              uploadedBy:  row.wallpapers.profiles?.full_name || row.wallpapers.profiles?.username || 'Unknown',
              userId:      row.wallpapers.user_id,
              userAvatar:  row.wallpapers.profiles?.avatar_url || 'https://avatar.iran.liara.run/public',
              aspectRatio: row.wallpapers.aspect_ratio || 1.5,
              verified:    row.wallpapers.profiles?.verified || false,
              createdAt:   row.wallpapers.created_at,
              category:    row.wallpapers.category || 'Other',
            })));
          }
        } catch (e) {
          console.error('Liked load error:', e);
        } finally {
          setTabLoading(false);
        }
      })();
    }
    if (activeTab === 'saved' && saved.length === 0) {
      setTabLoading(true);
      (async () => {
        try {
          const { data } = await supabase
            .from('saves')
            .select('wallpaper_id, wallpapers(*, profiles:user_id(username, full_name, avatar_url, verified))')
            .eq('user_id', session.user.id)
            .order('created_at', { ascending: false })
            .limit(24);
          if (data) {
            setSaved(data.map((row: any) => ({
              id:          row.wallpapers.id,
              url:         row.wallpapers.image_url,
              thumbnail:   row.wallpapers.thumbnail_url || row.wallpapers.image_url,
              title:       row.wallpapers.title,
              description: row.wallpapers.description || '',
              tags:        row.wallpapers.tags || [],
              downloads:   row.wallpapers.downloads || 0,
              likes:       row.wallpapers.likes || 0,
              views:       row.wallpapers.views || 0,
              uploadedBy:  row.wallpapers.profiles?.full_name || row.wallpapers.profiles?.username || 'Unknown',
              userId:      row.wallpapers.user_id,
              userAvatar:  row.wallpapers.profiles?.avatar_url || 'https://avatar.iran.liara.run/public',
              aspectRatio: row.wallpapers.aspect_ratio || 1.5,
              verified:    row.wallpapers.profiles?.verified || false,
              createdAt:   row.wallpapers.created_at,
              category:    row.wallpapers.category || 'Other',
            })));
          }
        } catch (e) {
          console.error('Saved load error:', e);
        } finally {
          setTabLoading(false);
        }
      })();
    }
  }, [activeTab, isOwnProfile, session]);

  const handleFollow = async () => {
    if (!session || followLoading) return;
    setFollowLoading(true);
    try {
      if (isFollowing) {
        await unfollowUser(session.user.id, userId);
        setIsFollowing(false);
        setStats(s => ({ ...s, followers: s.followers - 1 }));
      } else {
        await followUser(session.user.id, userId);
        setIsFollowing(true);
        setStats(s => ({ ...s, followers: s.followers + 1 }));
      }
    } catch (e) {
      console.error('Follow error:', e);
    } finally {
      setFollowLoading(false);
    }
  };

  const currentWallpapers =
    activeTab === 'posts' ? posts :
    activeTab === 'liked' ? liked : saved;

  const tabs = [
    { id: 'posts' as TabType, icon: Grid,     label: 'Posts', count: stats.posts },
    { id: 'liked' as TabType, icon: Heart,    label: 'Liked', count: liked.length },
    { id: 'saved' as TabType, icon: Bookmark, label: 'Saved', count: saved.length },
  ];

  return (
    <div className="min-h-screen bg-black text-white">
      <style>{`
        @keyframes shimmer { 0%{background-position:-200% 0} 100%{background-position:200% 0} }
        .shimmer {
          background: linear-gradient(90deg,#ffffff0a 25%,#ffffff14 50%,#ffffff0a 75%);
          background-size: 200% 100%;
          animation: shimmer 1.5s infinite;
        }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>

      {/* Fixed header */}
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 10, background: 'linear-gradient(to bottom,rgba(0,0,0,0.9),transparent)', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <button
          onClick={() => router.back()}
          className="p-2.5 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-xl active:scale-95 transition-all flex-shrink-0"
        >
          <ChevronLeft className="w-5 h-5 text-white" />
        </button>
        <h1 className="text-sm font-semibold text-white truncate">
          {pageLoading ? 'Loading...' : profile?.name}
        </h1>
      </div>

      <div className="max-w-2xl mx-auto p-4 pt-20 pb-10">

        {pageLoading ? (
          /* Skeleton */
          <div className="text-center mb-8">
            <Shimmer className="w-24 h-24 rounded-full mx-auto mb-4" />
            <Shimmer className="h-7 w-48 mx-auto mb-2" />
            <Shimmer className="h-4 w-64 mx-auto mb-6" />
            <div className="flex justify-center gap-8 mb-6">
              {[1, 2, 3].map(i => (
                <div key={i} className="text-center">
                  <Shimmer className="h-6 w-12 mx-auto mb-1" />
                  <Shimmer className="h-3 w-16 mx-auto" />
                </div>
              ))}
            </div>
            <Shimmer className="h-10 w-32 rounded-full mx-auto mb-8" />
            <div className="grid grid-cols-3 gap-3 mt-4">
              {[...Array(9)].map((_, i) => (
                <Shimmer key={i} className="aspect-[9/16] rounded-xl" />
              ))}
            </div>
          </div>
        ) : profile ? (
          <>
            {/* Avatar + name */}
            <div className="text-center mb-8">
              <img
                src={profile.avatar}
                alt={profile.name}
                className="w-24 h-24 rounded-full mx-auto mb-4 border-2 border-white/20 object-cover"
              />
              <div className="flex items-center justify-center gap-2 mb-1">
                <h2 className="text-2xl font-bold">{profile.name}</h2>
                {profile.verified && <VerifiedBadge size="lg" />}
              </div>
              {profile.username && (
                <p className="text-white/40 text-sm mb-2">@{profile.username}</p>
              )}
              <p className="text-white/60 text-sm mb-6 max-w-xs mx-auto">
                {profile.bio || 'No bio yet'}
              </p>

              {/* Stats */}
              <div className="flex justify-center gap-8 mb-6">
                {[
                  { label: 'Posts',     count: stats.posts     },
                  { label: 'Followers', count: stats.followers },
                  { label: 'Following', count: stats.following },
                ].map(({ label, count }) => (
                  <div key={label} className="text-center">
                    <p className="text-xl font-bold">{fmt(count)}</p>
                    <p className="text-xs text-white/50">{label}</p>
                  </div>
                ))}
              </div>

              {/* Follow button — hidden on own profile */}
              {session && !isOwnProfile && (
                <button
                  onClick={handleFollow}
                  disabled={followLoading}
                  className={`px-8 py-2.5 rounded-full font-semibold transition-all active:scale-95 ${
                    followLoading ? 'opacity-50 cursor-not-allowed' :
                    isFollowing
                      ? 'bg-white/10 hover:bg-white/20 border border-white/20 text-white'
                      : 'bg-white text-black hover:bg-gray-200'
                  }`}
                >
                  {isFollowing ? (
                    <span className="flex items-center gap-2">
                      <UserMinus className="w-4 h-4" />Unfollow
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <UserPlus className="w-4 h-4" />Follow
                    </span>
                  )}
                </button>
              )}
            </div>

            {/* Tabs */}
            <div className="border-t border-white/10 pt-6">
              <div className="flex items-center gap-2 mb-4 overflow-x-auto no-scrollbar">
                {tabs
                  .filter(t => t.id === 'posts' || isOwnProfile)
                  .map(({ id, icon: Icon, label, count }) => (
                    <button
                      key={id}
                      onClick={() => setActiveTab(id)}
                      className={`flex items-center gap-2 px-4 py-2 rounded-full font-medium transition-all whitespace-nowrap text-sm ${
                        activeTab === id
                          ? 'bg-white text-black'
                          : 'bg-white/5 hover:bg-white/10 text-white/70'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      {label}
                      <span className="opacity-50 text-xs">({count})</span>
                    </button>
                  ))}
              </div>

              {/* Grid */}
              {tabLoading ? (
                <div className="grid grid-cols-3 gap-3">
                  {[...Array(9)].map((_, i) => (
                    <Shimmer key={i} className="aspect-[9/16] rounded-xl" />
                  ))}
                </div>
              ) : currentWallpapers.length > 0 ? (
                <div className="grid grid-cols-3 gap-3">
                  {currentWallpapers.map(wp => (
                    <WallpaperCard
                      key={wp.id}
                      wp={wp}
                      onClick={() => router.push(`/details/${wp.id}`)}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-16">
                  <div className="w-16 h-16 mx-auto mb-4 bg-white/5 rounded-full flex items-center justify-center">
                    {activeTab === 'posts' && <Grid     className="w-8 h-8 text-white/30" />}
                    {activeTab === 'liked' && <Heart    className="w-8 h-8 text-white/30" />}
                    {activeTab === 'saved' && <Bookmark className="w-8 h-8 text-white/30" />}
                  </div>
                  <p className="text-white/40 text-sm">
                    {activeTab === 'posts' && 'No posts yet'}
                    {activeTab === 'liked' && 'No liked wallpapers'}
                    {activeTab === 'saved' && 'No saved wallpapers'}
                  </p>
                </div>
              )}
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
