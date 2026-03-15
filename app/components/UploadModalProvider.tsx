'use client';

import { createContext, useContext, useState, useRef, useCallback, useEffect, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { X, Upload, Image as ImageIcon, Check, Wifi, WifiOff, RefreshCw, AlertCircle } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/app/components/AuthProvider';
import { useUpload } from '@/app/hooks/useUpload';

// ─── Context ───────────────────────────────────────────────────────────────────
const UploadModalCtx = createContext<{ open: () => void; close: () => void } | null>(null);

export const useUploadModal = () => {
  const ctx = useContext(UploadModalCtx);
  if (!ctx) throw new Error('useUploadModal must be used inside UploadModalProvider');
  return ctx;
};

// ─── Spinner ───────────────────────────────────────────────────────────────────
const Spinner = () => (
  <svg width="48" height="48" viewBox="0 0 48 48" fill="none" style={{ animation: 'upl-spin 0.8s linear infinite' }}>
    <circle cx="24" cy="24" r="20" stroke="rgba(0,0,0,0.08)" strokeWidth="4" />
    <path d="M24 4a20 20 0 0 1 20 20" stroke="#0a0a0a" strokeWidth="4" strokeLinecap="round" />
  </svg>
);

// ─── Shared styles ─────────────────────────────────────────────────────────────
const solidBtn: React.CSSProperties = { flex: 1, padding: '13px 0', borderRadius: 12, border: 'none', background: '#0a0a0a', color: '#fff', fontFamily: 'inherit', fontSize: 14, fontWeight: 600, cursor: 'pointer' };
const ghostBtn: React.CSSProperties = { flex: 1, padding: '13px 0', borderRadius: 12, border: '1px solid rgba(0,0,0,0.1)', background: 'transparent', color: 'rgba(0,0,0,0.5)', fontFamily: 'inherit', fontSize: 14, fontWeight: 500, cursor: 'pointer' };
const inputStyle: React.CSSProperties = { width: '100%', padding: '11px 14px', background: 'rgba(0,0,0,0.03)', border: '1px solid rgba(0,0,0,0.08)', borderRadius: 12, fontSize: 14, color: '#0a0a0a', fontFamily: 'inherit', outline: 'none', transition: 'border-color .15s' };

// ─── Inner modal (rendered by provider) ───────────────────────────────────────
const UploadModal = ({ onClose }: { onClose: () => void }) => {
  const router      = useRouter();
  const { session } = useAuth();
  const supabase    = createClient();

  const [user,     setUser]     = useState<any>(null);
  const [title,    setTitle]    = useState('');
  const [desc,     setDesc]     = useState('');
  const [file,     setFile]     = useState<File | null>(null);
  const [preview,  setPreview]  = useState('');
  const [imgDims,  setImgDims]  = useState<{ w: number; h: number } | null>(null);
  const [dragging, setDragging] = useState(false);
  const [closing,     setClosing]     = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const fileRef = useRef<HTMLInputElement>(null);

  const { uploading, progress, status, error, online, speed, canResume, uploadFile, reset, cancel, getCachedData } = useUpload(user?.id);

  useEffect(() => {
    (async () => {
      const { data: { session: s } } = await supabase.auth.getSession();
      setUser(session?.user || s?.user || null);
      const cached = getCachedData();
      if (cached) { setTitle(cached.title || ''); setDesc(cached.description || ''); }
      setAuthLoading(false);
    })();
    // lock scroll
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  const close = () => {
    if (uploading && !error) return;
    setClosing(true);
    setTimeout(onClose, 280);
  };

  const resetAll = () => { setTitle(''); setDesc(''); setFile(null); setPreview(''); setImgDims(null); reset(); };

  const selectFile = useCallback((f: File) => {
    if (!f?.type.startsWith('image/') || f.size > 10 * 1024 * 1024) return;
    setFile(f);
    const url = URL.createObjectURL(f); setPreview(url);
    const img = new Image();
    img.onload = () => setImgDims({ w: img.naturalWidth, h: img.naturalHeight });
    img.src = url;
  }, []);

  const doUpload = async (resume: boolean) => {
    const result = await uploadFile(file!, title, desc, resume);
    if (result.success) { setTimeout(() => { resetAll(); close(); }, 1000); }
  };

  const speedColor = speed === 'offline' ? '#ef4444' : speed === 'slow' ? '#f59e0b' : '#10b981';
  const SpeedIcon  = speed === 'offline' ? WifiOff : Wifi;
  const canSubmit  = !!file && !!title.trim() && !uploading && !!user && !!online;
  const isComplete = progress >= 100 && !error;

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 70, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
      {/* Backdrop */}
      <div
        className={closing ? 'upl-bd-out' : 'upl-bd-in'}
        onClick={close}
        style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }}
      />

      {/* Progress overlay — REMOVED from here, moved inside sheet below */}

      {/* Sheet */}
      <div
        className={closing ? 'upl-sheet-down' : 'upl-sheet-up'}
        onClick={e => e.stopPropagation()}
        style={{ position: 'relative', zIndex: 71, background: '#fff', borderRadius: '24px 24px 0 0', paddingBottom: 'max(20px, env(safe-area-inset-bottom))', boxShadow: '0 -4px 40px rgba(0,0,0,0.1)', maxHeight: '90dvh', display: 'flex', flexDirection: 'column' }}
      >
        {/* Progress overlay — sits inside sheet, covers it entirely */}
        {uploading && (
          <div style={{ position: 'absolute', inset: 0, zIndex: 10, borderRadius: '24px 24px 0 0', background: 'rgba(255,255,255,0.97)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, padding: '32px 24px', animation: 'upl-overlay-in .25s ease forwards' }}>
            {isComplete
              ? <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#0a0a0a', display: 'flex', alignItems: 'center', justifyContent: 'center', animation: 'upl-pop .4s cubic-bezier(.34,1.56,.64,1) forwards' }}><Check size={24} color="#fff" strokeWidth={2.5} /></div>
              : error ? <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(239,68,68,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><AlertCircle size={26} color="#ef4444" /></div>
              : <Spinner />
            }
            <div style={{ textAlign: 'center' }}>
              <p style={{ fontSize: 16, fontWeight: 700, color: '#0a0a0a', marginBottom: 6 }}>
                {error ? 'Upload Failed' : isComplete ? 'Upload Complete' : `Uploading ${Math.round(progress)}%`}
              </p>
              {!error && !isComplete && <p style={{ fontSize: 13, color: 'rgba(0,0,0,0.4)' }}>{status}</p>}
              {error && <p style={{ fontSize: 12, color: 'rgba(0,0,0,0.4)', maxWidth: 240, margin: '0 auto', lineHeight: 1.5 }}>{error}</p>}
            </div>
            {!error && !isComplete && (
              <div style={{ width: '100%', maxWidth: 280, height: 4, background: 'rgba(0,0,0,0.07)', borderRadius: 2, overflow: 'hidden' }}>
                <div style={{ height: '100%', borderRadius: 2, background: '#0a0a0a', width: `${progress}%`, transition: 'width .4s ease' }} />
              </div>
            )}
            {error && (
              <div style={{ display: 'flex', gap: 10, width: '100%', maxWidth: 280 }}>
                <button onClick={cancel} style={ghostBtn}>Cancel</button>
                <button onClick={() => doUpload(true)} style={{ ...solidBtn, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                  <RefreshCw size={14} />{canResume ? 'Resume' : 'Retry'}
                </button>
              </div>
            )}
          </div>
        )}
        {/* Handle */}
        <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 4px', flexShrink: 0 }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: 'rgba(0,0,0,0.1)' }} />
        </div>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 20px 14px', flexShrink: 0, borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
          <div>
            <p style={{ fontSize: 16, fontWeight: 700, color: '#0a0a0a', letterSpacing: '-0.02em' }}>Upload Wallpaper</p>
            {authLoading
              ? <div style={{ width: 120, height: 12, borderRadius: 6, background: 'rgba(0,0,0,0.07)', marginTop: 5, animation: 'upl-shimmer 1.4s ease infinite' }} />
              : <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                  {user ? <span style={{ fontSize: 12, color: '#10b981', fontWeight: 500 }}>{user.email}</span>
                        : <span style={{ fontSize: 12, color: '#ef4444', fontWeight: 500 }}>Not signed in</span>}
                  <span style={{ color: 'rgba(0,0,0,0.2)' }}>·</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 12, fontWeight: 500, color: speedColor }}>
                    <SpeedIcon size={11} />{speed === 'offline' ? 'Offline' : speed === 'slow' ? 'Slow' : 'Online'}
                  </span>
                </div>
            }
          </div>
          <button onClick={close} disabled={uploading && !error} style={{ width: 30, height: 30, borderRadius: '50%', background: 'rgba(0,0,0,0.05)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', opacity: uploading && !error ? 0.3 : 1 }}>
            <X size={14} color="rgba(0,0,0,0.45)" />
          </button>
        </div>

        {/* Body */}
        <div style={{ overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 14, flex: 1 }}>

          {/* Auth loading skeleton */}
          {authLoading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', gap: 14 }}>
                <div style={{ width: 100, height: 100, borderRadius: 16, background: 'rgba(0,0,0,0.06)', flexShrink: 0, animation: 'upl-shimmer 1.4s ease infinite' }} />
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div style={{ height: 42, borderRadius: 12, background: 'rgba(0,0,0,0.06)', animation: 'upl-shimmer 1.4s ease .1s infinite' }} />
                  <div style={{ height: 28, borderRadius: 10, background: 'rgba(0,0,0,0.04)', animation: 'upl-shimmer 1.4s ease .2s infinite' }} />
                </div>
              </div>
              <div style={{ height: 60, borderRadius: 12, background: 'rgba(0,0,0,0.06)', animation: 'upl-shimmer 1.4s ease .15s infinite' }} />
            </div>
          ) : (
            <>
              {canResume && !uploading && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 12 }}>
                  <RefreshCw size={13} color="#10b981" />
                  <p style={{ fontSize: 12, color: '#10b981', fontWeight: 500 }}>Previous upload interrupted — tap Upload to resume</p>
                </div>
              )}

          {/* Image + title row */}
          <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
            {/* Square image picker */}
            <div
              onClick={() => !preview && !uploading && fileRef.current?.click()}
              onDragOver={e => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={e => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f) selectFile(f); }}
              style={{ width: 100, height: 100, flexShrink: 0, borderRadius: 16, overflow: 'hidden', border: dragging ? '2px solid #0a0a0a' : preview ? '1px solid rgba(0,0,0,0.08)' : '2px dashed rgba(0,0,0,0.15)', background: 'rgba(0,0,0,0.02)', cursor: preview ? 'default' : 'pointer', position: 'relative', transition: 'border-color .15s' }}
            >
              {preview ? (
                <>
                  <img src={preview} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                  {imgDims && <div style={{ position: 'absolute', bottom: 4, left: 4, right: 4, textAlign: 'center', fontSize: 9, color: '#fff', fontWeight: 600, background: 'rgba(0,0,0,0.5)', borderRadius: 4, padding: '2px 0' }}>{imgDims.w}×{imgDims.h}</div>}
                  {!uploading && (
                    <button onClick={e => { e.stopPropagation(); setPreview(''); setFile(null); setImgDims(null); }} style={{ position: 'absolute', top: 4, right: 4, width: 20, height: 20, borderRadius: '50%', background: 'rgba(0,0,0,0.55)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                      <X size={10} color="#fff" />
                    </button>
                  )}
                </>
              ) : (
                <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                  <ImageIcon size={22} color="rgba(0,0,0,0.25)" />
                  <span style={{ fontSize: 10, color: 'rgba(0,0,0,0.3)', fontWeight: 500, textAlign: 'center' }}>Tap to add</span>
                </div>
              )}
            </div>

            {/* Title + file chip */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="Wallpaper title *" disabled={uploading} maxLength={100} style={inputStyle} />
              {file ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 10px', background: 'rgba(0,0,0,0.03)', borderRadius: 10, border: '1px solid rgba(0,0,0,0.06)' }}>
                  <Check size={11} color="#10b981" style={{ flexShrink: 0 }} />
                  <span style={{ fontSize: 11, color: 'rgba(0,0,0,0.45)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{file.name}</span>
                  <span style={{ fontSize: 11, color: 'rgba(0,0,0,0.3)', flexShrink: 0 }}>{(file.size / 1024 / 1024).toFixed(1)}MB</span>
                </div>
              ) : (
                <p style={{ fontSize: 11, color: 'rgba(0,0,0,0.3)', paddingLeft: 2 }}>PNG · JPG · WEBP · max 10MB</p>
              )}
              {preview && !uploading && (
                <button onClick={() => fileRef.current?.click()} style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid rgba(0,0,0,0.08)', background: 'transparent', fontSize: 11, fontWeight: 500, color: 'rgba(0,0,0,0.45)', cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Upload size={10} />Change
                </button>
              )}
            </div>
          </div>

          {/* Description */}
          <textarea value={desc} onChange={e => setDesc(e.target.value)} placeholder="Short description (optional)" rows={2} disabled={uploading} maxLength={300} style={{ ...inputStyle, resize: 'none' }} />
            </>
          )}
        </div>

        {/* Footer */}
        <div style={{ display: 'flex', gap: 10, padding: '12px 20px 0', flexShrink: 0, borderTop: '1px solid rgba(0,0,0,0.06)' }}>
          <button onClick={close} disabled={uploading && !error} style={ghostBtn}>Cancel</button>
          <button onClick={() => doUpload(false)} disabled={!canSubmit || authLoading} style={{ ...solidBtn, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, opacity: (!canSubmit || authLoading) ? 0.35 : 1 }}>
            <Upload size={15} />{canResume ? 'Resume Upload' : 'Upload'}
          </button>
        </div>
      </div>

      <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => { const f = e.target.files?.[0]; if (f) selectFile(f); }} />
    </div>
  );
};

// ─── Provider (add once to layout) ────────────────────────────────────────────
export const UploadModalProvider = ({ children }: { children: ReactNode }) => {
  const [visible, setVisible] = useState(false);

  const open  = useCallback(() => setVisible(true),  []);
  const close = useCallback(() => setVisible(false), []);

  return (
    <UploadModalCtx.Provider value={{ open, close }}>
      <style>{`
        @keyframes upl-overlay-in  { from{opacity:0} to{opacity:1} }
        @keyframes upl-bd-in      { from{opacity:0}                  to{opacity:1} }
        @keyframes upl-bd-out     { from{opacity:1}                  to{opacity:0} }
        @keyframes upl-sheet-up   { from{transform:translateY(100%)} to{transform:translateY(0)} }
        @keyframes upl-sheet-down { from{transform:translateY(0)}    to{transform:translateY(100%)} }
        @keyframes upl-spin       { to{transform:rotate(360deg)} }
        @keyframes upl-pop        { 0%{transform:scale(0)} 60%{transform:scale(1.15)} 100%{transform:scale(1)} }
        @keyframes upl-shimmer    { 0%,100%{opacity:1} 50%{opacity:0.4} }
        .upl-bd-in      { animation: upl-bd-in      .22s ease forwards; }
        .upl-bd-out     { animation: upl-bd-out     .26s ease forwards; }
        .upl-sheet-up   { animation: upl-sheet-up   .32s cubic-bezier(.16,1,.3,1) forwards; }
        .upl-sheet-down { animation: upl-sheet-down .26s cubic-bezier(.4,0,1,1)   forwards; }
        input:focus, textarea:focus { border-color: rgba(0,0,0,0.25) !important; background: #fff !important; }
      `}</style>
      {children}
      {visible && <UploadModal onClose={close} />}
    </UploadModalCtx.Provider>
  );
};
