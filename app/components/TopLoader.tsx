'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

export const TopLoader = () => {
  const pathname     = usePathname();
  const searchParams = useSearchParams();
  const [progress, setProgress] = useState(0);
  const [visible,  setVisible]  = useState(false);
  const timerRef   = useRef<ReturnType<typeof setTimeout>>();
  const intervalRef = useRef<ReturnType<typeof setInterval>>();

  const start = () => {
    clearTimeout(timerRef.current);
    clearInterval(intervalRef.current);
    setProgress(0);
    setVisible(true);

    // trickle progress up to ~85% while waiting
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
    // hide bar after transition completes
    timerRef.current = setTimeout(() => { setVisible(false); setProgress(0); }, 400);
  };

  // complete on route change
  useEffect(() => {
    finish();
  }, [pathname, searchParams]);

  // start on link click (catches <Link> and router.push)
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const a = (e.target as HTMLElement).closest('a');
      if (!a) return;
      const href = a.getAttribute('href');
      if (!href || href.startsWith('#') || href.startsWith('mailto') || a.target === '_blank') return;
      // only internal links
      try {
        const url = new URL(href, window.location.origin);
        if (url.origin === window.location.origin && url.pathname !== pathname) start();
      } catch {}
    };
    document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
  }, [pathname]);

  if (!visible) return null;

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0,
      zIndex: 9999,
      height: 3,
      pointerEvents: 'none',
    }}>
      <div style={{
        height: '100%',
        width: `${progress}%`,
        background: '#0a0a0a',
        transition: progress === 100
          ? 'width .15s ease, opacity .25s ease .15s'
          : 'width .12s ease',
        opacity: progress === 100 ? 0 : 1,
        boxShadow: '0 0 8px rgba(0,0,0,0.4)',
        borderRadius: '0 2px 2px 0',
      }} />
    </div>
  );
};
