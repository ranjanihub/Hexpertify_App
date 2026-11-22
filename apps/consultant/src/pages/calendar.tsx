import { useState, useMemo, useEffect } from "react";
import { useGetCalendarEvents } from "@workspace/api-client-react";
import SetAvailabilityDialog from "@/components/SetAvailabilityDialog";
import PlanMonthDialog from "@/components/PlanMonthDialog";
import { monthName, monthOf, shiftMonth } from "@/lib/month-plan";
import AddEventDialog from "@/components/AddEventDialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  ChevronLeft,
  ChevronRight,
  Video,
  Clock,
  Plus,
  Globe,
  Users,
  CalendarDays,
  CheckCircle2,
  Sparkles,
  Calendar as CalendarIcon,
  Trash2,
  Lock,
  Unlock,
  Ban,
  MoreVertical,
  User,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/page-header";
import { getAuthUser } from "@/lib/auth";

/* ─── helpers ─────────────────────────────────────────────── */
const DAYS_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"];

function startOfMonth(y: number, m: number) { return new Date(y, m, 1).getDay(); }
function daysInMonth(y: number, m: number) { return new Date(y, m + 1, 0).getDate(); }

function checkCanCancelSlot(key: string, timeStr: string): { canCancel: boolean; hoursLeft: number } {
  try {
    const parts = key.split("-");
    if (parts.length !== 3) return { canCancel: true, hoursLeft: 24 };

    const y = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10) - 1;
    const d = parseInt(parts[2], 10);

    const match = timeStr.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
    if (!match) return { canCancel: true, hoursLeft: 24 };

    let h = parseInt(match[1], 10);
    const min = parseInt(match[2], 10);
    const ampm = match[3].toUpperCase();

    if (ampm === "PM" && h < 12) h += 12;
    if (ampm === "AM" && h === 12) h = 0;

    const slotDate = new Date(y, m, d, h, min);
    const now = new Date();

    const diffHours = (slotDate.getTime() - now.getTime()) / (1000 * 60 * 60);

    return {
      canCancel: diffHours >= 3,
      hoursLeft: Math.max(0, Math.round(diffHours * 10) / 10),
    };
  } catch {
    return { canCancel: true, hoursLeft: 24 };
  }
}

export type SessionStatus = "booked" | "available" | "blocked";

export interface SessionSlot {
  client: string;
  initials: string;
  time: string;
  type: string;
  duration: string;
  status: SessionStatus;
  bookingId?: string;
  consultantId?: string;
  consultantName?: string;
  /** Booking status from the backend, e.g. CONFIRMED or COMPLETED */
  bookingStatus?: string;
  /** Availability collection entry (blocked or open time) */
  slotId?: string;
  /** Old calendar placeholder stored as a booking (status BLOCKED / AVAILABLE) */
  legacyPlaceholder?: boolean;
  /** Start time in minutes after midnight */
  startMin?: number;
  /** The slot has already started */
  past?: boolean;
  /** Covered by a whole-day block */
  dayBlocked?: boolean;
}

const DEFAULT_DAY_SLOTS: SessionSlot[] = [];

/** Minutes after midnight for "9:00 AM", "09:00 AM - 10:00 AM" or "14:00" */
function minutesOf(label: unknown): number | null {
  const m = String(label ?? '').split(/\s+-\s+|–|—/)[0].trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
  if (!m) return null;
  let h = parseInt(m[1], 10);
  const min = parseInt(m[2], 10);
  const ampm = (m[3] || '').toUpperCase();
  if (ampm === 'PM' && h < 12) h += 12;
  if (ampm === 'AM' && h === 12) h = 0;
  return h * 60 + min;
}

/** "09:00 AM" (the Backend's slot label) */
function labelOf(total: number): string {
  const h = Math.floor(total / 60) % 24;
  const h12 = h % 12 || 12;
  return `${String(h12).padStart(2, '0')}:${String(total % 60).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`;
}

const SLOT_RANK: Record<SessionStatus, number> = { booked: 3, blocked: 2, available: 1 };

/** Calendar key "2026-10-5" for a "2026-10-05" day */
function dayKeyOf(date: unknown): string | null {
  const m = String(date || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return m ? `${+m[1]}-${+m[2]}-${+m[3]}` : null;
}

/** "2026-10-05" for a calendar key "2026-10-5" */
function keyToDate(key: string): string {
  const [y, m, d] = key.split("-");
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

/** Old calendar placeholders were stored as bookings; they are not client sessions */
function isPlaceholderBooking(b: any): boolean {
  const status = String(b?.status || '').toUpperCase();
  return status === 'BLOCKED' || status === 'AVAILABLE' || b?.clientName === 'Blocked Time Slot' || b?.clientName === 'Open Consultation Slot';
}

/** The logged-in therapist's Consultant record, matched by email (falls back to an exact name match) */
function findMyConsultant<T extends { id: string; name: string; email?: string }>(consultants: T[], authUser: { email?: string; name?: string } | null): T | undefined {
  const email = (authUser?.email || '').toLowerCase().trim();
  const byEmail = email ? consultants.find((c) => (c.email || '').toLowerCase().trim() === email) : undefined;
  if (byEmail) return byEmail;
  const clean = (v: string) => v.toLowerCase().replace(/^dr\.?\s*/i, '').trim();
  const name = clean(authUser?.name || '');
  return name ? consultants.find((c) => clean(c.name || '') === name) : undefined;
}

const STATUS_LABELS: Record<string, string> = {
  CONFIRMED: 'Confirmed',
  RESCHEDULED: 'Rescheduled',
  PENDING: 'Pending',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
  NO_SHOW_CLIENT: 'No-show (client)',
  NO_SHOW_CONSULTANT: 'No-show (therapist)'
};

/* Session dot indicator colours */
function dotColor(count: number) {
  if (count >= 5) return "bg-[#5e2be2]";
  if (count >= 3) return "bg-[#5e2be2]/60";
  return "bg-[#5e2be2]/30";
}

/* ─── component ───────────────────────────────────────────── */
export default function Calendar() {
  const { toast } = useToast();
  const today = useMemo(() => new Date(), []);
  const authUser = useMemo(() => getAuthUser(), []);

  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [selectedDay, setSelectedDay] = useState(today.getDate());
  const [availabilityOpen, setAvailabilityOpen] = useState(false);
  const [planOpen, setPlanOpen] = useState(false);
  const [planMonth, setPlanMonth] = useState<string | undefined>(undefined);
  const upcomingMonth = shiftMonth(monthOf(new Date()), 1);
  // From the 20th, remind the therapist to plan next month (null = unknown / not checked yet)
  const [nextMonthPlanned, setNextMonthPlanned] = useState<boolean | null>(null);
  const [addEventOpen, setAddEventOpen] = useState(false);
  const [confirmedSlot, setConfirmedSlot] = useState<string | null>(null);

  // Dynamic session data state from MongoDB database
  const [allRawBookings, setAllRawBookings] = useState<any[]>([]);
  const [dbConsultants, setDbConsultants] = useState<{ id: string; _id?: string; name: string; email?: string; specialty?: string }[]>([]);
  const [selectedConsultantId, setSelectedConsultantId] = useState<string>("");
  const [isDbLoading, setIsDbLoading] = useState(true);
  const [dbClients, setDbClients] = useState<{ id: string; name: string; email: string }[]>([]);

  // Blocked / open time (Availability collection) for the logged-in therapist
  const [availabilityItems, setAvailabilityItems] = useState<any[]>([]);

  // Fetch real database bookings, consultants, and users from MongoDB Atlas
  useEffect(() => {
    let isMounted = true;
    async function loadDbData() {
      try {
        setIsDbLoading(true);
        const consultantsRes = await fetch('/api/consultants').catch(() => null);

        let loadedConsultants: any[] = [];
        if (consultantsRes && consultantsRes.ok) {
          const cData = await consultantsRes.json();
          const rawConsultants = Array.isArray(cData?.consultants) ? cData.consultants : Array.isArray(cData) ? cData : [];
          loadedConsultants = rawConsultants.map((c: any) => ({
            id: String(c._id || c.id),
            name: c.name || 'Therapist',
            email: c.email || '',
            specialty: c.specialty || c.title || 'Psychologist'
          }));
          if (isMounted) {
            setDbConsultants(loadedConsultants);
          }
        }

        // The logged-in therapist's Consultant record, matched by email (the login id is a User id, not a consultant id)
        const mine = findMyConsultant(loadedConsultants, authUser);
        if (isMounted) setSelectedConsultantId(mine?.id || '');
        if (!mine) {
          if (isMounted) {
            setAllRawBookings([]);
            setAvailabilityItems([]);
          }
          return;
        }

        const [bookingsRes, usersRes, availabilityRes] = await Promise.all([
          fetch(`/api/bookings?consultantId=${encodeURIComponent(mine.id)}`).catch(() => null),
          fetch(`/api/users?consultantId=${encodeURIComponent(mine.id)}&consultantName=${encodeURIComponent(mine.name || '')}&role=client`).catch(() => null),
          fetch(`/api/availability?consultantId=${encodeURIComponent(mine.id)}`).catch(() => null)
        ]);

        if (availabilityRes && availabilityRes.ok) {
          const aData = await availabilityRes.json();
          const rawSlots = Array.isArray(aData?.slots) ? aData.slots : [];
          // Dated blocked/open entries of the Availability collection (booking-derived and weekly entries are excluded)
          const ownSlots = rawSlots.filter((s: any) =>
            !s.bookingId && /^\d{4}-\d{2}-\d{2}$/.test(String(s.date || '')) &&
            ['blocked', 'available'].includes(String(s.status || '').toLowerCase()) &&
            String(s.therapistId || s.consultantId || '') === mine.id
          );
          if (isMounted) setAvailabilityItems(ownSlots);
        }

        if (usersRes && usersRes.ok) {
          const uData = await usersRes.json();
          const rawUsers = Array.isArray(uData?.users) ? uData.users : Array.isArray(uData) ? uData : [];
          if (isMounted) {
            setDbClients(rawUsers.map((u: any) => ({
              id: String(u._id || u.id),
              name: u.name || 'Client',
              email: u.email || ''
            })));
          }
        }

        if (bookingsRes && bookingsRes.ok) {
          const data = await bookingsRes.json();
          const rawBookings = Array.isArray(data?.bookings) ? data.bookings : [];
          if (isMounted) {
            setAllRawBookings(rawBookings);
          }
        }

      } catch (err) {
        console.error('Error fetching calendar data from DB:', err);
      } finally {
        if (isMounted) setIsDbLoading(false);
      }
    }

    loadDbData();
    return () => { isMounted = false; };
  }, [authUser?.name, authUser?.email]);

  // The logged-in therapist's Consultant record (its _id is the consultantId bookings store)
  const activeConsultant = useMemo(() => {
    const matched = dbConsultants.find((c) => c.id === selectedConsultantId);
    if (matched) {
      return {
        ...matched,
        name: authUser?.name || matched.name
      };
    }

    return {
      id: selectedConsultantId,
      name: authUser?.name || 'Therapist',
      email: authUser?.email || '',
      specialty: authUser?.profession || 'Psychologist'
    };
  }, [dbConsultants, selectedConsultantId, authUser]);

  // Compute per-therapist sessionData (bookings are already fetched for this consultant only)
  const sessionData = useMemo<Record<string, SessionSlot[]>>(() => {
    const grouped: Record<string, SessionSlot[]> = {};
    const push = (key: string | null, slot: SessionSlot) => {
      if (!key) return;
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(slot);
    };

    allRawBookings.forEach((b: any) => {
      // Website bookings are paid first and scheduled later: they have no calendar day yet
      if (b.toBeScheduled) return;
      const key = dayKeyOf(b.date) || dayKeyOf(b.scheduledAt ? new Date(b.scheduledAt).toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }) : null);
      const status = String(b.status || 'CONFIRMED').toUpperCase();
      const isPlaceholder = isPlaceholderBooking(b);
      const initials = (b.clientName || 'Client').split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2) || 'CL';

      push(key, {
        client: b.clientName || b.clientEmail || 'Client Record',
        initials,
        time: b.time || (b.scheduledAt ? new Date(b.scheduledAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' }) : ''),
        type: b.serviceTitle || 'Individual Therapy',
        duration: `${b.durationMinutes || b.duration || 50} min`,
        status: isPlaceholder
          ? (status === 'BLOCKED' || b.clientName === 'Blocked Time Slot' ? 'blocked' : 'available')
          : status === 'CANCELLED' ? 'available' : 'booked',
        bookingStatus: status,
        bookingId: b.id || b._id,
        consultantId: b.consultantId || b.therapistId,
        consultantName: b.consultantName || b.therapistName,
        legacyPlaceholder: isPlaceholder
      });
    });

    // Blocked and open time stored in the Availability collection
    availabilityItems.forEach((a: any) => {
      const blocked = String(a.status || '').toLowerCase() === 'blocked';
      push(dayKeyOf(a.date), {
        client: blocked ? 'Blocked Time Slot' : 'Open Consultation Slot',
        initials: blocked ? 'BL' : 'OP',
        time: a.time || a.startTime || 'All day',
        type: blocked ? 'Unavailable / Blocked by Therapist' : 'Available for Client Booking',
        duration: `${a.durationMinutes || 50} min`,
        status: blocked ? 'blocked' : 'available',
        slotId: a.id || a._id,
        consultantId: a.therapistId || a.consultantId,
        consultantName: a.therapistName
      });
    });

    return grouped;
  }, [allRawBookings, availabilityItems]);

  // All past and upcoming bookings for the logged-in therapist: unscheduled website bookings first, then most recent first
  const therapistBookingsList = useMemo(() => {
    const when = (b: any) => {
      const t = new Date(b.scheduledAt || b.date || 0).getTime();
      return isNaN(t) ? 0 : t;
    };
    return allRawBookings
      .filter((b: any) => !isPlaceholderBooking(b))
      .sort((a: any, b: any) => {
        if (a.toBeScheduled !== b.toBeScheduled) return a.toBeScheduled ? -1 : 1;
        return when(b) - when(a);
      });
  }, [allRawBookings]);

  const handleJumpToBookingDate = (dateStr: string) => {
    try {
      const m = String(dateStr || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
      const d = m ? new Date(+m[1], +m[2] - 1, +m[3]) : new Date(dateStr);
      if (!isNaN(d.getTime())) {
        setYear(d.getFullYear());
        setMonth(d.getMonth());
        setSelectedDay(d.getDate());
        window.scrollTo({ top: 0, behavior: 'smooth' });
        toast({
          title: "Calendar Focused 📅",
          description: `Focused calendar on ${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}.`,
        });
      }
    } catch {}
  };

  // Reschedule dialog state
  const [confirmRescheduleOpen, setConfirmRescheduleOpen] = useState(false);
  const [rescheduleModalOpen, setRescheduleModalOpen] = useState(false);
  const [rescheduleTarget, setRescheduleTarget] = useState<{ key: string; index: number; session: SessionSlot } | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState(`${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`);
  const [rescheduleTime, setRescheduleTime] = useState("10:00 AM");
  const [rescheduleReason, setRescheduleReason] = useState("");

  // Assign client dialog state
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [assignTarget, setAssignTarget] = useState<{ key: string; index: number; slot: SessionSlot } | null>(null);
  const [assignClientName, setAssignClientName] = useState("");
  const [assignType, setAssignType] = useState("Individual Therapy");

  const sessionKey = `${year}-${month + 1}-${selectedDay}`;
  const selectedDate = keyToDate(sessionKey);

  // The bookable one-hour slots clients see (weekly hours plus extra opened hours), loaded a month at a time
  const [offeredByDate, setOfferedByDate] = useState<Record<string, { start: string; startAt: string }[]>>({});
  const [slotsVersion, setSlotsVersion] = useState(0);
  const refreshSlots = () => setSlotsVersion(v => v + 1);

  useEffect(() => {
    if (!selectedConsultantId) return;
    let active = true;
    const from = keyToDate(`${year}-${month + 1}-1`);
    const to = keyToDate(`${year}-${month + 1}-${daysInMonth(year, month)}`);
    fetch(`/api/availability/slots?consultantId=${encodeURIComponent(selectedConsultantId)}&from=${from}&to=${to}`)
      .then(res => (res.ok ? res.json() : null))
      .then(data => {
        if (!active || !data?.days) return;
        setOfferedByDate(prev => ({ ...prev, ...data.days }));
      })
      .catch(() => {});
    return () => { active = false; };
  }, [selectedConsultantId, year, month, slotsVersion]);

  useEffect(() => {
    if (!selectedConsultantId || new Date().getDate() < 20) return;
    let active = true;
    fetch(`/api/availability/month-plan?consultantId=${encodeURIComponent(selectedConsultantId)}&month=${upcomingMonth}`)
      .then(res => (res.ok ? res.json() : null))
      .then(data => { if (active && data) setNextMonthPlanned(Boolean(data.plan)); })
      .catch(() => {});
    return () => { active = false; };
  }, [selectedConsultantId, upcomingMonth, slotsVersion]);

  const openPlan = (m?: string) => {
    setPlanMonth(m);
    setPlanOpen(true);
  };

  const offeredLoaded = selectedDate in offeredByDate;
  const offered = { slots: offeredByDate[selectedDate] || [] };

  // One entry per start time: bookings first, then blocked time, then open hours
  const { daySessions, dayBlock } = useMemo(() => {
    const now = Date.now();
    const byMin = new Map<number, SessionSlot>();
    const untimed: SessionSlot[] = [];
    let block: SessionSlot | null = null;

    (sessionData[sessionKey] ?? DEFAULT_DAY_SLOTS).forEach((s) => {
      // A cancelled booking frees its hour, which then shows from the schedule
      if (s.status === 'available' && !s.slotId && !s.legacyPlaceholder) return;
      const min = minutesOf(s.time);
      if (min === null) {
        if (s.status === 'blocked') block = s;
        else if (s.status === 'booked') untimed.push(s);
        return;
      }
      const prev = byMin.get(min);
      if (!prev || SLOT_RANK[s.status] > SLOT_RANK[prev.status]) byMin.set(min, { ...s, startMin: min });
    });

    if (offeredLoaded) {
      offered.slots.forEach((o) => {
        const min = minutesOf(o.start);
        if (min === null) return;
        const past = new Date(o.startAt).getTime() <= now;
        const prev = byMin.get(min);
        if (prev) {
          byMin.set(min, { ...prev, past });
          return;
        }
        byMin.set(min, {
          client: 'Open Consultation Slot',
          initials: 'OP',
          time: o.start,
          type: 'Open for client booking',
          duration: '60 min',
          status: 'available',
          startMin: min,
          past
        });
      });
    }

    const list = [...Array.from(byMin.values()).sort((a, b) => (a.startMin ?? 0) - (b.startMin ?? 0)), ...untimed]
      .map((s) => (block && s.status === 'available' ? { ...s, dayBlocked: true } : s));
    return { daySessions: list, dayBlock: block as SessionSlot | null };
  }, [sessionData, sessionKey, offeredByDate, selectedDate]);

  const bookedSessions = daySessions.filter(s => s.status === 'booked');
  const bookedCount = bookedSessions.length;
  const availableCount = daySessions.filter(s => s.status === 'available' && !s.past && !s.dayBlocked).length;
  const blockedCount = daySessions.filter(s => s.status === 'blocked' || s.dayBlocked).length;
  const openFutureCount = availableCount;

  /* calendar grid */
  const firstDay = startOfMonth(year, month);
  const totalDays = daysInMonth(year, month);
  const cells = Array.from({ length: firstDay + totalDays }, (_, i) =>
    i < firstDay ? null : i - firstDay + 1
  );

  const prevMonth = () => {
    if (month === 0) { setYear(y => y - 1); setMonth(11); }
    else setMonth(m => m - 1);
    setSelectedDay(1);
  };
  const nextMonth = () => {
    if (month === 11) { setYear(y => y + 1); setMonth(0); }
    else setMonth(m => m + 1);
    setSelectedDay(1);
  };

  const isToday = (d: number) =>
    d === today.getDate() && month === today.getMonth() && year === today.getFullYear();

  /** Blocks or opens a time in the Availability collection (the same records the admin panel toggles) */
  const saveTimeBlock = (date: string, rawTime: string, isBlocked: boolean, slotId?: string) => {
    const status = isBlocked ? 'Blocked' : 'Available';
    // Same label as the slot list ("09:00 AM"); an empty time is the whole day
    const min = minutesOf(rawTime);
    const time = min === null ? '' : labelOf(min);
    const localId = slotId || `BLOCK-${selectedConsultantId}-${date}-${String(time || 'all-day').replace(/\s+/g, '')}`;
    setAvailabilityItems(prev => {
      const others = prev.filter(a => (a.id || a._id) !== localId);
      return [...others, { id: localId, therapistId: selectedConsultantId, therapistName: activeConsultant?.name, date, time, status }];
    });
    fetch('/api/availability/toggle-block', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...(slotId ? { slotId } : {}),
        isBlocked,
        therapistId: selectedConsultantId,
        therapistName: activeConsultant?.name || authUser?.name || 'Therapist',
        date,
        time
      })
    })
      .then(res => (res.ok ? refreshSlots() : Promise.reject(new Error('Request failed'))))
      .catch(() => toast({ title: "Could not update the time slot", description: "Please try again.", variant: "destructive" }));
  };

  /** Blocks or reopens the whole selected day */
  const handleToggleDayBlock = () => {
    if (!selectedConsultantId) {
      toast({ title: "Therapist profile not found", description: "Your consultant profile could not be loaded. Please sign in again.", variant: "destructive" });
      return;
    }
    const unblock = Boolean(dayBlock);
    saveTimeBlock(selectedDate, '', !unblock, dayBlock?.slotId);
    toast({
      title: unblock ? "Day reopened" : "Whole day blocked",
      description: unblock
        ? `Clients can book your open hours on ${MONTHS[month]} ${selectedDay} again.`
        : `Clients cannot book any time on ${MONTHS[month]} ${selectedDay}. Booked sessions stay as they are.`,
    });
  };

  const handleToggleBlockSlot = (key: string, index: number) => {
    const slot = daySessions[index];
    if (!slot) return;

    if (slot.status === "booked") {
      toast({
        title: "Booked Client Session",
        description: `This slot is currently booked for ${slot.client}. Please reschedule or cancel the session to alter availability.`,
      });
      return;
    }
    if (slot.dayBlocked) {
      toast({ title: "The whole day is blocked", description: "Click \"Unblock day\" first to open single hours." });
      return;
    }
    if (slot.past) {
      toast({ title: "This time has passed", description: "Only upcoming slots can be blocked or opened." });
      return;
    }

    const isCurrentlyBlocked = slot.status === "blocked";
    const newStatus = isCurrentlyBlocked ? "available" : "blocked";
    if (!selectedConsultantId) {
      toast({ title: "Therapist profile not found", description: "Your consultant profile could not be loaded. Please sign in again.", variant: "destructive" });
      return;
    }

    // Old placeholders stored as bookings are replaced by an Availability entry
    if (slot.legacyPlaceholder && slot.bookingId) {
      setAllRawBookings(prev => prev.filter(b => b.id !== slot.bookingId && b._id !== slot.bookingId));
      fetch(`/api/bookings/${slot.bookingId}`, { method: 'DELETE' }).catch(() => {});
    }
    saveTimeBlock(keyToDate(key), slot.time, newStatus === "blocked", slot.slotId);

    toast({
      title: isCurrentlyBlocked ? "Slot Unblocked" : "Slot Blocked",
      description: isCurrentlyBlocked
        ? `Time slot at ${slot.time} is now open and available for client bookings.`
        : `Time slot at ${slot.time} has been blocked from client bookings.`,
    });
  };

  /** Creates a confirmed session for this therapist; returns the stored booking or null (after a toast) */
  const createBookingInDb = async (fields: Record<string, any>, viaSlotId?: string): Promise<any | null> => {
    try {
      const body = {
        ...fields,
        consultantId: selectedConsultantId,
        consultantName: activeConsultant?.name || authUser?.name || 'Therapist',
        status: 'CONFIRMED'
      };
      const res = await fetch(viaSlotId ? '/api/availability/assign' : '/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(viaSlotId ? { ...body, slotId: viaSlotId } : body)
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.booking) throw new Error(data?.error || 'Request failed');
      setAllRawBookings(prev => [data.booking, ...prev.filter(b => b.id !== data.booking.id)]);
      if (viaSlotId) setAvailabilityItems(prev => prev.filter(a => (a.id || a._id) !== viaSlotId));
      return data.booking;
    } catch (e: any) {
      console.error('Error saving booking to DB:', e);
      toast({ title: "Could not book the session", description: e?.message || "Please try again.", variant: "destructive" });
      return null;
    }
  };

  const handleAddSlotFromDialog = async (newSlot: { date: string; time: string; endTime?: string; title: string; client: string; type: string; duration: string; status: SessionStatus }) => {
    const parts = newSlot.date.split("-");
    if (parts.length === 3) {
      setYear(parseInt(parts[0]));
      setMonth(parseInt(parts[1]) - 1);
      setSelectedDay(parseInt(parts[2]));
    }

    if (!selectedConsultantId) {
      toast({ title: "Therapist profile not found", description: "Your consultant profile could not be loaded. Please sign in again.", variant: "destructive" });
      return;
    }

    // Blocked / open time lives in the Availability collection, not in bookings
    if (newSlot.status === 'blocked' || newSlot.status === 'available') {
      // One entry per hour from the start time up to the end time
      const from = minutesOf(newSlot.time);
      const to = minutesOf(newSlot.endTime);
      if (from === null) return;
      const starts: number[] = [];
      for (let m = from; to !== null && m + 60 <= to; m += 60) starts.push(m);
      if (!starts.length) starts.push(from);
      starts.forEach((m) => saveTimeBlock(newSlot.date, labelOf(m), newSlot.status === 'blocked'));
      toast({
        title: newSlot.status === 'blocked' ? "Time blocked" : "Extra hours opened",
        description: `${labelOf(from)} – ${labelOf(starts[starts.length - 1] + 60)} on ${newSlot.date} ${newSlot.status === 'blocked' ? 'is blocked for clients' : 'is open for client booking'}.`,
      });
      return;
    } else {
      const matchedClient = dbClients.find(c => c.name === newSlot.client || c.email === newSlot.client);
      // The Backend resolves ids, price and the India-time scheduledAt from date + time
      const created = await createBookingInDb({
        clientId: matchedClient?.id || undefined,
        clientName: newSlot.client,
        clientEmail: matchedClient?.email || undefined,
        serviceTitle: newSlot.type || newSlot.title || 'Individual Therapy',
        date: newSlot.date,
        time: newSlot.time,
        durationMinutes: parseInt(newSlot.duration) || 50
      });
      if (!created) return;
    }

    toast({
      title: "Session Slot Added! 📅",
      description: `Successfully added ${newSlot.status} slot for ${newSlot.client} at ${newSlot.time} on ${newSlot.date}.`,
    });
  };

  const handleConfirmCancelBooking = async () => {
    if (!rescheduleTarget) return;

    const { session } = rescheduleTarget;

    if (session.bookingId) {
      try {
        await fetch(`/api/bookings/${session.bookingId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'CANCELLED' })
        });
      } catch (e) {
        console.error('Error cancelling booking in DB:', e);
      }
    }

    setAllRawBookings(prev => prev.map(b => (b.id === session.bookingId || b._id === session.bookingId) ? { ...b, status: 'CANCELLED' } : b));

    setConfirmRescheduleOpen(false);
    setRescheduleTarget(null);

    toast({
      title: "Booking Cancelled",
      description: `The booking for ${session.client} at ${session.time} has been cancelled.`,
    });
  };

  // Completing a session asks the client for post-session feedback on their next visit
  const handleMarkCompleted = async (session: SessionSlot) => {
    if (!session.bookingId) return;
    try {
      const res = await fetch(`/api/bookings/${session.bookingId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'COMPLETED' })
      });
      if (!res.ok) throw new Error('Request failed');
    } catch (e) {
      console.error('Error completing booking in DB:', e);
      toast({ title: "Could not update session", description: "Please try again.", variant: "destructive" });
      return;
    }

    setAllRawBookings(prev => prev.map(b => (b.id === session.bookingId || b._id === session.bookingId) ? { ...b, status: 'COMPLETED' } : b));

    toast({
      title: "Session Completed ✅",
      description: `${session.client} will be asked for feedback on today's session.`,
    });
  };

  const handleOpenReschedule = (key: string, index: number, session: SessionSlot) => {
    const { canCancel, hoursLeft } = checkCanCancelSlot(key, session.time);

    if (!canCancel) {
      toast({
        variant: "destructive",
        title: "Cancellation Policy Restriction",
        description: `Sessions can only be cancelled at least 3 hours before start time. (Session starts in ${hoursLeft > 0 ? `${hoursLeft} hrs` : "less than 3 hrs"}).`,
      });
      return;
    }

    setRescheduleTarget({ key, index, session });
    setRescheduleTime(session.time);
    setRescheduleDate(`${year}-${String(month + 1).padStart(2, '0')}-${String(selectedDay).padStart(2, '0')}`);
    setRescheduleReason("");
    setConfirmRescheduleOpen(true);
  };

  const handleConfirmReschedule = async () => {
    if (!rescheduleTarget) return;

    const { session } = rescheduleTarget;

    if (session.bookingId) {
      try {
        // The Backend computes the India-time scheduledAt from the date + time label
        const res = await fetch(`/api/bookings/${session.bookingId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            date: rescheduleDate,
            time: rescheduleTime
          })
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data?.error || 'Request failed');
        }
      } catch (e: any) {
        console.error('Error rescheduling booking in DB:', e);
        toast({ title: "Could not reschedule", description: e?.message || "Please try again.", variant: "destructive" });
        return;
      }
    }

    setAllRawBookings(prev => prev.map(b => (b.id === session.bookingId || b._id === session.bookingId) ? { ...b, scheduledAt: null, toBeScheduled: false, date: rescheduleDate, time: rescheduleTime } : b));

    setRescheduleModalOpen(false);
    setRescheduleTarget(null);

    toast({
      title: "Session Rescheduled! 📅",
      description: `Successfully rescheduled session for ${session.client} to ${rescheduleDate} at ${rescheduleTime}.`,
    });
  };

  const handleOpenAssignClient = (key: string, index: number, slot: SessionSlot) => {
    setAssignTarget({ key, index, slot });
    setAssignClientName(dbClients[0]?.name || "Client Record");
    setAssignType("Individual Therapy");
    setAssignModalOpen(true);
  };

  const handleConfirmAssignClient = async () => {
    if (!assignTarget) return;
    const { key, slot } = assignTarget;

    if (!selectedConsultantId) {
      toast({ title: "Therapist profile not found", description: "Your consultant profile could not be loaded. Please sign in again.", variant: "destructive" });
      return;
    }
    const matchedClient = dbClients.find(c => c.name === assignClientName);

    // An old placeholder booking is replaced by the real session
    if (slot.legacyPlaceholder && slot.bookingId) {
      setAllRawBookings(prev => prev.filter(b => b.id !== slot.bookingId && b._id !== slot.bookingId));
      fetch(`/api/bookings/${slot.bookingId}`, { method: 'DELETE' }).catch(() => {});
    }

    const created = await createBookingInDb({
      clientId: matchedClient?.id || undefined,
      clientName: assignClientName,
      clientEmail: matchedClient?.email || undefined,
      serviceTitle: assignType || 'Individual Therapy',
      date: keyToDate(key),
      time: slot.time,
      durationMinutes: parseInt(slot.duration) || 50
    }, slot.slotId);
    if (!created) return;

    setAssignModalOpen(false);
    setAssignTarget(null);

    toast({
      title: "Client Booked! 📅",
      description: `Assigned ${assignClientName} to open slot at ${slot.time}.`,
    });
  };

  const handleDeleteSlot = async (key: string, index: number, clientName: string, slotTime: string) => {
    toast({
      title: "Session Slot Removed",
      description: `Slot for ${clientName} at ${slotTime} has been removed.`,
    });
  };

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        title={activeConsultant ? `${activeConsultant.name}'s Calendar` : "Session Schedule & Availability"}
        description={`View booked therapy appointments for ${activeConsultant?.name || 'your practice'}, set weekly availability, and manage consultation slots.`}
        badge="THERAPIST CALENDAR & SCHEDULER"
        icon={<CalendarDays className="w-4 h-4 text-purple-200" />}
      >
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            onClick={() => openPlan(monthOf(new Date(year, month, 1)) >= monthOf(new Date()) ? monthOf(new Date(year, month, 1)) : undefined)}
            disabled={!selectedConsultantId}
            className="bg-white text-primary hover:bg-white/90 font-bold text-xs px-3.5 py-2 rounded-full cursor-pointer shadow-xs"
          >
            Plan Month
          </Button>
          <Button
            type="button"
            onClick={() => setAvailabilityOpen(true)}
            variant="outline"
            className="border-white/30 text-white hover:bg-white/20 font-bold text-xs px-3.5 py-2 rounded-full cursor-pointer bg-white/10"
          >
            Set Availability
          </Button>
        </div>
      </PageHeader>

      {nextMonthPlanned === false && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
          <div>
            <p className="text-sm font-bold text-amber-900">Plan your {monthName(upcomingMonth)} hours</p>
            <p className="text-xs text-amber-800">Set different hours for each week of {monthName(upcomingMonth)}. Until you do, clients see your usual weekly hours.</p>
          </div>
          <Button type="button" onClick={() => openPlan(upcomingMonth)} className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shrink-0">
            Plan {monthName(upcomingMonth)}
          </Button>
        </div>
      )}

      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm overflow-hidden grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-slate-100 min-h-[600px]">

        <div className="lg:col-span-5 p-5 xl:p-6 bg-white flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">Select Date</span>
              <span className="text-xs font-bold text-[#5e2be2] bg-purple-50 px-2.5 py-0.5 rounded-full border border-purple-100">
                {MONTHS[month]} {year}
              </span>
            </div>

            <div className="flex items-center justify-between mb-4 bg-slate-50 p-1.5 rounded-2xl border border-slate-100">
              <button
                onClick={prevMonth}
                className="w-8 h-8 rounded-xl bg-white hover:bg-slate-100 flex items-center justify-center text-slate-600 transition-colors shadow-2xs cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="font-extrabold text-sm text-slate-900">{MONTHS[month]} {year}</span>
              <button
                onClick={nextMonth}
                className="w-8 h-8 rounded-xl bg-white hover:bg-slate-100 flex items-center justify-center text-slate-600 transition-colors shadow-2xs cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-7 mb-2 text-center">
              {DAYS_SHORT.map(d => (
                <div key={d} className="text-[11px] font-extrabold text-slate-400 py-1 uppercase tracking-wider">
                  {d.slice(0, 2)}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1">
              {cells.map((day, idx) => {
                if (!day) return <div key={`empty-${idx}`} />;
                const key = `${year}-${month + 1}-${day}`;
                const count = (sessionData[key] ?? DEFAULT_DAY_SLOTS).length;
                const sel = day === selectedDay;
                const tod = isToday(day);

                return (
                  <button
                    key={day}
                    onClick={() => setSelectedDay(day)}
                    className={cn(
                      "relative flex flex-col items-center justify-center rounded-2xl h-10 w-full text-xs font-bold transition-all cursor-pointer",
                      sel && "bg-[#5e2be2] text-white shadow-md shadow-[#5e2be2]/20 scale-105 z-10",
                      !sel && tod && "border-2 border-[#5e2be2] text-[#5e2be2] bg-purple-50/50 font-extrabold",
                      !sel && !tod && "text-slate-700 hover:bg-slate-100/80",
                    )}
                  >
                    <span>{day}</span>
                    {count > 0 && !sel && (
                      <span className={cn(
                        "w-1.5 h-1.5 rounded-full mt-0.5",
                        dotColor(count)
                      )} />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-6 pt-5 border-t border-slate-100 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">Monthly Capacity & Status</span>
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
                      return sum + (sessionData[key] || []).length;
                    }
                    return sum;
                  }, 0)} Booked
                </span>
              </div>
              <div className="flex flex-col justify-between p-3.5 bg-slate-50 rounded-2xl border border-slate-100 space-y-1.5">
                <span className="text-slate-500 font-medium text-[11px]">Selected Day</span>
                <span className="font-extrabold text-[11px] text-slate-800 bg-white p-2 rounded-xl border border-slate-200 space-y-0.5">
                  <div className="text-slate-600 font-extrabold flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-slate-400 inline-block" /> {bookedCount} Booked</div>
                  <div className="text-emerald-700 font-extrabold flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" /> {availableCount} Available</div>
                  <div className="text-slate-600 font-extrabold flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-slate-500 inline-block" /> {blockedCount} Blocked</div>
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-7 p-5 xl:p-6 bg-slate-50/30 flex flex-col">
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-extrabold text-slate-900">
                  {MONTHS[month]} {selectedDay}, {year}
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  {activeConsultant ? `${activeConsultant.name} · ` : ''}{bookedCount} booked · {availableCount} available · {blockedCount} blocked
                </p>
              </div>
            </div>

            {/* ── Interactive Time Slots & Quick Block Section ── */}
            <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-2xs space-y-3">
              <div className="flex items-center justify-between gap-2 flex-wrap pb-2 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <h4 className="text-xs font-black text-slate-900 tracking-tight uppercase">
                    Time Slots
                  </h4>
                  {(dayBlock || openFutureCount > 0) && (
                    <button
                      type="button"
                      onClick={handleToggleDayBlock}
                      className={cn(
                        "inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[10px] font-extrabold cursor-pointer transition-colors",
                        dayBlock
                          ? "border-emerald-300 text-emerald-800 bg-emerald-50 hover:bg-emerald-100"
                          : "border-slate-300 text-slate-700 bg-white hover:bg-slate-100"
                      )}
                    >
                      {dayBlock ? <Unlock className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
                      {dayBlock ? "Unblock day" : "Block whole day"}
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-1.5 text-[10px] font-bold">
                  <span className="flex items-center gap-1 text-[#5e2be2] bg-purple-50 px-2 py-0.5 rounded-md border border-purple-200">
                    <span className="w-2 h-2 rounded-full bg-[#5e2be2]" />
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


              {daySessions.length > 0 && (
                <p className="text-[11px] text-slate-500 font-medium">
                  Click a green time to block it. Click a locked time to open it again for clients.
                </p>
              )}

              <div className="flex flex-wrap gap-2 pt-1">
                {daySessions.length === 0 ? (
                  !offeredLoaded && selectedConsultantId ? (
                    <span className="text-xs text-slate-400 font-medium italic">Loading time slots…</span>
                  ) : (
                    <div className="w-full flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-xl bg-slate-50 border border-dashed border-slate-200">
                      <span className="text-xs text-slate-500 font-medium">
                        {dayBlock ? "This whole day is blocked." : `You have no working hours on ${new Date(year, month, selectedDay).toLocaleDateString("en-US", { weekday: "long" })}s.`}
                      </span>
                      {!dayBlock && (
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => setAvailabilityOpen(true)}
                          className="bg-[#5e2be2] hover:bg-[#4f28d9] text-white font-extrabold text-[11px] h-7 px-3 rounded-lg cursor-pointer"
                        >
                          Set weekly hours
                        </Button>
                      )}
                    </div>
                  )
                ) : (
                  daySessions.map((slot, index) => {
                    const isBooked = slot.status === "booked";
                    const isBlocked = slot.status === "blocked" || Boolean(slot.dayBlocked);
                    const isAvailable = slot.status === "available" && !slot.dayBlocked;
                    const locked = isBooked || slot.past || slot.dayBlocked;

                    return (
                      <button
                        key={`${slot.time}-${index}`}
                        type="button"
                        onClick={() => handleToggleBlockSlot(sessionKey, index)}
                        title={
                          isBooked
                            ? `Booked by ${slot.client} (${slot.time})`
                            : slot.past
                              ? `${slot.time} has passed`
                              : slot.dayBlocked
                                ? "The whole day is blocked"
                                : isBlocked
                                  ? `Click to open ${slot.time} for clients`
                                  : `Click to block ${slot.time}`
                        }
                        className={cn(
                          "group relative inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black transition-all border shadow-2xs",
                          locked ? "cursor-default" : "cursor-pointer active:scale-95",
                          isBooked && "bg-purple-50 text-[#5e2be2] border-purple-200",
                          isAvailable && !slot.past && "bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-slate-100 hover:text-slate-800 hover:border-slate-300",
                          isBlocked && !slot.past && "bg-slate-100 text-slate-700 border-slate-300",
                          isBlocked && !locked && "hover:bg-emerald-50 hover:text-emerald-800 hover:border-emerald-300",
                          !isBooked && slot.past && "bg-white text-slate-300 border-slate-200 line-through"
                        )}
                      >
                        {isBooked ? (
                          <User className="w-3.5 h-3.5 shrink-0" />
                        ) : isBlocked ? (
                          <Lock className="w-3.5 h-3.5 shrink-0 text-slate-500" />
                        ) : (
                          <CheckCircle2 className={cn("w-3.5 h-3.5 shrink-0", slot.past ? "text-slate-300" : "text-emerald-600")} />
                        )}

                        <span>{slot.time}</span>

                        {!locked && (
                          <span className="hidden group-hover:inline-block text-[9px] font-black ml-0.5 underline">
                            {isBlocked ? "Open" : "Block"}
                          </span>
                        )}
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            <button
              onClick={() => setAddEventOpen(true)}
              className="w-full flex items-center justify-center gap-2 rounded-2xl border border-dashed border-purple-300 bg-white text-[#5e2be2] text-xs font-extrabold py-3 hover:bg-purple-50/80 transition-all cursor-pointer shadow-2xs"
            >
              <Plus className="w-4 h-4" />
              <span>Book a Session / Block or Open Time</span>
            </button>

            <h4 className="text-xs font-black text-slate-900 tracking-tight uppercase pt-1">Booked Sessions</h4>
            {bookedSessions.length === 0 ? (
              <div className="flex flex-col items-center justify-center text-center p-6 bg-white rounded-2xl border border-dashed border-slate-200">
                <CalendarDays className="w-8 h-8 text-slate-300 mb-2" />
                <p className="text-sm font-extrabold text-slate-800">No sessions booked on this day</p>
                <p className="text-xs text-slate-500 mt-1 max-w-xs">Clients can book any green time above.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {bookedSessions.map((s) => {
                  const i = daySessions.indexOf(s);
                  const isBooked = true;
                  const isBlocked = false;
                  const isAvailable = false;

                  return (
                    <div
                      key={i}
                      className={cn(
                        "group flex items-center justify-between gap-3 rounded-2xl border p-3.5 transition-all bg-white shadow-2xs hover:shadow-md",
                        isBooked && "border-slate-200/80 hover:border-slate-300",
                        isAvailable && "border-dashed border-emerald-300 bg-emerald-50/20 hover:bg-emerald-50/50",
                        isBlocked && "border-dashed border-slate-300 bg-slate-50 hover:bg-slate-100/60"
                      )}
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className={cn(
                          "shrink-0 w-22 text-center py-2 rounded-xl text-xs font-black transition-all",
                          isBooked && "bg-slate-100 text-slate-700 border border-slate-200",
                          isAvailable && "bg-emerald-100/80 text-emerald-800 font-black border border-emerald-200",
                          isBlocked && "bg-slate-200/80 text-slate-700 font-black border border-slate-300"
                        )}>
                          {s.time}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className={cn(
                              "font-extrabold text-xs sm:text-sm truncate",
                              isBooked && "text-slate-900",
                              isAvailable && "text-emerald-900",
                              isBlocked && "text-slate-700 line-through decoration-slate-400"
                            )}>
                              {s.client}
                            </span>
                          </div>
                          <p className="text-[11px] font-semibold text-slate-500 truncate mt-0.5">{s.type} · {s.duration}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {isBooked ? (
                          s.bookingStatus === 'COMPLETED' ? (
                            <Badge className="bg-emerald-100 text-emerald-800 border-0 text-[10px] font-extrabold px-2.5 py-0.5">
                              Completed
                            </Badge>
                          ) : (
                            <Badge className="bg-slate-100 text-slate-700 border-0 text-[10px] font-extrabold px-2.5 py-0.5">
                              {STATUS_LABELS[s.bookingStatus || 'CONFIRMED'] || 'Confirmed'}
                            </Badge>
                          )
                        ) : isBlocked ? (
                          <Badge className="bg-slate-100 text-slate-700 border-0 text-[10px] font-extrabold px-2.5 py-0.5 flex items-center gap-1">
                            <Lock className="w-3 h-3 text-slate-500" />
                            Blocked Slot
                          </Badge>
                        ) : (
                          <div className="flex items-center gap-1.5">
                            <Badge className="bg-emerald-100 text-emerald-800 border-0 text-[10px] font-extrabold px-2.5 py-0.5">
                              Available Slot
                            </Badge>
                            <Button
                              type="button"
                              size="sm"
                              onClick={() => handleOpenAssignClient(sessionKey, i, s)}
                              className="bg-[#5e2be2] hover:bg-[#4f28d9] text-white font-extrabold text-[11px] h-7 px-2.5 rounded-lg shadow-2xs cursor-pointer"
                            >
                              + Book Client
                            </Button>
                          </div>
                        )}

                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button
                              type="button"
                              title="More Options"
                              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all cursor-pointer"
                            >
                              <MoreVertical className="w-4 h-4" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-44 rounded-xl p-1 shadow-lg border-slate-200">
                            {isBooked && s.bookingId && s.bookingStatus !== 'COMPLETED' && (
                              <DropdownMenuItem
                                onClick={() => handleMarkCompleted(s)}
                                className="flex items-center gap-2 px-2.5 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 rounded-lg cursor-pointer"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                <span>Mark as Completed</span>
                              </DropdownMenuItem>
                            )}

                            {isBooked && s.bookingStatus !== 'COMPLETED' && (
                              <DropdownMenuItem
                                onClick={() => handleOpenReschedule(sessionKey, i, s)}
                                className="flex items-center gap-2 px-2.5 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer"
                              >
                                <Ban className="w-3.5 h-3.5 text-rose-600" />
                                <span>Cancel Booking</span>
                              </DropdownMenuItem>
                            )}

                            {!isBooked && (
                              <DropdownMenuItem
                                onClick={() => handleToggleBlockSlot(sessionKey, i)}
                                className="flex items-center gap-2 px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-lg cursor-pointer"
                              >
                                {isBlocked ? (
                                  <>
                                    <Unlock className="w-3.5 h-3.5 text-emerald-600" />
                                    <span>Unblock Slot</span>
                                  </>
                                ) : (
                                  <>
                                    <Lock className="w-3.5 h-3.5 text-slate-600" />
                                    <span>Block Slot</span>
                                  </>
                                )}
                              </DropdownMenuItem>
                            )}

                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── ALL PAST & UPCOMING SESSIONS LOG FOR ACTIVE THERAPIST ── */}
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm p-5 sm:p-6 space-y-4">
        <div className="flex items-center justify-between gap-3 flex-wrap pb-3 border-b border-slate-100">
          <div>
            <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
              <CalendarDays className="w-4 h-4 text-[#5e2be2]" />
              {activeConsultant ? `${activeConsultant.name}'s Consultation History & Bookings` : 'All Session Bookings Log'}
            </h3>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Showing {therapistBookingsList.length} real appointments recorded in MongoDB Atlas. Click "Focus Date" to view any past or upcoming day on the calendar above.
            </p>
          </div>
          <Badge className="bg-purple-100 text-purple-900 border border-purple-200 font-extrabold text-xs px-3 py-1">
            {therapistBookingsList.length} Total Bookings
          </Badge>
        </div>

        {therapistBookingsList.length === 0 ? (
          <div className="text-center py-10 border border-dashed border-slate-200 rounded-2xl">
            <CalendarDays className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-bold text-slate-800">No session bookings recorded in the database collection</p>
            <p className="text-xs text-slate-500 mt-1">When clients book consultations with this therapist, their sessions will appear here.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/70 border-b border-slate-100 text-[11px] font-extrabold text-slate-400 uppercase tracking-wider whitespace-nowrap">
                  <th className="py-3 px-4">Client Name</th>
                  <th className="py-3 px-4">Service Modality</th>
                  <th className="py-3 px-4">Scheduled Date</th>
                  <th className="py-3 px-4">Time Slot</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Calendar Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {therapistBookingsList.slice(0, 15).map((b: any, idx: number) => {
                  // Website bookings are paid first and scheduled later: no session date yet (never the purchase time)
                  const unscheduled = Boolean(b.toBeScheduled) || (!b.date && !b.scheduledAt);
                  const dayMatch = String(b.date || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
                  const bDate = dayMatch ? b.date : (b.scheduledAt ? new Date(b.scheduledAt).toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }) : '');
                  const dateStr = unscheduled || !bDate ? 'To be scheduled' : new Date(`${bDate}T12:00:00`).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
                  const timeStr = unscheduled ? '—' : (b.time || (b.scheduledAt ? new Date(b.scheduledAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' }) : '—'));
                  const status = (b.status || 'CONFIRMED').toUpperCase();

                  return (
                    <tr key={b.id || idx} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="font-extrabold text-slate-900">{b.clientName || 'Client'}</div>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap font-medium text-slate-600">
                        {b.serviceTitle || 'Individual Therapy'}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap font-bold text-slate-700 font-mono">
                        {dateStr}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap font-extrabold text-[#5e2be2]">
                        {timeStr}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <Badge className={cn(
                          "border-0 text-[10px] font-extrabold px-2.5 py-0.5",
                          status === 'COMPLETED' && "bg-emerald-100 text-emerald-800",
                          (status === 'CONFIRMED' || status === 'RESCHEDULED') && "bg-purple-100 text-[#5e2be2]",
                          status === 'PENDING' && "bg-amber-100 text-amber-800",
                          (status === 'CANCELLED' || status.startsWith('NO_SHOW')) && "bg-rose-100 text-rose-800"
                        )}>
                          {STATUS_LABELS[status] || status}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap text-right">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={unscheduled || !bDate}
                          onClick={() => handleJumpToBookingDate(bDate)}
                          className="text-[11px] font-bold h-7 px-2.5 rounded-lg border-purple-200 text-[#5e2be2] hover:bg-purple-50 cursor-pointer inline-flex items-center gap-1.5"
                        >
                          <CalendarIcon className="w-3 h-3 text-[#5e2be2]" />
                          Focus Date
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Assign Client to Open Slot Modal */}
      <Dialog open={assignModalOpen} onOpenChange={setAssignModalOpen}>
        <DialogContent className="w-[calc(100vw-2rem)] sm:max-w-md rounded-3xl p-4 sm:p-6 border-0 shadow-2xl max-h-[92vh] overflow-y-auto">
          <DialogHeader className="space-y-1">
            <DialogTitle className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
              <Plus className="w-5 h-5 text-[#5e2be2]" />
              Book Client into Available Slot
            </DialogTitle>
            <p className="text-xs text-slate-500 font-medium">
              Select a client to assign to the open consultation slot at {assignTarget?.slot.time}.
            </p>
          </DialogHeader>

          {assignTarget && (
            <div className="space-y-4 py-2">
              <div className="p-3.5 bg-purple-50/60 rounded-2xl border border-purple-100 space-y-1 text-xs">
                <span className="text-[10px] font-extrabold text-[#5e2be2] uppercase tracking-wider block">Target Slot</span>
                <p className="font-extrabold text-slate-900 text-sm">Time: {assignTarget.slot.time}</p>
                <p className="text-slate-600 font-medium">{assignTarget.slot.duration} Session</p>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-extrabold text-slate-700 block">Select Client</label>
                <Select value={assignClientName} onValueChange={setAssignClientName}>
                  <SelectTrigger className="rounded-xl border-slate-200 text-xs h-10">
                    <SelectValue placeholder="Select client from database" />
                  </SelectTrigger>
                  <SelectContent>
                    {dbClients.length > 0 ? (
                      dbClients.map((client) => (
                        <SelectItem key={client.id} value={client.name} className="text-xs">
                          {client.name}
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value="Client Record" className="text-xs">
                        Default Client Record
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-extrabold text-slate-700 block">Treatment Modality / Notes</label>
                <Input
                  value={assignType}
                  onChange={(e) => setAssignType(e.target.value)}
                  className="rounded-xl border-slate-200 text-xs h-10"
                />
              </div>
            </div>
          )}

          <DialogFooter className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              onClick={() => setAssignModalOpen(false)}
              className="rounded-xl text-xs font-bold border-slate-200 cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleConfirmAssignClient}
              className="bg-[#5e2be2] hover:bg-[#4f28d9] text-white font-extrabold text-xs rounded-xl shadow-md shadow-[#5e2be2]/20 cursor-pointer"
            >
              Confirm Booking
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancel Booking Confirmation Popup (Cancel / Yes) */}
      <AlertDialog open={confirmRescheduleOpen} onOpenChange={setConfirmRescheduleOpen}>
        <AlertDialogContent className="w-[calc(100vw-2rem)] max-w-md rounded-3xl p-4 sm:p-6 border-0 shadow-2xl bg-white max-h-[92vh] overflow-y-auto">
          <AlertDialogHeader className="space-y-2">
            <AlertDialogTitle className="text-base font-extrabold text-slate-900 flex items-center gap-2">
              <Ban className="w-5 h-5 text-rose-600" />
              Cancel Booking?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-slate-600 font-medium leading-relaxed space-y-2">
              <span>
                Are you sure you want to cancel the booking for <strong className="text-slate-900">{rescheduleTarget?.session.client}</strong> scheduled at <strong className="text-[#5e2be2]">{rescheduleTarget?.session.time}</strong>? This will release the slot back as an available consultation slot.
              </span>
              <span className="flex items-center gap-1.5 text-[11px] font-bold text-amber-800 bg-amber-50/90 p-2.5 rounded-xl border border-amber-200 mt-2.5">
                <Clock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                <span>Cancellation Policy: Allowed up to 3 hours before session start time.</span>
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100">
            <AlertDialogCancel
              onClick={() => setConfirmRescheduleOpen(false)}
              className="rounded-xl text-xs font-extrabold border-slate-200 hover:bg-slate-100 cursor-pointer"
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmCancelBooking}
              className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-extrabold rounded-xl shadow-md shadow-rose-600/20 cursor-pointer"
            >
              Yes
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reschedule Session Dialog Modal */}
      <Dialog open={rescheduleModalOpen} onOpenChange={setRescheduleModalOpen}>
        <DialogContent className="w-[calc(100vw-2rem)] sm:max-w-md rounded-3xl p-4 sm:p-6 border-0 shadow-2xl max-h-[92vh] overflow-y-auto">
          <DialogHeader className="space-y-1">
            <DialogTitle className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
              <CalendarIcon className="w-5 h-5 text-[#5e2be2]" />
              Reschedule Session Slot
            </DialogTitle>
            <p className="text-xs text-slate-500 font-medium">
              Select a new date and time slot for {rescheduleTarget?.session.client}'s booked session.
            </p>
          </DialogHeader>

          {rescheduleTarget && (
            <div className="space-y-4 py-2">
              <div className="p-3.5 bg-purple-50/60 rounded-2xl border border-purple-100 space-y-1 text-xs">
                <span className="text-[10px] font-extrabold text-[#5e2be2] uppercase tracking-wider block">Current Booking</span>
                <p className="font-extrabold text-slate-900 text-sm">{rescheduleTarget.session.client} ({rescheduleTarget.session.initials})</p>
                <p className="text-slate-600 font-medium">{rescheduleTarget.session.type} · {rescheduleTarget.session.duration}</p>
                <p className="text-[#5e2be2] font-extrabold mt-1">Current Time: {rescheduleTarget.session.time}</p>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-extrabold text-slate-700 block">Select New Date</label>
                <Input
                  type="date"
                  value={rescheduleDate}
                  onChange={(e) => setRescheduleDate(e.target.value)}
                  className="rounded-xl border-slate-200 text-xs h-10"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-extrabold text-slate-700 block">Select New Time Slot</label>
                <Select value={rescheduleTime} onValueChange={setRescheduleTime}>
                  <SelectTrigger className="rounded-xl border-slate-200 text-xs h-10">
                    <SelectValue placeholder="Select new time" />
                  </SelectTrigger>
                  <SelectContent>
                    {["08:00 AM", "09:00 AM", "10:00 AM", "11:00 AM", "11:30 AM", "01:00 PM", "02:00 PM", "03:00 PM", "04:00 PM", "05:00 PM"].map((t) => (
                      <SelectItem key={t} value={t} className="text-xs">
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-extrabold text-slate-700 block">Reschedule Reason / Note (Optional)</label>
                <Input
                  placeholder="e.g. Client requested time shift"
                  value={rescheduleReason}
                  onChange={(e) => setRescheduleReason(e.target.value)}
                  className="rounded-xl border-slate-200 text-xs h-10"
                />
              </div>
            </div>
          )}

          <DialogFooter className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              onClick={() => setRescheduleModalOpen(false)}
              className="rounded-xl text-xs font-bold border-slate-200 cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleConfirmReschedule}
              className="bg-[#5e2be2] hover:bg-[#4f28d9] text-white font-extrabold text-xs rounded-xl shadow-md shadow-[#5e2be2]/20 cursor-pointer"
            >
              Confirm Reschedule
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <SetAvailabilityDialog open={availabilityOpen} onOpenChange={setAvailabilityOpen} consultantId={selectedConsultantId} onSaved={refreshSlots} />
      {selectedConsultantId && (
        <PlanMonthDialog open={planOpen} onOpenChange={setPlanOpen} consultantId={selectedConsultantId} initialMonth={planMonth} onSaved={refreshSlots} />
      )}
      <AddEventDialog
        open={addEventOpen}
        onOpenChange={setAddEventOpen}
        defaultDate={`${year}-${String(month + 1).padStart(2, "0")}-${String(selectedDay).padStart(2, "0")}`}
        onAddSlot={handleAddSlotFromDialog}
      />
    </div>
  );
}
