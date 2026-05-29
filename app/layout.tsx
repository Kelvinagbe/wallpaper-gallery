'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { usePathname, useSearchParams } from 'next/navigation';

// ─── Shared state ─────────────────────────────────────────────────────────────
type Listener = () => void;
const listeners = new Set<Listener>();
const emit = () => listeners.forEach(fn => fn());

export const startLoader = () => emit();

// ─── Component ────────────────────────────────────────────────────────────────
export const TopLoader = () => {
  const pathname     = usePathname();
  const searchParams = useSearchParams();

  const [progress, setProgress] = useState(0);
  const [visible,  setVisible]  = useState(false);
  const [mounted,  setMounted]  = useState(false);

  const timerRef    = useRef<ReturnType<typeof setTimeout>>();
  const intervalRef = useRef<ReturnType<typeof setInterval>>();
  const startedRef  = useRef(false);

  useEffect(() => { setMounted(true); }, []);

  const start = () => {
    // Debounce: ignore if already running
    if (startedRef.current) return;
    startedRef.current = true;

    clearTimeout(timerRef.current);
    clearInterval(intervalRef.current);
    setProgress(0);

    // Small delay — avoids flashing on instant navigations
    timerRef.current = setTimeout(() => {
      setVisible(true);
      let current = 0;
      intervalRef.current = setInterval(() => {
        // Fast at start, slows near 85 — feels more natural
        const increment = current < 30
          ? Math.random() * 15
          : current < 60
          ? Math.random() * 8
          : Math.random() * 3;
        current = Math.min(current + increment, 85);
        setProgress(current);
        if (current >= 85) clearInterval(intervalRef.current);
      }, 100);
    }, 150);
  };

  const finish = () => {
    startedRef.current = false;
    clearTimeout(timerRef.current);
    clearInterval(intervalRef.current);
    setProgress(100);
    timerRef.current = setTimeout(() => {
      setVisible(false);
      setProgress(0);
    }, 400);
  };

  // Subscribe to manual startLoader() calls
  useEffect(() => {
    listeners.add(start);
    return () => { listeners.delete(start); };
  }, []);

  // Finish on every route change
  useEffect(() => { finish(); }, [pathname, searchParams]);

  // Patch history.pushState / replaceState — catches all router.push()
  useEffect(() => {
    const originalPush    = window.history.pushState.bind(window.history);
    const originalReplace = window.history.replaceState.bind(window.history);

    window.history.pushState = (...args) => {
      start();
      return originalPush(...args);
    };

    window.history.replaceState = (...args) => {
      start();
      return originalReplace(...args);
    };

    return () => {
      window.history.pushState    = originalPush;
      window.history.replaceState = originalReplace;
    };
  }, []);

  // Catch <Link> / <a> clicks
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const a = (e.target as HTMLElement).closest('a[href]');
      if (!a) return;
      const href = a.getAttribute('href');
      if (
        !href ||
        href.startsWith('#') ||
        href.startsWith('mailto:') ||
        href.startsWith('tel:') ||
        (a as HTMLAnchorElement).target === '_blank'
      ) return;
      try {
        const url = new URL(href, window.location.origin);
        if (url.origin === window.location.origin && url.pathname !== window.location.pathname) {
          start();
        }
      } catch {}
    };
    document.addEventListener('click', onClick, true);
    return () => document.removeEventListener('click', onClick, true);
  }, []);

  if (!mounted || !visible) return null;

  return createPortal(
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        height: 2.5,          // thinner — 2026 minimal style
        zIndex: 99999,
        pointerEvents: 'none',
      }}
    >
      {/* Track (ghost background) */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(249,115,22,0.08)',
        }}
      />
      {/* Bar */}
      <div
        style={{
          height: '100%',
          width: `${progress}%`,
          background: 'linear-gradient(90deg, #f97316 0%, #fb923c 60%, #fdba74 100%)',
          boxShadow: '0 0 8px rgba(249,115,22,0.6), 0 0 20px rgba(249,115,22,0.2)',
          borderRadius: '0 2px 2px 0',
          opacity: progress === 100 ? 0 : 1,
          transition: progress === 100
            ? 'width .1s ease, opacity .35s ease .1s'
            : 'width .1s linear',
        }}
      />
      {/* Shimmer tip */}
      <div
        style={{
          position: 'absolute',
          top: '-1px',
          left: `calc(${progress}% - 60px)`,
          width: 60,
          height: 4,
          background: 'radial-gradient(ellipse at right, rgba(253,186,116,0.9) 0%, transparent 70%)',
          opacity: progress === 100 ? 0 : 1,
          transition: 'left .1s linear, opacity .35s ease',
          pointerEvents: 'none',
        }}
      />
    </div>,
    document.body,
  );
};