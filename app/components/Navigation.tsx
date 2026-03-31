'use client';

import { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Home, Search, Bell, User, X, Upload } from 'lucide-react';
import { useUploadModal } from '@/app/components/UploadModalProvider';
import { startLoader } from '@/app/components/TopLoader';

const NAV = [
  { href: '/',        icon: Home,   label: 'Home'    },
  { href: '/search',  icon: Search, label: 'Search'  },
  { href: '/alerts',  icon: Bell,   label: 'Alerts'  },
  { href: '/profile', icon: User,   label: 'Profile' },
];

const CLOSE_MS = 260;

interface NavigationProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export const Navigation = ({ isOpen = false, onClose = () => {} }: NavigationProps) => {
  const pathname = usePathname();
  const router   = useRouter();
  const { open: openUpload } = useUploadModal();

  const [mounted, setMounted] = useState(false);
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setClosing(false);
      setMounted(true);
    } else if (mounted) {
      setClosing(true);
      const t = setTimeout(() => { setMounted(false); setClosing(false); }, CLOSE_MS);
      return () => clearTimeout(t);
    }
  }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  const close        = () => onClose();
  const go           = (href: string) => { startLoader(); router.push(href); close(); };
  const handleUpload = () => { close(); setTimeout(openUpload, CLOSE_MS); };

  return (
    <>
      <style>{`
        @keyframes drawerIn  { from { transform: translateX(100%); } to { transform: translateX(0); } }
        @keyframes drawerOut { from { transform: translateX(0); }    to { transform: translateX(100%); } }
        @keyframes bdIn      { from { opacity: 0; } to { opacity: 1; } }
        @keyframes bdOut     { from { opacity: 1; } to { opacity: 0; } }
        @keyframes itemIn    { from { opacity: 0; transform: translateX(12px); } to { opacity: 1; transform: translateX(0); } }
        .nav-item-1 { animation: itemIn .28s cubic-bezier(.16,1,.3,1) .06s forwards; }
        .nav-item-2 { animation: itemIn .28s cubic-bezier(.16,1,.3,1) .10s forwards; }
        .nav-item-3 { animation: itemIn .28s cubic-bezier(.16,1,.3,1) .14s forwards; }
        .nav-item-4 { animation: itemIn .28s cubic-bezier(.16,1,.3,1) .18s forwards; }
        .nav-upload { animation: itemIn .28s cubic-bezier(.16,1,.3,1) .22s forwards; }
        .desk-nav-btn:hover { background: #f5f5f5 !important; color: #0a0a0a !important; }
        .desk-upload-btn:hover { background: #0a0a0a !important; color: #fff !important; border-color: #0a0a0a !important; }
      `}</style>

      {/* ── DESKTOP SIDEBAR ── */}
      <aside style={{
        display: 'none',
        position: 'fixed', left: 0, top: 0,
        height: '100%', width: 220,
        background: '#fff',
        borderRight: '1px solid rgba(0,0,0,0.07)',
        zIndex: 40,
        flexDirection: 'column',
      }} className="lg:!flex">

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
          <img
            src="/favicon.ico"
            alt="Walls logo"
            style={{ width: 28, height: 28, borderRadius: 8, objectFit: 'contain' }}
          />
          <span style={{
            fontFamily: "'Syne', sans-serif",
            fontWeight: 800, fontSize: 15,
            letterSpacing: '0.08em', color: '#0a0a0a',
          }}>
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
                className={active ? undefined : 'desk-nav-btn'}
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
            className="desk-upload-btn"
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              width: '100%', padding: 11, borderRadius: 10,
              border: '1.5px solid #e5e7eb', background: '#fff', color: '#0a0a0a',
              fontFamily: "'DM Sans', sans-serif",
              fontSize: 13, fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s',
            }}
          >
            <Upload size={14} strokeWidth={2} />
            Upload Wallpaper
          </button>
        </div>
      </aside>

      {/* ── MOBILE SIDE DRAWER ── */}
      {mounted && (
        <>
          {/* Backdrop */}
          <div
            onClick={close}
            style={{
              position: 'fixed', inset: 0, zIndex: 50,
              background: 'rgba(0,0,0,0.25)',
              backdropFilter: 'blur(6px)',
              WebkitBackdropFilter: 'blur(6px)',
              animation: `${closing ? 'bdOut' : 'bdIn'} ${closing ? CLOSE_MS : 220}ms ease forwards`,
            }}
          />

          {/* Drawer */}
          <div style={{
            position: 'fixed', top: 0, right: 0, bottom: 0, zIndex: 60,
            width: 'min(80vw, 300px)',
            background: '#fff',
            borderRadius: '20px 0 0 20px',
            display: 'flex', flexDirection: 'column',
            paddingBottom: 'max(20px, env(safe-area-inset-bottom))',
            paddingTop: 'env(safe-area-inset-top)',
            boxShadow: '-4px 0 40px rgba(0,0,0,0.1)',
            animation: `${closing ? 'drawerOut' : 'drawerIn'} ${closing ? CLOSE_MS : 320}ms ${closing ? 'cubic-bezier(.4,0,1,1)' : 'cubic-bezier(.16,1,.3,1)'} forwards`,
            willChange: 'transform',
          }}>

            {/* Drawer header */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '18px 20px 14px',
              borderBottom: '1px solid rgba(0,0,0,0.07)',
              flexShrink: 0,
            }}>
              <span style={{
                fontFamily: "'Syne', sans-serif",
                fontWeight: 800, fontSize: 17,
                letterSpacing: '-0.3px', color: '#0a0a0a',
              }}>
                WALLS
              </span>
              <button
                onClick={close}
                style={{
                  width: 28, height: 28, borderRadius: '50%',
                  background: 'rgba(0,0,0,0.06)', border: 'none',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer',
                }}
              >
                <X size={14} color="rgba(0,0,0,0.45)" />
              </button>
            </div>

            {/* Nav items */}
            <nav style={{ padding: '12px 12px 8px', display: 'flex', flexDirection: 'column', gap: 2, flex: 1 }}>
              {NAV.map(({ href, icon: Icon, label }, i) => {
                const active = pathname === href;
                return (
                  <button
                    key={href}
                    onClick={() => go(href)}
                    className={`nav-item-${i + 1}`}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 14,
                      padding: '13px 14px', borderRadius: 14,
                      border: 'none',
                      background: active ? '#0a0a0a' : 'transparent',
                      color: active ? '#fff' : 'rgba(10,10,10,0.55)',
                      width: '100%', textAlign: 'left', cursor: 'pointer',
                      fontFamily: "'DM Sans', sans-serif",
                      fontSize: 15, fontWeight: active ? 600 : 400,
                      opacity: 0,
                      transition: 'background 0.15s, color 0.15s',
                    }}
                  >
                    <div style={{
                      width: 38, height: 38, borderRadius: 10,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: active ? 'rgba(255,255,255,0.15)' : 'rgba(10,10,10,0.05)',
                      flexShrink: 0,
                    }}>
                      <Icon size={18} strokeWidth={active ? 2.2 : 1.8} />
                    </div>
                    {label}
                  </button>
                );
              })}
            </nav>

            {/* Upload */}
            <div style={{ padding: '4px 12px 0', borderTop: '1px solid rgba(0,0,0,0.07)', marginTop: 4 }}>
              <button
                onClick={handleUpload}
                className="nav-upload"
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9,
                  width: '100%', padding: 14, borderRadius: 14,
                  border: '1.5px solid rgba(10,10,10,0.1)', background: '#fff',
                  color: '#0a0a0a',
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: 14, fontWeight: 600, cursor: 'pointer',
                  opacity: 0,
                  transition: 'all 0.18s',
                }}
              >
                <Upload size={15} strokeWidth={2} />
                Upload Wallpaper
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );
};
