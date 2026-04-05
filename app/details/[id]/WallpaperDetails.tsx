'use client';

import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { ChevronLeft, Heart, Download, Share2, Check, Link as LinkIcon, Loader2, Eye, Lock, UserCircle, Flag, AlertTriangle } from 'lucide-react';
import { VerifiedBadge } from '@/app/components/VerifiedBadge';
import { LoginPromptModal } from '@/app/components/LoginPromptModal';
import { TopLoader, startLoader } from '@/app/components/TopLoader';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/app/components/AuthProvider';
import { incrementViews, incrementDownloads } from '@/lib/stores/wallpaperStore';
import type { Wallpaper, Ad } from '@/app/types';

// ── Constants ────────────────────────────────────────────────────
const F = "'DM Sans', sans-serif";
const CACHE_TTL = 30_000;
const cache = new Map<string, { liked: boolean; following: boolean; likeCount: number; timestamp: number }>();
const REPORT_REASONS = ['Inappropriate content', 'Copyright violation', 'Spam or misleading', 'Hate speech', 'Other'];

// ── Helpers ──────────────────────────────────────────────────────
const fmt = (n: number) => n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M` : n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);

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

// ── Shared style helpers ─────────────────────────────────────────
const sheet = (active?: boolean): React.CSSProperties => ({ flex: 1, padding: '12px 0', borderRadius: 12, background: active ? 'rgba(16,185,129,0.06)' : 'rgba(0,0,0,0.04)', border: `1px solid ${active ? 'rgba(16,185,129,0.3)' : 'rgba(0,0,0,0.07)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontFamily: F, fontSize: 13, fontWeight: 600, color: active ? '#10b981' : 'rgba(0,0,0,0.55)', cursor: 'pointer', transition: 'all .15s' });
const pill = (style?: React.CSSProperties): React.CSSProperties => ({ display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', cursor: 'pointer', fontFamily: F, ...style });

// ── Bottom Sheet wrapper ─────────────────────────────────────────
const BottomSheet = ({ isOpen, onClose, children }: { isOpen: boolean; onClose: () => void; children: React.ReactNode }) => {
  if (!isOpen) return null;
  return createPortal(
    <div style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', alignItems: 'flex-end', background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(10px)' }} onClick={onClose}>
      <div style={{ width: '100%', background: '#fff', borderRadius: '24px 24px 0 0', padding: '24px 20px 32px', display: 'flex', flexDirection: 'column', gap: 12 }} onClick={e => e.stopPropagation()}>
        <div style={{ width: 36, height: 4, borderRadius: 2, background: 'rgba(0,0,0,0.1)', margin: '0 auto 4px' }} />
        {children}
      </div>
    </div>,
    document.body,
  );
};

const CancelBtn = ({ onClose }: { onClose: () => void }) => (
  <button onClick={onClose} style={pill({ width: '100%', padding: '14px', borderRadius: 14, fontSize: 14, fontWeight: 500, color: 'rgba(0,0,0,0.4)', background: 'rgba(0,0,0,0.04)' })}>Cancel</button>
);

// ── Copy Link Modal ──────────────────────────────────────────────
const CopyLinkModal = ({ isOpen, onClose, link }: { isOpen: boolean; onClose: () => void; link: string }) => {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try { await navigator.clipboard.writeText(link); }
    catch { const ta = Object.assign(document.createElement('textarea'), { value: link, style: 'position:fixed;opacity:0' }); document.body.appendChild(ta); ta.focus(); ta.select(); document.execCommand('copy'); document.body.removeChild(ta); }
    setCopied(true);
    setTimeout(() => { setCopied(false); setTimeout(onClose, 400); }, 1500);
  };
  return (
    <BottomSheet isOpen={isOpen} onClose={onClose}>
      <p style={{ fontFamily: F, fontSize: 17, fontWeight: 700, color: '#0a0a0a', textAlign: 'center', margin: 0 }}>Share Link</p>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', borderRadius: 14, background: 'rgba(0,0,0,0.04)', border: '1px solid rgba(0,0,0,0.07)' }}>
        <LinkIcon size={14} color="rgba(0,0,0,0.3)" style={{ flexShrink: 0 }} />
        <span style={{ fontFamily: F, fontSize: 13, color: 'rgba(0,0,0,0.5)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{link}</span>
      </div>
      <button onClick={copy} style={pill({ width: '100%', padding: '15px', borderRadius: 14, fontSize: 14, fontWeight: 600, color: '#fff', background: copied ? '#10b981' : '#0a0a0a', transition: 'background .2s' })}>
        {copied ? '✓ Copied!' : 'Copy Link'}
      </button>
      <CancelBtn onClose={onClose} />
    </BottomSheet>
  );
};

// ── Report Modal ─────────────────────────────────────────────────
const ReportModal = ({ isOpen, onClose, wallpaperId, userId }: { isOpen: boolean; onClose: () => void; wallpaperId: string; userId?: string }) => {
  const [selected, setSelected] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const supabase = useMemo(() => createClient(), []);

  useEffect(() => { if (!isOpen) { setSelected(''); setSubmitted(false); } }, [isOpen]);

  const submit = async () => {
    if (!selected || submitting) return;
    setSubmitting(true);
    try { await supabase.from('reports').insert({ wallpaper_id: wallpaperId, reporter_id: userId ?? null, reason: selected }); } catch {}
    setSubmitting(false); setSubmitted(true);
    setTimeout(onClose, 2000);
  };

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose}>
      {submitted ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, padding: '12px 0' }}>
          <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'rgba(16,185,129,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Check size={22} color="#10b981" /></div>
          <p style={{ fontFamily: F, fontSize: 16, fontWeight: 700, color: '#0a0a0a', margin: 0 }}>Report submitted</p>
          <p style={{ fontFamily: F, fontSize: 13, color: 'rgba(0,0,0,0.4)', margin: 0, textAlign: 'center' }}>Thanks for helping keep the community safe.</p>
        </div>
      ) : (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(239,68,68,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><AlertTriangle size={17} color="#ef4444" /></div>
            <div>
              <p style={{ fontFamily: F, fontSize: 16, fontWeight: 700, color: '#0a0a0a', margin: 0 }}>Report Wallpaper</p>
              <p style={{ fontFamily: F, fontSize: 12, color: 'rgba(0,0,0,0.4)', margin: 0 }}>Select a reason below</p>
            </div>
          </div>
          {REPORT_REASONS.map(reason => (
            <button key={reason} onClick={() => setSelected(reason)} style={pill({ padding: '13px 16px', borderRadius: 12, border: `1.5px solid ${selected === reason ? '#0a0a0a' : 'rgba(0,0,0,0.09)'}`, background: selected === reason ? 'rgba(0,0,0,0.03)' : '#fff', fontSize: 14, fontWeight: selected === reason ? 600 : 400, color: selected === reason ? '#0a0a0a' : 'rgba(0,0,0,0.55)', width: '100%', justifyContent: 'space-between', transition: 'all .15s' })}>
              {reason}{selected === reason && <Check size={15} color="#0a0a0a" />}
            </button>
          ))}
          <button onClick={submit} disabled={!selected || submitting} style={pill({ width: '100%', padding: '15px', borderRadius: 14, fontSize: 14, fontWeight: 600, color: '#fff', background: !selected ? 'rgba(0,0,0,0.15)' : '#ef4444', cursor: !selected ? 'not-allowed' : 'pointer', transition: 'background .2s', gap: 8 })}>
            {submitting ? <><Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} />Submitting...</> : 'Submit Report'}
          </button>
          <CancelBtn onClose={onClose} />
        </>
      )}
    </BottomSheet>
  );
};

// ── Floating Hearts ──────────────────────────────────────────────
const FloatingHearts = ({ hearts }: { hearts: Array<{ id: number; x: number; y: number; angle: number; distance: number }> }) => {
  if (typeof window === 'undefined' || !hearts.length) return null;
  return createPortal(<>
    <style>{`@keyframes floatHeart{0%{transform:translate(0,0) scale(0);opacity:0}10%{opacity:1;transform:scale(1) rotate(var(--rotate))}50%{transform:translate(var(--tx),var(--ty)) scale(1.3) rotate(var(--rotate));opacity:.95}100%{transform:translate(calc(var(--tx)*1.5),calc(var(--ty)*1.8)) scale(.2) rotate(var(--rotate));opacity:0}}.heart-float{animation:floatHeart 1.2s cubic-bezier(.25,.46,.45,.94) forwards;pointer-events:none;position:fixed;z-index:9999;filter:drop-shadow(0 4px 12px rgba(244,63,94,.5))}`}</style>
    {hearts.map((h, i) => { const rad = (h.angle * Math.PI) / 180; return <Heart key={h.id} className="heart-float" style={{ left: `${h.x}px`, top: `${h.y}px`, width: 28, height: 28, color: '#f43f5e', fill: '#f43f5e', '--tx': `${Math.cos(rad) * h.distance}px`, '--ty': `${Math.sin(rad) * h.distance - 50}px`, '--rotate': `${(Math.random() - .5) * 45}deg`, animationDelay: `${i * .08}s` } as React.CSSProperties} />; })}
  </>, document.body);
};

// ── Banner Ad ────────────────────────────────────────────────────
const BannerAdCard = ({ ad }: { ad: Ad }) => {
  const [imgLoaded, setImgLoaded] = useState(false);
  const [imgError, setImgError] = useState(false);
  const bg = ad.backgroundColor ?? '#0f0f1a', accent = ad.accentColor ?? '#6366f1', hasImg = !!ad.imageUrl && !imgError;
  return (
    <a href={ad.ctaUrl} target="_blank" rel="noopener noreferrer sponsored" onClick={() => fetch('/api/ads/click', { method: 'POST', body: JSON.stringify({ adId: ad.id }), headers: { 'Content-Type': 'application/json' } }).catch(() => {})} style={{ display: 'block', textDecoration: 'none', marginBottom: 14 }}>
      <div style={{ position: 'relative', borderRadius: 20, overflow: 'hidden', minHeight: 86, background: bg, boxShadow: '0 2px 20px rgba(0,0,0,.14),0 0 0 1px rgba(255,255,255,.04) inset' }}>
        {ad.imageUrl && <img src={ad.imageUrl} alt="" aria-hidden draggable={false} onLoad={() => setImgLoaded(true)} onError={() => setImgError(true)} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: imgLoaded ? 1 : 0, transition: 'opacity .5s ease', pointerEvents: 'none', zIndex: 0 }} />}
        <div style={{ position: 'absolute', inset: 0, zIndex: 1, background: hasImg ? 'linear-gradient(90deg,rgba(0,0,0,.78) 0%,rgba(0,0,0,.48) 55%,rgba(0,0,0,.2) 100%)' : `linear-gradient(135deg,${bg} 0%,${bg}dd 100%)` }} />
        <div style={{ position: 'absolute', top: -30, right: 60, width: 100, height: 100, borderRadius: '50%', background: `${accent}28`, filter: 'blur(20px)', zIndex: 1, pointerEvents: 'none' }} />
        <div style={{ position: 'relative', zIndex: 2, display: 'flex', alignItems: 'center', gap: 12, padding: 14 }}>
          {ad.brandLogoUrl
            ? <img src={ad.brandLogoUrl} alt={ad.brandName} style={{ width: 42, height: 42, borderRadius: 13, objectFit: 'cover', flexShrink: 0, border: '1.5px solid rgba(255,255,255,.15)', boxShadow: '0 2px 12px rgba(0,0,0,.3)' }} />
            : <div style={{ width: 42, height: 42, borderRadius: 13, flexShrink: 0, background: `${accent}33`, border: `1.5px solid ${accent}55`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17, fontWeight: 900, color: accent }}>{ad.brandName?.[0]?.toUpperCase() ?? 'A'}</div>}
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ margin: 0, fontWeight: 800, color: '#fff', fontSize: 13.5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', letterSpacing: '-.01em', lineHeight: 1.2 }}>{ad.title}</p>
            {ad.subtitle && <p style={{ margin: '3px 0 0', color: `${accent}cc`, fontSize: 11, fontWeight: 500, lineHeight: 1.3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{ad.subtitle}</p>}
            <span style={{ display: 'inline-block', marginTop: 5, fontSize: 8, fontWeight: 700, color: 'rgba(255,255,255,.35)', letterSpacing: '.12em', textTransform: 'uppercase' }}>Sponsored</span>
          </div>
          <span style={{ display: 'inline-flex', alignItems: 'center', flexShrink: 0, fontSize: 11, fontWeight: 800, color: '#fff', background: accent, borderRadius: 50, padding: '9px 16px', boxShadow: `0 4px 14px ${accent}55`, whiteSpace: 'nowrap' }}>{ad.ctaLabel ?? 'Learn More'}</span>
        </div>
      </div>
    </a>
  );
};

// ── Main Component ───────────────────────────────────────────────
export default function WallpaperDetail({ initialWallpaper: wp, ad }: { initialWallpaper: Wallpaper; ad?: Ad }) {
  const router = useRouter();
  const { session } = useAuth();
  const supabase = useMemo(() => createClient(), []);
  const isPC = wp.type === 'pc', isOwner = session?.user.id === wp.userId;

  const [likes, setLikes] = useState(wp.likes);
  const [views, setViews] = useState(wp.views);
  const [hearts, setHearts] = useState<Array<{ id: number; x: number; y: number; angle: number; distance: number }>>([]);
  const [imgLoaded, setImgLoaded] = useState(imgCache.has(wp.url));
  const [timeAgo, setTimeAgo] = useState(() => wp.createdAt ? timeAgoStr(wp.createdAt) : 'Just now');
  const [st, setSt] = useState({ liked: false, following: false, downloading: false, downloaded: false, dataLoading: true, showLogin: false, loginAction: '', copyOpen: false, reportOpen: false, pfpSetting: false, pfpSet: false });
  const likeRef = useRef<HTMLButtonElement>(null);
  const set = useCallback((p: Partial<typeof st>) => setSt(s => ({ ...s, ...p })), []);

  useEffect(() => { if (!wp.createdAt) return; const t = setInterval(() => setTimeAgo(timeAgoStr(wp.createdAt!)), 60_000); return () => clearInterval(t); }, [wp.createdAt]);

  useEffect(() => {
    const key = `viewed_${wp.id}`;
    if (sessionStorage.getItem(key)) return;
    const t = setTimeout(async () => { sessionStorage.setItem(key, '1'); await incrementViews(wp.id); setViews(v => v + 1); }, 5000);
    return () => clearTimeout(t);
  }, [wp.id]);

  useEffect(() => {
    if (!session) { set({ dataLoading: false }); return; }
    const uid = session.user.id, key = `${wp.id}-${uid}`, cached = cache.get(key);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) { set({ liked: cached.liked, following: cached.following, dataLoading: false }); setLikes(cached.likeCount); return; }
    (async () => {
      const [likeR, followR, countR] = await Promise.all([
        supabase.from('likes').select('id').eq('user_id', uid).eq('wallpaper_id', wp.id).maybeSingle(),
        wp.userId ? supabase.from('follows').select('id').eq('follower_id', uid).eq('following_id', wp.userId).maybeSingle() : Promise.resolve({ data: null }),
        supabase.from('likes').select('id', { count: 'exact' }).eq('wallpaper_id', wp.id),
      ]);
      const next = { liked: !!likeR.data, following: !!followR.data, likeCount: countR.count ?? 0, timestamp: Date.now() };
      set({ liked: next.liked, following: next.following, dataLoading: false }); setLikes(next.likeCount); cache.set(key, next);
    })();
  }, [wp.id, session?.user?.id]);

  useEffect(() => {
    const ch = supabase.channel(`wp-likes-${wp.id}`).on('postgres_changes', { event: '*', schema: 'public', table: 'likes', filter: `wallpaper_id=eq.${wp.id}` }, async () => {
      const { count } = await supabase.from('likes').select('id', { count: 'exact' }).eq('wallpaper_id', wp.id);
      setLikes(count ?? 0);
    }).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [wp.id]);

  const auth = (action: string, cb: () => void) => !session ? set({ loginAction: action, showLogin: true }) : cb();

  const handleLike = () => auth('like wallpapers', async () => {
    const v = !st.liked;
    set({ liked: v }); setLikes(c => v ? c + 1 : Math.max(0, c - 1)); navigator.vibrate?.(50);
    const key = `${wp.id}-${session!.user.id}`, cached = cache.get(key);
    if (cached) cache.set(key, { ...cached, liked: v, likeCount: v ? cached.likeCount + 1 : cached.likeCount - 1, timestamp: Date.now() });
    if (v && likeRef.current) {
      const r = likeRef.current.getBoundingClientRect();
      setHearts(Array.from({ length: 8 }, (_, i) => ({ id: Date.now() + i, x: r.left + r.width / 2 - 14, y: r.top + r.height / 2 - 14, angle: -90 + (i * 270 / 7) + (Math.random() - .5) * 20, distance: 80 + Math.random() * 60 })));
      setTimeout(() => setHearts([]), 1400);
    }
    v ? await supabase.from('likes').insert({ user_id: session!.user.id, wallpaper_id: wp.id }) : await supabase.from('likes').delete().eq('user_id', session!.user.id).eq('wallpaper_id', wp.id);
  });

  const handleFollow = () => auth('follow users', async () => {
    if (!wp.userId) return;
    const v = !st.following; set({ following: v }); navigator.vibrate?.(50);
    const key = `${wp.id}-${session!.user.id}`, cached = cache.get(key);
    if (cached) cache.set(key, { ...cached, following: v, timestamp: Date.now() });
    v ? await supabase.from('follows').insert({ follower_id: session!.user.id, following_id: wp.userId }) : await supabase.from('follows').delete().eq('follower_id', session!.user.id).eq('following_id', wp.userId);
  });

  const handleDownload = async () => {
    if (st.downloading || st.downloaded) return;
    set({ downloading: true }); navigator.vibrate?.(50);
    try {
      await incrementDownloads(wp.id);
      const res = await fetch(`/api/download?url=${encodeURIComponent(wp.url)}&name=${encodeURIComponent(wp.title || 'wallpaper')}`);
      if (!res.ok) throw new Error('Download failed');
      const objectUrl = URL.createObjectURL(await res.blob());
      const a = Object.assign(document.createElement('a'), { href: objectUrl, download: `${wp.title || 'wallpaper'}.jpg`, style: 'display:none' });
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
      set({ downloading: false, downloaded: true }); navigator.vibrate?.(100);
    } catch (e) { console.error('Download error:', e); set({ downloading: false }); }
  };

  const handleSetPfp = async () => {
    if (!session || st.pfpSetting || st.pfpSet) return;
    set({ pfpSetting: true }); navigator.vibrate?.(50);
    try {
      const { error } = await supabase.from('profiles').update({ avatar_url: wp.thumbnail }).eq('id', session.user.id);
      if (error) throw error;
      set({ pfpSetting: false, pfpSet: true }); navigator.vibrate?.(100);
    } catch (e) { console.error('Set pfp error:', e); set({ pfpSetting: false }); }
  };

  const handleShare = () => {
    const d = { title: wp.title, url: window.location.href };
    navigator.canShare?.(d) ? navigator.share(d).catch(() => set({ copyOpen: true })) : set({ copyOpen: true });
  };

  const CSS = `
    @keyframes shimmer{0%{background-position:-200% 0}100%{background-position:200% 0}}
    @keyframes fadeSlide{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}
    @keyframes spin{to{transform:rotate(360deg)}}
    .shimmer{background:linear-gradient(90deg,#ebebeb 25%,#e0e0de 50%,#ebebeb 75%);background-size:200% 100%;animation:shimmer 1.6s infinite}
    .fade-in{animation:fadeSlide .4s cubic-bezier(.16,1,.3,1) forwards}
    .act-btn{transition:transform .15s,opacity .15s;-webkit-tap-highlight-color:transparent}
    .act-btn:active{transform:scale(0.93);opacity:.8}
    .no-save{-webkit-user-select:none;user-select:none;-webkit-touch-callout:none}
    .wp-img{-webkit-user-drag:none;user-drag:none;-webkit-touch-callout:none;pointer-events:none}
  `;

  return (
    <div style={{ minHeight: '100dvh', background: '#f5f5f3', fontFamily: F }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600;9..40,700&family=DM+Serif+Display&display=swap" rel="stylesheet" />
      <style>{CSS}</style>
      <TopLoader />
      <FloatingHearts hearts={hearts} />
      <LoginPromptModal isOpen={st.showLogin} onClose={() => set({ showLogin: false })} action={st.loginAction} />
      <CopyLinkModal isOpen={st.copyOpen} onClose={() => set({ copyOpen: false })} link={typeof window !== 'undefined' ? window.location.href : ''} />
      <ReportModal isOpen={st.reportOpen} onClose={() => set({ reportOpen: false })} wallpaperId={wp.id} userId={session?.user.id} />

      {/* Back */}
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 60, padding: '12px 16px', pointerEvents: 'none' }}>
        <button onClick={() => { startLoader(); router.back(); }} className="act-btn" style={{ pointerEvents: 'all', width: 45, height: 45, borderRadius: 9, background: 'rgba(255,255,255,0.35)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
          <ChevronLeft size={22} color="#fff" strokeWidth={2.5} />
        </button>
      </div>

      {/* Image */}
      <div style={{ padding: '16px 19px 0' }}>
        <div style={{ position: 'relative', width: '100%', aspectRatio: isPC ? '4/3' : '9/16', borderRadius: 20, overflow: 'hidden', background: '#e0e0de' }} onContextMenu={e => e.preventDefault()}>
          {!imgLoaded && <div className="shimmer" style={{ position: 'absolute', inset: 0 }} />}
          <Image src={wp.url} alt={wp.title} fill priority draggable={false} className="wp-img" style={{ objectFit: 'cover', opacity: imgLoaded ? 1 : 0, transition: 'opacity .4s ease' }} sizes="(max-width:768px) 100vw, 600px" onLoad={() => { imgCache.add(wp.url); setImgLoaded(true); }} />
          <div className="no-save" style={{ position: 'absolute', inset: 0, zIndex: 2, pointerEvents: 'all' }} onContextMenu={e => e.preventDefault()} onTouchStart={e => e.preventDefault()} />
          {imgLoaded && (
            <div style={{ position: 'absolute', bottom: 25, right: 14, zIndex: 3, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
              <button ref={likeRef} onClick={handleLike} className="act-btn" style={{ width: 46, height: 46, borderRadius: '50%', background: st.liked ? '#f43f5e' : 'rgba(0,0,0,0.28)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'background .2s' }}>
                <Heart size={19} color="#fff" fill={st.liked ? '#fff' : 'none'} strokeWidth={2} />
              </button>
              {likes > 0 && <span style={{ fontSize: 10, fontWeight: 600, color: '#fff', textShadow: '0 1px 4px rgba(0,0,0,0.5)' }}>{fmt(likes)}</span>}
            </div>
          )}
        </div>
      </div>

      {/* Info */}
      <div className="fade-in" style={{ padding: '16px 16px 48px' }}>
        <h1 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 22, fontWeight: 400, color: '#0a0a0a', letterSpacing: '-0.02em', lineHeight: 1.25, marginBottom: 5 }}>{wp.title}</h1>
        {wp.description && <p style={{ fontSize: 13, color: 'rgba(0,0,0,0.45)', lineHeight: 1.6, fontWeight: 300, marginBottom: 12 }}>{wp.description}</p>}

        {/* Stats */}
        <div style={{ display: 'flex', gap: 14, marginBottom: 14 }}>
          {[{ icon: <Eye size={12} />, label: `${fmt(views)} views` }, { icon: <Download size={12} />, label: `${fmt(wp.downloads)} downloads` }, { icon: <Heart size={12} />, label: `${fmt(likes)} likes` }].map(({ icon, label }) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'rgba(0,0,0,0.4)', fontWeight: 500 }}><span style={{ opacity: 0.55 }}>{icon}</span>{label}</div>
          ))}
        </div>

        <div style={{ height: 1, background: 'rgba(0,0,0,0.07)', marginBottom: 14 }} />

        {ad && <BannerAdCard ad={ad} />}

        {/* User row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
          <button onClick={() => { startLoader(); router.push(`/user/${wp.userId}`); }} style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
            <div style={{ position: 'relative', width: 40, height: 40, borderRadius: '50%', overflow: 'hidden', flexShrink: 0, border: '1.5px solid rgba(0,0,0,0.07)' }}>
              <Image src={wp.userAvatar} alt={wp.uploadedBy} fill style={{ objectFit: 'cover' }} sizes="40px" />
            </div>
            <div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ fontSize: 14, fontWeight: 600, color: '#0a0a0a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{wp.uploadedBy}</span>
                {wp.verified && <VerifiedBadge size="sm" />}
              </div>
              <span style={{ fontSize: 12, color: 'rgba(0,0,0,0.35)' }}>{timeAgo}</span>
            </div>
          </button>
          {!isOwner && (st.dataLoading
            ? <div className="shimmer" style={{ width: 80, height: 34, borderRadius: 8, flexShrink: 0 }} />
            : <button onClick={handleFollow} className="act-btn" style={{ flexShrink: 0, padding: '8px 18px', borderRadius: 8, border: st.following ? '1.5px solid rgba(0,0,0,0.12)' : 'none', background: st.following ? 'transparent' : '#0a0a0a', color: st.following ? 'rgba(0,0,0,0.45)' : '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', transition: 'all .2s', fontFamily: F }}>
                {st.following ? 'Following' : 'Follow'}
              </button>
          )}
        </div>

        <div style={{ height: 1, background: 'rgba(0,0,0,0.07)', marginBottom: 14 }} />

        {/* Actions */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
          <button onClick={session ? handleDownload : () => set({ loginAction: 'download wallpapers', showLogin: true })} disabled={st.downloading} className="act-btn" style={{ flex: 2, padding: '13px 0', borderRadius: 12, border: 'none', fontFamily: F, fontSize: 14, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, color: '#fff', background: st.downloaded ? '#10b981' : '#0a0a0a', opacity: st.downloading ? 0.7 : 1, cursor: st.downloading ? 'not-allowed' : 'pointer', transition: 'background .2s,opacity .2s' }}>
            {st.downloading ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : st.downloaded ? <><Check size={16} />Downloaded</> : !session ? <><Lock size={16} />Download</> : <><Download size={16} />Download</>}
          </button>
          <button onClick={handleShare} className="act-btn" aria-label="Share" style={sheet()}><Share2 size={17} /></button>
          <button onClick={() => set({ copyOpen: true })} className="act-btn" aria-label="Copy link" style={sheet()}><LinkIcon size={17} /></button>
 <button onClick={handleSetPfp} disabled={st.pfpSetting || st.pfpSet} className="act-btn" style={sheet(st.pfpSet)}>
              {st.pfpSetting ? <><Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} />Setting...</> : st.pfpSet ? <><Check size={15} />Picture Set</> : <><UserCircle size={15} />Set as Profile Picture</>}
            </button>
        </div>

        {session && (
          <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
           
          </div>
        )}

        {/* Tags */}
        {wp.tags?.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, marginTop: 6, marginBottom: 14 }}>
            {wp.tags.map(tag => <span key={tag} style={{ padding: '5px 12px', borderRadius: 100, border: '1px solid rgba(0,0,0,0.1)', fontSize: 12, fontWeight: 500, color: 'rgba(0,0,0,0.45)' }}>{tag}</span>)}
          </div>
        )}

        {/* Report */}
        <button onClick={() => set({ reportOpen: true })} className="act-btn" style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', padding: '4px 0', cursor: 'pointer', fontFamily: F, fontSize: 12, color: 'rgba(0,0,0,0.3)', fontWeight: 500 }}>
          <Flag size={12} />Report this wallpaper
        </button>
      </div>
    </div>
  );
}