'use client';
import { useEffect, useState } from 'react';

const F = "'Outfit', sans-serif";

export default function OpenInApp({ path = '' }: { path?: string }) {
  const [show, setShow]       = useState(false);
  const [visible, setVisible] = useState(false);
  const [pressing, setPressing] = useState(false);

  useEffect(() => {
    const ua = navigator.userAgent;
    const isAndroid = /Android/i.test(ua);
    const isIOS     = /iPhone|iPad|iPod/i.test(ua);
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
    }, 300);
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
    <>
      {/* Backdrop */}
      <div
        onClick={dismiss}
        style={{
          position: 'fixed', inset: 0, zIndex: 999,
          background: 'rgba(0,0,0,0.5)',
          backdropFilter: 'blur(4px)',
          WebkitBackdropFilter: 'blur(4px)',
          opacity: visible ? 1 : 0,
          transition: 'opacity 0.3s ease',
          pointerEvents: visible ? 'auto' : 'none',
        }}
      />

      {/* Bottom Sheet */}
      <div
        style={{
          position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 1000,
          background: 'rgba(14,14,14,0.97)',
          backdropFilter: 'blur(30px)',
          WebkitBackdropFilter: 'blur(30px)',
          borderTop: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '20px 20px 0 0',
          padding: '12px 20px 36px',
          transform: visible ? 'translateY(0)' : 'translateY(100%)',
          transition: 'transform 0.35s cubic-bezier(0.32, 0.72, 0, 1)',
          boxSizing: 'border-box',
        }}
      >
        {/* Drag handle */}
        <div style={{
          width: 36, height: 4, borderRadius: 2,
          background: 'rgba(255,255,255,0.15)',
          margin: '0 auto 20px',
        }} />

        {/* App info */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 24 }}>
          <img
            src="/icon.png"
            width={52} height={52} alt="Walls"
            style={{ borderRadius: 14, flexShrink: 0, boxShadow: '0 4px 16px rgba(255,107,53,0.3)' }}
          />
          <div>
            <div style={{
              fontFamily: F, fontWeight: 700, fontSize: 17,
              color: '#fff', lineHeight: 1.2,
            }}>
              Walls
            </div>
            <div style={{
              fontFamily: F, fontSize: 13,
              color: 'rgba(255,255,255,0.45)',
              marginTop: 3,
            }}>
              Get the full experience in the app
            </div>
            {/* Star rating */}
            <div style={{ display: 'flex', gap: 2, marginTop: 5 }}>
              {[1,2,3,4,5].map(i => (
                <svg key={i} width="11" height="11" viewBox="0 0 12 12" fill="#FF6B35">
                  <polygon points="6,1 7.5,4.5 11,5 8.5,7.5 9,11 6,9.5 3,11 3.5,7.5 1,5 4.5,4.5"/>
                </svg>
              ))}
              <span style={{ fontFamily: F, fontSize: 11, color: 'rgba(255,255,255,0.3)', marginLeft: 4 }}>
                Free
              </span>
            </div>
          </div>
        </div>

        {/* Open in App button */}
        <button
          onPointerDown={() => setPressing(true)}
          onPointerUp={() => { setPressing(false); handleOpen(); }}
          onPointerLeave={() => setPressing(false)}
          onPointerCancel={() => setPressing(false)}
          style={{
            width: '100%',
            padding: '15px',
            borderRadius: 14,
            border: 'none',
            background: pressing
              ? 'linear-gradient(135deg, #e55a25, #d93a00)'
              : 'linear-gradient(135deg, #FF6B35, #ff4500)',
            color: '#fff',
            fontFamily: F,
            fontWeight: 700,
            fontSize: 15,
            cursor: 'pointer',
            letterSpacing: 0.2,
            transform: pressing ? 'scale(0.97)' : 'scale(1)',
            transition: 'transform 0.12s ease, background 0.12s ease',
            WebkitTapHighlightColor: 'transparent',
            userSelect: 'none',
            boxSizing: 'border-box',
            boxShadow: '0 4px 20px rgba(255,107,53,0.35)',
          }}
        >
          Open in App
        </button>

        {/* Continue Browsing */}
        <button
          onClick={dismiss}
          style={{
            width: '100%',
            padding: '15px',
            borderRadius: 14,
            border: '1px solid rgba(255,255,255,0.1)',
            background: 'transparent',
            color: 'rgba(255,255,255,0.55)',
            fontFamily: F,
            fontWeight: 600,
            fontSize: 15,
            cursor: 'pointer',
            marginTop: 10,
            WebkitTapHighlightColor: 'transparent',
            userSelect: 'none',
            boxSizing: 'border-box',
            transition: 'color 0.15s ease, border-color 0.15s ease',
          }}
        >
          Continue Browsing
        </button>
      </div>
    </>
  );
}
