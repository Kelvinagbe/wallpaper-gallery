'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ChevronLeft, Grid } from 'lucide-react';
import { VerifiedBadge } from '@/app/components/VerifiedBadge';
import { useAuth } from '@/app/components/AuthProvider';
import { fetchProfile, fetchUserWallpapers, getUserCounts, checkIsFollowing, followUser, unfollowUser } from '@/lib/stores/wallpaperStore';
import type { Wallpaper } from '@/app/types';

const fmt = (n: number) => n >= 1_000_000 ? `${(n/1_000_000).toFixed(1)}M` : n >= 1_000 ? `${(n/1_000).toFixed(1)}k` : String(n);
const Shimmer = ({ w, h, r = 12 }: { w: string|number; h: string|number; r?: number }) => (
  <div style={{ width: w, height: h, borderRadius: r, background: 'linear-gradient(90deg,#efefef 25%,#e5e5e5 50%,#efefef 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.4s infinite' }} />
);

export default function UserProfilePage() {
  const router      = useRouter();
  const params      = useParams();
  const userId      = params?.id as string;
  const { session } = useAuth();

  const [profile,       setProfile]       = useState<any>(null);
  const [stats,         setStats]         = useState({ followers: 0, following: 0, posts: 0 });
  const [isFollowing,   setIsFollowing]   = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [loading,       setLoading]       = useState(true);
  const [posts,         setPosts]         = useState<Wallpaper[]>([]);
  const [postsLoading,  setPostsLoading]  = useState(true);

  const isOwn = session?.user.id === userId;

  useEffect(() => {
    if (!userId) return;
    (async () => {
      try {
        const [p, s] = await Promise.all([fetchProfile(userId), getUserCounts(userId)]);
        if (!p) { router.replace('/'); return; }
        setProfile(p); setStats(s);
        if (session && !isOwn) setIsFollowing(await checkIsFollowing(session.user.id, userId));
      } catch { router.replace('/'); }
      finally { setLoading(false); }
    })();
  }, [userId, session]);

  useEffect(() => {
    if (!userId) return;
    setPostsLoading(true);
    fetchUserWallpapers(userId, 0, 30)
      .then(({ wallpapers, total }) => { setPosts(wallpapers); setStats(s => ({ ...s, posts: total })); })
      .catch(console.error)
      .finally(() => setPostsLoading(false));
  }, [userId]);

  const handleFollow = async () => {
    if (!session || followLoading) return;
    setFollowLoading(true);
    try {
      if (isFollowing) { await unfollowUser(session.user.id, userId); setIsFollowing(false); setStats(s => ({ ...s, followers: s.followers - 1 })); }
      else             { await followUser(session.user.id, userId);   setIsFollowing(true);  setStats(s => ({ ...s, followers: s.followers + 1 })); }
    } catch(e) { console.error(e); }
    finally { setFollowLoading(false); }
  };

  return (
    <div style={{ minHeight: '100dvh', background: '#fafafa', fontFamily: "'DM Sans', sans-serif", color: '#0a0a0a' }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
      <style>{`
        @keyframes shimmer{0%{background-position:-200% 0}100%{background-position:200% 0}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}
        .fade-up{animation:fadeUp .4s cubic-bezier(.16,1,.3,1) forwards;}
        .press{transition:transform .15s;} .press:active{transform:scale(0.95);}
      `}</style>

      {/* Header */}
      <div style={{ position: 'sticky', top: 0, zIndex: 20, background: 'rgba(250,250,250,0.92)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', borderBottom: '1px solid rgba(0,0,0,0.05)', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={() => router.back()} className="press" style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(0,0,0,0.05)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
          <ChevronLeft size={18} color="#0a0a0a" strokeWidth={2.5} />
        </button>
        {!loading && profile && <span style={{ fontSize: 15, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{profile.name}</span>}
      </div>

      <div style={{ maxWidth: 480, margin: '0 auto', padding: '0 16px 48px' }}>

        {/* Skeleton */}
        {loading ? (
          <div style={{ paddingTop: 32, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
            <Shimmer w={88} h={88} r={44} />
            <Shimmer w={140} h={22} />
            <Shimmer w={100} h={14} />
            <Shimmer w={200} h={14} />
            <div style={{ display: 'flex', gap: 24, marginTop: 4 }}>
              {[1,2,3].map(i => <div key={i} style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:5 }}><Shimmer w={40} h={20} /><Shimmer w={55} h={11} /></div>)}
            </div>
            <Shimmer w={110} h={40} r={22} />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 6, width: '100%', marginTop: 8 }}>
              {[...Array(9)].map((_,i) => <Shimmer key={i} w="100%" h={140} />)}
            </div>
          </div>
        ) : profile ? (
          <div className="fade-up">

            {/* Profile info */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 28, paddingBottom: 24, textAlign: 'center' }}>

              {/* Avatar */}
              <img src={profile.avatar} alt={profile.name}
                style={{ width: 88, height: 88, borderRadius: '50%', objectFit: 'cover', border: '3px solid #fff', boxShadow: '0 2px 20px rgba(0,0,0,0.1)', marginBottom: 14 }} />

              {/* Name + verified badge side by side */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                <span style={{ fontSize: 21, fontWeight: 700, letterSpacing: '-0.03em' }}>{profile.name}</span>
                {profile.verified && <VerifiedBadge size="md" />}
              </div>

              {profile.username && <p style={{ fontSize: 13, color: 'rgba(0,0,0,0.38)', marginBottom: profile.bio ? 10 : 18 }}>@{profile.username}</p>}
              {profile.bio      && <p style={{ fontSize: 14, color: 'rgba(0,0,0,0.5)', lineHeight: 1.65, maxWidth: 280, marginBottom: 20 }}>{profile.bio}</p>}

              {/* Stats pill */}
              <div style={{ display: 'flex', background: '#fff', borderRadius: 20, border: '1px solid rgba(0,0,0,0.06)', overflow: 'hidden', marginBottom: 20, width: '100%', maxWidth: 320, boxShadow: '0 1px 8px rgba(0,0,0,0.04)' }}>
                {[{ label:'Posts', val:stats.posts }, { label:'Followers', val:stats.followers }, { label:'Following', val:stats.following }].map(({ label, val }, i, arr) => (
                  <div key={label} style={{ flex: 1, padding: '14px 6px', textAlign: 'center', borderRight: i < arr.length-1 ? '1px solid rgba(0,0,0,0.06)' : 'none' }}>
                    <p style={{ fontSize: 18, fontWeight: 700, color: '#0a0a0a', lineHeight: 1, letterSpacing: '-0.02em' }}>{fmt(val)}</p>
                    <p style={{ fontSize: 11, color: 'rgba(0,0,0,0.38)', marginTop: 3, fontWeight: 500 }}>{label}</p>
                  </div>
                ))}
              </div>

              {/* Follow button */}
              {session && !isOwn && (
                <button onClick={handleFollow} disabled={followLoading} className="press"
                  style={{ padding: '11px 36px', borderRadius: 26, border: isFollowing ? '1.5px solid rgba(0,0,0,0.1)' : 'none', background: isFollowing ? 'transparent' : '#0a0a0a', color: isFollowing ? 'rgba(0,0,0,0.45)' : '#fff', fontSize: 14, fontWeight: 600, cursor: followLoading ? 'default' : 'pointer', opacity: followLoading ? 0.55 : 1, transition: 'all .2s', fontFamily: 'inherit', letterSpacing: '-0.01em' }}>
                  {isFollowing ? 'Following' : 'Follow'}
                </button>
              )}
            </div>

            {/* Posts label */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, paddingBottom: 12, borderBottom: '1px solid rgba(0,0,0,0.06)', marginBottom: 10 }}>
              <Grid size={13} color="rgba(0,0,0,0.35)" />
              <span style={{ fontSize: 12, fontWeight: 600, color: 'rgba(0,0,0,0.4)', letterSpacing: '0.02em', textTransform: 'uppercase' }}>Posts · {fmt(stats.posts)}</span>
            </div>

            {/* Grid */}
            {postsLoading ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 6 }}>
                {[...Array(9)].map((_,i) => <Shimmer key={i} w="100%" h={140} />)}
              </div>
            ) : posts.length > 0 ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 6 }}>
                {posts.map(wp => (
                  <button key={wp.id} onClick={() => router.push(`/details/${wp.id}`)} className="press"
                    style={{ position: 'relative', aspectRatio: '9/16', borderRadius: 12, overflow: 'hidden', border: 'none', padding: 0, cursor: 'pointer', background: '#efefef', display: 'block' }}>
                    <img src={wp.thumbnail || wp.url} alt={wp.title}
                      style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} loading="lazy" />
                    <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.52) 0%, transparent 55%)' }} />
                    <p style={{ position: 'absolute', bottom: 6, left: 6, right: 6, fontSize: 10, color: '#fff', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textShadow: '0 1px 4px rgba(0,0,0,0.5)', margin: 0 }}>{wp.title}</p>
                  </button>
                ))}
              </div>
            ) : (
              <div style={{ textAlign: 'center', paddingTop: 64 }}>
                <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#efefef', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                  <Grid size={22} color="rgba(0,0,0,0.2)" />
                </div>
                <p style={{ fontSize: 14, color: 'rgba(0,0,0,0.35)' }}>No posts yet</p>
              </div>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}
