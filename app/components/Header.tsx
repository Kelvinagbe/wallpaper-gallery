'use client';

import { useState, useEffect, useRef } from 'react';
import { Mail, UserPlus, ArrowRight, X, Check, Search, SlidersHorizontal, Home, Bell, User, Menu } from 'lucide-react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/app/components/AuthProvider';
import { useUploadModal } from '@/app/components/UploadModalProvider';
import type { Filter } from '../types';

interface HeaderProps {
  filter: Filter;
  setFilter: (filter: Filter) => void;
  onMenuOpen?: () => void;
  startLoader?: () => void;
}

const FILTERS: { value: Filter; label: string }[] = [
  { value: 'all',     label: 'All'     },
  { value: 'recent',  label: 'Recent'  },
  { value: 'popular', label: 'Popular' },
];
const NAV = [
  { href: '/',        icon: Home,   label: 'Home'    },
  { href: '/search',  icon: Search, label: 'Search'  },
  { href: '/alerts',  icon: Bell,   label: 'Alerts'  },
  { href: '/profile', icon: User,   label: 'Profile' },
];
const F = "'Outfit', sans-serif";

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&display=swap');
  @keyframes bdIn  { from{opacity:0} to{opacity:1} }
  @keyframes bdOut { from{opacity:1} to{opacity:0} }
  @keyframes mIn   { from{opacity:0;transform:translateY(12px) scale(.97)} to{opacity:1;transform:translateY(0) scale(1)} }
  @keyframes mOut  { from{opacity:1;transform:scale(1)} to{opacity:0;transform:scale(.97)} }
  @keyframes shIn  { from{transform:translateY(100%)} to{transform:translateY(0)} }
  @keyframes shOut { from{transform:translateY(0)} to{transform:translateY(100%)} }
  @keyframes sbIn  { from{transform:translateX(-100%)} to{transform:translateX(0)} }
  @keyframes sbOut { from{transform:translateX(0)} to{transform:translateX(-100%)} }
  @keyframes msIn  { from{opacity:0;transform:translateY(-8px)} to{opacity:1;transform:translateY(0)} }
  @keyframes msOut { from{opacity:1;transform:translateY(0)} to{opacity:0;transform:translateY(-8px)} }
  .bd-in{animation:bdIn .2s ease forwards} .bd-out{animation:bdOut .2s ease forwards}
  .m-in{animation:mIn .28s cubic-bezier(.16,1,.3,1) forwards} .m-out{animation:mOut .2s ease forwards}
  .sh-in{animation:shIn .3s cubic-bezier(.16,1,.3,1) forwards} .sh-out{animation:shOut .24s ease forwards}
  .sb-in{animation:sbIn .28s cubic-bezier(.16,1,.3,1) forwards} .sb-out{animation:sbOut .22s ease forwards}
  .ms-in{animation:msIn .22s cubic-bezier(.16,1,.3,1) forwards} .ms-out{animation:msOut .18s ease forwards}

  .wl-input {
    width:100%; height:38px; padding:0 14px 0 40px;
    background:rgba(255,255,255,0.07); border:1px solid rgba(255,255,255,0.1);
    border-radius:10px; color:#fff; font-family:'Outfit',sans-serif; font-size:13px;
    outline:none; transition:background .2s,border-color .2s; box-sizing:border-box;
  }
  .wl-input::placeholder{color:rgba(255,255,255,0.32)}
  .wl-input:focus{background:rgba(255,255,255,0.11);border-color:rgba(255,255,255,0.28)}

  .mob-input {
    width:100%; height:42px; padding:0 42px;
    background:rgba(255,255,255,0.08); border:1px solid rgba(255,255,255,0.13);
    border-radius:11px; color:#fff; font-family:'Outfit',sans-serif; font-size:14px;
    outline:none; transition:background .2s,border-color .2s; box-sizing:border-box;
  }
  .mob-input::placeholder{color:rgba(255,255,255,0.3)}
  .mob-input:focus{background:rgba(255,255,255,0.12);border-color:rgba(255,255,255,0.32)}

  .wl-pill{flex-shrink:0;padding:4px 14px;background:transparent;border:1px solid rgba(255,255,255,0.1);border-radius:100px;font-family:'Outfit',sans-serif;font-size:12px;font-weight:500;color:rgba(255,255,255,0.42);cursor:pointer;transition:all .15s;white-space:nowrap}
  .wl-pill:hover{color:rgba(255,255,255,.75);border-color:rgba(255,255,255,.28)}
  .wl-pill.active{background:#fff;color:#000;border-color:#fff;font-weight:600}

  .sheet-row{width:100%;padding:15px 22px;display:flex;align-items:center;justify-content:space-between;background:transparent;border:none;border-top:1px solid rgba(0,0,0,.05);font-family:'Outfit',sans-serif;font-size:15px;color:rgba(0,0,0,.55);cursor:pointer;transition:background .12s}
  .sheet-row.active{font-weight:600;color:#000}
  .sheet-row:active{background:rgba(0,0,0,.03)}

  .sb-nav-item{display:flex;align-items:center;gap:12px;width:100%;padding:11px 14px;border-radius:10px;border:none;background:transparent;font-family:'Outfit',sans-serif;font-size:14px;font-weight:500;color:rgba(0,0,0,0.45);cursor:pointer;text-align:left;transition:all .15s}
  .sb-nav-item:hover{background:rgba(0,0,0,0.04);color:#000}
  .sb-nav-item.active{background:#0a0a0a;color:#fff;font-weight:600}

  .hdr-icon-btn{width:34px;height:34px;display:flex;align-items:center;justify-content:center;background:transparent;border:none;border-radius:8px;cursor:pointer;transition:background .15s;flex-shrink:0}
  .hdr-icon-btn:hover{background:rgba(255,255,255,0.07)}

  @media(min-width:768px){.mob{display:none!important}}
  @media(max-width:767px){.desk{display:none!important}}
`;

const Logo = ({ dark = false }: { dark?: boolean }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <rect width="9" height="9" rx="2" fill={dark ? '#000' : '#fff'} />
      <rect x="11" width="9" height="9" rx="2" fill={dark ? '#000' : '#fff'} />
      <rect y="11" width="9" height="9" rx="2" fill={dark ? '#000' : '#fff'} />
      <rect x="11" y="11" width="9" height="9" rx="2" fill={dark ? '#000' : '#fff'} opacity="0.3" />
    </svg>
    <span style={{ fontFamily: F, fontWeight: 800, fontSize: 16, letterSpacing: '-0.3px', color: dark ? '#000' : '#fff' }}>WALLS</span>
  </div>
);

export const Header = ({ filter, setFilter, onMenuOpen, startLoader }: HeaderProps) => {
  const router   = useRouter();
  const pathname = usePathname();
  const { user } = useAuth();
  const { open: openUpload } = useUploadModal();

  const [showAuth,       setShowAuth]       = useState(false);
  const [closingAuth,    setClosingAuth]     = useState(false);
  const [showSheet,      setShowSheet]       = useState(false);
  const [closingSheet,   setClosingSheet]    = useState(false);
  const [showSidebar,    setShowSidebar]     = useState(false);
  const [closingSidebar, setClosingSidebar]  = useState(false);
  const [searchVal,      setSearchVal]       = useState('');
  const [mobOpen,        setMobOpen]         = useState(false);
  const [mobClosing,     setMobClosing]      = useState(false);
  const [mobVal,         setMobVal]          = useState('');
  const mobRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    document.body.style.overflow = showAuth || showSheet || showSidebar ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [showAuth, showSheet, showSidebar]);

  useEffect(() => {
    if (mobOpen && !mobClosing) setTimeout(() => mobRef.current?.focus(), 80);
  }, [mobOpen, mobClosing]);

  const closeAuth    = (cb?: () => void) => { setClosingAuth(true);    setTimeout(() => { setShowAuth(false);    setClosingAuth(false);    cb?.(); }, 220); };
  const closeSheet   = (cb?: () => void) => { setClosingSheet(true);   setTimeout(() => { setShowSheet(false);   setClosingSheet(false);   cb?.(); }, 260); };
  const closeSidebar = (cb?: () => void) => { setClosingSidebar(true); setTimeout(() => { setShowSidebar(false); setClosingSidebar(false); cb?.(); }, 240); };
  const closeMob     = ()                => { setMobClosing(true); setTimeout(() => { setMobOpen(false); setMobClosing(false); setMobVal(''); }, 200); };

  const handleSearch = (val: string) => {
    const t = val.trim(); if (!t) return;
    startLoader?.();
    router.push(`/search?q=${encodeURIComponent(t)}`);
    closeMob(); setSearchVal('');
  };

  // shared close button style
  const closeBtn: React.CSSProperties = { width: 28, height: 28, borderRadius: '50%', background: 'rgba(0,0,0,0.06)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' };

  return (
    <>
      <style>{CSS}</style>

      {/* ── HEADER ── */}
      <header style={{ position: 'sticky', top: 0, zIndex: 50, background: 'rgba(10,10,10,0.9)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>

        {/* Top row */}
        <div style={{ maxWidth: 1300, margin: '0 auto', padding: '0 16px', height: 54, display: 'flex', alignItems: 'center', gap: 10 }}>

          <button className="hdr-icon-btn" onClick={() => { onMenuOpen?.(); setShowSidebar(true); }} aria-label="Menu">
            <Menu size={19} color="rgba(255,255,255,0.65)" />
          </button>

          <button onClick={() => router.push('/')} style={{ background: 'none', border: 'none', cursor: 'pointer', flexShrink: 0, padding: '0 2px' }}>
            <Logo />
          </button>

          {/* Desktop search */}
          <div className="desk" style={{ flex: 1, maxWidth: 560, position: 'relative' }}>
            <Search size={14} color="rgba(255,255,255,0.4)" style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
            <input
              className="wl-input"
              type="text"
              placeholder="Search wallpapers, colors, moods…"
              value={searchVal}
              onChange={e => setSearchVal(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleSearch(searchVal); }}
            />
          </div>

          <div style={{ flex: 1 }} />

          {/* Mobile icons */}
          <div className="mob" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <button className="hdr-icon-btn" aria-label="Search" onClick={() => mobOpen ? closeMob() : setMobOpen(true)}>
              {mobOpen && !mobClosing
                ? <X size={18} color="rgba(255,255,255,0.75)" />
                : <Search size={18} color="rgba(255,255,255,0.65)" />}
            </button>
            <button className="hdr-icon-btn" onClick={() => setShowSheet(true)} aria-label="Filter" style={{ position: 'relative' }}>
              <SlidersHorizontal size={17} color="rgba(255,255,255,0.65)" strokeWidth={2} />
              {filter !== 'all' && <span style={{ position: 'absolute', top: 6, right: 6, width: 5, height: 5, borderRadius: '50%', background: '#fff', border: '1.5px solid #0a0a0a' }} />}
            </button>
          </div>

          {/* Auth / Upload */}
          {user ? (
            <button onClick={openUpload}
              style={{ padding: '6px 14px', fontFamily: F, fontSize: 13, fontWeight: 600, border: '1px solid rgba(255,255,255,0.14)', borderRadius: 8, background: 'transparent', color: 'rgba(255,255,255,0.6)', cursor: 'pointer', transition: 'all .18s', flexShrink: 0 }}
              onMouseEnter={e => Object.assign((e.currentTarget as HTMLElement).style, { background: 'rgba(255,255,255,.08)', borderColor: 'rgba(255,255,255,.3)', color: '#fff' })}
              onMouseLeave={e => Object.assign((e.currentTarget as HTMLElement).style, { background: 'transparent', borderColor: 'rgba(255,255,255,.14)', color: 'rgba(255,255,255,.6)' })}>
              Upload
            </button>
          ) : (
            <button onClick={() => setShowAuth(true)}
              style={{ padding: '6px 16px', fontFamily: F, fontSize: 13, fontWeight: 700, border: 'none', borderRadius: 8, background: '#fff', color: '#000', cursor: 'pointer', transition: 'all .18s', flexShrink: 0 }}
              onMouseEnter={e => Object.assign((e.currentTarget as HTMLElement).style, { background: 'rgba(255,255,255,.85)', transform: 'scale(0.97)' })}
              onMouseLeave={e => Object.assign((e.currentTarget as HTMLElement).style, { background: '#fff', transform: 'scale(1)' })}>
              Sign in
            </button>
          )}
        </div>

        {/* Mobile search dropdown */}
        {(mobOpen || mobClosing) && (
          <div className={`mob ${mobClosing ? 'ms-out' : 'ms-in'}`} style={{ borderTop: '1px solid rgba(255,255,255,0.07)', padding: '10px 14px 12px', background: 'rgba(10,10,10,0.96)' }}>
            <div style={{ position: 'relative' }}>
              <Search size={15} color="rgba(255,255,255,0.45)" style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
              <input ref={mobRef} className="mob-input" type="search" placeholder="Search wallpapers…"
                value={mobVal} onChange={e => setMobVal(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleSearch(mobVal); }}
                autoComplete="off" autoCorrect="off" autoCapitalize="off" spellCheck={false} />
              {mobVal.length > 0 && (
                <button onClick={() => setMobVal('')}
                  style={{ position: 'absolute', right: 9, top: '50%', transform: 'translateY(-50%)', width: 24, height: 24, borderRadius: '50%', background: 'rgba(255,255,255,0.1)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                  <X size={12} color="rgba(255,255,255,0.6)" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* Filter pills — desktop */}
        <div className="desk" style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '0 20px', height: 38, overflowX: 'auto', borderTop: '1px solid rgba(255,255,255,0.05)', scrollbarWidth: 'none' }}>
          {FILTERS.map(({ value, label }) => (
            <button key={value} className={`wl-pill${filter === value ? ' active' : ''}`} onClick={() => setFilter(value)}>{label}</button>
          ))}
        </div>
      </header>

      {/* ── SIDEBAR ── */}
      {(showSidebar || closingSidebar) && (
        <>
          <div className={closingSidebar ? 'bd-out' : 'bd-in'} onClick={() => closeSidebar()}
            style={{ position: 'fixed', inset: 0, zIndex: 90, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)' }} />
          <aside className={closingSidebar ? 'sb-out' : 'sb-in'}
            style={{ position: 'fixed', top: 0, left: 0, bottom: 0, width: 260, background: '#fff', zIndex: 100, display: 'flex', flexDirection: 'column', boxShadow: '4px 0 40px rgba(0,0,0,0.12)' }}>
            <div style={{ padding: '18px 16px', borderBottom: '1px solid rgba(0,0,0,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Logo dark />
              <button onClick={() => closeSidebar()} style={closeBtn}><X size={13} color="rgba(0,0,0,0.4)" /></button>
            </div>
            <nav style={{ flex: 1, padding: '12px 10px', display: 'flex', flexDirection: 'column', gap: 2 }}>
              <p style={{ fontSize: 10, fontWeight: 700, color: 'rgba(0,0,0,0.25)', letterSpacing: '.09em', textTransform: 'uppercase', margin: '4px 4px 8px 14px' }}>Navigate</p>
              {NAV.map(({ href, icon: Icon, label }) => {
                const active = pathname === href;
                return (
                  <button key={href} className={`sb-nav-item${active ? ' active' : ''}`} onClick={() => closeSidebar(() => router.push(href))}>
                    <Icon size={16} strokeWidth={active ? 2.5 : 2} />{label}
                  </button>
                );
              })}
            </nav>
            <div style={{ padding: '14px 10px', borderTop: '1px solid rgba(0,0,0,0.06)' }}>
              <button onClick={() => user ? (closeSidebar(), openUpload()) : closeSidebar(() => setShowAuth(true))}
                style={{ width: '100%', padding: '12px 0', borderRadius: 10, border: 'none', background: '#0a0a0a', color: '#fff', fontFamily: F, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
                {user ? 'Upload Wallpaper' : 'Sign in'}
              </button>
              <p style={{ textAlign: 'center', fontSize: 11, color: 'rgba(0,0,0,0.2)', marginTop: 14, fontFamily: F }}>WALLS v1.0.0</p>
            </div>
          </aside>
        </>
      )}

      {/* ── FILTER SHEET ── */}
      {(showSheet || closingSheet) && (
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
      {(showAuth || closingAuth) && (
        <div className={closingAuth ? 'bd-out' : 'bd-in'} onClick={() => closeAuth()}
          style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div className={closingAuth ? 'm-out' : 'm-in'} onClick={e => e.stopPropagation()}
            style={{ width: '100%', maxWidth: 370, background: '#fff', borderRadius: 18, overflow: 'hidden', boxShadow: '0 32px 80px rgba(0,0,0,0.35)' }}>
            <div style={{ padding: '28px 26px 30px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
                <Logo dark />
                <button onClick={() => closeAuth()} style={closeBtn}><X size={13} color="rgba(0,0,0,0.4)" /></button>
              </div>
              <p style={{ fontFamily: F, fontWeight: 800, fontSize: 22, color: '#0a0a0a', letterSpacing: '-0.4px', margin: '0 0 5px', lineHeight: 1.2 }}>Welcome back</p>
              <p style={{ fontSize: 13, color: 'rgba(0,0,0,.4)', fontFamily: F, lineHeight: 1.6, margin: '0 0 24px' }}>Sign in to save, upload and discover wallpapers.</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
                {[
                  { label: 'Sign in with Email', icon: Mail,     path: '/auth/login',  primary: true  },
                  { label: 'Create Account',     icon: UserPlus, path: '/auth/signup', primary: false },
                ].map(({ label, icon: Icon, path, primary }) => (
                  <button key={path} onClick={() => closeAuth(() => router.push(path))}
                    style={{ width: '100%', padding: '13px 18px', borderRadius: 10, cursor: 'pointer', fontFamily: F, fontWeight: 600, fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'space-between', transition: 'all .2s', background: primary ? '#000' : 'transparent', color: primary ? '#fff' : '#000', border: primary ? 'none' : '1.5px solid rgba(0,0,0,.12)' }}
                    onMouseEnter={e => Object.assign((e.currentTarget as HTMLElement).style, primary ? { background: '#222' } : { borderColor: 'rgba(0,0,0,.3)', background: 'rgba(0,0,0,.03)' })}
                    onMouseLeave={e => Object.assign((e.currentTarget as HTMLElement).style, primary ? { background: '#000' } : { borderColor: 'rgba(0,0,0,.12)', background: 'transparent' })}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <Icon size={15} strokeWidth={2} /><span>{label}</span>
                    </div>
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