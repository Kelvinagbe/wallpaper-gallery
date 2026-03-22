'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Heart, Share2, Bookmark, Flag, MoreHorizontal, BookmarkCheck } from 'lucide-react';
import { toggleLike, isWallpaperLiked, toggleSave, isWallpaperSaved } from '@/lib/stores/userStore';
import { useAuth } from '@/app/components/AuthProvider';
import { saveFeedScroll } from '@/lib/feedCache';
import { startLoader } from '@/app/components/TopLoader';
import type { Wallpaper } from '../types';

/* ─── Placeholder palette ─── */
const COLORS = [
  { bg: '#e8eaf0', shimmer: '#d0d4e8' },
  { bg: '#ede8f0', shimmer: '#d8cce8' },
  { bg: '#e8f0ea', shimmer: '#cce0d0' },
  { bg: '#f0e8e8', shimmer: '#e8cccc' },
  { bg: '#f0ede8', shimmer: '#e8dcc8' },
];

/* ─── Tiny session-storage image cache ─── */
const imgCache = (() => {
  const mem = new Set<string>();
  try {
    (JSON.parse(sessionStorage.getItem('__wpcache__') || '[]') as string[]).forEach(u => mem.add(u));
  } catch {}
  return {
    has: (u: string) => mem.has(u),
    add: (u: string) => {
      mem.add(u);
      try { sessionStorage.setItem('__wpcache__', JSON.stringify([...mem].slice(-300))); } catch {}
    },
  };
})();

/* ════════════════════════════════════════
   BOTTOM SHEET
════════════════════════════════════════ */
const BottomSheet = ({
  isOpen, onClose, wp, saved, onSave, onShare,
}: {
  isOpen: boolean;
  onClose: () => void;
  wp: Wallpaper;
  saved: boolean;
  onSave: () => void;
  onShare: () => void;
}) => {
  const [visible, setVisible] = useState(false);
  const [animOut, setAnimOut] = useState(false);

  useEffect(() => {
    if (isOpen) { setAnimOut(false); setVisible(true); }
    else if (visible) {
      setAnimOut(true);
      const t = setTimeout(() => setVisible(false), 280);
      return () => clearTimeout(t);
    }
  }, [isOpen]);

  if (!visible) return null;

  const close = () => {
    setAnimOut(true);
    setTimeout(onClose, 280);
  };

  const items = [
    {
      icon: saved ? BookmarkCheck : Bookmark,
      label: saved ? 'Saved' : 'Save',
      sub: saved ? 'Remove from your collection' : 'Add to your collection',
      onClick: onSave,
      accent: saved,
    },
    {
      icon: Share2,
      label: 'Share',
      sub: 'Send this wallpaper to someone',
      onClick: onShare,
      accent: false,
    },
    {
      icon: Flag,
      label: 'Report',
      sub: 'Flag inappropriate content',
      onClick: () => { alert('Report coming soon'); close(); },
      danger: true,
    },
  ];

  return createPortal(
    <>
      {/* Backdrop */}
      <div
        onClick={close}
        style={{
          position: 'fixed', inset: 0,
          background: animOut ? 'rgba(0,0,0,0)' : 'rgba(0,0,0,0.35)',
          backdropFilter: animOut ? 'blur(0px)' : 'blur(2px)',
          zIndex: 100,
          transition: 'background 0.28s ease, backdrop-filter 0.28s ease',
        }}
      />

      {/* Sheet */}
      <div
        style={{
          position: 'fixed', bottom: 0, left: 0, right: 0,
          zIndex: 101,
          transform: animOut ? 'translateY(100%)' : 'translateY(0)',
          transition: animOut
            ? 'transform 0.28s cubic-bezier(0.4,0,1,1)'
            : 'transform 0.36s cubic-bezier(0.34,1.4,0.64,1)',
        }}
      >
        <div style={{
          background: '#fff',
          borderRadius: '24px 24px 0 0',
          maxWidth: 560,
          margin: '0 auto',
          padding: '0 0 calc(env(safe-area-inset-bottom) + 24px)',
          boxShadow: '0 -4px 40px rgba(0,0,0,0.1)',
        }}>

          {/* Drag handle */}
          <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 16px' }}>
            <div style={{ width: 36, height: 4, borderRadius: 99, background: '#e5e7eb' }} />
          </div>

          {/* Header */}
          <div style={{ padding: '0 20px 20px', borderBottom: '1px solid #f3f4f6' }}>
            <p style={{ fontSize: 11, fontWeight: 600, color: '#9ca3af', letterSpacing: '0.08em', textTransform: 'uppercase', margin: '0 0 4px' }}>
              Options
            </p>
            <p style={{ fontSize: 15, fontWeight: 600, color: '#111827', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {wp.title}
            </p>
          </div>

          {/* Action rows */}
          <div style={{ padding: '8px 12px' }}>
            {items.map((item, i) => (
              <button
                key={i}
                onClick={item.onClick}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: 14,
                  padding: '12px 10px', border: 'none', borderRadius: 14,
                  background: 'none', cursor: 'pointer', textAlign: 'left',
                  transition: 'background 0.15s',
                  marginTop: item.danger ? 4 : 0,
                  borderTop: item.danger ? '1px solid #f9fafb' : 'none',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = '#f9fafb')}
                onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                onTouchStart={e => (e.currentTarget.style.background = '#f3f4f6')}
                onTouchEnd={e => (e.currentTarget.style.background = 'none')}
              >
                {/* Icon bubble */}
                <div style={{
                  width: 42, height: 42, borderRadius: 12, flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: item.danger ? '#fff1f2' : item.accent ? '#eff6ff' : '#f3f4f6',
                }}>
                  <item.icon
                    size={18}
                    strokeWidth={1.8}
                    color={item.danger ? '#ef4444' : item.accent ? '#3b82f6' : '#374151'}
                    fill={item.accent ? '#3b82f6' : 'none'}
                  />
                </div>

                {/* Label + sub */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{
                    margin: 0, fontSize: 14, fontWeight: 600, lineHeight: 1.3,
                    color: item.danger ? '#ef4444' : '#111827',
                  }}>
                    {item.label}
                  </p>
                  <p style={{ margin: 0, fontSize: 12, color: '#9ca3af', lineHeight: 1.3, marginTop: 1 }}>
                    {item.sub}
                  </p>
                </div>
              </button>
            ))}
          </div>

          {/* Cancel */}
          <div style={{ padding: '4px 12px 0' }}>
            <button
              onClick={close}
              style={{
                width: '100%', padding: '14px', border: 'none', borderRadius: 14,
                background: '#f3f4f6', fontSize: 14, fontWeight: 600, color: '#374151',
                cursor: 'pointer', transition: 'background 0.15s',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = '#e5e7eb')}
              onMouseLeave={e => (e.currentTarget.style.background = '#f3f4f6')}
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </>,
    document.body,
  );
};


/* ════════════════════════════════════════
   WALLPAPER CARD
════════════════════════════════════════ */
type WallpaperCardProps = {
  wp: Wallpaper;
  onClick?: () => void;
  priority?: boolean;
  placeholderIndex?: number;
};

export const WallpaperCard = ({ wp, onClick, priority = false, placeholderIndex = 0 }: WallpaperCardProps) => {
  const { user }  = useAuth();
  const router    = useRouter();
  const isMounted = useRef(true);
  const imgSrc    = wp.thumbnail || wp.url;
  const ph        = COLORS[placeholderIndex % COLORS.length];
  const isPC      = wp.type === 'pc';
  const fmt       = (n: number) =>
    n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M`
    : n >= 1_000   ? `${(n / 1_000).toFixed(1)}k`
    : String(n);

  /* Long-press state */
  const longPressTimer  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const didLongPress    = useRef(false);

  useEffect(() => () => { isMounted.current = false; }, []);

  const [state, setState] = useState({
    loaded:   imgCache.has(imgSrc),
    liked:    false,
    saved:    false,
    showMenu: false,
  });
  const [likeCount, setLikeCount] = useState(wp.likes || 0);
  const set = (patch: Partial<typeof state>) => setState(s => ({ ...s, ...patch }));

  useEffect(() => {
    if (!user) return;
    Promise.all([isWallpaperLiked(wp.id, user.id), isWallpaperSaved(wp.id, user.id)])
      .then(([liked, saved]) => { if (isMounted.current) set({ liked, saved }); });
  }, [wp.id, user?.id]);

  /* ── Long-press handlers ── */
  const openMenu = useCallback(() => set({ showMenu: true }), []);

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    didLongPress.current = false;
    longPressTimer.current = setTimeout(() => {
      didLongPress.current = true;
      navigator.vibrate?.(40);
      openMenu();
    }, 500);
  }, [openMenu]);

  const onTouchEnd = useCallback(() => {
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
  }, []);

  const onTouchMove = useCallback(() => {
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
  }, []);

  /* Prevent browser context menu (right-click / long-press save on all platforms) */
  const preventContextMenu = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    return false;
  }, []);

  /* ── Navigation ── */
  const handleCardClick = () => {
    if (didLongPress.current) return; // swallow tap that ended a long-press
    if (onClick) return onClick();
    saveFeedScroll(); startLoader();
    router.push(`/details/${wp.id}`);
  };

  const handleUploaderClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (wp.userId) { startLoader(); router.push(`/user/${wp.userId}`); }
  };

  /* ── Like ── */
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

  /* ── Save ── */
  const handleSave = async () => {
    if (!user) return alert('Please login to save wallpapers');
    const newSaved = !state.saved;
    set({ saved: newSaved, showMenu: false });
    navigator.vibrate?.(50);
    try { await toggleSave(wp.id); }
    catch { if (isMounted.current) set({ saved: !newSaved }); }
  };

  /* ── Share ── */
  const handleShare = async () => {
    const url = `${window.location.origin}/details/${wp.id}`;
    if (navigator.share) { try { await navigator.share({ title: wp.title, url }); } catch {} }
    else { await navigator.clipboard.writeText(url); alert('Link copied!'); }
    set({ showMenu: false });
  };

  return (
    <>
      {/* ── Image ── */}
      <div
        className="relative w-full rounded-2xl overflow-hidden cursor-pointer select-none"
        style={{ aspectRatio: isPC ? '4/3' : '9/16', background: ph.bg, WebkitUserSelect: 'none', userSelect: 'none' }}
        onClick={handleCardClick}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        onTouchMove={onTouchMove}
        onContextMenu={preventContextMenu}
      >
        {/* Shimmer */}
        {!state.loaded && (
          <div className="absolute inset-0 z-[1]">
            <div
              className="absolute inset-0"
              style={{
                background: `linear-gradient(105deg, transparent 40%, ${ph.shimmer}99 50%, transparent 60%)`,
                backgroundSize: '200% 100%',
                animation: 'shimmerSweep 1.8s ease-in-out infinite',
              }}
            />
          </div>
        )}

        {/* Image — pointer-events none prevents drag-to-save */}
        <Image
          src={imgSrc}
          alt={wp.title}
          fill
          draggable={false}
          sizes={isPC
            ? '100vw'
            : '(max-width:480px) 50vw,(max-width:768px) 33vw,(max-width:1024px) 25vw,20vw'
          }
          onLoad={() => { imgCache.add(imgSrc); if (isMounted.current) set({ loaded: true }); }}
          className="object-cover z-[2]"
          priority={priority}
          loading={priority ? 'eager' : 'lazy'}
          style={{
            opacity: state.loaded ? 1 : 0,
            transition: 'opacity 0.4s ease',
            pointerEvents: 'none', // prevents drag / long-press default image save
            WebkitUserDrag: 'none',
          } as React.CSSProperties}
          onContextMenu={e => e.preventDefault()}
        />

        {/* Desktop badge */}
        {state.loaded && isPC && (
          <div
            className="absolute top-2 left-2 z-[5]"
            style={{
              padding: '2px 7px', borderRadius: 5,
              background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(6px)',
              fontSize: 9, fontWeight: 700, color: '#fff',
              letterSpacing: '0.06em', textTransform: 'uppercase',
            }}
          >
            Desktop
          </div>
        )}

        {/* More options */}
        {state.loaded && (
          <button
            aria-label="More options"
            onClick={e => { e.stopPropagation(); set({ showMenu: true }); }}
            className="absolute top-2 right-2 z-[5] p-1.5 rounded-full bg-black/30 backdrop-blur-sm"
          >
            <MoreHorizontal className="w-3.5 h-3.5 text-white" />
          </button>
        )}
      </div>

      {/* ── Info row ── */}
      {state.loaded && (
        <div style={{ padding: '6px 2px 0', display: 'flex', flexDirection: 'column', gap: 3 }}>
          <p style={{
            fontSize: 11, fontWeight: 600, color: '#0a0a0a', margin: 0,
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', lineHeight: 1.3,
          }}>
            {wp.title}
          </p>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 4 }}>
            {/* Uploader */}
            {wp.uploadedBy && (
              <button
                onClick={handleUploaderClick}
                style={{
                  display: 'flex', alignItems: 'center', gap: 4,
                  background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                  minWidth: 0, flex: 1,
                }}
                aria-label={`View ${wp.uploadedBy}'s profile`}
              >
                {wp.userAvatar && wp.userAvatar !== 'favicon.ico' ? (
                  <img
                    src={wp.userAvatar}
                    alt={wp.uploadedBy}
                    style={{ width: 14, height: 14, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
                  />
                ) : (
                  <div style={{
                    width: 14, height: 14, borderRadius: '50%',
                    background: 'rgba(0,0,0,0.1)', display: 'flex',
                    alignItems: 'center', justifyContent: 'center',
                    fontSize: 6, fontWeight: 800, color: 'rgba(0,0,0,0.5)', flexShrink: 0,
                  }}>
                    {wp.uploadedBy[0]?.toUpperCase()}
                  </div>
                )}
                <span style={{
                  fontSize: 10, color: 'rgba(0,0,0,0.4)', fontWeight: 500,
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  @{wp.uploadedBy}
                </span>
                {wp.verified && (
                  <svg width="9" height="9" viewBox="0 0 20 20" fill="none" style={{ flexShrink: 0 }}>
                    <circle cx="10" cy="10" r="10" fill="#1877F2"/>
                    <path d="M6.5 10.2L8.8 12.5L13.5 7.5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                )}
              </button>
            )}

            {/* Like */}
            <button
              aria-label="Like"
              onClick={handleLike}
              style={{
                display: 'flex', alignItems: 'center', gap: 3,
                background: 'none', border: 'none', cursor: 'pointer', padding: 0, flexShrink: 0,
              }}
            >
              <Heart
                style={{ width: 11, height: 11, transition: 'all .15s' }}
                className={state.liked ? 'fill-rose-500 text-rose-500 scale-110' : 'text-gray-300'}
              />
              {likeCount > 0 && (
                <span style={{
                  fontSize: 10, fontWeight: 500,
                  color: state.liked ? '#f43f5e' : 'rgba(0,0,0,0.3)',
                }}>
                  {fmt(likeCount)}
                </span>
              )}
            </button>
          </div>
        </div>
      )}

      <BottomSheet
        isOpen={state.showMenu}
        onClose={() => set({ showMenu: false })}
        wp={wp}
        saved={state.saved}
        onSave={handleSave}
        onShare={handleShare}
      />

      <style>{`
        @keyframes shimmerSweep {
          0%   { background-position: -200% 0 }
          100% { background-position:  200% 0 }
        }
        img { -webkit-user-drag: none; }
      `}</style>
    </>
  );
};
