import { X } from 'lucide-react';
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
    router.push('/auth/login');
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.25)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          backgroundColor: '#ffffff',
          border: '1px solid rgba(0,0,0,0.07)',
          borderRadius: '16px',
          padding: '28px',
          width: '100%',
          maxWidth: '360px',
          boxShadow: '0 8px 40px rgba(0,0,0,0.10)',
          animation: 'slideUp 0.22s cubic-bezier(0.16, 1, 0.3, 1) both',
        }}
      >
        <style>{`
          @keyframes slideUp {
            from { opacity: 0; transform: translateY(12px); }
            to   { opacity: 1; transform: translateY(0); }
          }
        `}</style>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
          <span style={{
            fontSize: '11px',
            fontWeight: 500,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: 'rgba(0,0,0,0.3)',
          }}>
            Authentication
          </span>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '2px',
              color: 'rgba(0,0,0,0.3)',
              display: 'flex',
              alignItems: 'center',
              transition: 'color 0.15s',
            }}
            onMouseEnter={e => (e.currentTarget.style.color = 'rgba(0,0,0,0.7)')}
            onMouseLeave={e => (e.currentTarget.style.color = 'rgba(0,0,0,0.3)')}
          >
            <X size={16} strokeWidth={1.5} />
          </button>
        </div>

        {/* Body */}
        <p style={{
          fontSize: '20px',
          fontWeight: 500,
          color: '#0a0a0a',
          lineHeight: 1.3,
          marginBottom: '8px',
          letterSpacing: '-0.01em',
        }}>
          Sign in to continue
        </p>
        <p style={{
          fontSize: '13.5px',
          color: 'rgba(0,0,0,0.45)',
          lineHeight: 1.55,
          marginBottom: '28px',
        }}>
          You need to be signed in to {action}.
        </p>

        {/* Divider */}
        <div style={{
          height: '1px',
          backgroundColor: 'rgba(0,0,0,0.06)',
          marginBottom: '20px',
        }} />

        {/* Actions */}
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={onClose}
            style={{
              flex: 1,
              padding: '10px 16px',
              borderRadius: '8px',
              fontSize: '13.5px',
              fontWeight: 500,
              color: 'rgba(0,0,0,0.45)',
              background: 'none',
              border: '1px solid rgba(0,0,0,0.1)',
              cursor: 'pointer',
              transition: 'all 0.15s',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.color = 'rgba(0,0,0,0.75)';
              e.currentTarget.style.borderColor = 'rgba(0,0,0,0.2)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.color = 'rgba(0,0,0,0.45)';
              e.currentTarget.style.borderColor = 'rgba(0,0,0,0.1)';
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleLogin}
            style={{
              flex: 1,
              padding: '10px 16px',
              borderRadius: '8px',
              fontSize: '13.5px',
              fontWeight: 500,
              color: '#fff',
              background: '#0a0a0a',
              border: 'none',
              cursor: 'pointer',
              transition: 'opacity 0.15s',
            }}
            onMouseEnter={e => (e.currentTarget.style.opacity = '0.82')}
            onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
          >
            Sign in
          </button>
        </div>
      </div>
    </div>
  );
};
