import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutGrid,
  CalendarCheck,
  CreditCard,
  TrendingUp,
  UserCheck,
  Clock,
  Users,
  Activity,
  ClipboardList,
  Folder,
  BookOpen,
  Award,
  Globe,
  FileCode,
  Settings,
  LogOut
} from 'lucide-react';
import { HexpertifyLogo } from '../common/HexpertifyLogo';
import type { PageId } from '../../types';
import { useAppContext } from '../../context/AppContext';
import { logoutAdmin, getAdminAuth } from '../../lib/auth';

interface SidebarProps {
  currentPage?: PageId;
  onSelectPage?: (page: PageId) => void;
  isOpen: boolean;
}

interface MenuItem {
  id: PageId;
  path: string;
  label: string;
  icon: React.ElementType;
  badge?: number | string;
}

const baseWorkspaceItems: MenuItem[] = [
  { id: 'dashboard', path: '/', label: 'Dashboard', icon: LayoutGrid },
  { id: 'bookings', path: '/bookings', label: 'Bookings', icon: CalendarCheck },
  { id: 'payments', path: '/payments', label: 'Payments', icon: CreditCard },
  { id: 'revenue', path: '/revenue', label: 'Revenue', icon: TrendingUp },
  { id: 'therapists', path: '/therapists', label: 'Therapists', icon: UserCheck },
  { id: 'availability', path: '/availability', label: 'Availability', icon: Clock },
  { id: 'clients', path: '/clients', label: 'Clients', icon: Users },
  { id: 'activities', path: '/activities', label: 'Activities', icon: Activity },
  { id: 'assessments', path: '/assessments', label: 'Assessments', icon: ClipboardList },
  { id: 'resources', path: '/resources', label: 'Resources', icon: BookOpen },
  { id: 'assets', path: '/assets', label: 'Assets', icon: Folder },
  { id: 'professions', path: '/professions', label: 'Professions', icon: Award }
];

const contentItems: MenuItem[] = [
  { id: 'homepage', path: '/homepage', label: 'Homepage', icon: Globe },
  { id: 'zombi', path: '/zombie-pages', label: 'Zombie Pages', icon: FileCode },
  { id: 'settings', path: '/settings', label: 'Settings', icon: Settings }
];

export const Sidebar: React.FC<SidebarProps> = ({ currentPage: _currentPage, onSelectPage, isOpen }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { clients } = useAppContext();

  const workspaceItems = baseWorkspaceItems.map((item) => {
    if (item.id === 'clients') {
      return { ...item, badge: clients.length };
    }
    return item;
  });

  const isItemActive = (item: MenuItem) => {
    if (item.id === 'dashboard') {
      return location.pathname === '/' || location.pathname === '/dashboard';
    }
    return location.pathname.startsWith(item.path);
  };

  const handleNavigate = (item: MenuItem) => {
    navigate(item.path);
    if (onSelectPage) {
      onSelectPage(item.id);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <aside
      className={`fixed left-0 top-0 bottom-0 z-30 w-64 bg-white border-r border-[#eef1f6] flex flex-col transition-transform duration-300 ease-in-out ${
        isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
      }`}
      style={{ boxShadow: '2px 0 16px rgba(0, 0, 0, 0.02)' }}
    >
      {/* Brand Header */}
      <div className="h-24 px-4 flex items-center justify-start border-b border-[#f1f5f9] overflow-hidden">
        <HexpertifyLogo
          size="lg"
          onClick={() => {
            navigate('/');
            if (onSelectPage) onSelectPage('dashboard');
          }}
        />
      </div>

      {/* Navigation Links */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-6">
        {/* Workspace Section */}
        <div>
          <div className="px-3 mb-2 text-[11px] font-bold tracking-widest text-slate-400 uppercase">
            WORKSPACE
          </div>
          <nav className="space-y-1">
            {workspaceItems.map((item) => {
              const Icon = item.icon;
              const isActive = isItemActive(item);
              return (
                <button
                  key={item.id}
                  onClick={() => handleNavigate(item)}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl font-semibold text-sm transition-all duration-150 ${
                    isActive
                      ? 'bg-[#5e2be2] text-white shadow-md shadow-[#5e2be2]/25'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon
                      className={`w-4 h-4 ${
                        isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-600'
                      }`}
                    />
                    <span>{item.label}</span>
                  </div>
                  {item.badge && (
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                        isActive
                          ? 'bg-white/20 text-white'
                          : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Content Section */}
        <div>
          <div className="px-3 mb-2 text-[11px] font-bold tracking-widest text-slate-400 uppercase">
            CONTENT
          </div>
          <nav className="space-y-1">
            {contentItems.map((item) => {
              const Icon = item.icon;
              const isActive = isItemActive(item);
              return (
                <button
                  key={item.id}
                  onClick={() => handleNavigate(item)}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl font-semibold text-sm transition-all duration-150 ${
                    isActive
                      ? 'bg-[#5e2be2] text-white shadow-md shadow-[#5e2be2]/25'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon
                      className={`w-4 h-4 ${
                        isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-600'
                      }`}
                    />
                    <span>{item.label}</span>
                  </div>
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Admin Quick Profile Footer */}
      <div className="p-4 border-t border-[#f1f5f9] bg-slate-50/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <div className="relative shrink-0">
              <img
                src={getAdminAuth()?.avatarUrl || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100"}
                alt="Admin Avatar"
                className="w-9 h-9 rounded-full object-cover ring-2 ring-[#5e2be2]/20"
              />
              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 rounded-full ring-2 ring-white" />
            </div>
            <div className="leading-tight min-w-0">
              <p className="text-xs font-bold text-slate-900 truncate">{getAdminAuth()?.name || "Super Admin"}</p>
              <p className="text-[11px] text-slate-500 font-medium truncate">{getAdminAuth()?.email || "Master Control"}</p>
            </div>
          </div>
          <button
            onClick={() => {
              logoutAdmin();
              window.location.href = '/client/login';
            }}
            title="Sign Out"
            className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
};
