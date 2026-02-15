// app/hooks/useSaves.ts
import { useState, useEffect } from 'react';
import { getSaved, toggleSave as toggleSaveAction, isWallpaperSaved } from '@/lib/stores/userStore';
import type { Wallpaper } from '@/app/types';

/**
 * Hook to manage saved/bookmarked wallpapers with optimistic updates and caching
 */
export const useSaves = () => {
  const [savedWallpapers, setSavedWallpapers] = useState<Wallpaper[]>([]);
  const [loading, setLoading] = useState(true);

  const loadSaves = async () => {
    try {
      setLoading(true);
      const data = await getSaved();
      setSavedWallpapers(data.wallpapers);
    } catch (error) {
      console.error('Error loading saves:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSaves();
  }, []);

  const toggleSave = async (wallpaperId: string, wallpaper?: Wallpaper) => {
    const saved = savedWallpapers.some(w => w.id === wallpaperId);

    // Optimistic update
    if (saved) {
      setSavedWallpapers(prev => prev.filter(w => w.id !== wallpaperId));
    } else if (wallpaper) {
      setSavedWallpapers(prev => [wallpaper, ...prev]);
    }

    // Perform actual update
    const success = await toggleSaveAction(wallpaperId);
    
    // Revert on failure
    if (!success) {
      await loadSaves(); // Reload fresh data
    }
  };

  const checkIsSaved = (wallpaperId: string) => {
    return savedWallpapers.some(w => w.id === wallpaperId);
  };

  return {
    savedWallpapers,
    loading,
    toggleSave,
    isSaved: checkIsSaved,
    refetch: loadSaves,
    count: savedWallpapers.length,
  };
};