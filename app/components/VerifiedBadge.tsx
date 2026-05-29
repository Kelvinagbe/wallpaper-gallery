import { CheckCircle } from 'lucide-react';

type VerifiedBadgeProps = {
  size?: 'sm' | 'md' | 'lg' | number;
  variant?: 'filled' | 'outline';
  color?: string;
  className?: string;
};

export const VerifiedBadge = ({
  size = 'md',
  variant = 'filled',
  color = '#1D9BF0',
  className = '',
}: VerifiedBadgeProps) => {
  const sizes = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
  };

  // Numeric size path — for VerifiedAvatar overlay
  if (typeof size === 'number') {
    return (
      <div className={`relative inline-flex ${className}`}>
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          {variant === 'outline' ? (
            <circle cx="12" cy="12" r="9" stroke={color} strokeWidth="2" fill="none" />
          ) : (
            <circle cx="12" cy="12" r="10" fill={color} />
          )}
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
  }

  // Default string size path — existing behavior unchanged
  return (
    <div className={`relative inline-flex ${className}`}>
      <svg className={sizes[size]} viewBox="0 0 24 24" fill="none">
        {variant === 'outline' ? (
          <circle cx="12" cy="12" r="9" stroke={color} strokeWidth="2" fill="none" />
        ) : (
          <circle cx="12" cy="12" r="10" fill={color} />
        )}
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