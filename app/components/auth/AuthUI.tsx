'use client';

import { useState } from 'react';
import { LoginScreen } from './LoginScreen';
import { SignupScreen } from './SignupScreen';
import { ForgotPasswordScreen } from './ForgotPasswordScreen';

export type AuthView = 'login' | 'signup' | 'forgot-password';

type Props = { redirectTo?: string; };

export const AuthUI = ({ redirectTo = '/' }: Props) => {
  const [view, setView] = useState<AuthView>('login');

  const WALLPAPERS = [
    '/1.png',
      ];

  const bg = WALLPAPERS[Math.floor(Math.random() * WALLPAPERS.length)];

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <style>{`
        @keyframes fadeUp { from { opacity: 0; transform: translateY(24px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        .auth-fade { animation: fadeUp 0.4s cubic-bezier(0.16,1,0.3,1) forwards; }
        .bg-fade { animation: fadeIn 0.6s ease forwards; }
      `}</style>

      {/* Fullscreen wallpaper background */}
      <div className="absolute inset-0 bg-fade">
        <img src={bg} alt="" className="w-full h-full object-cover" />
        <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.4) 50%, rgba(0,0,0,0.2) 100%)' }} />
      </div>

      {/* App name top */}
      <div className="absolute top-12 left-0 right-0 flex flex-col items-center z-10">
        <div className="w-12 h-12 rounded-2xl bg-white/15 backdrop-blur-md border border-white/20 flex items-center justify-center mb-3">
          <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2L2 7v10c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-10-5z"/>
          </svg>
        </div>
        <p className="text-white/60 text-sm font-medium tracking-widest uppercase">Walls</p>
      </div>

      {/* Glass card */}
      <div className="auth-fade relative w-full sm:max-w-sm sm:mx-4 sm:mb-0">
        <div className="rounded-t-3xl sm:rounded-3xl px-6 pt-8 pb-10 sm:pb-8"
          style={{ background: 'rgba(255,255,255,0.08)', backdropFilter: 'blur(40px)', WebkitBackdropFilter: 'blur(40px)', border: '1px solid rgba(255,255,255,0.12)', borderBottom: 'none' }}>

          {view === 'login'           && <LoginScreen          onViewChange={setView} redirectTo={redirectTo} />}
          {view === 'signup'          && <SignupScreen         onViewChange={setView} redirectTo={redirectTo} />}
          {view === 'forgot-password' && <ForgotPasswordScreen onViewChange={setView} />}
        </div>
      </div>
    </div>
  );
};