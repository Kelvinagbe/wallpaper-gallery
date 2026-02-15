// hooks/useWallpapers.ts
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { fetchWallpapers, fetchTrendingWallpapers, fetchWallpapersByCategory } from '@/lib/stores/wallpaperStore';
import type { Wallpaper } from '@/app/types';
import type { 
  RealtimeChannel, 
  RealtimePostgresChangesPayload 
} from '@supabase/supabase-js';

// Cache structure
type CacheEntry = {
  data: Wallpaper[];
  timestamp: number;
  hasMore?: boolean;
  total?: number;
};

const cache = new Map<string, CacheEntry>();
const CACHE_DURATION = 2 * 60 * 1000; // 2 minutes

/**
 * Hook to fetch wallpapers with real-time updates, caching, and loading states
 */
export const useWallpapers = (page = 0, pageSize = 24) => {
  const [wallpapers, setWallpapers] = useState<Wallpaper[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const supabase = createClient();

  const cacheKey = `wallpapers-${page}-${pageSize}`;

  const loadWallpapers = useCallback(async (skipCache = false) => {
    try {
      setLoading(true);

      // Check cache first
      if (!skipCache) {
        const cached = cache.get(cacheKey);
        const now = Date.now();
        if (cached && (now - cached.timestamp) < CACHE_DURATION) {
          setWallpapers(cached.data);
          setHasMore(cached.hasMore ?? false);
          setTotal(cached.total ?? 0);
          setLoading(false);
          return;
        }
      }

      // Fetch fresh data
      const data = await fetchWallpapers(page, pageSize);
      
      // Update cache
      cache.set(cacheKey, {
        data: data.wallpapers,
        timestamp: Date.now(),
        hasMore: data.hasMore,
        total: data.total,
      });

      setWallpapers(data.wallpapers);
      setHasMore(data.hasMore);
      setTotal(data.total);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to load wallpapers');
      console.error('Error loading wallpapers:', err);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, cacheKey]);

  useEffect(() => {
    loadWallpapers();

    // Set up real-time subscription
    channelRef.current = supabase
      .channel(`wallpapers-${page}`)
      .on(
        'postgres_changes',
        { 
          event: '*', 
          schema: 'public', 
          table: 'wallpapers' 
        },
        (payload: RealtimePostgresChangesPayload<Wallpaper>) => {
          if (payload.eventType === 'INSERT') {
            const newWallpaper = payload.new as Wallpaper;
            // Only add if it's on the first page
            if (page === 0) {
              setWallpapers((prev) => [newWallpaper, ...prev.slice(0, pageSize - 1)]);
              setTotal((prev) => prev + 1);
            }
            // Invalidate cache
            cache.delete(cacheKey);
          } else if (payload.eventType === 'UPDATE') {
            setWallpapers((prev) =>
              prev.map((w) =>
                w.id === payload.new.id ? (payload.new as Wallpaper) : w
              )
            );
            // Update cache
            const cached = cache.get(cacheKey);
            if (cached) {
              cached.data = cached.data.map((w) =>
                w.id === payload.new.id ? (payload.new as Wallpaper) : w
              );
            }
          } else if (payload.eventType === 'DELETE') {
            setWallpapers((prev) => prev.filter((w) => w.id !== payload.old.id));
            setTotal((prev) => Math.max(0, prev - 1));
            // Invalidate cache
            cache.delete(cacheKey);
          }
        }
      )
      .subscribe();

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [page, pageSize, cacheKey, loadWallpapers, supabase]);

  const refresh = useCallback(() => {
    cache.delete(cacheKey);
    loadWallpapers(true);
  }, [cacheKey, loadWallpapers]);

  return { wallpapers, hasMore, total, loading, error, refresh };
};

/**
 * Hook to fetch trending wallpapers with real-time updates
 */
export const useTrendingWallpapers = (limit = 24) => {
  const [wallpapers, setWallpapers] = useState<Wallpaper[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const supabase = createClient();

  const cacheKey = `trending-${limit}`;

  const loadWallpapers = useCallback(async (skipCache = false) => {
    try {
      setLoading(true);

      // Check cache
      if (!skipCache) {
        const cached = cache.get(cacheKey);
        const now = Date.now();
        if (cached && (now - cached.timestamp) < CACHE_DURATION) {
          setWallpapers(cached.data);
          setLoading(false);
          return;
        }
      }

      const data = await fetchTrendingWallpapers(limit);
      
      cache.set(cacheKey, {
        data,
        timestamp: Date.now(),
      });

      setWallpapers(data);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to load trending wallpapers');
      console.error('Error loading trending wallpapers:', err);
    } finally {
      setLoading(false);
    }
  }, [limit, cacheKey]);

  useEffect(() => {
    loadWallpapers();

    // Real-time updates
    channelRef.current = supabase
      .channel('trending-wallpapers')
      .on(
        'postgres_changes',
        { 
          event: '*', 
          schema: 'public', 
          table: 'wallpapers' 
        },
        (_payload: RealtimePostgresChangesPayload<Wallpaper>) => {
          // Refresh trending when any wallpaper changes
          // (since trending depends on views/downloads)
          cache.delete(cacheKey);
          loadWallpapers(true);
        }
      )
      .subscribe();

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [limit, cacheKey, loadWallpapers, supabase]);

  const refresh = useCallback(() => {
    cache.delete(cacheKey);
    loadWallpapers(true);
  }, [cacheKey, loadWallpapers]);

  return { wallpapers, loading, error, refresh };
};

/**
 * Hook to fetch wallpapers by category with real-time updates
 */
export const useWallpapersByCategory = (
  category: string, 
  page = 0, 
  pageSize = 24
) => {
  const [wallpapers, setWallpapers] = useState<Wallpaper[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const supabase = createClient();

  const cacheKey = `category-${category}-${page}-${pageSize}`;

  const loadWallpapers = useCallback(async (skipCache = false) => {
    if (!category) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      // Check cache
      if (!skipCache) {
        const cached = cache.get(cacheKey);
        const now = Date.now();
        if (cached && (now - cached.timestamp) < CACHE_DURATION) {
          setWallpapers(cached.data);
          setHasMore(cached.hasMore ?? false);
          setTotal(cached.total ?? 0);
          setLoading(false);
          return;
        }
      }

      const data = await fetchWallpapersByCategory(category, page, pageSize);
      
      cache.set(cacheKey, {
        data: data.wallpapers,
        timestamp: Date.now(),
        hasMore: data.hasMore,
        total: data.total,
      });

      setWallpapers(data.wallpapers);
      setHasMore(data.hasMore);
      setTotal(data.total);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to load wallpapers');
      console.error('Error loading category wallpapers:', err);
    } finally {
      setLoading(false);
    }
  }, [category, page, pageSize, cacheKey]);

  useEffect(() => {
    loadWallpapers();

    // Real-time updates for this category
    channelRef.current = supabase
      .channel(`category-${category}-${page}`)
      .on(
        'postgres_changes',
        { 
          event: '*', 
          schema: 'public', 
          table: 'wallpapers',
          filter: `category=eq.${category}`
        },
        (payload: RealtimePostgresChangesPayload<Wallpaper>) => {
          if (payload.eventType === 'INSERT') {
            if (page === 0) {
              const newWallpaper = payload.new as Wallpaper;
              setWallpapers((prev) => [newWallpaper, ...prev.slice(0, pageSize - 1)]);
              setTotal((prev) => prev + 1);
            }
            cache.delete(cacheKey);
          } else if (payload.eventType === 'UPDATE') {
            setWallpapers((prev) =>
              prev.map((w) =>
                w.id === payload.new.id ? (payload.new as Wallpaper) : w
              )
            );
            const cached = cache.get(cacheKey);
            if (cached) {
              cached.data = cached.data.map((w) =>
                w.id === payload.new.id ? (payload.new as Wallpaper) : w
              );
            }
          } else if (payload.eventType === 'DELETE') {
            setWallpapers((prev) => prev.filter((w) => w.id !== payload.old.id));
            setTotal((prev) => Math.max(0, prev - 1));
            cache.delete(cacheKey);
          }
        }
      )
      .subscribe();

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [category, page, pageSize, cacheKey, loadWallpapers, supabase]);

  const refresh = useCallback(() => {
    cache.delete(cacheKey);
    loadWallpapers(true);
  }, [cacheKey, loadWallpapers]);

  return { wallpapers, hasMore, total, loading, error, refresh };
};

/**
 * Utility function to clear all wallpaper caches
 */
export const clearWallpaperCache = () => {
  cache.clear();
};