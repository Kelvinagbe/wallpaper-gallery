import { X, LogIn } from 'lucide-react';
import { useRouter } from 'next/navigation';

type LoginPromptModalProps = {
  isOpen: boolean;
  onClose: () => void;
  action: string;
};

export const LoginPromptModal = ({ isOpen, onClose, action }: LoginPromptModalProps) => {
  const router = useRouter();

  if (!isOpen) return null;

  const handleLogin = () => {
    router.push('/login');
  };

  return (
    <div 
      className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div 
        className="bg-zinc-950 rounded-2xl p-6 max-w-sm w-full border border-white/10 shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-4">
          <div className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center">
            <LogIn className="w-6 h-6 text-white/70" />
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-white/5 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-white/50" />
          </button>
        </div>

        <h3 className="text-xl font-semibold text-white mb-2">
          Login Required
        </h3>
        <p className="text-sm text-white/60 mb-6">
          You need to be logged in to {action}. Please sign in to continue.
        </p>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 rounded-lg text-sm font-medium text-white/70 hover:bg-white/5 border border-white/10 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleLogin}
            className="flex-1 px-4 py-2.5 rounded-lg text-sm font-medium bg-white text-black hover:bg-white/90 transition-colors flex items-center justify-center gap-2"
          >
            <LogIn className="w-4 h-4" />
            <span>Login</span>
          </button>
        </div>
      </div>
    </div>
  );
};