'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { X, Upload, Image as ImageIcon, Check, AlertCircle, User, Wifi, WifiOff, Terminal, ChevronLeft } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/app/components/AuthProvider';
import { useUpload } from '@/app/hooks/useUpload';

// ─── Toast ────────────────────────────────────────────────────────────────────
const Toast = ({ message, type, onClose }: { message: string; type: 'success' | 'error'; onClose: () => void }) => (
  <div style={{ position: 'fixed', top: 16, right: 16, zIndex: 60, animation: 'slideIn 0.3s' }}>
    <div className={`flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg backdrop-blur-sm ${type === 'success' ? 'bg-emerald-500/90' : 'bg-red-500/90'}`}>
      {type === 'success'
        ? <Check className="w-5 h-5 text-white" />
        : <AlertCircle className="w-5 h-5 text-white" />}
      <p className="text-sm font-medium text-white">{message}</p>
      <button onClick={onClose} className="ml-2 hover:bg-white/20 rounded-lg p-1">
        <X className="w-4 h-4 text-white" />
      </button>
    </div>
  </div>
);

// ─── Upload progress overlay ──────────────────────────────────────────────────
const Progress = ({ progress, status, error, onRetry, onCancel, logs, canResume }: any) => (
  <div
    style={{ position: 'fixed', inset: 0, zIndex: 60, animation: 'fadeIn 0.2s' }}
    className="bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
  >
    <div className="bg-zinc-900 rounded-2xl p-6 max-w-2xl w-full mx-4 border border-white/10 max-h-[90vh] flex flex-col">
      {error ? (
        <div className="text-center flex-shrink-0">
          <div className="w-16 h-16 mx-auto mb-4 bg-red-500/10 rounded-full flex items-center justify-center">
            <AlertCircle className="w-8 h-8 text-red-500" />
          </div>
          <h3 className="text-lg font-semibold text-white mb-2">Upload Failed</h3>
          <p className="text-sm text-white/60 mb-2 whitespace-pre-wrap max-h-40 overflow-y-auto text-left">{error}</p>
          {canResume && <p className="text-xs text-emerald-400 mb-4">✅ Progress saved — you can resume from where it stopped</p>}
          <div className="flex gap-3 mb-4">
            <button onClick={onCancel} className="flex-1 px-4 py-2.5 rounded-lg text-sm font-medium text-white/70 hover:bg-white/5 border border-white/10">Cancel</button>
            <button onClick={onRetry} className="flex-1 px-4 py-2.5 rounded-lg text-sm font-medium bg-white text-black hover:bg-white/90">
              {canResume ? 'Resume' : 'Retry'}
            </button>
          </div>
        </div>
      ) : (
        <div className="text-center flex-shrink-0 mb-4">
          <div className="w-16 h-16 mx-auto mb-4 relative">
            <svg className="w-16 h-16" style={{ transform: 'rotate(-90deg)' }}>
              <circle cx="32" cy="32" r="28" stroke="currentColor" strokeWidth="4" fill="none" className="text-white/10" />
              <circle cx="32" cy="32" r="28" stroke="currentColor" strokeWidth="4" fill="none" className="text-blue-500"
                strokeLinecap="round"
                strokeDasharray={175.93}
                strokeDashoffset={175.93 * (1 - progress / 100)}
                style={{ transition: 'stroke-dashoffset 0.1s linear' }}
              />
            </svg>
            <div style={{ position: 'absolute', inset: 0 }} className="flex items-center justify-center">
              <span className="text-lg font-bold text-white">{Math.round(progress)}%</span>
            </div>
          </div>
          <h3 className="text-lg font-semibold text-white mb-2">Uploading...</h3>
          <p className="text-sm text-white/60">{status}</p>
        </div>
      )}

      {/* Console logs */}
      <div className="flex-1 overflow-hidden flex flex-col min-h-0">
        <div className="flex items-center gap-2 mb-2 flex-shrink-0">
          <Terminal className="w-4 h-4 text-emerald-500" />
          <h4 className="text-sm font-semibold text-white">Console Logs</h4>
        </div>
        <div className="bg-black/50 rounded-lg p-3 font-mono text-xs overflow-y-auto flex-1 border border-white/10">
          {logs.length === 0 ? (
            <p className="text-white/40">Waiting for upload...</p>
          ) : (
            logs.map((log: any, i: number) => (
              <div key={i} className={`mb-1 ${
                log.type === 'error'   ? 'text-red-400'     :
                log.type === 'success' ? 'text-emerald-400' :
                log.type === 'warning' ? 'text-yellow-400'  :
                log.type === 'info'    ? 'text-blue-400'    : 'text-white/70'
              }`}>
                <span className="text-white/40">[{log.time}]</span> {log.icon} {log.message}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  </div>
);

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
  const [dragging, setDragging] = useState(false);
  const [toast, setToast]     = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const { uploading, progress, status, error, logs, online, speed, canResume, uploadFile, reset, cancel, getCachedData } = useUpload(user?.id);

  useEffect(() => {
    (async () => {
      const { data: { session: s } } = await supabase.auth.getSession();
      setUser(session?.user || s?.user || null);
      const cached = getCachedData();
      if (cached) {
        setTitle(cached.title || '');
        setDesc(cached.description || '');
      }
    })();
  }, []);

  const show = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 5000);
  };

  const resetAll = () => {
    setTitle(''); setDesc(''); setFile(null); setPreview('');
    reset();
  };

  const selectFile = useCallback((f: File) => {
    if (!f?.type.startsWith('image/')) return show('Invalid image file', 'error');
    if (f.size > 10 * 1024 * 1024)    return show('File too large (max 10MB)', 'error');
    setFile(f);
    setPreview(URL.createObjectURL(f));
  }, []);

  const handleUpload = async () => {
    if (!file || !title) return show('Fill required fields', 'error');
    const result = await uploadFile(file, title, desc, false);
    if (result.success) {
      show('Upload successful!', 'success');
      setTimeout(() => { resetAll(); router.back(); }, 1000);
    } else if (result.error) {
      show(result.error, 'error');
    }
  };

  const handleRetry = async () => {
    if (!file || !title) {
      const cached = getCachedData();
      if (!cached) return show('Fill required fields', 'error');
    }
    const result = await uploadFile(file!, title, desc, true);
    if (result.success) {
      show('Upload successful!', 'success');
      setTimeout(() => { resetAll(); router.back(); }, 1000);
    } else if (result.error) {
      show(result.error, 'error');
    }
  };

  const inp = "w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-white/30 focus:bg-white/[0.07] disabled:opacity-50";

  return (
    <div className="min-h-screen bg-zinc-950 text-white flex flex-col">
      <style>{`
        @keyframes fadeIn  { from{opacity:0}                      to{opacity:1}          }
        @keyframes slideIn { from{transform:translateX(100%);opacity:0} to{transform:translateX(0);opacity:1} }
      `}</style>

      {uploading && (
        <Progress
          progress={progress} status={status} error={error}
          logs={logs} canResume={canResume}
          onRetry={handleRetry} onCancel={cancel}
        />
      )}
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}

      {/* Header */}
      <div className="sticky top-0 z-10 bg-zinc-950/95 backdrop-blur-xl border-b border-white/10 px-4 py-3 flex items-center gap-3">
        <button
          onClick={() => { if (!uploading || error) router.back(); }}
          disabled={uploading && !error}
          className="p-1.5 hover:bg-white/10 rounded-full transition-colors disabled:opacity-40"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <h2 className="text-base font-semibold">Upload Wallpaper</h2>
          <div className="flex items-center gap-3 mt-0.5">
            {user
              ? <><User className="w-3 h-3 text-emerald-500" /><p className="text-xs text-emerald-500">{user.email}</p></>
              : <><AlertCircle className="w-3 h-3 text-red-500" /><p className="text-xs text-red-500">Not logged in</p></>}
            <div className="flex items-center gap-1 ml-auto">
              {speed === 'offline' ? <><WifiOff className="w-3 h-3 text-red-500"    /><p className="text-xs text-red-500">Offline</p></>
              : speed === 'slow'   ? <><Wifi    className="w-3 h-3 text-yellow-500" /><p className="text-xs text-yellow-500">Slow</p></>
              :                      <><Wifi    className="w-3 h-3 text-emerald-500"/><p className="text-xs text-emerald-500">Online</p></>}
            </div>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-4 max-w-2xl mx-auto w-full">
        <div className="space-y-4">

          {canResume && !uploading && (
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
              <p className="text-xs font-medium text-emerald-400 mb-1">🔄 Resume Available</p>
              <p className="text-xs text-white/60">Your previous upload was interrupted. Click Upload to resume from where it stopped.</p>
            </div>
          )}

          {/* Drop zone */}
          <div
            onClick={() => !preview && !uploading && fileRef.current?.click()}
            onDragOver={e  => { e.preventDefault(); setDragging(true);  }}
            onDragLeave={e => { e.preventDefault(); setDragging(false); }}
            onDrop={e => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f) selectFile(f); }}
            className={`relative border-2 border-dashed rounded-xl overflow-hidden transition-colors ${
              dragging  ? 'border-blue-500 bg-blue-500/5' :
              preview   ? 'border-white/20'               :
                          'border-white/10 hover:border-white/20 cursor-pointer'
            }`}
          >
            {preview ? (
              <div className="relative aspect-video">
                <img src={preview} alt="Preview" className="w-full h-full object-cover" />
                <div style={{ position: 'absolute', inset: 0 }} className="bg-gradient-to-t from-black/60 via-transparent" />
                {!uploading && (
                  <>
                    <button
                      onClick={e => { e.stopPropagation(); setPreview(''); setFile(null); }}
                      style={{ position: 'absolute', top: 8, right: 8 }}
                      className="p-1.5 rounded-lg bg-black/60 hover:bg-black/80 backdrop-blur-sm"
                    >
                      <X className="w-4 h-4" />
                    </button>
                    <button
                      onClick={e => { e.stopPropagation(); fileRef.current?.click(); }}
                      style={{ position: 'absolute', bottom: 8, right: 8 }}
                      className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 backdrop-blur-sm text-xs font-medium flex items-center gap-1.5"
                    >
                      <Upload className="w-3 h-3" />Change
                    </button>
                  </>
                )}
                {file && (
                  <div style={{ position: 'absolute', bottom: 8, left: 8 }} className="px-2 py-1 rounded-lg bg-black/60 backdrop-blur-sm text-xs text-white/60">
                    {(file.size / 1024 / 1024).toFixed(2)} MB
                  </div>
                )}
              </div>
            ) : (
              <div className="aspect-video flex items-center justify-center p-4">
                <div className="text-center">
                  <div className="w-14 h-14 mx-auto mb-3 bg-white/5 rounded-full flex items-center justify-center">
                    <ImageIcon className="w-7 h-7 text-white/40" />
                  </div>
                  <p className="text-sm font-medium mb-1">Click or drag to upload</p>
                  <p className="text-xs text-white/40">PNG, JPG, WEBP up to 10MB</p>
                </div>
              </div>
            )}
          </div>

          <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => { const f = e.target.files?.[0]; if (f) selectFile(f); }} />

          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-white/70 mb-1.5">Title *</label>
            <input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g., Minimal Dark Abstract" disabled={uploading} className={inp} maxLength={100} />
            <p className="text-xs text-white/30 mt-1">{title.length}/100</p>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-white/70 mb-1.5">
              Description <span className="text-white/40 text-xs font-normal">(optional)</span>
            </label>
            <textarea value={desc} onChange={e => setDesc(e.target.value)} placeholder="Add details..." rows={3} disabled={uploading} className={`${inp} resize-none`} maxLength={300} />
            <p className="text-xs text-white/30 mt-1">{desc.length}/300</p>
          </div>

          {/* Guidelines */}
          <div className="p-3 bg-white/5 border border-white/10 rounded-lg">
            <p className="text-xs font-medium mb-1.5">Guidelines</p>
            <ul className="space-y-1 text-xs text-white/50">
              {[
                'High-quality images recommended',
                'Ensure you have rights to share',
                'Max: 10MB, Timeout: 2min',
                'Images compressed to ~200KB, thumbnails ~1KB',
              ].map((g, i) => (
                <li key={i} className="flex gap-2"><span className="text-white/30">•</span><span>{g}</span></li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Footer actions */}
      <div className="sticky bottom-0 bg-zinc-950/95 backdrop-blur-xl border-t border-white/10 px-4 py-3 flex gap-3 max-w-2xl mx-auto w-full">
        <button
          onClick={() => { if (!uploading || error) { resetAll(); router.back(); } }}
          disabled={uploading && !error}
          className="flex-1 py-2.5 rounded-lg text-sm font-medium text-white/70 hover:bg-white/5 disabled:opacity-50 border border-white/10 transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={handleUpload}
          disabled={!file || !title || uploading || !user || !online}
          className="flex-1 py-2.5 rounded-lg text-sm font-medium bg-white text-black hover:bg-white/90 disabled:opacity-40 flex items-center justify-center gap-2 transition-colors"
        >
          <Upload className="w-4 h-4" />
          <span>{canResume ? 'Resume' : 'Upload'}</span>
        </button>
      </div>
    </div>
  );
}
