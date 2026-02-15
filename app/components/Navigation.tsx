import { useState } from 'react';
import { Home, Search, Bell, User, Plus } from 'lucide-react';
import { useAuth } from './AuthProvider';
import { LoginPromptModal } from './LoginPromptModal';
import type { ActiveTab } from '../types';

type NavigationProps = {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  onSearchOpen: () => void;
  onUploadOpen: () => void;
};

export const Navigation = ({ activeTab, setActiveTab, onSearchOpen, onUploadOpen }: NavigationProps) => {
  const { user } = useAuth();
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const [loginAction, setLoginAction] = useState('');

  const handleProtectedAction = (action: () => void, actionName: string) => {
    if (!user) {
      setLoginAction(actionName);
      setShowLoginPrompt(true);
      return;
    }
    action();
  };

  return (
    <>
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-black/95 backdrop-blur-xl border-t border-white/10">
        <div className="max-w-7xl mx-auto px-4 flex items-center justify-around py-2">
          {[
            { id: 'home', icon: Home, label: 'Home', filled: true, protected: false },
            { id: 'search', icon: Search, label: 'Search', protected: false },
            { id: 'upload', icon: Plus, label: '', isUpload: true, protected: true },
            { id: 'notifications', icon: Bell, label: 'Alerts', badge: true, protected: true },
            { id: 'profile', icon: User, label: 'Profile', protected: true }
          ].map(({ id, icon: Icon, label, filled, isUpload, badge, protected: isProtected }) =>
            isUpload ? (
              <button
                key={id}
                onClick={() => handleProtectedAction(onUploadOpen, 'upload wallpapers')}
                className="flex flex-col items-center gap-1 px-4 py-1 -mt-6"
              >
                <div className="w-14 h-14 bg-white rounded-full flex items-center justify-center shadow-lg shadow-white/25 hover:shadow-white/40 transition-all hover:scale-105">
                  <Icon className="w-7 h-7 text-black" strokeWidth={2.5} />
                </div>
              </button>
            ) : (
              <button
                key={id}
                onClick={() => {
                  if (id === 'search') {
                    onSearchOpen();
                  } else if (isProtected) {
                    handleProtectedAction(
                      () => setActiveTab(id as ActiveTab),
                      id === 'notifications' ? 'view notifications' : 'view your profile'
                    );
                  } else {
                    setActiveTab(id as ActiveTab);
                  }
                }}
                className={`flex flex-col items-center gap-1 px-4 py-1 transition-colors relative ${
                  activeTab === id ? 'text-white' : 'text-white/50'
                }`}
              >
                <Icon className="w-5 h-5" fill={filled && activeTab === id ? 'currentColor' : 'none'} />
                {badge && user && <div className="absolute top-0 right-2 w-2 h-2 bg-white rounded-full"></div>}
                <span className="text-[10px] font-medium">{label}</span>
              </button>
            )
          )}
        </div>
      </nav>

      <LoginPromptModal 
        isOpen={showLoginPrompt}
        onClose={() => setShowLoginPrompt(false)}
        action={loginAction}
      />
    </>
  );
};