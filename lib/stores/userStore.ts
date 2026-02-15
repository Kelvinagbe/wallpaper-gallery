// lib/stores/userStore.ts
import { createClient } from '@/lib/supabase/client';
import type { User, AuthChangeEvent, Session } from '@supabase/supabase-js';
import type { Wallpaper } from '@/app/types';

// Singleton instance
let supabaseInstance: ReturnType<typeof createClient> | null = null;
const getSupabase = () => supabaseInstance ||= createClient();

// ============================================================================
// TYPES
// ============================================================================

export interface UserProfile {
  id: string;
  name: string;
  username: string;
  avatar: string;
  bio: string;
  verified: boolean;
  createdAt: string;
  followers: number;
  following: number;
  posts: number;
  isFollowing: boolean;
}

// ============================================================================
// HELPERS
// ============================================================================

const transformWallpaper = (wp: any): Wallpaper => ({
  id: wp.id,
  url: wp.image_url,
  thumbnail: wp.thumbnail_url || wp.image_url,
  title: wp.title,
  description: wp.description || '',
  tags: wp.tags || [],
  downloads: wp.downloads || 0,
  likes: wp.likes || 0,
  views: wp.views || 0,
  uploadedBy: wp.profiles?.full_name || wp.profiles?.username || 'Unknown',
  userId: wp.user_id,
  userAvatar: wp.profiles?.avatar_url || 'https://avatar.iran.liara.run/public',
  aspectRatio: wp.aspect_ratio || 1.5,
  verified: wp.profiles?.verified || false,
  createdAt: wp.created_at,
  category: wp.category || 'Other',
});

const transformProfile = (p: any): UserProfile => ({
  id: p.id,
  name: p.full_name || p.username || 'User',
  username: p.username || '@user',
  avatar: p.avatar_url || 'https://avatar.iran.liara.run/public',
  bio: p.bio || '',
  verified: p.verified || false,
  createdAt: p.created_at,
  followers: p.followers_count || 0,
  following: p.following_count || 0,
  posts: p.posts_count || 0,
  isFollowing: false,
});

// Generic fetch for user-related wallpapers
const fetchUserWallpapers = async (
  table: string,
  userId?: string,
  page = 0,
  pageSize = 24
) => {
  const supabase = getSupabase();
  let targetUserId = userId;
  
  if (!targetUserId) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { wallpapers: [], hasMore: false, total: 0 };
    targetUserId = user.id;
  }

  const start = page * pageSize;
  const end = start + pageSize - 1;

  const { data, error, count } = await supabase
    .from(table)
    .select(`
      wallpaper_id,
      created_at,
      wallpapers (
        *,
        profiles:user_id(username,full_name,avatar_url,verified)
      )
    `, { count: 'exact' })
    .eq('user_id', targetUserId)
    .order('created_at', { ascending: false })
    .range(start, end);

  if (error) {
    console.error(`Error fetching ${table}:`, error);
    return { wallpapers: [], hasMore: false, total: 0 };
  }

  return {
    wallpapers: data.filter((item: any) => item.wallpapers).map((item: any) => transformWallpaper(item.wallpapers)),
    hasMore: end < (count || 0) - 1,
    total: count || 0,
  };
};

// Generic check for user actions (liked, saved, etc)
const checkUserAction = async (table: string, wallpaperId: string, userId?: string): Promise<boolean> => {
  const supabase = getSupabase();
  let targetUserId = userId;
  
  if (!targetUserId) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;
    targetUserId = user.id;
  }

  const { data } = await supabase
    .from(table)
    .select('id')
    .eq('user_id', targetUserId)
    .eq('wallpaper_id', wallpaperId)
    .maybeSingle();

  return !!data;
};

// Generic toggle action (like, save, etc)
const toggleAction = async (
  table: string, 
  wallpaperId: string, 
  rpcIncrement?: string, 
  rpcDecrement?: string
): Promise<boolean> => {
  const supabase = getSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  const exists = await checkUserAction(table, wallpaperId, user.id);

  if (exists) {
    const { error } = await supabase.from(table).delete().eq('user_id', user.id).eq('wallpaper_id', wallpaperId);
    if (error) return false;
    if (rpcDecrement) await supabase.rpc(rpcDecrement, { wallpaper_id: wallpaperId });
  } else {
    const { error } = await supabase.from(table).insert({ user_id: user.id, wallpaper_id: wallpaperId });
    if (error && error.code !== '23505') return false;
    if (rpcIncrement) await supabase.rpc(rpcIncrement, { wallpaper_id: wallpaperId });
  }

  return true;
};

// ============================================================================
// AUTH
// ============================================================================

export const getCurrentUser = async (): Promise<User | null> => {
  const { data: { user } } = await getSupabase().auth.getUser();
  return user;
};

export const isAuthenticated = async (): Promise<boolean> => {
  const { data: { session } } = await getSupabase().auth.getSession();
  return !!session;
};

export const onAuthStateChange = (callback: (user: User | null) => void) => 
  getSupabase().auth.onAuthStateChange((event: AuthChangeEvent, session: Session | null) => 
    callback(session?.user ?? null)
  );

export const signOut = async (): Promise<void> => {
  await getSupabase().auth.signOut();
};

// ============================================================================
// PROFILE
// ============================================================================

export const getProfile = async (userId?: string): Promise<UserProfile | null> => {
  const supabase = getSupabase();
  let targetUserId = userId;
  
  if (!targetUserId) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    targetUserId = user.id;
  }

  const { data, error } = await supabase.from('profiles').select('*').eq('id', targetUserId).single();
  return error ? null : transformProfile(data);
};

export const updateProfile = async (updates: Partial<UserProfile>): Promise<boolean> => {
  const supabase = getSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  const dbUpdates: Record<string, any> = {};
  if (updates.name !== undefined) dbUpdates.full_name = updates.name;
  if (updates.username !== undefined) dbUpdates.username = updates.username;
  if (updates.avatar !== undefined) dbUpdates.avatar_url = updates.avatar;
  if (updates.bio !== undefined) dbUpdates.bio = updates.bio;

  const { error } = await supabase.from('profiles').update(dbUpdates).eq('id', user.id);
  return !error;
};

export const getUserStats = async (userId?: string) => {
  const supabase = getSupabase();
  let targetUserId = userId;
  
  if (!targetUserId) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { followers: 0, following: 0, posts: 0 };
    targetUserId = user.id;
  }

  const [followersResult, followingResult, postsResult] = await Promise.all([
    supabase.from('follows').select('id', { count: 'exact', head: true }).eq('following_id', targetUserId),
    supabase.from('follows').select('id', { count: 'exact', head: true }).eq('follower_id', targetUserId),
    supabase.from('wallpapers').select('id', { count: 'exact', head: true }).eq('user_id', targetUserId),
  ]);

  return {
    followers: followersResult.count || 0,
    following: followingResult.count || 0,
    posts: postsResult.count || 0,
  };
};

export const searchProfiles = async (query: string, page = 0, pageSize = 20) => {
  const supabase = getSupabase();
  const start = page * pageSize;
  const end = start + pageSize - 1;

  const { data, error, count } = await supabase
    .from('profiles')
    .select('*', { count: 'exact' })
    .or(`username.ilike.%${query}%,full_name.ilike.%${query}%`)
    .range(start, end);

  if (error) throw new Error(error.message);

  return {
    profiles: data ? data.map(transformProfile) : [],
    hasMore: end < (count || 0) - 1,
    total: count || 0,
  };
};

// ============================================================================
// FOLLOW
// ============================================================================

export const checkIsFollowing = (currentUserId: string, targetUserId: string) => 
  checkUserAction('follows', targetUserId, currentUserId);

export const followUser = async (targetUserId: string): Promise<boolean> => {
  const supabase = getSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  const { error } = await supabase.from('follows').insert({ follower_id: user.id, following_id: targetUserId });
  return !error;
};

export const unfollowUser = async (targetUserId: string): Promise<boolean> => {
  const supabase = getSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  const { error } = await supabase.from('follows').delete().eq('follower_id', user.id).eq('following_id', targetUserId);
  return !error;
};

export const toggleFollow = async (targetUserId: string): Promise<boolean> => {
  const supabase = getSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  const isFollowing = await checkIsFollowing(user.id, targetUserId);
  return isFollowing ? await unfollowUser(targetUserId) : await followUser(targetUserId);
};

const fetchFollowList = async (type: 'followers' | 'following', userId?: string, page = 0, pageSize = 20) => {
  const supabase = getSupabase();
  let targetUserId = userId;
  
  if (!targetUserId) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { profiles: [], hasMore: false, total: 0 };
    targetUserId = user.id;
  }

  const start = page * pageSize;
  const end = start + pageSize - 1;
  const isFollowers = type === 'followers';
  const idField = isFollowers ? 'follower_id' : 'following_id';
  const fkName = isFollowers ? 'follows_follower_id_fkey' : 'follows_following_id_fkey';
  const filterField = isFollowers ? 'following_id' : 'follower_id';

  const { data, error, count } = await supabase
    .from('follows')
    .select(`${idField}, profiles!${fkName}(*)`, { count: 'exact' })
    .eq(filterField, targetUserId)
    .range(start, end);

  if (error) return { profiles: [], hasMore: false, total: 0 };

  return {
    profiles: data.filter((item: any) => item.profiles).map((item: any) => transformProfile(item.profiles)),
    hasMore: end < (count || 0) - 1,
    total: count || 0,
  };
};

export const getFollowers = (userId?: string, page = 0, pageSize = 20) => 
  fetchFollowList('followers', userId, page, pageSize);

export const getFollowing = (userId?: string, page = 0, pageSize = 20) => 
  fetchFollowList('following', userId, page, pageSize);

// ============================================================================
// LIKES
// ============================================================================

export const getLiked = (userId?: string, page = 0, pageSize = 24) => 
  fetchUserWallpapers('likes', userId, page, pageSize);

export const isWallpaperLiked = (wallpaperId: string, userId?: string) => 
  checkUserAction('likes', wallpaperId, userId);

export const likeWallpaper = (wallpaperId: string) => 
  toggleAction('likes', wallpaperId, 'increment_likes', 'decrement_likes');

export const unlikeWallpaper = likeWallpaper; // Same as toggle

export const toggleLike = likeWallpaper; // Simplified to single function

// ============================================================================
// SAVED/BOOKMARKS
// ============================================================================

export const getSaved = (userId?: string, page = 0, pageSize = 24) => 
  fetchUserWallpapers('bookmarks', userId, page, pageSize);

export const isWallpaperSaved = (wallpaperId: string, userId?: string) => 
  checkUserAction('bookmarks', wallpaperId, userId);

export const saveWallpaper = (wallpaperId: string) => 
  toggleAction('bookmarks', wallpaperId);

export const unsaveWallpaper = saveWallpaper; // Same as toggle

export const toggleSave = saveWallpaper; // Simplified to single function

// ============================================================================
// DOWNLOADS
// ============================================================================

export const getDownloaded = (userId?: string, page = 0, pageSize = 24) => 
  fetchUserWallpapers('downloads', userId, page, pageSize);

export const recordDownload = async (wallpaperId: string): Promise<boolean> => {
  const supabase = getSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  const { error } = await supabase.from('downloads').insert({ user_id: user.id, wallpaper_id: wallpaperId });
  return !error || error.code === '23505'; // Success or duplicate is OK
};

// ============================================================================
// RECENT/HISTORY
// ============================================================================

export const getRecent = (userId?: string, page = 0, pageSize = 24) => 
  fetchUserWallpapers('view_history', userId, page, pageSize);

export const recordView = async (wallpaperId: string): Promise<boolean> => {
  const supabase = getSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  // Upsert to update timestamp if already exists
  const { error } = await supabase
    .from('view_history')
    .upsert(
      { user_id: user.id, wallpaper_id: wallpaperId, viewed_at: new Date().toISOString() },
      { onConflict: 'user_id,wallpaper_id' }
    );

  return !error;
};

export const clearHistory = async (): Promise<boolean> => {
  const supabase = getSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  const { error } = await supabase.from('view_history').delete().eq('user_id', user.id);
  return !error;
};

// ============================================================================
// WALLPAPERS
// ============================================================================

export const getUserWallpapers = async (userId?: string, page = 0, pageSize = 24) => {
  const supabase = getSupabase();
  let targetUserId = userId;
  
  if (!targetUserId) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { wallpapers: [], hasMore: false, total: 0 };
    targetUserId = user.id;
  }

  const start = page * pageSize;
  const end = start + pageSize - 1;

  const { data, error, count } = await supabase
    .from('wallpapers')
    .select(`*, profiles:user_id(username,full_name,avatar_url,verified)`, { count: 'exact' })
    .eq('user_id', targetUserId)
    .order('created_at', { ascending: false })
    .range(start, end);

  if (error) throw new Error(error.message);

  return {
    wallpapers: data ? data.map(transformWallpaper) : [],
    hasMore: end < (count || 0) - 1,
    total: count || 0,
  };
};

export const deleteWallpaper = async (wallpaperId: string): Promise<boolean> => {
  const supabase = getSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  // Verify ownership
  const { data: wallpaper } = await supabase.from('wallpapers').select('user_id').eq('id', wallpaperId).single();
  if (!wallpaper || wallpaper.user_id !== user.id) return false;

  const { error } = await supabase.from('wallpapers').delete().eq('id', wallpaperId);
  return !error;
};

// ============================================================================
// EXPORTS
// ============================================================================

export type { User, Session, AuthChangeEvent };