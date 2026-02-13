'use client';

import { useState } from 'react';
import { LoginScreen } from './LoginScreen';
import { SignupScreen } from './SignupScreen';
import { ForgotPasswordScreen } from './ForgotPasswordScreen';

export type AuthView = 'login' | 'signup' | 'forgot-password';

export const AuthUI = () => {
  const [view, setView] = useState<AuthView>('login');

  return (
    <>
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
        @keyframes fadeOut {
          from { opacity: 1; transform: scale(1); }
          to { opacity: 0; transform: scale(0.95); }
        }
        .auth-fade-in { animation: fadeIn 0.3s ease-out; }
        .auth-fade-out { animation: fadeOut 0.3s ease-out; }
      `}</style>

      <div className="fixed inset-0 bg-black z-50 flex items-center justify-center p-4">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{
            backgroundImage: `radial-gradient(circle at 20% 50%, rgba(120, 119, 198, 0.3), transparent 50%),
                             radial-gradient(circle at 80% 80%, rgba(255, 85, 85, 0.3), transparent 50%),
                             radial-gradient(circle at 40% 20%, rgba(88, 166, 255, 0.3), transparent 50%)`,
          }} />
        </div>

        {/* Auth Content */}
        <div className="relative w-full max-w-md">
          {view === 'login' && (
            <div className="auth-fade-in">
              <LoginScreen onViewChange={setView} />
            </div>
          )}
          {view === 'signup' && (
            <div className="auth-fade-in">
              <SignupScreen onViewChange={setView} />
            </div>
          )}
          {view === 'forgot-password' && (
            <div className="auth-fade-in">
              <ForgotPasswordScreen onViewChange={setView} />
            </div>
          )}
        </div>
      </div>
    </>
  );
};
