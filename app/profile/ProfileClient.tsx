'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  ChevronLeft, Settings, Share2, LogOut, Shield,
  Grid, ChevronRight, TrendingUp, Clock, WifiOff, RefreshCw,
} from 'lucide-react';
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

// ── Helpers ────────────────────────────────────────────────────────────────
const fmt = (n: number) =>
  n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M`
  : n >= 1_000   ? `${(n / 1_000).toFixed(1)}k`
  : String(n);

const S = {
  bg: '#f7f7f5', surface: '#ffffff', border: 'rgba(0,0,0,.08)',
  ink: '#111110', ink2: 'rgba(17,17,16,.5)', ink3: 'rgba(17,17,16,.3)',
  green: '#16a34a', red: '#dc2626',
};

const iconBtn = {
  width: 34, height: 34, borderRadius: '50%' as const,
  background: 'rgba(0,0,0,.06)', border: 'none',
  display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
};

type NetState = 'online' | 'offline' | 'reconnecting' | 'slow';
type Modals   = Record<string, boolean>;

// ── Tiny shared components ─────────────────────────────────────────────────
const Shimmer = ({ w, h, r = 8 }: { w: string | number; h: string | number; r?: number }) => (
  <div style={{ width: w, height: h, borderRadius: r, flexShrink: 0, background: 'linear-gradient(90deg,#e8e8e8 25%,#f0f0f0 50%,#e8e8e8 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.4s ease infinite' }} />
);

const Spinner = ({ size = 13, color = '#fff' }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 14 14" style={{ animation: 'spin .7s linear infinite', flexShrink: 0 }}>
    <circle cx="7" cy="7" r="5.5" fill="none" stroke={color} strokeWidth="2" strokeOpacity=".25" />
    <path d="M7 1.5a5.5 5.5 0 0 1 5.5 5.5" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" />
  </svg>
);

const GLOBAL_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@400;500;600;700&display=swap');
  @keyframes shimmer   { 0%,100%{background-position:200% 0} 50%{background-position:-200% 0} }
  @keyframes up        { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:translateY(0)} }
  @keyframes fadeIn    { from{opacity:0} to{opacity:1} }
  @keyframes slideDown { from{opacity:0;transform:translateY(-100%)} to{opacity:1;transform:translateY(0)} }
  @keyframes spin      { to{transform:rotate(360deg)} }
  .up { animation: up .42s cubic-bezier(.16,1,.3,1) both }
  .d1{animation-delay:.06s} .d2{animation-delay:.12s} .d3{animation-delay:.18s}
  .d4{animation-delay:.24s} .d5{animation-delay:.30s}
  .tap:active  { opacity:.55 }
  .cell:active { opacity:.75 }
  .mrow:active { background: rgba(0,0,0,.03) !important }
`;

const getMonetBtn = (status: string, eligible: boolean) => {
  if (status === 'approved') return { label: 'Creator Studio · My Earnings', sub: 'Tap to view balance & payouts',       show: true,  disabled: false };
  if (status === 'pending')  return { label: 'Application Pending',          sub: 'Under review — check back soon',      show: true,  disabled: true  };
  if (status === 'rejected') return { label: 'Reapply for Monetization',     sub: 'Your previous application was rejected', show: true, disabled: false };
  if (eligible)              return { label: 'Apply for Monetization',        sub: 'You meet the requirements',           show: true,  disabled: false };
  return { show: false, label: '', sub: '', disabled: true };
};

// ── Net banner ─────────────────────────────────────────────────────────────
const NET_CFG = {
  offline:      { bg: S.red,     text: 'No internet connection',  icon: <WifiOff size={13} color="#fff" />, retry: true  },
  reconnecting: { bg: '#d97706', text: 'Reconnecting…',           icon: <Spinner size={13} />,              retry: false },
  slow:         { bg: '#d97706', text: 'Slow connection detected', icon: <Spinner size={13} />,              retry: true  },
} as const;

const NetBanner = ({ state, onRetry }: { state: NetState; onRetry: () => void }) => {
  if (state === 'online') return null;
  const cfg = NET_CFG[state];
  return (
    <div style={{ position: 'fixed', top: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: 1200, zIndex: 100, background: cfg.bg, padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 8, animation: 'slideDown .3s cubic-bezier(.16,1,.3,1)', fontFamily: "'DM Sans',sans-serif" }}>
      {cfg.icon}
      <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: '#fff' }}>{cfg.text}</span>
      {cfg.retry && (
        <button onClick={onRetry} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: 600, color: '#fff', background: 'rgba(255,255,255,.2)', border: 'none', borderRadius: 8, padding: '4px 10px', cursor: 'pointer', fontFamily: 'inherit' }}>
          <RefreshCw size={11} color="#fff" /> Retry
        </button>
      )}
    </div>
  );
};

// ── Main component ─────────────────────────────────────────────────────────
export default function ProfileClient({ initialStats, initialWallpapers }: Props) {
  const router   = useRouter();
  const supabase = createClient();
  const { profile, isLoading: authLoading, refreshProfile } = useAuth();

  const [walls]        = useState<Wallpaper[]>(initialWallpapers);
  const [monetStatus,  setMonetStatus]  = useState('none');
  const [eligible,     setEligible]     = useState(false);
  const [monetLoading, setMonetLoading] = useState(true);
  const [monetError,   setMonetError]   = useState(false);
  const [netState,     setNetState]     = useState<NetState>('online');
  const [modals,       setModals]       = useState<Modals>({ logout: false, settings: false, settingsClosing: false, privacy: false, privacyClosing: false, allPosts: false });
  const [isDesktop,    setIsDesktop]    = useState(false);

  const slowTimer     = useRef<ReturnType<typeof setTimeout> | null>(null);
  const offlineTimer  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fetchAttempts = useRef(0);

  // Responsive
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)');
    setIsDesktop(mq.matches);
    const h = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
    mq.addEventListener('change', h);
    return () => mq.removeEventListener('change', h);
  }, []);

  // Monetization fetch
  const fetchMonetization = async () => {
    if (!profile?.id) return;
    setMonetError(false); setMonetLoading(true); fetchAttempts.current += 1;
    slowTimer.current = setTimeout(() => { if (navigator.onLine) setNetState('slow'); }, 5000);
    try {
      const { data } = await supabase.from('profiles').select('monetization_status').eq('id', profile.id).single();
      clearTimeout(slowTimer.current!); setNetState('online');
      const status = data?.monetization_status || 'none';
      setMonetStatus(status);
      if (status === 'none' || status === 'rejected') {
        const { data: el } = await supabase.rpc('check_monetization_eligibility', { user_id: profile.id });
        setEligible(el?.eligible ?? false);
      }
      fetchAttempts.current = 0;
    } catch {
      clearTimeout(slowTimer.current!); setMonetError(true);
      if (fetchAttempts.current < 3)
        setTimeout(fetchMonetization, Math.min(1000 * 2 ** fetchAttempts.current, 10000));
    } finally { setMonetLoading(false); }
  };

  useEffect(() => {
    if (!profile?.id) return;
    fetchMonetization();
    return () => { clearTimeout(slowTimer.current!); clearTimeout(offlineTimer.current!); };
  }, [profile?.id]); // eslint-disable-line

  // Network listeners
  useEffect(() => {
    const onOffline = () => { clearTimeout(offlineTimer.current!); setNetState('offline'); };
    const onOnline  = async () => {
      setNetState('reconnecting');
      await fetchMonetization().catch(() => {});
      offlineTimer.current = setTimeout(() => setNetState('online'), 2000);
    };
    window.addEventListener('offline', onOffline);
    window.addEventListener('online',  onOnline);
    if (!navigator.onLine) setNetState('offline');
    return () => { window.removeEventListener('offline', onOffline); window.removeEventListener('online', onOnline); };
  }, [profile?.id]); // eslint-disable-line

  // Modal helpers
  const open       = (k: string) => setModals(m => ({ ...m, [k]: true }));
  const closeModal = (k: string) => {
    setModals(m => ({ ...m, [`${k}Closing`]: true }));
    setTimeout(() => setModals(m => ({ ...m, [k]: false, [`${k}Closing`]: false })), 300);
  };

  const handleLogout = async () => { await signOut(); router.replace('/'); };
  const handleShare  = async () => {
    if (navigator.share) await navigator.share({ title: 'WALLS', url: window.location.href }).catch(() => {});
    else navigator.clipboard.writeText(window.location.href).catch(() => {});
  };

  // Auth guard — redirect instead of blank/placeholder
  if (!authLoading && !profile) {
    router.replace('/login?redirect=/profile');
    return null;
  }

  const monetBtn  = getMonetBtn(monetStatus, eligible);
  const statItems = [
    { label: 'Posts',     value: fmt(initialStats.posts || walls.length) },
    { label: 'Followers', value: fmt(initialStats.followers) },
    { label: 'Following', value: fmt(initialStats.following) },
  ];
  const menuItems = [
    { icon: Settings, label: 'Account Settings',   sub: 'Name, email, avatar',        color: '#6366f1', bg: 'rgba(99,102,241,.08)',  border: 'rgba(99,102,241,.15)',  action: () => open('settings') },
    { icon: Shield,   label: 'Privacy & Security', sub: 'Password, blocked accounts', color: '#10b981', bg: 'rgba(16,185,129,.08)', border: 'rgba(16,185,129,.15)', action: () => open('privacy')  },
    { icon: Share2,   label: 'Share App',          sub: 'Invite friends to WALLS',    color: '#f59e0b', bg: 'rgba(245,158,11,.08)', border: 'rgba(245,158,11,.15)', action: handleShare            },
  ];

  // ── Sub-components (defined inside to share closure) ─────────────────────

  const StatsRow = () => (
    <div style={{ display: 'flex', background: S.surface, borderRadius: 18, border: `1px solid ${S.border}`, overflow: 'hidden' }}>
      {statItems.map(({ label, value }, i) => (
        <div key={label} style={{ flex: 1, padding: '12px 0', textAlign: 'center', borderRight: i < 2 ? `1px solid ${S.border}` : 'none' }}>
          <p style={{ fontFamily: "'Syne',sans-serif", fontSize: 17, fontWeight: 700, margin: 0, letterSpacing: '-.02em', lineHeight: 1 }}>{value}</p>
          <p style={{ fontSize: 9, color: S.ink3, margin: '4px 0 0', textTransform: 'uppercase', letterSpacing: '.07em', fontWeight: 600 }}>{label}</p>
        </div>
      ))}
    </div>
  );

  const MenuList = ({ fullWidth = false }: { fullWidth?: boolean }) => (
    <div style={fullWidth
      ? { background: S.surface, borderTop: `1px solid ${S.border}`, borderBottom: `1px solid ${S.border}` }
      : { background: S.surface, borderRadius: 18, border: `1px solid ${S.border}`, overflow: 'hidden' }
    }>
      {menuItems.map(({ icon: Icon, label, sub, color, bg, border, action }, i) => (
        <button key={label} className="tap mrow" onClick={action}
          style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 13, padding: '15px 18px', background: 'transparent', border: 'none', borderBottom: i < menuItems.length - 1 ? `1px solid ${S.border}` : 'none', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left' }}>
          <div style={{ width: 38, height: 38, borderRadius: 11, background: bg, border: `1px solid ${border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color }}>
            <Icon size={15} />
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 14, fontWeight: 600, color: S.ink, margin: '0 0 2px' }}>{label}</p>
            <p style={{ fontSize: 11, color: S.ink3, margin: 0 }}>{sub}</p>
          </div>
          <ChevronRight size={15} color={S.ink} style={{ opacity: 0.2 }} />
        </button>
      ))}
    </div>
  );

  const MonetRow = () => {
    if (monetLoading) return <Shimmer w="100%" h={66} r={0} />;
    if (monetError) return (
      <button className="tap" onClick={fetchMonetization}
        style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 13, padding: '14px 18px', background: S.surface, border: 'none', borderBottom: `1px solid ${S.border}`, cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left' }}>
        <div style={{ width: 38, height: 38, borderRadius: 11, background: 'rgba(220,38,38,.06)', border: '1px solid rgba(220,38,38,.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <RefreshCw size={16} color={S.red} />
        </div>
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: 13, fontWeight: 600, color: S.red, margin: '0 0 1px' }}>Failed to load</p>
          <p style={{ fontSize: 11, color: S.ink3, margin: 0 }}>Tap to retry</p>
        </div>
        <ChevronRight size={15} color={S.ink} style={{ opacity: 0.2 }} />
      </button>
    );
    if (!monetBtn.show) return null;
    const disabled = monetBtn.disabled || netState === 'offline';
    return (
      <button className="tap" onClick={() => router.push(monetStatus === 'approved' ? '/monetization' : '/monetization/apply')}
        disabled={disabled}
        style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 13, padding: '14px 18px', background: S.surface, border: 'none', borderBottom: `1px solid ${S.border}`, cursor: disabled ? 'default' : 'pointer', fontFamily: 'inherit', opacity: disabled ? 0.5 : 1, textAlign: 'left' }}>
        <div style={{ width: 38, height: 38, borderRadius: 11, background: 'rgba(22,163,74,.08)', border: '1px solid rgba(22,163,74,.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <TrendingUp size={16} color={S.green} />
        </div>
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: 13, fontWeight: 600, color: S.ink, margin: '0 0 1px' }}>{monetBtn.label}</p>
          <p style={{ fontSize: 11, color: S.ink3, margin: 0 }}>{monetBtn.sub}</p>
        </div>
        {monetBtn.disabled ? <Clock size={14} color={S.ink3} /> : <ChevronRight size={15} color={S.ink} style={{ opacity: 0.2 }} />}
      </button>
    );
  };

  const HeroBlock = () => authLoading ? (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'flex', gap: 16, alignItems: 'flex-end' }}>
        <Shimmer w={90} h={90} r={24} />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8, paddingBottom: 4 }}>
          <Shimmer w="70%" h={22} /><Shimmer w="45%" h={14} /><Shimmer w={120} h={22} r={20} />
        </div>
      </div>
      <Shimmer w="80%" h={14} /><Shimmer w="100%" h={52} r={16} />
      <div style={{ display: 'flex', gap: 8 }}><Shimmer w="100%" h={42} r={14} /><Shimmer w="100%" h={42} r={14} /></div>
    </div>
  ) : profile ? (
    <>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 16, marginBottom: 14 }}>
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <img src={profile.avatar} alt={profile.name} style={{ width: 90, height: 90, borderRadius: 24, objectFit: 'cover', display: 'block', border: `1.5px solid ${S.border}` }} />
          <div style={{ position: 'absolute', bottom: 6, right: 6, width: 11, height: 11, borderRadius: '50%', background: netState === 'online' ? S.green : '#d97706', border: `2px solid ${S.bg}`, transition: 'background .4s' }} />
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
      <StatsRow />
      <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
        <button className="tap" onClick={() => open('settings')}
          style={{ flex: 1, padding: '11px 0', borderRadius: 14, border: 'none', background: S.ink, color: S.bg, fontFamily: 'inherit', fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
          <Settings size={13} color={S.bg} /> Edit Profile
        </button>
        <button className="tap" onClick={handleShare}
          style={{ flex: 1, padding: '11px 0', borderRadius: 14, border: `1px solid ${S.border}`, background: 'transparent', color: S.ink2, fontFamily: 'inherit', fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
          <Share2 size={13} /> Share
        </button>
      </div>
    </>
  ) : null;

  const WallGrid = ({ cols = 3, rounded = false }: { cols?: number; rounded?: boolean }) => (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols},1fr)`, gap: rounded ? 10 : 2 }}>
      {walls.slice(0, cols === 3 ? 9 : walls.length).map(wp => (
        <button key={wp.id} className="cell" onClick={() => router.push(`/details/${wp.id}`)}
          style={{ aspectRatio: '3/4', border: 'none', padding: 0, cursor: 'pointer', background: '#e8e8e8', overflow: 'hidden', display: 'block', borderRadius: rounded ? 14 : 0, transition: rounded ? 'transform .2s,box-shadow .2s' : undefined }}
          onMouseEnter={rounded ? e => { (e.currentTarget as HTMLElement).style.transform = 'scale(1.02)'; (e.currentTarget as HTMLElement).style.boxShadow = '0 8px 24px rgba(0,0,0,.1)'; } : undefined}
          onMouseLeave={rounded ? e => { (e.currentTarget as HTMLElement).style.transform = 'scale(1)'; (e.currentTarget as HTMLElement).style.boxShadow = 'none'; } : undefined}
        >
          <img src={wp.thumbnail || wp.url} alt={wp.title} loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
        </button>
      ))}
    </div>
  );

  const LogoutBtn = ({ pad }: { pad: string }) => (
    <div style={{ padding: pad }}>
      <button className="tap" onClick={() => open('logout')}
        style={{ width: '100%', padding: 14, borderRadius: 16, border: '1px solid rgba(220,38,38,.15)', background: 'rgba(220,38,38,.05)', color: S.red, fontFamily: 'inherit', fontSize: 14, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
        <LogOut size={15} color={S.red} /> Log Out
      </button>
      <p style={{ textAlign: 'center', fontSize: 11, color: S.ink3, marginTop: 16 }}>WALLS v1.0.0 · Made with ❤️ for wallpaper lovers</p>
    </div>
  );

  const GridSection = ({ cols, rounded }: { cols: number; rounded: boolean }) => walls.length > 0 ? (
    <>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: rounded ? '0 0 14px' : '18px 18px 10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Grid size={13} color={S.ink3} />
          <span style={{ fontSize: 11, fontWeight: 600, color: S.ink3, textTransform: 'uppercase', letterSpacing: '.07em' }}>
            {rounded ? 'All Posts' : `${fmt(initialStats.posts || walls.length)} Wallpapers`}
          </span>
        </div>
        <button className="tap" onClick={() => open('allPosts')} style={{ fontSize: 12, fontWeight: 600, color: S.ink2, background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>View all</button>
      </div>
      <WallGrid cols={cols} rounded={rounded} />
    </>
  ) : null;

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: '100dvh', background: S.bg, fontFamily: "'DM Sans',system-ui,sans-serif", color: S.ink, paddingBottom: isDesktop ? 0 : 100 }}>
      <style>{GLOBAL_CSS}</style>
      <NetBanner state={netState} onRetry={() => { setNetState(navigator.onLine ? 'online' : 'offline'); if (navigator.onLine) fetchMonetization(); }} />

      {/* ── MOBILE (< 768px) ── */}
      {!isDesktop && (
        <>
          <div style={{ position: 'sticky', top: 0, zIndex: 30, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '13px 16px', background: 'rgba(247,247,245,.92)', backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)', borderBottom: `1px solid ${S.border}` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <button className="tap" onClick={() => router.back()} style={iconBtn}><ChevronLeft size={18} color={S.ink} strokeWidth={2.5} /></button>
              <span style={{ fontFamily: "'Syne',sans-serif", fontSize: 15, fontWeight: 700 }}>Profile</span>
            </div>
            <button className="tap" onClick={() => open('settings')} style={iconBtn}><Settings size={16} color={S.ink} /></button>
          </div>

          <div style={{ maxWidth: 430, margin: '0 auto' }}>
            <div className="up d1" style={{ padding: '24px 18px 20px', borderBottom: `1px solid ${S.border}` }}><HeroBlock /></div>
            {!authLoading && profile && <div className="up d2"><MonetRow /></div>}
            {walls.length > 0 && <div className="up d3"><GridSection cols={3} rounded={false} /></div>}
            <div className="up d4" style={{ paddingTop: 20 }}>
              <p style={{ fontSize: 10, fontWeight: 700, color: S.ink3, textTransform: 'uppercase', letterSpacing: '.09em', margin: '0 0 8px 18px' }}>Account</p>
              <MenuList fullWidth />
            </div>
            <LogoutBtn pad="12px 18px 28px" />
          </div>

          <Navigation />
        </>
      )}

      {/* ── DESKTOP (≥ 768px) ── */}
      {isDesktop && (
        <div style={{ display: 'flex', minHeight: '100dvh' }}>
          <aside style={{ width: 300, flexShrink: 0, borderRight: `1px solid ${S.border}`, background: S.surface, position: 'sticky', top: 0, height: '100dvh', overflowY: 'auto', display: 'flex', flexDirection: 'column', padding: '32px 0 24px' }}>
            <div style={{ padding: '0 20px 24px', display: 'flex', alignItems: 'center', gap: 10 }}>
              <button className="tap" onClick={() => router.back()} style={iconBtn}><ChevronLeft size={18} color={S.ink} strokeWidth={2.5} /></button>
              <span style={{ fontFamily: "'Syne',sans-serif", fontSize: 15, fontWeight: 700 }}>Profile</span>
            </div>
            <div style={{ padding: '0 20px 24px', borderBottom: `1px solid ${S.border}` }}><HeroBlock /></div>
            {!authLoading && profile && <div style={{ borderBottom: `1px solid ${S.border}` }}><MonetRow /></div>}
            <div style={{ padding: '20px 20px 0' }}>
              <p style={{ fontSize: 10, fontWeight: 700, color: S.ink3, textTransform: 'uppercase', letterSpacing: '.09em', margin: '0 0 8px 2px' }}>Account</p>
              <MenuList fullWidth={false} />
            </div>
            <div style={{ marginTop: 'auto' }}><LogoutBtn pad="12px 20px 0" /></div>
          </aside>

          <main style={{ flex: 1, overflowY: 'auto', padding: '32px 40px' }}>
            <div style={{ marginBottom: 28 }}>
              <h1 style={{ fontFamily: "'Syne',sans-serif", fontSize: 26, fontWeight: 800, margin: '0 0 4px', letterSpacing: '-.02em' }}>My Wallpapers</h1>
              <p style={{ fontSize: 13, color: S.ink3, margin: 0 }}>{fmt(initialStats.posts || walls.length)} uploads</p>
            </div>
            {walls.length > 0
              ? <GridSection cols={4} rounded />
              : (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 300, gap: 12 }}>
                  <div style={{ width: 56, height: 56, borderRadius: '50%', background: S.surface, border: `1px solid ${S.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Grid size={22} color={S.ink3} />
                  </div>
                  <p style={{ fontSize: 14, color: S.ink3, margin: 0 }}>No posts yet</p>
                </div>
              )
            }
          </main>
        </div>
      )}

      {/* ── Modals ── */}
      {modals.logout && (
        <div onClick={() => setModals(m => ({ ...m, logout: false }))}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.3)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', zIndex: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, animation: 'fadeIn .2s ease' }}>
          <div onClick={e => e.stopPropagation()}
            style={{ background: S.surface, borderRadius: 26, border: `1px solid ${S.border}`, padding: '28px 24px', maxWidth: 300, width: '100%', textAlign: 'center', boxShadow: '0 20px 60px rgba(0,0,0,.12)' }}>
            <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'rgba(220,38,38,.08)', border: '1px solid rgba(220,38,38,.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
              <LogOut size={22} color={S.red} />
            </div>
            <p style={{ fontFamily: "'Syne',sans-serif", fontSize: 18, fontWeight: 700, margin: '0 0 7px' }}>Log out?</p>
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