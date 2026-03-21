'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ChevronLeft, Grid, MoreHorizontal } from 'lucide-react';
import { VerifiedBadge } from '@/app/components/VerifiedBadge';
import { useAuth } from '@/app/components/AuthProvider';
import { fetchProfile, fetchUserWallpapers, getUserCounts, checkIsFollowing, followUser, unfollowUser } from '@/lib/stores/wallpaperStore';
import type { Wallpaper } from '@/app/types';

const fmt = (n: number) => n >= 1_000_000 ? `${(n/1_000_000).toFixed(1)}M` : n >= 1_000 ? `${(n/1_000).toFixed(1)}k` : String(n);
const PAGE_SIZE = 19;
const F = 'system-ui, -apple-system, sans-serif';

const S: Record<string, React.CSSProperties> = {
  row: { display: 'flex', alignItems: 'center' },
};

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

  const Shimmer = ({ w, h, r = 8 }: { w: string | number; h: string | number; r?: number }) => (
    <div style={{ width: w, height: h, borderRadius: r, flexShrink: 0,
      background: 'linear-gradient(90deg,#ececec 25%,#e0e0e0 50%,#ececec 75%)',
      backgroundSize: '200% 100%', animation: 'shimmer 1.4s ease infinite' }} />
  );

  return (
    <div style={{ minHeight: '100dvh', background: '#fff', fontFamily: F, color: '#0a0a0a', maxWidth: 600, margin: '0 auto' }}>
      <style>{`
        @keyframes shimmer { 0%,100%{background-position:200% 0} 50%{background-position:-200% 0} }
        @keyframes fadeUp  { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
        .fade-up { animation: fadeUp .3s cubic-bezier(.16,1,.3,1) forwards; }
        .wp-card { transition: transform .12s; }
        .wp-card:active { transform: scale(0.97); }
        .follow-btn:active { opacity: 0.75; }
      `}</style>

      {/* ── Fixed top bar — back + username ── */}
      <div style={{ position: 'fixed', top: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: 600, zIndex: 40, ...S.row, justifyContent: 'space-between', padding: '10px 12px', background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
        <button onClick={() => router.back()} style={{ width: 34, height: 34, borderRadius: '50%', background: 'rgba(0,0,0,0.06)', border: 'none', ...S.row, justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
          <ChevronLeft size={18} color="#0a0a0a" strokeWidth={2.5} />
        </button>
        {!pageLoading && profile && (
          <p style={{ fontSize: 15, fontWeight: 700, flex: 1, textAlign: 'center', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', margin: '0 8px' }}>{profile.name}</p>
        )}
        <div style={{ width: 34 }} />
      </div>

      {pageLoading ? (
        /* ── Skeleton ── */
        <div style={{ paddingTop: 58 }}>
          <Shimmer w="100%" h={200} r={0} />
          <div style={{ padding: '0 16px 20px', marginTop: -42 }}>
            <Shimmer w={120} h={120} r={60} />
            <div style={{ height: 16 }} />
            <Shimmer w={160} h={22} />
            <div style={{ height: 8 }} />
            <Shimmer w={110} h={14} />
            <div style={{ height: 16 }} />
            <Shimmer w="100%" h={72} r={12} />
            <div style={{ height: 12 }} />
            <Shimmer w="100%" h={42} r={8} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 1 }}>
            {[...Array(9)].map((_,i) => <Shimmer key={i} w="100%" h={160} r={0} />)}
          </div>
        </div>
      ) : profile ? (
        <div className="fade-up">

          {/* ── Cover photo — full width, tall ── */}
          <div style={{ paddingTop: 58, position: 'relative' }}>
            <div style={{
              width: '100%', height: 220,
              background: profile.cover_url
                ? `url(${profile.cover_url}) center/cover no-repeat`
                : 'linear-gradient(160deg, #1a1a1a 0%, #2d2d2d 100%)',
              position: 'relative',
            }}>
              {/* dark gradient at bottom so avatar reads clearly */}
              <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 80, background: 'linear-gradient(to top, rgba(0,0,0,0.35), transparent)' }} />
            </div>

            {/* ── Avatar — overlaps cover, bottom-left (Facebook style) ── */}
            <div style={{ position: 'relative', padding: '0 16px' }}>
              <div style={{ position: 'absolute', top: -54, left: 16 }}>
                <div style={{ position: 'relative', display: 'inline-block' }}>
                  <img
                    src={profile.avatar}
                    alt={profile.name}
                    style={{ width: 120, height: 120, borderRadius: '50%', objectFit: 'cover', border: '4px solid #fff', display: 'block', boxShadow: '0 2px 12px rgba(0,0,0,0.15)', background: '#e8e8e8' }}
                  />
                  {/* Verified badge on avatar — bottom right */}
                  {profile.verified && (
                    <div style={{ position: 'absolute', bottom: 4, right: 4 }}>
                      <VerifiedBadge size="md" />
                    </div>
                  )}
                </div>
              </div>

              {/* ── Action buttons — top right, same row as avatar overlap ── */}
              {session && !isOwn && (
                <div style={{ ...S.row, justifyContent: 'flex-end', gap: 8, paddingTop: 12, paddingBottom: 0 }}>
                  <button
                    className="follow-btn"
                    onClick={handleFollow}
                    disabled={followLoading}
                    style={{
                      padding: '8px 22px',
                      borderRadius: 8,
                      border: isFollowing ? '1.5px solid rgba(0,0,0,0.14)' : 'none',
                      background: isFollowing ? '#fff' : '#0a0a0a',
                      color: isFollowing ? 'rgba(0,0,0,0.7)' : '#fff',
                      fontSize: 14, fontWeight: 600,
                      cursor: followLoading ? 'default' : 'pointer',
                      opacity: followLoading ? 0.55 : 1,
                      fontFamily: F,
                      transition: 'all .18s',
                    }}>
                    {isFollowing ? 'Following' : 'Follow'}
                  </button>
                  <button style={{ width: 36, height: 36, borderRadius: 8, border: '1.5px solid rgba(0,0,0,0.12)', background: '#fff', ...S.row, justifyContent: 'center', cursor: 'pointer' }}>
                    <MoreHorizontal size={17} color="rgba(0,0,0,0.6)" />
                  </button>
                </div>
              )}

              {/* Spacer below cover for avatar overlap */}
              <div style={{ height: isOwn || !session ? 72 : 12 }} />

              {/* ── Name + username + bio ── */}
              <div style={{ paddingBottom: 16 }}>
                <div style={{ ...S.row, gap: 6, marginBottom: 2 }}>
                  <h2 style={{ fontSize: 22, fontWeight: 800, margin: 0, letterSpacing: '-0.03em', lineHeight: 1.2 }}>{profile.name}</h2>
                  {profile.verified && <VerifiedBadge size="sm" />}
                </div>

                {profile.username && (
                  <p style={{ fontSize: 13, color: 'rgba(0,0,0,0.4)', margin: '0 0 8px', fontWeight: 400 }}>@{profile.username}</p>
                )}

                {profile.bio && (
                  <p style={{ fontSize: 14, color: 'rgba(0,0,0,0.6)', lineHeight: 1.55, margin: '0 0 0' }}>{profile.bio}</p>
                )}
              </div>

              {/* ── Stats row — Facebook style: inline, text-based ── */}
              <div style={{ ...S.row, gap: 20, paddingBottom: 16, borderBottom: '1px solid rgba(0,0,0,0.07)', flexWrap: 'wrap' }}>
                {[
                  { label: 'posts',     val: stats.posts     },
                  { label: 'followers', val: stats.followers },
                  { label: 'following', val: stats.following },
                ].map(({ label, val }) => (
                  <div key={label} style={{ ...S.row, gap: 4 }}>
                    <span style={{ fontSize: 15, fontWeight: 700, color: '#0a0a0a' }}>{fmt(val)}</span>
                    <span style={{ fontSize: 14, color: 'rgba(0,0,0,0.45)', fontWeight: 400 }}>{label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── Posts section header ── */}
          <div style={{ ...S.row, gap: 7, padding: '12px 16px', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
            <Grid size={13} color="rgba(0,0,0,0.35)" />
            <p style={{ fontSize: 12, fontWeight: 700, color: 'rgba(0,0,0,0.4)', textTransform: 'uppercase', letterSpacing: '0.07em', margin: 0 }}>Posts</p>
          </div>

          {/* ── Wallpaper grid ── */}
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
                  <button key={wp.id} className="wp-card" onClick={() => router.push(`/details/${wp.id}`)}
                    style={{ position: 'relative', aspectRatio: '3/4', border: 'none', padding: 0, cursor: 'pointer', background: '#e8e8e8', display: 'block', overflow: 'hidden' }}>
                    <img src={wp.thumbnail || wp.url} alt={wp.title} loading="lazy"
                      style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                  </button>
                ))}
              </div>
              {hasMore && (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '24px 0 40px' }}>
                  <button onClick={loadMore} style={{ padding: '10px 28px', borderRadius: 24, border: '1px solid rgba(0,0,0,0.1)', background: '#fff', color: 'rgba(0,0,0,0.55)', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: F }}>
                    Load more
                  </button>
                </div>
              )}
            </>
          ) : (
            <div style={{ textAlign: 'center', padding: '60px 0' }}>
              <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#f5f5f5', ...S.row, justifyContent: 'center', margin: '0 auto 12px' }}>
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
