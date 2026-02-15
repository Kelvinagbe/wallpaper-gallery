// lib/stores/userStore.ts
import { createClient } from '@/lib/supabase/client';
import type { 
  User, 
  AuthChangeEvent, 
  Session,
  AuthResponse 
} from '@supabase/supabase-js';

// Create singleton instance
let supabaseInstance: ReturnType<typeof createClient> | null = null;
const getSupabase = () => {
  if (!supabaseInstance) {
    supabaseInstance = createClient();
  }
  return supabaseInstance;
};

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

/**
 * Get current user profile
 */
export const getProfile = async (): Promise<UserProfile | null> => {
  const supabase = getSupabase();
  
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
    name: data.full_name || data.username || 'User',
    username: data.username || '@user',
    avatar: data.avatar_url || 'https://avatar.iran.liara.run/public',
    bio: data.bio || '',
    verified: data.verified || false,
    createdAt: data.created_at,
    followers: data.followers_count || 0,
    following: data.following_count || 0,
    posts: data.posts_count || 0,
    isFollowing: false,
  };
};

/**
 * Update user profile
 */
export const updateProfile = async (updates: Partial<UserProfile>): Promise<boolean> => {
  const supabase = getSupabase();
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  const dbUpdates: Record<string, any> = {};
  if (updates.name) dbUpdates.full_name = updates.name;
  if (updates.username) dbUpdates.username = updates.username;
  if (updates.avatar) dbUpdates.avatar_url = updates.avatar;
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