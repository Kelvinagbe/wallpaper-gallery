'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { X, Upload, Image as ImageIcon, Check, AlertCircle, User, Wifi, WifiOff, ChevronLeft, RefreshCw } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/app/components/AuthProvider';
import { useUpload } from '@/app/hooks/useUpload';

// ─── Toast ────────────────────────────────────────────────────────────────────
const Toast = ({ message, type, onClose }: { message: string; type: 'success' | 'error'; onClose: () => void }) => (
  <div className="fixed top-4 left-1/2 z-[70] -translate-x-1/2 animate-toast">
    <div className={`flex items-center gap-3 px-5 py-3 rounded-2xl shadow-2xl border ${
      type === 'success'
        ? 'bg-zinc-900 border-emerald-500/30 shadow-emerald-500/10'
        : 'bg-zinc-900 border-red-500/30 shadow-red-500/10'
    }`}>
      <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${type === 'success' ? 'bg-emerald-500' : 'bg-red-500'}`}>
        {type === 'success' ? <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} /> : <X className="w-3.5 h-3.5 text-white" strokeWidth={3} />}
      </div>
      <p className="text-sm font-medium text-white">{message}</p>
      <button onClick={onClose} className="ml-1 p-1 rounded-lg hover:bg-white/10 transition-colors">
        <X className="w-3.5 h-3.5 text-white/50" />
      </button>
    </div>
  </div>
);

// ─── Material 3 Expressive Upload Overlay ────────────────────────────────────
const UploadOverlay = ({
  progress, status, error, onRetry, onCancel, canResume,
}: {
  progress: number; status: string; error: string | null;
  onRetry: () => void; onCancel: () => void; canResume: boolean;
}) => {
  const circ = 2 * Math.PI * 44; // r=44, circumference≈276.5
  const offset = circ * (1 - progress / 100);
  const isComplete = progress >= 100 && !error;

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center" style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(16px)' }}>
      <div className="w-full max-w-sm mx-4 mb-8 animate-sheet">
        <div className="bg-zinc-900 rounded-3xl p-6 border border-white/10 shadow-2xl">

          {/* Progress ring */}
          <div className="flex flex-col items-center mb-6">
            <div className="relative w-28 h-28 mb-4">
              {/* Outer glow */}
              <div className={`absolute inset-0 rounded-full blur-xl opacity-30 transition-colors duration-700 ${
                error ? 'bg-red-500' : isComplete ? 'bg-emerald-500' : 'bg-blue-500'
              }`} />

              <svg className="w-28 h-28" viewBox="0 0 100 100">
                {/* Track */}
                <circle cx="50" cy="50" r="44" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="6" />

                {/* Animated wiggly progress ring — Material 3 Expressive style */}
                {!error && !isComplete && (
                  <circle
                    cx="50" cy="50" r="44" fill="none"
                    stroke="url(#progressGrad)"
                    strokeWidth="6"
                    strokeLinecap="round"
                    strokeDasharray={circ}
                    strokeDashoffset={offset}
                    transform="rotate(-90 50 50)"
                    style={{
                      transition: 'stroke-dashoffset 0.35s cubic-bezier(0.34,1.56,0.64,1)',
                      filter: 'url(#wobble)',
                    }}
                  />
                )}

                {/* Complete arc */}
                {isComplete && (
                  <circle
                    cx="50" cy="50" r="44" fill="none"
                    stroke="#10b981"
                    strokeWidth="6"
                    strokeLinecap="round"
                    strokeDasharray={circ}
                    strokeDashoffset={0}
                    transform="rotate(-90 50 50)"
                    style={{ transition: 'stroke-dashoffset 0.5s cubic-bezier(0.34,1.56,0.64,1)' }}
                  />
                )}

                {/* Error arc */}
                {error && (
                  <circle
                    cx="50" cy="50" r="44" fill="none"
                    stroke="#ef4444"
                    strokeWidth="6"
                    strokeLinecap="round"
                    strokeDasharray={circ}
                    strokeDashoffset={offset}
                    transform="rotate(-90 50 50)"
                    style={{ opacity: 0.5 }}
                  />
                )}

                {/* SVG filters for wiggly effect */}
                <defs>
                  <linearGradient id="progressGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#3b82f6" />
                    <stop offset="50%" stopColor="#8b5cf6" />
                    <stop offset="100%" stopColor="#06b6d4" />
                  </linearGradient>
                  <filter id="wobble" x="-20%" y="-20%" width="140%" height="140%">
                    <feTurbulence
                      type="fractalNoise"
                      baseFrequency="0.015 0.015"
                      numOctaves="2"
                      result="noise"
                    >
                      <animate attributeName="baseFrequency" values="0.015 0.015;0.02 0.018;0.015 0.015" dur="2s" repeatCount="indefinite" />
                    </feTurbulence>
                    <feDisplacementMap in="SourceGraphic" in2="noise" scale="3" xChannelSelector="R" yChannelSelector="G" />
                  </filter>
                </defs>
              </svg>

              {/* Center content */}
              <div className="absolute inset-0 flex items-center justify-center">
                {isComplete
                  ? <div className="w-10 h-10 rounded-full bg-emerald-500 flex items-center justify-center animate-pop">
                      <Check className="w-5 h-5 text-white" strokeWidth={3} />
                    </div>
                  : error
                  ? <AlertCircle className="w-8 h-8 text-red-400" />
                  : <span className="text-2xl font-bold text-white tabular-nums">{Math.round(progress)}<span className="text-sm font-normal text-white/50">%</span></span>
                }
              </div>
            </div>

            {/* Label */}
            {!error && (
              <div className="text-center">
                <p className="font-semibold text-white text-base">{isComplete ? 'Upload Complete!' : 'Uploading...'}</p>
                {!isComplete && <p className="text-sm text-white/50 mt-0.5 truncate max-w-[220px]">{status}</p>}
              </div>
            )}

            {error && (
              <div className="text-center">
                <p className="font-semibold text-white text-base mb-1">Upload Failed</p>
                <p className="text-xs text-white/50 max-w-[240px] leading-relaxed">{error}</p>
                {canResume && (
                  <div className="mt-2 flex items-center justify-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                    <RefreshCw className="w-3 h-3 text-emerald-400" />
                    <span className="text-xs text-emerald-400 font-medium">Progress saved — can resume</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Thin progress bar strip */}
          {!error && !isComplete && (
            <div className="w-full h-1 bg-white/10 rounded-full mb-5 overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{
                  width: `${progress}%`,
                  background: 'linear-gradient(90deg, #3b82f6, #8b5cf6, #06b6d4)',
                }}
              />
            </div>
          )}

          {/* Actions */}
          {error && (
            <div className="flex gap-3">
              <button onClick={onCancel} className="flex-1 py-3 rounded-2xl text-sm font-semibold text-white/60 border border-white/10 hover:bg-white/5 active:scale-[0.98] transition-all">
                Cancel
              </button>
              <button onClick={onRetry} className="flex-1 py-3 rounded-2xl text-sm font-semibold bg-white text-black hover:bg-white/90 active:scale-[0.98] transition-all flex items-center justify-center gap-2">
                <RefreshCw className="w-4 h-4" />
                {canResume ? 'Resume' : 'Retry'}
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
  const router  = useRouter();
  const { session } = useAuth();
  const supabase = createClient();

  const [user, setUser]       = useState<any>(null);
  const [title, setTitle]     = useState('');
  const [desc, setDesc]       = useState('');
  const [file, setFile]       = useState<File | null>(null);
  const [preview, setPreview] = useState('');
  const [imgDims, setImgDims] = useState<{ w: number; h: number } | null>(null);
  const [dragging, setDragging] = useState(false);
  const [toast, setToast]     = useState<{ message: string; type: 'success' | 'error' } | null>(null);
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

  const show = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const resetAll = () => { setTitle(''); setDesc(''); setFile(null); setPreview(''); setImgDims(null); reset(); };

  const selectFile = useCallback((f: File) => {
    if (!f?.type.startsWith('image/')) return show('Invalid image file', 'error');
    if (f.size > 10 * 1024 * 1024)    return show('File too large (max 10MB)', 'error');
    setFile(f);
    const url = URL.createObjectURL(f);
    setPreview(url);
    // Measure dimensions
    const img = new Image();
    img.onload = () => setImgDims({ w: img.naturalWidth, h: img.naturalHeight });
    img.src = url;
  }, []);

  const doUpload = async (resume: boolean) => {
    const result = await uploadFile(file!, title, desc, resume);
    if (result.success) {
      show('Upload successful!', 'success');
      setTimeout(() => { resetAll(); router.back(); }, 1000);
    } else if (result.error) {
      show(result.error, 'error');
    }
  };

  const handleUpload = async () => {
    if (!file || !title) return show('Fill required fields', 'error');
    await doUpload(false);
  };

  const handleRetry = async () => {
    if (!file && !getCachedData()) return show('Fill required fields', 'error');
    await doUpload(true);
  };

  const inp = "w-full px-4 py-3 bg-white/5 border border-white/10 rounded-2xl text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-white/20 focus:bg-white/[0.07] disabled:opacity-50 transition-all";

  return (
    <div className="min-h-screen bg-zinc-950 text-white flex flex-col">
      <style>{`
        @keyframes toast  { from{opacity:0;transform:translate(-50%,-10px)} to{opacity:1;transform:translate(-50%,0)} }
        @keyframes sheet  { from{opacity:0;transform:translateY(40px)}      to{opacity:1;transform:translateY(0)}     }
        @keyframes pop    { 0%{transform:scale(0)}50%{transform:scale(1.2)}100%{transform:scale(1)}                   }
        .animate-toast { animation: toast 0.3s cubic-bezier(0.34,1.56,0.64,1) forwards; }
        .animate-sheet { animation: sheet 0.35s cubic-bezier(0.34,1.2,0.64,1) forwards; }
        .animate-pop   { animation: pop   0.4s cubic-bezier(0.34,1.56,0.64,1) forwards; }
      `}</style>

      {uploading && (
        <UploadOverlay
          progress={progress} status={status} error={error}
          canResume={canResume} onRetry={handleRetry} onCancel={cancel}
        />
      )}
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}

      {/* ── Header ── */}
      <div className="sticky top-0 z-10 bg-zinc-950/95 backdrop-blur-xl border-b border-white/[0.07] px-4 py-3 flex items-center gap-3">
        <button
          onClick={() => { if (!uploading || error) router.back(); }}
          disabled={uploading && !error}
          className="w-9 h-9 rounded-xl hover:bg-white/10 flex items-center justify-center disabled:opacity-40 transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div className="flex-1 min-w-0">
          <h2 className="text-[15px] font-semibold">Upload Wallpaper</h2>
          <div className="flex items-center gap-2 mt-0.5">
            {user
              ? <p className="text-xs text-emerald-400 truncate">{user.email}</p>
              : <p className="text-xs text-red-400">Not signed in</p>
            }
            <span className="text-white/20">·</span>
            {speed === 'offline'
              ? <span className="flex items-center gap-1 text-xs text-red-400"><WifiOff className="w-3 h-3" />Offline</span>
              : speed === 'slow'
              ? <span className="flex items-center gap-1 text-xs text-yellow-400"><Wifi className="w-3 h-3" />Slow connection</span>
              : <span className="flex items-center gap-1 text-xs text-emerald-400"><Wifi className="w-3 h-3" />Online</span>
            }
          </div>
        </div>
      </div>

      {/* ── Body ── */}
      <div className="flex-1 overflow-y-auto px-4 pt-5 pb-4 max-w-lg mx-auto w-full space-y-4">

        {canResume && !uploading && (
          <div className="flex items-start gap-3 p-3.5 bg-emerald-500/8 border border-emerald-500/20 rounded-2xl">
            <RefreshCw className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-xs font-semibold text-emerald-400">Resume available</p>
              <p className="text-xs text-white/50 mt-0.5">Previous upload was interrupted. Tap Upload to resume.</p>
            </div>
          </div>
        )}

        {/* ── Drop zone ── */}
        <div
          onClick={() => !preview && !uploading && fileRef.current?.click()}
          onDragOver={e => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={e => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f) selectFile(f); }}
          className={`relative rounded-2xl overflow-hidden border transition-all ${
            dragging  ? 'border-blue-500/60 bg-blue-500/5 scale-[1.01]' :
            preview   ? 'border-white/10' :
                        'border-dashed border-white/15 hover:border-white/30 cursor-pointer hover:bg-white/[0.02]'
          }`}
        >
          {preview ? (
            /* Compact preview — fixed height, not aspect-video */
            <div className="relative h-48 bg-zinc-900">
              <img src={preview} alt="Preview" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />

              {/* Dims badge */}
              {imgDims && (
                <div className="absolute top-3 left-3 px-2.5 py-1 rounded-lg bg-black/60 backdrop-blur-sm text-xs text-white/80 font-medium">
                  {imgDims.w} × {imgDims.h}
                </div>
              )}

              {/* File size badge */}
              {file && (
                <div className="absolute top-3 right-12 px-2.5 py-1 rounded-lg bg-black/60 backdrop-blur-sm text-xs text-white/60">
                  {(file.size / 1024 / 1024).toFixed(2)} MB
                </div>
              )}

              {/* Remove */}
              {!uploading && (
                <button
                  onClick={e => { e.stopPropagation(); setPreview(''); setFile(null); setImgDims(null); }}
                  className="absolute top-3 right-3 w-7 h-7 rounded-lg bg-black/60 backdrop-blur-sm flex items-center justify-center hover:bg-black/80 transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}

              {/* Change button */}
              {!uploading && (
                <button
                  onClick={e => { e.stopPropagation(); fileRef.current?.click(); }}
                  className="absolute bottom-3 right-3 px-3 py-1.5 rounded-xl bg-white/15 hover:bg-white/25 backdrop-blur-sm text-xs font-medium flex items-center gap-1.5 transition-colors"
                >
                  <Upload className="w-3 h-3" />Change
                </button>
              )}
            </div>
          ) : (
            <div className="h-36 flex items-center justify-center">
              <div className="text-center">
                <div className="w-12 h-12 mx-auto mb-3 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
                  <ImageIcon className="w-5 h-5 text-white/30" />
                </div>
                <p className="text-sm font-medium text-white/70">Click or drag image here</p>
                <p className="text-xs text-white/30 mt-1">PNG · JPG · WEBP · max 10 MB</p>
              </div>
            </div>
          )}
        </div>

        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) selectFile(f); }} />

        {/* ── Title ── */}
        <div>
          <label className="block text-xs font-semibold text-white/50 mb-2 uppercase tracking-wider">Title <span className="text-blue-400">*</span></label>
          <input
            type="text" value={title} onChange={e => setTitle(e.target.value)}
            placeholder="e.g. Minimal Dark Abstract"
            disabled={uploading} className={inp} maxLength={100}
          />
          <p className="text-xs text-white/25 mt-1.5 text-right">{title.length}/100</p>
        </div>

        {/* ── Description ── */}
        <div>
          <label className="block text-xs font-semibold text-white/50 mb-2 uppercase tracking-wider">Description <span className="text-white/25 normal-case font-normal">optional</span></label>
          <textarea
            value={desc} onChange={e => setDesc(e.target.value)}
            placeholder="Add a short description..."
            rows={3} disabled={uploading}
            className={`${inp} resize-none`} maxLength={300}
          />
          <p className="text-xs text-white/25 mt-1.5 text-right">{desc.length}/300</p>
        </div>

        {/* ── Guidelines ── */}
        <div className="p-4 bg-white/[0.03] border border-white/[0.07] rounded-2xl">
          <p className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-3">Guidelines</p>
          <div className="space-y-2 text-xs text-white/40 leading-relaxed">
            <p>Use high-resolution images for best quality results.</p>
            <p>Ensure you own the rights to any image you upload.</p>
            <p>Max size 10 MB · Timeout 2 min · Compressed to ~200 KB.</p>
          </div>
        </div>

      </div>

    {/* ── Footer ── */}
      <div className="sticky bottom-0 bg-zinc-950/95 backdrop-blur-xl border-t border-white/[0.07] px-4 py-3 flex gap-3 max-w-lg mx-auto w-full">
        <button
          onClick={() => { if (!uploading || error) { resetAll(); router.back(); } }}
          disabled={uploading && !error}
          className="flex-1 py-3 rounded-2xl text-sm font-semibold text-white/60 border border-white/10 hover:bg-white/5 disabled:opacity-40 transition-all active:scale-[0.98]"
        >
          Cancel
        </button>
        <button
          onClick={handleUpload}
          disabled={!file || !title || uploading || !user || !online}
          className="flex-1 py-3 rounded-2xl text-sm font-semibold bg-white text-black hover:bg-white/90 disabled:opacity-30 flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
        >
          <Upload className="w-4 h-4" />
          {canResume ? 'Resume Upload' : 'Upload'}
        </button>
      </div>
    </div>
  );
}
