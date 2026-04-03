'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  Settings, Share2, LogOut, Shield,
  ChevronRight, ChevronLeft, TrendingUp, Clock, WifiOff, RefreshCw, Grid,
} from 'lucide-react';
import Image from 'next/image';
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
  n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M`
  : n >= 1_000   ? `${(n / 1_000).toFixed(1)}K`
  : String(n);

const T = {
  bg:      '#f0f2f5',
  surface: '#ffffff',
  border:  'rgba(0,0,0,.1)',
  ink:     '#050505',
  ink2:    '#65676b',
  ink3:    'rgba(5,5,5,.3)',
  black:   '#050505',
  tile:    '#e4e6eb',
  green:   '#42b72a',
  red:     '#e41e3f',
  amber:   '#f59e0b',
};

type NetState = 'online' | 'offline' | 'reconnecting' | 'slow';
type Modals   = Record<string, boolean>;
const font    = "'Inter', -apple-system, BlinkMacSystemFont, sans-serif";

const GLOBAL_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  @keyframes shimmer   { 0%,100%{background-position:200% 0} 50%{background-position:-200% 0} }
  @keyframes up        { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
  @keyframes fadeIn    { from{opacity:0} to{opacity:1} }
  @keyframes slideDown { from{opacity:0;transform:translateY(-100%)} to{opacity:1;transform:translateY(0)} }
  @keyframes spin      { to{transform:rotate(360deg)} }
  .up { animation: up .38s cubic-bezier(.16,1,.3,1) both }
  .d1{animation-delay:.05s} .d2{animation-delay:.10s} .d3{animation-delay:.15s}
  .d4{animation-delay:.20s} .d5{animation-delay:.25s}
  .tap:active  { filter: brightness(.88) }
  .cell:active { opacity:.72 }
  .fb-tile {
    display: flex; align-items: center; justify-content: center;
    border-radius: 8px; background: ${T.tile};
    border: none; cursor: pointer; font-family: inherit;
    transition: background .13s, transform .1s;
    -webkit-tap-highlight-color: transparent;
  }
  .fb-tile:active { background: #d0d2d6; transform: scale(.96) }
  .fb-tile:hover  { background: #dddfe3 }
  .tab-active { border-bottom: 3px solid #050505 !important; color: #050505 !important; font-weight: 700 !important; }
  .tab-idle   { border-bottom: 3px solid transparent !important; color: #65676b !important; }
  /* Prevent long-press image save on mobile */
  img {
    -webkit-user-select: none;
    user-select: none;
    pointer-events: none;
    -webkit-touch-callout: none;
  }
  /* Re-enable pointer events on buttons that contain images */
  button img { pointer-events: none; }
`;

const Shimmer = ({ w, h, r = 8 }: { w: string | number; h: string | number; r?: number }) => (
  <div style={{ width: w, height: h, borderRadius: r, flexShrink: 0, background: 'linear-gradient(90deg,#e8e8e8 25%,#f4f4f4 50%,#e8e8e8 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.4s ease infinite' }} />
);

const Spinner = ({ size = 13, color = '#fff' }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 14 14" style={{ animation: 'spin .7s linear infinite', flexShrink: 0 }}>
    <circle cx="7" cy="7" r="5.5" fill="none" stroke={color} strokeWidth="2" strokeOpacity=".25" />
    <path d="M7 1.5a5.5 5.5 0 0 1 5.5 5.5" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" />
  </svg>
);

const NET_MAP = {
  offline:      { bg: T.red,   text: 'No internet connection',   icon: <WifiOff size={13} color="#fff" />, retry: true  },
  reconnecting: { bg: T.amber, text: 'Reconnecting…',            icon: <Spinner size={13} />,             retry: false },
  slow:         { bg: T.amber, text: 'Slow connection detected', icon: <Spinner size={13} />,             retry: true  },
} as const;

const NetBanner = ({ state, onRetry }: { state: NetState; onRetry: () => void }) => {
  if (state === 'online') return null;
  const c = NET_MAP[state];
  return (
    <div style={{ position: 'fixed', top: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: 680, zIndex: 200, background: c.bg, padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 8, animation: 'slideDown .3s ease', fontFamily: font }}>
      {c.icon}
      <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: '#fff' }}>{c.text}</span>
      {c.retry && (
        <button onClick={onRetry} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: 600, color: '#fff', background: 'rgba(255,255,255,.22)', border: 'none', borderRadius: 8, padding: '4px 10px', cursor: 'pointer', fontFamily: 'inherit' }}>
          <RefreshCw size={11} color="#fff" /> Retry
        </button>
      )}
    </div>
  );
};

const getMonetBtn = (status: string, eligible: boolean) => {
  if (status === 'approved') return { label: 'Creator Studio · My Earnings', sub: 'View balance & payouts',          show: true, disabled: false };
  if (status === 'pending')  return { label: 'Application Pending',          sub: 'Under review — check back soon', show: true, disabled: true  };
  if (status === 'rejected') return { label: 'Reapply for Monetization',     sub: 'Previous application rejected',  show: true, disabled: false };
  if (eligible)              return { label: 'Apply for Monetization',        sub: 'You meet the requirements',      show: true, disabled: false };
  return { show: false, label: '', sub: '', disabled: true };
};

// Dollar icon SVG (no external dep)
const DollarIcon = ({ size = 10, color = T.ink }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 12 12" fill="none">
    <text x="50%" y="50%" dominantBaseline="central" textAnchor="middle" fontSize="10" fontWeight="700" fill={color} fontFamily="inherit">$</text>
  </svg>
);

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
  const [activeTab,    setActiveTab]    = useState<'posts' | 'photos'>('posts');

  const slowTimer     = useRef<ReturnType<typeof setTimeout> | null>(null);
  const offlineTimer  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fetchAttempts = useRef(0);

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)');
    setIsDesktop(mq.matches);
    const h = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
    mq.addEventListener('change', h);
    return () => mq.removeEventListener('change', h);
  }, []);

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

  if (!authLoading && !profile) { router.replace('/login?redirect=/profile'); return null; }

  const monetBtn = getMonetBtn(monetStatus, eligible);

  // ── Stats row ─────────────────────────────────────────────────────────────────
  const StatsBar = () => (
    <div style={{ display: 'flex', borderTop: `1px solid ${T.border}`, marginTop: 12 }}>
      {[
        { label: 'Posts',     value: fmt(initialStats.posts || walls.length) },
        { label: 'Followers', value: fmt(initialStats.followers) },
        { label: 'Following', value: fmt(initialStats.following) },
      ].map(({ label, value }, i, arr) => (
        <div key={label} style={{ flex: 1, padding: '12px 0', textAlign: 'center', borderRight: i < arr.length - 1 ? `1px solid ${T.border}` : 'none' }}>
          <p style={{ fontFamily: font, fontSize: 17, fontWeight: 700, color: T.ink, margin: '0 0 2px', letterSpacing: '-.01em' }}>{value}</p>
          <p style={{ fontFamily: font, fontSize: 11, color: T.ink2, margin: 0, fontWeight: 500 }}>{label}</p>
        </div>
      ))}
    </div>
  );

  // ── Action buttons ────────────────────────────────────────────────────────────
  const ActionButtons = () => (
    <div style={{ display: 'flex', gap: 8, padding: '12px 16px 16px' }}>
      <button
        className="tap"
        onClick={() => open('settings')}
        style={{
          flex: 1, height: 38, borderRadius: 8, border: 'none',
          background: T.black, color: '#fff',
          fontFamily: font, fontSize: 14, fontWeight: 600,
          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
        }}
      >
        <Settings size={14} color="#fff" strokeWidth={2.5} />
        Edit Profile
      </button>

      <button
        className="fb-tile tap"
        onClick={handleShare}
        style={{ flex: 1, height: 38, gap: 6, padding: '0 12px' }}
      >
        <Share2 size={14} color={T.ink} strokeWidth={2.5} />
        <span style={{ fontFamily: font, fontSize: 14, fontWeight: 600, color: T.ink }}>Share</span>
      </button>

      <button
        className="fb-tile tap"
        onClick={() => open('privacy')}
        style={{ width: 38, height: 38, flexShrink: 0 }}
        aria-label="More options"
      >
        <span style={{ fontSize: 20, fontWeight: 700, color: T.ink, lineHeight: 1, letterSpacing: 1 }}>···</span>
      </button>
    </div>
  );

  // ── Tabs — Posts + Photos only ────────────────────────────────────────────────
  const Tabs = () => (
    <div style={{ display: 'flex', borderTop: `1px solid ${T.border}` }}>
      {(['posts', 'photos'] as const).map(tab => (
        <button
          key={tab}
          onClick={() => setActiveTab(tab)}
          className={activeTab === tab ? 'tab-active' : 'tab-idle'}
          style={{
            flex: 1, padding: '14px 0', border: 'none', background: 'transparent',
            fontFamily: font, fontSize: 14, fontWeight: 500,
            cursor: 'pointer', transition: 'color .15s',
          }}
        >
          {tab.charAt(0).toUpperCase() + tab.slice(1)}
        </button>
      ))}
    </div>
  );

  // ── Menu tile grid ────────────────────────────────────────────────────────────
  const menuTiles = [
    { icon: <Settings size={20} color={T.ink} strokeWidth={2} />, label: 'Account Settings',   action: () => open('settings') },
    { icon: <Shield   size={20} color={T.ink} strokeWidth={2} />, label: 'Privacy & Security', action: () => open('privacy')  },
    { icon: <Share2   size={20} color={T.ink} strokeWidth={2} />, label: 'Share App',           action: handleShare             },
    { icon: <LogOut   size={20} color={T.red} strokeWidth={2} />, label: 'Log Out',             action: () => open('logout'), red: true },
  ];

  const MenuTileGrid = () => (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, padding: '8px 16px 16px' }}>
      {menuTiles.map(({ icon, label, action, red }) => (
        <button
          key={label}
          className="fb-tile tap"
          onClick={action}
          style={{
            flexDirection: 'column', gap: 8,
            padding: '16px 8px', borderRadius: 14,
            background: red ? 'rgba(228,30,63,.07)' : T.tile,
          }}
        >
          {icon}
          <span style={{ fontFamily: font, fontSize: 13, fontWeight: 600, color: red ? T.red : T.ink }}>{label}</span>
        </button>
      ))}
    </div>
  );

  // ── Monetization row ──────────────────────────────────────────────────────────
  const MonetRow = () => {
    if (monetLoading) return <div style={{ padding: '0 16px 14px' }}><Shimmer w="100%" h={58} r={10} /></div>;
    if (monetError) return (
      <div style={{ padding: '0 16px 14px' }}>
        <button className="fb-tile tap" onClick={fetchMonetization}
          style={{ width: '100%', flexDirection: 'row', justifyContent: 'flex-start', gap: 12, padding: 14, borderRadius: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(228,30,63,.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <RefreshCw size={16} color={T.red} />
          </div>
          <div style={{ flex: 1, textAlign: 'left' }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: T.red, margin: '0 0 2px', fontFamily: font }}>Failed to load</p>
            <p style={{ fontSize: 11, color: T.ink2, margin: 0, fontFamily: font }}>Tap to retry</p>
          </div>
          <ChevronRight size={15} color={T.ink2} />
        </button>
      </div>
    );
    if (!monetBtn.show) return null;
    const disabled = monetBtn.disabled || netState === 'offline';
    return (
      <div style={{ padding: '0 16px 14px' }}>
        <button className="fb-tile tap"
          onClick={() => router.push(monetStatus === 'approved' ? '/monetization' : '/monetization/apply')}
          disabled={disabled}
          style={{ width: '100%', flexDirection: 'row', justifyContent: 'flex-start', gap: 12, padding: 14, borderRadius: 10, opacity: disabled ? 0.55 : 1, cursor: disabled ? 'default' : 'pointer' }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(5,5,5,.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <TrendingUp size={16} color={T.ink} />
          </div>
          <div style={{ flex: 1, textAlign: 'left' }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: T.ink, margin: '0 0 2px', fontFamily: font }}>{monetBtn.label}</p>
            <p style={{ fontSize: 11, color: T.ink2, margin: 0, fontFamily: font }}>{monetBtn.sub}</p>
          </div>
          {monetBtn.disabled ? <Clock size={14} color={T.ink2} /> : <ChevronRight size={15} color={T.ink2} />}
        </button>
      </div>
    );
  };

  // ── Hero ──────────────────────────────────────────────────────────────────────
  const HeroBlock = () => {
    if (authLoading) return (
      <div style={{ background: T.surface, padding: '24px 16px 0' }}>
        <div style={{ display: 'flex', gap: 16, alignItems: 'center', marginBottom: 16 }}>
          <Shimmer w={80} h={80} r={40} />
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <Shimmer w="60%" h={22} r={6} />
            <Shimmer w="40%" h={14} r={4} />
          </div>
        </div>
        <Shimmer w="85%" h={14} r={4} />
        <div style={{ marginTop: 12 }}><Shimmer w="100%" h={44} r={8} /></div>
      </div>
    );
    if (!profile) return null;

    // Strip leading "@" if the DB value already includes it
    const username = profile.username
      ? profile.username.startsWith('@') ? profile.username : `@${profile.username}`
      : null;

    return (
      <div style={{ background: T.surface, borderBottom: `1px solid ${T.border}` }}>
        <div style={{ padding: '20px 16px 0', display: 'flex', alignItems: 'center', gap: 14 }}>
          {/* Avatar */}
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <div style={{ width: 80, height: 80, borderRadius: '50%', padding: 2.5, background: T.black, boxShadow: '0 0 0 2px #fff' }}>
              <Image
                src={profile.avatar}
                alt={profile.name}
                width={80}
                height={80}
                draggable={false}
                onContextMenu={e => e.preventDefault()}
                style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover', display: 'block' }}
              />
            </div>
            {/* Online dot */}
            <div style={{ position: 'absolute', bottom: 3, right: 2, width: 13, height: 13, borderRadius: '50%', background: netState === 'online' ? T.green : T.amber, border: '2.5px solid #fff', transition: 'background .4s' }} />
          </div>

        {/* Name + username + badge */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              <span style={{ fontFamily: font, fontSize: 20, fontWeight: 800, color: T.ink, letterSpacing: '-.02em', lineHeight: 1.2 }}>
                {profile.name}
              </span>
              {profile.verified && <VerifiedBadge size="md" />}
            </div>
            {username && (
              <p style={{ fontFamily: font, fontSize: 13, color: T.ink2, margin: '3px 0 0' }}>{username}</p>
            )}
            {/* Monetized Creator pill — dollar sign icon */}
            {monetStatus === 'approved' && (
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, marginTop: 6, padding: '3px 9px', borderRadius: 20, background: 'rgba(5,5,5,.06)', border: `1px solid rgba(5,5,5,.12)` }}>
                <span style={{ fontFamily: font, fontSize: 11, fontWeight: 800, color: T.ink, lineHeight: 1 }}>$</span>
                <span style={{ fontFamily: font, fontSize: 10, fontWeight: 600, color: T.ink, letterSpacing: '.04em' }}>Monetized Creator</span>
              </div>
            )}
          </div>
        </div>

        {/* Bio */}
        {profile.bio && (
          <p style={{ fontFamily: font, fontSize: 14, color: T.ink2, lineHeight: 1.55, margin: '12px 16px 0' }}>
            {profile.bio}
          </p>
        )}

        {/* Stats */}
        <div style={{ padding: '0 16px' }}>
          <StatsBar />
        </div>

        {/* Action buttons */}
        <ActionButtons />
      </div>
    );
  };

  // ── Wall grid — images block long-press/context menu ─────────────────────────
  const WallGrid = () => (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 2 }}>
      {walls.slice(0, 9).map(wp => (
        <button
          key={wp.id}
          className="cell"
          onClick={() => router.push(`/details/${wp.id}`)}
          onContextMenu={e => e.preventDefault()}
          style={{ aspectRatio: '3/4', border: 'none', padding: 0, cursor: 'pointer', background: '#e8e8e8', overflow: 'hidden', display: 'block', position: 'relative', WebkitUserSelect: 'none', userSelect: 'none' }}
        >
          <Image
            src={wp.thumbnail || wp.url}
            alt={wp.title}
            fill
            sizes="(max-width: 680px) 33vw, 226px"
            loading="lazy"
            draggable={false}
            onContextMenu={e => e.preventDefault()}
            style={{ objectFit: 'cover', display: 'block', WebkitUserSelect: 'none', userSelect: 'none', WebkitTouchCallout: 'none' } as React.CSSProperties}
          />
        </button>
      ))}
    </div>
  );

  const EmptyTab = ({ msg }: { msg: string }) => (
    <div style={{ padding: '44px 24px', textAlign: 'center', background: T.surface }}>
      <p style={{ fontFamily: font, fontSize: 15, fontWeight: 700, color: T.ink, margin: '0 0 6px' }}>Nothing here yet</p>
      <p style={{ fontFamily: font, fontSize: 13, color: T.ink2, margin: 0 }}>{msg}</p>
    </div>
  );

  // ── RENDER ────────────────────────────────────────────────────────────────────
  return (
    <div style={{ fontFamily: font, background: T.bg, minHeight: '100dvh', paddingBottom: 80 }}>
      <style>{GLOBAL_CSS}</style>
      <NetBanner state={netState} onRetry={fetchMonetization} />

      <div style={{ maxWidth: isDesktop ? 680 : '100%', margin: '0 auto' }}>

        {/* BLACK HEADER WITH BACK BUTTON */}
        <div style={{
          position: 'sticky', top: 0, zIndex: 100,
          background: '#050505',
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '0 12px',
          height: 52,
          borderBottom: '1px solid rgba(255,255,255,.08)',
        }}>
          <button
            className="tap"
            onClick={() => router.back()}
            style={{
              width: 36, height: 36, borderRadius: '50%',
              border: 'none', background: 'rgba(255,255,255,.12)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', flexShrink: 0,
            }}
            aria-label="Go back"
          >
            <ChevronLeft size={20} color="#ffffff" strokeWidth={2.5} />
          </button>
          <span style={{
            fontFamily: font, fontSize: 17, fontWeight: 700,
            color: '#ffffff', letterSpacing: '-.01em',
            flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {profile?.name ?? 'Profile'}
          </span>
        </div>

        {/* HERO */}
        <div className="up"><HeroBlock /></div>

        {/* TABS — Posts + Photos only */}
        <div className="up d1" style={{ background: T.surface, marginTop: 8, borderTop: `1px solid ${T.border}`, borderBottom: `1px solid ${T.border}` }}>
          <Tabs />
        </div>

        {/* CONTENT */}
        <div className="up d2">
          {activeTab === 'posts' && (
            walls.length > 0
              ? <>
                  <WallGrid />
                  {walls.length > 9 && (
                    <button className="tap" onClick={() => open('allPosts')}
                      style={{ width: '100%', padding: '14px 0', background: T.surface, border: 'none', borderTop: `1px solid ${T.border}`, fontFamily: font, fontSize: 14, fontWeight: 600, color: T.ink, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                      <Grid size={15} color={T.ink} /> View all posts
                    </button>
                  )}
                </>
              : <EmptyTab msg="Upload your first wallpaper to get started." />
          )}

          {/* Photos tab — shows wall grid + always-visible View All Posts button */}
          {activeTab === 'photos' && (
            walls.length > 0
              ? <>
                  <WallGrid />
                  <button className="tap" onClick={() => open('allPosts')}
                    style={{ width: '100%', padding: '14px 0', background: T.surface, border: 'none', borderTop: `1px solid ${T.border}`, fontFamily: font, fontSize: 14, fontWeight: 600, color: T.ink, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                    <Grid size={15} color={T.ink} /> View all posts
                  </button>
                </>
              : <EmptyTab msg="Your photos will appear here." />
          )}
        </div>

        {/* MONETIZATION */}
        <div className="up d3" style={{ background: T.surface, marginTop: 8, borderTop: `1px solid ${T.border}`, borderBottom: `1px solid ${T.border}`, paddingTop: 14 }}>
          <p style={{ fontFamily: font, fontSize: 11, fontWeight: 700, color: T.ink3, padding: '0 16px 8px', textTransform: 'uppercase', letterSpacing: '.07em' }}>Creator</p>
          <MonetRow />
        </div>

        {/* MENU TILE GRID */}
        <div className="up d4" style={{ background: T.surface, marginTop: 8, borderTop: `1px solid ${T.border}`, borderBottom: `1px solid ${T.border}` }}>
          <p style={{ fontFamily: font, fontSize: 11, fontWeight: 700, color: T.ink3, padding: '16px 16px 0', textTransform: 'uppercase', letterSpacing: '.07em' }}>Menu</p>
          <MenuTileGrid />
        </div>

      </div>

      <Navigation />

      {/* LOGOUT SHEET */}
      {modals.logout && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(0,0,0,.45)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', animation: 'fadeIn .2s' }}>
          <div style={{ width: '100%', maxWidth: 680, background: T.surface, borderRadius: '20px 20px 0 0', padding: '24px 20px 32px', fontFamily: font }}>
            <div style={{ width: 36, height: 4, borderRadius: 2, background: T.border, margin: '0 auto 20px' }} />
            <div style={{ width: 48, height: 48, borderRadius: 14, background: 'rgba(228,30,63,.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
              <LogOut size={22} color={T.red} />
            </div>
            <p style={{ fontSize: 18, fontWeight: 700, margin: '0 0 7px', color: T.ink }}>Log out?</p>
            <p style={{ fontSize: 13, color: T.ink2, lineHeight: 1.55, margin: '0 0 22px' }}>You'll need to sign in again to access your account.</p>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="tap" onClick={() => setModals(m => ({ ...m, logout: false }))}
                style={{ flex: 1, padding: '13px 0', borderRadius: 10, border: `1px solid ${T.border}`, background: T.tile, fontFamily: font, fontSize: 14, fontWeight: 600, color: T.ink, cursor: 'pointer' }}>
                Cancel
              </button>
              <button className="tap" onClick={handleLogout}
                style={{ flex: 1, padding: '13px 0', borderRadius: 10, border: 'none', background: T.red, fontFamily: font, fontSize: 14, fontWeight: 600, color: '#fff', cursor: 'pointer' }}>
                Log Out
              </button>
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