// lib/stores/wallpaperStore.ts
import { createClient } from '@/lib/supabase/client';
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import type { Wallpaper, UserProfile, Filter } from '@/app/types';

let supabaseInstance: ReturnType<typeof createClient> | null = null;
const getSupabase = () => {
  if (!supabaseInstance) supabaseInstance = createClient();
  return supabaseInstance;
};

const DEFAULT_PAGE_SIZE = 15;

// ─── Transforms ───────────────────────────────────────────────────────────────
const transformWallpaper = (wp: any): Wallpaper => ({
  id:          wp.id,
  url:         wp.image_url,
  thumbnail:   wp.thumbnail_url || wp.image_url,
  title:       wp.title,
  description: wp.description || '',
  tags:        wp.tags || [],
  downloads:   wp.downloads || 0,
  likes:       wp.likes || 0,
  views:       wp.views || 0,
  uploadedBy:  wp.profiles?.full_name || wp.profiles?.username || 'Unknown',
  userId:      wp.user_id,
  userAvatar:  wp.profiles?.avatar_url || 'favicon.ico',
  aspectRatio: wp.aspect_ratio || 1.5,
  verified:    wp.profiles?.verified || false,
  createdAt:   wp.created_at,
  category:    wp.category || 'Other',
  type:        wp.type || 'mobile',
});

const transformProfile = (p: any): UserProfile => ({
  id:          p.id,
  name:        p.full_name || p.username || 'User',
  username:    p.username || '@user',
  avatar:      p.avatar_url || 'favicon.ico',
  bio:         p.bio || '',
  verified:    p.verified || false,
  createdAt:   p.created_at,
  followers:   p.followers_count || 0,
  following:   p.following_count || 0,
  posts:       p.posts_count || 0,
  isFollowing: false,
});

const SELECT_WALLPAPERS = `*, profiles:user_id(username,full_name,avatar_url,verified)`;

// ─── Fetch wallpapers (main feed) ─────────────────────────────────────────────
export const fetchWallpapers = async (page = 0, pageSize = 10, filter: Filter = 'all') => {
  const supabase = getSupabase();
  console.log(`🔍 Fetching wallpapers - Page ${page}, Size ${pageSize}, Filter ${filter}`);

  const start = page * pageSize;
  const end   = start + pageSize - 1;

  // 'all' uses wallpapers_hot_cache — pre-computed, no live recalculation
  const isHot = filter === 'all';

  let query = supabase
    .from(isHot ? 'wallpapers_hot_cache' : 'wallpapers')
    .select(SELECT_WALLPAPERS, { count: 'exact' });

  if (!isHot) query = query.eq('is_public', true);

  if (filter === 'trending') {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    query = query
      .gte('created_at', sevenDaysAgo.toISOString())
      .order('views', { ascending: false });
  } else if (filter === 'popular') {
    query = query.order('downloads', { ascending: false });
  } else if (filter === 'recent') {
    query = query.order('created_at', { ascending: false });
  } else {
    // 'all' — already sorted by hot_score in cache
    query = query.order('hot_score', { ascending: false });
  }

  const { data, error, count } = await query.range(start, end);

  if (error) {
    console.error('❌ Error fetching wallpapers:', error);
    // Fallback to wallpapers table if cache isn't ready yet
    if (error.message.includes('hot_score') || error.message.includes('wallpapers_hot_cache')) {
      console.warn('⚠️ wallpapers_hot_cache not ready — falling back to created_at');
      const fallback = await supabase
        .from('wallpapers')
        .select(SELECT_WALLPAPERS, { count: 'exact' })
        .eq('is_public', true)
        .order('created_at', { ascending: false })
        .range(start, end);
      if (fallback.error) throw new Error(fallback.error.message);
      return {
        wallpapers: fallback.data ? fallback.data.map(transformWallpaper) : [],
        hasMore:    end < (fallback.count || 0) - 1,
        total:      fallback.count || 0,
      };
    }
    throw new Error(error.message);
  }

  if (!data || data.length === 0) {
    console.warn('⚠️ No wallpapers found');
    return { wallpapers: [], hasMore: false, total: count || 0 };
  }

  console.log(`✅ Found ${data.length} wallpapers (Total: ${count})`);
  return {
    wallpapers: data.map(transformWallpaper),
    hasMore:    end < (count || 0) - 1,
    total:      count || 0,
  };
};

// ─── Fetch hot wallpapers (for TrendingCarousel) ──────────────────────────────
export const fetchHotWallpapers = async (limit = 10) => {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('wallpapers_hot_cache')
    .select(SELECT_WALLPAPERS)
    .order('hot_score', { ascending: false })
    .limit(limit);
  if (error) {
    console.error('❌ Error fetching hot wallpapers:', error);
    throw new Error(error.message);
  }
  return data ? data.map(transformWallpaper) : [];
};

// ─── Fetch by category ────────────────────────────────────────────────────────
export const fetchWallpapersByCategory = async (category: string, page = 0, pageSize = DEFAULT_PAGE_SIZE) => {
  const supabase = getSupabase();
  const start = page * pageSize, end = start + pageSize - 1;
  const { data, error, count } = await supabase
    .from('wallpapers')
    .select(SELECT_WALLPAPERS, { count: 'exact' })
    .eq('is_public', true)
    .eq('category', category)
    .order('created_at', { ascending: false })
    .range(start, end);
  if (error) {
    console.error('❌ Error fetching category wallpapers:', error);
    throw new Error(error.message);
  }
  return {
    wallpapers: data ? data.map(transformWallpaper) : [],
    hasMore:    data && end < (count || 0) - 1,
    total:      count || 0,
  };
};

// ─── Fetch by tags ────────────────────────────────────────────────────────────
export const fetchWallpapersByTags = async (tags: string[], page = 0, pageSize = DEFAULT_PAGE_SIZE) => {
  const supabase = getSupabase();
  const start = page * pageSize, end = start + pageSize - 1;
  const { data, error, count } = await supabase
    .from('wallpapers')
    .select(SELECT_WALLPAPERS, { count: 'exact' })
    .eq('is_public', true)
    .overlaps('tags', tags)
    .order('created_at', { ascending: false })
    .range(start, end);
  if (error) {
    console.error('❌ Error fetching wallpapers by tags:', error);
    throw new Error(error.message);
  }
  return {
    wallpapers: data ? data.map(transformWallpaper) : [],
    hasMore:    data && end < (count || 0) - 1,
    total:      count || 0,
  };
};

// ─── Fetch trending ───────────────────────────────────────────────────────────
export const fetchTrendingWallpapers = async (limit = DEFAULT_PAGE_SIZE) => {
  const supabase = getSupabase();
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const { data, error } = await supabase
    .from('wallpapers')
    .select(SELECT_WALLPAPERS)
    .eq('is_public', true)
    .gte('created_at', sevenDaysAgo.toISOString())
    .order('views', { ascending: false })
    .limit(limit);
  if (error) {
    console.error('❌ Error fetching trending:', error);
    throw new Error(error.message);
  }
  return data ? data.map(transformWallpaper) : [];
};

// ─── Fetch user wallpapers ────────────────────────────────────────────────────
export const fetchUserWallpapers = async (userId: string, page = 0, pageSize = DEFAULT_PAGE_SIZE) => {
  const supabase = getSupabase();
  const start = page * pageSize, end = start + pageSize - 1;
  const { data, error, count } = await supabase
    .from('wallpapers')
    .select(SELECT_WALLPAPERS, { count: 'exact' })
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .range(start, end);
  if (error) {
    console.error('❌ Error fetching user wallpapers:', error);
    throw new Error(error.message);
  }
  return {
    wallpapers: data ? data.map(transformWallpaper) : [],
    hasMore:    data && end < (count || 0) - 1,
    total:      count || 0,
  };
};

// ─── Search wallpapers ────────────────────────────────────────────────────────
export const searchWallpapers = async (query: string, page = 0, pageSize = DEFAULT_PAGE_SIZE) => {
  const supabase = getSupabase();
  const start = page * pageSize, end = start + pageSize - 1;
  const { data, error, count } = await supabase
    .from('wallpapers')
    .select(SELECT_WALLPAPERS, { count: 'exact' })
    .eq('is_public', true)
    .or(`title.ilike.%${query}%,description.ilike.%${query}%,tags.cs.{${query}}`)
    .order('created_at', { ascending: false })
    .range(start, end);
  if (error) {
    console.error('❌ Error searching wallpapers:', error);
    throw new Error(error.message);
  }
  return {
    wallpapers: data ? data.map(transformWallpaper) : [],
    hasMore:    data && end < (count || 0) - 1,
    total:      count || 0,
  };
};

// ─── Fetch single wallpaper ───────────────────────────────────────────────────
export const fetchWallpaperById = async (wallpaperId: string) => {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('wallpapers')
    .select(SELECT_WALLPAPERS)
    .eq('id', wallpaperId)
    .single();
  if (error) {
    console.error('❌ Error fetching wallpaper:', error);
    throw new Error(error.message);
  }
  return data ? transformWallpaper(data) : null;
};

// ─── Increment views / downloads ──────────────────────────────────────────────
export const incrementViews = async (wallpaperId: string) => {
  const { error } = await getSupabase().rpc('increment_views', { wallpaper_id: wallpaperId });
  if (error) console.error('Error incrementing views:', error);
};

export const incrementDownloads = async (wallpaperId: string) => {
  const { error } = await getSupabase().rpc('increment_downloads', { wallpaper_id: wallpaperId });
  if (error) console.error('Error incrementing downloads:', error);
};

// ─── Profiles ─────────────────────────────────────────────────────────────────
export const fetchProfile = async (userId: string) => {
  const { data, error } = await getSupabase()
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();
  if (error) { console.error('❌ Error fetching profile:', error); return null; }
  return data ? transformProfile(data) : null;
};

export const fetchProfiles = async (userIds: string[]) => {
  if (!userIds.length) return [];
  const { data, error } = await getSupabase()
    .from('profiles')
    .select('*')
    .in('id', userIds);
  if (error) { console.error('❌ Error fetching profiles:', error); return []; }
  return data ? data.map(transformProfile) : [];
};

export const searchProfiles = async (query: string, page = 0, pageSize = 10) => {
  const supabase = getSupabase();
  const start = page * pageSize, end = start + pageSize - 1;
  const { data, error, count } = await supabase
    .from('profiles')
    .select('*', { count: 'exact' })
    .or(`username.ilike.%${query}%,full_name.ilike.%${query}%`)
    .range(start, end);
  if (error) {
    console.error('❌ Error searching profiles:', error);
    throw new Error(error.message);
  }
  return {
    profiles: data ? data.map(transformProfile) : [],
    hasMore:  data && end < (count || 0) - 1,
    total:    count || 0,
  };
};

// ─── User stats ───────────────────────────────────────────────────────────────
export const getUserCounts = async (userId: string) => {
  const supabase = getSupabase();
  const [followersResult, followingResult, postsResult] = await Promise.all([
    supabase.from('follows').select('id', { count: 'exact', head: true }).eq('following_id', userId),
    supabase.from('follows').select('id', { count: 'exact', head: true }).eq('follower_id', userId),
    supabase.from('wallpapers').select('id', { count: 'exact', head: true }).eq('user_id', userId),
  ]);
  return {
    followers: followersResult.count || 0,
    following: followingResult.count || 0,
    posts:     postsResult.count || 0,
  };
};

export const checkIsFollowing = async (currentUserId: string, targetUserId: string) => {
  const { data } = await getSupabase()
    .from('follows')
    .select('id')
    .eq('follower_id', currentUserId)
    .eq('following_id', targetUserId)
    .maybeSingle();
  return !!data;
};

export const followUser = async (currentUserId: string, targetUserId: string) => {
  const { error } = await getSupabase()
    .from('follows')
    .insert({ follower_id: currentUserId, following_id: targetUserId });
  if (error) {
    console.error('❌ Error following user:', error);
    throw new Error(error.message);
  }
};

export const unfollowUser = async (currentUserId: string, targetUserId: string) => {
  const { error } = await getSupabase()
    .from('follows')
    .delete()
    .eq('follower_id', currentUserId)
    .eq('following_id', targetUserId);
  if (error) {
    console.error('❌ Error unfollowing user:', error);
    throw new Error(error.message);
  }
};

// ─── Realtime ─────────────────────────────────────────────────────────────────
export const subscribeToWallpapers = (callback: (wallpaper: Wallpaper) => void) => {
  const supabase = getSupabase();
  const channel = supabase
    .channel('wallpapers-changes')
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'wallpapers', filter: 'is_public=eq.true' },
      async (payload: RealtimePostgresChangesPayload<any>) => {
        const { data } = await supabase
          .from('wallpapers')
          .select(SELECT_WALLPAPERS)
          .eq('id', payload.new.id)
          .single();
        if (data) callback(transformWallpaper(data));
      }
    )
    .subscribe();
  return () => supabase.removeChannel(channel);
};

export const subscribeToWallpaperUpdates = (wallpaperId: string, callback: (wallpaper: Wallpaper) => void) => {
  const supabase = getSupabase();
  const channel = supabase
    .channel(`wallpaper-${wallpaperId}`)
    .on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'wallpapers', filter: `id=eq.${wallpaperId}` },
      async (payload: RealtimePostgresChangesPayload<any>) => {
        const { data } = await supabase
          .from('wallpapers')
          .select(SELECT_WALLPAPERS)
          .eq('id', payload.new.id)
          .single();
        if (data) callback(transformWallpaper(data));
      }
    )
    .subscribe();
  return () => supabase.removeChannel(channel);
};
