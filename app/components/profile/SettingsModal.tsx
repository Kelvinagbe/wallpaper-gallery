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
  const fileInputRef = useRef<HTMLInputElement>(null);

  const themeOptions: { value: ThemeOption; label: string; icon: typeof Sun }[] = [
    { value: 'light', label: 'Light', icon: Sun },
    { value: 'dark', label: 'Dark', icon: Moon },
    { value: 'system', label: 'System', icon: Monitor },
  ];

  const languages = ['English', 'Spanish', 'French', 'German', 'Japanese', 'Chinese'];
  const [showLanguagePicker, setShowLanguagePicker] = useState(false);

  // ─── Handlers ──────────────────────────────────────────────────────────────

  const handleToggle = (key: keyof UserSettings) => {
    const updated = updateSettings({ [key]: !settings[key] } as Partial<UserSettings>);
    setSettings(updated);
  };

  const handleTheme = (theme: ThemeOption) => {
    const updated = updateSettings({ theme });
    setSettings(updated);
  };

  const handleLanguage = (language: string) => {
    const updated = updateSettings({ language });
    setSettings(updated);
    setShowLanguagePicker(false);
  };

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
      const avatar = ev.target?.result as string;
      const updated = updateProfile({ avatar });
      setProfile(updated);
      onProfileUpdate?.(updated);
      flash();
    };
    reader.readAsDataURL(file);
  };

  const flash = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-gradient-to-b from-zinc-900 to-black w-full sm:max-w-lg sm:rounded-2xl overflow-hidden max-h-[90vh] flex flex-col">

        {/* Header */}
        <div className="sticky top-0 bg-zinc-900/95 backdrop-blur-xl border-b border-white/10 p-4 flex items-center justify-between">
          <h2 className="text-xl font-bold">Settings</h2>
          <div className="flex items-center gap-2">
            {saved && (
              <div className="flex items-center gap-1.5 text-green-400 text-sm">
                <CheckCircle className="w-4 h-4" />
                <span>Saved</span>
              </div>
            )}
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/10 rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="overflow-y-auto flex-1 p-4 space-y-6">

          {/* ── Profile ───────────────────────────────────────────────────── */}
          <div>
            <h3 className="text-sm font-semibold text-white/60 mb-3">PROFILE</h3>
            <div className="bg-white/5 rounded-xl p-4 space-y-4">

              {/* Avatar */}
              <div className="flex items-center gap-4">
                <div className="relative">
                  <img
                    src={profile.avatar}
                    alt={profile.name}
                    className="w-16 h-16 rounded-full object-cover border-2 border-white/20"
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute bottom-0 right-0 p-1.5 bg-blue-500 hover:bg-blue-600 rounded-full transition-colors"
                  >
                    <Camera className="w-3 h-3" />
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleAvatarChange}
                  />
                </div>
                <div>
                  <p className="font-semibold">{profile.name}</p>
                  <p className="text-sm text-white/50">{profile.username}</p>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="text-xs text-blue-400 hover:text-blue-300 transition-colors mt-1"
                  >
                    Change photo
                  </button>
                </div>
              </div>

              {/* Name */}
              <div>
                <label className="text-xs text-white/60 mb-1.5 block">Display Name</label>
                {editingName ? (
                  <div className="flex gap-2">
                    <input
                      value={tempName}
                      onChange={e => setTempName(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') handleSaveName(); if (e.key === 'Escape') setEditingName(false); }}
                      autoFocus
                      className="flex-1 bg-white/10 border border-blue-500/50 rounded-lg px-3 py-2 text-sm outline-none"
                    />
                    <button
                      onClick={handleSaveName}
                      className="px-3 py-2 bg-blue-500 hover:bg-blue-600 rounded-lg text-sm font-medium transition-colors"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => { setEditingName(false); setTempName(profile.name); }}
                      className="px-3 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setEditingName(true)}
                    className="w-full flex items-center justify-between bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg px-3 py-2.5 transition-colors"
                  >
                    <span className="text-sm">{profile.name}</span>
                    <span className="text-xs text-blue-400">Edit</span>
                  </button>
                )}
              </div>

              {/* Bio */}
              <div>
                <label className="text-xs text-white/60 mb-1.5 block">Bio</label>
                {editingBio ? (
                  <div className="space-y-2">
                    <textarea
                      value={tempBio}
                      onChange={e => setTempBio(e.target.value)}
                      autoFocus
                      rows={3}
                      maxLength={150}
                      className="w-full bg-white/10 border border-blue-500/50 rounded-lg px-3 py-2 text-sm outline-none resize-none"
                    />
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-white/40">{tempBio.length}/150</span>
                      <div className="flex gap-2">
                        <button
                          onClick={() => { setEditingBio(false); setTempBio(profile.bio); }}
                          className="px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-sm transition-colors"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleSaveBio}
                          className="px-3 py-1.5 bg-blue-500 hover:bg-blue-600 rounded-lg text-sm font-medium transition-colors"
                        >
                          Save
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setEditingBio(true)}
                    className="w-full flex items-start justify-between bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg px-3 py-2.5 transition-colors"
                  >
                    <span className="text-sm text-left text-white/80">{profile.bio || 'Add a bio…'}</span>
                    <span className="text-xs text-blue-400 ml-2 shrink-0">Edit</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* ── Display & Appearance ──────────────────────────────────────── */}
          <div>
            <h3 className="text-sm font-semibold text-white/60 mb-3">DISPLAY & APPEARANCE</h3>
            <div className="bg-white/5 rounded-xl p-4">
              <p className="text-sm text-white/80 mb-3">Theme</p>
              <div className="grid grid-cols-3 gap-2">
                {themeOptions.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => handleTheme(option.value)}
                    className={`p-3 rounded-lg border-2 ${
                      settings.theme === option.value
                        ? 'border-blue-500 bg-blue-500/10'
                        : 'border-white/10 bg-white/5 hover:bg-white/10'
                    }`}
                  >
                    <option.icon className={`w-5 h-5 mx-auto mb-1 ${
                      settings.theme === option.value ? 'text-blue-400' : 'text-white/60'
                    }`} />
                    <p className="text-xs font-medium">{option.label}</p>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* ── Language ──────────────────────────────────────────────────── */}
          <div>
            <h3 className="text-sm font-semibold text-white/60 mb-3">LANGUAGE & REGION</h3>
            <div className="bg-white/5 rounded-xl overflow-hidden">
              <button
                onClick={() => setShowLanguagePicker(v => !v)}
                className="w-full flex items-center justify-between p-4 hover:bg-white/5 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Globe className="w-5 h-5 text-white/60" />
                  <div className="text-left">
                    <p className="font-medium">Language</p>
                    <p className="text-sm text-white/60">{settings.language}</p>
                  </div>
                </div>
                <ChevronRight className={`w-5 h-5 text-white/40 transition-transform ${showLanguagePicker ? 'rotate-90' : ''}`} />
              </button>

              {showLanguagePicker && (
                <div className="border-t border-white/10">
                  {languages.map(lang => (
                    <button
                      key={lang}
                      onClick={() => handleLanguage(lang)}
                      className={`w-full flex items-center justify-between px-4 py-3 hover:bg-white/5 transition-colors ${
                        settings.language === lang ? 'text-blue-400' : 'text-white/80'
                      }`}
                    >
                      <span className="text-sm">{lang}</span>
                      {settings.language === lang && (
                        <CheckCircle className="w-4 h-4 text-blue-400" />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ── Notifications & Sounds ────────────────────────────────────── */}
          <div>
            <h3 className="text-sm font-semibold text-white/60 mb-3">NOTIFICATIONS & SOUNDS</h3>
            <div className="bg-white/5 rounded-xl overflow-hidden divide-y divide-white/5">
              <ToggleRow
                icon={Bell}
                label="Push Notifications"
                sub="Get notified about new content"
                value={settings.notifications}
                onToggle={() => handleToggle('notifications')}
              />
              <ToggleRow
                icon={Volume2}
                label="Sound Effects"
                sub="Play sounds for actions"
                value={settings.soundEffects}
                onToggle={() => handleToggle('soundEffects')}
              />
            </div>
          </div>

          {/* ── Downloads ─────────────────────────────────────────────────── */}
          <div>
            <h3 className="text-sm font-semibold text-white/60 mb-3">DOWNLOADS</h3>
            <div className="bg-white/5 rounded-xl overflow-hidden">
              <ToggleRow
                icon={Download}
                label="Auto-save to Gallery"
                sub="Save downloads automatically"
                value={settings.autoDownload}
                onToggle={() => handleToggle('autoDownload')}
              />
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

// ─── Toggle Row ───────────────────────────────────────────────────────────────

type ToggleRowProps = {
  icon: typeof Bell;
  label: string;
  sub: string;
  value: boolean;
  onToggle: () => void;
};

const ToggleRow = ({ icon: Icon, label, sub, value, onToggle }: ToggleRowProps) => (
  <div className="flex items-center justify-between p-4">
    <div className="flex items-center gap-3">
      <Icon className="w-5 h-5 text-white/60" />
      <div>
        <p className="font-medium">{label}</p>
        <p className="text-xs text-white/60">{sub}</p>
      </div>
    </div>
    <button
      onClick={onToggle}
      className={`relative w-12 h-7 rounded-full transition-colors ${value ? 'bg-blue-500' : 'bg-white/20'}`}
    >
      <div className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-transform ${value ? 'translate-x-6' : 'translate-x-1'}`} />
    </button>
  </div>
);
