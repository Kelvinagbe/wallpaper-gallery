'use client';

import { usePathname, useRouter } from 'next/navigation';
import { Home, Search, Upload, Bell, User, X } from 'lucide-react';

interface NavigationProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export const Navigation = ({ isOpen = false, onClose = () => {} }: NavigationProps) => {
  const pathname = usePathname();
  const router   = useRouter();

  const navItems = [
    { href: '/',        icon: Home,   label: 'Home'    },
    { href: '/search',  icon: Search, label: 'Search'  },
    { href: '/alerts',  icon: Bell,   label: 'Alerts'  },
    { href: '/profile', icon: User,   label: 'Profile' },
  ];

  const handleNav = (href: string) => {
    router.push(href);
    onClose();
  };

  const SidebarContent = ({ onItemClick }: { onItemClick: (href: string) => void }) => (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>

      {/* Logo */}
      <div
        onClick={() => onItemClick('/')}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          padding: '0 20px',
          height: '64px',
          borderBottom: '1px solid #f0f0f0',
          cursor: 'pointer',
          flexShrink: 0,
        }}
      >
        {/* favicon.ico as logo */}
        <img
          src="/favicon.ico"
          alt="Logo"
          style={{
            width: '28px',
            height: '28px',
            borderRadius: '8px',
            objectFit: 'contain',
            flexShrink: 0,
          }}
        />
        <span style={{
          fontFamily: "'Syne', sans-serif",
          fontWeight: 800,
          fontSize: '15px',
          letterSpacing: '0.08em',
          color: '#0a0a0a',
        }}>
          WALLS
        </span>
      </div>

      {/* Nav items */}
      <nav style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '2px',
        padding: '16px 12px',
        flex: 1,
      }}>
        {navItems.map(({ href, icon: Icon, label }) => {
          const active = pathname === href;
          return (
            <button
              key={href}
              onClick={() => onItemClick(href)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '11px',
                padding: '10px 14px',
                borderRadius: '10px',
                border: 'none',
                cursor: 'pointer',
                width: '100%',
                textAlign: 'left',
                transition: 'all 0.15s ease',
                background: active ? '#0a0a0a' : 'transparent',
                color: active ? '#ffffff' : '#6b7280',
                position: 'relative',
              }}
              onMouseEnter={e => {
                if (!active) {
                  e.currentTarget.style.background = '#f5f5f5';
                  e.currentTarget.style.color = '#0a0a0a';
                }
              }}
              onMouseLeave={e => {
                if (!active) {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.color = '#6b7280';
                }
              }}
            >
              <Icon size={17} strokeWidth={active ? 2.2 : 1.8} />
              <span style={{
                fontFamily: "'Inter', sans-serif",
                fontWeight: active ? 600 : 400,
                fontSize: '13.5px',
                letterSpacing: '-0.01em',
              }}>
                {label}
              </span>
            </button>
          );
        })}
      </nav>

      {/* Bottom — Upload CTA */}
      <div style={{
        padding: '12px',
        borderTop: '1px solid #f0f0f0',
      }}>
        <button
          onClick={() => onItemClick('/upload')}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            width: '100%',
            padding: '11px',
            borderRadius: '10px',
            border: '1.5px solid #e5e7eb',
            background: '#ffffff',
            color: '#0a0a0a',
            fontFamily: "'Inter', sans-serif",
            fontWeight: 600,
            fontSize: '13px',
            letterSpacing: '-0.01em',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = '#0a0a0a';
            e.currentTarget.style.color = '#ffffff';
            e.currentTarget.style.borderColor = '#0a0a0a';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = '#ffffff';
            e.currentTarget.style.color = '#0a0a0a';
            e.currentTarget.style.borderColor = '#e5e7eb';
          }}
        >
          <Upload size={14} strokeWidth={2} />
          Upload Wallpaper
        </button>
      </div>

    </div>
  );

  return (
    <>
      {/* Google fonts */}
      <link
        href="https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=Inter:wght@400;500;600&display=swap"
        rel="stylesheet"
      />

      {/* ── DESKTOP SIDEBAR ─────────────────────────────────────────────── */}
      <aside
        className="hidden lg:block"
        style={{
          position: 'fixed',
          left: 0,
          top: 0,
          height: '100%',
          width: '220px',
          background: '#ffffff',
          borderRight: '1px solid #f0f0f0',
          zIndex: 40,
        }}
      >
        <SidebarContent onItemClick={(href) => router.push(href)} />
      </aside>

      {/* ── MOBILE OVERLAY ──────────────────────────────────────────────── */}
      {isOpen && (
        <div
          className="lg:hidden"
          onClick={onClose}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.3)',
            backdropFilter: 'blur(4px)',
            zIndex: 60,
            animation: 'fadeIn 0.2s ease',
          }}
        />
      )}

      {/* ── MOBILE DRAWER ───────────────────────────────────────────────── */}
      <div
        className="lg:hidden"
        style={{
          position: 'fixed',
          left: 0,
          top: 0,
          height: '100%',
          width: '260px',
          background: '#ffffff',
          borderRight: '1px solid #f0f0f0',
          zIndex: 61,
          transform: isOpen ? 'translateX(0)' : 'translateX(-100%)',
          transition: 'transform 0.28s cubic-bezier(0.32, 0.72, 0, 1)',
          boxShadow: isOpen ? '4px 0 24px rgba(0,0,0,0.08)' : 'none',
        }}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '16px',
            right: '14px',
            padding: '6px',
            borderRadius: '8px',
            border: '1px solid #f0f0f0',
            background: '#ffffff',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1,
            transition: 'all 0.15s ease',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = '#f5f5f5';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = '#ffffff';
          }}
        >
          <X size={15} color="#6b7280" />
        </button>

        <SidebarContent onItemClick={handleNav} />
      </div>
    </>
  );
};
