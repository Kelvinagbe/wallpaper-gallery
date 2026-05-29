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

  useEffect(() => { setMounted(true); }, []);

  const start = () => {
    clearTimeout(timerRef.current);
    clearInterval(intervalRef.current);
    setProgress(0);
    setVisible(true);
    let current = 0;
    intervalRef.current = setInterval(() => {
      current += Math.random() * 12;
      if (current >= 85) { current = 85; clearInterval(intervalRef.current); }
      setProgress(current);
    }, 120);
  };

  const finish = () => {
    clearInterval(intervalRef.current);
    setProgress(100);
    timerRef.current = setTimeout(() => { setVisible(false); setProgress(0); }, 400);
  };

  // Subscribe to manual startLoader() calls
  useEffect(() => {
    listeners.add(start);
    return () => { listeners.delete(start); };
  }, []);

  // Finish on every route change
  useEffect(() => { finish(); }, [pathname, searchParams]);

  // ─── Patch history.pushState / replaceState (catches router.push) ──────────
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

  // ─── Catch <Link> and <a> clicks ──────────────────────────────────────────
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
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, height: 5, zIndex: 99999, pointerEvents: 'none' }}>
      <div style={{
        height: '100%',
        width: `${progress}%`,
        background: 'linear-gradient(90deg, #16a34a 0%, #4ade80 100%)',
        boxShadow: '0 0 10px rgba(22,163,74,0.7), 0 0 4px rgba(74,222,128,0.5)',
        borderRadius: '0 2px 2px 0',
        opacity: progress === 100 ? 0 : 1,
        transition: progress === 100
          ? 'width .15s ease, opacity .3s ease .15s'
          : 'width .12s ease',
      }} />
    </div>,
    document.body,
  );
};