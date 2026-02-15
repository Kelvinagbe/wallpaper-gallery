
import { useState, useEffect, useRef } from 'react';
import { Heart, Download, MoreVertical, Share2, Bookmark } from 'lucide-react';
import { toggleLike as toggleLikeAction, isWallpaperLiked, toggleSave } from '@/lib/stores/userStore';
import { useAuth } from '@/app/components/AuthProvider';
import type { Wallpaper } from '../types';

type CompactWallpaperCardProps = {
  wp: Wallpaper;
  onClick: () => void;
};

export const CompactWallpaperCard = ({ wp, onClick }: CompactWallpaperCardProps) => {
  const { user } = useAuth();
  const cardRef = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(wp.likes || 0);

  // Lazy loading
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
      { rootMargin: '200px' }
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

  const handleDownload = async (e: React.MouseEvent) => {
    e.stopPropagation();
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
      const link = document.createElement('a');
      link.href = wp.url;
      link.download = wp.title || 'wallpaper';
      link.target = '_blank';
      link.click();
    }
  };

  // Don't render until in view
  if (!inView) {
    return (
      <div 
        ref={cardRef}
        className="rounded-lg bg-white/5"
        style={{ minHeight: '120px' }}
      />
    );
  }

  return (
    <div 
      ref={cardRef}
      className="card group relative rounded-lg overflow-hidden cursor-pointer transition-opacity hover:opacity-95" 
      onClick={onClick}
    >
      {/* Image */}
      <img
        src={wp.thumbnail || wp.url}
        alt={wp.title}
        loading="lazy"
        decoding="async"
        onLoad={() => setImageLoaded(true)}
        className={`w-full h-auto block transition-opacity duration-300 ${
          imageLoaded ? 'opacity-100' : 'opacity-0'
        }`}
        style={{ 
          contentVisibility: 'auto',
          backgroundColor: '#1a1a1a'
        }}
      />

      {/* Hover overlay */}
      {imageLoaded && (
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center gap-2">
          <button
            onClick={handleLike}
            className={`p-2 rounded-full transition-all hover:scale-110 active:scale-95 ${
              liked 
                ? 'bg-rose-500 hover:bg-rose-600' 
                : 'bg-white hover:bg-gray-200'
            }`}
          >
            <Heart className={`w-3.5 h-3.5 ${liked ? 'text-white fill-white' : 'text-black'}`} />
          </button>
          <button
            onClick={handleDownload}
            className="p-2 rounded-full bg-white hover:bg-gray-200 transition-all hover:scale-110 active:scale-95"
          >
            <Download className="w-3.5 h-3.5 text-black" />
          </button>
        </div>
      )}

      {/* Like count badge */}
      {imageLoaded && likeCount > 0 && (
        <div className="absolute top-2 right-2 bg-black/70 backdrop-blur-md rounded-full px-2 py-1 flex items-center gap-1">
          <Heart className="w-3 h-3 text-rose-400 fill-rose-400" />
          <span className="text-[10px] font-medium text-white">
            {likeCount >= 1000 ? `${(likeCount / 1000).toFixed(1)}k` : likeCount}
          </span>
        </div>
      )}
    </div>
  );
};