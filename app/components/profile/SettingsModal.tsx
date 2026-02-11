import { X, ChevronRight, Moon, Sun, Monitor, Globe, Bell, Volume2, Download, Trash2, Database } from 'lucide-react';
import { useState } from 'react';

type SettingsModalProps = {
  onClose: () => void;
};

type ThemeOption = 'light' | 'dark' | 'system';

export const SettingsModal = ({ onClose }: SettingsModalProps) => {
  const [theme, setTheme] = useState<ThemeOption>('dark');
  const [notifications, setNotifications] = useState(true);
  const [autoDownload, setAutoDownload] = useState(false);
  const [soundEffects, setSoundEffects] = useState(true);
  const [language, setLanguage] = useState('English');

  const themeOptions = [
    { value: 'light' as ThemeOption, label: 'Light', icon: Sun },
    { value: 'dark' as ThemeOption, label: 'Dark', icon: Moon },
    { value: 'system' as ThemeOption, label: 'System', icon: Monitor },
  ];

  const languages = ['English', 'Spanish', 'French', 'German', 'Japanese', 'Chinese'];

  const handleClearCache = () => {
    if (confirm('Are you sure you want to clear the cache? This will free up storage space.')) {
      // Implement cache clearing logic
      alert('Cache cleared successfully!');
    }
  };

  const handleClearHistory = () => {
    if (confirm('Are you sure you want to clear your viewing history?')) {
      // Implement history clearing logic
      alert('History cleared successfully!');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-gradient-to-b from-zinc-900 to-black w-full sm:max-w-lg sm:rounded-2xl overflow-hidden slide-up max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="sticky top-0 bg-zinc-900/95 backdrop-blur-xl border-b border-white/10 p-4 flex items-center justify-between">
          <h2 className="text-xl font-bold">Settings</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 p-4 space-y-6">
          {/* Display & Appearance */}
          <div>
            <h3 className="text-sm font-semibold text-white/60 mb-3">DISPLAY & APPEARANCE</h3>
            <div className="bg-white/5 rounded-xl p-4 space-y-4">
              <div>
                <p className="text-sm text-white/80 mb-3">Theme</p>
                <div className="grid grid-cols-3 gap-2">
                  {themeOptions.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => setTheme(option.value)}
                      className={`p-3 rounded-lg border-2 transition-all ${
                        theme === option.value
                          ? 'border-blue-500 bg-blue-500/10'
                          : 'border-white/10 bg-white/5 hover:bg-white/10'
                      }`}
                    >
                      <option.icon className={`w-5 h-5 mx-auto mb-1 ${
                        theme === option.value ? 'text-blue-400' : 'text-white/60'
                      }`} />
                      <p className="text-xs font-medium">{option.label}</p>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Language */}
          <div>
            <h3 className="text-sm font-semibold text-white/60 mb-3">LANGUAGE & REGION</h3>
            <div className="bg-white/5 rounded-xl overflow-hidden">
              <button className="w-full flex items-center justify-between p-4 hover:bg-white/5 transition-colors">
                <div className="flex items-center gap-3">
                  <Globe className="w-5 h-5 text-white/60" />
                  <div className="text-left">
                    <p className="font-medium">Language</p>
                    <p className="text-sm text-white/60">{language}</p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-white/40" />
              </button>
            </div>
          </div>

          {/* Notifications & Sounds */}
          <div>
            <h3 className="text-sm font-semibold text-white/60 mb-3">NOTIFICATIONS & SOUNDS</h3>
            <div className="bg-white/5 rounded-xl overflow-hidden divide-y divide-white/5">
              <div className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  <Bell className="w-5 h-5 text-white/60" />
                  <div>
                    <p className="font-medium">Push Notifications</p>
                    <p className="text-xs text-white/60">Get notified about new content</p>
                  </div>
                </div>
                <button
                  onClick={() => setNotifications(!notifications)}
                  className={`relative w-12 h-7 rounded-full transition-colors ${
                    notifications ? 'bg-blue-500' : 'bg-white/20'
                  }`}
                >
                  <div
                    className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-transform ${
                      notifications ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              <div className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  <Volume2 className="w-5 h-5 text-white/60" />
                  <div>
                    <p className="font-medium">Sound Effects</p>
                    <p className="text-xs text-white/60">Play sounds for actions</p>
                  </div>
                </div>
                <button
                  onClick={() => setSoundEffects(!soundEffects)}
                  className={`relative w-12 h-7 rounded-full transition-colors ${
                    soundEffects ? 'bg-blue-500' : 'bg-white/20'
                  }`}
                >
                  <div
                    className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-transform ${
                      soundEffects ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>

          {/* Downloads */}
          <div>
            <h3 className="text-sm font-semibold text-white/60 mb-3">DOWNLOADS</h3>
            <div className="bg-white/5 rounded-xl overflow-hidden">
              <div className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  <Download className="w-5 h-5 text-white/60" />
                  <div>
                    <p className="font-medium">Auto-save to Gallery</p>
                    <p className="text-xs text-white/60">Save downloads automatically</p>
                  </div>
                </div>
                <button
                  onClick={() => setAutoDownload(!autoDownload)}
                  className={`relative w-12 h-7 rounded-full transition-colors ${
                    autoDownload ? 'bg-blue-500' : 'bg-white/20'
                  }`}
                >
                  <div
                    className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-transform ${
                      autoDownload ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>

          {/* Storage & Data */}
          <div>
            <h3 className="text-sm font-semibold text-white/60 mb-3">STORAGE & DATA</h3>
            <div className="bg-white/5 rounded-xl overflow-hidden divide-y divide-white/5">
              <button
                onClick={handleClearCache}
                className="w-full flex items-center justify-between p-4 hover:bg-white/5 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Database className="w-5 h-5 text-white/60" />
                  <div className="text-left">
                    <p className="font-medium">Clear Cache</p>
                    <p className="text-xs text-white/60">Free up storage space</p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-white/40" />
              </button>

              <button
                onClick={handleClearHistory}
                className="w-full flex items-center justify-between p-4 hover:bg-white/5 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Trash2 className="w-5 h-5 text-red-400" />
                  <div className="text-left">
                    <p className="font-medium text-red-400">Clear History</p>
                    <p className="text-xs text-white/60">Remove viewing history</p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-white/40" />
              </button>
            </div>
          </div>

          {/* Storage Info */}
          <div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-xl p-4 border border-blue-500/20">
            <div className="flex items-start gap-3">
              <Database className="w-5 h-5 text-blue-400 mt-0.5" />
              <div className="flex-1">
                <p className="font-medium text-sm mb-1">Storage Usage</p>
                <p className="text-xs text-white/60 mb-3">234 MB of cache • 1.2 GB downloads</p>
                <div className="w-full bg-white/10 rounded-full h-2">
                  <div className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full" style={{ width: '35%' }} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
