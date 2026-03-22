'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { TrendingUp, X, ChevronRight, Download, Eye, Heart } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/app/components/AuthProvider';

const SEEN_KEY = 'monet_announcement_seen';

export const MonetizationInfoModal = () => {
  const router   = useRouter();
  const supabase = createClient();
  const { session } = useAuth();

  const [show,    setShow]    = useState(false);
  const [visible, setVisible] = useState(false);

  // Check if we should show — runs once after 2s
  useEffect(() => {
    if (!session?.user?.id) return;
    if (localStorage.getItem(SEEN_KEY)) return;
    const t = setTimeout(async () => {
      try {
        const { data } = await supabase
          .from('profiles')
          .select('monetization_status')
          .eq('id', session.user.id)
          .single();
        if (data?.monetization_status === 'none') {
          setShow(true);
          setTimeout(() => setVisible(true), 80);
        }
      } catch {}
    }, 2000);
    return () => clearTimeout(t);
  }, [session?.user?.id]);

  const close = () => {
    setVisible(false);
    localStorage.setItem(SEEN_KEY, '1');
    setTimeout(() => setShow(false), 320);
  };

  const handleGetStarted = () => {
    close();
    setTimeout(() => router.push('/monetization/apply'), 320);
  };

  if (!show) return null;

  return (
    <>
      <style>{`
        @keyframes monet-bd-in { from{opacity:0} to{opacity:1} }
        @keyframes monet-up    { from{transform:translateY(100%)} to{transform:translateY(0)} }
        @keyframes monet-down  { from{transform:translateY(0)} to{transform:translateY(100%)} }
        .monet-bd  { animation: monet-bd-in .25s ease forwards; }
        .monet-in  { animation: monet-up    .35s cubic-bezier(.16,1,.3,1) forwards; }
        .monet-out { animation: monet-down  .28s cubic-bezier(.4,0,1,1)   forwards; }
        .monet-btn:active { transform: scale(0.97); }
        .monet-btn { transition: transform .12s; }
      `}</style>

      <div className="monet-bd" onClick={close}
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', zIndex: 80 }} />

      <div className={visible ? 'monet-in' : 'monet-out'} onClick={e => e.stopPropagation()}
        style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 81, background: '#fff', borderRadius: '24px 24px 0 0', paddingBottom: 'max(24px, env(safe-area-inset-bottom))', fontFamily: 'system-ui, sans-serif', maxWidth: 600, margin: '0 auto' }}>

        <div style={{ display: 'flex', justifyContent: 'center', padding: '14px 0 0' }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: 'rgba(0,0,0,0.1)' }} />
        </div>

        <button onClick={close} style={{ position: 'absolute', top: 14, right: 16, width: 30, height: 30, borderRadius: '50%', background: 'rgba(0,0,0,0.05)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
          <X size={14} color="rgba(0,0,0,0.45)" />
        </button>

        <div style={{ padding: '16px 20px 0' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', marginBottom: 20 }}>
            <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#0a0a0a', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
              <TrendingUp size={24} color="#fff" />
            </div>
            <p style={{ fontSize: 20, fontWeight: 700, color: '#0a0a0a', letterSpacing: '-0.02em', margin: '0 0 8px' }}>Monetization is Now Live 🎉</p>
            <p style={{ fontSize: 14, color: 'rgba(0,0,0,0.5)', lineHeight: 1.6, maxWidth: 300, margin: 0 }}>
              Earn money from your wallpapers based on views, downloads and likes every month.
            </p>
          </div>

          <div style={{ background: '#fafafa', borderRadius: 16, border: '1px solid rgba(0,0,0,0.06)', padding: '14px 16px', marginBottom: 14 }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: 'rgba(0,0,0,0.35)', textTransform: 'uppercase', letterSpacing: '0.07em', margin: '0 0 12px' }}>How you earn</p>
            {[
              { icon: Eye,      label: '1 View',     pts: '0.2 pts' },
              { icon: Download, label: '1 Download', pts: '10 pts'  },
              { icon: Heart,    label: '1 Like',     pts: '5 pts'   },
            ].map(({ icon: Icon, label, pts }, i, arr) => (
              <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 10, paddingBottom: i < arr.length - 1 ? 10 : 0, marginBottom: i < arr.length - 1 ? 10 : 0, borderBottom: i < arr.length - 1 ? '1px solid rgba(0,0,0,0.05)' : 'none' }}>
                <div style={{ width: 30, height: 30, borderRadius: 8, background: 'rgba(0,0,0,0.04)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Icon size={13} color="rgba(0,0,0,0.5)" />
                </div>
                <p style={{ flex: 1, fontSize: 13, fontWeight: 500, color: '#0a0a0a', margin: 0 }}>{label}</p>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#10b981' }}>{pts}</span>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: 'rgba(16,185,129,0.06)', borderRadius: 12, border: '1px solid rgba(16,185,129,0.15)', marginBottom: 20 }}>
            <span style={{ fontSize: 13, color: 'rgba(0,0,0,0.5)', flex: 1 }}>Points paid out monthly</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#10b981' }}>₦0.01 per point</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <button className="monet-btn" onClick={handleGetStarted}
              style={{ width: '100%', padding: '15px 0', borderRadius: 14, border: 'none', background: '#0a0a0a', color: '#fff', fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              Get Started <ChevronRight size={16} />
            </button>
            <button className="monet-btn" onClick={close}
              style={{ width: '100%', padding: '14px 0', borderRadius: 14, border: 'none', background: 'transparent', color: 'rgba(0,0,0,0.4)', fontSize: 14, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' }}>
              Maybe later
            </button>
          </div>
        </div>
      </div>
    </>
  );
};
