'use client';

import { useState } from 'react';
import { LoginScreen } from './LoginScreen';
import { SignupScreen } from './SignupScreen';
import { ForgotPasswordScreen } from './ForgotPasswordScreen';

export type AuthView = 'login' | 'signup' | 'forgot-password';

type Props = { redirectTo?: string; };

export const AuthUI = ({ redirectTo = '/' }: Props) => {
  const [view, setView] = useState<AuthView>('login');

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&display=swap');
        @keyframes fadeUp { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
        .auth-fade { animation: fadeUp 0.35s cubic-bezier(0.16,1,0.3,1) forwards; }
        @media(min-width:768px) {
          .auth-left        { display: flex !important; }
          .auth-mobile-logo { display: none !important; }
        }
        @media(max-width:767px) {
          .auth-left        { display: none !important; }
          .auth-mobile-logo { display: flex !important; }
        }
      `}</style>

      <div style={{ minHeight: '100dvh', background: '#fff', display: 'flex', fontFamily: "'Outfit', sans-serif" }}>

        {/* ── Left branding panel — desktop only ── */}
        <div className="auth-left" style={{ display: 'none', flex: 1, background: '#0a0a0a', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 48, position: 'sticky', top: 0, height: '100dvh' }}>
          <div style={{ maxWidth: 360, textAlign: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 20 }}>
              <svg width="34" height="34" viewBox="0 0 20 20" fill="none">
                <rect width="9" height="9" rx="2" fill="white"/>
                <rect x="11" y="0" width="9" height="9" rx="2" fill="white"/>
                <rect x="0" y="11" width="9" height="9" rx="2" fill="white"/>
                <rect x="11" y="11" width="9" height="9" rx="2" fill="white" opacity="0.3"/>
              </svg>
              <span style={{ fontWeight: 800, fontSize: 26, letterSpacing: '-0.4px', color: '#fff' }}>WALLS</span>
            </div>
            <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.4)', lineHeight: 1.7, fontWeight: 300, margin: 0 }}>
              Discover and download beautiful wallpapers curated from creators worldwide.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8, marginTop: 48, opacity: 0.12 }}>
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} style={{ aspectRatio: '9/16', borderRadius: 8, background: 'rgba(255,255,255,0.5)' }} />
              ))}
            </div>
          </div>
        </div>

        {/* ── Right form panel ── */}
        <div style={{ flex: 1, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '40px 24px', minHeight: '100dvh' }}>
          <div className="auth-fade" style={{ width: '100%', maxWidth: 380 }}>

            {/* Logo — mobile only, top of form */}
            <div className="auth-mobile-logo" style={{ display: 'none', alignItems: 'center', gap: 8, marginBottom: 28 }}>
              <svg width="24" height="24" viewBox="0 0 20 20" fill="none">
                <rect width="9" height="9" rx="2" fill="#0a0a0a"/>
                <rect x="11" y="0" width="9" height="9" rx="2" fill="#0a0a0a"/>
                <rect x="0" y="11" width="9" height="9" rx="2" fill="#0a0a0a"/>
                <rect x="11" y="11" width="9" height="9" rx="2" fill="#0a0a0a" opacity="0.25"/>
              </svg>
              <span style={{ fontWeight: 800, fontSize: 18, letterSpacing: '-0.3px', color: '#0a0a0a' }}>WALLS</span>
            </div>

            {/* Auth screens — no logo inside them */}
            {view === 'login'           && <LoginScreen          onViewChange={setView} redirectTo={redirectTo} />}
            {view === 'signup'          && <SignupScreen         onViewChange={setView} redirectTo={redirectTo} />}
            {view === 'forgot-password' && <ForgotPasswordScreen onViewChange={setView} />}

          </div>
        </div>

      </div>
    </>
  );
};
