'use client';

import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Heart, Download, Eye, MoreHorizontal, Share2, Bookmark, Flag } from 'lucide-react';
import { VerifiedBadge } from './VerifiedBadge';
import { toggleLike, isWallpaperLiked, toggleSave, isWallpaperSaved } from '@/lib/stores/userStore';
import { useAuth } from '@/app/components/AuthProvider';
import type { Wallpaper } from '../types';

// ─── Global image cache (persists across navigations in same session) ─────────
const imageCache = new Set<string>();

// ─── Singleton NavLoader ───────────────────────────────────────────────────────
// Only ONE instance lives in the DOM (mounted by the first card that renders).
// All cards share it via the module-level setter.
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
        @keyframes dotBounce {
          0%,80%,100% { transform:scale(0.6); opacity:0.4 }
          40%          { transform:scale(1);   opacity:1   }
        }
        .nav-dot {
          width:10px; height:10px; border-radius:50%;
          background:#fff;
          animation:dotBounce 1.2s ease-in-out infinite;
        }
        .nav-dot:nth-child(1){animation-delay:0s}
        .nav-dot:nth-child(2){animation-delay:.2s}
        .nav-dot:nth-child(3){animation-delay:.4s}
      `}</style>
      <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)',
        backdropFilter:'blur(2px)', zIndex:99998 }} />
      <div style={{ position:'fixed', top:'50%', left:'50%',
        transform:'translate(-50%,-50%)', zIndex:99999,
        display:'flex', alignItems:'center', gap:10, pointerEvents:'none' }}>
        <div className="nav-dot" /><div className="nav-dot" /><div className="nav-dot" />
      </div>
    </>,
    document.body
  );
};

// ─── Bottom sheet ─────────────────────────────────────────────────────────────
const BottomSheet = ({ isOpen, onClose, wp, saved, onSave, onDownload, onShare }: any) => {
  if (!isOpen) return null;
  return createPortal(
    <>
      <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.6)',
        backdropFilter:'blur(8px)', zIndex:100, animation:'fadeIn 0.2s' }}
        onClick={onClose} />
      <div style={{ position:'fixed', bottom:0, left:0, right:0, zIndex:101,
        animation:'slideUp 0.3s cubic-bezier(0.34,1.56,0.64,1)' }}>
        <div className="bg-zinc-900 rounded-t-3xl border-t border-white/10 shadow-2xl max-w-2xl mx-auto">
          <div className="flex justify-center pt-3 pb-2">
            <div className="w-12 h-1.5 bg-white/20 rounded-full" />
          </div>
          <div className="px-4 pb-6">
            <h3 className="text-lg font-semibold mb-4">{wp.title}</h3>
            <div className="space-y-1">
              {[
                { icon: Bookmark, label: saved ? 'Remove from Saved' : 'Save to Collection',
                  onClick: onSave, color: saved ? 'blue' : 'white' },
                { icon: Download, label: 'Download Wallpaper', onClick: onDownload },
                { icon: Share2,   label: 'Share Wallpaper',   onClick: onShare  },
                { icon: Flag, label: 'Report Content',
                  onClick: () => { alert('Report coming soon'); onClose(); },
                  color: 'red', border: true },
              ].map((b, i) => (
                <button key={i} onClick={b.onClick}
                  className={`w-full flex items-center gap-4 px-4 py-4 hover:bg-white/5 rounded-xl transition-colors active:scale-[0.98] ${b.border ? 'border-t border-white/5 mt-2' : ''}`}>
                  <div className={`w-10 h-10 rounded-full ${b.color === 'red' ? 'bg-red-500/10' : 'bg-white/10'} flex items-center justify-center`}>
                    <b.icon className={`w-5 h-5 ${b.color === 'blue' ? 'fill-blue-400 text-blue-400' : b.color === 'red' ? 'text-red-400' : 'text-white/80'}`} />
                  </div>
                  <span className={`text-base font-medium ${b.color === 'red' ? 'text-red-400' : ''}`}>{b.label}</span>
                </button>
              ))}
            </div>
            <button onClick={onClose} className="w-full mt-4 py-3 bg-white/5 hover:bg-white/10 rounded-xl font-medium transition-colors">
              Cancel
            </button>
          </div>
        </div>
      </div>
      <style>{`
        @keyframes fadeIn  { from{opacity:0} to{opacity:1} }
        @keyframes slideUp { from{transform:translateY(100%)} to{transform:translateY(0)} }
      `}</style>
    </>,
    document.body
  );
};

// ─── WallpaperCard ────────────────────────────────────────────────────────────
type WallpaperCardProps = {
  wp: Wallpaper;
  onClick?: () => void;
  /** Pass true for the first ~6 cards so Next.js sets priority+fetchpriority=high */
  priority?: boolean;
};

export const WallpaperCard = ({ wp, onClick, priority = false }: WallpaperCardProps) => {
  const { user } = useAuth();
  const router = useRouter();
  const isMountedRef = useRef(true);

  // Mount singleton loader exactly once across all cards
  const isLoaderOwner = useRef(false);
  useEffect(() => {
    if (!_navLoaderMounted) {
      _navLoaderMounted = true;
      isLoaderOwner.current = true;
    }
    return () => {
      isMountedRef.current = false;
      if (isLoaderOwner.current) _navLoaderMounted = false;
    };
  }, []);

  const [state, setState] = useState({
    // ✅ Skip skeleton immediately if already cached
    loaded:   imageCache.has(wp.url),
    liked:    false,
    saved:    false,
    showMenu: false,
  });

  const [counts, setCounts] = useState({ likes: wp.likes || 0, views: wp.views || 0 });

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [liked, saved] = await Promise.all([
        isWallpaperLiked(wp.id, user.id),
        isWallpaperSaved(wp.id, user.id),
      ]);
      if (isMountedRef.current) setState(s => ({ ...s, liked, saved }));
    })();
  }, [wp.id, user]);

  const handleLike = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) return alert('Please login to like wallpapers');
    const newLiked = !state.liked;
    setState(s => ({ ...s, liked: newLiked }));
    setCounts(c => ({ ...c, likes: newLiked ? c.likes + 1 : Math.max(0, c.likes - 1) }));
    navigator.vibrate?.(50);
    try {
      await toggleLike(wp.id);
    } catch {
      if (isMountedRef.current) {
        setState(s => ({ ...s, liked: !newLiked }));
        setCounts(c => ({ ...c, likes: newLiked ? Math.max(0, c.likes - 1) : c.likes + 1 }));
      }
    }
  };

  const handleSave = async () => {
    if (!user) return alert('Please login to save wallpapers');
    const newSaved = !state.saved;
    setState(s => ({ ...s, saved: newSaved, showMenu: false }));
    navigator.vibrate?.(50);
    try {
      await toggleSave(wp.id);
    } catch {
      if (isMountedRef.current) setState(s => ({ ...s, saved: !newSaved }));
    }
  };

  const handleDownload = async () => {
    navigator.vibrate?.(50);
    try {
      const res  = await fetch(wp.url, { mode: 'cors' });
      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${wp.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch {
      const link = document.createElement('a');
      link.href = wp.url;
      link.download = `${wp.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.jpg`;
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
    setState(s => ({ ...s, showMenu: false }));
  };

  const handleShare = async () => {
    if (navigator.share) {
      try { await navigator.share({ title: wp.title, text: `Check out "${wp.title}" on Gallery`, url: window.location.href }); } catch { }
    } else {
      navigator.clipboard.writeText(window.location.href);
      alert('Link copied!');
    }
    setState(s => ({ ...s, showMenu: false }));
  };

  const handleCardClick = () => {
    if (onClick) { onClick(); return; }
    showNavLoader();
    // 80 ms gives the loader one paint frame before the heavy route transition
    setTimeout(() => router.push(`/details/${wp.id}`), 80);
  };

  const handleImageLoad = () => {
    imageCache.add(wp.url);
    // ✅ Each card resolves its own skeleton independently — no waiting for others
    if (isMountedRef.current) setState(s => ({ ...s, loaded: true }));
  };

  const fmt = (n: number) =>
    n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M` :
    n >= 1_000     ? `${(n / 1_000).toFixed(1)}k`      : n.toString();

  return (
    <>
      {/* Singleton: only the owner card renders this portal */}
      {isLoaderOwner.current && <NavLoaderSingleton />}

      <div className="relative w-full">
        <div
          className="card group relative rounded-xl overflow-hidden cursor-pointer transition-opacity hover:opacity-95"
          onClick={handleCardClick}
        >
          <div className="relative w-full" style={{ paddingBottom: '125%' }}>
            {/* ✅ Skeleton fades out per-card as soon as THIS image loads */}
            {!state.loaded && (
              <div className="absolute inset-0 bg-zinc-900 rounded-xl animate-pulse"
                style={{ transition: 'opacity 0.3s', opacity: state.loaded ? 0 : 1 }} />
            )}

            <Image
              src={wp.url}
              alt={wp.title}
              fill
              sizes="(max-width:640px) 50vw, (max-width:1024px) 33vw, (max-width:1536px) 25vw, 20vw"
              onLoad={handleImageLoad}
              className="object-cover"
              // ✅ Above-fold cards load eagerly with high fetch priority
              priority={priority}
              loading={priority ? 'eager' : 'lazy'}
              style={{ opacity: state.loaded ? 1 : 0, transition: 'opacity 0.25s ease' }}
            />
          </div>

          {/* Hover overlay */}
          <div style={{ position:'absolute', inset:0,
            background:'linear-gradient(to top,rgba(0,0,0,0.8),transparent,transparent)',
            opacity:0, transition:'opacity 0.2s' }}
            className="group-hover:opacity-100">
            <div style={{ position:'absolute', top:12, right:12 }} className="flex items-center gap-2">
              <button onClick={(e) => { e.stopPropagation(); handleLike(e); }}
                className={`p-2.5 rounded-full backdrop-blur-md transition-all hover:scale-110 active:scale-95 ${state.liked ? 'bg-rose-500 hover:bg-rose-600' : 'bg-black/50 hover:bg-black/70'}`}>
                <Heart className={`w-4 h-4 ${state.liked ? 'text-white fill-white' : 'text-white'}`} />
              </button>
              <button onClick={(e) => { e.stopPropagation(); handleDownload(); }}
                className="p-2.5 rounded-full bg-black/50 hover:bg-black/70 backdrop-blur-md transition-all hover:scale-110 active:scale-95">
                <Download className="w-4 h-4 text-white" />
              </button>
            </div>
          </div>

          {/* Bottom info bar */}
          <div style={{ position:'absolute', bottom:0, left:0, right:0,
            background:'linear-gradient(to top,rgba(0,0,0,0.95),rgba(0,0,0,0.8),transparent)',
            padding:'10px' }}>
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <h3 className="font-medium line-clamp-1 text-xs flex-1">{wp.title}</h3>
              <button onClick={(e) => { e.stopPropagation(); setState(s => ({ ...s, showMenu: true })); }}
                className="p-1.5 rounded-full hover:bg-white/10 transition-colors flex-shrink-0">
                <MoreHorizontal className="w-4 h-4 text-white/80" />
              </button>
            </div>
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 min-w-0 flex-1">
                <div className="relative w-5 h-5 rounded-full flex-shrink-0 border border-white/20 overflow-hidden bg-zinc-800">
                  <Image src={wp.userAvatar} alt={wp.uploadedBy} fill className="object-cover" sizes="20px" />
                </div>
                <span className="text-[10px] text-white/80 truncate font-medium">{wp.uploadedBy}</span>
                {wp.verified && <VerifiedBadge size="sm" />}
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {counts.likes > 0 && (
                  <div className="flex items-center gap-0.5">
                    <Heart className="w-3 h-3 text-rose-400 fill-rose-400" />
                    <span className="text-[10px] font-medium text-rose-400">{fmt(counts.likes)}</span>
                  </div>
                )}
                {counts.views > 0 && (
                  <div className="flex items-center gap-0.5">
                    <Eye className="w-3 h-3 text-white/60" />
                    <span className="text-[10px] font-medium text-white/60">{fmt(counts.views)}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <BottomSheet
        isOpen={state.showMenu}
        onClose={() => setState(s => ({ ...s, showMenu: false }))}
        wp={wp} saved={state.saved}
        onSave={handleSave}
        onDownload={handleDownload}
        onShare={handleShare}
      />
    </>
  );
};
