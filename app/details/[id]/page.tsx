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

const detailCache = new Map<string, {
  liked: boolean; saved: boolean; following: boolean;
  likeCount: number; timestamp: number;
}>();
const CACHE_TTL = 30_000;

// ─── Persistent image cache (shared with WallpaperCard) ──────────────────────
// If the user tapped a card from the feed, that image URL is already cached —
// so the detail page shows it instantly with no skeleton.
const imgCache = (() => {
  const mem = new Set<string>();
  try {
    const saved = sessionStorage.getItem('__wpcache__');
    if (saved) (JSON.parse(saved) as string[]).forEach(u => mem.add(u));
  } catch { /* SSR / quota */ }
  return {
    has: (url: string) => mem.has(url),
    add: (url: string) => {
      mem.add(url);
      try { sessionStorage.setItem('__wpcache__', JSON.stringify([...mem].slice(-300))); } catch { }
    },
  };
})();

// ─── CopyLinkModal ────────────────────────────────────────────────────────────
const CopyLinkModal = ({ isOpen, onClose, link }: { isOpen: boolean; onClose: () => void; link: string }) => {
  const [copied, setCopied] = useState(false);
  if (!isOpen) return null;
  return createPortal(
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[200] flex items-end" onClick={onClose}>
      <div className="w-full bg-gradient-to-b from-zinc-900 to-black rounded-t-3xl p-6 space-y-4" onClick={e => e.stopPropagation()}>
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
          {copied ? <span className="flex items-center justify-center gap-2"><Check className="w-5 h-5" />Copied!</span> : 'Copy Link'}
        </button>
        <button onClick={onClose} className="w-full py-4 bg-white/5 hover:bg-white/10 rounded-full font-semibold text-white">Cancel</button>
      </div>
    </div>,
    document.body,
  );
};

// ─── Floating hearts ──────────────────────────────────────────────────────────
const FloatingHearts = ({ hearts }: { hearts: Array<{ id: number; x: number; y: number; angle: number; distance: number }> }) => {
  if (typeof window === 'undefined' || hearts.length === 0) return null;
  return createPortal(
    <>
      <style>{`
        @keyframes floatHeart{0%{transform:translate(0,0) scale(0);opacity:0}10%{opacity:1;transform:scale(1) rotate(var(--rotate))}50%{transform:translate(var(--tx),var(--ty)) scale(1.3) rotate(var(--rotate));opacity:.95}100%{transform:translate(calc(var(--tx)*1.5),calc(var(--ty)*1.8)) scale(.2) rotate(var(--rotate));opacity:0}}
        .heart-float{animation:floatHeart 1.2s cubic-bezier(.25,.46,.45,.94) forwards;pointer-events:none;position:fixed;z-index:9999;filter:drop-shadow(0 4px 12px rgba(244,63,94,.5))}
      `}</style>
      {hearts.map((h, i) => {
        const rad = (h.angle * Math.PI) / 180;
        return (
          <Heart key={h.id} className="heart-float text-rose-500 fill-rose-500"
            style={{ left: `${h.x}px`, top: `${h.y}px`, width: 28, height: 28,
              '--tx': `${Math.cos(rad) * h.distance}px`,
              '--ty': `${Math.sin(rad) * h.distance - 50}px`,
              '--rotate': `${(Math.random() - .5) * 45}deg`,
              animationDelay: `${i * .08}s`,
            } as React.CSSProperties}
          />
        );
      })}
    </>,
    document.body,
  );
};

const Shimmer = ({ className }: { className: string }) => (
  <div className={`shimmer rounded ${className}`} />
);

const fmt = (n: number) => n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function WallpaperDetailPage() {
  const router   = useRouter();
  const params   = useParams();
  const id       = params?.id as string;
  const { session } = useAuth();
  const supabase = useMemo(() => createClient(), []);

  const [wallpaper,   setWallpaper]   = useState<Wallpaper | null>(null);
  const [pageLoading, setPageLoading] = useState(true);
  const [imgSize,     setImgSize]     = useState({ width: 1080, height: 1920 });
  const [counts,      setCounts]      = useState({ likes: 0, downloads: 0, views: 0 });
  const [hearts,      setHearts]      = useState<Array<{ id: number; x: number; y: number; angle: number; distance: number }>>([]);
  const [state, setState] = useState({
    liked: false, saved: false, following: false,
    downloading: false, downloaded: false, dataLoading: true,
    showLoginPrompt: false, loginAction: '', isCopyModalOpen: false, timeAgo: '',
  });

  // Check if image was already cached from the feed grid — instant render
  const [imgLoaded, setImgLoaded] = useState(false);

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
        // If this image was cached from the grid card, mark loaded immediately
        if (imgCache.has(data.url)) setImgLoaded(true);
        setCounts({ likes: data.likes, downloads: data.downloads, views: data.views });
      } catch { router.replace('/'); }
      finally { if (!cancelled) setPageLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [id]);

  // ── Time ago ────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!wallpaper?.createdAt) return;
    const compute = () => {
      const diff = Math.floor((Date.now() - new Date(wallpaper.createdAt!).getTime()) / 1000);
      const timeAgo =
        diff < 60      ? 'Just now'
        : diff < 3600  ? `${Math.floor(diff / 60)}m ago`
        : diff < 86400 ? `${Math.floor(diff / 3600)}h ago`
        : diff < 604800? `${Math.floor(diff / 86400)}d ago`
        :                `${Math.floor(diff / 604800)}w ago`;
      setState(s => ({ ...s, timeAgo }));
    };
    compute();
    const t = setInterval(compute, 60_000);
    return () => clearInterval(t);
  }, [wallpaper?.createdAt]);

  // ── User interaction state + view increment ─────────────────────────────────
  useEffect(() => {
    if (!wallpaper) return;
    if (!session) { setState(s => ({ ...s, dataLoading: false })); return; }
    const userId   = session.user.id;
    const cacheKey = `${wallpaper.id}-${userId}`;
    const cached   = detailCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
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
      detailCache.set(cacheKey, next);
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
    navigator.vibrate?.(50);
    const cacheKey = `${wallpaper.id}-${session!.user.id}`;
    const cached   = detailCache.get(cacheKey);
    if (cached) detailCache.set(cacheKey, { ...cached, liked: newLiked, likeCount: newLiked ? cached.likeCount + 1 : cached.likeCount - 1, timestamp: Date.now() });
    if (newLiked && likeButtonRef.current) {
      const r = likeButtonRef.current.getBoundingClientRect();
      setHearts(Array.from({ length: 8 }, (_, i) => ({
        id: Date.now() + i,
        x: r.left + r.width / 2 - 14,
        y: r.top + r.height / 2 - 14,
        angle: -90 + (i * 270 / 7) + (Math.random() - .5) * 20,
        distance: 80 + Math.random() * 60,
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
    navigator.vibrate?.(50);
    const cacheKey = `${wallpaper.id}-${session!.user.id}`;
    const cached   = detailCache.get(cacheKey);
    if (cached) detailCache.set(cacheKey, { ...cached, saved: newSaved, timestamp: Date.now() });
    if (newSaved) await supabase.from('saves').insert({ user_id: session!.user.id, wallpaper_id: wallpaper.id });
    else          await supabase.from('saves').delete().eq('user_id', session!.user.id).eq('wallpaper_id', wallpaper.id);
  });

  // ── Follow ──────────────────────────────────────────────────────────────────
  const handleFollow = () => requireAuth('follow users', async () => {
    if (!wallpaper?.userId) return;
    const newFollowing = !state.following;
    setState(s => ({ ...s, following: newFollowing }));
    navigator.vibrate?.(50);
    const cacheKey = `${wallpaper.id}-${session!.user.id}`;
    const cached   = detailCache.get(cacheKey);
    if (cached) detailCache.set(cacheKey, { ...cached, following: newFollowing, timestamp: Date.now() });
    if (newFollowing) await supabase.from('follows').insert({ follower_id: session!.user.id, following_id: wallpaper.userId });
    else              await supabase.from('follows').delete().eq('follower_id', session!.user.id).eq('following_id', wallpaper.userId);
  });

  // ── Download (real blob, not redirect) ─────────────────────────────────────
  const handleDownload = async () => {
    if (!wallpaper || state.downloading || state.downloaded) return;
    setState(s => ({ ...s, downloading: true }));
    navigator.vibrate?.(50);
    try {
      await incrementDownloads(wallpaper.id);
      setCounts(c => ({ ...c, downloads: c.downloads + 1 }));
      const res  = await fetch(wallpaper.url);
      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const a    = Object.assign(document.createElement('a'), { href: url, download: `${wallpaper.title || 'wallpaper'}.jpg` });
      a.click();
      URL.revokeObjectURL(url);
      setState(s => ({ ...s, downloading: false, downloaded: true }));
      navigator.vibrate?.(100);
    } catch {
      setState(s => ({ ...s, downloading: false }));
    }
  };

  // ── Share ───────────────────────────────────────────────────────────────────
  const handleShare = () => {
    if (navigator.share) navigator.share({ title: wallpaper?.title, url: window.location.href })
      .catch(() => setState(s => ({ ...s, isCopyModalOpen: true })));
    else setState(s => ({ ...s, isCopyModalOpen: true }));
  };

  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-black text-white overflow-x-hidden">
      <style>{`
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes shimmer{0%{background-position:-200% 0}100%{background-position:200% 0}}
        .spinner{animation:spin .6s linear infinite}
        .shimmer{background:linear-gradient(90deg,#ffffff0a 25%,#ffffff14 50%,#ffffff0a 75%);background-size:200% 100%;animation:shimmer 1.5s infinite}
      `}</style>

      <FloatingHearts hearts={hearts} />
      <LoginPromptModal isOpen={state.showLoginPrompt} onClose={() => setState(s => ({ ...s, showLoginPrompt: false }))} action={state.loginAction} />
      <CopyLinkModal isOpen={state.isCopyModalOpen} onClose={() => setState(s => ({ ...s, isCopyModalOpen: false }))} link={typeof window !== 'undefined' ? window.location.href : ''} />

      {/* ── FIXED HEADER ──────────────────────────────────────────────────────── */}
      <header className="fixed top-0 left-0 right-0 z-50 flex items-center px-4 pt-4 pb-2 bg-gradient-to-b from-black/70 to-transparent">
        <button
          onClick={() => router.back()}
          className="w-10 h-10 rounded-xl bg-white/90 flex items-center justify-center shadow-lg active:scale-95 transition-transform"
          aria-label="Go back"
        >
          <ChevronLeft className="w-5 h-5 text-zinc-900" strokeWidth={2.5} />
        </button>
      </header>

      {/* ── IMAGE — contained, with padding + radius (not full bleed) ─────────── */}
      <div className="pt-16 px-4">
        {pageLoading ? (
          <div className="w-full shimmer rounded-3xl" style={{ height: '70vh' }} />
        ) : (
          <div className="relative w-full rounded-3xl overflow-hidden bg-zinc-900 shadow-2xl">

            {/* Placeholder while image loads — hidden instantly if cached */}
            {!imgLoaded && (
              <div className="absolute inset-0 shimmer rounded-3xl" />
            )}

            {/*
              Natural aspect ratio image — full width of the contained card,
              natural height (no crop). Shows entire wallpaper like Pinterest detail.
            */}
            <Image
              src={wallpaper!.url}
              alt={wallpaper!.title}
              width={imgSize.width}
              height={imgSize.height}
              priority
              className={`w-full h-auto block transition-opacity duration-300 ${imgLoaded ? 'opacity-100' : 'opacity-0'}`}
              sizes="(max-width: 768px) 100vw, 600px"
              onLoad={e => {
                const img = e.currentTarget as HTMLImageElement;
                setImgSize({ width: img.naturalWidth || 1080, height: img.naturalHeight || 1920 });
                imgCache.add(wallpaper!.url);
                setImgLoaded(true);
              }}
            />

            {/* Like count — bottom left over image */}
            {imgLoaded && counts.likes > 0 && (
              <div className="absolute bottom-3 left-3 flex items-center gap-1 bg-black/40 backdrop-blur-sm px-2.5 py-1 rounded-full">
                <Heart className="w-3.5 h-3.5 text-rose-400 fill-rose-400" />
                <span className="text-white text-xs font-semibold">{fmt(counts.likes)}</span>
              </div>
            )}

            {/* ── Like + Save — bottom right, SMALLER buttons ─────────────────── */}
            {imgLoaded && (
              <div className="absolute bottom-3 right-3 flex flex-col gap-2">
                <button
                  ref={likeButtonRef}
                  onClick={handleLike}
                  className={`w-10 h-10 rounded-full flex items-center justify-center shadow-lg transition-all duration-200 active:scale-90 ${state.liked ? 'bg-rose-500' : 'bg-white/90 backdrop-blur-sm'}`}
                  aria-label="Like"
                >
                  <Heart className={`w-5 h-5 transition-all ${state.liked ? 'text-white fill-white' : 'text-zinc-900'}`} />
                </button>
                <button
                  onClick={handleSave}
                  className={`w-10 h-10 rounded-full flex items-center justify-center shadow-lg transition-all duration-200 active:scale-90 ${state.saved ? 'bg-blue-500' : 'bg-white/90 backdrop-blur-sm'}`}
                  aria-label="Save"
                >
                  <Bookmark className={`w-4.5 h-4.5 transition-all ${state.saved ? 'text-white fill-white' : 'text-zinc-900'}`} />
                </button>
              </div>
            )}
          </div>
        )}
      </div>

    {/* ── INFO SECTION ─────────────────────────────────────────────────────── */}
      <div className="px-4 pt-5 pb-28">

        {/* User row */}
        <div className="flex items-center gap-3 mb-4">
          {pageLoading ? (
            <>
              <Shimmer className="w-11 h-11 rounded-full" />
              <div className="flex-1"><Shimmer className="h-4 w-32 mb-2" /><Shimmer className="h-3 w-20" /></div>
              <Shimmer className="w-20 h-9 rounded-full" />
            </>
          ) : (
            <>
              <button
                onClick={() => router.push(`/user/${wallpaper!.userId}`)}
                className="flex items-center gap-3 flex-1 bg-transparent border-none cursor-pointer p-0 text-left"
              >
                <div className="relative w-11 h-11 rounded-full overflow-hidden flex-shrink-0 border-2 border-white/15">
                  <Image src={wallpaper!.userAvatar} alt={wallpaper!.uploadedBy} fill className="object-cover" sizes="44px" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-white font-semibold text-[15px]">{wallpaper!.uploadedBy}</span>
                    {wallpaper!.verified && <VerifiedBadge size="sm" />}
                  </div>
                  <span className="text-white/50 text-[13px]">{state.timeAgo || 'Just now'}</span>
                </div>
              </button>

              {state.dataLoading ? (
                <Shimmer className="w-20 h-9 rounded-full" />
              ) : (
                <button
                  onClick={handleFollow}
                  className={`px-5 py-2 rounded-full text-sm font-semibold flex-shrink-0 transition-all active:scale-95 ${state.following ? 'border border-white/25 text-white bg-transparent' : 'bg-white text-black'}`}
                >
                  {state.following ? 'Following' : 'Follow'}
                </button>
              )}
            </>
          )}
        </div>

        {/* Title + description */}
        {pageLoading ? (
          <div className="mb-4">
            <Shimmer className="h-5 w-48 mb-2" />
            <Shimmer className="h-4 w-full mb-1" />
            <Shimmer className="h-4 w-3/4" />
          </div>
        ) : (
          <div className="mb-4">
            <h2 className="text-white font-bold text-lg mb-1.5 leading-snug">{wallpaper!.title}</h2>
            {wallpaper!.description && (
              <p className="text-white/60 text-sm leading-relaxed">{wallpaper!.description}</p>
            )}
          </div>
        )}

        {/* Stats */}
        {!pageLoading && (
          <div className="flex items-center gap-5 mb-5">
            <span className="flex items-center gap-1.5 text-white/45 text-[13px]">
              <Eye className="w-[15px] h-[15px]" />{fmt(counts.views)}
            </span>
            <span className={`flex items-center gap-1.5 text-[13px] ${state.liked ? 'text-rose-500' : 'text-white/45'}`}>
              <Heart className={`w-[15px] h-[15px] ${state.liked ? 'fill-rose-500' : ''}`} />{fmt(counts.likes)}
            </span>
            <span className="flex items-center gap-1.5 text-white/45 text-[13px]">
              <Download className="w-[15px] h-[15px]" />{fmt(counts.downloads)}
            </span>
          </div>
        )}

        {/* Actions */}
        {!pageLoading && (
          <div className="flex gap-3">
            {/* Download — white pill */}
            <button
              onClick={handleDownload}
              disabled={state.downloading}
              className={`flex-1 py-3.5 rounded-full font-bold text-base flex items-center justify-center gap-2 transition-all active:scale-95 ${state.downloaded ? 'bg-emerald-500 text-white' : 'bg-white text-black'} ${state.downloading ? 'opacity-70 cursor-not-allowed' : ''}`}
            >
              {state.downloading
                ? <Loader2 className="w-5 h-5 spinner" />
                : state.downloaded
                  ? <><Check className="w-5 h-5" />Downloaded</>
                  : <><Download className="w-5 h-5" />Download</>}
            </button>

            {/* Share */}
            <button
              onClick={handleShare}
              className="w-[50px] h-[50px] rounded-full bg-white/8 border border-white/12 flex items-center justify-center cursor-pointer active:scale-95 transition-transform"
              aria-label="Share"
            >
              <Share2 className="w-5 h-5 text-white" />
            </button>

            {/* Copy link */}
            <button
              onClick={() => setState(s => ({ ...s, isCopyModalOpen: true }))}
              className="w-[50px] h-[50px] rounded-full bg-white/8 border border-white/12 flex items-center justify-center cursor-pointer active:scale-95 transition-transform"
              aria-label="Copy link"
            >
              <LinkIcon className="w-5 h-5 text-white" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
