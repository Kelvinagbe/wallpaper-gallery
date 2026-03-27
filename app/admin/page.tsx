'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Check, X, ChevronDown, ChevronUp, AlertTriangle, ToggleLeft, ToggleRight } from 'lucide-react';

const supabase = createClient();
const PASS     = process.env.NEXT_PUBLIC_ADMIN_PASSWORD!;
const border   = '1px solid rgba(0,0,0,0.08)';
const muted    = 'rgba(0,0,0,0.4)';
const faint    = 'rgba(0,0,0,0.22)';
const green    = '#16a34a';
const red      = '#dc2626';
const amber    = '#d97706';
const fmtNgn   = (n: number) => `₦${Number(n).toLocaleString('en-NG', { minimumFractionDigits: 2 })}`;
const sColor   = (s: string) => s === 'approved' ? green : s === 'rejected' || s === 'banned' ? red : s === 'pending' ? amber : muted;

type Tab = 'applications' | 'pool' | 'flagged';

export default function AdminPage() {
  const [authed,   setAuthed]   = useState(false);
  const [pass,     setPass]     = useState('');
  const [tab,      setTab]      = useState<Tab>('applications');
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

  useEffect(() => {
    if (localStorage.getItem('admin_auth') === '1') setAuthed(true);
    setMonetOn(localStorage.getItem('monetization_enabled') !== '0');
  }, []);

  useEffect(() => { if (authed) load(); }, [authed]);

  const load = async () => {
    setLoading(true);
    const [a, p, f] = await Promise.all([
      supabase.from('monetization_applications').select('*, profiles:user_id(full_name,username,avatar_url,monetization_status)').order('created_at', { ascending: false }),
      supabase.from('monthly_pools').select('*').order('month', { ascending: false }),
      supabase.from('profiles').select('id,full_name,username,avatar_url,flagged,monetization_status').eq('flagged', true),
    ]);
    setApps(a.data ?? []);
    setPools(p.data ?? []);
    setFlagged(f.data ?? []);
    setLoading(false);
  };

  const login = () => {
    if (pass === PASS) { setAuthed(true); localStorage.setItem('admin_auth', '1'); }
    else alert('Wrong password');
  };

  const reviewApp = async (userId: string, decision: 'approved' | 'rejected') => {
    await supabase.rpc('review_monetization', { applicant_id: userId, decision, note: notes[userId] || null });
    setApps(p => p.map(a => a.user_id === userId ? { ...a, status: decision } : a));
  };

  const banUser = async (userId: string) => {
    await supabase.from('profiles').update({ monetization_status: 'banned' }).eq('id', userId);
    setApps(p => p.map(a => a.user_id === userId ? { ...a, profiles: { ...a.profiles, monetization_status: 'banned' } } : a));
    setFlagged(p => p.map(u => u.id === userId ? { ...u, monetization_status: 'banned' } : u));
  };

  const unflagUser = async (userId: string) => {
    await supabase.from('profiles').update({ flagged: false }).eq('id', userId);
    setFlagged(p => p.filter(u => u.id !== userId));
  };

  const addPool = async () => {
    if (!amount || saving) return;
    setSaving(true);
    await supabase.from('monthly_pools').upsert({ month, amount: parseFloat(amount), distributed: false }, { onConflict: 'month' });
    await load();
    setAmount('');
    setSaving(false);
  };

  const toggleMonet = () => {
    const next = !monetOn;
    setMonetOn(next);
    localStorage.setItem('monetization_enabled', next ? '1' : '0');
    supabase.from('app_settings').upsert({ key: 'monetization_enabled', value: String(next) }, { onConflict: 'key' });
  };

  const tabs: { id: Tab; label: string; count?: number }[] = [
    { id: 'applications', label: 'Applications', count: apps.filter(a => a.status === 'pending').length || undefined },
    { id: 'pool',         label: 'Pool' },
    { id: 'flagged',      label: 'Flagged', count: flagged.length || undefined },
  ];

  const S = {
    btn:    { fontSize: 12, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit', border, background: '#fff', color: '#0a0a0a', borderRadius: 6, padding: '6px 12px' } as React.CSSProperties,
    darkBtn:{ fontSize: 12, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit', border: 'none', background: '#0a0a0a', color: '#fff', borderRadius: 6, padding: '6px 12px' } as React.CSSProperties,
    redBtn: { fontSize: 12, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit', border: `1px solid ${red}25`, background: `${red}08`, color: red, borderRadius: 6, padding: '6px 12px' } as React.CSSProperties,
    input:  { padding: '8px 10px', border, borderRadius: 6, fontSize: 13, fontFamily: 'inherit', background: '#fff', color: '#0a0a0a', outline: 'none' } as React.CSSProperties,
  };

  // ── Login ──
  if (!authed) return (
    <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fff', fontFamily: 'system-ui, sans-serif' }}>
      <style>{`input:focus{outline:none;border-color:rgba(0,0,0,0.25)!important}`}</style>
      <div style={{ width: '100%', maxWidth: 320, padding: '0 24px' }}>
        <p style={{ fontSize: 15, fontWeight: 600, margin: '0 0 4px', letterSpacing: '-0.02em' }}>Admin</p>
        <p style={{ fontSize: 13, color: muted, margin: '0 0 16px' }}>Enter password to continue</p>
        <input type="password" value={pass} onChange={e => setPass(e.target.value)} onKeyDown={e => e.key === 'Enter' && login()} placeholder="Password"
          style={{ ...S.input, display: 'block', width: '100%', marginBottom: 10, boxSizing: 'border-box' }} />
        <button onClick={login} style={{ ...S.darkBtn, width: '100%', padding: '9px', fontSize: 13 }}>Continue</button>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: '100dvh', background: '#fff', color: '#0a0a0a', fontFamily: 'system-ui, sans-serif' }}>
      <style>{`
        .row:hover{background:#fafafa!important} .row{transition:background .1s}
        .abtn:active{opacity:.7} .abtn{transition:opacity .1s}
        input:focus,textarea:focus{outline:none;border-color:rgba(0,0,0,0.25)!important}
      `}</style>

      {/* Nav */}
      <nav style={{ borderBottom: border, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 20px', height: 52 }}>
        <span style={{ fontSize: 13, fontWeight: 600 }}>Admin</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button className="abtn" onClick={toggleMonet}
            style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px', borderRadius: 6, border, background: monetOn ? 'rgba(22,163,74,0.06)' : '#fafafa', cursor: 'pointer', fontFamily: 'inherit' }}>
            {monetOn ? <ToggleRight size={14} color={green} /> : <ToggleLeft size={14} color={muted} />}
            <span style={{ fontSize: 12, fontWeight: 500, color: monetOn ? green : muted }}>Monetization {monetOn ? 'On' : 'Off'}</span>
          </button>
          <button className="abtn" onClick={() => { localStorage.removeItem('admin_auth'); setAuthed(false); }}
            style={{ fontSize: 12, color: muted, background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>Sign out</button>
        </div>
      </nav>

      {/* Tabs */}
      <div style={{ borderBottom: border, display: 'flex', padding: '0 20px' }}>
        {tabs.map(t => (
          <button key={t.id} className="abtn" onClick={() => setTab(t.id)}
            style={{ padding: '10px 14px', border: 'none', borderBottom: tab === t.id ? '2px solid #0a0a0a' : '2px solid transparent', background: 'transparent', fontSize: 13, fontWeight: tab === t.id ? 600 : 400, color: tab === t.id ? '#0a0a0a' : muted, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 6 }}>
            {t.label}
            {t.count ? <span style={{ fontSize: 10, fontWeight: 600, padding: '1px 5px', borderRadius: 10, background: tab === t.id ? '#0a0a0a' : 'rgba(0,0,0,0.07)', color: tab === t.id ? '#fff' : muted }}>{t.count}</span> : null}
          </button>
        ))}
      </div>

      <div style={{ maxWidth: 660, margin: '0 auto', padding: '24px 20px' }}>
        {loading ? <p style={{ fontSize: 13, color: muted, textAlign: 'center', padding: '60px 0' }}>Loading...</p> : (

          /* ── Applications ── */
          tab === 'applications' ? (
            !apps.length ? <p style={{ fontSize: 13, color: muted, textAlign: 'center', padding: '60px 0' }}>No applications</p> :
            <div style={{ border, borderRadius: 8, overflow: 'hidden' }}>
              {apps.map((app, i) => (
                <div key={app.id} style={{ borderBottom: i < apps.length - 1 ? border : 'none' }}>
                  <div className="row" onClick={() => setExpanded(expanded === app.id ? null : app.id)}
                    style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', cursor: 'pointer', background: '#fff' }}>
                    <img src={app.profiles?.avatar_url || 'https://avatar.iran.liara.run/public'} alt="" style={{ width: 30, height: 30, borderRadius: '50%', objectFit: 'cover', flexShrink: 0, border }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 13, fontWeight: 500, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{app.profiles?.full_name || 'Unknown'}</p>
                      <p style={{ fontSize: 11, color: muted, margin: '1px 0 0' }}>@{app.profiles?.username} · {app.id_type?.toUpperCase()}</p>
                    </div>
                    <span style={{ fontSize: 11, fontWeight: 500, color: sColor(app.status), padding: '2px 7px', borderRadius: 10, border: `1px solid ${sColor(app.status)}25`, background: `${sColor(app.status)}08` }}>{app.status}</span>
                    {expanded === app.id ? <ChevronUp size={13} color={muted} /> : <ChevronDown size={13} color={muted} />}
                  </div>

                  {expanded === app.id && (
                    <div style={{ padding: '12px 14px', borderTop: border, background: '#fafafa' }}>
                      <p style={{ fontSize: 12, color: muted, margin: '0 0 10px', fontFamily: 'monospace', letterSpacing: '0.04em' }}>{app.id_number} · {new Date(app.created_at).toLocaleDateString()}</p>
                      {app.status === 'pending' && <>
                        <textarea value={notes[app.user_id] || ''} onChange={e => setNotes(p => ({ ...p, [app.user_id]: e.target.value }))}
                          placeholder="Rejection note (optional)" rows={2}
                          style={{ width: '100%', padding: '8px 10px', border, borderRadius: 6, fontSize: 12, fontFamily: 'inherit', resize: 'none', background: '#fff', marginBottom: 8, boxSizing: 'border-box' }} />
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button className="abtn" onClick={() => reviewApp(app.user_id, 'approved')} style={{ ...S.darkBtn, display: 'flex', alignItems: 'center', gap: 4 }}><Check size={11} />Approve</button>
                          <button className="abtn" onClick={() => reviewApp(app.user_id, 'rejected')} style={{ ...S.btn, color: red, display: 'flex', alignItems: 'center', gap: 4 }}><X size={11} />Reject</button>
                          <button className="abtn" onClick={() => banUser(app.user_id)} style={{ ...S.redBtn, display: 'flex', alignItems: 'center', gap: 4 }}><AlertTriangle size={11} />Ban</button>
                        </div>
                      </>}
                      {app.status !== 'pending' && app.profiles?.monetization_status !== 'banned' && (
                        <button className="abtn" onClick={() => banUser(app.user_id)} style={{ ...S.redBtn, display: 'flex', alignItems: 'center', gap: 4 }}><AlertTriangle size={11} />Ban from monetization</button>
                      )}
                      {app.profiles?.monetization_status === 'banned' && (
                        <span style={{ fontSize: 12, color: red, fontWeight: 500 }}>Banned from monetization</span>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>

          /* ── Pool ── */
          ) : tab === 'pool' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div style={{ border, borderRadius: 8, padding: 16 }}>
                <p style={{ fontSize: 12, fontWeight: 500, color: muted, margin: '0 0 12px' }}>Set Monthly Pool</p>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input type="month" value={month} onChange={e => setMonth(e.target.value)} style={S.input} />
                  <input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="Amount (₦)" style={{ ...S.input, flex: 1 }} />
                  <button className="abtn" onClick={addPool} disabled={saving || !amount}
                    style={{ ...S.darkBtn, opacity: saving || !amount ? 0.4 : 1, cursor: saving || !amount ? 'default' : 'pointer' }}>
                    {saving ? '...' : 'Set'}
                  </button>
                </div>
              </div>

              {!!pools.length && (
                <div style={{ border, borderRadius: 8, overflow: 'hidden' }}>
                  <div style={{ padding: '10px 14px', borderBottom: border, background: '#fafafa', display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 12, fontWeight: 500, color: muted }}>History</span>
                    <span style={{ fontSize: 12, color: faint }}>{pools.length} months</span>
                  </div>
                  {pools.map((p, i) => (
                    <div key={p.id} className="row" style={{ display: 'flex', alignItems: 'center', padding: '11px 14px', borderBottom: i < pools.length - 1 ? border : 'none', background: '#fff' }}>
                      <span style={{ flex: 1, fontSize: 13, fontWeight: 500 }}>{p.month}</span>
                      <span style={{ fontSize: 13, fontWeight: 600, marginRight: 12 }}>{fmtNgn(p.amount)}</span>
                      <span style={{ fontSize: 11, fontWeight: 500, color: p.distributed ? green : muted, padding: '2px 7px', borderRadius: 10, background: p.distributed ? 'rgba(22,163,74,0.08)' : 'rgba(0,0,0,0.04)', border: `1px solid ${p.distributed ? 'rgba(22,163,74,0.2)' : border}` }}>
                        {p.distributed ? 'Paid' : 'Pending'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

          /* ── Flagged ── */
          ) : (
            !flagged.length ? <p style={{ fontSize: 13, color: muted, textAlign: 'center', padding: '60px 0' }}>No flagged accounts</p> :
            <div style={{ border, borderRadius: 8, overflow: 'hidden' }}>
              {flagged.map((u, i) => (
                <div key={u.id} className="row" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderBottom: i < flagged.length - 1 ? border : 'none', background: '#fff' }}>
                  <img src={u.avatar_url || 'https://avatar.iran.liara.run/public'} alt="" style={{ width: 30, height: 30, borderRadius: '50%', objectFit: 'cover', flexShrink: 0, border }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 13, fontWeight: 500, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.full_name || 'Unknown'}</p>
                    <p style={{ fontSize: 11, color: muted, margin: '1px 0 0' }}>@{u.username} · <span style={{ color: sColor(u.monetization_status) }}>{u.monetization_status}</span></p>
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button className="abtn" onClick={() => unflagUser(u.id)} style={{ ...S.btn, display: 'flex', alignItems: 'center', gap: 4 }}><Check size={11} />Unflag</button>
                    {u.monetization_status !== 'banned' && (
                      <button className="abtn" onClick={() => banUser(u.id)} style={{ ...S.redBtn, display: 'flex', alignItems: 'center', gap: 4 }}><AlertTriangle size={11} />Ban</button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )
        )}
      </div>
    </div>
  );
}
