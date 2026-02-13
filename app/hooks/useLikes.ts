import { useState, useEffect } from 'react';
import { getLiked, likeWallpaper, unlikeWallpaper } from '@/lib/stores/userStore';
import type { LikedWallpaper } from '@/lib/stores/userStore';

/**
 * Hook to manage wallpaper likes
 */
export const useLikes = () => {
  const [likedWallpapers, setLikedWallpapers] = useState<LikedWallpaper[]>([]);
  const [loading, setLoading] = useState(true);

  const loadLikes = async () => {
    setLoading(true);
    const likes = await getLiked();
    setLikedWallpapers(likes);
    setLoading(false);
  };

  useEffect(() => {
    loadLikes();
  }, []);

  const toggleLike = async (wallpaperId: string) => {
    const liked = likedWallpapers.some(w => w.id === wallpaperId);
    
    if (liked) {
      const success = await unlikeWallpaper(wallpaperId);
      if (success) {
        setLikedWallpapers(prev => prev.filter(w => w.id !== wallpaperId));
      }
    } else {
      const success = await likeWallpaper(wallpaperId);
      if (success) {
        loadLikes(); // Reload to get full wallpaper data
      }
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
  };
};