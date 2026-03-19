import { X, Shield, Lock, Smartphone, Eye, EyeOff, Check, ChevronRight } from 'lucide-react';
import { useState } from 'react';
import { createPortal } from 'react-dom';
import { updatePassword, getPasswordData } from '../../utils/userStore';

type Props = { onClose: () => void };
type View  = 'main' | 'changePassword' | 'twoFactor';

const S = {
  input: { width: '100%', padding: '11px 40px 11px 14px', background: 'rgba(0,0,0,0.04)', border: '1px solid rgba(0,0,0,0.1)', borderRadius: 12, fontSize: 14, color: '#0a0a0a', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' } as React.CSSProperties,
};

export const PrivacyModal = ({ onClose }: Props) => {
  const [view, setView] = useState<View>('main');

  const titles: Record<View, string> = {
    main:           'Privacy & Security',
    changePassword: 'Change Password',
    twoFactor:      'Two-Factor Auth',
  };

  return createPortal(
    <>
      <style>{`
        @keyframes slideUp { from{transform:translateY(100%)} to{transform:translateY(0)} }
        @keyframes fadeIn  { from{opacity:0} to{opacity:1} }
        .prv-overlay { animation: fadeIn .2s ease-out; }
        .prv-sheet   { animation: slideUp .3s cubic-bezier(.16,1,.3,1); }
        .prv-row:active { background: rgba(0,0,0,0.03) !important; }
        .prv-row { transition: background .1s; }
      `}</style>

      <div className="prv-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)', zIndex: 60, display: 'flex', alignItems: 'flex-end' }} onClick={onClose}>
        <div className="prv-sheet" style={{ background: '#fff', width: '100%', maxHeight: '85dvh', borderRadius: '24px 24px 0 0', display: 'flex', flexDirection: 'column', overflow: 'hidden' }} onClick={e => e.stopPropagation()}>

          {/* Handle */}
          <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 0', flexShrink: 0 }}>
            <div style={{ width: 36, height: 4, borderRadius: 2, background: 'rgba(0,0,0,0.1)' }} />
          </div>

          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px 14px', borderBottom: '1px solid rgba(0,0,0,0.06)', flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {view !== 'main' && (
                <button onClick={() => setView('main')} style={{ width: 30, height: 30, borderRadius: '50%', background: 'rgba(0,0,0,0.05)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                  <ChevronRight size={15} color="rgba(0,0,0,0.5)" style={{ transform: 'rotate(180deg)' }} />
                </button>
              )}
              <p style={{ fontSize: 16, fontWeight: 700, margin: 0, letterSpacing: '-0.01em' }}>{titles[view]}</p>
            </div>
            <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(0,0,0,0.05)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
              <X size={15} color="rgba(0,0,0,0.5)" />
            </button>
          </div>

          {/* Body */}
          <div style={{ overflowY: 'auto', flex: 1, padding: '20px' }}>
            {view === 'main'           && <MainView onNavigate={setView} />}
            {view === 'changePassword' && <ChangePasswordView onBack={() => setView('main')} />}
            {view === 'twoFactor'      && <TwoFactorView />}
          </div>
        </div>
      </div>
    </>,
    document.body
  );
};

// ─── Main view ────────────────────────────────────────────────────────────────
const MainView = ({ onNavigate }: { onNavigate: (v: View) => void }) => {
  const passwordData = getPasswordData();
  const items = [
    { icon: Lock,       label: 'Change Password',         sub: passwordData.lastChanged ? `Last changed ${new Date(passwordData.lastChanged).toLocaleDateString()}` : 'Keep your account secure', onClick: () => onNavigate('changePassword'), badge: null },
    { icon: Smartphone, label: 'Two-Factor Authentication', sub: 'Add an extra layer of security', onClick: () => onNavigate('twoFactor'), badge: 'Soon' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Protected banner */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', background: 'rgba(16,185,129,0.06)', borderRadius: 14, border: '1px solid rgba(16,185,129,0.15)', marginBottom: 4 }}>
        <div style={{ width: 38, height: 38, borderRadius: 10, background: 'rgba(16,185,129,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Shield size={18} color="#10b981" />
        </div>
        <div>
          <p style={{ fontSize: 13, fontWeight: 600, color: '#0a0a0a', margin: '0 0 2px' }}>Your account is protected</p>
          <p style={{ fontSize: 12, color: 'rgba(0,0,0,0.4)', margin: 0 }}>Manage your security settings below</p>
        </div>
      </div>

      {/* Menu */}
      <div style={{ background: '#fafafa', borderRadius: 16, border: '1px solid rgba(0,0,0,0.06)', overflow: 'hidden' }}>
        {items.map((item, i) => (
          <button key={item.label} className="prv-row" onClick={item.onClick}
            style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px', background: 'transparent', border: 'none', borderBottom: i < items.length - 1 ? '1px solid rgba(0,0,0,0.05)' : 'none', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left' }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(0,0,0,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <item.icon size={17} color="rgba(0,0,0,0.55)" />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: 14, fontWeight: 500, color: '#0a0a0a', margin: '0 0 2px' }}>{item.label}</p>
              <p style={{ fontSize: 12, color: 'rgba(0,0,0,0.38)', margin: 0 }}>{item.sub}</p>
            </div>
            {item.badge && <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 20, background: 'rgba(0,0,0,0.06)', color: 'rgba(0,0,0,0.4)', letterSpacing: '0.04em' }}>{item.badge}</span>}
            <ChevronRight size={15} color="rgba(0,0,0,0.25)" />
          </button>
        ))}
      </div>
    </div>
  );
};

// ─── Change password view ─────────────────────────────────────────────────────
const ChangePasswordView = ({ onBack }: { onBack: () => void }) => {
  const [current,     setCurrent]     = useState('');
  const [next,        setNext]        = useState('');
  const [confirm,     setConfirm]     = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNext,    setShowNext]    = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error,       setError]       = useState('');
  const [success,     setSuccess]     = useState(false);

  const rules = [
    { label: 'At least 8 characters', pass: next.length >= 8        },
    { label: 'One uppercase letter',  pass: /[A-Z]/.test(next)      },
    { label: 'One number',            pass: /[0-9]/.test(next)      },
  ];

  const allPass  = rules.every(r => r.pass);
  const isMatch  = confirm.length > 0 && next === confirm;
  const canSubmit = !!current && allPass && isMatch;

  const handleSubmit = () => {
    setError('');
    if (!current)  { setError('Please enter your current password.'); return; }
    if (!allPass)  { setError('New password does not meet requirements.'); return; }
    if (!isMatch)  { setError('Passwords do not match.'); return; }
    updatePassword(next);
    setSuccess(true);
    setTimeout(() => { setSuccess(false); onBack(); }, 1800);
  };

  if (success) return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '48px 0', textAlign: 'center' }}>
      <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(16,185,129,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
        <Check size={26} color="#10b981" strokeWidth={2.5} />
      </div>
      <p style={{ fontSize: 17, fontWeight: 700, margin: '0 0 6px' }}>Password Updated</p>
      <p style={{ fontSize: 13, color: 'rgba(0,0,0,0.4)', margin: 0 }}>Your password has been changed successfully.</p>
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <PwField label="Current Password" value={current} onChange={setCurrent} show={showCurrent} onToggle={() => setShowCurrent(v => !v)} />
      <PwField label="New Password"     value={next}    onChange={setNext}    show={showNext}    onToggle={() => setShowNext(v => !v)}    />

      {/* Rules */}
      {next.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: '0 2px' }}>
          {rules.map(r => (
            <div key={r.label} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: r.pass ? '#10b981' : 'rgba(0,0,0,0.15)', flexShrink: 0 }} />
              <p style={{ fontSize: 12, color: r.pass ? '#10b981' : 'rgba(0,0,0,0.35)', margin: 0 }}>{r.label}</p>
            </div>
          ))}
        </div>
      )}

      <PwField label="Confirm New Password" value={confirm} onChange={setConfirm} show={showConfirm} onToggle={() => setShowConfirm(v => !v)}
        borderColor={confirm.length > 0 ? (isMatch ? 'rgba(16,185,129,0.4)' : 'rgba(239,68,68,0.4)') : undefined} />

      {error && (
        <p style={{ fontSize: 13, color: '#ef4444', background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)', borderRadius: 10, padding: '10px 14px', margin: 0 }}>{error}</p>
      )}

      <button onClick={handleSubmit} disabled={!canSubmit}
        style={{ width: '100%', padding: '13px 0', borderRadius: 14, border: 'none', background: canSubmit ? '#0a0a0a' : 'rgba(0,0,0,0.08)', color: canSubmit ? '#fff' : 'rgba(0,0,0,0.25)', fontSize: 14, fontWeight: 700, cursor: canSubmit ? 'pointer' : 'default', fontFamily: 'inherit', transition: 'all .15s' }}>
        Update Password
      </button>
    </div>
  );
};

// ─── Password field ───────────────────────────────────────────────────────────
const PwField = ({ label, value, onChange, show, onToggle, borderColor }: {
  label: string; value: string; onChange: (v: string) => void;
  show: boolean; onToggle: () => void; borderColor?: string;
}) => (
  <div>
    <p style={{ fontSize: 11, fontWeight: 700, color: 'rgba(0,0,0,0.35)', textTransform: 'uppercase', letterSpacing: '0.07em', margin: '0 0 7px 2px' }}>{label}</p>
    <div style={{ position: 'relative' }}>
      <input type={show ? 'text' : 'password'} value={value} onChange={e => onChange(e.target.value)} placeholder="••••••••"
        style={{ ...S.input, borderColor: borderColor || 'rgba(0,0,0,0.1)' }} />
      <button type="button" onClick={onToggle} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex' }}>
        {show ? <EyeOff size={16} color="rgba(0,0,0,0.3)" /> : <Eye size={16} color="rgba(0,0,0,0.3)" />}
      </button>
    </div>
  </div>
);

// ─── Two factor view ──────────────────────────────────────────────────────────
const TwoFactorView = () => (
  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '48px 20px', textAlign: 'center' }}>
    <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(0,0,0,0.04)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
      <Smartphone size={28} color="rgba(0,0,0,0.3)" />
    </div>
    <span style={{ fontSize: 10, fontWeight: 700, padding: '4px 10px', borderRadius: 20, background: 'rgba(0,0,0,0.06)', color: 'rgba(0,0,0,0.4)', letterSpacing: '0.05em', marginBottom: 12 }}>COMING SOON</span>
    <p style={{ fontSize: 16, fontWeight: 700, margin: '0 0 8px' }}>Two-Factor Authentication</p>
    <p style={{ fontSize: 13, color: 'rgba(0,0,0,0.4)', lineHeight: 1.6, maxWidth: 260, margin: 0 }}>
      We're working on adding two-factor authentication to keep your account even more secure. Stay tuned!
    </p>
  </div>
);
