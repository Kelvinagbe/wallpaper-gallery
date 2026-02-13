'use client';

import { useState } from 'react';
import { LoginScreen } from './LoginScreen';
import { SignupScreen } from './SignupScreen';

export type AuthView = 'login' | 'signup';

export const AuthUI = () => {
  const [view, setView] = useState<AuthView>('login');

  return (
    <div className="min-h-screen bg-white dark:bg-black flex items-center justify-center p-4">
      <div className="w-full max-w-[340px]">
        {view === 'login' ? (
          <LoginScreen onViewChange={setView} />
        ) : (
          <SignupScreen onViewChange={setView} />
        )}
      </div>
    </div>
  );
};
