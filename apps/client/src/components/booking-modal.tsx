import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Calendar as CalendarIcon,
  Clock,
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  MessageSquarePlus,
  Send,
  CalendarPlus,
  Sparkles,
  Video,
  RefreshCw
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import { getGetSessionsQueryKey } from '@workspace/api-client-react';
import { addUserSession, releaseUnpaidSession, rescheduleUserSession } from '@/lib/client-store';
import { getClientAuth, getApiAuthHeaders } from '@/lib/auth';
import { openPaymentCheckout } from '@/lib/payment-checkout';

interface TimeSlot {
  id: string;
  /** Slot label from the Backend, e.g. "09:00 AM - 10:00 AM" (sent back as the booking's `time`) */
  label: string;
  startAt: string;
  available: boolean;
}

/** The calendar day as YYYY-MM-DD from its local date parts (toISOString would shift the day in IST) */
const toDateKey = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

export interface BookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  therapistId?: string;
  therapistEmail?: string;
  therapistName?: string;
  therapistAvatar?: string;
  therapistTitle?: string;
  onBookingSuccess?: (newSession: any) => void;
  /** Reschedule this existing session instead of booking (and paying for) a new one */
  reschedule?: { id: string | number; currentAt?: string };
}

export function BookingModal({
  isOpen,
  onClose,
  therapistId,
  therapistEmail,
  therapistName = "Your Assigned Consultant",
  therapistAvatar = "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&w=400&q=80",
  therapistTitle = "Licensed Psychologist",
  onBookingSuccess,
  reschedule
}: BookingModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const authUser = getClientAuth();

  // View state: 'slot-selection' | 'confirmed' | 'request-slot' | 'request-submitted'
  const [viewState, setViewState] = useState<'slot-selection' | 'confirmed' | 'request-slot' | 'request-submitted'>('slot-selection');

  // Custom Slot Request state
  const [requestCustomTime, setRequestCustomTime] = useState<string>('');
  const [requestNotes, setRequestNotes] = useState<string>('');
  const [isRequestSubmitting, setIsRequestSubmitting] = useState<boolean>(false);

  // Date selection
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [isCalendarOpen, setIsCalendarOpen] = useState<boolean>(false);
  const [currentCalendarMonth, setCurrentCalendarMonth] = useState<Date>(new Date());

  // Time slot selection
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [paidAmount, setPaidAmount] = useState<number | null>(null);
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([]);
  const [slotsLoading, setSlotsLoading] = useState<boolean>(false);
  const [slotsError, setSlotsError] = useState<string>('');
  const [slotsRefresh, setSlotsRefresh] = useState<number>(0);

  // The real consultant id: never a placeholder
  const consultantId = therapistId || authUser?.assignedTherapistId || '';

  // Every opening starts fresh (never on the previous booking's "confirmed" or "request sent" screen)
  React.useEffect(() => {
    if (!isOpen) return;
    setViewState('slot-selection');
    setRequestCustomTime('');
    setRequestNotes('');
    setPaidAmount(null);
    const today = new Date();
    setSelectedDate(today);
    setCurrentCalendarMonth(today);
    setIsCalendarOpen(false);
  }, [isOpen]);

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  /** Moves the existing session to the chosen slot (no payment: it is the same session) */
  const handleReschedule = async () => {
    if (!reschedule || !selectedTimeSlot) return;
    setIsSubmitting(true);
    const result = await rescheduleUserSession(reschedule.id, { date: toDateKey(selectedDate), time: selectedTimeSlot });
    setIsSubmitting(false);
    if (!result.ok) {
      toast({ title: 'Session not moved', description: result.error, variant: 'destructive' });
      setSlotsRefresh((n) => n + 1);
      return;
    }
    toast({
      title: 'Session rescheduled',
      description: `Your session is now on ${selectedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} at ${selectedTimeSlot}. Your therapist has been told.`,
    });
    onBookingSuccess?.(null);
    onClose();
  };

  // The consultant's slots for the selected day: weekly availability minus blocked times and booked sessions
  React.useEffect(() => {
    if (!isOpen) return;
    if (!consultantId) {
      setAvailableSlots([]);
      setSelectedTimeSlot('');
      setSlotsError('No therapist is assigned to your account yet.');
      return;
    }
    let cancelled = false;
    setSlotsLoading(true);
    setSlotsError('');

    fetch(`/api/availability/slots?consultantId=${encodeURIComponent(consultantId)}&date=${toDateKey(selectedDate)}`, {
      headers: getApiAuthHeaders(),
    })
      .then(async (res) => {
        const data = await res.json().catch(() => null);
        if (!res.ok || !data?.success) throw new Error(data?.error || 'Could not load time slots.');
        return data;
      })
      .then((data) => {
        if (cancelled) return;
        const slots: TimeSlot[] = (Array.isArray(data?.slots) ? data.slots : []).map((s: any) => ({
          id: String(s.startAt || s.time),
          label: String(s.time),
          startAt: String(s.startAt || ''),
          available: !!s.available,
        }));
        setAvailableSlots(slots);
        // Never keep an already-booked slot selected
        setSelectedTimeSlot((current) =>
          slots.some((s) => s.label === current && s.available)
            ? current
            : slots.find((s) => s.available)?.label || ''
        );
      })
      .catch((err: any) => {
        if (cancelled) return;
        setAvailableSlots([]);
        setSelectedTimeSlot('');
        setSlotsError(err?.message || 'Could not load time slots.');
      })
      .finally(() => {
        if (!cancelled) setSlotsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isOpen, selectedDate, consultantId, slotsRefresh]);

  const formatDateLabel = (date: Date) => {
    const today = new Date();
    const isToday =
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear();

    const formatted = date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });

    return isToday ? `Today (${formatted})` : formatted;
  };

  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (year: number, month: number) => {
    return new Date(year, month, 1).getDay();
  };

  const renderCalendarDays = () => {
    const year = currentCalendarMonth.getFullYear();
    const month = currentCalendarMonth.getMonth();
    const totalDays = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfMonth(year, month);
    const prevMonthDays = getDaysInMonth(year, month - 1);

    const days = [];

    for (let i = firstDay - 1; i >= 0; i--) {
      days.push({
        day: prevMonthDays - i,
        isCurrentMonth: false,
        date: new Date(year, month - 1, prevMonthDays - i),
      });
    }

    for (let d = 1; d <= totalDays; d++) {
      days.push({
        day: d,
        isCurrentMonth: true,
        date: new Date(year, month, d),
      });
    }

    const totalSlots = days.length > 35 ? 42 : 35;
    const remainingSlots = totalSlots - days.length;
    for (let n = 1; n <= remainingSlots; n++) {
      days.push({
        day: n,
        isCurrentMonth: false,
        date: new Date(year, month + 1, n),
      });
    }

    return days;
  };

  const handleConfirmBooking = async () => {
    if (!selectedTimeSlot) {
      toast({
        title: 'Select a time slot',
        description: 'Please pick an available time slot for your session.',
        variant: 'destructive',
      });
      return;
    }

    if (!consultantId) {
      toast({
        title: 'No therapist assigned',
        description: 'We could not find your therapist. Please contact support to book a session.',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    let orderRejected = false;
    try {
      const dateStr = selectedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      const yyyyMmDd = toDateKey(selectedDate);
      const chosenSlot = availableSlots.find((s) => s.label === selectedTimeSlot);

      const cleanTherapistName = therapistName.includes(' - By ') 
        ? therapistName.split(' - By ').pop()?.trim() || therapistName 
        : therapistName;

      // Amount and payment status are decided by the server; the gateway confirms the payment.
      // The server computes the session instant in India time from date + time and checks the slot is free.
      const bookingPayload = {
        clientId: authUser?.id,
        clientName: authUser?.name || 'Client',
        clientEmail: (authUser?.email || '').toLowerCase(),
        clientPhone: authUser?.phone || '',
        consultantId,
        consultantName: cleanTherapistName,
        consultantAvatar: therapistAvatar || authUser?.assignedTherapistPhoto || '',
        serviceTitle: therapistTitle || 'Individual Therapy',
        date: yyyyMmDd,
        time: selectedTimeSlot,
        durationMinutes: 50,
        notes: `Virtual consultation confirmed for ${dateStr} at ${selectedTimeSlot}.`,
      };

      // 1. Reserve the slot and create the gateway order
      const orderRes = await fetch('/api/payments/order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getApiAuthHeaders() },
        body: JSON.stringify(bookingPayload),
      });
      const order = await orderRes.json().catch(() => null);
      if (!orderRes.ok || !order?.success) {
        // e.g. the slot was just taken: show the server's reason and reload the slots
        orderRejected = true;
        throw new Error(order?.error || 'Could not start the payment. Please try again.');
      }

      // 2. Collect payment in the gateway popup
      const checkoutResult = await openPaymentCheckout(order.checkout, { businessName: 'Hexpertify' });
      if (checkoutResult.status === 'dismissed') {
        // Free the slot that was held for this payment, so it can be booked again straight away
        if (order.bookingId) await releaseUnpaidSession(order.bookingId).catch(() => null);
        setSlotsRefresh((n) => n + 1);
        toast({ title: 'Payment cancelled', description: 'Your session was not booked. You can try again any time.' });
        return;
      }
      if (checkoutResult.status === 'failed') {
        throw new Error(checkoutResult.error || 'Payment failed. Please try again.');
      }

      // 3. Verify with the backend before treating the session as booked
      const verifyRes = await fetch('/api/payments/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getApiAuthHeaders() },
        body: JSON.stringify({ paymentId: order.paymentId, ...checkoutResult.response }),
      });
      const verified = await verifyRes.json().catch(() => null);
      if (verified?.status === 'PENDING') {
        toast({
          title: 'Payment processing',
          description: verified.error || 'We will confirm your session as soon as the payment clears.',
        });
        onClose();
        return;
      }
      if (!verifyRes.ok || !verified?.success) {
        throw new Error(verified?.error || 'We could not verify your payment. If money was deducted, please contact support.');
      }

      const savedBookingId = order.bookingId;
      setPaidAmount(Number(order.amount) || null);

      // Add to local store and notify listeners (already persisted by the payment service)
      const newBookedSession = addUserSession({
        id: savedBookingId,
        therapistName: cleanTherapistName,
        therapistAvatarUrl: bookingPayload.consultantAvatar,
        therapistTitle: bookingPayload.serviceTitle,
        scheduledAt: chosenSlot?.startAt || '',
        date: yyyyMmDd,
        time: selectedTimeSlot,
        durationMinutes: 50,
        notes: bookingPayload.notes,
        clientName: bookingPayload.clientName,
        clientEmail: bookingPayload.clientEmail,
      }, { persist: false });

      // Invalidate query cache for sessions so lists update
      queryClient.invalidateQueries({ queryKey: getGetSessionsQueryKey({ status: 'upcoming' }) });
      queryClient.invalidateQueries({ queryKey: ['sessions'] });

      setViewState('confirmed');

      toast({
        title: '🎉 Session Scheduled!',
        description: `Your therapy appointment with ${cleanTherapistName} is confirmed for ${dateStr} at ${selectedTimeSlot}.`,
      });

      if (onBookingSuccess) {
        onBookingSuccess(newBookedSession);
      }
    } catch (err: any) {
      toast({
        title: 'Booking Error',
        description: err?.message || 'Failed to book session. Please try again.',
        variant: 'destructive',
      });
      if (orderRejected) setSlotsRefresh((n) => n + 1);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRequestSlot = async () => {
    if (!requestCustomTime.trim()) {
      toast({
        title: 'Enter preferred timing',
        description: 'Please specify your preferred hours or custom time range.',
        variant: 'destructive',
      });
      return;
    }

    setIsRequestSubmitting(true);
    try {
      const dateStr = selectedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      const clientName = authUser?.name || 'Client';
      const clientEmail = (authUser?.email || '').toLowerCase();

      if (!consultantId) throw new Error('No therapist is assigned to your account yet.');
      const consultantEmail = (therapistEmail || authUser?.assignedTherapistEmail || '').toLowerCase();

      // 1. The request reaches the therapist as a message (the record they work from)
      const messageRes = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getApiAuthHeaders() },
        body: JSON.stringify({
          senderRole: 'client',
          senderName: clientName,
          senderEmail: clientEmail,
          clientName: clientName,
          clientEmail: clientEmail,
          consultantId,
          consultantEmail,
          consultantName: therapistName,
          content: `Hi ${therapistName}, I would like to request a session on ${dateStr} at ${requestCustomTime}.${requestNotes ? ` Notes: ${requestNotes}` : ''}`,
        }),
      }).catch(() => null);
      if (!messageRes || !messageRes.ok) {
        const data = messageRes ? await messageRes.json().catch(() => null) : null;
        throw new Error(data?.error || 'Your request could not be sent. Please check your connection and try again.');
      }

      // 2. A notification for the therapist (best effort, not waited for: the message above already carries the request)
      void fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getApiAuthHeaders() },
        body: JSON.stringify({
          recipientRole: 'CONSULTANT',
          recipientEmail: consultantEmail,
          type: 'CUSTOM_SLOT_REQUEST',
          title: 'Custom Session Request 🗓️',
          message: `${clientName} (${clientEmail}) requested a custom appointment on ${dateStr} for "${requestCustomTime}". ${requestNotes ? `Notes: ${requestNotes}` : ''}`,
        }),
      }).catch(() => {});

      setViewState('request-submitted');
      toast({
        title: '🎉 Request Sent!',
        description: `Custom slot request for ${dateStr} has been sent to ${therapistName}.`,
      });
    } catch (err: any) {
      toast({
        title: 'Request Failed',
        description: err?.message || 'Could not send slot request.',
        variant: 'destructive',
      });
    } finally {
      setIsRequestSubmitting(false);
    }
  };

  const prevMonth = () => {
    setCurrentCalendarMonth(
      new Date(currentCalendarMonth.getFullYear(), currentCalendarMonth.getMonth() - 1, 1)
    );
  };

  const nextMonth = () => {
    setCurrentCalendarMonth(
      new Date(currentCalendarMonth.getFullYear(), currentCalendarMonth.getMonth() + 1, 1)
    );
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto bg-black/60 backdrop-blur-xs">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0"
        />

        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ type: 'spring', duration: 0.4, bounce: 0.15 }}
          className="relative w-full max-w-lg bg-background text-foreground rounded-3xl shadow-2xl border border-border overflow-hidden z-10 max-h-[92dvh] flex flex-col font-sans"
        >
          {/* MODAL HEADER */}
          <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-border bg-card sticky top-0 z-20">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-full overflow-hidden bg-muted border border-primary/20 shrink-0">
                <img 
                  src={therapistAvatar} 
                  alt={therapistName} 
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&w=400&q=80";
                  }}
                />
              </div>
              <div>
                <h2 className="text-lg sm:text-xl font-bold tracking-tight text-foreground leading-tight">
                  {viewState === 'confirmed'
                    ? 'Booking Confirmed'
                    : viewState === 'request-slot'
                    ? 'Request Custom Time'
                    : viewState === 'request-submitted'
                    ? 'Request Submitted'
                    : reschedule
                    ? 'Reschedule Session'
                    : 'Book Session'}
                </h2>
                <p className="text-xs text-primary font-medium">{therapistName} • Availability</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-muted-foreground hover:text-foreground p-2 rounded-full hover:bg-muted transition-colors"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* MODAL BODY */}
          <div className="p-4 sm:p-6 overflow-y-auto space-y-6 flex-1 bg-background">
            {/* SLOT SELECTION VIEW */}
            {viewState === 'slot-selection' && (
              <div className="space-y-6">
                {/* DATE SELECTOR & EXPANDABLE CALENDAR */}
                <div className="bg-primary/5 rounded-2xl p-4 border border-primary/10 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <span className="text-[11px] font-bold uppercase tracking-wider text-primary block">
                        Selected Date
                      </span>
                      <div className="flex items-center gap-2 mt-0.5">
                        <CalendarIcon className="w-4 h-4 text-primary" />
                        <span className="font-extrabold text-foreground text-base">
                          {formatDateLabel(selectedDate)}
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={() => setIsCalendarOpen(!isCalendarOpen)}
                      className={`whitespace-nowrap px-3.5 py-2.5 sm:py-2 rounded-xl font-bold text-xs transition-all flex items-center gap-1.5 border shadow-2xs ${
                        isCalendarOpen
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'bg-card text-primary border-primary/20 hover:bg-primary/10'
                      }`}
                    >
                      <span>{isCalendarOpen ? 'Close Calendar' : 'Change Date'}</span>
                      <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isCalendarOpen ? 'rotate-180' : ''}`} />
                    </button>
                  </div>

                  {/* EXPANDABLE MONTH CALENDAR */}
                  <AnimatePresence>
                    {isCalendarOpen && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.25 }}
                        className="overflow-hidden pt-3 border-t border-primary/10"
                      >
                        <div className="bg-card rounded-2xl p-2.5 sm:p-4 border border-border shadow-sm space-y-3">
                          <div className="flex items-center justify-between px-2">
                            <button
                              onClick={prevMonth}
                              className="w-9 h-9 sm:w-8 sm:h-8 rounded-full hover:bg-muted flex items-center justify-center text-foreground"
                            >
                              <ChevronLeft className="w-5 h-5" />
                            </button>
                            <span className="font-extrabold text-foreground text-base">
                              {currentCalendarMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                            </span>
                            <button
                              onClick={nextMonth}
                              className="w-9 h-9 sm:w-8 sm:h-8 rounded-full hover:bg-muted flex items-center justify-center text-foreground"
                            >
                              <ChevronRight className="w-5 h-5" />
                            </button>
                          </div>

                          <div className="grid grid-cols-7 gap-1 text-center font-bold text-xs text-primary pb-1 border-b border-border">
                            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                              <div key={day}>{day}</div>
                            ))}
                          </div>

                          <div className="grid grid-cols-7 gap-1 sm:gap-1.5 text-center text-xs">
                            {renderCalendarDays().map((d, index) => {
                              const isSelectedDay =
                                d.isCurrentMonth &&
                                d.date.getDate() === selectedDate.getDate() &&
                                d.date.getMonth() === selectedDate.getMonth() &&
                                d.date.getFullYear() === selectedDate.getFullYear();

                              const isToday =
                                d.isCurrentMonth &&
                                d.date.getDate() === new Date().getDate() &&
                                d.date.getMonth() === new Date().getMonth() &&
                                d.date.getFullYear() === new Date().getFullYear();

                              const isPastDay = d.date.getTime() < startOfToday.getTime();
                              return (
                                <button
                                  key={index}
                                  disabled={!d.isCurrentMonth || isPastDay}
                                  aria-label={d.date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                                  onClick={() => {
                                    setSelectedDate(d.date);
                                    setIsCalendarOpen(false);
                                    toast({
                                      title: 'Date Selected',
                                      description: `Showing slots for ${d.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`,
                                    });
                                  }}
                                  className={`h-9 w-full max-w-9 rounded-full flex items-center justify-center mx-auto transition-all font-semibold ${
                                    !d.isCurrentMonth || isPastDay
                                      ? 'text-muted-foreground/40 cursor-not-allowed'
                                      : isSelectedDay
                                      ? 'bg-primary text-primary-foreground font-bold shadow-md scale-105'
                                      : isToday
                                      ? 'bg-primary/20 text-primary font-extrabold border border-primary/30'
                                      : 'text-foreground hover:bg-muted'
                                  }`}
                                >
                                  {d.day}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* TIME SLOTS */}
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="font-extrabold text-foreground text-base tracking-tight">Available Time Slots</h3>
                    <span className="whitespace-nowrap text-[11px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 px-2.5 py-0.5 rounded-full">
                      ● {availableSlots.filter(s => s.available).length} Slots Available
                    </span>
                  </div>

                  {(slotsLoading || slotsError || availableSlots.length === 0) && (
                    <p className={`text-xs font-semibold ${slotsError ? 'text-destructive' : 'text-muted-foreground'}`}>
                      {slotsLoading
                        ? 'Loading time slots…'
                        : slotsError || 'No time slots on this day. Please pick another date or request a custom time.'}
                    </p>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {availableSlots.map((slot) => {
                      const isSelected = selectedTimeSlot === slot.label;
                      return (
                        <button
                          key={slot.id}
                          disabled={!slot.available}
                          onClick={() => setSelectedTimeSlot(slot.label)}
                          className={`py-3 px-4 rounded-2xl text-xs font-extrabold transition-all border text-center cursor-pointer ${
                            !slot.available
                              ? 'bg-muted/40 text-muted-foreground/50 border-border cursor-not-allowed line-through opacity-50'
                              : isSelected
                              ? 'bg-primary text-primary-foreground border-primary font-black shadow-md scale-[1.01]'
                              : 'bg-card border-border text-foreground hover:border-primary/50 hover:bg-primary/5'
                          }`}
                        >
                          {slot.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* CUSTOM TIME REQUEST INVITATION (new bookings only) */}
                {!reschedule && (
                <div className="bg-muted/40 rounded-2xl p-3.5 sm:p-4 border border-border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="flex items-start gap-2.5">
                    <MessageSquarePlus className="w-5 h-5 text-primary mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs font-bold text-foreground">Need a different timing?</p>
                      <p className="text-[11px] text-muted-foreground">Propose a custom time slot directly to {therapistName}.</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setViewState('request-slot')}
                    className="px-3.5 py-2.5 sm:py-2 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-extrabold shadow-xs transition-all whitespace-nowrap"
                  >
                    Request Slot
                  </button>
                </div>
                )}

                {/* CONFIRM BUTTON: pay for a new session, or move the existing one (no payment) */}
                <div className="pt-2">
                  {reschedule && reschedule.currentAt && (
                    <p className="text-xs text-muted-foreground mb-2 text-center">
                      Currently {new Date(reschedule.currentAt).toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}. No extra payment is needed.
                    </p>
                  )}
                  <button
                    onClick={reschedule ? handleReschedule : handleConfirmBooking}
                    disabled={isSubmitting || !selectedTimeSlot}
                    className="w-full hex-button-primary py-3.5 px-6 rounded-2xl shadow-lg transition-all text-base flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <span>{reschedule ? 'Moving your session...' : 'Processing Payment...'}</span>
                    ) : reschedule ? (
                      <>
                        <RefreshCw className="w-5 h-5" />
                        <span>Move Session to {selectedTimeSlot || 'this slot'}</span>
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="w-5 h-5" />
                        <span>Pay & Schedule Session</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* BOOKING CONFIRMED */}
            {viewState === 'confirmed' && (
              <div className="space-y-6 text-center py-4 bg-card p-4 sm:p-6 rounded-3xl border border-border">
                <div className="w-16 h-16 bg-emerald-500/10 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
                  <CheckCircle2 className="w-10 h-10" />
                </div>

                <div className="space-y-1">
                  <h3 className="text-2xl font-black text-foreground">Session Confirmed!</h3>
                  <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                    Payment received. Your session with {therapistName} has been booked. Meeting link and calendar invite sent to your email.
                  </p>
                </div>

                <div className="bg-muted/40 rounded-2xl p-5 border border-border text-left space-y-3 text-xs">
                  <div className="flex items-center justify-between pb-2 border-b border-border">
                    <span className="font-bold text-muted-foreground uppercase text-[10px]">Therapist</span>
                    <span className="font-bold text-foreground text-sm">{therapistName}</span>
                  </div>

                  <div className="flex items-center justify-between pb-2 border-b border-border">
                    <span className="font-bold text-muted-foreground uppercase text-[10px]">Date</span>
                    <span className="font-black text-foreground">
                      {selectedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                  </div>

                  <div className="flex items-center justify-between pb-2 border-b border-border">
                    <span className="font-bold text-muted-foreground uppercase text-[10px]">Time Slot</span>
                    <span className="font-black text-primary">{selectedTimeSlot}</span>
                  </div>

                  {paidAmount !== null && (
                    <div className="flex items-center justify-between pb-2 border-b border-border">
                      <span className="font-bold text-muted-foreground uppercase text-[10px]">Amount Paid</span>
                      <span className="font-black text-foreground">₹{paidAmount.toLocaleString('en-IN')}</span>
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <span className="font-bold text-muted-foreground uppercase text-[10px]">Session Format</span>
                    <span className="font-extrabold text-foreground flex items-center gap-1">
                      <Video className="w-3.5 h-3.5 text-primary" /> 50 Min Video Session
                    </span>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    onClick={onClose}
                    className="w-full hex-button-primary py-3.5 px-6 rounded-2xl shadow-md transition-all text-xs inline-flex items-center justify-center gap-2"
                  >
                    <span>Done & View Sessions</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* CUSTOM SLOT REQUEST */}
            {viewState === 'request-slot' && (
              <div className="space-y-5">
                <div className="bg-amber-500/10 rounded-2xl p-4 border border-amber-500/20 text-xs text-amber-700 dark:text-amber-400 flex items-start gap-2.5">
                  <Sparkles className="w-5 h-5 text-amber-500 mt-0.5 shrink-0" />
                  <div className="space-y-0.5">
                    <p className="font-bold">Flexible Scheduling Request</p>
                    <p className="leading-relaxed">
                      Propose your preferred day and time. {therapistName} will review and confirm availability.
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    1. Preferred Date
                  </label>
                  <div className="bg-muted/40 rounded-xl p-3 border border-border flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CalendarIcon className="w-4 h-4 text-primary" />
                      <span className="font-extrabold text-sm text-foreground">
                        {formatDateLabel(selectedDate)}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setViewState('slot-selection');
                        setIsCalendarOpen(true);
                      }}
                      className="text-xs font-bold text-primary hover:underline py-2 sm:py-0 shrink-0"
                    >
                      Change Date
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    2. Enter Preferred Time Slot
                  </label>
                  <div className="relative">
                    <Clock className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="e.g. 07:30 PM - 08:30 PM, or Saturday afternoon"
                      value={requestCustomTime}
                      onChange={(e) => setRequestCustomTime(e.target.value)}
                      className="w-full text-xs font-semibold pl-10 pr-4 py-3 rounded-xl border border-border focus:outline-none focus:ring-2 focus:ring-primary bg-background shadow-xs text-foreground"
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                      3. Additional Notes (Optional)
                    </label>
                    <textarea
                      placeholder="Share any details about your preferred topic or constraints..."
                      value={requestNotes}
                      onChange={(e) => setRequestNotes(e.target.value)}
                      rows={2.5}
                      className="w-full text-xs font-semibold p-3 rounded-xl border border-border focus:outline-none focus:ring-2 focus:ring-primary bg-background shadow-xs text-foreground resize-none"
                    />
                  </div>
                </div>

                <div className="space-y-2 pt-2">
                  <button
                    type="button"
                    onClick={handleRequestSlot}
                    disabled={isRequestSubmitting || !requestCustomTime.trim()}
                    className="w-full hex-button-primary py-3.5 px-6 rounded-2xl shadow-lg transition-all text-sm flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {isRequestSubmitting ? (
                      <span>Submitting...</span>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        <span>Send Custom Time Request</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => setViewState('slot-selection')}
                    className="w-full hex-button-secondary py-2.5 px-6 rounded-xl transition-all text-xs text-center"
                  >
                    Back to Available Slots
                  </button>
                </div>
              </div>
            )}

            {/* REQUEST SUBMITTED */}
            {viewState === 'request-submitted' && (
              <div className="space-y-6 text-center py-4 bg-card p-4 sm:p-6 rounded-3xl border border-border">
                <div className="w-16 h-16 bg-primary/10 text-primary rounded-full flex items-center justify-center mx-auto shadow-inner">
                  <CalendarPlus className="w-9 h-9" />
                </div>

                <div className="space-y-1.5">
                  <h3 className="text-2xl font-black text-foreground">Request Sent!</h3>
                  <p className="text-xs text-muted-foreground max-w-sm mx-auto leading-relaxed">
                    Your custom timing request has been submitted to {therapistName}. You will receive a notification once confirmed.
                  </p>
                </div>

                <div className="pt-2 space-y-2">
                  <button
                    type="button"
                    onClick={() => setViewState('slot-selection')}
                    className="w-full hex-button-primary py-3.5 px-6 rounded-2xl shadow-md transition-all text-xs inline-flex items-center justify-center gap-2"
                  >
                    <span>View Available Slots</span>
                  </button>

                  <button
                    type="button"
                    onClick={onClose}
                    className="w-full hex-button-secondary py-2.5 px-6 rounded-xl transition-all text-xs text-center"
                  >
                    Close Window
                  </button>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
