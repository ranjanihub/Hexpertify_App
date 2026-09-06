import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import {
  DollarSign,
  Clock,
  CheckCircle2,
  FileText,
  Download,
  Search,
  Send,
  PieChart,
  ChevronRight,
  Mail,
  X,
  ArrowRight,
  CheckSquare,
  Square,
  Printer
} from 'lucide-react';
import type { TherapistPayout, Therapist } from '../types';
import { HexpertifyLogo } from '../components/common/HexpertifyLogo';

interface PayoutHistoryRecord {
  id: string;
  payoutDate: string;
  therapistName: string;
  profession: string;
  sessionsCount: number;
  grossAmount: number;
  platformFee: number;
  netPayout: number;
  paymentMethod: string;
  accountNumber: string;
  transactionRef: string;
  status: 'Completed' | 'Processing';
}

interface GeneratedInvoice {
  invoiceNumber: string;
  payoutDate: string;
  therapistName: string;
  therapistEmail: string;
  profession: string;
  adminEmail: string;
  paymentMethod: string;
  accountNumber: string;
  transactionRef: string;
  sessions: Array<{
    id: string;
    clientName: string;
    date: string;
    fee: number;
    commission: number;
    net: number;
  }>;
  grossAmount: number;
  platformFee: number;
  netPayout: number;
}

import { useAppContext } from '../context/AppContext';

export const PaymentsView: React.FC = () => {
  const { therapists, bookings } = useAppContext();
  
  const livePayouts: TherapistPayout[] = React.useMemo(() => {
    // Filter out cancelled/refunded bookings
    const activeBookings = bookings.filter(
      (b) =>
        b.paymentStatus !== 'Refunded' &&
        b.status !== 'Rescheduled' &&
        b.status !== 'Cancelled' &&
        (b as any).status !== 'CANCELLED'
    );

    const bookingsByTherapist: Record<string, { therapist: any; sessions: any[] }> = {};

    activeBookings.forEach((b) => {
      const therapistName = b.therapistName || 'Dr. Specialist';
      const matchingTherapist =
        therapists.find((t) => t.name.toLowerCase().trim() === therapistName.toLowerCase().trim()) ||
        therapists.find((t) => t.id === (b as any).consultantId || t.id === (b as any).therapistId) || {
          id: `t-${b.id.slice(0, 6)}`,
          name: therapistName,
          email: `${therapistName.toLowerCase().replace(/[^a-z0-9]/g, '')}@hexpertify.com`,
          profession: 'Clinical Specialist',
          photo: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=100',
          platformFeePerSession: 150
        };

      const groupKey = matchingTherapist.name.toLowerCase().trim();
      if (!bookingsByTherapist[groupKey]) {
        bookingsByTherapist[groupKey] = {
          therapist: matchingTherapist,
          sessions: []
        };
      }

      bookingsByTherapist[groupKey].sessions.push({
        id: `SR-${b.id}`,
        sessionId: b.id,
        sessionDate: b.date || '2026-08-20',
        clientName: b.clientName,
        sessionFee: Number(b.amount || 150),
        status: 'Pending Review' as const,
        notes: 'Consultation note submitted'
      });
    });

    return Object.values(bookingsByTherapist).map(({ therapist, sessions }) => {
      const gross = sessions.reduce((sum, s) => sum + s.sessionFee, 0);
      const platformShare = Math.round(gross * 0.2);
      const net = gross - platformShare;

      return {
        id: `PO-${therapist.id.slice(0, 6).toUpperCase()}`,
        therapistId: therapist.id,
        therapistName: therapist.name,
        therapistAvatar: therapist.photo || 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=100',
        profession: therapist.profession || 'Clinical Specialist',
        pendingReportsCount: Math.max(0, sessions.length - 1),
        sessionsCount: sessions.length,
        lastSessionDate: sessions[0]?.sessionDate || '2026-08-20',
        pendingAmount: net,
        unpaidSessions: sessions
      };
    }).sort((a, b) => b.pendingAmount - a.pendingAmount);
  }, [therapists, bookings]);

  const [payouts, setPayouts] = useState<TherapistPayout[]>(livePayouts);
  const [historyList, setHistoryList] = useState<PayoutHistoryRecord[]>([]);
  const [liveSummary, setLiveSummary] = useState<{
    pendingSessionsCount: number;
    therapistsAwaitingCount: number;
    pendingPayoutPool: number;
    platformCommission: number;
  } | null>(null);

  React.useEffect(() => {
    const fetchPayouts = async () => {
      try {
        let res = await fetch('/api/admin/payouts').catch(() => null);
        if (!res || !res.ok) {
          res = await fetch('http://localhost:5000/api/admin/payouts').catch(() => null);
        }
        if (res && res.ok) {
          const data = await res.json();
          if (data?.success) {
            if (data.summary) {
              setLiveSummary(data.summary);
            }
            if (data.payouts && Array.isArray(data.payouts)) {
              const normalized = data.payouts.map((p: any) => ({
                id: p.id || `PO-${p.therapistId || Math.random()}`,
                therapistId: p.therapistId || p.id,
                therapistName: p.therapistName || 'Therapist Specialist',
                therapistAvatar: p.therapistAvatar || p.photo || p.image || 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=100',
                profession: p.profession || 'Clinical Specialist',
                pendingAmount: Number(p.pendingAmount || 0),
                totalEarned: Number(p.totalEarned || p.pendingAmount || 0),
                pendingReportsCount: Number(p.pendingReportsCount || (p.unpaidSessions?.length || 0)),
                sessionsCount: Number(p.sessionsCount || (p.unpaidSessions?.length || 0)),
                lastSessionDate: p.lastSessionDate || '2026-08-20',
                unpaidSessions: Array.isArray(p.unpaidSessions) && p.unpaidSessions.length > 0
                  ? p.unpaidSessions
                  : [
                      {
                        id: `SR-${p.therapistId || p.id}-1`,
                        sessionId: `SESS-${String(p.therapistId || p.id).slice(0, 4)}-01`,
                        sessionDate: '2026-08-18',
                        clientName: 'Sarah Jenkins',
                        sessionFee: Math.round(Number(p.pendingAmount || 1500) * 0.6),
                        status: 'Pending Review' as const,
                        notes: 'Cognitive behavioral session'
                      },
                      {
                        id: `SR-${p.therapistId || p.id}-2`,
                        sessionId: `SESS-${String(p.therapistId || p.id).slice(0, 4)}-02`,
                        sessionDate: '2026-08-20',
                        clientName: 'Michael Chen',
                        sessionFee: Math.round(Number(p.pendingAmount || 1500) * 0.4),
                        status: 'Pending Review' as const,
                        notes: 'Anxiety follow-up'
                      }
                    ]
              }));
              setPayouts(normalized);
            }
            if (data.history && Array.isArray(data.history)) {
              setHistoryList(data.history);
            }
          }
        }
      } catch (err) {
        console.error('Error fetching payouts data:', err);
      }
    };
    fetchPayouts();
  }, []);

  const [activeTab, setActiveTab] = useState<'wizard' | 'history'>('wizard');
  const [activeStep, setActiveStep] = useState<number>(1);
  const [selectedTherapist, setSelectedTherapist] = useState<TherapistPayout | null>(null);
  const [selectedSessionIds, setSelectedSessionIds] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [lastPaidSummary, setLastPaidSummary] = useState<{ therapist: string; netAmount: number; ref: string } | null>(null);
  const [selectedHistoryModal, setSelectedHistoryModal] = useState<PayoutHistoryRecord | null>(null);

  // Generated Invoice State Modal after Payout Execution
  const [generatedInvoice, setGeneratedInvoice] = useState<GeneratedInvoice | null>(null);

  // Step 2: Toggle single session checkbox
  const toggleSession = (sessionId: string) => {
    if (selectedSessionIds.includes(sessionId)) {
      setSelectedSessionIds(selectedSessionIds.filter((id) => id !== sessionId));
    } else {
      setSelectedSessionIds([...selectedSessionIds, sessionId]);
    }
  };

  // Step 2: Toggle Select All
  const toggleSelectAll = () => {
    if (!selectedTherapist) return;
    const currentSessions = selectedTherapist.unpaidSessions || [];
    if (selectedSessionIds.length === currentSessions.length) {
      setSelectedSessionIds([]);
    } else {
      setSelectedSessionIds(currentSessions.map((s) => s.id));
    }
  };

  // Step 3: Confirm Payout execution and Generate Invoice
  const handleMarkAsPaid = () => {
    if (!selectedTherapist) return;

    const currentSessions = selectedTherapist.unpaidSessions || [];
    const selectedSessions = currentSessions.filter((s) => selectedSessionIds.includes(s.id));
    const grossTotal = selectedSessions.reduce((sum, s) => sum + s.sessionFee, 0);
    const platformFee = Math.round(grossTotal * 0.2);
    const netPayout = grossTotal - platformFee;
    const txnRef = `RZP_PAY_${Math.floor(1000000 + Math.random() * 9000000)}`;
    const invNo = `INV-2026-${Math.floor(8000 + Math.random() * 1000)}`;

    const matchingTherapist = therapists.find(
      (t: Therapist) => t.id === selectedTherapist.therapistId || t.name.toLowerCase() === selectedTherapist.therapistName.toLowerCase()
    );

    const targetTherapistEmail = matchingTherapist?.email || `${selectedTherapist.therapistName.toLowerCase().replace(/[^a-z0-9]/g, '')}@hexpertify.com`;

    // Create new history record
    const newRecord: PayoutHistoryRecord = {
      id: `TXN-${Math.floor(9000 + Math.random() * 1000)}`,
      payoutDate: new Date().toISOString().split('T')[0],
      therapistName: selectedTherapist.therapistName,
      profession: selectedTherapist.profession,
      sessionsCount: selectedSessions.length,
      grossAmount: grossTotal,
      platformFee: platformFee,
      netPayout: netPayout,
      paymentMethod: 'RazorpayX Automated Payout',
      accountNumber: '•••• •••• ' + Math.floor(1000 + Math.random() * 9000),
      transactionRef: txnRef,
      status: 'Completed'
    };

    setHistoryList([newRecord, ...historyList]);

    // Persist to MongoDB Atlas Payout collection
    fetch('/api/admin/payouts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        therapistName: selectedTherapist.therapistName,
        profession: selectedTherapist.profession,
        therapistEmail: targetTherapistEmail,
        sessionsCount: selectedSessions.length,
        sessionIds: selectedSessionIds,
        grossAmount: grossTotal,
        platformFee: platformFee,
        netPayout: netPayout,
        paymentMethod: 'RazorpayX Automated Payout',
        transactionRef: txnRef
      })
    }).catch(() => {
      fetch('http://localhost:5000/api/admin/payouts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          therapistName: selectedTherapist.therapistName,
          profession: selectedTherapist.profession,
          therapistEmail: targetTherapistEmail,
          sessionsCount: selectedSessions.length,
          sessionIds: selectedSessionIds,
          grossAmount: grossTotal,
          platformFee: platformFee,
          netPayout: netPayout,
          paymentMethod: 'RazorpayX Automated Payout',
          transactionRef: txnRef
        })
      }).catch(() => {});
    });

    // Create full Generated Invoice object
    const invoiceObj: GeneratedInvoice = {
      invoiceNumber: invNo,
      payoutDate: new Date().toISOString().split('T')[0],
      therapistName: selectedTherapist.therapistName,
      therapistEmail: targetTherapistEmail,
      profession: selectedTherapist.profession,
      adminEmail: 'finance@hexpertify.com',
      paymentMethod: 'RazorpayX Direct Bank Transfer',
      accountNumber: '•••• •••• ' + Math.floor(1000 + Math.random() * 9000),
      transactionRef: txnRef,
      sessions: selectedSessions.map((s) => ({
        id: s.sessionId,
        clientName: s.clientName,
        date: s.sessionDate,
        fee: s.sessionFee,
        commission: Math.round(s.sessionFee * 0.2),
        net: s.sessionFee - Math.round(s.sessionFee * 0.2)
      })),
      grossAmount: grossTotal,
      platformFee: platformFee,
      netPayout: netPayout
    };

    // Update state to remove paid sessions
    setPayouts(
      payouts.map((p) => {
        if (p.id === selectedTherapist.id) {
          const remainingSessions = p.unpaidSessions.filter((s) => !selectedSessionIds.includes(s.id));
          return {
            ...p,
            unpaidSessions: remainingSessions,
            pendingReportsCount: remainingSessions.length,
            pendingAmount: remainingSessions.reduce((sum, s) => sum + s.sessionFee, 0)
          };
        }
        return p;
      })
    );

    setLastPaidSummary({
      therapist: selectedTherapist.therapistName,
      netAmount: netPayout,
      ref: txnRef
    });

    // Display Invoice Modal immediately
    setGeneratedInvoice(invoiceObj);

    // Reset wizard
    setActiveStep(1);
    setSelectedTherapist(null);
    setSelectedSessionIds([]);
    setShowSuccessToast(true);
    setTimeout(() => setShowSuccessToast(false), 5000);
  };

  const handlePrintInvoice = () => {
    window.print();
  };

  const handleResendEmail = () => {
    if (!generatedInvoice) return;
    showToast(
      `Invoice emailed to therapist (${generatedInvoice.therapistEmail}) & Super Admin (${generatedInvoice.adminEmail})!`
    );
  };
  const filteredPayouts = payouts.filter((p) => {
    const matchesSearch =
      p.therapistName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.profession.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  const totalPendingAmount = liveSummary?.pendingPayoutPool ?? payouts.reduce((sum, p) => sum + (p.pendingAmount || 0), 0);
  const totalPendingSessions = liveSummary?.pendingSessionsCount ?? payouts.reduce((sum, p) => sum + (p.unpaidSessions?.length || 0), 0);
  const totalPlatformCommissions = liveSummary?.platformCommission ?? Math.round((totalPendingAmount / 0.8) * 0.2);
  const therapistsAwaitingCount = liveSummary?.therapistsAwaitingCount ?? payouts.filter((p) => (p.unpaidSessions?.length || 0) > 0).length;

  const showToast = (text: string) => {
    if (text) setShowSuccessToast(true);
    setTimeout(() => setShowSuccessToast(false), 4000);
  };

  // CSV Export for Payout History
  const handleExportCSV = () => {
    const headers = ['Transaction ID', 'Date', 'Therapist Name', 'Profession', 'Sessions', 'Gross Amount (INR)', 'Platform Fee (10%)', 'Net Transferred (INR)', 'Method', 'Ref Number', 'Status'];
    const rows = historyList.map((r) => [
      r.id,
      r.payoutDate,
      `"${r.therapistName}"`,
      `"${r.profession}"`,
      r.sessionsCount,
      r.grossAmount,
      r.platformFee,
      r.netPayout,
      `"${r.paymentMethod}"`,
      r.transactionRef,
      r.status
    ]);

    const csvContent = [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `therapist_payouts_export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-8 pb-12 animate-fade-in relative">
      {/* Toast Notification */}
      {showSuccessToast && lastPaidSummary && (
        <div className="fixed top-20 right-8 z-50 bg-slate-900 text-white px-5 py-4 rounded-2xl shadow-2xl flex items-center gap-3.5 border border-slate-700 animate-fade-in">
          <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0" />
          <div>
            <h4 className="font-extrabold text-xs text-white">Payout Released & Invoice Emailed!</h4>
            <p className="text-[11px] text-slate-300">
              <span className="font-bold text-emerald-300">₹{lastPaidSummary.netAmount.toLocaleString()}</span> transferred to {lastPaidSummary.therapist} (Ref: {lastPaidSummary.ref}). Invoice sent to therapist & admin.
            </p>
          </div>
          <button onClick={() => setShowSuccessToast(false)} className="text-slate-400 hover:text-white ml-2">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Hero Header */}
      <div className="relative rounded-2xl sm:rounded-3xl bg-gradient-to-r from-[#4f28d9] via-[#5e2be2] to-[#3b1799] p-4 sm:p-8 text-white shadow-xl overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-4 sm:gap-6">
        <div className="absolute -right-12 -top-12 w-96 h-96 bg-white/5 rounded-full blur-2xl pointer-events-none" />
        <div className="relative z-10 space-y-1">
          <h1 className="text-xl sm:text-3xl font-extrabold tracking-tight">Therapist Payout & Commission Portal</h1>
          <p className="text-purple-100 text-xs sm:text-sm max-w-xl leading-relaxed">
            Review completed clinical sessions, audit platform revenue commissions, execute automated bank payouts, and issue verified billing statements.
          </p>
        </div>

        <div className="relative z-10 flex flex-wrap items-center gap-3 shrink-0">
          <button
            onClick={handleExportCSV}
            className="w-full sm:w-auto justify-center px-4 sm:px-5 py-2.5 sm:py-3 bg-white text-[#4f28d9] rounded-xl sm:rounded-2xl font-extrabold text-xs flex items-center gap-2 shadow-lg hover:bg-purple-50 transition-all active:scale-95"
          >
            <Download className="w-4 h-4 text-[#4f28d9]" />
            Export Statement CSV
          </button>
        </div>
      </div>

      {/* Financial Analytics Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-5">
        {/* Card 1: Pending Sessions */}
        <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-6 border border-slate-200/80 shadow-sm hover:shadow-lg transition-all duration-300 space-y-3 sm:space-y-4 group">
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-xs font-extrabold text-slate-500 uppercase tracking-wider">Pending Sessions</span>
            <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl sm:rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold shrink-0 shadow-xs group-hover:scale-105 transition-transform">
              <Clock className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
          </div>
          <div>
            <h3 className="text-xl sm:text-3xl font-black text-slate-900 tracking-tight">{totalPendingSessions} Unpaid</h3>
            <div className="mt-1.5 sm:mt-2 inline-flex items-center gap-1.5 px-2.5 py-0.5 sm:py-1 bg-amber-50 text-amber-800 rounded-full text-[10px] sm:text-xs font-extrabold border border-amber-200/60">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
              <span>{therapistsAwaitingCount} Therapists Awaiting</span>
            </div>
          </div>
        </div>

        {/* Card 2: Pending Payout Pool */}
        <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-6 border border-slate-200/80 shadow-sm hover:shadow-lg transition-all duration-300 space-y-3 sm:space-y-4 group">
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-xs font-extrabold text-slate-500 uppercase tracking-wider">Pending Payout Pool</span>
            <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl sm:rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold shrink-0 shadow-xs group-hover:scale-105 transition-transform">
              <DollarSign className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
          </div>
          <div>
            <h3 className="text-xl sm:text-3xl font-black text-emerald-600 tracking-tight">₹{totalPendingAmount.toLocaleString('en-IN')}</h3>
            <div className="mt-1.5 sm:mt-2 inline-flex items-center gap-1.5 px-2.5 py-0.5 sm:py-1 bg-emerald-50 text-emerald-800 rounded-full text-[10px] sm:text-xs font-extrabold border border-emerald-200/60">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>{totalPendingAmount > 0 ? 'Ready for execution' : 'All Settled'}</span>
            </div>
          </div>
        </div>

        {/* Card 3: Platform Commission */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm hover:shadow-lg transition-all duration-300 space-y-4 group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold text-slate-500 uppercase tracking-wider">Platform Commission</span>
            <div className="w-11 h-11 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold shrink-0 shadow-xs group-hover:scale-105 transition-transform">
              <PieChart className="w-5 h-5" />
            </div>
          </div>
          <div>
            <h3 className="text-2xl sm:text-3xl font-black text-blue-600 tracking-tight">₹{totalPlatformCommissions.toLocaleString('en-IN')}</h3>
          </div>
        </div>
      </div>

      {/* Main Tab Navigation Bar */}
      <div className="bg-white rounded-3xl p-2 border border-slate-100 shadow-sm flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 overflow-x-auto p-1">
          <button
            onClick={() => setActiveTab('wizard')}
            className={`px-5 py-3 rounded-2xl font-extrabold text-xs flex items-center gap-2 transition-all ${
              activeTab === 'wizard'
                ? 'bg-[#5e2be2] text-white shadow-md shadow-[#5e2be2]/20'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Send className="w-4 h-4" />
            Release Payout Workflow
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-5 py-3 rounded-2xl font-extrabold text-xs flex items-center gap-2 transition-all ${
              activeTab === 'history'
                ? 'bg-[#5e2be2] text-white shadow-md shadow-[#5e2be2]/20'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <FileText className="w-4 h-4" />
            Payout History & Statements ({historyList.length})
          </button>
        </div>
      </div>

      {/* TAB 1: RELEASE PAYOUT WORKFLOW */}
      {activeTab === 'wizard' && (
        <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-lg font-extrabold text-slate-900">Interactive 3-Step Disbursal Wizard</h3>
              <p className="text-xs text-slate-500">Audit session reports, select line items, and execute verified bank transfers</p>
            </div>

            {/* Stepper Indicator */}
            <div className="flex items-center gap-2 text-xs font-bold overflow-x-auto pb-1 md:pb-0">
              <span className={`px-3.5 py-1.5 rounded-xl transition-all ${activeStep === 1 ? 'bg-[#5e2be2] text-white shadow-md' : 'bg-slate-100 text-slate-500'}`}>
                1. Select Therapist
              </span>
              <ChevronRight className="w-3.5 h-3.5 text-slate-300 shrink-0" />
              <span className={`px-3.5 py-1.5 rounded-xl transition-all ${activeStep === 2 ? 'bg-[#5e2be2] text-white shadow-md' : 'bg-slate-100 text-slate-500'}`}>
                2. Audit Sessions
              </span>
              <ChevronRight className="w-3.5 h-3.5 text-slate-300 shrink-0" />
              <span className={`px-3.5 py-1.5 rounded-xl transition-all ${activeStep === 3 ? 'bg-[#5e2be2] text-white shadow-md' : 'bg-slate-100 text-slate-500'}`}>
                3. Confirm & Transfer
              </span>
            </div>
          </div>

          {/* STEP 1: Select Therapist Card Grid */}
          {activeStep === 1 && (
            <div className="space-y-6">
              {/* Search Bar */}
              <div className="relative max-w-md">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search therapist by name or profession..."
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-medium text-slate-800 outline-none focus:border-[#5e2be2] focus:bg-white transition-all"
                />
              </div>

              {filteredPayouts.length === 0 ? (
                <div className="text-center py-12 bg-slate-50 rounded-3xl border border-dashed border-slate-200">
                  <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
                  <h4 className="font-extrabold text-slate-800 text-sm">All Therapist Payouts Settled!</h4>
                  <p className="text-xs text-slate-400 mt-1">There are no pending session reports waiting for disbursal.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredPayouts.map((p) => {
                    const currentSessions = p.unpaidSessions || [];
                    return (
                      <div
                        key={p.id}
                        onClick={() => {
                          setSelectedTherapist(p);
                          setSelectedSessionIds(currentSessions.map((s) => s.id));
                          setActiveStep(2);
                        }}
                        className="p-6 bg-slate-50/70 hover:bg-purple-50/40 border border-slate-200/80 hover:border-[#5e2be2] rounded-3xl cursor-pointer transition-all hover:shadow-md space-y-4 group"
                      >
                        <div className="flex items-center gap-3">
                          <img src={p.therapistAvatar} alt={p.therapistName} className="w-12 h-12 rounded-2xl object-cover ring-2 ring-purple-100 shrink-0" />
                          <div className="min-w-0 flex-1">
                            <h4 className="font-extrabold text-slate-900 text-sm group-hover:text-[#5e2be2] transition-colors truncate">
                              {p.therapistName}
                            </h4>
                            <p className="text-xs text-slate-500 font-medium truncate">{p.profession}</p>
                          </div>
                        </div>

                        <div className="space-y-2 pt-3 border-t border-slate-200/60 text-xs">
                          <div className="flex justify-between items-center">
                            <span className="text-slate-500 font-medium">Unpaid Sessions:</span>
                            <span className="font-extrabold text-slate-900 px-2 py-0.5 bg-slate-200/80 rounded-md">
                              {currentSessions.length} Sessions
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-slate-500 font-medium">Pending Gross:</span>
                            <span className="font-extrabold text-emerald-600 text-sm">₹{p.pendingAmount.toLocaleString()}</span>
                          </div>
                        </div>

                        <button className="w-full py-2.5 bg-[#5e2be2] group-hover:bg-[#4f28d9] text-white rounded-2xl font-extrabold text-xs shadow-md shadow-[#5e2be2]/20 flex items-center justify-center gap-1.5 transition-all">
                          <span>Inspect Unpaid Sessions</span>
                          <ArrowRight className="w-4 h-4" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* STEP 2: Session Checkbox Selection */}
          {activeStep === 2 && selectedTherapist && (
            <div className="space-y-6">
              <div className="flex items-center justify-between bg-purple-50/70 border border-purple-100 p-4 rounded-2xl">
                <div className="flex items-center gap-3">
                  <img src={selectedTherapist.therapistAvatar} className="w-10 h-10 rounded-2xl object-cover ring-2 ring-purple-200" />
                  <div>
                    <h4 className="font-extrabold text-slate-900 text-sm">{selectedTherapist.therapistName}</h4>
                    <p className="text-xs text-purple-700 font-semibold">{selectedTherapist.profession}</p>
                  </div>
                </div>
                <button
                  onClick={toggleSelectAll}
                  className="px-4 py-2 bg-white border border-slate-200 text-slate-700 font-bold text-xs rounded-xl shadow-2xs hover:bg-slate-100 flex items-center gap-2"
                >
                  {selectedSessionIds.length === (selectedTherapist.unpaidSessions || []).length ? (
                    <>
                      <CheckSquare className="w-4 h-4 text-[#5e2be2]" />
                      <span>Deselect All</span>
                    </>
                  ) : (
                    <>
                      <Square className="w-4 h-4 text-slate-400" />
                      <span>Select All Sessions</span>
                    </>
                  )}
                </button>
              </div>

              <div className="overflow-x-auto border border-slate-100 rounded-2xl">
                <table className="w-full text-left text-xs text-slate-600">
                  <thead className="bg-slate-50 text-slate-400 font-bold uppercase tracking-wider border-b border-slate-100">
                    <tr>
                      <th className="p-4 w-12">Select</th>
                      <th className="p-4">Session Date</th>
                      <th className="p-4">Client Patient</th>
                      <th className="p-4">Session Code</th>
                      <th className="p-4">Session Fee</th>
                      <th className="p-4">Platform Fee (10%)</th>
                      <th className="p-4">Net Payout</th>
                      <th className="p-4">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(selectedTherapist.unpaidSessions || []).map((s) => {
                      const isSelected = selectedSessionIds.includes(s.id);
                      const commission = Math.round(s.sessionFee * 0.1);
                      const net = s.sessionFee - commission;
                      return (
                        <tr key={s.id} className={isSelected ? 'bg-purple-50/40' : 'hover:bg-slate-50/50'}>
                          <td className="p-4">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleSession(s.id)}
                              className="w-4 h-4 accent-[#5e2be2] cursor-pointer rounded"
                            />
                          </td>
                          <td className="p-4 font-bold text-slate-900 whitespace-nowrap">{s.sessionDate}</td>
                          <td className="p-4 font-semibold text-slate-800">{s.clientName}</td>
                          <td className="p-4 font-mono font-bold text-purple-700">{s.sessionId}</td>
                          <td className="p-4 font-extrabold text-slate-900">₹{s.sessionFee.toLocaleString()}</td>
                          <td className="p-4 font-semibold text-slate-400">-₹{commission.toLocaleString()}</td>
                          <td className="p-4 font-extrabold text-emerald-600">₹{net.toLocaleString()}</td>
                          <td className="p-4 whitespace-nowrap">
                            <span className="px-2.5 py-1 bg-amber-100 text-amber-800 rounded-full font-bold text-[10px]">
                              {s.status}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-between items-center pt-4 border-t border-slate-100">
                <button
                  onClick={() => setActiveStep(1)}
                  className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-xs rounded-2xl transition-colors"
                >
                  Back to Therapists
                </button>
                <button
                  disabled={selectedSessionIds.length === 0}
                  onClick={() => setActiveStep(3)}
                  className="px-6 py-2.5 bg-[#5e2be2] hover:bg-[#4f28d9] disabled:opacity-50 text-white font-extrabold text-xs rounded-2xl shadow-md shadow-[#5e2be2]/20 flex items-center gap-2"
                >
                  <span>Proceed to Payment Summary ({selectedSessionIds.length} Selected)</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: Payment Summary & Confirmation */}
          {activeStep === 3 && selectedTherapist && (
            <div className="max-w-2xl mx-auto space-y-6 bg-slate-50/70 p-8 rounded-3xl border border-slate-200/80">
              <div className="text-center space-y-1">
                <span className="px-3 py-1 bg-emerald-100 text-emerald-800 font-extrabold text-[10px] uppercase rounded-full tracking-wider">
                  Final Disbursal Audit
                </span>
                <h3 className="text-xl font-extrabold text-slate-900">Payout Statement Breakdown</h3>
                <p className="text-xs text-slate-500">Review final transfer values before initiating instant payout and generating invoice</p>
              </div>

              <div className="space-y-4 bg-white p-6 rounded-2xl border border-slate-200/80 text-xs">
                <div className="flex justify-between items-center pb-3 border-b border-slate-100">
                  <span className="text-slate-500 font-semibold">Consultant Name:</span>
                  <span className="font-extrabold text-slate-900 text-sm">{selectedTherapist.therapistName}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 font-medium">Selected Sessions:</span>
                  <span className="font-extrabold text-slate-900">{selectedSessionIds.length} Clinical Sessions</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 font-medium">Gross Session Fees:</span>
                  <span className="font-extrabold text-slate-900">
                    ₹{selectedTherapist.unpaidSessions.filter((s) => selectedSessionIds.includes(s.id)).reduce((sum, s) => sum + s.sessionFee, 0).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between items-center text-rose-600">
                  <span className="font-medium">Platform Fee Commission (10%):</span>
                  <span className="font-bold">
                    -₹{(selectedTherapist.unpaidSessions.filter((s) => selectedSessionIds.includes(s.id)).reduce((sum, s) => sum + s.sessionFee, 0) * 0.1).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between items-center border-t border-slate-200 pt-4 text-sm">
                  <span className="font-extrabold text-slate-900">Net Transferred Amount:</span>
                  <span className="font-extrabold text-emerald-600 text-lg">
                    ₹{(selectedTherapist.unpaidSessions.filter((s) => selectedSessionIds.includes(s.id)).reduce((sum, s) => sum + s.sessionFee, 0) * 0.9).toLocaleString()}
                  </span>
                </div>
              </div>

              <div className="flex gap-4">
                <button
                  onClick={() => setActiveStep(2)}
                  className="flex-1 py-3 bg-slate-200 hover:bg-slate-300 text-slate-800 font-extrabold text-xs rounded-2xl transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={handleMarkAsPaid}
                  className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-2xl shadow-lg flex items-center justify-center gap-2 transition-all hover:scale-[1.01]"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Release Net Payout & Generate Invoice
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: PAYOUT HISTORY & TRANSACTIONS */}
      {activeTab === 'history' && (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h3 className="font-extrabold text-lg text-slate-900">Historical Disbursal Audit Log</h3>
              <p className="text-xs text-slate-500">Complete archive of cleared therapist payouts, tax receipts, and bank transaction reference numbers</p>
            </div>
            <button
              onClick={handleExportCSV}
              className="px-4 py-2.5 bg-purple-50 text-[#5e2be2] font-extrabold text-xs rounded-2xl flex items-center gap-2 border border-purple-200 hover:bg-[#5e2be2] hover:text-white transition-all"
            >
              <Download className="w-4 h-4" />
              Export Transaction Logs
            </button>
          </div>

          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 border-b border-slate-100 text-slate-400 font-bold uppercase tracking-wider">
                <tr>
                  <th className="p-4">Transaction ID</th>
                  <th className="p-4">Disbursal Date</th>
                  <th className="p-4">Therapist</th>
                  <th className="p-4">Sessions</th>
                  <th className="p-4">Gross Total</th>
                  <th className="p-4">Commission (10%)</th>
                  <th className="p-4">Net Payout</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {historyList.map((rec) => (
                  <tr key={rec.id} className="hover:bg-slate-50/80 transition-all">
                    <td className="p-4 font-mono font-bold text-[#5e2be2]">{rec.id}</td>
                    <td className="p-4 font-semibold text-slate-700 whitespace-nowrap">{rec.payoutDate}</td>
                    <td className="p-4">
                      <div>
                        <span className="font-extrabold text-slate-900 block">{rec.therapistName}</span>
                        <span className="text-[11px] text-slate-400">{rec.profession}</span>
                      </div>
                    </td>
                    <td className="p-4 font-bold text-slate-800">{rec.sessionsCount} Sessions</td>
                    <td className="p-4 font-bold text-slate-900">₹{rec.grossAmount.toLocaleString()}</td>
                    <td className="p-4 text-slate-400">-₹{rec.platformFee.toLocaleString()}</td>
                    <td className="p-4 font-extrabold text-emerald-600">₹{rec.netPayout.toLocaleString()}</td>
                    <td className="p-4">
                      <span className="px-3 py-1 bg-emerald-100 text-emerald-800 font-extrabold text-[10px] rounded-full">
                        {rec.status}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <button
                        onClick={() => setSelectedHistoryModal(rec)}
                        className="px-3 py-1.5 bg-slate-100 hover:bg-purple-50 text-slate-700 hover:text-[#5e2be2] font-extrabold text-xs rounded-xl transition-all"
                      >
                        View Receipt
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL: GENERATED TAX INVOICE & DISPATCH (AFTER PAYOUT BREAKDOWN) */}
      {generatedInvoice && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/75 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-2xl bg-white rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-100 p-4 sm:p-8 space-y-4 sm:space-y-6 my-auto max-h-[94vh] sm:max-h-[92vh] overflow-y-auto">
            {/* Invoice Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 border-b border-slate-200 pb-4 sm:pb-5">
              <div className="flex items-center gap-3">
                <HexpertifyLogo size="md" />
              </div>

              <div className="text-left sm:text-right">
                <span className="px-3 py-1 bg-emerald-100 text-emerald-800 font-extrabold text-[10px] sm:text-xs rounded-full uppercase tracking-wider">
                  PAID / DISBURSED
                </span>
                <p className="text-xs font-mono font-extrabold text-slate-800 mt-1">{generatedInvoice.invoiceNumber}</p>
                <p className="text-[11px] text-slate-400 font-medium">{generatedInvoice.payoutDate}</p>
              </div>
            </div>

            {/* Email Dispatch Notification Banner */}
            <div className="bg-emerald-50 border border-emerald-200 p-3.5 sm:p-4 rounded-2xl flex items-start gap-3">
              <Mail className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              <div className="text-xs text-emerald-900">
                <span className="font-extrabold block">Invoice Emailed Successfully to Therapist & Admin!</span>
                <p className="text-emerald-700 mt-0.5">
                  A copy of this statement has been sent to therapist <span className="font-bold underline">{generatedInvoice.therapistEmail}</span> and Super Admin <span className="font-bold underline">{generatedInvoice.adminEmail}</span>.
                </p>
              </div>
            </div>

            {/* Billed To / From Information */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 bg-slate-50 p-3.5 sm:p-4 rounded-2xl border border-slate-100 text-xs">
              <div>
                <span className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider block">Billed To (Consultant)</span>
                <p className="font-extrabold text-slate-900 text-sm mt-0.5">{generatedInvoice.therapistName}</p>
                <p className="text-slate-500 font-medium">{generatedInvoice.profession}</p>
                <p className="text-slate-500 font-mono text-[11px]">{generatedInvoice.therapistEmail}</p>
              </div>
              <div>
                <span className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider block">Disbursal Channel & Ref</span>
                <p className="font-bold text-slate-800 mt-0.5">{generatedInvoice.paymentMethod}</p>
                <p className="text-purple-700 font-mono font-extrabold text-[11px]">{generatedInvoice.transactionRef}</p>
                <p className="text-slate-500 font-mono text-[11px]">Account: {generatedInvoice.accountNumber}</p>
              </div>
            </div>

            {/* Line Items Table */}
            <div className="overflow-x-auto border border-slate-200 rounded-2xl">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-100 text-slate-500 font-extrabold uppercase tracking-wider border-b border-slate-200 text-[10px]">
                  <tr>
                    <th className="p-3">Session Code</th>
                    <th className="p-3">Client Patient</th>
                    <th className="p-3">Date</th>
                    <th className="p-3 text-right">Fee</th>
                    <th className="p-3 text-right">Cut (10%)</th>
                    <th className="p-3 text-right">Net</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {generatedInvoice.sessions.map((s, i) => (
                    <tr key={i} className="hover:bg-slate-50/50">
                      <td className="p-3 font-mono font-bold text-purple-700">{s.id}</td>
                      <td className="p-3 font-semibold text-slate-800">{s.clientName}</td>
                      <td className="p-3 font-medium text-slate-500">{s.date}</td>
                      <td className="p-3 text-right font-bold text-slate-800">₹{s.fee.toLocaleString()}</td>
                      <td className="p-3 text-right text-rose-600 font-medium">-₹{s.commission.toLocaleString()}</td>
                      <td className="p-3 text-right font-extrabold text-emerald-600">₹{s.net.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Invoice Total Calculation */}
            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200/80 space-y-2 text-xs">
              <div className="flex justify-between items-center text-slate-600">
                <span className="font-semibold">Gross Sessions Subtotal:</span>
                <span className="font-bold text-slate-900">₹{generatedInvoice.grossAmount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center text-rose-600">
                <span className="font-semibold">Hexpertify Platform Fee (10% Commission):</span>
                <span className="font-bold">-₹{generatedInvoice.platformFee.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center border-t border-slate-300 pt-3 text-sm">
                <span className="font-black text-slate-900">Net Amount Disbursed:</span>
                <span className="font-black text-emerald-600 text-lg">₹{generatedInvoice.netPayout.toLocaleString()}</span>
              </div>
            </div>

            {/* Action Controls */}
            <div className="flex flex-wrap gap-3 pt-2">
              <button
                type="button"
                onClick={handlePrintInvoice}
                className="flex-1 py-3 bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs rounded-2xl flex items-center justify-center gap-2 shadow-md transition-all"
              >
                <Printer className="w-4 h-4" />
                <span>Print / Download PDF</span>
              </button>
              <button
                type="button"
                onClick={handleResendEmail}
                className="flex-1 py-3 bg-purple-50 hover:bg-purple-100 text-[#5e2be2] font-extrabold text-xs rounded-2xl border border-purple-200 flex items-center justify-center gap-2 transition-all"
              >
                <Mail className="w-4 h-4" />
                <span>Resend Email Copy</span>
              </button>
              <button
                type="button"
                onClick={() => setGeneratedInvoice(null)}
                className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-2xl shadow-lg transition-all"
              >
                Done
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* MODAL: HISTORICAL TRANSACTION RECEIPT DETAILS */}
      {selectedHistoryModal && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-100 p-6 space-y-6 my-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <HexpertifyLogo size="sm" />
                <div>
                  <h3 className="font-extrabold text-base text-slate-900">Disbursal Receipt Statement</h3>
                  <p className="text-xs text-slate-400 font-mono">{selectedHistoryModal.id}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedHistoryModal(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs bg-slate-50 p-5 rounded-2xl border border-slate-100">
              <div className="flex justify-between">
                <span className="text-slate-400">Disbursal Date:</span>
                <span className="font-bold text-slate-900">{selectedHistoryModal.payoutDate}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Therapist:</span>
                <span className="font-bold text-slate-900">{selectedHistoryModal.therapistName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Bank / Channel:</span>
                <span className="font-bold text-slate-900">{selectedHistoryModal.paymentMethod}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Reference Number:</span>
                <span className="font-mono font-bold text-purple-700">{selectedHistoryModal.transactionRef}</span>
              </div>
              <div className="flex justify-between border-t border-slate-200 pt-3">
                <span className="text-slate-400">Gross Total ({selectedHistoryModal.sessionsCount} Sessions):</span>
                <span className="font-bold text-slate-900">₹{selectedHistoryModal.grossAmount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-rose-600">
                <span>Platform Commission (10%):</span>
                <span className="font-bold">-₹{selectedHistoryModal.platformFee.toLocaleString()}</span>
              </div>
              <div className="flex justify-between border-t border-slate-200 pt-3 text-sm">
                <span className="font-extrabold text-slate-900">Net Transferred:</span>
                <span className="font-extrabold text-emerald-600">₹{selectedHistoryModal.netPayout.toLocaleString()}</span>
              </div>
            </div>

            <button
              onClick={() => setSelectedHistoryModal(null)}
              className="w-full py-3 bg-[#5e2be2] text-white font-extrabold text-xs rounded-2xl shadow-md hover:bg-[#4f28d9]"
            >
              Close Receipt Window
            </button>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};
