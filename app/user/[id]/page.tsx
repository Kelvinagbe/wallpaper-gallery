'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ChevronLeft, Grid } from 'lucide-react';
import { VerifiedBadge } from '@/app/components/VerifiedBadge';
import { useAuth } from '@/app/components/AuthProvider';
import { fetchProfile, fetchUserWallpapers, getUserCounts, checkIsFollowing, followUser, unfollowUser } from '@/lib/stores/wallpaperStore';
import type { Wallpaper } from '@/app/types';

// ── Shared design tokens (same as ProfileClient) ──────────────────────────────
const fmt = (n: number) =>
  n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M` : n >= 1_000 ? `${(n / 1_000).toFixed(1)}k` : String(n);

const S = {
  bg:      '#f7f7f5',
  surface: '#ffffff',
  border:  'rgba(0,0,0,.08)',
  ink:     '#111110',
  ink2:    'rgba(17,17,16,.5)',
  ink3:    'rgba(17,17,16,.3)',
};

const Shimmer = ({ w, h, r = 8 }: { w: string | number; h: string | number; r?: number }) => (
  <div style={{ width: w, height: h, borderRadius: r, flexShrink: 0, background: 'linear-gradient(90deg,#e8e8e8 25%,#f0f0f0 50%,#e8e8e8 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.4s ease infinite' }} />
);

const iconBtn: React.CSSProperties = { width: 34, height: 34, borderRadius: '50%', background: 'rgba(0,0,0,.06)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' };
const col:     React.CSSProperties = { display: 'flex', flexDirection: 'column', alignItems: 'center' };
const row:     React.CSSProperties = { display: 'flex', alignItems: 'center' };

const PAGE_SIZE = 19;

// ─────────────────────────────────────────────────────────────────────────────

export default function UserProfilePage() {
  const router   = useRouter();
  const { id: userId } = useParams() as { id: string };
  const { session }    = useAuth();

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

  const statItems = [
    { label: 'Posts',     val: stats.posts     },
    { label: 'Followers', val: stats.followers },
    { label: 'Following', val: stats.following },
  ];

  return (
    <div style={{ minHeight: '100dvh', background: S.bg, fontFamily: "'DM Sans', system-ui, sans-serif", color: S.ink, maxWidth: 600, margin: '0 auto', paddingBottom: 40 }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@400;500;600;700&display=swap');
        @keyframes shimmer { 0%,100%{background-position:200% 0} 50%{background-position:-200% 0} }
        @keyframes up { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:translateY(0)} }
        .up { animation: up .42s cubic-bezier(.16,1,.3,1) both; }
        .d1{animation-delay:.06s} .d2{animation-delay:.12s} .d3{animation-delay:.18s}
        .tap:active { opacity: .55; }
        .cell:active { opacity: .75; }
      `}</style>

      {/* Header */}
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

      {/* Loading skeleton */}
      {pageLoading ? (
        <div style={{ paddingTop: 16 }}>
          <div style={{ ...col, padding: '32px 20px 20px', gap: 12 }}>
            <Shimmer w={100} h={100} r={28} />
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
          {/* Hero */}
          <div className="up d1" style={{ ...col, padding: '28px 20px 24px', borderBottom: `1px solid ${S.border}`, gap: 0 }}>
            <img src={profile.avatar} alt={profile.name}
              style={{ width: 100, height: 100, borderRadius: 28, objectFit: 'cover', display: 'block', border: `1.5px solid ${S.border}`, background: '#e8e8e8' }} />

            <div style={{ ...row, gap: 6, marginTop: 14 }}>
              <span style={{ fontFamily: "'Syne', sans-serif", fontSize: 20, fontWeight: 700, letterSpacing: '-.01em', lineHeight: 1 }}>{profile.name}</span>
              {profile.verified && <VerifiedBadge size="md" />}
            </div>

            {profile.username && (
              <p style={{ fontSize: 13, color: S.ink2, margin: '4px 0 0' }}>@{profile.username}</p>
            )}

            {profile.bio && (
              <p style={{ fontSize: 13, color: S.ink2, lineHeight: 1.6, margin: '10px 24px 0', textAlign: 'center' }}>{profile.bio}</p>
            )}

            {/* Stats */}
            <div style={{ ...row, gap: 0, marginTop: 18, background: S.surface, borderRadius: 18, border: `1px solid ${S.border}`, overflow: 'hidden', alignSelf: 'stretch' }}>
              {statItems.map(({ label, val }, i) => (
                <div key={label} style={{ flex: 1, padding: '12px 0', textAlign: 'center', borderRight: i < statItems.length - 1 ? `1px solid ${S.border}` : 'none' }}>
                  <p style={{ fontFamily: "'Syne', sans-serif", fontSize: 17, fontWeight: 700, margin: 0, letterSpacing: '-.02em', lineHeight: 1 }}>{fmt(val)}</p>
                  <p style={{ fontSize: 9, color: S.ink3, margin: '4px 0 0', textTransform: 'uppercase', letterSpacing: '.07em', fontWeight: 600 }}>{label}</p>
                </div>
              ))}
            </div>

            {/* Follow button */}
            {session && !isOwn && (
              <button className="tap" onClick={handleFollow} disabled={followLoading}
                style={{ marginTop: 14, padding: '11px 48px', borderRadius: 14, border: isFollowing ? `1px solid ${S.border}` : 'none', background: isFollowing ? 'transparent' : S.ink, color: isFollowing ? S.ink2 : S.bg, fontSize: 14, fontWeight: 600, cursor: followLoading ? 'default' : 'pointer', opacity: followLoading ? 0.55 : 1, fontFamily: 'inherit', transition: 'all .18s' }}>
                {isFollowing ? 'Following' : 'Follow'}
              </button>
            )}
          </div>

          {/* Posts header */}
          <div className="up d2" style={{ ...row, gap: 7, padding: '14px 18px', borderBottom: `1px solid ${S.border}` }}>
            <Grid size={13} color={S.ink3} />
            <span style={{ fontSize: 10, fontWeight: 700, color: S.ink3, textTransform: 'uppercase', letterSpacing: '.07em' }}>{fmt(stats.posts || posts.length)} Wallpapers</span>
          </div>

          {/* Grid */}
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
                    <button className="tap" onClick={loadMore}
                      style={{ padding: '11px 32px', borderRadius: 14, border: `1px solid ${S.border}`, background: S.surface, color: S.ink2, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
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
    </div>
  );
}
