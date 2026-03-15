'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

export const TopLoader = () => {
  const pathname     = usePathname();
  const searchParams = useSearchParams();
  const [progress, setProgress] = useState(0);
  const [visible,  setVisible]  = useState(false);
  const timerRef    = useRef<ReturnType<typeof setTimeout>>();
  const intervalRef = useRef<ReturnType<typeof setInterval>>();

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

  useEffect(() => { finish(); }, [pathname, searchParams]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const a = (e.target as HTMLElement).closest('a');
      if (!a) return;
      const href = a.getAttribute('href');
      if (!href || href.startsWith('#') || href.startsWith('mailto') || a.target === '_blank') return;
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
      zIndex: 9999, height: 3, pointerEvents: 'none',
    }}>
      <div style={{
        height: '100%',
        width: `${progress}%`,
        background: 'linear-gradient(90deg, #2563eb 0%, #60a5fa 100%)',
        transition: progress === 100 ? 'width .15s ease' : 'width .12s ease',
        opacity: progress === 100 ? 0 : 1,
        transitionProperty: progress === 100 ? 'width, opacity' : 'width',
        transitionDuration: progress === 100 ? '.15s, .3s' : '.12s',
        transitionDelay: progress === 100 ? '0s, .15s' : '0s',
        boxShadow: '2px 0 12px rgba(37,99,235,0.6)',
        borderRadius: '0 2px 2px 0',
      }} />
    </div>
  );
};
