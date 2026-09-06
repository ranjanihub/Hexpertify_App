import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  Search,
  Users,
  CheckCircle2,
  X,
  Brain,
  Phone,
  Mail,
  Calendar,
  FileText,
  Activity,
  CheckSquare,
  Download,
  UserCheck,
  Award,
  Sparkles,
  ClipboardList,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight
} from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import type { Client } from '../types';

export const ClientsView: React.FC = () => {
  const { clients } = useAppContext();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [activeTab, setActiveTab] = useState<'intake' | 'assessments' | 'goals_mood' | 'sessions_hw' | 'documents'>('intake');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const itemsPerPage = 10;

  const filteredClients = clients.filter((c) => {
    const matchesSearch =
      (c.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.phone && c.phone.includes(searchTerm)) ||
      (c.id || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.assignedTherapistName || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'All' || c.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Reset to page 1 whenever search or filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredClients.length / itemsPerPage));
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedClients = filteredClients.slice(startIndex, startIndex + itemsPerPage);


  return (
    <div className="space-y-8 pb-12 animate-fade-in">
      {/* Hero Header matching Home Page card gradient */}
      <div className="relative rounded-2xl sm:rounded-3xl bg-gradient-to-r from-[#4f28d9] via-[#5e2be2] to-[#3b1799] p-4 sm:p-8 text-white shadow-xl overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-4 sm:gap-6">
        <div className="absolute -right-12 -top-12 w-96 h-96 bg-white/5 rounded-full blur-2xl pointer-events-none" />
        <div className="relative z-10 space-y-1 sm:space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md border border-white/20 text-[10px] sm:text-xs font-bold tracking-wide uppercase text-purple-200">
            <ClipboardList className="w-3.5 h-3.5" />
            <span>Client Records & Clinical Directory</span>
          </div>
          <h1 className="text-xl sm:text-3xl font-extrabold tracking-tight">Client Medical Records & Intake Hub</h1>
          <p className="text-purple-100 text-xs sm:text-sm max-w-xl leading-relaxed">
            Access complete client medical details, AI intake surveys, clinical assessment scores, mood tracking, and session notes.
          </p>
        </div>

        <div className="relative z-10 flex items-center gap-3 bg-white/10 backdrop-blur-xl p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-white/20 shadow-2xl shrink-0">
          <Users className="w-6 h-6 sm:w-8 sm:h-8 text-purple-200" />
          <div>
            <span className="text-[10px] sm:text-xs text-purple-200 block font-semibold">Total Registered Clients</span>
            <span className="text-lg sm:text-2xl font-extrabold text-white">{clients.length} Active Records</span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-6 border border-slate-100 shadow-sm flex flex-col md:flex-row items-center justify-between gap-3 sm:gap-4">
        <div className="relative w-full md:w-96">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by client name, email, phone, ID, or therapist..."
            className="w-full pl-10 pr-4 py-2 sm:py-2.5 bg-slate-50 border border-slate-200 rounded-xl sm:rounded-2xl text-xs font-medium text-slate-800 outline-none focus:border-[#5e2be2] focus:ring-2 focus:ring-[#5e2be2]/10"
          />
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto w-full md:w-auto scrollbar-none pb-1 md:pb-0">
          {['All', 'Active', 'Completed', 'Inactive'].map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-3.5 sm:px-4 py-1.5 sm:py-2 rounded-xl sm:rounded-2xl text-xs font-bold transition-all whitespace-nowrap ${
                statusFilter === status
                  ? 'bg-[#5e2be2] text-white shadow-md shadow-[#5e2be2]/20'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {/* Client Directory Table */}
      <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px] text-center border-collapse text-xs whitespace-nowrap">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-100 text-[10px] font-extrabold text-slate-400 uppercase tracking-wider whitespace-nowrap">
                <th className="py-4 px-6 text-center">Client Code & Name</th>
                <th className="py-4 px-6 text-center">Contact Info</th>
                <th className="py-4 px-6 text-center">Assigned Therapist</th>
                <th className="py-4 px-6 text-center">Service Modality</th>
                <th className="py-4 px-6 text-center">Last Session</th>
                <th className="py-4 px-6 text-center">Next Session</th>
                <th className="py-4 px-6 text-center">Status</th>
                <th className="py-4 px-6 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {paginatedClients.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400 text-xs">
                    No client records match your search filters
                  </td>
                </tr>
              ) : (
                paginatedClients.map((c) => {
                  const nextSess = c.nextSession || 'Tomorrow, 10:00 AM';
                  return (
                    <tr key={c.id} className="hover:bg-purple-50/30 transition-colors whitespace-nowrap">
                      <td className="py-4 px-6 whitespace-nowrap space-y-0.5 text-center">
                        <div className="flex justify-center">
                          <span className="text-[10px] text-purple-600 font-mono font-bold bg-purple-50 px-2 py-0.5 rounded-md border border-purple-100">
                            #{c.id ? c.id.slice(0, 8) : 'USER'}
                          </span>
                        </div>
                        <div className="font-bold text-slate-900 text-sm">
                          {c.name || 'Client User'}
                        </div>
                      </td>
                      <td className="py-4 px-6 space-y-0.5 whitespace-nowrap text-center">
                        <div className="flex items-center justify-center gap-1.5 font-semibold text-slate-800 text-xs">
                          <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>{c.email || 'user@hexpertify.com'}</span>
                        </div>
                        <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-500">
                          <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>{c.phone || '+1 555-019-2834'}</span>
                        </div>
                      </td>
                      <td className="py-4 px-6 font-bold text-slate-800 whitespace-nowrap text-center">{c.assignedTherapistName || 'Dr. Evelyn Reed'}</td>
                      <td className="py-4 px-6 font-medium text-slate-600 whitespace-nowrap text-center">{c.service || 'Individual Therapy Consultation'}</td>
                      <td className="py-4 px-6 text-slate-500 font-medium whitespace-nowrap text-center">{c.lastSession || 'Yesterday'}</td>
                      <td className="py-4 px-6 whitespace-nowrap space-y-0.5 text-center">
                        {nextSess.includes(' ') ? (
                          <>
                            <div className="font-bold text-[#5e2be2] text-xs">
                              {nextSess.split(' ')[0]}
                            </div>
                            <div className="text-[11px] font-semibold text-slate-500">
                              {nextSess.substring(nextSess.indexOf(' ') + 1)}
                            </div>
                          </>
                        ) : (
                          <div className="font-bold text-[#5e2be2] text-xs">{nextSess}</div>
                        )}
                      </td>
                      <td className="py-4 px-6 whitespace-nowrap text-center">
                        <span
                          className={`text-[11px] px-3 py-1 font-bold rounded-full inline-block ${
                            c.status === 'Active'
                              ? 'bg-emerald-100 text-emerald-700'
                              : c.status === 'Completed'
                              ? 'bg-blue-100 text-blue-700'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {c.status || 'Active'}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-center whitespace-nowrap">
                        <button
                          onClick={() => {
                            setSelectedClient(c);
                            setActiveTab('intake');
                          }}
                          className="px-4 py-2 bg-[#5e2be2] hover:bg-[#4f28d9] text-white font-bold text-xs rounded-xl shadow-md shadow-[#5e2be2]/20 transition-all active:scale-95 cursor-pointer"
                        >
                          View Full Record
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer - 10 rows per page */}
        {filteredClients.length > 0 && (
          <div className="py-4 px-6 border-t border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
            <div className="text-slate-500 font-semibold text-center sm:text-left">
              Showing <span className="text-slate-900 font-extrabold">{startIndex + 1}</span> to{' '}
              <span className="text-slate-900 font-extrabold">{Math.min(startIndex + itemsPerPage, filteredClients.length)}</span> of{' '}
              <span className="text-[#5e2be2] font-extrabold">{filteredClients.length}</span> clients
              <span className="ml-2 text-slate-400 font-normal">(10 per page)</span>
            </div>

            <div className="flex items-center gap-1.5">
              {/* First Page */}
              <button
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
                title="First Page"
                className="p-2 rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:pointer-events-none transition-colors cursor-pointer"
              >
                <ChevronsLeft className="w-4 h-4" />
              </button>

              {/* Previous Page */}
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                title="Previous Page"
                className="p-2 rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:pointer-events-none transition-colors cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              {/* Page Number Buttons */}
              <div className="flex items-center gap-1">
                {(() => {
                  const delta = 1;
                  const range: (number | string)[] = [];
                  for (let i = Math.max(2, currentPage - delta); i <= Math.min(totalPages - 1, currentPage + delta); i++) {
                    range.push(i);
                  }
                  if (currentPage - delta > 2) range.unshift('...');
                  if (currentPage + delta < totalPages - 1) range.push('...');
                  range.unshift(1);
                  if (totalPages > 1) range.push(totalPages);

                  return range.map((pageItem, idx) => {
                    if (pageItem === '...') {
                      return (
                        <span key={`ellipsis-${idx}`} className="px-2 text-slate-400 font-bold">
                          ...
                        </span>
                      );
                    }
                    const pNum = pageItem as number;
                    const isActive = pNum === currentPage;
                    return (
                      <button
                        key={`page-${pNum}`}
                        onClick={() => setCurrentPage(pNum)}
                        className={`min-w-[32px] h-8 px-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                          isActive
                            ? 'bg-[#5e2be2] text-white shadow-md shadow-[#5e2be2]/25'
                            : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        {pNum}
                      </button>
                    );
                  });
                })()}
              </div>

              {/* Next Page */}
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                title="Next Page"
                className="p-2 rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:pointer-events-none transition-colors cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>

              {/* Last Page */}
              <button
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage === totalPages}
                title="Last Page"
                className="p-2 rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:pointer-events-none transition-colors cursor-pointer"
              >
                <ChevronsRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>


      {/* Comprehensive Client Medical Profile Modal */}
      {selectedClient && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-4xl bg-white rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-100 max-h-[94vh] sm:max-h-[92vh] my-auto overflow-y-auto p-4 sm:p-6 space-y-4 sm:space-y-6">
            {/* Modal Header */}
            <div className="flex items-start justify-between pb-4 sm:pb-5 border-b border-slate-100 gap-3">
              <div className="space-y-1.5 min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 leading-snug">{selectedClient.name}</h2>
                  <span className="px-2.5 py-0.5 bg-purple-100 text-[#5e2be2] font-mono font-bold text-[11px] sm:text-xs rounded-full shrink-0">
                    ID: #{selectedClient.id}
                  </span>
                  <span className="text-[11px] sm:text-xs px-2.5 py-0.5 bg-emerald-100 text-emerald-700 font-bold rounded-full shrink-0">
                    {selectedClient.status}
                  </span>
                </div>
                <p className="text-xs text-slate-500 flex flex-wrap items-center gap-x-3 gap-y-1 font-medium">
                  <span className="flex items-center gap-1">
                    <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="truncate max-w-[180px] sm:max-w-none">{selectedClient.email}</span>
                  </span>
                  <span className="flex items-center gap-1">
                    <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>{selectedClient.phone}</span>
                  </span>
                  <span className="flex items-center gap-1">
                    <UserCheck className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>Therapist: <strong className="text-slate-800">{selectedClient.assignedTherapistName}</strong></span>
                  </span>
                </p>
              </div>

              <button
                onClick={() => setSelectedClient(null)}
                className="p-1.5 sm:p-2 text-slate-400 hover:text-slate-600 rounded-xl sm:rounded-2xl hover:bg-slate-100 transition-colors shrink-0"
              >
                <X className="w-5 h-5 sm:w-6 sm:h-6" />
              </button>
            </div>

            {/* Modal Navigation Tabs */}
            <div className="flex items-center gap-1.5 sm:gap-2 border-b border-slate-100 pb-3 overflow-x-auto text-xs scrollbar-none">
              {[
                { id: 'intake', label: 'AI Intake & Survey', icon: Brain },
                { id: 'assessments', label: 'Clinical Assessments', icon: Award },
                { id: 'goals_mood', label: 'Goals & Mood Tracker', icon: Activity },
                { id: 'sessions_hw', label: 'Sessions & Homework', icon: Calendar },
                { id: 'documents', label: 'Documents & Files', icon: FileText }
              ].map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`flex items-center gap-1.5 px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl font-bold transition-all whitespace-nowrap text-xs shrink-0 ${
                      activeTab === tab.id
                        ? 'bg-[#5e2be2] text-white shadow-md shadow-[#5e2be2]/20'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Tab 1: AI Intake & Survey Responses */}
            {activeTab === 'intake' && (
              <div className="space-y-6">
                <div className="bg-purple-50/80 p-5 rounded-2xl border border-purple-100 space-y-2">
                  <h4 className="text-xs font-extrabold text-[#5e2be2] uppercase tracking-wider flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-[#5e2be2]" />
                    AI Intake Summary
                  </h4>
                  <p className="text-xs text-slate-700 leading-relaxed font-medium">
                    {selectedClient.aiIntakeSummary || `Patient record registered on ${selectedClient.joinedDate || 'recent date'}. Initial clinical intake pending client portal activity.`}
                  </p>
                </div>

                <div className="space-y-3">
                  <h4 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">Client Intake Survey Responses</h4>
                  {Object.keys(selectedClient.intakeResponses || {}).length === 0 ? (
                    <div className="py-8 text-center bg-slate-50 border border-dashed border-slate-200 rounded-2xl space-y-1">
                      <ClipboardList className="w-8 h-8 text-slate-300 mx-auto" />
                      <h4 className="text-xs font-bold text-slate-600">No Intake Survey Responses</h4>
                      <p className="text-[11px] text-slate-400">This client has not submitted the initial intake questionnaire yet.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {Object.entries(selectedClient.intakeResponses || {}).map(([key, val], idx) => (
                        <div key={idx} className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100">
                          <span className="text-[11px] font-semibold text-slate-400 block">{key}</span>
                          <span className="text-xs font-bold text-slate-900 mt-0.5 block">{String(val)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Tab 2: Clinical Assessment Scores */}
            {activeTab === 'assessments' && (
              <div className="space-y-4">
                <h4 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">Standardized Clinical Assessments</h4>
                {!selectedClient.assessmentScores || selectedClient.assessmentScores.length === 0 ? (
                  <div className="py-12 text-center bg-slate-50 border border-dashed border-slate-200 rounded-3xl space-y-2">
                    <Award className="w-10 h-10 text-slate-300 mx-auto" />
                    <h4 className="text-sm font-extrabold text-slate-700">No Clinical Assessments Completed</h4>
                    <p className="text-xs text-slate-400 max-w-sm mx-auto">
                      This client is newly registered and has not taken any standardized clinical assessments in the client portal yet.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {selectedClient.assessmentScores.map((a, idx) => (
                      <div key={idx} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-2">
                        <div className="flex items-center justify-between">
                          <h5 className="font-extrabold text-sm text-slate-900">{a.name}</h5>
                          <span className="text-xs px-3 py-1 bg-purple-100 text-purple-700 font-bold rounded-full">
                            {a.severity}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
                          <span>Date: <strong>{a.date}</strong></span>
                          <span className="font-extrabold text-slate-900 text-sm">{a.score} / {a.maxScore || 10}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Tab 3: Therapy Goals & Mood Tracking */}
            {activeTab === 'goals_mood' && (
              <div className="space-y-6">
                {/* Therapy Goals */}
                <div className="space-y-3">
                  <h4 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">Therapy Goals</h4>
                  {(!selectedClient.therapyGoals || selectedClient.therapyGoals.length === 0) && (!selectedClient.goals || selectedClient.goals.length === 0) ? (
                    <div className="py-8 text-center bg-slate-50 border border-dashed border-slate-200 rounded-2xl space-y-1">
                      <CheckCircle2 className="w-8 h-8 text-slate-300 mx-auto" />
                      <h4 className="text-xs font-bold text-slate-600">No Therapy Goals Set</h4>
                      <p className="text-[11px] text-slate-400">Goals will appear here once established during clinical sessions.</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {(selectedClient.therapyGoals || selectedClient.goals?.map(g => g.title) || []).map((g, idx) => (
                        <div key={idx} className="p-3.5 bg-emerald-50/60 rounded-2xl text-xs font-semibold text-slate-800 flex items-center gap-3 border border-emerald-100">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                          <span>{g}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Mood Score Timeline */}
                <div className="space-y-3">
                  <h4 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">Mood Score History (1-10 Scale)</h4>
                  {(!selectedClient.moodScores || selectedClient.moodScores.length === 0) && (!selectedClient.moodLogs || selectedClient.moodLogs.length === 0) ? (
                    <div className="py-8 text-center bg-slate-50 border border-dashed border-slate-200 rounded-2xl space-y-1">
                      <Activity className="w-8 h-8 text-slate-300 mx-auto" />
                      <h4 className="text-xs font-bold text-slate-600">No Mood Logs Recorded</h4>
                      <p className="text-[11px] text-slate-400">The client has not logged daily mood check-ins in the client panel yet.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2">
                      {(selectedClient.moodScores || selectedClient.moodLogs?.map(m => ({ date: m.date || 'Log', score: m.score })) || []).map((m, idx) => (
                        <div key={idx} className="p-3 bg-slate-50 rounded-2xl border border-slate-100 text-center space-y-1">
                          <span className="text-[10px] text-slate-400 block font-medium">{m.date}</span>
                          <span className="text-lg font-extrabold text-[#5e2be2] block">{m.score}/10</span>
                          <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                            <div className="bg-[#5e2be2] h-full rounded-full" style={{ width: `${(m.score / 10) * 100}%` }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Tab 4: Sessions & Homework */}
            {activeTab === 'sessions_hw' && (
              <div className="space-y-6">
                {/* Homework Assigned */}
                <div className="space-y-3">
                  <h4 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">Assigned Exercises & Homework</h4>
                  {(!selectedClient.homeworkAssigned || selectedClient.homeworkAssigned.length === 0) && (!selectedClient.homework || selectedClient.homework.length === 0) ? (
                    <div className="py-8 text-center bg-slate-50 border border-dashed border-slate-200 rounded-2xl space-y-1">
                      <CheckSquare className="w-8 h-8 text-slate-300 mx-auto" />
                      <h4 className="text-xs font-bold text-slate-600">No Homework Assigned</h4>
                      <p className="text-[11px] text-slate-400">No therapeutic exercises or tasks have been assigned to this client yet.</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {(selectedClient.homeworkAssigned || selectedClient.homework?.map(h => ({ title: h.title, dueDate: h.dueDate, completed: h.status === 'Completed' })) || []).map((hw, idx) => (
                        <div key={idx} className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <CheckSquare className={`w-4 h-4 ${hw.completed ? 'text-emerald-600' : 'text-slate-400'}`} />
                            <div>
                              <p className="font-bold text-xs text-slate-900">{hw.title}</p>
                              <span className="text-[10px] text-slate-400">Due: {hw.dueDate}</span>
                            </div>
                          </div>
                          <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold ${
                            hw.completed ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                          }`}>
                            {hw.completed ? 'Completed' : 'Pending'}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Session History Log */}
                <div className="space-y-3">
                  <h4 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">Session Log History</h4>
                  {(!selectedClient.sessionHistory || selectedClient.sessionHistory.length === 0) && (!selectedClient.sessions || selectedClient.sessions.length === 0) ? (
                    <div className="py-8 text-center bg-slate-50 border border-dashed border-slate-200 rounded-2xl space-y-1">
                      <Calendar className="w-8 h-8 text-slate-300 mx-auto" />
                      <h4 className="text-xs font-bold text-slate-600">No Consultation History</h4>
                      <p className="text-[11px] text-slate-400">No clinical consultations have been recorded for this client yet.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {(selectedClient.sessionHistory || selectedClient.sessions?.map((s: any) => ({
                        id: s.id,
                        summary: `${s.serviceName || selectedClient.service || 'Consultation'} (${s.status || 'CONFIRMED'})`,
                        date: s.date || selectedClient.joinedDate || 'Recent',
                        therapistNotes: `Consultation session conducted with ${s.therapistName || selectedClient.assignedTherapistName}. Practitioner verified patient progress and established key follow-up goals.`
                      })) || []).map((s) => (
                        <div key={s.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="font-extrabold text-xs text-slate-900">{s.summary}</span>
                            <span className="text-[10px] font-bold text-purple-700 bg-purple-100 px-2.5 py-0.5 rounded-full">
                              {s.date}
                            </span>
                          </div>
                          <p className="text-xs text-slate-600 leading-relaxed italic">
                            "{s.therapistNotes}"
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Tab 5: Documents & Files */}
            {activeTab === 'documents' && (
              <div className="space-y-3">
                <h4 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">Uploaded Medical Files & Documents</h4>
                {!selectedClient.documents || selectedClient.documents.length === 0 ? (
                  <div className="py-12 text-center bg-slate-50 border border-dashed border-slate-200 rounded-3xl space-y-2">
                    <FileText className="w-10 h-10 text-slate-300 mx-auto" />
                    <h4 className="text-sm font-extrabold text-slate-700">No Uploaded Documents</h4>
                    <p className="text-xs text-slate-400 max-w-sm mx-auto">
                      No medical files, assessment reports, or consent documents have been uploaded for this client yet.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {selectedClient.documents.map((doc, idx) => (
                      <div key={idx} className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-xl bg-purple-100 text-[#5e2be2] flex items-center justify-center font-bold text-xs">
                            {doc.type}
                          </div>
                          <div>
                            <p className="font-bold text-xs text-slate-900">{doc.name}</p>
                            <span className="text-[10px] text-slate-400">{doc.size} · Uploaded {doc.date}</span>
                          </div>
                        </div>

                        <button
                          onClick={() => alert(`Downloading ${doc.name}`)}
                          className="px-3 py-1.5 bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 text-xs font-bold rounded-xl shadow-2xs flex items-center gap-1.5"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>Download</span>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default ClientsView;
