'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { WallpaperCard, NativeAdCard, BannerAdCard } from './WallpaperCard';
import { usePrefetch } from '@/app/hooks/usePrefetch';
import type { Wallpaper, Ad } from '../types';

/* ── responsive helpers ── */
const cols  = (w: number) => w >= 1024 ? 5 : w >= 768 ? 4 : w >= 480 ? 3 : 2;
const gap   = (w: number) => w >= 1024 ? 12 : w >= 768 ? 10 : w >= 480 ? 8 : 6;
const iGap  = (c: number) => c >= 4 ? 14 : c >= 3 ? 12 : 10;

const COLORS = [
  { bg: '#e8eaf0', sh: '#d0d4e8' }, { bg: '#ede8f0', sh: '#d8cce8' },
  { bg: '#e8f0ea', sh: '#cce0d0' }, { bg: '#f0e8e8', sh: '#e8cccc' },
  { bg: '#f0ede8', sh: '#e8dcc8' },
];

const CSS = `
  @keyframes shimmerSweep { 0% { background-position:-200% 0 } 100% { background-position:200% 0 } }
  @keyframes dotBounce { 0%,80%,100% { transform:scale(0.6);opacity:.4 } 40% { transform:scale(1);opacity:1 } }
`;

/* ── shimmer placeholder ── */
const Shimmer = ({ i, o = 1 }: { i: number; o?: number }) => {
  const c = COLORS[i % COLORS.length];
  const sw = { backgroundSize: '200% 100%', animation: 'shimmerSweep 1.6s ease-in-out infinite' };
  return (
    <div style={{ opacity: o }}>
      <div style={{ position: 'relative', width: '100%', borderRadius: 16, overflow: 'hidden', aspectRatio: '9/16', background: c.bg }}>
        <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(105deg,transparent 40%,${c.sh}80 50%,transparent 60%)`, ...sw }} />
      </div>
      <div style={{ padding: '6px 2px 0', display: 'flex', flexDirection: 'column', gap: 4 }}>
        <div style={{ height: 10, borderRadius: 4, background: c.bg, width: '80%', ...sw }} />
        <div style={{ height: 8, borderRadius: 4, background: c.bg, width: '50%', ...sw, animationDelay: '.1s' }} />
      </div>
    </div>
  );
};

const ShimmerGrid = ({ count, opacity, numCols, g, pad, ig }: { count: number; opacity?: number; numCols: number; g: number; pad: number; ig: number }) => {
  const columns: number[][] = Array.from({ length: numCols }, () => []);
  for (let i = 0; i < count; i++) columns[i % numCols].push(i);
  return (
    <div style={{ display: 'flex', gap: g, padding: `12px ${pad}px`, alignItems: 'flex-start' }}>
      {columns.map((col, ci) => (
        <div key={ci} style={{ flex: '1 1 0', minWidth: 0, display: 'flex', flexDirection: 'column', gap: ig }}>
          {col.map(i => <Shimmer key={i} i={i} o={opacity} />)}
        </div>
      ))}
    </div>
  );
};

/* ── feed types ── */
type MasonryItem = { kind: 'wallpaper'; wp: Wallpaper } | { kind: 'native'; ad: Ad };
type Chunk = { items: MasonryItem[]; banner: Ad | null };

/* ── masonry block ── */
const MasonryBlock = ({ items, numCols, g, pad, ig, offset, onWallpaperClick }: {
  items: MasonryItem[]; numCols: number; g: number; pad: number; ig: number;
  offset: number; onWallpaperClick?: (w: Wallpaper) => void;
}) => {
  const columns = useMemo(() => {
    const res: MasonryItem[][] = Array.from({ length: numCols }, () => []);
    items.forEach((item, i) => res[i % numCols].push(item));
    return res;
  }, [items, numCols]);

  return (
    <div style={{ display: 'flex', gap: g, padding: `0 ${pad}px`, alignItems: 'flex-start' }}>
      {columns.map((col, ci) => (
        <div key={ci} style={{ flex: '1 1 0', minWidth: 0, display: 'flex', flexDirection: 'column', gap: ig }}>
          {col.map((entry, idx) =>
            entry.kind === 'native'
              ? <NativeAdCard key={`na_${entry.ad.id}_${ci}`} ad={entry.ad} placeholderIndex={ci + idx * numCols} />
              : <WallpaperCard key={entry.wp.id} wp={entry.wp} priority={offset + ci + idx * numCols < 6} placeholderIndex={ci + idx * numCols} onClick={onWallpaperClick ? () => onWallpaperClick(entry.wp) : undefined} />
          )}
        </div>
      ))}
    </div>
  );
};

/* ── props ── */
type Props = {
  wallpapers: Wallpaper[];
  isLoading: boolean;
  ads?: Ad[];                        // ← pass ads as a prop; no window.MY_ADS reads
  onWallpaperClick?: (w: Wallpaper) => void;
  onLoadMore?: () => Promise<void>;
  hasMore?: boolean;
  bannerEvery?: number;              // wallpapers per chunk before banner. default 14
  nativeEvery?: number;              // 1 native per N wallpapers inside chunk. default 7
};

/* ── main ── */
export const WallpaperGrid = ({
  wallpapers, isLoading, ads = [],
  onWallpaperClick, onLoadMore, hasMore = true,
  bannerEvery = 14, nativeEvery = 7,
}: Props) => {
  const [loadingMore, setLoadingMore] = useState(false);
  const [everLoaded,  setEverLoaded]  = useState(false);
  const [dim, setDim] = useState(() => {
    const w = typeof window !== 'undefined' ? window.innerWidth : 390;
    return { c: cols(w), g: gap(w) };
  });
  const triggerRef  = useRef<HTMLDivElement>(null);
  const loadingRef  = useRef(false);

  /* ads split by type — only when ads array is non-empty, so no blank during hydration */
  const nativeAds = useMemo(() => ads.filter(a => a.adType === 'native'), [ads]);
  const bannerAds = useMemo(() => ads.filter(a => a.adType === 'banner'), [ads]);

  usePrefetch(useMemo(() => wallpapers.slice(20, 30).map(w => w.url), [wallpapers]));

  useEffect(() => {
    const fn = () => { const w = window.innerWidth; setDim({ c: cols(w), g: gap(w) }); };
    window.addEventListener('resize', fn, { passive: true });
    return () => window.removeEventListener('resize', fn);
  }, []);

  useEffect(() => { if (wallpapers.length > 0 && !everLoaded) setEverLoaded(true); }, [wallpapers.length]);

  useEffect(() => {
    if (!triggerRef.current || !onLoadMore || !hasMore) return;
    const ob = new IntersectionObserver(async ([e]) => {
      if (!e.isIntersecting || loadingRef.current || !hasMore) return;
      loadingRef.current = true; setLoadingMore(true);
      try { await onLoadMore(); } catch { console.error('loadMore failed'); }
      finally { loadingRef.current = false; setLoadingMore(false); }
    }, { threshold: 0.1, rootMargin: '600px' });
    ob.observe(triggerRef.current);
    return () => ob.disconnect();
  }, [onLoadMore, hasMore]);

  const { c: numCols, g } = dim;
  const pad = gap(typeof window !== 'undefined' ? window.innerWidth : 390);
  const ig  = iGap(numCols);

  /* build chunks — native ads only injected when nativeAds.length > 0 */
  const chunks = useMemo<Chunk[]>(() => {
    const result: Chunk[] = [];
    let ni = 0, bi = 0;
    for (let base = 0; base < wallpapers.length; base += bannerEvery) {
      const items: MasonryItem[] = [];
      wallpapers.slice(base, base + bannerEvery).forEach((wp, i) => {
        items.push({ kind: 'wallpaper', wp });
        if (nativeAds.length && (i + 1) % nativeEvery === 0)
          items.push({ kind: 'native', ad: nativeAds[ni++ % nativeAds.length] });
      });
      result.push({ items, banner: bannerAds.length ? bannerAds[bi++ % bannerAds.length] : null });
    }
    return result;
  }, [wallpapers, nativeAds, bannerAds, bannerEvery, nativeEvery]);

  /* ── early states ── */
  if (!everLoaded && isLoading)
    return <><ShimmerGrid count={10} numCols={numCols} g={g} pad={pad} ig={ig} /><style>{CSS}</style></>;

  if (everLoaded && !wallpapers.length && isLoading)
    return <><ShimmerGrid count={6} opacity={0.5} numCols={numCols} g={g} pad={pad} ig={ig} /><style>{CSS}</style></>;

  if (!wallpapers.length && !isLoading)
    return (
      <div style={{ textAlign: 'center', padding: '80px 0' }}>
        <div style={{ fontSize: 64, marginBottom: 16 }}>🔍</div>
        <h3 style={{ fontSize: 20, fontWeight: 600, color: '#1f2937', marginBottom: 8 }}>No wallpapers found</h3>
        <p style={{ color: '#9ca3af' }}>Try adjusting your search or filters</p>
      </div>
    );

  /* ── main render ── */
  let wpOffset = 0;
  return (
    <>
      <div style={{ paddingTop: 12 }}>
        {chunks.map((chunk, ci) => {
          const el = (
            <div key={`chunk_${ci}`}>
              <MasonryBlock items={chunk.items} numCols={numCols} g={g} pad={pad} ig={ig} offset={wpOffset} onWallpaperClick={onWallpaperClick} />
              {chunk.banner && (
                <div style={{ marginTop: ig }}>
                  <BannerAdCard ad={chunk.banner} horizontalPadding={pad} />
                </div>
              )}
            </div>
          );
          wpOffset += chunk.items.filter(i => i.kind === 'wallpaper').length;
          return el;
        })}
      </div>

      {hasMore && <div ref={triggerRef} style={{ height: 1 }} />}

      {loadingMore && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '48px 0 32px', gap: 10 }}>
          <div style={{ display: 'flex', gap: 6 }}>
            {[0, 1, 2].map(i => <div key={i} style={{ width: 10, height: 10, borderRadius: '50%', background: '#d1d5db', animation: `dotBounce 1.2s ease-in-out ${i * 0.2}s infinite` }} />)}
          </div>
          <span style={{ color: '#6b7280', fontSize: 15, fontWeight: 500 }}>Loading more...</span>
        </div>
      )}

      {!hasMore && !!wallpapers.length && (
        <div style={{ textAlign: 'center', padding: '48px 0 32px', color: '#6b7280', fontSize: 15, fontWeight: 500 }}>
          You've seen all wallpapers ✨
        </div>
      )}

      <style>{CSS}</style>
    </>
  );
};
