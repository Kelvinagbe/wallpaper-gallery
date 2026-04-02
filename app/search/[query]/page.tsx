'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, Search, X } from 'lucide-react';
import { WallpaperCard } from '@/app/components/WallpaperCard';
import { searchWallpapers } from '@/lib/stores/wallpaperStore';
import { startLoader } from '@/app/components/TopLoader';
import type { Wallpaper } from '@/app/types';

const CSS = `
  @keyframes fadeUp   { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:translateY(0)} }
  @keyframes pulseDot { 0%,100%{opacity:.3;transform:scale(.8)} 50%{opacity:1;transform:scale(1)} }
  .fade-up   { animation: fadeUp .22s ease forwards; }
  .pulse-dot { animation: pulseDot 1.2s ease-in-out infinite; }

  .search-grid {
    columns: 2;
    column-gap: 8px;
  }
  .search-grid-item {
    break-inside: avoid;
    margin-bottom: 8px;
  }
  @media(min-width:480px) { .search-grid { columns: 3; } }
  @media(min-width:720px) { .search-grid { columns: 4; } }
`;

export default function SearchResultsPage({ params }: { params: { query: string } }) {
  const router    = useRouter();
  const inputRef  = useRef<HTMLInputElement>(null);
  const decoded   = decodeURIComponent(params.query);

  const [input,   setInput]   = useState(decoded);
  const [walls,   setWalls]   = useState<Wallpaper[]>([]);
  const [loading, setLoading] = useState(true);

  // ── Fetch on mount (and whenever decoded query changes) ──
  useEffect(() => {
    setInput(decoded);
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const { wallpapers } = await searchWallpapers(decoded);
        if (!cancelled) setWalls(wallpapers);
      } catch {
        if (!cancelled) setWalls([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [decoded]);

  const goSearch = (q: string) => {
    const trimmed = q.trim();
    if (!trimmed || trimmed.toLowerCase() === decoded.toLowerCase()) return;
    // Save to recent
    try {
      const raw  = localStorage.getItem('recentSearches');
      const prev = raw ? JSON.parse(raw) : [];
      const next = [trimmed, ...prev.filter((s: string) => s.toLowerCase() !== trimmed.toLowerCase())].slice(0, 6);
      localStorage.setItem('recentSearches', JSON.stringify(next));
    } catch {}
    startLoader();
    router.push(`/search/${encodeURIComponent(trimmed)}`);
  };

  return (
    <div style={{ minHeight: '100dvh', background: '#fff', fontFamily: 'system-ui,sans-serif', color: '#0a0a0a' }}>
      <style>{CSS}</style>

      {/* ── Sticky header ── */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 20,
        background: 'rgba(255,255,255,0.96)',
        backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
        borderBottom: '1px solid rgba(0,0,0,0.06)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px', maxWidth: 680, margin: '0 auto' }}>

          <button
            onClick={() => { startLoader(); router.push('/search'); }}
            style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(0,0,0,0.05)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
            <ChevronLeft size={18} color="#0a0a0a" strokeWidth={2.5} />
          </button>

          {/* Pre-filled input */}
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8, padding: '9px 14px', background: 'rgba(0,0,0,0.05)', borderRadius: 14, border: '1.5px solid transparent', transition: 'border-color .15s' }}
            onFocus={e => (e.currentTarget.style.borderColor = 'rgba(0,0,0,0.14)')}
            onBlur={e  => (e.currentTarget.style.borderColor = 'transparent')}
          >
            <Search size={14} color="rgba(0,0,0,0.3)" strokeWidth={2.5} style={{ flexShrink: 0 }} />
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') goSearch(input); }}
              style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', fontSize: 14, color: '#0a0a0a', fontFamily: 'inherit', fontWeight: 500 }}
            />
            {input && (
              <button onClick={() => { setInput(''); inputRef.current?.focus(); }}
                style={{ width: 18, height: 18, borderRadius: '50%', background: 'rgba(0,0,0,0.18)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
                <X size={10} color="#fff" strokeWidth={2.5} />
              </button>
            )}
          </div>

          <button
            onClick={() => goSearch(input)}
            disabled={!input.trim()}
            style={{
              height: 36, padding: '0 16px', borderRadius: 12,
              background: input.trim() ? '#0a0a0a' : 'rgba(0,0,0,0.07)',
              color: input.trim() ? '#fff' : 'rgba(0,0,0,0.25)',
              border: 'none', fontSize: 13, fontWeight: 600,
              cursor: input.trim() ? 'pointer' : 'default',
              fontFamily: 'inherit', flexShrink: 0,
              transition: 'background .15s, color .15s',
            }}>
            Go
          </button>
        </div>
      </div>

      {/* ── Body ── */}
      <div style={{ maxWidth: 680, margin: '0 auto', padding: '20px 16px' }}>

        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '100px 0', gap: 6 }}>
            {[0, 180, 360].map((d, i) => (
              <div key={i} className="pulse-dot" style={{ width: 7, height: 7, borderRadius: '50%', background: 'rgba(0,0,0,0.22)', animationDelay: `${d}ms` }} />
            ))}
          </div>

        ) : walls.length > 0 ? (
          <div className="fade-up">
            {/* Result count */}
            <p style={{ fontSize: 11, fontWeight: 700, color: 'rgba(0,0,0,0.3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 16 }}>
              {walls.length} result{walls.length !== 1 ? 's' : ''} for "{decoded}"
            </p>

            <div className="search-grid">
              {walls.map((wp, i) => (
                <div key={wp.id} className="search-grid-item">
                  <WallpaperCard wp={wp} placeholderIndex={i} />
                </div>
              ))}
            </div>
          </div>

        ) : (
          <div className="fade-up" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '100px 0', gap: 12, textAlign: 'center' }}>
            <div style={{ width: 56, height: 56, borderRadius: 18, background: 'rgba(0,0,0,0.04)', border: '1px solid rgba(0,0,0,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontSize: 22, opacity: 0.25 }}>🔍</span>
            </div>
            <div>
              <p style={{ fontSize: 15, fontWeight: 700, color: '#0a0a0a', margin: '0 0 4px' }}>No results for "{decoded}"</p>
              <p style={{ fontSize: 13, color: 'rgba(0,0,0,0.38)', margin: 0 }}>Try different or shorter keywords</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
