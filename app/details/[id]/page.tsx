'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useRouter, useParams } from 'next/navigation';
import Image from 'next/image';
import { ChevronLeft, Eye, Heart, Download, Share2, Bookmark, Check, Link as LinkIcon, Loader2 } from 'lucide-react';
import { VerifiedBadge } from '@/app/components/VerifiedBadge';
import { LoginPromptModal } from '@/app/components/LoginPromptModal';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/app/components/AuthProvider';
import { fetchWallpaperById, incrementViews, incrementDownloads } from '@/lib/stores/wallpaperStore';
import type { Wallpaper } from '@/app/types';

// ─── Cache ────────────────────────────────────────────────────────────────────
const cache = new Map<string, { liked: boolean; saved: boolean; following: boolean; likeCount: number; timestamp: number }>();
const CACHE_DURATION = 30_000;

// ─── CopyLinkModal ────────────────────────────────────────────────────────────
const CopyLinkModal = ({ isOpen, onClose, link }: { isOpen: boolean; onClose: () => void; link: string }) => {
  const [copied, setCopied] = useState(false);
  if (!isOpen) return null;
  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.8)', backdropFilter:'blur(8px)', zIndex:60, display:'flex', alignItems:'flex-end' }} onClick={onClose}>
      <div className="w-full bg-gradient-to-b from-zinc-900 to-black rounded-t-3xl p-6 space-y-4" onClick={e => e.stopPropagation()}>
        <div className="w-12 h-1.5 bg-white/20 rounded-full mx-auto" />
        <h3 className="text-xl font-bold text-white text-center">Copy Link</h3>
        <div className="bg-white/5 rounded-xl p-4 flex items-center gap-3 border border-white/10">
          <LinkIcon className="w-5 h-5 text-white/60 flex-shrink-0" />
          <p className="text-sm text-white/80 flex-1 truncate">{link}</p>
        </div>
        <button
          onClick={async () => { await navigator.clipboard.writeText(link); setCopied(true); setTimeout(() => { setCopied(false); setTimeout(onClose, 500); }, 1500); }}
          className={`w-full py-4 rounded-full font-semibold transition-all ${copied ? 'bg-emerald-500 text-white' : 'bg-white text-black hover:bg-gray-200'}`}
        >
          {copied ? <span className="flex items-center justify-center gap-2"><Check className="w-5 h-5" />Copied!</span> : 'Copy Link'}
        </button>
        <button onClick={onClose} className="w-full py-4 bg-white/5 hover:bg-white/10 rounded-full font-semibold text-white">Cancel</button>
      </div>
    </div>
  );
};

// ─── FloatingHearts ───────────────────────────────────────────────────────────
const FloatingHearts = ({ hearts }: { hearts: Array<{ id: number; x: number; y: number; angle: number; distance: number }> }) => {
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
        .heart-float { animation:floatHeart 1.2s cubic-bezier(.25,.46,.45,.94) forwards; pointer-events:none; position:fixed; z-index:9999; filter:drop-shadow(0 4px 12px rgba(244,63,94,.5)); }
      `}</style>
      {hearts.map((heart, i) => {
        const rad = (heart.angle * Math.PI) / 180;
        return (
          <Heart key={heart.id} className="heart-float text-rose-500 fill-rose-500"
            style={{ left:`${heart.x}px`, top:`${heart.y}px`, width:'34px', height:'34px',
              '--tx':`${Math.cos(rad) * heart.distance}px`, '--ty':`${Math.sin(rad) * heart.distance - 50}px`,
              '--rotate':`${(Math.random() - 0.5) * 45}deg`, animationDelay:`${i * 0.08}s` } as React.CSSProperties} />
        );
      })}
    </>,
    document.body,
  );
};

// ─── Skeleton ─────────────────────────────────────────────────────────────────
const Shimmer = ({ className }: { className: string }) => <div className={`shimmer rounded ${className}`} />;

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function WallpaperDetailPage() {
  const router    = useRouter();
  const params    = useParams();
  const id        = params?.id as string;
  const { session } = useAuth();
  // ✅ Memoized — was recreated every render
  const supabase  = useMemo(() => createClient(), []);

  const [wallpaper,   setWallpaper]   = useState<Wallpaper | null>(null);
  const [pageLoading, setPageLoading] = useState(true);
  const [imgLoaded,   setImgLoaded]   = useState(false);
  const [counts,      setCounts]      = useState({ likes: 0, downloads: 0, views: 0 });
  const [hearts,      setHearts]      = useState<Array<{ id: number; x: number; y: number; angle: number; distance: number }>>([]);
  const [state, setState] = useState({
    liked: false, saved: false, following: false,
    downloading: false, downloaded: false, dataLoading: true,
    showLoginPrompt: false, loginAction: '', isCopyModalOpen: false, timeAgo: '',
  });

  const likeButtonRef = useRef<HTMLButtonElement>(null);
  const viewedRef     = useRef(false); // ✅ prevents double view increment on re-render

  // ── Fetch wallpaper ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        const data = await fetchWallpaperById(id);
        if (!data) { router.replace('/'); return; }
        setWallpaper(data);
        setCounts({ likes: data.likes, downloads: data.downloads, views: data.views });
      } catch {
        router.replace('/');
      } finally {
        setPageLoading(false);
      }
    })();
  }, [id]);

  // ── Time ago ────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!wallpaper?.createdAt) return;
    const compute = () => {
      const diff = Math.floor((Date.now() - new Date(wallpaper.createdAt!).getTime()) / 1000);
      setState(s => ({ ...s, timeAgo:
        diff < 60      ? 'Just now'                          :
        diff < 3_600   ? `${Math.floor(diff / 60)}m ago`    :
        diff < 86_400  ? `${Math.floor(diff / 3_600)}h ago` :
        diff < 604_800 ? `${Math.floor(diff / 86_400)}d ago`:
                         `${Math.floor(diff / 604_800)}w ago`
      }));
    };
    compute();
    const t = setInterval(compute, 60_000);
    return () => clearInterval(t);
  }, [wallpaper?.createdAt]);

  // ── Interactions + view increment ───────────────────────────────────────────
  // ✅ Uses session?.user?.id (stable string) not session object — prevents re-firing
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
      // ✅ Only increment view once per mount
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

      const next = { liked: !!likeRes.data, saved: !!saveRes.data, following: !!followRes.data, likeCount: likeCountRes.count ?? 0, timestamp: Date.now() };
      setState(s => ({ ...s, ...next, dataLoading: false }));
      setCounts(c => ({ ...c, likes: next.likeCount }));
      cache.set(cacheKey, next);
    })();
  }, [wallpaper?.id, session?.user?.id]); // ✅ stable string dep, not object

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
  const vibrate    = (d: number) => navigator.vibrate?.(d);
  const fmt        = (n: number) => n > 1000 ? `${(n / 1000).toFixed(1)}k` : n;
  const requireAuth = (action: string, cb: () => void) => {
    if (!session) setState(s => ({ ...s, loginAction: action, showLoginPrompt: true }));
    else cb();
  };

  // ── Like ────────────────────────────────────────────────────────────────────
  const handleLike = () => requireAuth('like wallpapers', async () => {
    if (!wallpaper) return;
    const newLiked = !state.liked;
    setState(s => ({ ...s, liked: newLiked }));
    setCounts(c => ({ ...c, likes: newLiked ? c.likes + 1 : c.likes - 1 }));
    vibrate(50);

    const cacheKey = `${wallpaper.id}-${session!.user.id}`;
    const cached   = cache.get(cacheKey);
    if (cached) cache.set(cacheKey, { ...cached, liked: newLiked, likeCount: newLiked ? cached.likeCount + 1 : cached.likeCount - 1, timestamp: Date.now() });

    if (newLiked && likeButtonRef.current) {
      const rect = likeButtonRef.current.getBoundingClientRect();
      setHearts(Array.from({ length: 8 }, (_, i) => ({
        id: Date.now() + i, x: rect.left + rect.width / 2 - 17, y: rect.top + rect.height / 2 - 17,
        angle: -90 + (i * 270 / 7) + (Math.random() - 0.5) * 20, distance: 100 + Math.random() * 80,
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
    link.href = wallpaper.url; link.download = wallpaper.title || 'wallpaper'; link.click();
    setTimeout(() => { setState(s => ({ ...s, downloading: false, downloaded: true })); vibrate(100); }, 1000);
  };

  const stats = [
    { icon: Eye,      value: counts.views,     active: false,           color: ''        },
    { icon: Heart,    value: counts.likes,     active: state.liked,     color: 'rose'    },
    { icon: Download, value: counts.downloads, active: state.downloaded, color: 'emerald' },
  ];

  const isLoading = pageLoading || state.dataLoading;

  return (
    <div className="min-h-screen bg-black text-white">
      <style>{`
        @keyframes scaleIn       { 0%{transform:scale(0)} 50%{transform:scale(1.2)} 100%{transform:scale(1)} }
        @keyframes successBounce { 0%,100%{transform:scale(1)} 50%{transform:scale(1.1)} }
        @keyframes spin          { to{transform:rotate(360deg)} }
        @keyframes shimmer       { 0%{background-position:-200% 0} 100%{background-position:200% 0} }
        .scale-in       { animation:scaleIn .4s cubic-bezier(.34,1.56,.64,1) }
        .success-bounce { animation:successBounce .5s ease-out }
        .spinner        { animation:spin .6s linear infinite }
        .shimmer        { background:linear-gradient(90deg,#ffffff0a 25%,#ffffff14 50%,#ffffff0a 75%); background-size:200% 100%; animation:shimmer 1.5s infinite; }
      `}</style>

      <FloatingHearts hearts={hearts} />
      <LoginPromptModal isOpen={state.showLoginPrompt} onClose={() => setState(s => ({ ...s, showLoginPrompt: false }))} action={state.loginAction} />

      {/* Fixed header */}
      <div style={{ position:'fixed', top:0, left:0, right:0, zIndex:10, background:'linear-gradient(to bottom,rgba(0,0,0,0.9),transparent)', padding:'12px 16px', display:'flex', alignItems:'center', gap:'12px' }}>
        <button onClick={() => router.back()} className="p-2.5 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-xl active:scale-95 transition-all flex-shrink-0">
          <ChevronLeft className="w-5 h-5 text-white" />
        </button>
        {/* ✅ h1 added — fixes heading hierarchy for accessibility */}
        <h1 className="text-sm font-semibold text-white truncate">
          {pageLoading ? 'Loading...' : wallpaper?.title}
        </h1>
      </div>

      <div className="max-w-2xl mx-auto p-4 pt-16 pb-8 space-y-4">

        {/* Main image — ✅ next/image for LCP optimization */}
        <div className="relative rounded-2xl overflow-hidden bg-zinc-900">
          {pageLoading ? (
            <div className="aspect-[9/16] shimmer rounded-2xl" />
          ) : (
            <div className="relative w-full" style={{ aspectRatio: '9/16' }}>
              {!imgLoaded && <div className="absolute inset-0 shimmer" />}
              <Image
                src={wallpaper!.url}
                alt={wallpaper!.title}
                fill
                priority                          // ✅ above-fold — high fetchpriority
                sizes="(max-width:672px) 100vw, 672px"
                className="object-contain"
                style={{ opacity: imgLoaded ? 1 : 0, transition: 'opacity 0.3s' }}
                onLoad={() => setImgLoaded(true)}
              />
            </div>
          )}
        </div>

        {/* User info */}
        <div className="flex items-center gap-3 p-2 rounded-xl">
          {pageLoading ? (
            <>
              <Shimmer className="w-10 h-10 rounded-full flex-shrink-0" />
              <div className="flex-1 space-y-2"><Shimmer className="h-4 w-32" /><Shimmer className="h-3 w-20" /></div>
              <Shimmer className="w-20 h-8 rounded-full" />
            </>
          ) : (
            <>
              <button onClick={() => router.push(`/user/${wallpaper!.userId}`)} className="flex items-center gap-3 flex-1 hover:bg-white/5 rounded-xl transition-colors">
                {/* ✅ next/image for avatar */}
                <div className="relative w-10 h-10 rounded-full border border-white/20 overflow-hidden flex-shrink-0">
                  <Image src={wallpaper!.userAvatar} alt={wallpaper!.uploadedBy} fill className="object-cover" sizes="40px" />
                </div>
                <div className="flex-1 text-left">
                  <div className="flex items-center gap-1.5">
                    <p className="font-semibold text-white">{wallpaper!.uploadedBy}</p>
                    {wallpaper!.verified && <VerifiedBadge size="sm" />}
                  </div>
                  <p className="text-sm text-white/60">{state.timeAgo || 'Just now'}</p>
                </div>
              </button>
              {state.dataLoading ? <Shimmer className="w-20 h-8 rounded-full" /> : (
                <button onClick={handleFollow}
                  className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-all active:scale-95 flex-shrink-0 ${state.following ? 'bg-white/10 text-white border border-white/20' : 'bg-white text-black hover:bg-gray-200'}`}>
                  {state.following ? 'Following' : 'Follow'}
                </button>
              )}
            </>
          )}
        </div>

        {/* Title & description — ✅ h2 not h3 (h1 is in header) */}
        {pageLoading ? (
          <div className="space-y-2"><Shimmer className="h-5 w-48" /><Shimmer className="h-4 w-full" /><Shimmer className="h-4 w-3/4" /></div>
        ) : (
          <div>
            <h2 className="font-semibold text-white mb-1">{wallpaper!.title}</h2>
            {wallpaper!.description && <p className="text-sm text-white/70 leading-relaxed">{wallpaper!.description}</p>}
          </div>
        )}

        {/* Stats */}
        {isLoading ? (
          <div className="flex items-center gap-6">{[1,2,3].map(i => <Shimmer key={i} className="h-4 w-16" />)}</div>
        ) : (
          <div className="flex items-center gap-6 text-sm text-white/50">
            {stats.map(({ icon: Icon, value, active, color }, i) => (
              <span key={i} className={`flex items-center gap-1.5 transition-colors ${active ? `text-${color}-400` : ''}`}>
                <Icon className={`w-4 h-4 ${active ? `fill-${color}-400 text-${color}-400` : ''}`} />
                {fmt(value)}
              </span>
            ))}
          </div>
        )}


         {/* Share & Copy */}
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => navigator.share ? navigator.share({ title: wallpaper?.title, url: window.location.href }).catch(() => setState(s => ({ ...s, isCopyModalOpen: true }))) : setState(s => ({ ...s, isCopyModalOpen: true }))}
            className="flex items-center justify-center gap-2 px-6 py-4 bg-white/5 hover:bg-white/10 rounded-xl transition-all active:scale-95">
            <Share2 className="w-5 h-5" /><span className="font-medium">Share</span>
          </button>
          <button onClick={() => setState(s => ({ ...s, isCopyModalOpen: true }))}
            className="flex items-center justify-center gap-2 px-6 py-4 bg-white/5 hover:bg-white/10 rounded-xl transition-all active:scale-95">
            <LinkIcon className="w-5 h-5" /><span className="font-medium">Copy Link</span>
          </button>
        </div>

      </div>

      <CopyLinkModal isOpen={state.isCopyModalOpen} onClose={() => setState(s => ({ ...s, isCopyModalOpen: false }))} link={typeof window !== 'undefined' ? window.location.href : ''} />
    </div>
  );
}