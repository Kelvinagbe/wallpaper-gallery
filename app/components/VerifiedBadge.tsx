'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { X, ChevronLeft, Clock, TrendingUp, User } from 'lucide-react';
import { WallpaperCard } from '@/app/components/WallpaperCard';
import { VerifiedBadge } from '@/app/components/VerifiedBadge';
import { searchWallpapers, searchProfiles } from '@/lib/stores/wallpaperStore';
import type { Wallpaper, UserProfile } from '@/app/types';

const TRENDING = ['Nature', 'Abstract', 'Dark', 'Minimal', 'Anime', 'Space', 'Ocean', 'Mountains'];
type Tab = 'wallpapers' | 'people';

export default function SearchPage() {
  const router   = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [query,    setQuery]    = useState('');
  const [tab,      setTab]      = useState<Tab>('wallpapers');
  const [recent,   setRecent]   = useState<string[]>([]);
  const [walls,    setWalls]    = useState<Wallpaper[]>([]);
  const [people,   setPeople]   = useState<UserProfile[]>([]);
  const [loading,  setLoading]  = useState(false);

  useEffect(() => {
    try { const s = localStorage.getItem('recentSearches'); if (s) setRecent(JSON.parse(s)); } catch {}
    setTimeout(() => inputRef.current?.focus(), 100);
  }, []);

  const saveRecent = (q: string) => {
    const next = [q, ...recent.filter(s => s.toLowerCase() !== q.toLowerCase())].slice(0, 5);
    setRecent(next);
    localStorage.setItem('recentSearches', JSON.stringify(next));
  };

  const removeRecent = (term: string) => {
    const next = recent.filter(s => s !== term);
    setRecent(next);
    localStorage.setItem('recentSearches', JSON.stringify(next));
  };

  const doSearch = async (q: string, t: Tab = tab) => {
    if (!q.trim()) { setWalls([]); setPeople([]); return; }
    setLoading(true);
    try {
      if (t === 'wallpapers') {
        const { wallpapers } = await searchWallpapers(q.trim());
        setWalls(wallpapers);
      } else {
        const { profiles } = await searchProfiles(q.trim());
        setPeople(profiles);
      }
      saveRecent(q.trim());
    } catch { setWalls([]); setPeople([]); }
    finally { setLoading(false); }
  };

  const handleInput = (q: string) => {
    setQuery(q);
    if (debounce.current) clearTimeout(debounce.current);
    if (!q.trim()) { setWalls([]); setPeople([]); return; }
    debounce.current = setTimeout(() => doSearch(q, tab), 400);
  };

  const handleTab = (t: Tab) => {
    setTab(t);
    if (query.trim()) doSearch(query, t);
  };

  const handleClear = () => { setQuery(''); setWalls([]); setPeople([]); inputRef.current?.focus(); };

  const results = tab === 'wallpapers' ? walls : people;
  const hasResults = results.length > 0;

  return (
    <div style={{ minHeight: '100dvh', background: '#fff', fontFamily: 'system-ui, sans-serif', color: '#0a0a0a' }}>
      <style>{`
        @keyframes fadeUp   { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
        @keyframes pulseDot { 0%,100%{opacity:.3;transform:scale(.8)} 50%{opacity:1;transform:scale(1)} }
        .fade-up    { animation: fadeUp .25s ease forwards; }
        .pulse-dot  { animation: pulseDot 1.2s ease-in-out infinite; }
        .tag-btn:active  { transform: scale(.95); }
        .tag-btn { transition: all .15s; }
        .user-row:active { background: rgba(0,0,0,0.03) !important; }
        .user-row { transition: background .1s; }
      `}</style>

      {/* ── Header ── */}
      <div style={{ position: 'sticky', top: 0, zIndex: 20, background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px', maxWidth: 720, margin: '0 auto' }}>
          {/* Back */}
          <button onClick={() => router.back()} style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(0,0,0,0.05)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
            <ChevronLeft size={18} color="#0a0a0a" strokeWidth={2.5} />
          </button>

          {/* Search input */}
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: 'rgba(0,0,0,0.04)', borderRadius: 14, border: '1px solid transparent', transition: 'border-color .15s' }}
            onFocus={e => (e.currentTarget.style.borderColor = 'rgba(0,0,0,0.15)')}
            onBlur={e  => (e.currentTarget.style.borderColor = 'transparent')}>
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={e => handleInput(e.target.value)}
              placeholder={tab === 'wallpapers' ? 'Search wallpapers...' : 'Search people by username...'}
              style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', fontSize: 14, color: '#0a0a0a', fontFamily: 'inherit' }}
            />
            {query && (
              <button onClick={handleClear} style={{ width: 18, height: 18, borderRadius: '50%', background: 'rgba(0,0,0,0.2)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
                <X size={10} color="#fff" strokeWidth={2.5} />
              </button>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', padding: '0 16px', maxWidth: 720, margin: '0 auto', gap: 0 }}>
          {(['wallpapers', 'people'] as Tab[]).map(t => (
            <button key={t} onClick={() => handleTab(t)}
              style={{ flex: 1, padding: '10px 0', background: 'none', border: 'none', borderBottom: `2px solid ${tab === t ? '#0a0a0a' : 'transparent'}`, fontSize: 13, fontWeight: tab === t ? 700 : 500, color: tab === t ? '#0a0a0a' : 'rgba(0,0,0,0.4)', cursor: 'pointer', fontFamily: 'inherit', transition: 'all .15s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, textTransform: 'capitalize' }}>
              {t === 'people' && <User size={13} />}
              {t === 'wallpapers' ? 'Wallpapers' : 'People'}
            </button>
          ))}
        </div>
      </div>

      {/* ── Body ── */}
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '20px 16px' }}>

        {!query ? (
          <div className="fade-up" style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>

            {/* Recent */}
            {recent.length > 0 && (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Clock size={13} color="rgba(0,0,0,0.35)" />
                    <span style={{ fontSize: 11, fontWeight: 700, color: 'rgba(0,0,0,0.35)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Recent</span>
                  </div>
                  <button onClick={() => { setRecent([]); localStorage.removeItem('recentSearches'); }}
                    style={{ fontSize: 12, fontWeight: 600, color: 'rgba(0,0,0,0.4)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>Clear</button>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {recent.map((term, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 12px 7px 14px', background: 'rgba(0,0,0,0.04)', borderRadius: 24, border: '1px solid rgba(0,0,0,0.07)' }}>
                      <button onClick={() => handleInput(term)} style={{ fontSize: 13, color: '#0a0a0a', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', padding: 0 }}>{term}</button>
                      <button onClick={() => removeRecent(term)} style={{ width: 16, height: 16, borderRadius: '50%', background: 'rgba(0,0,0,0.12)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                        <X size={8} color="rgba(0,0,0,0.5)" strokeWidth={2.5} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Trending */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
                <TrendingUp size={13} color="rgba(0,0,0,0.35)" />
                <span style={{ fontSize: 11, fontWeight: 700, color: 'rgba(0,0,0,0.35)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Trending</span>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {TRENDING.map(tag => (
                  <button key={tag} className="tag-btn" onClick={() => handleInput(tag)}
                    style={{ padding: '8px 18px', borderRadius: 24, border: '1px solid rgba(0,0,0,0.1)', background: '#fff', fontSize: 13, fontWeight: 500, color: '#0a0a0a', cursor: 'pointer', fontFamily: 'inherit' }}>
                    {tag}
                  </button>
                ))}
              </div>
            </div>
          </div>

        ) : loading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '80px 0', gap: 6 }}>
            {[0, 200, 400].map((d, i) => (
              <div key={i} className="pulse-dot" style={{ width: 7, height: 7, borderRadius: '50%', background: 'rgba(0,0,0,0.25)', animationDelay: `${d}ms` }} />
            ))}
          </div>

        ) : hasResults ? (
          <div className="fade-up">
            <p style={{ fontSize: 11, fontWeight: 700, color: 'rgba(0,0,0,0.35)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 14 }}>
              {results.length} result{results.length !== 1 ? 's' : ''} for "{query}"
            </p>

            {tab === 'wallpapers' ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
                {walls.map((wp, i) => <WallpaperCard key={wp.id} wp={wp} placeholderIndex={i} />)}
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', background: '#fafafa', borderRadius: 16, border: '1px solid rgba(0,0,0,0.06)', overflow: 'hidden' }}>
                {people.map((user, i) => (
                  <button key={user.id} className="user-row" onClick={() => router.push(`/user/${user.id}`)}
                    style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '13px 16px', background: 'transparent', border: 'none', borderBottom: i < people.length - 1 ? '1px solid rgba(0,0,0,0.05)' : 'none', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left' }}>
                    <img src={user.avatar} alt={user.name} style={{ width: 46, height: 46, borderRadius: '50%', objectFit: 'cover', border: '1.5px solid rgba(0,0,0,0.07)', flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 2 }}>
                        <p style={{ fontSize: 14, fontWeight: 600, color: '#0a0a0a', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.name}</p>
                        {user.verified && <VerifiedBadge size="sm" />}
                      </div>
                      <p style={{ fontSize: 12, color: 'rgba(0,0,0,0.38)', margin: 0 }}>{user.username}</p>
                    </div>

                  </button>
                ))}
              </div>
            )}
          </div>

        ) : (
          <div className="fade-up" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 0', gap: 10, textAlign: 'center' }}>
            <div style={{ width: 52, height: 52, borderRadius: 16, background: 'rgba(0,0,0,0.04)', border: '1px solid rgba(0,0,0,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontSize: 20, opacity: 0.2 }}>🔍</span>
            </div>
            <p style={{ fontSize: 15, fontWeight: 600, color: '#0a0a0a', margin: 0 }}>No results found</p>
            <p style={{ fontSize: 13, color: 'rgba(0,0,0,0.38)', margin: 0 }}>
              Try "{query}" with different keywords
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
