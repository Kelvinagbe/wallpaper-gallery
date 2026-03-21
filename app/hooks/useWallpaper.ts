// hooks/useWallpapers.ts
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  fetchWallpapers,
  fetchTrendingWallpapers,
  fetchWallpapersByCategory,
} from '@/lib/stores/wallpaperStore';
import type { Wallpaper } from '@/app/types';
import type { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';

// ── Cache ────────────────────────────────────────────────────────
type CacheEntry = { data: Wallpaper[]; timestamp: number; hasMore?: boolean; total?: number; };
const cache = new Map<string, CacheEntry>();
const CACHE_TTL = 2 * 60 * 1000; // 2 min
const isFresh = (entry: CacheEntry) => Date.now() - entry.timestamp < CACHE_TTL;

// ── Supabase singleton — avoids new client on every render ───────
const supabase = createClient();

// ── Shared realtime helper ───────────────────────────────────────
const useRealtimeWallpapers = (
  channelName: string,
  filter: Record<string, string> | undefined,
  onInsert: (w: Wallpaper) => void,
  onUpdate: (w: Wallpaper) => void,
  onDelete: (id: string) => void,
  invalidate: () => void,
) => {
  const ref = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    const ch = supabase.channel(channelName).on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'wallpapers', ...(filter ?? {}) },
      (payload: RealtimePostgresChangesPayload<Wallpaper>) => {
        if (payload.eventType === 'INSERT') { onInsert(payload.new as Wallpaper); invalidate(); }
        if (payload.eventType === 'UPDATE') onUpdate(payload.new as Wallpaper);
        if (payload.eventType === 'DELETE') { onDelete((payload.old as Wallpaper).id); invalidate(); }
      },
    ).subscribe();

    ref.current = ch;
    return () => { supabase.removeChannel(ch); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channelName]);
};

// ────────────────────────────────────────────────────────────────
// useWallpapers
// ────────────────────────────────────────────────────────────────
export const useWallpapers = (page = 0, pageSize = 24) => {
  const [wallpapers, setWallpapers] = useState<Wallpaper[]>([]);
  const [hasMore,    setHasMore]    = useState(false);
  const [total,      setTotal]      = useState(0);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState<string | null>(null);

  const key = `wallpapers-${page}-${pageSize}`;

  const load = useCallback(async (force = false) => {
    const cached = cache.get(key);
    if (!force && cached && isFresh(cached)) {
      setWallpapers(cached.data);
      setHasMore(cached.hasMore ?? false);
      setTotal(cached.total ?? 0);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      // ↓ Your fetchWallpapers should join profiles for uploader data:
      //   .select('*, uploader:profiles(id,name,username,avatar,verified)')
      const { wallpapers: data, hasMore: more, total: tot } = await fetchWallpapers(page, pageSize);
      cache.set(key, { data, timestamp: Date.now(), hasMore: more, total: tot });
      setWallpapers(data);
      setHasMore(more);
      setTotal(tot);
      setError(null);
    } catch (e: any) {
      setError(e.message ?? 'Failed to load wallpapers');
    } finally {
      setLoading(false);
    }
  }, [key, page, pageSize]);

  useEffect(() => { load(); }, [load]);

  useRealtimeWallpapers(
    `wallpapers-rt-${page}`,
    undefined,
    (w) => { if (page === 0) setWallpapers(p => [w, ...p.slice(0, pageSize - 1)]); setTotal(t => t + 1); },
    (w) => setWallpapers(p => p.map(x => x.id === w.id ? w : x)),
    (id) => { setWallpapers(p => p.filter(x => x.id !== id)); setTotal(t => Math.max(0, t - 1)); },
    () => cache.delete(key),
  );

  return { wallpapers, hasMore, total, loading, error, refresh: () => load(true) };
};

// ────────────────────────────────────────────────────────────────
// useTrendingWallpapers
// ────────────────────────────────────────────────────────────────
export const useTrendingWallpapers = (limit = 24) => {
  const [wallpapers, setWallpapers] = useState<Wallpaper[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState<string | null>(null);

  const key = `trending-${limit}`;

  const load = useCallback(async (force = false) => {
    const cached = cache.get(key);
    if (!force && cached && isFresh(cached)) {
      setWallpapers(cached.data);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const data = await fetchTrendingWallpapers(limit);
      cache.set(key, { data, timestamp: Date.now() });
      setWallpapers(data);
      setError(null);
    } catch (e: any) {
      setError(e.message ?? 'Failed to load trending wallpapers');
    } finally {
      setLoading(false);
    }
  }, [key, limit]);

  useEffect(() => { load(); }, [load]);

  // Trending depends on views/likes so refresh on any change
  useRealtimeWallpapers(
    'trending-rt',
    undefined,
    () => load(true),
    () => load(true),
    () => load(true),
    () => cache.delete(key),
  );

  return { wallpapers, loading, error, refresh: () => load(true) };
};

// ────────────────────────────────────────────────────────────────
// useWallpapersByCategory
// ────────────────────────────────────────────────────────────────
export const useWallpapersByCategory = (category: string, page = 0, pageSize = 24) => {
  const [wallpapers, setWallpapers] = useState<Wallpaper[]>([]);
  const [hasMore,    setHasMore]    = useState(false);
  const [total,      setTotal]      = useState(0);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState<string | null>(null);

  const key = `cat-${category}-${page}-${pageSize}`;

  const load = useCallback(async (force = false) => {
    if (!category) { setLoading(false); return; }
    const cached = cache.get(key);
    if (!force && cached && isFresh(cached)) {
      setWallpapers(cached.data);
      setHasMore(cached.hasMore ?? false);
      setTotal(cached.total ?? 0);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const { wallpapers: data, hasMore: more, total: tot } = await fetchWallpapersByCategory(category, page, pageSize);
      cache.set(key, { data, timestamp: Date.now(), hasMore: more, total: tot });
      setWallpapers(data);
      setHasMore(more);
      setTotal(tot);
      setError(null);
    } catch (e: any) {
      setError(e.message ?? 'Failed to load wallpapers');
    } finally {
      setLoading(false);
    }
  }, [key, category, page, pageSize]);

  useEffect(() => { load(); }, [load]);

  useRealtimeWallpapers(
    `cat-rt-${category}-${page}`,
    { filter: `category=eq.${category}` },
    (w) => { if (page === 0) setWallpapers(p => [w, ...p.slice(0, pageSize - 1)]); setTotal(t => t + 1); },
    (w) => setWallpapers(p => p.map(x => x.id === w.id ? w : x)),
    (id) => { setWallpapers(p => p.filter(x => x.id !== id)); setTotal(t => Math.max(0, t - 1)); },
    () => cache.delete(key),
  );

  return { wallpapers, hasMore, total, loading, error, refresh: () => load(true) };
};

// ── Utility ──────────────────────────────────────────────────────
export const clearWallpaperCache = () => cache.clear();
