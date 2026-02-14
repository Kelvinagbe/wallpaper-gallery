'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { getProfile, type UserProfile } from '@/lib/stores/userStore';
import type { Session } from '@supabase/supabase-js';

type AuthContextType = {
  session: Session | null;
  profile: UserProfile | null;
  isLoading: boolean;
  refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({
  session: null,
  profile: null,
  isLoading: true,
  refreshProfile: async () => {},
});

// Cache for profile data
let profileCache: { data: UserProfile | null; timestamp: number } | null = null;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export function AuthProvider({ 
  children, 
  initialSession 
}: { 
  children: React.ReactNode;
  initialSession: Session | null;
}) {
  const [session, setSession] = useState<Session | null>(initialSession);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const supabase = createClient();

  const loadProfile = async (skipCache = false) => {
    if (!session?.user) {
      setProfile(null);
      profileCache = null;
      return;
    }

    // Check cache first
    const now = Date.now();
    if (!skipCache && profileCache && (now - profileCache.timestamp) < CACHE_DURATION) {
      setProfile(profileCache.data);
      return;
    }

    // Fetch fresh data
    const userProfile = await getProfile();
    profileCache = { data: userProfile, timestamp: now };
    setProfile(userProfile);
  };

  const refreshProfile = async () => {
    await loadProfile(true); // Force refresh, skip cache
  };

  useEffect(() => {
    // Load profile immediately if we have a session
    if (initialSession) {
      loadProfile().then(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, newSession) => {
        setSession(newSession);
        if (newSession) {
          await loadProfile(true); // Fresh load on auth change
        } else {
          setProfile(null);
          profileCache = null;
        }
        setIsLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ session, profile, isLoading, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};