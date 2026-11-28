import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  Search,
  Users,
  CheckCircle2,
  X,
  Phone,
  Mail,
  UserCheck,
  ArrowRightLeft,
  Sparkles,
  ClipboardList,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ShieldCheck,
  Trash2,
  AlertCircle
} from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { useUrlSearch } from '../lib/global-search';
import type { Client } from '../types';

export const ClientsView: React.FC = () => {
  const { clients, therapists, assignClientTherapist, deleteClient, refreshAllData } = useAppContext();
  // Client awaiting delete confirmation, and the result of the last delete
  const [deletingClient, setDeletingClient] = useState<Client | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const confirmDelete = async () => {
    if (!deletingClient) return;
    setIsDeleting(true);
    setDeleteError(null);
    try {
      await deleteClient(deletingClient.id);
      if (selectedClient?.id === deletingClient.id) setSelectedClient(null);
      setToast(`${deletingClient.name} deleted.`);
      setTimeout(() => setToast(null), 4000);
      setDeletingClient(null);
    } catch (err: any) {
      // Not deleted (e.g. upcoming sessions): keep the dialog open and say why
      setDeleteError(err?.message || 'Could not delete this client. Please try again.');
      // Already gone elsewhere ("User not found"): reload so the stale row disappears
      refreshAllData();
    } finally {
      setIsDeleting(false);
    }
  };
  const [searchTerm, setSearchTerm] = useState('');
  // Opened from the admin search (e.g. ?q=CL-00001): filter to that record
  useUrlSearch(setSearchTerm);
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [assigningClient, setAssigningClient] = useState<Client | null>(null);
  const [selectedTherapistId, setSelectedTherapistId] = useState<string>('');
  const [therapistSearch, setTherapistSearch] = useState<string>('');
  const [isAssigning, setIsAssigning] = useState<boolean>(false);
  const [assignError, setAssignError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const itemsPerPage = 10;

  // Plain substring search (no regex), ignoring spaces typed around the term
  const term = searchTerm.trim().toLowerCase();
  const filteredClients = clients.filter((c) => {
    const matchesSearch =
      !term ||
      (c.name || '').toLowerCase().includes(term) ||
      (c.email || '').toLowerCase().includes(term) ||
      Boolean(c.phone && c.phone.toLowerCase().includes(term)) ||
      (c.clientNumber || '').toLowerCase().includes(term) ||
      (c.id || '').toLowerCase().includes(term) ||
      (c.assignedTherapistName || '').toLowerCase().includes(term);
    const matchesStatus = statusFilter === 'All' || c.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Reset to page 1 whenever search or filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredClients.length / itemsPerPage));
  // After a delete empties the last page, step back to the new last page
  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  /** The client's current therapist: by stored id, or by exact name only when no id is stored */
  const isCurrentTherapist = (c: Client, t: { id: string; name: string }) => {
    if (c.assignedTherapistId) return c.assignedTherapistId === t.id;
    const name = (c.assignedTherapistName || '').trim().toLowerCase();
    return Boolean(name) && t.name.trim().toLowerCase() === name;
  };

  const openAssign = (c: Client) => {
    setAssignError(null);
    setAssigningClient(c);
    // Nothing is pre-selected for an unassigned client
    setSelectedTherapistId(therapists.find((t) => isCurrentTherapist(c, t))?.id || '');
  };

  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedClients = filteredClients.slice(startIndex, startIndex + itemsPerPage);


  return (
    <div className="space-y-8 pb-12 animate-fade-in">
      {/* Hero Header matching Home Page card gradient */}
      <div className="relative rounded-2xl sm:rounded-3xl bg-gradient-to-r from-[#3a0aa8] via-[#450bc8] to-[#3b1799] p-4 sm:p-8 text-white shadow-xl overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-4 sm:gap-6">
        <div className="absolute -right-12 -top-12 w-96 h-96 bg-white/5 rounded-full blur-2xl pointer-events-none" />
        <div className="relative z-10 space-y-1 sm:space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md border border-white/20 text-[10px] sm:text-xs font-bold tracking-wide uppercase text-purple-200">
            <ClipboardList className="w-3.5 h-3.5" />
            <span>Client Records</span>
          </div>
          <h1 className="text-xl sm:text-3xl font-extrabold tracking-tight">Clients</h1>
          <p className="text-purple-100 text-xs sm:text-sm max-w-xl leading-relaxed">
            Access complete client details.
          </p>
        </div>

        <div className="relative z-10 flex items-center gap-3 bg-white/10 backdrop-blur-xl p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-white/20 shadow-2xl shrink-0">
          <Users className="w-6 h-6 sm:w-8 sm:h-8 text-purple-200" />
          <div>
            <span className="text-[10px] sm:text-xs text-purple-200 block font-semibold">Total Registered Clients</span>
            <span className="text-lg sm:text-2xl font-extrabold text-white">{clients.length} {clients.length === 1 ? 'Client' : 'Clients'}</span>
            <span className="text-[10px] sm:text-xs text-purple-200 block font-semibold">{clients.filter((c) => c.status === 'Active').length} active</span>
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
            className="w-full pl-10 pr-4 py-2 sm:py-2.5 bg-slate-50 border border-slate-200 rounded-xl sm:rounded-2xl text-xs font-medium text-slate-800 outline-none focus:border-[#450bc8] focus:ring-2 focus:ring-[#450bc8]/10"
          />
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto w-full md:w-auto scrollbar-none pb-1 md:pb-0">
          {['All', 'Active', 'Completed', 'Inactive'].map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-3.5 sm:px-4 py-1.5 sm:py-2 rounded-xl sm:rounded-2xl text-xs font-bold transition-all whitespace-nowrap ${
                statusFilter === status
                  ? 'bg-[#450bc8] text-white shadow-md shadow-[#450bc8]/20'
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
                <th className="py-4 px-6 text-center">Client Name</th>
                <th className="py-4 px-6 text-center">Contact Info</th>
                <th className="py-4 px-6 text-center">Assigned Therapist</th>
                <th className="py-4 px-6 text-center">Service</th>
                <th className="py-4 px-6 text-center">Status</th>
                <th className="py-4 px-6 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {paginatedClients.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400 text-xs">
                    No client records match your search filters
                  </td>
                </tr>
              ) : (
                paginatedClients.map((c) => {
                  return (
                    <tr key={c.id} className="hover:bg-purple-50/30 transition-colors whitespace-nowrap">
                      <td className="py-4 px-6 whitespace-nowrap text-center">
                        <div className="font-bold text-slate-900 text-sm">
                          {c.name || 'Client User'}
                        </div>
                        {c.clientNumber && (
                          <div className="font-mono text-[11px] font-bold text-[#450bc8]">{c.clientNumber}</div>
                        )}
                      </td>
                      <td className="py-4 px-6 space-y-0.5 whitespace-nowrap text-center">
                        <div className="flex items-center justify-center gap-1.5 font-semibold text-slate-800 text-xs">
                          <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>{c.email || '—'}</span>
                        </div>
                        <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-500">
                          <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>{c.phone || '—'}</span>
                        </div>
                      </td>
                      <td className="py-4 px-6 font-bold text-slate-800 whitespace-nowrap text-center">
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-50 border border-purple-100 font-bold text-slate-800 text-xs">
                          <UserCheck className="w-3.5 h-3.5 text-[#450bc8] shrink-0" />
                          <span>{c.assignedTherapistName || 'Not assigned'}</span>
                        </div>
                      </td>
                      <td className="py-4 px-6 font-medium text-slate-600 whitespace-nowrap text-center">{c.service || '—'}</td>
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
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => {
                              setSelectedClient(c);
                            }}
                            className="px-3.5 py-1.5 bg-[#450bc8] hover:bg-[#3a0aa8] text-white font-bold text-xs rounded-xl shadow-sm shadow-[#450bc8]/20 transition-all active:scale-95 cursor-pointer"
                          >
                            View Record
                          </button>
                          <button
                            onClick={() => openAssign(c)}
                            className="px-3 py-1.5 bg-purple-50 hover:bg-purple-100 text-[#450bc8] hover:text-[#3a0aa8] font-bold text-xs rounded-xl border border-purple-200 transition-all active:scale-95 cursor-pointer flex items-center gap-1"
                            title="Assign or Change Exclusive Consultant"
                          >
                            <ArrowRightLeft className="w-3 h-3" />
                            <span>Assign</span>
                          </button>
                          <button
                            onClick={() => {
                              setDeleteError(null);
                              setDeletingClient(c);
                            }}
                            className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl border border-rose-200 transition-all active:scale-95 cursor-pointer"
                            title="Delete client"
                            aria-label={`Delete ${c.name || 'client'}`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
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
              <span className="text-[#450bc8] font-extrabold">{filteredClients.length}</span> clients
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
                            ? 'bg-[#450bc8] text-white shadow-md shadow-[#450bc8]/25'
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in overflow-y-auto">
          <div className="w-full max-w-4xl bg-white rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-100 max-h-[85vh] my-auto overflow-y-auto p-4 sm:p-6 space-y-4 sm:space-y-6">
            {/* Modal Header */}
            <div className="flex items-start justify-between pb-4 sm:pb-5 border-b border-slate-100 gap-3">
              <div className="space-y-1.5 min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 leading-snug">{selectedClient.name}</h2>
                  <span className="px-2.5 py-0.5 bg-purple-100 text-[#450bc8] font-mono font-bold text-[11px] sm:text-xs rounded-full shrink-0">
                    {selectedClient.clientNumber || `ID: #${selectedClient.id}`}
                  </span>
                  <span className={`text-[11px] sm:text-xs px-2.5 py-0.5 font-bold rounded-full shrink-0 ${
                    selectedClient.status === 'Active'
                      ? 'bg-emerald-100 text-emerald-700'
                      : selectedClient.status === 'Completed'
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-slate-100 text-slate-600'
                  }`}>
                    {selectedClient.status}
                  </span>
                </div>
                <p className="text-xs text-slate-500 flex flex-wrap items-center gap-x-3 gap-y-1 font-medium">
                  <span className="flex items-center gap-1">
                    <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="truncate max-w-[180px] sm:max-w-none">{selectedClient.email || '—'}</span>
                  </span>
                  <span className="flex items-center gap-1">
                    <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>{selectedClient.phone || '—'}</span>
                  </span>
                  <span className="flex items-center gap-1">
                    <UserCheck className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>Therapist: <strong className="text-slate-800">{selectedClient.assignedTherapistName || 'Not assigned'}</strong></span>
                    <button
                      onClick={() => openAssign(selectedClient)}
                      className="ml-2 px-2 py-0.5 text-[10px] bg-purple-100 hover:bg-purple-200 text-[#450bc8] rounded-lg font-bold border border-purple-200 cursor-pointer inline-flex items-center gap-1 transition-colors"
                      title="Reassign to another single consultant"
                    >
                      <ArrowRightLeft className="w-2.5 h-2.5" />
                      <span>Change</span>
                    </button>
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

            {/* Admins only see general details: clinical records belong to the assigned therapist */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">General Details</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  { label: 'Full Name', value: selectedClient.name },
                  { label: 'Client ID', value: selectedClient.clientNumber || selectedClient.id },
                  { label: 'Email', value: selectedClient.email },
                  { label: 'Phone', value: selectedClient.phone },
                  { label: 'Status', value: selectedClient.status },
                  { label: 'Service', value: selectedClient.service },
                  { label: 'Joined', value: selectedClient.joinedDate },
                  { label: 'Assigned Therapist', value: selectedClient.assignedTherapistName }
                ].map((row) => (
                  <div key={row.label} className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{row.label}</p>
                    <p className="text-sm font-semibold text-slate-800 break-words">{row.value || '—'}</p>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>,
        document.body
      )}

      {/* Exclusive Single Consultant Assignment Modal */}
      {assigningClient && createPortal(
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in overflow-y-auto">
          <div className="w-full max-w-lg bg-white rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-100 p-5 sm:p-6 space-y-5 animate-scale-up my-auto max-h-[85vh] overflow-y-auto">
            <div className="flex items-start justify-between border-b border-slate-100 pb-3">
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 text-xs font-extrabold text-[#450bc8] uppercase tracking-wider">
                  <ShieldCheck className="w-4 h-4" />
                  <span>Consultant Assignment Hub</span>
                </div>
                <h3 className="text-lg font-extrabold text-slate-900">
                  Assign Consultant to {assigningClient.name}
                </h3>
              </div>
              <button
                onClick={() => {
                  setAssigningClient(null);
                  setTherapistSearch('');
                }}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Strict Policy Notice */}
            <div className="p-3 bg-purple-50 rounded-xl border border-purple-100 text-xs text-purple-900 space-y-1">
              <p className="font-bold flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[#450bc8]" />
                <span>Strict 1:1 Consultant Assignment Rule</span>
              </p>
              <p className="text-[11px] text-purple-700 leading-relaxed">
                Each client is assigned to exactly one consultant. Assigning <strong>{assigningClient.name}</strong> to a new consultant will automatically transfer their profile and care exclusively to the selected specialist.
              </p>
            </div>

            {/* Search Therapists */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 block">Select Exclusive Consultant ({therapists.length} available)</label>
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Filter consultants by name or profession..."
                  value={therapistSearch}
                  onChange={(e) => setTherapistSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 outline-none focus:border-[#450bc8]"
                />
              </div>
            </div>

            {/* Consultant List */}
            <div className="max-h-56 overflow-y-auto space-y-2 pr-1 scrollbar-thin">
              {therapists
                .filter(t => !therapistSearch || t.name.toLowerCase().includes(therapistSearch.toLowerCase()) || (t.profession || '').toLowerCase().includes(therapistSearch.toLowerCase()))
                .map((t) => {
                  const isSelected = selectedTherapistId === t.id;
                  const isCurrent = isCurrentTherapist(assigningClient, t);
                  return (
                    <div
                      key={t.id}
                      onClick={() => setSelectedTherapistId(t.id)}
                      className={`p-3 rounded-xl border flex items-center justify-between gap-3 cursor-pointer transition-all ${
                        isSelected
                          ? 'border-[#450bc8] bg-purple-50/50 shadow-sm'
                          : 'border-slate-100 hover:border-slate-200 hover:bg-slate-50/50'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <img
                          src={t.photo || 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&w=400&q=80'}
                          alt={t.name}
                          className="w-9 h-9 rounded-full object-cover shrink-0 border border-slate-200"
                        />
                        <div className="min-w-0">
                          <div className="font-bold text-slate-900 text-xs truncate flex items-center gap-1.5">
                            <span>{t.name}</span>
                            {isCurrent && (
                              <span className="text-[10px] px-1.5 py-0.2 bg-slate-200 text-slate-700 font-bold rounded">Current</span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-500 truncate">{t.profession || 'Specialist'}</div>
                        </div>
                      </div>

                      <div className="shrink-0">
                        <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                          isSelected ? 'border-[#450bc8] bg-[#450bc8]' : 'border-slate-300'
                        }`}>
                          {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>

            {assignError && (
              <div role="alert" className="flex items-start gap-2 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{assignError}</span>
              </div>
            )}

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
              <button
                onClick={() => {
                  setAssigningClient(null);
                  setTherapistSearch('');
                }}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                disabled={!selectedTherapistId || isAssigning}
                onClick={async () => {
                  const chosen = therapists.find(t => t.id === selectedTherapistId);
                  if (!chosen || !assigningClient) return;
                  setIsAssigning(true);
                  try {
                    await assignClientTherapist(
                      assigningClient.id,
                      chosen.id,
                      chosen.name,
                      chosen.email,
                      chosen.photo
                    );
                    if (selectedClient && selectedClient.id === assigningClient.id) {
                      setSelectedClient(prev => prev ? { ...prev, assignedTherapistId: chosen.id, assignedTherapistName: chosen.name } : null);
                    }
                    setAssigningClient(null);
                    setTherapistSearch('');
                  } catch (err: any) {
                    // Not saved: keep the dialog open and say why
                    setAssignError(err?.message || 'Could not save the assignment. Please try again.');
                  } finally {
                    setIsAssigning(false);
                  }
                }}
                className="px-5 py-2 text-xs font-bold text-white bg-[#450bc8] hover:bg-[#3a0aa8] rounded-xl shadow-md shadow-[#450bc8]/25 transition-all cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
              >
                {isAssigning ? (
                  <span>Saving Assignment...</span>
                ) : (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Confirm Exclusive Assignment</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Delete confirmation */}
      {deletingClient && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div role="dialog" aria-modal="true" className="w-full max-w-md bg-white rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-100 p-5 sm:p-6 space-y-4 my-auto max-h-[90dvh] overflow-y-auto">
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-2xl bg-rose-100 text-rose-600 shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h3 className="text-lg font-extrabold text-slate-900">Delete {deletingClient.name || 'this client'}?</h3>
                <p className="text-xs text-slate-500 font-medium break-words">
                  {[deletingClient.clientNumber, deletingClient.email].filter(Boolean).join(' · ')}
                </p>
              </div>
            </div>
            <p className="text-sm text-slate-600 leading-relaxed">
              The client's account is removed and they can no longer sign in. Past bookings and payments stay in the records.
              This cannot be undone.
            </p>
            {deleteError && (
              <div role="alert" className="flex items-start gap-2 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{deleteError}</span>
              </div>
            )}
            <div className="flex justify-end gap-2 pt-1">
              <button
                onClick={() => setDeletingClient(null)}
                disabled={isDeleting}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 font-bold text-sm hover:bg-slate-50 disabled:opacity-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                disabled={isDeleting}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-sm disabled:opacity-60 cursor-pointer"
              >
                {isDeleting ? 'Deleting…' : 'Delete client'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {toast && (
        <div className="fixed top-24 right-8 z-50 bg-emerald-600 text-white px-5 py-4 rounded-2xl shadow-2xl flex items-center gap-3 border border-emerald-500 animate-fade-in">
          <CheckCircle2 className="w-5 h-5 text-white" />
          <span className="font-bold text-xs">{toast}</span>
        </div>
      )}
    </div>
  );
};

export default ClientsView;
