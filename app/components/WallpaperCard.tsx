'use client';

import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Heart, Download, Share2, Bookmark, Flag, MoreHorizontal } from 'lucide-react';
import { VerifiedBadge } from './VerifiedBadge';
import { toggleLike, isWallpaperLiked, toggleSave, isWallpaperSaved } from '@/lib/stores/userStore';
import { useAuth } from '@/app/components/AuthProvider';
import { saveFeedScroll } from '@/lib/feedCache';
import type { Wallpaper } from '../types';

const PLACEHOLDER_COLORS = [
  { bg: '#1a1a2e', shimmer: '#16213e' },
  { bg: '#1e1a2e', shimmer: '#2d1b4e' },
  { bg: '#1a2e1e', shimmer: '#1b3a20' },
  { bg: '#2e1a1a', shimmer: '#4e1b1b' },
  { bg: '#2e2a1a', shimmer: '#4e3d1b' },
];

// Image cache
const imgCache = (() => {
  const mem = new Set<string>();
  try {
    const saved = sessionStorage.getItem('__wpcache__');
    if (saved) (JSON.parse(saved) as string[]).forEach(u => mem.add(u));
  } catch { }
  return {
    has: (url: string) => mem.has(url),
    add: (url: string) => {
      mem.add(url);
      try {
        sessionStorage.setItem('__wpcache__', JSON.stringify(Array.from(mem).slice(-300)));
      } catch { }
    },
  };
})();

// Nav loader singleton
let _setNavVisible: ((v: boolean) => void) | null = null;
let _navLoaderMounted = false;
export const showNavLoader = () => _setNavVisible?.(true);
export const hideNavLoader = () => _setNavVisible?.(false);

const NavLoaderSingleton = () => {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    _setNavVisible = setVisible;
    return () => { _setNavVisible = null; };
  }, []);
  if (!visible) return null;
  return createPortal(
    <>
      <style>{`
        @keyframes dotBounce{0%,80%,100%{transform:scale(.6);opacity:.4}40%{transform:scale(1);opacity:1}}
        .nav-dot{width:10px;height:10px;border-radius:50%;background:#fff;animation:dotBounce 1.2s ease-in-out infinite}
        .nav-dot:nth-child(2){animation-delay:.2s}.nav-dot:nth-child(3){animation-delay:.4s}
      `}</style>
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[99998]" />
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[99999] flex items-center gap-2.5 pointer-events-none">
        <div className="nav-dot" /><div className="nav-dot" /><div className="nav-dot" />
      </div>
    </>,
    document.body,
  );
};

// Bottom sheet
const BottomSheet = ({ isOpen, onClose, wp, saved, onSave, onDownload, onShare }: {
  isOpen: boolean; onClose: () => void; wp: Wallpaper; saved: boolean;
  onSave: () => void; onDownload: () => void; onShare: () => void;
}) => {
  if (!isOpen) return null;
  const items = [
    { icon: Bookmark, label: saved ? 'Remove from Saved' : 'Save to Collection', onClick: onSave, color: saved ? 'blue' : '' },
    { icon: Download, label: 'Download Wallpaper', onClick: onDownload },
    { icon: Share2, label: 'Share Wallpaper', onClick: onShare },
    { icon: Flag, label: 'Report Content', onClick: () => { alert('Report coming soon'); onClose(); }, color: 'red', border: true },
  ];
  return createPortal(
    <>
      <div className="fixed inset-0 bg-black/60 backdrop-blur-lg z-[100]"
        style={{ animation: 'fadeIn .2s' }} onClick={onClose} />
      <div className="fixed bottom-0 left-0 right-0 z-[101]"
        style={{ animation: 'slideUp .3s cubic-bezier(.34,1.56,.64,1)' }}>
        <div className="bg-zinc-900 rounded-t-3xl border-t border-white/10 shadow-2xl max-w-2xl mx-auto px-4 pb-6">
          <div className="flex justify-center pt-3 pb-2">
            <div className="w-12 h-1.5 bg-white/20 rounded-full" />
          </div>
          <h3 className="text-lg font-semibold text-white mb-4 truncate">{wp.title}</h3>
          <div className="space-y-1">
            {items.map((b, i) => (
              <button key={i} onClick={b.onClick}
                className={`w-full flex items-center gap-4 px-4 py-4 hover:bg-white/5 rounded-xl transition-colors active:scale-[0.98] ${b.border ? 'border-t border-white/5 mt-2' : ''}`}>
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${b.color === 'red' ? 'bg-red-500/10' : 'bg-white/10'}`}>
                  <b.icon className={`w-5 h-5 ${b.color === 'blue' ? 'fill-blue-400 text-blue-400' : b.color === 'red' ? 'text-red-400' : 'text-white/80'}`} />
                </div>
                <span className={`text-base font-medium ${b.color === 'red' ? 'text-red-400' : 'text-white'}`}>{b.label}</span>
              </button>
            ))}
          </div>
          <button onClick={onClose}
            className="w-full mt-4 py-3 bg-white/5 hover:bg-white/10 rounded-xl font-medium text-white transition-colors">
            Cancel
          </button>
        </div>
      </div>
      <style>{`@keyframes fadeIn{from{opacity:0}to{opacity:1}}@keyframes slideUp{from{transform:translateY(100%)}to{transform:translateY(0)}}`}</style>
    </>,
    document.body,
  );
};

// ── WallpaperCard ─────────────────────────────────────────────────────────────
type WallpaperCardProps = {
  wp: Wallpaper;
  onClick?: () => void;
  priority?: boolean;
  placeholderIndex?: number;
};

export const WallpaperCard = ({ wp, onClick, priority = false, placeholderIndex = 0 }: WallpaperCardProps) => {
  const { user } = useAuth();
  const router = useRouter();
  const isMounted = useRef(true);
  const isOwner = useRef(false);
  const imgSrc = wp.thumbnail || wp.url;

  useEffect(() => () => { isMounted.current = false; }, []);
  useEffect(() => {
    if (!_navLoaderMounted) { _navLoaderMounted = true; isOwner.current = true; }
    return () => { if (isOwner.current) _navLoaderMounted = false; };
  }, []);

  const placeholder = PLACEHOLDER_COLORS[placeholderIndex % PLACEHOLDER_COLORS.length];

  const [state, setState] = useState({
    loaded: imgCache.has(imgSrc),
    liked: false,
    saved: false,
    showMenu: false,
  });
  const [likeCount, setLikeCount] = useState(wp.likes || 0);

  useEffect(() => {
    if (!user) return;
    Promise.all([isWallpaperLiked(wp.id, user.id), isWallpaperSaved(wp.id, user.id)])
      .then(([liked, saved]) => { if (isMounted.current) setState(s => ({ ...s, liked, saved })); });
  }, [wp.id, user?.id]);

  const handleLike = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) return alert('Please login to like wallpapers');
    const newLiked = !state.liked;
    setState(s => ({ ...s, liked: newLiked }));
    setLikeCount(c => newLiked ? c + 1 : Math.max(0, c - 1));
    navigator.vibrate?.(50);
    try { await toggleLike(wp.id); }
    catch {
      if (isMounted.current) {
        setState(s => ({ ...s, liked: !newLiked }));
        setLikeCount(c => newLiked ? Math.max(0, c - 1) : c + 1);
      }
    }
  };

  const handleSave = async () => {
    if (!user) return alert('Please login to save wallpapers');
    const newSaved = !state.saved;
    setState(s => ({ ...s, saved: newSaved, showMenu: false }));
    navigator.vibrate?.(50);
    try { await toggleSave(wp.id); }
    catch { if (isMounted.current) setState(s => ({ ...s, saved: !newSaved })); }
  };

  const handleDownload = async () => {
    navigator.vibrate?.(50);
    const filename = `${wp.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.jpg`;
    try {
      const blob = await fetch(wp.url, { mode: 'cors' }).then(r => r.blob());
      const url = URL.createObjectURL(blob);
      const a = Object.assign(document.createElement('a'), { href: url, download: filename });
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      const a = Object.assign(document.createElement('a'), { href: wp.url, download: filename, target: '_blank' });
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
    }
    setState(s => ({ ...s, showMenu: false }));
  };

  const handleShare = async () => {
    if (navigator.share) {
      try { await navigator.share({ title: wp.title, url: `${window.location.origin}/details/${wp.id}` }); } catch { }
    } else {
      await navigator.clipboard.writeText(`${window.location.origin}/details/${wp.id}`);
      alert('Link copied!');
    }
    setState(s => ({ ...s, showMenu: false }));
  };

  const handleCardClick = () => {
    if (onClick) { onClick(); return; }
    saveFeedScroll();
    showNavLoader();
    setTimeout(() => router.push(`/details/${wp.id}`), 80);
  };

  const fmt = (n: number) =>
    n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M`
    : n >= 1_000 ? `${(n / 1_000).toFixed(1)}k`
    : String(n);

  return (
    <>
      {isOwner.current && <NavLoaderSingleton />}

      <div
        className="relative w-full rounded-xl overflow-hidden cursor-pointer bg-black"
        style={{ aspectRatio: '9/16' }}
        onClick={handleCardClick}
      >
        {/* Shimmer placeholder */}
        {!state.loaded && (
          <div className="absolute inset-0 z-[1]" style={{ background: placeholder.bg }}>
            <div className="absolute inset-0" style={{
              background: `linear-gradient(105deg, transparent 40%, ${placeholder.shimmer}99 50%, transparent 60%)`,
              backgroundSize: '200% 100%',
              animation: 'shimmerSweep 1.8s ease-in-out infinite',
            }} />
          </div>
        )}

        {/* Image */}
        <Image
          src={imgSrc}
          alt={wp.title}
          fill
          sizes="(max-width:480px) 50vw, (max-width:768px) 33vw, (max-width:1024px) 25vw, 20vw"
          onLoad={() => {
            imgCache.add(imgSrc);
            if (isMounted.current) setState(s => ({ ...s, loaded: true }));
          }}
          className="object-cover z-[2]"
          priority={priority}
          loading={priority ? 'eager' : 'lazy'}
          style={{ opacity: state.loaded ? 1 : 0, transition: state.loaded ? 'opacity 0.3s ease' : 'none' }}
        />

        {/* Gradient overlay */}
        <div className="absolute inset-0 z-[3]"
          style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.88) 0%, rgba(0,0,0,0.2) 40%, transparent 65%)' }} />

        {/* Bottom info */}
        <div className="absolute bottom-0 left-0 right-0 z-[4] px-2 pb-2.5 pt-6">
          <p className="text-white text-[11px] font-medium leading-tight line-clamp-1 mb-1.5">
            {wp.title}
          </p>
          <div className="flex items-center justify-between">
            {/* Uploader */}
            <div className="flex items-center gap-1 min-w-0 flex-1">
              <div className="relative w-4 h-4 rounded-full flex-shrink-0 overflow-hidden border border-white/20 bg-zinc-800">
                <Image src={wp.userAvatar} alt={wp.uploadedBy} fill className="object-cover" sizes="16px" />
              </div>
              <span className="text-[10px] text-white/70 truncate">{wp.uploadedBy}</span>
              {wp.verified && <VerifiedBadge size="sm" />}
            </div>

            {/* Like button */}
            <button
              aria-label="Like"
              onClick={handleLike}
              className="flex items-center gap-1 flex-shrink-0 ml-1"
            >
              <Heart className={`w-3.5 h-3.5 transition-all ${state.liked ? 'fill-rose-500 text-rose-500 scale-110' : 'text-white/60'}`} />
              {likeCount > 0 && (
                <span className={`text-[10px] font-medium ${state.liked ? 'text-rose-400' : 'text-white/50'}`}>
                  {fmt(likeCount)}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* More options button — top right */}
        <button
          aria-label="More options"
          onClick={e => { e.stopPropagation(); setState(s => ({ ...s, showMenu: true })); }}
          className="absolute top-2 right-2 z-[5] p-1.5 rounded-full bg-black/30 backdrop-blur-sm hover:bg-black/50 transition-colors"
        >
          <MoreHorizontal className="w-3.5 h-3.5 text-white/80" />
        </button>
      </div>

      <BottomSheet
        isOpen={state.showMenu}
        onClose={() => setState(s => ({ ...s, showMenu: false }))}
        wp={wp} saved={state.saved}
        onSave={handleSave} onDownload={handleDownload} onShare={handleShare}
      />

      <style>{`@keyframes shimmerSweep{0%{background-position:-200% 0}100%{background-position:200% 0}}`}</style>
    </>
  );
};