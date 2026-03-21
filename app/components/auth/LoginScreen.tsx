'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Loader2, Eye, EyeOff } from 'lucide-react';
import type { AuthView } from './AuthUI';

type LoginScreenProps = {
  onViewChange: (view: AuthView) => void;
  redirectTo?: string;
};

const F = "'Outfit', sans-serif";

const baseInput: React.CSSProperties = {
  width: '100%', height: 46,
  padding: '0 14px',
  background: '#f5f5f5',
  border: '1.5px solid transparent',
  borderRadius: 10,
  fontSize: 14, fontFamily: F,
  color: '#0a0a0a',
  outline: 'none',
  transition: 'border-color .15s, background .15s',
};

export const LoginScreen = ({ onViewChange, redirectTo = '/' }: LoginScreenProps) => {
  const [email,      setEmail]      = useState('');
  const [password,   setPassword]   = useState('');
  const [showPass,   setShowPass]   = useState(false);
  const [isLoading,  setIsLoading]  = useState(false);
  const [error,      setError]      = useState('');
  const [focusField, setFocusField] = useState('');
  const supabase = createClient();

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setIsLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      window.location.href = redirectTo;
    } catch (err: any) {
      setError(err.message || 'Invalid credentials');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError(''); setIsLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(redirectTo)}` },
      });
      if (error) throw error;
    } catch (err: any) {
      setError(err.message || 'Login failed');
      setIsLoading(false);
    }
  };

  const inp = (field: string): React.CSSProperties => ({
    ...baseInput,
    borderColor: focusField === field ? 'rgba(0,0,0,0.25)' : 'transparent',
    background:  focusField === field ? '#fff' : '#f5f5f5',
  });

  return (
    <>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 0, fontFamily: F }}>

        {/* Title */}
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#0a0a0a', margin: '0 0 4px', letterSpacing: '-0.02em' }}>Sign in</h1>
          <p style={{ fontSize: 13, color: 'rgba(0,0,0,0.4)', margin: 0 }}>Welcome back to WALLS</p>
        </div>

        {/* Google */}
        <button
          onClick={handleGoogleLogin} disabled={isLoading}
          style={{ width: '100%', height: 46, padding: '0 16px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, background: '#f5f5f5', border: '1.5px solid transparent', borderRadius: 10, fontSize: 14, fontWeight: 600, fontFamily: F, color: '#0a0a0a', cursor: isLoading ? 'not-allowed' : 'pointer', opacity: isLoading ? 0.5 : 1, marginBottom: 16 }}
          onMouseEnter={e => (e.currentTarget.style.background = '#ebebeb')}
          onMouseLeave={e => (e.currentTarget.style.background = '#f5f5f5')}
        >
          {isLoading ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <>
            <svg width="18" height="18" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continue with Google
          </>}
        </button>

        {/* Divider */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <div style={{ flex: 1, height: 1, background: 'rgba(0,0,0,0.08)' }} />
          <span style={{ fontSize: 12, color: 'rgba(0,0,0,0.3)', fontWeight: 500 }}>or</span>
          <div style={{ flex: 1, height: 1, background: 'rgba(0,0,0,0.08)' }} />
        </div>

        {/* Error */}
        {error && (
          <div style={{ padding: '10px 14px', marginBottom: 14, background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 10, fontSize: 13, color: '#dc2626', fontWeight: 500 }}>
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleEmailLogin} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#0a0a0a', marginBottom: 6, fontFamily: F }}>Email</label>
            <input
              type="email" value={email} required placeholder="you@example.com"
              onChange={e => setEmail(e.target.value)}
              onFocus={() => setFocusField('email')}
              onBlur={() => setFocusField('')}
              style={inp('email')}
            />
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: '#0a0a0a', fontFamily: F }}>Password</label>
              <button type="button" onClick={() => onViewChange('forgot-password')}
                style={{ fontSize: 12, color: 'rgba(0,0,0,0.4)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: F, fontWeight: 500 }}>
                Forgot password?
              </button>
            </div>
            <div style={{ position: 'relative' }}>
              <input
                type={showPass ? 'text' : 'password'} value={password} required placeholder="••••••••"
                onChange={e => setPassword(e.target.value)}
                onFocus={() => setFocusField('password')}
                onBlur={() => setFocusField('')}
                style={{ ...inp('password'), paddingRight: 42 }}
              />
              <button type="button" onClick={() => setShowPass(v => !v)}
                style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center' }}>
                {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <button type="submit" disabled={isLoading}
            style={{ width: '100%', height: 46, borderRadius: 10, border: 'none', background: '#0a0a0a', color: '#fff', fontSize: 14, fontWeight: 700, fontFamily: F, cursor: isLoading ? 'not-allowed' : 'pointer', opacity: isLoading ? 0.6 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 4 }}>
            {isLoading ? <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />Signing in...</> : 'Sign in'}
          </button>
        </form>

        {/* Sign up */}
        <p style={{ textAlign: 'center', fontSize: 13, color: 'rgba(0,0,0,0.4)', marginTop: 20, fontFamily: F }}>
          Don't have an account?{' '}
          <button onClick={() => onViewChange('signup')}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 700, color: '#0a0a0a', fontFamily: F }}>
            Sign up
          </button>
        </p>

      </div>
    </>
  );
};
