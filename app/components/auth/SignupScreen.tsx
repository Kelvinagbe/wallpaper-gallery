
'use client';

import { useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Loader2, Eye, EyeOff, Check, X, CheckCircle } from 'lucide-react';
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

export const SignupScreen = ({ onViewChange, redirectTo = '/' }: Props) => {
  const [firstName,  setFirstName]  = useState('');
  const [surname,    setSurname]    = useState('');
  const [username,   setUsername]   = useState('');
  const [email,      setEmail]      = useState('');
  const [password,   setPassword]   = useState('');
  const [showPass,   setShowPass]   = useState(false);
  const [isLoading,  setIsLoading]  = useState(false);
  const [error,      setError]      = useState('');
  const [success,    setSuccess]    = useState(false);
  const [focusField, setFocusField] = useState('');
  const [usernameStatus, setUsernameStatus] = useState<'idle' | 'checking' | 'available' | 'taken' | 'invalid'>('idle');
  const [usernameTimer,  setUsernameTimer]  = useState<ReturnType<typeof setTimeout> | null>(null);

  const supabase = createClient();

  // ── Username availability — debounced 500ms ──────────────────
  const checkUsername = useCallback((val: string) => {
    if (usernameTimer) clearTimeout(usernameTimer);
    const cleaned = val.toLowerCase().replace(/[^a-z0-9_]/g, '');
    setUsername(cleaned);
    if (!cleaned)           { setUsernameStatus('idle');    return; }
    if (cleaned.length < 3) { setUsernameStatus('invalid'); return; }
    setUsernameStatus('checking');
    const t = setTimeout(async () => {
      const { data } = await supabase.from('profiles').select('id').eq('username', cleaned).maybeSingle();
      setUsernameStatus(data ? 'taken' : 'available');
    }, 500);
    setUsernameTimer(t);
  }, [usernameTimer, supabase]);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (usernameStatus === 'taken' || usernameStatus === 'invalid') return;
    setError(''); setIsLoading(true);
    try {
      const fullName = `${firstName.trim()} ${surname.trim()}`.trim();
      const { error } = await supabase.auth.signUp({
        email, password,
        options: {
          data: { full_name: fullName, first_name: firstName.trim(), last_name: surname.trim(), username },
          emailRedirectTo: undefined,
        },
      });
      if (error) throw error;
      setSuccess(true);
      setTimeout(() => { window.location.href = redirectTo; }, 1600);
    } catch (err: any) {
      setError(err.message || 'Signup failed');
    } finally { setIsLoading(false); }
  };

  const inp = (field: string): React.CSSProperties => ({
    ...baseInput,
    borderColor: focusField === field ? 'rgba(0,0,0,0.25)' : 'transparent',
    background:  focusField === field ? '#fff' : '#f5f5f5',
  });

  const usernameColor = () => {
    if (usernameStatus === 'available') return '#10b981';
    if (usernameStatus === 'taken' || usernameStatus === 'invalid') return '#ef4444';
    return focusField === 'username' ? 'rgba(0,0,0,0.25)' : 'transparent';
  };

  const usernameIndicator = () => {
    if (usernameStatus === 'checking')  return <Loader2 size={14} style={{ animation: 'spin 1s linear infinite', color: 'rgba(0,0,0,0.3)' }} />;
    if (usernameStatus === 'available') return <Check size={14} color="#10b981" />;
    if (usernameStatus === 'taken')     return <X size={14} color="#ef4444" />;
    if (usernameStatus === 'invalid')   return <span style={{ fontSize: 10, color: '#ef4444', fontWeight: 500 }}>Min 3</span>;
    return null;
  };

  const canSubmit = !isLoading && !success && usernameStatus !== 'taken' && usernameStatus !== 'invalid' && usernameStatus !== 'checking';

  return (
    <>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <div style={{ display: 'flex', flexDirection: 'column', fontFamily: F }}>

        {/* Title */}
        <div style={{ marginBottom: 22 }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#0a0a0a', margin: '0 0 4px', letterSpacing: '-0.02em' }}>Create account</h1>
          <p style={{ fontSize: 13, color: 'rgba(0,0,0,0.4)', margin: 0 }}>Join and explore beautiful wallpapers</p>
        </div>

        {/* Feedback banner */}
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
            {success ? 'Account created! Redirecting…' : error}
          </div>
        )}

        <form onSubmit={handleSignup} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

          {/* First name + Surname */}
          <div style={{ display: 'flex', gap: 10 }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#0a0a0a', marginBottom: 6, fontFamily: F }}>First name</label>
              <input type="text" value={firstName} required placeholder="John"
                onChange={e => setFirstName(e.target.value)}
                onFocus={() => setFocusField('firstName')}
                onBlur={() => setFocusField('')}
                style={inp('firstName')} />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#0a0a0a', marginBottom: 6, fontFamily: F }}>Surname</label>
              <input type="text" value={surname} required placeholder="Doe"
                onChange={e => setSurname(e.target.value)}
                onFocus={() => setFocusField('surname')}
                onBlur={() => setFocusField('')}
                style={inp('surname')} />
            </div>
          </div>

          {/* Username */}
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#0a0a0a', marginBottom: 6, fontFamily: F }}>Username</label>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', fontSize: 14, color: 'rgba(0,0,0,0.3)', pointerEvents: 'none' }}>@</span>
              <input type="text" value={username} required placeholder="johndoe"
                onChange={e => checkUsername(e.target.value)}
                onFocus={() => setFocusField('username')}
                onBlur={() => setFocusField('')}
                style={{ ...baseInput, paddingLeft: 28, paddingRight: 36, borderColor: usernameColor(), background: focusField === 'username' ? '#fff' : '#f5f5f5' }} />
              <div style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', display: 'flex', alignItems: 'center' }}>
                {usernameIndicator()}
              </div>
            </div>
            {usernameStatus === 'taken'     && <p style={{ fontSize: 11, color: '#ef4444', marginTop: 4, fontFamily: F }}>Username already taken</p>}
            {usernameStatus === 'available' && <p style={{ fontSize: 11, color: '#10b981', marginTop: 4, fontFamily: F }}>Username available</p>}
          </div>

          {/* Email */}
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#0a0a0a', marginBottom: 6, fontFamily: F }}>Email</label>
            <input type="email" value={email} required placeholder="you@example.com"
              onChange={e => setEmail(e.target.value)}
              onFocus={() => setFocusField('email')}
              onBlur={() => setFocusField('')}
              style={inp('email')} />
          </div>

          {/* Password */}
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#0a0a0a', marginBottom: 6, fontFamily: F }}>Password</label>
            <div style={{ position: 'relative' }}>
              <input type={showPass ? 'text' : 'password'} value={password} required
                placeholder="Min 6 characters" minLength={6}
                onChange={e => setPassword(e.target.value)}
                onFocus={() => setFocusField('password')}
                onBlur={() => setFocusField('')}
                style={{ ...inp('password'), paddingRight: 42 }} />
              <button type="button" onClick={() => setShowPass(v => !v)}
                style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center' }}>
                {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* Submit */}
          <button type="submit" disabled={!canSubmit}
            style={{ width: '100%', height: 46, borderRadius: 10, border: 'none', background: success ? '#16a34a' : '#0a0a0a', color: '#fff', fontSize: 14, fontWeight: 700, fontFamily: F, cursor: canSubmit ? 'pointer' : 'not-allowed', opacity: canSubmit ? 1 : 0.5, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 4, transition: 'background .3s' }}>
            {isLoading
              ? <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />Creating account...</>
              : success ? <><CheckCircle size={16} />Account created!</>
              : 'Create account'}
          </button>
        </form>

        {/* Terms */}
        <p style={{ textAlign: 'center', fontSize: 11, color: 'rgba(0,0,0,0.3)', marginTop: 14, lineHeight: 1.6, fontFamily: F }}>
          By signing up you agree to our{' '}
          <a href="#" style={{ color: 'rgba(0,0,0,0.5)', textDecoration: 'underline' }}>Terms</a> and{' '}
          <a href="#" style={{ color: 'rgba(0,0,0,0.5)', textDecoration: 'underline' }}>Privacy Policy</a>
        </p>

        {/* Sign in */}
        <p style={{ textAlign: 'center', fontSize: 13, color: 'rgba(0,0,0,0.4)', marginTop: 12, fontFamily: F }}>
          Have an account?{' '}
          <button onClick={() => onViewChange('login')}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 700, color: '#0a0a0a', fontFamily: F }}>
            Sign in
          </button>
        </p>

      </div>
    </>
  );
};
