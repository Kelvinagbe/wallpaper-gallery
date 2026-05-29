'use client';

import { useState, useEffect, useRef } from 'react';
import { Mail, UserPlus, X, Check, Search, ListFilter, Bell, User, Home, Menu, Plus, LogOut } from 'lucide-react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/app/components/AuthProvider';
import { useUploadModal } from '@/app/components/UploadModalProvider';
import type { Filter } from '../types';

interface HeaderProps {
  filter: Filter;
  setFilter: (filter: Filter) => void;
  startLoader?: () => void;
}

const FILTERS: { value: Filter; label: string }[] = [
  { value: 'all',     label: 'All'     },
  { value: 'recent',  label: 'Recent'  },
  { value: 'popular', label: 'Popular' },
];

const NAV = [
  { href: '/',        icon: Home,  label: 'Home'    },
  { href: '/search',  icon: Search,label: 'Search'  },
  { href: '/alerts',  icon: Bell,  label: 'Alerts'  },
  { href: '/profile', icon: User,  label: 'Profile' },
];

const F          = "'Outfit', sans-serif";
const HDR_BG     = 'rgba(10,10,10,0.92)';
const HDR_BORDER = '1px solid rgba(255,255,255,0.07)';

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&display=swap');

  @keyframes bdIn  { from{opacity:0} to{opacity:1} }
  @keyframes bdOut { from{opacity:1} to{opacity:0} }
  @keyframes mIn   { from{opacity:0;transform:translateY(12px) scale(.97)} to{opacity:1;transform:none} }
  @keyframes mOut  { from{opacity:1;transform:none} to{opacity:0;transform:scale(.97)} }
  @keyframes shIn  { from{transform:translateY(100%)} to{transform:none} }
  @keyframes shOut { from{transform:none} to{transform:translateY(100%)} }
  @keyframes msIn  { from{opacity:0;transform:translateY(-8px)} to{opacity:1;transform:none} }
  @keyframes msOut { from{opacity:1;transform:none} to{opacity:0;transform:translateY(-8px)} }

  .bd-in{animation:bdIn .2s ease forwards}   .bd-out{animation:bdOut .2s ease forwards}
  .m-in{animation:mIn .28s cubic-bezier(.16,1,.3,1) forwards}  .m-out{animation:mOut .2s ease forwards}
  .sh-in{animation:shIn .32s cubic-bezier(.16,1,.3,1) forwards} .sh-out{animation:shOut .24s ease forwards}
  .ms-in{animation:msIn .22s cubic-bezier(.16,1,.3,1) forwards} .ms-out{animation:msOut .18s ease forwards}

  .wl-input,.mob-input{
    width:100%;background:rgba(255,255,255,0.07);border:1px solid rgba(255,255,255,0.1);
    border-radius:10px;color:#fff;font-family:'Outfit',sans-serif;outline:none;
    transition:background .2s,border-color .2s,color .2s;box-sizing:border-box;
  }
  .wl-input{height:38px;padding:0 14px 0 40px;font-size:13px}
  .mob-input{height:42px;padding:0 42px;font-size:14px;border-radius:11px}
  .wl-input::placeholder,.mob-input::placeholder{color:rgba(255,255,255,0.32);transition:color .2s}
  .wl-input:focus,.mob-input:focus{background:#fff;border-color:#fff;color:#000}
  .wl-input:focus::placeholder,.mob-input:focus::placeholder{color:rgba(0,0,0,0.35)}

  .wl-pill{flex-shrink:0;padding:4px 14px;background:transparent;border:1px solid rgba(255,255,255,0.1);border-radius:100px;font-family:'Outfit',sans-serif;font-size:12px;font-weight:500;color:rgba(255,255,255,0.42);cursor:pointer;transition:all .15s;white-space:nowrap}
  .wl-pill:hover{color:rgba(255,255,255,.75);border-color:rgba(255,255,255,.28)}
  .wl-pill.active{background:#fff;color:#000;border-color:#fff;font-weight:600}

  .hdr-icon-btn{width:34px;height:34px;display:flex;align-items:center;justify-content:center;background:transparent;border:none;border-radius:8px;cursor:pointer;transition:background .15s;flex-shrink:0;-webkit-tap-highlight-color:transparent}
  .hdr-icon-btn:hover{background:rgba(255,255,255,0.07)}
  .hdr-icon-btn:active{background:rgba(255,255,255,0.12)}

  .nav-row{width:100%;padding:14px 22px;display:flex;align-items:center;gap:14px;background:transparent;border:none;font-family:'Outfit',sans-serif;font-size:15px;font-weight:500;color:#111;cursor:pointer;transition:background .12s;text-align:left;-webkit-tap-highlight-color:transparent}
  .nav-row:active{background:rgba(0,0,0,.04)}
  .nav-row.active{font-weight:700;color:#000}
  .nav-row + .nav-row{border-top:1px solid rgba(0,0,0,.05)}

  .sheet-row{width:100%;padding:15px 22px;display:flex;align-items:center;justify-content:space-between;background:transparent;border:none;border-top:1px solid rgba(0,0,0,.05);font-family:'Outfit',sans-serif;font-size:15px;color:rgba(0,0,0,.55);cursor:pointer;transition:background .12s}
  .sheet-row.active{font-weight:600;color:#000}
  .sheet-row:active{background:rgba(0,0,0,.03)}

  @media(min-width:768px){.mob{display:none!important}}
  @media(max-width:767px){.desk{display:none!important}}
`;

const Logo = ({ dark = false }: { dark?: boolean }) => {
  const c = dark ? '#000' : '#fff';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <rect width="9" height="9" rx="2" fill={c} />
        <rect x="11" width="9" height="9" rx="2" fill={c} />
        <rect y="11" width="9" height="9" rx="2" fill={c} />
        <rect x="11" y="11" width="9" height="9" rx="2" fill={c} opacity="0.3" />
      </svg>
      <span style={{ fontFamily: F, fontWeight: 800, fontSize: 16, letterSpacing: '-0.3px', color: c }}>WALLS</span>
    </div>
  );
};

function useAnimatedToggle(durationMs: number) {
  const [visible, setVisible] = useState(false);
  const [closing, setClosing] = useState(false);
  const open  = () => { setClosing(false); setVisible(true); };
  const close = (cb?: () => void) => {
    setClosing(true);
    setTimeout(() => { setVisible(false); setClosing(false); cb?.(); }, durationMs);
  };
  return { visible, closing, open, close, shown: visible || closing };
}

export const Header = ({ filter, setFilter, startLoader }: HeaderProps) => {
  const router   = useRouter();
  const pathname = usePathname();
  const { user } = useAuth();
  const { open: openUpload } = useUploadModal();

  const auth   = useAnimatedToggle(220);
  const sheet  = useAnimatedToggle(260); // filter sheet
  const navSheet = useAnimatedToggle(280); // nav menu sheet

  const [searchVal,  setSearchVal]  = useState('');
  const [mobOpen,    setMobOpen]    = useState(false);
  const [mobClosing, setMobClosing] = useState(false);
  const [mobVal,     setMobVal]     = useState('');
  const mobRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const anyOpen = auth.visible || sheet.visible || navSheet.visible;
    document.body.style.overflow = anyOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [auth.visible, sheet.visible, navSheet.visible]);

  useEffect(() => {
    if (mobOpen && !mobClosing) setTimeout(() => mobRef.current?.focus(), 80);
  }, [mobOpen, mobClosing]);

  const closeMob = () => {
    setMobClosing(true);
    setTimeout(() => { setMobOpen(false); setMobClosing(false); setMobVal(''); }, 200);
  };

  const handleSearch = (val: string) => {
    const t = val.trim();
    if (!t) return;
    startLoader?.();
    router.push(`/search?q=${encodeURIComponent(t)}`);
    closeMob();
    setSearchVal('');
  };

  const handleNav = (href: string) => {
    navSheet.close(() => {
      startLoader?.();
      router.push(href);
    });
  };

  return (
    <>
      <style>{CSS}</style>

      {/* ── HEADER ── */}
      <header style={{
        position: 'sticky', top: 0, zIndex: 50,
        background: HDR_BG,
        backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
        borderBottom: HDR_BORDER,
      }}>
        {/* Top row */}
        <div style={{ maxWidth: 1300, margin: '0 auto', padding: '0 16px', height: 54, display: 'flex', alignItems: 'center', gap: 10 }}>

          <button onClick={() => router.push('/')} style={{ background: 'none', border: 'none', cursor: 'pointer', flexShrink: 0, padding: '0 2px', WebkitTapHighlightColor: 'transparent' }}>
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
          <div className="mob" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            {/* Search toggle */}
            <button className="hdr-icon-btn" aria-label="Search" onClick={() => mobOpen ? closeMob() : setMobOpen(true)}>
              {mobOpen && !mobClosing
                ? <X size={18} color="rgba(255,255,255,0.75)" />
                : <Search size={18} color="rgba(255,255,255,0.65)" />}
            </button>

            {/* Filter */}
            <button className="hdr-icon-btn" onClick={sheet.open} aria-label="Filter" style={{ position: 'relative' }}>
              <ListFilter size={17} color="rgba(255,255,255,0.65)" strokeWidth={2} />
              {filter !== 'all' && (
                <span style={{ position: 'absolute', top: 6, right: 6, width: 5, height: 5, borderRadius: '50%', background: '#fff', border: '1.5px solid #0a0a0a' }} />
              )}
            </button>

            {/* Menu / hamburger → opens nav sheet */}
            <button
              className="hdr-icon-btn"
              aria-label="Menu"
              onClick={navSheet.shown ? () => navSheet.close() : navSheet.open}
            >
              {navSheet.shown && !navSheet.closing
                ? <X size={18} color="rgba(255,255,255,0.75)" />
                : <Menu size={18} color="rgba(255,255,255,0.65)" />}
            </button>
          </div>

          {/* Desktop auth/upload */}
          {user ? (
            <button
              className="desk"
              onClick={openUpload}
              style={{ padding: '6px 14px', fontFamily: F, fontSize: 13, fontWeight: 600, border: '1px solid rgba(255,255,255,0.14)', borderRadius: 8, background: 'transparent', color: 'rgba(255,255,255,0.6)', cursor: 'pointer', transition: 'all .18s', flexShrink: 0 }}
              onMouseEnter={e => Object.assign((e.currentTarget as HTMLElement).style, { background: 'rgba(255,255,255,.08)', borderColor: 'rgba(255,255,255,.3)', color: '#fff' })}
              onMouseLeave={e => Object.assign((e.currentTarget as HTMLElement).style, { background: 'transparent', borderColor: 'rgba(255,255,255,.14)', color: 'rgba(255,255,255,.6)' })}
            >
              Upload
            </button>
          ) : (
            <button
              className="desk"
              onClick={auth.open}
              style={{ padding: '6px 16px', fontFamily: F, fontSize: 13, fontWeight: 700, border: 'none', borderRadius: 8, background: '#fff', color: '#000', cursor: 'pointer', transition: 'all .18s', flexShrink: 0 }}
              onMouseEnter={e => Object.assign((e.currentTarget as HTMLElement).style, { background: 'rgba(255,255,255,.85)', transform: 'scale(0.97)' })}
              onMouseLeave={e => Object.assign((e.currentTarget as HTMLElement).style, { background: '#fff', transform: 'scale(1)' })}
            >
              Sign in
            </button>
          )}
        </div>

        {/* Mobile search dropdown */}
        {(mobOpen || mobClosing) && (
          <div
            className={`mob ${mobClosing ? 'ms-out' : 'ms-in'}`}
            style={{ borderTop: HDR_BORDER, padding: '10px 14px 12px', background: HDR_BG, backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)' }}
          >
            <div style={{ position: 'relative' }}>
              <Search size={15} color="rgba(255,255,255,0.45)" style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
              <input
                ref={mobRef}
                className="mob-input"
                type="search"
                placeholder="Search wallpapers…"
                value={mobVal}
                onChange={e => setMobVal(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleSearch(mobVal); }}
                autoComplete="off" autoCorrect="off" autoCapitalize="off" spellCheck={false}
              />
              {mobVal.length > 0 && (
                <button
                  onClick={() => setMobVal('')}
                  style={{ position: 'absolute', right: 9, top: '50%', transform: 'translateY(-50%)', width: 24, height: 24, borderRadius: '50%', background: 'rgba(255,255,255,0.1)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                >
                  <X size={12} color="rgba(255,255,255,0.6)" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* Filter pills — desktop */}
        <div
          className="desk"
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '0 20px', height: 38, overflowX: 'auto', borderTop: '1px solid rgba(255,255,255,0.05)', scrollbarWidth: 'none' }}
        >
          {FILTERS.map(({ value, label }) => (
            <button key={value} className={`wl-pill${filter === value ? ' active' : ''}`} onClick={() => setFilter(value)}>
              {label}
            </button>
          ))}
        </div>
      </header>

      {/* ── NAV BOTTOM SHEET (mobile menu) ── */}
      {navSheet.shown && (
        <>
          {/* Backdrop */}
          <div
            className={navSheet.closing ? 'bd-out' : 'bd-in'}
            onClick={() => navSheet.close()}
            style={{ position: 'fixed', inset: 0, zIndex: 90, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }}
          />

          {/* Sheet */}
          <div
            className={`mob ${navSheet.closing ? 'sh-out' : 'sh-in'}`}
            style={{
              position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 95,
              background: '#fff', borderRadius: '22px 22px 0 0',
              paddingBottom: 'max(24px, env(safe-area-inset-bottom))',
              boxShadow: '0 -12px 50px rgba(0,0,0,0.22)',
            }}
          >
            {/* Handle */}
            <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 6px' }}>
              <div style={{ width: 32, height: 3, borderRadius: 2, background: 'rgba(0,0,0,0.1)' }} />
            </div>

            {/* Upload / Sign in CTA */}
            <div style={{ padding: '8px 18px 10px' }}>
              <button
                onClick={() => navSheet.close(() => user ? openUpload() : auth.open())}
                style={{
                  width: '100%', padding: '13px 18px', borderRadius: 13, border: 'none',
                  background: '#0a0a0a', color: '#fff', fontFamily: F, fontWeight: 700,
                  fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center',
                  justifyContent: 'center', gap: 8, WebkitTapHighlightColor: 'transparent',
                  transition: 'opacity .15s',
                }}
                onTouchStart={e => (e.currentTarget.style.opacity = '0.8')}
                onTouchEnd={e => (e.currentTarget.style.opacity = '1')}
              >
                <Plus size={16} strokeWidth={2.5} />
                {user ? 'Upload Wallpaper' : 'Sign in to Upload'}
              </button>
            </div>

            {/* Divider label */}
            <div style={{ padding: '6px 22px 4px', fontFamily: F, fontSize: 11, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: 'rgba(0,0,0,.28)' }}>
              Navigate
            </div>

            {/* Nav links */}
            {NAV.map(({ href, icon: Icon, label }) => {
              const active = pathname === href;
              return (
                <button
                  key={href}
                  className={`nav-row${active ? ' active' : ''}`}
                  onClick={() => handleNav(href)}
                >
                  <div style={{
                    width: 36, height: 36, borderRadius: 10, display: 'flex',
                    alignItems: 'center', justifyContent: 'center',
                    background: active ? '#0a0a0a' : 'rgba(0,0,0,0.06)',
                    flexShrink: 0,
                  }}>
                    <Icon size={17} color={active ? '#fff' : '#555'} strokeWidth={active ? 2.5 : 1.8} />
                  </div>
                  <span style={{ color: active ? '#000' : '#333' }}>{label}</span>
                  {active && (
                    <div style={{ marginLeft: 'auto' }}>
                      <Check size={15} color="#000" strokeWidth={2.5} />
                    </div>
                  )}
                </button>
              );
            })}

            {/* Sign out if logged in */}
            {user && (
              <>
                <div style={{ margin: '8px 18px 0', borderTop: '1px solid rgba(0,0,0,.06)' }} />
                <button
                  className="nav-row"
                  onClick={() => navSheet.close(() => router.push('/auth/logout'))}
                  style={{ color: '#e53e3e' }}
                >
                  <div style={{ width: 36, height: 36, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(229,62,62,0.08)', flexShrink: 0 }}>
                    <LogOut size={17} color="#e53e3e" strokeWidth={1.8} />
                  </div>
                  <span style={{ color: '#e53e3e' }}>Sign out</span>
                </button>
              </>
            )}
          </div>
        </>
      )}

      {/* ── FILTER SHEET ── */}
      {sheet.shown && (
        <div
          className={sheet.closing ? 'bd-out' : 'bd-in'}
          onClick={() => sheet.close()}
          style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)', display: 'flex', alignItems: 'flex-end' }}
        >
          <div
            className={sheet.closing ? 'sh-out' : 'sh-in'}
            onClick={e => e.stopPropagation()}
            style={{ width: '100%', background: '#fff', borderRadius: '20px 20px 0 0', paddingBottom: 'max(20px,env(safe-area-inset-bottom))', boxShadow: '0 -8px 40px rgba(0,0,0,0.18)' }}
          >
            <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 4px' }}>
              <div style={{ width: 30, height: 3, borderRadius: 2, background: 'rgba(0,0,0,0.1)' }} />
            </div>
            <div style={{ padding: '8px 22px 10px', fontFamily: F, fontSize: 11, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: 'rgba(0,0,0,.28)' }}>Browse by</div>
            {FILTERS.map(({ value, label }) => (
              <button key={value} className={`sheet-row${filter === value ? ' active' : ''}`} onClick={() => { setFilter(value); sheet.close(); }}>
                <span>{label}</span>
                {filter === value && <Check size={15} strokeWidth={2.5} color="#000" />}
              </button>
            ))}
            <button
              onClick={() => sheet.close()}
              style={{ width: '100%', padding: '15px 22px', background: 'rgba(0,0,0,.02)', border: 'none', borderTop: '1px solid rgba(0,0,0,.05)', fontFamily: F, fontSize: 14, fontWeight: 500, color: 'rgba(0,0,0,.3)', cursor: 'pointer' }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

       {/* ── AUTH MODAL ── */}
      {auth.shown && (
        <div
          className={auth.closing ? 'bd-out' : 'bd-in'}
          onClick={() => auth.close()}
          style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
        >
          <div
            className={auth.closing ? 'm-out' : 'm-in'}
            onClick={e => e.stopPropagation()}
            style={{ width: '100%', maxWidth: 370, background: '#fff', borderRadius: 18, overflow: 'hidden', boxShadow: '0 32px 80px rgba(0,0,0,0.35)' }}
          >
            <div style={{ padding: '28px 26px 30px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
                <Logo dark />
                <button
                  onClick={() => auth.close()}
                  style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(0,0,0,0.06)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                  <X size={13} color="rgba(0,0,0,0.4)" />
                </button>
              </div>
              <p style={{ fontFamily: F, fontWeight: 800, fontSize: 22, color: '#0a0a0a', letterSpacing: '-0.4px', margin: '0 0 5px', lineHeight: 1.2 }}>Welcome back</p>
              <p style={{ fontSize: 13, color: 'rgba(0,0,0,.4)', fontFamily: F, lineHeight: 1.6, margin: '0 0 24px' }}>Sign in to save, upload and discover wallpapers.</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
                {[
                  { label: 'Sign in with Email', icon: Mail,     path: '/auth/login',  primary: true  },
                  { label: 'Create Account',     icon: UserPlus, path: '/auth/signup', primary: false },
                ].map(({ label, icon: Icon, path, primary }) => (
                  <button
                    key={path}
                    onClick={() => auth.close(() => router.push(path))}
                    style={{
                      width: '100%', padding: '13px 18px', borderRadius: 10, cursor: 'pointer',
                      fontFamily: F, fontWeight: 600, fontSize: 14,
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      transition: 'all .2s',
                      background: primary ? '#000' : 'transparent',
                      color: primary ? '#fff' : '#000',
                      border: primary ? 'none' : '1px solid rgba(0,0,0,0.1)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <Icon size={16} />
                      <span>{label}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};