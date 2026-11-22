import React, { useState } from 'react';
import {
  Video,
  Users,
  FileText,
  Clock,
  TrendingUp,
  CreditCard,
  UserCheck,
  ArrowUpRight,
  CheckCircle2,
  AlertCircle,
  PlayCircle,
  ChevronRight,
  User,
  Search
} from 'lucide-react';
import type { PageId } from '../types';
import { useAppContext } from '../context/AppContext';

interface DashboardViewProps {
  onSelectPage: (page: PageId) => void;
}


/** "2026-11-14" for a date, in India time (booking dates are India-time days) */
function isoDay(d: Date): string {
  return d.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
}

/** First and last day ("YYYY-MM-DD") of the selected count range */
function rangeOf(range: 'all' | 'today' | 'week' | 'month' | 'day', day: string): [string, string] {
  const today = isoDay(new Date());
  if (range === 'today') return [today, today];
  if (range === 'day') return [day, day];
  const [y, m, d] = today.split('-').map(Number);
  if (range === 'month') {
    const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
    return [`${today.slice(0, 8)}01`, `${today.slice(0, 8)}${String(last).padStart(2, '0')}`];
  }
  if (range === 'week') {
    // Monday to Sunday of the current week
    const base = new Date(Date.UTC(y, m - 1, d));
    const offset = (base.getUTCDay() + 6) % 7;
    const monday = new Date(base.getTime() - offset * 86400000);
    const sunday = new Date(monday.getTime() + 6 * 86400000);
    return [monday.toISOString().slice(0, 10), sunday.toISOString().slice(0, 10)];
  }
  return ['', ''];
}

const COUNT_RANGES: { key: 'all' | 'today' | 'week' | 'month'; label: string }[] = [
  { key: 'all', label: 'All time' },
  { key: 'today', label: 'Today' },
  { key: 'week', label: 'This week' },
  { key: 'month', label: 'This month' }
];

export const DashboardView: React.FC<DashboardViewProps> = ({ onSelectPage }) => {
  const { bookings, metrics, auditLogs, updateBookingStatus } = useAppContext();
  const [scheduleSearch, setScheduleSearch] = useState('');
  const [scheduleFilter, setScheduleFilter] = useState<'All' | 'Scheduled' | 'Completed' | 'Rescheduled'>('All');

  // Day filter for the session count cards
  const [countRange, setCountRange] = useState<'all' | 'today' | 'week' | 'month' | 'day'>('all');
  const [countDay, setCountDay] = useState(() => isoDay(new Date()));

  // Real booking counts for the session summary cards (abandoned checkouts are left out)
  const sessionCounts = React.useMemo(() => {
    const real = bookings.filter(b => b.status !== 'Pending Payment' && b.status !== 'Expired');
    // Website bookings without a session time have no date, so they are counted for any range
    const toBeScheduled = real.filter(b => b.toBeScheduled && b.status !== 'Cancelled' && b.status !== 'Completed').length;

    const [from, to] = rangeOf(countRange, countDay);
    const inRange = real.filter(b => !b.toBeScheduled && (countRange === 'all' || (/^\d{4}-\d{2}-\d{2}$/.test(b.date) && b.date >= from && b.date <= to)));
    const scheduled = inRange.filter(b => b.status === 'Scheduled' || b.status === 'Rescheduled' || b.status === 'Pending').length;
    const completed = inRange.filter(b => b.status === 'Completed').length;
    const cancelled = inRange.filter(b => b.status === 'Cancelled').length;
    const noShows = inRange.filter(b => b.status === 'No Show - Client' || b.status === 'No Show - Consultant').length;
    return { total: inRange.length, scheduled, toBeScheduled, completed, cancelled, noShows };
  }, [bookings, countRange, countDay]);

  const todayFormatted = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric'
  });

  // Filtered schedule bookings
  const filteredBookings = bookings.filter((b) => {
    const matchesSearch =
      b.clientName.toLowerCase().includes(scheduleSearch.toLowerCase()) ||
      b.therapistName.toLowerCase().includes(scheduleSearch.toLowerCase()) ||
      b.service.toLowerCase().includes(scheduleSearch.toLowerCase());

    const matchesStatus = scheduleFilter === 'All' || b.status === scheduleFilter;

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-8 pb-12 animate-fade-in">
      {/* Header Banner */}
      <div className="relative rounded-2xl sm:rounded-[28px] bg-gradient-to-r from-[#4f28d9] via-[#5e2be2] to-[#3b1799] p-5 sm:p-8 text-white shadow-xl overflow-hidden">
        {/* Background Decorative Circles */}
        <div className="absolute -right-12 -top-12 w-96 h-96 bg-white/5 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute right-1/3 -bottom-20 w-80 h-80 bg-purple-400/10 rounded-full blur-xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4 sm:gap-6">
          <div className="space-y-3 sm:space-y-4 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/15 backdrop-blur-md border border-white/20 text-xs font-semibold tracking-wide">
              <span>{todayFormatted}</span>
            </div>

            <h1 className="text-2xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight leading-tight">
              Welcome back, Admin
            </h1>

            <p className="text-purple-100/90 text-xs sm:text-sm md:text-base leading-relaxed font-normal">
              Hexpertify Operations Hub · <span className="font-semibold text-white">{metrics.sessionsTodayCount} Sessions Today</span> · <span className="font-semibold text-white">₹{metrics.pendingPayoutsAmount.toLocaleString()} Pending Payouts</span> · <span className="font-semibold text-white">{metrics.pendingReportsCount} Pending Reports</span>
            </p>

            <div className="pt-1 sm:pt-2 flex flex-wrap items-center gap-2.5 sm:gap-3">
              <button
                onClick={() => onSelectPage('payments')}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-white bg-white/15 hover:bg-white/25 px-4 py-2 rounded-full border border-white/20 transition-all shadow-sm active:scale-95"
              >
                <span>Release Payouts</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={() => onSelectPage('bookings')}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-white/90 hover:text-white bg-black/20 hover:bg-black/30 px-4 py-2 rounded-full border border-white/10 transition-all"
              >
                <span>View Full Calendar</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* KPI Cards Row (2x2 Grid on Mobile) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5">
        {/* Card 1: Sessions Today */}
        <div
          onClick={() => onSelectPage('bookings')}
          className="bg-white rounded-xl sm:rounded-2xl p-3.5 sm:p-5 border border-slate-100 shadow-sm card-hover flex flex-col justify-between cursor-pointer transition-all hover:border-purple-200"
        >
          <div className="flex items-center justify-between mb-2.5 sm:mb-4">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Video className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <span className="text-[10px] sm:text-xs font-extrabold text-emerald-600 bg-emerald-50 px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full border border-emerald-100">
              +2
            </span>
          </div>
          <div>
            <p className="text-[11px] sm:text-xs font-semibold text-slate-500 mb-0.5 truncate">Sessions today</p>
            <h3 className="text-xl sm:text-2xl font-extrabold text-slate-900">{metrics.sessionsTodayCount}</h3>
          </div>
        </div>

        {/* Card 2: Active Clients */}
        <div
          onClick={() => onSelectPage('clients')}
          className="bg-white rounded-xl sm:rounded-2xl p-3.5 sm:p-5 border border-slate-100 shadow-sm card-hover flex flex-col justify-between cursor-pointer transition-all hover:border-purple-200"
        >
          <div className="flex items-center justify-between mb-2.5 sm:mb-4">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Users className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <span className="text-[10px] sm:text-xs font-extrabold text-emerald-600 bg-emerald-50 px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full border border-emerald-100">
              +3
            </span>
          </div>
          <div>
            <p className="text-[11px] sm:text-xs font-semibold text-slate-500 mb-0.5 truncate">Active clients</p>
            <h3 className="text-xl sm:text-2xl font-extrabold text-slate-900">{metrics.activeClientsCount}</h3>
          </div>
        </div>

        {/* Card 3: Pending Reports */}
        <div
          onClick={() => onSelectPage('payments')}
          className="bg-white rounded-xl sm:rounded-2xl p-3.5 sm:p-5 border border-slate-100 shadow-sm card-hover flex flex-col justify-between cursor-pointer transition-all hover:border-purple-200"
        >
          <div className="flex items-center justify-between mb-2.5 sm:mb-4">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <FileText className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <span className="text-[10px] sm:text-xs font-extrabold text-amber-600 bg-amber-50 px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full border border-amber-100">
              Action Req.
            </span>
          </div>
          <div>
            <p className="text-[11px] sm:text-xs font-semibold text-slate-500 mb-0.5 truncate">Pending reports</p>
            <h3 className="text-xl sm:text-2xl font-extrabold text-slate-900">{metrics.pendingReportsCount}</h3>
          </div>
        </div>

        {/* Card 4: Therapy Hours */}
        <div
          onClick={() => onSelectPage('bookings')}
          className="bg-white rounded-xl sm:rounded-2xl p-3.5 sm:p-5 border border-slate-100 shadow-sm card-hover flex flex-col justify-between cursor-pointer transition-all hover:border-purple-200"
        >
          <div className="flex items-center justify-between mb-2.5 sm:mb-4">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Clock className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <span className="text-[10px] sm:text-xs font-extrabold text-emerald-600 bg-emerald-50 px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full border border-emerald-100">
              +6h
            </span>
          </div>
          <div>
            <p className="text-[11px] sm:text-xs font-semibold text-slate-500 mb-0.5 truncate">Therapy hours</p>
            <h3 className="text-xl sm:text-2xl font-extrabold text-slate-900">{metrics.therapyHoursToday}h</h3>
          </div>
        </div>
      </div>

      {/* Secondary Operational Metrics Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        <div
          onClick={() => onSelectPage('therapists')}
          className="bg-white p-3 sm:p-4 rounded-xl border border-slate-100 flex items-center gap-2.5 sm:gap-3 cursor-pointer hover:border-purple-200 transition-colors min-w-0"
        >
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center font-bold shrink-0">
            <UserCheck className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <div className="min-w-0">
            <span className="text-[10px] sm:text-xs text-slate-400 block font-medium truncate">Active Therapists</span>
            <span className="text-xs sm:text-base font-bold text-slate-800 truncate block">{metrics.activeTherapistsCount} Therapists</span>
          </div>
        </div>

        <div
          onClick={() => onSelectPage('revenue')}
          className="bg-white p-3 sm:p-4 rounded-xl border border-slate-100 flex items-center gap-2.5 sm:gap-3 cursor-pointer hover:border-purple-200 transition-colors min-w-0"
        >
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold shrink-0 text-sm sm:text-base">
            ₹
          </div>
          <div className="min-w-0">
            <span className="text-[10px] sm:text-xs text-slate-400 block font-medium truncate">Revenue Today</span>
            <span className="text-xs sm:text-base font-bold text-emerald-600 truncate block">₹{metrics.revenueToday.toLocaleString()}</span>
          </div>
        </div>

        <div
          onClick={() => onSelectPage('payments')}
          className="bg-white p-3 sm:p-4 rounded-xl border border-slate-100 flex items-center gap-2.5 sm:gap-3 cursor-pointer hover:border-purple-200 transition-colors min-w-0"
        >
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center font-bold shrink-0">
            <CreditCard className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <div className="min-w-0">
            <span className="text-[10px] sm:text-xs text-slate-400 block font-medium truncate">Pending Payouts</span>
            <span className="text-xs sm:text-base font-bold text-amber-600 truncate block">₹{metrics.pendingPayoutsAmount.toLocaleString()}</span>
          </div>
        </div>

        <div
          onClick={() => onSelectPage('revenue')}
          className="bg-white p-3 sm:p-4 rounded-xl border border-slate-100 flex items-center gap-2.5 sm:gap-3 cursor-pointer hover:border-purple-200 transition-colors min-w-0"
        >
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold shrink-0">
            <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <div className="min-w-0">
            <span className="text-[10px] sm:text-xs text-slate-400 block font-medium truncate">Monthly Revenue</span>
            <span className="text-xs sm:text-base font-bold text-blue-600 truncate block">₹{metrics.monthlyRevenue.toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* Main Grid: Graphs & Schedule Timeline */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Charts & Today's Schedule */}
        <div className="lg:col-span-8 space-y-8">
          {/* Session counts */}
          <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm space-y-5">
            <div className="flex flex-col gap-3 border-b border-slate-100 pb-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h3 className="font-extrabold text-lg text-slate-900">Sessions</h3>
                  <p className="text-xs text-slate-400 font-medium mt-0.5">
                    {countRange === 'all'
                      ? 'All bookings on the platform, by status'
                      : (() => {
                          const [from, to] = rangeOf(countRange, countDay);
                          const fmt = (v: string) => new Date(`${v}T12:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
                          return `Sessions dated ${from === to ? fmt(from) : `${fmt(from)} – ${fmt(to)}`}, by status`;
                        })()}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onSelectPage('bookings')}
                  className="inline-flex items-center gap-1 text-xs font-bold text-[#5e2be2] hover:underline shrink-0"
                >
                  View bookings
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
                  {COUNT_RANGES.map((r) => (
                    <button
                      key={r.key}
                      type="button"
                      onClick={() => setCountRange(r.key)}
                      className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                        countRange === r.key ? 'bg-white shadow-2xs text-[#5e2be2]' : 'text-slate-500 hover:text-slate-900'
                      }`}
                    >
                      {r.label}
                    </button>
                  ))}
                </div>
                <input
                  type="date"
                  value={countDay}
                  onChange={(e) => {
                    if (!e.target.value) return;
                    setCountDay(e.target.value);
                    setCountRange('day');
                  }}
                  title="Pick a day"
                  className={`h-8 px-2.5 text-xs font-bold rounded-xl border bg-white outline-none cursor-pointer ${
                    countRange === 'day' ? 'border-[#5e2be2] text-[#5e2be2]' : 'border-slate-200 text-slate-500'
                  }`}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {[
                { label: 'Total sessions', value: sessionCounts.total, tone: 'text-slate-900', bg: 'bg-slate-50 border-slate-100' },
                { label: 'Scheduled', value: sessionCounts.scheduled, tone: 'text-[#5e2be2]', bg: 'bg-purple-50/60 border-purple-100' },
                { label: 'To be scheduled', value: sessionCounts.toBeScheduled, tone: 'text-amber-600', bg: 'bg-amber-50/60 border-amber-100', note: countRange === 'all' ? '' : 'No date yet · not filtered' },
                { label: 'Completed', value: sessionCounts.completed, tone: 'text-emerald-600', bg: 'bg-emerald-50/60 border-emerald-100' },
                { label: 'Cancelled', value: sessionCounts.cancelled, tone: 'text-rose-600', bg: 'bg-rose-50/60 border-rose-100' },
                { label: 'No-shows', value: sessionCounts.noShows, tone: 'text-slate-600', bg: 'bg-slate-50 border-slate-100' }
              ].map((card) => (
                <div key={card.label} className={`p-4 rounded-2xl border ${card.bg}`}>
                  <span className="text-[11px] uppercase font-bold text-slate-500 block tracking-wider">{card.label}</span>
                  <span className={`text-2xl font-extrabold mt-1 block ${card.tone}`}>{card.value}</span>
                  {card.note && <span className="text-[10px] font-semibold text-slate-400 block mt-0.5">{card.note}</span>}
                </div>
              ))}
            </div>
          </div>

          {/* Today's Consultations Schedule Timeline */}
          <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="font-extrabold text-lg text-slate-900">Live Consultation Queue</h3>
                <p className="text-xs text-slate-400">Scheduled consultations and real-time statuses</p>
              </div>
              <button
                onClick={() => onSelectPage('bookings')}
                className="text-xs font-bold text-[#5e2be2] hover:underline flex items-center gap-1 shrink-0"
              >
                View All Bookings
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Filter and Search Bar */}
            <div className="flex flex-col sm:flex-row items-center gap-3">
              <div className="relative w-full sm:flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Filter schedule by client or therapist..."
                  value={scheduleSearch}
                  onChange={(e) => setScheduleSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#5e2be2]/20"
                />
              </div>
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl w-full sm:w-auto overflow-x-auto">
                {(['All', 'Scheduled', 'Completed', 'Rescheduled'] as const).map((st) => (
                  <button
                    key={st}
                    onClick={() => setScheduleFilter(st)}
                    className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all ${
                      scheduleFilter === st
                        ? 'bg-white shadow-2xs text-[#5e2be2]'
                        : 'text-slate-500 hover:text-slate-900'
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>

            {/* Bookings Queue */}
            <div className="space-y-3 pt-1 max-h-96 overflow-y-auto">
              {filteredBookings.length === 0 ? (
                <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-slate-400 text-xs">
                  No consultations matching your filters
                </div>
              ) : (
                filteredBookings.map((item) => (
                  <div
                    key={item.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-slate-50/70 hover:bg-slate-50 border border-slate-100 rounded-2xl gap-3 transition-colors"
                  >
                    <div className="flex items-center gap-4 min-w-0 flex-1">
                      <div className="px-3 py-1.5 bg-purple-100 text-[#5e2be2] font-bold text-xs rounded-xl shrink-0 whitespace-nowrap">
                        {item.time.split(' - ')[0] || item.time}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 min-w-0">
                          <h4 className="font-bold text-sm text-slate-900 truncate">{item.clientName}</h4>
                          <span className="text-[10px] text-slate-400 font-mono shrink-0">#{item.bookingCode}</span>
                        </div>
                        <p className="text-xs text-slate-500 truncate" title={`${item.service} · ${item.therapistName}`}>
                          {item.service} · <span className="font-semibold text-slate-700">{item.therapistName}</span>
                        </p>
                      </div>
                    </div>

                    {/* Status and View Details keep fixed widths so they line up across rows; Mark Done sits to their left */}
                    <div className="flex items-center justify-end gap-2 shrink-0">
                      {item.status === 'Scheduled' && (
                        <button
                          type="button"
                          onClick={() => updateBookingStatus(item.id, 'Completed')}
                          className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition-all active:scale-95 whitespace-nowrap"
                          title="Mark Session as Completed"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Mark Done</span>
                        </button>
                      )}

                      <span
                        className={`w-28 text-center text-xs px-3 py-1 rounded-full font-bold whitespace-nowrap ${
                          item.status === 'Completed'
                            ? 'bg-emerald-100 text-emerald-700'
                            : item.status === 'Scheduled'
                            ? 'bg-purple-100 text-purple-700'
                            : 'bg-amber-100 text-amber-700'
                        }`}
                      >
                        {item.status}
                      </span>

                      <button
                        onClick={() => onSelectPage('bookings')}
                        className="px-3 py-1.5 bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 text-xs font-bold rounded-xl shadow-2xs whitespace-nowrap"
                      >
                        View Details
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Priority Actions & Live Platform Activity */}
        <div className="lg:col-span-4 space-y-8">
          {/* Priority Quick Actions */}
          <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-3xl p-6 text-white space-y-4 shadow-xl">
            <h3 className="font-extrabold text-base flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-amber-400" />
              Administrative Actions
            </h3>
            <p className="text-xs text-slate-300">
              Instant operational triggers for platform management
            </p>

            <div className="space-y-2 pt-2">
              <button
                onClick={() => onSelectPage('payments')}
                className="w-full p-3 bg-white/10 hover:bg-white/20 border border-white/15 rounded-2xl text-left text-xs font-bold flex items-center justify-between transition-colors"
              >
                <span>Release Therapist Payouts</span>
                <span className="bg-amber-400/20 text-amber-300 px-2 py-0.5 rounded-md text-[10px]">
                  {metrics.pendingReportsCount} Pending
                </span>
              </button>

              <button
                onClick={() => onSelectPage('therapists')}
                className="w-full p-3 bg-white/10 hover:bg-white/20 border border-white/15 rounded-2xl text-left text-xs font-bold flex items-center justify-between transition-colors"
              >
                <span>Verify Therapist Licenses</span>
                <span className="bg-purple-400/20 text-purple-300 px-2 py-0.5 rounded-md text-[10px]">Active</span>
              </button>

              <button
                onClick={() => onSelectPage('homepage')}
                className="w-full p-3 bg-white/10 hover:bg-white/20 border border-white/15 rounded-2xl text-left text-xs font-bold flex items-center justify-between transition-colors"
              >
                <span>Update Homepage CMS</span>
                <ArrowUpRight className="w-4 h-4 text-slate-300" />
              </button>

              <button
                onClick={() => onSelectPage('assessments')}
                className="w-full p-3 bg-white/10 hover:bg-white/20 border border-white/15 rounded-2xl text-left text-xs font-bold flex items-center justify-between transition-colors"
              >
                <span>Manage Assessments</span>
                <ChevronRight className="w-4 h-4 text-slate-300" />
              </button>
            </div>
          </div>

          {/* Recent Platform Activity */}
          <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-extrabold text-base text-slate-900">Recent Platform Activity</h3>
              <button
                onClick={() => onSelectPage('logs')}
                className="text-xs font-bold text-[#5e2be2] hover:underline"
              >
                View Logs
              </button>
            </div>
            
            <div className="space-y-4 relative before:absolute before:left-3.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-100 max-h-96 overflow-y-auto">
              {auditLogs.slice(0, 5).map((log, idx) => (
                <div key={log.id || idx} className="relative flex items-start gap-3 pl-2">
                  <div className="w-7 h-7 rounded-full bg-white border border-slate-200 flex items-center justify-center z-10 text-purple-600 shrink-0 shadow-2xs">
                    {log.module === 'Therapists' ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    ) : log.module === 'Payments' ? (
                      <CreditCard className="w-4 h-4 text-amber-600" />
                    ) : log.module === 'Bookings' ? (
                      <PlayCircle className="w-4 h-4 text-purple-600" />
                    ) : (
                      <User className="w-4 h-4 text-blue-600" />
                    )}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-900">{log.action}</p>
                    <p className="text-xs text-slate-500 leading-snug">{log.user} · {log.module}</p>
                    <span className="text-[10px] text-slate-400">{log.timestamp}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardView;
