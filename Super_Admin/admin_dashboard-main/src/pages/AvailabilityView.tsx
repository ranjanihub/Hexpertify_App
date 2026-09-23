import React, { useState, useMemo, useEffect } from 'react';
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Plus,
  CheckCircle2,
  Lock,
  MoreVertical,
  Ban,
  Users,
  Sparkles,
  X
} from 'lucide-react';
import { useAppContext } from '../context/AppContext';

/* ─── helpers ─────────────────────────────────────────────── */
const DAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

function startOfMonth(y: number, m: number) {
  return new Date(y, m, 1).getDay();
}
function daysInMonth(y: number, m: number) {
  return new Date(y, m + 1, 0).getDate();
}

function dotColor(count: number) {
  if (count >= 5) return 'bg-[#5e2be2]';
  if (count >= 3) return 'bg-[#5e2be2]/60';
  return 'bg-[#5e2be2]/30';
}

function parseTimeToMinutes(t: string): number {
  if (!t) return 0;
  const match = t.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
  if (!match) return 0;
  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const meridiem = (match[3] || '').toUpperCase();
  if (meridiem === 'PM' && hours < 12) hours += 12;
  if (meridiem === 'AM' && hours === 12) hours = 0;
  return hours * 60 + minutes;
}

function minutesToTimeString(totalMinutes: number): string {
  let hours = Math.floor(totalMinutes / 60) % 24;
  const minutes = totalMinutes % 60;
  const meridiem = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  if (hours === 0) hours = 12;
  const hh = String(hours).padStart(2, '0');
  const mm = String(minutes).padStart(2, '0');
  return `${hh}:${mm} ${meridiem}`;
}

function generateHourlySlots(startStr: string, endStr: string, stepMinutes = 60): string[] {
  const startMin = parseTimeToMinutes(startStr || '09:00 AM');
  const endMin = parseTimeToMinutes(endStr || '05:00 PM');
  if (startMin >= endMin) return [startStr || '09:00 AM'];

  const slots: string[] = [];
  for (let m = startMin; m <= endMin; m += stepMinutes) {
    slots.push(minutesToTimeString(m));
  }
  return slots;
}

export type SessionStatus = 'booked' | 'available' | 'blocked';

export interface SessionSlot {
  client: string;
  initials: string;
  time: string;
  type: string;
  duration: string;
  status: SessionStatus;
  slotId?: string;
  bookingId?: string;
  consultantId?: string;
  consultantName?: string;
}

export const AvailabilityView: React.FC = () => {
  const { therapists: dbTherapists, clients: dbClients } = useAppContext();
  const today = useMemo(() => new Date(), []);

  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [selectedDay, setSelectedDay] = useState(today.getDate());
  const [selectedConsultantId, setSelectedConsultantId] = useState<string>('');

  const [allRawBookings, setAllRawBookings] = useState<any[]>([]);
  const [allRawSlots, setAllRawSlots] = useState<any[]>([]);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Modals state
  const [isAvailabilityModalOpen, setIsAvailabilityModalOpen] = useState(false);
  const [isAddEventModalOpen, setIsAddEventModalOpen] = useState(false);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [activeMenuSlotIndex, setActiveMenuSlotIndex] = useState<number | null>(null);

  // Add Event Form State
  const [eventClientName, setEventClientName] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [eventTime, setEventTime] = useState('10:00 AM');
  const [eventDuration, setEventDuration] = useState('50 min');
  const [eventType, setEventType] = useState('Individual Clinical Psychology');

  // Assign Target State
  const [assignTarget, setAssignTarget] = useState<{ key: string; index: number; slot: SessionSlot } | null>(null);
  const [assignClientName, setAssignClientName] = useState('');

  // Weekly Working Hours State
  const [workingHours, setWorkingHours] = useState<Record<string, { enabled: boolean; start: string; end: string }>>({
    monday: { enabled: true, start: '09:00 AM', end: '05:00 PM' },
    tuesday: { enabled: true, start: '09:00 AM', end: '05:00 PM' },
    wednesday: { enabled: true, start: '09:00 AM', end: '05:00 PM' },
    thursday: { enabled: true, start: '09:00 AM', end: '05:00 PM' },
    friday: { enabled: true, start: '09:00 AM', end: '05:00 PM' },
    saturday: { enabled: false, start: '10:00 AM', end: '02:00 PM' },
    sunday: { enabled: false, start: '10:00 AM', end: '02:00 PM' }
  });

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Set default selected consultant when loaded
  useEffect(() => {
    if (dbTherapists.length > 0 && !selectedConsultantId) {
      setSelectedConsultantId(dbTherapists[0].id);
    }
  }, [dbTherapists, selectedConsultantId]);

  const activeConsultant = useMemo(() => {
    return dbTherapists.find((t) => t.id === selectedConsultantId) || dbTherapists[0];
  }, [dbTherapists, selectedConsultantId]);

  // Sync working hours when active consultant changes
  useEffect(() => {
    if (activeConsultant?.availability && typeof activeConsultant.availability === 'object') {
      setWorkingHours((prev) => ({
        ...prev,
        ...activeConsultant.availability
      }));
    }
  }, [activeConsultant]);

  // Fetch live real data from MongoDB Atlas API
  const fetchLiveScheduleData = async () => {
    try {
      const [bookingsRes, availabilityRes] = await Promise.all([
        fetch('/api/bookings').catch(() => fetch('http://localhost:5000/api/bookings')).catch(() => null),
        fetch('/api/availability').catch(() => fetch('http://localhost:5000/api/availability')).catch(() => null)
      ]);

      if (bookingsRes && bookingsRes.ok) {
        const data = await bookingsRes.json();
        const bookingsList = Array.isArray(data?.bookings) ? data.bookings : Array.isArray(data) ? data : [];
        setAllRawBookings(bookingsList);
      }

      if (availabilityRes && availabilityRes.ok) {
        const data = await availabilityRes.json();
        const slotsList = Array.isArray(data?.slots) ? data.slots : Array.isArray(data) ? data : [];
        setAllRawSlots(slotsList);
      }
    } catch (err) {
      console.error('Failed to load schedule data from MongoDB:', err);
    }
  };

  useEffect(() => {
    fetchLiveScheduleData();
    const interval = setInterval(fetchLiveScheduleData, 8000);
    return () => clearInterval(interval);
  }, []);

  // Compute 100% REAL session data mapped by date key `YYYY-M-D`
  const sessionData = useMemo(() => {
    const map: Record<string, SessionSlot[]> = {};

    if (!activeConsultant) return map;

    const aCid = String(activeConsultant.id || '').toLowerCase();
    const aCname = String(activeConsultant.name || '').toLowerCase();

    // 1. Consultant's real bookings from MongoDB
    const consultantBookings = allRawBookings.filter((b) => {
      const bCid = String(b.consultantId || b.therapistId || '').toLowerCase();
      const bCname = String(b.consultantName || b.therapistName || '').toLowerCase();
      return (bCid && bCid === aCid) || (bCname && aCname && (bCname === aCname || aCname.includes(bCname) || bCname.includes(aCname)));
    });

    // 2. Consultant's custom slots / blocks from MongoDB
    const consultantSlots = allRawSlots.filter((s) => {
      const sCid = String(s.therapistId || s.consultantId || '').toLowerCase();
      const sCname = String(s.therapistName || s.consultantName || '').toLowerCase();
      return (sCid && sCid === aCid) || (sCname && aCname && (sCname === aCname || aCname.includes(sCname) || sCname.includes(aCname)));
    });

    const activeSchedule = (activeConsultant.availability && typeof activeConsultant.availability === 'object')
      ? { ...workingHours, ...activeConsultant.availability }
      : workingHours;

    const daysCount = daysInMonth(year, month);
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

    for (let d = 1; d <= daysCount; d++) {
      const dateObj = new Date(year, month, d);
      const dayName = dayNames[dateObj.getDay()];
      const key = `${year}-${month + 1}-${d}`;
      const dayConfig = activeSchedule[dayName];

      map[key] = [];

      // Find bookings for this date
      const dateBookings = consultantBookings.filter((b) => {
        const dObj = new Date(b.scheduledAt || b.date || b.createdAt || Date.now());
        if (isNaN(dObj.getTime())) return false;
        return dObj.getFullYear() === year && dObj.getMonth() === month && dObj.getDate() === d;
      });

      // Find custom slots/blocks for this date
      const dateCustomSlots = consultantSlots.filter((s) => {
        if (!s.date) return false;
        const dObj = new Date(s.date);
        if (isNaN(dObj.getTime())) return false;
        return dObj.getFullYear() === year && dObj.getMonth() === month && dObj.getDate() === d;
      });

      // If working hours are enabled for this day, generate all standard working slots
      if (dayConfig?.enabled) {
        const timeSlots = generateHourlySlots(dayConfig.start || '09:00 AM', dayConfig.end || '05:00 PM');

        timeSlots.forEach((timeStr) => {
          // Check if this time slot is booked
          const matchedBooking = dateBookings.find((b) => {
            const bTime = b.time || new Date(b.scheduledAt || b.date).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
            return parseTimeToMinutes(bTime) === parseTimeToMinutes(timeStr);
          });

          // Check if custom slot or block exists
          const matchedCustomSlot = dateCustomSlots.find((s) => parseTimeToMinutes(s.startTime || s.time) === parseTimeToMinutes(timeStr));

          if (matchedBooking) {
            const isBlocked = String(matchedBooking.status || '').toUpperCase() === 'BLOCKED';
            const isAvailable = String(matchedBooking.status || '').toUpperCase() === 'AVAILABLE' || matchedBooking.clientName === 'Open Consultation Slot';

            map[key].push({
              client: isBlocked ? 'Blocked Time Slot' : isAvailable ? 'Open Consultation Slot' : (matchedBooking.clientName || 'Patient Consultation'),
              initials: (matchedBooking.clientName || 'PT').split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase(),
              time: timeStr,
              type: matchedBooking.serviceTitle || 'Individual Clinical Psychology',
              duration: matchedBooking.duration || `${matchedBooking.durationMinutes || 50} min`,
              status: isBlocked ? 'blocked' : isAvailable ? 'available' : 'booked',
              bookingId: matchedBooking.id || String(matchedBooking._id),
              consultantId: activeConsultant.id,
              consultantName: activeConsultant.name
            });
          } else if (matchedCustomSlot) {
            const isBlocked = matchedCustomSlot.status === 'Blocked' || matchedCustomSlot.status === 'BLOCKED';
            const isBooked = matchedCustomSlot.status === 'Booked' || matchedCustomSlot.status === 'BOOKED';

            map[key].push({
              client: isBlocked ? 'Blocked Time Slot' : isBooked ? (matchedCustomSlot.clientName || 'Booked Client') : 'Open Consultation Slot',
              initials: (matchedCustomSlot.clientName || 'OP').split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase(),
              time: timeStr,
              type: matchedCustomSlot.serviceType || 'Individual Clinical Psychology',
              duration: `${matchedCustomSlot.durationMinutes || 50} min`,
              status: isBlocked ? 'blocked' : isBooked ? 'booked' : 'available',
              slotId: matchedCustomSlot.id || String(matchedCustomSlot._id),
              consultantId: activeConsultant.id,
              consultantName: activeConsultant.name
            });
          } else {
            // Default Available working slot
            map[key].push({
              client: 'Open Consultation Slot',
              initials: 'OP',
              time: timeStr,
              type: activeConsultant.title || 'Individual Clinical Psychology',
              duration: '50 min',
              status: 'available',
              slotId: `AVAIL-${key}-${timeStr.replace(/[^a-zA-Z0-9]/g, '')}`,
              consultantId: activeConsultant.id,
              consultantName: activeConsultant.name
            });
          }
        });
      }

      // Add any additional bookings on this date that fell outside standard working hours
      dateBookings.forEach((b) => {
        const bTime = b.time || new Date(b.scheduledAt || b.date).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
        const exists = map[key].some((s) => parseTimeToMinutes(s.time) === parseTimeToMinutes(bTime));
        if (!exists) {
          const isBlocked = String(b.status || '').toUpperCase() === 'BLOCKED';
          const isAvailable = String(b.status || '').toUpperCase() === 'AVAILABLE' || b.clientName === 'Open Consultation Slot';

          map[key].push({
            client: isBlocked ? 'Blocked Time Slot' : isAvailable ? 'Open Consultation Slot' : (b.clientName || 'Patient Consultation'),
            initials: (b.clientName || 'PT').split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase(),
            time: bTime,
            type: b.serviceTitle || 'Individual Clinical Psychology',
            duration: b.duration || `${b.durationMinutes || 50} min`,
            status: isBlocked ? 'blocked' : isAvailable ? 'available' : 'booked',
            bookingId: b.id || String(b._id),
            consultantId: activeConsultant.id,
            consultantName: activeConsultant.name
          });
        }
      });

      // Add any additional custom slots on this date that fell outside standard working hours
      dateCustomSlots.forEach((s) => {
        const sTime = s.startTime || s.time || '10:00 AM';
        const exists = map[key].some((ex) => parseTimeToMinutes(ex.time) === parseTimeToMinutes(sTime));
        if (!exists) {
          const isBlocked = s.status === 'Blocked' || s.status === 'BLOCKED';
          const isBooked = s.status === 'Booked' || s.status === 'BOOKED';

          map[key].push({
            client: isBlocked ? 'Blocked Time Slot' : isBooked ? (s.clientName || 'Booked Client') : 'Open Consultation Slot',
            initials: (s.clientName || 'OP').split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase(),
            time: sTime,
            type: s.serviceType || 'Individual Clinical Psychology',
            duration: `${s.durationMinutes || 50} min`,
            status: isBlocked ? 'blocked' : isBooked ? 'booked' : 'available',
            slotId: s.id || String(s._id),
            consultantId: activeConsultant.id,
            consultantName: activeConsultant.name
          });
        }
      });

      // Sort chronological
      map[key].sort((a, b) => parseTimeToMinutes(a.time) - parseTimeToMinutes(b.time));
    }

    return map;
  }, [allRawBookings, allRawSlots, activeConsultant, workingHours, year, month]);

  // Calendar matrix computation
  const totalDays = daysInMonth(year, month);
  const firstDay = startOfMonth(year, month);
  const cells = useMemo(() => {
    const arr: (number | null)[] = [];
    for (let i = 0; i < firstDay; i++) arr.push(null);
    for (let d = 1; d <= totalDays; d++) arr.push(d);
    return arr;
  }, [firstDay, totalDays]);

  const prevMonth = () => {
    if (month === 0) {
      setMonth(11);
      setYear((y) => y - 1);
    } else {
      setMonth((m) => m - 1);
    }
  };

  const nextMonth = () => {
    if (month === 11) {
      setMonth(0);
      setYear((y) => y + 1);
    } else {
      setMonth((m) => m + 1);
    }
  };

  const isToday = (d: number) => {
    return d === today.getDate() && month === today.getMonth() && year === today.getFullYear();
  };

  const sessionKey = `${year}-${month + 1}-${selectedDay}`;
  const daySessions = sessionData[sessionKey] || [];

  const bookedCount = daySessions.filter((s) => s.status === 'booked' && s.client !== 'Open Consultation Slot').length;
  const availableCount = daySessions.filter((s) => s.status === 'available' || (s.client === 'Open Consultation Slot' && s.status !== 'blocked')).length;
  const blockedCount = daySessions.filter((s) => s.status === 'blocked' || s.client === 'Blocked Time Slot').length;

  // Toggle slot Block / Available in MongoDB
  const handleToggleBlockSlot = async (slotIndex: number) => {
    const slot = daySessions[slotIndex];
    if (!slot) return;

    const isCurrentlyBlocked = slot.status === 'blocked' || slot.client === 'Blocked Time Slot';
    const isBooked = slot.status === 'booked' && slot.client !== 'Open Consultation Slot' && slot.client !== 'Blocked Time Slot';

    if (isBooked) {
      showToast(`Cannot block: Slot is booked by ${slot.client}`);
      return;
    }

    const nextStatus = isCurrentlyBlocked ? 'available' : 'blocked';
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(selectedDay).padStart(2, '0')}`;

    try {
      await fetch('/api/availability/toggle-block', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slotId: slot.slotId || slot.bookingId || `SLOT-${Date.now()}`,
          isBlocked: nextStatus === 'blocked',
          therapistId: activeConsultant?.id,
          therapistName: activeConsultant?.name,
          date: dateStr,
          time: slot.time
        })
      });
    } catch {
      await fetch('http://localhost:5000/api/availability/toggle-block', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slotId: slot.slotId || slot.bookingId || `SLOT-${Date.now()}`,
          isBlocked: nextStatus === 'blocked',
          therapistId: activeConsultant?.id,
          therapistName: activeConsultant?.name,
          date: dateStr,
          time: slot.time
        })
      }).catch(() => {});
    }

    fetchLiveScheduleData();
    showToast(nextStatus === 'blocked' ? `Slot at ${slot.time} is now Blocked` : `Slot at ${slot.time} is now Available`);
    setActiveMenuSlotIndex(null);
  };

  // Submit Add Event / Session to MongoDB
  const handleCreateSessionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeConsultant) return;

    const chosenClient = dbClients.find((c) => c.name === eventClientName) || dbClients[0];
    const targetDate = eventDate || `${year}-${String(month + 1).padStart(2, '0')}-${String(selectedDay).padStart(2, '0')}`;

    const newBooking = {
      id: `BK-${Date.now().toString().slice(-6)}`,
      clientId: chosenClient?.id || 'client-user',
      clientName: chosenClient?.name || eventClientName || 'Client User',
      clientEmail: chosenClient?.email || 'client@example.com',
      consultantId: activeConsultant.id,
      consultantName: activeConsultant.name,
      therapistId: activeConsultant.id,
      therapistName: activeConsultant.name,
      serviceTitle: eventType || 'Individual Clinical Psychology',
      scheduledAt: `${targetDate}T10:00:00.000Z`,
      date: targetDate,
      time: eventTime || '10:00 AM',
      durationMinutes: parseInt(eventDuration) || 50,
      duration: eventDuration || '50 min',
      status: 'CONFIRMED',
      paymentStatus: 'PAID',
      amount: 1500,
      meetingLink: 'https://meet.google.com/hex-session-live',
      createdAt: new Date().toISOString()
    };

    try {
      let res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newBooking)
      }).catch(() => null);

      if (!res || !res.ok) {
        res = await fetch('http://localhost:5000/api/bookings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newBooking)
        }).catch(() => null);
      }

      showToast(`Session booked for ${newBooking.clientName} with ${activeConsultant.name}!`);
      fetchLiveScheduleData();
    } catch {
      showToast('Error persisting booking to database');
    }

    setIsAddEventModalOpen(false);
  };

  // Assign client to open slot in MongoDB
  const handleConfirmAssignClient = async () => {
    if (!assignTarget || !activeConsultant) return;
    const { slot } = assignTarget;

    const matchedClient = dbClients.find((c) => c.name === assignClientName) || dbClients[0];
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(selectedDay).padStart(2, '0')}`;

    const assignPayload = {
      slotId: slot.slotId || `SLOT-${Date.now()}`,
      clientName: matchedClient?.name || assignClientName || 'Client User',
      clientEmail: matchedClient?.email || 'client@example.com',
      therapistId: activeConsultant.id,
      therapistName: activeConsultant.name,
      serviceTitle: 'Individual Clinical Psychology',
      date: dateStr,
      time: slot.time
    };

    try {
      let res = await fetch('/api/availability/assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(assignPayload)
      }).catch(() => null);

      if (!res || !res.ok) {
        res = await fetch('http://localhost:5000/api/availability/assign', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(assignPayload)
        }).catch(() => null);
      }

      showToast(`Client ${assignPayload.clientName} assigned to slot at ${slot.time}!`);
      fetchLiveScheduleData();
    } catch {
      showToast('Error saving assigned client');
    }

    setIsAssignModalOpen(false);
    setAssignTarget(null);
  };

  // Save weekly working hours to MongoDB
  const handleSaveWorkingHours = async () => {
    if (!activeConsultant) return;

    try {
      let res = await fetch(`/api/consultants/${activeConsultant.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ availability: workingHours })
      }).catch(() => null);

      if (!res || !res.ok) {
        res = await fetch(`http://localhost:5000/api/consultants/${activeConsultant.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ availability: workingHours })
        }).catch(() => null);
      }

      showToast(`Working hours updated for ${activeConsultant.name} in MongoDB Atlas!`);
      if (activeConsultant) {
        activeConsultant.availability = { ...workingHours };
      }
      setWorkingHours({ ...workingHours });
      fetchLiveScheduleData();
    } catch {
      showToast('Error updating working hours');
    }

    setIsAvailabilityModalOpen(false);
  };

  return (
    <div className="space-y-6 pb-20 animate-fade-in text-slate-800 font-['Plus_Jakarta_Sans']">
      {/* Toast Notification Banner */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 bg-[#4f28d9] text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-3 animate-fade-in border border-purple-300">
          <Sparkles className="w-5 h-5 text-amber-300" />
          <span className="font-bold text-xs tracking-wide">{toastMessage}</span>
        </div>
      )}

      {/* Modern Gradient PageHeader Matching Consultant Calendar */}
      <div className="rounded-2xl sm:rounded-3xl bg-gradient-to-r from-[#431bb5] via-[#5e2be2] to-[#361394] p-6 sm:p-7 md:p-8 text-white shadow-lg shadow-purple-900/10 overflow-hidden relative mb-6 border border-white/10">
        {/* Decorative ambient background glows */}
        <div className="absolute top-0 right-0 w-[350px] h-[350px] bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 w-64 h-64 bg-purple-400/15 rounded-full blur-3xl translate-y-1/2 pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row gap-4 md:gap-5 justify-between items-start md:items-center">
          <div className="space-y-1.5 flex-1 min-w-0">
            <div className="inline-flex items-center gap-2 bg-white/15 backdrop-blur-md px-3 py-0.5 rounded-full text-[11px] font-extrabold uppercase tracking-widest text-purple-100 border border-white/20 shadow-xs mb-1">
              <CalendarDays className="w-3.5 h-3.5 text-purple-200" />
              <span>THERAPIST CALENDAR & SCHEDULER</span>
            </div>

            <h1 className="text-xl sm:text-3xl md:text-4xl font-extrabold tracking-tight text-white leading-snug">
              {activeConsultant ? `${activeConsultant.name}'s Calendar` : 'Session Schedule & Availability'}
            </h1>

            <p className="text-white/85 text-xs sm:text-sm md:text-base max-w-2xl leading-relaxed font-medium pt-0.5">
              Live appointments and availability from MongoDB Atlas for {activeConsultant?.name || 'therapists'}.
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0 pt-1 md:pt-0">
            {/* Consultant Selector */}
            <div className="inline-flex items-center gap-2 bg-white/15 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/25 shadow-xs w-auto max-w-[200px]">
              <Users className="w-4 h-4 text-purple-200 shrink-0" />
              <select
                value={selectedConsultantId}
                onChange={(e) => setSelectedConsultantId(e.target.value)}
                className="bg-transparent text-white text-xs font-bold outline-none cursor-pointer truncate [&>option]:text-slate-900"
              >
                {dbTherapists.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Set Availability Button */}
            <button
              type="button"
              onClick={() => setIsAvailabilityModalOpen(true)}
              className="border border-white/30 text-white hover:bg-white/20 font-bold text-xs px-3.5 py-1.5 rounded-full cursor-pointer bg-white/10 whitespace-nowrap shadow-xs"
            >
              Set Availability
            </button>
          </div>
        </div>
      </div>

      {/* Main 12-Column Calendar & Daily Slots Workspace */}
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm overflow-hidden grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-slate-100 min-h-[620px]">
        {/* Left Side: Month Grid & Capacity Status (5 Columns) */}
        <div className="lg:col-span-5 p-5 xl:p-6 bg-white flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">Select Date</span>
              <span className="text-xs font-bold text-[#5e2be2] bg-purple-50 px-2.5 py-0.5 rounded-full border border-purple-100">
                {MONTHS[month]} {year}
              </span>
            </div>

            {/* Month Navigational Control */}
            <div className="flex items-center justify-between mb-4 bg-slate-50 p-1.5 rounded-2xl border border-slate-100">
              <button
                onClick={prevMonth}
                className="w-8 h-8 rounded-xl bg-white hover:bg-slate-100 flex items-center justify-center text-slate-600 transition-colors shadow-xs cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="font-extrabold text-sm text-slate-900">{MONTHS[month]} {year}</span>
              <button
                onClick={nextMonth}
                className="w-8 h-8 rounded-xl bg-white hover:bg-slate-100 flex items-center justify-center text-slate-600 transition-colors shadow-xs cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Day Column Headers */}
            <div className="grid grid-cols-7 mb-2 text-center">
              {DAYS_SHORT.map((d) => (
                <div key={d} className="text-[11px] font-extrabold text-slate-400 py-1 uppercase tracking-wider">
                  {d.slice(0, 2)}
                </div>
              ))}
            </div>

            {/* Calendar Date Cells */}
            <div className="grid grid-cols-7 gap-1">
              {cells.map((day, idx) => {
                if (!day) return <div key={`empty-${idx}`} />;
                const key = `${year}-${month + 1}-${day}`;
                const count = (sessionData[key] || []).length;
                const sel = day === selectedDay;
                const tod = isToday(day);

                return (
                  <button
                    key={day}
                    onClick={() => setSelectedDay(day)}
                    className={`relative flex flex-col items-center justify-center rounded-2xl h-10 w-full text-xs font-bold transition-all cursor-pointer ${
                      sel
                        ? 'bg-[#5e2be2] text-white shadow-md shadow-[#5e2be2]/20 scale-105 z-10'
                        : tod
                        ? 'border-2 border-[#5e2be2] text-[#5e2be2] bg-purple-50/50 font-extrabold'
                        : 'text-slate-700 hover:bg-slate-100/80'
                    }`}
                  >
                    <span>{day}</span>
                    {count > 0 && !sel && (
                      <span className={`w-1.5 h-1.5 rounded-full mt-0.5 ${dotColor(count)}`} />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Monthly Capacity & Status Breakdown */}
          <div className="mt-6 pt-5 border-t border-slate-100 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">
                Monthly Real Status
              </span>
              {activeConsultant && (
                <span className="text-[10px] font-bold text-[#5e2be2] truncate max-w-[150px]">
                  {activeConsultant.name}
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="flex flex-col justify-between p-3.5 bg-slate-50 rounded-2xl border border-slate-100 space-y-1.5">
                <span className="text-slate-500 font-medium text-[11px]">{MONTHS[month]} Bookings</span>
                <span className="font-extrabold text-sm text-[#5e2be2] bg-purple-100/80 text-purple-900 px-2.5 py-1 rounded-xl w-fit border border-purple-200">
                  {Object.keys(sessionData).reduce((sum, key) => {
                    const parts = key.split('-').map(Number);
                    if (parts[0] === year && parts[1] === month + 1) {
                      return sum + (sessionData[key] || []).filter((s) => s.status === 'booked').length;
                    }
                    return sum;
                  }, 0)} Booked
                </span>
              </div>

              <div className="flex flex-col justify-between p-3.5 bg-slate-50 rounded-2xl border border-slate-100 space-y-1.5">
                <span className="text-slate-500 font-medium text-[11px]">Selected Day</span>
                <span className="font-extrabold text-[11px] text-slate-800 bg-white p-2 rounded-xl border border-slate-200 space-y-0.5">
                  <div className="text-slate-600 font-extrabold flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-slate-400 inline-block" /> {bookedCount} Booked
                  </div>
                  <div className="text-emerald-700 font-extrabold flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" /> {availableCount} Available
                  </div>
                  <div className="text-slate-600 font-extrabold flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-slate-500 inline-block" /> {blockedCount} Blocked
                  </div>
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Detailed Day Slots & Time Manager (7 Columns) */}
        <div className="lg:col-span-7 p-5 xl:p-6 bg-slate-50/30 flex flex-col overflow-y-auto">
          <div className="space-y-4">
            {/* Selected Date Header */}
            <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-extrabold text-slate-900">
                  {MONTHS[month]} {selectedDay}, {year}
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  {activeConsultant ? `${activeConsultant.name} · ` : ''}
                  {bookedCount} booked · {availableCount} available · {blockedCount} blocked
                </p>
              </div>
            </div>

            {/* Interactive Time Slots & Quick Block Chips Section */}
            <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs space-y-3">
              <div className="flex items-center justify-between gap-2 flex-wrap pb-2 border-b border-slate-100">
                <h4 className="text-xs font-black text-slate-900 tracking-tight uppercase">
                  Time Slots
                </h4>
                <div className="flex items-center gap-1.5 text-[10px] font-bold">
                  <span className="flex items-center gap-1 text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                    <span className="w-2 h-2 rounded-full bg-slate-400" />
                    Booked
                  </span>
                  <span className="flex items-center gap-1 text-emerald-800 bg-emerald-100/70 px-2 py-0.5 rounded-md border border-emerald-200">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    Available
                  </span>
                  <span className="flex items-center gap-1 text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                    <span className="w-2 h-2 rounded-full bg-slate-500" />
                    Blocked
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 pt-1">
                {daySessions.length === 0 ? (
                  <span className="text-xs text-slate-400 font-medium italic">No time slots scheduled for this day in MongoDB.</span>
                ) : (
                  daySessions.map((slot, index) => {
                    const isBooked = slot.status === 'booked' && slot.client !== 'Open Consultation Slot' && slot.client !== 'Blocked Time Slot';
                    const isBlocked = slot.status === 'blocked' || slot.client === 'Blocked Time Slot';
                    const isAvailable = slot.status === 'available' || (slot.client === 'Open Consultation Slot' && !isBlocked);

                    return (
                      <button
                        key={index}
                        type="button"
                        onClick={() => handleToggleBlockSlot(index)}
                        title={
                          isBooked
                            ? `Booked by ${slot.client} (${slot.time})`
                            : isBlocked
                            ? `Click to Unblock ${slot.time}`
                            : `Click to Block ${slot.time}`
                        }
                        className={`group relative inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer border shadow-xs active:scale-95 ${
                          isBooked
                            ? 'bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200/70 cursor-default'
                            : isAvailable
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-slate-100 hover:text-slate-800 hover:border-slate-300'
                            : 'bg-slate-100 text-slate-700 border-slate-300 hover:bg-emerald-50 hover:text-emerald-800 hover:border-emerald-300'
                        }`}
                      >
                        {isBlocked ? (
                          <Lock className="w-3.5 h-3.5 shrink-0 text-slate-500 group-hover:text-emerald-600 transition-colors" />
                        ) : isAvailable ? (
                          <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-emerald-600 group-hover:text-slate-500 transition-colors" />
                        ) : null}

                        <span>{slot.time}</span>

                        {!isBooked && (
                          <span className="hidden group-hover:inline-block text-[9px] font-black ml-0.5 underline">
                            {isBlocked ? 'Unblock' : 'Block'}
                          </span>
                        )}
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            {/* Add Session Slot Dashed Trigger */}
            <button
              onClick={() => {
                setEventDate(`${year}-${String(month + 1).padStart(2, '0')}-${String(selectedDay).padStart(2, '0')}`);
                setEventClientName(dbClients[0]?.name || '');
                setIsAddEventModalOpen(true);
              }}
              className="w-full flex items-center justify-center gap-2 rounded-2xl border border-dashed border-purple-300 bg-white text-[#5e2be2] text-xs font-extrabold py-3 hover:bg-purple-50/80 transition-all cursor-pointer shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>Add Session Slot</span>
            </button>

            {/* Session Cards Detailed List */}
            {daySessions.length === 0 ? (
              <div className="flex flex-col items-center justify-center min-h-[240px] text-center p-6 bg-white rounded-2xl border border-dashed border-slate-200">
                <CalendarDays className="w-10 h-10 text-slate-300 mb-3" />
                <p className="text-sm font-extrabold text-slate-800">
                  No sessions scheduled for {activeConsultant?.name || 'this therapist'} on this day
                </p>
                <p className="text-xs text-slate-500 mt-1 max-w-xs">
                  This day is clear in MongoDB. You can add session slots or schedule appointments anytime.
                </p>
                <button
                  onClick={() => {
                    setEventDate(`${year}-${String(month + 1).padStart(2, '0')}-${String(selectedDay).padStart(2, '0')}`);
                    setIsAddEventModalOpen(true);
                  }}
                  className="mt-4 bg-[#5e2be2] hover:bg-[#4f28d9] text-white font-bold text-xs px-4 py-2 rounded-xl shadow-md shadow-[#5e2be2]/20 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 inline mr-1" /> Schedule Session
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {daySessions.map((s, i) => {
                  const isBooked = s.status === 'booked' && s.client !== 'Open Consultation Slot' && s.client !== 'Blocked Time Slot';
                  const isBlocked = s.status === 'blocked' || s.client === 'Blocked Time Slot';
                  const isAvailable = s.status === 'available' || (s.client === 'Open Consultation Slot' && !isBlocked);

                  return (
                    <div
                      key={i}
                      className={`group flex items-center justify-between gap-3 rounded-2xl border p-3.5 transition-all bg-white shadow-xs hover:shadow-md ${
                        isBooked
                          ? 'border-slate-200/80 hover:border-slate-300'
                          : isAvailable
                          ? 'border-dashed border-emerald-300 bg-emerald-50/20 hover:bg-emerald-50/50'
                          : 'border-dashed border-slate-300 bg-slate-50 hover:bg-slate-100/60'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div
                          className={`shrink-0 w-24 text-center py-2 rounded-xl text-xs font-black transition-all ${
                            isBooked
                              ? 'bg-slate-100 text-slate-700 border border-slate-200'
                              : isAvailable
                              ? 'bg-emerald-100/80 text-emerald-800 font-black border border-emerald-200'
                              : 'bg-slate-200/80 text-slate-700 font-black border border-slate-300'
                          }`}
                        >
                          {s.time}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span
                              className={`font-extrabold text-xs sm:text-sm truncate ${
                                isBooked
                                  ? 'text-slate-900'
                                  : isAvailable
                                  ? 'text-emerald-900'
                                  : 'text-slate-700 line-through decoration-slate-400'
                              }`}
                            >
                              {s.client}
                            </span>
                          </div>
                          <p className="text-[11px] font-semibold text-slate-500 truncate mt-0.5">
                            {s.type} · {s.duration}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {isBooked ? (
                          <span className="bg-slate-100 text-slate-700 text-[10px] font-extrabold px-2.5 py-1 rounded-full border border-slate-200">
                            Confirmed
                          </span>
                        ) : isBlocked ? (
                          <span className="bg-slate-100 text-slate-700 text-[10px] font-extrabold px-2.5 py-1 rounded-full border border-slate-200 flex items-center gap-1">
                            <Lock className="w-3 h-3 text-slate-500" />
                            Blocked Slot
                          </span>
                        ) : (
                          <div className="flex items-center gap-1.5">
                            <span className="bg-emerald-100 text-emerald-800 text-[10px] font-extrabold px-2.5 py-1 rounded-full border border-emerald-200">
                              Available Slot
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                setAssignTarget({ key: sessionKey, index: i, slot: s });
                                setAssignClientName(dbClients[0]?.name || '');
                                setIsAssignModalOpen(true);
                              }}
                              className="bg-[#5e2be2] hover:bg-[#4f28d9] text-white font-extrabold text-[11px] h-7 px-2.5 rounded-lg shadow-xs cursor-pointer"
                            >
                              + Book Client
                            </button>
                          </div>
                        )}

                        {/* Dropdown Options */}
                        <div className="relative">
                          <button
                            type="button"
                            onClick={() => setActiveMenuSlotIndex(activeMenuSlotIndex === i ? null : i)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all cursor-pointer"
                          >
                            <MoreVertical className="w-4 h-4" />
                          </button>

                          {activeMenuSlotIndex === i && (
                            <div className="absolute right-0 mt-1 w-44 bg-white rounded-xl shadow-xl border border-slate-100 p-1 z-30 animate-fade-in text-left">
                              {!isBooked ? (
                                <button
                                  type="button"
                                  onClick={() => handleToggleBlockSlot(i)}
                                  className="w-full text-left flex items-center gap-2 px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 rounded-lg"
                                >
                                  {isBlocked ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> : <Lock className="w-3.5 h-3.5 text-slate-500" />}
                                  <span>{isBlocked ? 'Make Available' : 'Block Slot'}</span>
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={async () => {
                                    if (s.bookingId) {
                                      await fetch(`/api/bookings/${s.bookingId}`, { method: 'DELETE' }).catch(() => 
                                        fetch(`http://localhost:5000/api/bookings/${s.bookingId}`, { method: 'DELETE' })
                                      );
                                    }
                                    fetchLiveScheduleData();
                                    showToast('Booking cancelled');
                                    setActiveMenuSlotIndex(null);
                                  }}
                                  className="w-full text-left flex items-center gap-2 px-2.5 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-lg"
                                >
                                  <Ban className="w-3.5 h-3.5 text-rose-600" />
                                  <span>Cancel Booking</span>
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── MODAL: Add Event / Schedule Session ─────────────────────────────────── */}
      {isAddEventModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full max-h-[85vh] shadow-2xl border border-slate-100 flex flex-col my-auto overflow-hidden animate-fade-in">
            <div className="flex items-center justify-between p-5 sm:p-6 pb-4 border-b border-slate-100 shrink-0 bg-slate-50/50">
              <div className="flex items-center gap-2.5">
                <span className="p-2 rounded-xl bg-purple-100 text-[#5e2be2]">
                  <CalendarDays className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-base">Schedule Therapy Session</h3>
                  <p className="text-xs text-slate-400">Book a new appointment for {activeConsultant?.name}</p>
                </div>
              </div>
              <button
                onClick={() => setIsAddEventModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 cursor-pointer transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSessionSubmit} className="flex flex-col flex-1 overflow-hidden">
              <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-4 text-xs overscroll-contain">
                <div className="space-y-1.5">
                  <label className="font-extrabold text-slate-700">Select Client</label>
                  <select
                    value={eventClientName}
                    onChange={(e) => setEventClientName(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-800 outline-none focus:border-[#5e2be2]"
                    required
                  >
                    {dbClients.map((c) => (
                      <option key={c.id} value={c.name}>
                        {c.name} ({c.email})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="font-extrabold text-slate-700">Date</label>
                    <input
                      type="date"
                      value={eventDate}
                      onChange={(e) => setEventDate(e.target.value)}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-800 outline-none focus:border-[#5e2be2]"
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="font-extrabold text-slate-700">Time</label>
                    <input
                      type="text"
                      value={eventTime}
                      onChange={(e) => setEventTime(e.target.value)}
                      placeholder="10:00 AM"
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-800 outline-none focus:border-[#5e2be2]"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="font-extrabold text-slate-700">Duration</label>
                    <select
                      value={eventDuration}
                      onChange={(e) => setEventDuration(e.target.value)}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-800 outline-none focus:border-[#5e2be2]"
                    >
                      <option value="30 min">30 Minutes</option>
                      <option value="50 min">50 Minutes (Standard)</option>
                      <option value="60 min">60 Minutes</option>
                      <option value="90 min">90 Minutes (Intake)</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="font-extrabold text-slate-700">Modality / Service</label>
                    <select
                      value={eventType}
                      onChange={(e) => setEventType(e.target.value)}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-800 outline-none focus:border-[#5e2be2]"
                    >
                      <option value="Individual Clinical Psychology">Individual Therapy</option>
                      <option value="Comprehensive CBT Care">Comprehensive CBT</option>
                      <option value="Couples & Relationship Counseling">Couples Counseling</option>
                      <option value="ADHD & Executive Functioning">ADHD Coaching</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="p-4 sm:p-5 border-t border-slate-100 bg-slate-50/80 flex items-center justify-end gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsAddEventModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 font-bold hover:bg-slate-200 cursor-pointer transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-[#5e2be2] hover:bg-[#4f28d9] text-white font-extrabold shadow-md shadow-[#5e2be2]/20 cursor-pointer transition-all active:scale-95"
                >
                  Confirm & Schedule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: Set Weekly Availability / Working Hours ──────────────────────── */}
      {isAvailabilityModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-xl w-full max-h-[85vh] shadow-2xl border border-slate-100 flex flex-col my-auto overflow-hidden animate-fade-in">
            <div className="flex items-center justify-between p-5 sm:p-6 pb-4 border-b border-slate-100 shrink-0 bg-slate-50/50">
              <div>
                <h3 className="font-extrabold text-slate-900 text-base">Configure Working Hours</h3>
                <p className="text-xs text-slate-400">Set weekly active hours for {activeConsultant?.name}</p>
              </div>
              <button
                onClick={() => setIsAvailabilityModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 cursor-pointer transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-3 text-xs overscroll-contain">
              {Object.entries(workingHours).map(([dayKey, dayVal]) => {
                const dayLabel = dayKey.charAt(0).toUpperCase() + dayKey.slice(1);
                return (
                  <div key={dayKey} className="flex items-center justify-between p-3 rounded-2xl border border-slate-100 bg-slate-50/60 hover:bg-slate-50 transition-colors">
                    <label className="flex items-center gap-2.5 cursor-pointer w-32 select-none">
                      <input
                        type="checkbox"
                        checked={dayVal.enabled}
                        onChange={(e) => {
                          setWorkingHours({
                            ...workingHours,
                            [dayKey]: { ...dayVal, enabled: e.target.checked }
                          });
                        }}
                        className="w-4 h-4 rounded border-slate-300 text-[#5e2be2] focus:ring-[#5e2be2] accent-[#5e2be2] cursor-pointer"
                      />
                      <span className="font-extrabold text-slate-800">{dayLabel}</span>
                    </label>

                    {dayVal.enabled ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={dayVal.start}
                          onChange={(e) => {
                            setWorkingHours({
                              ...workingHours,
                              [dayKey]: { ...dayVal, start: e.target.value }
                            });
                          }}
                          className="w-24 p-2 bg-white border border-slate-200 rounded-xl text-center font-bold text-slate-800 focus:border-[#5e2be2] outline-none"
                        />
                        <span className="text-slate-400 font-bold">to</span>
                        <input
                          type="text"
                          value={dayVal.end}
                          onChange={(e) => {
                            setWorkingHours({
                              ...workingHours,
                              [dayKey]: { ...dayVal, end: e.target.value }
                            });
                          }}
                          className="w-24 p-2 bg-white border border-slate-200 rounded-xl text-center font-bold text-slate-800 focus:border-[#5e2be2] outline-none"
                        />
                      </div>
                    ) : (
                      <span className="text-slate-400 font-medium italic pr-2">Unavailable</span>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="p-4 sm:p-5 border-t border-slate-100 bg-slate-50/80 flex items-center justify-end gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setIsAvailabilityModalOpen(false)}
                className="px-4 py-2 rounded-xl text-slate-600 font-bold hover:bg-slate-200 cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveWorkingHours}
                className="px-5 py-2.5 rounded-xl bg-[#5e2be2] hover:bg-[#4f28d9] text-white font-extrabold shadow-md shadow-[#5e2be2]/20 cursor-pointer transition-all active:scale-95"
              >
                Save Availability
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: Assign Client to Open Slot ─────────────────────────────────── */}
      {isAssignModalOpen && assignTarget && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-md w-full max-h-[85vh] shadow-2xl border border-slate-100 flex flex-col my-auto overflow-hidden animate-fade-in">
            <div className="flex items-center justify-between p-5 sm:p-6 pb-4 border-b border-slate-100 shrink-0 bg-slate-50/50">
              <div>
                <h3 className="font-extrabold text-slate-900 text-base">Assign Client to Slot</h3>
                <p className="text-xs text-slate-400">{assignTarget.slot.time} on {MONTHS[month]} {selectedDay}</p>
              </div>
              <button
                onClick={() => setIsAssignModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 cursor-pointer transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-3 text-xs overscroll-contain">
              <label className="font-extrabold text-slate-700 block">Select Patient / Client</label>
              <select
                value={assignClientName}
                onChange={(e) => setAssignClientName(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-800 outline-none focus:border-[#5e2be2]"
              >
                {dbClients.map((c) => (
                  <option key={c.id} value={c.name}>
                    {c.name} ({c.email})
                  </option>
                ))}
              </select>
            </div>

            <div className="p-4 sm:p-5 border-t border-slate-100 bg-slate-50/80 flex items-center justify-end gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setIsAssignModalOpen(false)}
                className="px-4 py-2 rounded-xl text-slate-600 font-bold hover:bg-slate-200 cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmAssignClient}
                className="px-5 py-2.5 rounded-xl bg-[#5e2be2] hover:bg-[#4f28d9] text-white font-extrabold shadow-md shadow-[#5e2be2]/20 cursor-pointer transition-all active:scale-95"
              >
                Confirm Assignment
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
