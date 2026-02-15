// app/hooks/useAuth.ts
import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { getProfile, onAuthStateChange } from '@/lib/stores/userStore';
import type { UserProfile } from '@/lib/stores/userStore';
import type { User, Session } from '@supabase/supabase-js';

/**
 * Hook to get current user and profile
 */
export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();

    // Get initial session
    supabase.auth.getSession().then(({ data }: { data: { session: Session | null } }) => {
      setUser(data.session?.user ?? null);
      if (data.session?.user) {
        getProfile().then(setProfile);
      }
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = onAuthStateChange((currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        getProfile().then(setProfile);
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  return { user, profile, loading };
};