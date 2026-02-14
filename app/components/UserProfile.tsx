import { createPortal } from 'react-dom';
import { ChevronLeft, UserPlus, UserMinus, Grid, Heart, Bookmark } from 'lucide-react';
import { useState, useEffect } from 'react';
import { CompactWallpaperCard } from './CompactWallpaperCard';
import { VerifiedBadge } from './VerifiedBadge';
import { fetchProfile, getUserCounts } from '@/lib/stores/wallpaperStore';
import { getLiked, getSaved } from '@/lib/stores/userStore';
import { createClient } from '@/lib/supabase/client';
import type { Wallpaper } from '../types';

type UserProfileProps = {
  userId: string;
  wallpapers: Wallpaper[];
  onClose: () => void;
  onWallpaperClick: (wallpaper: Wallpaper) => void;
};

type TabType = 'posts' | 'liked' | 'saved';

const Skeleton = ({ className = '' }: { className?: string }) => (
  <div className={`animate-pulse bg-white/10 rounded ${className}`}></div>
);

export const UserProfile = ({ userId, wallpapers, onClose, onWallpaperClick }: UserProfileProps) => {
  const [activeTab, setActiveTab] = useState<TabType>('posts');
  const [profile, setProfile] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);
  const [stats, setStats] = useState({ followers: 0, following: 0, posts: 0 });
  const [likedWallpapers, setLikedWallpapers] = useState<Wallpaper[]>([]);
  const [savedWallpapers, setSavedWallpapers] = useState<Wallpaper[]>([]);
  const supabase = createClient();

  useEffect(() => {
    (async () => {
      try {
        setIsLoading(true);
        
        const userProfile = await fetchProfile(userId);
        if (!userProfile) return setIsLoading(false);
        setProfile(userProfile);

        const userStats = await getUserCounts(userId);
        setStats(userStats);

        const { data: { user: currentUser } } = await supabase.auth.getUser();
        if (currentUser) {
          const { data } = await supabase.from('follows').select('id').eq('follower_id', currentUser.id).eq('following_id', userId).maybeSingle();
          setIsFollowing(!!data);

          if (currentUser.id === userId) {
            const [liked, saved] = await Promise.all([getLiked(), getSaved()]);
            setLikedWallpapers(wallpapers.filter(wp => liked.some(l => l.id === wp.id)));
            setSavedWallpapers(wallpapers.filter(wp => saved.some(s => s.id === wp.id)));
          }
        }
      } catch (error) {
        console.error('Error loading profile:', error);
      } finally {
        setIsLoading(false);
      }
    })();
  }, [userId]);

  const toggleFollow = async () => {
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    if (!currentUser) return;

    try {
      if (isFollowing) {
        await supabase.from('follows').delete().eq('follower_id', currentUser.id).eq('following_id', userId);
        setIsFollowing(false);
        setStats(prev => ({ ...prev, followers: prev.followers - 1 }));
      } else {
        await supabase.from('follows').insert({ follower_id: currentUser.id, following_id: userId });
        setIsFollowing(true);
        setStats(prev => ({ ...prev, followers: prev.followers + 1 }));
      }
    } catch (error) {
      console.error('Error toggling follow:', error);
    }
  };

  const userWallpapers = wallpapers.filter(wp => wp.userId === userId);
  const getTabWallpapers = () => {
    switch (activeTab) {
      case 'posts': return userWallpapers;
      case 'liked': return likedWallpapers;
      case 'saved': return savedWallpapers;
      default: return userWallpapers;
    }
  };
  const currentWallpapers = getTabWallpapers();
  const formatCount = (n: number) => n >= 1000 ? `${(n / 1000).toFixed(1)}k` : n;

  return createPortal(
    <div className="fixed inset-0 bg-black z-50 flex flex-col slide-up overflow-y-auto no-scrollbar">
      <button onClick={onClose} className="sticky top-4 left-4 z-10 p-3 bg-black/60 backdrop-blur-md hover:bg-black/80 rounded-full transition-all w-fit">
        <ChevronLeft className="w-6 h-6" />
      </button>

      <div className="max-w-2xl mx-auto w-full p-4 -mt-14">
        {isLoading ? (
          <div className="text-center mb-6 pt-16">
            <Skeleton className="w-24 h-24 rounded-full mx-auto mb-4" />
            <Skeleton className="h-8 w-48 mx-auto mb-2" />
            <Skeleton className="h-4 w-64 mx-auto mb-4" />
            <div className="flex items-center justify-center gap-6 mb-6">
              {[1,2,3].map(i=><div key={i} className="text-center"><Skeleton className="h-7 w-12 mx-auto mb-1"/><Skeleton className="h-4 w-16 mx-auto"/></div>)}
            </div>
            <Skeleton className="h-10 w-32 rounded-full mx-auto mb-6" />
            <div className="border-t border-white/10 pt-6">
              <div className="flex items-center gap-4 mb-4">
                {[1,2,3].map(i=><Skeleton key={i} className="h-10 w-24 rounded-full"/>)}
              </div>
              <div className="grid grid-cols-4 gap-2">
                {[...Array(12)].map((_,i)=><Skeleton key={i} className="aspect-[9/16] rounded-lg"/>)}
              </div>
            </div>
          </div>
        ) : profile ? (
          <>
            <div className="text-center mb-6 pt-16">
              <img src={profile.avatar} alt={profile.name} className="w-24 h-24 rounded-full mx-auto mb-4 border-2 border-white/20"/>

              <div className="flex items-center justify-center gap-2 mb-1">
                <h2 className="text-2xl font-bold">{profile.name}</h2>
                {profile.verified && <VerifiedBadge size="lg" />}
              </div>

              <p className="text-white/60 mb-4">{profile.bio}</p>

              <div className="flex items-center justify-center gap-6 mb-6">
                {[
                  { label: 'Posts', count: stats.posts },
                  { label: 'Followers', count: stats.followers },
                  { label: 'Following', count: stats.following }
                ].map(({label,count})=>(
                  <div key={label} className="text-center">
                    <p className="text-xl font-bold">{formatCount(count)}</p>
                    <p className="text-sm text-white/60">{label}</p>
                  </div>
                ))}
              </div>

              <button onClick={toggleFollow} className={`px-8 py-2.5 rounded-full font-semibold transition-all ${isFollowing?'bg-white/10 hover:bg-white/20 border border-white/20':'bg-white text-black hover:bg-gray-200'}`}>
                {isFollowing?<span className="flex items-center gap-2"><UserMinus className="w-4 h-4"/>Unfollow</span>:<span className="flex items-center gap-2"><UserPlus className="w-4 h-4"/>Follow</span>}
              </button>
            </div>

            <div className="border-t border-white/10 pt-6">
              <div className="flex items-center gap-2 mb-4 overflow-x-auto no-scrollbar">
                {[
                  {id:'posts',icon:Grid,label:'Posts',count:userWallpapers.length},
                  {id:'liked',icon:Heart,label:'Liked',count:likedWallpapers.length},
                  {id:'saved',icon:Bookmark,label:'Saved',count:savedWallpapers.length}
                ].map(({id,icon:Icon,label,count})=>(
                  <button key={id} onClick={()=>setActiveTab(id as TabType)} className={`flex items-center gap-2 px-4 py-2 rounded-full font-medium transition-all whitespace-nowrap ${activeTab===id?'bg-white text-black':'bg-white/5 hover:bg-white/10 text-white/80'}`}>
                    <Icon className="w-4 h-4"/>{label}<span className="text-xs opacity-60">({count})</span>
                  </button>
                ))}
              </div>

              {currentWallpapers.length>0?(
                <div className="grid grid-cols-4 gap-2">
                  {currentWallpapers.map(wp=><CompactWallpaperCard key={wp.id} wp={wp} onClick={()=>onWallpaperClick(wp)}/>)}
                </div>
              ):(
                <div className="text-center py-12">
                  <div className="w-16 h-16 mx-auto mb-4 bg-white/5 rounded-full flex items-center justify-center">
                    {activeTab==='posts'&&<Grid className="w-8 h-8 text-white/40"/>}
                    {activeTab==='liked'&&<Heart className="w-8 h-8 text-white/40"/>}
                    {activeTab==='saved'&&<Bookmark className="w-8 h-8 text-white/40"/>}
                  </div>
                  <p className="text-white/60">
                    {activeTab==='posts'&&'No posts yet'}
                    {activeTab==='liked'&&'No liked wallpapers'}
                    {activeTab==='saved'&&'No saved wallpapers'}
                  </p>
                </div>
              )}
            </div>
          </>
        ) : null}
      </div>
    </div>,
    document.body
  );
};