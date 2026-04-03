'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ChevronLeft, Grid, AlertTriangle, WifiOff } from 'lucide-react';
import Image from 'next/image';
import { VerifiedBadge } from '@/app/components/VerifiedBadge';
import { useAuth } from '@/app/components/AuthProvider';
import { fetchProfile, fetchUserWallpapers, getUserCounts, checkIsFollowing, followUser, unfollowUser } from '@/lib/stores/wallpaperStore';
import type { Wallpaper } from '@/app/types';

// ── Cache ─────────────────────────────────────────────────────────────────────
type CacheEntry<T> = { data: T; cachedAt: number };
const cache = new Map<string, CacheEntry<unknown>>();
const PROFILE_TTL = 5 * 60 * 1000, POSTS_TTL = 2 * 60 * 1000;
const cacheSet = <T,>(key: string, data: T) => cache.set(key, { data, cachedAt: Date.now() });
const cacheIsStale = (key: string, ttl: number) => { const e = cache.get(key); return !e || Date.now() - e.cachedAt > ttl; };

// ── Constants & helpers ───────────────────────────────────────────────────────
const COOLDOWN_MS = 3 * 60 * 60 * 1000, RAPID_THRESHOLD = 4, PAGE_SIZE = 19;
const cooldownKey = (uid: string, tid: string) => `follow_cooldown_${uid}_${tid}`;
const fmt = (n: number) => n >= 1_000_000 ? `${(n/1_000_000).toFixed(1)}M` : n >= 1_000 ? `${(n/1_000).toFixed(1)}K` : String(n);

// ── Design tokens ─────────────────────────────────────────────────────────────
const T = { bg:'#f0f2f5', surface:'#ffffff', border:'rgba(0,0,0,.1)', ink:'#050505', ink2:'#65676b', ink3:'rgba(5,5,5,.3)', black:'#050505', tile:'#e4e6eb', green:'#42b72a', red:'#e41e3f', amber:'#f59e0b' };
const font = "'Inter', -apple-system, BlinkMacSystemFont, sans-serif";

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
  @keyframes shimmer{0%,100%{background-position:200% 0}50%{background-position:-200% 0}}
  @keyframes up{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
  @keyframes fadeIn{from{opacity:0}to{opacity:1}}
  @keyframes slideDown{from{opacity:0;transform:translateY(-100%)}to{opacity:1;transform:translateY(0)}}
  @keyframes slideUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
  @keyframes spin{to{transform:rotate(360deg)}}
  .up{animation:up .38s cubic-bezier(.16,1,.3,1) both}
  .d1{animation-delay:.05s}.d2{animation-delay:.10s}
  .tap:active{filter:brightness(.88)}.cell:active{opacity:.72}
  img{-webkit-user-select:none;user-select:none;pointer-events:none;-webkit-touch-callout:none}
  button img{pointer-events:none}
`;

// ── Micro components ──────────────────────────────────────────────────────────
const Shimmer = ({ w, h, r=8 }: { w: string|number; h: string|number; r?: number }) => (
  <div style={{ width:w, height:h, borderRadius:r, flexShrink:0, background:'linear-gradient(90deg,#e8e8e8 25%,#f4f4f4 50%,#e8e8e8 75%)', backgroundSize:'200% 100%', animation:'shimmer 1.4s ease infinite' }} />
);
const Spinner = ({ size=13, color='#fff' }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 14 14" style={{ animation:'spin .7s linear infinite', flexShrink:0 }}>
    <circle cx="7" cy="7" r="5.5" fill="none" stroke={color} strokeWidth="2" strokeOpacity=".25" />
    <path d="M7 1.5a5.5 5.5 0 0 1 5.5 5.5" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" />
  </svg>
);

// ─────────────────────────────────────────────────────────────────────────────
export default function UserProfilePage() {
  const router = useRouter();
  const { id: userId } = useParams() as { id: string };
  const { session } = useAuth();

  const [profile,       setProfile]       = useState<any>(null);
  const [stats,         setStats]         = useState({ followers:0, following:0, posts:0 });
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

  const offlineTimer = useRef<ReturnType<typeof setTimeout>|null>(null);
  const tapCount = useRef(0);
  const tapTimer = useRef<ReturnType<typeof setTimeout>|null>(null);

  const isOwn      = session?.user.id === userId;
  const profileKey = `profile:${userId}`;
  const statsKey   = `stats:${userId}`;
  const followKey  = `following:${session?.user.id}:${userId}`;
  const postsKey   = `posts:${userId}:0`;

  const loadProfile = useCallback(async (force = false) => {
    if (!userId) return;
    const cp = cache.get(profileKey)?.data as any;
    const cs = cache.get(statsKey)?.data as any;
    const cf = cache.get(followKey)?.data as boolean | undefined;
    const fresh = !cacheIsStale(profileKey, PROFILE_TTL);
    if (cp) {
      setProfile(cp); if (cs) setStats(cs); if (cf !== undefined) setIsFollowing(cf);
      setPageLoading(false); if (fresh && !force) return;
    }
    try {
      const [p, s] = await Promise.all([fetchProfile(userId), getUserCounts(userId)]);
      if (!p) { router.replace('/'); return; }
      cacheSet(profileKey, p); cacheSet(statsKey, s); setProfile(p); setStats(s);
      if (session && !isOwn && (cf === undefined || force)) {
        const f = await checkIsFollowing(session.user.id, userId);
        cacheSet(followKey, f); setIsFollowing(f);
      }
    } catch { if (!cp) router.replace('/'); }
    finally { setPageLoading(false); }
  }, [userId, session]); // eslint-disable-line

  const loadPosts = useCallback(async (force = false) => {
    if (!userId) return;
    const cp = cache.get(postsKey)?.data as { wallpapers: Wallpaper[]; hasMore: boolean } | undefined;
    const fresh = !cacheIsStale(postsKey, POSTS_TTL);
    if (cp) { setPosts(cp.wallpapers); setHasMore(cp.hasMore); setPostsLoading(false); if (fresh && !force) return; }
    if (!cp) setPostsLoading(true);
    try {
      const { wallpapers, hasMore: more } = await fetchUserWallpapers(userId, 0, PAGE_SIZE);
      cacheSet(postsKey, { wallpapers, hasMore: more }); setPosts(wallpapers); setHasMore(more); setPage(0);
    } catch (e) { console.error(e); }
    finally { setPostsLoading(false); }
  }, [userId]); // eslint-disable-line

  useEffect(() => { loadProfile(); }, [loadProfile]);
  useEffect(() => { loadPosts(); },   [loadPosts]);

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

  const getCooldownUntil = (): number | null => {
    if (!session) return null;
    const v = localStorage.getItem(cooldownKey(session.user.id, userId));
    if (!v) return null; const u = Number(v); return Date.now() < u ? u : null;
  };
  const fmtRemaining = (u: number) => { const ms = u-Date.now(), h = Math.floor(ms/3_600_000), m = Math.floor((ms%3_600_000)/60_000); return h>0?`${h}h ${m}m`:`${m}m`; };
  const loadMore = async () => { const next=page+1; const { wallpapers, hasMore:more } = await fetchUserWallpapers(userId, next, PAGE_SIZE); setPosts(p=>[...p,...wallpapers]); setHasMore(more); setPage(next); };

  const handleFollow = async () => {
    if (!session || followLoading) return;
    const until = getCooldownUntil();
    if (until) { setCooldownLeft(fmtRemaining(until)); setShowWarning(true); return; }
    tapCount.current += 1;
    if (tapTimer.current) clearTimeout(tapTimer.current);
    tapTimer.current = setTimeout(() => { tapCount.current = 0; }, 5000);
    if (tapCount.current >= RAPID_THRESHOLD) {
      const lock = Date.now()+COOLDOWN_MS;
      localStorage.setItem(cooldownKey(session.user.id, userId), String(lock));
      tapCount.current=0; setCooldownLeft(fmtRemaining(lock)); setShowWarning(true); return;
    }
    setFollowLoading(true);
    try {
      if (isFollowing) { await unfollowUser(session.user.id, userId); setIsFollowing(false); cacheSet(followKey, false); setStats(s=>({...s, followers:s.followers-1})); }
      else             { await followUser(session.user.id, userId);   setIsFollowing(true);  cacheSet(followKey, true);  setStats(s=>({...s, followers:s.followers+1})); }
      cache.delete(statsKey);
    } catch (e) { console.error(e); }
    finally { setFollowLoading(false); }
  };

  const locked = !!getCooldownUntil();
  const statItems = [{ label:'Posts', val:stats.posts }, { label:'Followers', val:stats.followers }, { label:'Following', val:stats.following }];

  return (
    <div style={{ fontFamily:font, background:T.bg, minHeight:'100dvh', color:T.ink, maxWidth:680, margin:'0 auto', paddingBottom:40 }}>
      <style>{CSS}</style>

      {/* Offline banner */}
      {showOffline && (
        <div style={{ position:'fixed', top:0, left:'50%', transform:'translateX(-50%)', width:'100%', maxWidth:680, zIndex:200, background:isOnline?'#16a34a':T.red, padding:'10px 16px', display:'flex', alignItems:'center', gap:8, animation:'slideDown .3s ease', fontFamily:font, transition:'background .4s ease' }}>
          {isOnline
            ? reconnecting ? <><Spinner size={13}/><span style={{ flex:1, fontSize:13, fontWeight:600, color:'#fff' }}>Reconnected — refreshing…</span></> : <span style={{ flex:1, fontSize:13, fontWeight:600, color:'#fff' }}>✓ Back online</span>
            : <><WifiOff size={13} color="#fff"/><span style={{ flex:1, fontSize:13, fontWeight:600, color:'#fff' }}>No internet connection</span></>
          }
        </div>
      )}

      {/* Black header */}
      <div style={{ position:'sticky', top:0, zIndex:100, background:'#050505', display:'flex', alignItems:'center', gap:10, padding:'0 12px', height:52, borderBottom:'1px solid rgba(255,255,255,.08)' }}>
        <button className="tap" onClick={() => router.back()} aria-label="Go back"
          style={{ width:36, height:36, borderRadius:'50%', border:'none', background:'rgba(255,255,255,.12)', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', flexShrink:0 }}>
          <ChevronLeft size={20} color="#ffffff" strokeWidth={2.5}/>
        </button>
        <span style={{ fontFamily:font, fontSize:17, fontWeight:700, color:'#ffffff', letterSpacing:'-.01em', flex:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
          {!pageLoading && profile ? profile.name : 'Profile'}
        </span>
      </div>

      {/* Skeleton */}
      {pageLoading ? (
        <div style={{ paddingTop:8 }}>
          <div style={{ background:T.surface, borderBottom:`1px solid ${T.border}`, padding:'20px 16px 16px', display:'flex', flexDirection:'column', gap:12 }}>
            <div style={{ display:'flex', alignItems:'center', gap:14 }}>
              <Shimmer w={80} h={80} r={40}/>
              <div style={{ flex:1, display:'flex', flexDirection:'column', gap:8 }}><Shimmer w="55%" h={20} r={6}/><Shimmer w="35%" h={13} r={4}/></div>
              <Shimmer w={90} h={38} r={8}/>
            </div>
            <Shimmer w="80%" h={13} r={4}/>
            <div style={{ display:'flex', borderTop:`1px solid ${T.border}`, marginTop:4 }}>
              {[1,2,3].map(i => <div key={i} style={{ flex:1, padding:'12px 0', display:'flex', flexDirection:'column', alignItems:'center', gap:6 }}><Shimmer w={36} h={18} r={4}/><Shimmer w={52} h={10} r={4}/></div>)}
            </div>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:2, marginTop:8 }}>
            {[...Array(9)].map((_,i) => <Shimmer key={i} w="100%" h={160} r={0}/>)}
          </div>
        </div>
      ) : profile ? (
        <>
          {/* Hero */}
          <div className="up" style={{ background:T.surface, borderBottom:`1px solid ${T.border}` }}>
            <div style={{ padding:'20px 16px 0', display:'flex', alignItems:'center', gap:14 }}>
              <div style={{ position:'relative', flexShrink:0 }}>
                <div style={{ width:80, height:80, borderRadius:'50%', padding:2.5, background:T.black, boxShadow:'0 0 0 2px #fff' }}>
                  <Image src={profile.avatar} alt={profile.name} width={80} height={80} draggable={false} onContextMenu={e=>e.preventDefault()}
                    style={{ width:'100%', height:'100%', borderRadius:'50%', objectFit:'cover', display:'block' }}/>
                </div>
                <div style={{ position:'absolute', bottom:3, right:2, width:13, height:13, borderRadius:'50%', background:isOnline?T.green:T.amber, border:'2.5px solid #fff', transition:'background .4s' }}/>
              </div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ display:'flex', alignItems:'center', gap:6, flexWrap:'wrap' }}>
                  <span style={{ fontFamily:font, fontSize:20, fontWeight:800, color:T.ink, letterSpacing:'-.02em', lineHeight:1.2 }}>{profile.name}</span>
                  {profile.verified && <VerifiedBadge size="md"/>}
                </div>
                {profile.username && <p style={{ fontFamily:font, fontSize:13, color:T.ink2, margin:'3px 0 0', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{profile.username.startsWith('@')?profile.username:`@${profile.username}`}</p>}
              </div>
              {session && !isOwn && (
                <button className="tap" onClick={handleFollow} disabled={followLoading||locked||!isOnline}
                  style={{ flexShrink:0, minWidth:92, height:38, padding:'0 16px', borderRadius:8, border:isFollowing?`1px solid ${T.border}`:'none', background:isFollowing?T.tile:T.black, color:isFollowing?T.ink:'#fff', fontFamily:font, fontSize:14, fontWeight:600, cursor:(followLoading||locked||!isOnline)?'default':'pointer', opacity:(locked||!isOnline)?0.4:1, display:'flex', alignItems:'center', justifyContent:'center', gap:6, transition:'all .18s' }}>
                  {followLoading ? <><Spinner color={isFollowing?T.ink2:'#fff'} size={13}/>{isFollowing?'Unfollowing…':'Following…'}</> : isFollowing?'Following':'Follow'}
                </button>
              )}
            </div>
            {profile.bio && <p style={{ fontFamily:font, fontSize:14, color:T.ink2, lineHeight:1.55, margin:'12px 16px 0' }}>{profile.bio}</p>}
            <div style={{ display:'flex', borderTop:`1px solid ${T.border}`, margin:'12px 16px 0' }}>
              {statItems.map(({ label, val }, i, arr) => (
                <div key={label} style={{ flex:1, padding:'12px 0', textAlign:'center', borderRight:i<arr.length-1?`1px solid ${T.border}`:'none' }}>
                  <p style={{ fontFamily:font, fontSize:17, fontWeight:700, color:T.ink, margin:'0 0 2px', letterSpacing:'-.01em' }}>{fmt(val)}</p>
                  <p style={{ fontFamily:font, fontSize:11, color:T.ink2, margin:0, fontWeight:500 }}>{label}</p>
                </div>
              ))}
            </div>
            <div style={{ height:16 }}/>
          </div>

          {/* Posts label */}
          <div className="up d1" style={{ background:T.surface, marginTop:8, borderTop:`1px solid ${T.border}`, borderBottom:`1px solid ${T.border}`, display:'flex', alignItems:'center', gap:7, padding:'14px 16px' }}>
            <Grid size={13} color={T.ink3}/>
            <span style={{ fontFamily:font, fontSize:10, fontWeight:700, color:T.ink3, textTransform:'uppercase', letterSpacing:'.07em' }}>{fmt(stats.posts||posts.length)} Wallpapers</span>
          </div>

          {/* Grid */}
          <div className="up d2">
            {postsLoading ? (
              <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:2 }}>
                {[...Array(9)].map((_,i) => <Shimmer key={i} w="100%" h={160} r={0}/>)}
              </div>
            ) : posts.length > 0 ? (
              <>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:2 }}>
                  {posts.map(wp => (
                    <button key={wp.id} className="cell" onClick={() => router.push(`/details/${wp.id}`)} onContextMenu={e=>e.preventDefault()}
                      style={{ aspectRatio:'3/4', border:'none', padding:0, cursor:'pointer', background:'#e8e8e8', overflow:'hidden', display:'block', position:'relative', WebkitUserSelect:'none', userSelect:'none' }}>
                      <Image src={wp.thumbnail||wp.url} alt={wp.title} fill sizes="(max-width:680px) 33vw, 226px" loading="lazy" draggable={false} onContextMenu={e=>e.preventDefault()}
                        style={{ objectFit:'cover', display:'block' } as React.CSSProperties}/>
                    </button>
                  ))}
                </div>
                {hasMore && (
                  <div style={{ display:'flex', justifyContent:'center', padding:'20px 0 40px' }}>
                    <button className="tap" onClick={loadMore} disabled={!isOnline}
                      style={{ padding:'11px 32px', borderRadius:10, border:`1px solid ${T.border}`, background:T.surface, color:T.ink2, fontFamily:font, fontSize:13, fontWeight:600, cursor:isOnline?'pointer':'default', opacity:isOnline?1:0.4 }}>
                      Load more
                    </button>
                  </div>
                )}
              </>
            ) : (
              <div style={{ display:'flex', flexDirection:'column', alignItems:'center', padding:'60px 0', gap:12, background:T.surface }}>
                <div style={{ width:56, height:56, borderRadius:'50%', background:T.tile, border:`1px solid ${T.border}`, display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <Grid size={22} color={T.ink3}/>
                </div>
                <p style={{ fontFamily:font, fontSize:14, color:T.ink3, margin:0, fontWeight:500 }}>No posts yet</p>
              </div>
            )}
          </div>
        </>
      ) : null}

    {/* Warning sheet */}
      {showWarning && (
        <div onClick={() => setShowWarning(false)} style={{ position:'fixed', inset:0, zIndex:300, background:'rgba(0,0,0,.45)', display:'flex', alignItems:'flex-end', justifyContent:'center', animation:'fadeIn .2s' }}>
          <div onClick={e=>e.stopPropagation()} style={{ width:'100%', maxWidth:680, background:T.surface, borderRadius:'20px 20px 0 0', padding:'24px 20px 32px', fontFamily:font, animation:'slideUp .28s cubic-bezier(.16,1,.3,1)' }}>
            <div style={{ width:36, height:4, borderRadius:2, background:T.border, margin:'0 auto 20px' }}/>
            <div style={{ width:48, height:48, borderRadius:14, background:'rgba(245,158,11,.08)', border:'1px solid rgba(245,158,11,.2)', display:'flex', alignItems:'center', justifyContent:'center', marginBottom:14 }}>
              <AlertTriangle size={22} color={T.amber}/>
            </div>
            <p style={{ fontFamily:font, fontSize:18, fontWeight:700, margin:'0 0 7px', color:T.ink }}>Slow down!</p>
            <p style={{ fontFamily:font, fontSize:13, color:T.ink2, lineHeight:1.55, margin:'0 0 6px' }}>You're following and unfollowing too quickly.</p>
            <p style={{ fontFamily:font, fontSize:13, color:T.ink2, lineHeight:1.55, margin:'0 0 22px' }}>Try again in <span style={{ fontWeight:700, color:T.ink }}>{cooldownLeft}</span>.</p>
            <div style={{ display:'flex', gap:8 }}>
              <button className="tap" onClick={() => setShowWarning(false)} style={{ flex:1, padding:'13px 0', borderRadius:10, border:`1px solid ${T.border}`, background:T.tile, fontFamily:font, fontSize:14, fontWeight:600, color:T.ink, cursor:'pointer' }}>Cancel</button>
              <button className="tap" onClick={() => setShowWarning(false)} style={{ flex:1, padding:'13px 0', borderRadius:10, border:'none', background:T.black, fontFamily:font, fontSize:14, fontWeight:600, color:'#fff', cursor:'pointer' }}>Got it</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}