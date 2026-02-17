'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

// ─── Global trigger ───────────────────────────────────────────────────────────
let _show: ((v: boolean) => void) | null = null;

export const useNavLoader = () => {
  const router = useRouter();

  const navigate = (path: string) => {
    _show?.(true);
    setTimeout(() => router.push(path), 60);
  };

  return { navigate };
};

// ─── Drop <NavLoader /> once in your root layout or each page ─────────────────
export const NavLoader = () => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    _show = setVisible;
    return () => { _show = null; };
  }, []);

  // Safety fallback — hides if navigation takes too long
  useEffect(() => {
    if (!visible) return;
    const t = setTimeout(() => setVisible(false), 3000);
    return () => clearTimeout(t);
  }, [visible]);

  if (!visible) return null;

  return (
    <>
      <style>{`
        @keyframes dotBounce {
          0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; }
          40%            { transform: scale(1);   opacity: 1;   }
        }
        .nav-dot {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          background: #ffffff;
          animation: dotBounce 1.2s ease-in-out infinite;
        }
        .nav-dot:nth-child(1) { animation-delay: 0s;   }
        .nav-dot:nth-child(2) { animation-delay: 0.2s; }
        .nav-dot:nth-child(3) { animation-delay: 0.4s; }
      `}</style>

      {/* Dim overlay behind the dots */}
      <div style={{
        position: 'fixed', inset: 0,
        background: 'rgba(0,0,0,0.45)',
        backdropFilter: 'blur(2px)',
        zIndex: 99998,
        pointerEvents: 'all',
      }} />

      {/* Three bouncing dots centered on screen */}
      <div style={{
        position: 'fixed', top: '50%', left: '50%',
        transform: 'translate(-50%,-50%)',
        zIndex: 99999,
        display: 'flex', alignItems: 'center', gap: '10px',
        pointerEvents: 'none',
      }}>
        <div className="nav-dot" />
        <div className="nav-dot" />
        <div className="nav-dot" />
      </div>
    </>
  );
};
