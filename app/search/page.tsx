'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Camera, ChevronLeft, X } from 'lucide-react';
import { startLoader } from '@/app/components/TopLoader';

// ── Static data ────────────────────────────────────────────────
const HERO_SLIDES = [
  { tag: 'Dark Aesthetic',  label: 'Moody & cinematic',  gradient: 'linear-gradient(160deg,#0d0d0d 0%,#1a0a2e 60%,#0d0d0d 100%)', accent: '#9b5de5' },
  { tag: 'Nature',          label: 'Into the wild',       gradient: 'linear-gradient(160deg,#0a1a0a 0%,#0d2b1a 60%,#0a1a0a 100%)', accent: '#06d6a0' },
  { tag: 'Minimal',         label: 'Less is everything',  gradient: 'linear-gradient(160deg,#111 0%,#1c1c1c 60%,#111 100%)',       accent: '#e8e8e8' },
  { tag: 'Space',           label: 'Beyond the horizon',  gradient: 'linear-gradient(160deg,#020818 0%,#0a1628 60%,#020818 100%)', accent: '#4cc9f0' },
];

const COLLECTIONS = [
  { title: 'Ultra Dark',   sub: 'Amoled · 240 walls',    colors: ['#0a0a0a','#141414','#1a0a2e','#0d0d0d'] },
  { title: 'Neon City',    sub: 'Cyberpunk · 180 walls',  colors: ['#0d0221','#1a0530','#2d0a4e','#120318'] },
  { title: 'Soft Pastel',  sub: 'Dreamy · 95 walls',      colors: ['#fce4ec','#f8bbd0','#f3e5f5','#ede7f6'] },
  { title: 'Abstract',     sub: 'Digital art · 310 walls',colors: ['#1a237e','#283593','#0d47a1','#1565c0'] },
  { title: 'Anime',        sub: 'Fan art · 420 walls',    colors: ['#b71c1c','#880e4f','#4a148c','#1a237e'] },
];

const TRENDING_TAGS = [
  'Lofi','Amoled','Retro','Cyberpunk','Ocean',
  'Mountains','Cars','Botanical','Geometric','Film',
];

// ── CSS ────────────────────────────────────────────────────────
const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=DM+Sans:wght@300;400;500;600;700&display=swap');
  * { box-sizing: border-box; }

  @keyframes fadeUp   { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
  @keyframes heroPan  { 0%{transform:scale(1.05) translateX(0)} 100%{transform:scale(1.05) translateX(-1.5%)} }

  .fade-up  { animation: fadeUp .3s ease forwards; }
  .hero-bg  { animation: heroPan 9s ease-in-out infinite alternate; will-change:transform; }

  .search-wrap:focus-within .search-inner {
    border-color: rgba(255,255,255,0.2) !important;
    background: rgba(255,255,255,0.11) !important;
  }

  .col-card { transition: transform .18s ease, box-shadow .18s ease; cursor: pointer; }
  .col-card:hover  { transform: translateY(-4px); box-shadow: 0 14px 36px rgba(0,0,0,0.6) !important; }
  .col-card:active { transform: scale(.97); }

  .recent-row { transition: background .1s; cursor: pointer; }
  .recent-row:hover  { background: rgba(255,255,255,0.06) !important; }
  .recent-row:active { background: rgba(255,255,255,0.1) !important; }

  .hero-dot { transition: width .3s ease, opacity .3s ease; border: none; padding: 0; cursor: pointer; }

  .h-scroll::-webkit-scrollbar { display: none; }
  .h-scroll { -ms-overflow-style: none; scrollbar-width: none; }
`;

// ── Colour mosaic ──────────────────────────────────────────────
function ColourMosaic({ colors }: { colors: string[] }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gridTemplateRows: '1fr 1fr', width: '100%', height: '100%' }}>
      {colors.map((c, i) => <div key={i} style={{ background: c }} />)}
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────
export default function SearchPage() {
  const router    = useRouter();
  const inputRef  = useRef<HTMLInputElement>(null);
  const timerRef  = useRef<ReturnType<typeof setInterval> | null>(null);

  const [query,   setQuery]   = useState('');
  const [recent,  setRecent]  = useState<string[]>([]);
  const [heroIdx, setHeroIdx] = useState(0);
  const [fading,  setFading]  = useState(false);

  useEffect(() => {
    try { const s = localStorage.getItem('recentSearches'); if (s) setRecent(JSON.parse(s)); } catch {}
    setTimeout(() => inputRef.current?.focus(), 120);

    timerRef.current = setInterval(() => {
      setFading(true);
      setTimeout(() => { setHeroIdx(i => (i + 1) % HERO_SLIDES.length); setFading(false); }, 380);
    }, 5200);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  const goSlide = (i: number) => {
    if (i === heroIdx) return;
    setFading(true);
    setTimeout(() => { setHeroIdx(i); setFading(false); }, 350);
  };

  const saveAndGo = (q: string) => {
    const t = q.trim();
    if (!t) return;
    try {
      const raw  = localStorage.getItem('recentSearches');
      const prev = raw ? JSON.parse(raw) : [];
      const next = [t, ...prev.filter((s: string) => s.toLowerCase() !== t.toLowerCase())].slice(0, 6);
      localStorage.setItem('recentSearches', JSON.stringify(next));
    } catch {}
    startLoader();
    router.push(`/search/${encodeURIComponent(t)}`);
  };

  const removeRecent = (term: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const next = recent.filter(s => s !== term);
    setRecent(next);
    localStorage.setItem('recentSearches', JSON.stringify(next));
  };

  const slide = HERO_SLIDES[heroIdx];

  return (
    <div style={{ minHeight: '100dvh', background: '#0a0a0a', fontFamily: "'DM Sans', system-ui, sans-serif", color: '#fff' }}>
      <style>{CSS}</style>

      {/* ══════ HERO ══════ */}
      <div style={{ position: 'relative', height: 'min(52vw, 320px)', minHeight: 210, overflow: 'hidden' }}>

        {/* Animated gradient bg */}
        <div className="hero-bg" style={{
          position: 'absolute', inset: '-5%',
          background: slide.gradient,
          opacity: fading ? 0 : 1,
          transition: 'opacity .38s ease',
        }} />

        {/* Accent glow */}
        <div style={{
          position: 'absolute', inset: 0,
          background: `radial-gradient(ellipse 65% 55% at 72% 38%, ${slide.accent}28, transparent 68%)`,
          opacity: fading ? 0 : 1,
          transition: 'opacity .38s ease',
        }} />

        {/* Grain */}
        <div style={{
          position: 'absolute', inset: 0, opacity: 0.55,
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.045'/%3E%3C/svg%3E")`,
        }} />

        {/* Bottom fade */}
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '60%', background: 'linear-gradient(to bottom, transparent, #0a0a0a)' }} />

        {/* Back */}
        <button onClick={() => { startLoader(); router.back(); }}
          style={{ position: 'absolute', top: 14, left: 14, zIndex: 10, width: 36, height: 36, borderRadius: '50%', background: 'rgba(0,0,0,0.38)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
          <ChevronLeft size={18} color="#fff" strokeWidth={2.5} />
        </button>

        {/* Hero label + title */}
        <div style={{
          position: 'absolute', bottom: 42, left: 20,
          opacity: fading ? 0 : 1,
          transform: fading ? 'translateY(6px)' : 'translateY(0)',
          transition: 'opacity .35s ease, transform .35s ease',
        }}>
          <p style={{ margin: '0 0 5px', fontSize: 10, fontWeight: 600, color: slide.accent, textTransform: 'uppercase', letterSpacing: '0.14em' }}>
            {slide.label}
          </p>
          <p style={{ margin: 0, fontSize: 28, fontWeight: 700, fontFamily: "'Playfair Display', serif", lineHeight: 1.1, color: '#fff' }}>
            {slide.tag}
          </p>
        </div>

        {/* Dot nav */}
        <div style={{ position: 'absolute', bottom: 16, left: 20, display: 'flex', gap: 5, alignItems: 'center' }}>
          {HERO_SLIDES.map((_, i) => (
            <button key={i} className="hero-dot" onClick={() => goSlide(i)}
              style={{ height: 5, width: i === heroIdx ? 22 : 5, borderRadius: 9, background: i === heroIdx ? slide.accent : 'rgba(255,255,255,0.22)', opacity: i === heroIdx ? 1 : 0.5 }} />
          ))}
        </div>
      </div>

      {/* ══════ STICKY SEARCH ══════ */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 30,
        background: 'rgba(10,10,10,0.9)',
        backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        padding: '10px 14px',
      }}>
        <div className="search-wrap" style={{ display: 'flex', alignItems: 'center', gap: 10, maxWidth: 680, margin: '0 auto' }}>
          <div className="search-inner"
            style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: 'rgba(255,255,255,0.08)', borderRadius: 14, border: '1.5px solid rgba(255,255,255,0.08)', transition: 'all .15s' }}>
            <Search size={14} color="rgba(255,255,255,0.38)" strokeWidth={2} style={{ flexShrink: 0 }} />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') saveAndGo(query); }}
              placeholder="Search wallpapers…"
              style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', fontSize: 14, color: '#fff', fontFamily: 'inherit' }}
            />
            {query
              ? <button onClick={() => { setQuery(''); inputRef.current?.focus(); }}
                  style={{ width: 18, height: 18, borderRadius: '50%', background: 'rgba(255,255,255,0.2)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                  <X size={10} color="#fff" strokeWidth={2.5} />
                </button>
              : <Camera size={14} color="rgba(255,255,255,0.3)" strokeWidth={2} />
            }
          </div>
          <button
            onClick={() => saveAndGo(query)}
            disabled={!query.trim()}
            style={{
              height: 40, padding: '0 18px', borderRadius: 13,
              background: query.trim() ? '#fff' : 'rgba(255,255,255,0.1)',
              color: query.trim() ? '#0a0a0a' : 'rgba(255,255,255,0.22)',
              border: 'none', fontSize: 13, fontWeight: 700,
              cursor: query.trim() ? 'pointer' : 'default',
              fontFamily: 'inherit', flexShrink: 0, transition: 'all .15s',
            }}>
            Go
          </button>
        </div>
      </div>

      {/* ══════ BODY ══════ */}
      <div style={{ maxWidth: 680, margin: '0 auto' }}>

        {/* Recent searches */}
        {recent.length > 0 && (
          <div className="fade-up" style={{ padding: '24px 16px 0' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <p style={{ margin: 0, fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.28)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Recent</p>
              <button onClick={() => { setRecent([]); localStorage.removeItem('recentSearches'); }}
                style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.28)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
                Clear all
              </button>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 18, border: '1px solid rgba(255,255,255,0.07)', overflow: 'hidden' }}>
              {recent.map((term, i) => (
                <div key={i} className="recent-row"
                  onClick={() => saveAndGo(term)}
                  style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderBottom: i < recent.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none', background: 'transparent' }}>
                  <div style={{ width: 30, height: 30, borderRadius: 10, background: 'rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Search size={12} color="rgba(255,255,255,0.3)" strokeWidth={2} />
                  </div>
                  <span style={{ flex: 1, fontSize: 14, color: 'rgba(255,255,255,0.8)', fontWeight: 400 }}>{term}</span>
                  <button onClick={e => removeRecent(term, e)}
                    style={{ width: 22, height: 22, borderRadius: '50%', background: 'rgba(255,255,255,0.08)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                    <X size={9} color="rgba(255,255,255,0.38)" strokeWidth={2.5} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Featured Collections */}
        <div style={{ padding: '28px 0 0' }}>
          <div style={{ padding: '0 16px', marginBottom: 16 }}>
            <p style={{ margin: '0 0 4px', fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.28)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Explore featured collections</p>
            <p style={{ margin: 0, fontSize: 21, fontWeight: 700, fontFamily: "'Playfair Display', serif", color: '#fff', lineHeight: 1.2 }}>Bring your screen to life</p>
          </div>

          <div className="h-scroll" style={{ display: 'flex', gap: 10, paddingLeft: 16, paddingRight: 16, overflowX: 'auto' }}>
            {COLLECTIONS.map((col, i) => (
              <div key={i} className="col-card"
                onClick={() => saveAndGo(col.title)}
                style={{ width: 150, flexShrink: 0, borderRadius: 18, overflow: 'hidden', background: '#111', boxShadow: '0 4px 20px rgba(0,0,0,0.5)' }}>
                <div style={{ width: '100%', height: 108, overflow: 'hidden', borderRadius: '18px 18px 0 0' }}>
                  <ColourMosaic colors={col.colors} />
                </div>
                <div style={{ padding: '10px 12px 13px' }}>
                  <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#fff', marginBottom: 2 }}>{col.title}</p>
                  <p style={{ margin: 0, fontSize: 11, color: 'rgba(255,255,255,0.32)' }}>{col.sub}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Trending Tags Grid */}
        <div style={{ padding: '28px 16px 48px' }}>
          <div style={{ marginBottom: 16 }}>
            <p style={{ margin: '0 0 4px', fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.28)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Ideas for you</p>
            <p style={{ margin: 0, fontSize: 21, fontWeight: 700, fontFamily: "'Playfair Display', serif", color: '#fff', lineHeight: 1.2 }}>Trending now</p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {TRENDING_TAGS.map((tag, i) => {
              const tall = i % 5 === 0;
              const h    = `hsl(${(i * 49) % 360},28%,13%)`;
              const h2   = `hsl(${(i * 49 + 55) % 360},22%,19%)`;
              return (
                <div key={tag} className="col-card"
                  onClick={() => saveAndGo(tag)}
                  style={{
                    borderRadius: 16,
                    background: `linear-gradient(135deg, ${h} 0%, ${h2} 100%)`,
                    border: '1px solid rgba(255,255,255,0.06)',
                    padding: tall ? '26px 16px 16px' : '20px 16px 14px',
                    display: 'flex', alignItems: 'flex-end',
                    minHeight: tall ? 112 : 82,
                  }}>
                  <div>
                    <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#fff', fontFamily: "'Playfair Display', serif", lineHeight: 1.2 }}>{tag}</p>
                    <p style={{ margin: '3px 0 0', fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>wallpapers</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
}
