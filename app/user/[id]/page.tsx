'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ChevronLeft, Grid } from 'lucide-react';
import { VerifiedBadge } from '@/app/components/VerifiedBadge';
import { useAuth } from '@/app/components/AuthProvider';
import { fetchProfile, fetchUserWallpapers, getUserCounts, checkIsFollowing, followUser, unfollowUser } from '@/lib/stores/wallpaperStore';
import type { Wallpaper } from '@/app/types';

const fmt = (n: number) => n >= 1_000_000 ? `${(n/1_000_000).toFixed(1)}M` : n >= 1_000 ? `${(n/1_000).toFixed(1)}k` : String(n);
const PAGE_SIZE = 12;

export default function UserProfilePage() {
  const router      = useRouter();
  const params      = useParams();
  const userId      = params?.id as string;
  const { session } = useAuth();

  const [profile,       setProfile]       = useState<any>(null);
  const [stats,         setStats]         = useState({ followers: 0, following: 0, posts: 0 });
  const [isFollowing,   setIsFollowing]   = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [pageLoading,   setPageLoading]   = useState(true);
  const [posts,         setPosts]         = useState<Wallpaper[]>([]);
  const [postsLoading,  setPostsLoading]  = useState(true);
  const [page,          setPage]          = useState(0);
  const [hasMore,       setHasMore]       = useState(false);

  const isOwn = session?.user.id === userId;

  useEffect(() => {
    if (!userId) return;
    (async () => {
      try {
        const [userProfile, userStats] = await Promise.all([fetchProfile(userId), getUserCounts(userId)]);
        if (!userProfile) { router.replace('/'); return; }
        setProfile(userProfile);
        setStats(userStats);
        if (session && !isOwn) setIsFollowing(await checkIsFollowing(session.user.id, userId));
      } catch { router.replace('/'); }
      finally { setPageLoading(false); }
    })();
  }, [userId, session]);

  useEffect(() => {
    if (!userId) return;
    setPostsLoading(true);
    fetchUserWallpapers(userId, 0, PAGE_SIZE)
      .then(({ wallpapers, hasMore: more }) => { setPosts(wallpapers); setHasMore(more); setPage(0); })
      .catch(console.error)
      .finally(() => setPostsLoading(false));
  }, [userId]);

  const loadMore = async () => {
    const next = page + 1;
    const { wallpapers, hasMore: more } = await fetchUserWallpapers(userId, next, PAGE_SIZE);
    setPosts(p => [...p, ...wallpapers]);
    setHasMore(more);
    setPage(next);
  };

  const handleFollow = async () => {
    if (!session || followLoading) return;
    setFollowLoading(true);
    try {
      if (isFollowing) { await unfollowUser(session.user.id, userId); setIsFollowing(false); setStats(s => ({ ...s, followers: s.followers - 1 })); }
      else             { await followUser(session.user.id, userId);   setIsFollowing(true);  setStats(s => ({ ...s, followers: s.followers + 1 })); }
    } catch (e) { console.error(e); }
    finally { setFollowLoading(false); }
  };

  // ── Shimmer ──────────────────────────────────────────────────────────────────
  const Shimmer = ({ w, h, r = 8 }: { w: string | number; h: string | number; r?: number }) => (
    <div style={{ width: w, height: h, borderRadius: r, flexShrink: 0,
      background: 'linear-gradient(90deg,#ececec 25%,#e0e0e0 50%,#ececec 75%)',
      backgroundSize: '200% 100%', animation: 'shimmer 1.4s ease infinite' }} />
  );

  return (
    <div style={{ minHeight: '100dvh', background: '#fff', fontFamily: 'system-ui, sans-serif', color: '#0a0a0a' }}>
      <style>{`
        @keyframes shimmer { 0%,100%{background-position:200% 0} 50%{background-position:-200% 0} }
        @keyframes fadeUp  { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
        .fade-up { animation: fadeUp .35s cubic-bezier(.16,1,.3,1) forwards; }
        .wp-card:active { transform: scale(0.97); }
        .wp-card { transition: transform .12s; }
      `}</style>

      {/* ── Fixed header ── */}
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 30, display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
        <button onClick={() => router.back()} style={{ width: 34, height: 34, borderRadius: '50%', background: 'rgba(0,0,0,0.05)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
          <ChevronLeft size={18} color="#0a0a0a" strokeWidth={2.5} />
        </button>
        {!pageLoading && profile && (
          <p style={{ fontSize: 15, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{profile.name}</p>
        )}
      </div>

      {pageLoading ? (
        // ── Skeleton ────────────────────────────────────────────────────────────
        <div style={{ paddingTop: 70, maxWidth: 600, margin: '0 auto' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '28px 20px 20px', gap: 10 }}>
            <Shimmer w={110} h={110} r={55} />
            <Shimmer w={150} h={20} />
            <Shimmer w={100} h={14} />
            <Shimmer w={200} h={13} />
            <div style={{ display: 'flex', gap: 0, width: '100%', marginTop: 8, borderRadius: 16, overflow: 'hidden', border: '1px solid #f0f0f0' }}>
              {[1,2,3].map(i => <div key={i} style={{ flex: 1, padding: 16, borderRight: i < 3 ? '1px solid #f0f0f0' : 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}><Shimmer w={40} h={18} /><Shimmer w={55} h={11} /></div>)}
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 1 }}>
            {[...Array(9)].map((_,i) => <Shimmer key={i} w="100%" h={160} r={0} />)}
          </div>
        </div>
      ) : profile ? (
        <div className="fade-up">

          {/* ── Profile info ── */}
          <div style={{ maxWidth: 600, margin: '0 auto', padding: '70px 20px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>

            {/* Avatar — large, 110px like Instagram mobile */}
            <img
              src={profile.avatar}
              alt={profile.name}
              style={{ width: 110, height: 110, borderRadius: '50%', objectFit: 'cover', border: '3px solid #fff', boxShadow: '0 2px 20px rgba(0,0,0,0.12)', marginBottom: 14, flexShrink: 0 }}
            />

            {/* Name + verified */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
              <h2 style={{ fontSize: 22, fontWeight: 700, margin: 0, letterSpacing: '-0.02em' }}>{profile.name}</h2>
              {profile.verified && <VerifiedBadge size="md" />}
            </div>

            {profile.username && (
              <p style={{ fontSize: 13, color: 'rgba(0,0,0,0.38)', marginBottom: 8, margin: '0 0 8px' }}>@{profile.username}</p>
            )}

            {profile.bio && (
              <p style={{ fontSize: 14, color: 'rgba(0,0,0,0.55)', lineHeight: 1.55, maxWidth: 280, margin: '0 0 16px' }}>{profile.bio}</p>
            )}

            {/* Stats */}
            <div style={{ display: 'flex', width: '100%', maxWidth: 360, borderRadius: 18, border: '1px solid rgba(0,0,0,0.07)', overflow: 'hidden', marginBottom: 16, background: '#fafafa' }}>
              {[
                { label: 'Posts',     val: stats.posts     },
                { label: 'Followers', val: stats.followers },
                { label: 'Following', val: stats.following },
              ].map(({ label, val }, i, arr) => (
                <div key={label} style={{ flex: 1, padding: '14px 0', textAlign: 'center', borderRight: i < arr.length - 1 ? '1px solid rgba(0,0,0,0.07)' : 'none' }}>
                  <p style={{ fontSize: 19, fontWeight: 700, margin: 0, letterSpacing: '-0.02em' }}>{fmt(val)}</p>
                  <p style={{ fontSize: 11, color: 'rgba(0,0,0,0.38)', margin: '2px 0 0', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</p>
                </div>
              ))}
            </div>

            {/* Follow button */}
            {session && !isOwn && (
              <button
                onClick={handleFollow}
                disabled={followLoading}
                style={{ padding: '10px 40px', borderRadius: 26, border: isFollowing ? '1.5px solid rgba(0,0,0,0.12)' : 'none', background: isFollowing ? 'transparent' : '#0a0a0a', color: isFollowing ? 'rgba(0,0,0,0.45)' : '#fff', fontSize: 14, fontWeight: 600, cursor: followLoading ? 'default' : 'pointer', opacity: followLoading ? 0.55 : 1, fontFamily: 'inherit', transition: 'all .18s', marginBottom: 4 }}>
                {isFollowing ? 'Following' : 'Follow'}
              </button>
            )}
          </div>

          {/* ── Posts divider ── */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '10px 20px 10px', maxWidth: 600, margin: '0 auto', borderTop: '1px solid rgba(0,0,0,0.07)' }}>
            <Grid size={13} color="rgba(0,0,0,0.35)" />
            <p style={{ fontSize: 12, fontWeight: 600, color: 'rgba(0,0,0,0.38)', textTransform: 'uppercase', letterSpacing: '0.06em', margin: 0 }}>{fmt(stats.posts)} Posts</p>
          </div>

          {/* ── Grid — no gap, no radius, edge to edge ── */}
          {postsLoading ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 1 }}>
              {[...Array(9)].map((_,i) => (
                <div key={i} style={{ aspectRatio: '3/4', background: 'linear-gradient(90deg,#ececec 25%,#e0e0e0 50%,#ececec 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.4s ease infinite' }} />
              ))}
            </div>
          ) : posts.length > 0 ? (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 1 }}>
                {posts.map(wp => (
                  <button
                    key={wp.id}
                    className="wp-card"
                    onClick={() => router.push(`/details/${wp.id}`)}
                    style={{ position: 'relative', aspectRatio: '3/4', border: 'none', padding: 0, cursor: 'pointer', background: '#e8e8e8', display: 'block', overflow: 'hidden' }}
                  >
                    <img
                      src={wp.thumbnail || wp.url}
                      alt={wp.title}
                      loading="lazy"
                      style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                    />
                  </button>
                ))}
              </div>

              {hasMore && (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '20px 0 32px' }}>
                  <button onClick={loadMore} style={{ padding: '10px 28px', borderRadius: 24, border: '1px solid rgba(0,0,0,0.1)', background: '#fff', color: 'rgba(0,0,0,0.55)', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                    Load more
                  </button>
                </div>
              )}
            </>
          ) : (
            <div style={{ textAlign: 'center', padding: '56px 0' }}>
              <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#f5f5f5', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                <Grid size={22} color="rgba(0,0,0,0.18)" />
              </div>
              <p style={{ fontSize: 14, color: 'rgba(0,0,0,0.3)', margin: 0 }}>No posts yet</p>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
