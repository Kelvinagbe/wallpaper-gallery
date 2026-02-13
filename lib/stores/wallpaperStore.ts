
import { createClient } from '@/lib/supabase/client';
import type { Wallpaper, UserProfile } from '@/types';

const supabase = createClient();

// ============================================
// WALLPAPERS
// ============================================

/**
 * Fetch all public wallpapers with stats
 */
export const fetchWallpapers = async (limit = 24, offset = 0) => {
  const { data, error } = await supabase
    .from('wallpapers_with_stats')
    .select('*')
    .eq('is_public', true)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    console.error('Error fetching wallpapers:', error);
    return [];
  }

  return data.map(transformWallpaper);
};

/**
 * Fetch wallpapers by category
 */
export const fetchWallpapersByCategory = async (category: string, limit = 24) => {
  const { data, error } = await supabase
    .from('wallpapers_with_stats')
    .select('*')
    .eq('is_public', true)
    .eq('category', category)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error fetching wallpapers by category:', error);
    return [];
  }

  return data.map(transformWallpaper);
};

/**
 * Fetch wallpapers by tags
 */
export const fetchWallpapersByTags = async (tags: string[], limit = 24) => {
  const { data, error } = await supabase
    .from('wallpapers_with_stats')
    .select('*')
    .eq('is_public', true)
    .overlaps('tags', tags)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error fetching wallpapers by tags:', error);
    return [];
  }

  return data.map(transformWallpaper);
};

/**
 * Fetch trending wallpapers (most liked/downloaded in last 7 days)
 */
export const fetchTrendingWallpapers = async (limit = 24) => {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const { data, error } = await supabase
    .from('wallpapers_with_stats')
    .select('*')
    .eq('is_public', true)
    .gte('created_at', sevenDaysAgo.toISOString())
    .order('like_count', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error fetching trending wallpapers:', error);
    return [];
  }

  return data.map(transformWallpaper);
};

/**
 * Fetch wallpapers by user ID
 */
export const fetchUserWallpapers = async (userId: string, limit = 24) => {
  const { data, error } = await supabase
    .from('wallpapers_with_stats')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error fetching user wallpapers:', error);
    return [];
  }

  return data.map(transformWallpaper);
};

/**
 * Search wallpapers by title or description
 */
export const searchWallpapers = async (query: string, limit = 24) => {
  const { data, error } = await supabase
    .from('wallpapers_with_stats')
    .select('*')
    .eq('is_public', true)
    .or(`title.ilike.%${query}%,description.ilike.%${query}%`)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error searching wallpapers:', error);
    return [];
  }

  return data.map(transformWallpaper);
};

/**
 * Increment view count
 */
export const incrementViews = async (wallpaperId: string) => {
  const { error } = await supabase.rpc('increment_views', {
    wallpaper_id: wallpaperId
  });

  if (error) {
    console.error('Error incrementing views:', error);
  }
};

/**
 * Increment download count
 */
export const incrementDownloads = async (wallpaperId: string) => {
  const { error } = await supabase.rpc('increment_downloads', {
    wallpaper_id: wallpaperId
  });

  if (error) {
    console.error('Error incrementing downloads:', error);
  }
};

// ============================================
// USER PROFILES
// ============================================

/**
 * Fetch user profile by ID
 */
export const fetchProfile = async (userId: string) => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) {
    console.error('Error fetching profile:', error);
    return null;
  }

  return transformProfile(data);
};

/**
 * Fetch multiple user profiles
 */
export const fetchProfiles = async (userIds: string[]) => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .in('id', userIds);

  if (error) {
    console.error('Error fetching profiles:', error);
    return [];
  }

  return data.map(transformProfile);
};

/**
 * Search profiles by username or name
 */
export const searchProfiles = async (query: string, limit = 20) => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .or(`username.ilike.%${query}%,full_name.ilike.%${query}%`)
    .limit(limit);

  if (error) {
    console.error('Error searching profiles:', error);
    return [];
  }

  return data.map(transformProfile);
};

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Transform database wallpaper to app format
 */
function transformWallpaper(dbWallpaper: any): Wallpaper {
  return {
    id: dbWallpaper.id,
    url: dbWallpaper.image_url,
    thumbnail: dbWallpaper.thumbnail_url || dbWallpaper.image_url,
    title: dbWallpaper.title,
    description: dbWallpaper.description || '',
    tags: dbWallpaper.tags || [],
    downloads: dbWallpaper.downloads || 0,
    likes: dbWallpaper.like_count || 0,
    views: dbWallpaper.views || 0,
    uploadedBy: dbWallpaper.full_name || dbWallpaper.username || 'Unknown',
    userId: dbWallpaper.user_id,
    userAvatar: dbWallpaper.avatar_url || '',
    aspectRatio: 1.5, // Default aspect ratio
    verified: dbWallpaper.verified || false,
    createdAt: dbWallpaper.created_at,
    category: dbWallpaper.category || 'Other',
  };
}

/**
 * Transform database profile to app format
 */
function transformProfile(dbProfile: any): UserProfile {
  return {
    id: dbProfile.id,
    name: dbProfile.full_name || dbProfile.username,
    username: dbProfile.username,
    avatar: dbProfile.avatar_url || 'https://i.pravatar.cc/150',
    bio: dbProfile.bio || '',
    verified: dbProfile.verified || false,
    createdAt: dbProfile.created_at,
    // These need to be fetched separately or added to the view
    followers: 0,
    following: 0,
    posts: 0,
    isFollowing: false,
  };
}

/**
 * Get counts for a user (followers, following, posts)
 */
export const getUserCounts = async (userId: string) => {
  const [followersResult, followingResult, postsResult] = await Promise.all([
    supabase.from('follows').select('id', { count: 'exact' }).eq('following_id', userId),
    supabase.from('follows').select('id', { count: 'exact' }).eq('follower_id', userId),
    supabase.from('wallpapers').select('id', { count: 'exact' }).eq('user_id', userId),
  ]);

  return {
    followers: followersResult.count || 0,
    following: followingResult.count || 0,
    posts: postsResult.count || 0,
  };
};

/**
 * Check if current user is following another user
 */
export const checkIsFollowing = async (currentUserId: string, targetUserId: string) => {
  const { data } = await supabase
    .from('follows')
    .select('id')
    .eq('follower_id', currentUserId)
    .eq('following_id', targetUserId)
    .maybeSingle();

  return !!data;
};