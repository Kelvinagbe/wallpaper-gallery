'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useRouter, useParams } from 'next/navigation';
import Image from 'next/image';
import { ChevronLeft, Eye, Heart, Download, Share2, Bookmark, Check, Link as LinkIcon, Loader2, Maximize2, Minimize2 } from 'lucide-react';
import { VerifiedBadge } from '@/app/components/VerifiedBadge';
import { LoginPromptModal } from '@/app/components/LoginPromptModal';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/app/components/AuthProvider';
import { fetchWallpaperById, incrementViews, incrementDownloads } from '@/lib/stores/wallpaperStore';
import type { Wallpaper } from '@/app/types';

// ─── Caches & helpers ─────────────────────────────────────────────────────────
const detailCache = new Map<string, { liked: boolean; saved: boolean; following: boolean; likeCount: number; timestamp: number }>();
const CACHE_TTL = 30_000;
const imgCache = (() => {
  const mem = new Set<string>();
  try { (JSON.parse(sessionStorage.getItem('__wpcache__') || '[]') as string[]).forEach(u => mem.add(u)); } catch {}
  return {
    has: (u: string) => mem.has(u),
    add: (u: string) => { mem.add(u); try { sessionStorage.setItem('__wpcache__', JSON.stringify([...mem].slice(-300))); } catch {} },
  };
})();
const fmt = (n: number) => n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);
const SH = 'shimmer-light';

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
      <div className="w-full rounded-t-3xl p-6 space-y-4" style={{ background: '#fff', boxShadow: '0 -8px 40px rgba(0,0,0,0.12)' }} onClick={e => e.stopPropagation()}>
        <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto" />
        <h3 className="text-lg font-bold text-gray-900 text-center tracking-tight">Share Link</h3>
        <div className="flex items-center gap-3 px-4 py-3 rounded-2xl" style={{ background: '#f5f5f5' }}>
          <LinkIcon className="w-4 h-4 text-gray-400 flex-shrink-0" />
          <p className="text-sm text-gray-600 flex-1 truncate">{link}</p>
        </div>
        <button onClick={copy} className="w-full py-4 rounded-2xl font-semibold text-sm transition-all active:scale-[0.98]" style={{ background: copied ? '#10b981' : '#111', color: '#fff' }}>
          {copied ? <span className="flex items-center justify-center gap-2"><Check className="w-4 h-4" />Copied!</span> : 'Copy Link'}
        </button>
        <button onClick={onClose} className="w-full py-3.5 rounded-2xl font-medium text-sm text-gray-500 active:scale-[0.98]" style={{ background: '#f5f5f5' }}>Cancel</button>
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

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function WallpaperDetailPage() {
  const router = useRouter();
  const { id } = useParams() as { id: string };
  const { session } = useAuth();
  const supabase = useMemo(() => createClient(), []);

  const [wp, setWp] = useState<Wallpaper | null>(null);
  const [loading, setLoading] = useState(true);
  const [imgSize, setImgSize] = useState({ width: 1080, height: 1920 });
  const [counts, setCounts] = useState({ likes: 0, downloads: 0, views: 0 });
  const [hearts, setHearts] = useState<Array<{ id: number; x: number; y: number; angle: number; distance: number }>>([]);
  const [full, setFull] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);
  const [st, setSt] = useState({
    liked: false, saved: false, following: false,
    downloading: false, downloaded: false, dataLoading: true,
    showLogin: false, loginAction: '', copyOpen: false, timeAgo: '',
  });

  const likeRef = useRef<HTMLButtonElement>(null);
  const viewedRef = useRef(false);

  // Fetch wallpaper
  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    (async () => {
      try {
        const data = await fetchWallpaperById(id);
        if (!data) { router.replace('/'); return; }
        if (cancelled) return;
        setWp(data);
        if (imgCache.has(data.url)) setImgLoaded(true);
        setCounts({ likes: data.likes, downloads: data.downloads, views: data.views });
      } catch { router.replace('/'); }
      finally { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [id]);

  // Time ago
  useEffect(() => {
    if (!wp?.createdAt) return;
    const compute = () => {
      const d = Math.floor((Date.now() - new Date(wp.createdAt!).getTime()) / 1000);
      setSt(s => ({ ...s, timeAgo: d < 60 ? 'Just now' : d < 3600 ? `${Math.floor(d / 60)}m ago` : d < 86400 ? `${Math.floor(d / 3600)}h ago` : d < 604800 ? `${Math.floor(d / 86400)}d ago` : `${Math.floor(d / 604800)}w ago` }));
    };
    compute(); const t = setInterval(compute, 60_000); return () => clearInterval(t);
  }, [wp?.createdAt]);

  // User state + view increment
  useEffect(() => {
    if (!wp) return;
    if (!session) { setSt(s => ({ ...s, dataLoading: false })); return; }
    const uid = session.user.id, key = `${wp.id}-${uid}`, cached = detailCache.get(key);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      setSt(s => ({ ...s, liked: cached.liked, saved: cached.saved, following: cached.following, dataLoading: false }));
      setCounts(c => ({ ...c, likes: cached.likeCount })); return;
    }
    (async () => {
      if (!viewedRef.current) { viewedRef.current = true; await incrementViews(wp.id); setCounts(c => ({ ...c, views: c.views + 1 })); }
      const [likeR, saveR, followR, countR] = await Promise.all([
        supabase.from('likes').select('id').eq('user_id', uid).eq('wallpaper_id', wp.id).maybeSingle(),
        supabase.from('saves').select('id').eq('user_id', uid).eq('wallpaper_id', wp.id).maybeSingle(),
        wp.userId ? supabase.from('follows').select('id').eq('follower_id', uid).eq('following_id', wp.userId).maybeSingle() : Promise.resolve({ data: null }),
        supabase.from('likes').select('id', { count: 'exact' }).eq('wallpaper_id', wp.id),
      ]);
      const next = { liked: !!likeR.data, saved: !!saveR.data, following: !!followR.data, likeCount: countR.count ?? 0, timestamp: Date.now() };
      setSt(s => ({ ...s, ...next, dataLoading: false }));
      setCounts(c => ({ ...c, likes: next.likeCount }));
      detailCache.set(key, next);
    })();
  }, [wp?.id, session?.user?.id]);

  // Realtime likes
  useEffect(() => {
    if (!wp) return;
    const ch = supabase.channel(`wp-likes-${wp.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'likes', filter: `wallpaper_id=eq.${wp.id}` }, async () => {
        const { count } = await supabase.from('likes').select('id', { count: 'exact' }).eq('wallpaper_id', wp.id);
        setCounts(c => ({ ...c, likes: count ?? 0 }));
      }).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [wp?.id]);

  const auth = (action: string, cb: () => void) =>
    !session ? setSt(s => ({ ...s, loginAction: action, showLogin: true })) : cb();

  const handleLike = () => auth('like wallpapers', async () => {
    if (!wp) return;
    const v = !st.liked;
    setSt(s => ({ ...s, liked: v }));
    setCounts(c => ({ ...c, likes: v ? c.likes + 1 : Math.max(0, c.likes - 1) }));
    navigator.vibrate?.(50);
    const key = `${wp.id}-${session!.user.id}`, cached = detailCache.get(key);
    if (cached) detailCache.set(key, { ...cached, liked: v, likeCount: v ? cached.likeCount + 1 : cached.likeCount - 1, timestamp: Date.now() });
    if (v && likeRef.current) {
      const r = likeRef.current.getBoundingClientRect();
      setHearts(Array.from({ length: 8 }, (_, i) => ({ id: Date.now() + i, x: r.left + r.width / 2 - 14, y: r.top + r.height / 2 - 14, angle: -90 + (i * 270 / 7) + (Math.random() - .5) * 20, distance: 80 + Math.random() * 60 })));
      setTimeout(() => setHearts([]), 1400);
    }
    v ? await supabase.from('likes').insert({ user_id: session!.user.id, wallpaper_id: wp.id })
      : await supabase.from('likes').delete().eq('user_id', session!.user.id).eq('wallpaper_id', wp.id);
  });

  const handleSave = () => auth('save wallpapers', async () => {
    if (!wp) return;
    const v = !st.saved; setSt(s => ({ ...s, saved: v })); navigator.vibrate?.(50);
    const key = `${wp.id}-${session!.user.id}`, cached = detailCache.get(key);
    if (cached) detailCache.set(key, { ...cached, saved: v, timestamp: Date.now() });
    v ? await supabase.from('saves').insert({ user_id: session!.user.id, wallpaper_id: wp.id })
      : await supabase.from('saves').delete().eq('user_id', session!.user.id).eq('wallpaper_id', wp.id);
  });

  const handleFollow = () => auth('follow users', async () => {
    if (!wp?.userId) return;
    const v = !st.following; setSt(s => ({ ...s, following: v })); navigator.vibrate?.(50);
    const key = `${wp.id}-${session!.user.id}`, cached = detailCache.get(key);
    if (cached) detailCache.set(key, { ...cached, following: v, timestamp: Date.now() });
    v ? await supabase.from('follows').insert({ follower_id: session!.user.id, following_id: wp.userId })
      : await supabase.from('follows').delete().eq('follower_id', session!.user.id).eq('following_id', wp.userId);
  });

  const handleDownload = async () => {
    if (!wp || st.downloading || st.downloaded) return;
    setSt(s => ({ ...s, downloading: true })); navigator.vibrate?.(50);
    try {
      await incrementDownloads(wp.id); setCounts(c => ({ ...c, downloads: c.downloads + 1 }));
      const blob = await fetch(wp.url).then(r => r.blob()), url = URL.createObjectURL(blob);
      Object.assign(document.createElement('a'), { href: url, download: `${wp.title || 'wallpaper'}.jpg` }).click();
      URL.revokeObjectURL(url);
      setSt(s => ({ ...s, downloading: false, downloaded: true })); navigator.vibrate?.(100);
    } catch { setSt(s => ({ ...s, downloading: false })); }
  };

  const handleShare = () => navigator.share
    ? navigator.share({ title: wp?.title, url: window.location.href }).catch(() => setSt(s => ({ ...s, copyOpen: true })))
    : setSt(s => ({ ...s, copyOpen: true }));

  const overlayBtn = 'w-11 h-11 rounded-full flex items-center justify-center shadow-lg transition-all duration-200 active:scale-90';
  const actionBtn  = 'flex-1 py-3.5 rounded-2xl flex items-center justify-center gap-2 font-semibold text-sm transition-all active:scale-[0.98]';

  // Download bar (shared between normal + full mode)
  const DownloadBar = () => (
    <div className="fixed bottom-0 left-0 right-0 z-50 px-5 pb-8 pt-4" style={{ background: 'linear-gradient(to top,#fff 70%,rgba(255,255,255,0))' }}>
      <button onClick={handleDownload} disabled={st.downloading}
        className="w-full py-4 rounded-2xl font-bold text-base flex items-center justify-center gap-2.5 transition-all active:scale-[0.98]"
        style={{ background: st.downloaded ? '#10b981' : '#111', color: '#fff', opacity: st.downloading ? 0.75 : 1, cursor: st.downloading ? 'not-allowed' : 'pointer', boxShadow: st.downloaded ? '0 8px 30px rgba(16,185,129,0.35)' : '0 8px 30px rgba(0,0,0,0.25)' }}>
        {st.downloading ? <Loader2 className="w-5 h-5 animate-spin" />
          : st.downloaded ? <><Check className="w-5 h-5" />Downloaded</>
          : <><Download className="w-5 h-5" />Download</>}
      </button>
    </div>
  );

  return (
    <div className="min-h-screen" style={{ background: '#fff' }}>
      <style>{`
        @keyframes shimmer-light{0%{background-position:-200% 0}100%{background-position:200% 0}}
        .shimmer-light{background:linear-gradient(90deg,#f3f4f6 25%,#e9eaec 50%,#f3f4f6 75%);background-size:200% 100%;animation:shimmer-light 1.5s infinite}
        @keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
        .fade-up{animation:fadeUp 0.4s ease forwards}
      `}</style>

      <FloatingHearts hearts={hearts} />
      <LoginPromptModal isOpen={st.showLogin} onClose={() => setSt(s => ({ ...s, showLogin: false }))} action={st.loginAction} />
      <CopyLinkModal isOpen={st.copyOpen} onClose={() => setSt(s => ({ ...s, copyOpen: false }))} link={typeof window !== 'undefined' ? window.location.href : ''} />

      {/* ── Header ── */}
      <header className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 pt-4 pb-3">
        <button onClick={() => full ? setFull(false) : router.back()} className="w-10 h-10 rounded-xl bg-white/90 flex items-center justify-center shadow-lg active:scale-95 transition-transform" aria-label="Go back">
          <ChevronLeft className="w-5 h-5 text-zinc-900" strokeWidth={2.5} />
        </button>
        {!loading && wp && (
          <button onClick={() => setFull(v => !v)} className="w-10 h-10 rounded-xl flex items-center justify-center shadow-lg active:scale-95 transition-transform" style={{ background: 'rgba(255,255,255,0.9)' }} aria-label={full ? 'Exit fullscreen' : 'Fullscreen'}>
            {full ? <Minimize2 className="w-5 h-5 text-zinc-900" strokeWidth={2.5} /> : <Maximize2 className="w-5 h-5 text-zinc-900" strokeWidth={2.5} />}
          </button>
        )}
      </header>

      {/* ── Image ── */}
      {loading
        ? <div className={`w-full ${SH}`} style={{ height: '50vh', borderRadius: '0 0 28px 28px' }} />
        : <div className="relative w-full overflow-hidden transition-all duration-300"
            style={{ height: full ? '100dvh' : '50vh', borderRadius: full ? 0 : '0 0 28px 28px', background: '#f3f4f6' }}>
            {!imgLoaded && <div className={`absolute inset-0 ${SH}`} />}
            <Image src={wp!.url} alt={wp!.title} fill priority
              className="object-cover transition-opacity duration-300" style={{ opacity: imgLoaded ? 1 : 0 }}
              sizes="(max-width:768px) 100vw, 600px"
              onLoad={e => { const i = e.currentTarget as HTMLImageElement; setImgSize({ width: i.naturalWidth || 1080, height: i.naturalHeight || 1920 }); imgCache.add(wp!.url); setImgLoaded(true); }}
            />
            {imgLoaded && <>
              {counts.likes > 0 && (
                <div className="absolute bottom-4 left-4 flex items-center gap-1.5 px-3 py-1.5 rounded-full" style={{ background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(8px)' }}>
                  <Heart className="w-3.5 h-3.5 text-rose-400 fill-rose-400" />
                  <span className="text-white text-xs font-semibold">{fmt(counts.likes)}</span>
                </div>
              )}
              <div className="absolute bottom-4 right-4 flex flex-col gap-2.5">
                <button ref={likeRef} onClick={handleLike} className={overlayBtn} style={{ background: st.liked ? '#f43f5e' : 'rgba(255,255,255,0.92)' }} aria-label="Like">
                  <Heart className="w-5 h-5 transition-all" style={{ color: st.liked ? '#fff' : '#111', fill: st.liked ? '#fff' : 'none' }} />
                </button>
                <button onClick={handleSave} className={overlayBtn} style={{ background: st.saved ? '#3b82f6' : 'rgba(255,255,255,0.92)' }} aria-label="Save">
                  <Bookmark className="w-5 h-5 transition-all" style={{ color: st.saved ? '#fff' : '#111', fill: st.saved ? '#fff' : 'none' }} />
                </button>
              </div>
            </>}
          </div>
      }

      {/* ── Info (hidden in fullscreen) ── */}
      {!full && (
        <div className="px-5 pt-6 pb-36 fade-up">

          {/* User row */}
          <div className="flex items-center gap-3 mb-5">
            {loading ? <>
              <div className={`w-11 h-11 rounded-full ${SH} flex-shrink-0`} />
              <div className="flex-1"><div className={`h-4 w-32 ${SH} rounded-lg mb-2`} /><div className={`h-3 w-20 ${SH} rounded-lg`} /></div>
              <div className={`w-20 h-9 ${SH} rounded-full`} />
            </> : <>
              <button onClick={() => router.push(`/user/${wp!.userId}`)} className="flex items-center gap-3 flex-1 bg-transparent border-none cursor-pointer p-0 text-left">
                <div className="relative w-11 h-11 rounded-full overflow-hidden flex-shrink-0" style={{ border: '2px solid #e5e7eb' }}>
                  <Image src={wp!.userAvatar} alt={wp!.uploadedBy} fill className="object-cover" sizes="44px" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="font-semibold text-[15px]" style={{ color: '#111' }}>{wp!.uploadedBy}</span>
                    {wp!.verified && <VerifiedBadge size="sm" />}
                  </div>
                  <span className="text-[13px]" style={{ color: '#9ca3af' }}>{st.timeAgo || 'Just now'}</span>
                </div>
              </button>
              {st.dataLoading
                ? <div className={`w-20 h-9 rounded-full ${SH}`} />
                : <button onClick={handleFollow} className="px-5 py-2 rounded-full text-sm font-semibold flex-shrink-0 transition-all active:scale-95"
                    style={st.following ? { border: '1.5px solid #e5e7eb', color: '#6b7280', background: 'transparent' } : { background: '#111', color: '#fff' }}>
                    {st.following ? 'Following' : 'Follow'}
                  </button>
              }
            </>}
          </div>

          <div className="h-px mb-5" style={{ background: '#f3f4f6' }} />

          {/* Title + description */}
          {loading ? <>
            <div className={`h-5 w-48 ${SH} rounded-lg mb-3`} />
            <div className={`h-4 w-full ${SH} rounded-lg mb-2`} />
            <div className={`h-4 w-3/4 ${SH} rounded-lg mb-5`} />
          </> : (
            <div className="mb-5">
              <h2 className="font-bold text-lg mb-2 leading-snug" style={{ color: '#111', letterSpacing: '-0.02em' }}>{wp!.title}</h2>
              {wp!.description && <p className="text-sm leading-relaxed" style={{ color: '#6b7280' }}>{wp!.description}</p>}
            </div>
          )}

         {/* Stats */}
          {!loading && (
            <div className="flex items-center gap-5 mb-6">
              {[
                { Icon: Eye,      val: fmt(counts.views),     active: false,    color: '' },
                { Icon: Heart,    val: fmt(counts.likes),     active: st.liked, color: '#f43f5e' },
                { Icon: Download, val: fmt(counts.downloads), active: false,    color: '' },
              ].map(({ Icon, val, active, color }) => (
                <div key={val} className="flex items-center gap-1.5">
                  <Icon className="w-[15px] h-[15px]" style={{ color: active && color ? color : '#9ca3af' }} />
                  <span className="text-[13px] font-medium" style={{ color: active && color ? color : '#6b7280' }}>{val}</span>
                </div>
              ))}
            </div>
          )}

          {/* Share + Copy */}
          {!loading && (
            <div className="flex gap-3">
              <button onClick={handleShare} className={actionBtn} style={{ background: '#f5f5f5', color: '#374151' }}>
                <Share2 className="w-4 h-4" />Share
              </button>
              <button onClick={() => setSt(s => ({ ...s, copyOpen: true }))} className={actionBtn} style={{ background: '#f5f5f5', color: '#374151' }}>
                <LinkIcon className="w-4 h-4" />Copy Link
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── Download bar ── */}
      {!loading && <DownloadBar />}
    </div>
  );
}
