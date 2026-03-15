'use client';

import { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Home, Search, Bell, User, X, Upload } from 'lucide-react';
import { useUploadModal } from '@/app/components/UploadModalProvider';

const NAV = [
  { href: '/',        icon: Home,   label: 'Home'    },
  { href: '/search',  icon: Search, label: 'Search'  },
  { href: '/alerts',  icon: Bell,   label: 'Alerts'  },
  { href: '/profile', icon: User,   label: 'Profile' },
];

const CLOSE_DURATION = 260;

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
      const t = setTimeout(() => { setMounted(false); setClosing(false); }, CLOSE_DURATION);
      return () => clearTimeout(t);
    }
  }, [isOpen]);

  const close = () => onClose();
  const go    = (href: string) => { router.push(href); close(); };

  // close nav sheet first, then open upload modal
  const handleUpload = () => { close(); setTimeout(openUpload, CLOSE_DURATION); };

  return (
    <>
      <link href="https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600&display=swap" rel="stylesheet" />
      <style>{`
        @keyframes sheetIn  { from { transform: translateY(100%); } to { transform: translateY(0); } }
        @keyframes sheetOut { from { transform: translateY(0); }    to { transform: translateY(100%); } }
        @keyframes bdIn     { from { opacity: 0; }  to { opacity: 1; } }
        @keyframes bdOut    { from { opacity: 1; }  to { opacity: 0; } }
        @keyframes itemIn   { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }

        .nav-sheet {
          position: fixed; bottom: 0; left: 0; right: 0; z-index: 60;
          background: #fff; border-radius: 24px 24px 0 0;
          padding-bottom: max(20px, env(safe-area-inset-bottom));
          box-shadow: 0 -4px 40px rgba(0,0,0,0.1);
          animation: sheetIn .32s cubic-bezier(.16,1,.3,1) forwards;
          will-change: transform;
        }
        .nav-sheet.closing { animation: sheetOut ${CLOSE_DURATION}ms cubic-bezier(.4,0,1,1) forwards; }
        .nav-bd {
          position: fixed; inset: 0; z-index: 50;
          background: rgba(0,0,0,0.25);
          backdrop-filter: blur(6px); -webkit-backdrop-filter: blur(6px);
          animation: bdIn .22s ease forwards;
        }
        .nav-bd.closing { animation: bdOut ${CLOSE_DURATION}ms ease forwards; }

        .nav-item {
          display: flex; align-items: center; gap: 14px;
          padding: 13px 14px; border-radius: 14px;
          border: none; background: transparent; width: 100%;
          text-align: left; cursor: pointer;
          font-family: 'DM Sans', sans-serif; font-size: 15px; font-weight: 400;
          color: rgba(10,10,10,0.55); transition: background .15s, color .15s; opacity: 0;
        }
        .nav-item.active { background: #0a0a0a; color: #fff; font-weight: 600; }
        .nav-item:not(.active):hover { background: rgba(10,10,10,0.05); color: #0a0a0a; }
        .nav-item:nth-child(1) { animation: itemIn .28s cubic-bezier(.16,1,.3,1) .06s forwards; }
        .nav-item:nth-child(2) { animation: itemIn .28s cubic-bezier(.16,1,.3,1) .10s forwards; }
        .nav-item:nth-child(3) { animation: itemIn .28s cubic-bezier(.16,1,.3,1) .14s forwards; }
        .nav-item:nth-child(4) { animation: itemIn .28s cubic-bezier(.16,1,.3,1) .18s forwards; }

        .nav-icon {
          width: 38px; height: 38px; border-radius: 10px;
          display: flex; align-items: center; justify-content: center;
          background: rgba(10,10,10,0.05); flex-shrink: 0;
        }
        .nav-item.active .nav-icon { background: rgba(255,255,255,0.15); }

        .upload-btn {
          display: flex; align-items: center; justify-content: center; gap: 9px;
          width: 100%; padding: 14px; border-radius: 14px;
          border: 1.5px solid rgba(10,10,10,0.1); background: #fff;
          color: #0a0a0a; font-family: 'DM Sans', sans-serif;
          font-size: 14px; font-weight: 600; cursor: pointer;
          transition: all .18s; opacity: 0;
          animation: itemIn .28s cubic-bezier(.16,1,.3,1) .22s forwards;
        }
        .upload-btn:hover { background: #0a0a0a; color: #fff; border-color: #0a0a0a; }

        .desk-sidebar {
          display: none; position: fixed; left: 0; top: 0;
          height: 100%; width: 220px; background: #fff;
          border-right: 1px solid rgba(0,0,0,0.07); z-index: 40; flex-direction: column;
        }
        .desk-nav-item {
          display: flex; align-items: center; gap: 11px;
          padding: 10px 14px; border-radius: 10px; border: none;
          cursor: pointer; width: 100%; text-align: left;
          background: transparent; color: #6b7280;
          font-family: 'DM Sans', sans-serif; font-size: 13.5px; font-weight: 400;
          letter-spacing: -0.01em; transition: all .15s;
        }
        .desk-nav-item.active { background: #0a0a0a; color: #fff; font-weight: 600; }
        .desk-nav-item:not(.active):hover { background: #f5f5f5; color: #0a0a0a; }
        .desk-upload {
          display: flex; align-items: center; justify-content: center; gap: 8px;
          width: 100%; padding: 11px; border-radius: 10px;
          border: 1.5px solid #e5e7eb; background: #fff; color: #0a0a0a;
          font-family: 'DM Sans', sans-serif; font-size: 13px; font-weight: 600;
          cursor: pointer; transition: all .15s;
        }
        .desk-upload:hover { background: #0a0a0a; color: #fff; border-color: #0a0a0a; }

        @media (min-width: 1024px) {
          .desk-sidebar { display: flex; }
          .nav-sheet, .nav-bd { display: none !important; }
        }
      `}</style>

      {/* ── DESKTOP SIDEBAR ── */}
      <aside className="desk-sidebar">
        <div
          onClick={() => router.push('/')}
          style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '0 20px', height: 64, borderBottom: '1px solid rgba(0,0,0,0.07)', cursor: 'pointer', flexShrink: 0 }}
        >
          <img src="/favicon.ico" alt="Logo" style={{ width: 28, height: 28, borderRadius: 8, objectFit: 'contain' }} />
          <span style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 15, letterSpacing: '0.08em', color: '#0a0a0a' }}>WALLS</span>
        </div>

        <nav style={{ display: 'flex', flexDirection: 'column', gap: 2, padding: '16px 12px', flex: 1 }}>
          {NAV.map(({ href, icon: Icon, label }) => (
            <button key={href} onClick={() => router.push(href)} className={`desk-nav-item${pathname === href ? ' active' : ''}`}>
              <Icon size={17} strokeWidth={pathname === href ? 2.2 : 1.8} />
              {label}
            </button>
          ))}
        </nav>

        <div style={{ padding: 12, borderTop: '1px solid rgba(0,0,0,0.07)' }}>
          <button className="desk-upload" onClick={openUpload}>
            <Upload size={14} strokeWidth={2} /> Upload Wallpaper
          </button>
        </div>
      </aside>

      {/* ── MOBILE BOTTOM SHEET ── */}
      {mounted && (
        <>
          <div className={`nav-bd${closing ? ' closing' : ''}`} onClick={close} />
          <div className={`nav-sheet${closing ? ' closing' : ''}`}>
            <div style={{ display: 'flex', justifyContent: 'center', padding: '14px 0 6px' }}>
              <div style={{ width: 36, height: 4, borderRadius: 2, background: 'rgba(0,0,0,0.1)' }} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 20px 14px' }}>
              <span style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 17, letterSpacing: '-0.3px', color: '#0a0a0a' }}>WALLS</span>
              <button onClick={close} style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(0,0,0,0.06)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                <X size={14} color="rgba(0,0,0,0.45)" />
              </button>
            </div>
            <nav style={{ padding: '0 12px 8px', display: 'flex', flexDirection: 'column', gap: 2 }}>
              {NAV.map(({ href, icon: Icon, label }) => (
                <button key={href} onClick={() => go(href)} className={`nav-item${pathname === href ? ' active' : ''}`}>
                  <div className="nav-icon"><Icon size={18} strokeWidth={pathname === href ? 2.2 : 1.8} /></div>
                  {label}
                </button>
              ))}
            </nav>
            <div style={{ padding: '4px 12px 0', borderTop: '1px solid rgba(0,0,0,0.07)', marginTop: 4 }}>
              <button className="upload-btn" onClick={handleUpload}>
                <Upload size={15} strokeWidth={2} /> Upload Wallpaper
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );
};
