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
    <CheckCircle 
      className={`${sizes[size]} text-blue-500 fill-blue-500 ${className}`}
      strokeWidth={0}
    />
  );
};