import React, { useState, useEffect, useMemo } from 'react';
import { api } from '../lib/apiClient';
import { ChevronLeft, ChevronRight, ChevronDown } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import type { AuditLog } from '../types';

const PAGE_SIZE = 20;

const formatWhen = (log: AuditLog): string => {
  const raw = log.createdAt || log.timestamp;
  const d = raw ? new Date(raw) : null;
  if (!d || isNaN(d.getTime())) return log.timestamp || '—';
  const date = d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  const time = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
  return `${date}, ${time}`;
};

const formatDetails = (details: AuditLog['details']): string => {
  if (!details) return '';
  if (typeof details === 'string') return details;
  return Object.entries(details)
    .filter(([, v]) => v !== null && v !== undefined && v !== '' && typeof v !== 'object')
    .map(([k, v]) => `${k}: ${v}`)
    .join(' · ');
};

export const LogsView: React.FC = () => {
  const { auditLogs: contextAuditLogs } = useAppContext();
  const [logs, setLogs] = useState<AuditLog[]>(contextAuditLogs || []);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedModule, setSelectedModule] = useState('All');
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    const fetchLogs = async () => {
      setIsLoading(true);
      try {
        const data = await api.get('/api/admin/logs?limit=500');
        if (data?.logs && Array.isArray(data.logs)) setLogs(data.logs);
      } catch (err) {
        console.warn('Using local audit logs as fallback:', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchLogs();
  }, []);

  const modules = useMemo(
    () => Array.from(new Set(logs.map((l) => l.module || 'System'))).sort(),
    [logs]
  );

  const filteredLogs = useMemo(
    () => (selectedModule === 'All' ? logs : logs.filter((l) => (l.module || 'System') === selectedModule)),
    [logs, selectedModule]
  );

  const totalPages = Math.ceil(filteredLogs.length / PAGE_SIZE) || 1;
  const pageLogs = filteredLogs.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Audit Log</h1>
          <p className="text-sm text-slate-500 mt-1">
            Who changed what – bookings, payments, therapists, clients and account changes
          </p>
        </div>

        <div className="relative w-full sm:w-64">
          <select
            value={selectedModule}
            onChange={(e) => {
              setSelectedModule(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full appearance-none pl-4 pr-10 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#5e2be2]/20 focus:border-[#5e2be2]"
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
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-900 font-bold">
                <th className="py-3.5 px-5 whitespace-nowrap">When</th>
                <th className="py-3.5 px-5">Who</th>
                <th className="py-3.5 px-5">Action</th>
                <th className="py-3.5 px-5">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {pageLogs.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-14 text-center text-slate-400">
                    {isLoading ? 'Loading…' : 'No audit entries yet'}
                  </td>
                </tr>
              ) : (
                pageLogs.map((log, idx) => {
                  const extra = formatDetails(log.details);
                  return (
                    <tr key={log.id || idx} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-4 px-5 whitespace-nowrap text-slate-500">{formatWhen(log)}</td>
                      <td className="py-4 px-5 whitespace-nowrap">
                        <div className="text-slate-900 font-medium">{log.user || 'System'}</div>
                        <div className="text-xs text-slate-500">{log.role || 'Admin'}</div>
                      </td>
                      <td className="py-4 px-5 whitespace-nowrap">
                        <span className="inline-block px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 text-xs font-semibold">
                          {(log.module || 'System').toLowerCase()}
                        </span>
                      </td>
                      <td className="py-4 px-5 text-slate-800">
                        <div>{log.action}</div>
                        {extra && <div className="text-xs text-slate-400 mt-0.5 line-clamp-1">{extra}</div>}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="px-5 py-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>
              {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, filteredLogs.length)} of{' '}
              {filteredLogs.length}
            </span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                disabled={currentPage === 1}
                className="p-1.5 rounded-lg border border-slate-200 disabled:opacity-40 hover:bg-slate-100"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="px-2 text-slate-700">
                {currentPage} / {totalPages}
              </span>
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="p-1.5 rounded-lg border border-slate-200 disabled:opacity-40 hover:bg-slate-100"
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
