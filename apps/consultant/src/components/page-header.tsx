import { ReactNode } from "react";

interface PageHeaderProps {
  title: string;
  description: string;
  badge?: string;
  icon?: ReactNode;
  children?: ReactNode;
}

export function PageHeader({ title, description, badge, icon, children }: PageHeaderProps) {
  return (
    <div className="rounded-2xl sm:rounded-3xl bg-gradient-to-r from-[#431bb5] via-[#5e2be2] to-[#361394] p-6 sm:p-7 md:p-8 text-white shadow-lg shadow-purple-900/10 overflow-hidden relative mb-6 border border-white/10">
      {/* Decorative ambient background glows */}
      <div className="absolute top-0 right-0 w-[350px] h-[350px] bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none" />
      <div className="absolute bottom-0 left-1/3 w-64 h-64 bg-purple-400/15 rounded-full blur-3xl translate-y-1/2 pointer-events-none" />

      <div className="relative z-10 flex flex-col md:flex-row gap-4 md:gap-5 justify-between items-start md:items-center">
        <div className="space-y-1.5 flex-1 min-w-0">
          {(badge || icon) && (
            <div className="inline-flex items-center gap-2 bg-white/15 backdrop-blur-md px-3 py-0.5 rounded-full text-[11px] font-extrabold uppercase tracking-widest text-purple-100 border border-white/20 shadow-xs mb-1">
              {icon}
              {badge && <span>{badge}</span>}
            </div>
          )}
          <h1 className="text-xl sm:text-3xl md:text-4xl font-extrabold tracking-tight text-white leading-snug">
            {title}
          </h1>
          <p className="text-white/85 text-xs sm:text-sm md:text-base max-w-2xl leading-relaxed font-medium pt-0.5">
            {description}
          </p>
        </div>

        {children && (
          <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 sm:gap-3 w-full md:w-auto shrink-0 pt-1 md:pt-0">
            {children}
          </div>
        )}
      </div>
    </div>
  );
}
