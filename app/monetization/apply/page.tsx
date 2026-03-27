'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, Check, X, Loader2, Users, Image, Download, Calendar, ArrowRight, Sparkles } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/app/components/AuthProvider';

/* ─── types ─────────────────────────────────────────────── */
interface Req { required: number; current: number; met: boolean }
interface Eligibility {
  eligible: boolean; status: string;
  requirements: { followers: Req; posts: Req; views: Req; downloads: Req; account_age: Req };
}

/* ═══════════════════════════════════════════════════════ */
export default function MonetizationApplyPage() {
  const router   = useRouter();
  const supabase = createClient();
  const { profile, isLoading: authLoading } = useAuth();

  const [loading,    setLoading]    = useState(true);
  const [elig,       setElig]       = useState<Eligibility | null>(null);
  const [idType,     setIdType]     = useState<'nin' | 'bvn'>('nin');
  const [idNumber,   setIdNumber]   = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted,  setSubmitted]  = useState(false);
  const [error,      setError]      = useState('');

  useEffect(() => {
    if (authLoading) return;
    if (!profile?.id) { router.replace('/profile'); return; }
    (async () => {
      try {
        const { data } = await supabase.rpc('check_monetization_eligibility', { user_id: profile!.id });
        setElig(data);
        if (data?.status === 'approved') router.replace('/monetization');
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    })();
  }, [profile?.id, authLoading]);

  const submit = async () => {
    const cleaned = idNumber.replace(/\s/g, '');
    if (cleaned.length !== 11) { setError(`${idType.toUpperCase()} must be 11 digits`); return; }
    setError(''); setSubmitting(true);
    try {
      const { data, error: rpcErr } = await supabase.rpc('apply_for_monetization', { id_type: idType, id_number: cleaned });
      if (rpcErr || !data?.success) { setError(data?.error || rpcErr?.message || 'Failed. Try again.'); return; }
      setSubmitted(true);
    } catch (e: any) { setError(e.message || 'Something went wrong'); }
    finally { setSubmitting(false); }
  };

  /* ── req rows ── */
  const reqs = elig ? [
    { icon: Users,    label: 'Followers',   cur: elig.requirements.followers.current,   req: elig.requirements.followers.required,   met: elig.requirements.followers.met,   sfx: '' },
    { icon: Image,    label: 'Wallpapers',  cur: elig.requirements.posts.current,        req: elig.requirements.posts.required,        met: elig.requirements.posts.met,        sfx: '' },
    { icon: Download, label: 'Views',       cur: elig.requirements.views.current,        req: elig.requirements.views.required,        met: elig.requirements.views.met,        sfx: '' },
    { icon: Download, label: 'Downloads',   cur: elig.requirements.downloads.current,    req: elig.requirements.downloads.required,    met: elig.requirements.downloads.met,    sfx: '' },
    { icon: Calendar, label: 'Account Age', cur: elig.requirements.account_age.current,  req: elig.requirements.account_age.required,  met: elig.requirements.account_age.met,  sfx: 'd' },
  ] : [];

  const metCount = reqs.filter(r => r.met).length;
  const progress = reqs.length ? (metCount / reqs.length) * 100 : 0;

  /* ── loading screen ── */
  if (loading) return (
    <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f7f7f7' }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <Loader2 size={20} color="rgba(0,0,0,0.25)" style={{ animation: 'spin .8s linear infinite' }} />
    </div>
  );

  /* ── shared wrapper ── */
  const Wrap = ({ children }: { children: React.ReactNode }) => (
    <div style={{ minHeight: '100dvh', background: '#f7f7f7', fontFamily: "'DM Sans', system-ui, sans-serif", color: '#111' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap');
        @keyframes spin { to{transform:rotate(360deg)} }
        @keyframes up   { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
        .up { animation: up .38s cubic-bezier(.16,1,.3,1) both; }
        .tap:active { opacity:.6 }
        input:focus { outline: none; border-color: #111 !important; }
      `}</style>
      {/* header */}
      <div style={{ position: 'sticky', top: 0, zIndex: 20, display: 'flex', alignItems: 'center', gap: 10, padding: '13px 16px', background: 'rgba(247,247,247,0.94)', backdropFilter: 'blur(18px)', WebkitBackdropFilter: 'blur(18px)', borderBottom: '1px solid rgba(0,0,0,0.07)' }}>
        <button className="tap" onClick={() => router.back()} style={{ width: 34, height: 34, borderRadius: '50%', background: 'rgba(0,0,0,0.06)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
          <ChevronLeft size={18} strokeWidth={2.5} color="#111" />
        </button>
        <span style={{ fontSize: 15, fontWeight: 700, letterSpacing: '-0.01em' }}>Creator Program</span>
      </div>
      {children}
    </div>
  );

  /* ── success ── */
  if (submitted) return (
    <Wrap>
      <div className="up" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 'calc(100dvh - 60px)', padding: '40px 24px', textAlign: 'center' }}>
        <div style={{ width: 58, height: 58, borderRadius: '50%', background: '#111', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 18 }}>
          <Check size={24} color="#fff" strokeWidth={2.5} />
        </div>
        <p style={{ fontSize: 20, fontWeight: 700, letterSpacing: '-0.02em', margin: '0 0 8px' }}>Application sent</p>
        <p style={{ fontSize: 14, color: 'rgba(0,0,0,0.42)', lineHeight: 1.65, maxWidth: 240, margin: '0 0 28px' }}>
          We'll review your details and notify you within 24–48 hours.
        </p>
        <button className="tap" onClick={() => router.replace('/profile')} style={{ padding: '12px 28px', borderRadius: 40, border: 'none', background: '#111', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
          Back to profile
        </button>
      </div>
    </Wrap>
  );

  /* ── pending ── */
  if (elig?.status === 'pending') return (
    <Wrap>
      <div className="up" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 'calc(100dvh - 60px)', padding: '40px 24px', textAlign: 'center' }}>
        <div style={{ width: 58, height: 58, borderRadius: '50%', background: 'rgba(0,0,0,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 18 }}>
          <Loader2 size={22} color="rgba(0,0,0,0.3)" style={{ animation: 'spin 1.5s linear infinite' }} />
        </div>
        <p style={{ fontSize: 20, fontWeight: 700, letterSpacing: '-0.02em', margin: '0 0 8px' }}>Under review</p>
        <p style={{ fontSize: 14, color: 'rgba(0,0,0,0.42)', lineHeight: 1.65, maxWidth: 240, margin: '0 0 28px' }}>
          Your application is being reviewed. We'll notify you once approved.
        </p>
        <button className="tap" onClick={() => router.replace('/profile')} style={{ padding: '12px 28px', borderRadius: 40, border: '1px solid rgba(0,0,0,0.12)', background: 'transparent', color: 'rgba(0,0,0,0.5)', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
          Back to profile
        </button>
      </div>
    </Wrap>
  );

  /* ── main apply page ── */
  return (
    <Wrap>
      <div style={{ maxWidth: 520, margin: '0 auto', padding: '24px 14px 72px' }}>

        {/* hero */}
        <div className="up" style={{ borderRadius: 20, background: '#111', color: '#fff', padding: '24px 20px', marginBottom: 12, position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', right: -20, bottom: -20, width: 120, height: 120, borderRadius: '50%', background: 'rgba(255,255,255,0.04)', pointerEvents: 'none' }} />
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 20, background: 'rgba(255,255,255,0.1)', marginBottom: 14 }}>
            <Sparkles size={11} color="rgba(255,255,255,0.7)" />
            <span style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.7)', letterSpacing: '0.07em', textTransform: 'uppercase' }}>Wallpaper Monetization</span>
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 700, letterSpacing: '-0.03em', lineHeight: 1.2, margin: '0 0 8px' }}>
            Start earning from<br/>your wallpapers
          </h1>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', margin: 0, lineHeight: 1.6 }}>
            Meet the requirements, verify your identity, and join the creator pool.
          </p>
        </div>

        {/* requirements card */}
        <div className="up" style={{ borderRadius: 20, background: '#fff', border: '1px solid rgba(0,0,0,0.07)', marginBottom: 12, overflow: 'hidden' }}>
          {/* card header */}
          <div style={{ padding: '14px 18px', borderBottom: '1px solid rgba(0,0,0,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: 'rgba(0,0,0,0.35)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Requirements</span>
            <span style={{ fontSize: 12, fontWeight: 700, color: elig?.eligible ? '#16a34a' : 'rgba(0,0,0,0.3)' }}>{metCount} / {reqs.length}</span>
          </div>

          {/* progress bar */}
          <div style={{ height: 3, background: 'rgba(0,0,0,0.05)' }}>
            <div style={{ height: '100%', background: elig?.eligible ? '#16a34a' : '#111', width: `${progress}%`, transition: 'width .5s ease' }} />
          </div>

          {/* rows */}
          {reqs.map(({ icon: Icon, label, cur, req, met, sfx }, i) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 13, padding: '13px 18px', borderBottom: i < reqs.length - 1 ? '1px solid rgba(0,0,0,0.05)' : 'none' }}>
              <div style={{ width: 32, height: 32, borderRadius: 9, background: met ? 'rgba(22,163,74,0.08)' : 'rgba(0,0,0,0.04)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Icon size={14} color={met ? '#16a34a' : 'rgba(0,0,0,0.35)'} />
              </div>
              <span style={{ flex: 1, fontSize: 13, fontWeight: 500, color: met ? '#111' : 'rgba(0,0,0,0.45)' }}>{label}</span>
              <span style={{ fontSize: 12, fontWeight: 600, color: met ? '#16a34a' : 'rgba(0,0,0,0.3)' }}>
                {cur}{sfx}<span style={{ color: 'rgba(0,0,0,0.2)', fontWeight: 400 }}> / {req}{sfx}</span>
              </span>
              {met
                ? <Check size={13} color="#16a34a" strokeWidth={2.5} />
                : <X size={12} color="rgba(0,0,0,0.2)" strokeWidth={2} />
              }
            </div>
          ))}
        </div>

        {/* ID verification — only if eligible */}
        {elig?.eligible ? (
          <div className="up" style={{ borderRadius: 20, background: '#fff', border: '1px solid rgba(0,0,0,0.07)', padding: '18px 18px 20px' }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: 'rgba(0,0,0,0.35)', textTransform: 'uppercase', letterSpacing: '0.07em', margin: '0 0 14px' }}>Identity Verification</p>

            {/* NIN / BVN toggle */}
            <div style={{ display: 'flex', padding: 4, background: 'rgba(0,0,0,0.04)', borderRadius: 12, marginBottom: 12 }}>
              {(['nin', 'bvn'] as const).map(t => (
                <button key={t} onClick={() => { setIdType(t); setIdNumber(''); setError(''); }}
                  style={{ flex: 1, padding: '8px 0', borderRadius: 9, border: 'none', fontFamily: 'inherit', fontSize: 13, fontWeight: 600, cursor: 'pointer', transition: 'all .15s', background: idType === t ? '#fff' : 'transparent', color: idType === t ? '#111' : 'rgba(0,0,0,0.38)', boxShadow: idType === t ? '0 1px 4px rgba(0,0,0,0.08)' : 'none' }}>
                  {t.toUpperCase()}
                </button>
              ))}
            </div>

            <input
              type="text" inputMode="numeric" maxLength={11}
              value={idNumber} placeholder={`Enter ${idType.toUpperCase()} (11 digits)`}
              onChange={e => { setIdNumber(e.target.value.replace(/\D/g, '')); setError(''); }}
              style={{ width: '100%', padding: '13px 15px', background: '#fafafa', border: `1.5px solid ${error ? 'rgba(239,68,68,0.4)' : 'rgba(0,0,0,0.08)'}`, borderRadius: 12, fontSize: 14, fontFamily: 'inherit', color: '#111', boxSizing: 'border-box', letterSpacing: '0.04em', transition: 'border-color .15s' }}
            />
            {error && <p style={{ fontSize: 12, color: '#ef4444', margin: '6px 0 0' }}>{error}</p>}
            <p style={{ fontSize: 11, color: 'rgba(0,0,0,0.28)', margin: '8px 0 16px', lineHeight: 1.5 }}>
              Encrypted · Used for identity verification only
            </p>

            <button
              className="tap" onClick={submit}
              disabled={submitting || idNumber.length !== 11}
              style={{ width: '100%', padding: '14px 0', borderRadius: 14, border: 'none', background: '#111', color: '#fff', fontSize: 14, fontWeight: 700, cursor: submitting || idNumber.length !== 11 ? 'default' : 'pointer', fontFamily: 'inherit', opacity: submitting || idNumber.length !== 11 ? 0.3 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, transition: 'opacity .15s' }}>
              {submitting
                ? <><Loader2 size={15} style={{ animation: 'spin .7s linear infinite' }} /> Submitting…</>
                : <>Submit Application <ArrowRight size={15} /></>
              }
            </button>
          </div>
        ) : (
          <div className="up" style={{ borderRadius: 16, background: 'rgba(0,0,0,0.03)', padding: '14px 16px', textAlign: 'center' }}>
            <p style={{ fontSize: 13, color: 'rgba(0,0,0,0.38)', margin: 0, lineHeight: 1.6 }}>
              Meet all {reqs.length} requirements to unlock the application form.
            </p>
          </div>
        )}
      </div>
    </Wrap>
  );
}
