import React, { useState, useEffect, useRef } from 'react';
import { api } from '../lib/apiClient';
import { ChevronLeft, ChevronRight, ChevronDown, RefreshCw, Search } from 'lucide-react';
import type { AuditLog } from '../types';

const PAGE_SIZE = 10;

const SEVERITY_STYLES: Record<string, string> = {
  SUCCESS: 'bg-emerald-50 text-emerald-700',
  WARNING: 'bg-amber-50 text-amber-700',
  ERROR: 'bg-rose-50 text-rose-700',
  CRITICAL: 'bg-rose-100 text-rose-800',
  INFO: 'bg-slate-100 text-slate-600'
};

const formatWhen = (log: AuditLog): string => {
  const raw = log.createdAt || log.timestamp;
  const d = raw ? new Date(raw) : null;
  if (!d || isNaN(d.getTime())) return log.timestamp || '—';
  const date = d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' });
  const time = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' });
  return `${date}, ${time} IST`;
};

const DETAIL_LABELS: Record<string, string> = { method: 'Method', route: 'Route', targetId: 'Target', status: 'Status' };

const formatDetails = (details: AuditLog['details']): string => {
  if (!details) return '';
  if (typeof details === 'string') return details;
  return Object.entries(details)
    .filter(([k, v]) => v !== null && v !== undefined && v !== '' && typeof v !== 'object' && k !== 'source' && k !== 'durationMs')
    .map(([k, v]) => `${DETAIL_LABELS[k] || k}: ${v}`)
    .join(' · ');
};

/**
 * The audit trail, paged and filtered on the server so the whole history is reachable. Entries are written by
 * the server (who did it comes from the signed-in token); nothing here can change or delete them.
 */
export const LogsView: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [total, setTotal] = useState(0);
  const [modules, setModules] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedModule, setSelectedModule] = useState('All');
  const [selectedSeverity, setSelectedSeverity] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [refreshTick, setRefreshTick] = useState(0);
  const requestId = useRef(0);

  // Search runs on the server shortly after typing stops
  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedSearch(searchTerm.trim()), 300);
    return () => window.clearTimeout(t);
  }, [searchTerm]);

  useEffect(() => {
    const id = ++requestId.current;
    const params = new URLSearchParams({ page: String(currentPage), limit: String(PAGE_SIZE) });
    if (selectedModule !== 'All') params.set('module', selectedModule);
    if (selectedSeverity !== 'All') params.set('severity', selectedSeverity);
    if (debouncedSearch) params.set('search', debouncedSearch);
    setIsLoading(true);
    setError(null);
    api
      .get(`/api/admin/logs?${params.toString()}`)
      .then((data: any) => {
        if (id !== requestId.current) return;
        setLogs(Array.isArray(data?.logs) ? data.logs : []);
        setTotal(Number(data?.total) || 0);
        if (Array.isArray(data?.modules)) setModules(data.modules);
      })
      .catch((err: any) => {
        if (id !== requestId.current) return;
        setError(err?.message || 'The audit log could not be loaded.');
      })
      .finally(() => {
        if (id === requestId.current) setIsLoading(false);
      });
  }, [currentPage, selectedModule, selectedSeverity, debouncedSearch, refreshTick]);

  // A new search or filter starts again at page 1
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedModule, selectedSeverity, debouncedSearch]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const page = Math.min(currentPage, totalPages);
  const selectClass =
    'w-full appearance-none pl-4 pr-10 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#450bc8]/20 focus:border-[#450bc8]';

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Audit Log</h1>
          <p className="text-sm text-slate-500 mt-1">
            Who changed what – bookings, payments, therapists, clients and account changes. Recorded by the server; entries can't be edited or deleted.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setRefreshTick((n) => n + 1)}
          disabled={isLoading}
          className="self-start px-3.5 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-sm font-medium rounded-xl flex items-center gap-1.5"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-2 md:flex md:flex-row gap-3">
        <div className="relative col-span-2 md:flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by person, action, target id or IP…"
            aria-label="Search the audit log"
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#450bc8]/20 focus:border-[#450bc8]"
          />
        </div>

        <div className="relative min-w-0 w-full md:w-56">
          <select
            value={selectedModule}
            onChange={(e) => setSelectedModule(e.target.value)}
            className={selectClass}
            aria-label="Filter by area"
          >
            <option value="All">All actions</option>
            {modules.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
          <ChevronDown className="w-4 h-4 text-slate-500 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>

        <div className="relative min-w-0 w-full md:w-44">
          <select
            value={selectedSeverity}
            onChange={(e) => setSelectedSeverity(e.target.value)}
            className={selectClass}
            aria-label="Filter by severity"
          >
            <option value="All">All statuses</option>
            <option value="INFO">Info</option>
            <option value="SUCCESS">Success</option>
            <option value="WARNING">Warning</option>
            <option value="ERROR">Error</option>
            <option value="CRITICAL">Critical</option>
          </select>
          <ChevronDown className="w-4 h-4 text-slate-500 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>
      </div>

      {error && (
        <div role="alert" className="p-3.5 rounded-xl border border-rose-200 bg-rose-50 text-sm font-semibold text-rose-700">
          {error}
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left border-collapse text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-900 font-bold">
                <th className="py-3.5 px-5 whitespace-nowrap">When</th>
                <th className="py-3.5 px-5">Who</th>
                <th className="py-3.5 px-5">Action</th>
                <th className="py-3.5 px-5">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-14 text-center text-slate-400">
                    {isLoading ? 'Loading…' : error ? 'Could not load the audit log.' : 'No audit entries match.'}
                  </td>
                </tr>
              ) : (
                logs.map((log, idx) => {
                  const extra = formatDetails(log.details);
                  const severity = (log.severity || 'INFO').toUpperCase();
                  return (
                    <tr key={log.id || idx} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-4 px-5 whitespace-nowrap text-slate-500">{formatWhen(log)}</td>
                      <td className="py-4 px-5 whitespace-nowrap">
                        <div className="text-slate-900 font-medium">{log.user || 'Unknown'}</div>
                        <div className="text-xs text-slate-500">
                          {[log.role, log.ipAddress].filter(Boolean).join(' · ')}
                        </div>
                      </td>
                      <td className="py-4 px-5 whitespace-nowrap">
                        <span
                          className={`inline-block px-2.5 py-1 rounded-lg text-xs font-semibold ${
                            SEVERITY_STYLES[severity] || SEVERITY_STYLES.INFO
                          }`}
                          title={severity}
                        >
                          {(log.module || 'System').toLowerCase()}
                          {severity === 'CRITICAL' || severity === 'WARNING' ? ` · ${severity.toLowerCase()}` : ''}
                        </span>
                      </td>
                      <td className="py-4 px-5 text-slate-800 min-w-[240px] break-words">
                        <div>{log.action}</div>
                        {extra && <div className="text-xs text-slate-400 mt-0.5 line-clamp-2">{extra}</div>}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {total > 0 && (
          <div className="px-4 sm:px-5 py-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-sm text-slate-500">
            <span>
              Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} of {total}
            </span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setCurrentPage(Math.max(page - 1, 1))}
                disabled={page === 1 || isLoading}
                aria-label="Previous page"
                className="p-2.5 sm:p-1.5 rounded-lg border border-slate-200 disabled:opacity-40 hover:bg-slate-100"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="px-2 text-slate-700 whitespace-nowrap">
                Page {page} of {totalPages}
              </span>
              <button
                type="button"
                onClick={() => setCurrentPage(Math.min(page + 1, totalPages))}
                disabled={page === totalPages || isLoading}
                aria-label="Next page"
                className="p-2.5 sm:p-1.5 rounded-lg border border-slate-200 disabled:opacity-40 hover:bg-slate-100"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default LogsView;
