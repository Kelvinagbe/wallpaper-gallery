'use client';

import { useState, useEffect, useRef } from 'react';
import { Mail, UserPlus, ArrowRight, X, Check, Search, Menu, SlidersHorizontal } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/components/AuthProvider';
import { useUploadModal } from '@/app/components/UploadModalProvider';
import type { Filter } from '../types';

interface HeaderProps {
  filter: Filter;
  setFilter: (filter: Filter) => void;
  onMenuOpen: () => void;
}

const FILTERS: { value: Filter; label: string }[] = [
  { value: 'all',      label: 'All'        },
  { value: 'trending', label: 'Trending'   },
  { value: 'recent',   label: 'Recent'     },
  { value: 'popular',  label: 'Popular'    },
];

// ── Tokens ───────────────────────────────────────────────────────
const F = "'Outfit', sans-serif";

// ── Shared styles ────────────────────────────────────────────────
const S: Record<string, React.CSSProperties> = {
  row:      { display: 'flex', alignItems: 'center' },
  iconBtn:  { width: 34, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, background: 'transparent', border: 'none', borderRadius: 8, cursor: 'pointer', transition: 'background .15s' },
  authBtn:  { width: '100%', padding: '13px 18px', borderRadius: 10, cursor: 'pointer', fontFamily: F, fontWeight: 600, fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'space-between', transition: 'all .2s' },
  backdrop: { position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 },
  modal:    { width: '100%', maxWidth: 370, background: '#fff', borderRadius: 18, overflow: 'hidden', boxShadow: '0 32px 80px rgba(0,0,0,0.35)' },
  closeBtn: { width: 28, height: 28, borderRadius: '50%', background: 'rgba(0,0,0,0.06)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background .15s' },
};

// ── Animations + tab pills + sheet rows ──────────────────────────
const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&display=swap');

  @keyframes bdIn  { from{opacity:0} to{opacity:1} }
  @keyframes bdOut { from{opacity:1} to{opacity:0} }
  @keyframes mIn   { from{opacity:0;transform:translateY(12px) scale(.97)} to{opacity:1;transform:translateY(0) scale(1)} }
  @keyframes mOut  { from{opacity:1;transform:scale(1)} to{opacity:0;transform:scale(.97)} }
  @keyframes shIn  { from{transform:translateY(100%)} to{transform:translateY(0)} }
  @keyframes shOut { from{transform:translateY(0)} to{transform:translateY(100%)} }

  .bd-in{animation:bdIn .2s ease forwards}   .bd-out{animation:bdOut .2s ease forwards}
  .m-in{animation:mIn .28s cubic-bezier(.16,1,.3,1) forwards}  .m-out{animation:mOut .2s ease forwards}
  .sh-in{animation:shIn .3s cubic-bezier(.16,1,.3,1) forwards} .sh-out{animation:shOut .24s ease forwards}

  /* ── Search bar ── */
  .wl-search-wrap { flex:1; max-width:560px; position:relative; }
  .wl-search-input {
    width:100%; height:40px;
    padding:0 16px 0 42px;
    background:rgba(255,255,255,0.07);
    border:1px solid rgba(255,255,255,0.1);
    border-radius:10px;
    color:#fff; font-family:'Outfit',sans-serif; font-size:13px; font-weight:400;
    outline:none; transition:background .2s, border-color .2s;
  }
  .wl-search-input::placeholder { color:rgba(255,255,255,0.32); }
  .wl-search-input:focus { background:rgba(255,255,255,0.11); border-color:rgba(255,255,255,0.28); }
  .wl-search-icon { position:absolute; left:13px; top:50%; transform:translateY(-50%); pointer-events:none; opacity:.4; }

  /* ── Filter pills row (Pexels-style) ── */
  .wl-pills {
    display:flex; align-items:center; gap:6px;
    padding:0 20px; height:38px;
    overflow-x:auto; scrollbar-width:none;
    border-top:1px solid rgba(255,255,255,0.05);
  }
  .wl-pills::-webkit-scrollbar { display:none; }
  .wl-pill {
    flex-shrink:0; padding:4px 14px;
    background:transparent;
    border:1px solid rgba(255,255,255,0.1);
    border-radius:100px;
    font-family:'Outfit',sans-serif; font-size:12px; font-weight:500;
    color:rgba(255,255,255,0.42); cursor:pointer;
    transition:all .15s; white-space:nowrap;
  }
  .wl-pill:hover { color:rgba(255,255,255,.75); border-color:rgba(255,255,255,.28); }
  .wl-pill.active { background:#fff; color:#000; border-color:#fff; font-weight:600; }

  /* ── Sheet rows ── */
  .sheet-row { width:100%; padding:15px 22px; display:flex; align-items:center; justify-content:space-between; background:transparent; border:none; border-top:1px solid rgba(0,0,0,.05); font-family:'Outfit',sans-serif; font-size:15px; color:rgba(0,0,0,.55); cursor:pointer; transition:background .12s; }
  .sheet-row.active { font-weight:600; color:#000; }
  .sheet-row:active { background:rgba(0,0,0,.03); }

  /* ── Responsive ── */
  @media(min-width:768px) { .mob{display:none!important} }
  @media(max-width:767px) { .desk{display:none!important} }
`;

const hov = (el: EventTarget, on: Partial<CSSStyleDeclaration>, off: Partial<CSSStyleDeclaration>, enter: boolean) =>
  Object.assign((el as HTMLElement).style, enter ? on : off);

export const Header = ({ filter, setFilter, onMenuOpen }: HeaderProps) => {
  const router = useRouter();
  const { user } = useAuth();
  const { open: openUpload } = useUploadModal();
  const [showAuth,     setShowAuth]     = useState(false);
  const [closingAuth,  setClosingAuth]  = useState(false);
  const [showSheet,    setShowSheet]    = useState(false);
  const [closingSheet, setClosingSheet] = useState(false);
  const [searchVal,    setSearchVal]    = useState('');

  useEffect(() => {
    document.body.style.overflow = showAuth || showSheet ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [showAuth, showSheet]);

  const closeAuth  = (cb?: () => void) => { setClosingAuth(true);  setTimeout(() => { setShowAuth(false);  setClosingAuth(false);  cb?.(); }, 220); };
  const closeSheet = (cb?: () => void) => { setClosingSheet(true); setTimeout(() => { setShowSheet(false); setClosingSheet(false); cb?.(); }, 260); };
  const handleNav  = (path: string) => closeAuth(() => router.push(path));

  return (
    <>
      <style>{CSS}</style>

      <header style={{ position: 'sticky', top: 0, zIndex: 50, background: 'rgba(10,10,10,0.9)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>

        {/* ── Top row: sidebar · logo · search · actions ── */}
        {/* Inspired by Unsplash: logo left, search center-dominant, actions right */}
        <div style={{ maxWidth: 1300, margin: '0 auto', padding: '0 16px', height: 54, ...S.row, gap: 10 }}>

          {/* Sidebar toggle — always leftmost */}
          <button onClick={onMenuOpen} style={S.iconBtn} aria-label="Open sidebar"
            onMouseEnter={e => hov(e.currentTarget, { background: 'rgba(255,255,255,.07)' }, {}, true)}
            onMouseLeave={e => hov(e.currentTarget, {}, { background: 'transparent' }, false)}>
            <Menu size={19} color="rgba(255,255,255,0.65)" />
          </button>

          {/* Logo + favicon — same unit, left of search (Unsplash pattern) */}
          <button onClick={() => router.push('/')} style={{ ...S.row, gap: 7, background: 'none', border: 'none', cursor: 'pointer', flexShrink: 0, padding: '0 2px' }}>
            {/* Favicon: 4-grid SVG, white on dark */}
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }}>
              <rect width="9" height="9" rx="2" fill="white"/>
              <rect x="11" y="0" width="9" height="9" rx="2" fill="white"/>
              <rect x="0" y="11" width="9" height="9" rx="2" fill="white"/>
              <rect x="11" y="11" width="9" height="9" rx="2" fill="white" opacity="0.3"/>
            </svg>
            <span style={{ fontFamily: F, fontWeight: 800, fontSize: 16, letterSpacing: '-0.3px', color: '#fff' }}>WALLS</span>
          </button>

          {/* Search — Unsplash/Pexels style: takes all remaining space */}
          <div className="wl-search-wrap desk">
            <Search size={14} color="#fff" className="wl-search-icon" />
            <input
              type="text"
              className="wl-search-input"
              placeholder="Search wallpapers, colors, moods…"
              value={searchVal}
              onChange={e => setSearchVal(e.target.value)}
            />
          </div>

          <div style={{ flex: 1 }} />

          {/* Mobile: search icon + filter */}
          <div className="mob" style={{ ...S.row, gap: 6 }}>
            <button style={S.iconBtn} aria-label="Search"
              onMouseEnter={e => hov(e.currentTarget, { background: 'rgba(255,255,255,.07)' }, {}, true)}
              onMouseLeave={e => hov(e.currentTarget, {}, { background: 'transparent' }, false)}>
              <Search size={18} color="rgba(255,255,255,0.65)" />
            </button>
            <button onClick={() => setShowSheet(true)} style={{ ...S.iconBtn, position: 'relative' }} aria-label="Filter"
              onMouseEnter={e => hov(e.currentTarget, { background: 'rgba(255,255,255,.07)' }, {}, true)}
              onMouseLeave={e => hov(e.currentTarget, {}, { background: 'transparent' }, false)}>
              <SlidersHorizontal size={17} color="rgba(255,255,255,0.65)" strokeWidth={2} />
              {filter !== 'all' && <span style={{ position: 'absolute', top: 6, right: 6, width: 5, height: 5, borderRadius: '50%', background: '#fff', border: '1.5px solid #0a0a0a' }} />}
            </button>
          </div>

          {/* Right actions — Pexels: ghost Upload + solid Sign in */}
          <div style={{ ...S.row, gap: 8, flexShrink: 0 }}>
            {user ? (
              <button onClick={openUpload}
                style={{ padding: '6px 14px', fontFamily: F, fontSize: 13, fontWeight: 600, border: '1px solid rgba(255,255,255,0.14)', borderRadius: 8, background: 'transparent', color: 'rgba(255,255,255,0.6)', cursor: 'pointer', transition: 'all .18s' }}
                onMouseEnter={e => hov(e.currentTarget, { background: 'rgba(255,255,255,.08)', borderColor: 'rgba(255,255,255,.3)', color: '#fff' }, {}, true)}
                onMouseLeave={e => hov(e.currentTarget, {}, { background: 'transparent', borderColor: 'rgba(255,255,255,.14)', color: 'rgba(255,255,255,.6)' }, false)}>
                Upload
              </button>
            ) : (
              <button onClick={() => setShowAuth(true)}
                style={{ padding: '6px 16px', fontFamily: F, fontSize: 13, fontWeight: 700, border: 'none', borderRadius: 8, background: '#fff', color: '#000', cursor: 'pointer', transition: 'all .18s' }}
                onMouseEnter={e => hov(e.currentTarget, { background: 'rgba(255,255,255,.85)', transform: 'scale(0.97)' }, {}, true)}
                onMouseLeave={e => hov(e.currentTarget, {}, { background: '#fff', transform: 'scale(1)' }, false)}>
                Sign in
              </button>
            )}
          </div>
        </div>

        {/* ── Pills row: Pexels-style category strip below main bar ── */}
        {/* Desktop only — mobile uses sheet */}
        <div className="wl-pills desk">
          {FILTERS.map(({ value, label }) => (
            <button key={value} className={`wl-pill${filter === value ? ' active' : ''}`} onClick={() => setFilter(value)}>
              {label}
            </button>
          ))}
        </div>

      </header>

      {/* ── MOBILE FILTER SHEET ── */}
      {showSheet && (
        <div className={closingSheet ? 'bd-out' : 'bd-in'} onClick={() => closeSheet()}
          style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)' }}>
          <div className={closingSheet ? 'sh-out' : 'sh-in'} onClick={e => e.stopPropagation()}
            style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: '#fff', borderRadius: '20px 20px 0 0', paddingBottom: 'max(20px,env(safe-area-inset-bottom))', boxShadow: '0 -8px 40px rgba(0,0,0,0.18)' }}>
            <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 4px' }}>
              <div style={{ width: 30, height: 3, borderRadius: 2, background: 'rgba(0,0,0,0.1)' }} />
            </div>
            <div style={{ padding: '8px 22px 10px', fontFamily: F, fontSize: 11, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: 'rgba(0,0,0,.28)' }}>Browse by</div>
            {FILTERS.map(({ value, label }) => (
              <button key={value} className={`sheet-row${filter === value ? ' active' : ''}`} onClick={() => { setFilter(value); closeSheet(); }}>
                <span>{label}</span>
                {filter === value && <Check size={15} strokeWidth={2.5} color="#000" />}
              </button>
            ))}
            <button onClick={() => closeSheet()}
              style={{ width: '100%', padding: '15px 22px', background: 'rgba(0,0,0,.02)', border: 'none', borderTop: '1px solid rgba(0,0,0,.05)', fontFamily: F, fontSize: 14, fontWeight: 500, color: 'rgba(0,0,0,.3)', cursor: 'pointer' }}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* ── AUTH MODAL ── */}
      {showAuth && (
        <div className={closingAuth ? 'bd-out' : 'bd-in'} onClick={() => closeAuth()} style={S.backdrop}>
          <div className={closingAuth ? 'm-out' : 'm-in'} onClick={e => e.stopPropagation()} style={S.modal}>

            <div style={{ padding: '28px 26px 30px' }}>
              {/* Header row */}
              <div style={{ ...S.row, justifyContent: 'space-between', marginBottom: 24 }}>
                {/* Logo in modal — inverted (black bg) */}
                <div style={{ ...S.row, gap: 7 }}>
                  <svg width="22" height="22" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect width="9" height="9" rx="2" fill="#000"/>
                    <rect x="11" y="0" width="9" height="9" rx="2" fill="#000"/>
                    <rect x="0" y="11" width="9" height="9" rx="2" fill="#000"/>
                    <rect x="11" y="11" width="9" height="9" rx="2" fill="#000" opacity="0.25"/>
                  </svg>
                  <span style={{ fontFamily: F, fontWeight: 800, fontSize: 16, letterSpacing: '-0.3px', color: '#000' }}>WALLS</span>
                </div>
                <button onClick={() => closeAuth()} style={S.closeBtn}
                  onMouseEnter={e => hov(e.currentTarget, { background: 'rgba(0,0,0,.1)' }, {}, true)}
                  onMouseLeave={e => hov(e.currentTarget, {}, { background: 'rgba(0,0,0,.06)' }, false)}>
                  <X size={13} color="rgba(0,0,0,0.4)" />
                </button>
              </div>

              <div style={{ marginBottom: 24 }}>
                <div style={{ fontFamily: F, fontWeight: 800, fontSize: 22, color: '#0a0a0a', letterSpacing: '-0.4px', marginBottom: 5, lineHeight: 1.2 }}>Welcome back</div>
                <p style={{ fontSize: 13, color: 'rgba(0,0,0,.4)', fontFamily: F, lineHeight: 1.6 }}>Sign in to save, upload and discover wallpapers.</p>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
                {[
                  { label: 'Sign in with Email', icon: Mail,     path: '/auth/login',  primary: true  },
                  { label: 'Create Account',     icon: UserPlus, path: '/auth/signup', primary: false },
                ].map(({ label, icon: Icon, path, primary }) => (
                  <button key={path} onClick={() => handleNav(path)}
                    style={{ ...S.authBtn, background: primary ? '#000' : 'transparent', color: primary ? '#fff' : '#000', border: primary ? 'none' : '1.5px solid rgba(0,0,0,.12)' }}
                    onMouseEnter={e => hov(e.currentTarget, primary ? { background: '#222' } : { borderColor: 'rgba(0,0,0,.3)', background: 'rgba(0,0,0,.03)' }, {}, true)}
                    onMouseLeave={e => hov(e.currentTarget, {}, primary ? { background: '#000' } : { borderColor: 'rgba(0,0,0,.12)', background: 'transparent' }, false)}>
                    <div style={{ ...S.row, gap: 10 }}><Icon size={15} strokeWidth={2} /><span>{label}</span></div>
                    <ArrowRight size={14} strokeWidth={2} style={{ opacity: 0.4 }} />
                  </button>
                ))}
              </div>

              <p style={{ marginTop: 20, textAlign: 'center', fontSize: 11, color: 'rgba(0,0,0,.2)', fontFamily: F, lineHeight: 1.7 }}>
                By continuing you agree to our{' '}
                <span style={{ textDecoration: 'underline', cursor: 'pointer', color: 'rgba(0,0,0,.4)' }}>Terms</span>
                {' '}and{' '}
                <span style={{ textDecoration: 'underline', cursor: 'pointer', color: 'rgba(0,0,0,.4)' }}>Privacy Policy</span>
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
