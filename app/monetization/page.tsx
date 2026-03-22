'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, TrendingUp, Download, Eye, Heart, Clock, Wallet, ChevronRight } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/app/components/AuthProvider';
import { Navigation } from '@/app/components/Navigation';

const fmt    = (n: number) => n >= 1_000_000 ? `${(n/1_000_000).toFixed(1)}M` : n >= 1_000 ? `${(n/1_000).toFixed(1)}k` : String(n);
const fmtNgn = (n: number) => `₦${n.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const Shimmer = ({ w, h, r = 8 }: { w: string | number; h: string | number; r?: number }) => (
  <div style={{ width: w, height: h, borderRadius: r, flexShrink: 0,
    background: 'linear-gradient(90deg,#ececec 25%,#e0e0e0 50%,#ececec 75%)',
    backgroundSize: '200% 100%', animation: 'shimmer 1.4s ease infinite' }} />
);

interface MonthlyStats {
  month: string; views: number; downloads: number; likes: number; score: number;
}

interface Earning {
  id: string; amount: number; month: string; score: number; pool_amount: number; created_at: string;
}

export default function MonetizationPage() {
  const router   = useRouter();
  const supabase = createClient();
  const { profile, isLoading: authLoading } = useAuth();

  const [loading,      setLoading]      = useState(true);
  const [balance,      setBalance]      = useState(0);
  const [totalEarned,  setTotalEarned]  = useState(0);
  const [thisMonth,    setThisMonth]    = useState<MonthlyStats | null>(null);
  const [earnings,     setEarnings]     = useState<Earning[]>([]);
  const [poolAmount,   setPoolAmount]   = useState(0);
  const [estimatedEarnings, setEstimatedEarnings] = useState(0);

  useEffect(() => {
    if (authLoading) return;
    if (!profile?.id) { router.replace('/profile'); return; }
    load();
  }, [profile?.id, authLoading]);

  const load = async () => {
    try {
      const currentMonth = new Date().toISOString().slice(0, 7); // 'YYYY-MM'

      const [profileRes, statsRes, earningsRes, poolRes] = await Promise.all([
        supabase.from('profiles').select('balance, total_earned, monetization_status').eq('id', profile!.id).single(),
        supabase.from('monthly_stats').select('*').eq('user_id', profile!.id).eq('month', currentMonth),
        supabase.from('earnings').select('*').eq('user_id', profile!.id).order('created_at', { ascending: false }).limit(12),
        supabase.from('monthly_pools').select('amount').eq('month', currentMonth).eq('distributed', false).maybeSingle(),
      ]);

      // Redirect if not approved
      if (profileRes.data?.monetization_status !== 'approved') {
        router.replace('/monetization/apply'); return;
      }

      setBalance(profileRes.data?.balance ?? 0);
      setTotalEarned(profileRes.data?.total_earned ?? 0);
      setEarnings(earningsRes.data ?? []);

      // Aggregate this month's stats across all wallpapers
      const stats = statsRes.data ?? [];
      const agg: MonthlyStats = {
        month:     currentMonth,
        views:     stats.reduce((s: number, r) => s + r.views, 0),
        downloads: stats.reduce((s: number, r) => s + r.downloads, 0),
        likes:     stats.reduce((s: number, r) => s + r.likes, 0),
        score:     stats.reduce((s: number, r) => s + r.score, 0),
      };
      setThisMonth(agg);

      // Calculate estimated earnings
      const pool   = poolRes.data?.amount ?? 0;
      const score  = (agg.views * 0.2) + (agg.downloads * 10) + (agg.likes * 5);
      const raw    = score * 0.01;
      setPoolAmount(pool);
      setEstimatedEarnings(pool > 0 ? Math.min(raw, pool) : raw);

    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const currentMonth = new Date().toLocaleString('default', { month: 'long', year: 'numeric' });

  return (
    <div style={{ minHeight: '100dvh', background: '#fff', fontFamily: 'system-ui, sans-serif', color: '#0a0a0a', paddingBottom: 100 }}>
      <style>{`
        @keyframes shimmer { 0%,100%{background-position:200% 0} 50%{background-position:-200% 0} }
        @keyframes fadeUp  { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
        .fade-up { animation: fadeUp .35s cubic-bezier(.16,1,.3,1) forwards; }
        .row-btn:active { background: rgba(0,0,0,0.03) !important; }
        .row-btn { transition: background .1s; }
      `}</style>

      {/* Header */}
      <div style={{ position: 'sticky', top: 0, zIndex: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button onClick={() => router.back()} style={{ width: 34, height: 34, borderRadius: '50%', background: 'rgba(0,0,0,0.05)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            <ChevronLeft size={18} color="#0a0a0a" strokeWidth={2.5} />
          </button>
          <p style={{ fontSize: 15, fontWeight: 700 }}>My Earnings</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 12px', borderRadius: 20, background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)' }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981' }} />
          <span style={{ fontSize: 11, fontWeight: 600, color: '#10b981' }}>Active</span>
        </div>
      </div>

      <div style={{ maxWidth: 600, margin: '0 auto', padding: '20px 16px' }}>

        {loading ? (
          <div className="fade-up" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <Shimmer w="100%" h={140} r={20} />
            <Shimmer w="100%" h={180} r={20} />
            <Shimmer w="100%" h={200} r={20} />
          </div>
        ) : (
          <div className="fade-up" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* Balance card */}
            <div style={{ borderRadius: 20, background: '#0a0a0a', padding: '24px 20px', color: '#fff' }}>
              <p style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.07em', margin: '0 0 8px' }}>Available Balance</p>
              <p style={{ fontSize: 36, fontWeight: 700, letterSpacing: '-0.03em', margin: '0 0 16px' }}>{fmtNgn(balance)}</p>
              <div style={{ height: 1, background: 'rgba(255,255,255,0.1)', marginBottom: 16 }} />
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', margin: '0 0 2px' }}>Total Earned</p>
                  <p style={{ fontSize: 15, fontWeight: 700, margin: 0 }}>{fmtNgn(totalEarned)}</p>
                </div>
                {/* Withdraw button — visible but coming soon */}
                <button
                  disabled
                  style={{ padding: '10px 20px', borderRadius: 24, border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.4)', fontSize: 13, fontWeight: 600, cursor: 'not-allowed', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 7 }}>
                  <Wallet size={14} />
                  Withdraw · Soon
                </button>
              </div>
            </div>

            {/* This month */}
            <div style={{ borderRadius: 20, border: '1px solid rgba(0,0,0,0.07)', background: '#fafafa', padding: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <div>
                  <p style={{ fontSize: 13, fontWeight: 700, color: '#0a0a0a', margin: '0 0 2px' }}>{currentMonth}</p>
                  <p style={{ fontSize: 11, color: 'rgba(0,0,0,0.4)', margin: 0 }}>Current month activity</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ fontSize: 11, color: 'rgba(0,0,0,0.4)', margin: '0 0 2px' }}>Est. earnings</p>
                  <p style={{ fontSize: 16, fontWeight: 700, color: '#10b981', margin: 0 }}>{fmtNgn(estimatedEarnings)}</p>
                </div>
              </div>

              {/* Stats grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8 }}>
                {[
                  { icon: Eye,      label: 'Views',     value: fmt(thisMonth?.views ?? 0),     pts: `+${((thisMonth?.views ?? 0) * 0.2).toFixed(0)} pts` },
                  { icon: Download, label: 'Downloads', value: fmt(thisMonth?.downloads ?? 0), pts: `+${((thisMonth?.downloads ?? 0) * 10).toFixed(0)} pts` },
                  { icon: Heart,    label: 'Likes',     value: fmt(thisMonth?.likes ?? 0),     pts: `+${((thisMonth?.likes ?? 0) * 5).toFixed(0)} pts` },
                ].map(({ icon: Icon, label, value, pts }) => (
                  <div key={label} style={{ background: '#fff', borderRadius: 14, border: '1px solid rgba(0,0,0,0.06)', padding: '12px 10px', textAlign: 'center' }}>
                    <Icon size={16} color="rgba(0,0,0,0.35)" style={{ marginBottom: 6 }} />
                    <p style={{ fontSize: 18, fontWeight: 700, margin: '0 0 2px', letterSpacing: '-0.02em' }}>{value}</p>
                    <p style={{ fontSize: 10, color: 'rgba(0,0,0,0.4)', margin: '0 0 4px' }}>{label}</p>
                    <p style={{ fontSize: 10, fontWeight: 600, color: '#10b981', margin: 0 }}>{pts}</p>
                  </div>
                ))}
              </div>

              {/* Total score */}
              <div style={{ marginTop: 12, padding: '10px 14px', background: '#fff', borderRadius: 12, border: '1px solid rgba(0,0,0,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                  <TrendingUp size={14} color="rgba(0,0,0,0.4)" />
                  <span style={{ fontSize: 13, color: 'rgba(0,0,0,0.5)', fontWeight: 500 }}>Total score this month</span>
                </div>
                <span style={{ fontSize: 14, fontWeight: 700, color: '#0a0a0a' }}>
                  {((thisMonth?.views ?? 0) * 0.2 + (thisMonth?.downloads ?? 0) * 10 + (thisMonth?.likes ?? 0) * 5).toFixed(1)} pts
                </span>
              </div>

              {poolAmount > 0 && (
                <p style={{ fontSize: 11, color: 'rgba(0,0,0,0.35)', margin: '10px 0 0', textAlign: 'center' }}>
                  Pool this month: {fmtNgn(poolAmount)} · ₦0.01 per point
                </p>
              )}
            </div>

            {/* How scoring works */}
            <div style={{ borderRadius: 20, border: '1px solid rgba(0,0,0,0.07)', background: '#fafafa', padding: '16px 20px' }}>
              <p style={{ fontSize: 12, fontWeight: 700, color: 'rgba(0,0,0,0.4)', textTransform: 'uppercase', letterSpacing: '0.07em', margin: '0 0 12px' }}>How scoring works</p>
              {[
                { icon: Eye,      label: '1 View',     pts: '0.2 pts', note: 'Logged in users only' },
                { icon: Download, label: '1 Download', pts: '10 pts',  note: 'Unique per user'       },
                { icon: Heart,    label: '1 Like',     pts: '5 pts',   note: 'Unique per user'       },
              ].map(({ icon: Icon, label, pts, note }, i, arr) => (
                <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 12, paddingBottom: i < arr.length - 1 ? 10 : 0, marginBottom: i < arr.length - 1 ? 10 : 0, borderBottom: i < arr.length - 1 ? '1px solid rgba(0,0,0,0.05)' : 'none' }}>
                  <div style={{ width: 32, height: 32, borderRadius: 9, background: 'rgba(0,0,0,0.04)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Icon size={14} color="rgba(0,0,0,0.5)" />
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 13, fontWeight: 600, color: '#0a0a0a', margin: '0 0 1px' }}>{label}</p>
                    <p style={{ fontSize: 11, color: 'rgba(0,0,0,0.38)', margin: 0 }}>{note}</p>
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#10b981' }}>{pts}</span>
                </div>
              ))}
            </div>

            {/* Earnings history */}
            {earnings.length > 0 && (
              <div style={{ borderRadius: 20, border: '1px solid rgba(0,0,0,0.07)', background: '#fafafa', overflow: 'hidden' }}>
                <p style={{ fontSize: 12, fontWeight: 700, color: 'rgba(0,0,0,0.4)', textTransform: 'uppercase', letterSpacing: '0.07em', margin: 0, padding: '16px 20px 12px' }}>Earnings History</p>
                {earnings.map((e, i) => (
                  <div key={e.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 20px', borderTop: i === 0 ? '1px solid rgba(0,0,0,0.06)' : 'none', borderBottom: i < earnings.length - 1 ? '1px solid rgba(0,0,0,0.05)' : 'none' }}>
                    <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(16,185,129,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Clock size={15} color="#10b981" />
                    </div>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: 13, fontWeight: 600, color: '#0a0a0a', margin: '0 0 2px' }}>
                        {new Date(e.month + '-01').toLocaleString('default', { month: 'long', year: 'numeric' })}
                      </p>
                      <p style={{ fontSize: 11, color: 'rgba(0,0,0,0.38)', margin: 0 }}>{e.score.toFixed(1)} pts · Pool {fmtNgn(e.pool_amount)}</p>
                    </div>
                    <p style={{ fontSize: 15, fontWeight: 700, color: '#10b981', margin: 0 }}>{fmtNgn(e.amount)}</p>
                  </div>
                ))}
              </div>
            )}

            {earnings.length === 0 && (
              <div style={{ textAlign: 'center', padding: '32px 20px', borderRadius: 20, border: '1px solid rgba(0,0,0,0.06)', background: '#fafafa' }}>
                <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'rgba(0,0,0,0.04)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                  <Clock size={22} color="rgba(0,0,0,0.2)" />
                </div>
                <p style={{ fontSize: 14, fontWeight: 600, color: '#0a0a0a', margin: '0 0 4px' }}>No earnings yet</p>
                <p style={{ fontSize: 12, color: 'rgba(0,0,0,0.38)', margin: 0, lineHeight: 1.5 }}>Earnings are calculated at the end of each month and credited to your balance.</p>
              </div>
            )}

          </div>
        )}
      </div>

      <Navigation />
    </div>
  );
}
