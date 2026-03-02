'use client';

import { useState } from 'react';
import { Menu, Mail, UserPlus, ArrowRight, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/components/AuthProvider';
import type { Filter } from '../types';

interface HeaderProps {
  filter: Filter;
  setFilter: (filter: Filter) => void;
  onMenuOpen: () => void;
}

const FILTERS: { value: Filter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'trending', label: 'Trending' },
  { value: 'recent', label: 'Recent' },
  { value: 'popular', label: 'Popular' },
];

const BTN_BASE: React.CSSProperties = {
  padding: '7px 16px', borderRadius: '100px', fontSize: '13px',
  fontFamily: "'Inter', sans-serif", fontWeight: 500,
  cursor: 'pointer', transition: 'all 0.2s ease', whiteSpace: 'nowrap',
};

export const Header = ({ filter, setFilter, onMenuOpen }: HeaderProps) => {
  const router = useRouter();
  const { user } = useAuth();
  const [showAuth, setShowAuth] = useState(false);
  const [closing, setClosing] = useState(false);

  const closeModal = (cb?: () => void) => {
    setClosing(true);
    setTimeout(() => { setShowAuth(false); setClosing(false); cb?.(); }, 250);
  };

  const handleNav = (path: string) => closeModal(() => router.push(path));

  const hover = (enter: Partial<CSSStyleDeclaration>, leave: Partial<CSSStyleDeclaration>) => ({
    onMouseEnter: (e: React.MouseEvent<HTMLButtonElement>) => Object.assign(e.currentTarget.style, enter),
    onMouseLeave: (e: React.MouseEvent<HTMLButtonElement>) => Object.assign(e.currentTarget.style, leave),
  });

  return (
    <>
      <link href="https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=Inter:wght@400;500;600&display=swap" rel="stylesheet" />
      <style>{`
        @keyframes modalIn  { from { opacity:0; transform:scale(0.95) translateY(-8px); } to { opacity:1; transform:scale(1) translateY(0); } }
        @keyframes modalOut { from { opacity:1; transform:scale(1) translateY(0); } to { opacity:0; transform:scale(0.95) translateY(-8px); } }
        @keyframes backdropIn  { from { opacity:0; } to { opacity:1; } }
        @keyframes backdropOut { from { opacity:1; } to { opacity:0; } }
        .modal-enter { animation: modalIn 0.25s cubic-bezier(0.16,1,0.3,1) forwards; }
        .modal-exit  { animation: modalOut 0.25s cubic-bezier(0.16,1,0.3,1) forwards; }
        .backdrop-enter { animation: backdropIn  0.25s ease forwards; }
        .backdrop-exit  { animation: backdropOut 0.25s ease forwards; }
      `}</style>

      <header style={{
        position: 'sticky', top: 0, zIndex: 50,
        background: 'rgba(255,255,255,0.85)',
        backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(0,0,0,0.06)',
      }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '0 16px', height: '56px', display: 'flex', alignItems: 'center', gap: '16px' }}>

          {/* Hamburger */}
          <button onClick={onMenuOpen} className="lg:hidden" aria-label="Open menu"
            style={{ padding: '6px', borderRadius: '8px', background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'background 0.2s' }}
            {...hover({ background: 'rgba(0,0,0,0.05)' }, { background: 'transparent' })}
          >
            <Menu size={20} color="rgba(0,0,0,0.5)" />
          </button>

          {/* Logo */}
          <span onClick={() => router.push('/')} style={{
            fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '18px',
            letterSpacing: '-0.5px', cursor: 'pointer', flexShrink: 0,
            background: 'linear-gradient(135deg, #000000 0%, rgba(0,0,0,0.6) 100%)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
          }}>
            WALLS
          </span>

          {/* Filter tabs */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', overflowX: 'auto', flex: 1, msOverflowStyle: 'none', scrollbarWidth: 'none' }}>
            {FILTERS.map(({ value, label }) => (
              <button key={value} onClick={() => setFilter(value)} style={{
                ...BTN_BASE, padding: '6px 16px',
                background: filter === value ? '#000000' : 'transparent',
                color: filter === value ? '#ffffff' : 'rgba(0,0,0,0.4)',
                boxShadow: filter === value ? '0 0 20px rgba(0,0,0,0.1)' : 'none',
                fontWeight: 500, border: 'none',
              }}
                {...hover(
                  filter !== value ? { color: 'rgba(0,0,0,0.8)', background: 'rgba(0,0,0,0.05)' } : {},
                  filter !== value ? { color: 'rgba(0,0,0,0.4)', background: 'transparent' } : {},
                )}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Right actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
            <button onClick={() => router.push('/upload')} style={{
              ...BTN_BASE, border: '1px solid rgba(0,0,0,0.12)',
              background: 'transparent', color: 'rgba(0,0,0,0.55)',
            }}
              {...hover({ background: 'rgba(0,0,0,0.04)', color: 'rgba(0,0,0,0.9)', borderColor: 'rgba(0,0,0,0.25)' }, { background: 'transparent', color: 'rgba(0,0,0,0.55)', borderColor: 'rgba(0,0,0,0.12)' })}
            >
              Upload
            </button>

            {!user && (
              <button onClick={() => setShowAuth(true)} style={{ ...BTN_BASE, border: 'none', background: '#000000', color: '#ffffff', fontWeight: 600 }}
                {...hover({ background: 'rgba(0,0,0,0.8)', transform: 'scale(0.98)' }, { background: '#000000', transform: 'scale(1)' })}
              >
                Sign in
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Auth Modal */}
      {showAuth && (
        <div className={closing ? 'backdrop-exit' : 'backdrop-enter'} onClick={() => closeModal()} style={{
          position: 'fixed', inset: 0, zIndex: 200,
          background: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px',
        }}>
          <div className={closing ? 'modal-exit' : 'modal-enter'} onClick={e => e.stopPropagation()} style={{
            width: '100%', maxWidth: '360px', background: '#ffffff',
            border: '1px solid rgba(0,0,0,0.08)', borderRadius: '24px',
            padding: '32px 28px', boxShadow: '0 40px 80px rgba(0,0,0,0.15)',
          }}>
            {/* Close */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '8px' }}>
              <button onClick={() => closeModal()} style={{
                width: '28px', height: '28px', borderRadius: '50%',
                background: 'rgba(0,0,0,0.05)', border: 'none', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.2s',
              }}
                {...hover({ background: 'rgba(0,0,0,0.1)' }, { background: 'rgba(0,0,0,0.05)' })}
              >
                <X size={14} color="rgba(0,0,0,0.4)" />
              </button>
            </div>

            {/* Title */}
            <div style={{ marginBottom: '28px' }}>
              <h2 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '22px', color: '#000000', letterSpacing: '-0.5px', marginBottom: '6px' }}>
                Welcome to WALLS
              </h2>
              <p style={{ fontSize: '13px', color: 'rgba(0,0,0,0.4)', fontFamily: "'Inter', sans-serif" }}>
                Sign in or create an account to continue
              </p>
            </div>

            {/* Buttons */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {[
                { label: 'Sign in with Email', icon: Mail, path: '/auth/login', primary: true },
                { label: 'Create Account', icon: UserPlus, path: '/auth/signup', primary: false },
              ].map(({ label, icon: Icon, path, primary }) => (
                <button key={path} onClick={() => handleNav(path)} style={{
                  width: '100%', padding: '14px 20px', borderRadius: '14px', cursor: 'pointer',
                  fontFamily: "'Inter', sans-serif", fontWeight: 600, fontSize: '14px',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  transition: 'all 0.2s ease',
                  background: primary ? '#000000' : 'rgba(0,0,0,0.03)',
                  color: primary ? '#ffffff' : '#000000',
                  border: primary ? 'none' : '1px solid rgba(0,0,0,0.1)',
                }}
                  {...hover(
                    primary ? { background: 'rgba(0,0,0,0.8)', transform: 'scale(0.99)' } : { background: 'rgba(0,0,0,0.06)', borderColor: 'rgba(0,0,0,0.2)', transform: 'scale(0.99)' },
                    primary ? { background: '#000000', transform: 'scale(1)' } : { background: 'rgba(0,0,0,0.03)', borderColor: 'rgba(0,0,0,0.1)', transform: 'scale(1)' },
                  )}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Icon size={16} /><span>{label}</span>
                  </div>
                  <ArrowRight size={15} />
                </button>
              ))}
            </div>

            <p style={{ marginTop: '20px', textAlign: 'center', fontSize: '11px', color: 'rgba(0,0,0,0.25)', fontFamily: "'Inter', sans-serif", lineHeight: 1.6 }}>
              By continuing you agree to our Terms of Service and Privacy Policy
            </p>
          </div>
        </div>
      )}
    </>
  );
};