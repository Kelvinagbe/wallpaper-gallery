'use client';

import { usePathname, useRouter } from 'next/navigation';
import { Home, Search, Upload, Bell, User, X, ImageIcon } from 'lucide-react';

interface NavigationProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export const Navigation = ({ isOpen = false, onClose = () => {} }: NavigationProps) => {
  const pathname = usePathname();
  const router   = useRouter();

  const navItems = [
    { href: '/',        icon: Home,      label: 'Home'    },
    { href: '/search',  icon: Search,    label: 'Search'  },
    { href: '/alerts',  icon: Bell,      label: 'Alerts'  },
    { href: '/profile', icon: User,      label: 'Profile' },
  ];

  const handleNav = (href: string) => {
    router.push(href);
    onClose();
  };

  // ── Shared sidebar content ─────────────────────────────────────────────────
  const SidebarContent = ({ onItemClick }: { onItemClick: (href: string) => void }) => (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>

      {/* Logo */}
      <div
        onClick={() => onItemClick('/')}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '0 20px',
          height: '60px',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          cursor: 'pointer',
          flexShrink: 0,
        }}
      >
        <div style={{
          width: '32px',
          height: '32px',
          borderRadius: '10px',
          background: '#fff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}>
          <ImageIcon size={16} color="#000" />
        </div>
        <span style={{
          fontFamily: "'Syne', sans-serif",
          fontWeight: 800,
          fontSize: '16px',
          letterSpacing: '-0.3px',
          background: 'linear-gradient(135deg, #fff 0%, rgba(255,255,255,0.65) 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
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
                gap: '12px',
                padding: '10px 12px',
                borderRadius: '12px',
                border: 'none',
                cursor: 'pointer',
                width: '100%',
                textAlign: 'left',
                transition: 'all 0.15s ease',
                background: active ? 'rgba(255,255,255,0.08)' : 'transparent',
                color: active ? '#ffffff' : 'rgba(255,255,255,0.4)',
                position: 'relative',
              }}
              onMouseEnter={e => {
                if (!active) {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
                  e.currentTarget.style.color = 'rgba(255,255,255,0.75)';
                }
              }}
              onMouseLeave={e => {
                if (!active) {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.color = 'rgba(255,255,255,0.4)';
                }
              }}
            >
              {/* Active left bar indicator */}
              {active && (
                <span style={{
                  position: 'absolute',
                  left: 0,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  width: '3px',
                  height: '20px',
                  background: '#fff',
                  borderRadius: '0 3px 3px 0',
                }} />
              )}
              <Icon size={18} />
              <span style={{
                fontFamily: "'Inter', sans-serif",
                fontWeight: active ? 600 : 400,
                fontSize: '14px',
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
        borderTop: '1px solid rgba(255,255,255,0.06)',
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
            borderRadius: '12px',
            border: 'none',
            background: '#ffffff',
            color: '#000000',
            fontFamily: "'Inter', sans-serif",
            fontWeight: 600,
            fontSize: '13px',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = 'rgba(255,255,255,0.88)';
            e.currentTarget.style.transform = 'scale(0.98)';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = '#ffffff';
            e.currentTarget.style.transform = 'scale(1)';
          }}
        >
          <Upload size={14} />
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
          background: '#0a0a0a',
          borderRight: '1px solid rgba(255,255,255,0.06)',
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
            background: 'rgba(0,0,0,0.75)',
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
          background: '#0a0a0a',
          borderRight: '1px solid rgba(255,255,255,0.06)',
          zIndex: 61,
          transform: isOpen ? 'translateX(0)' : 'translateX(-100%)',
          transition: 'transform 0.28s cubic-bezier(0.32, 0.72, 0, 1)',
        }}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '14px',
            right: '14px',
            padding: '6px',
            borderRadius: '8px',
            border: 'none',
            background: 'rgba(255,255,255,0.06)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1,
          }}
        >
          <X size={16} color="rgba(255,255,255,0.6)" />
        </button>

        <SidebarContent onItemClick={handleNav} />
      </div>
    </>
  );
};
