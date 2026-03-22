'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, Check, X, Loader2, ArrowRight } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/app/components/AuthProvider';

interface Req { required: number; current: number; met: boolean }
interface Eligibility {
  eligible: boolean;
  status:   string;
  requirements: {
    followers:   Req;
    posts:       Req;
    views:       Req;
    downloads:   Req;
    account_age: Req;
  };
}

export default function MonetizationApplyPage() {
  const router   = useRouter();
  const supabase = createClient();
  const { profile, isLoading: authLoading } = useAuth();

  const [loading,     setLoading]     = useState(true);
  const [eligibility, setEligibility] = useState<Eligibility | null>(null);
  const [idType,      setIdType]      = useState<'nin' | 'bvn'>('nin');
  const [idNumber,    setIdNumber]    = useState('');
  const [submitting,  setSubmitting]  = useState(false);
  const [submitted,   setSubmitted]   = useState(false);
  const [error,       setError]       = useState('');

  useEffect(() => {
    if (authLoading) return;
    if (!profile?.id) { router.replace('/profile'); return; }
    (async () => {
      try {
        const { data } = await supabase.rpc('check_monetization_eligibility', { user_id: profile!.id });
        setEligibility(data);
        if (data?.status === 'approved') { router.replace('/monetization'); return; }
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    })();
  }, [profile?.id, authLoading]);

  const handleSubmit = async () => {
    if (!idNumber.trim() || submitting) return;
    const cleaned = idNumber.replace(/\s/g, '');
    if (cleaned.length !== 11) { setError(`${idType.toUpperCase()} must be 11 digits`); return; }
    setError('');
    setSubmitting(true);
    try {
      const { data, error: rpcError } = await supabase.rpc('apply_for_monetization', { id_type: idType, id_number: cleaned });
      if (rpcError || !data?.success) { setError(data?.error || rpcError?.message || 'Failed to submit. Try again.'); return; }
      setSubmitted(true);
    } catch (e: any) { setError(e.message || 'Something went wrong'); }
    finally { setSubmitting(false); }
  };

  const reqItems = eligibility ? [
    { label: 'Followers',   current: eligibility.requirements.followers.current,   required: eligibility.requirements.followers.required,   met: eligibility.requirements.followers.met,   suffix: '' },
    { label: 'Posts',       current: eligibility.requirements.posts.current,       required: eligibility.requirements.posts.required,       met: eligibility.requirements.posts.met,       suffix: '' },
    { label: 'Views',       current: eligibility.requirements.views.current,       required: eligibility.requirements.views.required,       met: eligibility.requirements.views.met,       suffix: '' },
    { label: 'Downloads',   current: eligibility.requirements.downloads.current,   required: eligibility.requirements.downloads.required,   met: eligibility.requirements.downloads.met,   suffix: '' },
    { label: 'Account Age', current: eligibility.requirements.account_age.current, required: eligibility.requirements.account_age.required, met: eligibility.requirements.account_age.met, suffix: 'd' },
  ] : [];

  const metCount = reqItems.filter(r => r.met).length;
  const allMet   = eligibility?.eligible;

  // ── CSS vars ──────────────────────────────────────────────────────────────
  const C = {
    border:  '1px solid rgba(0,0,0,0.08)',
    muted:   'rgba(0,0,0,0.4)',
    faint:   'rgba(0,0,0,0.22)',
    surface: '#fafafa',
    green:   '#16a34a',
  };

  if (loading) return (
    <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fff' }}>
      <Loader2 size={18} color={C.faint} style={{ animation: 'spin .8s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  return (
    <div style={{ minHeight: '100dvh', background: '#fff', color: '#0a0a0a', fontFamily: "'Geist', 'Inter', system-ui, sans-serif" }}>
      <style>{`
        @keyframes spin   { to { transform: rotate(360deg) } }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(6px) } to { opacity: 1; transform: translateY(0) } }
        .page { animation: fadeIn .3s ease both; }
        .tab:active  { opacity: .7; }
        .tab         { transition: all .12s; }
        .btn:active  { opacity: .8; transform: scale(.99); }
        .btn         { transition: opacity .12s, transform .1s; }
        input:focus  { outline: none; border-color: rgba(0,0,0,0.3) !important; }
      `}</style>

      {/* ── Nav bar ── */}
      <nav style={{ position: 'sticky', top: 0, zIndex: 10, borderBottom: C.border, background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', display: 'flex', alignItems: 'center', height: 52, padding: '0 16px', gap: 10 }}>
        <button onClick={() => router.back()} style={{ width: 28, height: 28, borderRadius: 6, border: C.border, background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
          <ChevronLeft size={15} color="#0a0a0a" strokeWidth={2} />
        </button>
        <span style={{ fontSize: 13, fontWeight: 500, color: C.muted }}>Monetization</span>
      </nav>

      {/* ── Success ── */}
      {submitted ? (
        <div className="page" style={{ maxWidth: 400, margin: '80px auto', padding: '0 24px', textAlign: 'center' }}>
          <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#0a0a0a', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
            <Check size={18} color="#fff" strokeWidth={2.5} />
          </div>
          <p style={{ fontSize: 18, fontWeight: 600, letterSpacing: '-0.02em', margin: '0 0 8px' }}>Application submitted</p>
          <p style={{ fontSize: 13, color: C.muted, lineHeight: 1.6, margin: '0 0 28px' }}>
            We'll review your details and notify you within 24–48 hours.
          </p>
          <button className="btn" onClick={() => router.replace('/profile')}
            style={{ padding: '8px 20px', borderRadius: 6, border: C.border, background: '#fff', fontSize: 13, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit', color: '#0a0a0a' }}>
            Back to profile
          </button>
        </div>

      ) : eligibility?.status === 'pending' ? (
        /* ── Pending ── */
        <div className="page" style={{ maxWidth: 400, margin: '80px auto', padding: '0 24px', textAlign: 'center' }}>
          <div style={{ width: 40, height: 40, borderRadius: '50%', border: C.border, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
            <Loader2 size={17} color={C.muted} style={{ animation: 'spin 1.4s linear infinite' }} />
          </div>
          <p style={{ fontSize: 18, fontWeight: 600, letterSpacing: '-0.02em', margin: '0 0 8px' }}>Under review</p>
          <p style={{ fontSize: 13, color: C.muted, lineHeight: 1.6, margin: '0 0 28px' }}>
            Your application is being reviewed. We'll notify you when done.
          </p>
          <button className="btn" onClick={() => router.replace('/profile')}
            style={{ padding: '8px 20px', borderRadius: 6, border: C.border, background: '#fff', fontSize: 13, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit', color: '#0a0a0a' }}>
            Back to profile
          </button>
        </div>

      ) : (
        /* ── Main ── */
        <div className="page" style={{ maxWidth: 480, margin: '0 auto', padding: '40px 20px 80px' }}>

          {/* Title */}
          <div style={{ marginBottom: 36 }}>
            <p style={{ fontSize: 11, fontWeight: 500, color: C.faint, letterSpacing: '0.06em', textTransform: 'uppercase', margin: '0 0 10px' }}>Creator Program</p>
            <h1 style={{ fontSize: 24, fontWeight: 600, letterSpacing: '-0.03em', lineHeight: 1.2, margin: '0 0 10px' }}>
              Apply for Monetization
            </h1>
            <p style={{ fontSize: 13, color: C.muted, lineHeight: 1.65, margin: 0 }}>
              Meet the requirements below and verify your identity to start earning from your wallpapers.
            </p>
          </div>

          {/* Requirements card */}
          <div style={{ marginBottom: 28, border: C.border, borderRadius: 8, overflow: 'hidden' }}>
            {/* Card header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderBottom: C.border, background: C.surface }}>
              <span style={{ fontSize: 12, fontWeight: 500, color: C.muted }}>Requirements</span>
              <span style={{ fontSize: 12, fontWeight: 500, color: allMet ? C.green : C.faint }}>{metCount}/{reqItems.length} met</span>
            </div>

            {/* Rows */}
            {reqItems.map(({ label, current, required, met, suffix }, i, arr) => (
              <div key={label} style={{ display: 'flex', alignItems: 'center', padding: '10px 14px', background: '#fff', borderBottom: i < arr.length - 1 ? C.border : 'none' }}>
                {met
                  ? <Check size={13} color={C.green} strokeWidth={2.5} style={{ marginRight: 10, flexShrink: 0 }} />
                  : <X     size={12} color={C.faint} strokeWidth={2}   style={{ marginRight: 10, flexShrink: 0 }} />
                }
                <span style={{ flex: 1, fontSize: 13, color: '#0a0a0a' }}>{label}</span>
                <span style={{ fontSize: 12, color: met ? C.green : C.muted, fontVariantNumeric: 'tabular-nums' }}>
                  {current}{suffix}
                  <span style={{ color: C.faint }}> / {required}{suffix}</span>
                </span>
              </div>
            ))}

            {/* Progress bar */}
            <div style={{ height: 2, background: 'rgba(0,0,0,0.05)' }}>
              <div style={{ height: '100%', background: allMet ? C.green : '#0a0a0a', width: `${reqItems.length > 0 ? (metCount / reqItems.length) * 100 : 0}%`, transition: 'width .5s ease' }} />
            </div>
          </div>

          {/* ID form */}
          {allMet ? (
            <div>
              {/* Section label */}
              <p style={{ fontSize: 12, fontWeight: 500, color: C.muted, margin: '0 0 10px' }}>Identity Verification</p>

              {/* NIN / BVN tabs */}
              <div style={{ display: 'inline-flex', border: C.border, borderRadius: 6, overflow: 'hidden', marginBottom: 14 }}>
                {(['nin', 'bvn'] as const).map(t => (
                  <button key={t} className="tab" onClick={() => { setIdType(t); setIdNumber(''); setError(''); }}
                    style={{ padding: '6px 18px', border: 'none', borderRight: t === 'nin' ? C.border : 'none', background: idType === t ? '#0a0a0a' : '#fff', color: idType === t ? '#fff' : C.muted, fontSize: 12, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit', letterSpacing: '0.03em' }}>
                    {t.toUpperCase()}
                  </button>
                ))}
              </div>

              {/* Input */}
              <input
                type="text"
                inputMode="numeric"
                maxLength={11}
                value={idNumber}
                onChange={e => { setIdNumber(e.target.value.replace(/\D/g, '')); setError(''); }}
                placeholder={`${idType.toUpperCase()} number`}
                style={{ display: 'block', width: '100%', padding: '9px 12px', border: `1px solid ${error ? 'rgba(220,38,38,0.5)' : 'rgba(0,0,0,0.1)'}`, borderRadius: 6, fontSize: 13, color: '#0a0a0a', fontFamily: 'inherit', background: '#fff', boxSizing: 'border-box', letterSpacing: '0.04em', transition: 'border-color .12s' }}
              />
              {error && <p style={{ fontSize: 12, color: '#dc2626', margin: '5px 0 0' }}>{error}</p>}

              <p style={{ fontSize: 11, color: C.faint, margin: '8px 0 20px', lineHeight: 1.5 }}>
                11 digits · Stored securely · Used for verification only
              </p>

              <button className="btn" onClick={handleSubmit} disabled={submitting || idNumber.length !== 11}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, width: '100%', padding: '9px 0', borderRadius: 6, border: 'none', background: '#0a0a0a', color: '#fff', fontSize: 13, fontWeight: 500, cursor: submitting || idNumber.length !== 11 ? 'default' : 'pointer', fontFamily: 'inherit', opacity: submitting || idNumber.length !== 11 ? 0.35 : 1 }}>
                {submitting
                  ? <><Loader2 size={14} style={{ animation: 'spin .8s linear infinite' }} /> Submitting</>
                  : <>Submit Application <ArrowRight size={14} /></>
                }
              </button>
            </div>
          ) : (
            <div style={{ padding: '12px 14px', border: C.border, borderRadius: 6, background: C.surface }}>
              <p style={{ fontSize: 12, color: C.muted, margin: 0, lineHeight: 1.6 }}>
                Meet all {reqItems.length} requirements above to unlock the application form.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
