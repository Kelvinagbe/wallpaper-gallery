import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ChevronLeft, Eye, Heart, Download, Share2, Bookmark, Check, Link as LinkIcon, Loader2 } from 'lucide-react';
import { VerifiedBadge } from './VerifiedBadge';
import { LoginPromptModal } from './LoginPromptModal';
import { incrementViews, incrementDownloads } from '@/lib/stores/wallpaperStore';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/app/components/AuthProvider';
import type { Wallpaper } from '../types';

type WallpaperDetailProps = {
  wallpaper: Wallpaper | null;
  relatedWallpapers: Wallpaper[];
  onClose: () => void;
  onUserClick: () => void;
  onRelatedClick: (wallpaper: Wallpaper) => void;
  isLoading?: boolean;
};

const cache = new Map<string, { liked: boolean; saved: boolean; following: boolean; likeCount: number; timestamp: number }>();
const CACHE_DURATION = 30000;

const ImageWithLoader = ({ src, alt }: { src: string; alt: string }) => {
  const [loaded, setLoaded] = useState(false);
  return (
    <div className="relative">
      {!loaded && <div className="absolute inset-0 skeleton flex items-center justify-center"><div className="w-10 h-10 border-4 border-white/20 border-t-white rounded-full animate-spin" /></div>}
      <img src={src} alt={alt} className={`w-full h-auto transition-opacity duration-300 ${loaded ? 'opacity-100' : 'opacity-0'}`} onLoad={() => setLoaded(true)} />
    </div>
  );
};

const SkeletonLoader = () => (
  <div className="space-y-4 animate-pulse">
    <div className="relative rounded-2xl overflow-hidden bg-white/10 aspect-[9/16] flex items-center justify-center"><div className="w-10 h-10 border-4 border-white/20 border-t-white/40 rounded-full animate-spin" /></div>
    <div className="flex items-center gap-3 p-2"><div className="w-10 h-10 rounded-full bg-white/10" /><div className="flex-1 space-y-2"><div className="h-4 w-32 bg-white/10 rounded" /><div className="h-3 w-20 bg-white/10 rounded" /></div></div>
    <div className="space-y-2">{[48, 'full', '75%'].map((w, i) => <div key={i} className={`h-${i ? 4 : 5} bg-white/10 rounded`} style={{ width: typeof w === 'number' ? `${w * 4}px` : w }} />)}</div>
    <div className="flex gap-3"><div className="flex-1 h-12 bg-white/10 rounded-full" /><div className="h-12 w-12 bg-white/10 rounded-full" /><div className="h-12 w-12 bg-white/10 rounded-full" /></div>
  </div>
);

const CopyLinkModal = ({ isOpen, onClose, link }: { isOpen: boolean; onClose: () => void; link: string }) => {
  const [copied, setCopied] = useState(false);
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[60] flex items-end animate-slideUp" onClick={onClose}>
      <div className="w-full bg-gradient-to-b from-zinc-900 to-black rounded-t-3xl p-6 space-y-4" onClick={e => e.stopPropagation()}>
        <div className="w-12 h-1.5 bg-white/20 rounded-full mx-auto mb-2" />
        <h3 className="text-xl font-bold text-white text-center">Copy Link</h3>
        <div className="bg-white/5 rounded-xl p-4 flex items-center gap-3 border border-white/10"><LinkIcon className="w-5 h-5 text-white/60 flex-shrink-0" /><p className="text-sm text-white/80 flex-1 truncate">{link}</p></div>
        <button onClick={async () => { await navigator.clipboard.writeText(link); setCopied(true); setTimeout(() => { setCopied(false); setTimeout(onClose, 500); }, 1500); }} className={`w-full py-4 rounded-full font-semibold transition-all ${copied ? 'bg-emerald-500 text-white' : 'bg-white text-black hover:bg-gray-200'}`}>
          {copied ? <span className="flex items-center justify-center gap-2"><Check className="w-5 h-5" />Copied!</span> : 'Copy Link'}
        </button>
        <button onClick={onClose} className="w-full py-4 bg-white/5 hover:bg-white/10 rounded-full font-semibold text-white transition-all">Cancel</button>
      </div>
    </div>
  );
};

const FloatingHearts = ({ hearts }: { hearts: Array<{ id: number; x: number; y: number; angle: number; distance: number }> }) => {
  if (typeof window === 'undefined' || hearts.length === 0) return null;
  return createPortal(
    <>
      <style jsx>{`@keyframes floatHeart{0%{transform:translate(0,0) scale(0) rotate(0deg);opacity:0}10%{opacity:1;transform:translate(0,0) scale(1) rotate(var(--rotate))}50%{transform:translate(var(--tx),var(--ty)) scale(1.3) rotate(var(--rotate));opacity:.95}100%{transform:translate(calc(var(--tx) * 1.5),calc(var(--ty) * 1.8)) scale(.2) rotate(var(--rotate));opacity:0}}.heart-float{animation:floatHeart 1.2s cubic-bezier(.25,.46,.45,.94) forwards;pointer-events:none;position:fixed;z-index:9999;filter:drop-shadow(0 4px 12px rgba(244,63,94,.5))}`}</style>
      {hearts.map((heart, index) => {
        const radians = (heart.angle * Math.PI) / 180, tx = Math.cos(radians) * heart.distance, ty = Math.sin(radians) * heart.distance - 50;
        return <Heart key={heart.id} className="heart-float text-rose-500 fill-rose-500" style={{ left: `${heart.x}px`, top: `${heart.y}px`, width: '34px', height: '34px', '--tx': `${tx}px`, '--ty': `${ty}px`, '--rotate': `${(Math.random() - 0.5) * 45}deg`, animationDelay: `${index * 0.08}s` } as any} />;
      })}
    </>,
    document.body
  );
};

export const WallpaperDetail = ({ wallpaper, relatedWallpapers, onClose, onUserClick, onRelatedClick, isLoading = false }: WallpaperDetailProps) => {
  const { session } = useAuth();
  const supabase = createClient();
  const [state, setState] = useState({ liked: false, saved: false, following: false, downloading: false, downloaded: false, isClosing: false, dataLoading: true, showLoginPrompt: false, loginAction: '', isCopyModalOpen: false, timeAgo: '' });
  const [counts, setCounts] = useState({ likes: wallpaper?.likes || 0, downloads: wallpaper?.downloads || 0, views: wallpaper?.views || 0 });
  const [hearts, setHearts] = useState<Array<{ id: number; x: number; y: number; angle: number; distance: number }>>([]);
  const likeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!wallpaper?.createdAt) return;
    const updateTime = () => {
      const diff = Math.floor((Date.now() - new Date(wallpaper.createdAt!).getTime()) / 1000);
      setState(s => ({ ...s, timeAgo: diff < 60 ? 'Just now' : diff < 3600 ? `${Math.floor(diff / 60)}m ago` : diff < 86400 ? `${Math.floor(diff / 3600)}h ago` : diff < 604800 ? `${Math.floor(diff / 86400)}d ago` : `${Math.floor(diff / 604800)}w ago` }));
    };
    updateTime();
    const interval = setInterval(updateTime, 60000);
    return () => clearInterval(interval);
  }, [wallpaper?.createdAt]);

  useEffect(() => {
    if (!wallpaper || !session) { setState(s => ({ ...s, dataLoading: false })); return; }
    const cacheKey = `${wallpaper.id}-${session.user.id}`, cached = cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      setState(s => ({ ...s, liked: cached.liked, saved: cached.saved, following: cached.following, dataLoading: false }));
      setCounts(c => ({ ...c, likes: cached.likeCount }));
    } else setState(s => ({ ...s, dataLoading: true }));

    (async () => {
      incrementViews(wallpaper.id);
      setCounts(c => ({ ...c, views: c.views + 1 }));
      const [likeRes, saveRes, followRes, likeCountRes] = await Promise.all([
        supabase.from('likes').select('id').eq('user_id', session.user.id).eq('wallpaper_id', wallpaper.id).maybeSingle(),
        supabase.from('saves').select('id').eq('user_id', session.user.id).eq('wallpaper_id', wallpaper.id).maybeSingle(),
        wallpaper.userId ? supabase.from('follows').select('id').eq('follower_id', session.user.id).eq('following_id', wallpaper.userId).maybeSingle() : null,
        supabase.from('likes').select('id', { count: 'exact' }).eq('wallpaper_id', wallpaper.id),
      ]);
      const newData = { liked: !!likeRes.data, saved: !!saveRes.data, following: followRes ? !!followRes.data : false, likeCount: likeCountRes.count || 0, timestamp: Date.now() };
      setState(s => ({ ...s, liked: newData.liked, saved: newData.saved, following: newData.following, dataLoading: false }));
      setCounts(c => ({ ...c, likes: newData.likeCount }));
      cache.set(cacheKey, newData);
    })();
  }, [wallpaper?.id, session]);

  useEffect(() => {
    if (!wallpaper) return;
    const channel = supabase.channel(`wallpaper-${wallpaper.id}`).on('postgres_changes', { event: '*', schema: 'public', table: 'likes', filter: `wallpaper_id=eq.${wallpaper.id}` }, async () => {
      const { count } = await supabase.from('likes').select('id', { count: 'exact' }).eq('wallpaper_id', wallpaper.id);
      setCounts(c => ({ ...c, likes: count || 0 }));
      if (session) {
        const cacheKey = `${wallpaper.id}-${session.user.id}`, cached = cache.get(cacheKey);
        if (cached) cache.set(cacheKey, { ...cached, likeCount: count || 0, timestamp: Date.now() });
      }
    }).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [wallpaper?.id, session]);

  const vibrate = (d: number) => navigator.vibrate?.(d);
  const fmt = (n: number) => n > 1000 ? `${(n / 1000).toFixed(1)}k` : n;
  const requireAuth = (action: string, callback: () => void) => { if (!session) setState(s => ({ ...s, loginAction: action, showLoginPrompt: true })); else callback(); };

  const handleLike = () => requireAuth('like wallpapers', async () => {
    if (!wallpaper) return;
    const newLiked = !state.liked;
    setState(s => ({ ...s, liked: newLiked }));
    setCounts(c => ({ ...c, likes: newLiked ? c.likes + 1 : c.likes - 1 }));
    vibrate(50);
    const cacheKey = `${wallpaper.id}-${session!.user.id}`, cached = cache.get(cacheKey);
    if (cached) cache.set(cacheKey, { ...cached, liked: newLiked, likeCount: newLiked ? cached.likeCount + 1 : cached.likeCount - 1, timestamp: Date.now() });
    if (!state.liked && likeButtonRef.current) {
      const rect = likeButtonRef.current.getBoundingClientRect();
      setHearts(Array.from({ length: 8 }, (_, i) => { const baseAngle = -90 + (i * 270 / 7); return { id: Date.now() + i, x: rect.left + rect.width / 2 - 17, y: rect.top + rect.height / 2 - 17, angle: baseAngle + (Math.random() - 0.5) * 20, distance: 100 + Math.random() * 80 }; }));
      setTimeout(() => setHearts([]), 1400);
    }
    if (newLiked) await supabase.from('likes').insert({ user_id: session!.user.id, wallpaper_id: wallpaper.id });
    else await supabase.from('likes').delete().eq('user_id', session!.user.id).eq('wallpaper_id', wallpaper.id);
  });

  const handleSave = () => requireAuth('save wallpapers', async () => {
    if (!wallpaper) return;
    const newSaved = !state.saved;
    setState(s => ({ ...s, saved: newSaved }));
    vibrate(50);
    if (session) {
      const cacheKey = `${wallpaper.id}-${session.user.id}`, cached = cache.get(cacheKey);
      if (cached) cache.set(cacheKey, { ...cached, saved: newSaved, timestamp: Date.now() });
    }
    if (newSaved) await supabase.from('saves').insert({ user_id: session!.user.id, wallpaper_id: wallpaper.id });
    else await supabase.from('saves').delete().eq('user_id', session!.user.id).eq('wallpaper_id', wallpaper.id);
  });

  const handleFollow = () => requireAuth('follow users', async () => {
    if (!wallpaper?.userId) return;
    const newFollowing = !state.following;
    setState(s => ({ ...s, following: newFollowing }));
    vibrate(50);
    if (session) {
      const cacheKey = `${wallpaper.id}-${session.user.id}`, cached = cache.get(cacheKey);
      if (cached) cache.set(cacheKey, { ...cached, following: newFollowing, timestamp: Date.now() });
    }
    if (newFollowing) await supabase.from('follows').insert({ follower_id: session!.user.id, following_id: wallpaper.userId });
    else await supabase.from('follows').delete().eq('follower_id', session!.user.id).eq('following_id', wallpaper.userId);
  });

  const handleDownload = async () => {
    if (!state.downloaded && !state.downloading && wallpaper) {
      setState(s => ({ ...s, downloading: true }));
      setCounts(c => ({ ...c, downloads: c.downloads + 1 }));
      vibrate(50);
      const link = document.createElement('a');
      link.href = wallpaper.url;
      link.download = wallpaper.title || 'wallpaper';
      link.click();
      incrementDownloads(wallpaper.id);
      setTimeout(() => { setState(s => ({ ...s, downloading: false, downloaded: true })); vibrate(100); }, 1000);
    }
  };

  const stats = [{ icon: Eye, value: counts.views, active: false }, { icon: Heart, value: counts.likes, active: state.liked, color: 'rose' }, { icon: Download, value: counts.downloads, active: state.downloaded, color: 'emerald' }];

  return (
    <>
      <style jsx>{`@keyframes slideUp{from{transform:translateY(100%)}to{transform:translateY(0)}}@keyframes slideDown{from{transform:translateY(0)}to{transform:translateY(100%)}}@keyframes scaleIn{0%{transform:scale(0)}50%{transform:scale(1.2)}100%{transform:scale(1)}}@keyframes successBounce{0%,100%{transform:scale(1)}50%{transform:scale(1.1)}}@keyframes buttonPress{0%{transform:scale(1)}50%{transform:scale(.95)}100%{transform:scale(1)}}@keyframes spin{to{transform:rotate(360deg)}}.animate-slideUp{animation:slideUp .3s ease-out}.animate-slideDown{animation:slideDown .3s ease-out}.scale-in{animation:scaleIn .4s cubic-bezier(.34,1.56,.64,1)}.success-bounce{animation:successBounce .5s ease-out}.button-press{animation:buttonPress .2s ease-out}.spinner{animation:spin .6s linear infinite}`}</style>
      <FloatingHearts hearts={hearts} />
      <LoginPromptModal isOpen={state.showLoginPrompt} onClose={() => setState(s => ({ ...s, showLoginPrompt: false }))} action={state.loginAction} />
      <div className={`fixed inset-0 bg-black z-50 flex flex-col ${state.isClosing ? 'animate-slideDown' : 'animate-slideUp'}`}>
        <button onClick={() => { setState(s => ({ ...s, isClosing: true })); setTimeout(onClose, 300); }} className="absolute top-4 left-4 z-10 p-3 bg-white rounded-xl hover:bg-gray-100 active:scale-95 transition-all shadow-lg"><ChevronLeft className="w-6 h-6 text-black" /></button>
        <div className="flex-1 overflow-y-auto no-scrollbar">
          <div className="max-w-2xl mx-auto p-4">
            {(isLoading || state.dataLoading) && !wallpaper ? <SkeletonLoader /> : (
              <>
                <div className="relative rounded-2xl overflow-hidden"><ImageWithLoader src={wallpaper!.url} alt={wallpaper!.title} /></div>
                <div className="space-y-4 mt-4">
                  <button onClick={onUserClick} className="flex items-center gap-3 w-full hover:bg-white/5 p-2 rounded-xl transition-colors active:scale-[0.98]">
                    <img src={wallpaper!.userAvatar} alt={wallpaper!.uploadedBy} className="w-10 h-10 rounded-full border border-white/20" />
                    <div className="flex-1 text-left">
                      <div className="flex items-center gap-1.5">
                        <p className="font-semibold text-white">{wallpaper!.uploadedBy}</p>
                        {wallpaper!.verified && <VerifiedBadge size="sm" />}
                      </div>
                      <p className="text-sm text-white/60">{state.timeAgo || 'Just now'}</p>
                    </div>
                    {state.dataLoading ? <div className="w-20 h-8 bg-white/10 rounded-full animate-pulse" /> : <button onClick={e => { e.stopPropagation(); handleFollow(); }} className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-all active:scale-95 ${state.following ? 'bg-white/10 text-white border border-white/20 hover:bg-white/15' : 'bg-white text-black hover:bg-gray-200'}`}>{state.following ? 'Following' : 'Follow'}</button>}
                  </button>
                  <div><h3 className="font-semibold text-white mb-1">{wallpaper!.title}</h3><p className="text-sm text-white/70 leading-relaxed">{wallpaper!.description}</p></div>
                  {state.dataLoading ? <div className="flex items-center gap-6"><div className="h-4 w-16 bg-white/10 rounded animate-pulse" /><div className="h-4 w-16 bg-white/10 rounded animate-pulse" /><div className="h-4 w-16 bg-white/10 rounded animate-pulse" /></div> : <div className="flex items-center gap-6 text-sm text-white/50">{stats.map(({ icon: Icon, value, active, color }, i) => <span key={i} className={`flex items-center gap-1.5 transition-colors ${active ? `text-${color}-400` : ''}`}><Icon className={`w-4 h-4 transition-all ${active ? `fill-${color}-400 text-${color}-400` : ''}`} />{fmt(value)}</span>)}</div>}
                  {state.dataLoading ? <div className="flex gap-3"><div className="flex-1 h-12 bg-white/10 rounded-full animate-pulse" /><div className="h-12 w-12 bg-white/10 rounded-full animate-pulse" /><div className="h-12 w-12 bg-white/10 rounded-full animate-pulse" /></div> : (
                    <div className="flex gap-3">
                      <button onClick={handleSave} className={`flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-full font-semibold transition-all active:scale-95 ${state.saved ? 'bg-blue-500 text-white hover:bg-blue-600 success-bounce' : 'bg-white text-black hover:bg-gray-200'}`}><Bookmark className={`w-5 h-5 transition-all ${state.saved ? 'fill-white scale-in' : ''}`} />{state.saved ? 'Saved' : 'Save'}</button>
                      <button ref={likeButtonRef} onClick={handleLike} className={`flex items-center justify-center px-4 py-3 rounded-full border transition-all active:scale-95 ${state.liked ? 'bg-rose-500/20 border-rose-500/50 text-rose-400 hover:bg-rose-500/30 button-press' : 'bg-white/5 border-white/10 text-white/70 hover:bg-white/10'}`}><Heart className={`w-5 h-5 transition-all ${state.liked ? 'fill-rose-400 text-rose-400 scale-in' : ''}`} /></button>
                      <button onClick={handleDownload} disabled={state.downloading} className={`flex items-center justify-center px-4 py-3 rounded-full border transition-all ${state.downloading ? 'cursor-not-allowed' : 'active:scale-95'} ${state.downloaded ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400' : 'bg-white/5 border-white/10 text-white/70 hover:bg-white/10'}`}>{state.downloading ? <Loader2 className="w-5 h-5 spinner" /> : <Download className={`w-5 h-5 ${state.downloaded ? 'fill-emerald-400 text-emerald-400 scale-in' : ''}`} />}</button>
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-3">
                    <button onClick={() => navigator.share ? navigator.share({ title: wallpaper?.title, text: wallpaper?.description, url: window.location.href }).catch(() => setState(s => ({ ...s, isCopyModalOpen: true }))) : setState(s => ({ ...s, isCopyModalOpen: true }))} className="flex items-center justify-center gap-2 px-6 py-4 bg-white/5 hover:bg-white/10 rounded-xl transition-all active:scale-95"><Share2 className="w-5 h-5" /><span className="font-medium">Share</span></button>
                    <button onClick={() => setState(s => ({ ...s, isCopyModalOpen: true }))} className="flex items-center justify-center gap-2 px-6 py-4 bg-white/5 hover:bg-white/10 rounded-xl transition-all active:scale-95"><LinkIcon className="w-5 h-5" /><span className="font-medium">Copy Link</span></button>
                  </div>
                  {relatedWallpapers.length > 0 && <div><h4 className="font-semibold text-white mb-3">Related</h4><div className="grid grid-cols-2 gap-3">{relatedWallpapers.map(wp => <button key={wp.id} onClick={() => onRelatedClick(wp)} className="relative aspect-[9/16] rounded-xl overflow-hidden hover:scale-[1.02] transition-transform active:scale-95"><img src={wp.thumbnail || wp.url} alt={wp.title} className="w-full h-full object-cover" /><div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent" /></button>)}</div></div>}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
      <CopyLinkModal isOpen={state.isCopyModalOpen} onClose={() => setState(s => ({ ...s, isCopyModalOpen: false }))} link={typeof window !== 'undefined' ? window.location.href : ''} />
    </>
  );
};