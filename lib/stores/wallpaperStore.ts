// lib/stores/wallpaperStore.ts
import { createClient } from '@/lib/supabase/client';
import type { Wallpaper, UserProfile } from '@/app/types';

const supabase = createClient();

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
const baseWallpaperQuery = () => supabase.from('wallpapers').select(`*,profiles:user_id(username,full_name,avatar_url,verified)`);

// Fetch all public wallpapers
export const fetchWallpapers = async (limit = 50, offset = 0) => {
  console.log('🔍 Fetching wallpapers...');
  const { data, error } = await baseWallpaperQuery().eq('is_public', true).order('created_at', { ascending: false }).range(offset, offset + limit - 1);
  console.log('📊 Data:', data, '❌ Error:', error);
  if (error) { console.error('Error:', error); return []; }
  if (!data || data.length === 0) { console.warn('⚠️ No wallpapers'); return []; }
  console.log(`✅ Found ${data.length} wallpapers`);
  return data.map(transformWallpaper);
};

// Fetch by category
export const fetchWallpapersByCategory = async (category: string, limit = 24) => {
  const { data, error } = await baseWallpaperQuery().eq('is_public', true).eq('category', category).order('created_at', { ascending: false }).limit(limit);
  return error ? [] : data.map(transformWallpaper);
};

// Fetch by tags
export const fetchWallpapersByTags = async (tags: string[], limit = 24) => {
  const { data, error } = await baseWallpaperQuery().eq('is_public', true).overlaps('tags', tags).order('created_at', { ascending: false }).limit(limit);
  return error ? [] : data.map(transformWallpaper);
};

// Fetch trending (last 7 days, most viewed)
export const fetchTrendingWallpapers = async (limit = 24) => {
  const sevenDaysAgo = new Date(); sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const { data, error } = await baseWallpaperQuery().eq('is_public', true).gte('created_at', sevenDaysAgo.toISOString()).order('views', { ascending: false }).limit(limit);
  return error ? [] : data.map(transformWallpaper);
};

// Fetch user's wallpapers
export const fetchUserWallpapers = async (userId: string, limit = 24) => {
  const { data, error } = await baseWallpaperQuery().eq('user_id', userId).order('created_at', { ascending: false }).limit(limit);
  return error ? [] : data.map(transformWallpaper);
};

// Search wallpapers
export const searchWallpapers = async (query: string, limit = 24) => {
  const { data, error } = await baseWallpaperQuery().eq('is_public', true).or(`title.ilike.%${query}%,description.ilike.%${query}%`).order('created_at', { ascending: false }).limit(limit);
  return error ? [] : data.map(transformWallpaper);
};

// Increment views
export const incrementViews = async (wallpaperId: string) => {
  const { error } = await supabase.rpc('increment_views', { wallpaper_id: wallpaperId });
  if (error) console.error('Error incrementing views:', error);
};

// Increment downloads
export const incrementDownloads = async (wallpaperId: string) => {
  const { error } = await supabase.rpc('increment_downloads', { wallpaper_id: wallpaperId });
  if (error) console.error('Error incrementing downloads:', error);
};

// Fetch profile by ID
export const fetchProfile = async (userId: string) => {
  const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single();
  return error ? null : transformProfile(data);
};

// Fetch multiple profiles
export const fetchProfiles = async (userIds: string[]) => {
  const { data, error } = await supabase.from('profiles').select('*').in('id', userIds);
  return error ? [] : data.map(transformProfile);
};

// Search profiles
export const searchProfiles = async (query: string, limit = 20) => {
  const { data, error } = await supabase.from('profiles').select('*').or(`username.ilike.%${query}%,full_name.ilike.%${query}%`).limit(limit);
  return error ? [] : data.map(transformProfile);
};

// Get user stats
export const getUserCounts = async (userId: string) => {
  const [followersResult, followingResult, postsResult] = await Promise.all([
    supabase.from('follows').select('id', { count: 'exact' }).eq('following_id', userId),
    supabase.from('follows').select('id', { count: 'exact' }).eq('follower_id', userId),
    supabase.from('wallpapers').select('id', { count: 'exact' }).eq('user_id', userId),
  ]);
  return { followers: followersResult.count || 0, following: followingResult.count || 0, posts: postsResult.count || 0 };
};

// Check if following user
export const checkIsFollowing = async (currentUserId: string, targetUserId: string) => {
  const { data } = await supabase.from('follows').select('id').eq('follower_id', currentUserId).eq('following_id', targetUserId).maybeSingle();
  return !!data;
};