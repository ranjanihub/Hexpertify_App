import React, { useCallback, useEffect, useState } from 'react';
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
  Printer,
  Building2,
  Smartphone,
  Pencil,
  AlertTriangle
} from 'lucide-react';
import { HexpertifyLogo } from '../components/common/HexpertifyLogo';
import { api } from '../lib/apiClient';

/** One completed, paid session not yet paid out (fees computed by the server from the therapist's plans) */
interface UnpaidSession {
  id: string;
  sessionId: string;
  bookingNumber?: string;
  sessionDate: string | null;
  clientName: string;
  serviceTitle?: string;
  sessionFee: number;
  platformFee: number;
  therapistShare: number;
  status: string;
}

/** A therapist's payout position, as GET /api/admin/payouts returns it */
interface PayoutRow {
  id: string;
  therapistId: string;
  therapistName: string;
  therapistEmail: string;
  therapistAvatar: string;
  profession: string;
  hasPlans: boolean;
  commissionRate: number;
  grossAmount: number;
  platformFee: number;
  pendingAmount: number;
  bankName: string;
  bankAccountNumber: string;
  bankIfsc: string;
  accountHolderName: string;
  upiId: string;
  unpaidSessions: UnpaidSession[];
}

/** A stored payout invoice (PayoutInvoice record) */
interface PayoutInvoice {
  id: string;
  invoiceNumber: string;
  payoutDate: string;
  therapistId: string;
  therapistName: string;
  therapistEmail: string;
  profession: string;
  sessionsCount: number;
  grossAmount: number;
  platformFee: number;
  netPayout: number;
  paymentMethod: string;
  accountNumber: string;
  transactionRef: string;
  sessions: Array<{ id: string; clientName: string; date: string; fee: number; commission: number; net: number }>;
  emailed: boolean | null;
  status: string;
}

interface PayoutSummary {
  pendingSessionsCount: number;
  therapistsAwaitingCount: number;
  pendingPayoutPool: number;
  platformCommission: number;
}

const inr = (n: number) => `₹${Number(n || 0).toLocaleString('en-IN')}`;
const csvCell = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
const str = (v: unknown) => (typeof v === 'string' ? v : v == null ? '' : String(v));

const toPayoutRow = (p: any): PayoutRow => ({
  id: str(p.id),
  therapistId: str(p.therapistId),
  therapistName: str(p.therapistName) || 'Therapist',
  therapistEmail: str(p.therapistEmail),
  therapistAvatar: str(p.therapistAvatar),
  profession: str(p.profession),
  hasPlans: Boolean(p.hasPlans),
  commissionRate: Number(p.commissionRate) || 0,
  grossAmount: Number(p.grossAmount) || 0,
  platformFee: Number(p.platformFee) || 0,
  pendingAmount: Number(p.pendingAmount) || 0,
  bankName: str(p.bankName),
  bankAccountNumber: str(p.bankAccountNumber),
  bankIfsc: str(p.bankIfsc),
  accountHolderName: str(p.accountHolderName),
  upiId: str(p.upiId),
  unpaidSessions: (Array.isArray(p.unpaidSessions) ? p.unpaidSessions : []).map((s: any) => ({
    id: str(s.id),
    sessionId: str(s.sessionId),
    bookingNumber: str(s.bookingNumber),
    sessionDate: s.sessionDate || null,
    clientName: str(s.clientName) || 'Client',
    serviceTitle: str(s.serviceTitle),
    sessionFee: Number(s.sessionFee) || 0,
    platformFee: Number(s.platformFee) || 0,
    therapistShare: Number(s.therapistShare) || 0,
    status: str(s.status) || 'Pending Review'
  }))
});

const toInvoice = (h: any): PayoutInvoice => ({
  id: str(h.id || h.invoiceNumber),
  invoiceNumber: str(h.invoiceNumber),
  payoutDate: str(h.payoutDate),
  therapistId: str(h.therapistId),
  therapistName: str(h.therapistName),
  therapistEmail: str(h.therapistEmail),
  profession: str(h.profession),
  sessionsCount: Number(h.sessionsCount) || 0,
  grossAmount: Number(h.grossAmount) || 0,
  platformFee: Number(h.platformFee) || 0,
  netPayout: Number(h.netPayout) || 0,
  paymentMethod: str(h.paymentMethod),
  accountNumber: str(h.accountNumber),
  transactionRef: str(h.transactionRef),
  sessions: (Array.isArray(h.sessions) ? h.sessions : []).map((s: any) => ({
    id: str(s.id),
    clientName: str(s.clientName),
    date: str(s.date),
    fee: Number(s.fee) || 0,
    commission: Number(s.commission) || 0,
    net: Number(s.net) || 0
  })),
  emailed: typeof h.emailed === 'boolean' ? h.emailed : null,
  status: str(h.status) || 'Completed'
});

export const PaymentsView: React.FC = () => {
  // Everything on this page comes from the server: unpaid sessions, the summary cards and the stored invoices
  const [payouts, setPayouts] = useState<PayoutRow[]>([]);
  const [historyList, setHistoryList] = useState<PayoutInvoice[]>([]);
  const [summary, setSummary] = useState<PayoutSummary | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const [activeTab, setActiveTab] = useState<'wizard' | 'history'>('wizard');
  const [activeStep, setActiveStep] = useState<number>(1);
  const [selectedTherapistId, setSelectedTherapistId] = useState<string | null>(null);
  const [selectedSessionIds, setSelectedSessionIds] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [toast, setToast] = useState<{ text: string; tone: 'success' | 'warning' } | null>(null);

  // The invoice shown in the invoice dialog (just released, or opened from the history)
  const [openInvoice, setOpenInvoice] = useState<PayoutInvoice | null>(null);
  const [isResending, setIsResending] = useState(false);

  // Step 3: where the money was sent and the bank/UPI reference of that transfer, as typed by the admin
  const [disbursalMethod, setDisbursalMethod] = useState<'Bank Transfer' | 'UPI'>('Bank Transfer');
  const [bankName, setBankName] = useState('');
  const [bankAccountNumber, setBankAccountNumber] = useState('');
  const [bankIfsc, setBankIfsc] = useState('');
  const [accountHolderName, setAccountHolderName] = useState('');
  const [upiId, setUpiId] = useState('');
  const [transactionRef, setTransactionRef] = useState('');
  const [isEditingDetailsModal, setIsEditingDetailsModal] = useState(false);
  const [isSavingDetails, setIsSavingDetails] = useState(false);
  const [detailsError, setDetailsError] = useState<string | null>(null);
  const [payoutSaveNotice, setPayoutSaveNotice] = useState<string | null>(null);
  const [confirmingRelease, setConfirmingRelease] = useState(false);
  const [isReleasing, setIsReleasing] = useState(false);
  const [releaseError, setReleaseError] = useState<string | null>(null);

  const showToast = (text: string, tone: 'success' | 'warning' = 'success') => {
    setToast({ text, tone });
    setTimeout(() => setToast(null), 6000);
  };

  const loadPayouts = useCallback(async () => {
    setIsLoading(true);
    try {
      const data: any = await api.get('/api/admin/payouts');
      if (data?.success === false) throw new Error(data?.error || 'The server could not load payouts');
      setPayouts((Array.isArray(data?.payouts) ? data.payouts : []).map(toPayoutRow));
      setHistoryList((Array.isArray(data?.history) ? data.history : []).map(toInvoice));
      setSummary(data?.summary || null);
      setLoadError(null);
    } catch (err: any) {
      setLoadError(err?.message || 'Could not load payouts');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPayouts();
  }, [loadPayouts]);

  const selectedTherapist = payouts.find((p) => p.therapistId === selectedTherapistId) || null;

  // A newly chosen therapist starts with their saved details (never made-up ones) and an empty reference
  useEffect(() => {
    if (!selectedTherapist) return;
    setBankName(selectedTherapist.bankName);
    setBankAccountNumber(selectedTherapist.bankAccountNumber);
    setBankIfsc(selectedTherapist.bankIfsc);
    setAccountHolderName(selectedTherapist.accountHolderName);
    setUpiId(selectedTherapist.upiId);
    setDisbursalMethod(!selectedTherapist.bankAccountNumber && selectedTherapist.upiId ? 'UPI' : 'Bank Transfer');
    setTransactionRef('');
    setReleaseError(null);
    setConfirmingRelease(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTherapistId]);

  const selectedSessions = (selectedTherapist?.unpaidSessions || []).filter((s) => selectedSessionIds.includes(s.id));
  const selectedGross = selectedSessions.reduce((sum, s) => sum + s.sessionFee, 0);
  const selectedFee = selectedSessions.reduce((sum, s) => sum + s.platformFee, 0);
  const selectedNet = selectedSessions.reduce((sum, s) => sum + s.therapistShare, 0);
  const commissionLabel = selectedTherapist
    ? selectedTherapist.hasPlans
      ? "from the therapist's plans"
      : `${Math.round(selectedTherapist.commissionRate * 1000) / 10}% platform default`
    : '';

  const destination = disbursalMethod === 'UPI' ? upiId.trim() : bankAccountNumber.trim();
  const canRelease = Boolean(selectedTherapist && selectedSessions.length && destination && transactionRef.trim().length >= 4);

  const handleSavePayoutDetails = async () => {
    if (!selectedTherapist) return;
    setIsSavingDetails(true);
    setDetailsError(null);
    try {
      const payload = {
        bankName: bankName.trim(),
        bankAccountNumber: bankAccountNumber.trim(),
        bankIfsc: bankIfsc.trim().toUpperCase(),
        accountHolderName: accountHolderName.trim(),
        upiId: upiId.trim()
      };
      const saved: any = await api.put(`/api/admin/consultants/${encodeURIComponent(selectedTherapist.therapistId)}`, payload);
      if (saved?.success === false) throw new Error(saved?.error || 'The server did not save the details');
      // Only after the server confirmed: keep the saved values in this page's copy
      setPayouts((prev) => prev.map((p) => (p.therapistId === selectedTherapist.therapistId ? { ...p, ...payload } : p)));
      setPayoutSaveNotice(`Bank and UPI details saved for ${selectedTherapist.therapistName}.`);
      setTimeout(() => setPayoutSaveNotice(null), 5000);
      setIsEditingDetailsModal(false);
    } catch (err: any) {
      setDetailsError(`Details not saved: ${err?.message || 'the server could not save them'}.`);
    } finally {
      setIsSavingDetails(false);
    }
  };

  // Closing the details dialog without saving goes back to the saved details
  const discardDetailEdits = () => {
    if (selectedTherapist) {
      setBankName(selectedTherapist.bankName);
      setBankAccountNumber(selectedTherapist.bankAccountNumber);
      setBankIfsc(selectedTherapist.bankIfsc);
      setAccountHolderName(selectedTherapist.accountHolderName);
      setUpiId(selectedTherapist.upiId);
    }
    setDetailsError(null);
    setIsEditingDetailsModal(false);
  };

  const toggleSession = (sessionId: string) => {
    setSelectedSessionIds((prev) => (prev.includes(sessionId) ? prev.filter((id) => id !== sessionId) : [...prev, sessionId]));
  };

  const toggleSelectAll = () => {
    if (!selectedTherapist) return;
    const all = selectedTherapist.unpaidSessions.map((s) => s.id);
    setSelectedSessionIds(selectedSessionIds.length === all.length ? [] : all);
  };

  // Step 3: record a payout the admin has already sent. The server numbers the invoice, works out the amounts
  // from the sessions still unpaid and emails the therapist; nothing changes here until it confirms.
  const handleMarkAsPaid = async () => {
    if (!selectedTherapist || isReleasing || !canRelease) return;
    setReleaseError(null);
    setIsReleasing(true);
    try {
      const saved: any = await api.post('/api/admin/payouts', {
        therapistId: selectedTherapist.therapistId,
        sessionIds: selectedSessions.map((s) => s.sessionId),
        paymentMethod: disbursalMethod,
        accountNumber: destination,
        transactionRef: transactionRef.trim()
      });
      if (saved?.success === false || !saved?.invoice) throw new Error(saved?.error || 'the server did not save the payout');
      const invoice = toInvoice(saved.invoice);
      setOpenInvoice(invoice);
      setActiveStep(1);
      setSelectedTherapistId(null);
      setSelectedSessionIds([]);
      setConfirmingRelease(false);
      showToast(
        saved.emailed
          ? `Payout ${invoice.invoiceNumber} recorded: ${inr(invoice.netPayout)} to ${invoice.therapistName}. Invoice emailed to ${invoice.therapistEmail}.`
          : `Payout ${invoice.invoiceNumber} recorded, but the invoice email was not sent: ${saved.emailError || 'unknown error'}.`,
        saved.emailed ? 'success' : 'warning'
      );
      await loadPayouts();
    } catch (e: any) {
      setReleaseError(`Payout not recorded: ${e?.message || 'the server could not save it'}.`);
      setConfirmingRelease(false);
    } finally {
      setIsReleasing(false);
    }
  };

  // Prints only the invoice (see the print styles on the invoice dialog)
  const handlePrintInvoice = () => {
    window.print();
  };

  const handleResendEmail = async () => {
    if (!openInvoice || isResending) return;
    setIsResending(true);
    try {
      const res: any = await api.post('/api/admin/payouts', { action: 'resend-invoice', invoiceNumber: openInvoice.invoiceNumber });
      if (res?.emailed) {
        showToast(`Invoice ${openInvoice.invoiceNumber} emailed again to ${res.to || openInvoice.therapistEmail}.`);
        setOpenInvoice({ ...openInvoice, emailed: true });
      } else {
        showToast(`Invoice email not sent: ${res?.emailError || res?.error || 'unknown error'}.`, 'warning');
      }
    } catch (err: any) {
      showToast(`Invoice email not sent: ${err?.message || 'the server could not send it'}.`, 'warning');
    } finally {
      setIsResending(false);
    }
  };

  // Step 1 lists only therapists with sessions still to pay
  const filteredPayouts = payouts.filter((p) => {
    if (!p.unpaidSessions.length) return false;
    const q = searchTerm.toLowerCase();
    return p.therapistName.toLowerCase().includes(q) || p.profession.toLowerCase().includes(q);
  });

  const totalPendingSessions = summary?.pendingSessionsCount ?? 0;
  const therapistsAwaitingCount = summary?.therapistsAwaitingCount ?? 0;
  const totalPendingAmount = summary?.pendingPayoutPool ?? 0;
  const totalPlatformCommissions = summary?.platformCommission ?? 0;

  // CSV of every stored payout invoice
  const handleExportCSV = () => {
    if (!historyList.length) {
      showToast('There are no released payouts to export yet.', 'warning');
      return;
    }
    const headers = ['Invoice No', 'Payout Date', 'Therapist Name', 'Therapist Email', 'Profession', 'Sessions', 'Gross Amount (INR)', 'Platform Fee (INR)', 'Net Paid (INR)', 'Method', 'Paid To', 'Transfer Reference', 'Status'];
    const rows = historyList.map((r) => [
      r.invoiceNumber, r.payoutDate, r.therapistName, r.therapistEmail, r.profession, r.sessionsCount,
      r.grossAmount, r.platformFee, r.netPayout, r.paymentMethod, r.accountNumber, r.transactionRef, r.status
    ].map(csvCell).join(','));
    const blob = new Blob([[headers.map(csvCell).join(','), ...rows].join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `therapist_payouts_export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast(`Exported ${historyList.length} payout record(s).`);
  };

  return (
    <div className="space-y-8 pb-12 animate-fade-in relative">
      {/* Toast Notification */}
      {toast && (
        <div className={`fixed top-20 right-4 sm:right-8 z-[60] max-w-md text-white px-5 py-4 rounded-2xl shadow-2xl flex items-start gap-3.5 border animate-fade-in ${toast.tone === 'success' ? 'bg-slate-900 border-slate-700' : 'bg-amber-600 border-amber-500'}`}>
          {toast.tone === 'success' ? <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0" /> : <AlertTriangle className="w-6 h-6 text-white shrink-0" />}
          <p className="text-xs font-bold leading-relaxed">{toast.text}</p>
          <button onClick={() => setToast(null)} className="text-slate-200 hover:text-white ml-2" aria-label="Close">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Hero Header */}
      <div className="relative rounded-2xl sm:rounded-3xl bg-gradient-to-r from-[#3a0aa8] via-[#450bc8] to-[#3b1799] p-4 sm:p-8 text-white shadow-xl overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-4 sm:gap-6">
        <div className="absolute -right-12 -top-12 w-96 h-96 bg-white/5 rounded-full blur-2xl pointer-events-none" />
        <div className="relative z-10 space-y-1">
          <h1 className="text-xl sm:text-3xl font-extrabold tracking-tight">Therapist Payout & Commission Portal</h1>
          <p className="text-purple-100 text-xs sm:text-sm max-w-xl leading-relaxed">
            Review completed sessions, record the payouts you have sent, and issue payout invoices.
          </p>
        </div>

        <div className="relative z-10 flex flex-wrap items-center gap-3 shrink-0">
          <button
            onClick={handleExportCSV}
            className="w-full sm:w-auto justify-center px-4 sm:px-5 py-2.5 sm:py-3 bg-white text-[#3a0aa8] rounded-xl sm:rounded-2xl font-extrabold text-xs flex items-center gap-2 shadow-lg hover:bg-purple-50 transition-all active:scale-95"
          >
            <Download className="w-4 h-4 text-[#3a0aa8]" />
            Export Statement CSV
          </button>
        </div>
      </div>

      {loadError && (
        <div className="flex items-start gap-2 p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 font-semibold">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>Payouts could not be loaded: {loadError}</span>
          <button onClick={loadPayouts} className="ml-auto underline font-bold">Retry</button>
        </div>
      )}

      {/* Financial Analytics Summary KPI Cards (server figures) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-5">
        <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-6 border border-slate-200/80 shadow-sm hover:shadow-lg transition-all duration-300 space-y-3 sm:space-y-4 group">
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-xs font-extrabold text-slate-500 uppercase tracking-wider">Pending Sessions</span>
            <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl sm:rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold shrink-0 shadow-xs group-hover:scale-105 transition-transform">
              <Clock className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
          </div>
          <div>
            <h3 className="text-xl sm:text-3xl font-black text-slate-900 tracking-tight">{summary ? `${totalPendingSessions} Unpaid` : '—'}</h3>
            <div className="mt-1.5 sm:mt-2 inline-flex items-center gap-1.5 px-2.5 py-0.5 sm:py-1 bg-amber-50 text-amber-800 rounded-full text-[10px] sm:text-xs font-extrabold border border-amber-200/60">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
              <span>{therapistsAwaitingCount} Therapists Awaiting</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-6 border border-slate-200/80 shadow-sm hover:shadow-lg transition-all duration-300 space-y-3 sm:space-y-4 group">
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-xs font-extrabold text-slate-500 uppercase tracking-wider">Pending Payout Pool</span>
            <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl sm:rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold shrink-0 shadow-xs group-hover:scale-105 transition-transform">
              <DollarSign className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
          </div>
          <div>
            <h3 className="text-xl sm:text-3xl font-black text-emerald-600 tracking-tight">{summary ? inr(totalPendingAmount) : '—'}</h3>
            <div className="mt-1.5 sm:mt-2 inline-flex items-center gap-1.5 px-2.5 py-0.5 sm:py-1 bg-emerald-50 text-emerald-800 rounded-full text-[10px] sm:text-xs font-extrabold border border-emerald-200/60">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>{totalPendingAmount > 0 ? 'Owed to therapists' : 'All Settled'}</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-6 border border-slate-200/80 shadow-sm hover:shadow-lg transition-all duration-300 space-y-3 sm:space-y-4 group sm:col-span-2 lg:col-span-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-xs font-extrabold text-slate-500 uppercase tracking-wider">Platform Commission</span>
            <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl sm:rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold shrink-0 shadow-xs group-hover:scale-105 transition-transform">
              <PieChart className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
          </div>
          <div>
            <h3 className="text-xl sm:text-3xl font-black text-blue-600 tracking-tight">{summary ? inr(totalPlatformCommissions) : '—'}</h3>
            <p className="text-[10px] sm:text-xs text-slate-400 font-semibold mt-1">On the sessions awaiting payout (therapists&apos; plan fees)</p>
          </div>
        </div>
      </div>

      {/* Main Tab Navigation Bar */}
      <div className="bg-white rounded-3xl p-2 border border-slate-100 shadow-sm flex flex-wrap items-center justify-between gap-3">
        <div className="grid grid-cols-1 min-[400px]:grid-cols-2 sm:flex sm:items-center gap-1.5 overflow-x-auto p-1 w-full sm:w-auto">
          <button
            onClick={() => setActiveTab('wizard')}
            className={`px-3 sm:px-5 py-3 rounded-2xl font-extrabold text-xs flex items-center justify-center sm:justify-start text-center gap-2 transition-all ${
              activeTab === 'wizard' ? 'bg-[#450bc8] text-white shadow-md shadow-[#450bc8]/20' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Send className="w-4 h-4" />
            Release Payout Workflow
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-3 sm:px-5 py-3 rounded-2xl font-extrabold text-xs flex items-center justify-center sm:justify-start text-center gap-2 transition-all ${
              activeTab === 'history' ? 'bg-[#450bc8] text-white shadow-md shadow-[#450bc8]/20' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <FileText className="w-4 h-4" />
            Payout History & Statements ({historyList.length})
          </button>
        </div>
      </div>

      {/* TAB 1: RELEASE PAYOUT WORKFLOW */}
      {activeTab === 'wizard' && (
        <div className="bg-white rounded-3xl p-4 sm:p-6 border border-slate-100 shadow-sm space-y-6">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-lg font-extrabold text-slate-900">3-Step Payout Wizard</h3>
              <p className="text-xs text-slate-500">Select the sessions, send the money from your bank or UPI app, then record the transfer here</p>
            </div>

            <div className="flex items-center gap-2 text-xs font-bold overflow-x-auto pb-1 lg:pb-0">
              {['1. Select Therapist', '2. Audit Sessions', '3. Confirm & Record'].map((label, idx) => (
                <React.Fragment key={label}>
                  {idx > 0 && <ChevronRight className="w-3.5 h-3.5 text-slate-300 shrink-0" />}
                  <span className={`px-3.5 py-1.5 rounded-xl whitespace-nowrap shrink-0 transition-all ${activeStep === idx + 1 ? 'bg-[#450bc8] text-white shadow-md' : 'bg-slate-100 text-slate-500'}`}>
                    {label}
                  </span>
                </React.Fragment>
              ))}
            </div>
          </div>

          {/* STEP 1: Select Therapist Card Grid */}
          {activeStep === 1 && (
            <div className="space-y-6">
              <div className="relative max-w-md">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search therapist by name or profession..."
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-medium text-slate-800 outline-none focus:border-[#450bc8] focus:bg-white transition-all"
                />
              </div>

              {isLoading && !payouts.length ? (
                <div className="text-center py-12 text-xs text-slate-400 font-semibold">Loading payouts…</div>
              ) : filteredPayouts.length === 0 ? (
                <div className="text-center py-12 bg-slate-50 rounded-3xl border border-dashed border-slate-200">
                  <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
                  <h4 className="font-extrabold text-slate-800 text-sm">{loadError ? 'Payouts are not available' : 'All Therapist Payouts Settled!'}</h4>
                  <p className="text-xs text-slate-400 mt-1">{loadError ? 'See the message above.' : 'There are no completed, paid sessions waiting for a payout.'}</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
                  {filteredPayouts.map((p) => (
                    <div
                      key={p.id}
                      onClick={() => {
                        setSelectedTherapistId(p.therapistId);
                        setSelectedSessionIds(p.unpaidSessions.map((s) => s.id));
                        setActiveStep(2);
                      }}
                      className="p-4 sm:p-6 bg-slate-50/70 hover:bg-purple-50/40 border border-slate-200/80 hover:border-[#450bc8] rounded-3xl cursor-pointer transition-all hover:shadow-md space-y-4 group"
                    >
                      <div className="flex items-center gap-3">
                        {p.therapistAvatar ? (
                          <img src={p.therapistAvatar} alt={p.therapistName} className="w-12 h-12 rounded-2xl object-cover ring-2 ring-purple-100 shrink-0" />
                        ) : (
                          <div className="w-12 h-12 rounded-2xl bg-purple-100 text-[#450bc8] font-extrabold text-lg flex items-center justify-center ring-2 ring-purple-100 shrink-0">
                            {(p.therapistName || 'T').charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <h4 className="font-extrabold text-slate-900 text-sm group-hover:text-[#450bc8] transition-colors truncate">{p.therapistName}</h4>
                          <p className="text-xs text-slate-500 font-medium truncate">{p.profession || '—'}</p>
                        </div>
                      </div>

                      <div className="space-y-2 pt-3 border-t border-slate-200/60 text-xs">
                        <div className="flex justify-between items-center">
                          <span className="text-slate-500 font-medium">Unpaid Sessions:</span>
                          <span className="font-extrabold text-slate-900 px-2 py-0.5 bg-slate-200/80 rounded-md">{p.unpaidSessions.length} Sessions</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-slate-500 font-medium">Pending Payout:</span>
                          <span className="font-extrabold text-emerald-600 text-sm">{inr(p.pendingAmount)}</span>
                        </div>
                      </div>

                      <button className="w-full py-2.5 bg-[#450bc8] group-hover:bg-[#3a0aa8] text-white rounded-2xl font-extrabold text-xs shadow-md shadow-[#450bc8]/20 flex items-center justify-center gap-1.5 transition-all">
                        <span>Inspect Unpaid Sessions</span>
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* STEP 2: Session Checkbox Selection */}
          {activeStep === 2 && selectedTherapist && (
            <div className="space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-3 bg-purple-50/70 border border-purple-100 p-4 rounded-2xl">
                <div>
                  <h4 className="font-extrabold text-slate-900 text-sm">{selectedTherapist.therapistName}</h4>
                  <p className="text-xs text-purple-700 font-semibold">{selectedTherapist.profession || '—'}</p>
                </div>
                <button
                  onClick={toggleSelectAll}
                  className="px-4 py-2 bg-white border border-slate-200 text-slate-700 font-bold text-xs rounded-xl shadow-2xs hover:bg-slate-100 flex items-center gap-2"
                >
                  {selectedSessionIds.length === selectedTherapist.unpaidSessions.length ? (
                    <>
                      <CheckSquare className="w-4 h-4 text-[#450bc8]" />
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
                <table className="w-full min-w-[760px] whitespace-nowrap text-left text-xs text-slate-600">
                  <thead className="bg-slate-50 text-slate-400 font-bold uppercase tracking-wider border-b border-slate-100">
                    <tr>
                      <th className="p-4 w-12">Select</th>
                      <th className="p-4">Session Date</th>
                      <th className="p-4">Client</th>
                      <th className="p-4">Booking</th>
                      <th className="p-4">Session Fee</th>
                      <th className="p-4">Platform Fee ({commissionLabel})</th>
                      <th className="p-4">Net Payout</th>
                      <th className="p-4">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {selectedTherapist.unpaidSessions.map((s) => {
                      const isSelected = selectedSessionIds.includes(s.id);
                      return (
                        <tr key={s.id} className={isSelected ? 'bg-purple-50/40' : 'hover:bg-slate-50/50'}>
                          <td className="p-4">
                            <input type="checkbox" checked={isSelected} onChange={() => toggleSession(s.id)} className="w-4 h-4 accent-[#450bc8] cursor-pointer rounded" />
                          </td>
                          <td className="p-4 font-bold text-slate-900 whitespace-nowrap">{s.sessionDate || '—'}</td>
                          <td className="p-4 font-semibold text-slate-800">{s.clientName}</td>
                          <td className="p-4 font-mono font-bold text-purple-700">{s.bookingNumber || s.sessionId}</td>
                          <td className="p-4 font-extrabold text-slate-900">{inr(s.sessionFee)}</td>
                          <td className="p-4 font-semibold text-slate-400">-{inr(s.platformFee)}</td>
                          <td className="p-4 font-extrabold text-emerald-600">{inr(s.therapistShare)}</td>
                          <td className="p-4 whitespace-nowrap">
                            <span className="px-2.5 py-1 bg-amber-100 text-amber-800 rounded-full font-bold text-[10px]">{s.status}</span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="flex flex-col-reverse sm:flex-row justify-between sm:items-center gap-3 pt-4 border-t border-slate-100">
                <button onClick={() => setActiveStep(1)} className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-xs rounded-2xl transition-colors">
                  Back to Therapists
                </button>
                <button
                  disabled={selectedSessionIds.length === 0}
                  onClick={() => setActiveStep(3)}
                  className="px-6 py-2.5 bg-[#450bc8] hover:bg-[#3a0aa8] disabled:opacity-50 text-white font-extrabold text-xs rounded-2xl shadow-md shadow-[#450bc8]/20 flex items-center justify-center text-center gap-2"
                >
                  <span>Proceed to Payment Summary ({selectedSessionIds.length} Selected)</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: Payment Summary & Confirmation */}
          {activeStep === 3 && selectedTherapist && (
            <div className="max-w-2xl mx-auto space-y-6 bg-slate-50/70 p-4 sm:p-8 rounded-3xl border border-slate-200/80">
              <div className="text-center space-y-1">
                <span className="px-3 py-1 bg-emerald-100 text-emerald-800 font-extrabold text-[10px] uppercase rounded-full tracking-wider">Final Disbursal Audit</span>
                <h3 className="text-xl font-extrabold text-slate-900">Payout Statement Breakdown</h3>
                <p className="text-xs text-slate-500">Send the net amount from your bank or UPI app first, then record the transfer and its reference here.</p>
              </div>

              <div className="space-y-4 bg-white p-4 sm:p-6 rounded-2xl border border-slate-200/80 text-xs">
                <div className="flex justify-between items-center pb-3 border-b border-slate-100">
                  <span className="text-slate-500 font-semibold">Consultant Name:</span>
                  <span className="font-extrabold text-slate-900 text-sm">{selectedTherapist.therapistName}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 font-medium">Invoice email:</span>
                  <span className="font-bold text-slate-900 break-all text-right">{selectedTherapist.therapistEmail || '—'}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 font-medium">Selected Sessions:</span>
                  <span className="font-extrabold text-slate-900">{selectedSessions.length} Sessions</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 font-medium">Gross Session Fees:</span>
                  <span className="font-extrabold text-slate-900">{inr(selectedGross)}</span>
                </div>
                <div className="flex justify-between items-center text-rose-600">
                  <span className="font-medium">Platform Fee ({commissionLabel}):</span>
                  <span className="font-bold">-{inr(selectedFee)}</span>
                </div>
                <div className="flex justify-between items-center border-t border-slate-200 pt-4 text-sm">
                  <span className="font-extrabold text-slate-900">Net Amount to Pay:</span>
                  <span className="font-extrabold text-emerald-600 text-lg">{inr(selectedNet)}</span>
                </div>
              </div>

              {!selectedTherapist.therapistEmail && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2 text-amber-800 text-xs font-bold">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>This therapist has no email address on file, so the invoice cannot be emailed. Add one on the Therapists page, or record the payout and share the printed invoice.</span>
                </div>
              )}

              {/* Disbursal Channel: the therapist's saved details; nothing is filled in for them */}
              <div className="space-y-4 bg-white p-4 sm:p-6 rounded-2xl border border-slate-200/80">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <span className="text-xs font-extrabold text-slate-900 uppercase tracking-wider block">Disbursal Channel</span>
                    <span className="text-[11px] text-slate-400 font-medium">Where you sent the money</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => { setDetailsError(null); setIsEditingDetailsModal(true); }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-purple-50 hover:bg-purple-100 text-[#450bc8] font-extrabold text-xs rounded-xl border border-purple-200 transition-colors shadow-2xs self-start sm:self-auto"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                    <span>Configure / Edit Details</span>
                  </button>
                </div>

                {payoutSaveNotice && (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2 text-emerald-800 text-xs font-bold animate-fade-in">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>{payoutSaveNotice}</span>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {(['Bank Transfer', 'UPI'] as const).map((method) => {
                    const active = disbursalMethod === method;
                    const isUpi = method === 'UPI';
                    const missing = isUpi ? !upiId.trim() : !bankAccountNumber.trim();
                    return (
                      <button
                        key={method}
                        type="button"
                        onClick={() => setDisbursalMethod(method)}
                        className={`p-4 rounded-2xl border-2 text-left transition-all flex flex-col justify-between gap-3 ${active ? 'border-[#450bc8] bg-purple-50/50 shadow-sm' : 'border-slate-200 hover:border-slate-300 bg-slate-50/40'}`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2.5">
                            <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${active ? 'bg-[#450bc8] text-white' : 'bg-slate-200 text-slate-600'}`}>
                              {isUpi ? <Smartphone className="w-5 h-5" /> : <Building2 className="w-5 h-5" />}
                            </div>
                            <div>
                              <span className="font-extrabold text-xs text-slate-900 block">{method}</span>
                              <span className="text-[10px] text-slate-400 font-medium">{isUpi ? 'UPI / VPA' : 'NEFT / RTGS / IMPS'}</span>
                            </div>
                          </div>
                          <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${active ? 'border-[#450bc8]' : 'border-slate-300'}`}>
                            {active && <div className="w-2 h-2 rounded-full bg-[#450bc8]" />}
                          </div>
                        </div>
                        <div className="pt-2 border-t border-slate-200/60 text-[11px] text-slate-600 space-y-0.5">
                          {missing ? (
                            <p className="font-bold text-amber-700">No {isUpi ? 'UPI ID' : 'bank account'} saved. Use “Configure / Edit Details” to add the real one.</p>
                          ) : isUpi ? (
                            <>
                              <p className="font-semibold text-slate-800 font-mono truncate">VPA: {upiId}</p>
                              <p className="text-[10px] text-slate-500 font-medium truncate">Beneficiary: {accountHolderName || '—'}</p>
                            </>
                          ) : (
                            <>
                              <p className="font-semibold text-slate-800">A/C: {bankAccountNumber}</p>
                              <p className="text-[10px] text-slate-500 font-medium">{bankName || 'Bank not set'} • IFSC: {bankIfsc || '—'}</p>
                              <p className="text-[10px] text-slate-500 font-medium truncate">Beneficiary: {accountHolderName || '—'}</p>
                            </>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>

                <div className="space-y-1 pt-1">
                  <label htmlFor="payout-transfer-ref" className="text-[11px] font-extrabold text-slate-700">
                    {disbursalMethod === 'UPI' ? 'UPI transaction reference (UTR / RRN)' : 'Bank transfer reference (UTR)'} *
                  </label>
                  <input
                    id="payout-transfer-ref"
                    type="text"
                    value={transactionRef}
                    onChange={(e) => setTransactionRef(e.target.value)}
                    placeholder="As shown by your bank or UPI app for this transfer"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-semibold text-slate-900 outline-none focus:border-[#450bc8] focus:bg-white transition-all"
                  />
                  <p className="text-[10px] text-slate-400">Hexpertify does not send the money; this records the transfer you made.</p>
                </div>
              </div>

              {releaseError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-bold">{releaseError}</div>
              )}

              {confirmingRelease ? (
                <div className="p-4 bg-white border-2 border-emerald-300 rounded-2xl space-y-3">
                  <p className="text-xs text-slate-800 font-bold leading-relaxed">
                    Record a payout of <span className="text-emerald-700">{inr(selectedNet)}</span> to {selectedTherapist.therapistName} by {disbursalMethod} ({destination}), reference {transactionRef.trim()}? The {selectedSessions.length} session(s) will be marked as paid out{selectedTherapist.therapistEmail ? ' and the invoice emailed' : ''}.
                  </p>
                  <div className="flex flex-col-reverse sm:flex-row gap-2 justify-end">
                    <button onClick={() => setConfirmingRelease(false)} disabled={isReleasing} className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-xs rounded-xl disabled:opacity-50">
                      Go Back
                    </button>
                    <button onClick={handleMarkAsPaid} disabled={isReleasing} className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white font-extrabold text-xs rounded-xl">
                      {isReleasing ? 'Recording…' : 'Yes, Record Payout'}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col-reverse sm:flex-row gap-3">
                  <button
                    onClick={() => { setReleaseError(null); setActiveStep(2); }}
                    disabled={isReleasing}
                    className="sm:w-40 shrink-0 py-3 px-5 bg-slate-200 hover:bg-slate-300 disabled:opacity-50 text-slate-800 font-extrabold text-xs rounded-2xl transition-colors"
                  >
                    Back
                  </button>
                  <button
                    onClick={() => setConfirmingRelease(true)}
                    disabled={!canRelease || isReleasing}
                    title={canRelease ? '' : `Add the ${disbursalMethod === 'UPI' ? 'UPI ID' : 'bank account'} and the transfer reference first`}
                    className="flex-1 min-w-0 py-3 px-5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-2xl shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-3 transition-colors"
                  >
                    <CheckCircle2 className="w-5 h-5 shrink-0" />
                    <span className="flex flex-col items-start text-left leading-tight">
                      <span className="font-extrabold text-sm">Record Payout & Generate Invoice</span>
                      <span className="text-[11px] font-semibold text-emerald-100">
                        {canRelease ? `via ${disbursalMethod}` : `Needs the ${disbursalMethod === 'UPI' ? 'UPI ID' : 'bank account'} and transfer reference`}
                      </span>
                    </span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: PAYOUT HISTORY (stored invoices) */}
      {activeTab === 'history' && (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl p-4 sm:p-6 border border-slate-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h3 className="font-extrabold text-lg text-slate-900">Historical Disbursal Audit Log</h3>
              <p className="text-xs text-slate-500">Every payout recorded, with its invoice number and the transfer reference the admin entered</p>
            </div>
            <button
              onClick={handleExportCSV}
              className="px-4 py-2.5 bg-purple-50 text-[#450bc8] font-extrabold text-xs rounded-2xl flex items-center gap-2 border border-purple-200 hover:bg-[#450bc8] hover:text-white transition-all"
            >
              <Download className="w-4 h-4" />
              Export Transaction Logs
            </button>
          </div>

          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-x-auto">
            <table className="w-full min-w-[900px] whitespace-nowrap text-left text-xs text-slate-600">
              <thead className="bg-slate-50 border-b border-slate-100 text-slate-400 font-bold uppercase tracking-wider">
                <tr>
                  <th className="p-4">Invoice</th>
                  <th className="p-4">Disbursal Date</th>
                  <th className="p-4">Therapist</th>
                  <th className="p-4">Sessions</th>
                  <th className="p-4">Gross Total</th>
                  <th className="p-4">Platform Fee</th>
                  <th className="p-4">Net Payout</th>
                  <th className="p-4">Reference</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {historyList.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="p-10 text-center text-slate-400 font-semibold">
                      {isLoading ? 'Loading…' : loadError ? 'Payout history could not be loaded.' : 'No payouts have been recorded yet.'}
                    </td>
                  </tr>
                ) : historyList.map((rec) => (
                  <tr key={rec.id} className="hover:bg-slate-50/80 transition-all">
                    <td className="p-4 font-mono font-bold text-[#450bc8]">{rec.invoiceNumber || '—'}</td>
                    <td className="p-4 font-semibold text-slate-700 whitespace-nowrap">{rec.payoutDate || '—'}</td>
                    <td className="p-4">
                      <span className="font-extrabold text-slate-900 block">{rec.therapistName}</span>
                      <span className="text-[11px] text-slate-400">{rec.profession}</span>
                    </td>
                    <td className="p-4 font-bold text-slate-800">{rec.sessionsCount} Sessions</td>
                    <td className="p-4 font-bold text-slate-900">{inr(rec.grossAmount)}</td>
                    <td className="p-4 text-slate-400">-{inr(rec.platformFee)}</td>
                    <td className="p-4 font-extrabold text-emerald-600">{inr(rec.netPayout)}</td>
                    <td className="p-4 font-mono text-slate-600">{rec.paymentMethod ? `${rec.paymentMethod} · ` : ''}{rec.transactionRef || '—'}</td>
                    <td className="p-4 text-right">
                      <button
                        onClick={() => setOpenInvoice(rec)}
                        className="px-3 py-1.5 bg-slate-100 hover:bg-purple-50 text-slate-700 hover:text-[#450bc8] font-extrabold text-xs rounded-xl transition-all"
                      >
                        View Invoice
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL: PAYOUT INVOICE (just recorded, or from the history). Printing shows only this invoice. */}
      {openInvoice && createPortal(
        <div className="payout-print-root fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/75 backdrop-blur-md animate-fade-in">
          <style>{`@media print {
            body > *:not(.payout-print-root) { display: none !important; }
            .payout-print-root { position: static !important; background: #fff !important; backdrop-filter: none !important; padding: 0 !important; display: block !important; }
            .payout-print-root .payout-invoice { max-height: none !important; overflow: visible !important; box-shadow: none !important; border: 0 !important; max-width: none !important; }
            .payout-print-root .no-print { display: none !important; }
          }`}</style>
          <div className="payout-invoice w-full max-w-2xl bg-white rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-100 p-4 sm:p-8 space-y-4 sm:space-y-6 my-auto max-h-[94vh] sm:max-h-[92vh] overflow-y-auto">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 border-b border-slate-200 pb-4 sm:pb-5">
              <HexpertifyLogo size="md" />
              <div className="text-left sm:text-right">
                <span className="px-3 py-1 bg-emerald-100 text-emerald-800 font-extrabold text-[10px] sm:text-xs rounded-full uppercase tracking-wider">Paid / Disbursed</span>
                <p className="text-xs font-mono font-extrabold text-slate-800 mt-1">{openInvoice.invoiceNumber}</p>
                <p className="text-[11px] text-slate-400 font-medium">{openInvoice.payoutDate}</p>
              </div>
            </div>

            {/* Email status, as the server reported it */}
            <div className={`no-print p-3.5 sm:p-4 rounded-2xl flex items-start gap-3 border ${openInvoice.emailed ? 'bg-emerald-50 border-emerald-200' : 'bg-amber-50 border-amber-200'}`}>
              <Mail className={`w-5 h-5 shrink-0 mt-0.5 ${openInvoice.emailed ? 'text-emerald-600' : 'text-amber-600'}`} />
              <div className={`text-xs ${openInvoice.emailed ? 'text-emerald-900' : 'text-amber-900'}`}>
                {openInvoice.emailed ? (
                  <>
                    <span className="font-extrabold block">Invoice emailed</span>
                    <p className="mt-0.5">Sent to <span className="font-bold">{openInvoice.therapistEmail}</span>, with a copy to the admin inbox.</p>
                  </>
                ) : openInvoice.emailed === false ? (
                  <>
                    <span className="font-extrabold block">Invoice not emailed</span>
                    <p className="mt-0.5">{openInvoice.therapistEmail ? `The email to ${openInvoice.therapistEmail} could not be sent. Use “Resend Email Copy” to try again.` : 'The therapist has no email address on file.'}</p>
                  </>
                ) : (
                  <>
                    <span className="font-extrabold block">Email status not recorded</span>
                    <p className="mt-0.5">This invoice was recorded before email delivery was tracked.</p>
                  </>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 bg-slate-50 p-3.5 sm:p-4 rounded-2xl border border-slate-100 text-xs">
              <div>
                <span className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider block">Paid To (Consultant)</span>
                <p className="font-extrabold text-slate-900 text-sm mt-0.5">{openInvoice.therapistName}</p>
                <p className="text-slate-500 font-medium">{openInvoice.profession}</p>
                <p className="text-slate-500 font-mono text-[11px] break-all">{openInvoice.therapistEmail || 'No email on file'}</p>
              </div>
              <div>
                <span className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider block">Disbursal Channel & Ref</span>
                <p className="font-extrabold text-slate-900 flex items-center gap-1 mt-0.5">
                  {openInvoice.paymentMethod === 'UPI' ? <Smartphone className="w-3.5 h-3.5 text-blue-600 inline" /> : <Building2 className="w-3.5 h-3.5 text-[#450bc8] inline" />}
                  <span>{openInvoice.paymentMethod || '—'}</span>
                </p>
                <p className="text-purple-700 font-mono font-extrabold text-[11px] mt-0.5">{openInvoice.transactionRef || '—'}</p>
                <p className="text-slate-500 font-mono text-[11px] break-all">
                  {openInvoice.paymentMethod === 'UPI' ? 'UPI ID: ' : 'Account: '}
                  {openInvoice.accountNumber || '—'}
                </p>
              </div>
            </div>

            {openInvoice.sessions.length > 0 && (
              <div className="overflow-x-auto border border-slate-200 rounded-2xl">
                <table className="w-full min-w-[560px] whitespace-nowrap text-left text-xs text-slate-600">
                  <thead className="bg-slate-100 text-slate-500 font-extrabold uppercase tracking-wider border-b border-slate-200 text-[10px]">
                    <tr>
                      <th className="p-3">Session</th>
                      <th className="p-3">Client</th>
                      <th className="p-3">Date</th>
                      <th className="p-3 text-right">Fee</th>
                      <th className="p-3 text-right">Platform Cut</th>
                      <th className="p-3 text-right">Net</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {openInvoice.sessions.map((s, i) => (
                      <tr key={i}>
                        <td className="p-3 font-mono font-bold text-purple-700">{s.id}</td>
                        <td className="p-3 font-semibold text-slate-800">{s.clientName}</td>
                        <td className="p-3 font-medium text-slate-500">{s.date}</td>
                        <td className="p-3 text-right font-bold text-slate-800">{inr(s.fee)}</td>
                        <td className="p-3 text-right text-rose-600 font-medium">-{inr(s.commission)}</td>
                        <td className="p-3 text-right font-extrabold text-emerald-600">{inr(s.net)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200/80 space-y-2 text-xs">
              <div className="flex justify-between items-center text-slate-600">
                <span className="font-semibold">Gross Sessions Subtotal ({openInvoice.sessionsCount} sessions):</span>
                <span className="font-bold text-slate-900">{inr(openInvoice.grossAmount)}</span>
              </div>
              <div className="flex justify-between items-center text-rose-600">
                <span className="font-semibold">Hexpertify Platform Fee:</span>
                <span className="font-bold">-{inr(openInvoice.platformFee)}</span>
              </div>
              <div className="flex justify-between items-center border-t border-slate-300 pt-3 text-sm">
                <span className="font-black text-slate-900">Net Amount Disbursed:</span>
                <span className="font-black text-emerald-600 text-lg">{inr(openInvoice.netPayout)}</span>
              </div>
            </div>

            <div className="no-print flex flex-wrap gap-3 pt-2">
              <button type="button" onClick={handlePrintInvoice} className="flex-1 py-3 bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs rounded-2xl flex items-center justify-center gap-2 shadow-md transition-all">
                <Printer className="w-4 h-4" />
                <span>Print / Download PDF</span>
              </button>
              <button
                type="button"
                onClick={handleResendEmail}
                disabled={isResending || !openInvoice.therapistEmail}
                title={openInvoice.therapistEmail ? '' : 'The therapist has no email address on file'}
                className="flex-1 py-3 bg-purple-50 hover:bg-purple-100 disabled:opacity-50 text-[#450bc8] font-extrabold text-xs rounded-2xl border border-purple-200 flex items-center justify-center gap-2 transition-all"
              >
                <Mail className="w-4 h-4" />
                <span>{isResending ? 'Sending…' : 'Resend Email Copy'}</span>
              </button>
              <button type="button" onClick={() => setOpenInvoice(null)} className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-2xl shadow-lg transition-all">
                Done
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* CONFIGURE / EDIT PAYOUT & BANKING MODAL */}
      {isEditingDetailsModal && selectedTherapist && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[92vh] animate-scale-up">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-purple-50/50 to-white">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#450bc8]/10 text-[#450bc8] flex items-center justify-center">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">Configure Payout Channels</h3>
                  <p className="text-xs text-slate-500 font-medium">
                    Saved on the profile of <span className="font-bold text-slate-700">{selectedTherapist.therapistName}</span>
                  </p>
                </div>
              </div>
              <button type="button" onClick={discardDetailEdits} className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 overflow-y-auto text-xs">
              <p className="p-3 bg-purple-50/60 border border-purple-100 rounded-2xl text-purple-900 leading-relaxed text-[11px]">
                Enter the therapist&apos;s real bank and UPI details. They are saved to the therapist&apos;s profile and used for later payouts.
              </p>

              {[
                { label: 'Bank Name', value: bankName, set: setBankName, placeholder: 'Bank name', mono: false },
                { label: 'Bank Account Number', value: bankAccountNumber, set: setBankAccountNumber, placeholder: 'Account number', mono: true },
                { label: 'IFSC Code', value: bankIfsc, set: (v: string) => setBankIfsc(v.toUpperCase()), placeholder: 'IFSC', mono: true },
                { label: 'Account Beneficiary Name', value: accountHolderName, set: setAccountHolderName, placeholder: 'Name on the account', mono: false },
                { label: 'UPI ID / VPA', value: upiId, set: setUpiId, placeholder: 'name@bank', mono: true }
              ].map((f) => (
                <div key={f.label} className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-700">{f.label}</label>
                  <input
                    type="text"
                    value={f.value}
                    onChange={(e) => f.set(e.target.value)}
                    placeholder={f.placeholder}
                    className={`w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 outline-none focus:border-[#450bc8] focus:bg-white transition-all ${f.mono ? 'font-mono' : ''}`}
                  />
                </div>
              ))}

              {detailsError && <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-bold">{detailsError}</div>}
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2.5">
              <button type="button" onClick={discardDetailEdits} className="px-4 py-2.5 bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs rounded-xl border border-slate-200 transition-colors">
                Cancel
              </button>
              <button
                type="button"
                disabled={isSavingDetails}
                onClick={handleSavePayoutDetails}
                className="px-5 py-2.5 bg-[#450bc8] hover:bg-[#3a0aa8] disabled:opacity-50 text-white font-extrabold text-xs rounded-xl shadow-md shadow-[#450bc8]/20 flex items-center gap-2 transition-all"
              >
                {isSavingDetails ? <span>Saving…</span> : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Save Details</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};
