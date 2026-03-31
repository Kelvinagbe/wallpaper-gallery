
'use client';

import { usePathname, useRouter } from 'next/navigation';
import { Home, Search, Bell, User, Upload } from 'lucide-react';
import { useUploadModal } from '@/app/components/UploadModalProvider';
import { startLoader } from '@/app/components/TopLoader';

const NAV = [
  { href: '/',        icon: Home,   label: 'Home'    },
  { href: '/search',  icon: Search, label: 'Search'  },
  { href: '/alerts',  icon: Bell,   label: 'Alerts'  },
  { href: '/profile', icon: User,   label: 'Profile' },
];

export const Navigation = () => {
  const pathname  = usePathname();
  const router    = useRouter();
  const { open: openUpload } = useUploadModal();

  const go = (href: string) => { startLoader(); router.push(href); };

  return (
    <>
      {/* ── MOBILE BOTTOM NAV ── */}
      <nav style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 60,
        background: '#fff',
        borderRadius: '20px 20px 0 0',
        boxShadow: '0 -1px 0 rgba(0,0,0,0.06), 0 -8px 32px rgba(0,0,0,0.08)',
        paddingBottom: 'max(12px, env(safe-area-inset-bottom))',
        paddingTop: 10,
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-around',
      }}
        className="lg:hidden"
      >
        {NAV.map(({ href, icon: Icon, label }) => {
          const active = pathname === href;
          return (
            <button
              key={href}
              onClick={() => go(href)}
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                gap: 4, padding: '6px 16px',
                border: 'none', background: 'transparent', cursor: 'pointer',
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              <div style={{
                width: 44, height: 32,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                borderRadius: 16,
                background: active ? '#0a0a0a' : 'transparent',
                transition: 'background 0.18s ease',
              }}>
                <Icon
                  size={18}
                  strokeWidth={active ? 2.2 : 1.8}
                  color={active ? '#fff' : 'rgba(10,10,10,0.4)'}
                />
              </div>
              <span style={{
                fontFamily: "'DM Sans', sans-serif",
                fontSize: 11, fontWeight: active ? 600 : 500,
                color: active ? '#0a0a0a' : 'rgba(10,10,10,0.35)',
                letterSpacing: '-0.01em',
                transition: 'color 0.18s ease',
              }}>
                {label}
              </span>
            </button>
          );
        })}

        {/* Upload button */}
        <button
          onClick={openUpload}
          style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            gap: 4, padding: '6px 16px',
            border: 'none', background: 'transparent', cursor: 'pointer',
            WebkitTapHighlightColor: 'transparent',
          }}
        >
          <div style={{
            width: 44, height: 32,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            borderRadius: 16,
            background: '#f04e23',
            transition: 'background 0.18s ease',
          }}>
            <Upload size={16} strokeWidth={2.2} color="#fff" />
          </div>
          <span style={{
            fontFamily: "'DM Sans', sans-serif",
            fontSize: 11, fontWeight: 500,
            color: 'rgba(10,10,10,0.35)',
            letterSpacing: '-0.01em',
          }}>
            Upload
          </span>
        </button>
      </nav>

      {/* ── DESKTOP SIDEBAR ── */}
      <aside style={{
        display: 'none', position: 'fixed', left: 0, top: 0,
        height: '100%', width: 220, background: '#fff',
        borderRight: '1px solid rgba(0,0,0,0.07)', zIndex: 40,
        flexDirection: 'column',
      }}
        className="lg:!flex"
      >
        {/* Logo */}
        <div
          onClick={() => { startLoader(); router.push('/'); }}
          style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '0 20px', height: 64,
            borderBottom: '1px solid rgba(0,0,0,0.07)',
            cursor: 'pointer', flexShrink: 0,
          }}
        >
          <img src="/favicon.ico" alt="Logo" style={{ width: 28, height: 28, borderRadius: 8, objectFit: 'contain' }} />
          <span style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 15, letterSpacing: '0.08em', color: '#0a0a0a' }}>
            WALLS
          </span>
        </div>

        {/* Nav items */}
        <nav style={{ display: 'flex', flexDirection: 'column', gap: 2, padding: '16px 12px', flex: 1 }}>
          {NAV.map(({ href, icon: Icon, label }) => {
            const active = pathname === href;
            return (
              <button
                key={href}
                onClick={() => { startLoader(); router.push(href); }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 11,
                  padding: '10px 14px', borderRadius: 10, border: 'none',
                  cursor: 'pointer', width: '100%', textAlign: 'left',
                  background: active ? '#0a0a0a' : 'transparent',
                  color: active ? '#fff' : '#6b7280',
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: 13.5, fontWeight: active ? 600 : 400,
                  letterSpacing: '-0.01em', transition: 'all 0.15s',
                }}
              >
                <Icon size={17} strokeWidth={active ? 2.2 : 1.8} />
                {label}
              </button>
            );
          })}
        </nav>

        {/* Upload */}
        <div style={{ padding: 12, borderTop: '1px solid rgba(0,0,0,0.07)' }}>
          <button
            onClick={openUpload}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              width: '100%', padding: 11, borderRadius: 10,
              border: '1.5px solid #e5e7eb', background: '#fff', color: '#0a0a0a',
              fontFamily: "'DM Sans', sans-serif",
              fontSize: 13, fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s',
            }}
          >
            <Upload size={14} strokeWidth={2} /> Upload Wallpaper
          </button>
        </div>
      </aside>
    </>
  );
};
