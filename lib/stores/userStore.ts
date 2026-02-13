import { createClient } from '@/lib/supabase/client';

const supabase = createClient();

// ============================================
// TYPES
// ============================================

export type UserProfile = {
  id: string;
  name: string;
  username: string;
  bio: string;
  avatar: string;
  verified: boolean;
};

export type UserSettings = {
  theme: 'light' | 'dark' | 'system';
  notifications: boolean;
  soundEffects: boolean;
  autoDownload: boolean;
  language: string;
};

export type LikedWallpaper = {
  id: string;
  url: string;
  thumbnail: string;
  title: string;
  uploadedBy: string;
  likedAt: number;
};

export type SavedWallpaper = {
  id: string;
  url: string;
  thumbnail: string;
  title: string;
  uploadedBy: string;
  savedAt: number;
};

export type RecentWallpaper = {
  id: string;
  url: string;
  thumbnail: string;
  title: string;
  uploadedBy: string;
  viewedAt: number;
};

// ============================================
// PROFILE MANAGEMENT
// ============================================

/**
 * Get current user's profile from Supabase
 */
export const getProfile = async (): Promise<UserProfile | null> => {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) return null;

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (error) {
    console.error('Error fetching profile:', error);
    return null;
  }

  return {
    id: data.id,
    name: data.full_name || data.username,
    username: data.username,
    bio: data.bio || '',
    avatar: data.avatar_url || 'https://i.pravatar.cc/150',
    verified: data.verified || false,
  };
};

/**
 * Update user profile in Supabase
 */
export const updateProfile = async (partial: Partial<UserProfile>): Promise<UserProfile | null> => {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) return null;

  const updates: any = {};
  if (partial.name !== undefined) updates.full_name = partial.name;
  if (partial.username !== undefined) updates.username = partial.username;
  if (partial.bio !== undefined) updates.bio = partial.bio;
  if (partial.avatar !== undefined) updates.avatar_url = partial.avatar;

  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', user.id)
    .select()
    .single();

  if (error) {
    console.error('Error updating profile:', error);
    return null;
  }

  return {
    id: data.id,
    name: data.full_name || data.username,
    username: data.username,
    bio: data.bio || '',
    avatar: data.avatar_url || 'https://i.pravatar.cc/150',
    verified: data.verified || false,
  };
};

// ============================================
// SETTINGS (Keep in localStorage for speed)
// ============================================

const SETTINGS_KEY = 'user_settings';

const DEFAULT_SETTINGS: UserSettings = {
  theme: 'dark',
  notifications: true,
  soundEffects: true,
  autoDownload: false,
  language: 'English',
};

export const getSettings = (): UserSettings => {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS;
  
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    return raw ? JSON.parse(raw) : DEFAULT_SETTINGS;
  } catch {
    return DEFAULT_SETTINGS;
  }
};

export const saveSettings = (settings: UserSettings): void => {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch (e) {
    console.warn('Failed to save settings:', e);
  }
};

export const updateSettings = (partial: Partial<UserSettings>): UserSettings => {
  const updated = { ...getSettings(), ...partial };
  saveSettings(updated);
  return updated;
};

// ============================================
// LIKES (Stored in Supabase)
// ============================================

/**
 * Get user's liked wallpapers from Supabase
 */
export const getLiked = async (): Promise<LikedWallpaper[]> => {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) return [];

  const { data, error } = await supabase
    .from('likes')
    .select(`
      id,
      created_at,
      wallpaper:wallpapers (
        id,
        title,
        image_url,
        thumbnail_url,
        profiles (full_name, username)
      )
    `)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching likes:', error);
    return [];
  }

  return data.map((like: any) => ({
    id: like.wallpaper.id,
    url: like.wallpaper.image_url,
    thumbnail: like.wallpaper.thumbnail_url || like.wallpaper.image_url,
    title: like.wallpaper.title,
    uploadedBy: like.wallpaper.profiles?.full_name || like.wallpaper.profiles?.username || 'Unknown',
    likedAt: new Date(like.created_at).getTime(),
  }));
};

/**
 * Like a wallpaper
 */
export const likeWallpaper = async (wallpaperId: string): Promise<boolean> => {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) return false;

  const { error } = await supabase
    .from('likes')
    .insert({
      user_id: user.id,
      wallpaper_id: wallpaperId,
    });

  if (error) {
    console.error('Error liking wallpaper:', error);
    return false;
  }

  return true;
};

/**
 * Unlike a wallpaper
 */
export const unlikeWallpaper = async (wallpaperId: string): Promise<boolean> => {
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

  return true;
};

/**
 * Check if wallpaper is liked
 */
export const isLiked = async (wallpaperId: string): Promise<boolean> => {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) return false;

  const { data } = await supabase
    .from('likes')
    .select('id')
    .eq('user_id', user.id)
    .eq('wallpaper_id', wallpaperId)
    .maybeSingle();

  return !!data;
};

/**
 * Clear all likes
 */
export const clearLiked = async (): Promise<boolean> => {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) return false;

  const { error } = await supabase
    .from('likes')
    .delete()
    .eq('user_id', user.id);

  if (error) {
    console.error('Error clearing likes:', error);
    return false;
  }

  return true;
};

// ============================================
// SAVES (Stored in Supabase)
// ============================================

/**
 * Get user's saved wallpapers from Supabase
 */
export const getSaved = async (): Promise<SavedWallpaper[]> => {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) return [];

  const { data, error } = await supabase
    .from('saves')
    .select(`
      id,
      created_at,
      wallpaper:wallpapers (
        id,
        title,
        image_url,
        thumbnail_url,
        profiles (full_name, username)
      )
    `)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching saves:', error);
    return [];
  }

  return data.map((save: any) => ({
    id: save.wallpaper.id,
    url: save.wallpaper.image_url,
    thumbnail: save.wallpaper.thumbnail_url || save.wallpaper.image_url,
    title: save.wallpaper.title,
    uploadedBy: save.wallpaper.profiles?.full_name || save.wallpaper.profiles?.username || 'Unknown',
    savedAt: new Date(save.created_at).getTime(),
  }));
};

/**
 * Save a wallpaper
 */
export const saveWallpaper = async (wallpaperId: string): Promise<boolean> => {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) return false;

  const { error } = await supabase
    .from('saves')
    .insert({
      user_id: user.id,
      wallpaper_id: wallpaperId,
    });

  if (error) {
    console.error('Error saving wallpaper:', error);
    return false;
  }

  return true;
};

/**
 * Unsave a wallpaper
 */
export const unsaveWallpaper = async (wallpaperId: string): Promise<boolean> => {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) return false;

  const { error } = await supabase
    .from('saves')
    .delete()
    .eq('user_id', user.id)
    .eq('wallpaper_id', wallpaperId);

  if (error) {
    console.error('Error unsaving wallpaper:', error);
    return false;
  }

  return true;
};

/**
 * Check if wallpaper is saved
 */
export const isSaved = async (wallpaperId: string): Promise<boolean> => {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) return false;

  const { data } = await supabase
    .from('saves')
    .select('id')
    .eq('user_id', user.id)
    .eq('wallpaper_id', wallpaperId)
    .maybeSingle();

  return !!data;
};

/**
 * Clear all saves
 */
export const clearSaved = async (): Promise<boolean> => {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) return false;

  const { error } = await supabase
    .from('saves')
    .delete()
    .eq('user_id', user.id);

  if (error) {
    console.error('Error clearing saves:', error);
    return false;
  }

  return true;
};

// ============================================
// RECENT VIEWS (Keep in localStorage for performance)
// ============================================

const RECENT_KEY = 'user_recent';

export const getRecent = (): RecentWallpaper[] => {
  if (typeof window === 'undefined') return [];
  
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

export const addRecent = (wp: Omit<RecentWallpaper, 'viewedAt'>): void => {
  if (typeof window === 'undefined') return;
  
  const list = getRecent().filter(w => w.id !== wp.id);
  const updated = [{ ...wp, viewedAt: Date.now() }, ...list].slice(0, 50);
  
  try {
    localStorage.setItem(RECENT_KEY, JSON.stringify(updated));
  } catch (e) {
    console.warn('Failed to save recent view:', e);
  }
};

export const clearRecent = (): void => {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(RECENT_KEY);
};

// ============================================
// AUTHENTICATION HELPERS
// ============================================

/**
 * Get current authenticated user
 */
export const getCurrentUser = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
};

/**
 * Sign out user
 */
export const signOut = async () => {
  const { error } = await supabase.auth.signOut();
  
  if (error) {
    console.error('Error signing out:', error);
    return false;
  }

  // Clear localStorage
  if (typeof window !== 'undefined') {
    localStorage.removeItem(SETTINGS_KEY);
    localStorage.removeItem(RECENT_KEY);
  }

  return true;
};

/**
 * Listen to auth state changes
 */
export const onAuthStateChange = (callback: (user: any) => void) => {
  return supabase.auth.onAuthStateChange((event, session) => {
    callback(session?.user || null);
  });
};