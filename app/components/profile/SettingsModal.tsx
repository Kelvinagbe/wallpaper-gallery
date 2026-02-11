import { X, ChevronRight, Moon, Sun, Monitor, Globe, Bell, Volume2, Download, Camera, CheckCircle } from 'lucide-react';
import { useState, useRef } from 'react';
import {
  getSettings,
  updateSettings,
  getProfile,
  updateProfile,
  type UserSettings,
  type UserProfile,
} from '../../utils/userStore';

type SettingsModalProps = {
  onClose: () => void;
  onProfileUpdate?: (profile: UserProfile) => void;
};

type ThemeOption = 'light' | 'dark' | 'system';

export const SettingsModal = ({ onClose, onProfileUpdate }: SettingsModalProps) => {
  const [settings, setSettings] = useState<UserSettings>(getSettings());
  const [profile, setProfile] = useState<UserProfile>(getProfile());
  const [editingName, setEditingName] = useState(false);
  const [editingBio, setEditingBio] = useState(false);
  const [tempName, setTempName] = useState(profile.name);
  const [tempBio, setTempBio] = useState(profile.bio);
  const [saved, setSaved] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [showLanguagePicker, setShowLanguagePicker] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const themeOptions: { value: ThemeOption; label: string; icon: typeof Sun }[] = [
    { value: 'light', label: 'Light', icon: Sun },
    { value: 'dark', label: 'Dark', icon: Moon },
    { value: 'system', label: 'System', icon: Monitor },
  ];

  const languages = ['English', 'Spanish', 'French', 'German', 'Japanese', 'Chinese'];

  const handleClose = () => { setIsClosing(true); setTimeout(onClose, 300); };
  const handleToggle = (key: keyof UserSettings) => setSettings(updateSettings({ [key]: !settings[key] } as Partial<UserSettings>));
  const handleTheme = (theme: ThemeOption) => setSettings(updateSettings({ theme }));
  const handleLanguage = (language: string) => { setSettings(updateSettings({ language })); setShowLanguagePicker(false); };
  
  const flash = () => { setSaved(true); setTimeout(() => setSaved(false), 2000); };

  const handleSaveName = () => {
    if (!tempName.trim()) return;
    const updated = updateProfile({ name: tempName.trim() });
    setProfile(updated);
    onProfileUpdate?.(updated);
    setEditingName(false);
    flash();
  };

  const handleSaveBio = () => {
    const updated = updateProfile({ bio: tempBio.trim() });
    setProfile(updated);
    onProfileUpdate?.(updated);
    setEditingBio(false);
    flash();
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const updated = updateProfile({ avatar: ev.target?.result as string });
      setProfile(updated);
      onProfileUpdate?.(updated);
      flash();
    };
    reader.readAsDataURL(file);
  };

  const btnBase = "transition-all active:scale-95";
  const inputBase = "bg-white/10 border rounded-lg px-3 py-2 text-sm outline-none transition-colors";
  const sectionBox = "bg-white/5 rounded-xl border border-white/5";

  return (
    <>
      <style>{`
        @keyframes slideUp { from { transform: translateY(100%); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        @keyframes slideDown { from { transform: translateY(0); opacity: 1; } to { transform: translateY(100%); opacity: 0; } }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes fadeOut { from { opacity: 1; } to { opacity: 0; } }
        @keyframes scaleIn { from { transform: scale(0.95) translateY(10px); opacity: 0; } to { transform: scale(1) translateY(0); opacity: 1; } }
        @keyframes scaleOut { from { transform: scale(1); opacity: 1; } to { transform: scale(0.95) translateY(10px); opacity: 0; } }
        @media (min-width: 640px) {
          .modal-animate { animation: ${!isClosing ? 'scaleIn' : 'scaleOut'} 0.3s cubic-bezier(0.16, 1, 0.3, 1); }
        }
        @media (max-width: 639px) {
          .modal-animate { animation: ${!isClosing ? 'slideUp' : 'slideDown'} 0.3s cubic-bezier(0.16, 1, 0.3, 1); }
        }
      `}</style>

      <div 
        style={{ animation: `${isClosing ? 'fadeOut' : 'fadeIn'} 0.2s ease-out` }}
        className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
        onClick={handleClose}
      >
        <div 
          className="modal-animate bg-gradient-to-b from-zinc-900 to-black w-full sm:max-w-lg sm:rounded-2xl overflow-hidden max-h-[90vh] flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="sticky top-0 bg-zinc-900/95 backdrop-blur-xl border-b border-white/10 p-4 flex items-center justify-between">
            <h2 className="text-xl font-bold">Settings</h2>
            <div className="flex items-center gap-2">
              {saved && (
                <div className="flex items-center gap-1.5 text-green-400 text-sm" style={{ animation: 'fadeIn 0.2s' }}>
                  <CheckCircle className="w-4 h-4" />
                  <span>Saved</span>
                </div>
              )}
              <button onClick={handleClose} className={`p-2 hover:bg-white/10 rounded-full ${btnBase}`}>
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="overflow-y-auto flex-1 p-4 space-y-6">
            {/* Profile */}
            <Section title="PROFILE">
              <div className={`${sectionBox} p-4 space-y-4`}>
                <div className="flex items-center gap-4">
                  <div className="relative group">
                    <img src={profile.avatar} alt={profile.name} className="w-16 h-16 rounded-full object-cover border-2 border-white/20 transition-transform group-hover:scale-105" />
                    <button onClick={() => fileInputRef.current?.click()} className={`absolute bottom-0 right-0 p-1.5 bg-blue-500 hover:bg-blue-600 rounded-full shadow-lg ${btnBase}`}>
                      <Camera className="w-3 h-3" />
                    </button>
                    <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
                  </div>
                  <div>
                    <p className="font-semibold">{profile.name}</p>
                    <p className="text-sm text-white/50">{profile.username}</p>
                    <button onClick={() => fileInputRef.current?.click()} className="text-xs text-blue-400 hover:text-blue-300 transition-colors mt-1">
                      Change photo
                    </button>
                  </div>
                </div>

                <EditField
                  label="Display Name"
                  value={profile.name}
                  editing={editingName}
                  tempValue={tempName}
                  onEdit={() => setEditingName(true)}
                  onSave={handleSaveName}
                  onCancel={() => { setEditingName(false); setTempName(profile.name); }}
                  onChange={setTempName}
                  btnBase={btnBase}
                  inputBase={inputBase}
                />

                <div>
                  <label className="text-xs text-white/60 mb-1.5 block">Bio</label>
                  {editingBio ? (
                    <div className="space-y-2">
                      <textarea value={tempBio} onChange={e => setTempBio(e.target.value)} autoFocus rows={3} maxLength={150} className={`${inputBase} w-full border-blue-500/50 focus:border-blue-500 resize-none`} />
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-white/40">{tempBio.length}/150</span>
                        <div className="flex gap-2">
                          <button onClick={() => { setEditingBio(false); setTempBio(profile.bio); }} className={`px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-sm ${btnBase}`}>Cancel</button>
                          <button onClick={handleSaveBio} className={`px-3 py-1.5 bg-blue-500 hover:bg-blue-600 rounded-lg text-sm font-medium ${btnBase}`}>Save</button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <button onClick={() => setEditingBio(true)} className={`w-full flex items-start justify-between bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg px-3 py-2.5 group ${btnBase}`}>
                      <span className="text-sm text-left text-white/80">{profile.bio || 'Add a bio…'}</span>
                      <span className="text-xs text-blue-400 group-hover:text-blue-300 ml-2 shrink-0 transition-colors">Edit</span>
                    </button>
                  )}
                </div>
              </div>
            </Section>

            {/* Theme */}
            <Section title="DISPLAY & APPEARANCE">
              <div className={`${sectionBox} p-4`}>
                <p className="text-sm text-white/80 mb-3">Theme</p>
                <div className="grid grid-cols-3 gap-2">
                  {themeOptions.map((opt) => (
                    <button key={opt.value} onClick={() => handleTheme(opt.value)} className={`p-3 rounded-lg border-2 ${btnBase} ${settings.theme === opt.value ? 'border-blue-500 bg-blue-500/10 shadow-lg shadow-blue-500/20' : 'border-white/10 bg-white/5 hover:bg-white/10'}`}>
                      <opt.icon className={`w-5 h-5 mx-auto mb-1 transition-colors ${settings.theme === opt.value ? 'text-blue-400' : 'text-white/60'}`} />
                      <p className="text-xs font-medium">{opt.label}</p>
                    </button>
                  ))}
                </div>
              </div>
            </Section>

            {/* Language */}
            <Section title="LANGUAGE & REGION">
              <div className={`${sectionBox} overflow-hidden`}>
                <button onClick={() => setShowLanguagePicker(v => !v)} className="w-full flex items-center justify-between p-4 hover:bg-white/5 transition-all">
                  <div className="flex items-center gap-3">
                    <Globe className="w-5 h-5 text-white/60" />
                    <div className="text-left">
                      <p className="font-medium">Language</p>
                      <p className="text-sm text-white/60">{settings.language}</p>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-white/40" style={{ transform: showLanguagePicker ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.3s' }} />
                </button>
                {showLanguagePicker && (
                  <div className="border-t border-white/10" style={{ animation: 'fadeIn 0.2s' }}>
                    {languages.map(lang => (
                      <button key={lang} onClick={() => handleLanguage(lang)} className={`w-full flex items-center justify-between px-4 py-3 hover:bg-white/5 transition-all ${settings.language === lang ? 'text-blue-400 bg-blue-500/5' : 'text-white/80'}`}>
                        <span className="text-sm">{lang}</span>
                        {settings.language === lang && <CheckCircle className="w-4 h-4 text-blue-400" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </Section>

            {/* Toggles */}
            <Section title="NOTIFICATIONS & SOUNDS">
              <div className={`${sectionBox} overflow-hidden divide-y divide-white/5`}>
                <Toggle icon={Bell} label="Push Notifications" sub="Get notified about new content" value={settings.notifications} onToggle={() => handleToggle('notifications')} />
                <Toggle icon={Volume2} label="Sound Effects" sub="Play sounds for actions" value={settings.soundEffects} onToggle={() => handleToggle('soundEffects')} />
              </div>
            </Section>

            <Section title="DOWNLOADS">
              <div className={`${sectionBox} overflow-hidden`}>
                <Toggle icon={Download} label="Auto-save to Gallery" sub="Save downloads automatically" value={settings.autoDownload} onToggle={() => handleToggle('autoDownload')} />
              </div>
            </Section>

            <div className="h-4 sm:h-0" />
          </div>
        </div>
      </div>
    </>
  );
};

// Helper Components
const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div>
    <h3 className="text-sm font-semibold text-white/60 mb-3">{title}</h3>
    {children}
  </div>
);

const EditField = ({ label, value, editing, tempValue, onEdit, onSave, onCancel, onChange, btnBase, inputBase }: any) => (
  <div>
    <label className="text-xs text-white/60 mb-1.5 block">{label}</label>
    {editing ? (
      <div className="flex gap-2">
        <input value={tempValue} onChange={e => onChange(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') onSave(); if (e.key === 'Escape') onCancel(); }} autoFocus className={`${inputBase} flex-1 border-blue-500/50 focus:border-blue-500`} />
        <button onClick={onSave} className={`px-3 py-2 bg-blue-500 hover:bg-blue-600 rounded-lg text-sm font-medium ${btnBase}`}>Save</button>
        <button onClick={onCancel} className={`px-3 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm ${btnBase}`}>Cancel</button>
      </div>
    ) : (
      <button onClick={onEdit} className={`w-full flex items-center justify-between bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg px-3 py-2.5 group ${btnBase}`}>
        <span className="text-sm">{value}</span>
        <span className="text-xs text-blue-400 group-hover:text-blue-300 transition-colors">Edit</span>
      </button>
    )}
  </div>
);

const Toggle = ({ icon: Icon, label, sub, value, onToggle }: any) => (
  <div className="flex items-center justify-between p-4 hover:bg-white/5 transition-colors">
    <div className="flex items-center gap-3">
      <Icon className="w-5 h-5 text-white/60" />
      <div>
        <p className="font-medium">{label}</p>
        <p className="text-xs text-white/60">{sub}</p>
      </div>
    </div>
    <button onClick={onToggle} className={`relative w-12 h-7 rounded-full transition-all duration-300 active:scale-95 ${value ? 'bg-blue-500 shadow-lg shadow-blue-500/30' : 'bg-white/20'}`}>
      <div className="absolute top-1 w-5 h-5 bg-white rounded-full shadow-md" style={{ transform: value ? 'translateX(1.5rem)' : 'translateX(0.25rem)', transition: 'transform 0.3s' }} />
    </button>
  </div>
);