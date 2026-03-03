'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { X, Upload, Image as ImageIcon, Check, AlertCircle, Wifi, WifiOff, ChevronLeft, RefreshCw } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/app/components/AuthProvider';
import { useUpload } from '@/app/hooks/useUpload';

// ─── Snake Ring ───────────────────────────────────────────────────────────────
const SnakeRing = ({ progress, error, isComplete }: { progress: number; error: boolean; isComplete: boolean }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>();
  const tRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
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
        ctx.strokeStyle = '#10b981'; ctx.lineWidth = W; ctx.lineCap = 'round'; ctx.stroke();
        return;
      }
      if (error) {
        ctx.beginPath(); ctx.arc(cx, cy, R, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (progress / 100));
        ctx.strokeStyle = 'rgba(239,68,68,0.4)'; ctx.lineWidth = W; ctx.lineCap = 'round'; ctx.stroke();
        return;
      }

      const start = -Math.PI / 2;
      const end = start + Math.PI * 2 * (progress / 100);
      const arc = end - start;

      for (let i = 0; i < 120; i++) {
        const phase = i / 120;
        const a0 = start + arc * (i / 120);
        const a1 = start + arc * ((i + 1) / 120);
        const wave = Math.sin(phase * Math.PI * 5 - tRef.current * 6) * 4 * dpr
                   + Math.sin(phase * Math.PI * 3 - tRef.current * 4) * 2 * dpr;
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

// ─── Toast ────────────────────────────────────────────────────────────────────
const Toast = ({ message, type, onClose }: { message: string; type: 'success' | 'error'; onClose: () => void }) => (
  <div className="fixed inset-0 z-[70] flex items-center justify-center pointer-events-none">
    <div className={`pointer-events-auto w-full max-w-sm mx-4 flex items-center gap-3 px-5 py-4 rounded-2xl shadow-xl border bg-white animate-toast ${type === 'success' ? 'border-emerald-200' : 'border-red-200'}`}>
      <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${type === 'success' ? 'bg-emerald-500' : 'bg-red-500'}`}>
        {type === 'success' ? <Check className="w-4 h-4 text-white" strokeWidth={3} /> : <X className="w-4 h-4 text-white" strokeWidth={3} />}
      </div>
      <p className="flex-1 text-sm font-semibold text-zinc-800">{message}</p>
      <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-zinc-100 transition-colors"><X className="w-3.5 h-3.5 text-zinc-400" /></button>
    </div>
  </div>
);

// ─── Upload Overlay ───────────────────────────────────────────────────────────
const UploadOverlay = ({ progress, status, error, onRetry, onCancel, canResume }: {
  progress: number; status: string; error: string | null; onRetry: () => void; onCancel: () => void; canResume: boolean;
}) => {
  const isComplete = progress >= 100 && !error;
  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center" style={{ background: 'rgba(255,255,255,0.7)', backdropFilter: 'blur(20px)' }}>
      <div className="w-full max-w-sm mx-4 mb-8 animate-sheet">
        <div className="bg-white rounded-3xl p-6 border border-zinc-200 shadow-2xl shadow-zinc-200/60">
          <div className="flex flex-col items-center mb-6">
            <div className="relative mb-4" style={{ width: 120, height: 120 }}>
              <SnakeRing progress={progress} error={!!error} isComplete={isComplete} />
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                {isComplete
                  ? <div className="w-11 h-11 rounded-full bg-emerald-500 flex items-center justify-center animate-pop"><Check className="w-5 h-5 text-white" strokeWidth={3} /></div>
                  : error ? <AlertCircle className="w-9 h-9 text-red-400" />
                  : <><span className="text-xl font-bold text-zinc-800 tabular-nums leading-none">{Math.round(progress)}</span><span className="text-[11px] text-zinc-400 mt-0.5">%</span></>}
              </div>
            </div>
            <p className="font-semibold text-zinc-800 text-base">
              {error ? 'Upload Failed' : isComplete ? 'Upload Complete!' : 'Uploading…'}
            </p>
            {!error && !isComplete && <p className="text-sm text-zinc-400 mt-1 truncate max-w-[220px]">{status}</p>}
            {error && <p className="text-xs text-zinc-400 mt-1 max-w-[240px] text-center leading-relaxed">{error}</p>}
            {error && canResume && (
              <div className="mt-2.5 flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200">
                <RefreshCw className="w-3 h-3 text-emerald-600" />
                <span className="text-xs text-emerald-600 font-medium">Progress saved — can resume</span>
              </div>
            )}
          </div>

          {!error && !isComplete && (
            <div className="w-full h-[3px] bg-zinc-100 rounded-full mb-5 overflow-hidden">
              <div className="h-full rounded-full bg-indigo-500" style={{ width: `${progress}%`, transition: 'width 0.4s cubic-bezier(0.25,0.46,0.45,0.94)' }} />
            </div>
          )}

          {error && (
            <div className="flex gap-3">
              <button onClick={onCancel} className="flex-1 py-3 rounded-2xl text-sm font-semibold text-zinc-500 border border-zinc-200 hover:bg-zinc-50 active:scale-[0.98] transition-all">Cancel</button>
              <button onClick={onRetry} className="flex-1 py-3 rounded-2xl text-sm font-semibold bg-zinc-900 text-white hover:bg-zinc-800 active:scale-[0.98] transition-all flex items-center justify-center gap-2">
                <RefreshCw className="w-4 h-4" />{canResume ? 'Resume' : 'Retry'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function UploadPage() {
  const router = useRouter();
  const { session } = useAuth();
  const supabase = createClient();

  const [user,     setUser]    = useState<any>(null);
  const [title,    setTitle]   = useState('');
  const [desc,     setDesc]    = useState('');
  const [file,     setFile]    = useState<File | null>(null);
  const [preview,  setPreview] = useState('');
  const [imgDims,  setImgDims] = useState<{ w: number; h: number } | null>(null);
  const [dragging, setDragging] = useState(false);
  const [toast,    setToast]   = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const { uploading, progress, status, error, online, speed, canResume, uploadFile, reset, cancel, getCachedData } = useUpload(user?.id);

  useEffect(() => {
    (async () => {
      const { data: { session: s } } = await supabase.auth.getSession();
      setUser(session?.user || s?.user || null);
      const cached = getCachedData();
      if (cached) { setTitle(cached.title || ''); setDesc(cached.description || ''); }
    })();
  }, []);

  const show = (message: string, type: 'success' | 'error') => { setToast({ message, type }); setTimeout(() => setToast(null), 4000); };
  const resetAll = () => { setTitle(''); setDesc(''); setFile(null); setPreview(''); setImgDims(null); reset(); };

  const selectFile = useCallback((f: File) => {
    if (!f?.type.startsWith('image/')) return show('Invalid image file', 'error');
    if (f.size > 10 * 1024 * 1024) return show('File too large (max 10MB)', 'error');
    setFile(f); const url = URL.createObjectURL(f); setPreview(url);
    const img = new Image();
    img.onload = () => setImgDims({ w: img.naturalWidth, h: img.naturalHeight });
    img.src = url;
  }, []);

  const doUpload = async (resume: boolean) => {
    const result = await uploadFile(file!, title, desc, resume);
    if (result.success) { show('Upload successful!', 'success'); setTimeout(() => { resetAll(); router.back(); }, 1000); }
    else if (result.error) show(result.error, 'error');
  };

  const inp = "w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-2xl text-sm text-zinc-800 placeholder:text-zinc-400 focus:outline-none focus:border-zinc-400 focus:bg-white disabled:opacity-50 transition-all";
  const speedColor = speed === 'offline' ? 'text-red-500' : speed === 'slow' ? 'text-amber-500' : 'text-emerald-600';
  const speedLabel = speed === 'offline' ? 'Offline' : speed === 'slow' ? 'Slow connection' : 'Connected';
  const SpeedIcon = speed === 'offline' ? WifiOff : Wifi;

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900 flex flex-col">
      <style>{`
        @keyframes toast { from{opacity:0;transform:scale(0.95)} to{opacity:1;transform:scale(1)} }
        @keyframes sheet { from{opacity:0;transform:translateY(40px)} to{opacity:1;transform:translateY(0)} }
        @keyframes pop   { 0%{transform:scale(0)} 50%{transform:scale(1.2)} 100%{transform:scale(1)} }
        .animate-toast { animation: toast 0.25s cubic-bezier(0.34,1.56,0.64,1) forwards }
        .animate-sheet { animation: sheet 0.35s cubic-bezier(0.34,1.2,0.64,1) forwards }
        .animate-pop   { animation: pop   0.4s  cubic-bezier(0.34,1.56,0.64,1) forwards }
      `}</style>

      {uploading && <UploadOverlay progress={progress} status={status} error={error} canResume={canResume} onRetry={() => doUpload(true)} onCancel={cancel} />}
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}

      {/* Header */}
      <div className="sticky top-0 z-10 bg-white/90 backdrop-blur-xl border-b border-zinc-200 px-4 py-3 flex items-center gap-3">
        <button onClick={() => { if (!uploading || error) router.back(); }} disabled={uploading && !error}
          className="w-9 h-9 rounded-xl hover:bg-zinc-100 flex items-center justify-center disabled:opacity-40 transition-colors">
          <ChevronLeft className="w-5 h-5 text-zinc-700" />
        </button>
        <div className="flex-1 min-w-0">
          <h2 className="text-[15px] font-semibold text-zinc-900 tracking-tight">Upload Wallpaper</h2>
          <div className="flex items-center gap-2 mt-0.5">
            {user
              ? <p className="text-xs text-emerald-600 truncate font-medium">{user.email}</p>
              : <p className="text-xs text-red-500 font-medium">Not signed in</p>}
            <span className="text-zinc-300">·</span>
            <span className={`flex items-center gap-1 text-xs font-medium ${speedColor}`}>
              <SpeedIcon className="w-3 h-3" />{speedLabel}
            </span>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-4 pt-5 pb-4 max-w-lg mx-auto w-full space-y-4">

        {canResume && !uploading && (
          <div className="flex items-start gap-3 p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl">
            <RefreshCw className="w-4 h-4 text-emerald-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-xs font-semibold text-emerald-700">Resume available</p>
              <p className="text-xs text-emerald-600/70 mt-0.5">Previous upload interrupted. Tap Upload to resume.</p>
            </div>
          </div>
        )}

        {/* Drop zone */}
        <div
          onClick={() => !preview && !uploading && fileRef.current?.click()}
          onDragOver={e => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={e => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f) selectFile(f); }}
          className={`relative rounded-2xl overflow-hidden border-2 transition-all duration-200 ${
            dragging ? 'border-indigo-400 bg-indigo-50 scale-[1.01]'
            : preview ? 'border-zinc-200 bg-white'
            : 'border-dashed border-zinc-300 hover:border-zinc-400 cursor-pointer hover:bg-white'}`}
        >
          {preview ? (
            <div className="relative h-56 bg-zinc-100">
              <img src={preview} alt="Preview" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
              {imgDims && <div className="absolute top-3 left-3 px-2.5 py-1 rounded-lg bg-black/50 backdrop-blur-sm text-xs text-white font-medium">{imgDims.w} × {imgDims.h}</div>}
              {file && <div className="absolute top-3 right-12 px-2.5 py-1 rounded-lg bg-black/50 backdrop-blur-sm text-xs text-white/80">{(file.size / 1024 / 1024).toFixed(2)} MB</div>}
              {!uploading && <>
                <button onClick={e => { e.stopPropagation(); setPreview(''); setFile(null); setImgDims(null); }}
                  className="absolute top-3 right-3 w-7 h-7 rounded-lg bg-black/50 backdrop-blur-sm flex items-center justify-center hover:bg-black/70 transition-colors">
                  <X className="w-3.5 h-3.5 text-white" />
                </button>
                <button onClick={e => { e.stopPropagation(); fileRef.current?.click(); }}
                  className="absolute bottom-3 right-3 px-3 py-1.5 rounded-xl bg-white/90 hover:bg-white backdrop-blur-sm text-xs font-semibold text-zinc-800 flex items-center gap-1.5 transition-colors shadow-sm">
                  <Upload className="w-3 h-3" />Change
                </button>
              </>}
            </div>
          ) : (
            <div className="h-40 flex items-center justify-center">
              <div className="text-center">
                <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-zinc-100 border border-zinc-200 flex items-center justify-center">
                  <ImageIcon className="w-6 h-6 text-zinc-400" />
                </div>
                <p className="text-sm font-semibold text-zinc-600">Click or drag image here</p>
                <p className="text-xs text-zinc-400 mt-1">PNG · JPG · WEBP · max 10 MB</p>
              </div>
            </div>
          )}
        </div>

        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) selectFile(f); }} />

        {/* Title */}
        <div>
          <label className="block text-xs font-bold text-zinc-500 mb-2 uppercase tracking-widest">
            Title <span className="text-indigo-500">*</span>
          </label>
          <input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Minimal Dark Abstract" disabled={uploading} className={inp} maxLength={100} />
          <p className="text-xs text-zinc-400 mt-1.5 text-right">{title.length}/100</p>
        </div>

        {/* Description */}
        <div>
          <label className="block text-xs font-bold text-zinc-500 mb-2 uppercase tracking-widest">
            Description <span className="text-zinc-400 normal-case font-normal">optional</span>
          </label>
          <textarea value={desc} onChange={e => setDesc(e.target.value)} placeholder="Add a short description..." rows={3} disabled={uploading} className={`${inp} resize-none`} maxLength={300} />
          <p className="text-xs text-zinc-400 mt-1.5 text-right">{desc.length}/300</p>
        </div>

        {/* Guidelines */}
        <div className="p-4 bg-zinc-100 border border-zinc-200 rounded-2xl space-y-2">
          <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Guidelines</p>
          {['Use high-resolution images for best quality results.', 'Ensure you own the rights to any image you upload.', 'Max size 10 MB · Timeout 2 min · Compressed to ~200 KB.'].map(t => (
            <p key={t} className="text-xs text-zinc-500 leading-relaxed">{t}</p>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="sticky bottom-0 bg-white/90 backdrop-blur-xl border-t border-zinc-200 px-4 py-3 flex gap-3 max-w-lg mx-auto w-full">
        <button onClick={() => { if (!uploading || error) { resetAll(); router.back(); } }} disabled={uploading && !error}
          className="flex-1 py-3 rounded-2xl text-sm font-semibold text-zinc-500 border border-zinc-200 hover:bg-zinc-50 disabled:opacity-40 transition-all active:scale-[0.98]">
          Cancel
        </button>
        <button onClick={() => doUpload(false)} disabled={!file || !title || uploading || !user || !online}
          className="flex-1 py-3 rounded-2xl text-sm font-semibold bg-zinc-900 text-white hover:bg-zinc-800 disabled:opacity-30 flex items-center justify-center gap-2 transition-all active:scale-[0.98]">
          <Upload className="w-4 h-4" />{canResume ? 'Resume Upload' : 'Upload'}
        </button>
      </div>
    </div>
  );
}
