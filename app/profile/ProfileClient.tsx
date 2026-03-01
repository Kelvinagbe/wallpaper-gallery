'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, Settings, Share2, Heart, Bookmark, Clock, LogOut, Shield } from 'lucide-react';
import { useAuth } from '@/app/components/AuthProvider';
import { SettingsModal } from '@/app/components/profile/SettingsModal';
import { ContentListModal } from '@/app/components/profile/ContentListModal';
import { PrivacyModal } from '@/app/components/profile/PrivacyModal';
import { ViewAllPostsModal } from '@/app/components/profile/ViewAllPostsModal';
import { VerifiedBadge } from '@/app/components/VerifiedBadge';
import { Navigation } from '@/app/components/Navigation';
import { getLiked, getSaved, getRecent, signOut } from '@/lib/stores/userStore';
import type { Wallpaper } from '@/app/types';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Props {
  initialStats:      { followers: number; following: number; posts: number };
  initialWallpapers: Wallpaper[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt = (n: number) =>
  n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M` :
  n >= 1_000     ? `${(n / 1_000).toFixed(1)}k`     : String(n);

const Skeleton = ({ className = '' }: { className?: string }) => (
  <div className={`skeleton-shimmer rounded ${className}`} />
);

// ─── Counts cache ─────────────────────────────────────────────────────────────

const countsCache = { data: null as { liked: number; saved: number; recent: number } | null, ts: 0 };
const CACHE_TTL = 2 * 60 * 1000;

// ─── Component ────────────────────────────────────────────────────────────────

export default function ProfileClient({ initialStats, initialWallpapers }: Props) {
  const router = useRouter();
  const { profile, isLoading: authLoading, refreshProfile } = useAuth();

  const [counts,       setCounts]       = useState(countsCache.data || { liked: 0, saved: 0, recent: 0 });
  const [stats]                         = useState(initialStats);
  const [myWallpapers]                  = useState<Wallpaper[]>(initialWallpapers);
  const [countsLoading, setCountsLoading] = useState(!countsCache.data);
  const [modals, setModals] = useState({
    logout: false, settings: false, settingsClosing: false,
    privacy: false, privacyClosing: false, allPosts: false,
    content: null as 'liked' | 'saved' | 'recent' | null,
  });

  // ─── Load counts ────────────────────────────────────────────────────────────

  useEffect(() => {
    if (authLoading || !profile) return;
    if (countsCache.data && Date.now() - countsCache.ts < CACHE_TTL) {
      setCounts(countsCache.data);
      setCountsLoading(false);
      return;
    }
    (async () => {
      try {
        const [l, s, r] = await Promise.all([getLiked(), getSaved(), getRecent()]);
        const data = { liked: l.total, saved: s.total, recent: r.total };
        countsCache.data = data; countsCache.ts = Date.now();
        setCounts(data);
      } finally { setCountsLoading(false); }
    })();
  }, [profile, authLoading]);

  // ─── Handlers ───────────────────────────────────────────────────────────────

  const refreshCounts = async () => {
    const [l, s, r] = await Promise.all([getLiked(), getSaved(), getRecent()]);
    const data = { liked: l.total, saved: s.total, recent: r.total };
    countsCache.data = data; countsCache.ts = Date.now();
    setCounts(data);
  };

  const closeModal = (key: string) => {
    setModals(m => ({ ...m, [`${key}Closing`]: true }));
    setTimeout(() => setModals(m => ({ ...m, [key]: false, [`${key}Closing`]: false })), 300);
  };

  const handleLogout = async () => {
    await signOut();
    countsCache.data = null; countsCache.ts = 0;
    router.replace('/');
  };

  const handleShare = async () => {
    if (navigator.share) {
      await navigator.share({ title: 'Gallery App', text: 'Check out this amazing wallpaper gallery!', url: window.location.href }).catch(() => {});
    } else {
      navigator.clipboard.writeText(window.location.href).then(() => alert('Link copied!')).catch(() => {});
    }
  };

  const open = (key: string, val?: any) => setModals(m => ({ ...m, [key]: val ?? true }));

  // ─── Menu ────────────────────────────────────────────────────────────────────

  const menuSections = [
    { title: 'My Content', items: [
      { icon: Heart,    label: 'Liked Wallpapers',  count: counts.liked,  color: 'text-red-400',    onClick: () => open('content', 'liked')  },
      { icon: Bookmark, label: 'Saved Collections', count: counts.saved,  color: 'text-blue-400',   onClick: () => open('content', 'saved')  },
      { icon: Clock,    label: 'Recently Viewed',   count: counts.recent, color: 'text-purple-400', onClick: () => open('content', 'recent') },
    ]},
    { title: 'Settings', items: [
      { icon: Settings, label: 'Account Settings',   color: 'text-gray-500', onClick: () => open('settings') },
      { icon: Shield,   label: 'Privacy & Security', color: 'text-gray-500', onClick: () => open('privacy')  },
    ]},
    { title: 'More', items: [
      { icon: Share2, label: 'Share App', color: 'text-gray-500', onClick: handleShare },
    ]},
  ];

  const displayStats = [
    { label: 'Posts',     value: fmt(stats.posts     || myWallpapers.length) },
    { label: 'Followers', value: fmt(stats.followers) },
    { label: 'Following', value: fmt(stats.following) },
  ];

  if (!authLoading && !profile) return null;

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-white text-gray-900 pb-20">

      {/* Header */}
      <div className="sticky top-0 z-10 bg-white/95 backdrop-blur-xl border-b border-gray-100">
        <div className="flex items-center justify-between p-4 max-w-2xl mx-auto">
          <button onClick={() => router.back()} className="p-2 hover:bg-gray-100 rounded-full active:scale-95 transition-all">
            <ChevronLeft className="w-6 h-6 text-gray-900" />
          </button>
          <h1 className="text-lg font-semibold text-gray-900">Profile</h1>
          <button onClick={() => open('settings')} className="p-2 hover:bg-gray-100 rounded-full active:scale-95 transition-all">
            <Settings className="w-6 h-6 text-gray-900" />
          </button>
        </div>
      </div>

      <div className="max-w-2xl mx-auto w-full p-4">
        {profile && <>

          {/* Avatar + info */}
          <div className="text-center mb-8 pt-4">
            <div className="relative inline-block mb-4">
              {authLoading
                ? <Skeleton className="w-28 h-28 rounded-full" />
                : <>
                    <img src={profile.avatar} alt={profile.name} className="w-28 h-28 rounded-full border-4 border-gray-100 object-cover" />
                    <button onClick={() => open('settings')} className="absolute bottom-0 right-0 p-2 bg-gray-900 text-white rounded-full shadow-lg hover:bg-gray-700 active:scale-95 transition-all">
                      <Settings className="w-4 h-4" />
                    </button>
                  </>
              }
            </div>

            <div className="flex items-center justify-center gap-2 mb-1">
              {authLoading
                ? <Skeleton className="h-8 w-40" />
                : <>
                    <h2 className="text-2xl font-bold text-gray-900">{profile.name}</h2>
                    {profile.verified && <VerifiedBadge size="lg" />}
                  </>
              }
            </div>

            <p className="text-gray-400 mb-2">{profile.username || '@user'}</p>
            <p className="text-sm text-gray-500 mb-6 max-w-xs mx-auto">{profile.bio}</p>

            {/* Stats */}
            <div className="flex items-center justify-center gap-8 mb-6">
              {displayStats.map(({ label, value }) => (
                <div key={label} className="text-center">
                  <p className="text-2xl font-bold text-gray-900">{value}</p>
                  <p className="text-sm text-gray-400">{label}</p>
                </div>
              ))}
            </div>

            <div className="flex gap-3 justify-center">
              <button onClick={() => open('settings')} className="flex-1 max-w-[200px] px-6 py-2.5 bg-gray-900 text-white rounded-full font-semibold hover:bg-gray-700 active:scale-95 transition-all">
                Edit Profile
              </button>
              <button onClick={handleShare} className="px-6 py-2.5 bg-gray-100 hover:bg-gray-200 rounded-full font-semibold active:scale-95 transition-all border border-gray-200 text-gray-700">
                Share
              </button>
            </div>
          </div>

          {/* My Recent Posts */}
          {myWallpapers.length > 0 && (
            <div className="mb-8">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">My Recent Posts</h3>
                <button onClick={() => open('allPosts')} className="text-sm text-gray-400 hover:text-gray-900 transition-colors">View All</button>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {myWallpapers.map(wp => (
                  <button key={wp.id} onClick={() => router.push(`/details/${wp.id}`)} className="relative aspect-[3/4] rounded-xl overflow-hidden hover:opacity-80 active:scale-95 transition-all">
                    <img src={wp.thumbnail || wp.url} alt={wp.title} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Menu sections */}
          <div className="space-y-6">
            {menuSections.map(section => (
              <div key={section.title}>
                <h3 className="text-xs font-semibold text-gray-400 mb-3 px-2">{section.title.toUpperCase()}</h3>
                <div className="space-y-1">
                  {section.items.map(item => (
                    <button key={item.label} onClick={item.onClick} className="w-full flex items-center gap-4 p-4 bg-gray-50 hover:bg-gray-100 rounded-xl active:scale-[0.98] transition-all group">
                      <div className="p-2 rounded-lg bg-gray-100 group-hover:bg-gray-200 transition-colors">
                        <item.icon className={`w-5 h-5 ${item.color}`} />
                      </div>
                      <div className="flex-1 text-left">
                        <p className="font-medium text-gray-900">{item.label}</p>
                      </div>
                      {'count' in item && (
                        countsLoading
                          ? <Skeleton className="h-5 w-8" />
                          : (item as any).count > 0
                            ? <span className="text-sm text-gray-400 font-medium">{(item as any).count}</span>
                            : null
                      )}
                      <ChevronLeft className="w-5 h-5 rotate-180 text-gray-300 group-hover:text-gray-500 transition-colors" />
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Logout */}
          <button onClick={() => open('logout')} className="w-full flex items-center justify-center gap-3 p-4 mt-8 mb-4 bg-red-50 hover:bg-red-100 rounded-xl active:scale-[0.98] transition-all border border-red-100">
            <LogOut className="w-5 h-5 text-red-500" />
            <span className="font-semibold text-red-500">Log Out</span>
          </button>

          <div className="text-center text-xs text-gray-300 py-6">
            <p>Gallery App v1.0.0</p>
            <p className="mt-1">Made with ❤️ for wallpaper lovers</p>
          </div>
        </>}
      </div>

      <Navigation />

      {/* Logout confirm */}
      {modals.logout && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[60] flex items-center justify-center p-4" onClick={() => setModals(m => ({ ...m, logout: false }))}>
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full border border-gray-100 shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <LogOut className="w-8 h-8 text-red-500" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Log Out?</h3>
              <p className="text-gray-400 text-sm">Are you sure you want to log out?</p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setModals(m => ({ ...m, logout: false }))} className="flex-1 px-4 py-3 bg-gray-100 hover:bg-gray-200 rounded-xl font-semibold text-gray-700 active:scale-95 transition-all">Cancel</button>
              <button onClick={handleLogout} className="flex-1 px-4 py-3 bg-red-500 hover:bg-red-600 rounded-xl font-semibold text-white active:scale-95 transition-all">Log Out</button>
            </div>
          </div>
        </div>
      )}

      {/* Settings */}
      {(modals.settings || modals.settingsClosing) && (
        <div className={modals.settingsClosing ? 'mc' : ''}>
          <SettingsModal onClose={() => closeModal('settings')} onProfileUpdate={async () => { await refreshProfile(); refreshCounts(); }} />
        </div>
      )}

      {/* Privacy */}
      {(modals.privacy || modals.privacyClosing) && (
        <div className={modals.privacyClosing ? 'mc' : ''}>
          <PrivacyModal onClose={() => closeModal('privacy')} />
        </div>
      )}

      {/* All posts */}
      {modals.allPosts && profile && (
        <ViewAllPostsModal
          onClose={() => setModals(m => ({ ...m, allPosts: false }))}
          wallpapers={myWallpapers}
          onWallpaperClick={wp => { setModals(m => ({ ...m, allPosts: false })); router.push(`/details/${wp.id}`); }}
          userName={profile.name}
        />
      )}

      {/* Content list */}
      {modals.content && (
        <ContentListModal
          type={modals.content}
          onClose={() => { setModals(m => ({ ...m, content: null })); refreshCounts(); }}
          onWallpaperClick={wp => { setModals(m => ({ ...m, content: null })); router.push(`/details/${wp.id}`); }}
        />
      )}
    </div>
  );
}
