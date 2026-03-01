'use client';

import { usePathname, useRouter } from 'next/navigation';
import { Home, Search, Upload, Bell, User, X } from 'lucide-react';

interface NavigationProps {
  isOpen?: boolean;      // ← optional, defaults to false
  onClose?: () => void;  // ← optional, defaults to noop
}

export const Navigation = ({ isOpen = false, onClose = () => {} }: NavigationProps) => {
  const pathname = usePathname();
  const router   = useRouter();

  const navItems = [
    { href: '/',        icon: Home,   label: 'Home'    },
    { href: '/search',  icon: Search, label: 'Search'  },
    { href: '/upload',  icon: Upload, label: 'Upload'  },
    { href: '/alerts',  icon: Bell,   label: 'Alerts'  },
    { href: '/profile', icon: User,   label: 'Profile' },
  ];

  const handleNav = (href: string) => {
    router.push(href);
    onClose();
  };

  return (
    <>
      {/* ── DESKTOP SIDEBAR — always visible on lg+ ─────────────────────── */}
      <aside className="hidden lg:flex flex-col fixed left-0 top-0 h-full w-16 xl:w-60 bg-black border-r border-white/8 z-40">

        {/* Logo */}
        <div
          onClick={() => router.push('/')}
          className="flex items-center gap-3 px-4 h-14 border-b border-white/8 cursor-pointer flex-shrink-0"
        >
          <div className="w-7 h-7 rounded-lg bg-white flex items-center justify-center flex-shrink-0">
            <span className="text-black text-xs font-black">W</span>
          </div>
          <span className="hidden xl:block text-white font-bold text-sm tracking-tight">
            Wallpaper
          </span>
        </div>

        {/* Nav items */}
        <nav className="flex flex-col gap-0.5 p-3 flex-1 mt-2">
          {navItems.map(({ href, icon: Icon, label }) => {
            const active = pathname === href;
            return (
              <button
                key={href}
                onClick={() => router.push(href)}
                className={`
                  flex items-center gap-3 px-3 py-2.5 rounded-xl
                  transition-all active:scale-95 w-full text-left
                  ${active
                    ? 'bg-white/10 text-white'
                    : 'text-white/40 hover:text-white hover:bg-white/5'
                  }
                `}
              >
                <div className="relative flex-shrink-0">
                  <Icon className={`w-5 h-5 ${active ? 'text-white' : ''}`} />
                  {active && (
                    <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-white rounded-full" />
                  )}
                </div>
                <span className={`hidden xl:block text-sm font-medium ${active ? 'text-white' : ''}`}>
                  {label}
                </span>
              </button>
            );
          })}
        </nav>

        {/* Upload CTA */}
        <div className="p-3 border-t border-white/8">
          <button
            onClick={() => router.push('/upload')}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl bg-white hover:bg-white/90 text-black transition-all active:scale-95"
          >
            <Upload className="w-4 h-4 flex-shrink-0" />
            <span className="hidden xl:block text-sm font-semibold">Upload</span>
          </button>
        </div>

      </aside>

      {/* ── MOBILE SLIDE-IN DRAWER ───────────────────────────────────────── */}

      {/* Overlay */}
      {isOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/70 backdrop-blur-sm z-[60]"
          onClick={onClose}
          style={{ animation: 'fadeIn 0.2s ease' }}
        />
      )}

      {/* Drawer */}
      <div
        className={`
          lg:hidden fixed left-0 top-0 h-full w-72 bg-zinc-950 border-r border-white/8 z-[61]
          transition-transform duration-300 ease-out
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        {/* Drawer header */}
        <div className="flex items-center justify-between px-5 h-14 border-b border-white/8">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg bg-white flex items-center justify-center">
              <span className="text-black text-xs font-black">W</span>
            </div>
            <span className="text-white font-bold text-sm">Wallpaper</span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-white/8 transition-colors"
          >
            <X className="w-5 h-5 text-white/60" />
          </button>
        </div>

        {/* Drawer nav items */}
        <nav className="flex flex-col gap-0.5 p-4">
          {navItems.map(({ href, icon: Icon, label }) => {
            const active = pathname === href;
            return (
              <button
                key={href}
                onClick={() => handleNav(href)}
                className={`
                  flex items-center gap-4 px-4 py-3 rounded-xl
                  transition-all active:scale-95 w-full text-left
                  ${active
                    ? 'bg-white/10 text-white'
                    : 'text-white/50 hover:text-white hover:bg-white/5'
                  }
                `}
              >
                <Icon className={`w-5 h-5 flex-shrink-0 ${active ? 'text-white' : ''}`} />
                <span className="text-sm font-medium">{label}</span>
                {active && (
                  <span className="ml-auto w-1.5 h-1.5 bg-white rounded-full" />
                )}
              </button>
            );
          })}
        </nav>

        {/* Upload CTA in drawer */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-white/8">
          <button
            onClick={() => handleNav('/upload')}
            className="flex items-center justify-center gap-2 w-full py-3 bg-white hover:bg-white/90 text-black rounded-xl font-semibold text-sm transition-all active:scale-95"
          >
            <Upload className="w-4 h-4" />
            Upload Wallpaper
          </button>
        </div>
      </div>
    </>
  );
};
