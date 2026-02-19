'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useRouter, useParams } from 'next/navigation';
import Image from 'next/image';
import { ChevronLeft, Eye, Heart, Download, Share2, Bookmark, Check, Link as LinkIcon, Loader2, MessageCircle, MoreHorizontal } from 'lucide-react';
import { VerifiedBadge } from '@/app/components/VerifiedBadge';
import { LoginPromptModal } from '@/app/components/LoginPromptModal';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/app/components/AuthProvider';
import { fetchWallpaperById, incrementViews, incrementDownloads } from '@/lib/stores/wallpaperStore';
import type { Wallpaper } from '@/app/types';

// ─── Cache ────────────────────────────────────────────────────────────────────
const cache = new Map<string, {
  liked: boolean; saved: boolean; following: boolean;
  likeCount: number; timestamp: number;
}>();
const CACHE_DURATION = 30_000;

// ─── CopyLinkModal ────────────────────────────────────────────────────────────
const CopyLinkModal = ({
  isOpen, onClose, link,
}: { isOpen: boolean; onClose: () => void; link: string }) => {
  const [copied, setCopied] = useState(false);
  if (!isOpen) return null;
  return createPortal(
    <div
      style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.8)', backdropFilter:'blur(8px)', zIndex:200, display:'flex', alignItems:'flex-end' }}
      onClick={onClose}
    >
      <div
        className="w-full bg-gradient-to-b from-zinc-900 to-black rounded-t-3xl p-6 space-y-4"
        onClick={e => e.stopPropagation()}
      >
        <div className="w-12 h-1.5 bg-white/20 rounded-full mx-auto" />
        <h3 className="text-xl font-bold text-white text-center">Copy Link</h3>
        <div className="bg-white/5 rounded-xl p-4 flex items-center gap-3 border border-white/10">
          <LinkIcon className="w-5 h-5 text-white/60 flex-shrink-0" />
          <p className="text-sm text-white/80 flex-1 truncate">{link}</p>
        </div>
        <button
          onClick={async () => {
            await navigator.clipboard.writeText(link);
            setCopied(true);
            setTimeout(() => { setCopied(false); setTimeout(onClose, 500); }, 1500);
          }}
          className={`w-full py-4 rounded-full font-semibold transition-all ${copied ? 'bg-emerald-500 text-white' : 'bg-white text-black hover:bg-gray-200'}`}
        >
          {copied
            ? <span className="flex items-center justify-center gap-2"><Check className="w-5 h-5" />Copied!</span>
            : 'Copy Link'}
        </button>
        <button onClick={onClose} className="w-full py-4 bg-white/5 hover:bg-white/10 rounded-full font-semibold text-white">
          Cancel
        </button>
      </div>
    </div>,
    document.body,
  );
};

// ─── FloatingHearts ───────────────────────────────────────────────────────────
const FloatingHearts = ({ hearts }: {
  hearts: Array<{ id: number; x: number; y: number; angle: number; distance: number }>;
}) => {
  if (typeof window === 'undefined' || hearts.length === 0) return null;
  return createPortal(
    <>
      <style>{`
        @keyframes floatHeart {
          0%   { transform:translate(0,0) scale(0) rotate(0deg); opacity:0 }
          10%  { opacity:1; transform:translate(0,0) scale(1) rotate(var(--rotate)) }
          50%  { transform:translate(var(--tx),var(--ty)) scale(1.3) rotate(var(--rotate)); opacity:.95 }
          100% { transform:translate(calc(var(--tx)*1.5),calc(var(--ty)*1.8)) scale(.2) rotate(var(--rotate)); opacity:0 }
        }
        .heart-float {
          animation: floatHeart 1.2s cubic-bezier(.25,.46,.45,.94) forwards;
          pointer-events: none; position: fixed; z-index: 9999;
          filter: drop-shadow(0 4px 12px rgba(244,63,94,.5));
        }
      `}</style>
      {hearts.map((heart, i) => {
        const rad = (heart.angle * Math.PI) / 180;
        return (
          <Heart
            key={heart.id}
            className="heart-float text-rose-500 fill-rose-500"
            style={{
              left: `${heart.x}px`, top: `${heart.y}px`,
              width: '34px', height: '34px',
              '--tx': `${Math.cos(rad) * heart.distance}px`,
              '--ty': `${Math.sin(rad) * heart.distance - 50}px`,
              '--rotate': `${(Math.random() - 0.5) * 45}deg`,
              animationDelay: `${i * 0.08}s`,
            } as React.CSSProperties}
          />
        );
      })}
    </>,
    document.body,
  );
};

// ─── Shimmer skeleton ─────────────────────────────────────────────────────────
const Shimmer = ({ className }: { className: string }) => (
  <div className={`shimmer rounded ${className}`} />
);

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function WallpaperDetailPage() {
  const router     = useRouter();
  const params     = useParams();
  const id         = params?.id as string;
  const { session } = useAuth();
  const supabase   = useMemo(() => createClient(), []);

  const [wallpaper,   setWallpaper]   = useState<Wallpaper | null>(null);
  const [pageLoading, setPageLoading] = useState(true);
  const [imgLoaded,   setImgLoaded]   = useState(false);
  const [counts,      setCounts]      = useState({ likes: 0, downloads: 0, views: 0 });
  const [hearts,      setHearts]      = useState<Array<{ id: number; x: number; y: number; angle: number; distance: number }>>([]);
  const [state, setState] = useState({
    liked: false, saved: false, following: false,
    downloading: false, downloaded: false, dataLoading: true,
    showLoginPrompt: false, loginAction: '',
    isCopyModalOpen: false, timeAgo: '',
  });

  const likeButtonRef = useRef<HTMLButtonElement>(null);
  const viewedRef     = useRef(false);

  // ── Fetch wallpaper ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    (async () => {
      try {
        const data = await fetchWallpaperById(id);
        if (!data) { router.replace('/'); return; }
        if (cancelled) return;
        setWallpaper(data);
        setCounts({ likes: data.likes, downloads: data.downloads, views: data.views });
      } catch {
        router.replace('/');
      } finally {
        if (!cancelled) setPageLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [id]);

  // ── Time ago ────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!wallpaper?.createdAt) return;
    const compute = () => {
      const diff = Math.floor((Date.now() - new Date(wallpaper.createdAt!).getTime()) / 1000);
      setState(s => ({
        ...s,
        timeAgo:
          diff < 60      ? 'Just now'
          : diff < 3_600   ? `${Math.floor(diff / 60)}m ago`
          : diff < 86_400  ? `${Math.floor(diff / 3_600)}h ago`
          : diff < 604_800 ? `${Math.floor(diff / 86_400)}d ago`
          :                  `${Math.floor(diff / 604_800)}w ago`,
      }));
    };
    compute();
    const t = setInterval(compute, 60_000);
    return () => clearInterval(t);
  }, [wallpaper?.createdAt]);

  // ── Interactions + view increment ───────────────────────────────────────────
  useEffect(() => {
    if (!wallpaper) return;
    if (!session) { setState(s => ({ ...s, dataLoading: false })); return; }

    const userId   = session.user.id;
    const cacheKey = `${wallpaper.id}-${userId}`;
    const cached   = cache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      setState(s => ({ ...s, liked: cached.liked, saved: cached.saved, following: cached.following, dataLoading: false }));
      setCounts(c => ({ ...c, likes: cached.likeCount }));
      return;
    }

    (async () => {
      if (!viewedRef.current) {
        viewedRef.current = true;
        await incrementViews(wallpaper.id);
        setCounts(c => ({ ...c, views: c.views + 1 }));
      }

      const [likeRes, saveRes, followRes, likeCountRes] = await Promise.all([
        supabase.from('likes').select('id').eq('user_id', userId).eq('wallpaper_id', wallpaper.id).maybeSingle(),
        supabase.from('saves').select('id').eq('user_id', userId).eq('wallpaper_id', wallpaper.id).maybeSingle(),
        wallpaper.userId
          ? supabase.from('follows').select('id').eq('follower_id', userId).eq('following_id', wallpaper.userId).maybeSingle()
          : Promise.resolve({ data: null }),
        supabase.from('likes').select('id', { count: 'exact' }).eq('wallpaper_id', wallpaper.id),
      ]);

      const next = {
        liked: !!likeRes.data, saved: !!saveRes.data, following: !!followRes.data,
        likeCount: likeCountRes.count ?? 0, timestamp: Date.now(),
      };
      setState(s => ({ ...s, ...next, dataLoading: false }));
      setCounts(c => ({ ...c, likes: next.likeCount }));
      cache.set(cacheKey, next);
    })();
  }, [wallpaper?.id, session?.user?.id]);

  // ── Realtime like count ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!wallpaper) return;
    const channel = supabase
      .channel(`wallpaper-likes-${wallpaper.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'likes', filter: `wallpaper_id=eq.${wallpaper.id}` },
        async () => {
          const { count } = await supabase.from('likes').select('id', { count: 'exact' }).eq('wallpaper_id', wallpaper.id);
          setCounts(c => ({ ...c, likes: count ?? 0 }));
        })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [wallpaper?.id]);

  // ── Helpers ─────────────────────────────────────────────────────────────────
  const vibrate     = (d: number) => navigator.vibrate?.(d);
  const fmt         = (n: number) => n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);
  const requireAuth = (action: string, cb: () => void) => {
    if (!session) setState(s => ({ ...s, loginAction: action, showLoginPrompt: true }));
    else cb();
  };

  // ── Like ────────────────────────────────────────────────────────────────────
  const handleLike = () => requireAuth('like wallpapers', async () => {
    if (!wallpaper) return;
    const newLiked = !state.liked;
    setState(s => ({ ...s, liked: newLiked }));
    setCounts(c => ({ ...c, likes: newLiked ? c.likes + 1 : Math.max(0, c.likes - 1) }));
    vibrate(50);

    const cacheKey = `${wallpaper.id}-${session!.user.id}`;
    const cached   = cache.get(cacheKey);
    if (cached) cache.set(cacheKey, { ...cached, liked: newLiked, likeCount: newLiked ? cached.likeCount + 1 : cached.likeCount - 1, timestamp: Date.now() });

    if (newLiked && likeButtonRef.current) {
      const rect = likeButtonRef.current.getBoundingClientRect();
      setHearts(Array.from({ length: 8 }, (_, i) => ({
        id: Date.now() + i,
        x: rect.left + rect.width / 2 - 17,
        y: rect.top + rect.height / 2 - 17,
        angle: -90 + (i * 270 / 7) + (Math.random() - 0.5) * 20,
        distance: 100 + Math.random() * 80,
      })));
      setTimeout(() => setHearts([]), 1400);
    }

    if (newLiked) await supabase.from('likes').insert({ user_id: session!.user.id, wallpaper_id: wallpaper.id });
    else          await supabase.from('likes').delete().eq('user_id', session!.user.id).eq('wallpaper_id', wallpaper.id);
  });

  // ── Save ────────────────────────────────────────────────────────────────────
  const handleSave = () => requireAuth('save wallpapers', async () => {
    if (!wallpaper) return;
    const newSaved = !state.saved;
    setState(s => ({ ...s, saved: newSaved }));
    vibrate(50);
    const cacheKey = `${wallpaper.id}-${session!.user.id}`;
    const cached   = cache.get(cacheKey);
    if (cached) cache.set(cacheKey, { ...cached, saved: newSaved, timestamp: Date.now() });
    if (newSaved) await supabase.from('saves').insert({ user_id: session!.user.id, wallpaper_id: wallpaper.id });
    else          await supabase.from('saves').delete().eq('user_id', session!.user.id).eq('wallpaper_id', wallpaper.id);
  });

  // ── Follow ──────────────────────────────────────────────────────────────────
  const handleFollow = () => requireAuth('follow users', async () => {
    if (!wallpaper?.userId) return;
    const newFollowing = !state.following;
    setState(s => ({ ...s, following: newFollowing }));
    vibrate(50);
    const cacheKey = `${wallpaper.id}-${session!.user.id}`;
    const cached   = cache.get(cacheKey);
    if (cached) cache.set(cacheKey, { ...cached, following: newFollowing, timestamp: Date.now() });
    if (newFollowing) await supabase.from('follows').insert({ follower_id: session!.user.id, following_id: wallpaper.userId });
    else              await supabase.from('follows').delete().eq('follower_id', session!.user.id).eq('following_id', wallpaper.userId);
  });

  // ── Download ────────────────────────────────────────────────────────────────
  const handleDownload = async () => {
    if (!wallpaper || state.downloading || state.downloaded) return;
    setState(s => ({ ...s, downloading: true }));
    vibrate(50);
    await incrementDownloads(wallpaper.id);
    setCounts(c => ({ ...c, downloads: c.downloads + 1 }));
    const link = document.createElement('a');
    link.href = wallpaper.url;
    link.download = wallpaper.title || 'wallpaper';
    link.click();
    setTimeout(() => { setState(s => ({ ...s, downloading: false, downloaded: true })); vibrate(100); }, 1000);
  };

  // ── Share ────────────────────────────────────────────────────────────────────
  const handleShare = () => {
    if (navigator.share) {
      navigator.share({ title: wallpaper?.title, url: window.location.href })
        .catch(() => setState(s => ({ ...s, isCopyModalOpen: true })));
    } else {
      setState(s => ({ ...s, isCopyModalOpen: true }));
    }
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-black text-white overflow-x-hidden">
      <style>{`
        @keyframes scaleIn       { 0%{transform:scale(0)} 50%{transform:scale(1.2)} 100%{transform:scale(1)} }
        @keyframes successBounce { 0%,100%{transform:scale(1)} 50%{transform:scale(1.1)} }
        @keyframes spin          { to{transform:rotate(360deg)} }
        @keyframes shimmer       { 0%{background-position:-200% 0} 100%{background-position:200% 0} }
        .scale-in   { animation:scaleIn .4s cubic-bezier(.34,1.56,.64,1) }
        .spinner    { animation:spin .6s linear infinite }
        .shimmer    {
          background: linear-gradient(90deg, #ffffff0a 25%, #ffffff14 50%, #ffffff0a 75%);
          background-size: 200% 100%;
          animation: shimmer 1.5s infinite;
        }
      `}</style>

      <FloatingHearts hearts={hearts} />
      <LoginPromptModal
        isOpen={state.showLoginPrompt}
        onClose={() => setState(s => ({ ...s, showLoginPrompt: false }))}
        action={state.loginAction}
      />
      <CopyLinkModal
        isOpen={state.isCopyModalOpen}
        onClose={() => setState(s => ({ ...s, isCopyModalOpen: false }))}
        link={typeof window !== 'undefined' ? window.location.href : ''}
      />

      {/* ── FULL-BLEED IMAGE SECTION ─────────────────────────────────────────── */}
      {/* Covers the full width of the screen — same as Pinterest */}
      <div
        className="relative w-full"
        style={{
          // Full-screen height but aspect-ratio driven — image fills edge to edge
          minHeight: '60vh',
          background: '#111',
        }}
      >
        {pageLoading ? (
          <div className="w-full shimmer" style={{ height: '75vh', borderRadius: 0 }} />
        ) : (
          <div className="relative w-full" style={{ minHeight: '65vh' }}>
            {/* Blurred placeholder while loading */}
            {!imgLoaded && (
              <div
                className="absolute inset-0 shimmer"
                style={{ borderRadius: 0 }}
              />
            )}
            <Image
              src={wallpaper!.url}
              alt={wallpaper!.title}
              fill
              priority
              // ✅ cover fills the container exactly like Pinterest — no letterboxing
              className="object-cover"
              sizes="100vw"
              style={{
                opacity: imgLoaded ? 1 : 0,
                transition: 'opacity 0.35s ease',
              }}
              onLoad={() => setImgLoaded(true)}
            />

            {/* Subtle bottom gradient so info below reads cleanly */}
            <div style={{
              position: 'absolute',
              bottom: 0, left: 0, right: 0,
              height: '120px',
              background: 'linear-gradient(to top, rgba(0,0,0,0.85), transparent)',
              pointerEvents: 'none',
            }} />
          </div>
        )}

        {/* ── FLOATING BACK BUTTON — top-left, white rounded square ─────────── */}
        <button
          onClick={() => router.back()}
          style={{
            position: 'absolute',
            top: 16,
            left: 16,
            zIndex: 20,
            width: 48,
            height: 48,
            borderRadius: 14,
            background: 'rgba(255,255,255,0.95)',
            backdropFilter: 'blur(8px)',
            border: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
            cursor: 'pointer',
            transition: 'transform 0.15s, opacity 0.15s',
          }}
          onMouseDown={e => (e.currentTarget.style.transform = 'scale(0.93)')}
          onMouseUp={e => (e.currentTarget.style.transform = 'scale(1)')}
          onTouchStart={e => (e.currentTarget.style.transform = 'scale(0.93)')}
          onTouchEnd={e => (e.currentTarget.style.transform = 'scale(1)')}
          aria-label="Go back"
        >
          <ChevronLeft style={{ width: 26, height: 26, color: '#111', strokeWidth: 2.5 }} />
        </button>

        {/* ── FLOATING LIKE + SHARE bar — bottom-right, like Pinterest ────────── */}
        {!pageLoading && (
          <div style={{
            position: 'absolute',
            bottom: 16,
            right: 16,
            zIndex: 20,
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
          }}>
            {/* Like button */}
            <button
              ref={likeButtonRef}
              onClick={handleLike}
              style={{
                width: 52,
                height: 52,
                borderRadius: '50%',
                background: state.liked ? '#f43f5e' : 'rgba(255,255,255,0.92)',
                backdropFilter: 'blur(8px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: 'none',
                cursor: 'pointer',
                boxShadow: '0 4px 16px rgba(0,0,0,0.25)',
                transition: 'all 0.2s cubic-bezier(.34,1.56,.64,1)',
              }}
              aria-label="Like wallpaper"
            >
              <Heart
                style={{
                  width: 24,
                  height: 24,
                  color: state.liked ? '#fff' : '#111',
                  fill: state.liked ? '#fff' : 'none',
                  transition: 'all 0.2s',
                }}
              />
            </button>

         {/* Save button */}
            <button
              onClick={handleSave}
              style={{
                width: 52,
                height: 52,
                borderRadius: '50%',
                background: state.saved ? '#3b82f6' : 'rgba(255,255,255,0.92)',
                backdropFilter: 'blur(8px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: 'none',
                cursor: 'pointer',
                boxShadow: '0 4px 16px rgba(0,0,0,0.25)',
                transition: 'all 0.2s cubic-bezier(.34,1.56,.64,1)',
              }}
              aria-label="Save wallpaper"
            >
              <Bookmark
                style={{
                  width: 22,
                  height: 22,
                  color: state.saved ? '#fff' : '#111',
                  fill: state.saved ? '#fff' : 'none',
                  transition: 'all 0.2s',
                }}
              />
            </button>

            {/* Share button */}
            <button
              onClick={handleShare}
              style={{
                width: 52,
                height: 52,
                borderRadius: '50%',
                background: 'rgba(255,255,255,0.92)',
                backdropFilter: 'blur(8px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: 'none',
                cursor: 'pointer',
                boxShadow: '0 4px 16px rgba(0,0,0,0.25)',
                transition: 'transform 0.15s',
              }}
              aria-label="Share wallpaper"
            >
              <Share2 style={{ width: 22, height: 22, color: '#111' }} />
            </button>
          </div>
        )}

        {/* ── LIKE COUNT — bottom-left over image ─────────────────────────────── */}
        {!pageLoading && counts.likes > 0 && (
          <div style={{
            position: 'absolute',
            bottom: 20,
            left: 16,
            zIndex: 20,
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}>
            <Heart style={{ width: 16, height: 16, color: '#f43f5e', fill: '#f43f5e' }} />
            <span style={{ color: '#fff', fontSize: 14, fontWeight: 600, textShadow: '0 1px 4px rgba(0,0,0,0.5)' }}>
              {fmt(counts.likes)}
            </span>
          </div>
        )}
      </div>

      {/* ── INFO SECTION — slides directly below image ───────────────────────── */}
      <div style={{ background: '#000', padding: '16px 16px 100px' }}>

        {/* User row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          {pageLoading ? (
            <>
              <Shimmer className="w-11 h-11 rounded-full" />
              <div style={{ flex: 1 }}>
                <Shimmer className="h-4 w-32 mb-2" />
                <Shimmer className="h-3 w-20" />
              </div>
              <Shimmer className="w-20 h-9 rounded-full" />
            </>
          ) : (
            <>
              <button
                onClick={() => router.push(`/user/${wallpaper!.userId}`)}
                style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, background: 'none', border: 'none', cursor: 'pointer', padding: 0, textAlign: 'left' }}
              >
                <div style={{ position: 'relative', width: 44, height: 44, borderRadius: '50%', overflow: 'hidden', flexShrink: 0, border: '2px solid rgba(255,255,255,0.15)' }}>
                  <Image src={wallpaper!.userAvatar} alt={wallpaper!.uploadedBy} fill className="object-cover" sizes="44px" />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ color: '#fff', fontWeight: 600, fontSize: 15 }}>{wallpaper!.uploadedBy}</span>
                    {wallpaper!.verified && <VerifiedBadge size="sm" />}
                  </div>
                  <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13 }}>{state.timeAgo || 'Just now'}</span>
                </div>
              </button>

              {/* Follow button — Pinterest-style: white pill */}
              {state.dataLoading ? (
                <Shimmer className="w-20 h-9 rounded-full" />
              ) : (
                <button
                  onClick={handleFollow}
                  style={{
                    padding: '8px 20px',
                    borderRadius: 9999,
                    fontSize: 14,
                    fontWeight: 600,
                    border: state.following ? '1.5px solid rgba(255,255,255,0.25)' : 'none',
                    background: state.following ? 'transparent' : '#fff',
                    color: state.following ? '#fff' : '#000',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    flexShrink: 0,
                  }}
                >
                  {state.following ? 'Following' : 'Follow'}
                </button>
              )}
            </>
          )}
        </div>

        {/* Title */}
        {pageLoading ? (
          <div style={{ marginBottom: 16 }}>
            <Shimmer className="h-5 w-48 mb-2" />
            <Shimmer className="h-4 w-full mb-1" />
            <Shimmer className="h-4 w-3/4" />
          </div>
        ) : (
          <div style={{ marginBottom: 16 }}>
            <h2 style={{ color: '#fff', fontWeight: 700, fontSize: 18, marginBottom: 6, lineHeight: 1.3 }}>
              {wallpaper!.title}
            </h2>
            {wallpaper!.description && (
              <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 14, lineHeight: 1.6 }}>
                {wallpaper!.description}
              </p>
            )}
          </div>
        )}

        {/* Stats row */}
        {!pageLoading && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 20 }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 5, color: 'rgba(255,255,255,0.45)', fontSize: 13 }}>
              <Eye style={{ width: 15, height: 15 }} />
              {fmt(counts.views)}
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 5, color: state.liked ? '#f43f5e' : 'rgba(255,255,255,0.45)', fontSize: 13 }}>
              <Heart style={{ width: 15, height: 15, fill: state.liked ? '#f43f5e' : 'none' }} />
              {fmt(counts.likes)}
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 5, color: 'rgba(255,255,255,0.45)', fontSize: 13 }}>
              <Download style={{ width: 15, height: 15 }} />
              {fmt(counts.downloads)}
            </span>
          </div>
        )}

        {/* ── BOTTOM ACTIONS — Pinterest-style: Download (big) + Share + Copy ── */}
        {!pageLoading && (
          <div style={{ display: 'flex', gap: 12 }}>
            {/* Download — big primary button */}
            <button
              onClick={handleDownload}
              disabled={state.downloading}
              style={{
                flex: 1,
                padding: '14px 0',
                borderRadius: 9999,
                background: state.downloaded ? '#10b981' : '#e60023', // Pinterest red
                color: '#fff',
                fontWeight: 700,
                fontSize: 16,
                border: 'none',
                cursor: state.downloading ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                transition: 'all 0.25s cubic-bezier(.34,1.56,.64,1)',
                opacity: state.downloading ? 0.8 : 1,
                boxShadow: '0 4px 20px rgba(230,0,35,0.35)',
              }}
            >
              {state.downloading ? (
                <Loader2 style={{ width: 20, height: 20, animation: 'spin 0.6s linear infinite' }} />
              ) : state.downloaded ? (
                <><Check style={{ width: 20, height: 20 }} /> Downloaded</>
              ) : (
                <><Download style={{ width: 20, height: 20 }} /> Download</>
              )}
            </button>

            {/* Share */}
            <button
              onClick={handleShare}
              style={{
                width: 54,
                height: 54,
                borderRadius: '50%',
                background: 'rgba(255,255,255,0.08)',
                border: '1.5px solid rgba(255,255,255,0.12)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'background 0.15s',
              }}
              aria-label="Share"
            >
              <Share2 style={{ width: 20, height: 20, color: '#fff' }} />
            </button>

            {/* Copy link */}
            <button
              onClick={() => setState(s => ({ ...s, isCopyModalOpen: true }))}
              style={{
                width: 54,
                height: 54,
                borderRadius: '50%',
                background: 'rgba(255,255,255,0.08)',
                border: '1.5px solid rgba(255,255,255,0.12)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'background 0.15s',
              }}
              aria-label="Copy link"
            >
              <LinkIcon style={{ width: 20, height: 20, color: '#fff' }} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
