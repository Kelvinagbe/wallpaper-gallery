'use client';
import { useEffect, useState } from 'react';

const F = "'Outfit', sans-serif";

export default function CookiesDialog() {
  const [show, setShow]       = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem('walls_cookie_consent');
    if (!consent) {
      // Slight delay so it doesn't flash on load
      const t = setTimeout(() => {
        setShow(true);
        requestAnimationFrame(() => setTimeout(() => setVisible(true), 10));
      }, 800);
      return () => clearTimeout(t);
    }
  }, []);

  const accept = (type: 'all' | 'essential') => {
    localStorage.setItem('walls_cookie_consent', type);
    setVisible(false);
    setTimeout(() => setShow(false), 300);
  };

  if (!show) return null;

  return (
    <>
      {/* Backdrop (optional, subtle) */}
      <div style={{
        position: 'fixed', inset: 0, zIndex: 998,
        background: 'rgba(0,0,0,0.2)',
        opacity: visible ? 1 : 0,
        transition: 'opacity 0.3s ease',
        pointerEvents: 'none',
      }} />

      {/* Cookie bar */}
      <div
        style={{
          position: 'fixed',
          bottom: 0, left: 0, right: 0,
          zIndex: 999,
          background: 'rgba(12,12,12,0.96)',
          backdropFilter: 'blur(28px)',
          WebkitBackdropFilter: 'blur(28px)',
          borderTop: '1px solid rgba(255,255,255,0.07)',
          padding: '18px 20px 28px',
          boxSizing: 'border-box',
          transform: visible ? 'translateY(0)' : 'translateY(100%)',
          transition: 'transform 0.35s cubic-bezier(0.32, 0.72, 0, 1)',
        }}
      >
        {/* Icon + heading */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
          <span style={{ fontSize: 20 }}>🍪</span>
          <span style={{
            fontFamily: F, fontWeight: 700, fontSize: 15, color: '#fff',
          }}>
            We use cookies
          </span>
        </div>

        {/* Body text */}
        <p style={{
          fontFamily: F, fontSize: 12.5,
          color: 'rgba(255,255,255,0.45)',
          lineHeight: 1.6,
          margin: '0 0 18px',
        }}>
          We use cookies to improve your browsing experience, show personalised content, and analyse traffic.
          You can choose to accept all cookies or only essential ones.{' '}
          <a
            href="/privacy"
            style={{ color: '#FF6B35', textDecoration: 'none', fontWeight: 600 }}
          >
            Learn more
          </a>
        </p>

        {/* Buttons */}
        <div style={{ display: 'flex', gap: 10 }}>
          {/* Accept All */}
          <button
            onClick={() => accept('all')}
            style={{
              flex: 1,
              padding: '13px 0',
              borderRadius: 12,
              border: 'none',
              background: 'linear-gradient(135deg, #FF6B35, #ff4500)',
              color: '#fff',
              fontFamily: F,
              fontWeight: 700,
              fontSize: 13.5,
              cursor: 'pointer',
              WebkitTapHighlightColor: 'transparent',
              userSelect: 'none',
              boxShadow: '0 4px 16px rgba(255,107,53,0.3)',
              transition: 'opacity 0.15s',
            }}
          >
            Accept All
          </button>

          {/* Essential Only */}
          <button
            onClick={() => accept('essential')}
            style={{
              flex: 1,
              padding: '13px 0',
              borderRadius: 12,
              border: '1px solid rgba(255,255,255,0.1)',
              background: 'transparent',
              color: 'rgba(255,255,255,0.5)',
              fontFamily: F,
              fontWeight: 600,
              fontSize: 13.5,
              cursor: 'pointer',
              WebkitTapHighlightColor: 'transparent',
              userSelect: 'none',
              transition: 'color 0.15s, border-color 0.15s',
            }}
          >
            Essential Only
          </button>
        </div>
      </div>
    </>
  );
}
