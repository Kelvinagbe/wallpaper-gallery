'use client';

import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { getProfile, type UserProfile } from '@/lib/stores/userStore';
import type { Session, User, AuthChangeEvent } from '@supabase/supabase-js';

type AuthContextType = {
  user: User | null;
  session: Session | null;
  profile: UserProfile | null;
  isLoading: boolean;
  refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({ user: null, session: null, profile: null, isLoading: true, refreshProfile: async () => {} });

let profileCache: { data: UserProfile | null; timestamp: number; userId: string } | null = null;
const CACHE_DURATION = 5 * 60 * 1000;

export function AuthProvider({ children, initialSession }: { children: React.ReactNode; initialSession: Session | null }) {
  const [user,      setUser]      = useState<User | null>(initialSession?.user ?? null);
  const [session,   setSession]   = useState<Session | null>(initialSession);
  const [profile,   setProfile]   = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const supabase = createClient();

  const loadProfile = useCallback(async (userId: string, skipCache = false) => {
    const now = Date.now();
    if (!skipCache && profileCache?.userId === userId && (now - profileCache.timestamp) < CACHE_DURATION) {
      setProfile(profileCache.data); return;
    }
    try {
      const userProfile = await getProfile();
      profileCache = { data: userProfile, timestamp: now, userId };
      setProfile(userProfile);
    } catch { setProfile(null); }
  }, []);

  const refreshProfile = useCallback(async () => {
    if (user?.id) await loadProfile(user.id, true);
  }, [user?.id, loadProfile]);

  useEffect(() => {
    if (initialSession?.user) loadProfile(initialSession.user.id).finally(() => setIsLoading(false));
    else setIsLoading(false);

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event: AuthChangeEvent, newSession: Session | null) => {
      const newUser = newSession?.user ?? null;
      setSession(newSession); setUser(newUser);
      if (newUser) {
        if (profileCache?.userId !== newUser.id) profileCache = null;
        await loadProfile(newUser.id, true);
      } else {
        setProfile(null); profileCache = null;
      }
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [initialSession, loadProfile, supabase]);

  return <AuthContext.Provider value={{ user, session, profile, isLoading, refreshProfile }}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};