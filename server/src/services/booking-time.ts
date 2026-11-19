/**
 * Session times. Sessions are booked in India time (Asia/Kolkata, UTC+05:30, no daylight saving);
 * servers run in UTC. A booking's instant is `scheduledAt` (a Date); `date` (YYYY-MM-DD) and `time`
 * ("10:00 AM" or "10:00 AM - 11:00 AM") are its India-time labels.
 */
export const SESSION_TIME_ZONE = 'Asia/Kolkata';
const IST_OFFSET_MINUTES = 330;
const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Minutes after midnight for "10:00 AM", "9:30 pm", "14:00" or the start of "10:00 AM - 11:00 AM"; null if unreadable */
export function parseTimeLabel(label: unknown): number | null {
  const start = String(label ?? '').split(/\s+-\s+|–|—/)[0].trim();
  const m = start.match(/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)?$/i);
  if (!m) return null;
  let hours = parseInt(m[1], 10);
  const minutes = m[2] ? parseInt(m[2], 10) : 0;
  const meridiem = (m[3] || '').toUpperCase();
  if (minutes > 59) return null;
  if (meridiem) {
    if (hours < 1 || hours > 12) return null;
    if (meridiem === 'PM' && hours < 12) hours += 12;
    if (meridiem === 'AM' && hours === 12) hours = 0;
  } else if (hours > 23 || !m[2]) {
    return null;
  }
  return hours * 60 + minutes;
}

/** "09:00 AM" for 540 */
export function formatTimeLabel(totalMinutes: number): string {
  const mins = ((totalMinutes % 1440) + 1440) % 1440;
  let hours = Math.floor(mins / 60);
  const minutes = mins % 60;
  const meridiem = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12 || 12;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')} ${meridiem}`;
}

export function isDateLabel(date: unknown): boolean {
  const m = String(date ?? '').match(DATE_RE);
  if (!m) return false;
  const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  return d.getUTCFullYear() === +m[1] && d.getUTCMonth() === +m[2] - 1 && d.getUTCDate() === +m[3];
}

/** The instant of a day (YYYY-MM-DD) and minutes-after-midnight in India time */
export function istInstant(date: string, minutes: number): Date | null {
  const m = String(date).match(DATE_RE);
  if (!m || !isDateLabel(date)) return null;
  return new Date(Date.UTC(+m[1], +m[2] - 1, +m[3], 0, minutes - IST_OFFSET_MINUTES));
}

/** The session instant for a date + time label in India time, or null */
export function istFromLabels(date: unknown, time: unknown): Date | null {
  const minutes = parseTimeLabel(time);
  if (minutes === null || !isDateLabel(date)) return null;
  return istInstant(String(date), minutes);
}

/** A valid Date from a Date or a parseable string, else null */
export function toValidDate(value: unknown): Date | null {
  if (value === null || value === undefined || value === '') return null;
  const d = value instanceof Date ? value : new Date(value as any);
  return isNaN(d.getTime()) ? null : d;
}

/** India-time labels of an instant: { date: '2026-10-20', time: '02:00 PM' } */
export function istLabels(when: Date): { date: string; time: string } {
  const shifted = new Date(when.getTime() + IST_OFFSET_MINUTES * 60 * 1000);
  return {
    date: shifted.toISOString().split('T')[0],
    time: formatTimeLabel(shifted.getUTCHours() * 60 + shifted.getUTCMinutes())
  };
}

/** Today's date in India, YYYY-MM-DD */
export function istToday(): string {
  return istLabels(new Date()).date;
}

/** Day of week (0 = Sunday) of a YYYY-MM-DD calendar day */
export function weekdayOf(date: string): number {
  const m = String(date).match(DATE_RE);
  return m ? new Date(Date.UTC(+m[1], +m[2] - 1, +m[3])).getUTCDay() : -1;
}

/**
 * When a booking happens: its scheduledAt, else its date + time labels. Null for website bookings
 * that are paid but not scheduled yet. Never falls back to createdAt.
 */
export function bookingInstant(b: any): Date | null {
  return toValidDate(b?.scheduledAt) || istFromLabels(b?.date, b?.time);
}

/** True when a booking has no session time yet (website bookings are paid first, scheduled later) */
export function isToBeScheduled(b: any): boolean {
  return !bookingInstant(b) && !isDateLabel(b?.date);
}

export class ScheduleError extends Error {}

/**
 * The scheduledAt to store for a create/update body. `scheduledAt` wins when given (must be a valid date);
 * otherwise it is computed in India time from `date` + `time` (falling back to the existing booking's labels).
 * Returns undefined when nothing schedule-related was given. Throws ScheduleError for invalid input.
 */
export function resolveScheduledAt(body: any, existing?: any): Date | undefined {
  const hasScheduledAt = body?.scheduledAt !== undefined && body?.scheduledAt !== null && body?.scheduledAt !== '';
  if (hasScheduledAt) {
    const d = toValidDate(body.scheduledAt);
    if (d) return d;
    // e.g. "2026-10-20T02:00 PM": recover the labels when they are unambiguous
    const [datePart, timePart] = String(body.scheduledAt).split('T');
    const recovered = istFromLabels(body.date || datePart, body.time || timePart);
    if (recovered) return recovered;
    throw new ScheduleError(`Invalid scheduledAt "${body.scheduledAt}". Send an ISO date-time, or date (YYYY-MM-DD) and time (e.g. "10:00 AM").`);
  }

  const dateGiven = body?.date !== undefined && body?.date !== null && body?.date !== '';
  const timeGiven = body?.time !== undefined && body?.time !== null && body?.time !== '';
  if (!dateGiven && !timeGiven) return undefined;

  const date = dateGiven ? body.date : existing?.date;
  const time = timeGiven ? body.time : existing?.time;
  if (dateGiven && !isDateLabel(date)) throw new ScheduleError(`Invalid date "${body.date}". Use YYYY-MM-DD.`);
  if (timeGiven && parseTimeLabel(time) === null) throw new ScheduleError(`Invalid time "${body.time}". Use e.g. "10:00 AM" or "10:00 AM - 11:00 AM".`);
  return istFromLabels(date, time) || undefined;
}
