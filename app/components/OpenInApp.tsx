
'use client';
import { useEffect, useState } from 'react';
import { X } from 'lucide-react';

const F = "'Outfit', sans-serif";

export default function OpenInApp({ path = '' }: { path?: string }) {
  const [show, setShow] = useState(false);
  const [visible, setVisible] = useState(false);
  const [pressing, setPressing] = useState(false);

  useEffect(() => {
    const ua = navigator.userAgent;
    const isAndroid = /Android/i.test(ua);
    const isIOS = /iPhone|iPad|iPod/i.test(ua);
    if (!isAndroid || isIOS) return;
    const dismissed = localStorage.getItem('walls_app_banner_dismissed');
    if (!dismissed) {
      setShow(true);
      requestAnimationFrame(() => setTimeout(() => setVisible(true), 10));
    }
  }, []);

  const dismiss = () => {
    setVisible(false);
    setTimeout(() => {
      localStorage.setItem('walls_app_banner_dismissed', '1');
      setShow(false);
    }, 250);
  };

  const handleOpen = () => {
    window.location.href = `walls://${path}`;

    const timer = setTimeout(() => {
      if (!document.hidden) {
        window.location.href = 'https://www.mediafire.com/file/th219ryqdf49ap9/walls-arm64.apk';
      }
    }, 2000);

    const handleVisibilityChange = () => {
      if (document.hidden) {
        clearTimeout(timer);
        document.removeEventListener('visibilitychange', handleVisibilityChange);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
  };

  if (!show) return null;

  return (
    <div
      style={{
        width: '100%',
        background: 'rgba(10,10,10,0.92)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        borderBottom: '1px solid rgba(255,255,255,0.07)',
        padding: '10px 16px',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(-8px)',
        transition: 'opacity 0.25s ease, transform 0.25s ease',
        boxSizing: 'border-box',
      }}
    >
      <img
        src="/icon.png"
        width={36}
        height={36}
        alt="Walls"
        style={{ borderRadius: 9, flexShrink: 0 }}
      />

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontFamily: F, fontWeight: 700, fontSize: 13,
          color: '#fff', lineHeight: 1.2,
        }}>
          Walls
        </div>
        <div style={{
          fontFamily: F, fontSize: 11,
          color: 'rgba(255,255,255,0.4)',
          marginTop: 1,
        }}>
          Better experience in the app
        </div>
      </div>

      <button
        onPointerDown={() => setPressing(true)}
        onPointerUp={() => { setPressing(false); handleOpen(); }}
        onPointerLeave={() => setPressing(false)}
        onPointerCancel={() => setPressing(false)}
        style={{
          padding: '7px 18px',
          borderRadius: 20,
          border: 'none',
          background: pressing
            ? 'linear-gradient(135deg, #e55a25, #d93a00)'
            : 'linear-gradient(135deg, #FF6B35, #ff4500)',
          color: '#fff',
          fontFamily: F,
          fontWeight: 700,
          fontSize: 12,
          cursor: 'pointer',
          flexShrink: 0,
          letterSpacing: 0.2,
          transform: pressing ? 'scale(0.93)' : 'scale(1)',
          transition: 'transform 0.12s ease, background 0.12s ease',
          WebkitTapHighlightColor: 'transparent',
          userSelect: 'none',
        }}
      >
        Open
      </button>

      <button
        onClick={dismiss}
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          padding: 4,
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          WebkitTapHighlightColor: 'transparent',
        }}
      >
        <X size={14} color="rgba(255,255,255,0.3)" />
      </button>
    </div>
  );
}