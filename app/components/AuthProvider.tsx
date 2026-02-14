'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Session } from '@supabase/supabase-js';

type AuthContextType = {
  session: Session | null;
  isLoading: boolean;
  user: Session['user'] | null;
};

const AuthContext = createContext<AuthContextType>({
  session: null,
  isLoading: true,
  user: null,
});

export function AuthProvider({ 
  children, 
  initialSession 
}: { 
  children: React.ReactNode;
  initialSession: Session | null;
}) {
  const [session, setSession] = useState<Session | null>(initialSession);
  const [isLoading, setIsLoading] = useState(!initialSession);
  const supabase = createClient();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        setIsLoading(false);
      }
    );

    if (initialSession) setIsLoading(false);

    return () => subscription.unsubscribe();
  }, [initialSession]);

  return (
    <AuthContext.Provider value={{ session, isLoading, user: session?.user || null }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};