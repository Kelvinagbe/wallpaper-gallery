'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  ChevronLeft, TrendingUp, Download, Eye, Heart, Wallet,
  Clock, BarChart2, History, Sparkles, ChevronRight,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/app/components/AuthProvider';
import { Navigation } from '@/app/components/Navigation';

/* ─── helpers ─────────────────────────────────────────────── */
const fmt    = (n: number) =>
  n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M`
  : n >= 1_000   ? `${(n / 1_000).toFixed(1)}k`
  : String(n);

const fmtNgn = (n: number) =>
  `₦${n.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/* ─── shimmer ─────────────────────────────────────────────── */
const Shimmer = ({ w, h, r = 10 }: { w: string | number; h: string | number; r?: number }) => (
  <div style={{
    width: w, height: h, borderRadius: r, flexShrink: 0,
    background: 'linear-gradient(90deg,#f0f0f0 25%,#e4e4e4 50%,#f0f0f0 75%)',
    backgroundSize: '200% 100%', animation: 'shimmer 1.4s ease infinite',
  }} />
);

/* ─── types ───────────────────────────────────────────────── */
interface MonthlyStats { month: string; views: number; downloads: number; likes: number; score: number; }
interface Earning      { id: string; amount: number; month: string; score: number; pool_amount: number; created_at: string; }

/* ═══════════════════════════════════════════════════════════ */
export default function MonetizationPage() {
  const router   = useRouter();
  const supabase = createClient();
  const { profile, isLoading: authLoading } = useAuth();

  const [tab,        setTab]       = useState<'overview' | 'history'>('overview');
  const [loading,    setLoading]   = useState(true);
  const [balance,    setBalance]   = useState(0);
  const [totalEarned, setTotalEarned] = useState(0);
  const [thisMonth,  setThisMonth] = useState<MonthlyStats | null>(null);
  const [earnings,   setEarnings]  = useState<Earning[]>([]);
  const [poolAmount, setPoolAmount] = useState(0);
  const [estimated,  setEstimated] = useState(0);

  useEffect(() => {
    if (authLoading) return;
    if (!profile?.id) { router.replace('/profile'); return; }
    load();
  }, [profile?.id, authLoading]);

  const load = async () => {
    try {
      const currentMonth = new Date().toISOString().slice(0, 7);

      const [profileRes, statsRes, earningsRes, poolRes] = await Promise.all([
        supabase.from('profiles').select('balance, total_earned, monetization_status').eq('id', profile!.id).single(),
        supabase.from('monthly_stats').select('*').eq('user_id', profile!.id).eq('month', currentMonth),
        supabase.from('earnings').select('*').eq('user_id', profile!.id).order('created_at', { ascending: false }).limit(12),
        supabase.from('monthly_pools').select('amount').eq('month', currentMonth).eq('distributed', false).maybeSingle(),
      ]);

      if (profileRes.data?.monetization_status !== 'approved') {
        router.replace('/monetization/apply'); return;
      }

      setBalance(profileRes.data?.balance ?? 0);
      setTotalEarned(profileRes.data?.total_earned ?? 0);
      setEarnings(earningsRes.data ?? []);

      const stats = statsRes.data ?? [];
      const agg: MonthlyStats = {
        month:     currentMonth,
        views:     stats.reduce((s: number, r: MonthlyStats) => s + r.views, 0),
        downloads: stats.reduce((s: number, r: MonthlyStats) => s + r.downloads, 0),
        likes:     stats.reduce((s: number, r: MonthlyStats) => s + r.likes, 0),
        score:     stats.reduce((s: number, r: MonthlyStats) => s + r.score, 0),
      };
      setThisMonth(agg);

      const pool  = poolRes.data?.amount ?? 0;
      const score = (agg.views * 0.2) + (agg.downloads * 10) + (agg.likes * 5);
      const raw   = score * 0.01;
      setPoolAmount(pool);
      setEstimated(pool > 0 ? Math.min(raw, pool) : raw);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const monthLabel = new Date().toLocaleString('default', { month: 'long', year: 'numeric' });

  /* ── stat cards data ── */
  const statCards = [
    { icon: Eye,      label: 'Views',     value: fmt(thisMonth?.views ?? 0) },
    { icon: Download, label: 'Downloads', value: fmt(thisMonth?.downloads ?? 0) },
    { icon: Heart,    label: 'Likes',     value: fmt(thisMonth?.likes ?? 0) },
  ];

  /* ── how it works rows ── */
  const howRows = [
    { icon: Eye,      label: '1 View',     note: 'Logged-in users only' },
    { icon: Download, label: '1 Download', note: 'Unique per user'      },
    { icon: Heart,    label: '1 Like',     note: 'Unique per user'      },
  ];

  return (
    <div style={{
      minHeight: '100dvh', background: '#f7f7f7',
      fontFamily: "'DM Sans', system-ui, sans-serif",
      color: '#111', paddingBottom: 110,
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap');
        @keyframes shimmer { 0%,100%{background-position:200% 0} 50%{background-position:-200% 0} }
        @keyframes up { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:translateY(0)} }
        .up { animation: up .38s cubic-bezier(.16,1,.3,1) both; }
        .up-1 { animation-delay:.04s }
        .up-2 { animation-delay:.08s }
        .up-3 { animation-delay:.12s }
        .up-4 { animation-delay:.16s }
        .up-5 { animation-delay:.20s }
        .tab-pill { transition: background .18s, color .18s; cursor: pointer; border: none; font-family: inherit; }
        .tap:active { opacity: .65 !important; }
      `}</style>

      {/* ── sticky header ── */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 30,
        background: 'rgba(247,247,247,0.94)',
        backdropFilter: 'blur(18px)', WebkitBackdropFilter: 'blur(18px)',
        borderBottom: '1px solid rgba(0,0,0,0.07)',
      }}>
        {/* top bar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '13px 16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button
              onClick={() => router.back()}
              className="tap"
              style={{ width: 34, height: 34, borderRadius: '50%', background: 'rgba(0,0,0,0.06)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
              <ChevronLeft size={18} strokeWidth={2.5} color="#111" />
            </button>
            <span style={{ fontSize: 15, fontWeight: 700, letterSpacing: '-0.01em' }}>Creator Studio</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 11px', borderRadius: 20, background: 'rgba(22,163,74,0.09)', border: '1px solid rgba(22,163,74,0.22)' }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#16a34a' }} />
            <span style={{ fontSize: 11, fontWeight: 700, color: '#16a34a', letterSpacing: '0.01em' }}>Monetized</span>
          </div>
        </div>

        {/* tab switcher */}
        <div style={{ display: 'flex', padding: '0 16px 12px', gap: 6 }}>
          {(['overview', 'history'] as const).map(t => (
            <button
              key={t}
              className="tab-pill"
              onClick={() => setTab(t)}
              style={{
                padding: '7px 16px', borderRadius: 20, fontSize: 13, fontWeight: 600,
                background: tab === t ? '#111' : 'rgba(0,0,0,0.06)',
                color: tab === t ? '#fff' : 'rgba(0,0,0,0.45)',
                display: 'flex', alignItems: 'center', gap: 6,
              }}>
              {t === 'overview' ? <BarChart2 size={13} /> : <History size={13} />}
              {t === 'overview' ? 'Overview' : 'History'}
            </button>
          ))}
        </div>
      </div>

      <div style={{ maxWidth: 600, margin: '0 auto', padding: '16px 14px' }}>

        {/* ─── loading ─── */}
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <Shimmer w="100%" h={130} r={18} />
            <Shimmer w="100%" h={170} r={18} />
            <Shimmer w="100%" h={160} r={18} />
          </div>

        ) : tab === 'overview' ? (
          /* ══════════════ OVERVIEW TAB ══════════════ */
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

            {/* balance card */}
            <div className="up" style={{
              borderRadius: 20, background: '#111', color: '#fff',
              padding: '22px 20px', position: 'relative', overflow: 'hidden',
            }}>
              {/* decorative circle */}
              <div style={{ position: 'absolute', right: -30, top: -30, width: 140, height: 140, borderRadius: '50%', background: 'rgba(255,255,255,0.04)', pointerEvents: 'none' }} />
              <div style={{ position: 'absolute', right: 20, top: 20, width: 70, height: 70, borderRadius: '50%', background: 'rgba(255,255,255,0.04)', pointerEvents: 'none' }} />

              <p style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 6px' }}>Available Balance</p>
              <p style={{ fontSize: 34, fontWeight: 700, letterSpacing: '-0.03em', margin: '0 0 18px', lineHeight: 1 }}>{fmtNgn(balance)}</p>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.38)', margin: '0 0 2px' }}>Total Earned</p>
                  <p style={{ fontSize: 14, fontWeight: 700, margin: 0 }}>{fmtNgn(totalEarned)}</p>
                </div>
                <button
                  disabled
                  style={{
                    padding: '9px 18px', borderRadius: 22, border: '1px solid rgba(255,255,255,0.14)',
                    background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.35)',
                    fontSize: 12, fontWeight: 600, cursor: 'not-allowed', fontFamily: 'inherit',
                    display: 'flex', alignItems: 'center', gap: 6,
                  }}>
                  <Wallet size={13} />
                  Withdraw · Soon
                </button>
              </div>
            </div>

            {/* this month performance */}
            <div className="up up-1" style={{ borderRadius: 20, background: '#fff', border: '1px solid rgba(0,0,0,0.07)', overflow: 'hidden' }}>
              {/* section head */}
              <div style={{ padding: '16px 18px 14px', borderBottom: '1px solid rgba(0,0,0,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <p style={{ fontSize: 13, fontWeight: 700, margin: '0 0 2px', letterSpacing: '-0.01em' }}>{monthLabel}</p>
                  <p style={{ fontSize: 11, color: 'rgba(0,0,0,0.4)', margin: 0 }}>Your performance this month</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ fontSize: 10, color: 'rgba(0,0,0,0.38)', margin: '0 0 2px' }}>Est. earnings</p>
                  <p style={{ fontSize: 17, fontWeight: 700, color: '#16a34a', margin: 0, letterSpacing: '-0.02em' }}>{fmtNgn(estimated)}</p>
                </div>
              </div>

              {/* 3 stat tiles */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 1, background: 'rgba(0,0,0,0.05)' }}>
                {statCards.map(({ icon: Icon, label, value }) => (
                  <div key={label} style={{ background: '#fff', padding: '14px 10px', textAlign: 'center' }}>
                    <Icon size={15} color="rgba(0,0,0,0.3)" style={{ marginBottom: 7 }} />
                    <p style={{ fontSize: 20, fontWeight: 700, margin: '0 0 3px', letterSpacing: '-0.03em', lineHeight: 1 }}>{value}</p>
                    <p style={{ fontSize: 10, color: 'rgba(0,0,0,0.38)', margin: 0, fontWeight: 500 }}>{label}</p>
                  </div>
                ))}
              </div>

              {/* pool note */}
              {poolAmount > 0 && (
                <div style={{ padding: '11px 18px', background: 'rgba(22,163,74,0.04)', borderTop: '1px solid rgba(22,163,74,0.09)', display: 'flex', alignItems: 'center', gap: 7 }}>
                  <Sparkles size={13} color="#16a34a" />
                  <p style={{ fontSize: 11, color: '#16a34a', margin: 0, fontWeight: 600 }}>
                    Monthly pool: {fmtNgn(poolAmount)} · Distributed at month end
                  </p>
                </div>
              )}
            </div>

            {/* how scoring works */}
            <div className="up up-2" style={{ borderRadius: 20, background: '#fff', border: '1px solid rgba(0,0,0,0.07)', padding: '16px 18px' }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: 'rgba(0,0,0,0.35)', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 14px' }}>How it works</p>
              {howRows.map(({ icon: Icon, label, note }, i, arr) => (
                <div key={label} style={{
                  display: 'flex', alignItems: 'center', gap: 13,
                  paddingBottom: i < arr.length - 1 ? 12 : 0,
                  marginBottom:  i < arr.length - 1 ? 12 : 0,
                  borderBottom:  i < arr.length - 1 ? '1px solid rgba(0,0,0,0.05)' : 'none',
                }}>
                  <div style={{
                    width: 34, height: 34, borderRadius: 10,
                    background: 'rgba(0,0,0,0.04)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  }}>
                    <Icon size={14} color="rgba(0,0,0,0.45)" />
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 13, fontWeight: 600, margin: '0 0 1px', color: '#111' }}>{label}</p>
                    <p style={{ fontSize: 11, color: 'rgba(0,0,0,0.38)', margin: 0 }}>{note}</p>
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 700, color: 'rgba(0,0,0,0.3)', letterSpacing: '-0.01em' }}>contributes</span>
                </div>
              ))}
              <div style={{ marginTop: 14, padding: '11px 14px', background: '#f7f7f7', borderRadius: 12 }}>
                <p style={{ fontSize: 11, color: 'rgba(0,0,0,0.45)', margin: 0, lineHeight: 1.6 }}>
                  Earnings are based on your engagement relative to all creators in the monthly pool. Higher activity = larger share.
                </p>
              </div>
            </div>

            {/* quick link to history */}
            {earnings.length > 0 && (
              <button
                className="up up-3 tap"
                onClick={() => setTab('history')}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  width: '100%', padding: '14px 18px', borderRadius: 20,
                  background: '#fff', border: '1px solid rgba(0,0,0,0.07)',
                  cursor: 'pointer', fontFamily: 'inherit',
                }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 34, height: 34, borderRadius: 10, background: 'rgba(0,0,0,0.04)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <History size={15} color="rgba(0,0,0,0.4)" />
                  </div>
                  <div style={{ textAlign: 'left' }}>
                    <p style={{ fontSize: 13, fontWeight: 600, margin: '0 0 1px', color: '#111' }}>Earnings History</p>
                    <p style={{ fontSize: 11, color: 'rgba(0,0,0,0.38)', margin: 0 }}>{earnings.length} payout{earnings.length !== 1 ? 's' : ''} recorded</p>
                  </div>
                </div>
                <ChevronRight size={16} color="rgba(0,0,0,0.25)" />
              </button>
            )}
          </div>

        ) : (
          /* ══════════════ HISTORY TAB ══════════════ */
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

            {/* summary strip */}
            <div className="up" style={{
              borderRadius: 20, background: '#fff', border: '1px solid rgba(0,0,0,0.07)',
              padding: '16px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <div>
                <p style={{ fontSize: 11, color: 'rgba(0,0,0,0.38)', margin: '0 0 3px', fontWeight: 500 }}>Total Earned (all time)</p>
                <p style={{ fontSize: 22, fontWeight: 700, margin: 0, letterSpacing: '-0.03em', color: '#111' }}>{fmtNgn(totalEarned)}</p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <p style={{ fontSize: 11, color: 'rgba(0,0,0,0.38)', margin: '0 0 3px', fontWeight: 500 }}>Payouts</p>
                <p style={{ fontSize: 22, fontWeight: 700, margin: 0, letterSpacing: '-0.03em', color: '#111' }}>{earnings.length}</p>
              </div>
            </div>

            {earnings.length === 0 ? (
              <div className="up up-1" style={{
                borderRadius: 20, background: '#fff', border: '1px solid rgba(0,0,0,0.07)',
                padding: '48px 20px', textAlign: 'center',
              }}>
                <div style={{ width: 50, height: 50, borderRadius: '50%', background: '#f0f0f0', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
                  <Clock size={20} color="rgba(0,0,0,0.2)" />
                </div>
                <p style={{ fontSize: 14, fontWeight: 700, margin: '0 0 6px', color: '#111' }}>No payouts yet</p>
                <p style={{ fontSize: 12, color: 'rgba(0,0,0,0.38)', margin: 0, lineHeight: 1.6, maxWidth: 220, marginLeft: 'auto', marginRight: 'auto' }}>
                  Earnings are calculated at the end of each month and added to your balance.
                </p>
              </div>
            ) : (
              <div className="up up-1" style={{ borderRadius: 20, background: '#fff', border: '1px solid rgba(0,0,0,0.07)', overflow: 'hidden' }}>
                {earnings.map((e, i) => {
                  const label = new Date(e.month + '-01').toLocaleString('default', { month: 'long', year: 'numeric' });
                  return (
                    <div key={e.id} style={{
                      display: 'flex', alignItems: 'center', gap: 13,
                      padding: '14px 18px',
                      borderBottom: i < earnings.length - 1 ? '1px solid rgba(0,0,0,0.05)' : 'none',
                    }}>
                      <div style={{
                        width: 38, height: 38, borderRadius: 11,
                        background: 'rgba(22,163,74,0.08)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                      }}>
                        <TrendingUp size={15} color="#16a34a" />
                      </div>
                      <div style={{ flex: 1 }}>
                        <p style={{ fontSize: 13, fontWeight: 600, margin: '0 0 2px', color: '#111' }}>{label}</p>
                        <p style={{ fontSize: 11, color: 'rgba(0,0,0,0.38)', margin: 0 }}>
                          Pool · {fmtNgn(e.pool_amount)}
                        </p>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <p style={{ fontSize: 15, fontWeight: 700, margin: '0 0 1px', color: '#16a34a', letterSpacing: '-0.02em' }}>{fmtNgn(e.amount)}</p>
                        <p style={{ fontSize: 10, color: 'rgba(0,0,0,0.3)', margin: 0, fontWeight: 500 }}>credited</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="up up-2" style={{
              borderRadius: 16, background: 'rgba(0,0,0,0.03)',
              padding: '13px 16px',
            }}>
              <p style={{ fontSize: 11, color: 'rgba(0,0,0,0.4)', margin: 0, lineHeight: 1.6 }}>
                Payouts are processed monthly. Earned amounts are added to your available balance.
              </p>
            </div>
          </div>
        )}
      </div>

      <Navigation />
    </div>
  );
}
    