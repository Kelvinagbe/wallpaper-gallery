import { useState, useRef } from 'react';
import { X, ImageIcon, Type, FileText } from 'lucide-react';

type UploadModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

export const UploadModal = ({ isOpen, onClose }: UploadModalProps) => {
  const [isClosing, setIsClosing] = useState(false);
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadDescription, setUploadDescription] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      onClose();
      setIsClosing(false);
      setUploadTitle('');
      setUploadDescription('');
    }, 300);
  };

  const handlePost = () => {
    console.log('Posting:', { title: uploadTitle, description: uploadDescription });
    handleClose();
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-sm"
      style={{ animation: isClosing ? 'fadeOut 0.3s ease-out forwards' : 'fadeIn 0.3s ease-out forwards' }}
      onClick={handleClose}
    >
      <div
        className={`w-full sm:max-w-lg bg-gradient-to-b from-gray-900 to-black border-t sm:border border-white/10 sm:rounded-3xl rounded-t-3xl overflow-hidden ${
          isClosing ? 'slide-down' : 'slide-up'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 sm:p-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold">Upload Wallpaper</h2>
              <p className="text-sm text-white/50 mt-1">Share your amazing wallpapers</p>
            </div>
            <button onClick={handleClose} className="p-2 rounded-xl hover:bg-white/10 transition-colors">
              <X className="w-6 h-6" />
            </button>
          </div>

          <div
            onClick={() => fileInputRef.current?.click()}
            className="relative border-2 border-dashed border-white/20 rounded-2xl p-8 text-center cursor-pointer hover:border-white/50 hover:bg-white/5 transition-all group mb-4"
          >
            <div className="absolute inset-0 bg-white/5 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <div className="relative">
              <div className="w-16 h-16 mx-auto mb-3 bg-white/10 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                <ImageIcon className="w-8 h-8 text-white" />
              </div>
              <p className="text-base font-semibold mb-1">Choose image</p>
              <p className="text-xs text-white/60 mb-2">or drag and drop here</p>
              <div className="flex items-center justify-center gap-3 text-xs text-white/40">
                <span className="flex items-center gap-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-white"></div>PNG, JPG, WEBP
                </span>
                <span className="flex items-center gap-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-white"></div>Max 10MB
                </span>
              </div>
            </div>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={(e) => e.target.files?.[0] && handleClose()}
            className="hidden"
          />

          {[
            { icon: Type, label: 'Title', value: uploadTitle, setter: setUploadTitle, placeholder: 'Enter wallpaper title...', rows: 1 },
            { icon: FileText, label: 'Description', value: uploadDescription, setter: setUploadDescription, placeholder: 'Describe your wallpaper...', rows: 3 }
          ].map(({ icon: Icon, label, value, setter, placeholder, rows }) => (
            <div key={label} className="mb-4">
              <label className="flex items-center gap-2 text-sm font-medium text-white/80 mb-2">
                <Icon className="w-4 h-4" />
                {label}
              </label>
              {rows === 1 ? (
                <input
                  type="text"
                  value={value}
                  onChange={(e) => setter(e.target.value)}
                  placeholder={placeholder}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-white/40 focus:outline-none focus:border-white/30 focus:bg-white/10 transition-all"
                />
              ) : (
                <textarea
                  value={value}
                  onChange={(e) => setter(e.target.value)}
                  placeholder={placeholder}
                  rows={rows}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-white/40 focus:outline-none focus:border-white/30 focus:bg-white/10 transition-all resize-none"
                />
              )}
            </div>
          ))}

          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={handleClose}
              className="px-4 py-3 rounded-xl bg-white/5 hover:bg-white/10 font-medium transition-all border border-white/10"
            >
              Cancel
            </button>
            <button
              onClick={handlePost}
              className="px-4 py-3 rounded-xl bg-white text-black hover:bg-gray-200 font-semibold transition-all"
            >
              Post
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
