
'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { WallpaperCard } from './WallpaperCard';
import { usePrefetch } from '@/app/hooks/usePrefetch';
import Image from 'next/image';
import type { Wallpaper, Ad } from '../types';

const COLORS = [
  { bg: '#e8eaf0', shimmer: '#d0d4e8' },
  { bg: '#ede8f0', shimmer: '#d8cce8' },
  { bg: '#e8f0ea', shimmer: '#cce0d0' },
  { bg: '#f0e8e8', shimmer: '#e8cccc' },
  { bg: '#f0ede8', shimmer: '#e8dcc8' },
];

const getColCount = (w: number) => w >= 1024 ? 5 : w >= 768 ? 4 : w >= 480 ? 3 : 2;
const getGap      = (w: number) => w >= 1024 ? 12 : w >= 768 ? 10 : w >= 480 ? 8 : 6;
const getPad      = (w: number) => w >= 1024 ? '12px 10px' : w >= 768 ? '10px 8px' : w >= 480 ? '8px 6px' : '6px 0px';
const getItemGap  = (cols: number) => cols >= 4 ? 14 : cols >= 3 ? 12 : 10;
const shortestCol = (h: number[]) => h.reduce((a, b, i) => h[i] < h[a] ? i : a, 0);
const CSS = `@keyframes shimmerSweep{0%{background-position:-200% 0}100%{background-position:200% 0}}@keyframes dotBounce{0%,80%,100%{transform:scale(0.6);opacity:0.4}40%{transform:scale(1);opacity:1}}`;

type FeedItem = { kind: 'wallpaper'; wp: Wallpaper } | { kind: 'native'; ad: Ad };

const Shimmer = ({ i, o = 1 }: { i: number; o?: number }) => {
  const c = COLORS[i % COLORS.length];
  const s = { backgroundSize: '200% 100%', animation: 'shimmerSweep 1.6s ease-in-out infinite' };
  const g = `linear-gradient(105deg,transparent 40%,${c.shimmer}80 50%,transparent 60%)`;
  return (
    <div style={{ opacity: o }}>
      <div style={{ position: 'relative', width: '100%', borderRadius: 16, overflow: 'hidden', aspectRatio: '9/16', background: c.bg }}>
        <div style={{ position: 'absolute', inset: 0, background: g, ...s }} />
      </div>
      <div style={{ padding: '6px 2px 0', display: 'flex', flexDirection: 'column', gap: 4 }}>
        <div style={{ height: 10, borderRadius: 4, background: c.bg, width: '80%', ...s }} />
        <div style={{ height: 8, borderRadius: 4, background: c.bg, width: '50%', ...s, animationDelay: '0.1s' }} />
      </div>
    </div>
  );
};

const ShimmerGrid = ({ count, opacity, cols, gap, pad, itemGap }: { count: number; opacity?: number; cols: number; gap: number; pad: string; itemGap: number }) => {
  const columns: number[][] = Array.from({ length: cols }, () => []);
  for (let i = 0; i < count; i++) columns[i % cols].push(i);
  return (
    <div style={{ width: '100%', boxSizing: 'border-box', overflow: 'hidden', display: 'flex', gap: `${gap}px`, padding: pad, alignItems: 'flex-start' }}>
      {columns.map((col, ci) => (
        <div key={ci} style={{ flex: '1 1 0', minWidth: 0, display: 'flex', flexDirection: 'column', gap: `${itemGap}px` }}>
          {col.map(i => <Shimmer key={i} i={i} o={opacity} />)}
        </div>
      ))}
    </div>
  );
};

const AdCard = ({ ad }: { ad: Ad }) => (
  <a href={ad.ctaUrl} target="_blank" rel="noopener noreferrer sponsored" style={{ display: 'block', textDecoration: 'none' }}
    onClick={() => fetch('/api/ads/click', { method: 'POST', body: JSON.stringify({ adId: ad.id }), headers: { 'Content-Type': 'application/json' } }).catch(() => {})}>
    <div style={{ position: 'relative', width: '100%', borderRadius: 16, overflow: 'hidden', aspectRatio: '9/16', background: '#e8eaf0' }}>
      {ad.imageUrl && <Image src={ad.imageUrl} alt={ad.title} fill draggable={false} className="object-cover" sizes="(max-width:480px) 50vw,(max-width:768px) 33vw,20vw" />}
      <div style={{ position: 'absolute', top: 8, left: 8, zIndex: 5, padding: '2px 7px', borderRadius: 5, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(6px)', fontSize: 9, fontWeight: 700, color: '#fff', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Sponsored</div>
      <div style={{ position: 'absolute', bottom: 10, left: 8, right: 8, zIndex: 5, background: 'rgba(255,255,255,0.92)', borderRadius: 10, padding: '6px 10px', display: 'flex', alignItems: 'center', gap: 6, backdropFilter: 'blur(4px)' }}>
        {ad.brandLogoUrl && <img src={ad.brandLogoUrl} alt={ad.brandName} style={{ width: 18, height: 18, borderRadius: 4, objectFit: 'cover', flexShrink: 0 }} />}
        <span style={{ flex: 1, fontSize: 10, fontWeight: 700, color: '#111', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ad.title}</span>
        <span style={{ fontSize: 9, fontWeight: 700, color: '#fff', background: '#111', borderRadius: 5, padding: '2px 7px', flexShrink: 0 }}>{ad.ctaLabel ?? 'View'}</span>
      </div>
    </div>
    <div style={{ padding: '6px 2px 0', display: 'flex', flexDirection: 'column', gap: 3 }}>
      <p style={{ fontSize: 11, fontWeight: 600, color: '#0a0a0a', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', lineHeight: 1.3 }}>{ad.title}</p>
      <span style={{ fontSize: 10, color: 'rgba(0,0,0,0.35)', fontWeight: 500 }}>{ad.brandName} · Sponsored</span>
    </div>
  </a>
);

type Props = { wallpapers: Wallpaper[]; isLoading: boolean; onWallpaperClick?: (w: Wallpaper) => void; onLoadMore?: () => Promise<void>; hasMore?: boolean };

export const WallpaperGrid = ({ wallpapers, isLoading, onWallpaperClick, onLoadMore, hasMore = true }: Props) => {
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasEverLoaded, setHasEverLoaded] = useState(false);
  const [dims, setDims] = useState(() => { const w = typeof window !== 'undefined' ? window.innerWidth : 390; return { cols: getColCount(w), gap: getGap(w), pad: getPad(w) }; });
  const triggerRef = useRef<HTMLDivElement>(null);
  const loadingRef = useRef(false);
  const colMap = useRef<Map<string, number>>(new Map());
  const lastCols = useRef(dims.cols);

  const nativeAds = useMemo<Ad[]>(() => typeof window === 'undefined' ? [] : ((window as any).MY_ADS ?? []).filter((a: Ad) => a.adType === 'native'), []);

  usePrefetch(useMemo(() => wallpapers.slice(20, 30).map(w => w.url), [wallpapers]));

  useEffect(() => {
    const onResize = () => { const w = window.innerWidth; setDims({ cols: getColCount(w), gap: getGap(w), pad: getPad(w) }); };
    window.addEventListener('resize', onResize, { passive: true });
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => { if (wallpapers.length > 0 && !hasEverLoaded) setHasEverLoaded(true); }, [wallpapers.length, hasEverLoaded]);

  useEffect(() => {
    if (!triggerRef.current || !onLoadMore || !hasMore) return;
    const observer = new IntersectionObserver(async ([e]) => {
      if (!e.isIntersecting || loadingRef.current || !hasMore) return;
      loadingRef.current = true; setLoadingMore(true);
      try { await onLoadMore(); } catch { console.error('Load more failed'); }
      finally { loadingRef.current = false; setLoadingMore(false); }
    }, { threshold: 0.1, rootMargin: '400px' });
    observer.observe(triggerRef.current);
    return () => observer.disconnect();
  }, [onLoadMore, hasMore]);

  const { cols, gap, pad } = dims;
  const itemGap = getItemGap(cols);

  if (cols !== lastCols.current) { colMap.current.clear(); lastCols.current = cols; }

  const feed = useMemo<FeedItem[]>(() => {
    const result: FeedItem[] = [];
    let adIdx = 0;
    wallpapers.forEach((wp, i) => {
      result.push({ kind: 'wallpaper', wp });
      if (nativeAds.length && (i + 1) % 12 === 0) result.push({ kind: 'native', ad: nativeAds[adIdx++ % nativeAds.length] });
    });
    return result;
  }, [wallpapers, nativeAds]);

  const columns = useMemo(() => {
    const result: FeedItem[][] = Array.from({ length: cols }, () => []);
    const heights = new Array(cols).fill(0);
    for (const item of feed) {
      const key = item.kind === 'wallpaper' ? item.wp.id : `ad_${item.ad.id}`;
      if (!colMap.current.has(key)) { const col = shortestCol(heights); colMap.current.set(key, col); heights[col]++; }
      result[colMap.current.get(key) ?? 0].push(item);
    }
    return result;
  }, [feed, cols]);

  if (!hasEverLoaded && isLoading) return <><ShimmerGrid count={10} cols={cols} gap={gap} pad={pad} itemGap={itemGap} /><style>{CSS}</style></>;
  if (hasEverLoaded && wallpapers.length === 0 && isLoading) return <><ShimmerGrid count={6} opacity={0.5} cols={cols} gap={gap} pad={pad} itemGap={itemGap} /><style>{CSS}</style></>;
  if (wallpapers.length === 0 && !isLoading) return (
    <div style={{ textAlign: 'center', padding: '80px 0' }}>
      <div style={{ fontSize: 64, marginBottom: 16 }}>🔍</div>
      <h3 style={{ fontSize: 20, fontWeight: 600, color: '#1f2937', marginBottom: 8 }}>No wallpapers found</h3>
      <p style={{ color: '#9ca3af' }}>Try adjusting your search or filters</p>
    </div>
  );

  return (
    <>
      <div style={{ width: '100%', boxSizing: 'border-box', overflow: 'hidden', display: 'flex', gap: `${gap}px`, padding: pad, alignItems: 'flex-start' }}>
        {columns.map((col, ci) => (
          <div key={ci} style={{ flex: '1 1 0', minWidth: 0, display: 'flex', flexDirection: 'column', gap: `${itemGap}px` }}>
            {col.map((entry, idx) => entry.kind === 'native'
              ? <AdCard key={`ad_${entry.ad.id}_${ci}`} ad={entry.ad} />
              : <WallpaperCard key={entry.wp.id} wp={entry.wp} priority={ci + idx * cols < 6} placeholderIndex={ci + idx * cols} onClick={onWallpaperClick ? () => onWallpaperClick(entry.wp) : undefined} />
            )}
          </div>
        ))}
      </div>

      {hasMore && <div ref={triggerRef} style={{ height: 1 }} />}

      {loadingMore && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '32px 0', gap: 8 }}>
          <div style={{ display: 'flex', gap: 6 }}>
            {[0, 1, 2].map(i => <div key={i} style={{ width: 8, height: 8, borderRadius: '50%', background: '#d1d5db', animation: `dotBounce 1.2s ease-in-out ${i * 0.2}s infinite` }} />)}
          </div>
          <span style={{ color: '#9ca3af', fontSize: 12 }}>Loading more...</span>
        </div>
      )}

      {!hasMore && wallpapers.length > 0 && <div style={{ textAlign: 'center', padding: '32px 0', color: '#9ca3af', fontSize: 14 }}>You've seen all wallpapers</div>}

      <style>{CSS}</style>
    </>
  );
};
