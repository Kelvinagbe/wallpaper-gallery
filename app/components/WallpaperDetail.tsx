import { useState } from 'react';
import { ChevronLeft, Eye, Heart, Download, Share2, Bookmark, Check, Link as LinkIcon } from 'lucide-react';
import type { Wallpaper } from '../types';

type WallpaperDetailProps = {
  wallpaper: Wallpaper | null;
  relatedWallpapers: Wallpaper[];
  onClose: () => void;
  onUserClick: () => void;
  onRelatedClick: (wallpaper: Wallpaper) => void;
  isLoading?: boolean;
};

const ImageWithLoader = ({ src, alt }: { src: string; alt: string }) => {
  const [loaded, setLoaded] = useState(false);
  return (
    <div className="relative">
      {!loaded && <div className="absolute inset-0 skeleton flex items-center justify-center"><div className="w-10 h-10 border-4 border-white/20 border-t-white rounded-full animate-spin" /></div>}
      <img src={src} alt={alt} className={`w-full h-auto transition-opacity duration-300 ${loaded ? 'opacity-100' : 'opacity-0'}`} onLoad={() => setLoaded(true)} />
    </div>
  );
};

const SkeletonLoader = () => (
  <div className="space-y-4 animate-pulse">
    <div className="relative rounded-2xl overflow-hidden bg-white/10 aspect-[9/16] flex items-center justify-center">
      <div className="w-10 h-10 border-4 border-white/20 border-t-white/40 rounded-full animate-spin" />
    </div>
    <div className="flex items-center gap-3 p-2">
      <div className="w-10 h-10 rounded-full bg-white/10" />
      <div className="flex-1 space-y-2">
        <div className="h-4 w-32 bg-white/10 rounded" />
        <div className="h-3 w-20 bg-white/10 rounded" />
      </div>
    </div>
    <div className="space-y-2">
      {[48, 'full', '75%'].map((w, i) => <div key={i} className={`h-${i ? 4 : 5} bg-white/10 rounded`} style={{ width: typeof w === 'number' ? `${w * 4}px` : w }} />)}
    </div>
    <div className="flex items-center gap-6">{[1, 2, 3].map((i) => <div key={i} className="h-4 w-16 bg-white/10 rounded" />)}</div>
    <div className="flex gap-3">
      <div className="flex-1 h-12 bg-white/10 rounded-full" />
      {[1, 2].map((i) => <div key={i} className="w-12 h-12 bg-white/10 rounded-full" />)}
    </div>
  </div>
);

const CopyLinkModal = ({ isOpen, onClose, link }: { isOpen: boolean; onClose: () => void; link: string }) => {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    await navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => { setCopied(false); setTimeout(onClose, 500); }, 1500);
  };
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[60] flex items-end animate-slideUp" onClick={onClose}>
      <div className="w-full bg-gradient-to-b from-zinc-900 to-black rounded-t-3xl p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
        <div className="w-12 h-1.5 bg-white/20 rounded-full mx-auto mb-2" />
        <h3 className="text-xl font-bold text-white text-center">Copy Link</h3>
        <div className="bg-white/5 rounded-xl p-4 flex items-center gap-3 border border-white/10">
          <LinkIcon className="w-5 h-5 text-white/60 flex-shrink-0" />
          <p className="text-sm text-white/80 flex-1 truncate">{link}</p>
        </div>
        <button onClick={handleCopy} className={`w-full py-4 rounded-full font-semibold transition-all ${copied ? 'bg-emerald-500 text-white' : 'bg-white text-black hover:bg-gray-200'}`}>
          {copied ? <span className="flex items-center justify-center gap-2"><Check className="w-5 h-5" />Copied!</span> : 'Copy Link'}
        </button>
        <button onClick={onClose} className="w-full py-4 bg-white/5 hover:bg-white/10 rounded-full font-semibold text-white transition-all">Cancel</button>
      </div>
    </div>
  );
};

export const WallpaperDetail = ({ wallpaper, relatedWallpapers, onClose, onUserClick, onRelatedClick, isLoading = false }: WallpaperDetailProps) => {
  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(false);
  const [downloaded, setDownloaded] = useState(false);
  const [following, setFollowing] = useState(false);
  const [likeCount, setLikeCount] = useState(wallpaper?.likes || 0);
  const [downloadCount, setDownloadCount] = useState(wallpaper?.downloads || 0);
  const [isClosing, setIsClosing] = useState(false);
  const [showHearts, setShowHearts] = useState<number[]>([]);
  const [isCopyModalOpen, setIsCopyModalOpen] = useState(false);
  const [likeButtonRef, setLikeButtonRef] = useState<HTMLButtonElement | null>(null);

  const handleClose = () => { setIsClosing(true); setTimeout(onClose, 300); };
  const vibrate = (duration: number) => navigator.vibrate?.(duration);
  const fmt = (n: number) => n > 1000 ? `${(n / 1000).toFixed(1)}k` : n;

  const handleLike = () => {
    if (!liked && likeButtonRef) {
      // Get button position for heart animation origin
      const rect = likeButtonRef.getBoundingClientRect();
      const hearts = Array.from({ length: 5 }, (_, i) => ({
        id: Date.now() + i,
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2
      }));
      setShowHearts(hearts.map(h => h.id));
      setTimeout(() => setShowHearts([]), 1000);
    }
    setLiked((prev) => { setLikeCount((c) => prev ? c - 1 : c + 1); return !prev; });
    vibrate(50);
  };

  const handleSave = () => { setSaved(!saved); vibrate(50); };
  const handleDownload = () => { if (!downloaded) { setDownloadCount((c) => c + 1); setDownloaded(true); vibrate(100); } };
  const handleShare = () => navigator.share ? navigator.share({ title: wallpaper?.title, text: wallpaper?.description, url: window.location.href }).catch(() => setIsCopyModalOpen(true)) : setIsCopyModalOpen(true);

  return (
    <>
      <style jsx>{`
        @keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
        @keyframes slideDown { from { transform: translateY(0); } to { transform: translateY(100%); } }
        @keyframes floatHeart {
          0% { transform: translate(0, 0) scale(0); opacity: 0; }
          10% { opacity: 1; }
          50% { transform: translate(var(--tx), -100px) scale(1); opacity: 0.8; }
          100% { transform: translate(var(--tx), -200px) scale(0.5); opacity: 0; }
        }
        @keyframes scaleIn { 
          0% { transform: scale(0); } 
          50% { transform: scale(1.15); } 
          100% { transform: scale(1); } 
        }
        @keyframes successBounce {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.1); }
        }
        @keyframes buttonPress {
          0% { transform: scale(1); }
          50% { transform: scale(0.95); }
          100% { transform: scale(1); }
        }
        .animate-slideUp { animation: slideUp 0.3s ease-out; }
        .animate-slideDown { animation: slideDown 0.3s ease-out; }
        .heart-float { animation: floatHeart 1s ease-out forwards; pointer-events: none; position: fixed; }
        .scale-in { animation: scaleIn 0.3s cubic-bezier(.2,2,1,1); }
        .success-bounce { animation: successBounce 0.5s ease-out; }
        .button-press { animation: buttonPress 0.2s ease-out; }
      `}</style>

      <div className={`fixed inset-0 bg-black z-50 flex flex-col ${isClosing ? 'animate-slideDown' : 'animate-slideUp'}`}>
        <button onClick={handleClose} className="absolute top-4 left-4 z-10 p-3 bg-white rounded-xl hover:bg-gray-100 active:scale-95 transition-all shadow-lg">
          <ChevronLeft className="w-6 h-6 text-black" />
        </button>

        <div className="flex-1 overflow-y-auto no-scrollbar">
          <div className="max-w-2xl mx-auto p-4">
            {isLoading || !wallpaper ? <SkeletonLoader /> : (
              <>
                <div className="relative rounded-2xl overflow-hidden">
                  <ImageWithLoader src={wallpaper.url} alt={wallpaper.title} />
                  {showHearts.map((id, index) => (
                    <Heart
                      key={id}
                      className="heart-float text-rose-500 fill-rose-500"
                      style={{
                        left: likeButtonRef ? `${likeButtonRef.getBoundingClientRect().left + 20}px` : '50%',
                        top: likeButtonRef ? `${likeButtonRef.getBoundingClientRect().top + 20}px` : '50%',
                        width: '30px',
                        height: '30px',
                        '--tx': `${(Math.random() - 0.5) * 100}px`,
                        animationDelay: `${index * 0.1}s`
                      } as any}
                    />
                  ))}
                </div>

                <div className="space-y-4 mt-4">
                  <button onClick={onUserClick} className="flex items-center gap-3 w-full hover:bg-white/5 p-2 rounded-xl transition-colors active:scale-98">
                    <img src={wallpaper.userAvatar} alt={wallpaper.uploadedBy} className="w-10 h-10 rounded-full border border-white/20" />
                    <div className="flex-1 text-left">
                      <p className="font-semibold text-white">{wallpaper.uploadedBy}</p>
                      <p className="text-sm text-white/60">Just now</p>
                    </div>
                    <button onClick={(e) => { e.stopPropagation(); setFollowing(!following); vibrate(50); }} className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-all active:scale-95 ${following ? 'bg-white/10 text-white border border-white/20 hover:bg-white/15' : 'bg-white text-black hover:bg-gray-200'}`}>
                      {following ? 'Following' : 'Follow'}
                    </button>
                  </button>

                  <div>
                    <h3 className="font-semibold text-white mb-1">{wallpaper.title}</h3>
                    <p className="text-sm text-white/70 leading-relaxed">{wallpaper.description}</p>
                  </div>

                  <div className="flex items-center gap-6 text-sm text-white/50">
                    {[{ icon: Eye, value: wallpaper.views, active: false }, { icon: Heart, value: likeCount, active: liked, color: 'rose' }, { icon: Download, value: downloadCount, active: downloaded, color: 'emerald' }].map(({ icon: Icon, value, active, color }, i) => (
                      <span key={i} className={`flex items-center gap-1.5 transition-colors ${active ? `text-${color}-400` : ''}`}>
                        <Icon className={`w-4 h-4 transition-all ${active ? `fill-${color}-400 text-${color}-400` : ''}`} />
                        {fmt(value)}
                      </span>
                    ))}
                  </div>

                  <div className="flex gap-3">
                    <button onClick={handleSave} className={`flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-full font-semibold transition-all active:scale-95 ${saved ? 'bg-blue-500 text-white hover:bg-blue-600' : 'bg-white text-black hover:bg-gray-200'} ${saved ? 'success-bounce' : ''}`}>
                      <Bookmark className={`w-5 h-5 transition-all ${saved ? 'fill-white scale-in' : ''}`} />
                      {saved ? 'Saved' : 'Save'}
                    </button>
                    <button ref={setLikeButtonRef} onClick={handleLike} className={`flex items-center justify-center px-4 py-3 rounded-full border transition-all active:scale-95 ${liked ? 'bg-rose-500/20 border-rose-500/50 text-rose-400 hover:bg-rose-500/30' : 'bg-white/5 border-white/10 text-white/70 hover:bg-white/10'} ${liked ? 'button-press' : ''}`}>
                      <Heart className={`w-5 h-5 transition-all ${liked ? 'fill-rose-400 text-rose-400 scale-in' : ''}`} />
                    </button>
                    <button onClick={handleDownload} className={`flex items-center justify-center px-4 py-3 rounded-full border transition-all active:scale-95 ${downloaded ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400 hover:bg-emerald-500/30' : 'bg-white/5 border-white/10 text-white/70 hover:bg-white/10'} ${downloaded ? 'success-bounce' : ''}`}>
                      {downloaded ? <Check className="w-5 h-5 text-emerald-400 scale-in" /> : <Download className="w-5 h-5" />}
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    {[{ icon: Share2, label: 'Share', onClick: handleShare }, { icon: LinkIcon, label: 'Copy Link', onClick: () => setIsCopyModalOpen(true) }].map(({ icon: Icon, label, onClick }) => (
                      <button key={label} onClick={onClick} className="flex items-center justify-center gap-2 py-4 bg-white/5 rounded-xl hover:bg-white/10 active:scale-95 transition-all">
                        <Icon className="w-5 h-5" />
                        <span className="font-medium">{label}</span>
                      </button>
                    ))}
                  </div>

                  <div className="bg-white/5 rounded-2xl p-4">
                    <h4 className="font-semibold text-white mb-3">More to explore</h4>
                    <div className="grid grid-cols-2 gap-3">
                      {relatedWallpapers.map((img) => (
                        <div key={img.id} onClick={() => onRelatedClick(img)} className="relative rounded-xl overflow-hidden cursor-pointer hover:scale-105 active:scale-95 transition-transform" style={{ aspectRatio: `1/${img.aspectRatio}` }}>
                          <img src={img.thumbnail} alt={img.title} className="w-full h-full object-cover" />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <CopyLinkModal isOpen={isCopyModalOpen} onClose={() => setIsCopyModalOpen(false)} link={`https://wallpapers.app/${wallpaper?.id || ''}`} />
    </>
  );
};