import { getDatabase } from '../db/mongodb';
import { config } from '../config';
import { consultantIds } from './booking-refs';
import { bookingStatusOf, SLOT_HOLDING_STATUSES } from './booking-status';
import { bookingInstant, formatTimeLabel, istInstant, istLabels, isDateLabel, parseTimeLabel, weekdayOf } from './booking-time';

/** Sessions are offered in one-hour slots */
export const SLOT_MINUTES = 60;
const MINUTE = 60 * 1000;
const DAY_KEYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

/** Used for consultants who never saved a weekly schedule (same as the consultant panel's default) */
const DEFAULT_SCHEDULE: Record<string, { enabled: boolean; slots: { start: string; end: string }[] }> = {
  monday: { enabled: true, slots: [{ start: '9:00 AM', end: '6:00 PM' }] },
  tuesday: { enabled: true, slots: [{ start: '9:00 AM', end: '6:00 PM' }] },
  wednesday: { enabled: true, slots: [{ start: '9:00 AM', end: '6:00 PM' }] },
  thursday: { enabled: true, slots: [{ start: '9:00 AM', end: '6:00 PM' }] },
  friday: { enabled: true, slots: [{ start: '9:00 AM', end: '5:00 PM' }] },
  saturday: { enabled: true, slots: [{ start: '10:00 AM', end: '2:00 PM' }] },
  sunday: { enabled: true, slots: [{ start: '10:00 AM', end: '2:00 PM' }] }
};

export interface DaySlot {
  /** "09:00 AM - 10:00 AM" — send this back as the booking's `time` */
  time: string;
  start: string;
  end: string;
  startAt: string;
  available: boolean;
}

function hasSchedule(availability: any): boolean {
  return !!availability && typeof availability === 'object' && Object.keys(availability).length > 0;
}

/**
 * Slot start times (minutes after midnight) the consultant offers on a weekday. Understands both stored shapes:
 * `{ monday: { enabled, slots: [{ start, end }] } }` (ranges) and `{ Monday: ['09:00', '10:00'] }` (start times).
 */
function offeredStarts(availability: any, weekday: number): number[] {
  const dayKey = DAY_KEYS[weekday];
  const entry = Object.entries(availability || {}).find(([k]) => k.toLowerCase() === dayKey)?.[1] as any;
  if (!entry) return [];

  const starts: number[] = [];
  const addRange = (from: unknown, to: unknown) => {
    const a = parseTimeLabel(from);
    const b = parseTimeLabel(to);
    if (a === null) return;
    if (b === null || b <= a) { starts.push(a); return; }
    for (let m = a; m + SLOT_MINUTES <= b; m += SLOT_MINUTES) starts.push(m);
  };

  if (Array.isArray(entry)) {
    entry.forEach((s: any) => (typeof s === 'string' ? addRange(s, null) : addRange(s?.start, s?.end)));
  } else if (entry && typeof entry === 'object') {
    if (entry.enabled === false) return [];
    if (Array.isArray(entry.slots) && entry.slots.length) {
      entry.slots.forEach((s: any) => (typeof s === 'string' ? addRange(s, null) : addRange(s?.start, s?.end)));
    } else if (entry.start) {
      addRange(entry.start, entry.end);
    }
  }
  return Array.from(new Set(starts)).sort((x, y) => x - y);
}

interface Busy { from: number; to: number }

/** Blocked periods (Availability collection, status Blocked) and active bookings of the consultant on a day */
async function busyPeriods(consultant: any, date: string, excludeBookingId?: string): Promise<Busy[]> {
  const db = getDatabase();
  const ids = consultantIds(consultant);
  const dayStart = istInstant(date, 0)!.getTime();
  const dayEnd = dayStart + 24 * 60 * MINUTE;
  const staleCutoff = Date.now() - config.payment.pendingExpiryMinutes * MINUTE;

  const [blocks, bookings] = await Promise.all([
    db.collection('Availability').find({
      $or: [{ therapistId: { $in: ids } }, { consultantId: { $in: ids } }],
      status: { $regex: '^blocked$', $options: 'i' },
      date
    }).toArray().catch(() => []),
    db.collection('Booking').find({
      $or: [{ consultantId: { $in: ids } }, { therapistId: { $in: ids } }]
    }).toArray().catch(() => [])
  ]);

  const busy: Busy[] = [];
  blocks.forEach((b: any) => {
    const from = parseTimeLabel(b.time || b.startTime);
    if (from === null) {
      busy.push({ from: dayStart, to: dayEnd }); // a block without a time blocks the whole day
      return;
    }
    const to = parseTimeLabel(b.endTime);
    const start = dayStart + from * MINUTE;
    busy.push({ from: start, to: to !== null && to > from ? dayStart + to * MINUTE : start + SLOT_MINUTES * MINUTE });
  });

  bookings.forEach((b: any) => {
    if (excludeBookingId && (String(b.id) === excludeBookingId || String(b._id) === excludeBookingId)) return;
    const status = bookingStatusOf(b);
    if (!SLOT_HOLDING_STATUSES.has(status)) return;
    // Abandoned checkouts stop holding the slot once they would expire
    if (status === 'PENDING_PAYMENT' && new Date(b.createdAt || 0).getTime() < staleCutoff) return;
    const when = bookingInstant(b);
    if (!when) return;
    const from = when.getTime();
    const to = from + (Number(b.durationMinutes) || 50) * MINUTE;
    if (to > dayStart && from < dayEnd) busy.push({ from, to });
  });
  return busy;
}

/** The consultant's bookable slots on a day (India time), each marked available or not */
export async function getDaySlots(consultant: any, date: string): Promise<{ slots: DaySlot[]; defaultSchedule: boolean }> {
  if (!isDateLabel(date)) return { slots: [], defaultSchedule: false };
  const defaultSchedule = !hasSchedule(consultant?.availability);
  const starts = offeredStarts(defaultSchedule ? DEFAULT_SCHEDULE : consultant.availability, weekdayOf(date));
  const busy = starts.length ? await busyPeriods(consultant, date) : [];
  const now = Date.now();

  const slots = starts.map((m) => {
    const startAt = istInstant(date, m)!;
    const from = startAt.getTime();
    const to = from + SLOT_MINUTES * MINUTE;
    const taken = busy.some((p) => p.from < to && p.to > from);
    const start = formatTimeLabel(m);
    const end = formatTimeLabel(m + SLOT_MINUTES);
    return { time: `${start} - ${end}`, start, end, startAt: startAt.toISOString(), available: !taken && from > now };
  });
  return { slots, defaultSchedule };
}

/**
 * Why a session at `startAt` cannot be booked with this consultant, or null when it can:
 * it must be in the future, one of the consultant's offered slots, and not blocked or booked.
 */
export async function slotUnavailableReason(consultant: any, startAt: Date, durationMinutes = 50, excludeBookingId?: string): Promise<string | null> {
  if (startAt.getTime() <= Date.now()) return 'This time slot is in the past.';
  const { date } = istLabels(startAt);
  const { slots } = await getDaySlots(consultant, date);
  const from = startAt.getTime();
  const offered = slots.find((s) => new Date(s.startAt).getTime() === from);
  if (!offered) return 'The therapist is not available at this time. Please pick one of the offered slots.';

  const busy = await busyPeriods(consultant, date, excludeBookingId);
  const to = from + Math.max(durationMinutes, 1) * MINUTE;
  if (busy.some((p) => p.from < to && p.to > from)) return 'This time slot was just taken. Please pick another slot.';
  return null;
}
