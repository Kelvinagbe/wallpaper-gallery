import { useState, useEffect } from 'react';
import { Heart, Download, Loader2 } from 'lucide-react';
import { VerifiedBadge } from './VerifiedBadge';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/app/components/AuthProvider';
import type { Wallpaper } from '../types';

type WallpaperCardProps = {
  wp: Wallpaper;
  onClick: () => void;
};

// ✅ Cache for card interactions
const cardDataCache = new Map<string, {
  liked: boolean;
  saved: boolean;
  likeCount: number;
  timestamp: number;
}>();

const CACHE_DURATION = 30000; // 30 seconds

export const WallpaperCard = ({ wp, onClick }: WallpaperCardProps) => {
  const { session } = useAuth();
  const supabase = createClient();
  const [loaded, setLoaded] = useState(false);
  const [hideOverlay, setHideOverlay] = useState(false);
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(wp.likes || 0);
  const [dataFetched, setDataFetched] = useState(false);

  // ✅ Fetch like status and count with caching
  useEffect(() => {
    if (!session || !wp.id) return;

    const cacheKey = `card-${wp.id}-${session.user.id}`;
    const cached = cardDataCache.get(cacheKey);

    // Check if cache is valid
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      setLiked(cached.liked);
      setLikeCount(cached.likeCount);
      setDataFetched(true);
      return;
    }

    // Fetch from database
    (async () => {
      const [likeResult, likeCountResult] = await Promise.all([
        supabase
          .from('likes')
          .select('id')
          .eq('user_id', session.user.id)
          .eq('wallpaper_id', wp.id)
          .maybeSingle(),
        supabase
          .from('likes')
          .select('id', { count: 'exact' })
          .eq('wallpaper_id', wp.id),
      ]);

      const isLiked = !!likeResult.data;
      const count = likeCountResult.count || 0;

      setLiked(isLiked);
      setLikeCount(count);
      setDataFetched(true);

      // Cache the results
      cardDataCache.set(cacheKey, {
        liked: isLiked,
        saved: false, // placeholder for future use
        likeCount: count,
        timestamp: Date.now(),
      });
    })();
  }, [wp.id, session]);

  // ✅ Real-time subscription for like count
  useEffect(() => {
    if (!wp.id) return;

    const channel = supabase
      .channel(`card-${wp.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'likes',
          filter: `wallpaper_id=eq.${wp.id}`,
        },
        async () => {
          // Fetch updated like count
          const { count } = await supabase
            .from('likes')
            .select('id', { count: 'exact' })
            .eq('wallpaper_id', wp.id);

          const newCount = count || 0;
          setLikeCount(newCount);

          // Update cache
          if (session) {
            const cacheKey = `card-${wp.id}-${session.user.id}`;
            const cached = cardDataCache.get(cacheKey);
            if (cached) {
              cardDataCache.set(cacheKey, {
                ...cached,
                likeCount: newCount,
                timestamp: Date.now(),
              });
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [wp.id, session]);

  const handleLike = async (e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!session) {
      alert('Please login to like wallpapers');
      return;
    }

    // Optimistic update
    const newLikedState = !liked;
    setLiked(newLikedState);
    setLikeCount(c => newLikedState ? c + 1 : c - 1);
    setHideOverlay(true);

    // Vibrate feedback
    navigator.vibrate?.(50);

    // Update cache immediately
    const cacheKey = `card-${wp.id}-${session.user.id}`;
    const cached = cardDataCache.get(cacheKey);
    if (cached) {
      cardDataCache.set(cacheKey, {
        ...cached,
        liked: newLikedState,
        likeCount: newLikedState ? cached.likeCount + 1 : cached.likeCount - 1,
        timestamp: Date.now(),
      });
    }

    // Background sync to database
    try {
      if (newLikedState) {
        await supabase.from('likes').insert({
          user_id: session.user.id,
          wallpaper_id: wp.id,
        });
      } else {
        await supabase
          .from('likes')
          .delete()
          .eq('user_id', session.user.id)
          .eq('wallpaper_id', wp.id);
      }
    } catch (error) {
      console.error('Error updating like:', error);
      // Revert on error
      setLiked(!newLikedState);
      setLikeCount(c => newLikedState ? c - 1 : c + 1);
    }
  };

  const handleDownload = (e: React.MouseEvent) => {
    e.stopPropagation();
    
    // Download the image
    const link = document.createElement('a');
    link.href = wp.url;
    link.download = wp.title || 'wallpaper';
    link.click();
    
    setHideOverlay(true);
    navigator.vibrate?.(50);
  };

  const formatCount = (count: number) => {
    if (count > 1000) return `${(count / 1000).toFixed(1)}k`;
    return count;
  };

  return (
    <div 
      className="card group relative rounded-xl overflow-hidden cursor-pointer transition-all duration-300" 
      onClick={onClick}
    >
      {!loaded && (
        <div className="skeleton rounded-xl flex items-center justify-center" style={{ height: '250px' }}>
          <Loader2 className="w-8 h-8 text-white/40 animate-spin" />
        </div>
      )}
      <img
        src={wp.thumbnail}
        alt={wp.title}
        className={`w-full h-auto transition-opacity duration-300 ${loaded ? 'opacity-100' : 'opacity-0 absolute'}`}
        onLoad={() => setLoaded(true)}
      />
      {loaded && (
        <>
          {!hideOverlay && (
            <div className="card-overlay absolute inset-0 bg-black/40 backdrop-blur-[2px] flex items-center justify-center gap-3">
              <button
                onClick={handleLike}
                className={`p-2.5 rounded-full transition-all hover:scale-110 ${
                  liked 
                    ? 'bg-rose-500 hover:bg-rose-600' 
                    : 'bg-white hover:bg-gray-200'
                }`}
              >
                <Heart 
                  className={`w-4 h-4 transition-all ${
                    liked 
                      ? 'text-white fill-white' 
                      : 'text-black'
                  }`} 
                />
              </button>
              <button
                onClick={handleDownload}
                className="p-2.5 rounded-full bg-white hover:bg-gray-200 transition-all hover:scale-110"
              >
                <Download className="w-4 h-4 text-black" />
              </button>
            </div>
          )}
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-2.5">
            <h3 className="font-medium mb-1.5 line-clamp-1 text-xs">{wp.title}</h3>
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 min-w-0 flex-1">
                <img 
                  src={wp.userAvatar} 
                  alt={wp.uploadedBy} 
                  className="w-5 h-5 rounded-full flex-shrink-0" 
                />
                <span className="text-[11px] text-white/80 truncate">
                  {wp.uploadedBy}
                </span>
                {wp.verified && <VerifiedBadge size="sm" />}
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {dataFetched && (
                  <span className="text-[11px] text-rose-400 flex items-center gap-0.5">
                    <Heart className="w-3 h-3 fill-rose-400" />
                    {formatCount(likeCount)}
                  </span>
                )}
                <span className="text-[11px] text-white/70">
                  {formatCount(wp.views)}
                </span>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};