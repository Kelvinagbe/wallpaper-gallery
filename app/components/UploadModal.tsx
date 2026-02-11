import { useState, useRef, useCallback } from 'react';
import { X, Upload, Image as ImageIcon } from 'lucide-react';

type UploadModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

export const UploadModal = ({ isOpen, onClose }: UploadModalProps) => {
  const [isClosing, setIsClosing] = useState(false);
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadDescription, setUploadDescription] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      onClose();
      setIsClosing(false);
      setUploadTitle('');
      setUploadDescription('');
      setSelectedFile(null);
      setPreviewUrl('');
    }, 300);
  };

  const handleFileSelect = useCallback((file: File) => {
    if (file && file.type.startsWith('image/')) {
      setSelectedFile(file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  }, [handleFileSelect]);

  const handlePost = () => {
    if (!selectedFile || !uploadTitle) return;
    console.log('Posting:', { title: uploadTitle, description: uploadDescription, file: selectedFile });
    handleClose();
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md"
      style={{ animation: isClosing ? 'fadeOut 0.3s ease-out forwards' : 'fadeIn 0.3s ease-out forwards' }}
      onClick={handleClose}
    >
      <div
        className={`w-full max-w-2xl mx-4 bg-black border border-white/10 rounded-2xl overflow-hidden shadow-2xl ${
          isClosing ? 'slide-down' : 'slide-up'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
          <div>
            <h2 className="text-lg font-semibold">Upload Wallpaper</h2>
            <p className="text-xs text-white/50 mt-0.5">Share your creation with the community</p>
          </div>
          <button
            onClick={handleClose}
            className="p-2 rounded-lg hover:bg-white/5 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 max-h-[70vh] overflow-y-auto">
          {/* Upload Area */}
          <div
            onClick={() => !previewUrl && fileInputRef.current?.click()}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`relative border-2 border-dashed rounded-xl transition-all overflow-hidden mb-6 ${
              isDragging
                ? 'border-white/50 bg-white/5'
                : previewUrl
                ? 'border-white/20'
                : 'border-white/10 hover:border-white/30 cursor-pointer'
            }`}
          >
            {previewUrl ? (
              <div className="relative aspect-video">
                <img
                  src={previewUrl}
                  alt="Preview"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setPreviewUrl('');
                    setSelectedFile(null);
                  }}
                  className="absolute top-3 right-3 p-2 rounded-lg bg-black/80 hover:bg-black transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    fileInputRef.current?.click();
                  }}
                  className="absolute bottom-3 right-3 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 backdrop-blur-sm text-sm font-medium transition-colors flex items-center gap-2"
                >
                  <Upload className="w-3.5 h-3.5" />
                  Change
                </button>
              </div>
            ) : (
              <div className="py-12 text-center">
                <div className="w-14 h-14 mx-auto mb-4 bg-white/5 rounded-full flex items-center justify-center">
                  <ImageIcon className="w-7 h-7 text-white/60" />
                </div>
                <p className="text-sm font-medium mb-1">Click to upload or drag and drop</p>
                <p className="text-xs text-white/40">PNG, JPG, WEBP up to 10MB</p>
              </div>
            )}
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFileSelect(file);
            }}
            className="hidden"
          />

          {/* Form Fields */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-white/80 mb-2">
                Title <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={uploadTitle}
                onChange={(e) => setUploadTitle(e.target.value)}
                placeholder="e.g., Minimal Dark Abstract"
                className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-white/30 focus:bg-white/[0.07] transition-all"
                maxLength={100}
              />
              <p className="text-xs text-white/30 mt-1.5">{uploadTitle.length}/100</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-white/80 mb-2">
                Description <span className="text-white/40 text-xs font-normal">(optional)</span>
              </label>
              <textarea
                value={uploadDescription}
                onChange={(e) => setUploadDescription(e.target.value)}
                placeholder="Add details about your wallpaper, inspiration, or usage..."
                rows={3}
                className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-white/30 focus:bg-white/[0.07] transition-all resize-none"
                maxLength={500}
              />
              <p className="text-xs text-white/30 mt-1.5">{uploadDescription.length}/500</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-white/10">
          <button
            onClick={handleClose}
            className="px-4 py-2 rounded-lg text-sm font-medium text-white/80 hover:bg-white/5 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handlePost}
            disabled={!selectedFile || !uploadTitle}
            className="px-4 py-2 rounded-lg text-sm font-medium bg-white text-black hover:bg-white/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-white"
          >
            Upload
          </button>
        </div>
      </div>
    </div>
  );
};