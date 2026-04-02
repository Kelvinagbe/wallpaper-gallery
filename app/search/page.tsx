'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, Clock, TrendingUp, Search, X } from 'lucide-react';
import { startLoader } from '@/app/components/TopLoader';

const TRENDING = ['Nature', 'Abstract', 'Dark', 'Minimal', 'Anime', 'Space', 'Ocean', 'Mountains'];

const CSS = `
  @keyframes fadeUp { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:translateY(0)} }
  .fade-up { animation: fadeUp .2s ease forwards; }
  .tag-btn  { transition: background .12s, transform .1s; }
  .tag-btn:hover  { background: rgba(0,0,0,0.07) !important; }
  .tag-btn:active { transform: scale(.96); }
  .row-btn  { transition: background .1s; }
  .row-btn:hover  { background: rgba(0,0,0,0.03) !important; }
  .row-btn:active { background: rgba(0,0,0,0.06) !important; }
`;

export default function SearchPage() {
  const router   = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query,  setQuery]  = useState('');
  const [recent, setRecent] = useState<string[]>([]);

  useEffect(() => {
    try {
      const s = localStorage.getItem('recentSearches');
      if (s) setRecent(JSON.parse(s));
    } catch {}
    setTimeout(() => inputRef.current?.focus(), 80);
  }, []);

  const saveAndGo = (q: string) => {
    const trimmed = q.trim();
    if (!trimmed) return;
    const next = [trimmed, ...recent.filter(s => s.toLowerCase() !== trimmed.toLowerCase())].slice(0, 6);
    localStorage.setItem('recentSearches', JSON.stringify(next));
    startLoader();
    router.push(`/search/${encodeURIComponent(trimmed)}`);
  };

  const removeRecent = (term: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const next = recent.filter(s => s !== term);
    setRecent(next);
    localStorage.setItem('recentSearches', JSON.stringify(next));
  };

  const clearAll = () => {
    setRecent([]);
    localStorage.removeItem('recentSearches');
  };

  return (
    <div style={{ minHeight: '100dvh', background: '#fff', fontFamily: 'system-ui,sans-serif', color: '#0a0a0a' }}>
      <style>{CSS}</style>

      {/* ── Header ── */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 20,
        background: 'rgba(255,255,255,0.96)',
        backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
        borderBottom: '1px solid rgba(0,0,0,0.06)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px', maxWidth: 680, margin: '0 auto' }}>

          <button
            onClick={() => { startLoader(); router.back(); }}
            style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(0,0,0,0.05)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
            <ChevronLeft size={18} color="#0a0a0a" strokeWidth={2.5} />
          </button>

          {/* Input row */}
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8, padding: '9px 14px', background: 'rgba(0,0,0,0.05)', borderRadius: 14, border: '1.5px solid transparent', transition: 'border-color .15s' }}
            onFocus={e => (e.currentTarget.style.borderColor = 'rgba(0,0,0,0.14)')}
            onBlur={e  => (e.currentTarget.style.borderColor = 'transparent')}
          >
            <Search size={14} color="rgba(0,0,0,0.3)" strokeWidth={2.5} style={{ flexShrink: 0 }} />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') saveAndGo(query); }}
              placeholder="Search wallpapers…"
              style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', fontSize: 14, color: '#0a0a0a', fontFamily: 'inherit' }}
            />
            {query && (
              <button onClick={() => { setQuery(''); inputRef.current?.focus(); }}
                style={{ width: 18, height: 18, borderRadius: '50%', background: 'rgba(0,0,0,0.18)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
                <X size={10} color="#fff" strokeWidth={2.5} />
              </button>
            )}
          </div>

          {/* Search button */}
          <button
            onClick={() => saveAndGo(query)}
            disabled={!query.trim()}
            style={{
              height: 36, padding: '0 16px', borderRadius: 12,
              background: query.trim() ? '#0a0a0a' : 'rgba(0,0,0,0.07)',
              color: query.trim() ? '#fff' : 'rgba(0,0,0,0.25)',
              border: 'none', fontSize: 13, fontWeight: 600,
              cursor: query.trim() ? 'pointer' : 'default',
              fontFamily: 'inherit', flexShrink: 0,
              transition: 'background .15s, color .15s',
            }}>
            Go
          </button>
        </div>
      </div>

      {/* ── Body ── */}
      <div style={{ maxWidth: 680, margin: '0 auto', padding: '24px 16px', display: 'flex', flexDirection: 'column', gap: 32 }} className="fade-up">

        {/* Recent */}
        {recent.length > 0 && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Clock size={12} color="rgba(0,0,0,0.3)" />
                <span style={{ fontSize: 10, fontWeight: 700, color: 'rgba(0,0,0,0.3)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Recent</span>
              </div>
              <button onClick={clearAll}
                style={{ fontSize: 12, fontWeight: 600, color: 'rgba(0,0,0,0.35)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
                Clear all
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', background: '#fafafa', borderRadius: 16, border: '1px solid rgba(0,0,0,0.06)', overflow: 'hidden' }}>
              {recent.map((term, i) => (
                <button key={i} className="row-btn"
                  onClick={() => saveAndGo(term)}
                  style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', background: 'transparent', border: 'none', borderBottom: i < recent.length - 1 ? '1px solid rgba(0,0,0,0.05)' : 'none', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left' }}>
                  <div style={{ width: 30, height: 30, borderRadius: 10, background: 'rgba(0,0,0,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Clock size={13} color="rgba(0,0,0,0.3)" />
                  </div>
                  <span style={{ flex: 1, fontSize: 14, color: '#0a0a0a', fontWeight: 500 }}>{term}</span>
                  <button
                    onClick={e => removeRecent(term, e)}
                    style={{ width: 22, height: 22, borderRadius: '50%', background: 'rgba(0,0,0,0.08)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
                    <X size={9} color="rgba(0,0,0,0.4)" strokeWidth={2.5} />
                  </button>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Trending */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 14 }}>
            <TrendingUp size={12} color="rgba(0,0,0,0.3)" />
            <span style={{ fontSize: 10, fontWeight: 700, color: 'rgba(0,0,0,0.3)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Trending</span>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {TRENDING.map(tag => (
              <button key={tag} className="tag-btn" onClick={() => saveAndGo(tag)}
                style={{ padding: '9px 18px', borderRadius: 24, border: '1px solid rgba(0,0,0,0.1)', background: '#fff', fontSize: 13, fontWeight: 500, color: '#0a0a0a', cursor: 'pointer', fontFamily: 'inherit' }}>
                {tag}
              </button>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
