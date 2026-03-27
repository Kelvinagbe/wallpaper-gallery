'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Settings, Share2, LogOut, Shield, Grid, ChevronRight, TrendingUp } from 'lucide-react';
import { useAuth } from '@/app/components/AuthProvider';
import { SettingsModal } from '@/app/components/profile/SettingsModal';
import { PrivacyModal } from '@/app/components/profile/PrivacyModal';
import { ViewAllPostsModal } from '@/app/components/profile/ViewAllPostsModal';
import { VerifiedBadge } from '@/app/components/VerifiedBadge';
import { Navigation } from '@/app/components/Navigation';
import { signOut } from '@/lib/stores/userStore';
import { createClient } from '@/lib/supabase/client';
import type { Wallpaper } from '@/app/types';

/* ─── types ─────────────────────────────────────────────── */
interface Props {
  initialStats:      { followers: number; following: number; posts: number };
  initialWallpapers: Wallpaper[];
}

/* ─── helpers ────────────────────────────────────────────── */
const fmt = (n: number) =>
  n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M`
  : n >= 1_000   ? `${(n / 1_000).toFixed(1)}k`
  : String(n);

const Shimmer = ({ w, h, r = 8 }: { w: string | number; h: string | number; r?: number }) => (
  <div style={{ width: w, height: h, borderRadius: r, flexShrink: 0,
    background: 'linear-gradient(90deg,#f0f0f0 25%,#e8e8e8 50%,#f0f0f0 75%)',
    backgroundSize: '200% 100%', animation: 'shimmer 1.4s ease infinite' }} />
);

const getMonetBtn = (status: string, eligible: boolean) => {
  if (status === 'approved') return { label: 'My Earnings',           show: true,  solid: true,  disabled: false };
  if (status === 'pending')  return { label: 'Application Pending',  show: true,  solid: false, disabled: true  };
  if (status === 'rejected') return { label: 'Reapply',              show: true,  solid: false, disabled: false };
  if (eligible)              return { label: 'Apply for Monetization', show: true, solid: true,  disabled: false };
  return { show: false, label: '', solid: false, disabled: true };
};

/* ═══════════════════════════════════════════════════════════ */
export default function ProfileClient({ initialStats, initialWallpapers }: Props) {
  const router   = useRouter();
  const supabase = createClient();
  const { profile, isLoading: authLoading, refreshProfile } = useAuth();

  const [stats]        = useState(initialStats);
  const [walls]        = useState<Wallpaper[]>(initialWallpapers);
  const [monetStatus,  setMonetStatus]  = useState('none');
  const [eligible,     setEligible]     = useState(false);
  const [monetLoading, setMonetLoading] = useState(true);
  const [modals, setModals] = useState({
    logout: false, settings: false, settingsClosing: false,
    privacy: false, privacyClosing: false, allPosts: false,
  });

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

  const handleLogout = async () => { await signOut(); router.replace('/'); };
  const handleShare  = async () => {
    if (navigator.share) await navigator.share({ title: 'Gallery App', url: window.location.href }).catch(() => {});
    else navigator.clipboard.writeText(window.location.href).catch(() => {});
  };
  const handleMonetBtn = () => router.push(monetStatus === 'approved' ? '/monetization' : '/monetization/apply');

  if (!authLoading && !profile) return null;

  const monetBtn    = getMonetBtn(monetStatus, eligible);
  const statItems   = [
    { label: 'Posts',     value: fmt(stats.posts || walls.length) },
    { label: 'Followers', value: fmt(stats.followers) },
    { label: 'Following', value: fmt(stats.following) },
  ];
  const menuItems = [
    { icon: Settings, label: 'Account Settings',   action: () => open('settings') },
    { icon: Shield,   label: 'Privacy & Security', action: () => open('privacy')  },
    { icon: Share2,   label: 'Share App',          action: handleShare             },
  ];

  return (
    <div style={{ minHeight: '100dvh', background: '#f7f7f7', fontFamily: "'DM Sans', system-ui, sans-serif", color: '#111', paddingBottom: 100 }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap');
        @keyframes shimmer { 0%,100%{background-position:200% 0} 50%{background-position:-200% 0} }
        @keyframes up { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
        .up { animation: up .38s cubic-bezier(.16,1,.3,1) both; }
        .tap:active { opacity: .6; }
        .wp:active  { transform: scale(0.96); }
        .wp { transition: transform .12s; }
      `}</style>

      {/* ── header ── */}
      <div style={{ position: 'sticky', top: 0, zIndex: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '13px 16px', background: 'rgba(247,247,247,0.94)', backdropFilter: 'blur(18px)', WebkitBackdropFilter: 'blur(18px)', borderBottom: '1px solid rgba(0,0,0,0.07)' }}>
        <span style={{ fontSize: 15, fontWeight: 700, letterSpacing: '-0.01em' }}>Profile</span>
        <button className="tap" onClick={() => open('settings')} style={{ width: 34, height: 34, borderRadius: '50%', background: 'rgba(0,0,0,0.06)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
          <Settings size={16} color="#111" />
        </button>
      </div>

      <div style={{ maxWidth: 600, margin: '0 auto' }}>

        {/* ── avatar + info ── */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '28px 20px 20px', textAlign: 'center' }}>
          {authLoading ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
              <Shimmer w={96} h={96} r={48} />
              <Shimmer w={140} h={20} />
              <Shimmer w={90} h={14} />
              <Shimmer w={200} h={13} />
            </div>
          ) : profile && (
            <div className="up" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', gap: 0 }}>

              {/* avatar */}
              <div style={{ position: 'relative', marginBottom: 14 }}>
                <img
                  src={profile.avatar} alt={profile.name}
                  style={{ width: 96, height: 96, borderRadius: '50%', objectFit: 'cover', display: 'block', border: '3px solid #fff', boxShadow: '0 2px 16px rgba(0,0,0,0.10)' }}
                />
                <button
                  className="tap" onClick={() => open('settings')}
                  style={{ position: 'absolute', bottom: 0, right: 0, width: 28, height: 28, borderRadius: '50%', background: '#111', border: '2.5px solid #f7f7f7', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                  <Settings size={12} color="#fff" />
                </button>
              </div>

              {/* name + username */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 2 }}>
                <h2 style={{ fontSize: 20, fontWeight: 700, margin: 0, letterSpacing: '-0.025em' }}>{profile.name}</h2>
                {profile.verified && <VerifiedBadge size="md" />}
              </div>
              {profile.username && (
                <p style={{ fontSize: 13, color: 'rgba(0,0,0,0.38)', margin: '0 0 10px' }}>@{profile.username}</p>
              )}
              {profile.bio && (
                <p style={{ fontSize: 13, color: 'rgba(0,0,0,0.5)', lineHeight: 1.6, maxWidth: 260, margin: '0 0 20px' }}>{profile.bio}</p>
              )}

              {/* stats */}
              <div style={{ display: 'flex', width: '100%', maxWidth: 340, background: '#fff', borderRadius: 18, border: '1px solid rgba(0,0,0,0.07)', overflow: 'hidden', marginBottom: 18 }}>
                {statItems.map(({ label, value }, i, arr) => (
                  <div key={label} style={{ flex: 1, padding: '13px 0', textAlign: 'center', borderRight: i < arr.length - 1 ? '1px solid rgba(0,0,0,0.07)' : 'none' }}>
                    <p style={{ fontSize: 18, fontWeight: 700, margin: 0, letterSpacing: '-0.025em', lineHeight: 1 }}>{value}</p>
                    <p style={{ fontSize: 10, color: 'rgba(0,0,0,0.35)', margin: '4px 0 0', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 500 }}>{label}</p>
                  </div>
                ))}
              </div>

              {/* action row */}
              <div style={{ display: 'flex', gap: 8, marginBottom: monetBtn.show ? 10 : 0 }}>
                <button className="tap" onClick={() => open('settings')}
                  style={{ padding: '9px 24px', borderRadius: 24, border: 'none', background: '#111', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                  Edit Profile
                </button>
                <button className="tap" onClick={handleShare}
                  style={{ padding: '9px 18px', borderRadius: 24, border: '1px solid rgba(0,0,0,0.1)', background: '#fff', color: 'rgba(0,0,0,0.55)', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Share2 size={13} /> Share
                </button>
              </div>

              {/* monetization button */}
              {monetLoading ? (
                <Shimmer w={180} h={38} r={22} />
              ) : monetBtn.show && (
                <button className="tap" onClick={handleMonetBtn} disabled={monetBtn.disabled}
                  style={{
                    padding: '9px 20px', borderRadius: 24, fontFamily: 'inherit', fontSize: 13, fontWeight: 600,
                    cursor: monetBtn.disabled ? 'default' : 'pointer',
                    opacity: monetBtn.disabled ? 0.5 : 1,
                    display: 'flex', alignItems: 'center', gap: 7,
                    border: monetBtn.solid ? 'none' : '1px solid rgba(0,0,0,0.1)',
                    background: monetBtn.solid ? '#111' : '#fff',
                    color: monetBtn.solid ? '#fff' : 'rgba(0,0,0,0.55)',
                  }}>
                  <TrendingUp size={13} color={monetBtn.solid ? '#fff' : 'rgba(0,0,0,0.45)'} />
                  {monetBtn.label}
                </button>
              )}
            </div>
          )}
        </div>

        {/* ── wallpaper grid ── */}
        {walls.length > 0 && (
          <div style={{ borderTop: '1px solid rgba(0,0,0,0.07)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Grid size={13} color="rgba(0,0,0,0.3)" />
                <span style={{ fontSize: 11, fontWeight: 700, color: 'rgba(0,0,0,0.35)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  {fmt(stats.posts || walls.length)} Posts
                </span>
              </div>
              <button className="tap" onClick={() => open('allPosts')}
                style={{ fontSize: 12, fontWeight: 600, color: 'rgba(0,0,0,0.38)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
                View all
              </button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 1.5 }}>
              {walls.slice(0, 9).map(wp => (
                <button key={wp.id} className="wp" onClick={() => router.push(`/details/${wp.id}`)}
                  style={{ position: 'relative', aspectRatio: '3/4', border: 'none', padding: 0, cursor: 'pointer', background: '#e8e8e8', overflow: 'hidden', display: 'block' }}>
                  <img src={wp.thumbnail || wp.url} alt={wp.title} loading="lazy"
                    style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── menu ── */}
        <div style={{ padding: '20px 14px 8px' }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: 'rgba(0,0,0,0.3)', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 8px 4px' }}>Account</p>
          <div style={{ background: '#fff', borderRadius: 18, border: '1px solid rgba(0,0,0,0.07)', overflow: 'hidden' }}>
            {menuItems.map(({ icon: Icon, label, action }, i) => (
              <button key={label} className="tap" onClick={action}
                style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 13, padding: '14px 16px', background: 'transparent', border: 'none', borderBottom: i < menuItems.length - 1 ? '1px solid rgba(0,0,0,0.05)' : 'none', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left' }}>
                <div style={{ width: 34, height: 34, borderRadius: 10, background: 'rgba(0,0,0,0.04)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Icon size={16} color="rgba(0,0,0,0.5)" />
                </div>
                <span style={{ flex: 1, fontSize: 14, fontWeight: 500, color: '#111' }}>{label}</span>
                <ChevronRight size={15} color="rgba(0,0,0,0.2)" />
              </button>
            ))}
          </div>
        </div>

        {/* ── logout + footer ── */}
        <div style={{ padding: '8px 14px 28px' }}>
          <button className="tap" onClick={() => open('logout')}
            style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9, padding: '14px', borderRadius: 16, border: '1px solid rgba(239,68,68,0.14)', background: 'rgba(239,68,68,0.04)', cursor: 'pointer', fontFamily: 'inherit' }}>
            <LogOut size={15} color="#ef4444" />
            <span style={{ fontSize: 14, fontWeight: 600, color: '#ef4444' }}>Log Out</span>
          </button>
          <p style={{ textAlign: 'center', fontSize: 11, color: 'rgba(0,0,0,0.18)', marginTop: 18 }}>WALLS v1.0.0 · Made with ❤️ for wallpaper lovers</p>
        </div>
      </div>

      <Navigation />

      {/* ── logout confirm modal ── */}
      {modals.logout && (
        <div
          onClick={() => setModals(m => ({ ...m, logout: false }))}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.38)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', zIndex: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div onClick={e => e.stopPropagation()}
            style={{ background: '#fff', borderRadius: 24, padding: '28px 24px', maxWidth: 300, width: '100%', textAlign: 'center' }}>
            <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'rgba(239,68,68,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
              <LogOut size={22} color="#ef4444" />
            </div>
            <p style={{ fontSize: 17, fontWeight: 700, margin: '0 0 6px', letterSpacing: '-0.01em' }}>Log out?</p>
            <p style={{ fontSize: 13, color: 'rgba(0,0,0,0.4)', margin: '0 0 22px', lineHeight: 1.5 }}>You'll need to sign in again to access your account.</p>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="tap" onClick={() => setModals(m => ({ ...m, logout: false }))}
                style={{ flex: 1, padding: '12px 0', borderRadius: 14, border: '1px solid rgba(0,0,0,0.1)', background: 'transparent', fontSize: 14, fontWeight: 600, color: 'rgba(0,0,0,0.45)', cursor: 'pointer', fontFamily: 'inherit' }}>
                Cancel
              </button>
              <button className="tap" onClick={handleLogout}
                style={{ flex: 1, padding: '12px 0', borderRadius: 14, border: 'none', background: '#ef4444', fontSize: 14, fontWeight: 600, color: '#fff', cursor: 'pointer', fontFamily: 'inherit' }}>
                Log Out
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── other modals ── */}
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
