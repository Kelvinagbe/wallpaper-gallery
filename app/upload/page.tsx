'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { X, Upload, Image as ImageIcon, Check, Wifi, WifiOff, RefreshCw, AlertCircle } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/app/components/AuthProvider';
import { useUpload } from '@/app/hooks/useUpload';

// ─── Spinner ───────────────────────────────────────────────────────────────────
const Spinner = () => (
  <svg width="48" height="48" viewBox="0 0 48 48" fill="none" style={{ animation: 'spin 0.8s linear infinite' }}>
    <circle cx="24" cy="24" r="20" stroke="rgba(0,0,0,0.08)" strokeWidth="4" />
    <path d="M24 4a20 20 0 0 1 20 20" stroke="#0a0a0a" strokeWidth="4" strokeLinecap="round" />
  </svg>
);

// ─── Upload Progress Overlay ───────────────────────────────────────────────────
const UploadOverlay = ({ progress, status, error, onRetry, onCancel, canResume }: {
  progress: number; status: string; error: string | null;
  onRetry: () => void; onCancel: () => void; canResume: boolean;
}) => {
  const isComplete = progress >= 100 && !error;
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 80, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', background: 'rgba(255,255,255,0.7)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)' }}>
      <div style={{ width: '100%', maxWidth: 480, padding: '0 16px 32px', animation: 'sheetUp .32s cubic-bezier(.16,1,.3,1) forwards' }}>
        <div style={{ background: '#fff', borderRadius: 24, padding: '28px 24px', border: '1px solid rgba(0,0,0,0.08)', boxShadow: '0 8px 40px rgba(0,0,0,0.1)' }}>

          {/* Status icon */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, marginBottom: 20 }}>
            {isComplete
              ? <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#0a0a0a', display: 'flex', alignItems: 'center', justifyContent: 'center', animation: 'pop .4s cubic-bezier(.34,1.56,.64,1) forwards' }}>
                  <Check size={24} color="#fff" strokeWidth={2.5} />
                </div>
              : error
              ? <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(239,68,68,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <AlertCircle size={26} color="#ef4444" />
                </div>
              : <Spinner />
            }

            <div style={{ textAlign: 'center' }}>
              <p style={{ fontSize: 15, fontWeight: 700, color: '#0a0a0a', marginBottom: 4 }}>
                {error ? 'Upload Failed' : isComplete ? 'Upload Complete' : `Uploading ${Math.round(progress)}%`}
              </p>
              {!error && !isComplete && <p style={{ fontSize: 13, color: 'rgba(0,0,0,0.4)' }}>{status}</p>}
              {error && <p style={{ fontSize: 12, color: 'rgba(0,0,0,0.4)', maxWidth: 240, margin: '0 auto', lineHeight: 1.5 }}>{error}</p>}
            </div>
          </div>

          {/* Progress bar */}
          {!error && !isComplete && (
            <div style={{ height: 3, background: 'rgba(0,0,0,0.07)', borderRadius: 2, marginBottom: 16, overflow: 'hidden' }}>
              <div style={{ height: '100%', borderRadius: 2, background: '#0a0a0a', width: `${progress}%`, transition: 'width .4s ease' }} />
            </div>
          )}

          {/* Error actions */}
          {error && (
            <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
              <button onClick={onCancel} style={ghostBtn}>Cancel</button>
              <button onClick={onRetry} style={{ ...solidBtn, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                <RefreshCw size={14} />{canResume ? 'Resume' : 'Retry'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── Shared styles ─────────────────────────────────────────────────────────────
const solidBtn: React.CSSProperties = {
  flex: 1, padding: '13px 0', borderRadius: 12, border: 'none',
  background: '#0a0a0a', color: '#fff', fontFamily: 'inherit',
  fontSize: 14, fontWeight: 600, cursor: 'pointer', transition: 'opacity .15s',
};
const ghostBtn: React.CSSProperties = {
  flex: 1, padding: '13px 0', borderRadius: 12,
  border: '1px solid rgba(0,0,0,0.1)', background: 'transparent',
  color: 'rgba(0,0,0,0.5)', fontFamily: 'inherit',
  fontSize: 14, fontWeight: 500, cursor: 'pointer',
};
const inputStyle: React.CSSProperties = {
  width: '100%', padding: '11px 14px',
  background: 'rgba(0,0,0,0.03)', border: '1px solid rgba(0,0,0,0.08)',
  borderRadius: 12, fontSize: 14, color: '#0a0a0a',
  fontFamily: 'inherit', outline: 'none', transition: 'border-color .15s',
};

// ─── Page ──────────────────────────────────────────────────────────────────────
export default function UploadPage() {
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
  const [mounted,  setMounted]  = useState(false);
  const [closing,  setClosing]  = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const { uploading, progress, status, error, online, speed, canResume, uploadFile, reset, cancel, getCachedData } = useUpload(user?.id);

  useEffect(() => {
    setMounted(true);
    (async () => {
      const { data: { session: s } } = await supabase.auth.getSession();
      setUser(session?.user || s?.user || null);
      const cached = getCachedData();
      if (cached) { setTitle(cached.title || ''); setDesc(cached.description || ''); }
    })();
  }, []);

  const close = () => {
    if (uploading && !error) return;
    setClosing(true);
    setTimeout(() => router.back(), 280);
  };

  const resetAll = () => { setTitle(''); setDesc(''); setFile(null); setPreview(''); setImgDims(null); reset(); };

  const selectFile = useCallback((f: File) => {
    if (!f?.type.startsWith('image/')) return;
    if (f.size > 10 * 1024 * 1024) return;
    setFile(f);
    const url = URL.createObjectURL(f); setPreview(url);
    const img = new Image();
    img.onload = () => setImgDims({ w: img.naturalWidth, h: img.naturalHeight });
    img.src = url;
  }, []);

  const doUpload = async (resume: boolean) => {
    const result = await uploadFile(file!, title, desc, resume);
    if (result.success) { setTimeout(() => { resetAll(); router.back(); }, 1000); }
  };

  const speedColor = speed === 'offline' ? '#ef4444' : speed === 'slow' ? '#f59e0b' : '#10b981';
  const SpeedIcon  = speed === 'offline' ? WifiOff : Wifi;
  const canSubmit  = !!file && !!title.trim() && !uploading && !!user && !!online;

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 70, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
      <style>{`
        @keyframes bdIn      { from{opacity:0}                     to{opacity:1} }
        @keyframes bdOut     { from{opacity:1}                     to{opacity:0} }
        @keyframes sheetUp   { from{transform:translateY(100%)}    to{transform:translateY(0)} }
        @keyframes sheetDown { from{transform:translateY(0)}       to{transform:translateY(100%)} }
        @keyframes spin      { to{transform:rotate(360deg)} }
        @keyframes pop       { 0%{transform:scale(0)} 60%{transform:scale(1.15)} 100%{transform:scale(1)} }
        .sheet-up   { animation: sheetUp   .32s cubic-bezier(.16,1,.3,1) forwards; }
        .sheet-down { animation: sheetDown .26s cubic-bezier(.4,0,1,1)   forwards; }
        .bd-in  { animation: bdIn  .22s ease forwards; }
        .bd-out { animation: bdOut .26s ease forwards; }
        input:focus, textarea:focus { border-color: rgba(0,0,0,0.25) !important; background: #fff !important; }
      `}</style>

      {/* Backdrop */}
      <div
        className={closing ? 'bd-out' : 'bd-in'}
        onClick={close}
        style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }}
      />

      {/* Upload progress */}
      {uploading && (
        <UploadOverlay
          progress={progress} status={status} error={error}
          canResume={canResume} onRetry={() => doUpload(true)} onCancel={cancel}
        />
      )}

      {/* Sheet */}
      {mounted && (
        <div
          className={closing ? 'sheet-down' : 'sheet-up'}
          onClick={e => e.stopPropagation()}
          style={{
            position: 'relative', zIndex: 71,
            background: '#fff',
            borderRadius: '24px 24px 0 0',
            paddingBottom: 'max(20px, env(safe-area-inset-bottom))',
            boxShadow: '0 -4px 40px rgba(0,0,0,0.1)',
            maxHeight: '90dvh',
            display: 'flex', flexDirection: 'column',
          }}
        >
          {/* Handle */}
          <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 4px', flexShrink: 0 }}>
            <div style={{ width: 36, height: 4, borderRadius: 2, background: 'rgba(0,0,0,0.1)' }} />
          </div>

          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 20px 14px', flexShrink: 0, borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
            <div>
              <p style={{ fontSize: 16, fontWeight: 700, color: '#0a0a0a', letterSpacing: '-0.02em' }}>Upload Wallpaper</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                {user
                  ? <span style={{ fontSize: 12, color: '#10b981', fontWeight: 500 }}>{user.email}</span>
                  : <span style={{ fontSize: 12, color: '#ef4444', fontWeight: 500 }}>Not signed in</span>}
                <span style={{ color: 'rgba(0,0,0,0.2)' }}>·</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 12, fontWeight: 500, color: speedColor }}>
                  <SpeedIcon size={11} />{speed === 'offline' ? 'Offline' : speed === 'slow' ? 'Slow' : 'Online'}
                </span>
              </div>
            </div>
            <button
              onClick={close}
              disabled={uploading && !error}
              style={{ width: 30, height: 30, borderRadius: '50%', background: 'rgba(0,0,0,0.05)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', opacity: (uploading && !error) ? 0.3 : 1 }}
            >
              <X size={14} color="rgba(0,0,0,0.45)" />
            </button>
          </div>

          {/* Body */}
          <div style={{ overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 14, flex: 1 }}>

            {/* Resume banner */}
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
                style={{
                  width: 100, height: 100,
                  flexShrink: 0,
                  borderRadius: 16, overflow: 'hidden',
                  border: dragging ? '2px solid #0a0a0a' : preview ? '1px solid rgba(0,0,0,0.08)' : '2px dashed rgba(0,0,0,0.15)',
                  background: dragging ? 'rgba(0,0,0,0.03)' : 'rgba(0,0,0,0.02)',
                  cursor: preview ? 'default' : 'pointer',
                  position: 'relative',
                  transition: 'border-color .15s',
                }}
              >
                {preview ? (
                  <>
                    <img src={preview} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                    {imgDims && (
                      <div style={{ position: 'absolute', bottom: 4, left: 4, right: 4, textAlign: 'center', fontSize: 9, color: '#fff', fontWeight: 600, background: 'rgba(0,0,0,0.5)', borderRadius: 4, padding: '2px 0', backdropFilter: 'blur(4px)' }}>
                        {imgDims.w}×{imgDims.h}
                      </div>
                    )}
                    {!uploading && (
                      <button
                        onClick={e => { e.stopPropagation(); setPreview(''); setFile(null); setImgDims(null); }}
                        style={{ position: 'absolute', top: 4, right: 4, width: 20, height: 20, borderRadius: '50%', background: 'rgba(0,0,0,0.55)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                      >
                        <X size={10} color="#fff" />
                      </button>
                    )}
                  </>
                ) : (
                  <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                    <ImageIcon size={22} color="rgba(0,0,0,0.25)" />
                    <span style={{ fontSize: 10, color: 'rgba(0,0,0,0.3)', fontWeight: 500, textAlign: 'center', lineHeight: 1.3 }}>Tap to add</span>
                  </div>
                )}
              </div>

              {/* Title + file chip */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
                <input
                  type="text"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="Wallpaper title *"
                  disabled={uploading}
                  maxLength={100}
                  style={inputStyle}
                />
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
                  <button
                    onClick={() => fileRef.current?.click()}
                    style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid rgba(0,0,0,0.08)', background: 'transparent', fontSize: 11, fontWeight: 500, color: 'rgba(0,0,0,0.45)', cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 4 }}
                  >
                    <Upload size={10} />Change
                  </button>
                )}
              </div>
            </div>

            {/* Description */}
            <textarea
              value={desc}
              onChange={e => setDesc(e.target.value)}
              placeholder="Short description (optional)"
              rows={2}
              disabled={uploading}
              maxLength={300}
              style={{ ...inputStyle, resize: 'none' }}
            />
          </div>

          {/* Footer */}
          <div style={{ display: 'flex', gap: 10, padding: '12px 20px 0', flexShrink: 0, borderTop: '1px solid rgba(0,0,0,0.06)' }}>
            <button onClick={close} disabled={uploading && !error} style={ghostBtn}>Cancel</button>
            <button
              onClick={() => doUpload(false)}
              disabled={!canSubmit}
              style={{ ...solidBtn, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, opacity: !canSubmit ? 0.35 : 1 }}
            >
              <Upload size={15} />{canResume ? 'Resume Upload' : 'Upload'}
            </button>
          </div>
        </div>
      )}

      <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => { const f = e.target.files?.[0]; if (f) selectFile(f); }} />
    </div>
  );
}
