import { useState, useEffect } from 'react';
import { fetchWallpapers, fetchTrendingWallpapers, fetchWallpapersByCategory } from '@/lib/stores/wallpaperStore';
import type { Wallpaper } from '@/types';

/**
 * Hook to fetch wallpapers with loading and error states
 */
export const useWallpapers = (limit = 24, offset = 0) => {
  const [wallpapers, setWallpapers] = useState<Wallpaper[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadWallpapers = async () => {
      try {
        setLoading(true);
        const data = await fetchWallpapers(limit, offset);
        setWallpapers(data);
        setError(null);
      } catch (err: any) {
        setError(err.message || 'Failed to load wallpapers');
      } finally {
        setLoading(false);
      }
    };

    loadWallpapers();
  }, [limit, offset]);

  return { wallpapers, loading, error };
};

/**
 * Hook to fetch trending wallpapers
 */
export const useTrendingWallpapers = (limit = 24) => {
  const [wallpapers, setWallpapers] = useState<Wallpaper[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadWallpapers = async () => {
      try {
        setLoading(true);
        const data = await fetchTrendingWallpapers(limit);
        setWallpapers(data);
        setError(null);
      } catch (err: any) {
        setError(err.message || 'Failed to load trending wallpapers');
      } finally {
        setLoading(false);
      }
    };

    loadWallpapers();
  }, [limit]);

  return { wallpapers, loading, error };
};

/**
 * Hook to fetch wallpapers by category
 */
export const useWallpapersByCategory = (category: string, limit = 24) => {
  const [wallpapers, setWallpapers] = useState<Wallpaper[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadWallpapers = async () => {
      try {
        setLoading(true);
        const data = await fetchWallpapersByCategory(category, limit);
        setWallpapers(data);
        setError(null);
      } catch (err: any) {
        setError(err.message || 'Failed to load wallpapers');
      } finally {
        setLoading(false);
      }
    };

    loadWallpapers();
  }, [category, limit]);

  return { wallpapers, loading, error };
};