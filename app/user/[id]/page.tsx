'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ChevronLeft, Grid, AlertTriangle, WifiOff } from 'lucide-react';
import { VerifiedBadge } from '@/app/components/VerifiedBadge';
import { useAuth } from '@/app/components/AuthProvider';
import { fetchProfile, fetchUserWallpapers, getUserCounts, checkIsFollowing, followUser, unfollowUser } from '@/lib/stores/wallpaperStore';
import type { Wallpaper } from '@/app/types';

// ── Constants ─────────────────────────────────────────────────────────────────
const COOLDOWN_MS     = 3 * 60 * 60 * 1000;
const RAPID_THRESHOLD = 4;
const cooldownKey = (uid: string, tid: string) => `follow_cooldown_${uid}_${tid}`;

// ── Design tokens ─────────────────────────────────────────────────────────────
const fmt = (n: number) =>
  n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M` : n >= 1_000 ? `${(n / 1_000).toFixed(1)}k` : String(n);

const S = {
  bg:      '#f7f7f5',
  surface: '#ffffff',
  border:  'rgba(0,0,0,.08)',
  ink:     '#111110',
  ink2:    'rgba(17,17,16,.5)',
  ink3:    'rgba(17,17,16,.3)',
  amber:   '#d97706',
  red:     '#dc2626',
};

const Shimmer = ({ w, h, r = 8 }: { w: string | number; h: string | number; r?: number }) => (
  <div style={{ width: w, height: h, borderRadius: r, flexShrink: 0, background: 'linear-gradient(90deg,#e8e8e8 25%,#f0f0f0 50%,#e8e8e8 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.4s ease infinite' }} />
);

const Spinner = ({ color = '#fff', size = 13 }: { color?: string; size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 14 14" style={{ animation: 'spin .7s linear infinite', flexShrink: 0, display: 'block' }}>
    <circle cx="7" cy="7" r="5.5" fill="none" stroke={color} strokeWidth="2" strokeOpacity=".25" />
    <path d="M7 1.5a5.5 5.5 0 0 1 5.5 5.5" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" />
  </svg>
);

const iconBtn: React.CSSProperties = { width: 34, height: 34, borderRadius: '50%', background: 'rgba(0,0,0,.06)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' };
const col:     React.CSSProperties = { display: 'flex', flexDirection: 'column', alignItems: 'center' };
const row:     React.CSSProperties = { display: 'flex', alignItems: 'center' };

const PAGE_SIZE = 19;

// ─────────────────────────────────────────────────────────────────────────────

export default function UserProfilePage() {
  const router             = useRouter();
  const { id: userId }     = useParams() as { id: string };
  const { session }        = useAuth();

  const [profile,       setProfile]       = useState<any>(null);
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

  // ── Network state ─────────────────────────────────────────────────────────
  const [isOnline,      setIsOnline]      = useState(true);
  const [showOffline,   setShowOffline]   = useState(false);  // banner visible
  const [reconnecting,  setReconnecting]  = useState(false);  // spinner on reconnect
  const offlineTimer                      = useRef<ReturnType<typeof setTimeout> | null>(null);

  const tapCount = useRef(0);
  const tapTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isOwn    = session?.user.id === userId;

  // ── Data loaders (memoised so network handler can call them) ──────────────
  const loadProfile = useCallback(async () => {
    if (!userId) return;
    try {
      const [userProfile, userStats] = await Promise.all([fetchProfile(userId), getUserCounts(userId)]);
      if (!userProfile) { router.replace('/'); return; }
      setProfile(userProfile);
      setStats(userStats);
      if (session && !isOwn) setIsFollowing(await checkIsFollowing(session.user.id, userId));
    } catch { router.replace('/'); }
    finally { setPageLoading(false); }
  }, [userId, session]);

  const loadPosts = useCallback(async () => {
    if (!userId) return;
    setPostsLoading(true);
    try {
      const { wallpapers, hasMore: more } = await fetchUserWallpapers(userId, 0, PAGE_SIZE);
      setPosts(wallpapers);
      setHasMore(more);
      setPage(0);
    } catch (e) { console.error(e); }
    finally { setPostsLoading(false); }
  }, [userId]);

  // ── Initial fetch ─────────────────────────────────────────────────────────
  useEffect(() => { loadProfile(); }, [loadProfile]);
  useEffect(() => { loadPosts();   }, [loadPosts]);

  // ── Network listeners ─────────────────────────────────────────────────────
  useEffect(() => {
    const handleOffline = () => {
      setIsOnline(false);
      setShowOffline(true);
      if (offlineTimer.current) clearTimeout(offlineTimer.current);
    };

    const handleOnline = async () => {
      setIsOnline(true);
      setReconnecting(true);
      // Auto-refetch everything when connection is restored
      try {
        await Promise.all([loadProfile(), loadPosts()]);
      } catch { /* silent — loaders handle errors */ }
      finally {
        setReconnecting(false);
        // Hide banner after a short "Back online" moment
        offlineTimer.current = setTimeout(() => setShowOffline(false), 2200);
      }
    };

    window.addEventListener('online',  handleOnline);
    window.addEventListener('offline', handleOffline);
    // Seed from navigator in case page loaded offline
    if (!navigator.onLine) { setIsOnline(false); setShowOffline(true); }

    return () => {
      window.removeEventListener('online',  handleOnline);
      window.removeEventListener('offline', handleOffline);
      if (offlineTimer.current) clearTimeout(offlineTimer.current);
    };
  }, [loadProfile, loadPosts]);

  // ── Helpers ───────────────────────────────────────────────────────────────
  const getCooldownUntil = (): number | null => {
    if (!session) return null;
    const stored = localStorage.getItem(cooldownKey(session.user.id, userId));
    if (!stored) return null;
    const until = Number(stored);
    return Date.now() < until ? until : null;
  };

  const fmtRemaining = (until: number) => {
    const ms = until - Date.now();
    const h  = Math.floor(ms / 3_600_000);
    const m  = Math.floor((ms % 3_600_000) / 60_000);
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  };

  const loadMore = async () => {
    const next = page + 1;
    const { wallpapers, hasMore: more } = await fetchUserWallpapers(userId, next, PAGE_SIZE);
    setPosts(p => [...p, ...wallpapers]);
    setHasMore(more);
    setPage(next);
  };

  // ── Follow handler ────────────────────────────────────────────────────────
  const handleFollow = async () => {
    if (!session || followLoading) return;

    const until = getCooldownUntil();
    if (until) { setCooldownLeft(fmtRemaining(until)); setShowWarning(true); return; }

    tapCount.current += 1;
    if (tapTimer.current) clearTimeout(tapTimer.current);
    tapTimer.current = setTimeout(() => { tapCount.current = 0; }, 5000);

    if (tapCount.current >= RAPID_THRESHOLD) {
      const lockUntil = Date.now() + COOLDOWN_MS;
      localStorage.setItem(cooldownKey(session.user.id, userId), String(lockUntil));
      tapCount.current = 0;
      setCooldownLeft(fmtRemaining(lockUntil));
      setShowWarning(true);
      return;
    }

    setFollowLoading(true);
    try {
      if (isFollowing) {
        await unfollowUser(session.user.id, userId);
        setIsFollowing(false);
        setStats(s => ({ ...s, followers: s.followers - 1 }));
      } else {
        await followUser(session.user.id, userId);
        setIsFollowing(true);
        setStats(s => ({ ...s, followers: s.followers + 1 }));
      }
    } catch (e) { console.error(e); }
    finally { setFollowLoading(false); }
  };

  const statItems = [
    { label: 'Posts',     val: stats.posts     },
    { label: 'Followers', val: stats.followers },
    { label: 'Following', val: stats.following },
  ];

  const locked = !!getCooldownUntil();

  return (
    <div style={{ minHeight: '100dvh', background: S.bg, fontFamily: "'DM Sans', system-ui, sans-serif", color: S.ink, maxWidth: 600, margin: '0 auto', paddingBottom: 40 }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@400;500;600;700&display=swap');
        @keyframes shimmer  { 0%,100%{background-position:200% 0} 50%{background-position:-200% 0} }
        @keyframes up       { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:translateY(0)} }
        @keyframes fadeIn   { from{opacity:0} to{opacity:1} }
        @keyframes slideUp  { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
        @keyframes slideDown{ from{opacity:0;transform:translateY(-100%)} to{opacity:1;transform:translateY(0)} }
        @keyframes spin     { to{transform:rotate(360deg)} }
        .up  { animation: up .42s cubic-bezier(.16,1,.3,1) both; }
        .d1  { animation-delay:.06s } .d2 { animation-delay:.12s } .d3 { animation-delay:.18s }
        .tap:active  { opacity:.55 }
        .cell:active { opacity:.75 }
        .banner      { animation: slideDown .3s cubic-bezier(.16,1,.3,1); }
      `}</style>

      {/* ── Offline / reconnecting banner ── */}
      {showOffline && (
        <div className="banner" style={{
          position: 'fixed', top: 0, left: '50%', transform: 'translateX(-50%)',
          width: '100%', maxWidth: 600, zIndex: 50,
          background: isOnline ? '#16a34a' : S.red,
          padding: '10px 18px', display: 'flex', alignItems: 'center', gap: 10,
          transition: 'background .4s ease',
        }}>
          {isOnline ? (
            reconnecting
              ? <><Spinner color="#fff" size={14} /><span style={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>Reconnected — refreshing…</span></>
              : <span style={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>✓ Back online</span>
          ) : (
            <><WifiOff size={14} color="#fff" /><span style={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>No internet connection</span></>
          )}
        </div>
      )}

      {/* ── Sticky header ── */}
      <div style={{ position: 'sticky', top: 0, zIndex: 30, ...row, justifyContent: 'space-between', padding: '13px 16px', background: 'rgba(247,247,245,.92)', backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)', borderBottom: `1px solid ${S.border}` }}>
        <div style={{ ...row, gap: 10 }}>
          <button className="tap" onClick={() => router.back()} style={iconBtn}>
            <ChevronLeft size={18} color={S.ink} strokeWidth={2.5} />
          </button>
          {!pageLoading && profile && (
            <span style={{ fontFamily: "'Syne', sans-serif", fontSize: 15, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 200 }}>{profile.name}</span>
          )}
        </div>
        <div style={{ width: 34 }} />
      </div>

      {/* ── Skeleton ── */}
      {pageLoading ? (
        <div style={{ paddingTop: 16 }}>
          <div style={{ ...col, padding: '32px 20px 20px', gap: 12 }}>
            <Shimmer w={90} h={90} r={24} />
            <Shimmer w={160} h={22} />
            <Shimmer w={110} h={14} />
            <div style={{ ...row, gap: 32, marginTop: 4 }}>
              {[1,2,3].map(i => <div key={i} style={{ ...col, gap: 4 }}><Shimmer w={40} h={18} /><Shimmer w={55} h={11} /></div>)}
            </div>
            <Shimmer w={160} h={40} r={24} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 2 }}>
            {[...Array(9)].map((_, i) => <Shimmer key={i} w="100%" h={160} r={0} />)}
          </div>
        </div>
      ) : profile ? (
        <>
          {/* ── Hero ── */}
          <div className="up d1" style={{ padding: '24px 18px 20px', borderBottom: `1px solid ${S.border}` }}>

            {/* Avatar · name+username · follow — one row */}
            <div style={{ ...row, alignItems: 'center', gap: 12, marginBottom: 14 }}>
              <div style={{ position: 'relative', flexShrink: 0 }}>
                <img src={profile.avatar} alt={profile.name}
                  style={{ width: 90, height: 90, borderRadius: 24, objectFit: 'cover', display: 'block', border: `1.5px solid ${S.border}` }} />
                <div style={{ position: 'absolute', bottom: 6, right: 6, width: 11, height: 11, borderRadius: '50%', background: '#16a34a', border: `2px solid ${S.bg}` }} />
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ ...row, gap: 5, marginBottom: 2 }}>
                  <span style={{ fontFamily: "'Syne', sans-serif", fontSize: 18, fontWeight: 700, letterSpacing: '-.01em', lineHeight: 1.15, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{profile.name}</span>
                  {profile.verified && <VerifiedBadge size="sm" />}
                </div>
                {profile.username && (
                  <p style={{ fontSize: 12, color: S.ink2, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>@{profile.username}</p>
                )}
              </div>

              {/* Follow button */}
              {session && !isOwn && (
                <button
                  className="tap"
                  onClick={handleFollow}
                  disabled={followLoading || locked || !isOnline}
                  style={{
                    flexShrink: 0, minWidth: 90, padding: '9px 16px', borderRadius: 12,
                    border: isFollowing ? `1px solid ${S.border}` : 'none',
                    background: isFollowing ? 'transparent' : S.ink,
                    color: isFollowing ? S.ink2 : S.bg,
                    fontSize: 13, fontWeight: 600,
                    cursor: (followLoading || locked || !isOnline) ? 'default' : 'pointer',
                    opacity: (locked || !isOnline) ? 0.4 : 1,
                    fontFamily: 'inherit', transition: 'all .18s',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  }}>
                  {followLoading
                    ? <><Spinner color={isFollowing ? S.ink2 : '#fff'} />{isFollowing ? 'Unfollowing…' : 'Following…'}</>
                    : isFollowing ? 'Following' : 'Follow'
                  }
                </button>
              )}
            </div>

            {/* Bio */}
            {profile.bio && (
              <p style={{ fontSize: 13, color: S.ink2, lineHeight: 1.6, margin: '0 0 16px' }}>{profile.bio}</p>
            )}

            {/* Stats row card */}
            <div style={{ display: 'flex', background: S.surface, borderRadius: 18, border: `1px solid ${S.border}`, overflow: 'hidden' }}>
              {statItems.map(({ label, val }, i) => (
                <div key={label} style={{ flex: 1, padding: '12px 0', textAlign: 'center', borderRight: i < statItems.length - 1 ? `1px solid ${S.border}` : 'none' }}>
                  <p style={{ fontFamily: "'Syne', sans-serif", fontSize: 17, fontWeight: 700, margin: 0, letterSpacing: '-.02em', lineHeight: 1 }}>{fmt(val)}</p>
                  <p style={{ fontSize: 9, color: S.ink3, margin: '4px 0 0', textTransform: 'uppercase', letterSpacing: '.07em', fontWeight: 600 }}>{label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* ── Posts header ── */}
          <div className="up d2" style={{ ...row, gap: 7, padding: '14px 18px', borderBottom: `1px solid ${S.border}` }}>
            <Grid size={13} color={S.ink3} />
            <span style={{ fontSize: 10, fontWeight: 700, color: S.ink3, textTransform: 'uppercase', letterSpacing: '.07em' }}>{fmt(stats.posts || posts.length)} Wallpapers</span>
          </div>

          {/* ── Grid ── */}
          <div className="up d3">
            {postsLoading ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 2 }}>
                {[...Array(9)].map((_, i) => <Shimmer key={i} w="100%" h={160} r={0} />)}
              </div>
            ) : posts.length > 0 ? (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 2 }}>
                  {posts.map((wp, i) => (
                    <button key={wp.id} className="cell" onClick={() => router.push(`/details/${wp.id}`)}
                      style={{ aspectRatio: '3/4', border: 'none', padding: 0, cursor: 'pointer', background: '#e8e8e8', overflow: 'hidden', display: 'block', borderRadius: i===0?'12px 0 0 0':i===2?'0 12px 0 0':i===posts.length-posts.length%3?'0 0 0 12px':i===posts.length-1?'0 0 12px 0':0 }}>
                      <img src={wp.thumbnail || wp.url} alt={wp.title} loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                    </button>
                  ))}
                </div>
                {hasMore && (
                  <div style={{ display: 'flex', justifyContent: 'center', padding: '24px 0 40px' }}>
                    <button className="tap" onClick={loadMore} disabled={!isOnline}
                      style={{ padding: '11px 32px', borderRadius: 14, border: `1px solid ${S.border}`, background: S.surface, color: S.ink2, fontSize: 13, fontWeight: 600, cursor: isOnline ? 'pointer' : 'default', opacity: isOnline ? 1 : 0.4, fontFamily: 'inherit' }}>
                      Load more
                    </button>
                  </div>
                )}
              </>
            ) : (
              <div style={{ ...col, padding: '60px 0', gap: 12 }}>
                <div style={{ width: 56, height: 56, borderRadius: '50%', background: S.surface, border: `1px solid ${S.border}`, ...row, justifyContent: 'center' }}>
                  <Grid size={22} color={S.ink3} />
                </div>
                <p style={{ fontSize: 14, color: S.ink3, margin: 0 }}>No posts yet</p>
              </div>
            )}
          </div>
        </>
      ) : null}

     
      {/* ── Rapid-tap / cooldown warning modal ── */}
      {showWarning && (
        <div onClick={() => setShowWarning(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.35)', backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)', zIndex: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, animation: 'fadeIn .2s ease' }}>
          <div onClick={e => e.stopPropagation()}
            style={{ background: S.surface, borderRadius: 26, border: `1px solid ${S.border}`, padding: '28px 24px', maxWidth: 300, width: '100%', textAlign: 'center', boxShadow: '0 20px 60px rgba(0,0,0,.12)', animation: 'slideUp .28s cubic-bezier(.16,1,.3,1)' }}>
            <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'rgba(217,119,6,.08)', border: '1px solid rgba(217,119,6,.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
              <AlertTriangle size={22} color={S.amber} />
            </div>
            <p style={{ fontFamily: "'Syne', sans-serif", fontSize: 18, fontWeight: 700, margin: '0 0 7px' }}>Slow down!</p>
            <p style={{ fontSize: 13, color: S.ink2, lineHeight: 1.6, margin: '0 0 6px' }}>
              You're following and unfollowing too quickly.
            </p>
            <p style={{ fontSize: 13, color: S.ink2, lineHeight: 1.6, margin: '0 0 22px' }}>
              Try again in <span style={{ fontWeight: 700, color: S.ink }}>{cooldownLeft}</span>.
            </p>
            <button className="tap" onClick={() => setShowWarning(false)}
              style={{ width: '100%', padding: '13px 0', borderRadius: 14, border: 'none', background: S.ink, fontFamily: 'inherit', fontSize: 14, fontWeight: 600, color: S.bg, cursor: 'pointer' }}>
              Got it
            </button>
          </div>
        </div>
      )}
    </div>
  );
}