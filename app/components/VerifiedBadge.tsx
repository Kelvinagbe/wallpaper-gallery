import { CheckCircle } from 'lucide-react';

type VerifiedBadgeProps = {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
};

export const VerifiedBadge = ({ size = 'md', className = '' }: VerifiedBadgeProps) => {
  const sizes = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
  };

  return (
    <div className={`relative inline-flex ${className}`}>
      {/* Blue circle background */}
      <svg className={sizes[size]} viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="10" fill="#1D9BF0" />
        <path
          d="M9 12l2 2 4-4"
          stroke="white"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </svg>
    </div>
  );
};