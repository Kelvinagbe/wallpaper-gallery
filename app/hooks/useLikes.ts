import { useState, useEffect } from 'react';
import { getLiked, toggleLike as toggleLikeAction, isWallpaperLiked } from '@/lib/stores/userStore';
import type { Wallpaper } from '@/app/types';

/**
 * Hook to manage wallpaper likes with optimistic updates and caching
 */
export const useLikes = () => {
  const [likedWallpapers, setLikedWallpapers] = useState<Wallpaper[]>([]);
  const [loading, setLoading] = useState(true);

  const loadLikes = async () => {
    try {
      setLoading(true);
      const data = await getLiked();
      setLikedWallpapers(data.wallpapers);
    } catch (error) {
      console.error('Error loading likes:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLikes();
  }, []);

  const toggleLike = async (wallpaperId: string, wallpaper?: Wallpaper) => {
    const liked = likedWallpapers.some(w => w.id === wallpaperId);

    // Optimistic update
    if (liked) {
      setLikedWallpapers(prev => prev.filter(w => w.id !== wallpaperId));
    } else if (wallpaper) {
      setLikedWallpapers(prev => [wallpaper, ...prev]);
    }

    // Perform actual update
    const success = await toggleLikeAction(wallpaperId);
    
    // Revert on failure
    if (!success) {
      await loadLikes(); // Reload fresh data
    }
  };

  const checkIsLiked = (wallpaperId: string) => {
    return likedWallpapers.some(w => w.id === wallpaperId);
  };

  return {
    likedWallpapers,
    loading,
    toggleLike,
    isLiked: checkIsLiked,
    refetch: loadLikes,
    count: likedWallpapers.length,
  };
};