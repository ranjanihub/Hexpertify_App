import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  Search,
  Calendar as CalendarIcon,
  Bell,
  UserPlus,
  Menu,
  CheckCircle2,
  AlertCircle,
  X,
  ArrowRight
} from 'lucide-react';

import type { PageId } from '../../types';
import { useAppContext } from '../../context/AppContext';
import { api } from '../../lib/apiClient';
import type { ResourceItem } from '../../types';
import { adminAvatarUrl, adminInitials, getAdminAuth, getApiAuthHeaders } from '../../lib/auth';
import { searchRecords, type SearchHit } from '../../lib/global-search';

/** Pages a notification may open */
const ADMIN_PAGES: PageId[] = ['dashboard', 'bookings', 'payments', 'transactions', 'revenue', 'therapists', 'clients'];

interface TopNavProps {
  onOpenSearch: () => void;
  /** Opens a page; `path` (with ?q=) opens it filtered to one record */
  onSelectPage: (page: PageId, path?: string) => void;
  onToggleSidebar: () => void;
  onAddTherapist?: () => void;
}

const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/i.test(navigator.platform || navigator.userAgent);

export const TopNav: React.FC<TopNavProps> = ({
  onOpenSearch,
  onSelectPage,
  onToggleSidebar,
  onAddTherapist
}) => {
  const [showNotifications, setShowNotifications] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  // Search covers the live records loaded by the app
  const { therapists, clients, bookings } = useAppContext();
  const [resources, setResources] = useState<ResourceItem[]>([]);
  const resourcesRequested = useRef(false);
  useEffect(() => {
    if (!searchQuery.trim() || resourcesRequested.current) return;
    resourcesRequested.current = true;
    api.get('/api/admin/resources')
      .then((data: any) => setResources(Array.isArray(data?.resources) ? data.resources : []))
      .catch(() => { resourcesRequested.current = false; });
  }, [searchQuery]);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const mobileSearchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      const inside = [searchContainerRef.current, mobileSearchRef.current].some((el) => el && el.contains(target));
      if (!inside) {
        setIsSearchFocused(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const [liveNotifications, setLiveNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notificationError, setNotificationError] = useState<string | null>(null);
  // A photo that fails to load falls back to initials
  const [avatarFailed, setAvatarFailed] = useState(false);
  const [isMarkingRead, setIsMarkingRead] = useState(false);

  // The admin API token identifies the caller; without it the backend returns no admin notifications
  const fetchAdminNotifications = () => {
    fetch('/api/notifications?role=ADMIN', { headers: getApiAuthHeaders() })
      .then(async (res) => {
        const data = await res.json().catch(() => null);
        if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
        return data;
      })
      .then(data => {
        const list = Array.isArray(data?.notifications) ? data.notifications : [];
        setLiveNotifications(list);
        setUnreadCount(list.filter((n: any) => !n.read).length);
      })
      .catch(() => {});
  };

  useEffect(() => {
    fetchAdminNotifications();
    const interval = setInterval(fetchAdminNotifications, 15000);
    window.addEventListener('focus', fetchAdminNotifications);
    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', fetchAdminNotifications);
    };
  }, []);

  /** Shown as read only after the server saved it; a refusal (e.g. signed out) is shown and nothing changes */
  const handleMarkAllNotificationsRead = async () => {
    setNotificationError(null);
    setIsMarkingRead(true);
    try {
      const res = await fetch('/api/notifications/mark-all-read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getApiAuthHeaders() },
        body: JSON.stringify({ role: 'ADMIN' })
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || data?.success === false) {
        throw new Error(res.status === 401 ? 'Your session has ended. Please sign in again.' : data?.error || `The server refused (HTTP ${res.status}).`);
      }
      setLiveNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (err: any) {
      setNotificationError(`Not marked as read: ${err?.message || 'the server could not be reached.'}`);
    } finally {
      setIsMarkingRead(false);
    }
  };

  // Opens the page its link names (bookings, payments, ...) and marks the notification read once the server agrees
  const handleNotificationClick = (item: any) => {
    setShowNotifications(false);
    if (!item.read && item.id) {
      fetch(`/api/notifications/${encodeURIComponent(item.id)}/read`, { method: 'PUT', headers: getApiAuthHeaders() })
        .then((res) => {
          if (!res.ok) return;
          setLiveNotifications(prev => prev.map(n => (n.id === item.id ? { ...n, read: true } : n)));
          setUnreadCount(c => Math.max(0, c - 1));
        })
        .catch(() => {});
    }
    const page = String(item.link || 'bookings').replace(/^\/?(admin\/)?/, '') as PageId;
    onSelectPage(ADMIN_PAGES.includes(page) ? page : 'bookings');
  };

  const formatTime = (value?: string) => {
    const d = value ? new Date(value) : null;
    if (!d || isNaN(d.getTime())) return '';
    const minutes = Math.round((Date.now() - d.getTime()) / 60000);
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes} min ago`;
    if (minutes < 24 * 60) return `${Math.round(minutes / 60)} h ago`;
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', timeZone: 'Asia/Kolkata' });
  };

  const displayNotifications = liveNotifications;

  const results = useMemo(
    () => searchRecords(searchQuery, { therapists, clients, bookings, resources }),
    [searchQuery, therapists, clients, bookings, resources]
  );
  const groups: { label: string; hits: SearchHit[] }[] = [
    { label: 'Therapists', hits: results.therapists },
    { label: 'Clients', hits: results.clients },
    { label: 'Bookings', hits: results.bookings },
    { label: 'Resources', hits: results.resources }
  ];

  const openHit = (hit: SearchHit) => {
    onSelectPage(hit.page, hit.path);
    setIsSearchFocused(false);
    setSearchQuery('');
  };

  /** The dropdown under the search box (desktop and phone) */
  const renderResults = (compact: boolean) => (
    <>
      {results.total === 0 && (
        <div className={`text-center ${compact ? 'py-4' : 'py-6'} text-slate-400 text-xs font-medium`}>
          No results match "<span className="font-bold">{searchQuery}</span>"
        </div>
      )}
      {groups.map(
        (g) =>
          g.hits.length > 0 && (
            <div key={g.label} className={compact ? 'space-y-1' : 'space-y-1.5'}>
              <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block font-mono">
                {g.label} ({g.hits.length})
              </span>
              {g.hits.slice(0, 3).map((hit) => (
                <button
                  type="button"
                  key={hit.key}
                  onClick={() => openHit(hit)}
                  className={`w-full text-left ${compact ? 'p-2' : 'p-2.5'} bg-slate-50 hover:bg-purple-50/60 focus:bg-purple-50/60 rounded-xl border border-slate-100 flex items-center justify-between gap-2 cursor-pointer group transition-colors text-xs outline-none`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    {hit.image && (
                      <img src={hit.image} alt="" className={`${compact ? 'w-6 h-6' : 'w-7 h-7'} rounded-full object-cover ring-2 ring-purple-100 shrink-0`} />
                    )}
                    <div className="min-w-0">
                      <p className="font-bold text-slate-900 group-hover:text-[#450bc8] truncate">{hit.title}</p>
                      <p className={`${compact ? 'text-[10px]' : 'text-[11px]'} text-slate-500 truncate`}>{hit.subtitle}</p>
                    </div>
                  </div>
                  {hit.badge ? (
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-slate-100 text-slate-700 shrink-0">{hit.badge}</span>
                  ) : (
                    <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-[#450bc8] shrink-0" />
                  )}
                </button>
              ))}
            </div>
          )
      )}
    </>
  );

  const onSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      const first = groups.find((g) => g.hits.length)?.hits[0];
      if (first) openHit(first);
    } else if (e.key === 'Escape') {
      setIsSearchFocused(false);
    }
  };

  const avatar = adminAvatarUrl();

  return (
    <header className="sticky top-0 z-20 bg-white/95 backdrop-blur-md border-b border-[#eef1f6] shadow-sm">
      {/* Primary Top Header Row */}
      <div className="h-14 sm:h-20 px-3 sm:px-8 flex items-center justify-between">
        {/* Mobile Toggle & Desktop Live Search */}
        <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0 mr-2" ref={searchContainerRef}>
          <button
            onClick={onToggleSidebar}
            className="p-2 rounded-xl text-slate-600 hover:bg-slate-100 lg:hidden shrink-0"
            aria-label="Open sidebar menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Global Inline Search Bar (Visible in Header on Desktop) */}
          <div className="hidden sm:block relative w-full max-w-xl">
            <div className="relative flex items-center">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => setIsSearchFocused(true)}
                onKeyDown={onSearchKeyDown}
                placeholder="Search therapists, clients, bookings..."
                aria-label="Search therapists, clients, bookings"
                className="w-full pl-10 pr-20 py-2 sm:py-2.5 bg-slate-100/80 hover:bg-slate-100 focus:bg-white border border-slate-200/80 focus:border-[#450bc8] rounded-full text-slate-800 placeholder-slate-400 text-xs sm:text-sm outline-none transition-all shadow-inner"
              />
              {searchQuery ? (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="p-1 text-slate-400 hover:text-slate-600 absolute right-3"
                  aria-label="Clear search"
                >
                  <X className="w-4 h-4" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onOpenSearch}
                  className="absolute right-3 px-1.5 py-0.5 bg-white border border-slate-200 rounded-md text-[10px] font-semibold text-slate-500 hover:text-[#450bc8]"
                  title="Open search (Ctrl+K / Cmd+K)"
                >
                  {isMac ? '⌘K' : 'Ctrl K'}
                </button>
              )}
            </div>

            {/* Desktop Inline Search Dropdown Results */}
            {isSearchFocused && searchQuery.trim() !== '' && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-2xl border border-slate-100 p-4 z-50 max-h-[70vh] overflow-y-auto space-y-4 animate-fade-in">
                {renderResults(false)}
              </div>
            )}
          </div>
        </div>

        {/* Right Navigation Actions */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* Calendar Quick Access */}
          <button
            onClick={() => onSelectPage('bookings')}
            className="p-2 sm:p-2.5 rounded-full text-slate-600 hover:bg-slate-100 transition-colors relative"
            title="View Schedule Calendar"
            aria-label="View bookings"
          >
            <CalendarIcon className="w-4 h-4 sm:w-5 sm:h-5 text-slate-600" />
          </button>

          {/* Notifications */}
          <div className="relative">
            <button
              onClick={() => {
                setNotificationError(null);
                setShowNotifications(!showNotifications);
              }}
              className="p-2 sm:p-2.5 rounded-full text-slate-600 hover:bg-slate-100 transition-colors relative"
              title="Notifications"
              aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : 'Notifications'}
            >
              <Bell className="w-4 h-4 sm:w-5 sm:h-5 text-slate-600" />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 sm:top-2 sm:right-2 min-w-[16px] h-4 px-1 bg-purple-600 text-white text-[9px] font-black rounded-full ring-2 ring-white flex items-center justify-center animate-pulse">
                  {unreadCount}
                </span>
              )}
            </button>

            {/* Notifications Panel Dropdown */}
            {showNotifications && (
              <div className="fixed inset-x-3 top-16 sm:absolute sm:inset-auto sm:right-0 sm:mt-3 sm:w-96 bg-white rounded-2xl shadow-xl border border-slate-100 p-4 z-50 animate-fade-in">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <h4 className="font-bold text-slate-900">Notifications</h4>
                    {unreadCount > 0 ? (
                      <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-bold">
                        {unreadCount} New
                      </span>
                    ) : (
                      <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full font-bold">
                        All Read
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5">
                    {unreadCount > 0 && (
                      <button
                        type="button"
                        onClick={handleMarkAllNotificationsRead}
                        disabled={isMarkingRead}
                        className="text-[11px] text-[#450bc8] hover:underline font-bold mr-1 cursor-pointer disabled:opacity-50"
                      >
                        {isMarkingRead ? 'Marking…' : 'Mark read'}
                      </button>
                    )}
                    <button
                      onClick={() => setShowNotifications(false)}
                      className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
                      aria-label="Close notifications"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {notificationError && (
                  <p role="alert" className="mt-2 text-[11px] font-semibold text-rose-600 bg-rose-50 border border-rose-200 rounded-lg px-2.5 py-1.5">
                    {notificationError}
                  </p>
                )}

                <div className="divide-y divide-slate-100 max-h-80 overflow-y-auto my-2">
                  {displayNotifications.length === 0 ? (
                    <div className="py-8 text-center text-xs text-slate-400 font-medium">
                      No new notifications
                    </div>
                  ) : (
                    displayNotifications.map((item: any, idx: number) => {
                    const timeAgo = formatTime(item.createdAt);
                    const isNewBooking = item.type === 'NEW_BOOKING_ALERT' || item.type === 'SESSION_SCHEDULED';

                    return (
                      <button
                        type="button"
                        key={item.id || idx}
                        onClick={() => handleNotificationClick(item)}
                        className={`w-full text-left py-3 flex items-start gap-3 hover:bg-slate-50/80 px-2 rounded-xl transition-colors cursor-pointer ${!item.read ? 'bg-purple-50/40' : ''}`}
                      >
                        {isNewBooking ? (
                          <CalendarIcon className="w-5 h-5 text-[#450bc8] mt-0.5 flex-shrink-0" />
                        ) : item.type === 'warning' ? (
                          <AlertCircle className="w-5 h-5 text-amber-500 mt-0.5 flex-shrink-0" />
                        ) : item.type === 'success' ? (
                          <CheckCircle2 className="w-5 h-5 text-emerald-500 mt-0.5 flex-shrink-0" />
                        ) : (
                          <Bell className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" />
                        )}
                        <div>
                          <p className="text-xs font-bold text-slate-900">{item.title}</p>
                          <p className="text-xs text-slate-500 leading-snug">{item.message || item.subtitle}</p>
                          {timeAgo && <span className="text-[10px] text-slate-400 font-medium">{timeAgo}</span>}
                        </div>
                      </button>
                    );
                  })
                )}
                </div>

                <button
                  onClick={() => {
                    setShowNotifications(false);
                    onSelectPage('bookings');
                  }}
                  className="w-full text-center text-xs font-bold text-[#450bc8] hover:text-[#3a0aa8] py-2 bg-purple-50 rounded-xl cursor-pointer"
                >
                  View Bookings & Schedule
                </button>
              </div>
            )}
          </div>

          {/* Add Therapist Button */}
          <button
            onClick={() => {
              if (onAddTherapist) {
                onAddTherapist();
              } else {
                onSelectPage('therapists');
              }
            }}
            className="px-3 py-1.5 sm:px-4 sm:py-2 bg-[#450bc8] hover:bg-[#3a0aa8] text-white rounded-full font-bold text-xs sm:text-sm shadow-md shadow-[#450bc8]/25 transition-all hover:scale-105 active:scale-95 flex items-center justify-center gap-1.5"
            title="Add Therapist"
          >
            <UserPlus className="w-4 h-4" />
            <span className="hidden sm:inline">Add Therapist</span>
          </button>

          {/* Admin Profile (opens Settings) */}
          <div className="flex items-center pl-1 sm:pl-2 border-l border-slate-200">
            <button
              type="button"
              className="relative cursor-pointer rounded-full"
              onClick={() => onSelectPage('settings')}
              title={getAdminAuth()?.email ? `Signed in as ${getAdminAuth()?.email}` : 'Settings'}
              aria-label="Account settings"
            >
              {avatar && !avatarFailed ? (
                <img
                  src={avatar}
                  referrerPolicy="no-referrer"
                  onError={() => setAvatarFailed(true)}
                  alt=""
                  className="w-8 h-8 sm:w-10 sm:h-10 rounded-full object-cover ring-2 ring-[#450bc8]/30"
                />
              ) : (
                <span className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-[#450bc8] text-white text-xs sm:text-sm font-extrabold flex items-center justify-center ring-2 ring-[#450bc8]/30">
                  {adminInitials()}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Live Inline Search Bar Strip (Positioned Below Header Row in Mobile View) */}
      <div className="px-3 pb-2.5 sm:hidden relative" ref={mobileSearchRef}>
        <div className="relative flex items-center">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => setIsSearchFocused(true)}
            onKeyDown={onSearchKeyDown}
            placeholder="Search therapists, clients, bookings..."
            aria-label="Search therapists, clients, bookings"
            className="w-full pl-10 pr-9 py-2 bg-slate-100/90 focus:bg-white border border-slate-200/90 focus:border-[#450bc8] rounded-full text-slate-800 placeholder-slate-400 text-xs outline-none transition-all shadow-xs"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="p-1 text-slate-400 hover:text-slate-600 absolute right-3"
              aria-label="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Mobile Inline Search Dropdown Results */}
        {isSearchFocused && searchQuery.trim() !== '' && (
          <div className="absolute top-full left-3 right-3 mt-1 bg-white rounded-2xl shadow-2xl border border-slate-100 p-3.5 z-50 max-h-[60vh] overflow-y-auto space-y-3 animate-fade-in">
            {renderResults(true)}
          </div>
        )}
      </div>
    </header>
  );
};
