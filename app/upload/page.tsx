'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { X, Upload, Image as ImageIcon, Check, AlertCircle, Wifi, WifiOff, RefreshCw } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/app/components/AuthProvider';
import { useUpload } from '@/app/hooks/useUpload';

// ─── Snake Ring ────────────────────────────────────────────────────────────────
const SnakeRing = ({ progress, error, isComplete }: { progress: number; error: boolean; isComplete: boolean }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef    = useRef<number>();
  const tRef      = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = 120 * dpr; canvas.height = 120 * dpr;
    canvas.style.width = '120px'; canvas.style.height = '120px';
    const cx = 60 * dpr, cy = 60 * dpr, R = 45 * dpr, W = 7 * dpr;

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(0,0,0,0.07)'; ctx.lineWidth = W; ctx.stroke();
      if (isComplete) {
        ctx.beginPath(); ctx.arc(cx, cy, R, -Math.PI / 2, Math.PI * 3 / 2);
        ctx.strokeStyle = '#10b981'; ctx.lineWidth = W; ctx.lineCap = 'round'; ctx.stroke(); return;
      }
      if (error) {
        ctx.beginPath(); ctx.arc(cx, cy, R, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (progress / 100));
        ctx.strokeStyle = 'rgba(239,68,68,0.4)'; ctx.lineWidth = W; ctx.lineCap = 'round'; ctx.stroke(); return;
      }
      const start = -Math.PI / 2, end = start + Math.PI * 2 * (progress / 100), arc = end - start;
      for (let i = 0; i < 120; i++) {
        const phase = i / 120;
        const a0 = start + arc * (i / 120), a1 = start + arc * ((i + 1) / 120);
        const wave = Math.sin(phase * Math.PI * 5 - tRef.current * 6) * 4 * dpr + Math.sin(phase * Math.PI * 3 - tRef.current * 4) * 2 * dpr;
        ctx.beginPath(); ctx.arc(cx, cy, R + wave, a0, a1);
        ctx.strokeStyle = `hsla(${215 + phase * 40},85%,${45 + phase * 20}%,${0.35 + phase * 0.65})`;
        ctx.lineWidth = W * (0.5 + phase * 0.55); ctx.lineCap = 'butt'; ctx.stroke();
      }
      const hw = Math.sin(Math.PI * 5 - tRef.current * 6) * 4 * dpr + Math.sin(Math.PI * 3 - tRef.current * 4) * 2 * dpr;
      const hx = cx + Math.cos(end) * (R + hw), hy = cy + Math.sin(end) * (R + hw);
      const g = ctx.createRadialGradient(hx, hy, 0, hx, hy, 12 * dpr);
      g.addColorStop(0, 'rgba(99,102,241,1)'); g.addColorStop(0.4, 'rgba(99,102,241,0.5)'); g.addColorStop(1, 'rgba(99,102,241,0)');
      ctx.beginPath(); ctx.arc(hx, hy, 12 * dpr, 0, Math.PI * 2); ctx.fillStyle = g; ctx.fill();
      ctx.beginPath(); ctx.arc(hx, hy, 4.5 * dpr, 0, Math.PI * 2); ctx.fillStyle = '#6366f1'; ctx.fill();
      tRef.current += 0.045;
      rafRef.current = requestAnimationFrame(draw);
    };
    rafRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafRef.current!);
  }, [progress, error, isComplete]);

  return <canvas ref={canvasRef} />;
};

// ─── Upload Progress Overlay ───────────────────────────────────────────────────
const UploadOverlay = ({ progress, status, error, onRetry, onCancel, canResume }: {
  progress: number; status: string; error: string | null;
  onRetry: () => void; onCancel: () => void; canResume: boolean;
}) => {
  const isComplete = progress >= 100 && !error;
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 80, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', background: 'rgba(255,255,255,0.65)', backdropFilter: 'blur(20px)' }}>
      <div style={{ width: '100%', maxWidth: 480, padding: '0 16px 32px', animation: 'sheetUp .35s cubic-bezier(.16,1,.3,1) forwards' }}>
        <div style={{ background: '#fff', borderRadius: 24, padding: 24, border: '1px solid rgba(0,0,0,0.08)', boxShadow: '0 8px 40px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 20 }}>
            <div style={{ position: 'relative', width: 120, height: 120, marginBottom: 12 }}>
              <SnakeRing progress={progress} error={!!error} isComplete={isComplete} />
              <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                {isComplete
                  ? <div style={{ width: 44, height: 44, borderRadius: '50%', background: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', animation: 'pop .4s cubic-bezier(.34,1.56,.64,1) forwards' }}><Check size={20} color="#fff" strokeWidth={3} /></div>
                  : error ? <AlertCircle size={36} color="#ef4444" />
                  : <><span style={{ fontSize: 20, fontWeight: 700, color: '#0a0a0a', lineHeight: 1 }}>{Math.round(progress)}</span><span style={{ fontSize: 11, color: 'rgba(0,0,0,0.4)', marginTop: 2 }}>%</span></>}
              </div>
            </div>
            <p style={{ fontWeight: 600, fontSize: 15, color: '#0a0a0a' }}>{error ? 'Upload Failed' : isComplete ? 'Upload Complete!' : 'Uploading…'}</p>
            {!error && !isComplete && <p style={{ fontSize: 13, color: 'rgba(0,0,0,0.4)', marginTop: 4 }}>{status}</p>}
            {error && <p style={{ fontSize: 12, color: 'rgba(0,0,0,0.4)', marginTop: 4, textAlign: 'center', maxWidth: 240 }}>{error}</p>}
          </div>
          {!error && !isComplete && (
            <div style={{ height: 3, background: 'rgba(0,0,0,0.07)', borderRadius: 2, marginBottom: 16, overflow: 'hidden' }}>
              <div style={{ height: '100%', borderRadius: 2, background: '#6366f1', width: `${progress}%`, transition: 'width .4s ease' }} />
            </div>
          )}
          {error && (
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={onCancel} style={ghostBtn}>Cancel</button>
              <button onClick={onRetry} style={{ ...solidBtn, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                <RefreshCw size={15} />{canResume ? 'Resume' : 'Retry'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── Shared button styles ──────────────────────────────────────────────────────
const solidBtn: React.CSSProperties = { flex: 1, padding: '13px 0', borderRadius: 12, border: 'none', background: '#0a0a0a', color: '#fff', fontFamily: 'inherit', fontSize: 14, fontWeight: 600, cursor: 'pointer', transition: 'opacity .15s' };
const ghostBtn: React.CSSProperties = { flex: 1, padding: '13px 0', borderRadius: 12, border: '1px solid rgba(0,0,0,0.1)', background: 'transparent', color: 'rgba(0,0,0,0.5)', fontFamily: 'inherit', fontSize: 14, fontWeight: 500, cursor: 'pointer' };
const inputStyle: React.CSSProperties = { width: '100%', padding: '11px 14px', background: 'rgba(0,0,0,0.03)', border: '1px solid rgba(0,0,0,0.08)', borderRadius: 12, fontSize: 14, color: '#0a0a0a', fontFamily: 'inherit', outline: 'none', transition: 'border-color .15s' };

// ─── Page ──────────────────────────────────────────────────────────────────────
export default function UploadPage() {
  const router   = useRouter();
  const { session } = useAuth();
  const supabase = createClient();

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
        @keyframes bdIn   { from{opacity:0}                          to{opacity:1} }
        @keyframes bdOut  { from{opacity:1}                          to{opacity:0} }
        @keyframes sheetUp   { from{transform:translateY(100%)}      to{transform:translateY(0)} }
        @keyframes sheetDown { from{transform:translateY(0)}         to{transform:translateY(100%)} }
        @keyframes pop    { 0%{transform:scale(0)} 60%{transform:scale(1.15)} 100%{transform:scale(1)} }
        .sheet-up   { animation: sheetUp   .32s cubic-bezier(.16,1,.3,1) forwards; }
        .sheet-down { animation: sheetDown .26s cubic-bezier(.4,0,1,1) forwards; }
        .bd-in      { animation: bdIn  .22s ease forwards; }
        .bd-out     { animation: bdOut .26s ease forwards; }
        input:focus, textarea:focus { border-color: rgba(0,0,0,0.25) !important; background: #fff !important; }
      `}</style>

      {/* Backdrop */}
      <div
        className={closing ? 'bd-out' : 'bd-in'}
        onClick={close}
        style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }}
      />

      {/* Upload progress overlay */}
      {uploading && <UploadOverlay progress={progress} status={status} error={error} canResume={canResume} onRetry={() => doUpload(true)} onCancel={cancel} />}

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
                <span style={{ color: 'rgba(0,0,0,0.2)', fontSize: 12 }}>·</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 12, fontWeight: 500, color: speedColor }}>
                  <SpeedIcon size={11} />{speed === 'offline' ? 'Offline' : speed === 'slow' ? 'Slow' : 'Online'}
                </span>
              </div>
            </div>
            <button onClick={close} disabled={uploading && !error} style={{ width: 30, height: 30, borderRadius: '50%', background: 'rgba(0,0,0,0.05)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', opacity: (uploading && !error) ? 0.3 : 1 }}>
              <X size={14} color="rgba(0,0,0,0.45)" />
            </button>
          </div>

          {/* Scrollable body */}
          <div style={{ overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 14, flex: 1 }}>

            {/* Resume banner */}
            {canResume && !uploading && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 12 }}>
                <RefreshCw size={13} color="#10b981" />
                <p style={{ fontSize: 12, color: '#10b981', fontWeight: 500 }}>Previous upload interrupted — tap Upload to resume</p>
              </div>
            )}

            {/* Image + form row */}
            <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>

              {/* Square image picker */}
              <div
                onClick={() => !preview && !uploading && fileRef.current?.click()}
                onDragOver={e => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={e => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f) selectFile(f); }}
                style={{
                  width: 100, height: 100, flexShrink: 0,
                  borderRadius: 16, overflow: 'hidden',
                  border: dragging ? '2px solid #6366f1' : preview ? '1px solid rgba(0,0,0,0.08)' : '2px dashed rgba(0,0,0,0.15)',
                  background: dragging ? 'rgba(99,102,241,0.04)' : 'rgba(0,0,0,0.02)',
                  cursor: preview ? 'default' : 'pointer',
                  position: 'relative', flexShrink: 0,
                  transition: 'border-color .15s',
                }}
              >
                {preview ? (
                  <>
                    <img src={preview} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    {imgDims && (
                      <div style={{ position: 'absolute', bottom: 4, left: 4, right: 4, textAlign: 'center', fontSize: 9, color: '#fff', fontWeight: 600, background: 'rgba(0,0,0,0.5)', borderRadius: 4, padding: '2px 0', backdropFilter: 'blur(4px)' }}>
                        {imgDims.w}×{imgDims.h}
                      </div>
                    )}
                    {!uploading && (
                      <button
                        onClick={e => { e.stopPropagation(); setPreview(''); setFile(null); setImgDims(null); }}
                        style={{ position: 'absolute', top: 4, right: 4, width: 20, height: 20, borderRadius: '50%', background: 'rgba(0,0,0,0.5)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
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

              {/* Title + file info */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>
                <input
                  type="text"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="Wallpaper title *"
                  disabled={uploading}
                  maxLength={100}
                  style={inputStyle}
                />
                {file && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 12px', background: 'rgba(0,0,0,0.03)', borderRadius: 10, border: '1px solid rgba(0,0,0,0.06)' }}>
                    <Check size={12} color="#10b981" />
                    <span style={{ fontSize: 12, color: 'rgba(0,0,0,0.5)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{file.name}</span>
                    <span style={{ fontSize: 11, color: 'rgba(0,0,0,0.35)', flexShrink: 0 }}>{(file.size / 1024 / 1024).toFixed(1)}MB</span>
                  </div>
                )}
                {preview && (
                  <button
                    onClick={() => fileRef.current?.click()}
                    style={{ padding: '7px 12px', borderRadius: 10, border: '1px solid rgba(0,0,0,0.1)', background: 'transparent', fontSize: 12, fontWeight: 500, color: 'rgba(0,0,0,0.5)', cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 5 }}
                  >
                    <Upload size={11} /> Change image
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

            {/* Guidelines — collapsed minimal */}
            <p style={{ fontSize: 11, color: 'rgba(0,0,0,0.3)', lineHeight: 1.6, padding: '0 2px' }}>
              PNG · JPG · WEBP · max 10 MB · Must own rights to the image.
            </p>
          </div>

          {/* Footer actions */}
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
