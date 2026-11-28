import React, { useState } from 'react';
import { api } from '../lib/apiClient';
import { refundPayment } from '../lib/paymentsApi';
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
  Trash2,
  Plus,
  Download,
  Edit,
  Save
} from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { useUrlSearch } from '../lib/global-search';
import type { Booking } from '../types';

/** Display labels → the canonical statuses the Backend stores */
const STATUS_TO_CANONICAL: Record<string, string> = {
  Scheduled: 'CONFIRMED',
  Upcoming: 'CONFIRMED',
  Completed: 'COMPLETED',
  Cancelled: 'CANCELLED',
  Rescheduled: 'RESCHEDULED',
  'No Show - Client': 'NO_SHOW_CLIENT',
  'No Show - Consultant': 'NO_SHOW_CONSULTANT',
  Pending: 'PENDING',
  'Pending Payment': 'PENDING_PAYMENT',
  Expired: 'EXPIRED'
};

const PAYMENT_TO_CANONICAL: Record<string, string> = {
  Paid: 'PAID',
  // The client paid; only the therapist payout is outstanding
  'Pending Payout': 'PAID',
  Unpaid: 'UNPAID',
  Refunded: 'REFUNDED',
  Pending: 'PENDING',
  Failed: 'FAILED',
  'Refund Pending': 'REFUND_PENDING',
  'Partially Refunded': 'PARTIALLY_REFUNDED'
};

const toCanonical = (map: Record<string, string>, label: string): string =>
  map[label] || String(label || '').trim().toUpperCase().replace(/[^A-Z0-9]+/g, '_');

const isDateLabel = (value?: string): boolean => /^\d{4}-\d{2}-\d{2}$/.test(value || '');

/** The session date/time as stored, or '' for website bookings that are not scheduled yet */
const scheduledDateOf = (b: Booking): string => (b.toBeScheduled || !isDateLabel(b.date) ? '' : b.date);
const scheduledTimeOf = (b: Booking): string => (b.toBeScheduled ? '' : b.time || '');

type TherapistDaySlot = { time: string; startAt: string; available: boolean };

/** Start of a session in ms from its India-time labels ("2026-11-24", "09:00 AM - 10:00 AM"); null if unreadable */
const sessionStartMs = (date: string, time: string): number | null => {
  const m = String(time || '').split(/\s+-\s+/)[0].trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!isDateLabel(date) || !m) return null;
  let hours = Number(m[1]) % 12;
  if (m[3].toUpperCase() === 'PM') hours += 12;
  return new Date(`${date}T${String(hours).padStart(2, '0')}:${m[2]}:00+05:30`).getTime();
};

/**
 * Time slots from the therapist's own availability on the chosen day (GET /api/admin/availability/slots).
 * Free slots can be picked; booked/blocked ones are shown greyed out. Past slots stay pickable so an admin
 * can record a session that already happened. `keepValue` (the booking's current time) is always listed.
 */
const TherapistSlotSelect: React.FC<{
  therapistId?: string;
  date: string;
  value: string;
  onChange: (time: string) => void;
  className: string;
  keepValue?: string;
  /** Pick the first free slot when the current value is not one of the therapist's free slots */
  autoSelect?: boolean;
  unscheduledOption?: boolean;
  required?: boolean;
}> = ({ therapistId, date, value, onChange, className, keepValue, autoSelect, unscheduledOption, required = true }) => {
  const [slots, setSlots] = useState<TherapistDaySlot[] | null>(null);
  const [loading, setLoading] = useState(false);

  React.useEffect(() => {
    if (!therapistId || !isDateLabel(date)) {
      setSlots(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    api
      .get<any>(`/api/admin/availability/slots?consultantId=${encodeURIComponent(therapistId)}&date=${date}`)
      .then((data) => { if (!cancelled) setSlots(Array.isArray(data?.slots) ? data.slots : []); })
      .catch(() => { if (!cancelled) setSlots([]); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [therapistId, date]);

  const now = Date.now();
  const isPast = (s: TherapistDaySlot) => new Date(s.startAt).getTime() <= now;
  const pickable = (s: TherapistDaySlot) => s.available || isPast(s);

  React.useEffect(() => {
    if (!autoSelect || loading || !slots) return;
    if (value && (value === keepValue || slots.some((s) => s.time === value && pickable(s)))) return;
    const first = slots.find((s) => s.available) || slots.find(pickable);
    if ((first?.time || '') !== value) onChange(first?.time || '');
  }, [slots, loading]);

  const extra = keepValue && !(slots || []).some((s) => s.time === keepValue) ? keepValue : '';

  return (
    <select required={required} value={value} onChange={(e) => onChange(e.target.value)} className={className}>
      {unscheduledOption && <option value="" disabled>To be scheduled</option>}
      {!therapistId || !isDateLabel(date) ? (
        <option value="" disabled>Choose a therapist and date first</option>
      ) : loading ? (
        <option value={value}>Loading slots…</option>
      ) : (
        <>
          {extra && <option value={extra}>{extra} (current)</option>}
          {(slots || []).length === 0 && !extra && (
            <option value="" disabled>Therapist is not available on this day</option>
          )}
          {(slots || []).map((s) => (
            <option key={s.startAt} value={s.time} disabled={!pickable(s)}>
              {s.time}{s.available ? '' : isPast(s) ? ' (past)' : ' (booked)'}
            </option>
          ))}
        </>
      )}
    </select>
  );
};

export const BookingsView: React.FC = () => {
  const { bookings, therapists, clients, refreshAllData } = useAppContext();
  const [bookingsList, setBookingsList] = useState<Booking[]>(bookings);
  const [searchTerm, setSearchTerm] = useState('');
  // Opened from the admin search (e.g. ?q=CL-00001): filter to that record
  useUrlSearch(setSearchTerm);
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [isEditingSelectedBooking, setIsEditingSelectedBooking] = useState(false);
  const [editBookingData, setEditBookingData] = useState<Booking | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  /** The services (plans) a therapist currently offers; the API already leaves out removed plans */
  const servicesOf = (therapistName: string) => {
    const t = therapists.find((x) => x.name === therapistName);
    return (t?.services || []).filter((s) => s?.serviceName && Number(s.sessionFee) > 0);
  };
  /** A therapist's id from their name (the booking forms select therapists by name) */
  const therapistIdOf = (therapistName?: string, fallbackId?: string) =>
    therapists.find((x) => x.name === therapistName)?.id || fallbackId;
  /** First offered service of a therapist, as the booking form's service + fee */
  const firstServiceOf = (therapistName: string) => {
    const s = servicesOf(therapistName)[0];
    return { service: s?.serviceName || '', amount: Number(s?.sessionFee) || 0 };
  };

  // The server's list is the truth, also when it becomes empty (the last booking removed elsewhere)
  React.useEffect(() => {
    setBookingsList(Array.isArray(bookings) ? bookings : []);
  }, [bookings]);

  /** The therapist's profession from live data only: the booking itself, else the therapist with that id or exact name */
  const getTherapistProfession = (booking: Booking): string => {
    if (booking.therapistProfession) return booking.therapistProfession;
    const byId = booking.consultantId ? therapists.find((t) => t.id === booking.consultantId) : undefined;
    if (byId) return byId.profession || 'Consultant';
    const cleanName = (booking.therapistName || '').trim().toLowerCase();
    const sameName = cleanName ? therapists.filter((t) => t.name.trim().toLowerCase() === cleanName) : [];
    // Two therapists with the same name: don't guess
    return sameName.length === 1 && sameName[0].profession ? sameName[0].profession : 'Consultant';
  };

  const getBookingService = (booking: Booking): string => {
    if (booking.service && booking.service !== 'Mental Health Counsellor' && booking.service.trim()) {
      return booking.service;
    }
    return '1-on-1 Consultation';
  };

  /** The booking's own client email, else the client account it belongs to (by id): email or real client number */
  const getClientIdentifier = (booking: Booking): string => {
    if (booking.clientEmail) return booking.clientEmail;
    const clientId = booking.clientId || (booking as any).userId;
    const match = clientId ? clients.find((c) => c.id === clientId) : undefined;
    if (match?.email) return match.email;
    if (match?.clientNumber) return match.clientNumber;
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
  const [refundOption, setRefundOption] = useState('no-refund');

  const [isCancelling, setIsCancelling] = useState(false);

  // Delete Modal state
  const [deletingBookingTarget, setDeletingBookingTarget] = useState<Booking | null>(null);
  const [isCreatingBooking, setIsCreatingBooking] = useState(false);

  // New Manual Booking state
  const [isNewBookingModalOpen, setIsNewBookingModalOpen] = useState(false);
  const [newBooking, setNewBooking] = useState({
    clientName: '',
    clientAvatar: '',
    therapistName: '',
    service: '',
    date: new Date().toISOString().split('T')[0],
    time: '09:00 AM - 10:00 AM',
    // 0 = no fee typed: the Backend uses the service price
    amount: 0,
    paymentStatus: 'Paid',
    status: 'Scheduled'
  });

  /** New booking's status, from its slot: Completed once the session time has passed, else Scheduled */
  const newBookingStart = sessionStartMs(newBooking.date, newBooking.time);
  const newBookingStatus = newBookingStart !== null && newBookingStart <= Date.now() ? 'Completed' : 'Scheduled';

  React.useEffect(() => {
    if (!newBooking.therapistName && therapists.length > 0) {
      setNewBooking((prev) => ({
        ...prev,
        therapistName: therapists[0].name,
        ...firstServiceOf(therapists[0].name)
      }));
    }
  }, [therapists]);

  // Toast Notification state
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'warning' } | null>(null);

  // A newer message restarts the timer, so an older one's timer never hides it early
  const toastTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const showToast = (text: string, type: 'success' | 'warning' = 'success') => {
    setToastMessage({ text, type });
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToastMessage(null), type === 'warning' ? 8000 : 4000);
  };

  const handleOpenInspect = (booking: Booking, startEditing = false) => {
    setSelectedBooking(booking);
    setEditBookingData({ ...booking });
    setIsEditingSelectedBooking(startEditing);
  };

  const handleSaveBookingEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editBookingData) return;
    const original = bookingsList.find((b) => b.id === editBookingData.id) || selectedBooking;
    if (!original) return;

    // Only canonical, changed fields: display values (codes, avatars, labels) are never written back
    const changes: Record<string, unknown> = {};
    if (editBookingData.clientName.trim() && editBookingData.clientName.trim() !== original.clientName) {
      changes.clientName = editBookingData.clientName.trim();
    }
    if (editBookingData.therapistName !== original.therapistName) {
      const therapist = therapists.find((t) => t.name === editBookingData.therapistName);
      if (!therapist) {
        showToast('Pick a therapist from the consultant list', 'warning');
        return;
      }
      changes.consultantId = therapist.id;
      changes.consultantName = therapist.name;
    }
    if (editBookingData.service && editBookingData.service !== original.service) {
      changes.serviceTitle = editBookingData.service;
    }
    const newDateValue = scheduledDateOf(editBookingData);
    const newTimeValue = scheduledTimeOf(editBookingData);
    if (newDateValue && newDateValue !== scheduledDateOf(original)) changes.date = newDateValue;
    if (newTimeValue && newTimeValue !== scheduledTimeOf(original)) changes.time = newTimeValue;
    if ((changes.date || changes.time) && (!newDateValue || !newTimeValue)) {
      showToast('Pick both a session date and a time slot', 'warning');
      return;
    }
    const amount = Number(editBookingData.amount);
    if (Number.isFinite(amount) && amount >= 0 && amount !== Number(original.amount)) changes.amount = amount;
    if (editBookingData.paymentStatus !== original.paymentStatus) {
      changes.paymentStatus = toCanonical(PAYMENT_TO_CANONICAL, editBookingData.paymentStatus);
    }
    if (editBookingData.status !== original.status) {
      changes.status = toCanonical(STATUS_TO_CANONICAL, editBookingData.status);
    }

    if (Object.keys(changes).length === 0) {
      setIsEditingSelectedBooking(false);
      showToast('No changes to save', 'warning');
      return;
    }

    try {
      await api.put(`/api/admin/bookings/${editBookingData.id}`, changes);

      const saved: Booking = {
        ...editBookingData,
        toBeScheduled: original.toBeScheduled && !(changes.date && changes.time)
      };
      setBookingsList((prev) =>
        prev.map((b) => (b.id === editBookingData.id ? saved : b))
      );
      setSelectedBooking(saved);
      setIsEditingSelectedBooking(false);
      showToast(`Booking ${editBookingData.bookingCode} updated successfully in database!`, 'success');

      await refreshAllData();
    } catch (err) {
      console.error('Error saving booking edit to DB:', err);
      showToast('Failed to save booking changes to database', 'warning');
    }
  };

  const handleCopyCode = (code: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(code);
    setCopiedId(code);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const canRescheduleBooking = (booking: Booking | null): boolean => {
    if (!booking) return false;
    // Website bookings are paid first; scheduling them is always allowed
    if (booking.toBeScheduled) return true;
    // Session labels are India time, so the start is computed in IST whatever the admin's own timezone is
    const startMs = sessionStartMs(booking.date, booking.time);
    if (startMs === null) return false;
    return (startMs - Date.now()) / (1000 * 60 * 60) >= 3;
  };

  const handleOpenReschedule = (booking: Booking, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!canRescheduleBooking(booking)) {
      showToast('Reschedule unavailable: Session starts in less than 3 hours.', 'warning');
      return;
    }
    setRescheduleBooking(booking);
    setNewDate(scheduledDateOf(booking) || new Date().toISOString().split('T')[0]);
    setNewTime(scheduledTimeOf(booking) || '02:00 PM');
    setRescheduleReason('');
  };

  const handleConfirmReschedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rescheduleBooking) return;

    // A website booking getting its first slot is scheduled, not rescheduled
    const firstSchedule = Boolean(rescheduleBooking.toBeScheduled);
    const updatedBooking: Booking = {
      ...rescheduleBooking,
      date: newDate,
      time: newTime,
      toBeScheduled: false,
      status: firstSchedule ? rescheduleBooking.status : ('Rescheduled' as const)
    };

    try {
      // The Backend computes the session instant (India time) from the date and time slot
      await api.put(`/api/admin/bookings/${rescheduleBooking.id}`, {
        date: newDate,
        time: newTime,
        ...(firstSchedule ? {} : { status: 'RESCHEDULED' }),
        // Kept on the booking with the new time
        ...(rescheduleReason.trim() ? { rescheduleReason: rescheduleReason.trim() } : {})
      });

      setBookingsList((prev) =>
        prev.map((b) => (b.id === rescheduleBooking.id ? updatedBooking : b))
      );

      if (selectedBooking && selectedBooking.id === rescheduleBooking.id) {
        setSelectedBooking(updatedBooking);
      }

      showToast(`Booking ${rescheduleBooking.bookingCode} successfully rescheduled to ${newDate} at ${newTime}!`, 'success');
      setRescheduleBooking(null);

      await refreshAllData();
    } catch (err: any) {
      console.error('Error rescheduling booking in DB:', err);
      showToast(`Booking not rescheduled: ${err?.message || 'the server could not save it'}`, 'warning');
    }
  };

  /** Paid online and still holding money: refunds go back through the payment gateway */
  const isGatewayRefundable = (b: Booking) =>
    Boolean(b.paymentId) && ['Paid', 'Partially Refunded', 'Refund Pending'].includes(b.paymentStatus);
  /** Recorded as paid by an admin (no gateway payment): a refund is made outside Hexpertify and only recorded here */
  const isManuallyPaid = (b: Booking) => !b.paymentId && ['Paid', 'Pending Payout', 'Partially Refunded'].includes(b.paymentStatus);

  const handleOpenCancel = (booking: Booking, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setCancelBookingTarget(booking);
    setCancelReason('Client Request');
    setRefundOption(isGatewayRefundable(booking) ? 'gateway-refund' : isManuallyPaid(booking) ? 'record-refund' : 'no-refund');
  };

  /**
   * Cancels first, then refunds: a failed cancel never leaves money returned for a session that still stands,
   * and a failed refund leaves a cancelled booking whose refund can be retried from Transactions. The toast
   * says exactly which steps went through.
   */
  const handleConfirmCancel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cancelBookingTarget || isCancelling) return;
    const target = cancelBookingTarget;
    const gatewayRefund = refundOption === 'gateway-refund' && isGatewayRefundable(target);
    const recordRefund = refundOption === 'record-refund' && isManuallyPaid(target);

    setIsCancelling(true);
    // 1. Cancel the booking (sends the usual cancellation emails)
    try {
      await api.put(`/api/admin/bookings/${target.id}`, {
        status: 'CANCELLED',
        ...(recordRefund ? { paymentStatus: 'REFUNDED' } : {}),
        cancelReason
      });
    } catch (err: any) {
      console.error('Error cancelling booking in DB:', err);
      showToast(`Booking not cancelled: ${err?.message || 'the server could not save it'}. No refund was made.`, 'warning');
      setIsCancelling(false);
      return;
    }

    // 2. Refund through the gateway, only once the cancellation is saved
    let refundNote = recordRefund ? ' Marked as refunded (make the refund to the client yourself).' : '';
    let refundFailed = false;
    if (gatewayRefund) {
      try {
        await refundPayment(target.paymentId as string, { reason: `Booking cancelled: ${cancelReason}` });
        refundNote = ' Refund of the remaining amount sent to the payment gateway (Refund Pending).';
      } catch (err: any) {
        refundFailed = true;
        refundNote = ` The booking IS cancelled, but the refund FAILED: ${err?.message || 'gateway error'}. Retry it from Transactions.`;
      }
    }

    const cancelledBooking: Booking = {
      ...target,
      status: 'Cancelled',
      paymentStatus: recordRefund ? 'Refunded' : gatewayRefund && !refundFailed ? 'Refund Pending' : target.paymentStatus
    };
    setBookingsList((prev) => prev.map((b) => (b.id === target.id ? cancelledBooking : b)));
    if (selectedBooking && selectedBooking.id === target.id) setSelectedBooking(cancelledBooking);
    showToast(`Booking ${target.bookingCode} cancelled (${cancelReason}).${refundNote}`, refundFailed ? 'warning' : 'success');
    setCancelBookingTarget(null);
    setIsCancelling(false);
    await refreshAllData();
  };

  const handleConfirmDeleteBooking = async (bookingId: string) => {
    const target = bookingsList.find((b) => b.id === bookingId);
    try {
      await api.delete(`/api/admin/bookings/${bookingId}`);

      setBookingsList((prev) => prev.filter((b) => b.id !== bookingId));
      if (selectedBooking && selectedBooking.id === bookingId) {
        setSelectedBooking(null);
      }
      setDeletingBookingTarget(null);
      showToast(`Booking ${target?.bookingCode || bookingId} permanently deleted.`, 'warning');

      await refreshAllData();
    } catch (err: any) {
      console.error('Error deleting booking from DB:', err);
      setDeletingBookingTarget(null);
      showToast(`Booking not deleted: ${err?.message || 'the server refused'}`, 'warning');
    }
  };

  const handleCreateManualBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isCreatingBooking) return;
    const selectedTherapist = therapists.find((t) => t.name === newBooking.therapistName);
    const selectedClient = clients.find((c) => c.name.toLowerCase() === newBooking.clientName.toLowerCase());

    if (!selectedTherapist) {
      showToast('Pick a therapist from the consultant list', 'warning');
      return;
    }

    // Canonical fields only; the Backend resolves ids, the service price and the India-time session instant
    const payload: Record<string, unknown> = {
      clientName: newBooking.clientName.trim() || selectedClient?.name || 'New Client',
      consultantId: selectedTherapist.id,
      consultantName: selectedTherapist.name,
      date: newBooking.date,
      time: newBooking.time,
      paymentStatus: toCanonical(PAYMENT_TO_CANONICAL, newBooking.paymentStatus),
      status: toCanonical(STATUS_TO_CANONICAL, newBookingStatus)
    };
    if (selectedClient) {
      payload.clientId = selectedClient.id;
      if (selectedClient.email) payload.clientEmail = selectedClient.email;
    }
    if (newBooking.service) payload.serviceTitle = newBooking.service;
    const typedAmount = Number(newBooking.amount);
    if (Number.isFinite(typedAmount) && typedAmount > 0) payload.amount = typedAmount;

    // One request at a time: a second click while saving does nothing (no duplicate bookings)
    setIsCreatingBooking(true);
    try {
      await api.post('/api/admin/bookings', payload);
    } catch (err: any) {
      // The form stays open with everything the admin typed
      console.error('Error creating booking:', err);
      showToast(`Booking not created: ${err?.message || 'the server could not save it'}`, 'warning');
      setIsCreatingBooking(false);
      return;
    }

    showToast('Booking created and saved!', 'success');
    setIsNewBookingModalOpen(false);
    setNewBooking({
      clientName: '',
      clientAvatar: '',
      therapistName: therapists[0]?.name || '',
      ...firstServiceOf(therapists[0]?.name || ''),
      date: new Date().toISOString().split('T')[0],
      time: '09:00 AM - 10:00 AM',
      paymentStatus: 'Paid',
      status: 'Scheduled'
    });
    setIsCreatingBooking(false);
    // The list is reloaded from the server (the new booking appears in the server's own shape)
    await refreshAllData();
  };

  const handleExportCSV = () => {
    // Exactly what the current search and status filter show; an empty result exports nothing
    const dataToExport = filteredBookings;
    if (dataToExport.length === 0) {
      showToast('No bookings match the current filter, so there is nothing to export.', 'warning');
      return;
    }

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
        [b.id, b.bookingCode, b.clientName, b.therapistName, b.service, b.toBeScheduled ? 'To be scheduled' : b.date, b.toBeScheduled ? '' : b.time, b.amount, b.paymentStatus, b.status]
          .map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`)
          .join(',')
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
    <div className="space-y-6 pb-12 animate-fade-in relative font-['Open_Sans']">
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
      <div className="relative rounded-2xl sm:rounded-3xl bg-gradient-to-r from-[#3a0aa8] via-[#450bc8] to-[#3b1799] p-4 sm:p-8 text-white shadow-xl overflow-hidden flex flex-col xl:flex-row xl:items-center justify-between gap-4 sm:gap-6">
        <div className="absolute -right-12 -top-12 w-96 h-96 bg-white/5 rounded-full blur-2xl pointer-events-none" />
        <div className="relative z-10 space-y-1 sm:space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md border border-white/20 text-[10px] sm:text-xs font-bold tracking-wide uppercase text-purple-200">
            <Calendar className="w-3.5 h-3.5" />
            <span>APPOINTMENTS</span>
          </div>
          <h1 className="text-xl sm:text-3xl font-extrabold tracking-tight">Bookings Dashboard</h1>
          <p className="text-purple-100 text-xs sm:text-sm max-w-xl leading-relaxed">
            Inspect, filter, reschedule, and manage consultation sessions across Hexpertify.
          </p>
        </div>

        <div className="relative z-10 flex flex-wrap items-center gap-2.5 sm:gap-3 xl:shrink-0">
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
            className="flex items-center gap-2 px-4 py-2.5 bg-white text-[#3a0aa8] hover:bg-purple-50 font-extrabold text-xs rounded-xl sm:rounded-2xl shadow-lg transition-all active:scale-95 cursor-pointer"
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
            className="w-full pl-11 pr-10 py-2.5 bg-slate-50 border border-slate-200/80 rounded-xl text-xs font-medium text-slate-800 outline-none focus:bg-white focus:border-[#450bc8] focus:ring-2 focus:ring-[#450bc8]/10 transition-all placeholder:text-slate-400"
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
              className="w-full pl-10 pr-8 py-2.5 bg-slate-50 border border-slate-200/80 rounded-xl text-xs font-extrabold text-slate-800 outline-none focus:bg-white focus:border-[#450bc8] focus:ring-2 focus:ring-[#450bc8]/10 appearance-none cursor-pointer transition-all"
            >
              {['All', 'Scheduled', 'Completed', 'Rescheduled', 'Cancelled', 'No Show - Client', 'No Show - Consultant', 'Pending', 'Pending Payment', 'Expired'].map((status) => {
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
            <Download className="w-3.5 h-3.5 text-[#450bc8]" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Visually Appealing Reference Styled Table */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto w-full">
          <table className="w-full min-w-[860px] text-left border-collapse table-fixed">
            <thead>
              <tr className="bg-slate-50/70 border-b border-slate-100 text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">
                <th className="py-3.5 px-4 w-[22%]">
                  <span className="flex items-center gap-1.5 whitespace-nowrap">
                    <User className="w-3.5 h-3.5 text-slate-500" />
                    CLIENT
                  </span>
                </th>
                <th className="py-3.5 px-4 w-[22%]">
                  <span className="flex items-center gap-1.5 whitespace-nowrap">
                    <UserCheck className="w-3.5 h-3.5 text-slate-500" />
                    THERAPIST
                  </span>
                </th>
                <th className="py-3.5 px-4 w-[24%]">
                  <span className="flex items-center gap-1.5 whitespace-nowrap">
                    <CreditCard className="w-3.5 h-3.5 text-slate-500" />
                    SERVICE & FEE
                  </span>
                </th>
                <th className="py-3.5 px-4 w-[18%]">
                  <span className="flex items-center gap-1.5 whitespace-nowrap">
                    <Calendar className="w-3.5 h-3.5 text-slate-500" />
                    DATE & TIME SLOT
                  </span>
                </th>
                <th className="py-3.5 px-4 w-[14%]">
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
                  <td colSpan={5} className="py-16 text-center text-slate-400">
                    <div className="max-w-xs mx-auto space-y-2">
                      <Filter className="w-8 h-8 text-slate-300 mx-auto" />
                      <p className="font-semibold text-slate-600">No bookings match your current filter or search criteria.</p>
                      <button
                        onClick={() => {
                          setSearchTerm('');
                          setStatusFilter('All');
                          setCurrentPage(1);
                        }}
                        className="text-[#450bc8] font-bold text-xs hover:underline"
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
                    {/* Client Name & ID/Email */}
                    <td className="py-4 px-4">
                      <div className="truncate">
                        <p className="font-extrabold text-slate-900 group-hover:text-[#450bc8] transition-colors leading-snug truncate">
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
                          <span>{b.toBeScheduled ? 'To be scheduled' : b.date}</span>
                        </p>
                        {!b.toBeScheduled && b.time && (
                          <p className="text-[10px] font-semibold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-md inline-flex items-center gap-1 whitespace-nowrap">
                            <Clock className="w-3 h-3 text-[#450bc8]" />
                            <span>{b.time}</span>
                          </p>
                        )}
                      </div>
                    </td>

                    {/* Status Pill Badge */}
                    <td className="py-4 px-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-1.5 text-xs px-3 py-1 rounded-full font-extrabold shadow-2xs ${
                          b.status === 'Completed'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'
                            : b.status === 'Scheduled'
                            ? 'bg-purple-50 text-[#450bc8] border border-purple-200/60'
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
                              ? 'bg-[#450bc8]'
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
              className="p-2.5 sm:p-1.5 bg-white border border-slate-200 rounded-xl text-slate-600 hover:text-[#450bc8] hover:border-purple-200 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-2xs"
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
              className="p-2.5 sm:p-1.5 bg-white border border-slate-200 rounded-xl text-slate-600 hover:text-[#450bc8] hover:border-purple-200 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-2xs"
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
                <div className="w-9 h-9 rounded-2xl bg-purple-50 text-[#450bc8] flex items-center justify-center font-extrabold border border-purple-100 shrink-0">
                  {isEditingSelectedBooking ? <Edit className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </div>
                <div>
                  <span className="text-[10px] font-extrabold text-[#450bc8] uppercase tracking-wider block">
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
                      : 'bg-purple-50 text-[#450bc8] hover:bg-purple-100 border border-purple-200/80'
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
                        className="text-xs text-[#450bc8] font-extrabold opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1"
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
                        className="text-xs text-[#450bc8] font-extrabold opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1"
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
                    <span className="text-slate-500 font-semibold">Booking ID:</span>
                    <div className="flex items-center gap-1.5">
                      <span className="px-2.5 py-1 bg-[#f4f0ff] text-[#450bc8] font-mono font-extrabold text-xs rounded-xl shadow-2xs inline-block">
                        {selectedBooking.bookingCode}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => handleCopyCode(selectedBooking.bookingCode, e)}
                        className="p-1 text-slate-400 hover:text-[#450bc8] rounded-md transition-colors"
                        title="Copy Booking ID"
                      >
                        {copiedId === selectedBooking.bookingCode ? (
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500 font-semibold">Service Requested:</span>
                    <span className="font-extrabold text-slate-900">{getBookingService(selectedBooking)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500 font-semibold">Session Date & Time:</span>
                    <div className="text-right">
                      <span className="font-extrabold text-slate-900 block">
                        {selectedBooking.toBeScheduled
                          ? 'To be scheduled'
                          : `${selectedBooking.date}${selectedBooking.time ? ` (${selectedBooking.time})` : ''}`}
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
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none font-semibold text-slate-800 focus:bg-white focus:border-[#450bc8] focus:ring-2 focus:ring-[#450bc8]/10 transition-all"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="font-extrabold text-slate-700">Assigned Therapist *</label>
                    <select
                      value={editBookingData?.therapistName || ''}
                      onChange={(e) => {
                        const name = e.target.value;
                        // A different therapist: pick one of their services (the old one may not be offered)
                        setEditBookingData((prev) => {
                          if (!prev) return null;
                          const offered = servicesOf(name).some((s) => s.serviceName === prev.service);
                          return { ...prev, therapistName: name, service: offered ? prev.service : firstServiceOf(name).service || prev.service };
                        });
                      }}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none font-semibold text-slate-800 focus:bg-white focus:border-[#450bc8] focus:ring-2 focus:ring-[#450bc8]/10 transition-all"
                    >
                      {therapists.map((t) => (
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
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none font-semibold text-slate-800 focus:bg-white focus:border-[#450bc8] focus:ring-2 focus:ring-[#450bc8]/10 transition-all"
                    >
                      {(() => {
                        // The therapist's offered services, plus the booking's own service if it is no longer offered
                        const offered = servicesOf(editBookingData?.therapistName || '').map((s) => s.serviceName);
                        const current = editBookingData?.service || '';
                        const names = current && !offered.includes(current) ? [current, ...offered] : offered;
                        if (names.length === 0) return <option value="" disabled>No services offered by this therapist</option>;
                        return names.map((name) => (
                          <option key={name} value={name}>
                            {name}
                          </option>
                        ));
                      })()}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="font-extrabold text-slate-700">Session Date *</label>
                    <input
                      type="date"
                      required={!editBookingData?.toBeScheduled}
                      value={editBookingData ? scheduledDateOf(editBookingData) : ''}
                      onChange={(e) => setEditBookingData((prev) => (prev ? { ...prev, date: e.target.value, toBeScheduled: false } : null))}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none font-semibold text-slate-800 focus:bg-white focus:border-[#450bc8] focus:ring-2 focus:ring-[#450bc8]/10 transition-all"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-extrabold text-slate-700">Time Slot *</label>
                    <TherapistSlotSelect
                      therapistId={therapistIdOf(editBookingData?.therapistName, editBookingData?.consultantId)}
                      date={editBookingData ? scheduledDateOf(editBookingData) : ''}
                      value={editBookingData ? scheduledTimeOf(editBookingData) : ''}
                      keepValue={editBookingData ? scheduledTimeOf(editBookingData) : ''}
                      unscheduledOption
                      required={!editBookingData?.toBeScheduled}
                      onChange={(time) => setEditBookingData((prev) => (prev ? { ...prev, time, ...(prev.toBeScheduled ? { date: '', toBeScheduled: false } : {}) } : null))}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none font-semibold text-slate-800 focus:bg-white focus:border-[#450bc8] focus:ring-2 focus:ring-[#450bc8]/10 transition-all"
                    />
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
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none font-mono font-semibold text-slate-800 focus:bg-white focus:border-[#450bc8] focus:ring-2 focus:ring-[#450bc8]/10 transition-all"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-extrabold text-slate-700">Payment Status</label>
                    <select
                      value={editBookingData?.paymentStatus || 'Paid'}
                      onChange={(e) => setEditBookingData((prev) => (prev ? { ...prev, paymentStatus: e.target.value as any } : null))}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none font-semibold text-slate-800 focus:bg-white focus:border-[#450bc8] focus:ring-2 focus:ring-[#450bc8]/10 transition-all"
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
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none font-semibold text-slate-800 focus:bg-white focus:border-[#450bc8] focus:ring-2 focus:ring-[#450bc8]/10 transition-all"
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
                    className="px-3.5 py-2 rounded-xl font-extrabold text-xs transition-all flex items-center gap-1.5 bg-purple-50 hover:bg-[#450bc8] hover:text-white text-[#450bc8] border border-purple-200/80 shadow-2xs active:scale-95"
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
                  className="px-5 py-2 bg-[#450bc8] hover:bg-[#3a0aa8] text-white rounded-xl font-bold text-xs shadow-md"
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
                  className="px-6 py-2 bg-[#450bc8] hover:bg-[#3a0aa8] text-white rounded-xl font-extrabold text-xs shadow-md shadow-[#450bc8]/20 transition-all active:scale-95 flex items-center gap-1.5"
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
              <p className="text-slate-500 text-[11px]">Current: {rescheduleBooking.toBeScheduled ? 'To be scheduled' : `${rescheduleBooking.date} (${rescheduleBooking.time})`}</p>
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
                <TherapistSlotSelect
                  therapistId={therapistIdOf(rescheduleBooking.therapistName, rescheduleBooking.consultantId)}
                  date={newDate}
                  value={newTime}
                  onChange={setNewTime}
                  autoSelect
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold outline-none focus:border-amber-500 focus:bg-white"
                />
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
                {/* Only what really happens: there is no platform wallet */}
                <select
                  value={refundOption}
                  onChange={(e) => setRefundOption(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold outline-none focus:border-rose-500 focus:bg-white"
                >
                  {isGatewayRefundable(cancelBookingTarget) && (
                    <option value="gateway-refund">
                      Refund ₹{cancelBookingTarget.amount}{cancelBookingTarget.paymentStatus === 'Partially Refunded' ? ' (remaining amount)' : ''} to the original payment method
                    </option>
                  )}
                  {isManuallyPaid(cancelBookingTarget) && (
                    <option value="record-refund">Mark as refunded (I refund the client myself)</option>
                  )}
                  <option value="no-refund">
                    {isGatewayRefundable(cancelBookingTarget) || isManuallyPaid(cancelBookingTarget) ? 'No refund (cancellation policy)' : 'No refund (nothing was paid)'}
                  </option>
                </select>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  {refundOption === 'gateway-refund'
                    ? 'The booking is cancelled first, then the refund is sent through the payment gateway.'
                    : refundOption === 'record-refund'
                    ? 'This payment was recorded by an admin, not taken online: Hexpertify cannot send the money back. Refund the client yourself.'
                    : 'The booking is cancelled and no money is returned.'}
                </p>
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
                  disabled={isCancelling}
                  className="px-6 py-2.5 bg-rose-600 hover:bg-rose-700 disabled:opacity-60 text-white rounded-xl font-extrabold text-xs shadow-md shadow-rose-600/30"
                >
                  {isCancelling ? 'Cancelling…' : 'Confirm Cancellation'}
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
          <div className="bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-6 max-w-md w-full shadow-2xl border border-slate-200 space-y-4 my-auto max-h-[90dvh] overflow-y-auto animate-in fade-in zoom-in-95">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h4 className="text-lg font-extrabold text-slate-900">Delete Booking Record?</h4>
              <p className="text-xs text-slate-500 leading-relaxed">
                {isGatewayRefundable(deletingBookingTarget) || isManuallyPaid(deletingBookingTarget) || deletingBookingTarget.paymentStatus === 'Refund Pending'
                  ? <>Booking <span className="font-mono font-bold text-slate-800">{deletingBookingTarget.bookingCode}</span> ({deletingBookingTarget.clientName}) has a payment recorded, so it cannot be deleted. Cancel it instead (with a refund if needed); the booking stays in the records.</>
                  : <>Are you sure you want to delete booking <span className="font-mono font-bold text-slate-800">{deletingBookingTarget.bookingCode}</span> ({deletingBookingTarget.clientName})? This permanently removes it; the deletion is recorded in the audit log.</>}
              </p>
            </div>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeletingBookingTarget(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl"
              >
                {isGatewayRefundable(deletingBookingTarget) || isManuallyPaid(deletingBookingTarget) || deletingBookingTarget.paymentStatus === 'Refund Pending' ? 'Close' : 'Cancel'}
              </button>
              {!(isGatewayRefundable(deletingBookingTarget) || isManuallyPaid(deletingBookingTarget) || deletingBookingTarget.paymentStatus === 'Refund Pending') && (
                <button
                  type="button"
                  onClick={() => handleConfirmDeleteBooking(deletingBookingTarget.id)}
                  className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs rounded-xl shadow-md"
                >
                  Confirm Permanent Delete
                </button>
              )}
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
            <div className="bg-gradient-to-r from-[#3a0aa8] to-[#450bc8] p-4 sm:p-5 text-white flex items-center justify-between shrink-0">
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
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-semibold text-slate-800 focus:bg-white focus:border-[#450bc8] transition-all"
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
                      // Each therapist has their own services; the fee comes from the chosen service
                      setNewBooking({
                        ...newBooking,
                        therapistName: e.target.value,
                        ...firstServiceOf(e.target.value)
                      });
                    }}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-semibold text-slate-800 focus:bg-white focus:border-[#450bc8] transition-all"
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
                    required
                    value={newBooking.service}
                    onChange={(e) => {
                      const selected = servicesOf(newBooking.therapistName).find((s) => s.serviceName === e.target.value);
                      setNewBooking({
                        ...newBooking,
                        service: e.target.value,
                        amount: Number(selected?.sessionFee) || newBooking.amount
                      });
                    }}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-semibold text-slate-800 focus:bg-white focus:border-[#450bc8] transition-all"
                  >
                    {servicesOf(newBooking.therapistName).length === 0 ? (
                      <option value="" disabled>No services offered by this therapist</option>
                    ) : (
                      servicesOf(newBooking.therapistName).map((s) => (
                        <option key={s.id || s.serviceName} value={s.serviceName}>
                          {s.serviceName} (₹{Number(s.sessionFee).toLocaleString('en-IN')})
                        </option>
                      ))
                    )}
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
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-semibold text-slate-800 focus:bg-white focus:border-[#450bc8] transition-all"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-extrabold text-slate-700 block">Time Slot *</label>
                  <TherapistSlotSelect
                    therapistId={therapistIdOf(newBooking.therapistName)}
                    date={newBooking.date}
                    value={newBooking.time}
                    onChange={(time) => setNewBooking((prev) => ({ ...prev, time }))}
                    autoSelect
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-semibold text-slate-800 focus:bg-white focus:border-[#450bc8] transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                <div className="space-y-1.5">
                  <label className="font-extrabold text-slate-700 block">Session Fee (₹)</label>
                  {/* The therapist's price for the chosen service */}
                  <div className="w-full p-3 bg-slate-100 border border-slate-200 rounded-xl font-mono font-semibold text-slate-800 cursor-not-allowed">
                    {newBooking.amount > 0 ? `₹${Number(newBooking.amount).toLocaleString('en-IN')}` : '—'}
                  </div>
                  <p className="text-[10px] text-slate-400 font-medium">From the therapist&apos;s service</p>
                </div>

                <div className="space-y-1.5">
                  <label className="font-extrabold text-slate-700 block">Payment Status</label>
                  <select
                    value={newBooking.paymentStatus}
                    onChange={(e) => setNewBooking({ ...newBooking, paymentStatus: e.target.value })}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-semibold text-slate-800 focus:bg-white focus:border-[#450bc8] transition-all"
                  >
                    <option value="Paid">Paid</option>
                    <option value="Pending Payout">Pending Payout</option>
                    <option value="Unpaid">Unpaid</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="font-extrabold text-slate-700 block">Initial Status</label>
                  {/* Set from the slot: a session that already took place is recorded as Completed */}
                  <div className="w-full p-3 bg-slate-100 border border-slate-200 rounded-xl font-semibold text-slate-800 cursor-not-allowed">
                    {newBookingStatus}
                  </div>
                  <p className="text-[10px] text-slate-400 font-medium">From the session date &amp; time</p>
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
                  disabled={isCreatingBooking}
                  className="px-6 py-2.5 bg-[#450bc8] hover:bg-[#3a0aa8] disabled:opacity-60 disabled:cursor-wait text-white rounded-xl font-extrabold shadow-md shadow-[#450bc8]/20 transition-all active:scale-95 flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  <span>{isCreatingBooking ? 'Creating…' : 'Create Booking'}</span>
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
