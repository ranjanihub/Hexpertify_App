/**
 * Month plan logic: a therapist's hours for one month, set week by week.
 * Keep in sync with the copy in the Super Admin panel (src/lib/month-plan.ts).
 */

export interface PlanRange { start: string; end: string }
export interface PlanDay { enabled: boolean; slots: PlanRange[] }
export type WeekHours = Record<string, PlanDay>;

/** One week row of the editor: its own hours, or the same hours as an earlier week */
export interface PlanWeek { sameAs: number | null; days: WeekHours }

export const WEEK_DAYS = [
  { key: "monday", short: "Mon" },
  { key: "tuesday", short: "Tue" },
  { key: "wednesday", short: "Wed" },
  { key: "thursday", short: "Thu" },
  { key: "friday", short: "Fri" },
  { key: "saturday", short: "Sat" },
  { key: "sunday", short: "Sun" },
];

const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const SHORT_MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** Minutes after midnight for "9:00 AM", "09:00 AM" or "14:00" */
export function toMinutes(label: unknown): number | null {
  const m = String(label ?? "").trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
  if (!m) return null;
  let h = parseInt(m[1], 10);
  const min = parseInt(m[2], 10);
  const ampm = (m[3] || "").toUpperCase();
  if (ampm === "PM" && h < 12) h += 12;
  if (ampm === "AM" && h === 12) h = 0;
  return h * 60 + min;
}

/** "9:00 AM" */
export function toLabel(total: number): string {
  const h = Math.floor(total / 60) % 24;
  const m = total % 60;
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${h12}:${String(m).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
}

/** Half-hour times from 6:00 AM to 11:00 PM */
export const PLAN_TIMES = Array.from({ length: 35 }, (_, i) => toLabel(6 * 60 + i * 30));

const normalize = (label: string) => {
  const m = toMinutes(label);
  return m === null ? label : toLabel(m);
};

export const monthLabel = (month: string) => {
  const [y, m] = month.split("-").map(Number);
  return `${MONTH_NAMES[m - 1]} ${y}`;
};
export const monthName = (month: string) => MONTH_NAMES[Number(month.split("-")[1]) - 1];

export function monthOf(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export function shiftMonth(month: string, delta: number): string {
  const [y, m] = month.split("-").map(Number);
  return monthOf(new Date(y, m - 1 + delta, 1));
}

export interface PlanDate { date: string; dayKey: string; day: number }

/** The month's dates split into Monday–Sunday weeks (the first and last week may be partial) */
export function weeksOfMonth(month: string): PlanDate[][] {
  const [y, m] = month.split("-").map(Number);
  const count = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const weeks: PlanDate[][] = [];
  let current: PlanDate[] = [];
  for (let d = 1; d <= count; d++) {
    const weekday = new Date(Date.UTC(y, m - 1, d)).getUTCDay(); // 0 = Sunday
    const dayKey = WEEK_DAYS[(weekday + 6) % 7].key;
    current.push({ date: `${month}-${String(d).padStart(2, "0")}`, dayKey, day: d });
    if (dayKey === "sunday") {
      weeks.push(current);
      current = [];
    }
  }
  if (current.length) weeks.push(current);
  return weeks;
}

export function weekRangeLabel(dates: PlanDate[]): string {
  const first = dates[0];
  const last = dates[dates.length - 1];
  const mon = SHORT_MONTHS[Number(first.date.slice(5, 7)) - 1];
  return first.day === last.day ? `${first.day} ${mon}` : `${first.day}–${last.day} ${mon}`;
}

const cloneDay = (d?: PlanDay): PlanDay => ({
  enabled: !!d?.enabled,
  slots: (d?.slots || []).map((s) => ({ start: normalize(s.start), end: normalize(s.end) })),
});

export const cloneWeek = (w: WeekHours): WeekHours =>
  Object.fromEntries(WEEK_DAYS.map(({ key }) => [key, cloneDay(w[key])]));

/**
 * Weekly hours in the editor's shape. Understands { monday: { enabled, slots } }, { monday: { enabled, start, end } }
 * and { Monday: ["09:00", ...] } (one-hour start times, merged into ranges).
 */
export function weekFromWeekly(saved: any, fallback: WeekHours): WeekHours {
  if (!saved || typeof saved !== "object" || Array.isArray(saved) || !Object.keys(saved).length) return cloneWeek(fallback);
  const entries = Object.entries(saved).map(([k, v]) => [k.toLowerCase(), v] as [string, any]);
  const result: WeekHours = {};
  WEEK_DAYS.forEach(({ key }) => {
    const value = entries.find(([k]) => k === key)?.[1];
    let slots: PlanRange[] = [];
    if (Array.isArray(value)) {
      const starts = value
        .map((v) => (typeof v === "string" ? toMinutes(v) : toMinutes(v?.start)))
        .filter((v): v is number => v !== null)
        .sort((a, b) => a - b);
      starts.forEach((s) => {
        const last = slots[slots.length - 1];
        if (last && toMinutes(last.end) === s) last.end = toLabel(s + 60);
        else slots.push({ start: toLabel(s), end: toLabel(s + 60) });
      });
      result[key] = { enabled: slots.length > 0, slots };
      return;
    }
    if (value && typeof value === "object") {
      const raw = Array.isArray(value.slots) && value.slots.length ? value.slots : value.start ? [{ start: value.start, end: value.end }] : [];
      slots = raw
        .map((s: any) => ({ start: toMinutes(s?.start), end: toMinutes(s?.end) }))
        .filter((s: any) => s.start !== null)
        .map((s: any) => ({ start: toLabel(s.start), end: toLabel(s.end ?? s.start + 60) }));
      result[key] = { enabled: value.enabled !== false && slots.length > 0, slots };
      return;
    }
    result[key] = { enabled: false, slots: [] };
  });
  return result;
}

/** The week whose hours a row uses (follows "same as" links) */
export function resolveWeek(weeks: PlanWeek[], index: number): WeekHours {
  let i = index;
  const seen = new Set<number>();
  while (weeks[i]?.sameAs !== null && weeks[i]?.sameAs !== undefined && !seen.has(i)) {
    seen.add(i);
    i = weeks[i].sameAs as number;
  }
  return weeks[i]?.days || weeks[0].days;
}

/**
 * The editor rows for a month: the saved rows when they still match the month's weeks,
 * else rows rebuilt from the saved per-date hours, else week 1 from the weekly hours and the rest "same as week 1".
 */
export function initialWeeks(month: string, weekly: WeekHours, plan?: { days?: Record<string, PlanDay>; weeks?: PlanWeek[] } | null): PlanWeek[] {
  const weeks = weeksOfMonth(month);
  if (plan?.weeks && plan.weeks.length === weeks.length) {
    return plan.weeks.map((w, i) => ({
      sameAs: Number.isInteger(w.sameAs) && (w.sameAs as number) < i ? w.sameAs : null,
      days: cloneWeek(w.days || weekly),
    }));
  }
  if (plan?.days && Object.keys(plan.days).length) {
    return weeks.map((dates) => {
      const days = cloneWeek(weekly);
      dates.forEach((d) => {
        if (plan.days![d.date]) days[d.dayKey] = cloneDay(plan.days![d.date]);
      });
      return { sameAs: null, days };
    });
  }
  return weeks.map((_, i) => (i === 0 ? { sameAs: null, days: cloneWeek(weekly) } : { sameAs: 0, days: cloneWeek(weekly) }));
}

/** Hours for every date of the month, as the backend stores them */
export function planDays(month: string, weeks: PlanWeek[]): Record<string, PlanDay> {
  const days: Record<string, PlanDay> = {};
  weeksOfMonth(month).forEach((dates, i) => {
    const hours = resolveWeek(weeks, i);
    dates.forEach((d) => {
      const day = hours[d.dayKey];
      days[d.date] = day?.enabled && day.slots.length ? cloneDay(day) : { enabled: false, slots: [] };
    });
  });
  return days;
}

/** A readable problem with the hours, or "" when they can be saved */
export function planProblem(month: string, weeks: PlanWeek[]): string {
  const rows = weeksOfMonth(month);
  for (let i = 0; i < rows.length; i++) {
    if (weeks[i]?.sameAs !== null) continue;
    for (const d of rows[i]) {
      const day = weeks[i].days[d.dayKey];
      if (!day?.enabled) continue;
      for (const s of day.slots) {
        const from = toMinutes(s.start);
        const to = toMinutes(s.end);
        if (from === null || to === null || to <= from) {
          return `Week ${i + 1}, ${d.day} ${monthName(month).slice(0, 3)}: the end time must be after the start time.`;
        }
        if (to - from < 60) {
          return `Week ${i + 1}, ${d.day} ${monthName(month).slice(0, 3)}: ${s.start} – ${s.end} is shorter than a one-hour session.`;
        }
      }
    }
  }
  return "";
}

/** "10:00 AM – 1:00 PM, 4:00 PM – 7:00 PM" or "Off" */
export function dayHoursLabel(day?: PlanDay): string {
  if (!day?.enabled || !day.slots.length) return "Off";
  return day.slots.map((s) => `${s.start} – ${s.end}`).join(", ");
}
