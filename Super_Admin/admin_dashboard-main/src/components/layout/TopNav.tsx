import React, { useState, useRef, useEffect } from 'react';
import {
  Search,
  Calendar as CalendarIcon,
  Bell,
  UserPlus,
  Command,
  Menu,
  CheckCircle2,
  AlertCircle,
  X,
  ArrowRight
} from 'lucide-react';

import type { PageId } from '../../types';
import { mockTherapists, mockClients, mockBookings, mockResources } from '../../data/mockData';
import { getAdminAuth } from '../../lib/auth';

interface TopNavProps {
  onOpenSearch: () => void;
  onSelectPage: (page: PageId) => void;
  onToggleSidebar: () => void;
  onAddTherapist?: () => void;
}

export const TopNav: React.FC<TopNavProps> = ({
  onSelectPage,
  onToggleSidebar,
  onAddTherapist
}) => {
  const [showNotifications, setShowNotifications] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setIsSearchFocused(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const [liveNotifications, setLiveNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchAdminNotifications = () => {
    fetch('/api/notifications?role=ADMIN')
      .then(res => res.json())
      .then(data => {
        const list = Array.isArray(data?.notifications) ? data.notifications : [];
        setLiveNotifications(list);
        setUnreadCount(list.filter((n: any) => !n.read).length);
      })
      .catch(() => {});
  };

  useEffect(() => {
    fetchAdminNotifications();
    const interval = setInterval(fetchAdminNotifications, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleMarkAllNotificationsRead = () => {
    fetch('/api/notifications/mark-all-read', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: 'ADMIN' })
    }).then(() => {
      setLiveNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
    }).catch(() => {});
  };

  const displayNotifications = liveNotifications;

  const filteredTherapists = mockTherapists.filter((t) =>
    t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.profession.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredClients = mockClients.filter((c) =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredBookings = mockBookings.filter((b) =>
    b.clientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    b.therapistName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    b.bookingCode.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredResources = mockResources.filter((r) =>
    r.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const hasResults =
    filteredTherapists.length > 0 ||
    filteredClients.length > 0 ||
    filteredBookings.length > 0 ||
    filteredResources.length > 0;

  return (
    <header className="sticky top-0 z-20 bg-white/95 backdrop-blur-md border-b border-[#eef1f6] shadow-sm">
      {/* Primary Top Header Row */}
      <div className="h-14 sm:h-20 px-3 sm:px-8 flex items-center justify-between">
        {/* Mobile Toggle & Desktop Live Search */}
        <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0 mr-2" ref={searchContainerRef}>
          <button
            onClick={onToggleSidebar}
            className="p-1.5 sm:p-2 rounded-xl text-slate-600 hover:bg-slate-100 md:hidden shrink-0"
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
                placeholder="Search therapists, clients, bookings..."
                className="w-full pl-10 pr-10 py-2 sm:py-2.5 bg-slate-100/80 hover:bg-slate-100 focus:bg-white border border-slate-200/80 focus:border-[#5e2be2] rounded-full text-slate-800 placeholder-slate-400 text-xs sm:text-sm outline-none transition-all shadow-inner"
              />
              {searchQuery ? (
                <button
                  onClick={() => setSearchQuery('')}
                  className="p-1 text-slate-400 hover:text-slate-600 absolute right-3"
                >
                  <X className="w-4 h-4" />
                </button>
              ) : (
                <div className="hidden md:flex items-center gap-1 bg-white border border-slate-200/80 px-2 py-0.5 rounded-md text-[11px] font-semibold text-slate-400 shadow-2xs absolute right-3 pointer-events-none">
                  <Command className="w-3 h-3" />
                  <span>K</span>
                </div>
              )}
            </div>

            {/* Desktop Inline Search Dropdown Results */}
            {isSearchFocused && searchQuery.trim() !== '' && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-2xl border border-slate-100 p-4 z-50 max-h-[70vh] overflow-y-auto space-y-4 animate-fade-in">
                {!hasResults && (
                  <div className="text-center py-6 text-slate-400 text-xs font-medium">
                    No results match "<span className="font-bold">{searchQuery}</span>"
                  </div>
                )}

                {filteredTherapists.length > 0 && (
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block font-mono">
                      Therapists ({filteredTherapists.length})
                    </span>
                    {filteredTherapists.slice(0, 3).map((t) => (
                      <div
                        key={t.id}
                        onClick={() => {
                          onSelectPage('therapists');
                          setIsSearchFocused(false);
                          setSearchQuery('');
                        }}
                        className="p-2.5 bg-slate-50 hover:bg-purple-50/60 rounded-xl border border-slate-100 flex items-center justify-between cursor-pointer group transition-colors text-xs"
                      >
                        <div className="flex items-center gap-2.5">
                          <img src={t.photo} alt={t.name} className="w-7 h-7 rounded-full object-cover ring-2 ring-purple-100" />
                          <div>
                            <p className="font-bold text-slate-900 group-hover:text-[#5e2be2]">{t.name}</p>
                            <p className="text-[11px] text-slate-500">{t.profession}</p>
                          </div>
                        </div>
                        <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-[#5e2be2]" />
                      </div>
                    ))}
                  </div>
                )}

                {filteredClients.length > 0 && (
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block font-mono">
                      Clients ({filteredClients.length})
                    </span>
                    {filteredClients.slice(0, 3).map((c) => (
                      <div
                        key={c.id}
                        onClick={() => {
                          onSelectPage('clients');
                          setIsSearchFocused(false);
                          setSearchQuery('');
                        }}
                        className="p-2.5 bg-slate-50 hover:bg-purple-50/60 rounded-xl border border-slate-100 flex items-center justify-between cursor-pointer group transition-colors text-xs"
                      >
                        <div className="flex items-center gap-2.5">
                          <img src={c.avatar} alt={c.name} className="w-7 h-7 rounded-full object-cover ring-2 ring-purple-100" />
                          <div>
                            <p className="font-bold text-slate-900 group-hover:text-[#5e2be2]">{c.name}</p>
                            <p className="text-[11px] text-slate-500">{c.email}</p>
                          </div>
                        </div>
                        <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-[#5e2be2]" />
                      </div>
                    ))}
                  </div>
                )}

                {filteredBookings.length > 0 && (
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block font-mono">
                      Bookings ({filteredBookings.length})
                    </span>
                    {filteredBookings.slice(0, 3).map((b) => (
                      <div
                        key={b.id}
                        onClick={() => {
                          onSelectPage('bookings');
                          setIsSearchFocused(false);
                          setSearchQuery('');
                        }}
                        className="p-2.5 bg-slate-50 hover:bg-purple-50/60 rounded-xl border border-slate-100 flex items-center justify-between cursor-pointer group transition-colors text-xs"
                      >
                        <div>
                          <p className="font-bold text-slate-900">{b.bookingCode} - {b.clientName}</p>
                          <p className="text-[11px] text-slate-500">{b.service} with {b.therapistName}</p>
                        </div>
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-slate-100 text-slate-700">
                          {b.status}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
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
          >
            <CalendarIcon className="w-4 h-4 sm:w-5 sm:h-5 text-slate-600" />
          </button>

          {/* Notifications */}
          <div className="relative">
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="p-2 sm:p-2.5 rounded-full text-slate-600 hover:bg-slate-100 transition-colors relative"
              title="Notifications"
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
                        className="text-[11px] text-[#5e2be2] hover:underline font-bold mr-1 cursor-pointer"
                      >
                        Mark read
                      </button>
                    )}
                    <button
                      onClick={() => setShowNotifications(false)}
                      className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="divide-y divide-slate-100 max-h-80 overflow-y-auto my-2">
                  {displayNotifications.length === 0 ? (
                    <div className="py-8 text-center text-xs text-slate-400 font-medium">
                      No new notifications
                    </div>
                  ) : (
                    displayNotifications.map((item: any, idx: number) => {
                    const timeAgo = item.time || (item.createdAt ? new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Recently');
                    const isNewBooking = item.type === 'NEW_BOOKING_ALERT' || item.type === 'SESSION_SCHEDULED';

                    return (
                      <div
                        key={item.id || idx}
                        onClick={() => {
                          setShowNotifications(false);
                          onSelectPage('bookings');
                        }}
                        className={`py-3 flex items-start gap-3 hover:bg-slate-50/80 px-2 rounded-xl transition-colors cursor-pointer ${!item.read ? 'bg-purple-50/40' : ''}`}
                      >
                        {isNewBooking ? (
                          <CalendarIcon className="w-5 h-5 text-[#5e2be2] mt-0.5 flex-shrink-0" />
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
                          <span className="text-[10px] text-slate-400 font-medium">{timeAgo}</span>
                        </div>
                      </div>
                    );
                  })
                )}
                </div>

                <button
                  onClick={() => {
                    setShowNotifications(false);
                    onSelectPage('bookings');
                  }}
                  className="w-full text-center text-xs font-bold text-[#5e2be2] hover:text-[#4f28d9] py-2 bg-purple-50 rounded-xl cursor-pointer"
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
            className="px-3 py-1.5 sm:px-4 sm:py-2 bg-[#5e2be2] hover:bg-[#4f28d9] text-white rounded-full font-bold text-xs sm:text-sm shadow-md shadow-[#5e2be2]/25 transition-all hover:scale-105 active:scale-95 flex items-center justify-center gap-1.5"
            title="Add Therapist"
          >
            <UserPlus className="w-4 h-4" />
            <span className="hidden sm:inline">Add Therapist</span>
          </button>

          {/* Admin Profile */}
          <div className="flex items-center pl-1 sm:pl-2 border-l border-slate-200">
            <div className="relative cursor-pointer" onClick={() => onSelectPage('settings')}>
              <img
                src={getAdminAuth()?.avatarUrl || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100"}
                alt="Admin Profile"
                className="w-8 h-8 sm:w-10 sm:h-10 rounded-full object-cover ring-2 ring-[#5e2be2]/30"
              />
              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 sm:w-3 sm:h-3 bg-emerald-500 border-2 border-white rounded-full" />
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Live Inline Search Bar Strip (Positioned Below Header Row in Mobile View) */}
      <div className="px-3 pb-2.5 sm:hidden relative">
        <div className="relative flex items-center">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => setIsSearchFocused(true)}
            placeholder="Search therapists, clients, bookings..."
            className="w-full pl-10 pr-9 py-2 bg-slate-100/90 focus:bg-white border border-slate-200/90 focus:border-[#5e2be2] rounded-full text-slate-800 placeholder-slate-400 text-xs outline-none transition-all shadow-xs"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="p-1 text-slate-400 hover:text-slate-600 absolute right-3"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Mobile Inline Search Dropdown Results */}
        {isSearchFocused && searchQuery.trim() !== '' && (
          <div className="absolute top-full left-3 right-3 mt-1 bg-white rounded-2xl shadow-2xl border border-slate-100 p-3.5 z-50 max-h-[60vh] overflow-y-auto space-y-3 animate-fade-in">
            {!hasResults && (
              <div className="text-center py-4 text-slate-400 text-xs font-medium">
                No results match "<span className="font-bold">{searchQuery}</span>"
              </div>
            )}

            {filteredTherapists.length > 0 && (
              <div className="space-y-1">
                <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block font-mono">
                  Therapists ({filteredTherapists.length})
                </span>
                {filteredTherapists.slice(0, 3).map((t) => (
                  <div
                    key={t.id}
                    onClick={() => {
                      onSelectPage('therapists');
                      setIsSearchFocused(false);
                      setSearchQuery('');
                    }}
                    className="p-2 bg-slate-50 hover:bg-purple-50/60 rounded-xl border border-slate-100 flex items-center justify-between cursor-pointer group transition-colors text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <img src={t.photo} alt={t.name} className="w-6 h-6 rounded-full object-cover ring-1 ring-purple-100" />
                      <div>
                        <p className="font-bold text-slate-900 group-hover:text-[#5e2be2] text-xs">{t.name}</p>
                        <p className="text-[10px] text-slate-500">{t.profession}</p>
                      </div>
                    </div>
                    <ArrowRight className="w-3 h-3 text-slate-400 group-hover:text-[#5e2be2]" />
                  </div>
                ))}
              </div>
            )}

            {filteredClients.length > 0 && (
              <div className="space-y-1">
                <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block font-mono">
                  Clients ({filteredClients.length})
                </span>
                {filteredClients.slice(0, 3).map((c) => (
                  <div
                    key={c.id}
                    onClick={() => {
                      onSelectPage('clients');
                      setIsSearchFocused(false);
                      setSearchQuery('');
                    }}
                    className="p-2 bg-slate-50 hover:bg-purple-50/60 rounded-xl border border-slate-100 flex items-center justify-between cursor-pointer group transition-colors text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <img src={c.avatar} alt={c.name} className="w-6 h-6 rounded-full object-cover ring-1 ring-purple-100" />
                      <div>
                        <p className="font-bold text-slate-900 group-hover:text-[#5e2be2] text-xs">{c.name}</p>
                        <p className="text-[10px] text-slate-500">{c.email}</p>
                      </div>
                    </div>
                    <ArrowRight className="w-3 h-3 text-slate-400 group-hover:text-[#5e2be2]" />
                  </div>
                ))}
              </div>
            )}

            {filteredBookings.length > 0 && (
              <div className="space-y-1">
                <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block font-mono">
                  Bookings ({filteredBookings.length})
                </span>
                {filteredBookings.slice(0, 3).map((b) => (
                  <div
                    key={b.id}
                    onClick={() => {
                      onSelectPage('bookings');
                      setIsSearchFocused(false);
                      setSearchQuery('');
                    }}
                    className="p-2 bg-slate-50 hover:bg-purple-50/60 rounded-xl border border-slate-100 flex items-center justify-between cursor-pointer group transition-colors text-xs"
                  >
                    <div>
                      <p className="font-bold text-slate-900 text-xs">{b.bookingCode} - {b.clientName}</p>
                      <p className="text-[10px] text-slate-500">{b.service}</p>
                    </div>
                    <span className="text-[9px] px-2 py-0.5 rounded-full font-bold bg-slate-100 text-slate-700">
                      {b.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
};
