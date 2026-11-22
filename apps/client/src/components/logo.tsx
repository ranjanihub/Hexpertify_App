import React from 'react';

export function ExpertifyLogo({ className = "h-16 md:h-20" }: { className?: string }) {
  return (
    <div className="flex items-center select-none">
      <img
        src="/expertify-logo.png"
        onError={(e) => {
          const target = e.currentTarget;
          if (!target.dataset.triedFallback) {
            target.dataset.triedFallback = "true";
            target.src = "/logo.png";
          }
        }}
        alt="HEXPERTIFY"
        className={`max-w-full w-auto object-contain transition-transform hover:scale-[1.02] ${className}`}
      />
    </div>
  );
}
