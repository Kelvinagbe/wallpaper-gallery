import { X, Shield, Lock, Smartphone, Eye, EyeOff, CheckCircle } from 'lucide-react';
import { useState } from 'react';
import { updatePassword, getPasswordData } from '../../utils/userStore';

type PrivacyModalProps = {
  onClose: () => void;
};

type View = 'main' | 'changePassword' | 'twoFactor';

export const PrivacyModal = ({ onClose }: PrivacyModalProps) => {
  const [view, setView] = useState<View>('main');

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-gradient-to-b from-zinc-900 to-black w-full sm:max-w-lg sm:rounded-2xl overflow-hidden max-h-[90vh] flex flex-col">

        {/* Header */}
        <div className="sticky top-0 bg-zinc-900/95 backdrop-blur-xl border-b border-white/10 p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {view !== 'main' && (
              <button
                onClick={() => setView('main')}
                className="p-1.5 hover:bg-white/10 rounded-full transition-colors"
              >
                <X className="w-4 h-4 rotate-180" />
              </button>
            )}
            <h2 className="text-xl font-bold">
              {view === 'main' && 'Privacy & Security'}
              {view === 'changePassword' && 'Change Password'}
              {view === 'twoFactor' && 'Two-Factor Authentication'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 p-4">
          {view === 'main' && <MainView onNavigate={setView} />}
          {view === 'changePassword' && <ChangePasswordView onBack={() => setView('main')} />}
          {view === 'twoFactor' && <TwoFactorView />}
        </div>
      </div>
    </div>
  );
};

// ─── Main View ───────────────────────────────────────────────────────────────

const MainView = ({ onNavigate }: { onNavigate: (v: View) => void }) => {
  const passwordData = getPasswordData();

  const items = [
    {
      icon: Lock,
      label: 'Change Password',
      sub: passwordData.lastChanged
        ? `Last changed ${new Date(passwordData.lastChanged).toLocaleDateString()}`
        : 'Keep your account secure',
      color: 'text-blue-400',
      bg: 'bg-blue-500/10',
      onClick: () => onNavigate('changePassword'),
      badge: null,
    },
    {
      icon: Smartphone,
      label: 'Two-Factor Authentication',
      sub: 'Add an extra layer of security',
      color: 'text-purple-400',
      bg: 'bg-purple-500/10',
      onClick: () => onNavigate('twoFactor'),
      badge: 'Coming Soon',
    },
  ];

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3 p-4 bg-white/5 rounded-xl mb-6 border border-white/10">
        <div className="p-3 bg-green-500/10 rounded-xl">
          <Shield className="w-6 h-6 text-green-400" />
        </div>
        <div>
          <p className="font-semibold text-sm">Your account is protected</p>
          <p className="text-xs text-white/60">Manage your security settings below</p>
        </div>
      </div>

      {items.map((item) => (
        <button
          key={item.label}
          onClick={item.onClick}
          className="w-full flex items-center gap-4 p-4 bg-white/5 hover:bg-white/10 rounded-xl transition-colors group"
        >
          <div className={`p-2.5 rounded-xl ${item.bg}`}>
            <item.icon className={`w-5 h-5 ${item.color}`} />
          </div>
          <div className="flex-1 text-left">
            <p className="font-medium">{item.label}</p>
            <p className="text-xs text-white/50 mt-0.5">{item.sub}</p>
          </div>
          {item.badge && (
            <span className="text-xs px-2 py-1 bg-purple-500/20 text-purple-400 rounded-full border border-purple-500/30">
              {item.badge}
            </span>
          )}
        </button>
      ))}
    </div>
  );
};

// ─── Change Password View ─────────────────────────────────────────────────────

const ChangePasswordView = ({ onBack }: { onBack: () => void }) => {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNext, setShowNext] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const rules = [
    { label: 'At least 8 characters', pass: next.length >= 8 },
    { label: 'One uppercase letter', pass: /[A-Z]/.test(next) },
    { label: 'One number', pass: /[0-9]/.test(next) },
  ];

  const allRulesPassed = rules.every(r => r.pass);
  const passwordsMatch = next === confirm && confirm.length > 0;

  const handleSubmit = () => {
    setError('');
    if (!current) { setError('Please enter your current password.'); return; }
    if (!allRulesPassed) { setError('New password does not meet requirements.'); return; }
    if (!passwordsMatch) { setError('Passwords do not match.'); return; }

    // NOTE: In a real app, verify `current` against your auth provider here.
    updatePassword(next);
    setSuccess(true);
    setTimeout(() => {
      setSuccess(false);
      onBack();
    }, 1800);
  };

  if (success) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mb-4">
          <CheckCircle className="w-8 h-8 text-green-400" />
        </div>
        <h3 className="text-xl font-bold mb-2">Password Updated</h3>
        <p className="text-white/60 text-sm">Your password has been changed successfully.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <PasswordField
        label="Current Password"
        value={current}
        onChange={setCurrent}
        show={showCurrent}
        onToggle={() => setShowCurrent(v => !v)}
      />
      <PasswordField
        label="New Password"
        value={next}
        onChange={setNext}
        show={showNext}
        onToggle={() => setShowNext(v => !v)}
      />

      {/* Rules */}
      {next.length > 0 && (
        <div className="space-y-1.5 px-1">
          {rules.map(rule => (
            <div key={rule.label} className="flex items-center gap-2">
              <div className={`w-1.5 h-1.5 rounded-full ${rule.pass ? 'bg-green-400' : 'bg-white/20'}`} />
              <p className={`text-xs ${rule.pass ? 'text-green-400' : 'text-white/40'}`}>{rule.label}</p>
            </div>
          ))}
        </div>
      )}

      <PasswordField
        label="Confirm New Password"
        value={confirm}
        onChange={setConfirm}
        show={showConfirm}
        onToggle={() => setShowConfirm(v => !v)}
        isMatch={confirm.length > 0 ? passwordsMatch : undefined}
      />

      {error && (
        <p className="text-sm text-red-400 bg-red-500/10 rounded-lg px-3 py-2 border border-red-500/20">
          {error}
        </p>
      )}

      <button
        onClick={handleSubmit}
        disabled={!current || !allRulesPassed || !passwordsMatch}
        className="w-full py-3 bg-blue-500 hover:bg-blue-600 disabled:bg-white/10 disabled:text-white/30 rounded-xl font-semibold transition-colors mt-2"
      >
        Update Password
      </button>
    </div>
  );
};

type PasswordFieldProps = {
  label: string;
  value: string;
  onChange: (v: string) => void;
  show: boolean;
  onToggle: () => void;
  isMatch?: boolean;
};

const PasswordField = ({ label, value, onChange, show, onToggle, isMatch }: PasswordFieldProps) => (
  <div>
    <label className="text-xs text-white/60 mb-1.5 block">{label}</label>
    <div className="relative">
      <input
        type={show ? 'text' : 'password'}
        value={value}
        onChange={e => onChange(e.target.value)}
        className={`w-full bg-white/5 border rounded-xl px-4 py-3 pr-11 text-sm outline-none focus:border-blue-500 transition-colors ${
          isMatch === true
            ? 'border-green-500/50'
            : isMatch === false
            ? 'border-red-500/50'
            : 'border-white/10'
        }`}
        placeholder="••••••••"
      />
      <button
        type="button"
        onClick={onToggle}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70 transition-colors"
      >
        {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
      </button>
    </div>
  </div>
);

// ─── Two Factor View ──────────────────────────────────────────────────────────

const TwoFactorView = () => (
  <div className="flex flex-col items-center justify-center py-16 text-center px-4">
    <div className="w-20 h-20 bg-purple-500/10 rounded-full flex items-center justify-center mb-6">
      <Smartphone className="w-10 h-10 text-purple-400" />
    </div>
    <span className="text-xs px-3 py-1 bg-purple-500/20 text-purple-400 rounded-full border border-purple-500/30 mb-4">
      Coming Soon
    </span>
    <h3 className="text-xl font-bold mb-3">Two-Factor Authentication</h3>
    <p className="text-white/60 text-sm leading-relaxed max-w-xs">
      We're working on adding two-factor authentication to keep your account even more secure. Stay tuned!
    </p>
  </div>
);
