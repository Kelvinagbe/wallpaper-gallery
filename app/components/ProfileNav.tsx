import { ChevronLeft, Settings, Share2, Heart, Bookmark, Clock, LogOut, Shield } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useAuth } from '@/app/components/AuthProvider';
import { SettingsModal } from './profile/SettingsModal';
import { ContentListModal } from './profile/ContentListModal';
import { PrivacyModal } from './profile/PrivacyModal';
import { ViewAllPostsModal } from './profile/ViewAllPostsModal';
import { VerifiedBadge } from './VerifiedBadge';
import { getLiked, getSaved, getRecent, signOut, type UserProfile } from '@/lib/stores/userStore';
import { getUserCounts } from '@/lib/stores/wallpaperStore';
import type { Wallpaper } from '../types';

type ProfileNavProps = {
  onClose: () => void;
  wallpapers: Wallpaper[];
  onWallpaperClick: (wallpaper: Wallpaper) => void;
};

const Skeleton = ({ className = '' }: { className?: string }) => (
  <div className={`animate-pulse bg-white/10 rounded ${className}`}></div>
);

// Cache for counts and stats
const cache = {
  counts: null as { liked: number; saved: number; recent: number } | null,
  stats: null as { followers: number; following: number; posts: number } | null,
  timestamp: 0,
};
const CACHE_DURATION = 2 * 60 * 1000; // 2 minutes

export const ProfileNav = ({ onClose, wallpapers, onWallpaperClick }: ProfileNavProps) => {
  const { profile, isLoading: authLoading, refreshProfile } = useAuth();
  const [modals, setModals] = useState({ logout: false, settings: false, settingsClosing: false, privacy: false, privacyClosing: false, allPosts: false, content: null as 'liked' | 'saved' | 'recent' | null });
  const [isClosing, setIsClosing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [counts, setCounts] = useState(cache.counts || { liked: 0, saved: 0, recent: 0 });
  const [stats, setStats] = useState(cache.stats || { followers: 0, following: 0, posts: 0 });

  useEffect(() => {
    if (authLoading) return;

    (async () => {
      if (!profile) {
        setLoading(false);
        return;
      }

      const now = Date.now();
      const isCacheValid = cache.timestamp && (now - cache.timestamp) < CACHE_DURATION;

      if (isCacheValid && cache.counts && cache.stats) {
        setCounts(cache.counts);
        setStats(cache.stats);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);

        // Fetch fresh data - note the destructuring
        const [userStats, likedData, savedData, recentData] = await Promise.all([
          getUserCounts(profile.id),
          getLiked(),
          getSaved(),
          getRecent(),
        ]);

        const newCounts = { 
          liked: likedData.total, 
          saved: savedData.total, 
          recent: recentData.total 
        };
        const newStats = userStats;

        // Update cache
        cache.counts = newCounts;
        cache.stats = newStats;
        cache.timestamp = now;

        setCounts(newCounts);
        setStats(newStats);
      } catch (error) {
        console.error('Error loading user data:', error);
      } finally {
        setLoading(false);
      }
    })();
  }, [profile, authLoading]);

  const refreshCounts = async () => {
    if (!profile) return;

    const [likedData, savedData, recentData] = await Promise.all([
      getLiked(), 
      getSaved(), 
      getRecent()
    ]);
    
    const newCounts = { 
      liked: likedData.total, 
      saved: savedData.total, 
      recent: recentData.total 
    };

    cache.counts = newCounts;
    cache.timestamp = Date.now();
    setCounts(newCounts);
  };

  const handleClose = () => { setIsClosing(true); setTimeout(onClose, 300); };
  const closeModal = (key: string) => { setModals(m => ({ ...m, [`${key}Closing`]: true })); setTimeout(() => setModals(m => ({ ...m, [key]: false, [`${key}Closing`]: false })), 300); };
  const handleLogout = async () => { 
    await signOut();
    cache.counts = null; 
    cache.stats = null; 
    cache.timestamp = 0; 
    setModals(m => ({ ...m, logout: false })); 
    window.location.href = '/';
  };
  const formatCount = (n: number) => n >= 1000000 ? `${(n / 1000000).toFixed(1)}M` : n >= 1000 ? `${(n / 1000).toFixed(1)}k` : n;

  const menuSections = [
    { title: 'My Content', items: [
      { icon: Heart, label: 'Liked Wallpapers', count: counts.liked, color: 'text-red-400', onClick: () => setModals(m => ({ ...m, content: 'liked' })) },
      { icon: Bookmark, label: 'Saved Collections', count: counts.saved, color: 'text-blue-400', onClick: () => setModals(m => ({ ...m, content: 'saved' })) },
      { icon: Clock, label: 'Recently Viewed', count: counts.recent, color: 'text-purple-400', onClick: () => setModals(m => ({ ...m, content: 'recent' })) },
    ]},
    { title: 'Settings', items: [
      { icon: Settings, label: 'Account Settings', color: 'text-white/80', onClick: () => setModals(m => ({ ...m, settings: true })) },
      { icon: Shield, label: 'Privacy & Security', color: 'text-white/80', onClick: () => setModals(m => ({ ...m, privacy: true })) },
    ]},
    { title: 'More', items: [
      { icon: Share2, label: 'Share App', color: 'text-white/80', onClick: async () => {
        if (navigator.share) await navigator.share({ title: 'Gallery App', text: 'Check out this amazing wallpaper gallery app!', url: window.location.href }).catch(() => {});
        else navigator.clipboard.writeText(window.location.href).then(() => alert('Link copied!')).catch(() => {});
      }},
    ]},
  ];

  const myWallpapers = profile ? wallpapers.filter(wp => wp.userId === profile.id).slice(0, 6) : [];
  const displayStats = [
    { label: 'Posts', value: formatCount(stats.posts || myWallpapers.length) },
    { label: 'Followers', value: formatCount(stats.followers) },
    { label: 'Following', value: formatCount(stats.following) },
  ];

  if (!authLoading && !profile) return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col items-center justify-center p-4">
      <h2 className="text-2xl font-bold mb-4">Please Log In</h2>
      <p className="text-white/60 mb-6">You need to be logged in to view your profile</p>
      <button onClick={handleClose} className="px-6 py-3 bg-white text-black rounded-full font-semibold hover:bg-gray-200 active:scale-95 transition-all">Go Back</button>
    </div>
  );

  return (
    <>
      <style>{`@keyframes sr{from{transform:translateX(-100%)}to{transform:translateX(0)}}@keyframes sl{from{transform:translateX(0)}to{transform:translateX(-100%)}}@keyframes srm{from{transform:translateX(100%)}to{transform:translateX(0)}}@keyframes slm{from{transform:translateX(0)}to{transform:translateX(100%)}}@keyframes fi{from{opacity:0}to{opacity:1}}@keyframes fo{from{opacity:1}to{opacity:0}}.sr{animation:sr .3s ease-out}.sl{animation:sl .3s ease-out}.fi{animation:fi .2s ease-out}.fo{animation:fo .2s ease-out}.mc .srm{animation:slm .3s ease-out!important}.mc .fim{animation:fo .2s ease-out!important}.srm{animation:srm .3s ease-out}.fim{animation:fi .2s ease-out}`}</style>

      <div className={`fixed inset-0 bg-black z-50 flex flex-col overflow-y-auto no-scrollbar ${isClosing?'sl':'sr'}`}>
        <div className="sticky top-0 z-10 bg-black/95 backdrop-blur-xl border-b border-white/10">
          <div className="flex items-center justify-between p-4">
            <button onClick={handleClose} className="p-2 hover:bg-white/10 rounded-full active:scale-95 transition-all"><ChevronLeft className="w-6 h-6"/></button>
            <h1 className="text-lg font-semibold">Profile</h1>
            <button onClick={()=>setModals(m=>({...m,settings:true}))} className="p-2 hover:bg-white/10 rounded-full active:scale-95 transition-all"><Settings className="w-6 h-6"/></button>
          </div>
        </div>

        <div className="max-w-2xl mx-auto w-full p-4">
          {(authLoading || loading) ? (
            <>
              <div className="text-center mb-8 pt-4">
                <div className="relative inline-block mb-4">
                  <Skeleton className="w-28 h-28 rounded-full" />
                  <div className="absolute bottom-0 right-0 w-9 h-9 bg-white/10 rounded-full"></div>
                </div>
                <Skeleton className="h-8 w-40 mx-auto mb-2" />
                <Skeleton className="h-4 w-24 mx-auto mb-2" />
                <Skeleton className="h-3 w-48 mx-auto mb-6" />
                <div className="flex items-center justify-center gap-8 mb-6">
                  {[1,2,3].map(i=><div key={i} className="text-center"><Skeleton className="h-7 w-12 mx-auto mb-1"/><Skeleton className="h-3 w-16"/></div>)}
                </div>
                <div className="flex gap-3 justify-center">
                  <Skeleton className="h-11 w-[200px] rounded-full" />
                  <Skeleton className="h-11 w-24 rounded-full" />
                </div>
              </div>
              <div className="mb-8">
                <div className="flex items-center justify-between mb-4">
                  <Skeleton className="h-5 w-32" />
                  <Skeleton className="h-4 w-16" />
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {[1,2,3,4,5,6].map(i=><Skeleton key={i} className="aspect-[3/4] rounded-lg"/>)}
                </div>
              </div>
              <div className="space-y-6">
                {[1,2,3].map(s=>(
                  <div key={s}>
                    <Skeleton className="h-3 w-24 mb-3" />
                    <div className="space-y-1">
                      {[1,2].map(i=><Skeleton key={i} className="h-16 w-full rounded-xl"/>)}
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : profile ? (
            <>
              <div className="text-center mb-8 pt-4">
                <div className="relative inline-block mb-4">
                  <img src={profile.avatar} alt={profile.name} className="w-28 h-28 rounded-full border-4 border-white/20 object-cover"/>
                  <button onClick={()=>setModals(m=>({...m,settings:true}))} className="absolute bottom-0 right-0 p-2 bg-white text-black rounded-full shadow-lg hover:bg-gray-200 active:scale-95 transition-all"><Settings className="w-4 h-4"/></button>
                </div>
                <div className="flex items-center justify-center gap-2 mb-1">
                  <h2 className="text-2xl font-bold">{profile.name}</h2>
                  {profile.verified && <VerifiedBadge size="lg" />}
                </div>
                <p className="text-white/60 mb-2">{profile.username || '@user'}</p>
                <p className="text-sm text-white/70 mb-6 max-w-xs mx-auto">{profile.bio}</p>
                <div className="flex items-center justify-center gap-8 mb-6">
                  {displayStats.map(({label,value})=><div key={label} className="text-center"><p className="text-2xl font-bold">{value}</p><p className="text-sm text-white/60">{label}</p></div>)}
                </div>
                <div className="flex gap-3 justify-center">
                  <button onClick={()=>setModals(m=>({...m,settings:true}))} className="flex-1 max-w-[200px] px-6 py-2.5 bg-white text-black rounded-full font-semibold hover:bg-gray-200 active:scale-95 transition-all">Edit Profile</button>
                  <button onClick={menuSections[2].items[0].onClick} className="px-6 py-2.5 bg-white/10 hover:bg-white/20 rounded-full font-semibold active:scale-95 transition-all border border-white/20">Share</button>
                </div>
              </div>
              {myWallpapers.length>0&&(
                <div className="mb-8">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold">My Recent Posts</h3>
                    <button onClick={()=>setModals(m=>({...m,allPosts:true}))} className="text-sm text-white/60 hover:text-white transition-colors">View All</button>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {myWallpapers.map(wp=><div key={wp.id} onClick={()=>onWallpaperClick(wp)} className="relative aspect-[3/4] rounded-lg overflow-hidden cursor-pointer hover:opacity-80 active:scale-95 transition-all"><img src={wp.thumbnail} alt={wp.title} className="w-full h-full object-cover"/></div>)}
                  </div>
                </div>
              )}
              <div className="space-y-6">
                {menuSections.map(section=>(
                  <div key={section.title}>
                    <h3 className="text-sm font-semibold text-white/60 mb-3 px-2">{section.title.toUpperCase()}</h3>
                    <div className="space-y-1">
                      {section.items.map(item=>(
                        <button key={item.label} onClick={item.onClick} className="w-full flex items-center gap-4 p-4 bg-white/5 hover:bg-white/10 rounded-xl active:scale-[0.98] transition-all group">
                          <div className="p-2 rounded-lg bg-white/5 group-hover:bg-white/10 transition-colors"><item.icon className={`w-5 h-5 ${item.color}`}/></div>
                          <div className="flex-1 text-left"><p className="font-medium text-white">{item.label}</p></div>
                          {'count' in item&&item.count>0&&<span className="text-sm text-white/60 font-medium">{item.count}</span>}
                          <ChevronLeft className="w-5 h-5 rotate-180 text-white/40 group-hover:text-white/60 transition-colors"/>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              <button onClick={()=>setModals(m=>({...m,logout:true}))} className="w-full flex items-center justify-center gap-3 p-4 mt-8 mb-4 bg-red-500/10 hover:bg-red-500/20 rounded-xl active:scale-[0.98] transition-all border border-red-500/20">
                <LogOut className="w-5 h-5 text-red-400"/>
                <span className="font-semibold text-red-400">Log Out</span>
              </button>
              <div className="text-center text-xs text-white/40 py-6">
                <p>Gallery App v1.0.0</p>
                <p className="mt-1">Made with ❤️ for wallpaper lovers</p>
              </div>
            </>
          ) : null}
        </div>
      </div>

      {modals.logout&&(<div className={`fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4 ${isClosing?'fo':'fi'}`} onClick={()=>setModals(m=>({...m,logout:false}))}><div className="bg-zinc-900 rounded-2xl p-6 max-w-sm w-full border border-white/10" onClick={e=>e.stopPropagation()}><div className="text-center mb-6"><div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4"><LogOut className="w-8 h-8 text-red-400"/></div><h3 className="text-xl font-bold mb-2">Log Out?</h3><p className="text-white/60 text-sm">Are you sure you want to log out of your account?</p></div><div className="flex gap-3"><button onClick={()=>setModals(m=>({...m,logout:false}))} className="flex-1 px-4 py-3 bg-white/5 hover:bg-white/10 rounded-xl font-semibold active:scale-95 transition-all">Cancel</button><button onClick={handleLogout} className="flex-1 px-4 py-3 bg-red-500 hover:bg-red-600 rounded-xl font-semibold active:scale-95 transition-all">Log Out</button></div></div></div>)}
      {(modals.settings||modals.settingsClosing)&&<div className={modals.settingsClosing?'mc':''}><SettingsModal onClose={()=>closeModal('settings')} onProfileUpdate={async()=>{await refreshProfile();refreshCounts();}}/></div>}
      {(modals.privacy||modals.privacyClosing)&&<div className={modals.privacyClosing?'mc':''}><PrivacyModal onClose={()=>closeModal('privacy')}/></div>}
      {modals.allPosts&&profile&&<ViewAllPostsModal onClose={()=>setModals(m=>({...m,allPosts:false}))} wallpapers={wallpapers.filter(wp=>wp.userId===profile.id)} onWallpaperClick={wp=>{setModals(m=>({...m,allPosts:false}));onWallpaperClick(wp);}} userName={profile.name}/>}
      {modals.content&&<ContentListModal type={modals.content} onClose={()=>{setModals(m=>({...m,content:null}));refreshCounts();}} onWallpaperClick={wp=>{setModals(m=>({...m,content:null}));onWallpaperClick(wp);}}/>}
    </>
  );
};