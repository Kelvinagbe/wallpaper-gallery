'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Settings, Share2, LogOut, Shield, Grid, ChevronRight, ChevronLeft } from 'lucide-react';
import { useAuth } from '@/app/components/AuthProvider';
import { SettingsModal } from '@/app/components/profile/SettingsModal';

import { PrivacyModal } from '@/app/components/profile/PrivacyModal';
import { ViewAllPostsModal } from '@/app/components/profile/ViewAllPostsModal';
import { VerifiedBadge } from '@/app/components/VerifiedBadge';
import { Navigation } from '@/app/components/Navigation';
import { signOut } from '@/lib/stores/userStore';
import type { Wallpaper } from '@/app/types';

interface Props {
  initialStats:      { followers: number; following: number; posts: number };
  initialWallpapers: Wallpaper[];
}

const fmt = (n: number) => n >= 1_000_000 ? `${(n/1_000_000).toFixed(1)}M` : n >= 1_000 ? `${(n/1_000).toFixed(1)}k` : String(n);



const Shimmer = ({ w, h, r = 8 }: { w: string | number; h: string | number; r?: number }) => (
  <div style={{ width: w, height: h, borderRadius: r, flexShrink: 0,
    background: 'linear-gradient(90deg,#ececec 25%,#e0e0e0 50%,#ececec 75%)',
    backgroundSize: '200% 100%', animation: 'shimmer 1.4s ease infinite' }} />
);

export default function ProfileClient({ initialStats, initialWallpapers }: Props) {
  const router = useRouter();
  const { profile, isLoading: authLoading, refreshProfile } = useAuth();


  const [stats]                           = useState(initialStats);
  const [myWallpapers]                    = useState<Wallpaper[]>(initialWallpapers);

  const [modals, setModals] = useState({
    logout: false, settings: false, settingsClosing: false,
    privacy: false, privacyClosing: false, allPosts: false,
    content: null as 'liked' | 'saved' | 'recent' | null, // kept for type compat
  });



  const refreshCounts = async () => {};

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
    if (navigator.share) await navigator.share({ title: 'Gallery App', url: window.location.href }).catch(() => {});
    else navigator.clipboard.writeText(window.location.href).catch(() => {});
  };

  const open = (key: string, val?: any) => setModals(m => ({ ...m, [key]: val ?? true }));

  if (!authLoading && !profile) return null;

  const displayStats = [
    { label: 'Posts',     value: fmt(stats.posts || myWallpapers.length) },
    { label: 'Followers', value: fmt(stats.followers) },
    { label: 'Following', value: fmt(stats.following) },
  ];

  const menuSections = [
    { title: 'Account', items: [
      { icon: Settings, label: 'Account Settings',   onClick: () => open('settings') },
      { icon: Shield,   label: 'Privacy & Security', onClick: () => open('privacy')  },
      { icon: Share2,   label: 'Share App',          onClick: handleShare             },
    ]},
  ];

  return (
    <div style={{ minHeight: '100dvh', background: '#fff', fontFamily: 'system-ui, sans-serif', color: '#0a0a0a', paddingBottom: 80 }}>
      <style>{`
        @keyframes shimmer { 0%,100%{background-position:200% 0} 50%{background-position:-200% 0} }
        @keyframes fadeUp  { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
        .fade-up { animation: fadeUp .35s cubic-bezier(.16,1,.3,1) forwards; }
        .wp-card:active { transform: scale(0.97); }
        .wp-card { transition: transform .12s; }
        .menu-item:active { transform: scale(0.98); background: rgba(0,0,0,0.04) !important; }
        .menu-item { transition: all .12s; }
      `}</style>

      {/* ── Header ── */}
      <div style={{ position: 'sticky', top: 0, zIndex: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button onClick={() => router.back()} style={{ width: 34, height: 34, borderRadius: '50%', background: 'rgba(0,0,0,0.05)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            <ChevronLeft size={18} color="#0a0a0a" strokeWidth={2.5} />
          </button>
          <p style={{ fontSize: 15, fontWeight: 700 }}>Profile</p>
        </div>
        <button onClick={() => open('settings')} style={{ width: 34, height: 34, borderRadius: '50%', background: 'rgba(0,0,0,0.05)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
          <Settings size={16} color="#0a0a0a" />
        </button>
      </div>

      <div style={{ maxWidth: 600, margin: '0 auto' }}>

        {/* ── Avatar + info ── */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '28px 20px 20px' }}>
          {authLoading ? (
            <>
              <Shimmer w={110} h={110} r={55} />
              <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                <Shimmer w={160} h={22} />
                <Shimmer w={100} h={14} />
                <Shimmer w={220} h={13} />
              </div>
            </>
          ) : profile && (
            <div className="fade-up" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
              {/* Avatar with settings badge */}
              <div style={{ position: 'relative', marginBottom: 14 }}>
                <img src={profile.avatar} alt={profile.name} style={{ width: 110, height: 110, borderRadius: '50%', objectFit: 'cover', border: '3px solid #fff', boxShadow: '0 2px 20px rgba(0,0,0,0.12)', display: 'block' }} />
                <button onClick={() => open('settings')} style={{ position: 'absolute', bottom: 2, right: 2, width: 28, height: 28, borderRadius: '50%', background: '#0a0a0a', border: '2px solid #fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                  <Settings size={13} color="#fff" />
                </button>
              </div>

              {/* Name + verified */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                <h2 style={{ fontSize: 22, fontWeight: 700, margin: 0, letterSpacing: '-0.02em' }}>{profile.name}</h2>
                {profile.verified && <VerifiedBadge size="md" />}
              </div>
              {profile.username && <p style={{ fontSize: 13, color: 'rgba(0,0,0,0.38)', margin: '0 0 8px' }}>@{profile.username}</p>}
              {profile.bio      && <p style={{ fontSize: 14, color: 'rgba(0,0,0,0.5)', lineHeight: 1.55, maxWidth: 280, margin: '0 0 20px' }}>{profile.bio}</p>}

              {/* Stats */}
              <div style={{ display: 'flex', width: '100%', maxWidth: 360, borderRadius: 18, border: '1px solid rgba(0,0,0,0.07)', overflow: 'hidden', marginBottom: 18, background: '#fafafa' }}>
                {displayStats.map(({ label, value }, i, arr) => (
                  <div key={label} style={{ flex: 1, padding: '14px 0', textAlign: 'center', borderRight: i < arr.length - 1 ? '1px solid rgba(0,0,0,0.07)' : 'none' }}>
                    <p style={{ fontSize: 19, fontWeight: 700, margin: 0, letterSpacing: '-0.02em' }}>{value}</p>
                    <p style={{ fontSize: 11, color: 'rgba(0,0,0,0.38)', margin: '2px 0 0', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</p>
                  </div>
                ))}
              </div>

              {/* Edit + Share */}
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={() => open('settings')} style={{ padding: '10px 28px', borderRadius: 26, border: 'none', background: '#0a0a0a', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                  Edit Profile
                </button>
                <button onClick={handleShare} style={{ padding: '10px 20px', borderRadius: 26, border: '1px solid rgba(0,0,0,0.1)', background: 'transparent', color: 'rgba(0,0,0,0.6)', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Share2 size={14} />Share
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ── Posts divider ── */}
        {myWallpapers.length > 0 && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 20px', borderTop: '1px solid rgba(0,0,0,0.07)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                <Grid size={13} color="rgba(0,0,0,0.35)" />
                <p style={{ fontSize: 12, fontWeight: 600, color: 'rgba(0,0,0,0.38)', textTransform: 'uppercase', letterSpacing: '0.06em', margin: 0 }}>{fmt(stats.posts || myWallpapers.length)} Posts</p>
              </div>
              <button onClick={() => open('allPosts')} style={{ fontSize: 12, fontWeight: 600, color: 'rgba(0,0,0,0.4)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>View all</button>
            </div>

            {/* ── Grid — no gap, no radius ── */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 1 }}>
              {myWallpapers.slice(0, 9).map(wp => (
                <button key={wp.id} className="wp-card" onClick={() => router.push(`/details/${wp.id}`)}
                  style={{ position: 'relative', aspectRatio: '3/4', border: 'none', padding: 0, cursor: 'pointer', background: '#e8e8e8', display: 'block', overflow: 'hidden' }}>
                  <img src={wp.thumbnail || wp.url} alt={wp.title} loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                </button>
              ))}
            </div>
          </>
        )}

        {/* ── Menu sections ── */}
        <div style={{ padding: '24px 16px 8px', display: 'flex', flexDirection: 'column', gap: 24 }}>
          {menuSections.map(section => (
            <div key={section.title}>
              <p style={{ fontSize: 11, fontWeight: 700, color: 'rgba(0,0,0,0.35)', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 8px 4px' }}>{section.title}</p>
              <div style={{ background: '#fafafa', borderRadius: 16, border: '1px solid rgba(0,0,0,0.06)', overflow: 'hidden' }}>
                {section.items.map((item, i) => (
                  <button key={item.label} className="menu-item" onClick={item.onClick}
                    style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px', background: 'transparent', border: 'none', borderBottom: i < section.items.length - 1 ? '1px solid rgba(0,0,0,0.05)' : 'none', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left' }}>
                    <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(0,0,0,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <item.icon size={17} color="rgba(0,0,0,0.55)" />
                    </div>
                    <p style={{ flex: 1, fontSize: 14, fontWeight: 500, color: '#0a0a0a', margin: 0 }}>{item.label}</p>

                    <ChevronRight size={15} color="rgba(0,0,0,0.25)" />
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* ── Logout ── */}
        <div style={{ padding: '8px 16px 24px' }}>
          <button onClick={() => open('logout')} className="menu-item"
            style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, padding: '14px', borderRadius: 16, border: '1px solid rgba(239,68,68,0.15)', background: 'rgba(239,68,68,0.04)', cursor: 'pointer', fontFamily: 'inherit' }}>
            <LogOut size={16} color="#ef4444" />
            <span style={{ fontSize: 14, fontWeight: 600, color: '#ef4444' }}>Log Out</span>
          </button>
          <p style={{ textAlign: 'center', fontSize: 11, color: 'rgba(0,0,0,0.2)', marginTop: 20 }}>WALLS v1.0.0 · Made with ❤️ for wallpaper lovers</p>
        </div>
      </div>

      <Navigation />

      {/* ── Logout confirm ── */}
      {modals.logout && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', zIndex: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }} onClick={() => setModals(m => ({ ...m, logout: false }))}>
          <div style={{ background: '#fff', borderRadius: 24, padding: 28, maxWidth: 320, width: '100%', textAlign: 'center' }} onClick={e => e.stopPropagation()}>
            <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(239,68,68,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <LogOut size={24} color="#ef4444" />
            </div>
            <p style={{ fontSize: 18, fontWeight: 700, marginBottom: 6 }}>Log Out?</p>
            <p style={{ fontSize: 14, color: 'rgba(0,0,0,0.4)', marginBottom: 24 }}>Are you sure you want to log out?</p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setModals(m => ({ ...m, logout: false }))} style={{ flex: 1, padding: '13px 0', borderRadius: 14, border: '1px solid rgba(0,0,0,0.1)', background: 'transparent', fontSize: 14, fontWeight: 600, color: 'rgba(0,0,0,0.5)', cursor: 'pointer', fontFamily: 'inherit' }}>Cancel</button>
              <button onClick={handleLogout} style={{ flex: 1, padding: '13px 0', borderRadius: 14, border: 'none', background: '#ef4444', fontSize: 14, fontWeight: 600, color: '#fff', cursor: 'pointer', fontFamily: 'inherit' }}>Log Out</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modals ── */}
      {(modals.settings || modals.settingsClosing) && (
        <div className={modals.settingsClosing ? 'mc' : ''}>
          <SettingsModal onClose={() => closeModal('settings')} onProfileUpdate={async () => { await refreshProfile(); refreshCounts(); }} />
        </div>
      )}

      {(modals.privacy || modals.privacyClosing) && (
        <div className={modals.privacyClosing ? 'mc' : ''}>
          <PrivacyModal onClose={() => closeModal('privacy')} />
        </div>
      )}

      {modals.allPosts && profile && (
        <ViewAllPostsModal
          onClose={() => setModals(m => ({ ...m, allPosts: false }))}
          wallpapers={myWallpapers}
          onWallpaperClick={wp => { setModals(m => ({ ...m, allPosts: false })); router.push(`/details/${wp.id}`); }}
          userName={profile.name}
        />
      )}


    </div>
  );
}
