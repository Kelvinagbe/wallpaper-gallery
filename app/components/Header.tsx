'use client';

import { useState, useEffect } from 'react';
import { Menu, Mail, UserPlus, ArrowRight, X, ChevronDown, Check } from 'lucide-react';
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
  const [showAuth, setShowAuth]       = useState(false);
  const [closingAuth, setClosingAuth] = useState(false);
  const [showSheet, setShowSheet]     = useState(false);
  const [closingSheet, setClosingSheet] = useState(false);

  /* lock body scroll when any overlay is open */
  useEffect(() => {
    document.body.style.overflow = (showAuth || showSheet) ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [showAuth, showSheet]);

  const closeAuth = (cb?: () => void) => {
    setClosingAuth(true);
    setTimeout(() => { setShowAuth(false); setClosingAuth(false); cb?.(); }, 250);
  };
  const closeSheet = (cb?: () => void) => {
    setClosingSheet(true);
    setTimeout(() => { setShowSheet(false); setClosingSheet(false); cb?.(); }, 280);
  };

  const handleNav = (path: string) => closeAuth(() => router.push(path));

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
        /* ── keyframes ── */
        @keyframes bdIn    { from{opacity:0} to{opacity:1} }
        @keyframes bdOut   { from{opacity:1} to{opacity:0} }
        @keyframes mIn     { from{opacity:0;transform:scale(.96) translateY(-6px)} to{opacity:1;transform:scale(1) translateY(0)} }
        @keyframes mOut    { from{opacity:1;transform:scale(1) translateY(0)} to{opacity:0;transform:scale(.96) translateY(-6px)} }
        @keyframes shIn    { from{transform:translateY(100%)} to{transform:translateY(0)} }
        @keyframes shOut   { from{transform:translateY(0)} to{transform:translateY(100%)} }

        .bd-in   { animation: bdIn  .22s ease forwards }
        .bd-out  { animation: bdOut .22s ease forwards }
        .m-in    { animation: mIn   .25s cubic-bezier(.16,1,.3,1) forwards }
        .m-out   { animation: mOut  .22s ease forwards }
        .sh-in   { animation: shIn  .30s cubic-bezier(.16,1,.3,1) forwards }
        .sh-out  { animation: shOut .26s cubic-bezier(.4,0,1,1)   forwards }

        /* ── desktop filter tabs ── */
        .hdr-tab {
          position: relative;
          padding: 0 14px; height: 56px;
          display: flex; align-items: center;
          font-family: 'Inter', sans-serif;
          font-size: 13px; font-weight: 500;
          color: rgba(0,0,0,.4);
          background: transparent; border: none;
          cursor: pointer; transition: color .15s;
          white-space: nowrap;
        }
        .hdr-tab::after {
          content: '';
          position: absolute; bottom: 0; left: 14px; right: 14px;
          height: 2px; background: #000;
          transform: scaleX(0);
          transition: transform .2s cubic-bezier(.16,1,.3,1);
        }
        .hdr-tab:hover  { color: rgba(0,0,0,.75); }
        .hdr-tab.active { color: #000; }
        .hdr-tab.active::after { transform: scaleX(1); }

        /* ── mobile filter pill button ── */
        .mob-filter-btn {
          display: inline-flex; align-items: center; gap: 4px;
          padding: 6px 12px 6px 14px;
          background: rgba(0,0,0,0.04);
          border: 1px solid rgba(0,0,0,0.09);
          border-radius: 100px;
          font-family: 'Inter', sans-serif;
          font-size: 13px; font-weight: 500;
          color: rgba(0,0,0,0.75);
          cursor: pointer;
          transition: background .15s, border-color .15s;
          white-space: nowrap;
        }
        .mob-filter-btn:active {
          background: rgba(0,0,0,0.08);
        }

        /* ── bottom sheet option rows ── */
        .sheet-option {
          width: 100%; padding: 16px 20px;
          display: flex; align-items: center; justify-content: space-between;
          background: transparent;
          border: none; border-top: 1px solid rgba(0,0,0,0.06);
          font-family: 'Inter', sans-serif;
          font-size: 15px; font-weight: 400;
          color: rgba(0,0,0,0.75);
          cursor: pointer; text-align: left;
          transition: background .12s;
        }
        .sheet-option:active { background: rgba(0,0,0,0.04); }
        .sheet-option.selected {
          font-weight: 600;
          color: #000;
        }

        /* ── shared header button ── */
        .hdr-btn {
          padding: 7px 15px;
          font-family: 'Inter', sans-serif;
          font-size: 13px; font-weight: 500;
          border-radius: 0; cursor: pointer;
          transition: all .18s; white-space: nowrap;
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

          {/* Hamburger */}
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

          {/* Mobile filter pill — opens bottom sheet */}
          <button
            className="flex lg:hidden mob-filter-btn"
            onClick={() => setShowSheet(true)}
            aria-label="Filter wallpapers"
          >
            {activeLabel}
            <ChevronDown size={13} strokeWidth={2.5} color="rgba(0,0,0,0.4)" />
          </button>

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

      {/* ════════ MOBILE FILTER BOTTOM SHEET ════════ */}
      {showSheet && (
        <div
          className={closingSheet ? 'bd-out' : 'bd-in'}
          onClick={() => closeSheet()}
          style={{
            position: 'fixed', inset: 0, zIndex: 300,
            background: 'rgba(0,0,0,0.25)',
            backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)',
          }}
        >
          <div
            className={closingSheet ? 'sh-out' : 'sh-in'}
            onClick={e => e.stopPropagation()}
            style={{
              position: 'absolute', bottom: 0, left: 0, right: 0,
              background: '#fff',
              borderRadius: '20px 20px 0 0',
              paddingBottom: 'max(16px, env(safe-area-inset-bottom))',
              boxShadow: '0 -8px 40px rgba(0,0,0,0.1)',
            }}
          >
            {/* Handle bar */}
            <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 6px' }}>
              <div style={{ width: 36, height: 4, borderRadius: 2, background: 'rgba(0,0,0,0.12)' }} />
            </div>

            {/* Sheet title */}
            <div style={{
              padding: '8px 20px 12px',
              fontFamily: "'Inter', sans-serif",
              fontSize: 11, fontWeight: 600,
              letterSpacing: '0.07em', textTransform: 'uppercase',
              color: 'rgba(0,0,0,0.3)',
            }}>
              Browse by
            </div>

            {/* Options */}
            {FILTERS.map(({ value, label }) => {
              const active = filter === value;
              return (
                <button
                  key={value}
                  className={`sheet-option${active ? ' selected' : ''}`}
                  onClick={() => { setFilter(value); closeSheet(); }}
                >
                  <span>{label}</span>
                  {active && <Check size={16} strokeWidth={2.5} color="#000" />}
                </button>
              );
            })}

            {/* Cancel */}
            <button
              onClick={() => closeSheet()}
              style={{
                width: '100%', padding: '16px 20px',
                marginTop: 8,
                background: 'rgba(0,0,0,0.03)',
                border: 'none', borderTop: '1px solid rgba(0,0,0,0.06)',
                fontFamily: "'Inter', sans-serif",
                fontSize: 14, fontWeight: 500,
                color: 'rgba(0,0,0,0.4)',
                cursor: 'pointer', textAlign: 'center',
                transition: 'background .12s',
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* ════════ AUTH MODAL ════════ */}
      {showAuth && (
        <div
          className={closingAuth ? 'bd-out' : 'bd-in'}
          onClick={() => closeAuth()}
          style={{
            position: 'fixed', inset: 0, zIndex: 200,
            background: 'rgba(0,0,0,0.28)',
            backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
          }}
        >
          <div
            className={closingAuth ? 'm-out' : 'm-in'}
            onClick={e => e.stopPropagation()}
            style={{
              width: '100%', maxWidth: 360,
              background: '#fff',
              border: '1px solid rgba(0,0,0,0.08)',
              borderRadius: 20, padding: '28px 24px',
              boxShadow: '0 32px 80px rgba(0,0,0,0.14)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 6 }}>
              <button
                onClick={() => closeAuth()}
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

            <div style={{ marginBottom: 24 }}>
              <h2 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 22, color: '#000', letterSpacing: '-0.5px', marginBottom: 6 }}>
                Welcome to WALLS
              </h2>
              <p style={{ fontSize: 13, color: 'rgba(0,0,0,0.4)', fontFamily: "'Inter', sans-serif" }}>
                Sign in or create an account to continue
              </p>
            </div>

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

            <p style={{ marginTop: 18, textAlign: 'center', fontSize: 11, color: 'rgba(0,0,0,0.22)', fontFamily: "'Inter', sans-serif", lineHeight: 1.6 }}>
              By continuing you agree to our Terms of Service and Privacy Policy
            </p>
          </div>
        </div>
      )}
    </>
  );
};
