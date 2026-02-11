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
    <svg 
      className={`${sizes[size]} ${className}`} 
      viewBox="0 0 22 22" 
      fill="none"
    >
      <circle cx="11" cy="11" r="11" fill="#1D9BF0"/>
      <path 
        d="M7 11L10 14L15 8" 
        stroke="white" 
        strokeWidth="2" 
        strokeLinecap="round" 
        strokeLinejoin="round"
      />
    </svg>
  );
};