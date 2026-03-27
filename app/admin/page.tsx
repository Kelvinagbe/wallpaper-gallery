'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Check, X, ChevronDown, ChevronUp, AlertTriangle, LayoutDashboard, Users, DollarSign, Flag, Power, LogOut, RefreshCw, Plus, Menu, ArrowRight } from 'lucide-react';

const sb       = createClient();
const PASS     = process.env.NEXT_PUBLIC_ADMIN_PASSWORD!;
const fmtNgn   = (n: number) => `₦${Number(n).toLocaleString('en-NG', { minimumFractionDigits: 2 })}`;
const fmtDate  = (s: string) => new Date(s).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' });
const sColor   = (s: string) => ({ approved: '#4ade80', rejected: '#f87171', banned: '#f87171', pending: '#fbbf24' }[s] ?? '#6b7280');
const bd       = '1px solid rgba(0,0,0,0.08)';
const card     = { background: '#fff', border: bd, borderRadius: 10, overflow: 'hidden' as const };
const label11  = { fontSize: 11, fontWeight: 600, color: 'rgba(0,0,0,0.35)', textTransform: 'uppercase' as const, letterSpacing: '0.05em' };
type Tab = 'overview' | 'applications' | 'pool' | 'flagged';

// ── Sub-components ────────────────────────────────────────────────────────────
const Empty = ({ text }: { text: string }) => <div style={{ textAlign: 'center', padding: '60px 0', color: 'rgba(0,0,0,0.3)', fontSize: 13 }}>{text}</div>;

const Info = ({ label, value, mono }: { label: string; value: string; mono?: boolean }) => (
  <div>
    <p style={{ ...label11, fontSize: 10, margin: '0 0 3px' }}>{label}</p>
    <p style={{ fontSize: 12, fontWeight: 500, color: '#0a0a0a', margin: 0, fontFamily: mono ? 'monospace' : 'inherit', letterSpacing: mono ? '0.06em' : 'normal' }}>{value || '—'}</p>
  </div>
);

const Btn = ({ label, icon, onClick, loading, solid, danger }: { label: string; icon?: React.ReactNode; onClick: () => void; loading?: boolean; solid?: boolean; danger?: boolean }) => (
  <button className="btn-act" onClick={onClick} disabled={loading}
    style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '7px 12px', borderRadius: 7, border: solid ? 'none' : `1px solid ${danger ? 'rgba(248,113,113,0.3)' : 'rgba(0,0,0,0.09)'}`, background: solid ? '#0a0a0a' : danger ? 'rgba(248,113,113,0.06)' : '#fff', color: solid ? '#fff' : danger ? '#f87171' : '#0a0a0a', fontSize: 12, fontWeight: 500, cursor: loading ? 'default' : 'pointer', fontFamily: 'inherit', opacity: loading ? 0.5 : 1 }}>
    {loading ? <RefreshCw size={11} style={{ animation: 'spin .7s linear infinite' }} /> : icon}{label}
  </button>
);

const Avatar = ({ src }: { src: string }) => (
  <img src={src || 'https://avatar.iran.liara.run/public'} alt="" style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover', flexShrink: 0, border: bd }} />
);

const Badge = ({ text, color }: { text: string; color?: string }) => (
  <span style={{ fontSize: 11, fontWeight: 500, padding: '2px 8px', borderRadius: 20, background: color ? `${color}15` : 'rgba(0,0,0,0.04)', color: color ?? 'rgba(0,0,0,0.35)', border: `1px solid ${color ? `${color}30` : 'rgba(0,0,0,0.08)'}` }}>{text}</span>
);

// ── Main ──────────────────────────────────────────────────────────────────────
export default function AdminPage() {
  const [authed,   setAuthed]   = useState(false);
  const [pass,     setPass]     = useState('');
  const [passErr,  setPassErr]  = useState(false);
  const [tab,      setTab]      = useState<Tab>('overview');
  const [apps,     setApps]     = useState<any[]>([]);
  const [pools,    setPools]    = useState<any[]>([]);
  const [flagged,  setFlagged]  = useState<any[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [monetOn,  setMonetOn]  = useState(true);
  const [amount,   setAmount]   = useState('');
  const [month,    setMonth]    = useState(() => new Date().toISOString().slice(0, 7));
  const [saving,   setSaving]   = useState(false);
  const [notes,    setNotes]    = useState<Record<string, string>>({});
  const [expanded, setExpanded] = useState<string | null>(null);
  const [sideOpen, setSideOpen] = useState(false);
  const [acting,   setActing]   = useState<string | null>(null);

  useEffect(() => {
    if (localStorage.getItem('admin_auth') === '1') setAuthed(true);
    setMonetOn(localStorage.getItem('monetization_enabled') !== '0');
  }, []);

  useEffect(() => { if (authed) load(); }, [authed]);

  const load = useCallback(async () => {
    setLoading(true);
    const [a, p, f] = await Promise.all([
      sb.from('monetization_applications').select('*, profiles:user_id(full_name,username,avatar_url,monetization_status)').order('created_at', { ascending: false }),
      sb.from('monthly_pools').select('*').order('month', { ascending: false }),
      sb.from('profiles').select('id,full_name,username,avatar_url,flagged,monetization_status').eq('flagged', true),
    ]);
    setApps(a.data ?? []); setPools(p.data ?? []); setFlagged(f.data ?? []);
    setLoading(false);
  }, []);

  const login = () => {
    if (pass === PASS) { setAuthed(true); localStorage.setItem('admin_auth', '1'); }
    else { setPassErr(true); setTimeout(() => setPassErr(false), 600); }
  };

  const act = async (key: string, fn: () => Promise<void>) => { setActing(key); await fn(); setActing(null); };

  const reviewApp  = (uid: string, d: 'approved' | 'rejected') => act(uid, async () => {
    await sb.rpc('review_monetization', { applicant_id: uid, decision: d, note: notes[uid] || null });
    setApps(p => p.map(a => a.user_id === uid ? { ...a, status: d } : a));
    setExpanded(null);
  });

  const banUser = (uid: string) => act(uid + '_ban', async () => {
    await sb.from('profiles').update({ monetization_status: 'banned' }).eq('id', uid);
    const upd = (arr: any[]) => arr.map(x => x.user_id === uid || x.id === uid ? { ...x, monetization_status: 'banned', profiles: x.profiles ? { ...x.profiles, monetization_status: 'banned' } : x.profiles } : x);
    setApps(upd); setFlagged(upd);
  });

  const unbanUser = (uid: string) => act(uid + '_unban', async () => {
    await sb.from('profiles').update({ monetization_status: 'none' }).eq('id', uid);
    await sb.from('monetization_applications').update({ status: 'none' }).eq('user_id', uid);
    const upd = (arr: any[]) => arr.map(x => x.user_id === uid || x.id === uid ? { ...x, status: 'none', monetization_status: 'none', profiles: x.profiles ? { ...x.profiles, monetization_status: 'none' } : x.profiles } : x);
    setApps(upd); setFlagged(upd);
  });

  const unflagUser = (uid: string) => act(uid + '_unflag', async () => {
    await sb.from('profiles').update({ flagged: false }).eq('id', uid);
    setFlagged(p => p.filter(u => u.id !== uid));
  });

  const addPool = async () => {
    if (!amount || saving) return;
    setSaving(true);
    await sb.from('monthly_pools').upsert({ month, amount: parseFloat(amount), distributed: false }, { onConflict: 'month' });
    await load(); setAmount(''); setSaving(false);
  };

  const toggleMonet = () => {
    const next = !monetOn; setMonetOn(next);
    localStorage.setItem('monetization_enabled', next ? '1' : '0');
    sb.from('app_settings').upsert({ key: 'monetization_enabled', value: String(next) }, { onConflict: 'key' });
  };

  const pending   = apps.filter(a => a.status === 'pending').length;
  const approved  = apps.filter(a => a.status === 'approved').length;
  const totalPool = pools.reduce((s, p) => s + Number(p.amount), 0);

  const navItems = [
    { id: 'overview'     as Tab, label: 'Overview',     icon: LayoutDashboard },
    { id: 'applications' as Tab, label: 'Applications', icon: Users,     badge: pending },
    { id: 'pool'         as Tab, label: 'Pool',         icon: DollarSign },
    { id: 'flagged'      as Tab, label: 'Flagged',      icon: Flag,      badge: flagged.length },
  ];

  // ── Login ──────────────────────────────────────────────────────────────────
  if (!authed) return (
    <div style={{ minHeight: '100dvh', background: '#0a0a0a', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, fontFamily: 'system-ui,sans-serif' }}>
      <style>{`@keyframes shake{0%,100%{transform:translateX(0)}20%,60%{transform:translateX(-6px)}40%,80%{transform:translateX(6px)}} @keyframes fadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}} .li{animation:fadeIn .4s ease both} .shake{animation:shake .4s ease} input:focus{outline:none!important;border-color:rgba(255,255,255,0.3)!important}`}</style>
      <div className={`li ${passErr ? 'shake' : ''}`} style={{ width: '100%', maxWidth: 320 }}>
        <div style={{ width: 36, height: 36, borderRadius: 8, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 24 }}>
          <LayoutDashboard size={16} color="rgba(255,255,255,0.6)" />
        </div>
        <p style={{ fontSize: 18, fontWeight: 600, color: '#fff', margin: '0 0 4px', letterSpacing: '-0.02em' }}>Admin</p>
        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', margin: '0 0 24px' }}>Enter your password to continue</p>
        <input type="password" value={pass} onChange={e => setPass(e.target.value)} onKeyDown={e => e.key === 'Enter' && login()} placeholder="Password"
          style={{ display: 'block', width: '100%', padding: '10px 12px', background: 'rgba(255,255,255,0.05)', border: `1px solid ${passErr ? 'rgba(248,113,113,0.6)' : 'rgba(255,255,255,0.1)'}`, borderRadius: 8, fontSize: 14, color: '#fff', fontFamily: 'inherit', marginBottom: 10, boxSizing: 'border-box', transition: 'border-color .2s' }} />
        <button onClick={login} style={{ width: '100%', padding: '10px', borderRadius: 8, border: 'none', background: '#fff', color: '#0a0a0a', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7 }}>
          Continue <ArrowRight size={14} />
        </button>
      </div>
    </div>
  );

  // ── Dashboard ──────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: '100dvh', background: '#f5f5f4', fontFamily: 'system-ui,sans-serif', display: 'flex' }}>
      <style>{`
        @keyframes fadeUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
        @keyframes spin{to{transform:rotate(360deg)}}
        .panel{animation:fadeUp .3s cubic-bezier(.16,1,.3,1) both}
        .s1{animation-delay:.05s}.s2{animation-delay:.1s}.s3{animation-delay:.15s}.s4{animation-delay:.2s}
        .ri{transition:background .12s}.ri:hover{background:#f0f0ef!important}
        .ni{transition:all .12s;cursor:pointer}.ni:hover{background:rgba(255,255,255,0.06)!important}
        .btn-act{transition:opacity .12s,transform .1s}.btn-act:active{opacity:.75;transform:scale(.98)}
        .ov{position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:40;backdrop-filter:blur(4px)}
        input:focus,textarea:focus{outline:none;border-color:rgba(0,0,0,0.3)!important}
        @media(min-width:768px){.sb{position:relative!important;transform:none!important}.ov{display:none!important}}
      `}</style>

      {sideOpen && <div className="ov" onClick={() => setSideOpen(false)} />}

      {/* Sidebar */}
      <aside className="sb" style={{ position: 'fixed', top: 0, left: 0, bottom: 0, width: 220, background: '#0a0a0a', zIndex: 50, display: 'flex', flexDirection: 'column', transform: sideOpen ? 'translateX(0)' : 'translateX(-100%)', transition: 'transform .25s cubic-bezier(.16,1,.3,1)' }}>
        <div style={{ padding: '20px 16px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 28, height: 28, borderRadius: 6, background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <LayoutDashboard size={14} color="#0a0a0a" />
          </div>
          <span style={{ fontSize: 14, fontWeight: 600, color: '#fff', letterSpacing: '-0.01em' }}>WALLS Admin</span>
        </div>

        <nav style={{ flex: 1, padding: '12px 8px', display: 'flex', flexDirection: 'column', gap: 2 }}>
          {navItems.map(({ id, label, icon: Icon, badge }) => {
            const active = tab === id;
            return (
              <button key={id} className="ni" onClick={() => { setTab(id); setSideOpen(false); }}
                style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 10px', borderRadius: 7, border: 'none', background: active ? 'rgba(255,255,255,0.1)' : 'transparent', color: active ? '#fff' : 'rgba(255,255,255,0.45)', fontFamily: 'inherit', fontSize: 13, fontWeight: active ? 500 : 400, width: '100%', textAlign: 'left' }}>
                <Icon size={15} /><span style={{ flex: 1 }}>{label}</span>
                {!!badge && <span style={{ fontSize: 10, fontWeight: 600, padding: '1px 6px', borderRadius: 10, background: active ? '#fff' : 'rgba(255,255,255,0.15)', color: active ? '#0a0a0a' : 'rgba(255,255,255,0.7)' }}>{badge}</span>}
              </button>
            );
          })}
        </nav>

        <div style={{ padding: '12px 8px', borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', flexDirection: 'column', gap: 2 }}>
          <button className="ni btn-act" onClick={toggleMonet}
            style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 10px', borderRadius: 7, border: 'none', background: 'transparent', color: monetOn ? '#4ade80' : 'rgba(255,255,255,0.35)', fontFamily: 'inherit', fontSize: 13, width: '100%', textAlign: 'left' }}>
            <Power size={15} /><span style={{ flex: 1 }}>Monetization</span>
            <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 6px', borderRadius: 10, background: monetOn ? 'rgba(74,222,128,0.15)' : 'rgba(255,255,255,0.08)', color: monetOn ? '#4ade80' : 'rgba(255,255,255,0.35)' }}>{monetOn ? 'ON' : 'OFF'}</span>
          </button>
          <button className="ni btn-act" onClick={() => { localStorage.removeItem('admin_auth'); setAuthed(false); }}
            style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 10px', borderRadius: 7, border: 'none', background: 'transparent', color: 'rgba(255,255,255,0.3)', fontFamily: 'inherit', fontSize: 13, width: '100%', textAlign: 'left' }}>
            <LogOut size={15} />Sign out
          </button>
        </div>
      </aside>

    {/* Main */}
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        {/* Topbar */}
        <header style={{ background: '#fff', borderBottom: bd, height: 52, display: 'flex', alignItems: 'center', padding: '0 20px', gap: 12, position: 'sticky', top: 0, zIndex: 30 }}>
          <button className="btn-act" onClick={() => setSideOpen(v => !v)} style={{ width: 32, height: 32, borderRadius: 6, border: bd, background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            <Menu size={15} color="rgba(0,0,0,0.5)" />
          </button>
          <span style={{ fontSize: 14, fontWeight: 600, color: '#0a0a0a', letterSpacing: '-0.01em', flex: 1 }}>{navItems.find(n => n.id === tab)?.label}</span>
          <button className="btn-act" onClick={load} style={{ width: 32, height: 32, borderRadius: 6, border: bd, background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            <RefreshCw size={13} color="rgba(0,0,0,0.4)" style={loading ? { animation: 'spin .8s linear infinite' } : {}} />
          </button>
          {!monetOn && <Badge text="Monetization Off" color="#f87171" />}
        </header>

        <main style={{ flex: 1, padding: '24px 20px', maxWidth: 860, width: '100%', margin: '0 auto' }}>
          {loading
            ? <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '80px 0', color: 'rgba(0,0,0,0.3)', fontSize: 13, gap: 8 }}><RefreshCw size={14} style={{ animation: 'spin .8s linear infinite' }} />Loading...</div>

            : tab === 'overview'
            ? <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: 12 }}>
                {[
                  { label: 'Pending',    value: pending,        color: '#fbbf24', cls: 's1' },
                  { label: 'Approved',   value: approved,       color: '#4ade80', cls: 's2' },
                  { label: 'Flagged',    value: flagged.length, color: '#f87171', cls: 's3' },
                  { label: 'Pool Total', value: fmtNgn(totalPool), color: '#60a5fa', cls: 's4' },
                ].map(({ label, value, color, cls }) => (
                  <div key={label} className={`panel ${cls}`} style={{ ...card, padding: '18px 16px' }}>
                    <p style={{ ...label11, fontSize: 11, margin: '0 0 8px' }}>{label}</p>
                    <p style={{ fontSize: 26, fontWeight: 700, color, margin: 0, letterSpacing: '-0.03em', lineHeight: 1 }}>{value}</p>
                  </div>
                ))}
              </div>

        : tab === 'applications'
            ? <div className="panel">
                {apps.length === 0 ? <Empty text="No applications yet" /> :
                  <div style={card}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px 90px 40px', gap: 12, padding: '10px 16px', borderBottom: bd, background: '#fafaf9' }}>
                      {['User', 'ID Type', 'Status', ''].map(h => <span key={h} style={label11}>{h}</span>)}
                    </div>
                    {apps.map((app, i) => (
                      <div key={app.id}>
                        <div className="ri" onClick={() => setExpanded(expanded === app.id ? null : app.id)}
                          style={{ display: 'grid', gridTemplateColumns: '1fr 80px 90px 40px', gap: 12, padding: '12px 16px', borderBottom: i < apps.length - 1 && expanded !== app.id ? bd : 'none', cursor: 'pointer', alignItems: 'center', background: '#fff' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                            <Avatar src={app.profiles?.avatar_url} />
                            <div style={{ minWidth: 0 }}>
                              <p style={{ fontSize: 13, fontWeight: 500, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{app.profiles?.full_name || '—'}</p>
                              <p style={{ fontSize: 11, color: 'rgba(0,0,0,0.38)', margin: 0 }}>@{app.profiles?.username}</p>
                            </div>
                          </div>
                          <span style={{ fontSize: 12, fontWeight: 500, color: 'rgba(0,0,0,0.5)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{app.id_type}</span>
                          <Badge text={app.status} color={sColor(app.status)} />
                          {expanded === app.id ? <ChevronUp size={14} color="rgba(0,0,0,0.3)" /> : <ChevronDown size={14} color="rgba(0,0,0,0.3)" />}
                        </div>
                        {expanded === app.id && (
                          <div style={{ padding: '14px 16px', background: '#fafaf9', borderBottom: i < apps.length - 1 ? bd : 'none', animation: 'fadeUp .2s ease both' }}>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, marginBottom: 12 }}>
                              <Info label="ID Number" value={app.id_number} mono />
                              <Info label="Applied" value={fmtDate(app.created_at)} />
                              <Info label="Status" value={app.profiles?.monetization_status} />
                            </div>
                            {app.status === 'pending' && <>
                              <textarea value={notes[app.id] || ''} onChange={e => setNotes(p => ({ ...p, [app.id]: e.target.value }))} placeholder="Rejection note (optional)…" rows={2}
                                style={{ display: 'block', width: '100%', padding: '8px 10px', border: bd, borderRadius: 7, fontSize: 12, fontFamily: 'inherit', resize: 'none', background: '#fff', marginBottom: 10, boxSizing: 'border-box', color: '#0a0a0a' }} />
                              <div style={{ display: 'flex', gap: 8 }}>
                                <Btn label="Approve" icon={<Check size={12} />} onClick={() => reviewApp(app.user_id, 'approved')} loading={acting === app.user_id} solid />
                                <Btn label="Reject"  icon={<X size={12} />}     onClick={() => reviewApp(app.user_id, 'rejected')} loading={acting === app.user_id} danger />
                                <Btn label="Ban"     icon={<AlertTriangle size={12} />} onClick={() => banUser(app.user_id)} loading={acting === app.user_id + '_ban'} danger />
                              </div>
                            </>}
                            {app.status !== 'pending' && (
                              app.profiles?.monetization_status === 'banned'
                                ? <Btn label="Unban" icon={<Check size={12} />} onClick={() => unbanUser(app.user_id)} loading={acting === app.user_id + '_unban'} />
                                : <Btn label="Ban from monetization" icon={<AlertTriangle size={12} />} onClick={() => banUser(app.user_id)} loading={acting === app.user_id + '_ban'} danger />
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                }
              </div>

            : tab === 'pool'
            ? <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div className="panel" style={{ ...card, padding: '18px 16px' }}>
                  <p style={{ ...label11, margin: '0 0 14px' }}>Set Pool Amount</p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    <input type="month" value={month} onChange={e => setMonth(e.target.value)}
                      style={{ padding: '9px 11px', border: bd, borderRadius: 7, fontSize: 13, fontFamily: 'inherit', background: '#fff', color: '#0a0a0a' }} />
                    <input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="Amount in ₦"
                      style={{ flex: 1, minWidth: 120, padding: '9px 11px', border: bd, borderRadius: 7, fontSize: 13, fontFamily: 'inherit', background: '#fff', color: '#0a0a0a' }} />
                    <button className="btn-act" onClick={addPool} disabled={saving || !amount}
                      style={{ padding: '9px 18px', borderRadius: 7, border: 'none', background: '#0a0a0a', color: '#fff', fontSize: 13, fontWeight: 500, cursor: saving || !amount ? 'default' : 'pointer', fontFamily: 'inherit', opacity: saving || !amount ? 0.4 : 1, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Plus size={13} />{saving ? 'Saving…' : 'Set Pool'}
                    </button>
                  </div>
                </div>
                {pools.length > 0 && (
                  <div className="panel s1" style={card}>
                    <div style={{ padding: '10px 16px', borderBottom: bd, background: '#fafaf9', display: 'flex', justifyContent: 'space-between' }}>
                      <span style={label11}>History</span>
                      <span style={{ fontSize: 11, color: 'rgba(0,0,0,0.3)' }}>{pools.length} months</span>
                    </div>
                    {pools.map((p, i) => (
                      <div key={p.id} className="ri" style={{ display: 'flex', alignItems: 'center', padding: '12px 16px', borderBottom: i < pools.length - 1 ? bd : 'none', background: '#fff', gap: 12 }}>
                        <span style={{ flex: 1, fontSize: 13, fontWeight: 500 }}>{p.month}</span>
                        <span style={{ fontSize: 14, fontWeight: 700, letterSpacing: '-0.02em' }}>{fmtNgn(p.amount)}</span>
                        <Badge text={p.distributed ? 'Paid' : 'Pending'} color={p.distributed ? '#4ade80' : undefined} />
                      </div>
                    ))}
                  </div>
                )}
              </div>

            : /* flagged */
              <div className="panel">
                {flagged.length === 0 ? <Empty text="No flagged accounts" /> :
                  <div style={card}>
                    {flagged.map((u, i) => (
                      <div key={u.id} className="ri" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderBottom: i < flagged.length - 1 ? bd : 'none', background: '#fff' }}>
                        <Avatar src={u.avatar_url} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontSize: 13, fontWeight: 500, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.full_name || '—'}</p>
                          <p style={{ fontSize: 11, color: 'rgba(0,0,0,0.38)', margin: 0 }}>@{u.username} · <span style={{ color: sColor(u.monetization_status) }}>{u.monetization_status}</span></p>
                        </div>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <Btn label="Unflag" onClick={() => unflagUser(u.id)} loading={acting === u.id + '_unflag'} />
                          {u.monetization_status !== 'banned'
                            ? <Btn label="Ban"   icon={<AlertTriangle size={11} />} onClick={() => banUser(u.id)}   loading={acting === u.id + '_ban'}   danger />
                            : <Btn label="Unban" icon={<Check size={11} />}         onClick={() => unbanUser(u.id)} loading={acting === u.id + '_unban'} />
                          }
                        </div>
                      </div>
                    ))}
                  </div>
                }
              </div>
          }
        </main>
      </div>
    </div>
  );
}