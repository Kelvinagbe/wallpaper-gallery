'use client';

import { usePathname, useRouter } from 'next/navigation';
import { Home, Search, Upload, Bell, User } from 'lucide-react';

const NAV = [
  { href: '/',        icon: Home,   label: 'Home'    },
  { href: '/search',  icon: Search, label: 'Search'  },
  { href: '/upload',  icon: Upload, label: 'Upload'  },
  { href: '/alerts',  icon: Bell,   label: 'Alerts'  },
  { href: '/profile', icon: User,   label: 'Profile' },
];

export const Navigation = () => {
  const pathname = usePathname();
  const router   = useRouter();

  const NavItem = ({ href, icon: Icon, label }: typeof NAV[0]) => {
    const active = pathname === href;
    return (
      <button
        key={href}
        onClick={() => router.push(href)}
        style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          gap: 4, flex: 1, height: '100%', padding: '8px 0',
          background: 'none', border: 'none', cursor: 'pointer',
          color: active ? '#0a0a0a' : '#9ca3af',
          transition: 'color .15s',
        }}
      >
        <div style={{
          width: 36, height: 28, borderRadius: 18,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: active ? 'rgba(0,0,0,0.07)' : 'transparent',
          transition: 'background .15s',
        }}>
          <Icon size={20} strokeWidth={active ? 2.2 : 1.8} />
        </div>
        <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 10, fontWeight: active ? 600 : 400, letterSpacing: '0.01em' }}>
          {label}
        </span>
      </button>
    );
  };

  const SidebarItem = ({ href, icon: Icon, label }: typeof NAV[0]) => {
    const active = pathname === href;
    return (
      <button
        onClick={() => router.push(href)}
        style={{
          display: 'flex', alignItems: 'center', gap: 11,
          padding: '10px 14px', borderRadius: 10,
          border: 'none', cursor: 'pointer', width: '100%', textAlign: 'left',
          background: active ? '#0a0a0a' : 'transparent',
          color: active ? '#fff' : '#6b7280',
          transition: 'all .15s',
          fontFamily: "'Inter', sans-serif",
          fontSize: 13.5, fontWeight: active ? 600 : 400,
          letterSpacing: '-0.01em',
        }}
        onMouseEnter={e => { if (!active) { e.currentTarget.style.background = '#f5f5f5'; e.currentTarget.style.color = '#0a0a0a'; } }}
        onMouseLeave={e => { if (!active) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#6b7280'; } }}
      >
        <Icon size={17} strokeWidth={active ? 2.2 : 1.8} />
        {label}
      </button>
    );
  };

  return (
    <>
      <link href="https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=Inter:wght@400;500;600&display=swap" rel="stylesheet" />
      <style>{`
        @keyframes shIn { from { transform: translateY(100%); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        .mob-nav { animation: shIn .25s cubic-bezier(.16,1,.3,1) forwards; }
      `}</style>

      {/* ── DESKTOP SIDEBAR ── */}
      <aside style={{
        display: 'none',
        position: 'fixed', left: 0, top: 0, height: '100%', width: 220,
        background: '#fff', borderRight: '1px solid #f0f0f0', zIndex: 40,
        flexDirection: 'column',
      }}
        className="lg-sidebar"
      >
        {/* Logo */}
        <div
          onClick={() => router.push('/')}
          style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '0 20px', height: 64,
            borderBottom: '1px solid #f0f0f0', cursor: 'pointer', flexShrink: 0,
          }}
        >
          <img src="/favicon.ico" alt="Logo" style={{ width: 28, height: 28, borderRadius: 8, objectFit: 'contain' }} />
          <span style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 15, letterSpacing: '0.08em', color: '#0a0a0a' }}>
            WALLS
          </span>
        </div>

        {/* Nav items */}
        <nav style={{ display: 'flex', flexDirection: 'column', gap: 2, padding: '16px 12px', flex: 1 }}>
          {NAV.filter(n => n.href !== '/upload').map(item => <SidebarItem key={item.href} {...item} />)}
        </nav>

        {/* Upload CTA */}
        <div style={{ padding: 12, borderTop: '1px solid #f0f0f0' }}>
          <button
            onClick={() => router.push('/upload')}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              width: '100%', padding: 11, borderRadius: 10,
              border: '1.5px solid #e5e7eb', background: '#fff',
              color: '#0a0a0a', fontFamily: "'Inter', sans-serif",
              fontWeight: 600, fontSize: 13, letterSpacing: '-0.01em',
              cursor: 'pointer', transition: 'all .15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = '#0a0a0a'; e.currentTarget.style.color = '#fff'; e.currentTarget.style.borderColor = '#0a0a0a'; }}
            onMouseLeave={e => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.color = '#0a0a0a'; e.currentTarget.style.borderColor = '#e5e7eb'; }}
          >
            <Upload size={14} strokeWidth={2} /> Upload Wallpaper
          </button>
        </div>
      </aside>

      {/* ── MOBILE BOTTOM TAB BAR ── */}
      <nav className="mob-nav" style={{
        display: 'flex',
        position: 'fixed', bottom: 0, left: 0, right: 0,
        height: `calc(56px + env(safe-area-inset-bottom))`,
        paddingBottom: 'env(safe-area-inset-bottom)',
        background: 'rgba(255,255,255,0.92)',
        backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
        borderTop: '1px solid rgba(0,0,0,0.07)',
        zIndex: 50,
      }}>
        {NAV.map(item => <NavItem key={item.href} {...item} />)}
      </nav>

      {/* ── CSS: show sidebar on lg, hide bottom bar on lg ── */}
      <style>{`
        @media (min-width: 1024px) {
          .lg-sidebar { display: flex !important; }
          .mob-nav    { display: none !important; }
        }
      `}</style>
    </>
  );
};
