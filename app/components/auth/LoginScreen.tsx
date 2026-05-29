'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Loader2, Eye, EyeOff, CheckCircle, ArrowLeft } from 'lucide-react';
import type { AuthView } from './AuthUI';

type Props = { onViewChange: (view: AuthView) => void; redirectTo?: string; };

const F = "'Outfit', sans-serif";

export const LoginScreen = ({ onViewChange, redirectTo = '/' }: Props) => {
  const [step,       setStep]       = useState<'email' | 'password'>('email');
  const [email,      setEmail]      = useState('');
  const [password,   setPassword]   = useState('');
  const [showPass,   setShowPass]   = useState(false);
  const [isLoading,  setIsLoading]  = useState(false);
  const [error,      setError]      = useState('');
  const [success,    setSuccess]    = useState(false);
  const [animating,  setAnimating]  = useState(false);
  const supabase = createClient();

  const proceedToPassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setError('');
    setAnimating(true);
    setTimeout(() => {
      setStep('password');
      setAnimating(false);
    }, 260);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      setSuccess(true);
      setTimeout(() => { window.location.href = redirectTo; }, 1600);
    } catch (err: any) {
      setError(err.message || 'Incorrect email or password');
    } finally {
      setIsLoading(false);
    }
  };

  const goBack = () => {
    setError('');
    setAnimating(true);
    setTimeout(() => {
      setStep('email');
      setAnimating(false);
    }, 260);
  };

  return (
    <>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg) } }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(18px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-14px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .step-enter  { animation: slideUp   .28s cubic-bezier(.22,1,.36,1) forwards; }
        .step-back   { animation: slideDown .28s cubic-bezier(.22,1,.36,1) forwards; }

        .walls-input {
          width: 100%;
          height: 50px;
          padding: 0 14px;
          background: #f7f7f7;
          border: 1.5px solid transparent;
          border-radius: 12px;
          font-size: 15px;
          font-family: ${F};
          color: #0a0a0a;
          outline: none;
          transition: border-color .15s, background .15s, box-shadow .15s;
          box-sizing: border-box;
        }
        .walls-input:focus {
          background: #fff;
          border-color: rgba(0,0,0,0.15);
          box-shadow: 0 0 0 3px rgba(0,0,0,0.04);
        }
        .walls-input::placeholder { color: rgba(0,0,0,0.28); }

        .walls-btn {
          width: 100%;
          height: 50px;
          border-radius: 12px;
          border: none;
          font-size: 15px;
          font-weight: 700;
          font-family: ${F};
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          transition: background .25s, opacity .15s, transform .1s;
        }
        .walls-btn:active { transform: scale(0.98); }
        .walls-btn:disabled { cursor: not-allowed; opacity: 0.6; }
      `}</style>

      <div style={{ display: 'flex', flexDirection: 'column', fontFamily: F }}>

        {/* Header */}
        <div style={{ marginBottom: 28 }}>
          {/* Back button — only on password step */}
          {step === 'password' && (
            <button
              onClick={goBack}
              style={{
                display: 'flex', alignItems: 'center', gap: 5,
                background: 'none', border: 'none', cursor: 'pointer',
                fontSize: 13, fontWeight: 600, color: 'rgba(0,0,0,0.4)',
                fontFamily: F, padding: '0 0 16px', marginLeft: -2,
                transition: 'color .15s',
              }}
            >
              <ArrowLeft size={14} />
              Back
            </button>
          )}

          <h1 style={{
            fontSize: 24, fontWeight: 700, color: '#0a0a0a',
            margin: '0 0 5px', letterSpacing: '-0.03em', lineHeight: 1.2,
          }}>
            {step === 'email' ? 'Sign in' : 'Enter password'}
          </h1>
          <p style={{ fontSize: 13, color: 'rgba(0,0,0,0.38)', margin: 0, lineHeight: 1.5 }}>
            {step === 'email'
              ? 'Welcome back to Walls'
              : <span>Signing in as <strong style={{ color: 'rgba(0,0,0,0.65)', fontWeight: 600 }}>{email}</strong></span>
            }
          </p>
        </div>

        {/* Error / success banner */}
        {(error || success) && (
          <div style={{
            padding: '11px 14px', marginBottom: 16,
            background: success ? 'rgba(22,163,74,0.06)' : 'rgba(239,68,68,0.06)',
            border: `1px solid ${success ? 'rgba(22,163,74,0.2)' : 'rgba(239,68,68,0.15)'}`,
            borderRadius: 10,
            fontSize: 13, fontWeight: 500,
            color: success ? '#16a34a' : '#dc2626',
            display: 'flex', alignItems: 'center', gap: 7,
          }}>
            {success && <CheckCircle size={14} />}
            {success ? 'Signed in! Redirecting…' : error}
          </div>
        )}

        {/* ── Step: Email ─────────────────────────────────────── */}
        {step === 'email' && (
          <form
            onSubmit={proceedToPassword}
            className={animating ? '' : 'step-enter'}
            style={{ display: 'flex', flexDirection: 'column', gap: 12 }}
          >
            <div>
              <label style={{
                display: 'block', fontSize: 13, fontWeight: 600,
                color: '#0a0a0a', marginBottom: 7, fontFamily: F,
              }}>
                Email address
              </label>
              <input
                type="email"
                value={email}
                required
                autoFocus
                placeholder="you@example.com"
                onChange={e => setEmail(e.target.value)}
                className="walls-input"
                // inputMode for mobile — opens email keyboard
                inputMode="email"
                autoComplete="email"
              />
            </div>

            <button
              type="submit"
              className="walls-btn"
              style={{ background: '#0a0a0a', color: '#fff', marginTop: 4 }}
            >
              Continue
            </button>
          </form>
        )}

        {/* ── Step: Password ──────────────────────────────────── */}
        {step === 'password' && (
          <form
            onSubmit={handleLogin}
            className={animating ? '' : 'step-enter'}
            style={{ display: 'flex', flexDirection: 'column', gap: 12 }}
          >
            <div>
              <div style={{
                display: 'flex', alignItems: 'center',
                justifyContent: 'space-between', marginBottom: 7,
              }}>
                <label style={{
                  fontSize: 13, fontWeight: 600,
                  color: '#0a0a0a', fontFamily: F,
                }}>
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => onViewChange('forgot-password')}
                  style={{
                    fontSize: 12, color: 'rgba(0,0,0,0.38)',
                    background: 'none', border: 'none', cursor: 'pointer',
                    fontFamily: F, fontWeight: 500, transition: 'color .15s',
                  }}
                >
                  Forgot password?
                </button>
              </div>

              <div style={{ position: 'relative' }}>
                <input
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  required
                  autoFocus
                  placeholder="••••••••"
                  onChange={e => setPassword(e.target.value)}
                  className="walls-input"
                  style={{ paddingRight: 46 }}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(v => !v)}
                  style={{
                    position: 'absolute', right: 13, top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: 'rgba(0,0,0,0.28)', display: 'flex',
                    alignItems: 'center', padding: 4,
                    transition: 'color .15s',
                  }}
                >
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading || success}
              className="walls-btn"
              style={{
                background: success ? '#16a34a' : '#0a0a0a',
                color: '#fff',
                marginTop: 4,
              }}
            >
              {isLoading
                ? <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> Signing in…</>
                : success
                ? <><CheckCircle size={16} /> Signed in!</>
                : 'Sign in'
              }
            </button>
          </form>
        )}

        {/* Step dots indicator */}
        <div style={{
          display: 'flex', justifyContent: 'center', gap: 5, marginTop: 20,
        }}>
          {(['email', 'password'] as const).map((s) => (
            <div key={s} style={{
              width: step === s ? 18 : 5,
              height: 5,
              borderRadius: 99,
              background: step === s ? '#0a0a0a' : 'rgba(0,0,0,0.12)',
              transition: 'width .3s cubic-bezier(.22,1,.36,1), background .3s',
            }} />
          ))}
        </div>

        {/* Sign up */}
        <p style={{
          textAlign: 'center', fontSize: 13,
          color: 'rgba(0,0,0,0.38)', marginTop: 20, fontFamily: F,
        }}>
          Don't have an account?{' '}
          <button
            onClick={() => onViewChange('signup')}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              fontSize: 13, fontWeight: 700, color: '#0a0a0a', fontFamily: F,
            }}
          >
            Sign up
          </button>
        </p>

      </div>
    </>
  );
};