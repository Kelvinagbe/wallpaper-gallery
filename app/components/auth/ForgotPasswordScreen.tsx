'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Mail, Loader2, ArrowLeft, Check } from 'lucide-react';
import type { AuthView } from './AuthUI';

type Props = { onViewChange: (view: AuthView) => void; };

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

export const ForgotPasswordScreen = ({ onViewChange }: Props) => {
  const [email,     setEmail]     = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error,     setError]     = useState('');
  const [success,   setSuccess]   = useState(false);
  const [focused,   setFocused]   = useState(false);
  const supabase = createClient();

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setIsLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      });
      if (error) throw error;
      setSuccess(true);
    } catch (err: any) {
      setError(err.message || 'Failed to send reset email');
    } finally { setIsLoading(false); }
  };

  // ── Success state ────────────────────────────────────────────
  if (success) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', fontFamily: F }}>
        <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(16,185,129,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
          <Check size={26} color="#10b981" />
        </div>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: '#0a0a0a', margin: '0 0 6px', letterSpacing: '-0.02em' }}>Check your email</h2>
        <p style={{ fontSize: 13, color: 'rgba(0,0,0,0.45)', lineHeight: 1.6, margin: '0 0 24px', maxWidth: 280 }}>
          We sent a reset link to <strong style={{ color: '#0a0a0a' }}>{email}</strong>
        </p>
        <button
          onClick={() => onViewChange('login')}
          style={{ width: '100%', height: 46, borderRadius: 10, border: 'none', background: '#0a0a0a', color: '#fff', fontSize: 14, fontWeight: 700, fontFamily: F, cursor: 'pointer' }}>
          Back to Sign in
        </button>
      </div>
    );
  }

  // ── Form state ───────────────────────────────────────────────
  return (
    <>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <div style={{ display: 'flex', flexDirection: 'column', fontFamily: F }}>

        {/* Back */}
        <button
          onClick={() => onViewChange('login')}
          style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(0,0,0,0.4)', fontSize: 13, fontWeight: 500, fontFamily: F, padding: 0, marginBottom: 24, width: 'fit-content' }}>
          <ArrowLeft size={15} />
          Back to sign in
        </button>

        {/* Title */}
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#0a0a0a', margin: '0 0 4px', letterSpacing: '-0.02em' }}>Reset password</h1>
          <p style={{ fontSize: 13, color: 'rgba(0,0,0,0.4)', margin: 0 }}>Enter your email to receive a reset link</p>
        </div>

        {/* Error */}
        {error && (
          <div style={{ padding: '10px 14px', marginBottom: 14, background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 10, fontSize: 13, color: '#dc2626', fontWeight: 500 }}>
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleReset} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#0a0a0a', marginBottom: 6, fontFamily: F }}>Email</label>
            <input
              type="email" value={email} required placeholder="you@example.com"
              onChange={e => setEmail(e.target.value)}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              style={{ ...baseInput, borderColor: focused ? 'rgba(0,0,0,0.25)' : 'transparent', background: focused ? '#fff' : '#f5f5f5' }}
            />
          </div>

          <button
            type="submit" disabled={isLoading}
            style={{ width: '100%', height: 46, borderRadius: 10, border: 'none', background: '#0a0a0a', color: '#fff', fontSize: 14, fontWeight: 700, fontFamily: F, cursor: isLoading ? 'not-allowed' : 'pointer', opacity: isLoading ? 0.6 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 4 }}>
            {isLoading ? <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />Sending...</> : 'Send Reset Link'}
          </button>
        </form>

      </div>
    </>
  );
};
