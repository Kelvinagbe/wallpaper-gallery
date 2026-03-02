
'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { ChevronLeft, Heart, Download, Share2, Check, Link as LinkIcon, Loader2, Maximize2, Minimize2 } from 'lucide-react';
import { VerifiedBadge } from '@/app/components/VerifiedBadge';
import { LoginPromptModal } from '@/app/components/LoginPromptModal';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/app/components/AuthProvider';
import { incrementViews, incrementDownloads } from '@/lib/stores/wallpaperStore';
import type { Wallpaper } from '@/app/types';

const cache = new Map<string, { liked: boolean; following: boolean; likeCount: number; timestamp: number }>();
const CACHE_TTL = 30_000;
const fmt = (n: number) => n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);
const SH = 'shimmer-light';

const imgCache = (() => {
  const mem = new Set<string>();
  try { (JSON.parse(sessionStorage.getItem('__wpcache__') || '[]') as string[]).forEach(u => mem.add(u)); } catch {}
  return {
    has: (u: string) => mem.has(u),
    add: (u: string) => { mem.add(u); try { sessionStorage.setItem('__wpcache__', JSON.stringify([...mem].slice(-300))); } catch {} },
  };
})();

const timeAgoStr = (date: string) => {
  const d = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  return d < 60 ? 'Just now' : d < 3600 ? `${Math.floor(d / 60)}m ago` : d < 86400 ? `${Math.floor(d / 3600)}h ago` : d < 604800 ? `${Math.floor(d / 86400)}d ago` : `${Math.floor(d / 604800)}w ago`;
};

// ─── CopyLinkModal ────────────────────────────────────────────────────────────
const CopyLinkModal = ({ isOpen, onClose, link }: { isOpen: boolean; onClose: () => void; link: string }) => {
  const [copied, setCopied] = useState(false);
  if (!isOpen) return null;
  const copy = async () => {
    await navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => { setCopied(false); setTimeout(onClose, 400); }, 1500);
  };
  return createPortal(
    <div className="fixed inset-0 z-[200] flex items-end" style={{ background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(8px)' }} onClick={onClose}>
      <div className="w-full rounded-t-3xl p-6 space-y-4 bg-white" onClick={e => e.stopPropagation()}>
        <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto" />
        <h3 className="text-lg font-bold text-gray-900 text-center">Share Link</h3>
        <div className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-gray-100">
          <LinkIcon className="w-4 h-4 text-gray-400 flex-shrink-0" />
          <p className="text-sm text-gray-600 flex-1 truncate">{link}</p>
        </div>
        <button onClick={copy} className="w-full py-4 rounded-2xl font-semibold text-sm text-white transition-all active:scale-[0.98]" style={{ background: copied ? '#10b981' : '#111' }}>
          {copied ? <span className="flex items-center justify-center gap-2"><Check className="w-4 h-4" />Copied!</span> : 'Copy Link'}
        </button>
        <button onClick={onClose} className="w-full py-3.5 rounded-2xl font-medium text-sm text-gray-500 bg-gray-100 active:scale-[0.98]">Cancel</button>
      </div>
    </div>,
    document.body,
  );
};

// ─── FloatingHearts ───────────────────────────────────────────────────────────
const FloatingHearts = ({ hearts }: { hearts: Array<{ id: number; x: number; y: number; angle: number; distance: number }> }) => {
  if (typeof window === 'undefined' || !hearts.length) return null;
  return createPortal(<>
    <style>{`@keyframes floatHeart{0%{transform:translate(0,0) scale(0);opacity:0}10%{opacity:1;transform:scale(1) rotate(var(--rotate))}50%{transform:translate(var(--tx),var(--ty)) scale(1.3) rotate(var(--rotate));opacity:.95}100%{transform:translate(calc(var(--tx)*1.5),calc(var(--ty)*1.8)) scale(.2) rotate(var(--rotate));opacity:0}}.heart-float{animation:floatHeart 1.2s cubic-bezier(.25,.46,.45,.94) forwards;pointer-events:none;position:fixed;z-index:9999;filter:drop-shadow(0 4px 12px rgba(244,63,94,.5))}`}</style>
    {hearts.map((h, i) => {
      const rad = (h.angle * Math.PI) / 180;
      return <Heart key={h.id} className="heart-float text-rose-500 fill-rose-500" style={{ left: `${h.x}px`, top: `${h.y}px`, width: 28, height: 28, '--tx': `${Math.cos(rad) * h.distance}px`, '--ty': `${Math.sin(rad) * h.distance - 50}px`, '--rotate': `${(Math.random() - .5) * 45}deg`, animationDelay: `${i * .08}s` } as React.CSSProperties} />;
    })}
  </>, document.body);
};

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function WallpaperDetail({ initialWallpaper }: { initialWallpaper: Wallpaper }) {
  const router = useRouter();
  const { session } = useAuth();
  const supabase = useMemo(() => createClient(), []);
  const wp = initialWallpaper;

  const [likes,     setLikes]     = useState(wp.likes);
  const [hearts,    setHearts]    = useState<Array<{ id: number; x: number; y: number; angle: number; distance: number }>>([]);
  const [full,      setFull]      = useState(false);
  const [imgLoaded, setImgLoaded] = useState(imgCache.has(wp.url));
  const [timeAgo,   setTimeAgo]   = useState(() => wp.createdAt ? timeAgoStr(wp.createdAt) : 'Just now');
  const [st, setSt] = useState({
    liked: false, following: false,
    downloading: false, downloaded: false, dataLoading: true,
    showLogin: false, loginAction: '', copyOpen: false,
  });

  const likeRef    = useRef<HTMLButtonElement>(null);
  const viewedRef  = useRef(false);
  const set = (patch: Partial<typeof st>) => setSt(s => ({ ...s, ...patch }));

  useEffect(() => {
    if (!wp.createdAt) return;
    const t = setInterval(() => setTimeAgo(timeAgoStr(wp.createdAt!)), 60_000);
    return () => clearInterval(t);
  }, [wp.createdAt]);

  useEffect(() => {
    if (!session) { set({ dataLoading: false }); return; }
    const uid = session.user.id;
    const key = `${wp.id}-${uid}`;
    const cached = cache.get(key);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      set({ liked: cached.liked, following: cached.following, dataLoading: false });
      setLikes(cached.likeCount); return;
    }
    (async () => {
      if (!viewedRef.current) { viewedRef.current = true; await incrementViews(wp.id); }
      const [likeR, followR, countR] = await Promise.all([
        supabase.from('likes').select('id').eq('user_id', uid).eq('wallpaper_id', wp.id).maybeSingle(),
        wp.userId ? supabase.from('follows').select('id').eq('follower_id', uid).eq('following_id', wp.userId).maybeSingle() : Promise.resolve({ data: null }),
        supabase.from('likes').select('id', { count: 'exact' }).eq('wallpaper_id', wp.id),
      ]);
      const next = { liked: !!likeR.data, following: !!followR.data, likeCount: countR.count ?? 0, timestamp: Date.now() };
      set({ ...next, dataLoading: false });
      setLikes(next.likeCount);
      cache.set(key, next);
    })();
  }, [wp.id, session?.user?.id]);

  useEffect(() => {
    const ch = supabase.channel(`wp-likes-${wp.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'likes', filter: `wallpaper_id=eq.${wp.id}` }, async () => {
        const { count } = await supabase.from('likes').select('id', { count: 'exact' }).eq('wallpaper_id', wp.id);
        setLikes(count ?? 0);
      }).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [wp.id]);

  const auth = (action: string, cb: () => void) =>
    !session ? set({ loginAction: action, showLogin: true }) : cb();

  const handleLike = () => auth('like wallpapers', async () => {
    const v = !st.liked;
    set({ liked: v });
    setLikes(c => v ? c + 1 : Math.max(0, c - 1));
    navigator.vibrate?.(50);
    const key = `${wp.id}-${session!.user.id}`, cached = cache.get(key);
    if (cached) cache.set(key, { ...cached, liked: v, likeCount: v ? cached.likeCount + 1 : cached.likeCount - 1, timestamp: Date.now() });
    if (v && likeRef.current) {
      const r = likeRef.current.getBoundingClientRect();
      setHearts(Array.from({ length: 8 }, (_, i) => ({ id: Date.now() + i, x: r.left + r.width / 2 - 14, y: r.top + r.height / 2 - 14, angle: -90 + (i * 270 / 7) + (Math.random() - .5) * 20, distance: 80 + Math.random() * 60 })));
      setTimeout(() => setHearts([]), 1400);
    }
    v ? await supabase.from('likes').insert({ user_id: session!.user.id, wallpaper_id: wp.id })
      : await supabase.from('likes').delete().eq('user_id', session!.user.id).eq('wallpaper_id', wp.id);
  });

  const handleFollow = () => auth('follow users', async () => {
    if (!wp.userId) return;
    const v = !st.following;
    set({ following: v });
    navigator.vibrate?.(50);
    const key = `${wp.id}-${session!.user.id}`, cached = cache.get(key);
    if (cached) cache.set(key, { ...cached, following: v, timestamp: Date.now() });
    v ? await supabase.from('follows').insert({ follower_id: session!.user.id, following_id: wp.userId })
      : await supabase.from('follows').delete().eq('follower_id', session!.user.id).eq('following_id', wp.userId);
  });

  const handleDownload = async () => {
    if (st.downloading || st.downloaded) return;
    set({ downloading: true });
    navigator.vibrate?.(50);
    try {
      await incrementDownloads(wp.id);
      const blob = await fetch(wp.url).then(r => r.blob());
      const url = URL.createObjectURL(blob);
      Object.assign(document.createElement('a'), { href: url, download: `${wp.title || 'wallpaper'}.jpg` }).click();
      URL.revokeObjectURL(url);
      set({ downloading: false, downloaded: true });
      navigator.vibrate?.(100);
    } catch { set({ downloading: false }); }
  };

  const handleShare = () => navigator.share
    ? navigator.share({ title: wp.title, url: window.location.href }).catch(() => set({ copyOpen: true }))
    : set({ copyOpen: true });

  const overlayBtn = 'w-14 h-14 rounded-full flex items-center justify-center transition-all duration-200 active:scale-90';

  return (
    <div className="min-h-screen bg-white">
      <style>{`
        @keyframes shimmer-light{0%{background-position:-200% 0}100%{background-position:200% 0}}
        .shimmer-light{background:linear-gradient(90deg,#f3f4f6 25%,#e9eaec 50%,#f3f4f6 75%);background-size:200% 100%;animation:shimmer-light 1.5s infinite;}
        @keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
        .fade-up{animation:fadeUp 0.4s ease forwards;}
        .no-save{-webkit-user-select:none;user-select:none;-webkit-touch-callout:none;}
      `}</style>

      <FloatingHearts hearts={hearts} />
      <LoginPromptModal isOpen={st.showLogin} onClose={() => set({ showLogin: false })} action={st.loginAction} />
      <CopyLinkModal isOpen={st.copyOpen} onClose={() => set({ copyOpen: false })} link={typeof window !== 'undefined' ? window.location.href : ''} />

      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 pt-5 pb-3">
        <button onClick={() => full ? setFull(false) : router.back()} className={overlayBtn} style={{ background: 'rgba(0,0,0,0.25)', backdropFilter: 'blur(6px)' }} aria-label="Go back">
          <ChevronLeft className="w-7 h-7 text-white" strokeWidth={2.5} />
        </button>
        <button onClick={() => setFull(v => !v)} className={overlayBtn} style={{ background: 'rgba(0,0,0,0.25)', backdropFilter: 'blur(6px)' }} aria-label="Toggle fullscreen">
          {full ? <Minimize2 className="w-6 h-6 text-white" strokeWidth={2.5} /> : <Maximize2 className="w-6 h-6 text-white" strokeWidth={2.5} />}
        </button>
      </header>

      {/* Image — protected */}
      <div
        className="relative w-full overflow-hidden transition-all duration-300 no-save"
        style={{ height: full ? '100dvh' : '72vh', borderRadius: full ? 0 : '0 0 32px 32px', background: '#f3f4f6' }}
        onContextMenu={e => e.preventDefault()}
      >
        {!imgLoaded && <div className={`absolute inset-0 ${SH}`} />}

        <Image
          src={wp.url} alt={wp.title} fill priority
          draggable={false}
          className="object-cover transition-opacity duration-300 no-save"
          style={{ opacity: imgLoaded ? 1 : 0, pointerEvents: 'none', userSelect: 'none', WebkitUserSelect: 'none' }}
          sizes="(max-width:768px) 100vw, 600px"
          onLoad={() => { imgCache.add(wp.url); setImgLoaded(true); }}
        />

        {/* Transparent blocker — prevents long-press save, sits above image but below buttons */}
        <div className="absolute inset-0 z-[2]" onContextMenu={e => e.preventDefault()} />

        {/* Like button — above blocker */}
        {imgLoaded && (
          <div className="absolute bottom-5 right-5 z-[3] flex flex-col items-center gap-1.5">
            <button ref={likeRef} onClick={handleLike} className={overlayBtn} style={{ background: st.liked ? '#f43f5e' : 'rgba(0,0,0,0.25)', backdropFilter: 'blur(6px)' }} aria-label="Like">
              <Heart className="w-6 h-6" style={{ color: '#fff', fill: st.liked ? '#fff' : 'none' }} />
            </button>
            {likes > 0 && <span className="text-white text-xs font-semibold drop-shadow">{fmt(likes)}</span>}
          </div>
        )}
      </div>

      {/* Info */}
      {!full && (
        <div className="px-5 pt-6 pb-32 fade-up">
          <h2 className="font-bold text-xl mb-1 text-gray-900" style={{ letterSpacing: '-0.02em' }}>{wp.title}</h2>
          {wp.description && <p className="text-sm text-gray-500 leading-relaxed mb-5">{wp.description}</p>}

          <div className="h-px bg-gray-100 mb-5" />

          {/* User row */}
          <div className="flex items-center gap-3 mb-6">
            <button onClick={() => router.push(`/user/${wp.userId}`)} className="flex items-center gap-3 flex-1 text-left">
              <div className="relative w-11 h-11 rounded-full overflow-hidden flex-shrink-0 border-2 border-gray-100">
                <Image src={wp.userAvatar} alt={wp.uploadedBy} fill className="object-cover" sizes="44px" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="font-semibold text-[15px] text-gray-900">{wp.uploadedBy}</span>
                  {wp.verified && <VerifiedBadge size="sm" />}
                </div>
                <span className="text-[13px] text-gray-400">{timeAgo}</span>
              </div>
            </button>
            {st.dataLoading
              ? <div className={`w-20 h-9 rounded-full ${SH}`} />
              : <button onClick={handleFollow} className="px-5 py-2 rounded-full text-sm font-semibold flex-shrink-0 transition-all active:scale-95"
                  style={st.following ? { border: '1.5px solid #e5e7eb', color: '#6b7280' } : { background: '#111', color: '#fff' }}>
                  {st.following ? 'Following' : 'Follow'}
                </button>
            }
          </div>

          {/* Share + Copy */}
          <div className="flex gap-3">
            <button onClick={handleShare} className="flex-1 py-3.5 rounded-2xl flex items-center justify-center gap-2 font-semibold text-sm bg-gray-100 text-gray-700 transition-all active:scale-[0.98]">
              <Share2 className="w-4 h-4" />Share
            </button>
            <button onClick={() => set({ copyOpen: true })} className="flex-1 py-3.5 rounded-2xl flex items-center justify-center gap-2 font-semibold text-sm bg-gray-100 text-gray-700 transition-all active:scale-[0.98]">
              <LinkIcon className="w-4 h-4" />Copy Link
            </button>
          </div>
        </div>
      )}

      {/* Download */}
      <div className="fixed bottom-0 left-0 right-0 z-50 px-5 pb-8">
        <button onClick={handleDownload} disabled={st.downloading}
          className="w-full py-4 rounded-2xl font-bold text-base flex items-center justify-center gap-2.5 text-white transition-all active:scale-[0.98]"
          style={{ background: st.downloaded ? '#10b981' : '#111', opacity: st.downloading ? 0.75 : 1, boxShadow: st.downloaded ? '0 8px 30px rgba(16,185,129,0.35)' : '0 8px 30px rgba(0,0,0,0.2)' }}>
          {st.downloading ? <Loader2 className="w-5 h-5 animate-spin" />
            : st.downloaded ? <><Check className="w-5 h-5" />Downloaded</>
            : <><Download className="w-5 h-5" />Download Wallpaper</>}
        </button>
      </div>
    </div>
  );
}
