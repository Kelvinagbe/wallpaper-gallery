'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { fetchWallpapers } from '@/lib/stores/wallpaperStore';
import { feedCache } from '@/lib/feedCache';
import { Header } from './components/Header';
import { WallpaperGrid } from './components/WallpaperGrid';
import { GlobalStyles } from './components/GlobalStyles';
import { HotCarousel } from '@/app/components/HotCarousel';
import { MonetizationInfoModal } from '@/app/components/MonetizationInfoModal';
import { BottomSheetProvider } from './components/WallpaperCard';
import { useRouter } from 'next/navigation';
import type { Wallpaper, Filter } from './types';

const ITEMS_PER_PAGE = 10;

type Props = { initialWallpapers: Wallpaper[]; initialHasMore: boolean };

export default function WallpaperGallery({ initialWallpapers, initialHasMore }: Props) {
  const router = useRouter();

  const [wallpapers,    setWallpapers]    = useState<Wallpaper[]>(feedCache.populated ? feedCache.wallpapers : initialWallpapers);
  const [hasMore,       setHasMore]       = useState(feedCache.populated ? feedCache.hasMore : initialHasMore);
  const [filter,        setFilter]        = useState<Filter>(feedCache.filter);
  const [isInitialLoad, setIsInitialLoad] = useState(false);

  const loadingMoreRef   = useRef(false);
  const filterChangedRef = useRef(false);
  const isScrollingRef   = useRef(false);
  const scrollTimerRef   = useRef<ReturnType<typeof setTimeout> | null>(null);
  const seenIdsRef       = useRef<Set<string>>(new Set(initialWallpapers.map(w => w.id)));
  // pageRef — always current, never stale inside callbacks
  const pageRef          = useRef<number>(feedCache.page ?? 1);

  // ── Track scrolling state ─────────────────────────────────────
  useEffect(() => {
    const onScroll = () => {
      isScrollingRef.current = true;
      if (scrollTimerRef.current) clearTimeout(scrollTimerRef.current);
      scrollTimerRef.current = setTimeout(() => { isScrollingRef.current = false; }, 150);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // ── Restore scroll / seed cache ───────────────────────────────
  useEffect(() => {
    if (feedCache.populated) {
      requestAnimationFrame(() =>
        requestAnimationFrame(() =>
          window.scrollTo({ top: feedCache.scrollY, behavior: 'instant' })
        )
      );
      return;
    }
    Object.assign(feedCache, { wallpapers: initialWallpapers, page: 1, hasMore: initialHasMore, filter, populated: true });
    pageRef.current = 1;
  }, []); // eslint-disable-line

  // ── Filter change ─────────────────────────────────────────────
  useEffect(() => {
    if (!filterChangedRef.current) { filterChangedRef.current = true; return; }
    let cancelled = false;
    setWallpapers([]);
    setHasMore(true);
    setIsInitialLoad(true);
    seenIdsRef.current = new Set();
    pageRef.current    = 0;
    Object.assign(feedCache, { populated: false, wallpapers: [], scrollY: 0 });

    fetchWallpapers(0, ITEMS_PER_PAGE, filter)
      .then(data => {
        if (cancelled) return;
        seenIdsRef.current = new Set(data.wallpapers.map((w: Wallpaper) => w.id));
        pageRef.current    = 1;
        setWallpapers(data.wallpapers);
        setHasMore(data.hasMore);
        Object.assign(feedCache, { wallpapers: data.wallpapers, page: 1, hasMore: data.hasMore, filter, populated: true });
      })
      .catch(e => console.error('Filter change failed:', e))
      .finally(() => { if (!cancelled) setIsInitialLoad(false); });

    return () => { cancelled = true; };
  }, [filter]); // eslint-disable-line

  // ── Real-time refetch on reconnect / poll (skips if scrolling) ─
  useEffect(() => {
    const refetch = async () => {
      if (isScrollingRef.current) return;
      try {
        const data  = await fetchWallpapers(0, ITEMS_PER_PAGE, feedCache.filter);
        const fresh = data.wallpapers.filter((w: Wallpaper) => !seenIdsRef.current.has(w.id));
        if (!fresh.length) return;
        fresh.forEach((w: Wallpaper) => seenIdsRef.current.add(w.id));
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

  // ── Load more — pageRef used so it's never stale ──────────────
  const handleLoadMore = useCallback(async () => {
    if (!hasMore || loadingMoreRef.current) return;
    loadingMoreRef.current = true;
    try {
      const data  = await fetchWallpapers(pageRef.current, ITEMS_PER_PAGE, filter);
      const fresh = data.wallpapers.filter((w: Wallpaper) => !seenIdsRef.current.has(w.id));
      fresh.forEach((w: Wallpaper) => seenIdsRef.current.add(w.id));
      pageRef.current += 1; // increment immediately — never stale
      setWallpapers(prev => {
        const next = [...prev, ...fresh];
        Object.assign(feedCache, { wallpapers: next, page: pageRef.current, hasMore: data.hasMore });
        return next;
      });
      setHasMore(data.hasMore);
    } catch (e) {
      console.error('Load more failed:', e);
    } finally {
      loadingMoreRef.current = false;
    }
  }, [hasMore, filter]); // page removed — pageRef handles it

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
    <BottomSheetProvider>
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
    </BottomSheetProvider>
  );
}
