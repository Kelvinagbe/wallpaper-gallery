
'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ChevronLeft, Grid, Heart, Bookmark } from 'lucide-react';
import { VerifiedBadge } from '@/app/components/VerifiedBadge';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/app/components/AuthProvider';
import { fetchProfile, fetchUserWallpapers, getUserCounts, checkIsFollowing, followUser, unfollowUser } from '@/lib/stores/wallpaperStore';
import type { Wallpaper } from '@/app/types';

const Shimmer = ({ className = '' }: { className?: string }) => (
  <div className={`shimmer-light rounded-xl ${className}`} />
);

const WallpaperCard = ({ wp, onClick }: { wp: Wallpaper; onClick: () => void }) => (
  <button onClick={onClick} className="relative aspect-[9/16] rounded-2xl overflow-hidden active:scale-95 transition-transform bg-gray-100">
    <img src={wp.thumbnail || wp.url} alt={wp.title} className="w-full h-full object-cover" loading="lazy" />
    <div className="absolute inset-0" style={{ background: 'linear-gradient(to top,rgba(0,0,0,0.55) 0%,transparent 50%)' }} />
    <p className="absolute bottom-2 left-2 right-2 text-[11px] text-white font-medium line-clamp-1 drop-shadow">{wp.title}</p>
  </button>
);

type TabType = 'posts' | 'liked' | 'saved';

export default function UserProfilePage() {
  const router = useRouter();
  const params = useParams();
  const userId = params?.id as string;
  const { session } = useAuth();
  const supabase = createClient();

  const [profile,       setProfile]       = useState<any>(null);
  const [stats,         setStats]         = useState({ followers: 0, following: 0, posts: 0 });
  const [isFollowing,   setIsFollowing]   = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [pageLoading,   setPageLoading]   = useState(true);
  const [activeTab,     setActiveTab]     = useState<TabType>('posts');
  const [posts,         setPosts]         = useState<Wallpaper[]>([]);
  const [liked,         setLiked]         = useState<Wallpaper[]>([]);
  const [saved,         setSaved]         = useState<Wallpaper[]>([]);
  const [tabLoading,    setTabLoading]    = useState(false);

  const isOwnProfile = session?.user.id === userId;
  const fmt = (n: number) => n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M` : n >= 1_000 ? `${(n / 1_000).toFixed(1)}k` : String(n);

  const mapWallpaper = (row: any): Wallpaper => ({
    id: row.wallpapers.id, url: row.wallpapers.image_url,
    thumbnail: row.wallpapers.thumbnail_url || row.wallpapers.image_url,
    title: row.wallpapers.title, description: row.wallpapers.description || '',
    tags: row.wallpapers.tags || [], downloads: row.wallpapers.downloads || 0,
    likes: row.wallpapers.likes || 0, views: row.wallpapers.views || 0,
    uploadedBy: row.wallpapers.profiles?.full_name || row.wallpapers.profiles?.username || 'Unknown',
    userId: row.wallpapers.user_id,
    userAvatar: row.wallpapers.profiles?.avatar_url || 'https://avatar.iran.liara.run/public',
    aspectRatio: row.wallpapers.aspect_ratio || 1.5,
    verified: row.wallpapers.profiles?.verified || false,
    createdAt: row.wallpapers.created_at, category: row.wallpapers.category || 'Other',
  });

  useEffect(() => {
    if (!userId) return;
    (async () => {
      try {
        const [userProfile, userStats] = await Promise.all([fetchProfile(userId), getUserCounts(userId)]);
        if (!userProfile) { router.replace('/'); return; }
        setProfile(userProfile); setStats(userStats);
        if (session) setIsFollowing(await checkIsFollowing(session.user.id, userId));
      } catch { router.replace('/'); }
      finally { setPageLoading(false); }
    })();
  }, [userId, session]);

  useEffect(() => {
    if (!userId) return;
    fetchUserWallpapers(userId, 0, 24).then(({ wallpapers }) => setPosts(wallpapers)).catch(console.error);
  }, [userId]);

  useEffect(() => {
    if (!isOwnProfile || !session) return;
    const table = activeTab === 'liked' ? 'likes' : activeTab === 'saved' ? 'saves' : null;
    const current = activeTab === 'liked' ? liked : saved;
    if (!table || current.length > 0) return;
    setTabLoading(true);
    supabase.from(table)
      .select('wallpaper_id, wallpapers(*, profiles:user_id(username, full_name, avatar_url, verified))')
      .eq('user_id', session.user.id).order('created_at', { ascending: false }).limit(24)
      .then(({ data }: { data: any[] | null }) => {
        if (!data) return;
        const mapped = data.map(mapWallpaper);
        activeTab === 'liked' ? setLiked(mapped) : setSaved(mapped);
      }).catch(console.error).finally(() => setTabLoading(false));
  }, [activeTab, isOwnProfile, session]);

  const handleFollow = async () => {
    if (!session || followLoading) return;
    setFollowLoading(true);
    try {
      if (isFollowing) { await unfollowUser(session.user.id, userId); setIsFollowing(false); setStats(s => ({ ...s, followers: s.followers - 1 })); }
      else { await followUser(session.user.id, userId); setIsFollowing(true); setStats(s => ({ ...s, followers: s.followers + 1 })); }
    } catch (e) { console.error(e); }
    finally { setFollowLoading(false); }
  };

  const currentWallpapers = activeTab === 'posts' ? posts : activeTab === 'liked' ? liked : saved;
  const tabs = [
    { id: 'posts' as TabType, icon: Grid,     label: 'Posts', count: stats.posts  },
    { id: 'liked' as TabType, icon: Heart,    label: 'Liked', count: liked.length },
    { id: 'saved' as TabType, icon: Bookmark, label: 'Saved', count: saved.length },
  ];

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <style>{`
        @keyframes shimmerLight{0%{background-position:-200% 0}100%{background-position:200% 0}}
        .shimmer-light{background:linear-gradient(90deg,#f0f0f0 25%,#e4e4e4 50%,#f0f0f0 75%);background-size:200% 100%;animation:shimmerLight 1.5s infinite;}
        .no-scrollbar::-webkit-scrollbar{display:none}.no-scrollbar{-ms-overflow-style:none;scrollbar-width:none}
      `}</style>

      {/* Header */}
      <div className="fixed top-0 left-0 right-0 z-20 flex items-center gap-3 px-4 pt-5 pb-3">
        <button onClick={() => router.back()}
          style={{ background: 'rgba(0,0,0,0.18)', backdropFilter: 'blur(8px)' }}
          className="w-12 h-12 rounded-full flex items-center justify-center active:scale-90 transition-transform flex-shrink-0">
          <ChevronLeft className="w-6 h-6 text-white" strokeWidth={2.5} />
        </button>
        {!pageLoading && <h1 className="text-sm font-semibold text-gray-900 truncate">{profile?.name}</h1>}
      </div>

      <div className="max-w-lg mx-auto pb-12">
        {pageLoading ? (
          <div className="pt-24 px-5">
            <div className="flex flex-col items-center mb-8">
              <Shimmer className="w-24 h-24 rounded-full mb-4" />
              <Shimmer className="h-6 w-40 mb-2" />
              <Shimmer className="h-4 w-28 mb-4" />
              <Shimmer className="h-4 w-56 mb-6" />
              <div className="flex gap-10 mb-6">
                {[1,2,3].map(i => <div key={i} className="text-center"><Shimmer className="h-6 w-12 mb-1" /><Shimmer className="h-3 w-14" /></div>)}
              </div>
              <Shimmer className="h-11 w-32 rounded-full" />
            </div>
            <div className="grid grid-cols-3 gap-2">
              {[...Array(9)].map((_, i) => <Shimmer key={i} className="aspect-[9/16]" />)}
            </div>
          </div>
        ) : profile ? (
          <>
            {/* Cover + Avatar */}
            <div className="relative">
              <div className="h-44 w-full" style={{ background: 'linear-gradient(135deg,#e8eaf0 0%,#ede8f0 50%,#e8f0ea 100%)' }} />
              <div className="absolute left-1/2 -translate-x-1/2" style={{ bottom: '-44px' }}>
                <div className="relative">
                  <img src={profile.avatar} alt={profile.name} className="w-24 h-24 rounded-full object-cover border-4 border-white shadow-lg" />
                  {profile.verified && <div className="absolute bottom-0 right-0"><VerifiedBadge size="md" /></div>}
                </div>
              </div>
            </div>

            {/* Info */}
            <div className="text-center pt-14 pb-6 px-5">
              <h2 className="text-xl font-bold text-gray-900 mb-0.5">{profile.name}</h2>
              {profile.username && <p className="text-sm text-gray-400 mb-3">@{profile.username}</p>}
              {profile.bio && <p className="text-sm text-gray-500 leading-relaxed mb-5 max-w-xs mx-auto">{profile.bio}</p>}

              {/* Stats */}
              <div className="flex justify-center gap-0 mb-6 bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden mx-4">
                {[
                  { label: 'Posts',     count: stats.posts     },
                  { label: 'Followers', count: stats.followers },
                  { label: 'Following', count: stats.following },
                ].map(({ label, count }, i, arr) => (
                  <div key={label} className={`flex-1 py-4 text-center ${i < arr.length - 1 ? 'border-r border-gray-100' : ''}`}>
                    <p className="text-lg font-bold text-gray-900">{fmt(count)}</p>
                    <p className="text-[11px] text-gray-400 mt-0.5">{label}</p>
                  </div>
                ))}
              </div>

              {/* Follow */}
              {session && !isOwnProfile && (
                <button onClick={handleFollow} disabled={followLoading}
                  className="px-10 py-3 rounded-full font-semibold text-sm transition-all active:scale-95"
                  style={isFollowing ? { border: '1.5px solid #e5e7eb', color: '#6b7280' } : { background: '#111', color: '#fff' }}>
                  {isFollowing ? 'Following' : 'Follow'}
                </button>
              )}
            </div>

            {/* Tabs */}
            <div className="px-4">
              <div className="flex items-center gap-2 mb-4 overflow-x-auto no-scrollbar">
                {tabs.filter(t => t.id === 'posts' || isOwnProfile).map(({ id, icon: Icon, label, count }) => (
                  <button key={id} onClick={() => setActiveTab(id)}
                    className="flex items-center gap-1.5 px-4 py-2.5 rounded-full text-sm font-medium transition-all whitespace-nowrap"
                    style={activeTab === id ? { background: '#111', color: '#fff' } : { background: '#fff', color: '#6b7280', border: '1px solid #e5e7eb' }}>
                    <Icon className="w-3.5 h-3.5" />
                    {label}
                    <span className="opacity-50 text-xs ml-0.5">{count}</span>
                  </button>
                ))}
              </div>

              {tabLoading ? (
                <div className="grid grid-cols-3 gap-2">
                  {[...Array(9)].map((_, i) => <Shimmer key={i} className="aspect-[9/16]" />)}
                </div>
              ) : currentWallpapers.length > 0 ? (
                <div className="grid grid-cols-3 gap-2">
                  {currentWallpapers.map(wp => (
                    <WallpaperCard key={wp.id} wp={wp} onClick={() => router.push(`/details/${wp.id}`)} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-20">
                  <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                    {activeTab === 'posts' && <Grid     className="w-7 h-7 text-gray-300" />}
                    {activeTab === 'liked' && <Heart    className="w-7 h-7 text-gray-300" />}
                    {activeTab === 'saved' && <Bookmark className="w-7 h-7 text-gray-300" />}
                  </div>
                  <p className="text-gray-400 text-sm">
                    {activeTab === 'posts' ? 'No posts yet' : activeTab === 'liked' ? 'No liked wallpapers' : 'No saved wallpapers'}
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
