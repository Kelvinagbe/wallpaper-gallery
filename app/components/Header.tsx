'use client';

import { useState, useEffect } from 'react';
import { Menu, Mail, UserPlus, ArrowRight, X, SlidersHorizontal, Check } from 'lucide-react';
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
  { value: 'all',      label: 'All'      },
  { value: 'trending', label: 'Trending' },
  { value: 'recent',   label: 'Recent'   },
  { value: 'popular',  label: 'Popular'  },
];

// ── Design tokens ────────────────────────────────────────────────
const F = "'Outfit', sans-serif";
const A = '#c8ff47';

// ── Reusable style objects ───────────────────────────────────────
const S: Record<string, React.CSSProperties> = {
  row:       { display: 'flex', alignItems: 'center' },
  iconBtn:   { width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, background: 'transparent', border: '1px solid rgba(255,255,255,0.09)', borderRadius: 8, cursor: 'pointer', transition: 'border-color .15s, background .15s' },
  ghostBtn:  { padding: '7px 16px', fontFamily: F, fontSize: 13, fontWeight: 600, border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, background: 'transparent', color: 'rgba(255,255,255,0.7)', cursor: 'pointer', transition: 'all .18s' },
  accentBtn: { padding: '7px 18px', fontFamily: F, fontSize: 13, fontWeight: 700, border: 'none', borderRadius: 8, background: A, color: '#0a0a0a', cursor: 'pointer', transition: 'all .18s' },
  backdrop:  { position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 },
  modal:     { width: '100%', maxWidth: 380, background: '#fff', borderRadius: 20, overflow: 'hidden', boxShadow: '0 40px 120px rgba(0,0,0,0.25)' },
  closeBtn:  { width: 30, height: 30, borderRadius: '50%', background: 'rgba(0,0,0,0.05)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background .15s' },
  authBtn:   { width: '100%', padding: '14px 20px', borderRadius: 12, cursor: 'pointer', fontFamily: F, fontWeight: 600, fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'space-between', transition: 'all .2s' },
};

// ── CSS classes (animations + tabs + sheet rows + responsive) ────
const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&display=swap');
  @keyframes bdIn  { from{opacity:0} to{opacity:1} }
  @keyframes bdOut { from{opacity:1} to{opacity:0} }
  @keyframes mIn   { from{opacity:0;transform:scale(.95) translateY(10px)} to{opacity:1;transform:scale(1) translateY(0)} }
  @keyframes mOut  { from{opacity:1;transform:scale(1) translateY(0)} to{opacity:0;transform:scale(.95) translateY(10px)} }
  @keyframes shIn  { from{transform:translateY(100%)} to{transform:translateY(0)} }
  @keyframes shOut { from{transform:translateY(0)} to{transform:translateY(100%)} }
  .bd-in{animation:bdIn .22s ease forwards} .bd-out{animation:bdOut .22s ease forwards}
  .m-in{animation:mIn .3s cubic-bezier(.16,1,.3,1) forwards} .m-out{animation:mOut .22s ease forwards}
  .sh-in{animation:shIn .32s cubic-bezier(.16,1,.3,1) forwards} .sh-out{animation:shOut .26s ease forwards}
  .wl-tab{position:relative;padding:0 16px;height:100%;display:flex;align-items:center;font-family:'Outfit',sans-serif;font-size:13px;font-weight:500;color:rgba(255,255,255,0.38);background:transparent;border:none;cursor:pointer;transition:color .18s;white-space:nowrap}
  .wl-tab::after{content:'';position:absolute;bottom:0;left:16px;right:16px;height:1.5px;background:${A};transform:scaleX(0);transform-origin:left;transition:transform .22s cubic-bezier(.16,1,.3,1);border-radius:2px}
  .wl-tab:hover{color:rgba(255,255,255,.72)} .wl-tab.active{color:#fff;font-weight:600} .wl-tab.active::after{transform:scaleX(1)}
  .sheet-row{width:100%;padding:16px 22px;display:flex;align-items:center;justify-content:space-between;background:transparent;border:none;border-top:1px solid rgba(0,0,0,.05);font-family:'Outfit',sans-serif;font-size:15px;color:rgba(0,0,0,.55);cursor:pointer;transition:background .12s}
  .sheet-row.active{font-weight:600;color:#000} .sheet-row:active{background:rgba(0,0,0,.03)}
  @media(min-width:1024px){.mob{display:none!important}.desk{display:flex!important}}
  @media(max-width:1023px){.desk{display:none!important}.mob{display:flex!important}}
`;

// ── Hover helpers ────────────────────────────────────────────────
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

  useEffect(() => {
    document.body.style.overflow = showAuth || showSheet ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [showAuth, showSheet]);

  const closeAuth  = (cb?: () => void) => { setClosingAuth(true);  setTimeout(() => { setShowAuth(false);  setClosingAuth(false);  cb?.(); }, 250); };
  const closeSheet = (cb?: () => void) => { setClosingSheet(true); setTimeout(() => { setShowSheet(false); setClosingSheet(false); cb?.(); }, 280); };
  const handleNav  = (path: string) => closeAuth(() => router.push(path));

  return (
    <>
      <style>{CSS}</style>

      {/* ── HEADER ── */}
      <header style={{ position: 'sticky', top: 0, zIndex: 50, background: 'rgba(9,9,9,0.82)', backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ maxWidth: 1300, margin: '0 auto', padding: '0 20px', height: 56, ...S.row, gap: 4 }}>

          {/* Hamburger */}
          <button onClick={onMenuOpen} className="mob" style={S.iconBtn} aria-label="Open menu"
            onMouseEnter={e => hov(e.currentTarget, { borderColor:'rgba(255,255,255,.22)', background:'rgba(255,255,255,.04)' }, {}, true)}
            onMouseLeave={e => hov(e.currentTarget, {}, { borderColor:'rgba(255,255,255,.09)', background:'transparent' }, false)}>
            <Menu size={18} color="rgba(255,255,255,0.55)" />
          </button>

          {/* Logo */}
          <button onClick={() => router.push('/')} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0 10px', flexShrink: 0, fontFamily: F, fontWeight: 800, fontSize: 17, letterSpacing: '-0.3px', color: '#fff' }}>
            WALL<span style={{ color: A }}>S</span>
          </button>

          {/* Divider */}
          <div className="desk" style={{ width: 1, height: 18, background: 'rgba(255,255,255,0.08)', flexShrink: 0, margin: '0 6px' }} />

          {/* Desktop tabs */}
          <nav className="desk" style={{ alignItems: 'stretch', height: 56, flex: 1 }}>
            {FILTERS.map(({ value, label }) => (
              <button key={value} className={`wl-tab${filter === value ? ' active' : ''}`} onClick={() => setFilter(value)}>
                {label}
              </button>
            ))}
          </nav>

          <div style={{ flex: 1 }} />

          {/* Mobile filter */}
          <button className="mob" onClick={() => setShowSheet(true)} style={{ ...S.iconBtn, position: 'relative' }} aria-label="Filter"
            onMouseEnter={e => hov(e.currentTarget, { borderColor:'rgba(255,255,255,.22)' }, {}, true)}
            onMouseLeave={e => hov(e.currentTarget, {}, { borderColor:'rgba(255,255,255,.09)' }, false)}>
            <SlidersHorizontal size={15} color="rgba(255,255,255,0.55)" strokeWidth={2} />
            {filter !== 'all' && <span style={{ position: 'absolute', top: 7, right: 7, width: 5, height: 5, borderRadius: '50%', background: A, border: '1.5px solid #090909' }} />}
          </button>

          {/* CTA */}
          <div style={{ ...S.row, gap: 8, flexShrink: 0, marginLeft: 8 }}>
            {user
              ? <button onClick={openUpload} style={S.ghostBtn}
                  onMouseEnter={e => hov(e.currentTarget, { background:'rgba(255,255,255,.07)', borderColor:'rgba(255,255,255,.25)', color:'#fff' }, {}, true)}
                  onMouseLeave={e => hov(e.currentTarget, {}, { background:'transparent', borderColor:'rgba(255,255,255,.12)', color:'rgba(255,255,255,.7)' }, false)}>
                  Upload
                </button>
              : <button onClick={() => setShowAuth(true)} style={S.accentBtn}
                  onMouseEnter={e => hov(e.currentTarget, { background:'#d8ff6e', transform:'scale(0.97)' }, {}, true)}
                  onMouseLeave={e => hov(e.currentTarget, {}, { background: A, transform:'scale(1)' }, false)}>
                  Sign in
                </button>
            }
          </div>

        </div>
      </header>

      {/* ── MOBILE FILTER SHEET ── */}
      {showSheet && (
        <div className={closingSheet ? 'bd-out' : 'bd-in'} onClick={() => closeSheet()} style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)' }}>
          <div className={closingSheet ? 'sh-out' : 'sh-in'} onClick={e => e.stopPropagation()} style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: '#fff', borderRadius: '22px 22px 0 0', paddingBottom: 'max(20px, env(safe-area-inset-bottom))', boxShadow: '0 -12px 60px rgba(0,0,0,0.15)' }}>
            <div style={{ display: 'flex', justifyContent: 'center', padding: '14px 0 6px' }}>
              <div style={{ width: 32, height: 3, borderRadius: 2, background: 'rgba(0,0,0,0.12)' }} />
            </div>
            <div style={{ padding: '8px 22px 12px', fontFamily: F, fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(0,0,0,0.28)' }}>Browse by</div>
            {FILTERS.map(({ value, label }) => (
              <button key={value} className={`sheet-row${filter === value ? ' active' : ''}`} onClick={() => { setFilter(value); closeSheet(); }}>
                <span>{label}</span>
                {filter === value && <Check size={15} strokeWidth={2.5} color="#000" />}
              </button>
            ))}
            <button onClick={() => closeSheet()} style={{ width: '100%', padding: '16px 22px', background: 'rgba(0,0,0,0.02)', border: 'none', borderTop: '1px solid rgba(0,0,0,0.05)', fontFamily: F, fontSize: 14, fontWeight: 500, color: 'rgba(0,0,0,0.32)', cursor: 'pointer' }}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* ── AUTH MODAL ── */}
      {showAuth && (
        <div className={closingAuth ? 'bd-out' : 'bd-in'} onClick={() => closeAuth()} style={S.backdrop}>
          <div className={closingAuth ? 'm-out' : 'm-in'} onClick={e => e.stopPropagation()} style={S.modal}>
            <div style={{ height: 4, background: `linear-gradient(90deg,${A},#8fff9e)` }} />
            <div style={{ padding: '28px 28px 32px' }}>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 20 }}>
                <button onClick={() => closeAuth()} style={S.closeBtn}
                  onMouseEnter={e => hov(e.currentTarget, { background:'rgba(0,0,0,.10)' }, {}, true)}
                  onMouseLeave={e => hov(e.currentTarget, {}, { background:'rgba(0,0,0,.05)' }, false)}>
                  <X size={13} color="rgba(0,0,0,0.45)" />
                </button>
              </div>

              <div style={{ marginBottom: 28 }}>
                <div style={{ fontFamily: F, fontWeight: 800, fontSize: 24, color: '#0a0a0a', letterSpacing: '-0.5px', marginBottom: 6, lineHeight: 1.15 }}>
                  Welcome to WALL<span style={{ color: A }}>S</span>
                </div>
                <p style={{ fontSize: 13, color: 'rgba(0,0,0,0.42)', fontFamily: F, lineHeight: 1.6 }}>
                  Sign in to save, upload and discover beautiful wallpapers.
                </p>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[
                  { label: 'Sign in with Email', icon: Mail,     path: '/auth/login',  primary: true  },
                  { label: 'Create Account',     icon: UserPlus, path: '/auth/signup', primary: false },
                ].map(({ label, icon: Icon, path, primary }) => (
                  <button key={path} onClick={() => handleNav(path)}
                    style={{ ...S.authBtn, background: primary ? '#0a0a0a' : 'transparent', color: primary ? '#fff' : '#0a0a0a', border: primary ? 'none' : '1.5px solid rgba(0,0,0,0.12)' }}
                    onMouseEnter={e => hov(e.currentTarget, primary ? { background:'#222' } : { borderColor:'rgba(0,0,0,.28)', background:'rgba(0,0,0,.03)' }, {}, true)}
                    onMouseLeave={e => hov(e.currentTarget, {}, primary ? { background:'#0a0a0a' } : { borderColor:'rgba(0,0,0,.12)', background:'transparent' }, false)}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <Icon size={15} strokeWidth={2} /><span>{label}</span>
                    </div>
                    <ArrowRight size={14} strokeWidth={2} style={{ opacity: 0.5 }} />
                  </button>
                ))}
              </div>

              <p style={{ marginTop: 22, textAlign: 'center', fontSize: 11, color: 'rgba(0,0,0,0.22)', fontFamily: F, lineHeight: 1.7 }}>
                By continuing you agree to our <span style={{ textDecoration: 'underline', cursor: 'pointer' }}>Terms</span> and <span style={{ textDecoration: 'underline', cursor: 'pointer' }}>Privacy Policy</span>
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
