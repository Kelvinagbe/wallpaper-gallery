// lib/stores/wallpaperStore.ts
import { createClient } from '@/lib/supabase/client';
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import type { Wallpaper, UserProfile, Filter } from '@/app/types';

let supabaseInstance: ReturnType<typeof createClient> | null = null;
const getSupabase = () => (supabaseInstance ??= createClient());

// ─── Cache ────────────────────────────────────────────────────────────────────
const TTL_MS = 60_000;
const cache = new Map<string, { data: any; expiresAt: number }>();
const cacheGet = <T>(key: string): T | null => {
  const e = cache.get(key);
  if (!e) return null;
  if (Date.now() > e.expiresAt) { cache.delete(key); return null; }
  return e.data as T;
};
const cacheSet = (key: string, data: any, ttl = TTL_MS) =>
  cache.set(key, { data, expiresAt: Date.now() + ttl });
export const clearCache = () => cache.clear();

// ─── Shared ───────────────────────────────────────────────────────────────────
const DEFAULT_PAGE_SIZE = 17;
const WALLPAPER_SELECT = `
  id, image_url, thumbnail_url, title, description, tags,
  downloads, likes, views, user_id, aspect_ratio,
  created_at, category, is_public,
  profiles:user_id(username, full_name, avatar_url, verified)
`;

const transformWallpaper = (wp: any): Wallpaper => ({
  id: wp.id, url: wp.image_url, thumbnail: wp.thumbnail_url || wp.image_url,
  title: wp.title, description: wp.description || '', tags: wp.tags || [],
  downloads: wp.downloads || 0, likes: wp.likes || 0, views: wp.views || 0,
  uploadedBy: wp.profiles?.full_name || wp.profiles?.username || 'Unknown',
  userId: wp.user_id, userAvatar: wp.profiles?.avatar_url || 'https://avatar.iran.liara.run/public',
  aspectRatio: wp.aspect_ratio || 1.5, verified: wp.profiles?.verified || false,
  createdAt: wp.created_at, category: wp.category || 'Other',
});

const transformProfile = (p: any): UserProfile => ({
  id: p.id, name: p.full_name || p.username || 'User', username: p.username || '@user',
  avatar: p.avatar_url || 'https://avatar.iran.liara.run/public', bio: p.bio || '',
  verified: p.verified || false, createdAt: p.created_at,
  followers: p.followers_count || 0, following: p.following_count || 0,
  posts: p.posts_count || 0, isFollowing: false,
});

// ✅ count: 'exact' — 'estimated' returns null on small/new tables, breaking hasMore
// ✅ empty guard restored — was removed in condensation, caused "no wallpapers" false positive
const paginatedQuery = async (queryFn: (q: any) => any, page: number, pageSize: number) => {
  const start = page * pageSize, end = start + pageSize - 1;
  const base = getSupabase().from('wallpapers').select(WALLPAPER_SELECT, { count: 'exact' });
  const { data, error, count } = await queryFn(base).range(start, end);
  if (error) throw new Error(error.message);
  if (!data || data.length === 0) return { wallpapers: [], hasMore: false, total: count ?? 0 };
  return { wallpapers: data.map(transformWallpaper), hasMore: end < (count ?? 0) - 1, total: count ?? 0 };
};

// ─── Fetch wallpapers (supports filter) ───────────────────────────────────────
export const fetchWallpapers = async (page = 0, pageSize = DEFAULT_PAGE_SIZE, filter: Filter = 'all') => {
  const cacheKey = `wallpapers:${page}:${pageSize}:${filter}`;
  const cached = cacheGet<Awaited<ReturnType<typeof paginatedQuery>>>(cacheKey);
  if (cached) return cached;

  const result = await paginatedQuery(q => {
    const base = q.eq('is_public', true);
    if (filter === 'trending') {
      const d = new Date(); d.setDate(d.getDate() - 7);
      return base.gte('created_at', d.toISOString()).order('views', { ascending: false });
    }
    if (filter === 'popular') return base.order('likes', { ascending: false });
    return base.order('created_at', { ascending: false });
  }, page, pageSize);

  cacheSet(cacheKey, result);
  return result;
};

// ─── Category / Tags / Trending ───────────────────────────────────────────────
export const fetchWallpapersByCategory = async (category: string, page = 0, pageSize = DEFAULT_PAGE_SIZE) => {
  const cacheKey = `category:${category}:${page}:${pageSize}`;
  const cached = cacheGet<Awaited<ReturnType<typeof paginatedQuery>>>(cacheKey);
  if (cached) return cached;
  const result = await paginatedQuery(q => q.eq('is_public', true).eq('category', category).order('created_at', { ascending: false }), page, pageSize);
  cacheSet(cacheKey, result);
  return result;
};

export const fetchWallpapersByTags = async (tags: string[], page = 0, pageSize = DEFAULT_PAGE_SIZE) => {
  const cacheKey = `tags:${tags.join(',')}:${page}:${pageSize}`;
  const cached = cacheGet<Awaited<ReturnType<typeof paginatedQuery>>>(cacheKey);
  if (cached) return cached;
  const result = await paginatedQuery(q => q.eq('is_public', true).overlaps('tags', tags).order('created_at', { ascending: false }), page, pageSize);
  cacheSet(cacheKey, result);
  return result;
};

export const fetchTrendingWallpapers = async (limit = DEFAULT_PAGE_SIZE) => {
  const cacheKey = `trending:${limit}`;
  const cached = cacheGet<Wallpaper[]>(cacheKey);
  if (cached) return cached;
  const d = new Date(); d.setDate(d.getDate() - 7);
  const { data, error } = await getSupabase().from('wallpapers').select(WALLPAPER_SELECT)
    .eq('is_public', true).gte('created_at', d.toISOString()).order('views', { ascending: false }).limit(limit);
  if (error) throw new Error(error.message);
  const result = data ? data.map(transformWallpaper) : [];
  cacheSet(cacheKey, result, 5 * 60_000);
  return result;
};

// ─── User / Search / Single ───────────────────────────────────────────────────
export const fetchUserWallpapers = (userId: string, page = 0, pageSize = DEFAULT_PAGE_SIZE) =>
  paginatedQuery(q => q.eq('user_id', userId).order('created_at', { ascending: false }), page, pageSize);

export const searchWallpapers = (query: string, page = 0, pageSize = DEFAULT_PAGE_SIZE) =>
  paginatedQuery(q => q.eq('is_public', true)
    .or(`title.ilike.%${query}%,description.ilike.%${query}%,tags.cs.{${query}}`)
    .order('created_at', { ascending: false }), page, pageSize);

export const fetchWallpaperById = async (wallpaperId: string) => {
  const cacheKey = `wallpaper:${wallpaperId}`;
  const cached = cacheGet<Wallpaper>(cacheKey);
  if (cached) return cached;
  const { data, error } = await getSupabase().from('wallpapers').select(WALLPAPER_SELECT).eq('id', wallpaperId).single();
  if (error) throw new Error(error.message);
  const result = data ? transformWallpaper(data) : null;
  if (result) cacheSet(cacheKey, result, 5 * 60_000);
  return result;
};

// ─── Profiles ─────────────────────────────────────────────────────────────────
export const fetchProfile = async (userId: string) => {
  const cacheKey = `profile:${userId}`;
  const cached = cacheGet<UserProfile>(cacheKey);
  if (cached) return cached;
  const { data, error } = await getSupabase().from('profiles').select('*').eq('id', userId).single();
  if (error) { console.error('❌ Error fetching profile:', error); return null; }
  const result = data ? transformProfile(data) : null;
  if (result) cacheSet(cacheKey, result, 5 * 60_000);
  return result;
};

export const fetchProfiles = async (userIds: string[]) => {
  if (!userIds.length) return [];
  const { data, error } = await getSupabase().from('profiles').select('*').in('id', userIds);
  if (error) { console.error('❌ Error fetching profiles:', error); return []; }
  return data ? data.map(transformProfile) : [];
};

export const searchProfiles = async (query: string, page = 0, pageSize = 20) => {
  const start = page * pageSize, end = start + pageSize - 1;
  const { data, error, count } = await getSupabase().from('profiles').select('*', { count: 'exact' })
    .or(`username.ilike.%${query}%,full_name.ilike.%${query}%`).range(start, end);
  if (error) throw new Error(error.message);
  return { profiles: data ? data.map(transformProfile) : [], hasMore: end < (count ?? 0) - 1, total: count ?? 0 };
};

// ─── Counts / Stats ───────────────────────────────────────────────────────────
export const getUserCounts = async (userId: string) => {
  const cacheKey = `counts:${userId}`;
  const cached = cacheGet<{ followers: number; following: number; posts: number }>(cacheKey);
  if (cached) return cached;
  const sb = getSupabase();
  const [f1, f2, p] = await Promise.all([
    sb.from('follows').select('id', { count: 'exact', head: true }).eq('following_id', userId),
    sb.from('follows').select('id', { count: 'exact', head: true }).eq('follower_id', userId),
    sb.from('wallpapers').select('id', { count: 'exact', head: true }).eq('user_id', userId),
  ]);
  const result = { followers: f1.count || 0, following: f2.count || 0, posts: p.count || 0 };
  cacheSet(cacheKey, result, 5 * 60_000);
  return result;
};

export const incrementViews = async (wallpaperId: string) => {
  const { error } = await getSupabase().rpc('increment_views', { wallpaper_id: wallpaperId });
  if (error) console.error('Error incrementing views:', error);
};

export const incrementDownloads = async (wallpaperId: string) => {
  const { error } = await getSupabase().rpc('increment_downloads', { wallpaper_id: wallpaperId });
  if (error) console.error('Error incrementing downloads:', error);
};

// ─── Follow ───────────────────────────────────────────────────────────────────
export const checkIsFollowing = async (currentUserId: string, targetUserId: string) => {
  const { data } = await getSupabase().from('follows').select('id')
    .eq('follower_id', currentUserId).eq('following_id', targetUserId).maybeSingle();
  return !!data;
};

export const followUser = async (currentUserId: string, targetUserId: string) => {
  const { error } = await getSupabase().from('follows').insert({ follower_id: currentUserId, following_id: targetUserId });
  if (error) throw new Error(error.message);
};

export const unfollowUser = async (currentUserId: string, targetUserId: string) => {
  const { error } = await getSupabase().from('follows').delete()
    .eq('follower_id', currentUserId).eq('following_id', targetUserId);
  if (error) throw new Error(error.message);
};

// ─── Realtime ─────────────────────────────────────────────────────────────────
const getProfile = (userId: string) =>
  getSupabase().from('profiles').select('username, full_name, avatar_url, verified').eq('id', userId).single();

export const subscribeToWallpapers = (callback: (wallpaper: Wallpaper) => void) => {
  const supabase = getSupabase();
  const channel = supabase.channel('wallpapers-inserts').on('postgres_changes',
    { event: 'INSERT', schema: 'public', table: 'wallpapers', filter: 'is_public=eq.true' },
    async (payload: RealtimePostgresChangesPayload<any>) => {
      const { data: profile } = await getProfile(payload.new.user_id);
      callback(transformWallpaper({ ...payload.new, profiles: profile }));
    }).subscribe();
  return () => supabase.removeChannel(channel);
};

export const subscribeToWallpaperUpdates = (wallpaperId: string, callback: (wallpaper: Wallpaper) => void) => {
  const supabase = getSupabase();
  const channel = supabase.channel(`wallpaper-${wallpaperId}`).on('postgres_changes',
    { event: 'UPDATE', schema: 'public', table: 'wallpapers', filter: `id=eq.${wallpaperId}` },
    async (payload: RealtimePostgresChangesPayload<any>) => {
      const { data: profile } = await getProfile(payload.new.user_id);
      cache.delete(`wallpaper:${wallpaperId}`);
      callback(transformWallpaper({ ...payload.new, profiles: profile }));
    }).subscribe();
  return () => supabase.removeChannel(channel);
};
