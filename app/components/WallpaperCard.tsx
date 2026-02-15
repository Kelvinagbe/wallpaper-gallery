import { useState, useEffect, useRef } from 'react';
import { Heart, Download, Eye } from 'lucide-react';
import { VerifiedBadge } from './VerifiedBadge';
import { toggleLike as toggleLikeAction, isWallpaperLiked } from '@/lib/stores/userStore';
import { useAuth } from '@/app/components/AuthProvider';
import type { Wallpaper } from '../types';

type WallpaperCardProps = {
  wp: Wallpaper;
  onClick: () => void;
};

export const WallpaperCard = ({ wp, onClick }: WallpaperCardProps) => {
  const { user } = useAuth();
  const cardRef = useRef<HTMLDivElement>(null);
  const [loaded, setLoaded] = useState(false);
  const [inView, setInView] = useState(false);
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(wp.likes || 0);
  const [viewCount, setViewCount] = useState(wp.views || 0);

  // Lazy loading - only load image when in viewport
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
      { rootMargin: '100px' }
    );

    if (cardRef.current) {
      observer.observe(cardRef.current);
    }

    return () => observer.disconnect();
  }, []);

  // Load like status when in view
  useEffect(() => {
    if (!inView || !user) return;

    (async () => {
      const isLiked = await isWallpaperLiked(wp.id, user.id);
      setLiked(isLiked);
    })();
  }, [inView, wp.id, user]);

  const handleLike = async (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card click

    if (!user) {
      alert('Please login to like wallpapers');
      return;
    }

    // Optimistic update
    const newLikedState = !liked;
    setLiked(newLikedState);
    setLikeCount(prev => newLikedState ? prev + 1 : Math.max(0, prev - 1));
    
    // Haptic feedback
    if (navigator.vibrate) navigator.vibrate(50);

    // Background sync
    try {
      await toggleLikeAction(wp.id);
    } catch (error) {
      console.error('Error toggling like:', error);
      // Revert on error
      setLiked(!newLikedState);
      setLikeCount(prev => newLikedState ? Math.max(0, prev - 1) : prev + 1);
    }
  };

  const handleDownload = async (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card click

    if (navigator.vibrate) navigator.vibrate(50);

    try {
      const response = await fetch(wp.url);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${wp.title || 'wallpaper'}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download error:', error);
      // Fallback to direct link
      const link = document.createElement('a');
      link.href = wp.url;
      link.download = wp.title || 'wallpaper';
      link.target = '_blank';
      link.click();
    }
  };

  const formatCount = (count: number) => {
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}k`;
    return count.toString();
  };

  return (
    <div 
      ref={cardRef}
      className="card group relative rounded-xl overflow-hidden cursor-pointer"
      onClick={onClick}
    >
      {!inView ? (
        <div className="skeleton rounded-xl" style={{ height: '250px' }} />
      ) : (
        <>
          <img
            src={wp.thumbnail || wp.url}
            alt={wp.title}
            loading="lazy"
            className={`w-full h-auto transition-opacity duration-300 ${loaded ? 'opacity-100' : 'opacity-0'}`}
            onLoad={() => setLoaded(true)}
          />
          
          {!loaded && (
            <div className="absolute inset-0 skeleton rounded-xl" style={{ height: '250px' }} />
          )}

          {loaded && (
            <>
              {/* Hover overlay with actions */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center gap-3">
                  <button
                    onClick={handleLike}
                    className={`p-3 rounded-full transition-all hover:scale-110 active:scale-95 ${
                      liked 
                        ? 'bg-rose-500 hover:bg-rose-600' 
                        : 'bg-white/90 hover:bg-white'
                    }`}
                  >
                    <Heart 
                      className={`w-5 h-5 transition-all ${
                        liked 
                          ? 'text-white fill-white' 
                          : 'text-black'
                      }`} 
                    />
                  </button>
                  <button
                    onClick={handleDownload}
                    className="p-3 rounded-full bg-white/90 hover:bg-white transition-all hover:scale-110 active:scale-95"
                  >
                    <Download className="w-5 h-5 text-black" />
                  </button>
                </div>
              </div>

              {/* Bottom info - always visible */}
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/60 to-transparent p-3">
                <h3 className="font-semibold mb-2 line-clamp-1 text-sm">{wp.title}</h3>
                
                <div className="flex items-center justify-between gap-2">
                  {/* User info */}
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <img 
                      src={wp.userAvatar} 
                      alt={wp.uploadedBy} 
                      className="w-6 h-6 rounded-full flex-shrink-0 border border-white/20" 
                    />
                    <span className="text-xs text-white/90 truncate font-medium">
                      {wp.uploadedBy}
                    </span>
                    {wp.verified && <VerifiedBadge size="sm" />}
                  </div>
                  
                  {/* Stats */}
                  <div className="flex items-center gap-3 flex-shrink-0">
                    {likeCount > 0 && (
                      <div className="flex items-center gap-1">
                        <Heart className="w-3.5 h-3.5 text-rose-400 fill-rose-400" />
                        <span className="text-xs font-medium text-rose-400">
                          {formatCount(likeCount)}
                        </span>
                      </div>
                    )}
                    {viewCount > 0 && (
                      <div className="flex items-center gap-1">
                        <Eye className="w-3.5 h-3.5 text-white/70" />
                        <span className="text-xs font-medium text-white/70">
                          {formatCount(viewCount)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
};