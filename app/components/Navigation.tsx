'use client';

import { useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Home, Search, Bell, User, Plus } from 'lucide-react';
import { useAuth } from './AuthProvider';
import { LoginPromptModal } from './LoginPromptModal';

export const Navigation = () => {
  const router   = useRouter();
  const pathname = usePathname();
  const { user } = useAuth();
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const [loginAction, setLoginAction]         = useState('');

  const requireAuth = (action: string, cb: () => void) => {
    if (!user) { setLoginAction(action); setShowLoginPrompt(true); }
    else cb();
  };

  const tabs = [
    { id: 'home',          icon: Home,   label: 'Home',    path: '/',               protected: false },
    { id: 'search',        icon: Search, label: 'Search',  path: '/search',         protected: false },
    { id: 'upload',        icon: Plus,   label: '',        path: '/upload',         protected: true,  isUpload: true },
    { id: 'notifications', icon: Bell,   label: 'Alerts',  path: '/notifications',  protected: true  },
    { id: 'profile',       icon: User,   label: 'Profile', path: '/profile',        protected: true  },
  ];

  const isActive = (path: string) => {
    if (path === '/') return pathname === '/';
    return pathname.startsWith(path);
  };

  return (
    <>
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-black/95 backdrop-blur-xl border-t border-white/10">
        <div className="max-w-7xl mx-auto px-4 flex items-center justify-around py-2">
          {tabs.map(({ id, icon: Icon, label, path, protected: isProtected, isUpload }) =>
            isUpload ? (
              <button
                key={id}
                onClick={() => requireAuth('upload wallpapers', () => router.push(path))}
                className="flex flex-col items-center gap-1 px-4 py-1 -mt-6"
              >
                <div className="w-14 h-14 bg-white rounded-full flex items-center justify-center shadow-lg shadow-white/25 hover:shadow-white/40 transition-all hover:scale-105">
                  <Icon className="w-7 h-7 text-black" strokeWidth={2.5} />
                </div>
              </button>
            ) : (
              <button
                key={id}
                onClick={() =>
                  isProtected
                    ? requireAuth(`view ${label.toLowerCase()}`, () => router.push(path))
                    : router.push(path)
                }
                className={`flex flex-col items-center gap-1 px-4 py-1 transition-colors relative ${
                  isActive(path) ? 'text-white' : 'text-white/50'
                }`}
              >
                <Icon
                  className="w-5 h-5"
                  fill={id === 'home' && isActive(path) ? 'currentColor' : 'none'}
                />
                {id === 'notifications' && user && (
                  <div className="absolute top-0 right-2 w-2 h-2 bg-white rounded-full" />
                )}
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
