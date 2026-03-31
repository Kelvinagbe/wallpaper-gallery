'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  ChevronLeft, Check, X, Loader2, Users, Image, Download,
  Calendar, ArrowRight, Sparkles, Building2, CreditCard, User,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/app/components/AuthProvider';

/* ─── types ─────────────────────────────────────────────── */
interface Req { required: number; current: number; met: boolean }
interface Eligibility {
  eligible: boolean; status: string;
  requirements: {
    followers: Req; posts: Req; views: Req; downloads: Req; account_age: Req;
  };
}

const CATEGORIES = ['Nature', 'Abstract', 'AI Art', 'Photography', 'Minimal', 'Dark', 'Anime', 'Architecture', 'Other'];

const NIGERIAN_BANKS = [
  'Access Bank', 'GTBank', 'First Bank', 'UBA', 'Zenith Bank',
  'Fidelity Bank', 'FCMB', 'Union Bank', 'Stanbic IBTC', 'Sterling Bank',
  'Wema Bank', 'Polaris Bank', 'Keystone Bank', 'Jaiz Bank', 'Opay',
  'Palmpay', 'Kuda Bank', 'Moniepoint', 'VFD Microfinance Bank',
];

const S = {
  bg: '#f7f7f7', surface: '#fff', ink: '#111',
  ink2: 'rgba(0,0,0,0.42)', ink3: 'rgba(0,0,0,0.28)',
  border: 'rgba(0,0,0,0.07)', green: '#16a34a',
};

const css = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap');
  @keyframes spin { to { transform: rotate(360deg) } }
  @keyframes up   { from { opacity:0; transform:translateY(12px) } to { opacity:1; transform:translateY(0) } }
  .up  { animation: up .38s cubic-bezier(.16,1,.3,1) both }
  .tap:active { opacity:.6 }
  input:focus, select:focus { outline: none; border-color: #111 !important; }
  select { appearance: none; -webkit-appearance: none; }
`;

/* ─── tiny atoms ─────────────────────────────────────────── */
const Spin = ({ size = 15 }: { size?: number }) => (
  <Loader2 size={size} style={{ animation: 'spin .7s linear infinite' }} />
);

const Label = ({ children }: { children: React.ReactNode }) => (
  <p style={{ fontSize: 11, fontWeight: 700, color: S.ink3, textTransform: 'uppercase', letterSpacing: '.07em', margin: '0 0 10px' }}>
    {children}
  </p>
);

const inputStyle = (err?: boolean): React.CSSProperties => ({
  width: '100%', padding: '13px 15px', background: '#fafafa',
  border: `1.5px solid ${err ? 'rgba(239,68,68,0.4)' : S.border}`,
  borderRadius: 12, fontSize: 14, fontFamily: 'inherit', color: S.ink,
  boxSizing: 'border-box', transition: 'border-color .15s',
});

/* ─── header ─────────────────────────────────────────────── */
const Header = ({ onBack }: { onBack: () => void }) => (
  <div style={{ position: 'sticky', top: 0, zIndex: 20, display: 'flex', alignItems: 'center', gap: 10, padding: '13px 16px', background: 'rgba(247,247,247,0.94)', backdropFilter: 'blur(18px)', WebkitBackdropFilter: 'blur(18px)', borderBottom: `1px solid ${S.border}` }}>
    <button className="tap" onClick={onBack} style={{ width: 34, height: 34, borderRadius: '50%', background: 'rgba(0,0,0,0.06)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
      <ChevronLeft size={18} strokeWidth={2.5} color={S.ink} />
    </button>
    <span style={{ fontSize: 15, fontWeight: 700, letterSpacing: '-0.01em' }}>Creator Program</span>
  </div>
);

/* ═══════════════════════════════════════════════════════════ */
export default function MonetizationApplyPage() {
  const router   = useRouter();
  const supabase = createClient();
  const { profile, isLoading: authLoading } = useAuth();

  const [loading,    setLoading]    = useState(true);
  const [elig,       setElig]       = useState<Eligibility | null>(null);

  // form state
  const [idType,     setIdType]     = useState<'nin' | 'bvn'>('nin');
  const [idNumber,   setIdNumber]   = useState('');
  const [bankName,   setBankName]   = useState('');
  const [accNumber,  setAccNumber]  = useState('');
  const [accName,    setAccName]    = useState('');
  const [category,   setCategory]   = useState('');
  const [terms,      setTerms]      = useState(false);
  const [errors,     setErrors]     = useState<Record<string, string>>({});

  const [submitting, setSubmitting] = useState(false);
  const [submitted,  setSubmitted]  = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!profile?.id) { router.replace('/profile'); return; }
    (async () => {
      try {
        const { data } = await supabase.rpc('check_monetization_eligibility', { user_id: profile.id });
        setElig(data);
        if (data?.status === 'approved') router.replace('/monetization');
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    })();
  }, [profile?.id, authLoading]); // eslint-disable-line

  /* ── validation ── */
  const validate = () => {
    const e: Record<string, string> = {};
    if (idNumber.length !== 11)     e.id       = `${idType.toUpperCase()} must be 11 digits`;
    if (!bankName)                  e.bank     = 'Select a bank';
    if (accNumber.replace(/\D/g, '').length !== 10) e.accNumber = 'Account number must be 10 digits';
    if (!accName.trim())            e.accName  = 'Enter account name';
    if (!category)                  e.category = 'Select a content category';
    if (!terms)                     e.terms    = 'You must agree to the terms';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  /* ── submit ── */
  const submit = async () => {
    if (!validate()) return;
    setSubmitting(true);
    try {
      const { data, error: rpcErr } = await supabase.rpc('apply_for_monetization', {
        id_type:          idType,
        id_number:        idNumber,
        bank_name:        bankName,
        account_number:   accNumber,
        account_name:     accName,
        content_category: category,
        terms_agreed:     terms,
      });
      if (rpcErr || !data?.success) {
        setErrors({ submit: data?.error || rpcErr?.message || 'Failed. Try again.' });
        return;
      }
      setSubmitted(true);
    } catch (e: any) {
      setErrors({ submit: e.message || 'Something went wrong' });
    } finally { setSubmitting(false); }
  };

  const clearErr = (k: string) => setErrors(p => ({ ...p, [k]: '' }));

  /* ── requirements ── */
  const reqs = elig ? [
    { icon: Users,    label: 'Followers',   cur: elig.requirements.followers.current,    req: elig.requirements.followers.required,    met: elig.requirements.followers.met,    sfx: '' },
    { icon: Image,    label: 'Wallpapers',  cur: elig.requirements.posts.current,         req: elig.requirements.posts.required,         met: elig.requirements.posts.met,         sfx: '' },
    { icon: Download, label: 'Views',       cur: elig.requirements.views.current,         req: elig.requirements.views.required,         met: elig.requirements.views.met,         sfx: '' },
    { icon: Download, label: 'Downloads',   cur: elig.requirements.downloads.current,     req: elig.requirements.downloads.required,     met: elig.requirements.downloads.met,     sfx: '' },
    { icon: Calendar, label: 'Account Age', cur: elig.requirements.account_age.current,   req: elig.requirements.account_age.required,   met: elig.requirements.account_age.met,   sfx: 'd' },
  ] : [];

  const metCount = reqs.filter(r => r.met).length;
  const progress = reqs.length ? (metCount / reqs.length) * 100 : 0;

  /* ── loading ── */
  if (loading) return (
    <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: S.bg }}>
      <style>{css}</style>
      <Spin size={20} />
    </div>
  );

  /* ── wrapper ── */
  const wrap = (children: React.ReactNode) => (
    <div style={{ minHeight: '100dvh', background: S.bg, fontFamily: "'DM Sans',system-ui,sans-serif", color: S.ink }}>
      <style>{css}</style>
      <Header onBack={() => router.back()} />
      {children}
    </div>
  );

  /* ── success ── */
  if (submitted) return wrap(
    <div className="up" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 'calc(100dvh - 60px)', padding: '40px 24px', textAlign: 'center' }}>
      <div style={{ width: 58, height: 58, borderRadius: '50%', background: S.ink, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 18 }}>
        <Check size={24} color="#fff" strokeWidth={2.5} />
      </div>
      <p style={{ fontSize: 20, fontWeight: 700, letterSpacing: '-0.02em', margin: '0 0 8px' }}>Application sent</p>
      <p style={{ fontSize: 14, color: S.ink2, lineHeight: 1.65, maxWidth: 240, margin: '0 0 28px' }}>
        We'll review your details and notify you within 24–48 hours.
      </p>
      <button className="tap" onClick={() => router.replace('/profile')}
        style={{ padding: '12px 28px', borderRadius: 40, border: 'none', background: S.ink, color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
        Back to profile
      </button>
    </div>
  );

  /* ── pending ── */
  if (elig?.status === 'pending') return wrap(
    <div className="up" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 'calc(100dvh - 60px)', padding: '40px 24px', textAlign: 'center' }}>
      <div style={{ width: 58, height: 58, borderRadius: '50%', background: 'rgba(0,0,0,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 18 }}>
        <Spin size={22} />
      </div>
      <p style={{ fontSize: 20, fontWeight: 700, letterSpacing: '-0.02em', margin: '0 0 8px' }}>Under review</p>
      <p style={{ fontSize: 14, color: S.ink2, lineHeight: 1.65, maxWidth: 240, margin: '0 0 28px' }}>
        Your application is being reviewed. We'll notify you once approved.
      </p>
      <button className="tap" onClick={() => router.replace('/profile')}
        style={{ padding: '12px 28px', borderRadius: 40, border: `1px solid ${S.border}`, background: 'transparent', color: S.ink2, fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
        Back to profile
      </button>
    </div>
  );

  /* ── main ── */
  return wrap(
    <div style={{ maxWidth: 520, margin: '0 auto', padding: '24px 14px 72px' }}>

      {/* hero */}
      <div className="up" style={{ borderRadius: 20, background: S.ink, color: '#fff', padding: '24px 20px', marginBottom: 12, position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', right: -20, bottom: -20, width: 120, height: 120, borderRadius: '50%', background: 'rgba(255,255,255,0.04)', pointerEvents: 'none' }} />
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 20, background: 'rgba(255,255,255,0.1)', marginBottom: 14 }}>
          <Sparkles size={11} color="rgba(255,255,255,0.7)" />
          <span style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.7)', letterSpacing: '0.07em', textTransform: 'uppercase' }}>Wallpaper Monetization</span>
        </div>
        <h1 style={{ fontSize: 24, fontWeight: 700, letterSpacing: '-0.03em', lineHeight: 1.2, margin: '0 0 8px' }}>
          Start earning from<br />your wallpapers
        </h1>
        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', margin: 0, lineHeight: 1.6 }}>
          Meet the requirements, verify your identity, and join the creator pool.
        </p>
      </div>

      {/* requirements */}
      <div className="up" style={{ borderRadius: 20, background: S.surface, border: `1px solid ${S.border}`, marginBottom: 12, overflow: 'hidden' }}>
        <div style={{ padding: '14px 18px', borderBottom: `1px solid rgba(0,0,0,0.05)`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: 'rgba(0,0,0,0.35)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Requirements</span>
          <span style={{ fontSize: 12, fontWeight: 700, color: elig?.eligible ? S.green : 'rgba(0,0,0,0.3)' }}>{metCount} / {reqs.length}</span>
        </div>
        <div style={{ height: 3, background: 'rgba(0,0,0,0.05)' }}>
          <div style={{ height: '100%', background: elig?.eligible ? S.green : S.ink, width: `${progress}%`, transition: 'width .5s ease' }} />
        </div>
        {reqs.map(({ icon: Icon, label, cur, req, met, sfx }, i) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 13, padding: '13px 18px', borderBottom: i < reqs.length - 1 ? '1px solid rgba(0,0,0,0.05)' : 'none' }}>
            <div style={{ width: 32, height: 32, borderRadius: 9, background: met ? 'rgba(22,163,74,0.08)' : 'rgba(0,0,0,0.04)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Icon size={14} color={met ? S.green : 'rgba(0,0,0,0.35)'} />
            </div>
            <span style={{ flex: 1, fontSize: 13, fontWeight: 500, color: met ? S.ink : 'rgba(0,0,0,0.45)' }}>{label}</span>
            <span style={{ fontSize: 12, fontWeight: 600, color: met ? S.green : 'rgba(0,0,0,0.3)' }}>
              {cur}{sfx}<span style={{ color: 'rgba(0,0,0,0.2)', fontWeight: 400 }}> / {req}{sfx}</span>
            </span>
            {met ? <Check size={13} color={S.green} strokeWidth={2.5} /> : <X size={12} color="rgba(0,0,0,0.2)" strokeWidth={2} />}
          </div>
        ))}
      </div>

      {elig?.eligible ? (
        <>
          {/* ── Identity verification ── */}
          <div className="up" style={{ borderRadius: 20, background: S.surface, border: `1px solid ${S.border}`, padding: '18px 18px 20px', marginBottom: 12 }}>
            <Label>Identity Verification</Label>
            <div style={{ display: 'flex', padding: 4, background: 'rgba(0,0,0,0.04)', borderRadius: 12, marginBottom: 12 }}>
              {(['nin', 'bvn'] as const).map(t => (
                <button key={t} onClick={() => { setIdType(t); setIdNumber(''); clearErr('id'); }}
                  style={{ flex: 1, padding: '8px 0', borderRadius: 9, border: 'none', fontFamily: 'inherit', fontSize: 13, fontWeight: 600, cursor: 'pointer', transition: 'all .15s', background: idType === t ? '#fff' : 'transparent', color: idType === t ? S.ink : 'rgba(0,0,0,0.38)', boxShadow: idType === t ? '0 1px 4px rgba(0,0,0,0.08)' : 'none' }}>
                  {t.toUpperCase()}
                </button>
              ))}
            </div>
            <div style={{ position: 'relative' }}>
              <input
                type="text" inputMode="numeric" maxLength={11}
                value={idNumber} placeholder={`Enter ${idType.toUpperCase()} (11 digits)`}
                onChange={e => { setIdNumber(e.target.value.replace(/\D/g, '')); clearErr('id'); }}
                style={inputStyle(!!errors.id)}
              />
              <span style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', fontSize: 11, fontWeight: 600, color: idNumber.length === 11 ? S.green : S.ink3 }}>
                {idNumber.length} / 11
              </span>
            </div>
            {errors.id && <p style={{ fontSize: 12, color: '#ef4444', margin: '5px 0 0' }}>{errors.id}</p>}
            <p style={{ fontSize: 11, color: S.ink3, margin: '7px 0 0', lineHeight: 1.5 }}>Encrypted · Used for identity verification only</p>
          </div>

          {/* ── Payout details ── */}
          <div className="up" style={{ borderRadius: 20, background: S.surface, border: `1px solid ${S.border}`, padding: '18px 18px 20px', marginBottom: 12 }}>
            <Label>Payout Details</Label>

            {/* bank select */}
            <div style={{ marginBottom: 10 }}>
              <div style={{ position: 'relative' }}>
                <Building2 size={14} color={S.ink3} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                <select
                  value={bankName} onChange={e => { setBankName(e.target.value); clearErr('bank'); }}
                  style={{ ...inputStyle(!!errors.bank), paddingLeft: 38, cursor: 'pointer' }}>
                  <option value="">Select bank</option>
                  {NIGERIAN_BANKS.map(b => <option key={b} value={b}>{b}</option>)}
                </select>
              </div>
              {errors.bank && <p style={{ fontSize: 12, color: '#ef4444', margin: '5px 0 0' }}>{errors.bank}</p>}
            </div>

            {/* account number */}
            <div style={{ marginBottom: 10 }}>
              <div style={{ position: 'relative' }}>
                <CreditCard size={14} color={S.ink3} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                <input
                  type="text" inputMode="numeric" maxLength={10}
                  value={accNumber} placeholder="Account number (10 digits)"
                  onChange={e => { setAccNumber(e.target.value.replace(/\D/g, '')); clearErr('accNumber'); }}
                  style={{ ...inputStyle(!!errors.accNumber), paddingLeft: 38 }}
                />
                <span style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', fontSize: 11, fontWeight: 600, color: accNumber.length === 10 ? S.green : S.ink3 }}>
                  {accNumber.length} / 10
                </span>
              </div>
              {errors.accNumber && <p style={{ fontSize: 12, color: '#ef4444', margin: '5px 0 0' }}>{errors.accNumber}</p>}
            </div>

            {/* account name */}
            <div>
              <div style={{ position: 'relative' }}>
                <User size={14} color={S.ink3} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                <input
                  type="text"
                  value={accName} placeholder="Account name"
                  onChange={e => { setAccName(e.target.value); clearErr('accName'); }}
                  style={{ ...inputStyle(!!errors.accName), paddingLeft: 38 }}
                />
              </div>
              {errors.accName && <p style={{ fontSize: 12, color: '#ef4444', margin: '5px 0 0' }}>{errors.accName}</p>}
            </div>

            <p style={{ fontSize: 11, color: S.ink3, margin: '8px 0 0', lineHeight: 1.5 }}>
              Payouts are processed every 30 days to this account
            </p>
          </div>

          {/* ── Content category ── */}
          <div className="up" style={{ borderRadius: 20, background: S.surface, border: `1px solid ${S.border}`, padding: '18px 18px 20px', marginBottom: 12 }}>
            <Label>Content Category</Label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {CATEGORIES.map(c => (
                <button key={c} className="tap" onClick={() => { setCategory(c); clearErr('category'); }}
                  style={{ padding: '7px 14px', borderRadius: 20, border: `1.5px solid ${category === c ? S.ink : S.border}`, background: category === c ? S.ink : 'transparent', color: category === c ? '#fff' : S.ink2, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', transition: 'all .15s' }}>
                  {c}
                </button>
              ))}
            </div>
            {errors.category && <p style={{ fontSize: 12, color: '#ef4444', margin: '8px 0 0' }}>{errors.category}</p>}
          </div>

          {/* ── Terms + submit ── */}
          <div className="up" style={{ borderRadius: 20, background: S.surface, border: `1px solid ${S.border}`, padding: '18px 18px 20px' }}>
            {/* what happens next */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 18 }}>
              {[['Apply', '1'], ['Review', '2'], ['Earn', '3']].map(([step, n], i, arr) => (
                <div key={step} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                    <div style={{ width: 26, height: 26, borderRadius: '50%', background: 'rgba(0,0,0,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: S.ink }}>{n}</span>
                    </div>
                    <span style={{ fontSize: 11, fontWeight: 600, color: S.ink3 }}>{step}</span>
                  </div>
                  {i < arr.length - 1 && <ArrowRight size={12} color="rgba(0,0,0,0.15)" style={{ marginBottom: 14 }} />}
                </div>
              ))}
            </div>

            {/* terms checkbox */}
            <button className="tap" onClick={() => { setTerms(t => !t); clearErr('terms'); }}
              style={{ width: '100%', display: 'flex', alignItems: 'flex-start', gap: 11, padding: '13px 14px', borderRadius: 12, border: `1.5px solid ${errors.terms ? 'rgba(239,68,68,0.4)' : terms ? S.ink : S.border}`, background: terms ? 'rgba(0,0,0,0.02)' : 'transparent', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left', marginBottom: 14, transition: 'all .15s' }}>
              <div style={{ width: 18, height: 18, borderRadius: 5, border: `2px solid ${terms ? S.ink : 'rgba(0,0,0,0.2)'}`, background: terms ? S.ink : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1, transition: 'all .15s' }}>
                {terms && <Check size={11} color="#fff" strokeWidth={3} />}
              </div>
              <span style={{ fontSize: 13, color: S.ink2, lineHeight: 1.55 }}>
                I agree to the <span style={{ color: S.ink, fontWeight: 600, textDecoration: 'underline' }}>Creator Program Terms</span> and confirm that all submitted information is accurate.
              </span>
            </button>
            {errors.terms  && <p style={{ fontSize: 12, color: '#ef4444', margin: '-8px 0 10px' }}>{errors.terms}</p>}
            {errors.submit && <p style={{ fontSize: 12, color: '#ef4444', margin: '0 0 10px', textAlign: 'center' }}>{errors.submit}</p>}

            <p style={{ fontSize: 11, color: S.ink3, margin: '0 0 14px', textAlign: 'center' }}>
              Review takes 24–48 hours · You'll be notified by email
            </p>

            <button className="tap" onClick={submit} disabled={submitting}
              style={{ width: '100%', padding: '14px 0', borderRadius: 14, border: 'none', background: S.ink, color: '#fff', fontSize: 14, fontWeight: 700, cursor: submitting ? 'default' : 'pointer', fontFamily: 'inherit', opacity: submitting ? 0.5 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, transition: 'opacity .15s' }}>
              {submitting ? <><Spin /> Submitting…</> : <>Submit Application <ArrowRight size={15} /></>}
            </button>
          </div>
        </>
      ) : (
        <div className="up" style={{ borderRadius: 16, background: 'rgba(0,0,0,0.03)', padding: '14px 16px', textAlign: 'center' }}>
          <p style={{ fontSize: 13, color: 'rgba(0,0,0,0.38)', margin: 0, lineHeight: 1.6 }}>
            Meet all {reqs.length} requirements to unlock the application form.
          </p>
        </div>
      )}
    </div>
  );
}