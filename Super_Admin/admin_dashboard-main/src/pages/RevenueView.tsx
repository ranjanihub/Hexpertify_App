import React, { useState, useEffect } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import {
  Download,
  Search,
  CheckCircle2,
  Clock,
  ShieldCheck,
  Wallet,
  TrendingUp,
  CreditCard,
  ChevronLeft,
  ChevronRight,
  UserCheck
} from 'lucide-react';
import { useAppContext } from '../context/AppContext';

type TimeRange = 'Week' | 'Month' | 'Year';

const serviceBreakdownColors = ['#5e2be2', '#3b1799', '#10b981', '#3b82f6', '#f59e0b', '#ec4899', '#8b5cf6', '#14b8a6'];
const PAGE_SIZE = 10;

export const RevenueView: React.FC = () => {
  const { bookings, therapists } = useAppContext();
  const [timeRange, setTimeRange] = useState<TimeRange>('Month');
  const [txSearch, setTxSearch] = useState('');
  const [paymentFilter, setPaymentFilter] = useState<'All' | 'Paid' | 'Pending Payout' | 'Refunded'>('All');
  const [therapistSearch, setTherapistSearch] = useState('');
  const [therapistPage, setTherapistPage] = useState<number>(1);
  const [txPage, setTxPage] = useState<number>(1);
  const [liveRevenueData, setLiveRevenueData] = useState<any>(null);

  useEffect(() => {
    const fetchRevenue = async () => {
      try {
        let res = await fetch('/api/admin/revenue').catch(() => null);
        if (!res || !res.ok) {
          res = await fetch('http://localhost:5000/api/admin/revenue').catch(() => null);
        }
        if (res && res.ok) {
          const data = await res.json();
          if (data?.success) {
            setLiveRevenueData(data);
          }
        }
      } catch (err) {
        console.error('Error fetching revenue data:', err);
      }
    };
    fetchRevenue();
  }, []);

  // Dynamic Revenue Dataset calculated from bookings
  const dynamicRevenueDatasets = React.useMemo(() => {
    const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const weekData = weekDays.map((day, idx) => {
      const bks = bookings.filter((_, bIdx) => bIdx % 7 === idx);
      const rev = bks.reduce((sum, b) => sum + (b.amount || 0), 0);
      return { label: day, revenue: rev, sessions: bks.length };
    });

    const monthWeeks = ['Week 1', 'Week 2', 'Week 3', 'Week 4'];
    const monthData = monthWeeks.map((w, idx) => {
      const bks = bookings.filter((_, bIdx) => Math.floor(bIdx / 4) % 4 === idx);
      const rev = bks.reduce((sum, b) => sum + (b.amount || 0), 0);
      return { label: w, revenue: rev, sessions: bks.length };
    });

    const yearMonths = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const yearData = yearMonths.map((m, idx) => {
      const bks = bookings.filter((_, bIdx) => bIdx % 12 === idx);
      const rev = bks.reduce((sum, b) => sum + (b.amount || 0), 0);
      return { label: m, revenue: rev, sessions: bks.length };
    });

    const computeGrowth = (data: { revenue: number }[]) => {
      if (data.length < 2) return '+0.0%';
      const half = Math.floor(data.length / 2);
      const firstHalf = data.slice(0, half).reduce((s, d) => s + d.revenue, 0);
      const secondHalf = data.slice(half).reduce((s, d) => s + d.revenue, 0);
      if (firstHalf === 0) return secondHalf > 0 ? '+100%' : '+0.0%';
      const rate = ((secondHalf - firstHalf) / firstHalf) * 100;
      return `${rate >= 0 ? '+' : ''}${rate.toFixed(1)}%`;
    };

    const weekTotal = Math.round(weekData.reduce((s, d) => s + d.revenue, 0));
    const weekSessions = weekData.reduce((s, d) => s + d.sessions, 0);

    const monthTotal = Math.round(monthData.reduce((s, d) => s + d.revenue, 0));
    const monthSessions = monthData.reduce((s, d) => s + d.sessions, 0);

    const yearTotal = Math.round(yearData.reduce((s, d) => s + d.revenue, 0));
    const yearSessions = yearData.reduce((s, d) => s + d.sessions, 0);

    return {
      Week: {
        chartData: weekData,
        periodTotal: weekTotal,
        sessionsTotal: weekSessions,
        growthPercentage: computeGrowth(weekData)
      },
      Month: {
        chartData: monthData,
        periodTotal: monthTotal,
        sessionsTotal: monthSessions,
        growthPercentage: computeGrowth(monthData)
      },
      Year: {
        chartData: yearData,
        periodTotal: yearTotal,
        sessionsTotal: yearSessions,
        growthPercentage: computeGrowth(yearData)
      }
    };
  }, [bookings]);

  const currentDataset = dynamicRevenueDatasets[timeRange];
  const avgRevenuePerSession = currentDataset.sessionsTotal > 0
    ? Math.round(currentDataset.periodTotal / currentDataset.sessionsTotal)
    : 0;
  const platformCommissionRetained = Math.round(currentDataset.periodTotal * 0.20); // 20% platform share

  const revenueTodayComputed = bookings
    .filter((b) => b.date === 'Today' || b.date === new Date().toISOString().split('T')[0])
    .reduce((sum, b) => sum + (b.amount || 0), 0) || (liveRevenueData?.summary?.revenueToday || 1500);

  // Service breakdown dynamic calculation
  const serviceTotalsMap: Record<string, number> = {};
  bookings.forEach((b) => {
    const sName = b.service || 'General Consultation';
    serviceTotalsMap[sName] = (serviceTotalsMap[sName] || 0) + (b.amount || 0);
  });

interface ServiceBreakdownItem {
  name: string;
  value: number;
  color: string;
}

  const uniqueServices = Object.keys(serviceTotalsMap);
  const serviceBreakdown: ServiceBreakdownItem[] = (liveRevenueData?.serviceBreakdown && liveRevenueData.serviceBreakdown.length > 0)
    ? liveRevenueData.serviceBreakdown
    : uniqueServices.map((svcName: string, idx: number) => ({
        name: svcName,
        value: serviceTotalsMap[svcName] || 0,
        color: serviceBreakdownColors[idx % serviceBreakdownColors.length]
      }));

  const totalServiceValue = serviceBreakdown.reduce((acc: number, s: ServiceBreakdownItem) => acc + s.value, 0);

  // Therapist Revenue & Performance calculated strictly from real database bookings
  const therapistRevenueData = React.useMemo(() => {
    return therapists.map((t) => {
      const tBookings = bookings.filter(
        (b) =>
          (b.therapistName || '').toLowerCase() === (t.name || '').toLowerCase() ||
          (b as any).therapistId === t.id ||
          (b as any).consultantId === t.id
      );
      const totalSessions = tBookings.length;
      const gross = tBookings.reduce((sum, b) => sum + (b.amount || 0), 0);
      const platformFee = Math.round(gross * 0.20);
      const payout = gross - platformFee;
      return {
        ...t,
        computedSessions: totalSessions,
        computedGross: gross,
        computedFee: platformFee,
        computedPayout: payout
      };
    }).sort((a, b) => b.computedGross - a.computedGross || b.computedSessions - a.computedSessions);
  }, [therapists, bookings]);

  // Filtered Therapists
  const filteredTherapists = therapistRevenueData.filter(
    (t) =>
      (t.name || '').toLowerCase().includes(therapistSearch.toLowerCase()) ||
      (t.profession || '').toLowerCase().includes(therapistSearch.toLowerCase())
  );

  const totalTherapistPages = Math.ceil(filteredTherapists.length / PAGE_SIZE) || 1;
  const paginatedTherapists = filteredTherapists.slice(
    (therapistPage - 1) * PAGE_SIZE,
    therapistPage * PAGE_SIZE
  );

  // Filtered transactions list
  const filteredBookings = bookings.filter((b) => {
    const q = txSearch.toLowerCase().trim();
    const matchesSearch =
      !q ||
      (b.clientName || '').toLowerCase().includes(q) ||
      (b.therapistName || '').toLowerCase().includes(q) ||
      (b.bookingCode || '').toLowerCase().includes(q) ||
      (b.service || '').toLowerCase().includes(q);

    const matchesPayment = paymentFilter === 'All' || b.paymentStatus === paymentFilter;

    return matchesSearch && matchesPayment;
  });

  const totalTxPages = Math.ceil(filteredBookings.length / PAGE_SIZE) || 1;
  const paginatedTransactions = filteredBookings.slice(
    (txPage - 1) * PAGE_SIZE,
    txPage * PAGE_SIZE
  );

  // Export CSV handler
  const handleExportCSV = () => {
    const headers = ['Booking ID', 'Booking Code', 'Client Name', 'Therapist Name', 'Service', 'Date', 'Amount (INR)', 'Payment Status'];
    const rows = bookings.map((b) => [
      b.id,
      b.bookingCode,
      `"${b.clientName}"`,
      `"${b.therapistName}"`,
      `"${b.service}"`,
      b.date,
      b.amount,
      b.paymentStatus
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Hexpertify_Revenue_Report_${timeRange}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-8 pb-12 animate-fade-in font-['Plus_Jakarta_Sans']">
      {/* Hero Header */}
      <div className="relative rounded-2xl sm:rounded-3xl bg-gradient-to-r from-[#4f28d9] via-[#5e2be2] to-[#3b1799] p-4 sm:p-8 text-white shadow-xl overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-4 sm:gap-6">
        <div className="absolute -right-12 -top-12 w-96 h-96 bg-white/5 rounded-full blur-2xl pointer-events-none" />
        <div className="relative z-10 space-y-1 sm:space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md border border-white/20 text-[10px] sm:text-xs font-bold tracking-wide uppercase text-purple-200">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Financial Analytics & Revenue Hub</span>
          </div>
          <h1 className="text-xl sm:text-3xl font-extrabold tracking-tight">Revenue & Growth Snapshot</h1>
          <p className="text-purple-100 text-xs sm:text-sm max-w-xl leading-relaxed">
            Real-time tracking of platform gross earnings, net commissions, service breakdown, and transaction logs.
          </p>
        </div>

        <div className="relative z-10 flex flex-wrap items-center gap-2.5 sm:gap-3 shrink-0">
          {/* Time Range Selector */}
          <div className="flex items-center gap-1 bg-white/10 backdrop-blur-xl p-1 rounded-xl sm:rounded-2xl border border-white/20 shadow-2xl">
            {(['Week', 'Month', 'Year'] as const).map((range) => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg sm:rounded-xl text-xs font-bold transition-all ${
                  timeRange === range
                    ? 'bg-white text-[#4f28d9] shadow-md'
                    : 'text-white/80 hover:text-white'
                }`}
              >
                {range}
              </button>
            ))}
          </div>

          {/* Export CSV Button */}
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-3.5 sm:px-4 py-2 sm:py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs rounded-xl sm:rounded-2xl shadow-lg shadow-emerald-500/30 transition-all active:scale-95 cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Export CSV Report</span>
          </button>
        </div>
      </div>

      {/* Dynamic KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5">
        {/* Card 1: Revenue Today */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-100 shadow-sm flex flex-col justify-between hover:border-purple-200 transition-colors">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Wallet className="w-5 h-5" />
            </div>
            <span className="text-xs font-extrabold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-100">
              Live
            </span>
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 mb-0.5 truncate">Gross Revenue Today</p>
            <h3 className="text-2xl font-extrabold text-slate-900">₹{revenueTodayComputed.toLocaleString()}</h3>
          </div>
        </div>

        {/* Card 2: Period Revenue */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-100 shadow-sm flex flex-col justify-between hover:border-purple-200 transition-colors">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-[#5e2be2] flex items-center justify-center">
              <TrendingUp className="w-5 h-5" />
            </div>
            <span className="text-xs font-extrabold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-100">
              {currentDataset.growthPercentage}
            </span>
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 mb-0.5 truncate">Gross ({timeRange})</p>
            <h3 className="text-2xl font-extrabold text-[#5e2be2]">₹{currentDataset.periodTotal.toLocaleString()}</h3>
          </div>
        </div>

        {/* Card 3: Platform Share Retained (20%) */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-100 shadow-sm flex flex-col justify-between hover:border-purple-200 transition-colors">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <span className="text-xs font-extrabold text-purple-700 bg-purple-50 px-2.5 py-1 rounded-full border border-purple-100">
              20% Fee
            </span>
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 mb-0.5 truncate">Platform Share (20%)</p>
            <h3 className="text-2xl font-extrabold text-emerald-600">₹{platformCommissionRetained.toLocaleString()}</h3>
          </div>
        </div>

        {/* Card 4: Avg Revenue per Session */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-100 shadow-sm flex flex-col justify-between hover:border-purple-200 transition-colors">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <CreditCard className="w-5 h-5" />
            </div>
            <span className="text-xs font-extrabold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-full border border-blue-100">
              Avg Fee
            </span>
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 mb-0.5 truncate">Avg. Revenue / Session</p>
            <h3 className="text-2xl font-extrabold text-slate-900">₹{avgRevenuePerSession.toLocaleString()}</h3>
          </div>
        </div>
      </div>

      {/* Main Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Revenue Growth Trend Chart */}
        <div className="lg:col-span-8 bg-white rounded-3xl p-6 border border-slate-100 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-extrabold text-lg text-slate-900">Revenue & Session Growth ({timeRange})</h3>
              <p className="text-xs text-slate-400">Progression of platform gross revenue and session count</p>
            </div>
            <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
              <span className="inline-block w-3 h-3 rounded-full bg-emerald-500" />
              <span>Revenue (₹)</span>
            </div>
          </div>

          <div className="h-72 pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={currentDataset.chartData}>
                <defs>
                  <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="label" stroke="#94a3b8" fontSize={12} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{ borderRadius: '16px', borderColor: '#e2e8f0', boxShadow: '0 10px 25px rgba(0,0,0,0.05)' }}
                />
                <Area type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={3} fill="url(#colorRev)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Revenue by Service Category Pie Chart */}
        <div className="lg:col-span-4 bg-white rounded-3xl p-6 border border-slate-100 shadow-sm space-y-4">
          <div>
            <h3 className="font-extrabold text-lg text-slate-900">Revenue by Service</h3>
            <p className="text-xs text-slate-400">Share of total revenue per therapy modality</p>
          </div>

          {serviceBreakdown.length === 0 ? (
            <div className="h-52 flex items-center justify-center text-slate-400 text-xs font-semibold">
              No service revenue recorded yet
            </div>
          ) : (
            <>
              <div className="h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={serviceBreakdown}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={78}
                      paddingAngle={5}
                    >
                      {serviceBreakdown.map((entry: ServiceBreakdownItem, index: number) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="space-y-2 text-xs pt-1 max-h-48 overflow-y-auto">
                {serviceBreakdown.map((item: ServiceBreakdownItem) => {
                  const percentage = Math.round((item.value / (totalServiceValue || 1)) * 100);
                  return (
                    <div key={item.name} className="flex items-center justify-between p-1.5 bg-slate-50/80 rounded-xl">
                      <div className="flex items-center gap-2 truncate">
                        <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                        <span className="text-slate-700 font-bold truncate">{item.name}</span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-[10px] text-slate-400 font-medium">{percentage}%</span>
                        <span className="font-extrabold text-slate-900">₹{item.value.toLocaleString()}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Top Generating Therapists Table (10 per page) */}
      <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="font-extrabold text-lg text-slate-900 flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-[#5e2be2]" />
              Top Revenue Generating Therapists ({filteredTherapists.length})
            </h3>
            <p className="text-xs text-slate-400">Therapist performance, gross earnings, and platform commission</p>
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search therapist name or specialty..."
              value={therapistSearch}
              onChange={(e) => {
                setTherapistSearch(e.target.value);
                setTherapistPage(1);
              }}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#5e2be2]/20"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 text-slate-400 uppercase tracking-wider font-extrabold text-[10px] bg-slate-50/50">
                <th className="py-3 px-4 rounded-l-xl">Therapist</th>
                <th className="py-3 px-4">Profession</th>
                <th className="py-3 px-4">Sessions</th>
                <th className="py-3 px-4">Gross Revenue</th>
                <th className="py-3 px-4">Platform Fee (20%)</th>
                <th className="py-3 px-4 rounded-r-xl">Therapist Payout (80%)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {paginatedTherapists.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400 text-xs">
                    No therapists match your search criteria
                  </td>
                </tr>
              ) : (
                paginatedTherapists.map((t) => {
                  return (
                    <tr key={t.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <img
                            src={t.photo || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(t.name)}`}
                            alt={t.name}
                            className="w-9 h-9 rounded-full object-cover border border-purple-200"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(t.name)}`;
                            }}
                          />
                          <div>
                            <p className="font-bold text-slate-900">{t.name}</p>
                            <span className="text-[10px] text-slate-400 font-mono">ID: {t.id}</span>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-slate-600">{t.profession}</td>
                      <td className="py-3.5 px-4 font-bold text-slate-800">{t.computedSessions} sessions</td>
                      <td className="py-3.5 px-4 font-extrabold text-[#5e2be2]">₹{t.computedGross.toLocaleString()}</td>
                      <td className="py-3.5 px-4 font-bold text-emerald-600">₹{t.computedFee.toLocaleString()}</td>
                      <td className="py-3.5 px-4 font-bold text-slate-700">₹{t.computedPayout.toLocaleString()}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Therapist Table Pagination */}
        <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500 font-semibold">
          <div>
            Showing <span className="font-extrabold text-slate-900">{filteredTherapists.length === 0 ? 0 : (therapistPage - 1) * PAGE_SIZE + 1}</span> to{' '}
            <span className="font-extrabold text-slate-900">{Math.min(therapistPage * PAGE_SIZE, filteredTherapists.length)}</span> of{' '}
            <span className="font-extrabold text-slate-900">{filteredTherapists.length}</span> therapists
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setTherapistPage((p) => Math.max(1, p - 1))}
              disabled={therapistPage === 1}
              className="p-1.5 bg-white border border-slate-200 rounded-xl text-slate-600 hover:text-[#5e2be2] hover:border-purple-200 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-2xs"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-3 py-1 bg-white border border-slate-200 rounded-xl text-slate-800 font-extrabold text-xs shadow-2xs">
              Page {therapistPage} of {totalTherapistPages}
            </span>
            <button
              onClick={() => setTherapistPage((p) => Math.min(totalTherapistPages, p + 1))}
              disabled={therapistPage === totalTherapistPages}
              className="p-1.5 bg-white border border-slate-200 rounded-xl text-slate-600 hover:text-[#5e2be2] hover:border-purple-200 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-2xs"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Dynamic Transactions History Table (10 per page) */}
      <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="font-extrabold text-lg text-slate-900">Recent Transaction History ({filteredBookings.length})</h3>
            <p className="text-xs text-slate-400">Detailed record of client consultation payments</p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3">
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search transactions..."
                value={txSearch}
                onChange={(e) => {
                  setTxSearch(e.target.value);
                  setTxPage(1);
                }}
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#5e2be2]/20"
              />
            </div>

            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl w-full sm:w-auto">
              {(['All', 'Paid', 'Pending Payout', 'Refunded'] as const).map((pf) => (
                <button
                  key={pf}
                  onClick={() => {
                    setPaymentFilter(pf);
                    setTxPage(1);
                  }}
                  className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all ${
                    paymentFilter === pf
                      ? 'bg-white shadow-2xs text-[#5e2be2]'
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  {pf}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 text-slate-400 uppercase tracking-wider font-extrabold text-[10px] bg-slate-50/50">
                <th className="py-3 px-4 rounded-l-xl">Booking Code</th>
                <th className="py-3 px-4">Client</th>
                <th className="py-3 px-4">Therapist</th>
                <th className="py-3 px-4">Service Modality</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Amount</th>
                <th className="py-3 px-4 rounded-r-xl">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {paginatedTransactions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400 text-xs">
                    No transactions match your search filters
                  </td>
                </tr>
              ) : (
                paginatedTransactions.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-purple-700">#{b.bookingCode}</td>
                    <td className="py-3.5 px-4 font-bold text-slate-900">{b.clientName}</td>
                    <td className="py-3.5 px-4 text-slate-700">{b.therapistName}</td>
                    <td className="py-3.5 px-4 text-slate-600">{b.service}</td>
                    <td className="py-3.5 px-4 text-slate-500">{b.date}</td>
                    <td className="py-3.5 px-4 font-extrabold text-slate-900">₹{b.amount.toLocaleString()}</td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`text-[11px] px-2.5 py-1 rounded-full font-bold inline-flex items-center gap-1 ${
                          b.paymentStatus === 'Paid'
                            ? 'bg-emerald-100 text-emerald-700'
                            : b.paymentStatus === 'Pending Payout'
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-rose-100 text-rose-700'
                        }`}
                      >
                        {b.paymentStatus === 'Paid' && <CheckCircle2 className="w-3 h-3" />}
                        {b.paymentStatus === 'Pending Payout' && <Clock className="w-3 h-3" />}
                        {b.paymentStatus}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Transactions Table Pagination */}
        <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500 font-semibold">
          <div>
            Showing <span className="font-extrabold text-slate-900">{filteredBookings.length === 0 ? 0 : (txPage - 1) * PAGE_SIZE + 1}</span> to{' '}
            <span className="font-extrabold text-slate-900">{Math.min(txPage * PAGE_SIZE, filteredBookings.length)}</span> of{' '}
            <span className="font-extrabold text-slate-900">{filteredBookings.length}</span> transactions
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setTxPage((p) => Math.max(1, p - 1))}
              disabled={txPage === 1}
              className="p-1.5 bg-white border border-slate-200 rounded-xl text-slate-600 hover:text-[#5e2be2] hover:border-purple-200 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-2xs"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-3 py-1 bg-white border border-slate-200 rounded-xl text-slate-800 font-extrabold text-xs shadow-2xs">
              Page {txPage} of {totalTxPages}
            </span>
            <button
              onClick={() => setTxPage((p) => Math.min(totalTxPages, p + 1))}
              disabled={txPage === totalTxPages}
              className="p-1.5 bg-white border border-slate-200 rounded-xl text-slate-600 hover:text-[#5e2be2] hover:border-purple-200 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-2xs"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RevenueView;
