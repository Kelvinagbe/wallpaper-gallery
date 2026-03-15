'use client';

import { useState } from 'react';
import { Menu, Mail, UserPlus, ArrowRight, X, ChevronDown } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/components/AuthProvider';
import type { Filter } from '../types';

interface HeaderProps {
  filter: Filter;
  setFilter: (filter: Filter) => void;
  onMenuOpen: () => void;
}

const FILTERS: { value: Filter; label: string }[] = [
  { value: 'all',      label: 'All'      },
  { value: 'trending', label: 'Trending' },
  { value: 'recent',   label: 'Recent'   },
  { value: 'popular',  label: 'Popular'  },
];

export const Header = ({ filter, setFilter, onMenuOpen }: HeaderProps) => {
  const router = useRouter();
  const { user } = useAuth();
  const [showAuth, setShowAuth]     = useState(false);
  const [closing, setClosing]       = useState(false);

  const closeModal = (cb?: () => void) => {
    setClosing(true);
    setTimeout(() => { setShowAuth(false); setClosing(false); cb?.(); }, 250);
  };
  const handleNav = (path: string) => closeModal(() => router.push(path));

  /* inline hover helper */
  const hov = (
    enter: Partial<CSSStyleDeclaration>,
    leave: Partial<CSSStyleDeclaration>,
  ) => ({
    onMouseEnter: (e: React.MouseEvent<HTMLButtonElement>) => Object.assign(e.currentTarget.style, enter),
    onMouseLeave: (e: React.MouseEvent<HTMLButtonElement>) => Object.assign(e.currentTarget.style, leave),
  });

  const activeLabel = FILTERS.find(f => f.value === filter)?.label ?? 'All';

  return (
    <>
      <link
        href="https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=Inter:wght@400;500;600&display=swap"
        rel="stylesheet"
      />

      <style>{`
        /* ── animations ── */
        @keyframes bdIn    { from{opacity:0}            to{opacity:1}            }
        @keyframes bdOut   { from{opacity:1}            to{opacity:0}            }
        @keyframes mIn     { from{opacity:0;transform:scale(.96) translateY(-6px)} to{opacity:1;transform:scale(1) translateY(0)} }
        @keyframes mOut    { from{opacity:1;transform:scale(1)  translateY(0)}  to{opacity:0;transform:scale(.96) translateY(-6px)} }
        .bd-in  { animation: bdIn  .22s ease forwards }
        .bd-out { animation: bdOut .22s ease forwards }
        .m-in   { animation: mIn   .25s cubic-bezier(.16,1,.3,1) forwards }
        .m-out  { animation: mOut  .22s ease forwards }

        /* ── desktop filter tabs ── */
        .hdr-tab {
          position: relative;
          padding: 0 14px;
          height: 56px;
          display: flex; align-items: center;
          font-family: 'Inter', sans-serif;
          font-size: 13px; font-weight: 500;
          color: rgba(0,0,0,.4);
          background: transparent; border: none;
          cursor: pointer;
          transition: color .15s;
          white-space: nowrap;
        }
        .hdr-tab::after {
          content: '';
          position: absolute; bottom: 0; left: 14px; right: 14px;
          height: 2px;
          background: #000;
          transform: scaleX(0);
          transition: transform .2s cubic-bezier(.16,1,.3,1);
        }
        .hdr-tab:hover  { color: rgba(0,0,0,.75); }
        .hdr-tab.active { color: #000; }
        .hdr-tab.active::after { transform: scaleX(1); }

        /* ── mobile select wrapper ── */
        .mob-select-wrap {
          position: relative;
          display: inline-flex; align-items: center;
          gap: 3px;
          cursor: pointer;
        }
        .mob-select-wrap select {
          position: absolute; inset: 0;
          width: 100%; height: 100%;
          opacity: 0;
          border: none; background: transparent;
          cursor: pointer;
          font-size: 16px; /* prevent iOS zoom */
        }
        .mob-select-label {
          display: flex; align-items: center; gap: 3px;
          font-family: 'Inter', sans-serif;
          font-size: 14px; font-weight: 600;
          color: #000;
          pointer-events: none;
          user-select: none;
        }

        /* ── shared button reset ── */
        .hdr-btn {
          padding: 7px 15px;
          font-family: 'Inter', sans-serif;
          font-size: 13px; font-weight: 500;
          border-radius: 0;
          cursor: pointer;
          transition: all .18s;
          white-space: nowrap;
        }
      `}</style>

      {/* ════════ HEADER ════════ */}
      <header style={{
        position: 'sticky', top: 0, zIndex: 50,
        background: 'rgba(255,255,255,0.88)',
        backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(0,0,0,0.07)',
      }}>
        <div style={{
          maxWidth: 1280, margin: '0 auto',
          padding: '0 16px', height: 56,
          display: 'flex', alignItems: 'center', gap: 8,
        }}>

          {/* Hamburger — mobile only */}
          <button
            onClick={onMenuOpen}
            className="lg:hidden"
            aria-label="Open menu"
            style={{ padding: 6, background: 'transparent', border: 'none', cursor: 'pointer', borderRadius: 6, display: 'flex', alignItems: 'center', flexShrink: 0, transition: 'background .18s' }}
            {...hov({ background: 'rgba(0,0,0,0.05)' }, { background: 'transparent' })}
          >
            <Menu size={20} color="rgba(0,0,0,0.5)" />
          </button>

          {/* Logo */}
          <span
            onClick={() => router.push('/')}
            style={{
              fontFamily: "'Syne', sans-serif", fontWeight: 800,
              fontSize: 18, letterSpacing: '-0.5px',
              cursor: 'pointer', flexShrink: 0,
              background: 'linear-gradient(135deg,#000 0%,rgba(0,0,0,.55) 100%)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
            }}
          >
            WALLS
          </span>

          {/* Divider */}
          <div style={{ width: 1, height: 18, background: 'rgba(0,0,0,0.1)', flexShrink: 0, margin: '0 4px' }} />

          {/* Desktop tabs */}
          <nav
            className="hidden lg:flex"
            style={{ display: 'flex', alignItems: 'stretch', height: 56, flex: 1 }}
          >
            {FILTERS.map(({ value, label }) => (
              <button
                key={value}
                className={`hdr-tab${filter === value ? ' active' : ''}`}
                onClick={() => setFilter(value)}
              >
                {label}
              </button>
            ))}
          </nav>

          {/* Mobile select — shown instead of tabs */}
          <div className="flex lg:hidden mob-select-wrap" style={{ flex: 1 }}>
            <span className="mob-select-label">
              {activeLabel}
              <ChevronDown size={13} strokeWidth={2.5} color="rgba(0,0,0,0.45)" />
            </span>
            <select
              value={filter}
              onChange={e => setFilter(e.target.value as Filter)}
              aria-label="Filter wallpapers"
            >
              {FILTERS.map(({ value, label }) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>

          {/* Desktop spacer */}
          <div className="hidden lg:block" style={{ flex: 1 }} />

          {/* Right actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
            {user ? (
              <button
                className="hdr-btn"
                onClick={() => router.push('/upload')}
                style={{ border: '1px solid rgba(0,0,0,0.13)', background: 'transparent', color: 'rgba(0,0,0,0.55)' }}
                {...hov(
                  { background: 'rgba(0,0,0,0.04)', color: 'rgba(0,0,0,0.9)', borderColor: 'rgba(0,0,0,0.28)' },
                  { background: 'transparent',      color: 'rgba(0,0,0,0.55)', borderColor: 'rgba(0,0,0,0.13)' },
                )}
              >
                Upload
              </button>
            ) : (
              <button
                className="hdr-btn"
                onClick={() => setShowAuth(true)}
                style={{ border: 'none', background: '#000', color: '#fff', fontWeight: 600 }}
                {...hov(
                  { background: 'rgba(0,0,0,0.78)', transform: 'scale(0.98)' },
                  { background: '#000',              transform: 'scale(1)'    },
                )}
              >
                Sign in
              </button>
            )}
          </div>
        </div>
      </header>

      {/* ════════ AUTH MODAL ════════ */}
      {showAuth && (
        <div
          className={closing ? 'bd-out' : 'bd-in'}
          onClick={() => closeModal()}
          style={{
            position: 'fixed', inset: 0, zIndex: 200,
            background: 'rgba(0,0,0,0.28)',
            backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
          }}
        >
          <div
            className={closing ? 'm-out' : 'm-in'}
            onClick={e => e.stopPropagation()}
            style={{
              width: '100%', maxWidth: 360,
              background: '#fff',
              border: '1px solid rgba(0,0,0,0.08)',
              borderRadius: 20,
              padding: '28px 24px',
              boxShadow: '0 32px 80px rgba(0,0,0,0.14)',
            }}
          >
            {/* Close */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 6 }}>
              <button
                onClick={() => closeModal()}
                style={{
                  width: 28, height: 28, borderRadius: '50%',
                  background: 'rgba(0,0,0,0.05)', border: 'none',
                  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'background .18s',
                }}
                {...hov({ background: 'rgba(0,0,0,0.1)' }, { background: 'rgba(0,0,0,0.05)' })}
              >
                <X size={14} color="rgba(0,0,0,0.4)" />
              </button>
            </div>

            {/* Title */}
            <div style={{ marginBottom: 24 }}>
              <h2 style={{
                fontFamily: "'Syne', sans-serif", fontWeight: 800,
                fontSize: 22, color: '#000', letterSpacing: '-0.5px', marginBottom: 6,
              }}>
                Welcome to WALLS
              </h2>
              <p style={{ fontSize: 13, color: 'rgba(0,0,0,0.4)', fontFamily: "'Inter', sans-serif" }}>
                Sign in or create an account to continue
              </p>
            </div>

            {/* Action buttons */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[
                { label: 'Sign in with Email', icon: Mail,     path: '/auth/login',  primary: true  },
                { label: 'Create Account',     icon: UserPlus, path: '/auth/signup', primary: false },
              ].map(({ label, icon: Icon, path, primary }) => (
                <button
                  key={path}
                  onClick={() => handleNav(path)}
                  style={{
                    width: '100%', padding: '13px 18px',
                    borderRadius: 0, cursor: 'pointer',
                    fontFamily: "'Inter', sans-serif", fontWeight: 600, fontSize: 14,
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    transition: 'all .18s',
                    background: primary ? '#000' : 'rgba(0,0,0,0.03)',
                    color:      primary ? '#fff' : '#000',
                    border:     primary ? 'none' : '1px solid rgba(0,0,0,0.1)',
                  }}
                  {...hov(
                    primary
                      ? { background: 'rgba(0,0,0,0.78)', transform: 'scale(0.99)' }
                      : { background: 'rgba(0,0,0,0.06)', borderColor: 'rgba(0,0,0,0.2)', transform: 'scale(0.99)' },
                    primary
                      ? { background: '#000', transform: 'scale(1)' }
                      : { background: 'rgba(0,0,0,0.03)', borderColor: 'rgba(0,0,0,0.1)', transform: 'scale(1)' },
                  )}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <Icon size={16} /><span>{label}</span>
                  </div>
                  <ArrowRight size={15} />
                </button>
              ))}
            </div>

            <p style={{
              marginTop: 18, textAlign: 'center',
              fontSize: 11, color: 'rgba(0,0,0,0.22)',
              fontFamily: "'Inter', sans-serif", lineHeight: 1.6,
            }}>
              By continuing you agree to our Terms of Service and Privacy Policy
            </p>
          </div>
        </div>
      )}
    </>
  );
};
