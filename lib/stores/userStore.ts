// lib/stores/userStore.ts
import { createClient } from '@/lib/supabase/client';
import type { 
  User, 
  AuthChangeEvent, 
  Session 
} from '@supabase/supabase-js';
import type { Wallpaper } from '@/app/types';

// Create singleton instance
let supabaseInstance: ReturnType<typeof createClient> | null = null;
const getSupabase = () => {
  if (!supabaseInstance) {
    supabaseInstance = createClient();
  }
  return supabaseInstance;
};

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
// HELPER FUNCTIONS
// ============================================================================

/**
 * Transform wallpaper from DB to app format
 */
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

/**
 * Transform profile from DB to app format
 */
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

// ============================================================================
// AUTH FUNCTIONS
// ============================================================================

/**
 * Get current user
 */
export const getCurrentUser = async (): Promise<User | null> => {
  const supabase = getSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  return user;
};

/**
 * Check if user is authenticated
 */
export const isAuthenticated = async (): Promise<boolean> => {
  const supabase = getSupabase();
  const { data: { session } } = await supabase.auth.getSession();
  return !!session;
};

/**
 * Listen for auth state changes
 */
export const onAuthStateChange = (callback: (user: User | null) => void) => {
  const supabase = getSupabase();
  
  return supabase.auth.onAuthStateChange(
    (event: AuthChangeEvent, session: Session | null) => {
      callback(session?.user ?? null);
    }
  );
};

/**
 * Sign out user
 */
export const signOut = async (): Promise<void> => {
  const supabase = getSupabase();
  await supabase.auth.signOut();
};

// ============================================================================
// PROFILE FUNCTIONS
// ============================================================================

/**
 * Get current user profile
 */
export const getProfile = async (userId?: string): Promise<UserProfile | null> => {
  const supabase = getSupabase();
  
  let targetUserId = userId;
  if (!targetUserId) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    targetUserId = user.id;
  }

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', targetUserId)
    .single();

  if (error) {
    console.error('Error fetching profile:', error);
    return null;
  }

  return transformProfile(data);
};

/**
 * Update user profile
 */
export const updateProfile = async (updates: Partial<UserProfile>): Promise<boolean> => {
  const supabase = getSupabase();
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  const dbUpdates: Record<string, any> = {};
  if (updates.name !== undefined) dbUpdates.full_name = updates.name;
  if (updates.username !== undefined) dbUpdates.username = updates.username;
  if (updates.avatar !== undefined) dbUpdates.avatar_url = updates.avatar;
  if (updates.bio !== undefined) dbUpdates.bio = updates.bio;

  const { error } = await supabase
    .from('profiles')
    .update(dbUpdates)
    .eq('id', user.id);

  if (error) {
    console.error('Error updating profile:', error);
    return false;
  }

  return true;
};

/**
 * Get user stats
 */
export const getUserStats = async (userId?: string) => {
  const supabase = getSupabase();
  
  let targetUserId = userId;
  if (!targetUserId) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { followers: 0, following: 0, posts: 0 };
    targetUserId = user.id;
  }

  const [followersResult, followingResult, postsResult] = await Promise.all([
    supabase
      .from('follows')
      .select('id', { count: 'exact', head: true })
      .eq('following_id', targetUserId),
    supabase
      .from('follows')
      .select('id', { count: 'exact', head: true })
      .eq('follower_id', targetUserId),
    supabase
      .from('wallpapers')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', targetUserId),
  ]);

  return {
    followers: followersResult.count || 0,
    following: followingResult.count || 0,
    posts: postsResult.count || 0,
  };
};

/**
 * Search profiles
 */
export const searchProfiles = async (
  query: string, 
  page = 0, 
  pageSize = 20
) => {
  const supabase = getSupabase();
  const start = page * pageSize;
  const end = start + pageSize - 1;

  const { data, error, count } = await supabase
    .from('profiles')
    .select('*', { count: 'exact' })
    .or(`username.ilike.%${query}%,full_name.ilike.%${query}%`)
    .range(start, end);

  if (error) {
    console.error('Error searching profiles:', error);
    throw new Error(error.message);
  }

  return {
    profiles: data ? data.map(transformProfile) : [],
    hasMore: data && end < (count || 0) - 1,
    total: count || 0,
  };
};

// ============================================================================
// FOLLOW FUNCTIONS
// ============================================================================

/**
 * Check if following user
 */
export const checkIsFollowing = async (
  currentUserId: string, 
  targetUserId: string
): Promise<boolean> => {
  const supabase = getSupabase();
  
  const { data } = await supabase
    .from('follows')
    .select('id')
    .eq('follower_id', currentUserId)
    .eq('following_id', targetUserId)
    .maybeSingle();

  return !!data;
};

/**
 * Follow a user
 */
export const followUser = async (targetUserId: string): Promise<boolean> => {
  const supabase = getSupabase();
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  const { error } = await supabase
    .from('follows')
    .insert({ 
      follower_id: user.id, 
      following_id: targetUserId 
    });

  if (error) {
    console.error('Error following user:', error);
    return false;
  }

  return true;
};

/**
 * Unfollow a user
 */
export const unfollowUser = async (targetUserId: string): Promise<boolean> => {
  const supabase = getSupabase();
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  const { error } = await supabase
    .from('follows')
    .delete()
    .eq('follower_id', user.id)
    .eq('following_id', targetUserId);

  if (error) {
    console.error('Error unfollowing user:', error);
    return false;
  }

  return true;
};

/**
 * Toggle follow status
 */
export const toggleFollow = async (targetUserId: string): Promise<boolean> => {
  const supabase = getSupabase();
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  const isFollowing = await checkIsFollowing(user.id, targetUserId);
  
  if (isFollowing) {
    return await unfollowUser(targetUserId);
  } else {
    return await followUser(targetUserId);
  }
};

/**
 * Get followers list
 */
export const getFollowers = async (
  userId?: string, 
  page = 0, 
  pageSize = 20
) => {
  const supabase = getSupabase();
  
  let targetUserId = userId;
  if (!targetUserId) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { profiles: [], hasMore: false, total: 0 };
    targetUserId = user.id;
  }

  const start = page * pageSize;
  const end = start + pageSize - 1;

  const { data, error, count } = await supabase
    .from('follows')
    .select(`
      follower_id,
      profiles!follows_follower_id_fkey(*)
    `, { count: 'exact' })
    .eq('following_id', targetUserId)
    .range(start, end);

  if (error) {
    console.error('Error fetching followers:', error);
    return { profiles: [], hasMore: false, total: 0 };
  }

  return {
    profiles: data
      .filter((item: any) => item.profiles)
      .map((item: any) => transformProfile(item.profiles)),
    hasMore: data && end < (count || 0) - 1,
    total: count || 0,
  };
};

/**
 * Get following list
 */
export const getFollowing = async (
  userId?: string, 
  page = 0, 
  pageSize = 20
) => {
  const supabase = getSupabase();
  
  let targetUserId = userId;
  if (!targetUserId) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { profiles: [], hasMore: false, total: 0 };
    targetUserId = user.id;
  }

  const start = page * pageSize;
  const end = start + pageSize - 1;

  const { data, error, count } = await supabase
    .from('follows')
    .select(`
      following_id,
      profiles!follows_following_id_fkey(*)
    `, { count: 'exact' })
    .eq('follower_id', targetUserId)
    .range(start, end);

  if (error) {
    console.error('Error fetching following:', error);
    return { profiles: [], hasMore: false, total: 0 };
  }

  return {
    profiles: data
      .filter((item: any) => item.profiles)
      .map((item: any) => transformProfile(item.profiles)),
    hasMore: data && end < (count || 0) - 1,
    total: count || 0,
  };
};

// ============================================================================
// LIKES FUNCTIONS
// ============================================================================

/**
 * Get user's liked wallpapers
 */
export const getLiked = async (
  userId?: string, 
  page = 0, 
  pageSize = 24
): Promise<{ wallpapers: Wallpaper[]; hasMore: boolean; total: number }> => {
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
    .from('likes')
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
    console.error('Error fetching liked wallpapers:', error);
    return { wallpapers: [], hasMore: false, total: 0 };
  }

  const wallpapers = data
    .filter((item: any) => item.wallpapers)
    .map((item: any) => transformWallpaper(item.wallpapers));

  return {
    wallpapers,
    hasMore: data && end < (count || 0) - 1,
    total: count || 0,
  };
};

/**
 * Check if wallpaper is liked by user
 */
export const isWallpaperLiked = async (
  wallpaperId: string, 
  userId?: string
): Promise<boolean> => {
  const supabase = getSupabase();
  
  let targetUserId = userId;
  if (!targetUserId) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;
    targetUserId = user.id;
  }

  const { data } = await supabase
    .from('likes')
    .select('id')
    .eq('user_id', targetUserId)
    .eq('wallpaper_id', wallpaperId)
    .maybeSingle();

  return !!data;
};

/**
 * Like a wallpaper
 */
export const likeWallpaper = async (wallpaperId: string): Promise<boolean> => {
  const supabase = getSupabase();
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  // Check if already liked
  const alreadyLiked = await isWallpaperLiked(wallpaperId, user.id);
  if (alreadyLiked) return true;

  const { error } = await supabase
    .from('likes')
    .insert({ 
      user_id: user.id, 
      wallpaper_id: wallpaperId 
    });

  if (error) {
    console.error('Error liking wallpaper:', error);
    return false;
  }

  // Increment likes count
  await supabase.rpc('increment_likes', { wallpaper_id: wallpaperId });

  return true;
};

/**
 * Unlike a wallpaper
 */
export const unlikeWallpaper = async (wallpaperId: string): Promise<boolean> => {
  const supabase = getSupabase();
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  const { error } = await supabase
    .from('likes')
    .delete()
    .eq('user_id', user.id)
    .eq('wallpaper_id', wallpaperId);

  if (error) {
    console.error('Error unliking wallpaper:', error);
    return false;
  }

  // Decrement likes count
  await supabase.rpc('decrement_likes', { wallpaper_id: wallpaperId });

  return true;
};

/**
 * Toggle like on a wallpaper
 */
export const toggleLike = async (wallpaperId: string): Promise<boolean> => {
  const supabase = getSupabase();
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  const isLiked = await isWallpaperLiked(wallpaperId, user.id);
  
  if (isLiked) {
    return await unlikeWallpaper(wallpaperId);
  } else {
    return await likeWallpaper(wallpaperId);
  }
};

// ============================================================================
// DOWNLOADS FUNCTIONS
// ============================================================================

/**
 * Get user's downloaded wallpapers
 */
export const getDownloaded = async (
  userId?: string, 
  page = 0, 
  pageSize = 24
): Promise<{ wallpapers: Wallpaper[]; hasMore: boolean; total: number }> => {
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
    .from('downloads')
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
    console.error('Error fetching downloaded wallpapers:', error);
    return { wallpapers: [], hasMore: false, total: 0 };
  }

  const wallpapers = data
    .filter((item: any) => item.wallpapers)
    .map((item: any) => transformWallpaper(item.wallpapers));

  return {
    wallpapers,
    hasMore: data && end < (count || 0) - 1,
    total: count || 0,
  };
};

/**
 * Record a download
 */
export const recordDownload = async (wallpaperId: string): Promise<boolean> => {
  const supabase = getSupabase();
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  const { error } = await supabase
    .from('downloads')
    .insert({ 
      user_id: user.id, 
      wallpaper_id: wallpaperId 
    });

  if (error && error.code !== '23505') { // Ignore duplicate key errors
    console.error('Error recording download:', error);
    return false;
  }

  return true;
};

// ============================================================================
// WALLPAPER FUNCTIONS
// ============================================================================

/**
 * Get user's uploaded wallpapers
 */
export const getUserWallpapers = async (
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
    .from('wallpapers')
    .select(`
      *,
      profiles:user_id(username,full_name,avatar_url,verified)
    `, { count: 'exact' })
    .eq('user_id', targetUserId)
    .order('created_at', { ascending: false })
    .range(start, end);

  if (error) {
    console.error('Error fetching user wallpapers:', error);
    throw new Error(error.message);
  }

  return {
    wallpapers: data ? data.map(transformWallpaper) : [],
    hasMore: data && end < (count || 0) - 1,
    total: count || 0,
  };
};

/**
 * Delete a wallpaper
 */
export const deleteWallpaper = async (wallpaperId: string): Promise<boolean> => {
  const supabase = getSupabase();
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  // Verify ownership
  const { data: wallpaper } = await supabase
    .from('wallpapers')
    .select('user_id')
    .eq('id', wallpaperId)
    .single();

  if (!wallpaper || wallpaper.user_id !== user.id) {
    console.error('Not authorized to delete this wallpaper');
    return false;
  }

  const { error } = await supabase
    .from('wallpapers')
    .delete()
    .eq('id', wallpaperId);

  if (error) {
    console.error('Error deleting wallpaper:', error);
    return false;
  }

  return true;
};

// ============================================================================
// EXPORT ALL
// ============================================================================

export type { User, Session, AuthChangeEvent };