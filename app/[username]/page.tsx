'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ChevronLeft, Grid, AlertTriangle, WifiOff, Home } from 'lucide-react';
import Image from 'next/image';
import { VerifiedBadge } from '@/app/components/VerifiedBadge';
import { useAuth } from '@/app/components/AuthProvider';
import { fetchProfileByUsername, fetchUserWallpapers, getUserCounts, checkIsFollowing, followUser, unfollowUser } from '@/lib/stores/wallpaperStore';
import type { Wallpaper } from '@/app/types';

// ── Cache ─────────────────────────────────────────────────────────────────────
type CacheEntry<T> = { data: T; cachedAt: number };
const cache = new Map<string, CacheEntry<unknown>>();
const PROFILE_TTL = 5 * 60 * 1000, POSTS_TTL = 2 * 60 * 1000;
const cacheSet = <T,>(k: string, d: T) => cache.set(k, { data: d, cachedAt: Date.now() });
const cacheIsStale = (k: string, ttl: number) => { const e = cache.get(k); return !e || Date.now() - e.cachedAt > ttl; };

// ── Constants ─────────────────────────────────────────────────────────────────
const COOLDOWN_MS = 3 * 60 * 60 * 1000, RAPID_THRESHOLD = 4, PAGE_SIZE = 19;
const cooldownKey = (uid: string, tid: string) => `follow_cooldown_${uid}_${tid}`;
const fmt = (n: number) => n >= 1_000_000 ? `${(n / 1e6).toFixed(1)}M` : n >= 1_000 ? `${(n / 1e3).toFixed(1)}K` : String(n);

// ── Tokens ────────────────────────────────────────────────────────────────────
const T = {
  bg: '#f0f2f5', surface: '#fff', border: 'rgba(0,0,0,.08)',
  ink: '#050505', ink2: '#65676b', ink3: 'rgba(5,5,5,.3)',
  black: '#050505', tile: '#e4e6eb',
  green: '#42b72a', red: '#e41e3f', amber: '#f59e0b',
};
const font = "'Inter', -apple-system, BlinkMacSystemFont, sans-serif";

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
  *,*::before,*::after { box-sizing: border-box; margin: 0; padding: 0; }

  @keyframes shimmer   { 0%,100%{background-position:200% 0} 50%{background-position:-200% 0} }
  @keyframes up        { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
  @keyframes fadeIn    { from{opacity:0} to{opacity:1} }
  @keyframes slideDown { from{opacity:0;transform:translateY(-100%)} to{opacity:1;transform:translateY(0)} }
  @keyframes slideUp   { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
  @keyframes stickyIn  { from{opacity:0;transform:translateY(-64px)} to{opacity:1;transform:translateY(0)} }
  @keyframes stickyOut { from{opacity:1;transform:translateY(0)} to{opacity:0;transform:translateY(-64px)} }
  @keyframes spin      { to{transform:rotate(360deg)} }

  @keyframes rise    { 0%,100%{opacity:.1;transform:scale(.7)} 35%{opacity:1;transform:scale(1)} 65%{opacity:.1;transform:scale(.7)} }
  @keyframes riseDim { 0%,100%{opacity:.04;transform:scale(.7)} 35%{opacity:.35;transform:scale(1)} 65%{opacity:.04;transform:scale(.7)} }
  .sq     { animation: rise    1.2s ease-in-out infinite; transform-box:fill-box; transform-origin:center; }
  .sq-dim { animation: riseDim 1.2s ease-in-out infinite; transform-box:fill-box; transform-origin:center; }

  .up { animation: up .38s cubic-bezier(.16,1,.3,1) both; }
  .d1 { animation-delay: .05s; }
  .d2 { animation-delay: .10s; }
  .tap:active  { filter: brightness(.88); }
  .cell:active { opacity: .72; }
  img { -webkit-user-select:none; user-select:none; pointer-events:none; -webkit-touch-callout:none; }
  button img { pointer-events: none; }
  .sticky-enter { animation: stickyIn  .26s cubic-bezier(.16,1,.3,1) both; }
  .sticky-exit  { animation: stickyOut .20s ease forwards; }
`;

// ── Logo squares: sequence 1→2→4→3 ───────────────────────────────────────────
const SQ = [
  { x: 0,  y: 0,  delay: '0s',  dim: false },
  { x: 11, y: 0,  delay: '.2s', dim: false },
  { x: 11, y: 11, delay: '.4s', dim: true  },
  { x: 0,  y: 11, delay: '.6s', dim: false },
];

const WallsLoader = ({ size = 56, color = '#050505' }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 20 20" fill="none">
    {SQ.map((s, i) => (
      <rect key={i} className={s.dim ? 'sq-dim' : 'sq'} x={s.x} y={s.y} width="9" height="9" rx="2" fill={color} style={{ animationDelay: s.delay }} />
    ))}
  </svg>
);

const Spinner = ({ size = 13, color = '#fff' }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 14 14" style={{ animation: 'spin .7s linear infinite', flexShrink: 0 }}>
    <circle cx="7" cy="7" r="5.5" fill="none" stroke={color} strokeWidth="2" strokeOpacity=".25" />
    <path d="M7 1.5a5.5 5.5 0 0 1 5.5 5.5" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" />
  </svg>
);

const Shimmer = ({ w, h, r = 8 }: { w: string | number; h: string | number; r?: number }) => (
  <div style={{ width: w, height: h, borderRadius: r, flexShrink: 0, background: 'linear-gradient(90deg,#e8e8e8 25%,#f4f4f4 50%,#e8e8e8 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.4s ease infinite' }} />
);

// ── Full-screen loader ────────────────────────────────────────────────────────
const PageLoader = () => (
  <div style={{ minHeight: '100dvh', background: T.bg, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 18 }}>
    <WallsLoader size={64} color={T.black} />
    <span style={{ fontFamily: font, fontSize: 11, fontWeight: 600, color: T.ink3, letterSpacing: '.08em', textTransform: 'uppercase' }}>Loading</span>
  </div>
);

// ── Profile not found ─────────────────────────────────────────────────────────
const ProfileNotFound = ({ username, onBack }: { username: string; onBack: () => void }) => (
  <div style={{ minHeight: '100dvh', background: T.bg, display: 'flex', flexDirection: 'column', fontFamily: font }}>
    <div style={{ background: T.surface, display: 'flex', alignItems: 'center', gap: 10, padding: '0 12px', height: 64, borderBottom: `1px solid rgba(0,0,0,.08)` }}>
      <button className="tap" onClick={onBack} style={{ width: 36, height: 36, borderRadius: '50%', border: 'none', background: T.tile, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
        <ChevronLeft size={20} color={T.ink} strokeWidth={2.5} />
      </button>
      <span style={{ fontFamily: font, fontSize: 16, fontWeight: 700, color: T.ink }}>Profile</span>
    </div>

    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 32px', textAlign: 'center' }}>
      {/* Ghost avatar */}
      <div style={{ position: 'relative', width: 96, height: 96, marginBottom: 28 }}>
        <div style={{ width: 96, height: 96, borderRadius: '50%', background: 'linear-gradient(135deg,#e8e8e8,#d0d0d0)', border: `3px solid ${T.surface}`, boxShadow: '0 0 0 1px rgba(0,0,0,.06),0 8px 32px rgba(0,0,0,.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="38" height="38" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="8" r="4" fill="rgba(0,0,0,.18)" />
            <path d="M4 20c0-4 3.582-7 8-7s8 3 8 7" stroke="rgba(0,0,0,.18)" strokeWidth="2" strokeLinecap="round" fill="none" />
          </svg>
        </div>
        <div style={{ position: 'absolute', bottom: 2, right: 2, width: 26, height: 26, borderRadius: '50%', background: T.tile, border: `2.5px solid ${T.surface}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontFamily: font, fontSize: 13, fontWeight: 800, color: T.ink3 }}>?</span>
        </div>
      </div>

      <div style={{ display: 'inline-flex', alignItems: 'center', background: T.tile, borderRadius: 100, padding: '5px 14px', marginBottom: 18 }}>
        <span style={{ fontFamily: font, fontSize: 13, fontWeight: 600, color: T.ink2 }}>@{username}</span>
      </div>

      <h1 style={{ fontFamily: font, fontSize: 22, fontWeight: 900, color: T.ink, letterSpacing: '-.03em', lineHeight: 1.15, marginBottom: 10 }}>
        This account<br />doesn't exist
      </h1>
      <p style={{ fontFamily: font, fontSize: 14, color: T.ink2, lineHeight: 1.6, maxWidth: 260, marginBottom: 32 }}>
        The username <strong style={{ color: T.ink }}>@{username}</strong> hasn't been claimed yet — or the link might be wrong.
      </p>

      <div style={{ display: 'flex', gap: 5, marginBottom: 32 }}>
        {[0, 1, 2].map(i => <div key={i} style={{ width: 4, height: 4, borderRadius: '50%', background: T.tile, border: `1px solid ${T.border}` }} />)}
      </div>

      <button className="tap" onClick={onBack}
        style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '13px 28px', borderRadius: 12, border: 'none', background: T.black, color: '#fff', fontFamily: font, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
        <Home size={15} color="#fff" />
        Back to Home
      </button>
      <p style={{ fontFamily: font, fontSize: 12, color: T.ink3, marginTop: 14 }}>Think this is a mistake? Check the link again.</p>
    </div>
  </div>
);

// ── Nav style ─────────────────────────────────────────────────────────────────
const navStyle: React.CSSProperties = {
  background: T.surface, display: 'flex', alignItems: 'center', gap: 8,
  padding: '0 8px', height: 64, borderBottom: `1px solid rgba(0,0,0,.08)`,
};

// ─────────────────────────────────────────────────────────────────────────────
export default function UserProfilePage() {
  const router = useRouter();
  const { username } = useParams() as { username: string };
  const { session } = useAuth();

  const [profile,       setProfile]       = useState<any>(null);
  const [resolvedId,    setResolvedId]    = useState<string | null>(null);
  const [notFound,      setNotFound]      = useState(false);
  const [stats,         setStats]         = useState({ followers: 0, following: 0, posts: 0 });
  const [isFollowing,   setIsFollowing]   = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [pageLoading,   setPageLoading]   = useState(true);
  const [posts,         setPosts]         = useState<Wallpaper[]>([]);
  const [postsLoading,  setPostsLoading]  = useState(true);
  const [page,          setPage]          = useState(0);
  const [hasMore,       setHasMore]       = useState(false);
  const [showWarning,   setShowWarning]   = useState(false);
  const [cooldownLeft,  setCooldownLeft]  = useState('');
  const [isOnline,      setIsOnline]      = useState(true);
  const [showOffline,   setShowOffline]   = useState(false);
  const [reconnecting,  setReconnecting]  = useState(false);
  const [showSticky,    setShowSticky]    = useState(false);
  const [stickyClass,   setStickyClass]   = useState('sticky-enter');

  const navRef      = useRef<HTMLDivElement>(null);
  const navGone     = useRef(false);
  const lastScrollY = useRef(0);
  const ticking     = useRef(false);
  const hideTimer   = useRef<ReturnType<typeof setTimeout> | null>(null);
  const offlineTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tapCount    = useRef(0);
  const tapTimer    = useRef<ReturnType<typeof setTimeout> | null>(null);

  const profileKey = `profile:${username}`;
  const statsKey   = (id: string) => `stats:${id}`;
  const followKey  = (id: string) => `following:${session?.user.id}:${id}`;
  const postsKey   = (id: string) => `posts:${id}:0`;
  const isOwn      = resolvedId ? session?.user.id === resolvedId : false;

  // ── IntersectionObserver ──────────────────────────────────────────────────
  useEffect(() => {
    const el = navRef.current; if (!el) return;
    const obs = new IntersectionObserver(([e]) => { navGone.current = !e.isIntersecting; }, { threshold: 0 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  // ── Scroll-direction sticky ───────────────────────────────────────────────
  useEffect(() => {
    const onScroll = () => {
      if (ticking.current) return;
      ticking.current = true;
      requestAnimationFrame(() => {
        const y = window.scrollY;
        const goingUp = y < lastScrollY.current;
        lastScrollY.current = y;
        ticking.current = false;
        if (navGone.current && goingUp) {
          if (hideTimer.current) { clearTimeout(hideTimer.current); hideTimer.current = null; }
          setStickyClass('sticky-enter'); setShowSticky(true);
        } else if (!goingUp && showSticky) {
          setStickyClass('sticky-exit');
          hideTimer.current = setTimeout(() => setShowSticky(false), 200);
        }
      });
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => { window.removeEventListener('scroll', onScroll); if (hideTimer.current) clearTimeout(hideTimer.current); };
  }, [showSticky]);

  // ── Load profile by username ──────────────────────────────────────────────
  const loadProfile = useCallback(async (force = false) => {
    if (!username) return;
    const cp  = cache.get(profileKey)?.data as any;
    const cid = cp?.id as string | undefined;
    if (cp && cid) {
      setProfile(cp); setResolvedId(cid);
      const cs = cache.get(statsKey(cid))?.data as any;
      const cf = cache.get(followKey(cid))?.data as boolean | undefined;
      if (cs) setStats(cs);
      if (cf !== undefined) setIsFollowing(cf);
      setPageLoading(false);
      if (!cacheIsStale(profileKey, PROFILE_TTL) && !force) return;
    }
    try {
      const p = await fetchProfileByUsername(username);
      if (!p) { setNotFound(true); setPageLoading(false); return; }
      const id = p.id;
      setProfile(p); setResolvedId(id); setNotFound(false); cacheSet(profileKey, p);
      const s = await getUserCounts(id);
      cacheSet(statsKey(id), s); setStats(s);
      if (session && session.user.id !== id) {
        const cf = cache.get(followKey(id))?.data as boolean | undefined;
        if (cf === undefined || force) { const f = await checkIsFollowing(session.user.id, id); cacheSet(followKey(id), f); setIsFollowing(f); }
      }
    } catch { if (!cache.get(profileKey)) setNotFound(true); }
    finally { setPageLoading(false); }
  }, [username, session]); // eslint-disable-line

  const loadPosts = useCallback(async (force = false, id?: string) => {
    const uid = id || resolvedId; if (!uid) return;
    const key = postsKey(uid);
    const cp  = cache.get(key)?.data as { wallpapers: Wallpaper[]; hasMore: boolean } | undefined;
    if (cp) { setPosts(cp.wallpapers); setHasMore(cp.hasMore); setPostsLoading(false); if (!cacheIsStale(key, POSTS_TTL) && !force) return; }
    if (!cp) setPostsLoading(true);
    try {
      const { wallpapers, hasMore: more } = await fetchUserWallpapers(uid, 0, PAGE_SIZE);
      cacheSet(key, { wallpapers, hasMore: more }); setPosts(wallpapers); setHasMore(more); setPage(0);
    } catch (e) { console.error(e); }
    finally { setPostsLoading(false); }
  }, [resolvedId]); // eslint-disable-line

  useEffect(() => { loadProfile(); }, [loadProfile]);
  useEffect(() => { if (resolvedId) loadPosts(false, resolvedId); }, [resolvedId]); // eslint-disable-line

  // ── Online/offline ────────────────────────────────────────────────────────
  useEffect(() => {
    const onOff = () => { setIsOnline(false); setShowOffline(true); if (offlineTimer.current) clearTimeout(offlineTimer.current); };
    const onOn  = async () => {
      setIsOnline(true); setReconnecting(true);
      try { await Promise.all([loadProfile(true), loadPosts(true)]); } catch {}
      finally { setReconnecting(false); offlineTimer.current = setTimeout(() => setShowOffline(false), 2200); }
    };
    window.addEventListener('online', onOn); window.addEventListener('offline', onOff);
    if (!navigator.onLine) { setIsOnline(false); setShowOffline(true); }
    return () => { window.removeEventListener('online', onOn); window.removeEventListener('offline', onOff); if (offlineTimer.current) clearTimeout(offlineTimer.current); };
  }, [loadProfile, loadPosts]);

  // ── Follow ────────────────────────────────────────────────────────────────
  const getCooldownUntil = (): number | null => {
    if (!session || !resolvedId) return null;
    const v = localStorage.getItem(cooldownKey(session.user.id, resolvedId));
    if (!v) return null; const u = Number(v); return Date.now() < u ? u : null;
  };
  const fmtRemaining = (u: number) => { const ms = u - Date.now(), h = Math.floor(ms / 3_600_000), m = Math.floor((ms % 3_600_000) / 60_000); return h > 0 ? `${h}h ${m}m` : `${m}m`; };
  const loadMore = async () => {
    if (!resolvedId) return;
    const next = page + 1;
    const { wallpapers, hasMore: more } = await fetchUserWallpapers(resolvedId, next, PAGE_SIZE);
    setPosts(p => [...p, ...wallpapers]); setHasMore(more); setPage(next);
  };
  const handleFollow = async () => {
    if (!session || !resolvedId || followLoading) return;
    const until = getCooldownUntil();
    if (until) { setCooldownLeft(fmtRemaining(until)); setShowWarning(true); return; }
    tapCount.current += 1;
    if (tapTimer.current) clearTimeout(tapTimer.current);
    tapTimer.current = setTimeout(() => { tapCount.current = 0; }, 5000);
    if (tapCount.current >= RAPID_THRESHOLD) { const lock = Date.now() + COOLDOWN_MS; localStorage.setItem(cooldownKey(session.user.id, resolvedId), String(lock)); tapCount.current = 0; setCooldownLeft(fmtRemaining(lock)); setShowWarning(true); return; }
    setFollowLoading(true);
    try {
      const fk = followKey(resolvedId), sk = statsKey(resolvedId);
      if (isFollowing) { await unfollowUser(session.user.id, resolvedId); setIsFollowing(false); cacheSet(fk, false); setStats(s => ({ ...s, followers: s.followers - 1 })); }
      else             { await followUser(session.user.id, resolvedId);   setIsFollowing(true);  cacheSet(fk, true);  setStats(s => ({ ...s, followers: s.followers + 1 })); }
      cache.delete(sk);
    } catch (e) { console.error(e); }
    finally { setFollowLoading(false); }
  };

  const locked         = !!getCooldownUntil();
  const followDisabled = followLoading || locked || !isOnline;
  const statItems      = [{ label: 'Posts', val: stats.posts }, { label: 'Followers', val: stats.followers }, { label: 'Following', val: stats.following }];

  const NavInner = () => (
    <>
      <button className="tap" onClick={() => router.back()} aria-label="Go back"
        style={{ width: 36, height: 36, borderRadius: '50%', border: 'none', background: T.tile, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
        <ChevronLeft size={20} color={T.ink} strokeWidth={2.5} />
      </button>
      {profile ? (
        <div style={{ width: 36, height: 36, borderRadius: '50%', overflow: 'hidden', flexShrink: 0, border: `1.5px solid ${T.border}` }}>
          <Image src={profile.avatar} alt={profile.name} width={36} height={36} draggable={false} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
        </div>
      ) : <Shimmer w={36} h={36} r={18} />}
      {profile
        ? <span style={{ fontFamily: font, fontSize: 16, fontWeight: 700, color: T.ink, letterSpacing: '-.01em', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{profile.name}</span>
        : <div style={{ flex: 1 }}><Shimmer w="40%" h={14} r={6} /></div>}
    </>
  );

  // ── Show loader ───────────────────────────────────────────────────────────
  if (pageLoading) return <><style>{CSS}</style><PageLoader /></>;

  // ── Not found ─────────────────────────────────────────────────────────────
  if (notFound) return <><style>{CSS}</style><ProfileNotFound username={username} onBack={() => router.push('/')} /></>;

  
  // ── Main ──────────────────────────────────────────────────────────────────
  return (
    <div style={{ fontFamily: font, background: T.bg, minHeight: '100dvh', color: T.ink, maxWidth: 680, margin: '0 auto', paddingBottom: 40 }}>
      <style>{CSS}</style>

      {/* Offline banner */}
      {showOffline && (
        <div style={{ position: 'fixed', top: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: 680, zIndex: 200, background: isOnline ? '#16a34a' : T.red, padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 8, animation: 'slideDown .3s ease', fontFamily: font, transition: 'background .4s ease' }}>
          {isOnline
            ? reconnecting ? <><Spinner size={13} /><span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: '#fff' }}>Reconnected — refreshing…</span></> : <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: '#fff' }}>✓ Back online</span>
            : <><WifiOff size={13} color="#fff" /><span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: '#fff' }}>No internet connection</span></>}
        </div>
      )}

      {/* Sticky nav — scroll UP only */}
      {showSticky && (
        <div className={stickyClass} style={{ position: 'fixed', top: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: 680, zIndex: 150, ...navStyle, boxShadow: '0 1px 0 rgba(0,0,0,.06),0 4px 16px rgba(0,0,0,.06)' }}>
          <NavInner />
        </div>
      )}

      {/* Normal nav */}
      <div ref={navRef} style={navStyle}><NavInner /></div>

      {/* Hero card */}
      <div className="up" style={{ background: T.surface, borderBottom: `1px solid ${T.border}` }}>
        <div style={{ padding: '20px 16px 0', display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <div style={{ width: 80, height: 80, borderRadius: '50%', padding: 2.5, background: T.black, boxShadow: '0 0 0 2px #fff' }}>
              <Image src={profile.avatar} alt={profile.name} width={80} height={80} draggable={false} onContextMenu={e => e.preventDefault()}
                style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover', display: 'block' }} />
            </div>
            <div style={{ position: 'absolute', bottom: 3, right: 2, width: 13, height: 13, borderRadius: '50%', background: isOnline ? T.green : T.amber, border: '2.5px solid #fff', transition: 'background .4s' }} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              <span style={{ fontFamily: font, fontSize: 20, fontWeight: 800, color: T.ink, letterSpacing: '-.02em', lineHeight: 1.2 }}>{profile.name}</span>
              {profile.verified && <VerifiedBadge size="md" />}
            </div>
            {profile.username && <p style={{ fontFamily: font, fontSize: 13, color: T.ink2, margin: '3px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>@{profile.username}</p>}
          </div>
          {session && !isOwn && (
            <button className="tap" onClick={handleFollow} disabled={followDisabled}
              style={{ flexShrink: 0, minWidth: 92, height: 38, padding: '0 16px', borderRadius: 8, border: isFollowing ? `1px solid ${T.border}` : 'none', background: isFollowing ? T.tile : T.black, color: isFollowing ? T.ink : '#fff', fontFamily: font, fontSize: 14, fontWeight: 600, cursor: followDisabled ? 'default' : 'pointer', opacity: (locked || !isOnline) ? 0.4 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, transition: 'all .18s' }}>
              {followLoading ? <><Spinner color={isFollowing ? T.ink2 : '#fff'} size={13} />{isFollowing ? 'Unfollowing…' : 'Following…'}</> : isFollowing ? 'Following' : 'Follow'}
            </button>
          )}
        </div>
        {profile.bio && <p style={{ fontFamily: font, fontSize: 14, color: T.ink2, lineHeight: 1.55, margin: '12px 16px 0' }}>{profile.bio}</p>}
        <div style={{ display: 'flex', borderTop: `1px solid ${T.border}`, margin: '12px 16px 0' }}>
          {statItems.map(({ label, val }, i, arr) => (
            <div key={label} style={{ flex: 1, padding: '12px 0', textAlign: 'center', borderRight: i < arr.length - 1 ? `1px solid ${T.border}` : 'none' }}>
              <p style={{ fontFamily: font, fontSize: 17, fontWeight: 700, color: T.ink, margin: '0 0 2px', letterSpacing: '-.01em' }}>{fmt(val)}</p>
              <p style={{ fontFamily: font, fontSize: 11, color: T.ink2, margin: 0, fontWeight: 500 }}>{label}</p>
            </div>
          ))}
        </div>
        <div style={{ height: 16 }} />
      </div>

      {/* Posts label */}
      <div className="up d1" style={{ background: T.surface, marginTop: 8, borderTop: `1px solid ${T.border}`, borderBottom: `1px solid ${T.border}`, display: 'flex', alignItems: 'center', gap: 7, padding: '14px 16px' }}>
        <Grid size={13} color={T.ink3} />
        <span style={{ fontFamily: font, fontSize: 10, fontWeight: 700, color: T.ink3, textTransform: 'uppercase', letterSpacing: '.07em' }}>{fmt(stats.posts || posts.length)} Wallpapers</span>
      </div>

      {/* Grid */}
      <div className="up d2">
        {postsLoading ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 2 }}>
            {[...Array(9)].map((_, i) => <Shimmer key={i} w="100%" h={160} r={0} />)}
          </div>
        ) : posts.length > 0 ? (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 2 }}>
              {posts.map(wp => (
                <button key={wp.id} className="cell" onClick={() => router.push(`/details/${wp.id}`)} onContextMenu={e => e.preventDefault()}
                  style={{ aspectRatio: '3/4', border: 'none', padding: 0, cursor: 'pointer', background: '#e8e8e8', overflow: 'hidden', display: 'block', position: 'relative', WebkitUserSelect: 'none', userSelect: 'none' }}>
                  <Image src={wp.thumbnail || wp.url} alt={wp.title} fill sizes="(max-width:680px) 33vw, 226px" loading="lazy" draggable={false} onContextMenu={e => e.preventDefault()} style={{ objectFit: 'cover', display: 'block' } as React.CSSProperties} />
                </button>
              ))}
            </div>
            {hasMore && (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '20px 0 40px' }}>
                <button className="tap" onClick={loadMore} disabled={!isOnline}
                  style={{ padding: '11px 32px', borderRadius: 10, border: `1px solid ${T.border}`, background: T.surface, color: T.ink2, fontFamily: font, fontSize: 13, fontWeight: 600, cursor: isOnline ? 'pointer' : 'default', opacity: isOnline ? 1 : 0.4 }}>
                  Load more
                </button>
              </div>
            )}
          </>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '60px 0', gap: 12, background: T.surface }}>
            <div style={{ width: 56, height: 56, borderRadius: '50%', background: T.tile, border: `1px solid ${T.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Grid size={22} color={T.ink3} />
            </div>
            <p style={{ fontFamily: font, fontSize: 14, color: T.ink3, margin: 0, fontWeight: 500 }}>No posts yet</p>
          </div>
        )}
      </div>

      {/* Warning sheet */}
      {showWarning && (
        <div onClick={() => setShowWarning(false)} style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(0,0,0,.45)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', animation: 'fadeIn .2s' }}>
          <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: 680, background: T.surface, borderRadius: '20px 20px 0 0', padding: '24px 20px 32px', fontFamily: font, animation: 'slideUp .28s cubic-bezier(.16,1,.3,1)' }}>
            <div style={{ width: 36, height: 4, borderRadius: 2, background: T.border, margin: '0 auto 20px' }} />
            <div style={{ width: 48, height: 48, borderRadius: 14, background: 'rgba(245,158,11,.08)', border: '1px solid rgba(245,158,11,.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
              <AlertTriangle size={22} color={T.amber} />
            </div>
            <p style={{ fontFamily: font, fontSize: 18, fontWeight: 700, margin: '0 0 7px', color: T.ink }}>Slow down!</p>
            <p style={{ fontFamily: font, fontSize: 13, color: T.ink2, lineHeight: 1.55, margin: '0 0 6px' }}>You're following and unfollowing too quickly.</p>
            <p style={{ fontFamily: font, fontSize: 13, color: T.ink2, lineHeight: 1.55, margin: '0 0 22px' }}>Try again in <span style={{ fontWeight: 700, color: T.ink }}>{cooldownLeft}</span>.</p>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="tap" onClick={() => setShowWarning(false)} style={{ flex: 1, padding: '13px 0', borderRadius: 10, border: `1px solid ${T.border}`, background: T.tile, fontFamily: font, fontSize: 14, fontWeight: 600, color: T.ink, cursor: 'pointer' }}>Cancel</button>
              <button className="tap" onClick={() => setShowWarning(false)} style={{ flex: 1, padding: '13px 0', borderRadius: 10, border: 'none', background: T.black, fontFamily: font, fontSize: 14, fontWeight: 600, color: '#fff', cursor: 'pointer' }}>Got it</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}