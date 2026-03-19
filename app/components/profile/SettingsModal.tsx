import { X, Camera, Check } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { getProfile, updateProfile, type UserProfile } from '@/lib/stores/userStore';

type Props = { onClose: () => void; onProfileUpdate?: () => Promise<void> };

const S = {
  input:    { width: '100%', padding: '10px 12px', background: 'rgba(0,0,0,0.04)', border: '1px solid rgba(0,0,0,0.1)', borderRadius: 10, fontSize: 14, color: '#0a0a0a', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' } as React.CSSProperties,
  saveBtn:  { padding: '9px 16px', borderRadius: 10, border: 'none', background: '#0a0a0a', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' } as React.CSSProperties,
  cancelBtn:{ padding: '9px 14px', borderRadius: 10, border: '1px solid rgba(0,0,0,0.1)', background: 'transparent', color: 'rgba(0,0,0,0.5)', fontSize: 13, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' } as React.CSSProperties,
};

export const SettingsModal = ({ onClose, onProfileUpdate }: Props) => {
  const [profile,     setProfile]     = useState<UserProfile | null>(null);
  const [loading,     setLoading]     = useState(true);
  const [editingName, setEditingName] = useState(false);
  const [editingBio,  setEditingBio]  = useState(false);
  const [tempName,    setTempName]    = useState('');
  const [tempBio,     setTempBio]     = useState('');
  const [saved,       setSaved]       = useState(false);
  const [saving,      setSaving]      = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    (async () => {
      const p = await getProfile();
      if (p) { setProfile(p); setTempName(p.name); setTempBio(p.bio); }
      setLoading(false);
    })();
  }, []);

  const flash = () => { setSaved(true); setTimeout(() => setSaved(false), 2500); };

  const refresh = async () => {
    const p = await getProfile();
    if (p) { setProfile(p); setTempName(p.name); setTempBio(p.bio); }
  };

  const saveName = async () => {
    if (!tempName.trim() || saving) return;
    setSaving(true);
    const ok = await updateProfile({ name: tempName.trim() });
    if (ok) { await refresh(); await onProfileUpdate?.(); setEditingName(false); flash(); }
    setSaving(false);
  };

  const saveBio = async () => {
    if (saving) return;
    setSaving(true);
    const ok = await updateProfile({ bio: tempBio.trim() });
    if (ok) { await refresh(); await onProfileUpdate?.(); setEditingBio(false); flash(); }
    setSaving(false);
  };

  const changeAvatar = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async ev => {
      const ok = await updateProfile({ avatar: ev.target?.result as string });
      if (ok) { await refresh(); await onProfileUpdate?.(); flash(); }
    };
    reader.readAsDataURL(file);
  };

  if (loading || !profile) return createPortal(
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(8px)', zIndex: 60, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: 36, height: 36, borderRadius: '50%', border: '3px solid rgba(0,0,0,0.08)', borderTopColor: '#0a0a0a', animation: 'spin 0.7s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>,
    document.body
  );

  return createPortal(
    <>
      <style>{`
        @keyframes slideUp { from{transform:translateY(100%)} to{transform:translateY(0)} }
        @keyframes fadeIn  { from{opacity:0} to{opacity:1} }
        @keyframes spin    { to{transform:rotate(360deg)} }
        .settings-overlay { animation: fadeIn .2s ease-out; }
        .settings-sheet   { animation: slideUp .3s cubic-bezier(.16,1,.3,1); }
        .settings-row:active { background: rgba(0,0,0,0.03) !important; }
        .settings-row { transition: background .1s; }
      `}</style>

      <div className="settings-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)', zIndex: 60, display: 'flex', alignItems: 'flex-end' }} onClick={onClose}>
        <div className="settings-sheet" style={{ background: '#fff', width: '100%', maxHeight: '85dvh', borderRadius: '24px 24px 0 0', display: 'flex', flexDirection: 'column', overflow: 'hidden' }} onClick={e => e.stopPropagation()}>

          {/* Handle */}
          <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 0', flexShrink: 0 }}>
            <div style={{ width: 36, height: 4, borderRadius: 2, background: 'rgba(0,0,0,0.1)' }} />
          </div>

          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px 14px', borderBottom: '1px solid rgba(0,0,0,0.06)', flexShrink: 0 }}>
            <div>
              <p style={{ fontSize: 16, fontWeight: 700, margin: 0, letterSpacing: '-0.01em' }}>Edit Profile</p>
              {saved && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 2 }}>
                  <Check size={12} color="#10b981" />
                  <span style={{ fontSize: 12, color: '#10b981', fontWeight: 500 }}>Saved</span>
                </div>
              )}
            </div>
            <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(0,0,0,0.05)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
              <X size={15} color="rgba(0,0,0,0.5)" />
            </button>
          </div>

          {/* Body */}
          <div style={{ overflowY: 'auto', flex: 1, padding: '20px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

              {/* Avatar */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '16px', background: 'rgba(0,0,0,0.02)', borderRadius: 16, border: '1px solid rgba(0,0,0,0.06)' }}>
                <div style={{ position: 'relative', flexShrink: 0 }}>
                  <img src={profile.avatar} alt={profile.name} style={{ width: 68, height: 68, borderRadius: '50%', objectFit: 'cover', border: '2px solid rgba(0,0,0,0.07)', display: 'block' }} />
                  <button onClick={() => fileRef.current?.click()} style={{ position: 'absolute', bottom: 0, right: 0, width: 24, height: 24, borderRadius: '50%', background: '#0a0a0a', border: '2px solid #fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                    <Camera size={11} color="#fff" />
                  </button>
                  <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={changeAvatar} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 15, fontWeight: 600, margin: '0 0 2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{profile.name}</p>
                  <p style={{ fontSize: 13, color: 'rgba(0,0,0,0.38)', margin: '0 0 6px' }}>{profile.username}</p>
                  <button onClick={() => fileRef.current?.click()} style={{ fontSize: 12, fontWeight: 600, color: '#0a0a0a', background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: 'inherit', textDecoration: 'underline', textUnderlineOffset: 2 }}>
                    Change photo
                  </button>
                </div>
              </div>

              {/* Name */}
              <div>
                <p style={{ fontSize: 11, fontWeight: 700, color: 'rgba(0,0,0,0.35)', textTransform: 'uppercase', letterSpacing: '0.07em', margin: '0 0 8px 2px' }}>Display Name</p>
                {editingName ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <input
                      value={tempName}
                      onChange={e => setTempName(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') saveName(); if (e.key === 'Escape') { setEditingName(false); setTempName(profile.name); } }}
                      autoFocus
                      style={{ ...S.input, borderColor: 'rgba(0,0,0,0.2)' }}
                    />
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button onClick={() => { setEditingName(false); setTempName(profile.name); }} style={S.cancelBtn}>Cancel</button>
                      <button onClick={saveName} disabled={saving} style={{ ...S.saveBtn, opacity: saving ? 0.6 : 1 }}>{saving ? 'Saving...' : 'Save'}</button>
                    </div>
                  </div>
                ) : (
                  <button className="settings-row" onClick={() => setEditingName(true)} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', background: 'rgba(0,0,0,0.03)', border: '1px solid rgba(0,0,0,0.07)', borderRadius: 12, cursor: 'pointer', fontFamily: 'inherit' }}>
                    <span style={{ fontSize: 14, color: '#0a0a0a' }}>{profile.name}</span>
                    <span style={{ fontSize: 12, fontWeight: 600, color: 'rgba(0,0,0,0.4)' }}>Edit</span>
                  </button>
                )}
              </div>

              {/* Bio */}
              <div>
                <p style={{ fontSize: 11, fontWeight: 700, color: 'rgba(0,0,0,0.35)', textTransform: 'uppercase', letterSpacing: '0.07em', margin: '0 0 8px 2px' }}>Bio</p>
                {editingBio ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <textarea
                      value={tempBio}
                      onChange={e => setTempBio(e.target.value)}
                      autoFocus rows={3} maxLength={150}
                      style={{ ...S.input, resize: 'none', borderColor: 'rgba(0,0,0,0.2)' }}
                    />
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: 11, color: 'rgba(0,0,0,0.3)' }}>{tempBio.length}/150</span>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button onClick={() => { setEditingBio(false); setTempBio(profile.bio); }} style={S.cancelBtn}>Cancel</button>
                        <button onClick={saveBio} disabled={saving} style={{ ...S.saveBtn, opacity: saving ? 0.6 : 1 }}>{saving ? 'Saving...' : 'Save'}</button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <button className="settings-row" onClick={() => setEditingBio(true)} style={{ width: '100%', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', padding: '12px 14px', background: 'rgba(0,0,0,0.03)', border: '1px solid rgba(0,0,0,0.07)', borderRadius: 12, cursor: 'pointer', fontFamily: 'inherit', gap: 10 }}>
                    <span style={{ fontSize: 14, color: profile.bio ? '#0a0a0a' : 'rgba(0,0,0,0.3)', textAlign: 'left', lineHeight: 1.5 }}>{profile.bio || 'Add a bio…'}</span>
                    <span style={{ fontSize: 12, fontWeight: 600, color: 'rgba(0,0,0,0.4)', flexShrink: 0 }}>Edit</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>,
    document.body
  );
};
