
'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { fetchHotWallpapers } from '@/lib/stores/wallpaperStore';
import { startLoader } from '@/app/components/TopLoader';
import type { Wallpaper } from '@/app/types';

const HOT_COLORS = [
  'linear-gradient(145deg,#0f0c29,#302b63,#24243e)',
  'linear-gradient(145deg,#1a0533,#2d1b69,#11998e)',
  'linear-gradient(145deg,#0a0a0a,#1a1a2e,#16213e)',
  'linear-gradient(145deg,#1b0000,#3d0000,#7b2d00)',
  'linear-gradient(145deg,#001a00,#003300,#005500)',
  'linear-gradient(145deg,#160a2c,#0f3460,#533483)',
  'linear-gradient(145deg,#0d0d0d,#1a1a1a,#2c2c54)',
  'linear-gradient(145deg,#1a0010,#3d0030,#600050)',
  'linear-gradient(145deg,#001020,#002040,#003060)',
  'linear-gradient(145deg,#1a1000,#3d2800,#604000)',
];

const HOT_CACHE_KEY = 'hot_wallpapers';
const HOT_CACHE_TTL = 6 * 60 * 60 * 1000; // 6 hours

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
  try {
    localStorage.setItem(HOT_CACHE_KEY, JSON.stringify({ data, cachedAt: Date.now() }));
  } catch { /**/ }
};

const CARD_WIDTH = 110;
const CARD_GAP = 10;
const SCROLL_STEP = CARD_WIDTH + CARD_GAP;
const AUTO_SCROLL_INTERVAL = 2200;

const getRankStyle = (rank: number) => {
  if (rank === 1) return { background: 'linear-gradient(135deg,rgba(255,180,0,.85),rgba(255,120,0,.85))', borderColor: 'rgba(255,220,100,.4)' };
  if (rank === 2) return { background: 'linear-gradient(135deg,rgba(180,180,200,.85),rgba(140,140,160,.85))', borderColor: 'rgba(220,220,240,.3)' };
  if (rank === 3) return { background: 'linear-gradient(135deg,rgba(180,100,40,.85),rgba(140,80,30,.85))', borderColor: 'rgba(220,160,100,.3)' };
  return { background: 'rgba(0,0,0,.55)', borderColor: 'rgba(255,255,255,.2)' };
};

const CSS = `
  @keyframes hotPulse {
    0%, 100% { transform: scale(1); }
    50%       { transform: scale(1.12); }
  }
  @keyframes shimmerSweep {
    0%   { background-position: -200% 0 }
    100% { background-position:  200% 0 }
  }
  .hot-scroll-track {
    display: flex;
    gap: 10px;
    overflow-x: auto;
    scroll-snap-type: x mandatory;
    -webkit-overflow-scrolling: touch;
    scrollbar-width: none;
    padding: 0 16px 12px;
    scroll-behavior: smooth;
  }
  .hot-scroll-track::-webkit-scrollbar { display: none; }
  .hot-card-img-wrap {
    transition: transform 0.2s ease, box-shadow 0.2s ease;
  }
  .hot-card-img-wrap:active { transform: scale(0.95); }
`;

const HotCarouselShimmer = () => (
  <div style={{ background: '#fff', paddingBottom: 4 }}>
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px 10px' }}>
      <div style={{ height: 16, width: 120, borderRadius: 6, background: '#f0f0f5', backgroundSize: '200% 100%', animation: 'shimmerSweep 1.6s ease-in-out infinite' }} />
      <div style={{ height: 12, width: 48, borderRadius: 6, background: '#f0f0f5', backgroundSize: '200% 100%', animation: 'shimmerSweep 1.6s ease-in-out infinite' }} />
    </div>
    <div className="hot-scroll-track">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} style={{ flexShrink: 0, width: 110, scrollSnapAlign: 'start' }}>
          <div style={{ width: 110, height: 175, borderRadius: 14, overflow: 'hidden', background: '#f0f0f5', position: 'relative' }}>
            <div style={{
              position: 'absolute', inset: 0,
              background: 'linear-gradient(105deg,transparent 40%,rgba(255,255,255,0.5) 50%,transparent 60%)',
              backgroundSize: '200% 100%',
              animation: `shimmerSweep 1.6s ease-in-out ${i * 0.1}s infinite`,
            }} />
          </div>
          <div style={{ height: 10, borderRadius: 4, background: '#f0f0f5', width: '80%', marginTop: 6, backgroundSize: '200% 100%', animation: 'shimmerSweep 1.6s ease-in-out infinite' }} />
        </div>
      ))}
    </div>
    <div style={{ height: 1, background: '#f3f4f6', margin: '0 16px' }} />
  </div>
);

export const HotCarousel = () => {
  const router = useRouter();
  const [wallpapers, setWallpapers] = useState<Wallpaper[]>([]);
  const [loading, setLoading] = useState(true);
  const trackRef = useRef<HTMLDivElement>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isPausedRef = useRef(false);
  const currentIndexRef = useRef(0);

  // ── Fetch with localStorage cache ──────────────────────────────
  useEffect(() => {
    const cached = getHotCache();
    if (cached) {
      setWallpapers(cached);
      setLoading(false);
      return;
    }

    fetchHotWallpapers(10)
      .then(data => {
        setHotCache(data);
        setWallpapers(data);
      })
      .catch(e => console.error('Failed to load hot wallpapers:', e))
      .finally(() => setLoading(false));
  }, []);

  // ── Auto-scroll ────────────────────────────────────────────────
  const scrollToIndex = useCallback((index: number) => {
    const track = trackRef.current;
    if (!track) return;
    track.scrollTo({ left: index * SCROLL_STEP, behavior: 'smooth' });
  }, []);

  const startAutoScroll = useCallback((total: number) => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      if (isPausedRef.current) return;
      const track = trackRef.current;
      if (!track) return;
      const maxScroll = track.scrollWidth - track.clientWidth;
      if (track.scrollLeft >= maxScroll - 4) {
        track.style.scrollBehavior = 'auto';
        track.scrollLeft = 0;
        currentIndexRef.current = 0;
        requestAnimationFrame(() => { track.style.scrollBehavior = 'smooth'; });
      } else {
        currentIndexRef.current = Math.min(currentIndexRef.current + 1, total - 1);
        scrollToIndex(currentIndexRef.current);
      }
    }, AUTO_SCROLL_INTERVAL);
  }, [scrollToIndex]);

  useEffect(() => {
    if (wallpapers.length > 0) startAutoScroll(wallpapers.length);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [wallpapers.length, startAutoScroll]);

  // ── Pause / resume on interaction ─────────────────────────────
  const handleInteractionStart = useCallback(() => { isPausedRef.current = true; }, []);
  const handleInteractionEnd   = useCallback(() => {
    setTimeout(() => {
      isPausedRef.current = false;
      const track = trackRef.current;
      if (track) currentIndexRef.current = Math.round(track.scrollLeft / SCROLL_STEP);
    }, 4000);
  }, []);

  if (loading) return <><style>{CSS}</style><HotCarouselShimmer /></>;
  if (!wallpapers.length) return null;

  return (
    <>
      <style>{CSS}</style>
      <div style={{ background: '#fff', paddingBottom: 4 }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px 10px' }}>
          <span style={{ fontSize: 15, fontWeight: 800, color: '#0a0a0a', letterSpacing: '-0.3px', display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ display: 'inline-block', animation: 'hotPulse 2s ease-in-out infinite' }}>🔥</span>
            Hot Right Now
          </span>
          <button
            onClick={() => { startLoader(); router.push('/hot'); }}
            style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', background: 'none', border: 'none', cursor: 'pointer', padding: '4px 0' }}
          >
            See all →
          </button>
        </div>

        {/* Scroll track */}
        <div
          ref={trackRef}
          className="hot-scroll-track"
          onMouseEnter={handleInteractionStart}
          onMouseLeave={handleInteractionEnd}
          onTouchStart={handleInteractionStart}
          onTouchEnd={handleInteractionEnd}
          onPointerDown={handleInteractionStart}
          onPointerUp={handleInteractionEnd}
        >
          {wallpapers.map((wp, i) => {
            const rank = i + 1;
            const rankStyle = getRankStyle(rank);
            const imgSrc = wp.thumbnail || wp.url;
            return (
              <div
                key={wp.id}
                style={{ flexShrink: 0, width: 110, scrollSnapAlign: 'start', cursor: 'pointer' }}
                onClick={() => { startLoader(); router.push(`/details/${wp.id}`); }}
              >
                <div
                  className="hot-card-img-wrap"
                  style={{ position: 'relative', width: 110, height: 175, borderRadius: 14, overflow: 'hidden', background: HOT_COLORS[i % HOT_COLORS.length] }}
                >
                  <img src={imgSrc} alt={wp.title} draggable={false}
                    style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', pointerEvents: 'none' }} />
                  <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '50%', background: 'linear-gradient(to top,rgba(0,0,0,.6) 0%,transparent 100%)', zIndex: 2 }} />
                  <div style={{
                    position: 'absolute', top: 7, left: 7, zIndex: 3,
                    fontSize: 10, fontWeight: 800, color: '#fff',
                    backdropFilter: 'blur(8px)',
                    border: `1px solid ${rankStyle.borderColor}`,
                    borderRadius: 7, padding: '3px 7px',
                    background: rankStyle.background,
                    letterSpacing: '0.02em',
                  }}>#{rank}</div>
                </div>
                <p style={{ fontSize: 10.5, fontWeight: 600, color: '#0a0a0a', margin: '6px 2px 0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', lineHeight: 1.3 }}>
                  {wp.title}
                </p>
              </div>
            );
          })}
        </div>

        <div style={{ height: 1, background: '#f3f4f6', margin: '0 16px' }} />
      </div>
    </>
  );
};
