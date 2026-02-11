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
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md"
      style={{ animation: isClosing ? 'fadeOut 0.3s ease-out forwards' : 'fadeIn 0.3s ease-out forwards' }}
      onClick={handleClose}
    >
      {/* Full width container with max constraints */}
      <div
        className={`h-full w-full md:w-[90vw] lg:w-[85vw] xl:w-[75vw] max-w-[1400px] mx-auto bg-black border-l border-r border-white/10 flex flex-col ${
          isClosing ? 'slide-down' : 'slide-up'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header - Fixed */}
        <div className="flex-shrink-0 flex items-center justify-between px-6 md:px-8 py-4 md:py-5 border-b border-white/10 bg-black/95 backdrop-blur-xl">
          <div>
            <h2 className="text-lg md:text-xl font-semibold">Upload Wallpaper</h2>
            <p className="text-xs md:text-sm text-white/50 mt-0.5">Share your creation with the community</p>
          </div>
          <button
            onClick={handleClose}
            className="p-2 rounded-lg hover:bg-white/5 transition-colors"
          >
            <X className="w-5 h-5 md:w-6 md:h-6" />
          </button>
        </div>

        {/* Content - Scrollable */}
        <div className="flex-1 overflow-y-auto px-6 md:px-8 py-6 md:py-8">
          <div className="max-w-4xl mx-auto">
            {/* Two Column Layout on Desktop */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
              {/* Left Column - Upload Area */}
              <div>
                <div
                  onClick={() => !previewUrl && fileInputRef.current?.click()}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  className={`relative border-2 border-dashed rounded-xl transition-all overflow-hidden ${
                    isDragging
                      ? 'border-white/50 bg-white/5'
                      : previewUrl
                      ? 'border-white/20'
                      : 'border-white/10 hover:border-white/30 cursor-pointer'
                  }`}
                >
                  {previewUrl ? (
                    <div className="relative aspect-[9/16] md:aspect-[3/4] lg:aspect-[9/16]">
                      <img
                        src={previewUrl}
                        alt="Preview"
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
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
                      {selectedFile && (
                        <div className="absolute bottom-3 left-3 px-3 py-1.5 rounded-lg bg-black/80 backdrop-blur-sm text-xs text-white/60">
                          {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="aspect-[9/16] md:aspect-[3/4] lg:aspect-[9/16] flex items-center justify-center">
                      <div className="text-center px-4">
                        <div className="w-16 h-16 md:w-20 md:h-20 mx-auto mb-4 bg-white/5 rounded-full flex items-center justify-center">
                          <ImageIcon className="w-8 h-8 md:w-10 md:h-10 text-white/60" />
                        </div>
                        <p className="text-sm md:text-base font-medium mb-1">Click to upload or drag and drop</p>
                        <p className="text-xs md:text-sm text-white/40">PNG, JPG, WEBP up to 10MB</p>
                      </div>
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
              </div>

              {/* Right Column - Form Fields */}
              <div className="space-y-5 md:space-y-6">
                <div>
                  <label className="block text-sm font-medium text-white/80 mb-2">
                    Title <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={uploadTitle}
                    onChange={(e) => setUploadTitle(e.target.value)}
                    placeholder="e.g., Minimal Dark Abstract"
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-sm md:text-base text-white placeholder:text-white/30 focus:outline-none focus:border-white/30 focus:bg-white/[0.07] transition-all"
                    maxLength={100}
                  />
                  <p className="text-xs text-white/30 mt-2">{uploadTitle.length}/100 characters</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-white/80 mb-2">
                    Description <span className="text-white/40 text-xs font-normal">(optional)</span>
                  </label>
                  <textarea
                    value={uploadDescription}
                    onChange={(e) => setUploadDescription(e.target.value)}
                    placeholder="Add details about your wallpaper, inspiration, or usage..."
                    rows={6}
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-sm md:text-base text-white placeholder:text-white/30 focus:outline-none focus:border-white/30 focus:bg-white/[0.07] transition-all resize-none"
                    maxLength={500}
                  />
                  <p className="text-xs text-white/30 mt-2">{uploadDescription.length}/500 characters</p>
                </div>

                {/* Upload Guidelines */}
                <div className="p-4 bg-white/5 border border-white/10 rounded-lg">
                  <h3 className="text-sm font-medium mb-2">Upload Guidelines</h3>
                  <ul className="space-y-1.5 text-xs text-white/60">
                    <li className="flex items-start gap-2">
                      <span className="text-white/40">•</span>
                      <span>Use high-quality images (recommended: 1080x1920 or higher)</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-white/40">•</span>
                      <span>Ensure you have rights to share the wallpaper</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-white/40">•</span>
                      <span>Add descriptive titles and tags for better discovery</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer - Fixed */}
        <div className="flex-shrink-0 flex items-center justify-between md:justify-end gap-3 px-6 md:px-8 py-4 md:py-5 border-t border-white/10 bg-black/95 backdrop-blur-xl">
          <button
            onClick={handleClose}
            className="flex-1 md:flex-none px-6 py-2.5 rounded-lg text-sm font-medium text-white/80 hover:bg-white/5 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handlePost}
            disabled={!selectedFile || !uploadTitle}
            className="flex-1 md:flex-none px-6 py-2.5 rounded-lg text-sm font-medium bg-white text-black hover:bg-white/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-white"
          >
            Upload Wallpaper
          </button>
        </div>
      </div>
    </div>
  );
};