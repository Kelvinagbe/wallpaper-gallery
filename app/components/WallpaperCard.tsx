'use client';

import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Heart, Download, Share2, Bookmark, Flag, MoreHorizontal } from 'lucide-react';
import { toggleLike, isWallpaperLiked, toggleSave, isWallpaperSaved } from '@/lib/stores/userStore';
import { useAuth } from '@/app/components/AuthProvider';
import { saveFeedScroll } from '@/lib/feedCache';
import { startLoader } from '@/app/components/TopLoader';
import type { Wallpaper } from '../types';

// ── Placeholder colors ───────────────────────────────────────────
const COLORS = [
  { bg: '#e8eaf0', shimmer: '#d0d4e8' },
  { bg: '#ede8f0', shimmer: '#d8cce8' },
  { bg: '#e8f0ea', shimmer: '#cce0d0' },
  { bg: '#f0e8e8', shimmer: '#e8cccc' },
  { bg: '#f0ede8', shimmer: '#e8dcc8' },
];

// ── Image cache ──────────────────────────────────────────────────
const imgCache = (() => {
  const mem = new Set<string>();
  try { (JSON.parse(sessionStorage.getItem('__wpcache__') || '[]') as string[]).forEach(u => mem.add(u)); } catch {}
  return {
    has: (u: string) => mem.has(u),
    add: (u: string) => {
      mem.add(u);
      try { sessionStorage.setItem('__wpcache__', JSON.stringify([...mem].slice(-300))); } catch {}
    },
  };
})();

// ── Bottom sheet ─────────────────────────────────────────────────
const BottomSheet = ({ isOpen, onClose, wp, saved, onSave, onDownload, onShare }: {
  isOpen: boolean; onClose: () => void; wp: Wallpaper; saved: boolean;
  onSave: () => void; onDownload: () => void; onShare: () => void;
}) => {
  if (!isOpen) return null;

  const items = [
    { icon: Bookmark, label: saved ? 'Remove from Saved' : 'Save to Collection', onClick: onSave,     iconBg: 'bg-blue-50',  iconColor: saved ? 'text-blue-500 fill-blue-500' : 'text-gray-600' },
    { icon: Download, label: 'Download Wallpaper',                                onClick: onDownload, iconBg: 'bg-gray-100', iconColor: 'text-gray-600' },
    { icon: Share2,   label: 'Share Wallpaper',                                   onClick: onShare,    iconBg: 'bg-gray-100', iconColor: 'text-gray-600' },
    { icon: Flag,     label: 'Report Content', onClick: () => { alert('Report coming soon'); onClose(); }, iconBg: 'bg-red-50', iconColor: 'text-red-500', labelColor: 'text-red-500', border: true },
  ];

  return createPortal(
    <>
      <div className="fixed inset-0 bg-black/20 z-[100]" style={{ animation: 'fadeIn .2s ease' }} onClick={onClose} />
      <div className="fixed bottom-0 left-0 right-0 z-[101]" style={{ animation: 'slideUp .3s cubic-bezier(.34,1.56,.64,1)' }}>
        <div className="bg-white rounded-t-3xl shadow-2xl max-w-2xl mx-auto px-4 pb-8">
          <div className="flex justify-center pt-3 pb-4"><div className="w-10 h-1 bg-gray-200 rounded-full" /></div>
          <p className="text-xs font-medium text-gray-400 uppercase tracking-widest mb-1 px-1">Options</p>
          <h3 className="text-base font-semibold text-gray-900 mb-5 truncate px-1">{wp.title}</h3>
          <div className="flex flex-col gap-0.5">
            {items.map((b, i) => (
              <button key={i} onClick={b.onClick}
                className={`w-full flex items-center gap-4 px-3 py-3.5 hover:bg-gray-50 active:bg-gray-100 rounded-2xl transition-colors active:scale-[0.98] ${b.border ? 'mt-3 border-t border-gray-100' : ''}`}>
                <div className={`w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 ${b.iconBg}`}>
                  <b.icon className={`w-4.5 h-4.5 ${b.iconColor}`} strokeWidth={1.8} />
                </div>
                <span className={`text-[15px] font-medium ${b.labelColor ?? 'text-gray-800'}`}>{b.label}</span>
              </button>
            ))}
          </div>
          <button onClick={onClose} className="w-full mt-5 py-3.5 bg-gray-100 hover:bg-gray-200 rounded-2xl text-[15px] font-semibold text-gray-700 transition-colors">
            Cancel
          </button>
        </div>
      </div>
      <style>{`@keyframes fadeIn{from{opacity:0}to{opacity:1}}@keyframes slideUp{from{transform:translateY(100%)}to{transform:translateY(0)}}`}</style>
    </>,
    document.body,
  );
};

// ── WallpaperCard ────────────────────────────────────────────────
type WallpaperCardProps = { wp: Wallpaper; onClick?: () => void; priority?: boolean; placeholderIndex?: number; };

export const WallpaperCard = ({ wp, onClick, priority = false, placeholderIndex = 0 }: WallpaperCardProps) => {
  const { user }  = useAuth();
  const router    = useRouter();
  const isMounted = useRef(true);
  const imgSrc    = wp.thumbnail || wp.url;
  const ph        = COLORS[placeholderIndex % COLORS.length];
  const fmt       = (n: number) => n >= 1_000_000 ? `${(n/1_000_000).toFixed(1)}M` : n >= 1_000 ? `${(n/1_000).toFixed(1)}k` : String(n);

  useEffect(() => () => { isMounted.current = false; }, []);

  const [state, setState] = useState({ loaded: imgCache.has(imgSrc), liked: false, saved: false, showMenu: false });
  const [likeCount, setLikeCount] = useState(wp.likes || 0);
  const set = (patch: Partial<typeof state>) => setState(s => ({ ...s, ...patch }));

  useEffect(() => {
    if (!user) return;
    Promise.all([isWallpaperLiked(wp.id, user.id), isWallpaperSaved(wp.id, user.id)])
      .then(([liked, saved]) => { if (isMounted.current) set({ liked, saved }); });
  }, [wp.id, user?.id]);

  // ── Handlers ─────────────────────────────────────────────────
  const handleCardClick = () => {
    if (onClick) return onClick();
    saveFeedScroll(); startLoader();
    router.push(`/details/${wp.id}`);
  };

  const handleUploaderClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (wp.userId) { startLoader(); router.push(`/profile/${wp.userId}`); }
  };

  const handleLike = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) return alert('Please login to like wallpapers');
    const newLiked = !state.liked;
    set({ liked: newLiked });
    setLikeCount(c => newLiked ? c + 1 : Math.max(0, c - 1));
    navigator.vibrate?.(50);
    try { await toggleLike(wp.id); }
    catch { if (isMounted.current) { set({ liked: !newLiked }); setLikeCount(c => newLiked ? Math.max(0, c - 1) : c + 1); } }
  };

  const handleSave = async () => {
    if (!user) return alert('Please login to save wallpapers');
    const newSaved = !state.saved;
    set({ saved: newSaved, showMenu: false });
    navigator.vibrate?.(50);
    try { await toggleSave(wp.id); }
    catch { if (isMounted.current) set({ saved: !newSaved }); }
  };

  const handleDownload = async () => {
    navigator.vibrate?.(50);
    const filename = `${wp.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.jpg`;
    try {
      const blob = await fetch(wp.url, { mode: 'cors' }).then(r => r.blob());
      const url  = URL.createObjectURL(blob);
      const a    = Object.assign(document.createElement('a'), { href: url, download: filename });
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      const a = Object.assign(document.createElement('a'), { href: wp.url, download: filename, target: '_blank' });
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
    }
    set({ showMenu: false });
  };

  const handleShare = async () => {
    const url = `${window.location.origin}/details/${wp.id}`;
    if (navigator.share) { try { await navigator.share({ title: wp.title, url }); } catch {} }
    else { await navigator.clipboard.writeText(url); alert('Link copied!'); }
    set({ showMenu: false });
  };

  // ── Render ───────────────────────────────────────────────────
  return (
    <>
      <div
        className="relative w-full rounded-xl overflow-hidden cursor-pointer"
        style={{ aspectRatio: '9/16', background: ph.bg }}
        onClick={handleCardClick}
      >
        {/* Shimmer */}
        {!state.loaded && (
          <div className="absolute inset-0 z-[1]">
            <div className="absolute inset-0" style={{ background: `linear-gradient(105deg,transparent 40%,${ph.shimmer}99 50%,transparent 60%)`, backgroundSize: '200% 100%', animation: 'shimmerSweep 1.8s ease-in-out infinite' }} />
          </div>
        )}

        {/* Image */}
        <Image
          src={imgSrc} alt={wp.title} fill
          sizes="(max-width:480px) 50vw,(max-width:768px) 33vw,(max-width:1024px) 25vw,20vw"
          onLoad={() => { imgCache.add(imgSrc); if (isMounted.current) set({ loaded: true }); }}
          className="object-cover z-[2]"
          priority={priority} loading={priority ? 'eager' : 'lazy'}
          style={{ opacity: state.loaded ? 1 : 0, transition: 'opacity 0.4s ease' }}
        />

        {/* Gradient overlay */}
        {state.loaded && (
          <div className="absolute inset-0 z-[3]" style={{ background: 'linear-gradient(to top,rgba(0,0,0,0.88) 0%,rgba(0,0,0,0.2) 40%,transparent 65%)' }} />
        )}

        {/* Bottom info */}
        {state.loaded && (
          <div className="absolute bottom-0 left-0 right-0 z-[4] px-2 pb-2.5 pt-6">

            {/* Uploader — uses uploadedBy / userAvatar / userId / verified from Wallpaper type */}
            {wp.uploadedBy && (
              <button
                onClick={handleUploaderClick}
                className="flex items-center gap-1.5 mb-1.5 w-full"
                aria-label={`View ${wp.uploadedBy}'s profile`}
              >
                {wp.userAvatar ? (
                  <img
                    src={wp.userAvatar}
                    alt={wp.uploadedBy}
                    className="w-4 h-4 rounded-full object-cover flex-shrink-0"
                    style={{ border: '1px solid rgba(255,255,255,0.25)' }}
                  />
                ) : (
                  <div
                    className="w-4 h-4 rounded-full flex-shrink-0 flex items-center justify-center text-white"
                    style={{ fontSize: 7, fontWeight: 800, background: 'rgba(255,255,255,0.25)', border: '1px solid rgba(255,255,255,0.3)' }}
                  >
                    {wp.uploadedBy[0]?.toUpperCase()}
                  </div>
                )}
                <span className="text-[9px] font-medium text-white/55 truncate leading-none">
                  @{wp.uploadedBy}
                </span>
                {wp.verified && (
                  <svg width="8" height="8" viewBox="0 0 20 20" fill="none" className="flex-shrink-0">
                    <circle cx="10" cy="10" r="10" fill="#1877F2"/>
                    <path d="M6.5 10.2L8.8 12.5L13.5 7.5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                )}
              </button>
            )}

            {/* Title */}
            <p className="text-white text-[11px] font-medium leading-tight line-clamp-1 mb-1.5">{wp.title}</p>

            {/* Like */}
            <div className="flex items-center justify-end">
              <button aria-label="Like" onClick={handleLike} className="flex items-center gap-1">
                <Heart className={`w-3.5 h-3.5 transition-all ${state.liked ? 'fill-rose-500 text-rose-500 scale-110' : 'text-white/60'}`} />
                {likeCount > 0 && (
                  <span className={`text-[10px] font-medium ${state.liked ? 'text-rose-400' : 'text-white/50'}`}>{fmt(likeCount)}</span>
                )}
              </button>
            </div>
          </div>
        )}

        {/* More options */}
        {state.loaded && (
          <button
            aria-label="More options"
            onClick={e => { e.stopPropagation(); set({ showMenu: true }); }}
            className="absolute top-2 right-2 z-[5] p-1.5 rounded-full bg-white/20 backdrop-blur-sm hover:bg-white/30 transition-colors"
          >
            <MoreHorizontal className="w-3.5 h-3.5 text-white" />
          </button>
        )}
      </div>

      <BottomSheet
        isOpen={state.showMenu} onClose={() => set({ showMenu: false })}
        wp={wp} saved={state.saved} onSave={handleSave} onDownload={handleDownload} onShare={handleShare}
      />

      <style>{`@keyframes shimmerSweep{0%{background-position:-200% 0}100%{background-position:200% 0}}`}</style>
    </>
  );
};
