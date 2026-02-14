import { useState, useEffect } from 'react';
import { fetchWallpapers, fetchTrendingWallpapers, fetchWallpapersByCategory } from '@/lib/stores/wallpaperStore';
import type { Wallpaper } from '@/app/types';

/**
 * Hook to fetch wallpapers with loading and error states
 */
export const useWallpapers = (page = 0, pageSize = 24) => {
  const [wallpapers, setWallpapers] = useState<Wallpaper[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadWallpapers = async () => {
      try {
        setLoading(true);
        const data = await fetchWallpapers(page, pageSize);
        setWallpapers(data.wallpapers);
        setHasMore(data.hasMore);
        setTotal(data.total);
        setError(null);
      } catch (err: any) {
        setError(err.message || 'Failed to load wallpapers');
      } finally {
        setLoading(false);
      }
    };

    loadWallpapers();
  }, [page, pageSize]);

  return { wallpapers, hasMore, total, loading, error };
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
export const useWallpapersByCategory = (category: string, page = 0, pageSize = 24) => {
  const [wallpapers, setWallpapers] = useState<Wallpaper[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadWallpapers = async () => {
      try {
        setLoading(true);
        const data = await fetchWallpapersByCategory(category, page, pageSize);
        setWallpapers(data.wallpapers);
        setHasMore(data.hasMore);
        setTotal(data.total);
        setError(null);
      } catch (err: any) {
        setError(err.message || 'Failed to load wallpapers');
      } finally {
        setLoading(false);
      }
    };

    loadWallpapers();
  }, [category, page, pageSize]);

  return { wallpapers, hasMore, total, loading, error };
};
