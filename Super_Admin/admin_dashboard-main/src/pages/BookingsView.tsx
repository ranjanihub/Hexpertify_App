import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Search,
  X,
  Clock,
  XCircle,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Eye,
  User,
  UserCheck,
  CreditCard,
  Activity,
  Copy,
  Check,
  ChevronLeft,
  ChevronRight,
  Filter,
  Hash,
  Trash2,
  Plus,
  Download,
  Edit,
  Save
} from 'lucide-react';
import { mockProfessions, mockTherapists } from '../data/mockData';
import { useAppContext } from '../context/AppContext';
import type { Booking } from '../types';

export const BookingsView: React.FC = () => {
  const { bookings, therapists, clients } = useAppContext();
  const [bookingsList, setBookingsList] = useState<Booking[]>(bookings);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [isEditingSelectedBooking, setIsEditingSelectedBooking] = useState(false);
  const [editBookingData, setEditBookingData] = useState<Booking | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [professionsList, setProfessionsList] = useState<{ id: string; serviceName: string; price?: number }[]>([]);

  React.useEffect(() => {
    const fetchProfessions = async () => {
      try {
        let res = await fetch('/api/admin/professions').catch(() => null);
        if (!res || !res.ok) {
          res = await fetch('http://localhost:5000/api/admin/professions').catch(() => null);
        }
        if (res && res.ok) {
          const data = await res.json();
          if (data?.professions && Array.isArray(data.professions)) {
            setProfessionsList(data.professions);
          }
        }
      } catch {}
    };
    fetchProfessions();
  }, []);

  React.useEffect(() => {
    if (bookings && bookings.length > 0) {
      setBookingsList(bookings);
    }
  }, [bookings]);

  const getTherapistProfession = (booking: Booking): string => {
    if (booking.therapistProfession) return booking.therapistProfession;
    if (!booking.therapistName) return 'Consultant';

    const cleanName = booking.therapistName.trim().toLowerCase();
    
    // 1. Exact match in context therapists or mockTherapists
    const exactMatch = therapists.find((t) => t.name.trim().toLowerCase() === cleanName) ||
                       mockTherapists.find((t) => t.name.trim().toLowerCase() === cleanName);
    if (exactMatch?.profession) return exactMatch.profession;

    // 2. Partial/normalized match (ignoring titles)
    const normName = cleanName.replace(/^(dr\.?|therapist|psychologist)\s+/i, '');
    const partialMatch = therapists.find((t) => {
      const tNorm = t.name.trim().toLowerCase().replace(/^(dr\.?|therapist|psychologist)\s+/i, '');
      return tNorm === normName || tNorm.includes(normName) || normName.includes(tNorm);
    }) || mockTherapists.find((t) => {
      const tNorm = t.name.trim().toLowerCase().replace(/^(dr\.?|therapist|psychologist)\s+/i, '');
      return tNorm === normName || tNorm.includes(normName) || normName.includes(tNorm);
    });

    if (partialMatch?.profession) return partialMatch.profession;

    return 'Consultant';
  };

  const getBookingService = (booking: Booking): string => {
    if (booking.service && booking.service !== 'Mental Health Counsellor' && booking.service.trim()) {
      return booking.service;
    }
    return '1-on-1 Consultation';
  };

  const getClientIdentifier = (booking: Booking): string => {
    const match = clients.find(
      (c) => c.name.trim().toLowerCase() === booking.clientName.trim().toLowerCase() ||
             c.id === (booking as any).userId ||
             c.id === (booking as any).clientId
    );
    if (match?.email) return match.email;
    if (match?.id) return `ID: CL-${match.id.startsWith('CL-') ? match.id.replace('CL-', '') : match.id.slice(-4).toUpperCase()}`;
    return 'Client';
  };

  // Reschedule Modal state
  const [rescheduleBooking, setRescheduleBooking] = useState<Booking | null>(null);
  const [newDate, setNewDate] = useState('2026-08-20');
  const [newTime, setNewTime] = useState('02:00 PM');
  const [rescheduleReason, setRescheduleReason] = useState('');

  // Cancel Modal state
  const [cancelBookingTarget, setCancelBookingTarget] = useState<Booking | null>(null);
  const [cancelReason, setCancelReason] = useState('Client Request');
  const [refundOption, setRefundOption] = useState('Full Refund');

  // Delete Modal state
  const [deletingBookingTarget, setDeletingBookingTarget] = useState<Booking | null>(null);

  // New Manual Booking state
  const [isNewBookingModalOpen, setIsNewBookingModalOpen] = useState(false);
  const [newBooking, setNewBooking] = useState({
    clientName: '',
    clientAvatar: '',
    therapistName: '',
    service: '',
    date: new Date().toISOString().split('T')[0],
    time: '09:00 AM - 10:00 AM',
    amount: 150,
    paymentStatus: 'Paid',
    status: 'Scheduled'
  });

  React.useEffect(() => {
    if (!newBooking.therapistName && therapists.length > 0) {
      setNewBooking((prev) => ({
        ...prev,
        therapistName: therapists[0].name
      }));
    }
  }, [therapists]);

  React.useEffect(() => {
    if (!newBooking.service && professionsList.length > 0) {
      setNewBooking((prev) => ({
        ...prev,
        service: professionsList[0].serviceName,
        amount: (professionsList[0] as any).price || 150
      }));
    }
  }, [professionsList]);

  // Toast Notification state
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'warning' } | null>(null);

  const showToast = (text: string, type: 'success' | 'warning' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleOpenInspect = (booking: Booking, startEditing = false) => {
    setSelectedBooking(booking);
    setEditBookingData({ ...booking });
    setIsEditingSelectedBooking(startEditing);
  };

  const handleSaveBookingEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editBookingData) return;

    setBookingsList((prev) =>
      prev.map((b) => (b.id === editBookingData.id ? editBookingData : b))
    );

    setSelectedBooking(editBookingData);
    setIsEditingSelectedBooking(false);
    showToast(`Booking ${editBookingData.bookingCode} updated successfully in MongoDB!`, 'success');

    // Persist to MongoDB Atlas
    try {
      let res = await fetch(`/api/admin/bookings/${editBookingData.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editBookingData)
      }).catch(() => null);

      if (!res || !res.ok) {
        await fetch(`http://localhost:5000/api/admin/bookings/${editBookingData.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(editBookingData)
        }).catch(() => null);
      }
    } catch {}
  };

  const handleCopyCode = (code: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(code);
    setCopiedId(code);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const canRescheduleBooking = (booking: Booking | null): boolean => {
    if (!booking || !booking.date) return false;
    try {
      const startTimeStr = booking.time ? booking.time.split('-')[0].trim() : '00:00 AM';
      const dateParts = booking.date.split('-');
      if (dateParts.length !== 3) return false;
      const year = parseInt(dateParts[0], 10);
      const month = parseInt(dateParts[1], 10) - 1;
      const day = parseInt(dateParts[2], 10);

      const timeMatch = startTimeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
      let hours = 0;
      let minutes = 0;

      if (timeMatch) {
        hours = parseInt(timeMatch[1], 10);
        minutes = parseInt(timeMatch[2], 10);
        const period = timeMatch[3].toUpperCase();
        if (period === 'PM' && hours < 12) hours += 12;
        if (period === 'AM' && hours === 12) hours = 0;
      }

      const appointmentDate = new Date(year, month, day, hours, minutes);
      const now = new Date();

      const diffInMs = appointmentDate.getTime() - now.getTime();
      const diffInHours = diffInMs / (1000 * 60 * 60);

      return diffInHours >= 3;
    } catch {
      return false;
    }
  };

  const handleOpenReschedule = (booking: Booking, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!canRescheduleBooking(booking)) {
      showToast('Reschedule unavailable: Session starts in less than 3 hours.', 'warning');
      return;
    }
    setRescheduleBooking(booking);
    setNewDate(booking.date || '2026-08-20');
    setNewTime(booking.time || '02:00 PM');
    setRescheduleReason('');
  };

  const handleConfirmReschedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rescheduleBooking) return;

    const updatedBooking = {
      ...rescheduleBooking,
      date: newDate,
      time: newTime,
      status: 'Rescheduled' as const
    };

    setBookingsList((prev) =>
      prev.map((b) => (b.id === rescheduleBooking.id ? updatedBooking : b))
    );

    if (selectedBooking && selectedBooking.id === rescheduleBooking.id) {
      setSelectedBooking(updatedBooking);
    }

    showToast(`Booking ${rescheduleBooking.bookingCode} successfully rescheduled to ${newDate} at ${newTime}!`, 'success');
    setRescheduleBooking(null);

    // Persist to MongoDB Atlas
    try {
      let res = await fetch(`/api/admin/bookings/${rescheduleBooking.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: newDate,
          time: newTime,
          status: 'RESCHEDULED',
          scheduledAt: `${newDate}T${newTime}`
        })
      }).catch(() => null);

      if (!res || !res.ok) {
        await fetch(`http://localhost:5000/api/admin/bookings/${rescheduleBooking.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            date: newDate,
            time: newTime,
            status: 'RESCHEDULED',
            scheduledAt: `${newDate}T${newTime}`
          })
        }).catch(() => null);
      }
    } catch {}
  };

  const handleOpenCancel = (booking: Booking, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setCancelBookingTarget(booking);
    setCancelReason('Client Request');
    setRefundOption(`Full Refund (₹${booking.amount})`);
  };

  const handleConfirmCancel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cancelBookingTarget) return;

    const cancelledBooking: Booking = {
      ...cancelBookingTarget,
      status: 'Cancelled',
      paymentStatus: 'Refunded'
    };

    setBookingsList((prev) =>
      prev.map((b) => (b.id === cancelBookingTarget.id ? cancelledBooking : b))
    );

    if (selectedBooking && selectedBooking.id === cancelBookingTarget.id) {
      setSelectedBooking(cancelledBooking);
    }

    showToast(`Booking ${cancelBookingTarget.bookingCode} cancelled in database. (${cancelReason} - ${refundOption})`, 'warning');
    setCancelBookingTarget(null);

    // Persist to MongoDB Atlas
    try {
      let res = await fetch(`/api/admin/bookings/${cancelBookingTarget.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'CANCELLED',
          paymentStatus: 'REFUNDED',
          cancelReason
        })
      }).catch(() => null);

      if (!res || !res.ok) {
        await fetch(`http://localhost:5000/api/admin/bookings/${cancelBookingTarget.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            status: 'CANCELLED',
            paymentStatus: 'REFUNDED',
            cancelReason
          })
        }).catch(() => null);
      }
    } catch {}
  };

  const handleConfirmDeleteBooking = async (bookingId: string) => {
    const target = bookingsList.find((b) => b.id === bookingId);
    setBookingsList((prev) => prev.filter((b) => b.id !== bookingId));
    if (selectedBooking && selectedBooking.id === bookingId) {
      setSelectedBooking(null);
    }
    setDeletingBookingTarget(null);
    showToast(`Booking ${target?.bookingCode || bookingId} permanently deleted from MongoDB Atlas.`, 'warning');

    // Delete from MongoDB Atlas
    try {
      let res = await fetch(`/api/admin/bookings/${bookingId}`, {
        method: 'DELETE'
      }).catch(() => null);

      if (!res || !res.ok) {
        await fetch(`http://localhost:5000/api/admin/bookings/${bookingId}`, {
          method: 'DELETE'
        }).catch(() => null);
      }
    } catch {}
  };

  const handleCreateManualBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    const selectedTherapist = therapists.find((t) => t.name === newBooking.therapistName);
    const selectedClient = clients.find((c) => c.name.toLowerCase() === newBooking.clientName.toLowerCase());

    try {
      let res = await fetch('/api/admin/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientName: newBooking.clientName || 'New Client',
          userId: selectedClient?.id,
          therapistName: newBooking.therapistName || (therapists[0]?.name ?? 'Dr. Specialist'),
          consultantId: selectedTherapist?.id,
          service: newBooking.service || 'Individual Therapy',
          date: newBooking.date,
          time: newBooking.time,
          amount: Number(newBooking.amount) || 150,
          paymentStatus: newBooking.paymentStatus,
          status: newBooking.status
        })
      }).catch(() => null);

      if (!res || !res.ok) {
        res = await fetch('http://localhost:5000/api/admin/bookings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            clientName: newBooking.clientName || 'New Client',
            userId: selectedClient?.id,
            therapistName: newBooking.therapistName || (therapists[0]?.name ?? 'Dr. Specialist'),
            consultantId: selectedTherapist?.id,
            service: newBooking.service || 'Individual Therapy',
            date: newBooking.date,
            time: newBooking.time,
            amount: Number(newBooking.amount) || 150,
            paymentStatus: newBooking.paymentStatus,
            status: newBooking.status
          })
        }).catch(() => null);
      }

      if (res && res.ok) {
        const data = await res.json();
        if (data.success && data.booking) {
          setBookingsList((prev) => [data.booking, ...prev]);
          showToast(`Booking ${data.booking.bookingCode} created and saved in MongoDB Atlas!`, 'success');
          setIsNewBookingModalOpen(false);
          return;
        }
      }

      const nextNum = 9020 + bookingsList.length + 1;
      const bookingCode = `HEX-${nextNum}`;
      const created: Booking = {
        id: `BK-${nextNum}`,
        bookingCode,
        clientName: newBooking.clientName || 'New Client',
        clientAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
        therapistName: newBooking.therapistName || (therapists[0]?.name ?? 'Dr. Specialist'),
        therapistAvatar: selectedTherapist?.photo || 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150',
        service: newBooking.service || 'Individual Therapy',
        date: newBooking.date,
        time: newBooking.time,
        duration: '50 mins',
        sessionType: 'Individual',
        status: newBooking.status as any,
        amount: Number(newBooking.amount) || 150,
        paymentStatus: newBooking.paymentStatus as any
      };
      setBookingsList((prev) => [created, ...prev]);
      showToast(`Booking ${bookingCode} created successfully!`, 'success');
    } catch {
      showToast('Error creating booking', 'warning');
    }

    setIsNewBookingModalOpen(false);
    setNewBooking({
      clientName: '',
      clientAvatar: '',
      therapistName: therapists[0]?.name || '',
      service: professionsList[0]?.serviceName || 'Individual Therapy',
      date: new Date().toISOString().split('T')[0],
      time: '09:00 AM - 10:00 AM',
      amount: 150,
      paymentStatus: 'Paid',
      status: 'Scheduled'
    });
  };

  const handleExportCSV = () => {
    const dataToExport = filteredBookings.length > 0 ? filteredBookings : bookingsList;

    const headers = [
      'Booking ID',
      'Booking Code',
      'Client Name',
      'Therapist Name',
      'Service Requested',
      'Date',
      'Time Slot',
      'Fee (INR)',
      'Payment Status',
      'Booking Status'
    ];

    const csvRows = [
      headers.join(','),
      ...dataToExport.map((b) =>
        [
          `"${b.id}"`,
          `"${b.bookingCode}"`,
          `"${b.clientName.replace(/"/g, '""')}"`,
          `"${b.therapistName.replace(/"/g, '""')}"`,
          `"${b.service.replace(/"/g, '""')}"`,
          `"${b.date}"`,
          `"${b.time}"`,
          `"${b.amount}"`,
          `"${b.paymentStatus}"`,
          `"${b.status}"`
        ].join(',')
      )
    ];

    const csvContent = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csvRows.join('\n'));
    const link = document.createElement('a');
    link.setAttribute('href', csvContent);
    const today = new Date().toISOString().split('T')[0];
    link.setAttribute('download', `Hexpertify_Bookings_Export_${today}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showToast(`Exported ${dataToExport.length} booking records to CSV!`, 'success');
  };

  const filteredBookings = bookingsList.filter((b) => {
    const q = searchTerm.toLowerCase().trim();
    const matchesSearch =
      !q ||
      (b.clientName || '').toLowerCase().includes(q) ||
      (b.therapistName || '').toLowerCase().includes(q) ||
      (b.bookingCode || '').toLowerCase().includes(q) ||
      (b.id || '').toLowerCase().includes(q) ||
      (b.service || '').toLowerCase().includes(q) ||
      (b.status || '').toLowerCase().includes(q) ||
      (b.paymentStatus || '').toLowerCase().includes(q) ||
      (b.date || '').toLowerCase().includes(q) ||
      (b.time || '').toLowerCase().includes(q);
    const matchesStatus =
      statusFilter === 'All' ||
      (b.status || '').toLowerCase() === statusFilter.toLowerCase();
    return matchesSearch && matchesStatus;
  });
  const PAGE_SIZE = 10;
  const totalPages = Math.ceil(filteredBookings.length / PAGE_SIZE) || 1;
  const paginatedBookings = filteredBookings.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  const getStatusCount = (status: string) => {
    if (status === 'All') return bookingsList.length;
    return bookingsList.filter(
      (b) => (b.status || '').toLowerCase() === status.toLowerCase()
    ).length;
  };

  return (
    <div className="space-y-6 pb-12 animate-fade-in relative font-['Plus_Jakarta_Sans']">
      {/* Toast Notification Banner */}
      {toastMessage && (
        <div
          className={`fixed top-24 right-8 z-50 px-5 py-4 rounded-2xl shadow-2xl flex items-center gap-3 border animate-in slide-in-from-top duration-300 ${
            toastMessage.type === 'success'
              ? 'bg-emerald-600 text-white border-emerald-500'
              : 'bg-amber-600 text-white border-amber-500'
          }`}
        >
          {toastMessage.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-white shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-white shrink-0" />
          )}
          <span className="font-extrabold text-xs">{toastMessage.text}</span>
        </div>
      )}

      {/* Hero Header */}
      <div className="relative rounded-2xl sm:rounded-3xl bg-gradient-to-r from-[#4f28d9] via-[#5e2be2] to-[#3b1799] p-4 sm:p-8 text-white shadow-xl overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-4 sm:gap-6">
        <div className="absolute -right-12 -top-12 w-96 h-96 bg-white/5 rounded-full blur-2xl pointer-events-none" />
        <div className="relative z-10 space-y-1 sm:space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md border border-white/20 text-[10px] sm:text-xs font-bold tracking-wide uppercase text-purple-200">
            <Calendar className="w-3.5 h-3.5" />
            <span>APPOINTMENTS & OPERATIONS</span>
          </div>
          <h1 className="text-xl sm:text-3xl font-extrabold tracking-tight">Bookings Dashboard</h1>
          <p className="text-purple-100 text-xs sm:text-sm max-w-xl leading-relaxed">
            Inspect, filter, reschedule, and manage clinical consultation sessions across Hexpertify.
          </p>
        </div>

        <div className="relative z-10 flex flex-wrap items-center gap-2.5 sm:gap-3 shrink-0">
          {/* Total Sessions Metric Pill */}
          <div className="bg-white/10 backdrop-blur-md border border-white/15 rounded-2xl px-4 py-2.5 text-left min-w-[100px]">
            <span className="text-[10px] font-bold tracking-wider uppercase text-purple-200 block">TOTAL SESSIONS</span>
            <span className="text-xl font-extrabold text-white">{bookingsList.length}</span>
          </div>

          {/* Completed Sessions Metric Pill */}
          <div className="bg-white/10 backdrop-blur-md border border-white/15 rounded-2xl px-4 py-2.5 text-left min-w-[100px]">
            <span className="text-[10px] font-bold tracking-wider uppercase text-purple-200 block">COMPLETED</span>
            <span className="text-xl font-extrabold text-white">
              {bookingsList.filter((b) => (b.status || '').toLowerCase() === 'completed').length}
            </span>
          </div>

          {/* Export CSV Button */}
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-3.5 sm:px-4 py-2.5 bg-white/15 hover:bg-white/25 text-white font-bold text-xs rounded-xl sm:rounded-2xl border border-white/20 shadow-md transition-all active:scale-95 cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Export CSV</span>
          </button>

          {/* New Booking Button */}
          <button
            onClick={() => setIsNewBookingModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-white text-[#4f28d9] hover:bg-purple-50 font-extrabold text-xs rounded-xl sm:rounded-2xl shadow-lg transition-all active:scale-95 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>New Booking</span>
          </button>
        </div>
      </div>

      {/* Filter & Search Bar Strip */}
      <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-100 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Search Field */}
        <div className="relative flex-1 w-full max-w-xl">
          <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="Search booking code, client, therapist, or service..."
            className="w-full pl-11 pr-10 py-2.5 bg-slate-50 border border-slate-200/80 rounded-xl text-xs font-medium text-slate-800 outline-none focus:bg-white focus:border-[#5e2be2] focus:ring-2 focus:ring-[#5e2be2]/10 transition-all placeholder:text-slate-400"
          />
          {searchTerm && (
            <button
              onClick={() => {
                setSearchTerm('');
                setCurrentPage(1);
              }}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 rounded-md"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Status Filter & Export Button */}
        <div className="flex items-center gap-3 w-full md:w-auto justify-end">
          <div className="relative flex-1 sm:w-56">
            <Filter className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-10 pr-8 py-2.5 bg-slate-50 border border-slate-200/80 rounded-xl text-xs font-extrabold text-slate-800 outline-none focus:bg-white focus:border-[#5e2be2] focus:ring-2 focus:ring-[#5e2be2]/10 appearance-none cursor-pointer transition-all"
            >
              {['All', 'Scheduled', 'Completed', 'Rescheduled', 'Cancelled', 'No Show - Client', 'No Show - Consultant'].map((status) => {
                const count = getStatusCount(status);
                return (
                  <option key={status} value={status}>
                    {status === 'All' ? 'All Statuses' : status} ({count})
                  </option>
                );
              })}
            </select>
            <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 text-xs">
              ▼
            </div>
          </div>

          <button
            type="button"
            onClick={handleExportCSV}
            className="px-4 py-2.5 bg-slate-50 hover:bg-slate-100 text-slate-700 hover:text-slate-900 rounded-xl font-extrabold text-xs flex items-center gap-1.5 border border-slate-200/80 transition-all shadow-2xs shrink-0 whitespace-nowrap active:scale-95"
            title="Export current view to CSV file"
          >
            <Download className="w-3.5 h-3.5 text-[#5e2be2]" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Visually Appealing Reference Styled Table */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto w-full">
          <table className="w-full text-left border-collapse table-fixed">
            <thead>
              <tr className="bg-slate-50/70 border-b border-slate-100 text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">
                <th className="py-3.5 px-4 font-mono w-[14%]">
                  <span className="flex items-center gap-1.5 whitespace-nowrap">
                    <Hash className="w-3.5 h-3.5 text-purple-600" />
                    BOOKING ID
                  </span>
                </th>
                <th className="py-3.5 px-4 w-[18%]">
                  <span className="flex items-center gap-1.5 whitespace-nowrap">
                    <User className="w-3.5 h-3.5 text-slate-500" />
                    CLIENT
                  </span>
                </th>
                <th className="py-3.5 px-4 w-[18%]">
                  <span className="flex items-center gap-1.5 whitespace-nowrap">
                    <UserCheck className="w-3.5 h-3.5 text-slate-500" />
                    THERAPIST
                  </span>
                </th>
                <th className="py-3.5 px-4 w-[22%]">
                  <span className="flex items-center gap-1.5 whitespace-nowrap">
                    <CreditCard className="w-3.5 h-3.5 text-slate-500" />
                    SERVICE & FEE
                  </span>
                </th>
                <th className="py-3.5 px-4 w-[16%]">
                  <span className="flex items-center gap-1.5 whitespace-nowrap">
                    <Calendar className="w-3.5 h-3.5 text-slate-500" />
                    DATE & TIME SLOT
                  </span>
                </th>
                <th className="py-3.5 px-4 w-[12%]">
                  <span className="flex items-center gap-1.5 whitespace-nowrap">
                    <Activity className="w-3.5 h-3.5 text-slate-500" />
                    STATUS
                  </span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {paginatedBookings.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-16 text-center text-slate-400">
                    <div className="max-w-xs mx-auto space-y-2">
                      <Filter className="w-8 h-8 text-slate-300 mx-auto" />
                      <p className="font-semibold text-slate-600">No bookings match your current filter or search criteria.</p>
                      <button
                        onClick={() => {
                          setSearchTerm('');
                          setStatusFilter('All');
                          setCurrentPage(1);
                        }}
                        className="text-[#5e2be2] font-bold text-xs hover:underline"
                      >
                        Reset filters
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedBookings.map((b) => (
                  <tr
                    key={b.id}
                    onClick={() => handleOpenInspect(b, false)}
                    className="hover:bg-slate-50/60 transition-colors duration-150 group cursor-pointer"
                  >
                    {/* Booking Code Pill */}
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-1.5">
                        <span className="px-2.5 py-1 bg-[#f4f0ff] text-[#5e2be2] font-mono font-extrabold text-xs rounded-xl shadow-2xs inline-block whitespace-nowrap">
                          {b.bookingCode}
                        </span>
                        <button
                          type="button"
                          onClick={(e) => handleCopyCode(b.bookingCode, e)}
                          className="p-1 text-slate-400 hover:text-[#5e2be2] rounded-md transition-colors opacity-0 group-hover:opacity-100"
                          title="Copy Booking Code"
                        >
                          {copiedId === b.bookingCode ? (
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </td>

                    {/* Client Name & ID/Email */}
                    <td className="py-4 px-4">
                      <div className="truncate">
                        <p className="font-extrabold text-slate-900 group-hover:text-[#5e2be2] transition-colors leading-snug truncate">
                          {b.clientName}
                        </p>
                        <span className="text-[10px] text-slate-400 font-medium block mt-0.5 truncate">
                          {getClientIdentifier(b)}
                        </span>
                      </div>
                    </td>

                    {/* Therapist Name & Profession */}
                    <td className="py-4 px-4">
                      <div className="truncate">
                        <p className="font-extrabold text-slate-900 leading-snug truncate">{b.therapistName}</p>
                        <span className="text-[11px] text-slate-400 font-medium block mt-0.5 truncate">
                          {getTherapistProfession(b)}
                        </span>
                      </div>
                    </td>

                    {/* Service Requested & Fee Pill */}
                    <td className="py-4 px-4">
                      <div className="space-y-1">
                        <p className="font-extrabold text-slate-900 leading-tight truncate">{getBookingService(b)}</p>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-xs font-mono font-extrabold text-emerald-600">₹{b.amount.toLocaleString()}</span>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-md whitespace-nowrap ${
                              b.paymentStatus === 'Paid'
                                ? 'bg-emerald-100 text-emerald-800'
                                : b.paymentStatus === 'Refunded'
                                ? 'bg-rose-100 text-rose-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {b.paymentStatus}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Date & Time Slot */}
                    <td className="py-4 px-4">
                      <div className="space-y-1">
                        <p className="font-extrabold text-slate-800 flex items-center gap-1.5 text-xs whitespace-nowrap">
                          <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>{b.date}</span>
                        </p>
                        <p className="text-[10px] font-semibold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-md inline-flex items-center gap-1 whitespace-nowrap">
                          <Clock className="w-3 h-3 text-[#5e2be2]" />
                          <span>{b.time}</span>
                        </p>
                      </div>
                    </td>

                    {/* Status Pill Badge */}
                    <td className="py-4 px-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-1.5 text-xs px-3 py-1 rounded-full font-extrabold shadow-2xs ${
                          b.status === 'Completed'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'
                            : b.status === 'Scheduled'
                            ? 'bg-purple-50 text-[#5e2be2] border border-purple-200/60'
                            : b.status === 'Rescheduled'
                            ? 'bg-amber-50 text-amber-700 border border-amber-200/60'
                            : b.status === 'No Show - Client'
                            ? 'bg-rose-50 text-rose-700 border border-rose-200/60'
                            : b.status === 'No Show - Consultant'
                            ? 'bg-orange-50 text-orange-700 border border-orange-200/60'
                            : 'bg-slate-100 text-slate-700 border border-slate-200'
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            b.status === 'Completed'
                              ? 'bg-emerald-500'
                              : b.status === 'Scheduled'
                              ? 'bg-[#5e2be2]'
                              : b.status === 'Rescheduled'
                              ? 'bg-amber-500'
                              : b.status === 'No Show - Client'
                              ? 'bg-rose-500'
                              : b.status === 'No Show - Consultant'
                              ? 'bg-orange-500'
                              : 'bg-slate-500'
                          }`}
                        />
                        {b.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Table Footer Bar with Live 10 Per Page Pagination */}
        <div className="p-4 bg-slate-50/80 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500 font-semibold">
          <div>
            Showing <span className="font-extrabold text-slate-900">{filteredBookings.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1}</span> to{' '}
            <span className="font-extrabold text-slate-900">{Math.min(currentPage * PAGE_SIZE, filteredBookings.length)}</span> of{' '}
            <span className="font-extrabold text-slate-900">{filteredBookings.length}</span> total bookings
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-1.5 bg-white border border-slate-200 rounded-xl text-slate-600 hover:text-[#5e2be2] hover:border-purple-200 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-2xs"
              title="Previous Page"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-3 py-1 bg-white border border-slate-200 rounded-xl text-slate-800 font-extrabold text-xs shadow-2xs">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-1.5 bg-white border border-slate-200 rounded-xl text-slate-600 hover:text-[#5e2be2] hover:border-purple-200 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-2xs"
              title="Next Page"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Booking Details / Edit Modal */}
      {selectedBooking && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-xl bg-white rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-100 p-4 sm:p-6 space-y-4 sm:space-y-6 my-auto max-h-[94vh] sm:max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-2xl bg-purple-50 text-[#5e2be2] flex items-center justify-center font-extrabold border border-purple-100 shrink-0">
                  {isEditingSelectedBooking ? <Edit className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </div>
                <div>
                  <span className="text-[10px] font-extrabold text-[#5e2be2] uppercase tracking-wider block">
                    {isEditingSelectedBooking ? 'Editing Booking Details' : 'Booking Inspection'}
                  </span>
                  <h3 className="text-xl font-extrabold text-slate-900 leading-snug">{selectedBooking.bookingCode}</h3>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    if (!isEditingSelectedBooking) {
                      setEditBookingData({ ...selectedBooking });
                    }
                    setIsEditingSelectedBooking(!isEditingSelectedBooking);
                  }}
                  className={`px-3 py-1.5 rounded-xl font-extrabold text-xs flex items-center gap-1.5 transition-all shadow-2xs ${
                    isEditingSelectedBooking
                      ? 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200'
                      : 'bg-purple-50 text-[#5e2be2] hover:bg-purple-100 border border-purple-200/80'
                  }`}
                >
                  {isEditingSelectedBooking ? (
                    <>
                      <Eye className="w-3.5 h-3.5" />
                      <span>View Mode</span>
                    </>
                  ) : (
                    <>
                      <Edit className="w-3.5 h-3.5" />
                      <span>Edit Details</span>
                    </>
                  )}
                </button>
                <button
                  onClick={() => {
                    setSelectedBooking(null);
                    setIsEditingSelectedBooking(false);
                  }}
                  className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            {!isEditingSelectedBooking ? (
              /* VIEW MODE */
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 relative group">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Client Name</span>
                      <button
                        onClick={() => {
                          setEditBookingData({ ...selectedBooking });
                          setIsEditingSelectedBooking(true);
                        }}
                        className="text-xs text-[#5e2be2] font-extrabold opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1"
                      >
                        <Edit className="w-3 h-3" /> Edit
                      </button>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <span className="font-extrabold text-slate-900 text-sm">{selectedBooking.clientName}</span>
                    </div>
                  </div>

                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 relative group">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Assigned Therapist</span>
                      <button
                        onClick={() => {
                          setEditBookingData({ ...selectedBooking });
                          setIsEditingSelectedBooking(true);
                        }}
                        className="text-xs text-[#5e2be2] font-extrabold opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1"
                      >
                        <Edit className="w-3 h-3" /> Edit
                      </button>
                    </div>
                    <div className="flex flex-col">
                      <span className="font-extrabold text-slate-900 text-sm">{selectedBooking.therapistName}</span>
                      <span className="text-xs text-slate-500 font-medium mt-0.5">{getTherapistProfession(selectedBooking)}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-3 bg-purple-50/50 p-4 rounded-2xl border border-purple-100/80 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500 font-semibold">Service Requested:</span>
                    <span className="font-extrabold text-slate-900">{getBookingService(selectedBooking)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500 font-semibold">Session Date & Time:</span>
                    <div className="text-right">
                      <span className="font-extrabold text-slate-900 block">
                        {selectedBooking.date} ({selectedBooking.time})
                      </span>
                      {!canRescheduleBooking(selectedBooking) && selectedBooking.status === 'Scheduled' && (
                        <span className="text-[10px] text-amber-700 font-semibold bg-amber-50 px-2 py-0.5 rounded border border-amber-200 inline-block mt-0.5">
                          Reschedule locked (&lt; 3h remaining)
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500 font-semibold">Session Fee:</span>
                    <span className="font-extrabold text-emerald-600 text-sm">₹{selectedBooking.amount.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500 font-semibold">Payment Status:</span>
                    <span className={`font-extrabold px-2.5 py-0.5 rounded-md text-[11px] ${
                      selectedBooking.paymentStatus === 'Paid'
                        ? 'bg-emerald-100 text-emerald-800'
                        : selectedBooking.paymentStatus === 'Refunded'
                        ? 'bg-rose-100 text-rose-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}>
                      {selectedBooking.paymentStatus}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500 font-semibold">Booking Status:</span>
                    <span className={`font-extrabold px-2.5 py-0.5 rounded-md text-[11px] ${
                      selectedBooking.status === 'Completed'
                        ? 'bg-emerald-100 text-emerald-800'
                        : selectedBooking.status === 'Scheduled'
                        ? 'bg-purple-100 text-purple-800'
                        : selectedBooking.status === 'Rescheduled'
                        ? 'bg-amber-100 text-amber-800'
                        : selectedBooking.status === 'No Show - Client'
                        ? 'bg-rose-100 text-rose-800'
                        : selectedBooking.status === 'No Show - Consultant'
                        ? 'bg-orange-100 text-orange-800'
                        : 'bg-slate-100 text-slate-800'
                    }`}>
                      {selectedBooking.status}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              /* EDIT MODE FORM */
              <form id="edit-booking-form" onSubmit={handleSaveBookingEdit} className="space-y-3.5 text-xs">
                <div className="space-y-1">
                  <label className="font-extrabold text-slate-700">Client Name *</label>
                  <input
                    type="text"
                    required
                    value={editBookingData?.clientName || ''}
                    onChange={(e) => setEditBookingData((prev) => (prev ? { ...prev, clientName: e.target.value } : null))}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none font-semibold text-slate-800 focus:bg-white focus:border-[#5e2be2] focus:ring-2 focus:ring-[#5e2be2]/10 transition-all"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="font-extrabold text-slate-700">Assigned Therapist *</label>
                    <select
                      value={editBookingData?.therapistName || ''}
                      onChange={(e) => setEditBookingData((prev) => (prev ? { ...prev, therapistName: e.target.value } : null))}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none font-semibold text-slate-800 focus:bg-white focus:border-[#5e2be2] focus:ring-2 focus:ring-[#5e2be2]/10 transition-all"
                    >
                      {(therapists.length > 0 ? therapists : mockTherapists).map((t) => (
                        <option key={t.id} value={t.name}>
                          {t.name} ({t.profession || 'Specialist'})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="font-extrabold text-slate-700">Service Requested *</label>
                    <select
                      value={editBookingData?.service || ''}
                      onChange={(e) => setEditBookingData((prev) => (prev ? { ...prev, service: e.target.value } : null))}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none font-semibold text-slate-800 focus:bg-white focus:border-[#5e2be2] focus:ring-2 focus:ring-[#5e2be2]/10 transition-all"
                    >
                      {mockProfessions.map((p) => (
                        <option key={p.id} value={p.serviceName}>
                          {p.serviceName}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="font-extrabold text-slate-700">Session Date *</label>
                    <input
                      type="date"
                      required
                      value={editBookingData?.date || ''}
                      onChange={(e) => setEditBookingData((prev) => (prev ? { ...prev, date: e.target.value } : null))}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none font-semibold text-slate-800 focus:bg-white focus:border-[#5e2be2] focus:ring-2 focus:ring-[#5e2be2]/10 transition-all"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-extrabold text-slate-700">Time Slot *</label>
                    <select
                      value={editBookingData?.time || ''}
                      onChange={(e) => setEditBookingData((prev) => (prev ? { ...prev, time: e.target.value } : null))}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none font-semibold text-slate-800 focus:bg-white focus:border-[#5e2be2] focus:ring-2 focus:ring-[#5e2be2]/10 transition-all"
                    >
                      <option value="09:00 AM - 10:00 AM">09:00 AM - 10:00 AM</option>
                      <option value="10:30 AM - 11:30 AM">10:30 AM - 11:30 AM</option>
                      <option value="01:00 PM - 02:00 PM">01:00 PM - 02:00 PM</option>
                      <option value="02:00 PM">02:00 PM</option>
                      <option value="03:00 PM - 04:00 PM">03:00 PM - 04:00 PM</option>
                      <option value="05:00 PM - 06:00 PM">05:00 PM - 06:00 PM</option>
                      <option value="07:00 PM - 08:00 PM">07:00 PM - 08:00 PM</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className="font-extrabold text-slate-700">Fee (₹) *</label>
                    <input
                      type="number"
                      required
                      value={editBookingData?.amount || 0}
                      onChange={(e) => setEditBookingData((prev) => (prev ? { ...prev, amount: Number(e.target.value) } : null))}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none font-mono font-semibold text-slate-800 focus:bg-white focus:border-[#5e2be2] focus:ring-2 focus:ring-[#5e2be2]/10 transition-all"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-extrabold text-slate-700">Payment Status</label>
                    <select
                      value={editBookingData?.paymentStatus || 'Paid'}
                      onChange={(e) => setEditBookingData((prev) => (prev ? { ...prev, paymentStatus: e.target.value as any } : null))}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none font-semibold text-slate-800 focus:bg-white focus:border-[#5e2be2] focus:ring-2 focus:ring-[#5e2be2]/10 transition-all"
                    >
                      <option value="Paid">Paid</option>
                      <option value="Pending Payout">Pending Payout</option>
                      <option value="Refunded">Refunded</option>
                      <option value="Unpaid">Unpaid</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="font-extrabold text-slate-700">Booking Status</label>
                    <select
                      value={editBookingData?.status || 'Scheduled'}
                      onChange={(e) => setEditBookingData((prev) => (prev ? { ...prev, status: e.target.value as any } : null))}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none font-semibold text-slate-800 focus:bg-white focus:border-[#5e2be2] focus:ring-2 focus:ring-[#5e2be2]/10 transition-all"
                    >
                      <option value="Scheduled">Scheduled</option>
                      <option value="Completed">Completed</option>
                      <option value="Rescheduled">Rescheduled</option>
                      <option value="Cancelled">Cancelled</option>
                      <option value="No Show - Client">No Show - Client</option>
                      <option value="No Show - Consultant">No Show - Consultant</option>
                    </select>
                  </div>
                </div>
              </form>
            )}

            {/* Modal Footer */}
            {!isEditingSelectedBooking ? (
              <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-100">
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setEditBookingData({ ...selectedBooking });
                      setIsEditingSelectedBooking(true);
                    }}
                    className="px-3.5 py-2 rounded-xl font-extrabold text-xs transition-all flex items-center gap-1.5 bg-purple-50 hover:bg-[#5e2be2] hover:text-white text-[#5e2be2] border border-purple-200/80 shadow-2xs active:scale-95"
                  >
                    <Edit className="w-3.5 h-3.5" />
                    <span>Edit Booking</span>
                  </button>
                  {canRescheduleBooking(selectedBooking) && (
                    <button
                      onClick={() => handleOpenReschedule(selectedBooking)}
                      className={`px-3.5 py-2 rounded-xl font-extrabold text-xs transition-all flex items-center gap-1.5 ${
                        selectedBooking.status === 'Rescheduled'
                          ? 'bg-amber-100 text-amber-800 border border-amber-300'
                          : 'bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200'
                      }`}
                    >
                      <Clock className="w-3.5 h-3.5" />
                      <span>Reschedule</span>
                    </button>
                  )}
                  <button
                    onClick={() => handleOpenCancel(selectedBooking)}
                    className={`px-3.5 py-2 rounded-xl font-extrabold text-xs transition-all flex items-center gap-1.5 ${
                      selectedBooking.status === 'Cancelled'
                        ? 'bg-red-100 text-red-800 border border-red-300'
                        : 'bg-red-50 hover:bg-red-100 text-red-600 border border-red-200'
                    }`}
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    <span>Cancel</span>
                  </button>
                  <button
                    onClick={() => setDeletingBookingTarget(selectedBooking)}
                    className="px-3.5 py-2 rounded-xl font-extrabold text-xs transition-all flex items-center gap-1.5 bg-rose-50 hover:bg-rose-600 hover:text-white text-rose-600 border border-rose-200 shadow-2xs active:scale-95"
                    title="Delete booking permanently"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete Booking</span>
                  </button>
                </div>
                <button
                  onClick={() => setSelectedBooking(null)}
                  className="px-5 py-2 bg-[#5e2be2] hover:bg-[#4f28d9] text-white rounded-xl font-bold text-xs shadow-md"
                >
                  Close
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setIsEditingSelectedBooking(false);
                    setEditBookingData(selectedBooking);
                  }}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-extrabold text-xs transition-all"
                >
                  Cancel Edit
                </button>
                <button
                  type="submit"
                  form="edit-booking-form"
                  className="px-6 py-2 bg-[#5e2be2] hover:bg-[#4f28d9] text-white rounded-xl font-extrabold text-xs shadow-md shadow-[#5e2be2]/20 transition-all active:scale-95 flex items-center gap-1.5"
                >
                  <Save className="w-4 h-4" />
                  <span>Save Changes</span>
                </button>
              </div>
            )}
          </div>
        </div>,
        document.body
      )}

      {/* INTERACTIVE RESCHEDULE MODAL */}
      {rescheduleBooking && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-md bg-white rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-100 p-4 sm:p-6 space-y-4 sm:space-y-6 my-auto max-h-[94vh] sm:max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2 text-amber-600">
                <Clock className="w-5 h-5" />
                <h3 className="text-lg font-extrabold text-slate-900">Reschedule Session</h3>
              </div>
              <button
                onClick={() => setRescheduleBooking(null)}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-xl"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-amber-50/70 p-4 rounded-2xl border border-amber-100 text-xs space-y-1">
              <p className="font-extrabold text-amber-900">{rescheduleBooking.bookingCode} · {rescheduleBooking.clientName}</p>
              <p className="text-slate-600 font-medium">Therapist: {rescheduleBooking.therapistName}</p>
              <p className="text-slate-500 text-[11px]">Current: {rescheduleBooking.date} ({rescheduleBooking.time})</p>
            </div>

            <form onSubmit={handleConfirmReschedule} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-extrabold text-slate-700 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-amber-600" />
                  New Session Date *
                </label>
                <input
                  type="date"
                  required
                  value={newDate}
                  onChange={(e) => setNewDate(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold outline-none focus:border-amber-500 focus:bg-white"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-extrabold text-slate-700">New Time Slot *</label>
                <select
                  value={newTime}
                  onChange={(e) => setNewTime(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold outline-none focus:border-amber-500 focus:bg-white"
                >
                  <option value="09:00 AM">09:00 AM</option>
                  <option value="10:30 AM">10:30 AM</option>
                  <option value="01:00 PM">01:00 PM</option>
                  <option value="02:00 PM">02:00 PM</option>
                  <option value="04:00 PM">04:00 PM</option>
                  <option value="06:00 PM">06:00 PM</option>
                  <option value="07:30 PM">07:30 PM</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-extrabold text-slate-700">Reason for Reschedule</label>
                <textarea
                  rows={2}
                  placeholder="e.g., Client requested change due to work schedule..."
                  value={rescheduleReason}
                  onChange={(e) => setRescheduleReason(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium outline-none focus:border-amber-500 focus:bg-white resize-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setRescheduleBooking(null)}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-extrabold text-xs shadow-md shadow-amber-600/30"
                >
                  Confirm Reschedule
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* INTERACTIVE CANCEL MODAL */}
      {cancelBookingTarget && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-md bg-white rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-100 p-4 sm:p-6 space-y-4 sm:space-y-6 my-auto max-h-[94vh] sm:max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2 text-rose-600">
                <XCircle className="w-5 h-5" />
                <h3 className="text-lg font-extrabold text-slate-900">Cancel Booking</h3>
              </div>
              <button
                onClick={() => setCancelBookingTarget(null)}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-xl"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-rose-50/70 p-4 rounded-2xl border border-rose-100 text-xs space-y-1">
              <p className="font-extrabold text-rose-900">{cancelBookingTarget.bookingCode} · {cancelBookingTarget.clientName}</p>
              <p className="text-slate-600 font-medium">Therapist: {cancelBookingTarget.therapistName}</p>
              <p className="text-slate-500 text-[11px]">Fee Amount: ₹{cancelBookingTarget.amount}</p>
            </div>

            <form onSubmit={handleConfirmCancel} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-extrabold text-slate-700">Cancellation Reason *</label>
                <select
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold outline-none focus:border-rose-500 focus:bg-white"
                >
                  <option value="Client Request">Client Request (Personal Reasons)</option>
                  <option value="Therapist Emergency">Therapist Emergency / Unavailable</option>
                  <option value="Technical Issue">Technical / Connection Issue</option>
                  <option value="Duplicate Booking">Duplicate / Erroneous Booking</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-extrabold text-slate-700">Refund Processing</label>
                <select
                  value={refundOption}
                  onChange={(e) => setRefundOption(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold outline-none focus:border-rose-500 focus:bg-white"
                >
                  <option value={`Full Refund (₹${cancelBookingTarget.amount})`}>
                    Full Refund (₹{cancelBookingTarget.amount}) - Original Payment Method
                  </option>
                  <option value="Platform Wallet Credit">Platform Wallet Credit</option>
                  <option value="No Refund (Policy Violation)">No Refund (Less than 2 hrs notice)</option>
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setCancelBookingTarget(null)}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
                >
                  Keep Booking
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-extrabold text-xs shadow-md shadow-rose-600/30"
                >
                  Confirm Cancellation
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* INTERACTIVE DELETE BOOKING CONFIRMATION MODAL */}
      {deletingBookingTarget && createPortal(
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-3 sm:p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-6 max-w-md w-full shadow-2xl border border-slate-200 space-y-4 my-auto animate-in fade-in zoom-in-95">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h4 className="text-lg font-extrabold text-slate-900">Delete Booking Record?</h4>
              <p className="text-xs text-slate-500 leading-relaxed">
                Are you sure you want to delete booking <span className="font-mono font-bold text-slate-800">{deletingBookingTarget.bookingCode}</span> ({deletingBookingTarget.clientName})? This action will permanently purge it from super admin records.
              </p>
            </div>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeletingBookingTarget(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleConfirmDeleteBooking(deletingBookingTarget.id)}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs rounded-xl shadow-md"
              >
                Confirm Permanent Delete
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ── NEW MANUAL BOOKING MODAL ────────────────────────────────────── */}
      {isNewBookingModalOpen && createPortal(
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-3 sm:p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl sm:rounded-3xl max-w-lg w-full shadow-2xl border border-slate-100 overflow-hidden my-auto max-h-[94vh] sm:max-h-[90vh] flex flex-col animate-in fade-in zoom-in-95">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-[#4f28d9] to-[#5e2be2] p-4 sm:p-5 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-white/15 backdrop-blur-md flex items-center justify-center text-white border border-white/20">
                  <Plus className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-extrabold text-sm sm:text-base">Add New Booking</h4>
                  <p className="text-[10px] text-purple-200">Schedule a new consultation session</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsNewBookingModalOpen(false)}
                className="p-1 text-purple-200 hover:text-white rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body Form */}
            <form onSubmit={handleCreateManualBooking} className="p-4 sm:p-6 space-y-3 sm:space-y-4 text-xs overflow-y-auto flex-1">
              <div className="space-y-1.5">
                <label className="font-extrabold text-slate-700 block">Client Name *</label>
                <input
                  type="text"
                  list="clients-datalist"
                  required
                  placeholder="e.g. Rahul Verma or search client"
                  value={newBooking.clientName}
                  onChange={(e) => setNewBooking({ ...newBooking, clientName: e.target.value })}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-semibold text-slate-800 focus:bg-white focus:border-[#5e2be2] transition-all"
                />
                <datalist id="clients-datalist">
                  {clients.map((c) => (
                    <option key={c.id} value={c.name}>
                      {c.name} ({c.email})
                    </option>
                  ))}
                </datalist>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div className="space-y-1.5">
                  <label className="font-extrabold text-slate-700 block">Assigned Therapist *</label>
                  <select
                    value={newBooking.therapistName}
                    onChange={(e) => {
                      const tName = e.target.value;
                      const selected = therapists.find((t) => t.name === tName);
                      setNewBooking({
                        ...newBooking,
                        therapistName: tName,
                        amount: selected?.platformFeePerSession || newBooking.amount
                      });
                    }}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-semibold text-slate-800 focus:bg-white focus:border-[#5e2be2] transition-all"
                  >
                    {therapists.map((t) => (
                      <option key={t.id} value={t.name}>
                        {t.name} ({t.profession || 'Specialist'})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="font-extrabold text-slate-700 block">Service Type *</label>
                  <select
                    value={newBooking.service}
                    onChange={(e) => {
                      const sName = e.target.value;
                      const selectedProf = professionsList.find((p) => p.serviceName === sName);
                      setNewBooking({
                        ...newBooking,
                        service: sName,
                        amount: (selectedProf as any)?.price || newBooking.amount
                      });
                    }}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-semibold text-slate-800 focus:bg-white focus:border-[#5e2be2] transition-all"
                  >
                    {(professionsList.length > 0 ? professionsList : mockProfessions).map((p: any) => (
                      <option key={p.id || p.serviceName} value={p.serviceName}>
                        {p.serviceName}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div className="space-y-1.5">
                  <label className="font-extrabold text-slate-700 block">Session Date *</label>
                  <input
                    type="date"
                    required
                    value={newBooking.date}
                    onChange={(e) => setNewBooking({ ...newBooking, date: e.target.value })}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-semibold text-slate-800 focus:bg-white focus:border-[#5e2be2] transition-all"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-extrabold text-slate-700 block">Time Slot *</label>
                  <select
                    value={newBooking.time}
                    onChange={(e) => setNewBooking({ ...newBooking, time: e.target.value })}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-semibold text-slate-800 focus:bg-white focus:border-[#5e2be2] transition-all"
                  >
                    <option value="09:00 AM - 10:00 AM">09:00 AM - 10:00 AM</option>
                    <option value="10:30 AM - 11:30 AM">10:30 AM - 11:30 AM</option>
                    <option value="01:00 PM - 02:00 PM">01:00 PM - 02:00 PM</option>
                    <option value="03:00 PM - 04:00 PM">03:00 PM - 04:00 PM</option>
                    <option value="05:00 PM - 06:00 PM">05:00 PM - 06:00 PM</option>
                    <option value="07:00 PM - 08:00 PM">07:00 PM - 08:00 PM</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                <div className="space-y-1.5">
                  <label className="font-extrabold text-slate-700 block">Session Fee (₹) *</label>
                  <input
                    type="number"
                    required
                    value={newBooking.amount}
                    onChange={(e) => setNewBooking({ ...newBooking, amount: Number(e.target.value) })}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-mono font-semibold text-slate-800 focus:bg-white focus:border-[#5e2be2] transition-all"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-extrabold text-slate-700 block">Payment Status</label>
                  <select
                    value={newBooking.paymentStatus}
                    onChange={(e) => setNewBooking({ ...newBooking, paymentStatus: e.target.value })}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-semibold text-slate-800 focus:bg-white focus:border-[#5e2be2] transition-all"
                  >
                    <option value="Paid">Paid</option>
                    <option value="Pending Payout">Pending Payout</option>
                    <option value="Unpaid">Unpaid</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="font-extrabold text-slate-700 block">Initial Status</label>
                  <select
                    value={newBooking.status}
                    onChange={(e) => setNewBooking({ ...newBooking, status: e.target.value })}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-semibold text-slate-800 focus:bg-white focus:border-[#5e2be2] transition-all"
                  >
                    <option value="Scheduled">Scheduled</option>
                    <option value="Completed">Completed</option>
                    <option value="Rescheduled">Rescheduled</option>
                    <option value="Cancelled">Cancelled</option>
                    <option value="No Show - Client">No Show - Client</option>
                    <option value="No Show - Consultant">No Show - Consultant</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsNewBookingModalOpen(false)}
                  className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-extrabold transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-[#5e2be2] hover:bg-[#4f28d9] text-white rounded-xl font-extrabold shadow-md shadow-[#5e2be2]/20 transition-all active:scale-95 flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  <span>Create Booking</span>
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default BookingsView;
