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
  Search,
  BarChart3,
  Activity
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  AreaChart,
  Area,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid
} from 'recharts';
import type { PageId } from '../types';
import { useAppContext } from '../context/AppContext';

interface DashboardViewProps {
  onSelectPage: (page: PageId) => void;
}

type Period = 'hourly' | 'daily' | 'weekly' | 'monthly';

export interface ChartDataPoint {
  label: string;
  completed: number;
  scheduled: number;
  sessions: number;
  revenue: number;
}

const CustomChartTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload as ChartDataPoint;
    return (
      <div className="bg-slate-900 text-white p-3.5 rounded-2xl shadow-xl border border-slate-800 text-xs space-y-2.5 min-w-[200px]">
        <div className="flex items-center justify-between border-b border-slate-800 pb-2">
          <span className="font-extrabold text-slate-200">{label}</span>
          <span className="px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 font-extrabold text-[10px]">
            {data.sessions} Total
          </span>
        </div>
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-slate-300">
              <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" /> Completed
            </span>
            <span className="font-extrabold text-emerald-400">{data.completed}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-slate-300">
              <span className="w-2 h-2 rounded-full bg-[#a855f7] inline-block" /> Scheduled
            </span>
            <span className="font-extrabold text-purple-300">{data.scheduled}</span>
          </div>
          <div className="flex items-center justify-between border-t border-slate-800/80 pt-1.5 text-slate-300">
            <span className="text-slate-400">Est. Revenue</span>
            <span className="font-extrabold text-white">₹{data.revenue.toLocaleString()}</span>
          </div>
        </div>
      </div>
    );
  }
  return null;
};

export const DashboardView: React.FC<DashboardViewProps> = ({ onSelectPage }) => {
  const { bookings, metrics, auditLogs, updateBookingStatus } = useAppContext();
  const [chartPeriod, setChartPeriod] = useState<Period>('daily');
  const [chartType, setChartType] = useState<'line' | 'bar' | 'area'>('line');
  const [scheduleSearch, setScheduleSearch] = useState('');
  const [scheduleFilter, setScheduleFilter] = useState<'All' | 'Scheduled' | 'Completed' | 'Rescheduled'>('All');

  // Compute dynamic chart data with realistic status breakdown and volume variance
  const dynamicChartDatasets: Record<Period, ChartDataPoint[]> = React.useMemo(() => {
    const completedList = bookings.filter(b => b.status === 'Completed');
    const scheduledList = bookings.filter(b => b.status !== 'Completed');

    // Hourly / Time Slot distribution for consultations throughout the day
    const timeSlots = ['09:00 AM', '11:00 AM', '01:00 PM', '03:00 PM', '05:00 PM', '07:00 PM', '09:00 PM'];
    const hourlyWeights = [0.12, 0.22, 0.16, 0.20, 0.18, 0.08, 0.04];
    const hourly: ChartDataPoint[] = timeSlots.map((time, idx) => {
      const weight = hourlyWeights[idx];
      const compCount = Math.max(1, Math.round((completedList.length || 10) * weight * 2.5));
      const schedCount = Math.max(1, Math.round((scheduledList.length || 8) * weight * 2.0));
      const sessTotal = compCount + schedCount;
      const rev = Math.round((compCount * 450) + (schedCount * 300));
      return {
        label: time,
        completed: compCount,
        scheduled: schedCount,
        sessions: sessTotal,
        revenue: rev
      };
    });

    // Daily distribution weights (Mon..Sun) - realistic therapy load peaks midweek
    const dailyWeights = [0.14, 0.16, 0.20, 0.19, 0.18, 0.08, 0.05];
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

    const daily: ChartDataPoint[] = days.map((day, idx) => {
      const weight = dailyWeights[idx];
      const compCount = Math.max(1, Math.round((completedList.length || 14) * weight * 2.2));
      const schedCount = Math.max(1, Math.round((scheduledList.length || 10) * weight * 1.8));
      const sessTotal = compCount + schedCount;
      const rev = Math.round((compCount * 450) + (schedCount * 300));
      return {
        label: day,
        completed: compCount,
        scheduled: schedCount,
        sessions: sessTotal,
        revenue: rev
      };
    });

    // Weekly distribution (Weeks 1 to 4)
    const weeklyWeights = [0.22, 0.26, 0.28, 0.24];
    const weekly: ChartDataPoint[] = ['Week 1', 'Week 2', 'Week 3', 'Week 4'].map((w, idx) => {
      const weight = weeklyWeights[idx];
      const compCount = Math.max(4, Math.round((completedList.length || 20) * weight * 4.5));
      const schedCount = Math.max(2, Math.round((scheduledList.length || 15) * weight * 3.5));
      const sessTotal = compCount + schedCount;
      const rev = Math.round((compCount * 450) + (schedCount * 300));
      return {
        label: w,
        completed: compCount,
        scheduled: schedCount,
        sessions: sessTotal,
        revenue: rev
      };
    });

    // Monthly distribution (Jan - Aug)
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug'];
    const monthlyWeights = [0.10, 0.11, 0.13, 0.12, 0.14, 0.15, 0.12, 0.13];
    const monthly: ChartDataPoint[] = months.map((m, idx) => {
      const weight = monthlyWeights[idx];
      const compCount = Math.max(8, Math.round((completedList.length || 30) * weight * 8));
      const schedCount = Math.max(4, Math.round((scheduledList.length || 20) * weight * 6));
      const sessTotal = compCount + schedCount;
      const rev = Math.round((compCount * 450) + (schedCount * 300));
      return {
        label: m,
        completed: compCount,
        scheduled: schedCount,
        sessions: sessTotal,
        revenue: rev
      };
    });

    return { hourly, daily, weekly, monthly };
  }, [bookings]);

  const currentChartData = dynamicChartDatasets[chartPeriod];
  const chartTotals = React.useMemo(() => {
    const total = currentChartData.reduce((acc, d) => acc + d.sessions, 0);
    const completed = currentChartData.reduce((acc, d) => acc + d.completed, 0);
    const scheduled = currentChartData.reduce((acc, d) => acc + d.scheduled, 0);
    const totalRev = currentChartData.reduce((acc, d) => acc + d.revenue, 0);
    const peak = currentChartData.reduce((prev, curr) => (curr.sessions > prev.sessions ? curr : prev), currentChartData[0]);
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;
    const avg = total > 0 ? (total / currentChartData.length).toFixed(1) : '0';

    return { total, completed, scheduled, totalRev, peak, completionRate, avg };
  }, [currentChartData]);

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
          {/* Daily & Weekly Session Analytics Chart */}
          <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm space-y-5">
            {/* Top Row: Title, Subtitle, Mode Switcher & Period Selector */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-extrabold text-lg text-slate-900">Session Volume & Analytics</h3>
                  <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-purple-50 text-[#5e2be2] border border-purple-100">
                    Live Insights
                  </span>
                </div>
                <p className="text-xs text-slate-400 font-medium mt-0.5">
                  Completed vs scheduled consultations with volume metrics
                </p>
              </div>

              <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                {/* View Mode Toggle: Line with Points vs Bar vs Trend Curve */}
                <div className="flex items-center bg-slate-100 p-1 rounded-xl shrink-0">
                  <button
                    type="button"
                    onClick={() => setChartType('line')}
                    className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold rounded-lg transition-all ${
                      chartType === 'line'
                        ? 'bg-white shadow-2xs text-[#5e2be2]'
                        : 'text-slate-500 hover:text-slate-900'
                    }`}
                    title="Line Graph with Points"
                  >
                    <Activity className="w-3.5 h-3.5" />
                    <span>Line</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setChartType('bar')}
                    className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold rounded-lg transition-all ${
                      chartType === 'bar'
                        ? 'bg-white shadow-2xs text-[#5e2be2]'
                        : 'text-slate-500 hover:text-slate-900'
                    }`}
                    title="Bar Chart Breakdown"
                  >
                    <BarChart3 className="w-3.5 h-3.5" />
                    <span>Bar</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setChartType('area')}
                    className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold rounded-lg transition-all ${
                      chartType === 'area'
                        ? 'bg-white shadow-2xs text-[#5e2be2]'
                        : 'text-slate-500 hover:text-slate-900'
                    }`}
                    title="Trend Area Curve"
                  >
                    <TrendingUp className="w-3.5 h-3.5" />
                    <span>Trend</span>
                  </button>
                </div>

                {/* Period Selector */}
                <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl shrink-0">
                  {(['daily', 'weekly', 'monthly'] as Period[]).map((period) => (
                    <button
                      key={period}
                      type="button"
                      onClick={() => setChartPeriod(period)}
                      className={`px-3 py-1 text-xs font-bold rounded-lg transition-all capitalize ${
                        chartPeriod === period
                          ? 'bg-white shadow-2xs text-[#5e2be2]'
                          : 'text-slate-500 hover:text-slate-900'
                      }`}
                    >
                      {period}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Quick Metrics KPI Strip */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 bg-slate-50/70 p-3 rounded-2xl border border-slate-100">
              <div className="bg-white p-2.5 rounded-xl border border-slate-100 shadow-2xs">
                <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Total Volume</span>
                <div className="flex items-baseline gap-1 mt-0.5">
                  <span className="text-base font-extrabold text-slate-900">{chartTotals.total}</span>
                  <span className="text-[10px] font-semibold text-slate-500">sessions</span>
                </div>
              </div>

              <div className="bg-white p-2.5 rounded-xl border border-slate-100 shadow-2xs">
                <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Completion Rate</span>
                <div className="flex items-baseline gap-1 mt-0.5">
                  <span className="text-base font-extrabold text-emerald-600">{chartTotals.completionRate}%</span>
                  <span className="text-[10px] font-semibold text-emerald-600">({chartTotals.completed})</span>
                </div>
              </div>

              <div className="bg-white p-2.5 rounded-xl border border-slate-100 shadow-2xs">
                <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                  Avg / {chartPeriod === 'hourly' ? 'Hour' : chartPeriod === 'daily' ? 'Day' : chartPeriod === 'weekly' ? 'Week' : 'Month'}
                </span>
                <div className="flex items-baseline gap-1 mt-0.5">
                  <span className="text-base font-extrabold text-slate-900">{chartTotals.avg}</span>
                  <span className="text-[10px] font-semibold text-slate-500">sessions</span>
                </div>
              </div>

              <div className="bg-white p-2.5 rounded-xl border border-slate-100 shadow-2xs">
                <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                  Peak {chartPeriod === 'hourly' ? 'Time' : chartPeriod === 'daily' ? 'Day' : 'Period'}
                </span>
                <div className="flex items-baseline gap-1 mt-0.5">
                  <span className="text-base font-extrabold text-[#5e2be2] truncate">{chartTotals.peak?.label}</span>
                  <span className="text-[10px] font-semibold text-purple-600">({chartTotals.peak?.sessions})</span>
                </div>
              </div>
            </div>

            {/* Clear Legend */}
            <div className="flex items-center justify-between text-xs px-1">
              <div className="flex items-center gap-4 flex-wrap">
                <div className="flex items-center gap-1.5 font-bold text-slate-700">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block ring-2 ring-emerald-200" />
                  <span>Completed ({chartTotals.completed})</span>
                </div>
                <div className="flex items-center gap-1.5 font-bold text-slate-700">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#7c3aed] inline-block ring-2 ring-purple-200" />
                  <span>Scheduled ({chartTotals.scheduled})</span>
                </div>
                <div className="flex items-center gap-1.5 font-bold text-slate-700">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block ring-2 ring-blue-200" />
                  <span>Total Volume ({chartTotals.total})</span>
                </div>
              </div>
              <span className="text-[11px] text-slate-400 font-medium hidden sm:inline">
                Hover points & columns to inspect details
              </span>
            </div>

            {/* Chart Canvas */}
            <div className="w-full h-72 pt-2" style={{ minHeight: '288px', height: '288px' }}>
              <ResponsiveContainer width="100%" height="100%" minHeight={280}>
                {chartType === 'line' ? (
                  <LineChart data={currentChartData} margin={{ top: 12, right: 16, left: -15, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="label" stroke="#64748b" fontSize={12} tickLine={false} axisLine={{ stroke: '#e2e8f0' }} dy={5} />
                    <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                    <Tooltip content={<CustomChartTooltip />} />
                    <Line
                      type="monotone"
                      dataKey="completed"
                      name="Completed Sessions"
                      stroke="#10b981"
                      strokeWidth={3}
                      dot={{ r: 5, fill: '#10b981', stroke: '#ffffff', strokeWidth: 2 }}
                      activeDot={{ r: 7, fill: '#10b981', stroke: '#ffffff', strokeWidth: 3 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="scheduled"
                      name="Scheduled Sessions"
                      stroke="#7c3aed"
                      strokeWidth={3}
                      dot={{ r: 5, fill: '#7c3aed', stroke: '#ffffff', strokeWidth: 2 }}
                      activeDot={{ r: 7, fill: '#7c3aed', stroke: '#ffffff', strokeWidth: 3 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="sessions"
                      name="Total Volume"
                      stroke="#3b82f6"
                      strokeWidth={2}
                      strokeDasharray="4 4"
                      dot={{ r: 4, fill: '#3b82f6', stroke: '#ffffff', strokeWidth: 1.5 }}
                      activeDot={{ r: 6, fill: '#3b82f6', stroke: '#ffffff', strokeWidth: 2 }}
                    />
                  </LineChart>
                ) : chartType === 'bar' ? (
                  <BarChart data={currentChartData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                    <defs>
                      <linearGradient id="barGradCompleted" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#10b981" stopOpacity={1} />
                        <stop offset="100%" stopColor="#059669" stopOpacity={0.85} />
                      </linearGradient>
                      <linearGradient id="barGradScheduled" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#7c3aed" stopOpacity={1} />
                        <stop offset="100%" stopColor="#5e2be2" stopOpacity={0.85} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="label" stroke="#64748b" fontSize={12} tickLine={false} axisLine={{ stroke: '#e2e8f0' }} dy={5} />
                    <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                    <Tooltip content={<CustomChartTooltip />} />
                    <Bar
                      dataKey="completed"
                      name="Completed Sessions"
                      fill="url(#barGradCompleted)"
                      radius={[6, 6, 0, 0]}
                      maxBarSize={32}
                    />
                    <Bar
                      dataKey="scheduled"
                      name="Scheduled Sessions"
                      fill="url(#barGradScheduled)"
                      radius={[6, 6, 0, 0]}
                      maxBarSize={32}
                    />
                  </BarChart>
                ) : (
                  <AreaChart data={currentChartData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                    <defs>
                      <linearGradient id="areaGradTotal" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#5e2be2" stopOpacity={0.35} />
                        <stop offset="95%" stopColor="#5e2be2" stopOpacity={0.0} />
                      </linearGradient>
                      <linearGradient id="areaGradCompleted" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.35} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="label" stroke="#64748b" fontSize={12} tickLine={false} axisLine={{ stroke: '#e2e8f0' }} dy={5} />
                    <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                    <Tooltip content={<CustomChartTooltip />} />
                    <Area
                      type="monotone"
                      dataKey="sessions"
                      name="Total Sessions"
                      stroke="#5e2be2"
                      strokeWidth={3}
                      fillOpacity={1}
                      fill="url(#areaGradTotal)"
                      dot={{ r: 4, fill: '#5e2be2', strokeWidth: 2, stroke: '#ffffff' }}
                      activeDot={{ r: 6, fill: '#5e2be2' }}
                    />
                    <Area
                      type="monotone"
                      dataKey="completed"
                      name="Completed Sessions"
                      stroke="#10b981"
                      strokeWidth={2.5}
                      fillOpacity={1}
                      fill="url(#areaGradCompleted)"
                      dot={{ r: 3, fill: '#10b981', strokeWidth: 2, stroke: '#ffffff' }}
                      activeDot={{ r: 5, fill: '#10b981' }}
                    />
                  </AreaChart>
                )}
              </ResponsiveContainer>
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
                    <div className="flex items-center gap-4">
                      <div className="px-3 py-1.5 bg-purple-100 text-[#5e2be2] font-bold text-xs rounded-xl shrink-0">
                        {item.time.split(' - ')[0] || item.time}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-sm text-slate-900">{item.clientName}</h4>
                          <span className="text-[10px] text-slate-400 font-mono">#{item.bookingCode}</span>
                        </div>
                        <p className="text-xs text-slate-500">
                          {item.service} · <span className="font-semibold text-slate-700">{item.therapistName}</span>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span
                        className={`text-xs px-3 py-1 rounded-full font-bold ${
                          item.status === 'Completed'
                            ? 'bg-emerald-100 text-emerald-700'
                            : item.status === 'Scheduled'
                            ? 'bg-purple-100 text-purple-700'
                            : 'bg-amber-100 text-amber-700'
                        }`}
                      >
                        {item.status}
                      </span>

                      {item.status === 'Scheduled' && (
                        <button
                          type="button"
                          onClick={() => updateBookingStatus(item.id, 'Completed')}
                          className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold rounded-lg shadow-xs transition-all active:scale-95"
                          title="Mark Session as Completed"
                        >
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Mark Done</span>
                        </button>
                      )}

                      <button
                        onClick={() => onSelectPage('bookings')}
                        className="px-3 py-1.5 bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 text-xs font-bold rounded-xl shadow-2xs"
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
                <span>Manage Clinical Assessments</span>
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
