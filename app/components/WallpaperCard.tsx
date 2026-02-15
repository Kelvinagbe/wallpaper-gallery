import { useState, useEffect, useRef } from 'react';
import { Heart, Download, Eye, MoreHorizontal, Share2, Bookmark, Flag } from 'lucide-react';
import { VerifiedBadge } from './VerifiedBadge';
import { toggleLike as toggleLikeAction, isWallpaperLiked, toggleSave } from '@/lib/stores/userStore';
import { useAuth } from '@/app/components/AuthProvider';
import type { Wallpaper } from '../types';

type WallpaperCardProps = {
  wp: Wallpaper;
  onClick: () => void;
};

export const WallpaperCard = ({ wp, onClick }: WallpaperCardProps) => {
  const { user } = useAuth();
  const cardRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const [inView, setInView] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [likeCount, setLikeCount] = useState(wp.likes || 0);
  const [viewCount] = useState(wp.views || 0);

  // Aggressive lazy loading
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setInView(true);
            observer.disconnect();
          }
        });
      },
      { 
        rootMargin: '300px',
        threshold: 0.01 
      }
    );

    if (cardRef.current) {
      observer.observe(cardRef.current);
    }

    return () => observer.disconnect();
  }, []);

  // Load like status
  useEffect(() => {
    if (!inView || !user) return;
    (async () => {
      const isLiked = await isWallpaperLiked(wp.id, user.id);
      setLiked(isLiked);
    })();
  }, [inView, wp.id, user]);

  const handleLike = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) return alert('Please login to like wallpapers');

    const newLikedState = !liked;
    setLiked(newLikedState);
    setLikeCount(prev => newLikedState ? prev + 1 : Math.max(0, prev - 1));
    if (navigator.vibrate) navigator.vibrate(50);

    try {
      await toggleLikeAction(wp.id);
    } catch (error) {
      setLiked(!newLikedState);
      setLikeCount(prev => newLikedState ? Math.max(0, prev - 1) : prev + 1);
    }
  };

  const handleSave = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) return alert('Please login to save wallpapers');

    const newSavedState = !saved;
    setSaved(newSavedState);
    if (navigator.vibrate) navigator.vibrate(50);

    try {
      await toggleSave(wp.id);
    } catch (error) {
      setSaved(!newSavedState);
    }
    setShowMenu(false);
  };

  const handleDownload = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (navigator.vibrate) navigator.vibrate(50);

    try {
      // Fetch the image as a blob
      const response = await fetch(wp.url, {
        mode: 'cors',
      });
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      
      // Create download link
      const link = document.createElement('a');
      link.href = url;
      link.download = `${wp.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.jpg`;
      link.style.display = 'none';
      
      document.body.appendChild(link);
      link.click();
      
      // Cleanup
      setTimeout(() => {
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      }, 100);
    } catch (error) {
      console.error('Download error:', error);
      // Fallback: try direct download
      const link = document.createElement('a');
      link.href = wp.url;
      link.download = `${wp.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.jpg`;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
    setShowMenu(false);
  };

  const handleShare = async (e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: wp.title,
          text: `Check out "${wp.title}" on Gallery`,
          url: window.location.href,
        });
      } catch (error) {
        // User cancelled
      }
    } else {
      navigator.clipboard.writeText(window.location.href);
      alert('Link copied to clipboard!');
    }
    setShowMenu(false);
  };

  const formatCount = (count: number) => {
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}k`;
    return count.toString();
  };

  // Skeleton loader while not in view
  if (!inView) {
    return (
      <div 
        ref={cardRef}
        className="rounded-xl overflow-hidden"
        style={{ minHeight: '250px' }}
      >
        <div className="skeleton-shimmer w-full h-full rounded-xl" style={{ minHeight: '250px' }} />
      </div>
    );
  }

  return (
    <div 
      ref={cardRef}
      className="card-wrapper relative"
    >
      {/* Card */}
      <div 
        className="card group relative rounded-xl overflow-hidden cursor-pointer transition-opacity hover:opacity-95"
        onClick={onClick}
      >
        {/* Skeleton while loading */}
        {!imageLoaded && (
          <div className="skeleton-shimmer w-full rounded-xl" style={{ minHeight: '250px' }} />
        )}

        {/* Image */}
        <img
          ref={imgRef}
          src={wp.thumbnail || wp.url}
          alt={wp.title}
          loading="lazy"
          decoding="async"
          onLoad={() => setImageLoaded(true)}
          className={`w-full h-auto block transition-opacity duration-300 ${
            imageLoaded ? 'opacity-100' : 'opacity-0 absolute inset-0'
          }`}
          style={{ 
            contentVisibility: 'auto',
            backgroundColor: '#1a1a1a'
          }}
        />

        {/* Hover overlay */}
        {imageLoaded && (
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            <div className="absolute top-3 right-3 flex items-center gap-2">
              <button
                onClick={handleLike}
                className={`p-2.5 rounded-full backdrop-blur-md transition-all hover:scale-110 active:scale-95 ${
                  liked 
                    ? 'bg-rose-500 hover:bg-rose-600' 
                    : 'bg-black/50 hover:bg-black/70'
                }`}
              >
                <Heart 
                  className={`w-4 h-4 ${liked ? 'text-white fill-white' : 'text-white'}`} 
                />
              </button>
              <button
                onClick={handleDownload}
                className="p-2.5 rounded-full bg-black/50 hover:bg-black/70 backdrop-blur-md transition-all hover:scale-110 active:scale-95"
              >
                <Download className="w-4 h-4 text-white" />
              </button>
            </div>
          </div>
        )}

        {/* Bottom info bar */}
        {imageLoaded && (
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/95 via-black/80 to-transparent p-2.5">
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <h3 className="font-medium line-clamp-1 text-xs flex-1">{wp.title}</h3>
            </div>

            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 min-w-0 flex-1">
                <img 
                  src={wp.userAvatar} 
                  alt={wp.uploadedBy} 
                  className="w-5 h-5 rounded-full flex-shrink-0 border border-white/20" 
                />
                <span className="text-[10px] text-white/80 truncate font-medium">
                  {wp.uploadedBy}
                </span>
                {wp.verified && <VerifiedBadge size="sm" />}
              </div>
              
              <div className="flex items-center gap-2 flex-shrink-0">
                {likeCount > 0 && (
                  <div className="flex items-center gap-0.5">
                    <Heart className="w-3 h-3 text-rose-400 fill-rose-400" />
                    <span className="text-[10px] font-medium text-rose-400">
                      {formatCount(likeCount)}
                    </span>
                  </div>
                )}
                {viewCount > 0 && (
                  <div className="flex items-center gap-0.5">
                    <Eye className="w-3 h-3 text-white/60" />
                    <span className="text-[10px] font-medium text-white/60">
                      {formatCount(viewCount)}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Three dots menu - OUTSIDE card */}
      {imageLoaded && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            setShowMenu(!showMenu);
          }}
          className="absolute -bottom-10 right-2 p-2 rounded-full hover:bg-white/10 transition-colors z-10"
        >
          <MoreHorizontal className="w-5 h-5 text-white/80" />
        </button>
      )}

      {/* Dropdown Menu */}
      {showMenu && (
        <>
          <div 
            className="fixed inset-0 z-40" 
            onClick={(e) => {
              e.stopPropagation();
              setShowMenu(false);
            }}
          />
          <div className="absolute -bottom-10 right-12 z-50 bg-zinc-900/95 backdrop-blur-xl border border-white/10 rounded-xl overflow-hidden shadow-2xl min-w-[180px]">
            <button
              onClick={handleSave}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors text-left"
            >
              <Bookmark className={`w-4 h-4 ${saved ? 'fill-blue-400 text-blue-400' : 'text-white/80'}`} />
              <span className="text-sm">{saved ? 'Unsave' : 'Save'}</span>
            </button>
            <button
              onClick={handleDownload}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors text-left"
            >
              <Download className="w-4 h-4 text-white/80" />
              <span className="text-sm">Download</span>
            </button>
            <button
              onClick={handleShare}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors text-left"
            >
              <Share2 className="w-4 h-4 text-white/80" />
              <span className="text-sm">Share</span>
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                alert('Report functionality coming soon');
                setShowMenu(false);
              }}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors text-left border-t border-white/5"
            >
              <Flag className="w-4 h-4 text-red-400" />
              <span className="text-sm text-red-400">Report</span>
            </button>
          </div>
        </>
      )}
    </div>
  );
};