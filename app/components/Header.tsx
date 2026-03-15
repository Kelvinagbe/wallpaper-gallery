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
  { value: 'all', label: 'All' },
  { value: 'trending', label: 'Trending' },
  { value: 'recent', label: 'Recent' },
  { value: 'popular', label: 'Popular' },
];

export const Header = ({ filter, setFilter, onMenuOpen }: HeaderProps) => {
  const router = useRouter();
  const { user } = useAuth();
  const [showAuth, setShowAuth] = useState(false);
  const [closingAuth, setClosingAuth] = useState(false);
  const [showFilterSheet, setShowFilterSheet] = useState(false);
  const [closingSheet, setClosingSheet] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 1024);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // Lock scroll when sheets open
  useEffect(() => {
    document.body.style.overflow = (showAuth || showFilterSheet) ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [showAuth, showFilterSheet]);

  const closeAuth = (cb?: () => void) => {
    setClosingAuth(true);
    setTimeout(() => { setShowAuth(false); setClosingAuth(false); cb?.(); }, 260);
  };

  const closeSheet = (cb?: () => void) => {
    setClosingSheet(true);
    setTimeout(() => { setShowFilterSheet(false); setClosingSheet(false); cb?.(); }, 280);
  };

  const handleNav = (path: string) => closeAuth(() => router.push(path));

  const activeLabel = FILTERS.find(f => f.value === filter)?.label ?? 'All';

  return (
    <>
      <link
        href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;1,9..40,300&display=swap"
        rel="stylesheet"
      />
      <style>{`
        :root {
          --ink: #0a0a0a;
          --ink-mid: rgba(10,10,10,0.4);
          --ink-faint: rgba(10,10,10,0.07);
          --border: rgba(10,10,10,0.1);
          --white: #ffffff;
          --font-display: 'Bebas Neue', sans-serif;
          --font-body: 'DM Sans', sans-serif;
        }

        /* ── Filters (desktop) ── */
        .hdr-filter-btn {
          padding: 5px 14px;
          background: transparent;
          color: var(--ink-mid);
          border: none;
          font-family: var(--font-body);
          font-size: 13px;
          font-weight: 500;
          letter-spacing: 0.01em;
          cursor: pointer;
          transition: color 0.15s;
          position: relative;
        }
        .hdr-filter-btn::after {
          content: '';
          position: absolute;
          bottom: -1px; left: 50%; right: 50%;
          height: 1.5px;
          background: var(--ink);
          transition: left 0.2s ease, right 0.2s ease;
        }
        .hdr-filter-btn.active { color: var(--ink); }
        .hdr-filter-btn.active::after { left: 14px; right: 14px; }
        .hdr-filter-btn:not(.active):hover { color: var(--ink); }

        /* ── Pill (mobile filter trigger) ── */
        .hdr-filter-pill {
          display: flex; align-items: center; gap: 4px;
          padding: 5px 10px 5px 12px;
          background: transparent;
          border: 1px solid var(--border);
          color: var(--ink);
          font-family: var(--font-body);
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          transition: border-color 0.15s, background 0.15s;
          white-space: nowrap;
        }
        .hdr-filter-pill:hover { border-color: rgba(10,10,10,0.3); background: var(--ink-faint); }

        /* ── Upload / Sign-in buttons ── */
        .hdr-btn {
          padding: 6px 14px;
          font-family: var(--font-body);
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          border-radius: 0;
          transition: all 0.15s;
          white-space: nowrap;
        }
        .hdr-btn-ghost {
          border: 1px solid var(--border);
          background: transparent;
          color: rgba(10,10,10,0.55);
        }
        .hdr-btn-ghost:hover { background: var(--ink-faint); border-color: rgba(10,10,10,0.25); color: var(--ink); }
        .hdr-btn-solid {
          border: none;
          background: var(--ink);
          color: var(--white);
          font-weight: 600;
          letter-spacing: 0.01em;
        }
        .hdr-btn-solid:hover { background: rgba(10,10,10,0.75); }

        /* ── Backdrop ── */
        @keyframes bdIn  { from { opacity:0 } to { opacity:1 } }
        @keyframes bdOut { from { opacity:1 } to { opacity:0 } }
        .bd-enter { animation: bdIn  0.22s ease forwards; }
        .bd-exit  { animation: bdOut 0.22s ease forwards; }

        /* ── Auth modal ── */
        @keyframes modalIn  { from { opacity:0; transform:scale(0.97) translateY(-6px) } to { opacity:1; transform:scale(1) translateY(0) } }
        @keyframes modalOut { from { opacity:1; transform:scale(1) translateY(0) } to { opacity:0; transform:scale(0.97) translateY(-6px) } }
        .modal-enter { animation: modalIn  0.26s cubic-bezier(0.16,1,0.3,1) forwards; }
        .modal-exit  { animation: modalOut 0.22s ease forwards; }

        /* ── Bottom sheet ── */
        @keyframes sheetIn  { from { transform:translateY(100%) } to { transform:translateY(0) } }
        @keyframes sheetOut { from { transform:translateY(0) } to { transform:translateY(100%) } }
        .sheet-enter { animation: sheetIn  0.28s cubic-bezier(0.16,1,0.3,1) forwards; }
        .sheet-exit  { animation: sheetOut 0.24s ease forwards; }

        /* ── Icon button ── */
        .hdr-icon-btn {
          padding: 6px; background: transparent; border: none;
          cursor: pointer; display: flex; align-items: center;
          justify-content: center; flex-shrink: 0; transition: background 0.15s;
        }
        .hdr-icon-btn:hover { background: var(--ink-faint); }
      `}</style>

      {/* ─────────── HEADER ─────────── */}
      <header style={{
        position: 'sticky', top: 0, zIndex: 50,
        background: 'rgba(255,255,255,0.9)',
        backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
        borderBottom: '1px solid var(--border)',
      }}>
        <div style={{
          maxWidth: '1280px', margin: '0 auto',
          padding: '0 20px', height: '52px',
          display: 'flex', alignItems: 'center', gap: '12px',
        }}>
          {/* Hamburger */}
          <button onClick={onMenuOpen} className="hdr-icon-btn lg:hidden" aria-label="Open menu">
            <Menu size={18} color="rgba(10,10,10,0.5)" />
          </button>

          {/* Logo */}
          <span
            onClick={() => router.push('/')}
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: '22px', letterSpacing: '0.04em',
              color: 'var(--ink)', cursor: 'pointer', flexShrink: 0,
              userSelect: 'none', lineHeight: 1,
            }}
          >
            WALLS
          </span>

          {/* Divider */}
          <div style={{ width: '1px', height: '20px', background: 'var(--border)', flexShrink: 0 }} />

          {/* Desktop filters */}
          <nav className="hidden lg:flex" style={{ display: 'flex', alignItems: 'center', flex: 1, borderBottom: 'none' }}>
            {FILTERS.map(({ value, label }) => (
              <button
                key={value}
                className={`hdr-filter-btn${filter === value ? ' active' : ''}`}
                onClick={() => setFilter(value)}
              >
                {label}
              </button>
            ))}
          </nav>

          {/* Mobile filter pill */}
          {isMobile && (
            <button
              className="hdr-filter-pill lg:hidden"
              onClick={() => setShowFilterSheet(true)}
              style={{ flex: 1 }}
            >
              {activeLabel}
              <ChevronDown size={13} strokeWidth={2} style={{ opacity: 0.5 }} />
            </button>
          )}

          {/* Spacer (desktop) */}
          <div className="hidden lg:block" style={{ flex: 1 }} />

          {/* Right actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
            <button className="hdr-btn hdr-btn-ghost" onClick={() => router.push('/upload')}>
              Upload
            </button>
            {!user && (
              <button className="hdr-btn hdr-btn-solid" onClick={() => setShowAuth(true)}>
                Sign in
              </button>
            )}
          </div>
        </div>
      </header>

      {/* ─────────── MOBILE FILTER SHEET ─────────── */}
      {showFilterSheet && (
        <div
          className={closingSheet ? 'bd-exit' : 'bd-enter'}
          onClick={() => closeSheet()}
          style={{
            position: 'fixed', inset: 0, zIndex: 300,
            background: 'rgba(10,10,10,0.35)',
            backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)',
          }}
        >
          <div
            className={closingSheet ? 'sheet-exit' : 'sheet-enter'}
            onClick={e => e.stopPropagation()}
            style={{
              position: 'absolute', bottom: 0, left: 0, right: 0,
              background: '#fff',
              borderTop: '1px solid var(--border)',
              paddingBottom: 'env(safe-area-inset-bottom, 16px)',
            }}
          >
            {/* Handle */}
            <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 4px' }}>
              <div style={{ width: '32px', height: '3px', background: 'rgba(10,10,10,0.15)' }} />
            </div>

            {/* Label */}
            <div style={{
              padding: '12px 20px 8px',
              fontFamily: 'var(--font-body)',
              fontSize: '11px', fontWeight: 500,
              letterSpacing: '0.08em', textTransform: 'uppercase',
              color: 'rgba(10,10,10,0.35)',
            }}>
              Browse by
            </div>

            {/* Options */}
            {FILTERS.map(({ value, label }) => {
              const active = filter === value;
              return (
                <button
                  key={value}
                  onClick={() => { setFilter(value); closeSheet(); }}
                  style={{
                    width: '100%', padding: '16px 20px',
                    background: active ? 'var(--ink-faint)' : 'transparent',
                    border: 'none', borderTop: '1px solid var(--border)',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    cursor: 'pointer', transition: 'background 0.12s',
                    fontFamily: 'var(--font-body)',
                    fontSize: '16px', fontWeight: active ? 500 : 400,
                    color: active ? 'var(--ink)' : 'rgba(10,10,10,0.6)',
                    textAlign: 'left',
                  }}
                >
                  {label}
                  {active && <Check size={15} strokeWidth={2.5} color="var(--ink)" />}
                </button>
              );
            })}

            {/* Cancel */}
            <button
              onClick={() => closeSheet()}
              style={{
                width: '100%', padding: '16px 20px',
                background: 'transparent',
                border: 'none', borderTop: '1px solid var(--border)',
                fontFamily: 'var(--font-body)', fontSize: '14px',
                fontWeight: 500, color: 'rgba(10,10,10,0.35)',
                cursor: 'pointer', textAlign: 'center',
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* ─────────── AUTH MODAL ─────────── */}
      {showAuth && (
        <div
          className={closingAuth ? 'bd-exit' : 'bd-enter'}
          onClick={() => closeAuth()}
          style={{
            position: 'fixed', inset: 0, zIndex: 200,
            background: 'rgba(10,10,10,0.35)',
            backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px',
          }}
        >
          <div
            className={closingAuth ? 'modal-exit' : 'modal-enter'}
            onClick={e => e.stopPropagation()}
            style={{
              width: '100%', maxWidth: '360px',
              background: '#fff',
              border: '1px solid var(--border)',
              padding: '28px 24px',
              boxShadow: '0 32px 80px rgba(10,10,10,0.12)',
            }}
          >
            {/* Close */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '16px' }}>
              <button
                onClick={() => closeAuth()}
                style={{
                  width: '26px', height: '26px',
                  background: 'var(--ink-faint)', border: 'none',
                  cursor: 'pointer', display: 'flex',
                  alignItems: 'center', justifyContent: 'center',
                  transition: 'background 0.15s',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(10,10,10,0.12)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'var(--ink-faint)')}
              >
                <X size={13} color="rgba(10,10,10,0.45)" />
              </button>
            </div>

            {/* Title */}
            <div style={{ marginBottom: '24px' }}>
              <h2 style={{
                fontFamily: 'var(--font-display)',
                fontSize: '28px', letterSpacing: '0.04em',
                color: 'var(--ink)', marginBottom: '6px', lineHeight: 1,
              }}>
                WELCOME BACK
              </h2>
              <p style={{ fontSize: '13px', color: 'var(--ink-mid)', fontFamily: 'var(--font-body)', fontWeight: 300 }}>
                Sign in or create an account to continue
              </p>
            </div>

            {/* Buttons */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {[
                { label: 'Sign in with Email', icon: Mail, path: '/auth/login', primary: true },
                { label: 'Create Account', icon: UserPlus, path: '/auth/signup', primary: false },
              ].map(({ label, icon: Icon, path, primary }) => (
                <button
                  key={path}
                  onClick={() => handleNav(path)}
                  style={{
                    width: '100%', padding: '13px 16px',
                    cursor: 'pointer',
                    fontFamily: 'var(--font-body)', fontWeight: 500, fontSize: '13px',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    transition: 'all 0.15s',
                    background: primary ? 'var(--ink)' : 'transparent',
                    color: primary ? '#fff' : 'var(--ink)',
                    border: primary ? 'none' : '1px solid var(--border)',
                    borderRadius: 0,
                  }}
                  onMouseEnter={e => {
                    if (primary) e.currentTarget.style.background = 'rgba(10,10,10,0.78)';
                    else { e.currentTarget.style.background = 'var(--ink-faint)'; e.currentTarget.style.borderColor = 'rgba(10,10,10,0.25)'; }
                  }}
                  onMouseLeave={e => {
                    if (primary) e.currentTarget.style.background = 'var(--ink)';
                    else { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'var(--border)'; }
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Icon size={15} /><span>{label}</span>
                  </div>
                  <ArrowRight size={14} />
                </button>
              ))}
            </div>

            <p style={{
              marginTop: '18px', textAlign: 'center',
              fontSize: '11px', color: 'rgba(10,10,10,0.22)',
              fontFamily: 'var(--font-body)', fontWeight: 300, lineHeight: 1.6,
            }}>
              By continuing you agree to our Terms of Service and Privacy Policy
            </p>
          </div>
        </div>
      )}
    </>
  );
};
