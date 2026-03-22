'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, Check, X, Loader2, Shield, Users, Image, Download, Calendar, ArrowRight } from 'lucide-react';
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
    { icon: Users,    label: 'Followers',   current: eligibility.requirements.followers.current,   required: eligibility.requirements.followers.required,   met: eligibility.requirements.followers.met,   suffix: '' },
    { icon: Image,    label: 'Posts',       current: eligibility.requirements.posts.current,       required: eligibility.requirements.posts.required,       met: eligibility.requirements.posts.met,       suffix: '' },
    { icon: Download, label: 'Views',       current: eligibility.requirements.views.current,       required: eligibility.requirements.views.required,       met: eligibility.requirements.views.met,       suffix: '' },
    { icon: Download, label: 'Downloads',   current: eligibility.requirements.downloads.current,   required: eligibility.requirements.downloads.required,   met: eligibility.requirements.downloads.met,   suffix: '' },
    { icon: Calendar, label: 'Account Age', current: eligibility.requirements.account_age.current, required: eligibility.requirements.account_age.required, met: eligibility.requirements.account_age.met, suffix: 'd' },
  ] : [];

  const metCount = reqItems.filter(r => r.met).length;
  const progress = reqItems.length > 0 ? (metCount / reqItems.length) * 100 : 0;
  const allMet   = eligibility?.eligible;

  if (loading) return (
    <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fff' }}>
      <Loader2 size={20} color="rgba(0,0,0,0.3)" style={{ animation: 'spin .7s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  return (
    <div style={{ minHeight: '100dvh', background: '#fff', fontFamily: 'system-ui, sans-serif', color: '#0a0a0a' }}>
      <style>{`
        @keyframes spin   { to{transform:rotate(360deg)} }
        @keyframes fadeUp { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
        .fade-up { animation: fadeUp .4s cubic-bezier(.16,1,.3,1) both; }
        .id-tab  { transition: all .15s; }
        .sub-btn { transition: opacity .15s, transform .1s; }
        .sub-btn:active { transform: scale(0.98); }
        input:focus { outline: none; border-color: #0a0a0a !important; background: #fff !important; }
      `}</style>

      {/* Header */}
      <div style={{ position: 'sticky', top: 0, zIndex: 20, display: 'flex', alignItems: 'center', gap: 10, padding: '12px 20px', background: 'rgba(255,255,255,0.94)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
        <button onClick={() => router.back()} style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(0,0,0,0.05)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
          <ChevronLeft size={17} color="#0a0a0a" strokeWidth={2.5} />
        </button>
        <span style={{ fontSize: 14, fontWeight: 600, letterSpacing: '-0.01em' }}>Monetization</span>
      </div>

      {/* Success */}
      {submitted ? (
        <div className="fade-up" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 'calc(100dvh - 57px)', padding: '40px 24px', textAlign: 'center' }}>
          <div style={{ width: 60, height: 60, borderRadius: '50%', background: '#0a0a0a', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
            <Check size={26} color="#fff" strokeWidth={2.5} />
          </div>
          <p style={{ fontSize: 21, fontWeight: 700, letterSpacing: '-0.02em', margin: '0 0 8px' }}>Application sent</p>
          <p style={{ fontSize: 14, color: 'rgba(0,0,0,0.45)', lineHeight: 1.65, maxWidth: 260, margin: '0 0 32px' }}>
            We'll review your details and notify you within 24–48 hours.
          </p>
          <button onClick={() => router.replace('/profile')} style={{ padding: '12px 32px', borderRadius: 40, border: 'none', background: '#0a0a0a', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
            Back to profile
          </button>
        </div>

      ) : eligibility?.status === 'pending' ? (
        /* Pending */
        <div className="fade-up" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 'calc(100dvh - 57px)', padding: '40px 24px', textAlign: 'center' }}>
          <div style={{ width: 60, height: 60, borderRadius: '50%', background: 'rgba(0,0,0,0.04)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
            <Loader2 size={24} color="rgba(0,0,0,0.35)" style={{ animation: 'spin 1.5s linear infinite' }} />
          </div>
          <p style={{ fontSize: 20, fontWeight: 700, letterSpacing: '-0.02em', margin: '0 0 8px' }}>Under review</p>
          <p style={{ fontSize: 14, color: 'rgba(0,0,0,0.45)', lineHeight: 1.65, maxWidth: 260, margin: '0 0 32px' }}>
            Your application is being reviewed. We'll notify you once it's done.
          </p>
          <button onClick={() => router.replace('/profile')} style={{ padding: '12px 32px', borderRadius: 40, border: '1px solid rgba(0,0,0,0.1)', background: 'transparent', color: 'rgba(0,0,0,0.5)', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
            Back to profile
          </button>
        </div>

      ) : (
        /* Main */
        <div className="fade-up" style={{ maxWidth: 520, margin: '0 auto', padding: '32px 20px 60px' }}>

          {/* Title block */}
          <div style={{ marginBottom: 32 }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 20, background: 'rgba(0,0,0,0.04)', marginBottom: 14 }}>
              <Shield size={11} color="rgba(0,0,0,0.45)" />
              <span style={{ fontSize: 10, fontWeight: 700, color: 'rgba(0,0,0,0.45)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Creator Program</span>
            </div>
            <h1 style={{ fontSize: 26, fontWeight: 700, letterSpacing: '-0.03em', lineHeight: 1.15, margin: '0 0 10px' }}>
              Start earning<br/>from your wallpapers
            </h1>
            <p style={{ fontSize: 14, color: 'rgba(0,0,0,0.45)', lineHeight: 1.65, margin: 0 }}>
              Meet the requirements below and verify your identity to apply.
            </p>
          </div>

          {/* Requirements */}
          <div style={{ marginBottom: 28 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: 'rgba(0,0,0,0.3)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Requirements</span>
              <span style={{ fontSize: 12, fontWeight: 600, color: allMet ? '#10b981' : 'rgba(0,0,0,0.3)' }}>{metCount}/{reqItems.length} met</span>
            </div>

            {/* Progress */}
            <div style={{ height: 3, background: 'rgba(0,0,0,0.06)', borderRadius: 2, marginBottom: 14, overflow: 'hidden' }}>
              <div style={{ height: '100%', borderRadius: 2, background: allMet ? '#10b981' : '#0a0a0a', width: `${progress}%`, transition: 'width .5s ease' }} />
            </div>

            <div style={{ border: '1px solid rgba(0,0,0,0.07)', borderRadius: 14, overflow: 'hidden' }}>
              {reqItems.map(({ label, current, required, met, suffix }, i, arr) => (
                <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', background: '#fff', borderBottom: i < arr.length - 1 ? '1px solid rgba(0,0,0,0.05)' : 'none' }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: met ? '#10b981' : 'rgba(0,0,0,0.15)', flexShrink: 0 }} />
                  <span style={{ flex: 1, fontSize: 13, fontWeight: 500, color: met ? '#0a0a0a' : 'rgba(0,0,0,0.45)' }}>{label}</span>
                  <span style={{ fontSize: 12, color: met ? '#10b981' : 'rgba(0,0,0,0.3)', fontWeight: 600 }}>
                    {current}{suffix}<span style={{ color: 'rgba(0,0,0,0.2)', fontWeight: 400 }}> / {required}{suffix}</span>
                  </span>
                  {met
                    ? <Check size={13} color="#10b981" strokeWidth={2.5} />
                    : <X size={12} color="rgba(0,0,0,0.2)" strokeWidth={2} />
                  }
                </div>
              ))}
            </div>
          </div>

          {/* ID Form */}
          {allMet ? (
            <div>
              <span style={{ fontSize: 11, fontWeight: 700, color: 'rgba(0,0,0,0.3)', textTransform: 'uppercase', letterSpacing: '0.07em', display: 'block', marginBottom: 12 }}>Identity Verification</span>

              {/* NIN / BVN toggle */}
              <div style={{ display: 'flex', gap: 0, marginBottom: 14, padding: 4, background: 'rgba(0,0,0,0.04)', borderRadius: 12 }}>
                {(['nin', 'bvn'] as const).map(t => (
                  <button key={t} className="id-tab" onClick={() => { setIdType(t); setIdNumber(''); setError(''); }}
                    style={{ flex: 1, padding: '8px 0', borderRadius: 9, border: 'none', background: idType === t ? '#fff' : 'transparent', color: idType === t ? '#0a0a0a' : 'rgba(0,0,0,0.4)', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', boxShadow: idType === t ? '0 1px 4px rgba(0,0,0,0.08)' : 'none' }}>
                    {t.toUpperCase()}
                  </button>
                ))}
              </div>

              <input
                type="text"
                inputMode="numeric"
                maxLength={11}
                value={idNumber}
                onChange={e => { setIdNumber(e.target.value.replace(/\D/g, '')); setError(''); }}
                placeholder={`Enter ${idType.toUpperCase()} (11 digits)`}
                style={{ width: '100%', padding: '13px 16px', background: '#fafafa', border: `1.5px solid ${error ? 'rgba(239,68,68,0.45)' : 'rgba(0,0,0,0.08)'}`, borderRadius: 12, fontSize: 14, color: '#0a0a0a', fontFamily: 'inherit', boxSizing: 'border-box', letterSpacing: '0.05em', transition: 'border-color .15s' }}
              />
              {error && <p style={{ fontSize: 12, color: '#ef4444', margin: '6px 0 0' }}>{error}</p>}

              <p style={{ fontSize: 11, color: 'rgba(0,0,0,0.28)', margin: '10px 0 20px', lineHeight: 1.5 }}>
                Stored securely · Used for identity verification only
              </p>

              <button className="sub-btn" onClick={handleSubmit} disabled={submitting || idNumber.length !== 11}
                style={{ width: '100%', padding: '14px 0', borderRadius: 14, border: 'none', background: '#0a0a0a', color: '#fff', fontSize: 14, fontWeight: 700, cursor: submitting || idNumber.length !== 11 ? 'default' : 'pointer', fontFamily: 'inherit', opacity: submitting || idNumber.length !== 11 ? 0.35 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                {submitting
                  ? <><Loader2 size={15} style={{ animation: 'spin .7s linear infinite' }} />Submitting</>
                  : <>Submit Application <ArrowRight size={15} /></>
                }
              </button>
            </div>
          ) : (
            <div style={{ padding: '16px 18px', borderRadius: 12, background: 'rgba(0,0,0,0.03)', border: '1px solid rgba(0,0,0,0.06)', textAlign: 'center' }}>
              <p style={{ fontSize: 13, color: 'rgba(0,0,0,0.4)', margin: 0, lineHeight: 1.6 }}>
                Meet all {reqItems.length} requirements to unlock the application.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
