'use client';

import { useState, useEffect, useRef, useCallback, createContext, useContext } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Heart, Share2, Bookmark, Flag, MoreHorizontal, BookmarkCheck } from 'lucide-react';
import { toggleLike, isWallpaperLiked, toggleSave, isWallpaperSaved } from '@/lib/stores/userStore';
import { useAuth } from '@/app/components/AuthProvider';
import { saveFeedScroll } from '@/lib/feedCache';
import { startLoader } from '@/app/components/TopLoader';
import type { Wallpaper, Ad } from '../types';

/* ─── constants ──────────────────────────────────────────────────────── */
const COLORS = [
  { bg: '#e8eaf0', shimmer: '#d0d4e8' }, { bg: '#ede8f0', shimmer: '#d8cce8' },
  { bg: '#e8f0ea', shimmer: '#cce0d0' }, { bg: '#f0e8e8', shimmer: '#e8cccc' },
  { bg: '#f0ede8', shimmer: '#e8dcc8' },
];
const GRADIENTS = [
  'linear-gradient(145deg,#0f0c29,#302b63,#24243e)',
  'linear-gradient(145deg,#0a0a0a,#1a1a2e,#16213e)',
  'linear-gradient(145deg,#1a0533,#2d1b69,#11998e)',
  'linear-gradient(145deg,#0d0d0d,#1a1a1a,#2c2c54)',
  'linear-gradient(145deg,#160a2c,#0f3460,#533483)',
];

/* ─── image cache (debounced sessionStorage write) ───────────────────── */
const imgCache = (() => {
  const mem = new Set<string>();
  let timer: ReturnType<typeof setTimeout> | null = null;
  try { (JSON.parse(sessionStorage.getItem('__wpcache__') || '[]') as string[]).forEach(u => mem.add(u)); } catch {}
  const flush = () => { try { sessionStorage.setItem('__wpcache__', JSON.stringify([...mem].slice(-300))); } catch {} };
  return {
    has: (u: string) => mem.has(u),
    add: (u: string) => {
      mem.add(u);
      if (timer) clearTimeout(timer);
      timer = setTimeout(flush, 3000);
    },
  };
})();

const fmt = (n: number) => n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M` : n >= 1_000 ? `${(n / 1_000).toFixed(1)}k` : String(n);
const trackAdClick = (id: string) =>
  fetch('/api/ads/click', { method: 'POST', body: JSON.stringify({ adId: id }), headers: { 'Content-Type': 'application/json' } }).catch(() => {});

/* ─── shared bottom sheet context ───────────────────────────────────── */
interface SheetState { wp: Wallpaper; saved: boolean; onSave: () => void; onShare: () => void; }
interface SheetCtx { open: (s: SheetState) => void; }
const BottomSheetCtx = createContext<SheetCtx>({ open: () => {} });
export const useBottomSheet = () => useContext(BottomSheetCtx);

export const BottomSheetProvider = ({ children }: { children: React.ReactNode }) => {
  const [sheet, setSheet] = useState<SheetState | null>(null);
  const [out, setOut] = useState(false);

  const close = useCallback(() => {
    setOut(true);
    setTimeout(() => { setSheet(null); setOut(false); }, 280);
  }, []);

  const open = useCallback((s: SheetState) => { setOut(false); setSheet(s); }, []);

  const items = sheet ? [
    { icon: sheet.saved ? BookmarkCheck : Bookmark, label: sheet.saved ? 'Saved' : 'Save', sub: sheet.saved ? 'Remove from your collection' : 'Add to your collection', onClick: sheet.onSave, accent: sheet.saved },
    { icon: Share2, label: 'Share', sub: 'Send this wallpaper to someone', onClick: sheet.onShare, accent: false },
    { icon: Flag, label: 'Report', sub: 'Flag inappropriate content', onClick: () => { alert('Report coming soon'); close(); }, danger: true },
  ] : [];

  return (
    <BottomSheetCtx.Provider value={{ open }}>
      {children}
      {sheet && createPortal(
        <>
          <div onClick={close} style={{ position: 'fixed', inset: 0, background: out ? 'rgba(0,0,0,0)' : 'rgba(0,0,0,0.35)', zIndex: 100, transition: 'background .28s ease', backdropFilter: out ? 'blur(0px)' : 'blur(2px)' }} />
          <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 101, transform: out ? 'translateY(100%)' : 'translateY(0)', transition: out ? 'transform .28s cubic-bezier(.4,0,1,1)' : 'transform .36s cubic-bezier(.34,1.4,.64,1)' }}>
            <div style={{ background: '#fff', borderRadius: '24px 24px 0 0', maxWidth: 560, margin: '0 auto', padding: '0 0 calc(env(safe-area-inset-bottom) + 24px)', boxShadow: '0 -4px 40px rgba(0,0,0,.1)' }}>
              <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 16px' }}>
                <div style={{ width: 36, height: 4, borderRadius: 99, background: '#e5e7eb' }} />
              </div>
              <div style={{ padding: '0 20px 20px', borderBottom: '1px solid #f3f4f6' }}>
                <p style={{ fontSize: 11, fontWeight: 600, color: '#9ca3af', letterSpacing: '.08em', textTransform: 'uppercase', margin: '0 0 4px' }}>Options</p>
                <p style={{ fontSize: 15, fontWeight: 600, color: '#111827', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{sheet.wp.title}</p>
              </div>
              <div style={{ padding: '8px 12px' }}>
                {items.map((item, i) => (
                  <button key={i} onClick={item.onClick}
                    style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 14, padding: '12px 10px', border: 'none', borderRadius: 14, background: 'none', cursor: 'pointer', textAlign: 'left', transition: 'background .15s', marginTop: (item as any).danger ? 4 : 0, borderTop: (item as any).danger ? '1px solid #f9fafb' : 'none' }}
                    onMouseEnter={e => (e.currentTarget.style.background = '#f9fafb')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                    onTouchStart={e => (e.currentTarget.style.background = '#f3f4f6')}
                    onTouchEnd={e => (e.currentTarget.style.background = 'none')}
                  >
                    <div style={{ width: 42, height: 42, borderRadius: 12, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: (item as any).danger ? '#fff1f2' : item.accent ? '#eff6ff' : '#f3f4f6' }}>
                      <item.icon size={18} strokeWidth={1.8} color={(item as any).danger ? '#ef4444' : item.accent ? '#3b82f6' : '#374151'} fill={item.accent ? '#3b82f6' : 'none'} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ margin: 0, fontSize: 14, fontWeight: 600, lineHeight: 1.3, color: (item as any).danger ? '#ef4444' : '#111827' }}>{item.label}</p>
                      <p style={{ margin: 0, fontSize: 12, color: '#9ca3af', lineHeight: 1.3, marginTop: 1 }}>{item.sub}</p>
                    </div>
                  </button>
                ))}
              </div>
              <div style={{ padding: '4px 12px 0' }}>
                <button onClick={close}
                  style={{ width: '100%', padding: 14, border: 'none', borderRadius: 14, background: '#f3f4f6', fontSize: 14, fontWeight: 600, color: '#374151', cursor: 'pointer', transition: 'background .15s' }}
                  onMouseEnter={e => (e.currentTarget.style.background = '#e5e7eb')}
                  onMouseLeave={e => (e.currentTarget.style.background = '#f3f4f6')}
                >Cancel</button>
              </div>
            </div>
          </div>
        </>,
        document.body,
      )}
    </BottomSheetCtx.Provider>
  );
};

/* ════════════════════════════════════════
   NATIVE AD CARD
════════════════════════════════════════ */
export const NativeAdCard = ({ ad, placeholderIndex = 0 }: { ad: Ad; placeholderIndex?: number }) => {
  const [imgLoaded, setImgLoaded] = useState(false);
  const [imgError, setImgError]   = useState(false);
  const ph      = COLORS[placeholderIndex % COLORS.length];
  const hasImg  = !!ad.imageUrl && !imgError;
  const gradBg  = GRADIENTS[(ad.brandName?.charCodeAt(0) ?? 65) % GRADIENTS.length];
  const initial = ad.brandName?.[0]?.toUpperCase() ?? 'A';

  return (
    <a href={ad.ctaUrl} target="_blank" rel="noopener noreferrer sponsored" onClick={() => trackAdClick(ad.id)} style={{ display: 'block', textDecoration: 'none' }}>
      <div style={{ position: 'relative', width: '100%', borderRadius: 16, overflow: 'hidden', aspectRatio: '9/16', background: hasImg ? ph.bg : gradBg }}>

        {!imgLoaded && !imgError && ad.imageUrl && (
          <div style={{ position: 'absolute', inset: 0, zIndex: 1, background: `linear-gradient(105deg,transparent 40%,${ph.shimmer}99 50%,transparent 60%)`, backgroundSize: '200% 100%', animation: 'shimmerSweep 1.8s ease-in-out infinite' }} />
        )}

        {ad.imageUrl && (
          <img src={ad.imageUrl} alt={ad.title} draggable={false}
            onLoad={() => setImgLoaded(true)} onError={() => setImgError(true)}
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', zIndex: 2, opacity: imgLoaded ? 1 : 0, transition: 'opacity .4s ease', pointerEvents: 'none', WebkitUserDrag: 'none' } as React.CSSProperties}
          />
        )}

        {!hasImg && (
          <div style={{ position: 'absolute', inset: 0, zIndex: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', width: 180, height: 180, borderRadius: '50%', border: '1px solid rgba(255,255,255,.07)', top: '20%', left: '50%', transform: 'translateX(-50%)' }} />
            <div style={{ position: 'absolute', width: 120, height: 120, borderRadius: '50%', border: '1px solid rgba(255,255,255,.1)', top: '30%', left: '50%', transform: 'translateX(-50%)' }} />
            <div style={{ width: 52, height: 52, borderRadius: 16, background: 'rgba(255,255,255,.1)', border: '1px solid rgba(255,255,255,.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, fontWeight: 900, color: 'rgba(255,255,255,.9)', marginBottom: 60 }}>
              {initial}
            </div>
          </div>
        )}

        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '65%', background: 'linear-gradient(to top,rgba(0,0,0,.88) 0%,rgba(0,0,0,.4) 55%,transparent 100%)', zIndex: 3 }} />

        <div style={{ position: 'absolute', bottom: 10, left: 8, right: 8, zIndex: 4, display: 'flex', alignItems: 'center', gap: 7 }}>
          {ad.brandLogoUrl
            ? <img src={ad.brandLogoUrl} alt={ad.brandName} style={{ width: 24, height: 24, borderRadius: 7, objectFit: 'cover', flexShrink: 0, border: '1.5px solid rgba(255,255,255,.2)' }} />
            : <div style={{ width: 24, height: 24, borderRadius: 7, flexShrink: 0, background: 'rgba(255,255,255,.15)', border: '1px solid rgba(255,255,255,.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 800, color: '#fff' }}>{initial}</div>
          }
          <span style={{ flex: 1, fontSize: 11, fontWeight: 700, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textShadow: '0 1px 6px rgba(0,0,0,.7)' }}>{ad.title}</span>
          <span style={{ fontSize: 9, fontWeight: 800, color: '#fff', background: 'rgba(255,255,255,.15)', border: '1px solid rgba(255,255,255,.28)', borderRadius: 7, padding: '4px 9px', flexShrink: 0, letterSpacing: '.03em', whiteSpace: 'nowrap' }}>{ad.ctaLabel ?? 'View'}</span>
        </div>

        <div style={{ position: 'absolute', top: 8, left: 8, zIndex: 4, padding: '3px 7px', borderRadius: 6, background: 'rgba(0,0,0,.5)', fontSize: 8, fontWeight: 800, color: 'rgba(255,255,255,.75)', letterSpacing: '.08em', border: '1px solid rgba(255,255,255,.1)' }}>AD</div>
      </div>

      <div style={{ padding: '5px 0 0', display: 'flex', flexDirection: 'column', gap: 3 }}>
        <p style={{ fontSize: 11, fontWeight: 600, color: '#0a0a0a', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', lineHeight: 1.3 }}>{ad.title}</p>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 4 }}>
          <span style={{ fontSize: 10, color: 'rgba(0,0,0,.4)', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ad.brandName}</span>
          <span style={{ display: 'inline-flex', alignSelf: 'flex-start', fontSize: 9, fontWeight: 800, color: '#fff', background: '#1d4ed8', borderRadius: 4, padding: '2px 6px', flexShrink: 0, letterSpacing: '.04em' }}>SPONSORED</span>
        </div>
      </div>
    </a>
  );
};


/* ════════════════════════════════════════
   WALLPAPER CARD
════════════════════════════════════════ */
export const WallpaperCard = ({ wp, onClick, priority = false, placeholderIndex = 0 }: {
  wp: Wallpaper; onClick?: () => void; priority?: boolean; placeholderIndex?: number;
}) => {
  const { user }  = useAuth();
  const router    = useRouter();
  const { open }  = useBottomSheet();
  const mounted   = useRef(true);
  const imgSrc    = wp.thumbnail || wp.url;
  const ph        = COLORS[placeholderIndex % COLORS.length];
  const isPC      = wp.type === 'pc';
  const longTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const didLong   = useRef(false);

  useEffect(() => () => { mounted.current = false; }, []);

  const [loaded, setLoaded]     = useState(() => imgCache.has(imgSrc));
  const [liked, setLiked]       = useState(false);
  const [saved, setSaved]       = useState(false);
  const [likeCount, setLikeCount] = useState(wp.likes || 0);
  const [likeLoaded, setLikeLoaded] = useState(false);

  // Lazy-load like/save only when image is loaded (card is visible)
  useEffect(() => {
    if (!user || !loaded || likeLoaded) return;
    setLikeLoaded(true);
    Promise.all([isWallpaperLiked(wp.id, user.id), isWallpaperSaved(wp.id, user.id)])
      .then(([l, s]) => { if (mounted.current) { setLiked(l); setSaved(s); } });
  }, [user, loaded, likeLoaded, wp.id]);

  const handleSave = useCallback(async () => {
    if (!user) return alert('Please login to save wallpapers');
    const next = !saved;
    setSaved(next); navigator.vibrate?.(50);
    try { await toggleSave(wp.id); }
    catch { if (mounted.current) setSaved(!next); }
  }, [user, saved, wp.id]);

  const handleShare = useCallback(async () => {
    const url = `${window.location.origin}/details/${wp.id}`;
    if (navigator.share) { try { await navigator.share({ title: wp.title, url }); } catch {} }
    else { await navigator.clipboard.writeText(url); alert('Link copied!'); }
  }, [wp.id, wp.title]);

  const openMenu = useCallback(() => {
    open({ wp, saved, onSave: handleSave, onShare: handleShare });
  }, [open, wp, saved, handleSave, handleShare]);

  const onTouchStart = useCallback(() => {
    didLong.current = false;
    longTimer.current = setTimeout(() => { didLong.current = true; navigator.vibrate?.(40); openMenu(); }, 500);
  }, [openMenu]);
  const clearLong = useCallback(() => { if (longTimer.current) clearTimeout(longTimer.current); }, []);
  const noCtx     = useCallback((e: React.MouseEvent | React.TouchEvent) => { e.preventDefault(); return false; }, []);

  const handleClick = () => {
    if (didLong.current) return;
    if (onClick) return onClick();
    saveFeedScroll(); startLoader();
    router.push(`/details/${wp.id}`);
  };

  const handleUploaderClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (wp.userId) { startLoader(); router.push(`/user/${wp.userId}`); }
  };

  const handleLike = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) return alert('Please login to like wallpapers');
    const next = !liked;
    setLiked(next); setLikeCount(c => next ? c + 1 : Math.max(0, c - 1));
    navigator.vibrate?.(50);
    try { await toggleLike(wp.id); }
    catch { if (mounted.current) { setLiked(!next); setLikeCount(c => next ? Math.max(0, c - 1) : c + 1); } }
  };

  return (
    <>
      <div className="relative w-full rounded-2xl overflow-hidden cursor-pointer select-none"
        style={{ aspectRatio: isPC ? '4/3' : '9/16', background: ph.bg, WebkitUserSelect: 'none', userSelect: 'none', contain: 'layout style paint' }}
        onClick={handleClick} onTouchStart={onTouchStart} onTouchEnd={clearLong}
        onTouchMove={clearLong} onContextMenu={noCtx}
      >
        {!loaded && (
          <div className="absolute inset-0 z-[1]"
            style={{ background: `linear-gradient(105deg,transparent 40%,${ph.shimmer}99 50%,transparent 60%)`, backgroundSize: '200% 100%', animation: 'shimmerSweep 1.8s ease-in-out infinite' }}
          />
        )}

        <Image src={imgSrc} alt={wp.title} fill draggable={false}
          sizes={isPC ? '100vw' : '(max-width:480px) 50vw,(max-width:768px) 33vw,(max-width:1024px) 25vw,20vw'}
          onLoad={() => { imgCache.add(imgSrc); if (mounted.current) setLoaded(true); }}
          className="object-cover z-[2]" priority={priority} loading={priority ? 'eager' : 'lazy'}
          style={{ opacity: loaded ? 1 : 0, transition: 'opacity .4s ease', pointerEvents: 'none', WebkitUserDrag: 'none' } as React.CSSProperties}
          onContextMenu={e => e.preventDefault()}
        />

        {loaded && isPC && (
          <div className="absolute top-2 left-2 z-[5]" style={{ padding: '2px 7px', borderRadius: 5, background: 'rgba(0,0,0,.5)', fontSize: 9, fontWeight: 700, color: '#fff', letterSpacing: '.06em', textTransform: 'uppercase' }}>
            Desktop
          </div>
        )}

        {loaded && (
          <button aria-label="More options" onClick={e => { e.stopPropagation(); openMenu(); }} className="absolute top-2 right-2 z-[5] p-1.5 rounded-full" style={{ background: 'rgba(0,0,0,.3)' }}>
            <MoreHorizontal className="w-3.5 h-3.5 text-white" />
          </button>
        )}
      </div>

      {loaded && (
        <div style={{ padding: '5px 0 0', display: 'flex', flexDirection: 'column', gap: 3 }}>
          <p style={{ fontSize: 11, fontWeight: 600, color: '#0a0a0a', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', lineHeight: 1.3 }}>{wp.title}</p>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 4 }}>
            {wp.uploadedBy && (
              <button onClick={handleUploaderClick} style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: 'none', cursor: 'pointer', padding: 0, minWidth: 0, flex: 1 }}>
                {wp.userAvatar && wp.userAvatar !== 'favicon.ico'
                  ? <img src={wp.userAvatar} alt={wp.uploadedBy} style={{ width: 14, height: 14, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
                  : <div style={{ width: 14, height: 14, borderRadius: '50%', background: 'rgba(0,0,0,.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 6, fontWeight: 800, color: 'rgba(0,0,0,.5)', flexShrink: 0 }}>{wp.uploadedBy[0]?.toUpperCase()}</div>
                }
                <span style={{ fontSize: 10, color: 'rgba(0,0,0,.4)', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>@{wp.uploadedBy}</span>
                {wp.verified && (
                  <svg width="9" height="9" viewBox="0 0 20 20" fill="none" style={{ flexShrink: 0 }}>
                    <circle cx="10" cy="10" r="10" fill="#1877F2" />
                    <path d="M6.5 10.2L8.8 12.5L13.5 7.5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </button>
            )}
            <button aria-label="Like" onClick={handleLike} style={{ display: 'flex', alignItems: 'center', gap: 3, background: 'none', border: 'none', cursor: 'pointer', padding: 0, flexShrink: 0 }}>
              <Heart style={{ width: 11, height: 11, transition: 'all .15s' }} className={liked ? 'fill-rose-500 text-rose-500 scale-110' : 'text-gray-300'} />
              {likeCount > 0 && <span style={{ fontSize: 10, fontWeight: 500, color: liked ? '#f43f5e' : 'rgba(0,0,0,.3)' }}>{fmt(likeCount)}</span>}
            </button>
          </div>
        </div>
      )}
    </>
  );
};