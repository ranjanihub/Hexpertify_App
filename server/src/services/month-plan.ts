import { getDatabase } from '../db/mongodb';
import { consultantIds } from './booking-refs';
import { bookingStatusOf, UPCOMING_STATUSES } from './booking-status';
import { bookingInstant, formatTimeLabel, isDateLabel, istLabels, parseTimeLabel } from './booking-time';

/**
 * Month plans: a therapist's hours set per date for one month, so each week can differ.
 * A planned date replaces the weekly hours for that date; dates without a plan use the weekly hours.
 * Blocks and extra opened hours (Availability collection) still apply on top.
 */

export const MONTH_PLAN_COLLECTION = 'MonthPlan';
const MONTH_RE = /^(\d{4})-(\d{2})$/;
const MAX_RANGES_PER_DAY = 6;
const MAX_WEEKS = 6;
const DAY_KEYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

export interface PlanRange { start: string; end: string }
export interface PlanDay { enabled: boolean; slots: PlanRange[] }

export class MonthPlanInputError extends Error {}

export function isMonthLabel(month: unknown): boolean {
  const m = String(month ?? '').match(MONTH_RE);
  return !!m && +m[2] >= 1 && +m[2] <= 12;
}

/** Every date of the month, YYYY-MM-DD */
export function datesOfMonth(month: string): string[] {
  const m = month.match(MONTH_RE)!;
  const days = new Date(Date.UTC(+m[1], +m[2], 0)).getUTCDate();
  return Array.from({ length: days }, (_, i) => `${month}-${String(i + 1).padStart(2, '0')}`);
}

/** A day's hours, cleaned: valid "09:00 AM" ranges with end after start, overlaps allowed but capped */
function cleanDay(raw: any, where: string): PlanDay {
  if (!raw || typeof raw !== 'object') throw new MonthPlanInputError(`${where}: hours are missing`);
  const enabled = raw.enabled !== false;
  const list = Array.isArray(raw.slots) ? raw.slots : [];
  if (list.length > MAX_RANGES_PER_DAY) throw new MonthPlanInputError(`${where}: at most ${MAX_RANGES_PER_DAY} time ranges per day`);
  const slots: PlanRange[] = [];
  list.forEach((s: any) => {
    const from = parseTimeLabel(s?.start);
    const to = parseTimeLabel(s?.end);
    if (from === null || to === null) throw new MonthPlanInputError(`${where}: "${s?.start} – ${s?.end}" is not a valid time range`);
    if (to <= from) throw new MonthPlanInputError(`${where}: the end time must be after the start time (${s.start} – ${s.end})`);
    slots.push({ start: formatTimeLabel(from), end: formatTimeLabel(to) });
  });
  if (enabled && !slots.length) throw new MonthPlanInputError(`${where}: add a time range or switch the day off`);
  return { enabled: enabled && slots.length > 0, slots: enabled ? slots : [] };
}

/** The editor's week rows, kept as entered so the therapist sees the same plan next time */
function cleanWeeks(raw: any): any[] {
  if (!Array.isArray(raw)) return [];
  return raw.slice(0, MAX_WEEKS).map((w: any, i: number) => {
    const sameAs = Number.isInteger(w?.sameAs) && w.sameAs >= 0 && w.sameAs < i ? w.sameAs : null;
    const days: Record<string, PlanDay> = {};
    DAY_KEYS.forEach((k) => {
      try {
        days[k] = cleanDay(w?.days?.[k] ?? { enabled: false, slots: [] }, `Week ${i + 1} ${k}`);
      } catch {
        days[k] = { enabled: false, slots: [] };
      }
    });
    return { sameAs, days };
  });
}

/** Validated per-date hours for the month; throws MonthPlanInputError with a readable message */
export function cleanPlanDays(month: string, raw: any): Record<string, PlanDay> {
  if (!raw || typeof raw !== 'object') throw new MonthPlanInputError('days are required');
  const valid = new Set(datesOfMonth(month));
  const days: Record<string, PlanDay> = {};
  Object.entries(raw).forEach(([date, value]) => {
    if (!isDateLabel(date) || !valid.has(date)) throw new MonthPlanInputError(`${date} is not a date in ${month}`);
    days[date] = cleanDay(value, date);
  });
  if (!Object.keys(days).length) throw new MonthPlanInputError('The plan has no dates');
  return days;
}

const planQuery = (consultant: any, months: string[]) => ({
  consultantId: { $in: consultantIds(consultant) },
  month: { $in: months }
});

export async function getMonthPlan(consultant: any, month: string): Promise<any | null> {
  const db = getDatabase();
  return db.collection(MONTH_PLAN_COLLECTION).findOne(planQuery(consultant, [month])).catch(() => null);
}

/** Planned hours by date for the given dates (only dates that a saved plan covers) */
export async function loadPlannedDays(consultant: any, dates: string[]): Promise<Record<string, PlanDay>> {
  const months = Array.from(new Set(dates.map((d) => d.slice(0, 7))));
  if (!months.length) return {};
  const db = getDatabase();
  const plans = await db.collection(MONTH_PLAN_COLLECTION).find(planQuery(consultant, months)).toArray().catch(() => []);
  const wanted = new Set(dates);
  const result: Record<string, PlanDay> = {};
  plans.forEach((p: any) => {
    Object.entries(p.days || {}).forEach(([date, day]) => {
      if (wanted.has(date)) result[date] = day as PlanDay;
    });
  });
  return result;
}

/** Upcoming sessions in the month whose start falls outside the planned hours of their date */
export async function planConflicts(consultant: any, days: Record<string, PlanDay>): Promise<any[]> {
  const db = getDatabase();
  const ids = consultantIds(consultant);
  const bookings = await db.collection('Booking')
    .find({ $or: [{ consultantId: { $in: ids } }, { therapistId: { $in: ids } }] })
    .toArray()
    .catch(() => []);
  const now = Date.now();
  const conflicts: any[] = [];
  bookings.forEach((b: any) => {
    if (!UPCOMING_STATUSES.has(bookingStatusOf(b))) return;
    const when = bookingInstant(b);
    if (!when || when.getTime() <= now) return;
    const { date, time } = istLabels(when);
    const day = days[date];
    if (!day) return;
    const start = parseTimeLabel(time)!;
    const inside = day.enabled && day.slots.some((s) => {
      const from = parseTimeLabel(s.start)!;
      const to = parseTimeLabel(s.end)!;
      return start >= from && start < to;
    });
    if (!inside) {
      conflicts.push({
        bookingId: b.id || String(b._id),
        date,
        time,
        clientName: b.clientName || 'Client',
        serviceTitle: b.serviceTitle || 'Session'
      });
    }
  });
  return conflicts.sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`));
}

export async function saveMonthPlan(
  consultant: any,
  month: string,
  days: Record<string, PlanDay>,
  weeks: any,
  by: { email?: string; role?: string }
): Promise<any> {
  const db = getDatabase();
  const consultantId = String(consultant._id);
  const doc = {
    id: `PLAN-${consultantId}-${month}`,
    consultantId,
    consultantName: consultant.name || '',
    month,
    days,
    weeks: cleanWeeks(weeks),
    updatedAt: new Date(),
    updatedBy: { email: by.email || '', role: by.role || '' }
  };
  // Remove plans stored under the consultant's other id so one plan per month remains
  await db.collection(MONTH_PLAN_COLLECTION).deleteMany({ ...planQuery(consultant, [month]), consultantId: { $in: consultantIds(consultant).filter((i) => i !== consultantId) } });
  await db.collection(MONTH_PLAN_COLLECTION).updateOne(
    { consultantId, month },
    { $set: doc, $setOnInsert: { createdAt: new Date() } },
    { upsert: true }
  );
  return doc;
}

export async function deleteMonthPlan(consultant: any, month: string): Promise<number> {
  const db = getDatabase();
  const r = await db.collection(MONTH_PLAN_COLLECTION).deleteMany(planQuery(consultant, [month]));
  return r.deletedCount || 0;
}

/** Which consultants have a plan for the month (admin overview) */
export async function monthPlanStatus(month: string): Promise<{ consultantId: string; name: string; planned: boolean; updatedAt?: Date }[]> {
  const db = getDatabase();
  const [consultants, plans] = await Promise.all([
    db.collection('Consultant').find({}, { projection: { _id: 1, id: 1, name: 1 } }).toArray().catch(() => []),
    db.collection(MONTH_PLAN_COLLECTION).find({ month }, { projection: { consultantId: 1, updatedAt: 1 } }).toArray().catch(() => [])
  ]);
  const byId = new Map<string, any>(plans.map((p: any) => [String(p.consultantId), p] as [string, any]));
  return consultants
    .map((c: any) => {
      const plan = consultantIds(c).map((i) => byId.get(i)).find(Boolean) as any;
      return { consultantId: String(c._id), name: c.name || 'Therapist', planned: !!plan, updatedAt: plan?.updatedAt };
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}
