import { useState, useEffect } from 'react';
import { getSaved, saveWallpaper, unsaveWallpaper } from '@/lib/stores/userStore';
import type { SavedWallpaper } from '@/lib/stores/userStore';

/**
 * Hook to manage wallpaper saves
 */
export const useSaves = () => {
  const [savedWallpapers, setSavedWallpapers] = useState<SavedWallpaper[]>([]);
  const [loading, setLoading] = useState(true);

  const loadSaves = async () => {
    setLoading(true);
    const saves = await getSaved();
    setSavedWallpapers(saves);
    setLoading(false);
  };

  useEffect(() => {
    loadSaves();
  }, []);

  const toggleSave = async (wallpaperId: string) => {
    const saved = savedWallpapers.some(w => w.id === wallpaperId);
    
    if (saved) {
      const success = await unsaveWallpaper(wallpaperId);
      if (success) {
        setSavedWallpapers(prev => prev.filter(w => w.id !== wallpaperId));
      }
    } else {
      const success = await saveWallpaper(wallpaperId);
      if (success) {
        loadSaves(); // Reload to get full wallpaper data
      }
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
  };
};