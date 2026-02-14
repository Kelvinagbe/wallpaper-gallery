// lib/stores/wallpaperStore.ts
import { createClient } from '@/lib/supabase/client';
import type { Wallpaper, UserProfile } from '@/app/types';

const supabase = createClient();

// Optimized page size
const DEFAULT_PAGE_SIZE = 20;

// Transform wallpaper from DB to app format
const transformWallpaper = (wp: any): Wallpaper => ({
  id: wp.id,
  url: wp.image_url,
  thumbnail: wp.thumbnail_url || wp.image_url,
  title: wp.title,
  description: wp.description || '',
  tags: wp.tags || [],
  downloads: wp.downloads || 0,
  likes: 0,
  views: wp.views || 0,
  uploadedBy: wp.profiles?.full_name || wp.profiles?.username || 'Unknown',
  userId: wp.user_id,
  userAvatar: wp.profiles?.avatar_url || 'https://avatar.iran.liara.run/public',
  aspectRatio: 1.5,
  verified: wp.profiles?.verified || false,
  createdAt: wp.created_at,
  category: wp.category || 'Other',
});

// Transform profile from DB to app format
const transformProfile = (p: any): UserProfile => ({
  id: p.id,
  name: p.full_name || p.username || 'User',
  username: p.username || '@user',
  avatar: p.avatar_url || 'https://avatar.iran.liara.run/public',
  bio: p.bio || '',
  verified: p.verified || false,
  createdAt: p.created_at,
  followers: 0,
  following: 0,
  posts: 0,
  isFollowing: false,
});

// Base wallpaper query with profile join
const baseWallpaperQuery = () => 
  supabase.from('wallpapers').select(`
    *,
    profiles:user_id(username,full_name,avatar_url,verified)
  `);

// Fetch paginated wallpapers (optimized)
export const fetchWallpapers = async (page = 0, pageSize = DEFAULT_PAGE_SIZE) => {
  console.log(`🔍 Fetching wallpapers - Page ${page}, Size ${pageSize}`);
  
  const start = page * pageSize;
  const end = start + pageSize - 1;
  
  const { data, error, count } = await supabase
    .from('wallpapers')
    .select(`
      *,
      profiles:user_id(username,full_name,avatar_url,verified)
    `, { count: 'exact' })
    .eq('is_public', true)
    .order('created_at', { ascending: false })
    .range(start, end);
  
  if (error) {
    console.error('❌ Error fetching wallpapers:', error);
    return { wallpapers: [], hasMore: false, total: 0 };
  }
  
  if (!data || data.length === 0) {
    console.warn('⚠️ No wallpapers found');
    return { wallpapers: [], hasMore: false, total: count || 0 };
  }
  
  console.log(`✅ Found ${data.length} wallpapers (Total: ${count})`);
  
  return {
    wallpapers: data.map(transformWallpaper),
    hasMore: end < (count || 0) - 1,
    total: count || 0,
  };
};

// Fetch by category (paginated)
export const fetchWallpapersByCategory = async (
  category: string, 
  page = 0, 
  pageSize = DEFAULT_PAGE_SIZE
) => {
  const start = page * pageSize;
  const end = start + pageSize - 1;
  
  const { data, error, count } = await supabase
    .from('wallpapers')
    .select(`
      *,
      profiles:user_id(username,full_name,avatar_url,verified)
    `, { count: 'exact' })
    .eq('is_public', true)
    .eq('category', category)
    .order('created_at', { ascending: false })
    .range(start, end);
  
  return {
    wallpapers: error ? [] : data.map(transformWallpaper),
    hasMore: !error && end < (count || 0) - 1,
    total: count || 0,
  };
};

// Fetch by tags (paginated)
export const fetchWallpapersByTags = async (
  tags: string[], 
  page = 0, 
  pageSize = DEFAULT_PAGE_SIZE
) => {
  const start = page * pageSize;
  const end = start + pageSize - 1;
  
  const { data, error, count } = await supabase
    .from('wallpapers')
    .select(`
      *,
      profiles:user_id(username,full_name,avatar_url,verified)
    `, { count: 'exact' })
    .eq('is_public', true)
    .overlaps('tags', tags)
    .order('created_at', { ascending: false })
    .range(start, end);
  
  return {
    wallpapers: error ? [] : data.map(transformWallpaper),
    hasMore: !error && end < (count || 0) - 1,
    total: count || 0,
  };
};

// Fetch trending (last 7 days, most viewed) - limited to 24
export const fetchTrendingWallpapers = async (limit = DEFAULT_PAGE_SIZE) => {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  
  const { data, error } = await supabase
    .from('wallpapers')
    .select(`
      *,
      profiles:user_id(username,full_name,avatar_url,verified)
    `)
    .eq('is_public', true)
    .gte('created_at', sevenDaysAgo.toISOString())
    .order('views', { ascending: false })
    .limit(limit);
  
  return error ? [] : data.map(transformWallpaper);
};

// Fetch user's wallpapers (paginated)
export const fetchUserWallpapers = async (
  userId: string, 
  page = 0, 
  pageSize = DEFAULT_PAGE_SIZE
) => {
  const start = page * pageSize;
  const end = start + pageSize - 1;
  
  const { data, error, count } = await supabase
    .from('wallpapers')
    .select(`
      *,
      profiles:user_id(username,full_name,avatar_url,verified)
    `, { count: 'exact' })
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .range(start, end);
  
  return {
    wallpapers: error ? [] : data.map(transformWallpaper),
    hasMore: !error && end < (count || 0) - 1,
    total: count || 0,
  };
};

// Search wallpapers (paginated)
export const searchWallpapers = async (
  query: string, 
  page = 0, 
  pageSize = DEFAULT_PAGE_SIZE
) => {
  const start = page * pageSize;
  const end = start + pageSize - 1;
  
  const { data, error, count } = await supabase
    .from('wallpapers')
    .select(`
      *,
      profiles:user_id(username,full_name,avatar_url,verified)
    `, { count: 'exact' })
    .eq('is_public', true)
    .or(`title.ilike.%${query}%,description.ilike.%${query}%`)
    .order('created_at', { ascending: false })
    .range(start, end);
  
  return {
    wallpapers: error ? [] : data.map(transformWallpaper),
    hasMore: !error && end < (count || 0) - 1,
    total: count || 0,
  };
};

// Increment views (optimized with RPC)
export const incrementViews = async (wallpaperId: string) => {
  const { error } = await supabase.rpc('increment_views', { wallpaper_id: wallpaperId });
  if (error) console.error('Error incrementing views:', error);
};

// Increment downloads (optimized with RPC)
export const incrementDownloads = async (wallpaperId: string) => {
  const { error } = await supabase.rpc('increment_downloads', { wallpaper_id: wallpaperId });
  if (error) console.error('Error incrementing downloads:', error);
};

// Fetch profile by ID
export const fetchProfile = async (userId: string) => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();
  
  return error ? null : transformProfile(data);
};

// Fetch multiple profiles (batch optimization)
export const fetchProfiles = async (userIds: string[]) => {
  if (userIds.length === 0) return [];
  
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .in('id', userIds);
  
  return error ? [] : data.map(transformProfile);
};

// Search profiles (paginated)
export const searchProfiles = async (
  query: string, 
  page = 0, 
  pageSize = 20
) => {
  const start = page * pageSize;
  const end = start + pageSize - 1;
  
  const { data, error, count } = await supabase
    .from('profiles')
    .select('*', { count: 'exact' })
    .or(`username.ilike.%${query}%,full_name.ilike.%${query}%`)
    .range(start, end);
  
  return {
    profiles: error ? [] : data.map(transformProfile),
    hasMore: !error && end < (count || 0) - 1,
    total: count || 0,
  };
};

// Get user stats (cached for 5 minutes recommended)
export const getUserCounts = async (userId: string) => {
  const [followersResult, followingResult, postsResult] = await Promise.all([
    supabase
      .from('follows')
      .select('id', { count: 'exact', head: true })
      .eq('following_id', userId),
    supabase
      .from('follows')
      .select('id', { count: 'exact', head: true })
      .eq('follower_id', userId),
    supabase
      .from('wallpapers')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId),
  ]);
  
  return {
    followers: followersResult.count || 0,
    following: followingResult.count || 0,
    posts: postsResult.count || 0,
  };
};

// Check if following user
export const checkIsFollowing = async (currentUserId: string, targetUserId: string) => {
  const { data } = await supabase
    .from('follows')
    .select('id')
    .eq('follower_id', currentUserId)
    .eq('following_id', targetUserId)
    .maybeSingle();
  
  return !!data;
};

// Subscribe to new wallpapers (real-time)
export const subscribeToWallpapers = (callback: (wallpaper: Wallpaper) => void) => {
  const channel = supabase
    .channel('wallpapers-changes')
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'wallpapers',
        filter: 'is_public=eq.true',
      },
      async (payload) => {
        // Fetch full wallpaper with profile
        const { data } = await supabase
          .from('wallpapers')
          .select(`
            *,
            profiles:user_id(username,full_name,avatar_url,verified)
          `)
          .eq('id', payload.new.id)
          .single();
        
        if (data) {
          callback(transformWallpaper(data));
        }
      }
    )
    .subscribe();
  
  return () => {
    supabase.removeChannel(channel);
  };
};
