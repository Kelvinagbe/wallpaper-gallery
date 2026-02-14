import { useState, useRef, useCallback } from 'react';
import { X, Upload, Image as ImageIcon, Check, AlertCircle } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/app/components/AuthProvider';

type UploadModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
};

// Toast notification component
const Toast = ({ message, type, onClose }: { message: string; type: 'success' | 'error'; onClose: () => void }) => (
  <div className="fixed top-4 right-4 z-[60] animate-slideIn">
    <div className={`flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg backdrop-blur-sm ${
      type === 'success' ? 'bg-emerald-500/90' : 'bg-red-500/90'
    }`}>
      {type === 'success' ? <Check className="w-5 h-5 text-white" /> : <AlertCircle className="w-5 h-5 text-white" />}
      <p className="text-sm font-medium text-white">{message}</p>
      <button onClick={onClose} className="ml-2 hover:bg-white/20 rounded-lg p-1 transition-colors">
        <X className="w-4 h-4 text-white" />
      </button>
    </div>
  </div>
);

// Upload progress popup
const UploadProgress = ({ progress, status }: { progress: number; status: string }) => (
  <div className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm flex items-center justify-center animate-fadeIn">
    <div className="bg-zinc-900 rounded-2xl p-8 max-w-sm w-full mx-4 border border-white/10">
      <div className="text-center">
        <div className="w-16 h-16 mx-auto mb-4 relative">
          <svg className="w-16 h-16 transform -rotate-90">
            <circle cx="32" cy="32" r="28" stroke="currentColor" strokeWidth="4" fill="none" className="text-white/10" />
            <circle 
              cx="32" cy="32" r="28" 
              stroke="currentColor" 
              strokeWidth="4" 
              fill="none" 
              strokeDasharray={`${2 * Math.PI * 28}`}
              strokeDashoffset={`${2 * Math.PI * 28 * (1 - progress / 100)}`}
              className="text-blue-500 transition-all duration-300"
              strokeLinecap="round"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-lg font-bold text-white">{progress}%</span>
          </div>
        </div>
        <h3 className="text-lg font-semibold text-white mb-2">Uploading...</h3>
        <p className="text-sm text-white/60">{status}</p>
      </div>
    </div>
  </div>
);

export const UploadModal = ({ isOpen, onClose, onSuccess }: UploadModalProps) => {
  const { session } = useAuth();
  const [isClosing, setIsClosing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState('');
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

  const handleClose = () => {
    if (isUploading) return;
    setIsClosing(true);
    setTimeout(() => {
      onClose();
      setIsClosing(false);
      setUploadTitle('');
      setUploadDescription('');
      setSelectedFile(null);
      setPreviewUrl('');
      setUploadProgress(0);
      setUploadStatus('');
    }, 300);
  };

  const handleFileSelect = useCallback((file: File) => {
    if (file && file.type.startsWith('image/')) {
      if (file.size > 10 * 1024 * 1024) {
        showToast('File size must be less than 10MB', 'error');
        return;
      }
      setSelectedFile(file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    } else {
      showToast('Please select a valid image file', 'error');
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); }, []);
  const handleDragLeave = useCallback((e: React.DragEvent) => { e.preventDefault(); setIsDragging(false); }, []);
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  }, [handleFileSelect]);

  const handlePost = async () => {
    if (!selectedFile || !uploadTitle || !session) {
      showToast('Please fill in all required fields', 'error');
      return;
    }

    try {
      setIsUploading(true);
      setUploadProgress(5);
      setUploadStatus('Preparing upload...');

      // Generate unique filename
      const fileExt = selectedFile.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `${session.user.id}/${fileName}`;

      setUploadProgress(15);
      setUploadStatus('Uploading image...');

      // Upload image to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('wallpapers')
        .upload(filePath, selectedFile, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        throw new Error(`Upload failed: ${uploadError.message}`);
      }

      setUploadProgress(50);
      setUploadStatus('Processing image...');

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('wallpapers')
        .getPublicUrl(filePath);

      setUploadProgress(70);
      setUploadStatus('Saving to database...');

      // Insert wallpaper record
      const { data: wallpaperData, error: dbError } = await supabase
        .from('wallpapers')
        .insert({
          user_id: session.user.id,
          title: uploadTitle.trim(),
          description: uploadDescription.trim() || null,
          image_url: publicUrl,
          thumbnail_url: publicUrl,
          category: 'Other',
          tags: [],
          is_public: true,
          views: 0,
          downloads: 0,
        })
        .select()
        .single();

      if (dbError) {
        console.error('Database error:', dbError);
        // Try to delete uploaded file if DB insert fails
        await supabase.storage.from('wallpapers').remove([filePath]);
        throw new Error(`Database error: ${dbError.message}`);
      }

      setUploadProgress(100);
      setUploadStatus('Upload complete!');

      // Show success message
      showToast('Wallpaper uploaded successfully!', 'success');

      // Wait a bit to show 100% progress
      setTimeout(() => {
        handleClose();
        if (onSuccess) onSuccess();
      }, 1000);

    } catch (error: any) {
      console.error('Upload error:', error);
      showToast(error.message || 'Failed to upload wallpaper. Please try again.', 'error');
      setIsUploading(false);
      setUploadProgress(0);
      setUploadStatus('');
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Upload Progress Popup */}
      {isUploading && <UploadProgress progress={uploadProgress} status={uploadStatus} />}

      {/* Toast Notification */}
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {/* Main Modal */}
      <div className={`fixed inset-0 z-50 bg-black/60 backdrop-blur-sm ${isClosing?'animate-fadeOut':'animate-fadeIn'}`} onClick={handleClose}>
        <div className={`absolute bottom-0 inset-x-0 md:inset-4 md:m-auto md:max-w-2xl md:max-h-[90vh] bg-zinc-950 md:rounded-2xl border-t md:border border-white/10 shadow-2xl flex flex-col ${isClosing?'animate-slideDown':'animate-slideUp'}`} onClick={e=>e.stopPropagation()}>

          {/* Header */}
          <div className="flex items-center justify-between px-4 md:px-6 py-4 border-b border-white/10">
            <div>
              <h2 className="text-base md:text-lg font-semibold">Upload Wallpaper</h2>
              <p className="text-xs text-white/50 mt-0.5">Share your creation</p>
            </div>
            <button onClick={handleClose} disabled={isUploading} className="p-2 hover:bg-white/5 rounded-lg transition-colors disabled:opacity-50">
              <X className="w-5 h-5"/>
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4 md:p-6">
            <div className="space-y-4">
              {/* Upload Area */}
              <div
                onClick={() => !previewUrl && !isUploading && fileInputRef.current?.click()}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`relative border-2 border-dashed rounded-xl transition-all overflow-hidden ${isDragging?'border-blue-500 bg-blue-500/5':previewUrl?'border-white/20':'border-white/10 hover:border-white/20 cursor-pointer'}`}
              >
                {previewUrl ? (
                  <div className="relative aspect-video md:aspect-[16/10]">
                    <img src={previewUrl} alt="Preview" className="w-full h-full object-cover"/>
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"/>
                    {!isUploading && (
                      <>
                        <button onClick={e=>{e.stopPropagation();setPreviewUrl('');setSelectedFile(null);}} className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/60 hover:bg-black/80 backdrop-blur-sm transition-colors">
                          <X className="w-4 h-4"/>
                        </button>
                        <button onClick={e=>{e.stopPropagation();fileInputRef.current?.click();}} className="absolute bottom-2 right-2 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 backdrop-blur-sm text-xs font-medium transition-colors flex items-center gap-1.5">
                          <Upload className="w-3 h-3"/>Change
                        </button>
                      </>
                    )}
                    {selectedFile && (
                      <div className="absolute bottom-2 left-2 px-2 py-1 rounded-lg bg-black/60 backdrop-blur-sm text-xs text-white/60">
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

              <input ref={fileInputRef} type="file" accept="image/*" onChange={e=>{const file=e.target.files?.[0];if(file)handleFileSelect(file);}} className="hidden"/>

              {/* Title */}
              <div>
                <label className="block text-xs md:text-sm font-medium text-white/70 mb-1.5">Title *</label>
                <input
                  type="text"
                  value={uploadTitle}
                  onChange={e=>setUploadTitle(e.target.value)}
                  placeholder="e.g., Minimal Dark Abstract"
                  disabled={isUploading}
                  className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-white/30 focus:bg-white/[0.07] transition-all disabled:opacity-50"
                  maxLength={100}
                />
                <p className="text-xs text-white/30 mt-1">{uploadTitle.length}/100</p>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs md:text-sm font-medium text-white/70 mb-1.5">Description <span className="text-white/40 text-xs font-normal">(optional)</span></label>
                <textarea
                  value={uploadDescription}
                  onChange={e=>setUploadDescription(e.target.value)}
                  placeholder="Add details about your wallpaper..."
                  rows={3}
                  disabled={isUploading}
                  className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-white/30 focus:bg-white/[0.07] transition-all resize-none disabled:opacity-50"
                  maxLength={300}
                />
                <p className="text-xs text-white/30 mt-1">{uploadDescription.length}/300</p>
              </div>

              {/* Guidelines */}
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

          {/* Footer */}
          <div className="flex gap-2 px-4 md:px-6 py-3 md:py-4 border-t border-white/10">
            <button onClick={handleClose} disabled={isUploading} className="flex-1 md:flex-none md:px-6 py-2.5 rounded-lg text-sm font-medium text-white/70 hover:bg-white/5 transition-colors disabled:opacity-50">
              Cancel
            </button>
            <button onClick={handlePost} disabled={!selectedFile || !uploadTitle || isUploading} className="flex-1 md:flex-none md:px-6 py-2.5 rounded-lg text-sm font-medium bg-white text-black hover:bg-white/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2">
              <Upload className="w-4 h-4"/>
              <span>Upload</span>
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
        .animate-fadeIn{animation:fadeIn 0.2s ease-out}
        .animate-fadeOut{animation:fadeOut 0.2s ease-out}
        .animate-slideUp{animation:slideUp 0.3s cubic-bezier(0.34,1.56,0.64,1)}
        .animate-slideDown{animation:slideDown 0.3s ease-out}
        .animate-slideIn{animation:slideIn 0.3s ease-out}
      `}</style>
    </>
  );
};