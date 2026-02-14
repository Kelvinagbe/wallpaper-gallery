import { useState, useRef, useCallback } from 'react';
import { X, Upload, Image as ImageIcon, Check, AlertCircle } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/app/components/AuthProvider';

type UploadModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
};

const Toast = ({ message, type, onClose }: { message: string; type: 'success' | 'error'; onClose: () => void }) => (
  <div style={{position:'fixed',top:16,right:16,zIndex:60,animation:'slideIn 0.3s ease-out'}}>
    <div className={`flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg backdrop-blur-sm ${type === 'success' ? 'bg-emerald-500/90' : 'bg-red-500/90'}`}>
      {type === 'success' ? <Check className="w-5 h-5 text-white" /> : <AlertCircle className="w-5 h-5 text-white" />}
      <p className="text-sm font-medium text-white">{message}</p>
      <button onClick={onClose} className="ml-2 hover:bg-white/20 rounded-lg p-1 transition-colors">
        <X className="w-4 h-4 text-white" />
      </button>
    </div>
  </div>
);

const UploadProgress = ({ progress, status, error, onRetry, onCancel }: { 
  progress: number; status: string; error: string | null; onRetry: () => void; onCancel: () => void;
}) => {
  const circumference = 2 * Math.PI * 28;
  return (
    <div style={{position:'fixed',inset:0,zIndex:60,animation:'fadeIn 0.2s ease-out'}} className="bg-black/80 backdrop-blur-sm flex items-center justify-center">
      <div className="bg-zinc-900 rounded-2xl p-8 max-w-md w-full mx-4 border border-white/10">
        {error ? (
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-red-500/10 rounded-full flex items-center justify-center">
              <AlertCircle className="w-8 h-8 text-red-500" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">Upload Failed</h3>
            <p className="text-sm text-white/60 mb-6 whitespace-pre-wrap">{error}</p>
            <div className="flex gap-3">
              <button onClick={onCancel} className="flex-1 px-4 py-2.5 rounded-lg text-sm font-medium text-white/70 hover:bg-white/5 transition-colors border border-white/10">Cancel</button>
              <button onClick={onRetry} className="flex-1 px-4 py-2.5 rounded-lg text-sm font-medium bg-white text-black hover:bg-white/90 transition-colors">Retry</button>
            </div>
          </div>
        ) : (
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 relative">
              <svg className="w-16 h-16" style={{transform:'rotate(-90deg)'}}>
                <circle cx="32" cy="32" r="28" stroke="currentColor" strokeWidth="4" fill="none" className="text-white/10" />
                <circle cx="32" cy="32" r="28" stroke="currentColor" strokeWidth="4" fill="none" className="text-blue-500 transition-all duration-300" strokeLinecap="round"
                  strokeDasharray={circumference} strokeDashoffset={circumference * (1 - progress / 100)} />
              </svg>
              <div style={{position:'absolute',inset:0}} className="flex items-center justify-center">
                <span className="text-lg font-bold text-white">{progress}%</span>
              </div>
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">Uploading...</h3>
            <p className="text-sm text-white/60">{status}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export const UploadModal = ({ isOpen, onClose, onSuccess }: UploadModalProps) => {
  const { session } = useAuth();
  const [isClosing, setIsClosing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState('');
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadDescription, setUploadDescription] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [isDragging, setIsDragging] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const supabase = createClient();

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 5000);
  };

  const resetModal = () => {
    setUploadTitle(''); setUploadDescription(''); setSelectedFile(null); setPreviewUrl('');
    setUploadProgress(0); setUploadStatus(''); setUploadError(null); setIsUploading(false);
  };

  const handleClose = () => {
    if (isUploading && !uploadError) return;
    setIsClosing(true);
    setTimeout(() => { onClose(); setIsClosing(false); resetModal(); }, 300);
  };

  const handleFileSelect = useCallback((file: File) => {
    if (!file?.type.startsWith('image/')) return showToast('Please select a valid image file', 'error');
    if (file.size > 10 * 1024 * 1024) return showToast('File size must be less than 10MB', 'error');
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  }, []);

  const performUpload = async () => {
    if (!selectedFile || !uploadTitle || !session) return showToast('Please fill in all required fields', 'error');

    try {
      setIsUploading(true); setUploadError(null); setUploadProgress(5); setUploadStatus('Preparing upload...');

      const fileExt = selectedFile.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `${session.user.id}/${fileName}`;

      setUploadProgress(15); setUploadStatus('Uploading image...');

      const { data: uploadData, error: uploadError } = await supabase.storage.from('wallpapers').upload(filePath, selectedFile, { cacheControl: '3600', upsert: false });

      if (uploadError) {
        const statusCode = (uploadError as any).cause?.status || (uploadError as any).statusCode || 'Unknown';
        throw new Error(`Storage Error: ${uploadError.message}\n\nStatus: ${statusCode}\nPath: ${filePath}`);
      }
      if (!uploadData) throw new Error('Upload completed but no data returned from storage');

      setUploadProgress(50); setUploadStatus('Processing image...');

      const { data: { publicUrl } } = supabase.storage.from('wallpapers').getPublicUrl(filePath);

      setUploadProgress(70); setUploadStatus('Saving to database...');

      const { data: wallpaperData, error: dbError } = await supabase.from('wallpapers').insert({
        user_id: session.user.id, title: uploadTitle.trim(), description: uploadDescription.trim() || null,
        image_url: publicUrl, thumbnail_url: publicUrl, category: 'Other', tags: [], is_public: true, views: 0, downloads: 0,
      }).select().single();

      if (dbError) {
        await supabase.storage.from('wallpapers').remove([filePath]);
        throw new Error(`Database Error: ${dbError.message}\n\nCode: ${dbError.code || 'Unknown'}\nDetails: ${dbError.details || 'None'}`);
      }

      setUploadProgress(100); setUploadStatus('Upload complete!');
      showToast('Wallpaper uploaded successfully!', 'success');
      setTimeout(() => { handleClose(); if (onSuccess) onSuccess(); }, 1000);

    } catch (error: any) {
      console.error('Upload failed:', error);
      setUploadError(error.message || 'An unexpected error occurred. Please try again.');
    }
  };

  const handleRetry = () => { setUploadError(null); setUploadProgress(0); performUpload(); };
  const handleCancelUpload = () => { setUploadError(null); setIsUploading(false); setUploadProgress(0); setUploadStatus(''); };

  if (!isOpen) return null;

  const inputClass = "w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-white/30 focus:bg-white/[0.07] transition-all disabled:opacity-50";

  return (
    <>
      {isUploading && <UploadProgress progress={uploadProgress} status={uploadStatus} error={uploadError} onRetry={handleRetry} onCancel={handleCancelUpload} />}
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <div style={{position:'fixed',inset:0,zIndex:50,animation:isClosing?'fadeOut 0.2s ease-out':'fadeIn 0.2s ease-out'}} className="bg-black/60 backdrop-blur-sm" onClick={handleClose}>
        <div style={{position:'absolute',bottom:0,left:0,right:0,animation:isClosing?'slideDown 0.3s ease-out':'slideUp 0.3s cubic-bezier(0.34,1.56,0.64,1)'}} 
             className="md:inset-4 md:m-auto md:max-w-2xl md:max-h-[90vh] bg-zinc-950 md:rounded-2xl border-t md:border border-white/10 shadow-2xl flex flex-col" onClick={e=>e.stopPropagation()}>

          <div className="flex items-center justify-between px-4 md:px-6 py-4 border-b border-white/10">
            <div>
              <h2 className="text-base md:text-lg font-semibold">Upload Wallpaper</h2>
              <p className="text-xs text-white/50 mt-0.5">Share your creation</p>
            </div>
            <button onClick={handleClose} disabled={isUploading && !uploadError} className="p-2 hover:bg-white/5 rounded-lg transition-colors disabled:opacity-50">
              <X className="w-5 h-5"/>
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 md:p-6">
            <div className="space-y-4">
              <div onClick={() => !previewUrl && !isUploading && fileInputRef.current?.click()}
                   onDragOver={e=>{e.preventDefault();setIsDragging(true);}} onDragLeave={e=>{e.preventDefault();setIsDragging(false);}}
                   onDrop={e=>{e.preventDefault();setIsDragging(false);const f=e.dataTransfer.files[0];if(f)handleFileSelect(f);}}
                   className={`relative border-2 border-dashed rounded-xl transition-all overflow-hidden ${isDragging?'border-blue-500 bg-blue-500/5':previewUrl?'border-white/20':'border-white/10 hover:border-white/20 cursor-pointer'}`}>
                {previewUrl ? (
                  <div className="relative aspect-video md:aspect-[16/10]">
                    <img src={previewUrl} alt="Preview" className="w-full h-full object-cover"/>
                    <div style={{position:'absolute',inset:0}} className="bg-gradient-to-t from-black/60 via-transparent to-transparent"/>
                    {!isUploading && (
                      <>
                        <button onClick={e=>{e.stopPropagation();setPreviewUrl('');setSelectedFile(null);}} style={{position:'absolute',top:8,right:8}} className="p-1.5 rounded-lg bg-black/60 hover:bg-black/80 backdrop-blur-sm transition-colors">
                          <X className="w-4 h-4"/>
                        </button>
                        <button onClick={e=>{e.stopPropagation();fileInputRef.current?.click();}} style={{position:'absolute',bottom:8,right:8}} className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 backdrop-blur-sm text-xs font-medium transition-colors flex items-center gap-1.5">
                          <Upload className="w-3 h-3"/>Change
                        </button>
                      </>
                    )}
                    {selectedFile && (
                      <div style={{position:'absolute',bottom:8,left:8}} className="px-2 py-1 rounded-lg bg-black/60 backdrop-blur-sm text-xs text-white/60">
                        {(selectedFile.size/1024/1024).toFixed(2)} MB
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="aspect-video md:aspect-[16/10] flex items-center justify-center p-4">
                    <div className="text-center">
                      <div className="w-12 h-12 md:w-14 md:h-14 mx-auto mb-3 bg-white/5 rounded-full flex items-center justify-center">
                        <ImageIcon className="w-6 h-6 md:w-7 md:h-7 text-white/40"/>
                      </div>
                      <p className="text-sm font-medium mb-1">Click or drag to upload</p>
                      <p className="text-xs text-white/40">PNG, JPG, WEBP up to 10MB</p>
                    </div>
                  </div>
                )}
              </div>

              <input ref={fileInputRef} type="file" accept="image/*" style={{display:'none'}} onChange={e=>{const f=e.target.files?.[0];if(f)handleFileSelect(f);}} />

              <div>
                <label className="block text-xs md:text-sm font-medium text-white/70 mb-1.5">Title *</label>
                <input type="text" value={uploadTitle} onChange={e=>setUploadTitle(e.target.value)} placeholder="e.g., Minimal Dark Abstract" disabled={isUploading} className={inputClass} maxLength={100} />
                <p className="text-xs text-white/30 mt-1">{uploadTitle.length}/100</p>
              </div>

              <div>
                <label className="block text-xs md:text-sm font-medium text-white/70 mb-1.5">Description <span className="text-white/40 text-xs font-normal">(optional)</span></label>
                <textarea value={uploadDescription} onChange={e=>setUploadDescription(e.target.value)} placeholder="Add details about your wallpaper..." rows={3} disabled={isUploading} className={inputClass+" resize-none"} maxLength={300} />
                <p className="text-xs text-white/30 mt-1">{uploadDescription.length}/300</p>
              </div>

              <div className="p-3 bg-white/5 border border-white/10 rounded-lg">
                <p className="text-xs font-medium mb-1.5">Guidelines</p>
                <ul className="space-y-1 text-xs text-white/50">
                  <li className="flex gap-2"><span className="text-white/30">•</span><span>High-quality images recommended</span></li>
                  <li className="flex gap-2"><span className="text-white/30">•</span><span>Ensure you have rights to share</span></li>
                  <li className="flex gap-2"><span className="text-white/30">•</span><span>Max file size: 10MB</span></li>
                </ul>
              </div>
            </div>
          </div>

          <div className="flex gap-2 px-4 md:px-6 py-3 md:py-4 border-t border-white/10">
            <button onClick={handleClose} disabled={isUploading && !uploadError} className="flex-1 md:flex-none md:px-6 py-2.5 rounded-lg text-sm font-medium text-white/70 hover:bg-white/5 transition-colors disabled:opacity-50">Cancel</button>
            <button onClick={performUpload} disabled={!selectedFile || !uploadTitle || isUploading} className="flex-1 md:flex-none md:px-6 py-2.5 rounded-lg text-sm font-medium bg-white text-black hover:bg-white/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2">
              <Upload className="w-4 h-4"/><span>Upload</span>
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn{from{opacity:0}to{opacity:1}}
        @keyframes fadeOut{from{opacity:1}to{opacity:0}}
        @keyframes slideUp{from{transform:translateY(100%)}to{transform:translateY(0)}}
        @keyframes slideDown{from{transform:translateY(0)}to{transform:translateY(100%)}}
        @keyframes slideIn{from{transform:translateX(100%);opacity:0}to{transform:translateX(0);opacity:1}}
      `}</style>
    </>
  );
};
