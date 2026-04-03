'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Search, X, ChevronLeft } from 'lucide-react';
import { WallpaperCard } from '@/app/components/WallpaperCard';
import { searchWallpapers } from '@/lib/stores/wallpaperStore';
import { startLoader } from '@/app/components/TopLoader';
import type { Wallpaper } from '@/app/types';

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=DM+Sans:wght@400;500;600;700&display=swap');
  * { box-sizing: border-box; }
  @keyframes fadeUp  { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
  @keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
  .fade-up { animation: fadeUp .28s ease forwards; }
  .shimmer { background:linear-gradient(105deg,#ebebeb 40%,#f8f8f8 50%,#ebebeb 60%); background-size:200% 100%; animation:shimmer 1.5s ease-in-out infinite; }
  .search-wrap:focus-within { box-shadow: 0 0 0 3px rgba(0,0,0,0.09) !important; }
  .back-btn { transition: background .12s, transform .1s; }
  .back-btn:hover  { background: #f0f0f0 !important; }
  .back-btn:active { transform: scale(.94); }
  .go-btn { transition: background .15s, transform .1s; }
  .go-btn:hover  { background: #222 !important; }
  .go-btn:active { transform: scale(.96); }
  .results-grid { columns:2; column-gap:10px; }
  .results-grid-item { break-inside:avoid; margin-bottom:10px; }
  .shimmer-card { break-inside:avoid; margin-bottom:10px; border-radius:16px; overflow:hidden; }
  @media (min-width:480px)  { .results-grid { columns:3; } }
  @media (min-width:768px)  { .results-grid { columns:4; } }
  @media (min-width:1024px) { .results-grid { columns:5; } }
  @media (min-width:1280px) { .results-grid { columns:6; } }
`;

const SHIMMER_HEIGHTS = [180, 140, 220, 160, 200, 150, 190, 130, 210, 170, 180, 145];

function ResultsShimmer() {
  return (
    <div className="results-grid">
      {SHIMMER_HEIGHTS.map((h, i) => (
        <div key={i} className="shimmer-card">
          <div className="shimmer" style={{ height: h, borderRadius: 16 }} />
        </div>
      ))}
    </div>
  );
}

export default function SearchResultsPage({ params }: { params: { query: string } }) {
  const router   = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const decoded  = decodeURIComponent(params.query);

  const [input,      setInput]      = useState(decoded);
  const [walls,      setWalls]      = useState<Wallpaper[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [headerH,    setHeaderH]    = useState(64);
  const headerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setInput(decoded);
    let cancelled = false;
    (async () => {
      setLoading(true);
      try { const { wallpapers } = await searchWallpapers(decoded); if (!cancelled) setWalls(wallpapers); }
      catch { if (!cancelled) setWalls([]); }
      finally { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [decoded]);

  // Measure header height so body padding stays accurate
  useEffect(() => {
    if (!headerRef.current) return;
    const ro = new ResizeObserver(() => { if (headerRef.current) setHeaderH(headerRef.current.offsetHeight); });
    ro.observe(headerRef.current);
    return () => ro.disconnect();
  }, [loading]);

  const goSearch = (q: string) => {
    const t = q.trim();
    if (!t || t.toLowerCase() === decoded.toLowerCase()) return;
    try { const prev = JSON.parse(localStorage.getItem('recentSearches') || '[]'); localStorage.setItem('recentSearches', JSON.stringify([t, ...prev.filter((s: string) => s.toLowerCase() !== t.toLowerCase())].slice(0, 6))); } catch {}
    startLoader(); router.push(`/search/${encodeURIComponent(t)}`);
  };

  return (
    <div style={{ minHeight: '100dvh', background: '#fff', fontFamily: "'DM Sans', system-ui, sans-serif", color: '#0a0a0a' }}>
      <style>{CSS}</style>

      {/* ── Fixed header: no background, bare floating bar ── */}
      <div ref={headerRef} style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100, paddingTop: 'env(safe-area-inset-top, 0px)' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 10 }}>

          {/* Back button — white pill */}
          <button className="back-btn" onClick={() => { startLoader(); router.push('/search'); }}
            style={{ width: 44, height: 44, flexShrink: 0, borderRadius: 14, background: '#fff', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 2px 12px rgba(0,0,0,0.10)' }}>
            <ChevronLeft size={22} color="#0a0a0a" strokeWidth={2.5} />
          </button>

          {/* Search pill */}
          <div className="search-wrap" style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.97)', backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)', borderRadius: 16, padding: '10px 10px 10px 14px', boxShadow: '0 4px 24px rgba(0,0,0,0.10)', border: '1.5px solid rgba(0,0,0,0.07)', transition: 'box-shadow .15s' }}>
            <Search size={15} color="#999" strokeWidth={2} style={{ flexShrink: 0 }} />
            <input ref={inputRef} type="text" value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') goSearch(input); }}
              style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', fontSize: 15, color: '#0a0a0a', fontFamily: 'inherit', fontWeight: 600, minWidth: 0 }} />
            {input.trim() && (
              <button onClick={() => { setInput(''); inputRef.current?.focus(); }}
                style={{ width: 20, height: 20, borderRadius: '50%', background: 'rgba(0,0,0,0.1)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
                <X size={10} color="#666" strokeWidth={2.5} />
              </button>
            )}
            <button className="go-btn" onClick={() => goSearch(input)}
              style={{ height: 34, padding: '0 14px', borderRadius: 11, background: '#0a0a0a', color: '#fff', border: 'none', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0 }}>
              Go
            </button>
          </div>
        </div>

        {/* Result count */}
        {!loading && (
          <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 16px 10px' }}>
            <p style={{ fontSize: 12, color: '#aaa', fontWeight: 500 }}>
              {walls.length > 0
                ? <><span style={{ fontWeight: 700, color: '#0a0a0a' }}>{walls.length}</span> results for <span style={{ fontWeight: 700, color: '#0a0a0a' }}>"{decoded}"</span></>
                : <>No results for <span style={{ fontWeight: 700, color: '#0a0a0a' }}>"{decoded}"</span></>
              }
            </p>
          </div>
        )}
      </div>

      {/* ── Body — padded by measured header height ── */}
      <div style={{ paddingTop: headerH, maxWidth: 1200, margin: '0 auto', padding: `${headerH}px 16px 56px` }}>
        {loading ? <ResultsShimmer /> : walls.length > 0 ? (
          <div className="fade-up results-grid">
            {walls.map((wp, i) => (
              <div key={wp.id} className="results-grid-item">
                <WallpaperCard wp={wp} placeholderIndex={i} />
              </div>
            ))}
          </div>
        ) : (
          <div className="fade-up" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 0', gap: 16, textAlign: 'center' }}>
            <div style={{ width: 72, height: 72, borderRadius: 22, background: '#f4f4f4', border: '1px solid #ebebeb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Search size={28} color="#d0d0d0" strokeWidth={1.5} />
            </div>
            <div>
              <p style={{ fontSize: 18, fontWeight: 700, color: '#0a0a0a', marginBottom: 6, fontFamily: "'Instrument Serif', Georgia, serif", fontStyle: 'italic' }}>Nothing found</p>
              <p style={{ fontSize: 14, color: '#bbb', maxWidth: 260, lineHeight: 1.5 }}>Try shorter or different keywords for "{decoded}"</p>
            </div>
            <button onClick={() => { startLoader(); router.push('/search'); }}
              style={{ marginTop: 8, height: 42, padding: '0 22px', borderRadius: 13, background: '#0a0a0a', color: '#fff', border: 'none', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
              Back to search
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
