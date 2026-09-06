import React from 'react';

interface HexpertifyLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  onClick?: () => void;
}

export const HexpertifyLogo: React.FC<HexpertifyLogoProps> = ({
  size = 'lg',
  className = '',
  onClick
}) => {
  const heightClass = {
    sm: 'h-10 md:h-12',
    md: 'h-14 md:h-16',
    lg: 'h-16 md:h-20',
    xl: 'h-20 md:h-24'
  }[size];

  return (
    <div
      onClick={onClick}
      className={`inline-flex items-center select-none ${onClick ? 'cursor-pointer' : ''} ${className}`}
    >
      <img
        src="/logo.png"
        onError={(e) => {
          const target = e.currentTarget;
          if (!target.dataset.triedFallback) {
            target.dataset.triedFallback = "true";
            target.src = "/hexpertify-logo.png";
          }
        }}
        alt="HEXPERTIFY ANYTIME,ANYWHERE"
        className={`${heightClass} max-w-full w-auto object-contain transition-transform hover:scale-[1.02]`}
      />
    </div>
  );
};
