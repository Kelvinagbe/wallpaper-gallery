'use client';

import {
  createContext, useContext, useState, useRef,
  useCallback, useEffect, type ReactNode,
} from 'react';
import {
  X, Upload, Image as ImageIcon, Check,
  Wifi, WifiOff, RefreshCw, AlertCircle, ChevronDown, ShieldAlert,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/app/components/AuthProvider';
import { useUpload } from '@/app/hooks/useUpload';

// ── Constants ────────────────────────────────────────────────────
const CATEGORIES = ['Nature','Cars','Anime','City','Abstract','Space','Animals','Architecture','Gaming','Minimal','Dark','Gradient'];
const DAILY_LIMIT = 4;

// ── Shared styles ────────────────────────────────────────────────
const solidBtn: React.CSSProperties = { flex: 1, padding: '13px 0', borderRadius: 12, border: 'none', background: '#0a0a0a', color: '#fff', fontFamily: 'inherit', fontSize: 14, fontWeight: 600, cursor: 'pointer' };
const ghostBtn: React.CSSProperties = { flex: 1, padding: '13px 0', borderRadius: 12, border: '1px solid rgba(0,0,0,0.1)', background: 'transparent', color: 'rgba(0,0,0,0.5)', fontFamily: 'inherit', fontSize: 14, fontWeight: 500, cursor: 'pointer' };
const inputStyle: React.CSSProperties = { width: '100%', padding: '11px 14px', background: 'rgba(0,0,0,0.03)', border: '1px solid rgba(0,0,0,0.08)', borderRadius: 12, fontSize: 14, color: '#0a0a0a', fontFamily: 'inherit', outline: 'none', transition: 'border-color .15s' };

// ── Context ──────────────────────────────────────────────────────
const UploadModalCtx = createContext<{ open: () => void; close: () => void } | null>(null);
export const useUploadModal = () => {
  const ctx = useContext(UploadModalCtx);
  if (!ctx) throw new Error('useUploadModal must be inside UploadModalProvider');
  return ctx;
};

// ── Helpers ──────────────────────────────────────────────────────
const Spinner = () => (
  <svg width="48" height="48" viewBox="0 0 48 48" fill="none" style={{ animation: 'upl-spin 0.8s linear infinite' }}>
    <circle cx="24" cy="24" r="20" stroke="rgba(0,0,0,0.08)" strokeWidth="4" />
    <path d="M24 4a20 20 0 0 1 20 20" stroke="#0a0a0a" strokeWidth="4" strokeLinecap="round" />
  </svg>
);

const getTodayCount = async (sb: ReturnType<typeof createClient>, uid: string) => {
  const start = new Date(); start.setHours(0,0,0,0);
  const { count } = await sb.from('wallpapers').select('id',{count:'exact',head:true}).eq('user_id',uid).gte('created_at',start.toISOString());
  return count ?? 0;
};

const checkSuspension = async (sb: ReturnType<typeof createClient>, uid: string) => {
  const { data } = await sb.from('profiles').select('violations,suspended_until').eq('id',uid).single();
  if (!data) return { suspended: false, violations: 0, suspendedUntil: undefined as Date|undefined };
  const until = data.suspended_until ? new Date(data.suspended_until) : null;
  return { suspended: !!until && until > new Date(), suspendedUntil: until ?? undefined, violations: data.violations ?? 0 };
};

const useCountdown = (until?: Date) => {
  const [t, setT] = useState('');
  useEffect(() => {
    if (!until) return;
    const tick = () => {
      const diff = until.getTime() - Date.now();
      if (diff <= 0) { setT('Suspension lifted'); return; }
      const d=Math.floor(diff/86400000), h=Math.floor((diff%86400000)/3600000), m=Math.floor((diff%3600000)/60000), s=Math.floor((diff%60000)/1000);
      setT(`${d}d ${h}h ${m}m ${s}s`);
    };
    tick(); const id = setInterval(tick, 1000); return () => clearInterval(id);
  }, [until]);
  return t;
};

// ── Network indicator ─────────────────────────────────────────────
const NetBadge = ({ speed }: { speed: string }) => {
  const color = speed==='offline'?'#ef4444':speed==='slow'?'#f59e0b':'#10b981';
  const Icon  = speed==='offline' ? WifiOff : Wifi;
  return (
    <span style={{ display:'flex', alignItems:'center', gap:3, fontSize:12, fontWeight:500, color }}>
      <Icon size={11} />
      {speed==='offline'?'Offline':speed==='slow'?'Slow connection':'Online'}
    </span>
  );
};

// ── Type picker ──────────────────────────────────────────────────
const TypePicker = ({ value, onChange, disabled }: { value:'mobile'|'pc'; onChange:(v:'mobile'|'pc')=>void; disabled?:boolean }) => (
  <div style={{ display:'flex', gap:8 }}>
    {([{key:'mobile',label:'📱 Mobile',sub:'9:16'},{key:'pc',label:'🖥️ Desktop',sub:'16:9'}] as const).map(({key,label,sub}) => {
      const on = value===key;
      return (
        <button key={key} onClick={()=>!disabled&&onChange(key)} style={{ flex:1, padding:'10px 0', borderRadius:12, fontFamily:'inherit', fontSize:13, fontWeight:600, cursor:disabled?'default':'pointer', transition:'all .15s', display:'flex', flexDirection:'column', alignItems:'center', gap:2, border:on?'1.5px solid #0a0a0a':'1px solid rgba(0,0,0,0.1)', background:on?'#0a0a0a':'transparent', color:on?'#fff':'rgba(0,0,0,0.45)', opacity:disabled?0.4:1 }}>
          <span>{label}</span>
          <span style={{ fontSize:10, fontWeight:400, opacity:0.65 }}>{sub}</span>
        </button>
      );
    })}
  </div>
);

// ── Overlay helper ────────────────────────────────────────────────
const Overlay = ({ children, anim='upl-overlay-in .25s ease forwards' }: { children: ReactNode; anim?: string }) => (
  <div style={{ position:'absolute', inset:0, zIndex:20, borderRadius:'inherit', background:'rgba(255,255,255,0.98)', backdropFilter:'blur(12px)', WebkitBackdropFilter:'blur(12px)', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:16, padding:'32px 24px', textAlign:'center', animation:anim }}>
    {children}
  </div>
);

// ── Upload Modal ─────────────────────────────────────────────────
const UploadModal = ({ onClose }: { onClose: ()=>void }) => {
  const { session } = useAuth();
  const supabase    = createClient();

  const [user,        setUser]        = useState<any>(null);
  const [title,       setTitle]       = useState('');
  const [desc,        setDesc]        = useState('');
  const [category,    setCategory]    = useState('');
  const [type,        setType]        = useState<'mobile'|'pc'>('mobile');
  const [catOpen,     setCatOpen]     = useState(false);
  const [file,        setFile]        = useState<File|null>(null);
  const [preview,     setPreview]     = useState('');
  const [imgDims,     setImgDims]     = useState<{w:number;h:number}|null>(null);
  const [dragging,    setDragging]    = useState(false);
  const [closing,     setClosing]     = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [todayCount,  setTodayCount]  = useState(0);
  const [suspension,  setSuspension]  = useState<{suspended:boolean;suspendedUntil?:Date;violations:number}>({suspended:false,violations:0});
  const [violation,   setViolation]   = useState<{reason:string;details?:string}|null>(null);
  const [isDesktop,   setIsDesktop]   = useState(false);
  const [netRetrying, setNetRetrying] = useState(false);

  const fileRef = useRef<HTMLInputElement>(null);
  const { uploading, progress, status, error, online, speed, canResume, uploadFile, reset, cancel, getCachedData } = useUpload(user?.id);

  // detect desktop
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)');
    setIsDesktop(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  // init
  useEffect(() => {
    (async () => {
      const { data: { session: s } } = await supabase.auth.getSession();
      const u = session?.user || s?.user || null;
      setUser(u);
      if (u) {
        const [count, susp] = await Promise.all([getTodayCount(supabase, u.id), checkSuspension(supabase, u.id)]);
        setTodayCount(count); setSuspension(susp);
      }
      const cached = getCachedData();
      if (cached) { setTitle(cached.title||''); setDesc(cached.description||''); setCategory(cached.category||''); setType(cached.wallType||'mobile'); }
      setAuthLoading(false);
    })();
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []); // eslint-disable-line

  // auto-retry when coming back online
  useEffect(() => {
    if (!error || !canResume) return;
    const handler = async () => {
      setNetRetrying(true);
      await new Promise(r => setTimeout(r, 1500)); // brief wait for stable connection
      doUpload(true).finally(() => setNetRetrying(false));
    };
    window.addEventListener('online', handler);
    return () => window.removeEventListener('online', handler);
  }, [error, canResume]); // eslint-disable-line

  const close = () => {
    if (uploading && !error) return;
    setClosing(true); setTimeout(onClose, 280);
  };

  const resetAll = () => {
    setTitle(''); setDesc(''); setCategory(''); setType('mobile');
    setFile(null); setPreview(''); setImgDims(null); reset();
  };

  const selectFile = useCallback((f: File) => {
    if (!f?.type.startsWith('image/') || f.size > 10*1024*1024) return;
    setFile(f);
    const url = URL.createObjectURL(f);
    setPreview(url);
    const img = new Image();
    img.onload = () => { setImgDims({w:img.naturalWidth,h:img.naturalHeight}); setType(img.naturalWidth>img.naturalHeight?'pc':'mobile'); };
    img.src = url;
  }, []);

  const doUpload = async (resume: boolean) => {
    setViolation(null);
    const result = await uploadFile(file!, title, desc, resume, category, type);
    if (result.success) { setTodayCount(c=>c+1); setTimeout(()=>{resetAll();close();},2000); }
    else if (result.violation && result.error) {
      setViolation({reason:result.error,details:result.details});
      checkSuspension(supabase, user?.id).then(susp=>setSuspension(susp));
    }
  };

  const countdown    = useCountdown(suspension.suspendedUntil);
  const limitReached = todayCount >= DAILY_LIMIT;
  const remaining    = Math.max(0, DAILY_LIMIT - todayCount);
  const canSubmit    = !!file && !!title.trim() && !uploading && !!user && !!online && !limitReached && !suspension.suspended;
  const isComplete   = progress >= 100 && !error;
  const isOffline    = speed === 'offline';

  // ── Sheet border radius depends on viewport ──────────────────
  const sheetStyle: React.CSSProperties = isDesktop
    ? { position:'relative', zIndex:71, background:'#fff', borderRadius:20, padding:'0 0 24px', boxShadow:'0 8px 60px rgba(0,0,0,0.18)', width:'100%', maxWidth:520, maxHeight:'90dvh', display:'flex', flexDirection:'column' }
    : { position:'relative', zIndex:71, background:'#fff', borderRadius:'24px 24px 0 0', paddingBottom:'max(20px,env(safe-area-inset-bottom))', boxShadow:'0 -4px 40px rgba(0,0,0,0.1)', maxHeight:'90dvh', display:'flex', flexDirection:'column' };

  const wrapStyle: React.CSSProperties = isDesktop
    ? { position:'fixed', inset:0, zIndex:70, display:'flex', alignItems:'center', justifyContent:'center', padding:'0 16px' }
    : { position:'fixed', inset:0, zIndex:70, display:'flex', flexDirection:'column', justifyContent:'flex-end' };

  return (
    <div style={wrapStyle}>
      {/* Backdrop */}
      <div className={closing?'upl-bd-out':'upl-bd-in'} onClick={close} style={{ position:'absolute', inset:0, background:'rgba(0,0,0,0.35)', backdropFilter:'blur(8px)', WebkitBackdropFilter:'blur(8px)' }} />

      {/* Sheet */}
      <div className={closing?(isDesktop?'upl-modal-out':'upl-sheet-down'):(isDesktop?'upl-modal-in':'upl-sheet-up')} onClick={e=>e.stopPropagation()} style={sheetStyle}>

        {/* ── Suspension overlay ── */}
        {suspension.suspended && !violation && (
          <Overlay anim="upl-overlay-in .3s ease forwards">
            <div style={{ width:64,height:64,borderRadius:'50%',background:'rgba(239,68,68,0.08)',display:'flex',alignItems:'center',justifyContent:'center' }}><ShieldAlert size={30} color="#ef4444" /></div>
            <div>
              <p style={{ fontSize:17,fontWeight:700,color:'#0a0a0a',marginBottom:6 }}>Upload Suspended</p>
              <p style={{ fontSize:13,color:'rgba(0,0,0,0.5)',lineHeight:1.6,maxWidth:260,margin:'0 auto 16px' }}>
                Temporarily suspended due to repeated Community Guidelines violations.
              </p>
              <div style={{ padding:'14px 20px',background:'rgba(239,68,68,0.05)',border:'1px solid rgba(239,68,68,0.15)',borderRadius:14,marginBottom:8 }}>
                <p style={{ fontSize:11,fontWeight:600,color:'rgba(0,0,0,0.4)',textTransform:'uppercase',letterSpacing:'0.06em',marginBottom:6 }}>Lifts in</p>
                <p style={{ fontSize:24,fontWeight:700,color:'#ef4444',fontVariantNumeric:'tabular-nums',letterSpacing:'-0.02em' }}>{countdown}</p>
              </div>
              <p style={{ fontSize:11,color:'rgba(0,0,0,0.3)',lineHeight:1.5 }}>Violations: {suspension.violations}/3</p>
            </div>
            <button onClick={close} style={{ padding:'12px 32px',borderRadius:12,border:'1px solid rgba(0,0,0,0.1)',background:'transparent',fontSize:14,fontWeight:600,color:'rgba(0,0,0,0.5)',cursor:'pointer',fontFamily:'inherit' }}>Close</button>
          </Overlay>
        )}

        {/* ── Uploading overlay ── */}
        {uploading && !violation && !isComplete && (
          <Overlay>
            {error
              ? <div style={{ width:56,height:56,borderRadius:'50%',background:'rgba(239,68,68,0.08)',display:'flex',alignItems:'center',justifyContent:'center' }}><AlertCircle size={26} color="#ef4444" /></div>
              : <Spinner />
            }
            <div style={{ textAlign:'center' }}>
              <p style={{ fontSize:16,fontWeight:700,color:'#0a0a0a',marginBottom:6 }}>
                {error?'Upload Failed':`Uploading ${Math.round(progress)}%`}
              </p>
              {!error&&<p style={{ fontSize:13,color:'rgba(0,0,0,0.4)' }}>{status}</p>}
              {error&&<p style={{ fontSize:12,color:'rgba(0,0,0,0.4)',maxWidth:240,margin:'0 auto',lineHeight:1.5 }}>{error}</p>}
              {isOffline&&!error&&<p style={{ fontSize:12,color:'#ef4444',marginTop:6,display:'flex',alignItems:'center',justifyContent:'center',gap:4 }}><WifiOff size={11}/>Will auto-resume when back online</p>}
              {netRetrying&&<p style={{ fontSize:12,color:'#10b981',marginTop:6 }}>Reconnected — resuming…</p>}
            </div>
            {!error&&(
              <div style={{ width:'100%',maxWidth:280,height:4,background:'rgba(0,0,0,0.07)',borderRadius:2,overflow:'hidden' }}>
                <div style={{ height:'100%',borderRadius:2,background:'#0a0a0a',width:`${progress}%`,transition:'width .4s ease' }} />
              </div>
            )}
            {error&&(
              <div style={{ display:'flex',gap:10,width:'100%',maxWidth:280 }}>
                <button onClick={cancel} style={ghostBtn}>Cancel</button>
                <button onClick={()=>doUpload(true)} style={{ ...solidBtn,display:'flex',alignItems:'center',justifyContent:'center',gap:6 }}>
                  <RefreshCw size={14}/>{canResume?'Resume':'Retry'}
                </button>
              </div>
            )}
          </Overlay>
        )}

        {/* ── Success overlay ── */}
        {isComplete && !violation && (
          <Overlay>
            <div style={{ width:72,height:72,borderRadius:'50%',background:'#0a0a0a',display:'flex',alignItems:'center',justifyContent:'center',animation:'upl-pop .5s cubic-bezier(.34,1.56,.64,1) forwards' }}>
              <Check size={32} color="#fff" strokeWidth={2.5} />
            </div>
            <div>
              <p style={{ fontSize:20,fontWeight:700,color:'#0a0a0a',letterSpacing:'-0.02em',marginBottom:6 }}>Upload Complete!</p>
              <p style={{ fontSize:14,color:'rgba(0,0,0,0.45)',lineHeight:1.6,margin:0 }}>Your {type==='pc'?'desktop':'mobile'} wallpaper is now live.</p>
            </div>
          </Overlay>
        )}

        {/* ── Violation overlay ── */}
        {violation && (
          <Overlay>
            <div style={{ width:60,height:60,borderRadius:'50%',background:'rgba(239,68,68,0.08)',display:'flex',alignItems:'center',justifyContent:'center' }}><ShieldAlert size={28} color="#ef4444" /></div>
            <div style={{ maxWidth:280 }}>
              <p style={{ fontSize:16,fontWeight:700,color:'#0a0a0a',marginBottom:8 }}>{violation.reason}</p>
              {violation.details&&<p style={{ fontSize:13,color:'rgba(0,0,0,0.5)',lineHeight:1.6,marginBottom:12 }}>{violation.details}</p>}
              <div style={{ padding:'10px 16px',background:'rgba(239,68,68,0.05)',border:'1px solid rgba(239,68,68,0.15)',borderRadius:12,marginBottom:4 }}>
                <p style={{ fontSize:12,fontWeight:600,color:'#ef4444',margin:0 }}>
                  Violations: {suspension.violations}/3{suspension.violations<3?` — ${3-suspension.violations} more = 7-day ban.`:' — Suspended for 7 days.'}
                </p>
              </div>
            </div>
            <button onClick={()=>setViolation(null)} style={{ ...ghostBtn,maxWidth:280 }}>Dismiss</button>
          </Overlay>
        )}

        {/* Handle (mobile only) */}
        {!isDesktop&&(
          <div style={{ display:'flex',justifyContent:'center',padding:'12px 0 4px',flexShrink:0 }}>
            <div style={{ width:36,height:4,borderRadius:2,background:'rgba(0,0,0,0.1)' }} />
          </div>
        )}

        {/* Header */}
        <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',padding:isDesktop?'20px 24px 14px':'4px 20px 14px',flexShrink:0,borderBottom:'1px solid rgba(0,0,0,0.06)' }}>
          <div>
            <p style={{ fontSize:16,fontWeight:700,color:'#0a0a0a',letterSpacing:'-0.02em' }}>Upload Wallpaper</p>
            {authLoading
              ? <div style={{ width:120,height:12,borderRadius:6,background:'rgba(0,0,0,0.07)',marginTop:5,animation:'upl-shimmer 1.4s ease infinite' }} />
              : (
                <div style={{ display:'flex',alignItems:'center',gap:6,marginTop:2,flexWrap:'wrap' }}>
                  {user
                    ? <span style={{ fontSize:12,color:'#10b981',fontWeight:500 }}>{user.email}</span>
                    : <span style={{ fontSize:12,color:'#ef4444',fontWeight:500 }}>Not signed in</span>
                  }
                  <span style={{ color:'rgba(0,0,0,0.2)' }}>·</span>
                  <NetBadge speed={speed} />
                  {user&&<><span style={{ color:'rgba(0,0,0,0.2)' }}>·</span>
                    <span style={{ fontSize:12,fontWeight:500,color:limitReached?'#ef4444':'rgba(0,0,0,0.4)' }}>
                      {limitReached?'Limit reached':`${remaining}/${DAILY_LIMIT} left`}
                    </span>
                  </>}
                </div>
              )
            }
          </div>
          <button onClick={close} disabled={uploading&&!error} style={{ width:30,height:30,borderRadius:'50%',background:'rgba(0,0,0,0.05)',border:'none',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',opacity:uploading&&!error?0.3:1 }}>
            <X size={14} color="rgba(0,0,0,0.45)" />
          </button>
        </div>

        {/* Body */}
        <div style={{ overflowY:'auto',padding:isDesktop?'18px 24px':'16px 20px',display:'flex',flexDirection:'column',gap:14,flex:1 }}>
          {authLoading ? (
            <>
              {[52,0,44,60].map((h,i)=>(
                <div key={i} style={{ height:h||44,borderRadius:12,background:'rgba(0,0,0,0.06)',animation:`upl-shimmer 1.4s ease ${i*.1}s infinite` }} />
              ))}
            </>
          ) : (
            <>
            {/* Offline banner */}
              {isOffline&&(
                <div style={{ display:'flex',alignItems:'center',gap:10,padding:'10px 14px',background:'rgba(239,68,68,0.06)',border:'1px solid rgba(239,68,68,0.15)',borderRadius:12 }}>
                  <WifiOff size={14} color="#ef4444" style={{ flexShrink:0 }} />
                  <div>
                    <p style={{ fontSize:13,fontWeight:600,color:'#ef4444',margin:0 }}>You're offline</p>
                    <p style={{ fontSize:11,color:'rgba(239,68,68,0.7)',margin:'2px 0 0' }}>Upload will auto-resume when connection is restored.</p>
                  </div>
                </div>
              )}

              {/* Daily limit banner */}
              {limitReached&&(
                <div style={{ display:'flex',alignItems:'center',gap:10,padding:'12px 14px',background:'rgba(239,68,68,0.06)',border:'1px solid rgba(239,68,68,0.2)',borderRadius:12 }}>
                  <AlertCircle size={15} color="#ef4444" style={{ flexShrink:0 }} />
                  <div>
                    <p style={{ fontSize:13,fontWeight:600,color:'#ef4444',margin:0 }}>Daily limit reached</p>
                    <p style={{ fontSize:11,color:'rgba(239,68,68,0.7)',margin:'2px 0 0' }}>You can upload {DAILY_LIMIT} wallpapers per day. Come back tomorrow!</p>
                  </div>
                </div>
              )}

              {/* Resume banner */}
              {canResume&&!uploading&&(
                <div style={{ display:'flex',alignItems:'center',gap:10,padding:'10px 14px',background:'rgba(16,185,129,0.06)',border:'1px solid rgba(16,185,129,0.2)',borderRadius:12 }}>
                  <RefreshCw size={13} color="#10b981" />
                  <p style={{ fontSize:12,color:'#10b981',fontWeight:500,margin:0 }}>Previous upload interrupted — tap Upload to resume</p>
                </div>
              )}

              {/* Type picker */}
              <TypePicker value={type} onChange={setType} disabled={uploading||limitReached} />

              {/* Image + title */}
              <div style={{ display:'flex',gap:14,alignItems:'flex-start' }}>
                <div
                  onClick={()=>!preview&&!uploading&&!limitReached&&fileRef.current?.click()}
                  onDragOver={e=>{e.preventDefault();setDragging(true);}}
                  onDragLeave={()=>setDragging(false)}
                  onDrop={e=>{e.preventDefault();setDragging(false);const f=e.dataTransfer.files[0];if(f)selectFile(f);}}
                  style={{ width:type==='pc'?160:90, height:type==='pc'?90:100, flexShrink:0, borderRadius:14, overflow:'hidden', border:dragging?'2px solid #0a0a0a':preview?'1px solid rgba(0,0,0,0.08)':'2px dashed rgba(0,0,0,0.15)', background:'rgba(0,0,0,0.02)', cursor:preview||limitReached?'default':'pointer', position:'relative', transition:'all .2s', opacity:limitReached?0.4:1 }}>
                  {preview ? (
                    <>
                      <img src={preview} alt="" style={{ width:'100%',height:'100%',objectFit:'cover',display:'block' }} />
                      {imgDims&&<div style={{ position:'absolute',bottom:4,left:4,right:4,textAlign:'center',fontSize:9,color:'#fff',fontWeight:600,background:'rgba(0,0,0,0.5)',borderRadius:4,padding:'2px 0' }}>{imgDims.w}×{imgDims.h}</div>}
                      {!uploading&&(
                        <button onClick={e=>{e.stopPropagation();setPreview('');setFile(null);setImgDims(null);}} style={{ position:'absolute',top:4,right:4,width:20,height:20,borderRadius:'50%',background:'rgba(0,0,0,0.55)',border:'none',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer' }}>
                          <X size={10} color="#fff" />
                        </button>
                      )}
                    </>
                  ) : (
                    <div style={{ width:'100%',height:'100%',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:6 }}>
                      <ImageIcon size={20} color="rgba(0,0,0,0.25)" />
                      <span style={{ fontSize:10,color:'rgba(0,0,0,0.3)',fontWeight:500,textAlign:'center' }}>{type==='pc'?'16:9':'9:16'}</span>
                    </div>
                  )}
                </div>

                <div style={{ flex:1,display:'flex',flexDirection:'column',gap:8 }}>
                  <input type="text" value={title} onChange={e=>setTitle(e.target.value)} placeholder="Title *" disabled={uploading||limitReached} maxLength={100} style={{ ...inputStyle,opacity:limitReached?0.4:1 }} />
                  {file ? (
                    <div style={{ display:'flex',alignItems:'center',gap:6,padding:'7px 10px',background:'rgba(0,0,0,0.03)',borderRadius:10,border:'1px solid rgba(0,0,0,0.06)' }}>
                      <Check size={11} color="#10b981" style={{ flexShrink:0 }} />
                      <span style={{ fontSize:11,color:'rgba(0,0,0,0.45)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',flex:1 }}>{file.name}</span>
                      <span style={{ fontSize:11,color:'rgba(0,0,0,0.3)',flexShrink:0 }}>{(file.size/1024/1024).toFixed(1)}MB</span>
                    </div>
                  ) : <p style={{ fontSize:11,color:'rgba(0,0,0,0.3)',paddingLeft:2 }}>PNG · JPG · WEBP · max 10MB</p>}
                  {preview&&!uploading&&!limitReached&&(
                    <button onClick={()=>fileRef.current?.click()} style={{ padding:'6px 10px',borderRadius:8,border:'1px solid rgba(0,0,0,0.08)',background:'transparent',fontSize:11,fontWeight:500,color:'rgba(0,0,0,0.45)',cursor:'pointer',fontFamily:'inherit',display:'flex',alignItems:'center',gap:4 }}>
                      <Upload size={10}/>Change
                    </button>
                  )}
                </div>
              </div>

              {/* Category */}
              <div>
                <button onClick={()=>!uploading&&!limitReached&&setCatOpen(p=>!p)} disabled={uploading||limitReached}
                  style={{ ...inputStyle,display:'flex',alignItems:'center',justifyContent:'space-between',cursor:uploading||limitReached?'default':'pointer',color:category?'#0a0a0a':'rgba(0,0,0,0.35)',opacity:limitReached?0.4:1 }}>
                  <span style={{ fontSize:14 }}>{category||'Category (optional)'}</span>
                  <ChevronDown size={15} color="rgba(0,0,0,0.3)" style={{ flexShrink:0,transition:'transform .2s',transform:catOpen?'rotate(180deg)':'rotate(0deg)' }} />
                </button>
                <div style={{ overflow:'hidden',maxHeight:catOpen?130:0,transition:'max-height .25s cubic-bezier(.16,1,.3,1)',marginTop:catOpen?8:0 }}>
                  <div style={{ display:'flex',flexWrap:'wrap',gap:7,padding:'2px 0 4px' }}>
                    {CATEGORIES.map(cat=>{
                      const on=category===cat;
                      return <button key={cat} onClick={()=>{setCategory(on?'':cat);setCatOpen(false);}} style={{ padding:'6px 13px',borderRadius:20,border:on?'1.5px solid #0a0a0a':'1px solid rgba(0,0,0,0.1)',background:on?'#0a0a0a':'transparent',color:on?'#fff':'rgba(0,0,0,0.55)',fontSize:12,fontWeight:on?600:400,fontFamily:'inherit',cursor:'pointer',transition:'all .15s' }}>{cat}</button>;
                    })}
                  </div>
                </div>
              </div>

              {/* Description */}
              <textarea value={desc} onChange={e=>setDesc(e.target.value)} placeholder="Description (optional)" rows={2} disabled={uploading||limitReached} maxLength={300} style={{ ...inputStyle,resize:'none',opacity:limitReached?0.4:1 }} />
            </>
          )}
        </div>

        {/* Footer */}
        <div style={{ display:'flex',gap:10,padding:'12px 20px 0',flexShrink:0,borderTop:'1px solid rgba(0,0,0,0.06)' }}>
          <button onClick={close} disabled={uploading&&!error} style={ghostBtn}>Cancel</button>
          <button onClick={()=>doUpload(false)} disabled={!canSubmit||authLoading}
            style={{ ...solidBtn,display:'flex',alignItems:'center',justifyContent:'center',gap:7,opacity:(!canSubmit||authLoading)?0.35:1 }}>
            <Upload size={15}/>{canResume?'Resume':'Upload'}
          </button>
        </div>
      </div>

      <input ref={fileRef} type="file" accept="image/*" style={{ display:'none' }} onChange={e=>{const f=e.target.files?.[0];if(f)selectFile(f);}} />
    </div>
  );
};

// ── Provider ─────────────────────────────────────────────────────
export const UploadModalProvider = ({ children }: { children: ReactNode }) => {
  const [visible, setVisible] = useState(false);

  const open  = useCallback(() => { window.location.hash = 'upload'; setVisible(true); }, []);
  const close = useCallback(() => { history.replaceState(null,'',window.location.pathname+window.location.search); setVisible(false); }, []);

  // Sync hash ↔ modal
  useEffect(() => {
    const onHash = () => {
      if (window.location.hash === '#upload') setVisible(true);
      else setVisible(false);
    };
    window.addEventListener('hashchange', onHash);
    // Open on initial load if hash present
    if (window.location.hash === '#upload') setVisible(true);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  return (
    <UploadModalCtx.Provider value={{ open, close }}>
      <style>{`
        @keyframes upl-overlay-in  { from{opacity:0}           to{opacity:1}            }
        @keyframes upl-bd-in       { from{opacity:0}           to{opacity:1}            }
        @keyframes upl-bd-out      { from{opacity:1}           to{opacity:0}            }
        @keyframes upl-sheet-up    { from{transform:translateY(100%)} to{transform:translateY(0)} }
        @keyframes upl-sheet-down  { from{transform:translateY(0)} to{transform:translateY(100%)} }
        @keyframes upl-modal-in    { from{opacity:0;transform:scale(.96) translateY(8px)} to{opacity:1;transform:scale(1) translateY(0)} }
        @keyframes upl-modal-out   { from{opacity:1;transform:scale(1) translateY(0)} to{opacity:0;transform:scale(.96) translateY(8px)} }
        @keyframes upl-spin        { to{transform:rotate(360deg)} }
        @keyframes upl-pop         { 0%{transform:scale(0)} 60%{transform:scale(1.15)} 100%{transform:scale(1)} }
        @keyframes upl-shimmer     { 0%,100%{opacity:1} 50%{opacity:.4} }
        .upl-bd-in      { animation: upl-bd-in      .22s ease forwards; }
        .upl-bd-out     { animation: upl-bd-out     .26s ease forwards; }
        .upl-sheet-up   { animation: upl-sheet-up   .32s cubic-bezier(.16,1,.3,1) forwards; }
        .upl-sheet-down { animation: upl-sheet-down .26s cubic-bezier(.4,0,1,1)  forwards; }
        .upl-modal-in   { animation: upl-modal-in   .28s cubic-bezier(.16,1,.3,1) forwards; }
        .upl-modal-out  { animation: upl-modal-out  .22s cubic-bezier(.4,0,1,1)  forwards; }
        input:focus, textarea:focus { border-color: rgba(0,0,0,0.25) !important; background: #fff !important; }
      `}</style>
      {children}
      {visible && <UploadModal onClose={close} />}
    </UploadModalCtx.Provider>
  );
};