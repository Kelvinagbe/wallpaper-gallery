'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { fetchWallpapers } from '@/lib/stores/wallpaperStore';
import { feedCache } from '@/lib/feedCache';
import { Header } from './components/Header';
import { WallpaperGrid } from './components/WallpaperGrid';
import { GlobalStyles } from './components/GlobalStyles';
import { HotCarousel } from '@/app/components/HotCarousel';
import { MonetizationInfoModal } from '@/app/components/MonetizationInfoModal';
import { useRouter } from 'next/navigation';
import type { Wallpaper, Filter } from './types';

const ITEMS_PER_PAGE = 10;

type Props = { initialWallpapers: Wallpaper[]; initialHasMore: boolean };

export default function WallpaperGallery({ initialWallpapers, initialHasMore }: Props) {
  const router = useRouter();

  const [wallpapers,    setWallpapers]    = useState<Wallpaper[]>(feedCache.populated ? feedCache.wallpapers : initialWallpapers);
  const [hasMore,       setHasMore]       = useState(feedCache.populated ? feedCache.hasMore : initialHasMore);
  const [page,          setPage]          = useState(feedCache.page);
  const [filter,        setFilter]        = useState<Filter>(feedCache.filter);
  const [isInitialLoad, setIsInitialLoad] = useState(false);

  const loadingMoreRef   = useRef(false);
  const filterChangedRef = useRef(false);

  // ── Restore scroll / seed cache ──────────────────────────────
  useEffect(() => {
    if (feedCache.populated) {
      requestAnimationFrame(() =>
        requestAnimationFrame(() =>
          window.scrollTo({ top: feedCache.scrollY, behavior: 'instant' })
        )
      );
      return;
    }
    Object.assign(feedCache, {
      wallpapers: initialWallpapers,
      page: 1,
      hasMore: initialHasMore,
      filter,
      populated: true,
    });
  }, []); // eslint-disable-line

  // ── Filter change ─────────────────────────────────────────────
  useEffect(() => {
    if (!filterChangedRef.current) { filterChangedRef.current = true; return; }
    let cancelled = false;
    setWallpapers([]);
    setPage(0);
    setHasMore(true);
    setIsInitialLoad(true);
    Object.assign(feedCache, { populated: false, wallpapers: [], scrollY: 0 });

    fetchWallpapers(0, ITEMS_PER_PAGE, filter)
      .then(data => {
        if (cancelled) return;
        setWallpapers(data.wallpapers);
        setHasMore(data.hasMore);
        setPage(1);
        Object.assign(feedCache, { wallpapers: data.wallpapers, page: 1, hasMore: data.hasMore, filter, populated: true });
      })
      .catch(e => console.error('Filter change failed:', e))
      .finally(() => { if (!cancelled) setIsInitialLoad(false); });

    return () => { cancelled = true; };
  }, [filter]); // eslint-disable-line

  // ── Real-time refetch on reconnect / poll ─────────────────────
  useEffect(() => {
    const refetch = async () => {
      try {
        const data  = await fetchWallpapers(0, ITEMS_PER_PAGE, feedCache.filter);
        const seen  = new Set(feedCache.wallpapers.map((w: Wallpaper) => w.id));
        const fresh = data.wallpapers.filter((w: Wallpaper) => !seen.has(w.id));
        if (!fresh.length) return;
        setWallpapers(prev => {
          const next = [...fresh, ...prev];
          Object.assign(feedCache, { wallpapers: next });
          return next;
        });
      } catch { /* silent */ }
    };

    window.addEventListener('online', refetch);
    const poll = setInterval(() => { if (navigator.onLine) refetch(); }, 60_000);
    return () => { window.removeEventListener('online', refetch); clearInterval(poll); };
  }, []);

  // ── Load more ─────────────────────────────────────────────────
  const handleLoadMore = useCallback(async () => {
    if (!hasMore || loadingMoreRef.current) return;
    loadingMoreRef.current = true;
    try {
      const data  = await fetchWallpapers(page, ITEMS_PER_PAGE, filter);
      const seen  = new Set(wallpapers.map(w => w.id));
      const fresh = data.wallpapers.filter((w: Wallpaper) => !seen.has(w.id));
      setWallpapers(prev => {
        const next = [...prev, ...fresh];
        Object.assign(feedCache, { wallpapers: next, page: page + 1, hasMore: data.hasMore });
        return next;
      });
      setHasMore(data.hasMore);
      setPage(p => p + 1);
    } catch (e) {
      console.error('Load more failed:', e);
    } finally {
      loadingMoreRef.current = false;
    }
  }, [hasMore, page, filter, wallpapers]);

  // ── Filter change handler ─────────────────────────────────────
  const handleFilterChange = useCallback((newFilter: Filter) => {
    if (newFilter === filter) return;
    window.scrollTo({ top: 0, behavior: 'instant' });
    setFilter(newFilter);
  }, [filter]);

  // ── Save scroll on unload ─────────────────────────────────────
  useEffect(() => {
    const save = () => { feedCache.scrollY = window.scrollY; };
    window.addEventListener('pagehide', save);
    return () => window.removeEventListener('pagehide', save);
  }, []);

  return (
    <div style={{ minHeight: '100vh', background: '#fff', color: '#0a0a0a' }}>
      <GlobalStyles />
      <Header
        filter={filter}
        setFilter={handleFilterChange}
        startLoader={() => router.prefetch}
      />
      <main style={{ maxWidth: 1400, margin: '0 auto', paddingBottom: 40 }}>
        {filter === 'all' && <HotCarousel />}
        <div style={{ padding: '8px 4px 0' }}>
          <WallpaperGrid
            wallpapers={wallpapers}
            isLoading={isInitialLoad}
            onLoadMore={handleLoadMore}
            hasMore={hasMore}
          />
        </div>
      </main>
      <MonetizationInfoModal />
    </div>
  );
}
