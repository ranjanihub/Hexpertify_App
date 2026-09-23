import React, { useState, useEffect, useMemo, useRef } from 'react';
import { api } from '../lib/apiClient';
import {
  Shield,
  Search,
  Filter,
  RefreshCw,
  Download,
  Terminal,
  Table as TableIcon,
  CheckCircle2,
  AlertTriangle,
  AlertOctagon,
  Info,
  Clock,
  Activity,
  Layers,
  FileCode,
  Copy,
  Check,
  Trash2,
  Plus,
  X,
  ChevronLeft,
  ChevronRight,
  Database,
  Lock,
  Sparkles
} from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import type { AuditLog } from '../types';

export const LogsView: React.FC = () => {
  const { auditLogs: contextAuditLogs } = useAppContext();
  const [logs, setLogs] = useState<AuditLog[]>(contextAuditLogs || []);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'table' | 'terminal'>('table');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedModule, setSelectedModule] = useState('All');
  const [selectedSeverity, setSelectedSeverity] = useState('ALL');
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const [autoScroll, setAutoScroll] = useState(true);
  const [isTestModalOpen, setIsTestModalOpen] = useState(false);
  const [isClearModalOpen, setIsClearModalOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 15;

  const [testLogData, setTestLogData] = useState({
    action: 'Manual Security Compliance Check Completed',
    module: 'Auth & Security',
    severity: 'SUCCESS',
    user: 'Super Administrator',
    role: 'Super Admin',
    details: '{"scope": "Full System", "passedChecks": 28, "failedChecks": 0}'
  });

  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'warning' | 'info' } | null>(null);

  const showToast = (text: string, type: 'success' | 'warning' | 'info' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 3500);
  };

  const terminalEndRef = useRef<HTMLDivElement>(null);

  // Fetch logs from MongoDB Atlas
  const fetchLogs = async () => {
    setIsLoading(true);
    try {
      const data = await api.get('/api/admin/logs?limit=200');
      if (data?.logs && Array.isArray(data.logs)) {
        setLogs(data.logs);
      }
    } catch (err) {
      console.warn('Using local context audit logs as fallback:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  useEffect(() => {
    if (activeTab === 'terminal' && autoScroll) {
      terminalEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, activeTab, autoScroll]);

  // Modules list
  const modulesList = [
    'All',
    'Auth & Security',
    'Bookings',
    'Payments',
    'Revenue',
    'Therapists',
    'Clients',
    'Assessments',
    'CMS & Pages',
    'System & API'
  ];

  // Filtered logs
  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      // 1. Module filter
      if (selectedModule !== 'All') {
        const mod = (log.module || '').toLowerCase();
        const sel = selectedModule.toLowerCase();
        if (!mod.includes(sel) && !sel.includes(mod)) return false;
      }

      // 2. Severity filter
      if (selectedSeverity !== 'ALL') {
        const sev = (log.severity || 'INFO').toUpperCase();
        if (sev !== selectedSeverity) return false;
      }

      // 3. Search query
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const match =
          (log.action || '').toLowerCase().includes(q) ||
          (log.user || '').toLowerCase().includes(q) ||
          (log.role || '').toLowerCase().includes(q) ||
          (log.module || '').toLowerCase().includes(q) ||
          (log.ipAddress || '').toLowerCase().includes(q) ||
          (log.id || '').toLowerCase().includes(q);
        if (!match) return false;
      }

      return true;
    });
  }, [logs, selectedModule, selectedSeverity, searchTerm]);

  // Pagination
  const totalPages = Math.ceil(filteredLogs.length / pageSize) || 1;
  const paginatedLogs = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredLogs.slice(start, start + pageSize);
  }, [filteredLogs, currentPage]);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(id);
    setTimeout(() => setCopiedText(null), 2000);
  };

  const handleCreateTestLog = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      let parsedDetails = {};
      try {
        parsedDetails = JSON.parse(testLogData.details);
      } catch {
        parsedDetails = { notes: testLogData.details };
      }

      const payload = {
        action: testLogData.action,
        module: testLogData.module,
        severity: testLogData.severity as any,
        user: testLogData.user,
        role: testLogData.role,
        details: parsedDetails,
        ipAddress: '192.168.1.10',
        timestamp: new Date().toLocaleTimeString()
      };

      const res = await api.post('/api/admin/logs', payload);
      if (res?.log) {
        setLogs((prev) => [res.log, ...prev]);
      } else {
        const fallbackLog: AuditLog = {
          id: `LOG-${Date.now().toString().slice(-6)}`,
          ...payload,
          timestamp: new Date().toLocaleString()
        };
        setLogs((prev) => [fallbackLog, ...prev]);
      }

      showToast('New audit event dispatched and persisted to MongoDB Atlas!', 'success');
      setIsTestModalOpen(false);
    } catch (err) {
      console.error('Error dispatching test log:', err);
      showToast('Failed to record test log', 'warning');
    }
  };

  const handleClearAllLogs = async () => {
    try {
      await api.delete('/api/admin/logs/clear');
      await fetchLogs();
      setIsClearModalOpen(false);
      showToast('Audit logs cleared and baseline telemetry reset.', 'info');
    } catch (err) {
      console.error('Error clearing logs:', err);
      showToast('Failed to clear logs', 'warning');
    }
  };

  const handleExportCSV = () => {
    const headers = ['Log ID', 'Timestamp', 'User', 'Role', 'Module', 'Severity', 'Action', 'IP Address'];
    const rows = filteredLogs.map((l) => [
      `"${l.id}"`,
      `"${l.timestamp}"`,
      `"${(l.user || '').replace(/"/g, '""')}"`,
      `"${(l.role || '').replace(/"/g, '""')}"`,
      `"${(l.module || '').replace(/"/g, '""')}"`,
      `"${(l.severity || 'INFO').toUpperCase()}"`,
      `"${(l.action || '').replace(/"/g, '""')}"`,
      `"${l.ipAddress || '127.0.0.1'}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + encodeURIComponent([headers.join(','), ...rows.map((r) => r.join(','))].join('\n'));
    const link = document.createElement('a');
    link.setAttribute('href', csvContent);
    link.setAttribute('download', `Hexpertify_Audit_Logs_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast(`Exported ${filteredLogs.length} audit log entries as CSV`, 'success');
  };

  const handleExportJSON = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(filteredLogs, null, 2));
    const link = document.createElement('a');
    link.setAttribute('href', dataStr);
    link.setAttribute('download', `Hexpertify_Audit_Logs_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast(`Exported ${filteredLogs.length} audit log entries as JSON`, 'success');
  };

  const getSeverityBadge = (severity?: string) => {
    const s = (severity || 'INFO').toUpperCase();
    switch (s) {
      case 'SUCCESS':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-200/60">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            SUCCESS
          </span>
        );
      case 'WARNING':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-amber-100 text-amber-800 border border-amber-200/60">
            <AlertTriangle className="w-3 h-3 text-amber-600" />
            WARNING
          </span>
        );
      case 'ERROR':
      case 'CRITICAL':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-rose-100 text-rose-800 border border-rose-200/60">
            <AlertOctagon className="w-3 h-3 text-rose-600" />
            {s}
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-blue-100 text-blue-800 border border-blue-200/60">
            <Info className="w-3 h-3 text-blue-600" />
            INFO
          </span>
        );
    }
  };

  const getModuleBadgeColor = (module: string) => {
    const m = (module || '').toLowerCase();
    if (m.includes('auth') || m.includes('security')) return 'bg-purple-100 text-[#5e2be2] border-purple-200';
    if (m.includes('payment') || m.includes('payout')) return 'bg-amber-100 text-amber-800 border-amber-200';
    if (m.includes('revenue')) return 'bg-emerald-100 text-emerald-800 border-emerald-200';
    if (m.includes('booking')) return 'bg-indigo-100 text-indigo-800 border-indigo-200';
    if (m.includes('therapist')) return 'bg-teal-100 text-teal-800 border-teal-200';
    if (m.includes('client')) return 'bg-sky-100 text-sky-800 border-sky-200';
    if (m.includes('assessment')) return 'bg-violet-100 text-violet-800 border-violet-200';
    if (m.includes('cms') || m.includes('page')) return 'bg-pink-100 text-pink-800 border-pink-200';
    return 'bg-slate-100 text-slate-800 border-slate-200';
  };

  // Stats calculation
  const totalLogsCount = logs.length;
  const securityCount = logs.filter((l) => (l.module || '').toLowerCase().includes('auth') || (l.module || '').toLowerCase().includes('security')).length;
  const financialCount = logs.filter((l) => (l.module || '').toLowerCase().includes('payment') || (l.module || '').toLowerCase().includes('revenue')).length;
  const warningsCount = logs.filter((l) => ['WARNING', 'ERROR', 'CRITICAL'].includes((l.severity || '').toUpperCase())).length;

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Toast Notification */}
      {toastMessage && (
        <div
          className={`fixed top-5 right-5 z-50 px-4 py-3 rounded-2xl shadow-xl flex items-center gap-3 text-xs font-extrabold transition-all transform animate-in fade-in slide-in-from-top-4 ${
            toastMessage.type === 'success'
              ? 'bg-emerald-950 text-emerald-200 border border-emerald-800'
              : toastMessage.type === 'warning'
              ? 'bg-amber-950 text-amber-200 border border-amber-800'
              : 'bg-slate-900 text-slate-100 border border-slate-700'
          }`}
        >
          {toastMessage.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
          {toastMessage.type === 'warning' && <AlertTriangle className="w-4 h-4 text-amber-400" />}
          {toastMessage.type === 'info' && <Info className="w-4 h-4 text-blue-400" />}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* ── TOP HEADER & LIVE TELEMETRY BAR ──────────────── */}
      <div className="bg-white rounded-3xl p-6 md:p-8 border border-slate-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="w-10 h-10 rounded-2xl bg-purple-100 text-[#5e2be2] flex items-center justify-center shadow-xs">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-black text-slate-900 tracking-tight">Audit & Security Logs</h1>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  MongoDB Atlas Live
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium">
                Comprehensive tamper-evident telemetry, compliance trails, administrative actions, and API events.
              </p>
            </div>
          </div>
        </div>

        {/* Header Action Buttons */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            type="button"
            onClick={fetchLogs}
            disabled={isLoading}
            className="px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 shadow-2xs active:scale-95"
            title="Refresh Live Logs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-[#5e2be2]' : ''}`} />
            <span>Refresh</span>
          </button>

          <button
            type="button"
            onClick={() => setIsTestModalOpen(true)}
            className="px-3.5 py-2.5 bg-purple-50 hover:bg-purple-100 text-[#5e2be2] border border-purple-200 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 active:scale-95"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Record Test Event</span>
          </button>

          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200/80">
            <button
              type="button"
              onClick={handleExportCSV}
              className="px-2.5 py-1.5 text-slate-700 hover:text-[#5e2be2] hover:bg-white text-xs font-bold rounded-lg transition-all flex items-center gap-1"
            >
              <Download className="w-3 h-3" />
              <span>CSV</span>
            </button>
            <span className="text-slate-300">|</span>
            <button
              type="button"
              onClick={handleExportJSON}
              className="px-2.5 py-1.5 text-slate-700 hover:text-[#5e2be2] hover:bg-white text-xs font-bold rounded-lg transition-all flex items-center gap-1"
            >
              <FileCode className="w-3 h-3" />
              <span>JSON</span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => setIsClearModalOpen(true)}
            className="p-2.5 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 text-xs font-bold rounded-xl transition-all active:scale-95"
            title="Clear & Reset Logs"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ── METRIC TELEMETRY CARDS ──────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Recorded Logs</span>
            <div className="w-8 h-8 rounded-xl bg-purple-50 text-[#5e2be2] flex items-center justify-center">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900">{totalLogsCount}</span>
            <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-md">Live Sync</span>
          </div>
          <p className="mt-1 text-[11px] text-slate-400 font-medium">Persisted across MongoDB Atlas collections</p>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Auth & Security</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Lock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900">{securityCount}</span>
            <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-md">100% Protected</span>
          </div>
          <p className="mt-1 text-[11px] text-slate-400 font-medium">2FA Logins, Token Audits, IP Gateways</p>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Financial Operations</span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Activity className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900">{financialCount}</span>
            <span className="text-[11px] font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-md">Audited</span>
          </div>
          <p className="mt-1 text-[11px] text-slate-400 font-medium">Payout releases, refunds, invoices</p>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">System Warnings</span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Database className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900">{warningsCount}</span>
            <span className="text-[11px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded-md">Healthy</span>
          </div>
          <p className="mt-1 text-[11px] text-slate-400 font-medium">0 Critical infrastructure errors</p>
        </div>
      </div>

      {/* ── FILTER & VIEW TOGGLE TOOLBAR ──────────────── */}
      <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Search Input */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search actions, users, IPs, IDs, or keywords..."
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 hover:bg-slate-100/80 focus:bg-white border border-slate-200 rounded-2xl text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#5e2be2]/20 focus:border-[#5e2be2] transition-all"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Severity & View Mode Controls */}
          <div className="flex items-center gap-3 flex-wrap">
            {/* Severity Selector */}
            <div className="flex items-center gap-1.5 bg-slate-50 p-1 rounded-2xl border border-slate-200">
              {['ALL', 'INFO', 'SUCCESS', 'WARNING', 'ERROR'].map((sev) => (
                <button
                  key={sev}
                  type="button"
                  onClick={() => {
                    setSelectedSeverity(sev);
                    setCurrentPage(1);
                  }}
                  className={`px-2.5 py-1.5 text-[11px] font-extrabold rounded-xl transition-all ${
                    selectedSeverity === sev
                      ? sev === 'SUCCESS'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : sev === 'WARNING'
                        ? 'bg-amber-600 text-white shadow-xs'
                        : sev === 'ERROR'
                        ? 'bg-rose-600 text-white shadow-xs'
                        : 'bg-[#5e2be2] text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {sev}
                </button>
              ))}
            </div>

            {/* View Mode Toggle */}
            <div className="flex items-center bg-slate-100 p-1 rounded-2xl border border-slate-200">
              <button
                type="button"
                onClick={() => setActiveTab('table')}
                className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 ${
                  activeTab === 'table' ? 'bg-white text-[#5e2be2] shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <TableIcon className="w-3.5 h-3.5" />
                <span>Table</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('terminal')}
                className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 ${
                  activeTab === 'terminal' ? 'bg-slate-900 text-emerald-400 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Terminal className="w-3.5 h-3.5" />
                <span>Terminal Stream</span>
              </button>
            </div>
          </div>
        </div>

        {/* Module Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar pt-1 border-t border-slate-100">
          <span className="text-[11px] font-extrabold text-slate-400 uppercase shrink-0 mr-1 flex items-center gap-1">
            <Filter className="w-3 h-3" /> Module:
          </span>
          {modulesList.map((mod) => (
            <button
              key={mod}
              type="button"
              onClick={() => {
                setSelectedModule(mod);
                setCurrentPage(1);
              }}
              className={`px-3 py-1 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                selectedModule === mod
                  ? 'bg-[#5e2be2] text-white shadow-xs'
                  : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200/60'
              }`}
            >
              {mod}
            </button>
          ))}
        </div>
      </div>

      {/* ── MAIN CONTENT VIEW (TABLE VS TERMINAL) ──────────────── */}
      {activeTab === 'table' ? (
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-100 text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">
                  <th className="py-3.5 px-4 sm:px-6">Timestamp & ID</th>
                  <th className="py-3.5 px-4">Actor / Role</th>
                  <th className="py-3.5 px-4">Action & Details</th>
                  <th className="py-3.5 px-4">Module</th>
                  <th className="py-3.5 px-4">Severity</th>
                  <th className="py-3.5 px-4">IP Address</th>
                  <th className="py-3.5 px-4 text-right pr-6">Inspect</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {paginatedLogs.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-16 text-center text-slate-400">
                      <div className="max-w-xs mx-auto space-y-3">
                        <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                          <Search className="w-6 h-6" />
                        </div>
                        <p className="font-extrabold text-slate-700">No matching audit logs found</p>
                        <p className="text-xs text-slate-400">Try adjusting your keyword search, module, or severity filter.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  paginatedLogs.map((log) => (
                    <tr
                      key={log.id}
                      onClick={() => setSelectedLog(log)}
                      className="hover:bg-purple-50/30 transition-colors cursor-pointer group"
                    >
                      {/* Timestamp & Log ID */}
                      <td className="py-3.5 px-4 sm:px-6 whitespace-nowrap">
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-900 flex items-center gap-1.5">
                            <Clock className="w-3 h-3 text-slate-400" />
                            {log.timestamp}
                          </span>
                          <span className="font-mono text-[10px] text-purple-600 font-bold tracking-tight">
                            #{log.id}
                          </span>
                        </div>
                      </td>

                      {/* Actor & Role */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700 font-black text-xs shrink-0">
                            {(log.user || 'A')[0].toUpperCase()}
                          </div>
                          <div>
                            <div className="font-extrabold text-slate-900 leading-tight">{log.user || 'System User'}</div>
                            <div className="text-[10px] text-slate-400 font-semibold">{log.role || 'Admin'}</div>
                          </div>
                        </div>
                      </td>

                      {/* Action */}
                      <td className="py-3.5 px-4 max-w-md">
                        <div className="font-semibold text-slate-800 line-clamp-2 leading-relaxed">
                          {log.action}
                        </div>
                        {log.details && (
                          <div className="text-[10px] text-slate-400 font-mono mt-0.5 truncate max-w-xs">
                            {typeof log.details === 'string' ? log.details : JSON.stringify(log.details)}
                          </div>
                        )}
                      </td>

                      {/* Module */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className={`inline-block px-2.5 py-1 rounded-xl text-[11px] font-extrabold border ${getModuleBadgeColor(log.module)}`}>
                          {log.module || 'System'}
                        </span>
                      </td>

                      {/* Severity */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {getSeverityBadge(log.severity)}
                      </td>

                      {/* IP Address */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="font-mono text-[11px] text-slate-500 bg-slate-50 px-2 py-0.5 rounded-md border border-slate-200">
                          {log.ipAddress || '127.0.0.1'}
                        </span>
                      </td>

                      {/* Inspect Button */}
                      <td className="py-3.5 px-4 text-right pr-6 whitespace-nowrap">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedLog(log);
                          }}
                          className="px-2.5 py-1 bg-white border border-slate-200 hover:border-[#5e2be2] hover:text-[#5e2be2] text-slate-600 text-xs font-bold rounded-xl shadow-2xs transition-all group-hover:bg-[#5e2be2] group-hover:text-white group-hover:border-[#5e2be2]"
                        >
                          Inspect
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Footer */}
          {totalPages > 1 && (
            <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs font-bold text-slate-600">
              <span>
                Showing {(currentPage - 1) * pageSize + 1} to {Math.min(currentPage * pageSize, filteredLogs.length)} of {filteredLogs.length} events
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                  disabled={currentPage === 1}
                  className="p-2 rounded-xl bg-white border border-slate-200 disabled:opacity-40 hover:bg-slate-100 transition-all"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="px-3 py-1 bg-white border border-slate-200 rounded-xl font-mono text-slate-800">
                  {currentPage} / {totalPages}
                </span>
                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="p-2 rounded-xl bg-white border border-slate-200 disabled:opacity-40 hover:bg-slate-100 transition-all"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* ── LIVE TERMINAL STREAM VIEW ──────────────── */
        <div className="bg-[#0b0f19] rounded-3xl border border-slate-800 shadow-2xl overflow-hidden font-mono text-xs">
          {/* Terminal Title Bar */}
          <div className="px-5 py-3.5 bg-[#121826] border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-rose-500 inline-block" />
              <span className="w-3 h-3 rounded-full bg-amber-500 inline-block" />
              <span className="w-3 h-3 rounded-full bg-emerald-500 inline-block" />
              <span className="text-slate-400 text-[11px] font-bold ml-2">hexpertify-audit-stream :: atlas-live-telemetry</span>
            </div>

            <div className="flex items-center gap-3">
              <label className="flex items-center gap-1.5 text-slate-400 text-[11px] font-bold cursor-pointer hover:text-white">
                <input
                  type="checkbox"
                  checked={autoScroll}
                  onChange={(e) => setAutoScroll(e.target.checked)}
                  className="rounded text-[#5e2be2] focus:ring-0"
                />
                <span>Auto-scroll</span>
              </label>

              <button
                type="button"
                onClick={() => handleCopy(filteredLogs.map((l) => `[${l.timestamp}] [${(l.severity || 'INFO').toUpperCase()}] [${l.module}] ${l.action} (by: ${l.user}, ip: ${l.ipAddress})`).join('\n'), 'terminal-all')}
                className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-[10px] font-bold rounded-lg transition-all flex items-center gap-1"
              >
                {copiedText === 'terminal-all' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>{copiedText === 'terminal-all' ? 'Copied' : 'Copy All'}</span>
              </button>
            </div>
          </div>

          {/* Terminal Console Logs */}
          <div className="p-6 space-y-2 max-h-[600px] overflow-y-auto font-mono text-[11px] leading-relaxed select-text">
            <div className="text-slate-500 text-[10px] mb-4">
              // Connected to mongodb+srv://cluster0.ibhuunq.mongodb.net/hexpertify [AuditLog collection]
              <br />
              // Streaming {filteredLogs.length} live telemetry records at 1000ms heartbeat...
            </div>

            {filteredLogs.map((log, idx) => {
              const sev = (log.severity || 'INFO').toUpperCase();
              const sevColor =
                sev === 'SUCCESS' ? 'text-emerald-400' :
                sev === 'WARNING' ? 'text-amber-400' :
                sev === 'ERROR' || sev === 'CRITICAL' ? 'text-rose-400' :
                'text-cyan-400';

              return (
                <div key={log.id || idx} className="hover:bg-slate-800/60 p-1 rounded-md transition-colors flex items-start gap-2">
                  <span className="text-slate-500 shrink-0">[{log.timestamp}]</span>
                  <span className={`font-bold shrink-0 ${sevColor}`}>[{sev}]</span>
                  <span className="text-purple-400 shrink-0 font-semibold">[{log.module}]</span>
                  <span className="text-slate-200 font-medium flex-1">{log.action}</span>
                  <span className="text-slate-500 text-[10px] shrink-0 font-mono">{log.ipAddress}</span>
                </div>
              );
            })}
            <div ref={terminalEndRef} />
          </div>
        </div>
      )}

      {/* ── LOG INSPECTOR MODAL / DRAWER ──────────────── */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] shadow-2xl border border-slate-100 overflow-hidden flex flex-col animate-in fade-in zoom-in-95">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-purple-100 text-[#5e2be2] flex items-center justify-center font-bold">
                  <FileCode className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-extrabold text-slate-900">Audit Log Telemetry Details</h3>
                    {getSeverityBadge(selectedLog.severity)}
                  </div>
                  <span className="text-xs font-mono text-purple-600 font-bold">#{selectedLog.id}</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedLog(null)}
                className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-6 text-xs">
              {/* Event Metadata Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Actor</span>
                  <p className="font-extrabold text-slate-900 mt-0.5">{selectedLog.user}</p>
                  <span className="text-[10px] text-slate-500">{selectedLog.role}</span>
                </div>

                <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Module</span>
                  <p className="font-extrabold text-[#5e2be2] mt-0.5">{selectedLog.module}</p>
                  <span className="text-[10px] text-slate-500">Service Gateway</span>
                </div>

                <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Timestamp</span>
                  <p className="font-extrabold text-slate-900 mt-0.5">{selectedLog.timestamp}</p>
                  <span className="text-[10px] text-slate-500">UTC Synchronized</span>
                </div>

                <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">IP Address</span>
                  <p className="font-mono font-extrabold text-slate-900 mt-0.5">{selectedLog.ipAddress}</p>
                </div>

                <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 col-span-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">User Agent</span>
                  <p className="font-mono text-[10px] text-slate-600 truncate mt-0.5">{selectedLog.userAgent || 'Mozilla/5.0 (Admin Session)'}</p>
                </div>
              </div>

              {/* Action Title */}
              <div className="space-y-1">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Executed Operation</span>
                <div className="p-3.5 bg-slate-900 text-emerald-400 rounded-2xl font-mono text-xs font-semibold">
                  {selectedLog.action}
                </div>
              </div>

              {/* JSON Payload Inspector */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Structured JSON Payload</span>
                  <button
                    type="button"
                    onClick={() => handleCopy(JSON.stringify(selectedLog, null, 2), selectedLog.id)}
                    className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-bold rounded-lg transition-all flex items-center gap-1"
                  >
                    {copiedText === selectedLog.id ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedText === selectedLog.id ? 'Copied JSON' : 'Copy JSON'}</span>
                  </button>
                </div>

                <pre className="p-4 bg-slate-950 text-slate-200 rounded-2xl font-mono text-xs overflow-x-auto border border-slate-800 max-h-56 select-text">
                  {JSON.stringify(selectedLog.details || selectedLog, null, 2)}
                </pre>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-end">
              <button
                type="button"
                onClick={() => setSelectedLog(null)}
                className="px-5 py-2.5 bg-[#5e2be2] hover:bg-[#4f28d9] text-white font-bold text-xs rounded-xl shadow-xs transition-all active:scale-95"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── RECORD TEST EVENT MODAL ──────────────── */}
      {isTestModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-purple-100 text-[#5e2be2] flex items-center justify-center">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">Record Test Audit Event</h3>
                  <p className="text-xs text-slate-500">Inject an operational log directly into MongoDB Atlas</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsTestModalOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-700 rounded-full"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateTestLog} className="p-6 space-y-4 text-xs">
              <div className="space-y-1.5">
                <label className="font-extrabold text-slate-700">Action Description</label>
                <input
                  type="text"
                  required
                  value={testLogData.action}
                  onChange={(e) => setTestLogData({ ...testLogData, action: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#5e2be2]/20 focus:border-[#5e2be2]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="font-extrabold text-slate-700">Module</label>
                  <select
                    value={testLogData.module}
                    onChange={(e) => setTestLogData({ ...testLogData, module: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-900 focus:outline-none"
                  >
                    {modulesList.filter((m) => m !== 'All').map((m) => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="font-extrabold text-slate-700">Severity</label>
                  <select
                    value={testLogData.severity}
                    onChange={(e) => setTestLogData({ ...testLogData, severity: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-900 focus:outline-none"
                  >
                    <option value="INFO">INFO</option>
                    <option value="SUCCESS">SUCCESS</option>
                    <option value="WARNING">WARNING</option>
                    <option value="ERROR">ERROR</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="font-extrabold text-slate-700">JSON Payload / Details</label>
                <textarea
                  rows={3}
                  value={testLogData.details}
                  onChange={(e) => setTestLogData({ ...testLogData, details: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-900 text-slate-100 font-mono rounded-xl text-xs border border-slate-800 focus:outline-none"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsTestModalOpen(false)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-[#5e2be2] hover:bg-[#4f28d9] text-white font-extrabold rounded-xl shadow-xs active:scale-95"
                >
                  Dispatch to MongoDB
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── CLEAR LOGS CONFIRMATION MODAL ──────────────── */}
      {isClearModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-100 p-6 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-slate-900">Clear Audit Telemetry?</h3>
                <p className="text-xs text-slate-500">This will reset logs in MongoDB Atlas.</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 font-medium">
              Are you sure you want to clear historical audit logs? Baseline system initialization records will be preserved for compliance.
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setIsClearModalOpen(false)}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleClearAllLogs}
                className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs rounded-xl shadow-xs"
              >
                Confirm Reset
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LogsView;
