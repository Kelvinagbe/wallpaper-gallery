'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Search, X, ChevronLeft } from 'lucide-react';
import { fetchHotWallpapers } from '@/lib/stores/wallpaperStore';
import { startLoader } from '@/app/components/TopLoader';
import type { Wallpaper } from '@/app/types';

// ── Cache ──────────────────────────────────────────────────────
const CACHE_KEY = 'hot_wallpapers';
const CACHE_TTL = 6 * 60 * 60 * 1000;
const getCache = (): Wallpaper[] | null => { try { const r = localStorage.getItem(CACHE_KEY); if (!r) return null; const { data, cachedAt } = JSON.parse(r); return Date.now() - cachedAt > CACHE_TTL ? null : data; } catch { return null; } };
const setCache = (d: Wallpaper[]) => { try { localStorage.setItem(CACHE_KEY, JSON.stringify({ data: d, cachedAt: Date.now() })); } catch {} };

// ── Static data ────────────────────────────────────────────────
const TAGS = [
  { label: 'Dark',     img: 'https://images.unsplash.com/photo-1518020382113-a7e8fc38eac9?w=400&q=80' },
  { label: 'Minimal',  img: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&q=80' },
  { label: 'Nature',   img: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=400&q=80' },
  { label: 'Anime',    img: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=400&q=80' },
  { label: 'Abstract', img: 'https://images.unsplash.com/photo-1541701494587-cb58502866ab?w=400&q=80' },
  { label: 'Space',    img: 'https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?w=400&q=80' },
  { label: 'Cars',     img: 'https://images.unsplash.com/photo-1544636331-e26879cd4d9b?w=400&q=80' },
  { label: 'Ocean',    img: 'https://images.unsplash.com/photo-1505118380757-91f5f5632de0?w=400&q=80' },
  { label: 'Retro',    img: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=400&q=80' },
  { label: 'Lofi',     img: 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=400&q=80' },
];
const COLLECTIONS = [
  { title: 'Ultra Dark',  sub: 'Amoled · 240 walls',    wallOffset: 0 },
  { title: 'Neon City',   sub: 'Cyberpunk · 180 walls', wallOffset: 1 },
  { title: 'Soft Pastel', sub: 'Dreamy · 95 walls',     wallOffset: 2 },
  { title: 'Abstract',    sub: 'Digital · 310 walls',   wallOffset: 3 },
  { title: 'Anime',       sub: 'Fan art · 420 walls',   wallOffset: 4 },
];

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=DM+Sans:wght@400;500;600;700&display=swap');
  * { box-sizing: border-box; }
  @keyframes fadeUp   { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
  @keyframes shimmer  { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
  @keyframes stickyIn { from{opacity:0;transform:translateY(-10px)} to{opacity:1;transform:translateY(0)} }
  .fade-up    { animation: fadeUp .28s ease forwards; }
  .shimmer    { background:linear-gradient(105deg,#ebebeb 40%,#f8f8f8 50%,#ebebeb 60%); background-size:200% 100%; animation:shimmer 1.5s ease-in-out infinite; }
  .sticky-bar { animation: stickyIn .22s ease forwards; }
  .hero-search:focus-within   { box-shadow:0 0 0 3px rgba(255,255,255,0.55) !important; }
  .sticky-search:focus-within { box-shadow:0 0 0 2.5px rgba(10,10,10,0.12) !important; }
  .hero-dot   { transition:width .3s ease,opacity .3s ease; border:none; padding:0; cursor:pointer; }
  .col-card   { transition:transform .18s ease,box-shadow .18s ease; cursor:pointer; flex-shrink:0; }
  .col-card:hover  { transform:translateY(-3px); box-shadow:0 10px 28px rgba(0,0,0,0.14) !important; }
  .col-card:active { transform:scale(.97); }
  .tag-card   { transition:transform .15s ease; cursor:pointer; }
  .tag-card:hover  { transform:scale(1.02); }
  .tag-card:active { transform:scale(.97); }
  .recent-row { transition:background .1s; cursor:pointer; }
  .recent-row:hover  { background:#f7f7f7 !important; }
  .recent-row:active { background:#f0f0f0 !important; }
  .h-scroll   { display:flex; gap:10px; overflow-x:auto; padding:0 16px 4px; scroll-snap-type:x mandatory; -webkit-overflow-scrolling:touch; scrollbar-width:none; }
  .h-scroll::-webkit-scrollbar { display:none; }
  .back-btn:hover        { background:#f0f0f0 !important; }
  .back-btn:active       { transform:scale(.95); }
  .back-btn-sticky:hover  { background:rgba(0,0,0,0.06) !important; }
  .back-btn-sticky:active { transform:scale(.95); }
  .go-btn:hover  { background:#222 !important; }
  .go-btn:active { transform:scale(.96); }
`;

export default function SearchPage() {
  const router         = useRouter();
  const inputRef       = useRef<HTMLInputElement>(null);
  const stickyInputRef = useRef<HTMLInputElement>(null);
  const timerRef       = useRef<ReturnType<typeof setInterval> | null>(null);
  const pauseRef       = useRef(false);
  const sentinelRef    = useRef<HTMLDivElement>(null);

  const [query,    setQuery]    = useState('');
  const [recent,   setRecent]   = useState<string[]>([]);
  const [walls,    setWalls]    = useState<Wallpaper[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [heroIdx,  setHeroIdx]  = useState(0);
  const [fading,   setFading]   = useState(false);
  const [isSticky, setIsSticky] = useState(false);

  useEffect(() => {
    const cached = getCache();
    if (cached?.length) { setWalls(cached); setLoading(false); return; }
    fetchHotWallpapers(10).then(d => { setCache(d); setWalls(d); }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    try { const s = localStorage.getItem('recentSearches'); if (s) setRecent(JSON.parse(s)); } catch {}
    setTimeout(() => inputRef.current?.focus(), 180);
  }, []);

  useEffect(() => {
    if (walls.length < 2) return;
    timerRef.current = setInterval(() => {
      if (pauseRef.current) return;
      setFading(true);
      setTimeout(() => { setHeroIdx(i => (i + 1) % Math.min(walls.length, 8)); setFading(false); }, 420);
    }, 4800);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [walls.length]);

  useEffect(() => {
    const el = sentinelRef.current; if (!el) return;
    const obs = new IntersectionObserver(([e]) => setIsSticky(!e.isIntersecting), { threshold: 0 });
    obs.observe(el); return () => obs.disconnect();
  }, []);

  useEffect(() => {
    setTimeout(() => (isSticky ? stickyInputRef : inputRef).current?.focus(), 80);
  }, [isSticky]);

  const goSlide = (i: number) => {
    if (i === heroIdx) return;
    pauseRef.current = true; setFading(true);
    setTimeout(() => { setHeroIdx(i); setFading(false); setTimeout(() => { pauseRef.current = false; }, 3000); }, 400);
  };

  const saveAndGo = (q: string) => {
    const t = q.trim(); if (!t) return;
    try { const prev = JSON.parse(localStorage.getItem('recentSearches') || '[]'); localStorage.setItem('recentSearches', JSON.stringify([t, ...prev.filter((s: string) => s.toLowerCase() !== t.toLowerCase())].slice(0, 6))); } catch {}
    startLoader(); router.push(`/search/${encodeURIComponent(t)}`);
  };

  const removeRecent = (term: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const next = recent.filter(s => s !== term);
    setRecent(next); localStorage.setItem('recentSearches', JSON.stringify(next));
  };

  const goBack = () => { startLoader(); router.back(); };
  const heroCount = Math.min(walls.length, 8);

  // ── Shared search bar inner content ──
  const SearchBarInner = ({ r, sticky = false }: { r: React.RefObject<HTMLInputElement>; sticky?: boolean }) => (
    <>
      <Search size={sticky ? 15 : 16} color="#999" strokeWidth={2} style={{ flexShrink: 0 }} />
      <input ref={r} type="text" value={query} onChange={e => setQuery(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') saveAndGo(query); }} placeholder="Search wallpapers…"
        style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', fontSize: 15, color: '#0a0a0a', fontFamily: 'inherit', fontWeight: 500, minWidth: 0 }} />
      {query.trim() && (
        <button onClick={() => { setQuery(''); r.current?.focus(); }}
          style={{ width: 20, height: 20, borderRadius: '50%', background: 'rgba(0,0,0,0.1)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
          <X size={10} color="#666" strokeWidth={2.5} />
        </button>
      )}
      <button className="go-btn" onClick={() => saveAndGo(query)}
        style={{ height: sticky ? 32 : 36, padding: '0 16px', borderRadius: sticky ? 9 : 11, background: '#0a0a0a', color: '#fff', border: 'none', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0 }}>
        Go
      </button>
    </>
  );

  return (
    <div style={{ minHeight: '100dvh', background: '#fff', fontFamily: "'DM Sans', system-ui, sans-serif", color: '#0a0a0a' }}>
      <style>{CSS}</style>

      {/* ── Sticky header ── */}
      {isSticky && (
        <div className="sticky-bar" style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100, background: 'rgba(255,255,255,0.72)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(0,0,0,0.07)', boxShadow: '0 2px 16px rgba(0,0,0,0.07)', paddingTop: 'env(safe-area-inset-top, 0px)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px' }}>
            <button className="back-btn-sticky" onClick={goBack} style={{ width: 38, height: 38, flexShrink: 0, borderRadius: 12, background: 'rgba(0,0,0,0.05)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
              <ChevronLeft size={20} color="#0a0a0a" strokeWidth={2.5} />
            </button>
            <div className="sticky-search" style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(0,0,0,0.05)', borderRadius: 14, padding: '9px 10px 9px 13px', border: '1.5px solid rgba(0,0,0,0.07)', transition: 'box-shadow .15s' }}>
              <SearchBarInner r={stickyInputRef} sticky />
            </div>
          </div>
        </div>
      )}

      {/* ── Hero ── */}
      <div style={{ position: 'relative', height: 'min(60vw, 420px)', minHeight: 300, overflow: 'hidden', background: '#1a1a1a' }}>
        {loading
          ? <div className="shimmer" style={{ position: 'absolute', inset: 0 }} />
          : walls.map((wp, i) => (
            <img key={wp.id} src={wp.thumbnail || wp.url} alt={wp.title}
              style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: i === heroIdx ? (fading ? 0 : 1) : 0, transition: 'opacity .45s ease' }} />
          ))
        }
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(0,0,0,0.28) 0%, transparent 28%, transparent 48%, rgba(0,0,0,0.72) 100%)' }} />

        {!isSticky && (
          <button className="back-btn" onClick={goBack} style={{ position: 'absolute', top: 48, left: 16, zIndex: 20, width: 44, height: 44, borderRadius: 14, background: '#fff', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 2px 12px rgba(0,0,0,0.18)' }}>
            <ChevronLeft size={22} color="#0a0a0a" strokeWidth={2.5} />
          </button>
        )}

        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '0 16px 22px', zIndex: 10 }}>
          {walls[heroIdx] && !loading && (
            <p style={{ fontSize: 12, fontWeight: 500, color: 'rgba(255,255,255,0.65)', marginBottom: 10, letterSpacing: '0.01em', opacity: fading ? 0 : 1, transition: 'opacity .35s ease', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {walls[heroIdx].title}
            </p>
          )}
          <div className="hero-search" style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.97)', backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)', borderRadius: 16, padding: '10px 10px 10px 14px', boxShadow: '0 6px 28px rgba(0,0,0,0.28)', border: '1.5px solid rgba(255,255,255,0.9)', transition: 'box-shadow .15s' }}>
            <SearchBarInner r={inputRef} />
          </div>
          {heroCount > 1 && (
            <div style={{ display: 'flex', gap: 5, alignItems: 'center', justifyContent: 'center', marginTop: 14 }}>
              {Array.from({ length: heroCount }).map((_, i) => (
                <button key={i} className="hero-dot" onClick={() => goSlide(i)}
                  style={{ height: 4, width: i === heroIdx ? 20 : 4, borderRadius: 9, background: i === heroIdx ? '#fff' : 'rgba(255,255,255,0.38)' }} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Sentinel ── */}
      <div ref={sentinelRef} style={{ height: 1, marginTop: -1 }} />

      {/* ── Body ── */}
      <div style={{ background: '#fff' }}>

        {/* Recent */}
        {recent.length > 0 && (
          <div className="fade-up" style={{ padding: '24px 16px 0' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <p style={{ fontSize: 10, fontWeight: 700, color: '#c0c0c0', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Recent</p>
              <button onClick={() => { setRecent([]); localStorage.removeItem('recentSearches'); }} style={{ fontSize: 12, fontWeight: 600, color: '#c0c0c0', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>Clear all</button>
            </div>
            <div style={{ borderRadius: 18, border: '1px solid #f0f0f0', overflow: 'hidden', background: '#fafafa' }}>
              {recent.map((term, i) => (
                <div key={i} className="recent-row" onClick={() => saveAndGo(term)}
                  style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderBottom: i < recent.length - 1 ? '1px solid #f3f3f3' : 'none', background: 'transparent' }}>
                  <div style={{ width: 30, height: 30, borderRadius: 10, background: '#f0f0f0', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Search size={12} color="#ccc" strokeWidth={2} />
                  </div>
                  <span style={{ flex: 1, fontSize: 14, color: '#0a0a0a', fontWeight: 500 }}>{term}</span>
                  <button onClick={e => removeRecent(term, e)} style={{ width: 22, height: 22, borderRadius: '50%', background: '#ebebeb', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                    <X size={9} color="#bbb" strokeWidth={2.5} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Collections */}
        <div style={{ paddingTop: 28 }}>
          <div style={{ padding: '0 16px', marginBottom: 16 }}>
            <p style={{ fontSize: 10, fontWeight: 700, color: '#c0c0c0', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 5 }}>Explore collections</p>
            <p style={{ fontSize: 21, fontWeight: 700, color: '#0a0a0a', lineHeight: 1.15, fontFamily: "'Instrument Serif', Georgia, serif", fontStyle: 'italic' }}>Bring your screen to life</p>
          </div>
          <div className="h-scroll">
            {COLLECTIONS.map(col => {
              const wp = walls[col.wallOffset % (walls.length || 1)];
              return (
                <div key={col.title} className="col-card" onClick={() => saveAndGo(col.title)}
                  style={{ width: 148, borderRadius: 18, overflow: 'hidden', background: '#f0f0f0', border: '1px solid #ebebeb', boxShadow: '0 2px 10px rgba(0,0,0,0.06)' }}>
                  <div style={{ width: '100%', height: 108, position: 'relative', overflow: 'hidden', background: '#e8e8e8' }}>
                    {wp ? <img src={wp.thumbnail || wp.url} alt={col.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <div className="shimmer" style={{ position: 'absolute', inset: 0 }} />}
                    <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, transparent 50%, rgba(0,0,0,0.3) 100%)' }} />
                  </div>
                  <div style={{ padding: '10px 12px 13px' }}>
                    <p style={{ fontSize: 13, fontWeight: 700, color: '#0a0a0a', marginBottom: 2 }}>{col.title}</p>
                    <p style={{ fontSize: 11, color: '#bbb' }}>{col.sub}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Trending Tags */}
        <div style={{ padding: '28px 16px 48px' }}>
          <div style={{ marginBottom: 16 }}>
            <p style={{ fontSize: 10, fontWeight: 700, color: '#c0c0c0', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 5 }}>Ideas for you</p>
            <p style={{ fontSize: 21, fontWeight: 700, color: '#0a0a0a', lineHeight: 1.15, fontFamily: "'Instrument Serif', Georgia, serif", fontStyle: 'italic' }}>Trending now</p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {TAGS.map(({ label, img }, i) => (
              <div key={label} className="tag-card" onClick={() => saveAndGo(label)}
                style={{ borderRadius: 16, overflow: 'hidden', minHeight: i % 5 === 0 ? 120 : 88, position: 'relative', background: '#e8e8e8', border: '1px solid #ebebeb' }}>
                <img src={img} alt={label} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(0,0,0,0.05) 0%, rgba(0,0,0,0.6) 100%)' }} />
                <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '10px 12px 12px' }}>
                  <p style={{ fontSize: 14, fontWeight: 700, color: '#fff', lineHeight: 1.2 }}>{label}</p>
                  <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.55)', marginTop: 2 }}>wallpapers</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
