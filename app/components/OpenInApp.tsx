'use client';
import { useEffect, useState } from 'react';
import { X } from 'lucide-react';

const F = "'Outfit', sans-serif";

export default function OpenInApp({ path = '' }: { path?: string }) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const ua = navigator.userAgent;
    const isAndroid = /Android/i.test(ua);
    const isIOS = /iPhone|iPad|iPod/i.test(ua);
    if (!isAndroid || isIOS) return; // Android only
    const dismissed = localStorage.getItem('walls_app_banner_dismissed');
    if (!dismissed) setShow(true);
  }, []);

  const dismiss = () => {
    localStorage.setItem('walls_app_banner_dismissed', '1');
    setShow(false);
  };

  const handleOpen = () => {
    window.location.href = `walls://${path}`;
    setTimeout(() => {
      window.location.href = 'https://walls.ovrica.name.ng/download/walls.apk';
    }, 1500);
  };

  if (!show) return null;

  return (
    <div style={{
      position: 'fixed', bottom: 80, left: 12, right: 12, zIndex: 999,
      background: 'rgba(18,18,18,0.97)', backdropFilter: 'blur(20px)',
      borderRadius: 16, padding: '12px 14px',
      display: 'flex', alignItems: 'center', gap: 12,
      border: '1px solid rgba(255,255,255,0.08)',
      boxShadow: '0 8px 40px rgba(0,0,0,0.4)',
    }}>
      <img src="/icon.png" width={42} height={42} style={{ borderRadius: 10, flexShrink: 0 }} alt="Walls" />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: F, fontWeight: 700, fontSize: 14, color: '#fff' }}>Walls</div>
        <div style={{ fontFamily: F, fontSize: 12, color: 'rgba(255,255,255,0.45)' }}>Better in the app</div>
      </div>
      <button
        onClick={handleOpen}
        style={{
          padding: '8px 16px', borderRadius: 10, border: 'none',
          background: '#FF6B35', color: '#fff', fontFamily: F,
          fontWeight: 700, fontSize: 13, cursor: 'pointer', flexShrink: 0,
        }}
      >
        Open
      </button>
      <button
        onClick={dismiss}
        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, flexShrink: 0 }}
      >
        <X size={16} color="rgba(255,255,255,0.4)" />
      </button>
    </div>
  );
}