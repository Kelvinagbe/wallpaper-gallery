
'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Loader2, Eye, EyeOff, CheckCircle } from 'lucide-react';
import type { AuthView } from './AuthUI';

type Props = { onViewChange: (view: AuthView) => void; redirectTo?: string; };

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

export const LoginScreen = ({ onViewChange, redirectTo = '/' }: Props) => {
  const [email,      setEmail]      = useState('');
  const [password,   setPassword]   = useState('');
  const [showPass,   setShowPass]   = useState(false);
  const [isLoading,  setIsLoading]  = useState(false);
  const [error,      setError]      = useState('');
  const [success,    setSuccess]    = useState(false);
  const [focusField, setFocusField] = useState('');
  const supabase = createClient();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setIsLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      setSuccess(true);
      setTimeout(() => { window.location.href = redirectTo; }, 1600);
    } catch (err: any) {
      setError(err.message || 'Invalid credentials');
    } finally { setIsLoading(false); }
  };

  const inp = (field: string): React.CSSProperties => ({
    ...baseInput,
    borderColor: focusField === field ? 'rgba(0,0,0,0.25)' : 'transparent',
    background:  focusField === field ? '#fff' : '#f5f5f5',
  });

  return (
    <>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <div style={{ display: 'flex', flexDirection: 'column', fontFamily: F }}>

        {/* Title */}
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#0a0a0a', margin: '0 0 4px', letterSpacing: '-0.02em' }}>Sign in</h1>
          <p style={{ fontSize: 13, color: 'rgba(0,0,0,0.4)', margin: 0 }}>Welcome back to WALLS</p>
        </div>

        {/* Feedback banner — error or success */}
        {(error || success) && (
          <div style={{
            padding: '10px 14px', marginBottom: 14,
            background: success ? 'rgba(22,163,74,0.06)' : 'rgba(239,68,68,0.06)',
            border: `1px solid ${success ? 'rgba(22,163,74,0.25)' : 'rgba(239,68,68,0.2)'}`,
            borderRadius: 10,
            fontSize: 13, fontWeight: 500,
            color: success ? '#16a34a' : '#dc2626',
            display: 'flex', alignItems: 'center', gap: 7,
          }}>
            {success && <CheckCircle size={14} />}
            {success ? 'Signed in! Redirecting…' : error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
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

          <button type="submit" disabled={isLoading || success}
            style={{ width: '100%', height: 46, borderRadius: 10, border: 'none', background: success ? '#16a34a' : '#0a0a0a', color: '#fff', fontSize: 14, fontWeight: 700, fontFamily: F, cursor: isLoading || success ? 'not-allowed' : 'pointer', opacity: isLoading ? 0.6 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 4, transition: 'background .3s' }}>
            {isLoading
              ? <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />Signing in...</>
              : success ? <><CheckCircle size={16} />Signed in!</>
              : 'Sign in'}
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
