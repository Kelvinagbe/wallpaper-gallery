'use client';

import { useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Loader2, Eye, EyeOff, Check, X, CheckCircle, ArrowLeft } from 'lucide-react';
import type { AuthView } from './AuthUI';

type Props = { onViewChange: (view: AuthView) => void; redirectTo?: string; };

const F = "'Outfit', sans-serif";

type Step = 'name' | 'username' | 'email' | 'password';
const STEPS: Step[] = ['name', 'username', 'email', 'password'];

export const SignupScreen = ({ onViewChange, redirectTo = '/' }: Props) => {
  const [step,       setStep]       = useState<Step>('name');
  const [animating,  setAnimating]  = useState(false);
  const [direction,  setDirection]  = useState<'forward' | 'back'>('forward');

  const [firstName,  setFirstName]  = useState('');
  const [surname,    setSurname]    = useState('');
  const [username,   setUsername]   = useState('');
  const [email,      setEmail]      = useState('');
  const [password,   setPassword]   = useState('');
  const [showPass,   setShowPass]   = useState(false);
  const [isLoading,  setIsLoading]  = useState(false);
  const [error,      setError]      = useState('');
  const [success,    setSuccess]    = useState(false);

  const [usernameStatus, setUsernameStatus] = useState<'idle' | 'checking' | 'available' | 'taken' | 'invalid'>('idle');
  const [usernameTimer,  setUsernameTimer]  = useState<ReturnType<typeof setTimeout> | null>(null);

  const supabase = createClient();

  const goTo = (next: Step, dir: 'forward' | 'back' = 'forward') => {
    setError('');
    setDirection(dir);
    setAnimating(true);
    setTimeout(() => {
      setStep(next);
      setAnimating(false);
    }, 260);
  };

  const goBack = () => {
    const idx = STEPS.indexOf(step);
    if (idx > 0) goTo(STEPS[idx - 1], 'back');
  };

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

  const handleSignup = async () => {
    setError('');
    setIsLoading(true);
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
    } finally {
      setIsLoading(false);
    }
  };

  const stepIndex   = STEPS.indexOf(step);
  const totalSteps  = STEPS.length;
  const animClass   = animating ? '' : direction === 'forward' ? 'step-enter' : 'step-back';

  const titles: Record<Step, string> = {
    name:     'What\'s your name?',
    username: 'Pick a username',
    email:    'Your email',
    password: 'Create a password',
  };
  const subtitles: Record<Step, React.ReactNode> = {
    name:     'Let\'s get you set up on Walls',
    username: `Hi ${firstName || 'there'} 👋 Choose how others find you`,
    email:    `@${username} — now add your email`,
    password: 'Almost done! Set a secure password',
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
        .step-enter { animation: slideUp   .28s cubic-bezier(.22,1,.36,1) forwards; }
        .step-back  { animation: slideDown .28s cubic-bezier(.22,1,.36,1) forwards; }

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
        .walls-btn:active:not(:disabled) { transform: scale(0.98); }
        .walls-btn:disabled { cursor: not-allowed; }
      `}</style>

      <div style={{ display: 'flex', flexDirection: 'column', fontFamily: F }}>

        {/* Back button */}
        {step !== 'name' && (
          <button onClick={goBack} style={{
            display: 'flex', alignItems: 'center', gap: 5,
            background: 'none', border: 'none', cursor: 'pointer',
            fontSize: 13, fontWeight: 600, color: 'rgba(0,0,0,0.4)',
            fontFamily: F, padding: '0 0 16px', marginLeft: -2,
          }}>
            <ArrowLeft size={14} /> Back
          </button>
        )}

        {/* Header */}
        <div style={{ marginBottom: 26 }}>
          <h1 style={{
            fontSize: 24, fontWeight: 700, color: '#0a0a0a',
            margin: '0 0 5px', letterSpacing: '-0.03em', lineHeight: 1.2,
          }}>
            {titles[step]}
          </h1>
          <p style={{ fontSize: 13, color: 'rgba(0,0,0,0.38)', margin: 0, lineHeight: 1.5 }}>
            {subtitles[step]}
          </p>
        </div>

        {/* Progress dots */}
        <div style={{ display: 'flex', gap: 5, marginBottom: 24 }}>
          {STEPS.map((s, i) => (
            <div key={s} style={{
              height: 4,
              flex: stepIndex === i ? 2 : 1,
              borderRadius: 99,
              background: i <= stepIndex ? '#0a0a0a' : 'rgba(0,0,0,0.10)',
              transition: 'flex .35s cubic-bezier(.22,1,.36,1), background .3s',
            }} />
          ))}
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
            {success ? 'Account created! Redirecting…' : error}
          </div>
        )}

        {/* ── Step: Name ─────────────────────────────────────── */}
        {step === 'name' && (
          <form
            className={animClass}
            onSubmit={e => { e.preventDefault(); if (firstName.trim() && surname.trim()) goTo('username'); }}
            style={{ display: 'flex', flexDirection: 'column', gap: 12 }}
          >
            <div style={{ display: 'flex', gap: 10 }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#0a0a0a', marginBottom: 7, fontFamily: F }}>First name</label>
                <input
                  type="text" value={firstName} required placeholder="John"
                  autoFocus autoComplete="given-name"
                  onChange={e => setFirstName(e.target.value)}
                  className="walls-input"
                />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#0a0a0a', marginBottom: 7, fontFamily: F }}>Surname</label>
                <input
                  type="text" value={surname} required placeholder="Doe"
                  autoComplete="family-name"
                  onChange={e => setSurname(e.target.value)}
                  className="walls-input"
                />
              </div>
            </div>
            <button type="submit" className="walls-btn"
              style={{ background: '#0a0a0a', color: '#fff', marginTop: 4, opacity: firstName.trim() && surname.trim() ? 1 : 0.45 }}>
              Continue
            </button>
          </form>
        )}

        {/* ── Step: Username ─────────────────────────────────── */}
        {step === 'username' && (
          <form
            className={animClass}
            onSubmit={e => {
              e.preventDefault();
              if (usernameStatus === 'available') goTo('email');
            }}
            style={{ display: 'flex', flexDirection: 'column', gap: 12 }}
          >
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#0a0a0a', marginBottom: 7, fontFamily: F }}>Username</label>
              <div style={{ position: 'relative' }}>
                <span style={{
                  position: 'absolute', left: 14, top: '50%',
                  transform: 'translateY(-50%)',
                  fontSize: 15, color: 'rgba(0,0,0,0.3)', pointerEvents: 'none',
                }}>@</span>
                <input
                  type="text" value={username} required placeholder="johndoe"
                  autoFocus autoComplete="username"
                  onChange={e => checkUsername(e.target.value)}
                  className="walls-input"
                  style={{
                    paddingLeft: 30, paddingRight: 40,
                    borderColor:
                      usernameStatus === 'available' ? 'rgba(16,185,129,0.4)' :
                      usernameStatus === 'taken' || usernameStatus === 'invalid' ? 'rgba(239,68,68,0.4)' :
                      'transparent',
                  }}
                />
                <div style={{
                  position: 'absolute', right: 13, top: '50%',
                  transform: 'translateY(-50%)', display: 'flex', alignItems: 'center',
                }}>
                  {usernameStatus === 'checking'  && <Loader2 size={15} style={{ animation: 'spin 1s linear infinite', color: 'rgba(0,0,0,0.3)' }} />}
                  {usernameStatus === 'available' && <Check size={15} color="#10b981" />}
                  {usernameStatus === 'taken'     && <X size={15} color="#ef4444" />}
                  {usernameStatus === 'invalid'   && <span style={{ fontSize: 10, color: '#ef4444', fontWeight: 600 }}>Min 3</span>}
                </div>
              </div>
              {usernameStatus === 'taken'     && <p style={{ fontSize: 11, color: '#ef4444', margin: '5px 0 0', fontFamily: F }}>Username already taken</p>}
              {usernameStatus === 'available' && <p style={{ fontSize: 11, color: '#10b981', margin: '5px 0 0', fontFamily: F }}>Username available ✓</p>}
              {usernameStatus === 'invalid'   && <p style={{ fontSize: 11, color: '#ef4444', margin: '5px 0 0', fontFamily: F }}>At least 3 characters, letters/numbers/_</p>}
            </div>
            <button
              type="submit" className="walls-btn"
              disabled={usernameStatus !== 'available'}
              style={{
                background: '#0a0a0a', color: '#fff', marginTop: 4,
                opacity: usernameStatus === 'available' ? 1 : 0.45,
              }}
            >
              {usernameStatus === 'checking'
                ? <><Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> Checking…</>
                : 'Continue'
              }
            </button>
          </form>
        )}

        {/* ── Step: Email ────────────────────────────────────── */}
        {step === 'email' && (
          <form
            className={animClass}
            onSubmit={e => { e.preventDefault(); if (email.trim()) goTo('password'); }}
            style={{ display: 'flex', flexDirection: 'column', gap: 12 }}
          >
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#0a0a0a', marginBottom: 7, fontFamily: F }}>Email address</label>
              <input
                type="email" value={email} required placeholder="you@example.com"
                autoFocus inputMode="email" autoComplete="email"
                onChange={e => setEmail(e.target.value)}
                className="walls-input"
              />
            </div>
            <button type="submit" className="walls-btn"
              style={{ background: '#0a0a0a', color: '#fff', marginTop: 4, opacity: email.trim() ? 1 : 0.45 }}>
              Continue
            </button>
          </form>
        )}

        {/* ── Step: Password ─────────────────────────────────── */}
        {step === 'password' && (
          <form
            className={animClass}
            onSubmit={e => { e.preventDefault(); handleSignup(); }}
            style={{ display: 'flex', flexDirection: 'column', gap: 12 }}
          >
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#0a0a0a', marginBottom: 7, fontFamily: F }}>Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPass ? 'text' : 'password'}
                  value={password} required placeholder="Min 6 characters"
                  minLength={6} autoFocus autoComplete="new-password"
                  onChange={e => setPassword(e.target.value)}
                  className="walls-input"
                  style={{ paddingRight: 46 }}
                />
                <button type="button" onClick={() => setShowPass(v => !v)} style={{
                  position: 'absolute', right: 13, top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: 'rgba(0,0,0,0.28)', display: 'flex', alignItems: 'center', padding: 4,
                }}>
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {/* Password strength bar */}
              {password.length > 0 && (
                <div style={{ marginTop: 8, display: 'flex', gap: 4 }}>
                  {[1,2,3].map(i => (
                    <div key={i} style={{
                      flex: 1, height: 3, borderRadius: 99,
                      background:
                        password.length >= 10 ? '#10b981' :
                        password.length >= 6  && i <= 2 ? '#f59e0b' :
                        password.length >= 3  && i <= 1 ? '#ef4444' :
                        'rgba(0,0,0,0.08)',
                      transition: 'background .3s',
                    }} />
                  ))}
                </div>
              )}
              {password.length > 0 && (
                <p style={{
                  fontSize: 11, marginTop: 5, fontFamily: F,
                  color:
                    password.length >= 10 ? '#10b981' :
                    password.length >= 6  ? '#f59e0b' : '#ef4444',
                }}>
                  {password.length >= 10 ? 'Strong password' :
                   password.length >= 6  ? 'Decent — could be longer' :
                   'Too short'}
                </p>
              )}
            </div>

            <button
              type="submit" className="walls-btn"
              disabled={isLoading || success || password.length < 6}
              style={{
                background: success ? '#16a34a' : '#0a0a0a',
                color: '#fff', marginTop: 4,
                opacity: isLoading || password.length < 6 ? 0.5 : 1,
              }}
            >
              {isLoading
                ? <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> Creating account…</>
                : success
                ? <><CheckCircle size={16} /> Account created!</>
                : 'Create account'
              }
            </button>
          </form>
        )}

        {/* Terms — only on last step */}
        {step === 'password' && (
          <p style={{
            textAlign: 'center', fontSize: 11,
            color: 'rgba(0,0,0,0.3)', marginTop: 14,
            lineHeight: 1.6, fontFamily: F,
          }}>
            By signing up you agree to our{' '}
            <a href="#" style={{ color: 'rgba(0,0,0,0.5)', textDecoration: 'underline' }}>Terms</a> and{' '}
            <a href="#" style={{ color: 'rgba(0,0,0,0.5)', textDecoration: 'underline' }}>Privacy Policy</a>
          </p>
        )}

        {/* Sign in link */}
        <p style={{
          textAlign: 'center', fontSize: 13,
          color: 'rgba(0,0,0,0.38)', marginTop: 16, fontFamily: F,
        }}>
          Have an account?{' '}
          <button onClick={() => onViewChange('login')} style={{
            background: 'none', border: 'none', cursor: 'pointer',
            fontSize: 13, fontWeight: 700, color: '#0a0a0a', fontFamily: F,
          }}>
            Sign in
          </button>
        </p>

      </div>
    </>
  );
};