import { useState, useRef, useCallback, useEffect } from 'react';
import { X, Upload, Image as ImageIcon, Check, AlertCircle, User, Wifi, WifiOff, Terminal } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/app/components/AuthProvider';
import { useUpload } from '@/app/hooks/useUpload';

const Toast = ({ message, type, onClose }: any) => (
  <div style={{position:'fixed',top:16,right:16,zIndex:60,animation:'slideIn 0.3s'}}>
    <div className={`flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg backdrop-blur-sm ${type==='success'?'bg-emerald-500/90':'bg-red-500/90'}`}>
      {type==='success'?<Check className="w-5 h-5 text-white"/>:<AlertCircle className="w-5 h-5 text-white"/>}
      <p className="text-sm font-medium text-white">{message}</p>
      <button onClick={onClose} className="ml-2 hover:bg-white/20 rounded-lg p-1"><X className="w-4 h-4 text-white"/></button>
    </div>
  </div>
);

const Progress = ({ progress, status, error, onRetry, onCancel, logs }: any) => (
  <div style={{position:'fixed',inset:0,zIndex:60,animation:'fadeIn 0.2s'}} className="bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
    <div className="bg-zinc-900 rounded-2xl p-6 max-w-2xl w-full mx-4 border border-white/10 max-h-[90vh] flex flex-col">
      {error ? (
        <div className="text-center flex-shrink-0">
          <div className="w-16 h-16 mx-auto mb-4 bg-red-500/10 rounded-full flex items-center justify-center"><AlertCircle className="w-8 h-8 text-red-500"/></div>
          <h3 className="text-lg font-semibold text-white mb-2">Upload Failed</h3>
          <p className="text-sm text-white/60 mb-6 whitespace-pre-wrap max-h-40 overflow-y-auto text-left">{error}</p>
          <div className="flex gap-3 mb-4">
            <button onClick={onCancel} className="flex-1 px-4 py-2.5 rounded-lg text-sm font-medium text-white/70 hover:bg-white/5 border border-white/10">Cancel</button>
            <button onClick={onRetry} className="flex-1 px-4 py-2.5 rounded-lg text-sm font-medium bg-white text-black hover:bg-white/90">Retry</button>
          </div>
        </div>
      ) : (
        <div className="text-center flex-shrink-0 mb-4">
          <div className="w-16 h-16 mx-auto mb-4 relative">
            <svg className="w-16 h-16" style={{transform:'rotate(-90deg)'}}>
              <circle cx="32" cy="32" r="28" stroke="currentColor" strokeWidth="4" fill="none" className="text-white/10"/>
              <circle cx="32" cy="32" r="28" stroke="currentColor" strokeWidth="4" fill="none" className="text-blue-500" strokeLinecap="round" strokeDasharray={175.93} strokeDashoffset={175.93*(1-progress/100)} style={{transition:'stroke-dashoffset 0.3s ease'}}/>
            </svg>
            <div style={{position:'absolute',inset:0}} className="flex items-center justify-center"><span className="text-lg font-bold text-white">{Math.round(progress)}%</span></div>
          </div>
          <h3 className="text-lg font-semibold text-white mb-2">Uploading...</h3>
          <p className="text-sm text-white/60">{status}</p>
        </div>
      )}

      <div className="flex-1 overflow-hidden flex flex-col min-h-0">
        <div className="flex items-center gap-2 mb-2 flex-shrink-0">
          <Terminal className="w-4 h-4 text-emerald-500"/>
          <h4 className="text-sm font-semibold text-white">Console Logs</h4>
        </div>
        <div className="bg-black/50 rounded-lg p-3 font-mono text-xs overflow-y-auto flex-1 border border-white/10">
          {logs.length === 0 ? (
            <p className="text-white/40">Waiting for upload...</p>
          ) : (
            logs.map((log: any, i: number) => (
              <div key={i} className={`mb-1 ${
                log.type === 'error' ? 'text-red-400' : 
                log.type === 'success' ? 'text-emerald-400' : 
                log.type === 'warning' ? 'text-yellow-400' : 
                log.type === 'info' ? 'text-blue-400' : 
                'text-white/70'
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

export const UploadModal = ({ isOpen, onClose, onSuccess }: any) => {
  const { session } = useAuth();
  const [user, setUser] = useState<any>(null);
  const [closing, setClosing] = useState(false);
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState('');
  const [dragging, setDragging] = useState(false);
  const [toast, setToast] = useState<any>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const supabase = createClient();

  const { uploading, progress, status, error, logs, online, speed, uploadFile, reset, cancel } = useUpload(user?.id);

  useEffect(() => {
    if (isOpen) checkUser();
  }, [isOpen]);

  const checkUser = async () => {
    const { data: { session: s } } = await supabase.auth.getSession();
    setUser(session?.user || s?.user || null);
  };

  const show = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 5000);
  };

  const resetAll = () => {
    setTitle('');
    setDesc('');
    setFile(null);
    setPreview('');
    reset();
  };

  const close = () => {
    if (uploading && !error) return;
    setClosing(true);
    setTimeout(() => {
      onClose();
      setClosing(false);
      resetAll();
    }, 300);
  };

  const selectFile = useCallback((f: File) => {
    if (!f?.type.startsWith('image/')) return show('Invalid image file', 'error');
    if (f.size > 10 * 1024 * 1024) return show('File too large (max 10MB)', 'error');
    setFile(f);
    setPreview(URL.createObjectURL(f));
  }, []);

  const handleUpload = async () => {
    if (!file || !title) return show('Fill required fields', 'error');

    const result = await uploadFile(file, title, desc);

    if (result.success) {
      show('Upload successful!', 'success');
      setTimeout(() => {
        close();
        onSuccess?.();
      }, 1000);
    } else if (result.error) {
      show(result.error, 'error');
    }
  };

  const handleRetry = () => {
    cancel();
    handleUpload();
  };

  if (!isOpen) return null;

  const inp = "w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-white/30 focus:bg-white/[0.07] disabled:opacity-50";

  return (<>
    {uploading && <Progress progress={progress} status={status} error={error} logs={logs} onRetry={handleRetry} onCancel={cancel} />}
    {toast && <Toast {...toast} onClose={() => setToast(null)} />}

    <div style={{position:'fixed',inset:0,zIndex:50,animation:closing?'fadeOut 0.2s':'fadeIn 0.2s'}} className="bg-black/60 backdrop-blur-sm" onClick={close}>
      <div style={{position:'absolute',bottom:0,left:0,right:0,animation:closing?'slideDown 0.3s':'slideUp 0.3s cubic-bezier(0.34,1.56,0.64,1)'}} 
           className="md:inset-4 md:m-auto md:max-w-2xl md:max-h-[90vh] bg-zinc-950 md:rounded-2xl border-t md:border border-white/10 shadow-2xl flex flex-col" onClick={e => e.stopPropagation()}>

        <div className="flex items-center justify-between px-4 md:px-6 py-4 border-b border-white/10">
          <div>
            <h2 className="text-base md:text-lg font-semibold">Upload Wallpaper</h2>
            <div className="flex items-center gap-3 mt-1">
              {user ? <><User className="w-3 h-3 text-emerald-500"/><p className="text-xs text-emerald-500">{user.email}</p></> 
                    : <><AlertCircle className="w-3 h-3 text-red-500"/><p className="text-xs text-red-500">Not logged in</p></>}
              <div className="flex items-center gap-1.5 ml-auto">
                {speed === 'offline' ? <><WifiOff className="w-3 h-3 text-red-500"/><p className="text-xs text-red-500">Offline</p></>
                : speed === 'slow' ? <><Wifi className="w-3 h-3 text-yellow-500"/><p className="text-xs text-yellow-500">Slow</p></>
                : <><Wifi className="w-3 h-3 text-emerald-500"/><p className="text-xs text-emerald-500">Online</p></>}
              </div>
            </div>
          </div>
          <button onClick={close} disabled={uploading && !error} className="p-2 hover:bg-white/5 rounded-lg disabled:opacity-50"><X className="w-5 h-5"/></button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 md:p-6">
          <div className="space-y-4">
            <div onClick={() => !preview && !uploading && fileRef.current?.click()}
                 onDragOver={e => { e.preventDefault(); setDragging(true); }} 
                 onDragLeave={e => { e.preventDefault(); setDragging(false); }}
                 onDrop={e => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f) selectFile(f); }}
                 className={`relative border-2 border-dashed rounded-xl overflow-hidden ${dragging ? 'border-blue-500 bg-blue-500/5' : preview ? 'border-white/20' : 'border-white/10 hover:border-white/20 cursor-pointer'}`}>
              {preview ? (
                <div className="relative aspect-video md:aspect-[16/10]">
                  <img src={preview} alt="Preview" className="w-full h-full object-cover"/>
                  <div style={{position:'absolute',inset:0}} className="bg-gradient-to-t from-black/60 via-transparent"/>
                  {!uploading && (<>
                    <button onClick={e => { e.stopPropagation(); setPreview(''); setFile(null); }} style={{position:'absolute',top:8,right:8}} className="p-1.5 rounded-lg bg-black/60 hover:bg-black/80 backdrop-blur-sm"><X className="w-4 h-4"/></button>
                    <button onClick={e => { e.stopPropagation(); fileRef.current?.click(); }} style={{position:'absolute',bottom:8,right:8}} className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 backdrop-blur-sm text-xs font-medium flex items-center gap-1.5"><Upload className="w-3 h-3"/>Change</button>
                  </>)}
                  {file && <div style={{position:'absolute',bottom:8,left:8}} className="px-2 py-1 rounded-lg bg-black/60 backdrop-blur-sm text-xs text-white/60">{(file.size / 1024 / 1024).toFixed(2)} MB</div>}
                </div>
              ) : (
                <div className="aspect-video md:aspect-[16/10] flex items-center justify-center p-4">
                  <div className="text-center">
                    <div className="w-12 h-12 md:w-14 md:h-14 mx-auto mb-3 bg-white/5 rounded-full flex items-center justify-center"><ImageIcon className="w-6 h-6 md:w-7 md:h-7 text-white/40"/></div>
                    <p className="text-sm font-medium mb-1">Click or drag to upload</p>
                    <p className="text-xs text-white/40">PNG, JPG, WEBP up to 10MB</p>
                  </div>
                </div>
              )}
            </div>

            <input ref={fileRef} type="file" accept="image/*" style={{display:'none'}} onChange={e => { const f = e.target.files?.[0]; if (f) selectFile(f); }}/>

            <div>
              <label className="block text-xs md:text-sm font-medium text-white/70 mb-1.5">Title *</label>
              <input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g., Minimal Dark Abstract" disabled={uploading} className={inp} maxLength={100}/>
              <p className="text-xs text-white/30 mt-1">{title.length}/100</p>
            </div>

            <div>
              <label className="block text-xs md:text-sm font-medium text-white/70 mb-1.5">Description <span className="text-white/40 text-xs font-normal">(optional)</span></label>
              <textarea value={desc} onChange={e => setDesc(e.target.value)} placeholder="Add details..." rows={3} disabled={uploading} className={inp + " resize-none"} maxLength={300}/>
              <p className="text-xs text-white/30 mt-1">{desc.length}/300</p>
            </div>

            <div className="p-3 bg-white/5 border border-white/10 rounded-lg">
              <p className="text-xs font-medium mb-1.5">Guidelines</p>
              <ul className="space-y-1 text-xs text-white/50">
                <li className="flex gap-2"><span className="text-white/30">•</span><span>High-quality images recommended</span></li>
                <li className="flex gap-2"><span className="text-white/30">•</span><span>Ensure you have rights to share</span></li>
                <li className="flex gap-2"><span className="text-white/30">•</span><span>Max: 10MB, Timeout: 2min</span></li>
              </ul>
            </div>
          </div>
        </div>

        <div className="flex gap-2 px-4 md:px-6 py-3 md:py-4 border-t border-white/10">
          <button onClick={close} disabled={uploading && !error} className="flex-1 md:flex-none md:px-6 py-2.5 rounded-lg text-sm font-medium text-white/70 hover:bg-white/5 disabled:opacity-50">Cancel</button>
          <button onClick={handleUpload} disabled={!file || !title || uploading || !user || !online} className="flex-1 md:flex-none md:px-6 py-2.5 rounded-lg text-sm font-medium bg-white text-black hover:bg-white/90 disabled:opacity-40 flex items-center justify-center gap-2">
            <Upload className="w-4 h-4"/><span>Upload</span>
          </button>
        </div>
      </div>
    </div>

    <style>{`@keyframes fadeIn{from{opacity:0}to{opacity:1}}@keyframes fadeOut{from{opacity:1}to{opacity:0}}@keyframes slideUp{from{transform:translateY(100%)}to{transform:translateY(0)}}@keyframes slideDown{from{transform:translateY(0)}to{transform:translateY(100%)}}@keyframes slideIn{from{transform:translateX(100%);opacity:0}to{transform:translateX(0);opacity:1}}`}</style>
  </>);
};