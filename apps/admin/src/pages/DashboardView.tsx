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
  ChevronRight,
  Search
} from 'lucide-react';
import type { Booking, PageId } from '../types';
import { useAppContext } from '../context/AppContext';

interface DashboardViewProps {
  onSelectPage: (page: PageId, path?: string) => void;
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

/** Minutes after midnight of a booking time such as "10:00 AM - 10:50 AM" (unknown times sort last) */
function minutesOf(time: string): number {
  const m = /(\d{1,2}):(\d{2})\s*([AP]M)?/i.exec(time || '');
  if (!m) return 24 * 60;
  let h = Number(m[1]) % 12;
  if (m[3] && m[3].toUpperCase() === 'PM') h += 12;
  if (!m[3]) h = Number(m[1]);
  return h * 60 + Number(m[2]);
}

/** Statuses that are no longer real sessions (abandoned checkouts, cancellations) */
const NOT_IN_QUEUE = new Set<Booking['status']>(['Cancelled', 'Expired', 'Pending Payment']);

/** A KPI card: a real button, so it can be reached with Tab and opened with Enter */
const CARD_BUTTON = 'text-left w-full focus:outline-none focus-visible:ring-2 focus-visible:ring-[#450bc8]/40';

const COUNT_RANGES: { key: 'all' | 'today' | 'week' | 'month'; label: string }[] = [
  { key: 'all', label: 'All time' },
  { key: 'today', label: 'Today' },
  { key: 'week', label: 'This week' },
  { key: 'month', label: 'This month' }
];

export const DashboardView: React.FC<DashboardViewProps> = ({ onSelectPage }) => {
  const { bookings, therapists, metrics, updateBookingStatus, dataError, dataLoaded, refreshAllData } = useAppContext();
  // Mark Done: asked first; the row changes only after the server saved it, and a failure is shown
  const [confirmDone, setConfirmDone] = useState<Booking | null>(null);
  const [isMarkingDone, setIsMarkingDone] = useState(false);
  const [markDoneError, setMarkDoneError] = useState<string | null>(null);
  const [queueNotice, setQueueNotice] = useState<string | null>(null);
  const [isRetrying, setIsRetrying] = useState(false);

  const handleConfirmMarkDone = async () => {
    if (!confirmDone) return;
    setIsMarkingDone(true);
    setMarkDoneError(null);
    try {
      await updateBookingStatus(confirmDone.id, 'Completed');
      setQueueNotice(`${confirmDone.bookingCode} marked as completed.`);
      setConfirmDone(null);
    } catch (err: any) {
      setMarkDoneError(err?.message || 'The server could not save this change. Please try again.');
    } finally {
      setIsMarkingDone(false);
    }
  };

  const unverifiedTherapists = therapists.filter((t) => t.verificationStatus !== 'Verified' && !t.isArchived).length;
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

  // Today in India time (sessions are booked in IST), whatever the admin's computer clock zone is
  const todayIst = isoDay(new Date());
  const todayFormatted = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    timeZone: 'Asia/Kolkata'
  });

  // The queue: today's and upcoming sessions (plus paid ones still to be scheduled), soonest first
  const filteredBookings = React.useMemo(() => {
    const q = scheduleSearch.trim().toLowerCase();
    return bookings
      .filter((b) => !NOT_IN_QUEUE.has(b.status))
      .filter((b) => (b.toBeScheduled ? b.status !== 'Completed' : /^\d{4}-\d{2}-\d{2}$/.test(b.date) && b.date >= todayIst))
      .filter((b) => scheduleFilter === 'All' || b.status === scheduleFilter)
      .filter(
        (b) =>
          !q ||
          (b.clientName || '').toLowerCase().includes(q) ||
          (b.therapistName || '').toLowerCase().includes(q) ||
          (b.service || '').toLowerCase().includes(q) ||
          (b.bookingCode || '').toLowerCase().includes(q)
      )
      .sort((a, b) => {
        if (a.toBeScheduled !== b.toBeScheduled) return a.toBeScheduled ? 1 : -1;
        return a.date.localeCompare(b.date) || minutesOf(a.time) - minutesOf(b.time);
      });
  }, [bookings, scheduleSearch, scheduleFilter, todayIst]);

  /** "10:00 AM" today, "1 Dec · 10:00 AM" later, "To be scheduled" without a date */
  const whenLabel = (b: Booking) => {
    if (b.toBeScheduled) return 'To be scheduled';
    const start = (b.time || '').split(' - ')[0] || 'Time not set';
    if (b.date === todayIst) return start;
    const day = new Date(`${b.date}T12:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
    return `${day} · ${start}`;
  };

  return (
    <div className="space-y-8 pb-12 animate-fade-in">
      {/* Header Banner */}
      <div className="relative rounded-2xl sm:rounded-[28px] bg-gradient-to-r from-[#3a0aa8] via-[#450bc8] to-[#3b1799] p-5 sm:p-8 text-white shadow-xl overflow-hidden">
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
              <span className="font-semibold text-white">{metrics.sessionsTodayCount} Sessions Today</span> · <span className="font-semibold text-white">₹{metrics.pendingPayoutsAmount.toLocaleString()} Pending Payouts</span> · <span className="font-semibold text-white">{metrics.pendingReportsCount} Pending Reports</span>
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
                onClick={() => onSelectPage('availability')}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-white/90 hover:text-white bg-black/20 hover:bg-black/30 px-4 py-2 rounded-full border border-white/10 transition-all"
              >
                <span>View Full Calendar</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {dataError && (
        <div role="alert" className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl border border-rose-200 bg-rose-50 text-rose-700">
          <div className="flex items-start gap-2.5 text-sm font-semibold">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <span>{dataError}</span>
          </div>
          <button
            type="button"
            disabled={isRetrying}
            onClick={async () => {
              setIsRetrying(true);
              try {
                await refreshAllData();
              } finally {
                setIsRetrying(false);
              }
            }}
            className="self-start sm:self-auto px-4 py-2 rounded-xl bg-white border border-rose-200 text-xs font-bold text-rose-700 hover:bg-rose-100 disabled:opacity-60"
          >
            {isRetrying ? 'Retrying…' : 'Retry'}
          </button>
        </div>
      )}
      {!dataLoaded && !dataError && (
        <p className="text-xs font-semibold text-slate-400" aria-live="polite">Loading live figures…</p>
      )}

      {/* KPI Cards Row (2x2 Grid on Mobile) */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-5">
        {/* Card 1: Sessions Today */}
        <button
          type="button"
          onClick={() => onSelectPage('bookings')}
          className={`${CARD_BUTTON} bg-white rounded-xl sm:rounded-2xl p-3.5 sm:p-5 border border-slate-100 shadow-sm card-hover flex flex-col justify-between cursor-pointer transition-all hover:border-purple-200`}
        >
          <div className="flex items-center justify-between mb-2.5 sm:mb-4">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Video className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
          </div>
          <div>
            <p className="text-[11px] sm:text-xs font-semibold text-slate-500 mb-0.5 truncate">Sessions today</p>
            <h3 className="text-xl sm:text-2xl font-extrabold text-slate-900">{metrics.sessionsTodayCount}</h3>
          </div>
        </button>

        {/* Card 2: Active Clients */}
        <button
          type="button"
          onClick={() => onSelectPage('clients')}
          className={`${CARD_BUTTON} bg-white rounded-xl sm:rounded-2xl p-3.5 sm:p-5 border border-slate-100 shadow-sm card-hover flex flex-col justify-between cursor-pointer transition-all hover:border-purple-200`}
        >
          <div className="flex items-center justify-between mb-2.5 sm:mb-4">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Users className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
          </div>
          <div>
            <p className="text-[11px] sm:text-xs font-semibold text-slate-500 mb-0.5 truncate" title="Client accounts that are not Inactive">Active clients</p>
            <h3 className="text-xl sm:text-2xl font-extrabold text-slate-900">{metrics.activeClientsCount}</h3>
          </div>
        </button>

        {/* Card 3: Pending Reports (completed sessions; the therapist files the report) */}
        <button
          type="button"
          onClick={() => onSelectPage('bookings', '/bookings?q=Completed')}
          className={`${CARD_BUTTON} bg-white rounded-xl sm:rounded-2xl p-3.5 sm:p-5 border border-slate-100 shadow-sm card-hover flex flex-col justify-between cursor-pointer transition-all hover:border-purple-200`}
        >
          <div className="flex items-center justify-between mb-2.5 sm:mb-4">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <FileText className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            {metrics.pendingReportsCount > 0 && (
              <span className="text-[10px] sm:text-xs font-extrabold text-amber-600 bg-amber-50 px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full border border-amber-100">
                Action Req.
              </span>
            )}
          </div>
          <div>
            <p className="text-[11px] sm:text-xs font-semibold text-slate-500 mb-0.5 truncate" title="Completed sessions without a session report">Pending reports</p>
            <h3 className="text-xl sm:text-2xl font-extrabold text-slate-900">{metrics.pendingReportsCount}</h3>
          </div>
        </button>

        {/* Card 4: Therapy Hours */}
        <button
          type="button"
          onClick={() => onSelectPage('bookings')}
          className={`${CARD_BUTTON} bg-white rounded-xl sm:rounded-2xl p-3.5 sm:p-5 border border-slate-100 shadow-sm card-hover flex flex-col justify-between cursor-pointer transition-all hover:border-purple-200`}
        >
          <div className="flex items-center justify-between mb-2.5 sm:mb-4">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Clock className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
          </div>
          <div>
            <p className="text-[11px] sm:text-xs font-semibold text-slate-500 mb-0.5 truncate" title="Booked session hours today (India time)">Therapy hours today</p>
            <h3 className="text-xl sm:text-2xl font-extrabold text-slate-900">{metrics.therapyHoursToday}h</h3>
          </div>
        </button>
      </div>

      {/* Secondary Operational Metrics Bar */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
        <button
          type="button"
          onClick={() => onSelectPage('therapists')}
          className={`${CARD_BUTTON} bg-white p-3 sm:p-4 rounded-xl border border-slate-100 flex items-center gap-2.5 sm:gap-3 cursor-pointer hover:border-purple-200 transition-colors min-w-0`}
        >
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center font-bold shrink-0">
            <UserCheck className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <div className="min-w-0">
            <span className="text-[10px] sm:text-xs text-slate-400 block font-medium truncate">Active Therapists</span>
            <span className="text-xs sm:text-base font-bold text-slate-800 truncate block">{metrics.activeTherapistsCount} Therapists</span>
          </div>
        </button>

        <button
          type="button"
          onClick={() => onSelectPage('revenue')}
          className={`${CARD_BUTTON} bg-white p-3 sm:p-4 rounded-xl border border-slate-100 flex items-center gap-2.5 sm:gap-3 cursor-pointer hover:border-purple-200 transition-colors min-w-0`}
        >
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold shrink-0 text-sm sm:text-base">
            ₹
          </div>
          <div className="min-w-0">
            <span className="text-[10px] sm:text-xs text-slate-400 block font-medium truncate">Revenue Today</span>
            <span className="text-xs sm:text-base font-bold text-emerald-600 truncate block">₹{metrics.revenueToday.toLocaleString()}</span>
          </div>
        </button>

        <button
          type="button"
          onClick={() => onSelectPage('payments')}
          className={`${CARD_BUTTON} bg-white p-3 sm:p-4 rounded-xl border border-slate-100 flex items-center gap-2.5 sm:gap-3 cursor-pointer hover:border-purple-200 transition-colors min-w-0`}
        >
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center font-bold shrink-0">
            <CreditCard className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <div className="min-w-0">
            <span className="text-[10px] sm:text-xs text-slate-400 block font-medium truncate">Pending Payouts</span>
            <span className="text-xs sm:text-base font-bold text-amber-600 truncate block">₹{metrics.pendingPayoutsAmount.toLocaleString()}</span>
          </div>
        </button>

        <button
          type="button"
          onClick={() => onSelectPage('revenue')}
          className={`${CARD_BUTTON} bg-white p-3 sm:p-4 rounded-xl border border-slate-100 flex items-center gap-2.5 sm:gap-3 cursor-pointer hover:border-purple-200 transition-colors min-w-0`}
        >
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold shrink-0">
            <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <div className="min-w-0">
            <span className="text-[10px] sm:text-xs text-slate-400 block font-medium truncate">Monthly Revenue</span>
            <span className="text-xs sm:text-base font-bold text-blue-600 truncate block">₹{metrics.monthlyRevenue.toLocaleString()}</span>
          </div>
        </button>
      </div>

      {/* Main Grid: Graphs & Schedule Timeline */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 sm:gap-8">
        {/* Left Column: Charts & Today's Schedule */}
        <div className="xl:col-span-8 space-y-6 sm:space-y-8 min-w-0">
          {/* Session counts */}
          <div className="bg-white rounded-3xl p-4 sm:p-6 border border-slate-100 shadow-sm space-y-5">
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
                  className="inline-flex items-center gap-1 py-2 sm:py-0 text-xs font-bold text-[#450bc8] hover:underline shrink-0"
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
                      className={`px-3 py-2 sm:py-1 text-xs font-bold rounded-lg transition-all ${
                        countRange === r.key ? 'bg-white shadow-2xs text-[#450bc8]' : 'text-slate-500 hover:text-slate-900'
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
                  className={`h-9 sm:h-8 px-2.5 text-xs font-bold rounded-xl border bg-white outline-none cursor-pointer ${
                    countRange === 'day' ? 'border-[#450bc8] text-[#450bc8]' : 'border-slate-200 text-slate-500'
                  }`}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {[
                { label: 'Total sessions', value: sessionCounts.total, tone: 'text-slate-900', bg: 'bg-slate-50 border-slate-100' },
                { label: 'Scheduled', value: sessionCounts.scheduled, tone: 'text-[#450bc8]', bg: 'bg-purple-50/60 border-purple-100' },
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
                <p className="text-xs text-slate-400">Today's and upcoming sessions (India time), soonest first</p>
              </div>
              <button
                onClick={() => onSelectPage('bookings')}
                className="self-start sm:self-auto py-2 sm:py-0 text-xs font-bold text-[#450bc8] hover:underline flex items-center gap-1 shrink-0"
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
                  placeholder="Filter by client, therapist or booking number..."
                  value={scheduleSearch}
                  onChange={(e) => setScheduleSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#450bc8]/20"
                />
              </div>
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl w-full sm:w-auto overflow-x-auto">
                {(['All', 'Scheduled', 'Completed', 'Rescheduled'] as const).map((st) => (
                  <button
                    key={st}
                    onClick={() => setScheduleFilter(st)}
                    className={`shrink-0 px-2.5 py-2 sm:py-1 text-[11px] font-bold rounded-lg transition-all ${
                      scheduleFilter === st
                        ? 'bg-white shadow-2xs text-[#450bc8]'
                        : 'text-slate-500 hover:text-slate-900'
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>

            {queueNotice && (
              <p role="status" className="text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2">
                {queueNotice}
              </p>
            )}

            {/* Bookings Queue */}
            <div className="space-y-3 pt-1 max-h-96 overflow-y-auto">
              {filteredBookings.length === 0 ? (
                <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-slate-400 text-xs">
                  No today's or upcoming sessions match these filters
                </div>
              ) : (
                filteredBookings.map((item) => (
                  <div
                    key={item.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-slate-50/70 hover:bg-slate-50 border border-slate-100 rounded-2xl gap-3 transition-colors"
                  >
                    <div className="flex items-center gap-4 min-w-0 flex-1">
                      <div
                        className={`px-3 py-1.5 font-bold text-xs rounded-xl shrink-0 whitespace-nowrap ${
                          item.toBeScheduled ? 'bg-amber-100 text-amber-700' : 'bg-purple-100 text-[#450bc8]'
                        }`}
                      >
                        {whenLabel(item)}
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
                          onClick={() => {
                            setMarkDoneError(null);
                            setQueueNotice(null);
                            setConfirmDone(item);
                          }}
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
                        type="button"
                        onClick={() => onSelectPage('bookings', `/bookings?q=${encodeURIComponent(item.bookingCode || item.id)}`)}
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
        <div className="xl:col-span-4 space-y-6 sm:space-y-8 min-w-0">
          {/* Priority Quick Actions */}
          <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-3xl p-4 sm:p-6 text-white space-y-4 shadow-xl">
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
                className="w-full p-3 bg-white/10 hover:bg-white/20 border border-white/15 rounded-2xl text-left text-xs font-bold flex items-center justify-between gap-2 transition-colors"
              >
                <span>Release Therapist Payouts</span>
                <span className="bg-amber-400/20 text-amber-300 px-2 py-0.5 rounded-md text-[10px] shrink-0 whitespace-nowrap" title="Completed, paid sessions not yet paid out">
                  {metrics.pendingPayoutSessionsCount > 0
                    ? `${metrics.pendingPayoutSessionsCount} unpaid session${metrics.pendingPayoutSessionsCount === 1 ? '' : 's'}`
                    : 'None pending'}
                </span>
              </button>

              <button
                onClick={() => onSelectPage('therapists')}
                className="w-full p-3 bg-white/10 hover:bg-white/20 border border-white/15 rounded-2xl text-left text-xs font-bold flex items-center justify-between gap-2 transition-colors"
              >
                <span>Verify Therapist Licenses</span>
                <span className="bg-purple-400/20 text-purple-300 px-2 py-0.5 rounded-md text-[10px] shrink-0 whitespace-nowrap" title="Profiles not marked Certified (edit a profile and tick Is Certified)">
                  {unverifiedTherapists > 0 ? `${unverifiedTherapists} not verified` : 'All verified'}
                </span>
              </button>

              <button
                onClick={() => onSelectPage('homepage')}
                className="w-full p-3 bg-white/10 hover:bg-white/20 border border-white/15 rounded-2xl text-left text-xs font-bold flex items-center justify-between gap-2 transition-colors"
              >
                <span>Update Homepage</span>
                <ArrowUpRight className="w-4 h-4 text-slate-300" />
              </button>

              <button
                onClick={() => onSelectPage('assessments')}
                className="w-full p-3 bg-white/10 hover:bg-white/20 border border-white/15 rounded-2xl text-left text-xs font-bold flex items-center justify-between gap-2 transition-colors"
              >
                <span>Manage Assessments</span>
                <ChevronRight className="w-4 h-4 text-slate-300" />
              </button>
            </div>
          </div>

        </div>
      </div>

      {confirmDone && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center p-3 sm:p-4 bg-slate-950/60 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="mark-done-title"
        >
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-100 p-5 sm:p-6 space-y-4">
            <h4 id="mark-done-title" className="text-lg font-extrabold text-slate-900">Mark this session as completed?</h4>
            <p className="text-sm text-slate-600 leading-relaxed">
              <span className="font-bold text-slate-900">{confirmDone.bookingCode}</span> · {confirmDone.clientName} with{' '}
              {confirmDone.therapistName}
              {confirmDone.toBeScheduled ? ' (no session time set yet)' : ` on ${confirmDone.date}${confirmDone.time ? `, ${confirmDone.time}` : ''}`}.
              The client is emailed and asked to rate the session.
            </p>
            {!confirmDone.toBeScheduled &&
              (confirmDone.date > todayIst || (confirmDone.date === todayIst && minutesOf(confirmDone.time) > (() => {
                const [h, m] = new Date().toLocaleTimeString('en-GB', { timeZone: 'Asia/Kolkata', hour12: false }).split(':').map(Number);
                return h * 60 + m;
              })())) && (
                <p className="text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
                  This session has not started yet.
                </p>
              )}
            {markDoneError && (
              <p role="alert" className="text-xs font-semibold text-rose-600 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2">
                Not saved: {markDoneError}
              </p>
            )}
            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setConfirmDone(null)}
                disabled={isMarkingDone}
                className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmMarkDone}
                disabled={isMarkingDone}
                className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white text-xs font-bold"
              >
                {isMarkingDone ? 'Saving…' : 'Yes, mark completed'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardView;
