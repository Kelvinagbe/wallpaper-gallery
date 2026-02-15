'use client';

import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { getProfile, type UserProfile } from '@/lib/stores/userStore';
import type { Session, User } from '@supabase/supabase-js';

type AuthContextType = {
  user: User | null;
  session: Session | null;
  profile: UserProfile | null;
  isLoading: boolean;
  refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  profile: null,
  isLoading: true,
  refreshProfile: async () => {},
});

// Cache for profile data
let profileCache: { data: UserProfile | null; timestamp: number; userId: string } | null = null;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export function AuthProvider({ 
  children, 
  initialSession 
}: { 
  children: React.ReactNode;
  initialSession: Session | null;
}) {
  const [user, setUser] = useState<User | null>(initialSession?.user ?? null);
  const [session, setSession] = useState<Session | null>(initialSession);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const supabase = createClient();

  const loadProfile = useCallback(async (userId: string, skipCache = false) => {
    // Check cache first
    const now = Date.now();
    if (
      !skipCache && 
      profileCache && 
      profileCache.userId === userId &&
      (now - profileCache.timestamp) < CACHE_DURATION
    ) {
      setProfile(profileCache.data);
      return;
    }

    try {
      // Fetch fresh data
      const userProfile = await getProfile();
      profileCache = { data: userProfile, timestamp: now, userId };
      setProfile(userProfile);
    } catch (error) {
      console.error('Error loading profile:', error);
      setProfile(null);
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    if (user?.id) {
      await loadProfile(user.id, true); // Force refresh, skip cache
    }
  }, [user?.id, loadProfile]);

  useEffect(() => {
    // Load profile immediately if we have a session
    if (initialSession?.user) {
      loadProfile(initialSession.user.id).finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        const newUser = newSession?.user ?? null;
        
        setSession(newSession);
        setUser(newUser);

        if (newUser) {
          // Clear cache if different user
          if (profileCache && profileCache.userId !== newUser.id) {
            profileCache = null;
          }
          await loadProfile(newUser.id, true); // Fresh load on auth change
        } else {
          setProfile(null);
          profileCache = null;
        }
        
        setIsLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, [initialSession, loadProfile, supabase]);

  return (
    <AuthContext.Provider value={{ user, session, profile, isLoading, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};