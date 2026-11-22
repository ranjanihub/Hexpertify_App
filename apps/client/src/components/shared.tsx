import React from 'react';
import { motion } from 'framer-motion';
import { format } from 'date-fns';

export function safeFormatDate(dateStr?: string | null, formatStr = 'MMM d, yyyy'): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  try {
    return format(d, formatStr);
  } catch {
    return dateStr;
  }
}

export const pageTransition = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -10 },
  transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] as const }
};

export const staggerContainer = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05
    }
  }
};

export const staggerItem = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] as const } }
};

export function PageHeader({ 
  title, 
  description,
  badge,
  icon,
  children
}: { 
  title: string; 
  description?: string;
  badge?: string;
  icon?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl sm:rounded-3xl bg-gradient-to-r from-[#431bb5] via-[#5e2be2] to-[#361394] p-6 sm:p-7 md:p-8 text-white shadow-lg shadow-purple-900/10 overflow-hidden relative mb-6 border border-white/10">
      {/* Decorative ambient background glows */}
      <div className="absolute top-0 right-0 w-[350px] h-[350px] bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none" />
      <div className="absolute bottom-0 left-1/3 w-64 h-64 bg-purple-400/15 rounded-full blur-3xl translate-y-1/2 pointer-events-none" />

      <div className="relative z-10 flex flex-col md:flex-row gap-5 justify-between items-start md:items-center">
        <div className="space-y-1.5 flex-1 min-w-0">
          {(badge || icon) && (
            <div className="inline-flex items-center gap-2 bg-white/15 backdrop-blur-md px-3 py-0.5 rounded-full text-[11px] font-extrabold uppercase tracking-widest text-purple-100 border border-white/20 shadow-xs mb-1">
              {icon}
              {badge && <span>{badge}</span>}
            </div>
          )}
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight text-white leading-snug">
            {title}
          </h1>
          {description && (
            <p className="text-white/85 text-xs sm:text-sm md:text-base max-w-2xl leading-relaxed font-medium pt-0.5">
              {description}
            </p>
          )}
        </div>

        {children && (
          <div className="flex items-center gap-3 shrink-0 pt-2 md:pt-0">
            {children}
          </div>
        )}
      </div>
    </div>
  );
}
