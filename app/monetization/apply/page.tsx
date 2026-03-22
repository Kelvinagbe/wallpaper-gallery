'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, Check, X, Loader2, Shield, Users, ImageIcon, Download, Calendar, CreditCard } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/app/components/AuthProvider';

const Shimmer = ({ w, h, r = 8 }: { w: string | number; h: string | number; r?: number }) => (
  <div style={{ width: w, height: h, borderRadius: r, flexShrink: 0,
    background: 'linear-gradient(90deg,#ececec 25%,#e0e0e0 50%,#ececec 75%)',
    backgroundSize: '200% 100%', animation: 'shimmer 1.4s ease infinite' }} />
);

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
    load();
  }, [profile?.id, authLoading]);

  const load = async () => {
    try {
      const { data } = await supabase.rpc('check_monetization_eligibility', { user_id: profile!.id });
      setEligibility(data);
      // Already approved — go to earnings
      if (data?.status === 'approved') { router.replace('/monetization'); return; }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const handleSubmit = async () => {
    if (!idNumber.trim() || submitting) return;
    const cleaned = idNumber.replace(/\s/g, '');
    if (idType === 'nin' && cleaned.length !== 11) { setError('NIN must be 11 digits'); return; }
    if (idType === 'bvn' && cleaned.length !== 11) { setError('BVN must be 11 digits'); return; }
    setError('');
    setSubmitting(true);
    try {
      const { data, error: rpcError } = await supabase.rpc('apply_for_monetization', {
        id_type:   idType,
        id_number: cleaned,
      });
      if (rpcError || !data?.success) {
        setError(data?.error || rpcError?.message || 'Failed to submit. Try again.');
        return;
      }
      setSubmitted(true);
    } catch (e: any) { setError(e.message || 'Something went wrong'); }
    finally { setSubmitting(false); }
  };

  const reqItems = eligibility ? [
    { icon: Users,     label: 'Followers',    current: eligibility.requirements.followers.current,   required: eligibility.requirements.followers.required,   met: eligibility.requirements.followers.met,   suffix: '' },
    { icon: ImageIcon, label: 'Posts',        current: eligibility.requirements.posts.current,       required: eligibility.requirements.posts.required,       met: eligibility.requirements.posts.met,       suffix: '' },
    { icon: Download,  label: 'Total Views',  current: eligibility.requirements.views.current,       required: eligibility.requirements.views.required,       met: eligibility.requirements.views.met,       suffix: '' },
    { icon: Download,  label: 'Downloads',    current: eligibility.requirements.downloads.current,   required: eligibility.requirements.downloads.required,   met: eligibility.requirements.downloads.met,   suffix: '' },
    { icon: Calendar,  label: 'Account Age',  current: eligibility.requirements.account_age.current, required: eligibility.requirements.account_age.required, met: eligibility.requirements.account_age.met, suffix: ' days' },
  ] : [];

  const metCount   = reqItems.filter(r => r.met).length;
  const totalCount = reqItems.length;
  const progress   = totalCount > 0 ? (metCount / totalCount) * 100 : 0;

  return (
    <div style={{ minHeight: '100dvh', background: '#fff', fontFamily: 'system-ui, sans-serif', color: '#0a0a0a', paddingBottom: 40 }}>
      <style>{`
        @keyframes shimmer { 0%,100%{background-position:200% 0} 50%{background-position:-200% 0} }
        @keyframes fadeUp  { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
        .fade-up { animation: fadeUp .35s cubic-bezier(.16,1,.3,1) forwards; }
        input:focus { border-color: rgba(0,0,0,0.25) !important; background: #fff !important; }
      `}</style>

      {/* Header */}
      <div style={{ position: 'sticky', top: 0, zIndex: 20, display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
        <button onClick={() => router.back()} style={{ width: 34, height: 34, borderRadius: '50%', background: 'rgba(0,0,0,0.05)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
          <ChevronLeft size={18} color="#0a0a0a" strokeWidth={2.5} />
        </button>
        <p style={{ fontSize: 15, fontWeight: 700 }}>Monetization</p>
      </div>

      <div style={{ maxWidth: 600, margin: '0 auto', padding: '20px 16px' }}>

        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <Shimmer w="100%" h={100} r={20} />
            <Shimmer w="100%" h={280} r={20} />
            <Shimmer w="100%" h={160} r={20} />
          </div>

        ) : submitted ? (
          // Success state
          <div className="fade-up" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '48px 20px' }}>
            <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'rgba(16,185,129,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
              <Check size={32} color="#10b981" strokeWidth={2.5} />
            </div>
            <p style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em', margin: '0 0 8px' }}>Application Submitted!</p>
            <p style={{ fontSize: 14, color: 'rgba(0,0,0,0.5)', lineHeight: 1.6, maxWidth: 280, margin: '0 0 32px' }}>
              Your application is under review. We'll notify you once it's been reviewed — usually within 24-48 hours.
            </p>
            <button onClick={() => router.replace('/profile')} style={{ padding: '13px 36px', borderRadius: 26, border: 'none', background: '#0a0a0a', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
              Back to Profile
            </button>
          </div>

        ) : eligibility?.status === 'pending' ? (
          // Already pending
          <div className="fade-up" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '48px 20px' }}>
            <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'rgba(245,158,11,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
              <Loader2 size={30} color="#f59e0b" />
            </div>
            <p style={{ fontSize: 20, fontWeight: 700, margin: '0 0 8px' }}>Application Pending</p>
            <p style={{ fontSize: 14, color: 'rgba(0,0,0,0.5)', lineHeight: 1.6, maxWidth: 280, margin: '0 0 32px' }}>
              Your application is under review. We'll notify you once it has been reviewed.
            </p>
            <button onClick={() => router.replace('/profile')} style={{ padding: '13px 36px', borderRadius: 26, border: '1px solid rgba(0,0,0,0.1)', background: 'transparent', color: 'rgba(0,0,0,0.5)', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
              Back to Profile
            </button>
          </div>

        ) : (
          <div className="fade-up" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* Hero */}
            <div style={{ borderRadius: 20, background: '#0a0a0a', padding: '24px 20px', color: '#fff', textAlign: 'center' }}>
              <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                <Shield size={22} color="#fff" />
              </div>
              <p style={{ fontSize: 18, fontWeight: 700, margin: '0 0 6px', letterSpacing: '-0.02em' }}>Apply for Monetization</p>
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', margin: 0, lineHeight: 1.5 }}>
                Start earning from your wallpapers. Meet the requirements below to apply.
              </p>
            </div>

            {/* Requirements */}
            <div style={{ borderRadius: 20, border: '1px solid rgba(0,0,0,0.07)', background: '#fafafa', padding: '16px 20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                <p style={{ fontSize: 12, fontWeight: 700, color: 'rgba(0,0,0,0.4)', textTransform: 'uppercase', letterSpacing: '0.07em', margin: 0 }}>Requirements</p>
                <span style={{ fontSize: 12, fontWeight: 600, color: eligibility?.eligible ? '#10b981' : 'rgba(0,0,0,0.4)' }}>{metCount}/{totalCount} met</span>
              </div>

              {/* Progress bar */}
              <div style={{ height: 4, background: 'rgba(0,0,0,0.07)', borderRadius: 2, marginBottom: 16, overflow: 'hidden' }}>
                <div style={{ height: '100%', borderRadius: 2, background: eligibility?.eligible ? '#10b981' : '#0a0a0a', width: `${progress}%`, transition: 'width .4s ease' }} />
              </div>

              {reqItems.map(({ icon: Icon, label, current, required, met, suffix }, i, arr) => (
                <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 12, paddingBottom: i < arr.length - 1 ? 12 : 0, marginBottom: i < arr.length - 1 ? 12 : 0, borderBottom: i < arr.length - 1 ? '1px solid rgba(0,0,0,0.05)' : 'none' }}>
                  <div style={{ width: 32, height: 32, borderRadius: 9, background: met ? 'rgba(16,185,129,0.08)' : 'rgba(0,0,0,0.04)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Icon size={14} color={met ? '#10b981' : 'rgba(0,0,0,0.4)'} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 13, fontWeight: 600, color: '#0a0a0a', margin: '0 0 1px' }}>{label}</p>
                    <p style={{ fontSize: 11, color: 'rgba(0,0,0,0.38)', margin: 0 }}>
                      {current}{suffix} / {required}{suffix} required
                    </p>
                  </div>
                  <div style={{ width: 22, height: 22, borderRadius: '50%', background: met ? '#10b981' : 'rgba(0,0,0,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    {met
                      ? <Check size={12} color="#fff" strokeWidth={2.5} />
                      : <X size={11} color="rgba(0,0,0,0.3)" strokeWidth={2.5} />
                    }
                  </div>
                </div>
              ))}
            </div>

            {/* ID Form — only show if eligible */}
            {eligibility?.eligible ? (
              <div style={{ borderRadius: 20, border: '1px solid rgba(0,0,0,0.07)', background: '#fafafa', padding: '16px 20px' }}>
                <p style={{ fontSize: 12, fontWeight: 700, color: 'rgba(0,0,0,0.4)', textTransform: 'uppercase', letterSpacing: '0.07em', margin: '0 0 14px' }}>Identity Verification</p>

                {/* ID Type toggle */}
                <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
                  {(['nin', 'bvn'] as const).map(t => (
                    <button key={t} onClick={() => { setIdType(t); setIdNumber(''); setError(''); }}
                      style={{ flex: 1, padding: '10px 0', borderRadius: 12, border: idType === t ? 'none' : '1px solid rgba(0,0,0,0.1)', background: idType === t ? '#0a0a0a' : 'transparent', color: idType === t ? '#fff' : 'rgba(0,0,0,0.5)', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, transition: 'all .15s' }}>
                      <CreditCard size={13} />
                      {t.toUpperCase()}
                    </button>
                  ))}
                </div>

                {/* ID Number input */}
                <div style={{ marginBottom: 8 }}>
                  <p style={{ fontSize: 11, fontWeight: 700, color: 'rgba(0,0,0,0.35)', textTransform: 'uppercase', letterSpacing: '0.07em', margin: '0 0 7px' }}>{idType.toUpperCase()} Number</p>
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={11}
                    value={idNumber}
                    onChange={e => { setIdNumber(e.target.value.replace(/\D/g, '')); setError(''); }}
                    placeholder={`Enter your ${idType.toUpperCase()} (11 digits)`}
                    style={{ width: '100%', padding: '12px 14px', background: 'rgba(0,0,0,0.03)', border: `1px solid ${error ? 'rgba(239,68,68,0.4)' : 'rgba(0,0,0,0.08)'}`, borderRadius: 12, fontSize: 14, color: '#0a0a0a', fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box', letterSpacing: '0.05em' }}
                  />
                  {error && <p style={{ fontSize: 12, color: '#ef4444', margin: '6px 0 0' }}>{error}</p>}
                </div>

                <p style={{ fontSize: 11, color: 'rgba(0,0,0,0.35)', margin: '0 0 16px', lineHeight: 1.5 }}>
                  Your {idType.toUpperCase()} is used for identity verification only and is stored securely.
                </p>

                <button
                  onClick={handleSubmit}
                  disabled={submitting || idNumber.length !== 11}
                  style={{ width: '100%', padding: '14px 0', borderRadius: 14, border: 'none', background: '#0a0a0a', color: '#fff', fontSize: 14, fontWeight: 700, cursor: submitting || idNumber.length !== 11 ? 'default' : 'pointer', fontFamily: 'inherit', opacity: submitting || idNumber.length !== 11 ? 0.4 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, transition: 'opacity .15s' }}>
                  {submitting ? <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />Submitting...</> : 'Submit Application'}
                </button>
              </div>
            ) : (
              // Not eligible yet
              <div style={{ borderRadius: 20, border: '1px solid rgba(0,0,0,0.06)', background: '#fafafa', padding: '20px', textAlign: 'center' }}>
                <p style={{ fontSize: 14, fontWeight: 600, color: '#0a0a0a', margin: '0 0 6px' }}>Keep growing!</p>
                <p style={{ fontSize: 13, color: 'rgba(0,0,0,0.45)', lineHeight: 1.6, margin: 0 }}>
                  Meet all {totalCount} requirements above to unlock monetization. Keep uploading quality wallpapers to grow your stats.
                </p>
              </div>
            )}

          </div>
        )}
      </div>
    </div>
  );
}
