'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Search, X, ChevronLeft } from 'lucide-react';
import { fetchHotWallpapers } from '@/lib/stores/wallpaperStore';
import { startLoader } from '@/app/components/TopLoader';
import type { Wallpaper } from '@/app/types';

// ── Cache ──────────────────────────────────────────────────────
const HOT_CACHE_KEY = 'hot_wallpapers';
const HOT_CACHE_TTL = 6 * 60 * 60 * 1000;
const getHotCache = (): Wallpaper[] | null => {
  try {
    const raw = localStorage.getItem(HOT_CACHE_KEY);
    if (!raw) return null;
    const { data, cachedAt } = JSON.parse(raw);
    if (Date.now() - cachedAt > HOT_CACHE_TTL) return null;
    return data;
  } catch { return null; }
};
const setHotCache = (data: Wallpaper[]) => {
  try { localStorage.setItem(HOT_CACHE_KEY, JSON.stringify({ data, cachedAt: Date.now() })); } catch {}
};

// ── Trending tags with matching images ─────────────────────────
const TRENDING_TAGS = [
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

  @keyframes fadeUp  { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
  @keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }

  .fade-up { animation: fadeUp .28s ease forwards; }
  .shimmer {
    background: linear-gradient(105deg,#ebebeb 40%,#f8f8f8 50%,#ebebeb 60%);
    background-size: 200% 100%;
    animation: shimmer 1.5s ease-in-out infinite;
  }

  /* Sticky header transitions */
  .sticky-bar {
    position: sticky;
    top: 0;
    z-index: 50;
    transition: background .2s ease, box-shadow .2s ease, padding .2s ease;
  }
  .sticky-bar.scrolled {
    background: rgba(255,255,255,0.97) !important;
    box-shadow: 0 1px 16px rgba(0,0,0,0.08);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
  }
  .sticky-bar.at-top {
    background: transparent !important;
    box-shadow: none !important;
  }

  .hero-dot { transition: width .3s ease, opacity .3s ease; border: none; padding: 0; cursor: pointer; }

  .col-card { transition: transform .18s ease, box-shadow .18s ease; cursor: pointer; flex-shrink: 0; }
  .col-card:hover  { transform: translateY(-3px); box-shadow: 0 10px 28px rgba(0,0,0,0.14) !important; }
  .col-card:active { transform: scale(.97); }

  .tag-card { transition: transform .15s ease; cursor: pointer; }
  .tag-card:hover  { transform: scale(1.02); }
  .tag-card:active { transform: scale(.97); }

  .recent-row { transition: background .1s; cursor: pointer; }
  .recent-row:hover  { background: #f7f7f7 !important; }

  .back-btn { transition: opacity .15s, transform .1s; }
  .back-btn:active { transform: scale(.94); }

  .go-btn { transition: background .15s; }
  .go-btn:hover { background: #222 !important; }

  .h-scroll { display:flex; gap:10px; overflow-x:auto; padding:0 16px 4px; scroll-snap-type:x mandatory; -webkit-overflow-scrolling:touch; scrollbar-width:none; }
  .h-scroll::-webkit-scrollbar { display:none; }

  /* Responsive tag grid */
  .tag-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
  }
  @media (min-width: 640px)  { .tag-grid { grid-template-columns: repeat(3, 1fr); } }
  @media (min-width: 1024px) { .tag-grid { grid-template-columns: repeat(5, 1fr); } }

  /* Responsive col card width */
  @media (min-width: 640px)  { .col-card { width: 180px !important; } }
  @media (min-width: 1024px) { .col-card { width: 220px !important; } }
`;

export default function SearchPage() {
  const router   = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pauseRef = useRef(false);
  const heroRef  = useRef<HTMLDivElement>(null);

  const [query,    setQuery]    = useState('');
  const [recent,   setRecent]   = useState<string[]>([]);
  const [walls,    setWalls]    = useState<Wallpaper[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [heroIdx,  setHeroIdx]  = useState(0);
  const [fading,   setFading]   = useState(false);
  const [scrolled, setScrolled] = useState(false);

  // ── Fetch ──
  useEffect(() => {
    const cached = getHotCache();
    if (cached?.length) { setWalls(cached); setLoading(false); return; }
    fetchHotWallpapers(10)
      .then(d => { setHotCache(d); setWalls(d); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // ── Recent + focus ──
  useEffect(() => {
    try { const s = localStorage.getItem('recentSearches'); if (s) setRecent(JSON.parse(s)); } catch {}
    setTimeout(() => inputRef.current?.focus(), 180);
  }, []);

  // ── Scroll detection for sticky bar ──
  useEffect(() => {
    const onScroll = () => {
      const heroBottom = heroRef.current?.getBoundingClientRect().bottom ?? 0;
      setScrolled(heroBottom <= 60);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // ── Auto-advance hero ──
  useEffect(() => {
    if (walls.length < 2) return;
    timerRef.current = setInterval(() => {
      if (pauseRef.current) return;
      setFading(true);
      setTimeout(() => { setHeroIdx(i => (i + 1) % Math.min(walls.length, 8)); setFading(false); }, 420);
    }, 4800);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [walls.length]);

  const goSlide = (i: number) => {
    if (i === heroIdx) return;
    pauseRef.current = true;
    setFading(true);
    setTimeout(() => {
      setHeroIdx(i); setFading(false);
      setTimeout(() => { pauseRef.current = false; }, 3000);
    }, 400);
  };

  const saveAndGo = (q: string) => {
    const t = q.trim();
    if (!t) return;
    try {
      const prev = JSON.parse(localStorage.getItem('recentSearches') || '[]');
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

  const heroWall  = walls[heroIdx];
  const heroCount = Math.min(walls.length, 8);

  return (
    <div style={{ minHeight: '100dvh', background: '#fff', fontFamily: "'DM Sans', system-ui, sans-serif", color: '#0a0a0a' }}>
      <style>{CSS}</style>

      {/* ══════════════════════════════════════════
          STICKY SEARCH BAR — floats above hero,
          becomes white + shadow after scrolling past it
      ══════════════════════════════════════════ */}
      <div className={`sticky-bar ${scrolled ? 'scrolled' : 'at-top'}`}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>

          {/* Back — square white */}
          <button
            className="back-btn"
            onClick={() => { startLoader(); router.back(); }}
            style={{
              width: 44, height: 44, borderRadius: 13,
              background: scrolled ? '#f4f4f4' : '#fff',
              border: 'none', flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer',
              boxShadow: scrolled ? 'none' : '0 2px 12px rgba(0,0,0,0.18)',
            }}>
            <ChevronLeft size={22} color="#0a0a0a" strokeWidth={2.5} />
          </button>

          {/* Search input */}
          <div style={{
            flex: 1, display: 'flex', alignItems: 'center', gap: 10,
            background: scrolled ? '#f4f4f4' : 'rgba(255,255,255,0.95)',
            backdropFilter: scrolled ? 'none' : 'blur(20px)',
            borderRadius: 14, padding: '10px 12px',
            boxShadow: scrolled ? 'none' : '0 4px 20px rgba(0,0,0,0.22)',
            border: scrolled ? '1px solid #ececec' : '1.5px solid rgba(255,255,255,0.9)',
            transition: 'all .2s ease',
          }}>
            <Search size={15} color="#aaa" strokeWidth={2} style={{ flexShrink: 0 }} />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') saveAndGo(query); }}
              placeholder="Search wallpapers…"
              style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', fontSize: 15, color: '#0a0a0a', fontFamily: 'inherit', fontWeight: 500, minWidth: 0 }}
            />
            {query.trim() && (
              <button onClick={() => { setQuery(''); inputRef.current?.focus(); }}
                style={{ width: 20, height: 20, borderRadius: '50%', background: 'rgba(0,0,0,0.1)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
                <X size={10} color="#666" strokeWidth={2.5} />
              </button>
            )}
          </div>

          {/* Go button — always visible */}
          <button
            className="go-btn"
            onClick={() => saveAndGo(query)}
            style={{
              height: 44, padding: '0 20px', borderRadius: 13,
              background: '#0a0a0a', color: '#fff',
              border: 'none', fontSize: 14, fontWeight: 700,
              cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0,
              boxShadow: scrolled ? 'none' : '0 4px 16px rgba(0,0,0,0.28)',
              transition: 'all .2s ease',
            }}>
            Go
          </button>
        </div>
      </div>

      {/* ══════════════════════════════════════════
          HERO — full bleed, overlapped by sticky bar
      ══════════════════════════════════════════ */}
      <div
        ref={heroRef}
        style={{
          position: 'relative',
          /* Pull up behind the sticky bar */
          marginTop: -64,
          height: 'min(65vw, 480px)',
          minHeight: 320,
          overflow: 'hidden',
          background: '#111',
        }}>

        {/* Slides */}
        {loading
          ? <div className="shimmer" style={{ position: 'absolute', inset: 0 }} />
          : walls.map((wp, i) => (
            <img key={wp.id} src={wp.thumbnail || wp.url} alt={wp.title}
              style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: i === heroIdx ? (fading ? 0 : 1) : 0, transition: 'opacity .45s ease' }} />
          ))
        }

        {/* Gradient */}
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(0,0,0,0.4) 0%, transparent 30%, transparent 55%, rgba(0,0,0,0.75) 100%)' }} />

        {/* Wallpaper title + dots pinned to bottom */}
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '0 16px 20px', zIndex: 10 }}>
          {heroWall && !loading && (
            <p style={{
              fontSize: 12, fontWeight: 500, color: 'rgba(255,255,255,0.65)',
              marginBottom: 12, letterSpacing: '0.01em',
              opacity: fading ? 0 : 1, transition: 'opacity .35s ease',
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              maxWidth: 400,
            }}>
              {heroWall.title}
            </p>
          )}
          {heroCount > 1 && (
            <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
              {Array.from({ length: heroCount }).map((_, i) => (
                <button key={i} className="hero-dot" onClick={() => goSlide(i)}
                  style={{ height: 4, width: i === heroIdx ? 20 : 4, borderRadius: 9, background: i === heroIdx ? '#fff' : 'rgba(255,255,255,0.35)' }} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ══════════════════════════════════════════
          BODY
      ══════════════════════════════════════════ */}
      <div style={{ background: '#fff', maxWidth: 1200, margin: '0 auto' }}>

        {/* Recent */}
        {recent.length > 0 && (
          <div className="fade-up" style={{ padding: '28px 16px 0' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <p style={{ fontSize: 10, fontWeight: 700, color: '#c0c0c0', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Recent</p>
              <button onClick={() => { setRecent([]); localStorage.removeItem('recentSearches'); }}
                style={{ fontSize: 12, fontWeight: 600, color: '#c0c0c0', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
                Clear all
              </button>
            </div>
            <div style={{ borderRadius: 18, border: '1px solid #f0f0f0', overflow: 'hidden', background: '#fafafa' }}>
              {recent.map((term, i) => (
                <div key={i} className="recent-row"
                  onClick={() => saveAndGo(term)}
                  style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderBottom: i < recent.length - 1 ? '1px solid #f3f3f3' : 'none', background: 'transparent' }}>
                  <div style={{ width: 30, height: 30, borderRadius: 10, background: '#f0f0f0', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Search size={12} color="#ccc" strokeWidth={2} />
                  </div>
                  <span style={{ flex: 1, fontSize: 14, color: '#0a0a0a', fontWeight: 500 }}>{term}</span>
                  <button onClick={e => removeRecent(term, e)}
                    style={{ width: 22, height: 22, borderRadius: '50%', background: '#ebebeb', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                    <X size={9} color="#bbb" strokeWidth={2.5} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Collections */}
        <div style={{ paddingTop: 32 }}>
          <div style={{ padding: '0 16px', marginBottom: 16 }}>
            <p style={{ fontSize: 10, fontWeight: 700, color: '#c0c0c0', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 5 }}>Explore collections</p>
            <p style={{ fontSize: 22, fontWeight: 700, color: '#0a0a0a', lineHeight: 1.15, fontFamily: "'Instrument Serif', Georgia, serif", fontStyle: 'italic' }}>
              Bring your screen to life
            </p>
          </div>
          <div className="h-scroll">
            {COLLECTIONS.map((col) => {
              const wp = walls[col.wallOffset % (walls.length || 1)];
              return (
                <div key={col.title} className="col-card"
                  onClick={() => saveAndGo(col.title)}
                  style={{ width: 148, borderRadius: 18, overflow: 'hidden', background: '#f0f0f0', border: '1px solid #ebebeb', boxShadow: '0 2px 10px rgba(0,0,0,0.06)' }}>
                  <div style={{ width: '100%', height: 110, position: 'relative', overflow: 'hidden', background: '#e8e8e8' }}>
                    {wp
                      ? <img src={wp.thumbnail || wp.url} alt={col.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      : <div className="shimmer" style={{ position: 'absolute', inset: 0 }} />
                    }
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

        {/* Trending */}
        <div style={{ padding: '32px 16px 56px' }}>
          <div style={{ marginBottom: 16 }}>
            <p style={{ fontSize: 10, fontWeight: 700, color: '#c0c0c0', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 5 }}>Ideas for you</p>
            <p style={{ fontSize: 22, fontWeight: 700, color: '#0a0a0a', lineHeight: 1.15, fontFamily: "'Instrument Serif', Georgia, serif", fontStyle: 'italic' }}>
              Trending now
            </p>
          </div>
          <div className="tag-grid">
            {TRENDING_TAGS.map(({ label, img }, i) => {
              const tall = i % 5 === 0;
              return (
                <div key={label} className="tag-card"
                  onClick={() => saveAndGo(label)}
                  style={{ borderRadius: 16, overflow: 'hidden', minHeight: tall ? 130 : 96, position: 'relative', background: '#e8e8e8' }}>
                  <img src={img} alt={label} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
                  <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(0,0,0,0.04) 0%, rgba(0,0,0,0.6) 100%)' }} />
                  <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '10px 12px 12px' }}>
                    <p style={{ fontSize: 14, fontWeight: 700, color: '#fff', lineHeight: 1.2 }}>{label}</p>
                    <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', marginTop: 2 }}>wallpapers</p>
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
