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
      `}</style>

      {/* \u2500\u2500 Full page \u2014 clean white, no bg image \u2500\u2500 */}
      <div style={{
        minHeight: '100dvh',
        background: '#fff',
        display: 'flex',
        fontFamily: "'Outfit', sans-serif",

        // Mobile: single column centered
        // PC: two columns \u2014 left branding, right form
        flexDirection: 'row',
      }}>

        {/* \u2500\u2500 LEFT \u2014 branding panel (desktop only) \u2500\u2500 */}
        <div style={{
          display: 'none',
          flex: 1,
          background: '#0a0a0a',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '48px',
          position: 'sticky',
          top: 0,
          height: '100dvh',
        }} className="auth-left">
          <div style={{ maxWidth: 360, textAlign: 'center' }}>
            {/* WALLS SVG logo */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 24 }}>
              <svg width="36" height="36" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect width="9" height="9" rx="2" fill="white"/>
                <rect x="11" y="0" width="9" height="9" rx="2" fill="white"/>
                <rect x="0" y="11" width="9" height="9" rx="2" fill="white"/>
                <rect x="11" y="11" width="9" height="9" rx="2" fill="white" opacity="0.3"/>
              </svg>
              <span style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 800, fontSize: 28, letterSpacing: '-0.4px', color: '#fff' }}>WALLS</span>
            </div>
            <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.45)', lineHeight: 1.7, fontWeight: 300, margin: 0 }}>
              Discover and download beautiful wallpapers curated from creators worldwide.
            </p>

            {/* Decorative grid of mini tiles */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8, marginTop: 48, opacity: 0.15 }}>
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} style={{ aspectRatio: '9/16', borderRadius: 8, background: 'rgba(255,255,255,0.4)' }} />
              ))}
            </div>
          </div>
        </div>

        {/* \u2500\u2500 RIGHT \u2014 form panel \u2500\u2500 */}
        <div style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '32px 24px',
          minHeight: '100dvh',
        }}>
          <div className="auth-fade" style={{ width: '100%', maxWidth: 380 }}>

            {/* Logo \u2014 shown on mobile only (hidden on desktop since left panel shows it) */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 32 }} className="auth-mobile-logo">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <svg width="26" height="26" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <rect width="9" height="9" rx="2" fill="#0a0a0a"/>
                  <rect x="11" y="0" width="9" height="9" rx="2" fill="#0a0a0a"/>
                  <rect x="0" y="11" width="9" height="9" rx="2" fill="#0a0a0a"/>
                  <rect x="11" y="11" width="9" height="9" rx="2" fill="#0a0a0a" opacity="0.25"/>
                </svg>
                <span style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 800, fontSize: 20, letterSpacing: '-0.3px', color: '#0a0a0a' }}>WALLS</span>
              </div>
            </div>

            {/* Auth screens */}
            {view === 'login'           && <LoginScreen          onViewChange={setView} redirectTo={redirectTo} />}
            {view === 'signup'          && <SignupScreen         onViewChange={setView} redirectTo={redirectTo} />}
            {view === 'forgot-password' && <ForgotPasswordScreen onViewChange={setView} />}

          </div>
        </div>

      </div>

      {/* \u2500\u2500 Responsive \u2014 show left panel on desktop \u2500\u2500 */}
      <style>{`
        @media(min-width: 768px) {
          .auth-left       { display: flex !important; }
          .auth-mobile-logo { display: none !important; }
        }
        @media(max-width: 767px) {
          .auth-left       { display: none !important; }
          .auth-mobile-logo { display: flex !important; }
        }
      `}</style>
    </>
  );
};
