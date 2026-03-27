'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, Settings, Share2, LogOut, Shield, Grid, ChevronRight, TrendingUp, Clock } from 'lucide-react';
import { useAuth } from '@/app/components/AuthProvider';
import { SettingsModal } from '@/app/components/profile/SettingsModal';
import { PrivacyModal } from '@/app/components/profile/PrivacyModal';
import { ViewAllPostsModal } from '@/app/components/profile/ViewAllPostsModal';
import { VerifiedBadge } from '@/app/components/VerifiedBadge';
import { Navigation } from '@/app/components/Navigation';
import { signOut } from '@/lib/stores/userStore';
import { createClient } from '@/lib/supabase/client';
import type { Wallpaper } from '@/app/types';

interface Props {
  initialStats: { followers: number; following: number; posts: number };
  initialWallpapers: Wallpaper[];
}

const fmt = (n: number) =>
  n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M` : n >= 1_000 ? `${(n / 1_000).toFixed(1)}k` : String(n);

const Shimmer = ({ w, h, r = 8 }: { w: string | number; h: string | number; r?: number }) => (
  <div style={{ width: w, height: h, borderRadius: r, flexShrink: 0, background: 'linear-gradient(90deg,#e8e8e8 25%,#f0f0f0 50%,#e8e8e8 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.4s ease infinite' }} />
);

const getMonetBtn = (status: string, eligible: boolean) => {
  if (status === 'approved') return { label: 'Creator Studio · My Earnings', sub: 'Tap to view balance & payouts', show: true, disabled: false };
  if (status === 'pending')  return { label: 'Application Pending', sub: 'Under review — check back soon', show: true, disabled: true };
  if (status === 'rejected') return { label: 'Reapply for Monetization', sub: 'Your previous application was rejected', show: true, disabled: false };
  if (eligible)              return { label: 'Apply for Monetization', sub: 'You meet the requirements', show: true, disabled: false };
  return { show: false, label: '', sub: '', disabled: true };
};

// Design tokens — white theme
const S = {
  bg:      '#f7f7f5',
  surface: '#ffffff',
  border:  'rgba(0,0,0,.08)',
  ink:     '#111110',
  ink2:    'rgba(17,17,16,.5)',
  ink3:    'rgba(17,17,16,.3)',
  green:   '#16a34a',
  red:     '#dc2626',
};

export default function ProfileClient({ initialStats, initialWallpapers }: Props) {
  const router   = useRouter();
  const supabase = createClient();
  const { profile, isLoading: authLoading, refreshProfile } = useAuth();

  const [stats]        = useState(initialStats);
  const [walls]        = useState<Wallpaper[]>(initialWallpapers);
  const [monetStatus,  setMonetStatus]  = useState('none');
  const [eligible,     setEligible]     = useState(false);
  const [monetLoading, setMonetLoading] = useState(true);
  const [modals, setModals] = useState({ logout: false, settings: false, settingsClosing: false, privacy: false, privacyClosing: false, allPosts: false });

  useEffect(() => {
    if (!profile?.id) return;
    (async () => {
      try {
        const { data } = await supabase.from('profiles').select('monetization_status').eq('id', profile.id).single();
        const status = data?.monetization_status || 'none';
        setMonetStatus(status);
        if (status === 'none' || status === 'rejected') {
          const { data: el } = await supabase.rpc('check_monetization_eligibility', { user_id: profile.id });
          setEligible(el?.eligible ?? false);
        }
      } catch {}
      finally { setMonetLoading(false); }
    })();
  }, [profile?.id]);

  const closeModal = (key: string) => {
    setModals(m => ({ ...m, [`${key}Closing`]: true }));
    setTimeout(() => setModals(m => ({ ...m, [key]: false, [`${key}Closing`]: false })), 300);
  };
  const open = (key: string) => setModals(m => ({ ...m, [key]: true }));

  const handleLogout   = async () => { await signOut(); router.replace('/'); };
  const handleShare    = async () => {
    if (navigator.share) await navigator.share({ title: 'WALLS', url: window.location.href }).catch(() => {});
    else navigator.clipboard.writeText(window.location.href).catch(() => {});
  };
  const handleMonetBtn = () => router.push(monetStatus === 'approved' ? '/monetization' : '/monetization/apply');

  if (!authLoading && !profile) return null;

  const monetBtn  = getMonetBtn(monetStatus, eligible);
  const statItems = [
    { label: 'Posts',     value: fmt(stats.posts || walls.length) },
    { label: 'Followers', value: fmt(stats.followers) },
    { label: 'Following', value: fmt(stats.following) },
  ];
  const menuItems = [
    { icon: Settings, label: 'Account Settings',   action: () => open('settings') },
    { icon: Shield,   label: 'Privacy & Security', action: () => open('privacy')  },
    { icon: Share2,   label: 'Share App',          action: handleShare             },
  ];

  // Shared button base styles
  const iconBtn = { width: 34, height: 34, borderRadius: '50%', background: 'rgba(0,0,0,.06)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' } as const;
  const rowCard = { background: S.surface, borderRadius: 18, border: `1px solid ${S.border}`, overflow: 'hidden' } as const;

  return (
    <div style={{ minHeight: '100dvh', background: S.bg, fontFamily: "'DM Sans', system-ui, sans-serif", color: S.ink, paddingBottom: 100 }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@400;500;600;700&display=swap');
        @keyframes shimmer { 0%,100%{background-position:200% 0} 50%{background-position:-200% 0} }
        @keyframes up  { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:translateY(0)} }
        @keyframes fadeIn { from{opacity:0} to{opacity:1} }
        .up{animation:up .42s cubic-bezier(.16,1,.3,1) both}
        .d1{animation-delay:.06s} .d2{animation-delay:.12s} .d3{animation-delay:.18s} .d4{animation-delay:.24s} .d5{animation-delay:.30s}
        .tap:active{opacity:.55} .cell:active{opacity:.75} .mrow:active{background:rgba(0,0,0,.03)!important}
      `}</style>

      {/* Header */}
      <div style={{ position: 'sticky', top: 0, zIndex: 30, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '13px 16px', background: 'rgba(247,247,245,.92)', backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)', borderBottom: `1px solid ${S.border}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button className="tap" onClick={() => router.back()} style={iconBtn}><ChevronLeft size={18} color={S.ink} strokeWidth={2.5} /></button>
          <span style={{ fontFamily: "'Syne', sans-serif", fontSize: 15, fontWeight: 700 }}>Profile</span>
        </div>
        <button className="tap" onClick={() => open('settings')} style={iconBtn}><Settings size={16} color={S.ink} /></button>
      </div>

      <div style={{ maxWidth: 430, margin: '0 auto' }}>

        {/* Hero */}
        <div className="up d1" style={{ padding: '24px 18px 20px', borderBottom: `1px solid ${S.border}` }}>
          {authLoading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'flex', gap: 16, alignItems: 'flex-end' }}>
                <Shimmer w={90} h={90} r={24} />
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8, paddingBottom: 4 }}>
                  <Shimmer w="70%" h={22} /> <Shimmer w="45%" h={14} /> <Shimmer w={120} h={22} r={20} />
                </div>
              </div>
              <Shimmer w="80%" h={14} />
              <Shimmer w="100%" h={52} r={16} />
              <div style={{ display: 'flex', gap: 8 }}><Shimmer w="100%" h={42} r={14} /><Shimmer w="100%" h={42} r={14} /></div>
            </div>
          ) : profile && (
            <>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 16, marginBottom: 14 }}>
                <div style={{ position: 'relative', flexShrink: 0 }}>
                  <img src={profile.avatar} alt={profile.name} style={{ width: 90, height: 90, borderRadius: 24, objectFit: 'cover', display: 'block', border: `1.5px solid ${S.border}` }} />
                  <div style={{ position: 'absolute', bottom: 6, right: 6, width: 11, height: 11, borderRadius: '50%', background: S.green, border: `2px solid ${S.bg}` }} />
                </div>
                <div style={{ flex: 1, paddingBottom: 4 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                    <span style={{ fontSize: 20, fontWeight: 700, letterSpacing: '-.01em', lineHeight: 1 }}>{profile.name}</span>
                    {profile.verified && <VerifiedBadge size="md" />}
                  </div>
                  {profile.username && <p style={{ fontSize: 13, color: S.ink2, margin: '0 0 8px' }}>@{profile.username}</p>}
                  {monetStatus === 'approved' && (
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 9px', borderRadius: 20, background: 'rgba(22,163,74,.08)', border: '1px solid rgba(22,163,74,.2)' }}>
                      <TrendingUp size={10} color={S.green} />
                      <span style={{ fontSize: 10, fontWeight: 600, color: S.green, letterSpacing: '.03em' }}>Monetized Creator</span>
                    </div>
                  )}
                </div>
              </div>

              {profile.bio && <p style={{ fontSize: 13, color: S.ink2, lineHeight: 1.6, margin: '0 0 16px' }}>{profile.bio}</p>}

              {/* Stats */}
              <div style={{ display: 'flex', ...rowCard, marginBottom: 16 }}>
                {statItems.map(({ label, value }, i, arr) => (
                  <div key={label} style={{ flex: 1, padding: '12px 0', textAlign: 'center', borderRight: i < arr.length - 1 ? `1px solid ${S.border}` : 'none' }}>
                    <p style={{ fontFamily: "'Syne', sans-serif", fontSize: 17, fontWeight: 700, margin: 0, letterSpacing: '-.02em', lineHeight: 1 }}>{value}</p>
                    <p style={{ fontSize: 9, color: S.ink3, margin: '4px 0 0', textTransform: 'uppercase', letterSpacing: '.07em', fontWeight: 600 }}>{label}</p>
                  </div>
                ))}
              </div>

              {/* Edit + Share */}
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="tap" onClick={() => open('settings')} style={{ flex: 1, padding: '11px 0', borderRadius: 14, border: 'none', background: S.ink, color: S.bg, fontFamily: 'inherit', fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                  <Settings size={13} color={S.bg} /> Edit Profile
                </button>
                <button className="tap" onClick={handleShare} style={{ flex: 1, padding: '11px 0', borderRadius: 14, border: `1px solid ${S.border}`, background: 'transparent', color: S.ink2, fontFamily: 'inherit', fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                  <Share2 size={13} /> Share
                </button>
              </div>
            </>
          )}
        </div>

        {/* Monetization row */}
        {!authLoading && profile && (
          <div className="up d2">
            {monetLoading ? (
              <div style={{ padding: '0 18px', marginTop: 2 }}><Shimmer w="100%" h={64} r={0} /></div>
            ) : monetBtn.show && (
              <button className="tap" onClick={handleMonetBtn} disabled={monetBtn.disabled}
                style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 13, padding: '14px 18px', background: S.surface, border: 'none', borderBottom: `1px solid ${S.border}`, cursor: monetBtn.disabled ? 'default' : 'pointer', fontFamily: 'inherit', opacity: monetBtn.disabled ? 0.5 : 1, textAlign: 'left' }}>
                <div style={{ width: 38, height: 38, borderRadius: 11, background: 'rgba(22,163,74,.08)', border: '1px solid rgba(22,163,74,.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <TrendingUp size={16} color={S.green} />
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 13, fontWeight: 600, color: S.ink, margin: '0 0 1px' }}>{monetBtn.label}</p>
                  <p style={{ fontSize: 11, color: S.ink3, margin: 0 }}>{monetBtn.sub}</p>
                </div>
                {monetBtn.disabled ? <Clock size={14} color={S.ink3} /> : <ChevronRight size={15} color={S.ink} style={{ opacity: 0.2 }} />}
              </button>
            )}
          </div>
        )}

        {/* Wallpaper grid */}
        {walls.length > 0 && (
          <div className="up d3">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 18px 10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Grid size={13} color={S.ink3} />
                <span style={{ fontSize: 11, fontWeight: 600, color: S.ink3, textTransform: 'uppercase', letterSpacing: '.07em' }}>{fmt(stats.posts || walls.length)} Wallpapers</span>
              </div>
              <button className="tap" onClick={() => open('allPosts')} style={{ fontSize: 12, fontWeight: 600, color: S.ink2, background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>View all</button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 2 }}>
              {walls.slice(0, 9).map((wp, i) => (
                <button key={wp.id} className="cell" onClick={() => router.push(`/details/${wp.id}`)}
                  style={{ aspectRatio: '3/4', border: 'none', padding: 0, cursor: 'pointer', background: '#e8e8e8', overflow: 'hidden', display: 'block', transition: 'opacity .12s', borderRadius: i===0?'12px 0 0 0':i===2?'0 12px 0 0':i===6?'0 0 0 12px':i===8?'0 0 12px 0':0 }}>
                  <img src={wp.thumbnail || wp.url} alt={wp.title} loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Account menu */}
        <div className="up d4" style={{ padding: '20px 18px 0' }}>
          <p style={{ fontSize: 10, fontWeight: 700, color: S.ink3, textTransform: 'uppercase', letterSpacing: '.09em', margin: '0 0 8px 2px' }}>Account</p>
          <div style={rowCard}>
            {menuItems.map(({ icon: Icon, label, action }, i) => (
              <button key={label} className="tap mrow" onClick={action}
                style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 13, padding: '14px 16px', background: 'transparent', border: 'none', borderBottom: i < menuItems.length - 1 ? `1px solid ${S.border}` : 'none', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left', transition: 'background .1s' }}>
                <div style={{ width: 34, height: 34, borderRadius: 10, background: 'rgba(0,0,0,.04)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Icon size={15} color={S.ink} style={{ opacity: 0.55 }} />
                </div>
                <span style={{ flex: 1, fontSize: 14, fontWeight: 500, color: S.ink }}>{label}</span>
                <ChevronRight size={15} color={S.ink} style={{ opacity: 0.2 }} />
              </button>
            ))}
          </div>
        </div>

        {/* Logout + footer */}
        <div className="up d5" style={{ padding: '12px 18px 28px' }}>
          <button className="tap" onClick={() => open('logout')}
            style={{ width: '100%', padding: 14, borderRadius: 16, border: '1px solid rgba(220,38,38,.15)', background: 'rgba(220,38,38,.05)', color: S.red, fontFamily: 'inherit', fontSize: 14, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <LogOut size={15} color={S.red} /> Log Out
          </button>
          <p style={{ textAlign: 'center', fontSize: 11, color: S.ink3, marginTop: 20 }}>WALLS v1.0.0 · Made with ❤️ for wallpaper lovers</p>
        </div>
      </div>

      <Navigation />

      {/* Logout modal */}
      {modals.logout && (
        <div onClick={() => setModals(m => ({ ...m, logout: false }))}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.3)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', zIndex: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, animation: 'fadeIn .2s ease' }}>
          <div onClick={e => e.stopPropagation()}
            style={{ background: S.surface, borderRadius: 26, border: `1px solid ${S.border}`, padding: '28px 24px', maxWidth: 300, width: '100%', textAlign: 'center', boxShadow: '0 20px 60px rgba(0,0,0,.12)' }}>
            <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'rgba(220,38,38,.08)', border: '1px solid rgba(220,38,38,.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
              <LogOut size={22} color={S.red} />
            </div>
            <p style={{ fontFamily: "'Syne', sans-serif", fontSize: 18, fontWeight: 700, margin: '0 0 7px' }}>Log out?</p>
            <p style={{ fontSize: 13, color: S.ink2, lineHeight: 1.55, margin: '0 0 22px' }}>You'll need to sign in again to access your account.</p>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="tap" onClick={() => setModals(m => ({ ...m, logout: false }))}
                style={{ flex: 1, padding: '13px 0', borderRadius: 14, border: `1px solid ${S.border}`, background: 'transparent', fontFamily: 'inherit', fontSize: 14, fontWeight: 600, color: S.ink2, cursor: 'pointer' }}>Cancel</button>
              <button className="tap" onClick={handleLogout}
                style={{ flex: 1, padding: '13px 0', borderRadius: 14, border: 'none', background: S.red, fontFamily: 'inherit', fontSize: 14, fontWeight: 600, color: '#fff', cursor: 'pointer' }}>Log Out</button>
            </div>
          </div>
        </div>
      )}

      {(modals.settings || modals.settingsClosing) && (
        <div className={modals.settingsClosing ? 'mc' : ''}>
          <SettingsModal onClose={() => closeModal('settings')} onProfileUpdate={async () => { await refreshProfile(); }} />
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
          wallpapers={walls}
          onWallpaperClick={wp => { setModals(m => ({ ...m, allPosts: false })); router.push(`/details/${wp.id}`); }}
          userName={profile.name}
        />
      )}
    </div>
  );
}
