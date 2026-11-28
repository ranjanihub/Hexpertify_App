import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { Check, Clock, Copy, Plus, Trash2 } from "lucide-react";
import { overlappingRanges } from "@/lib/month-plan";

export interface TimeSlot {
  start: string;
  end: string;
}

export interface DayConfig {
  enabled: boolean;
  slots: TimeSlot[];
}

export type Schedule = Record<string, DayConfig>;

export const DAYS = [
  { key: "monday", label: "Monday", short: "Mon" },
  { key: "tuesday", label: "Tuesday", short: "Tue" },
  { key: "wednesday", label: "Wednesday", short: "Wed" },
  { key: "thursday", label: "Thursday", short: "Thu" },
  { key: "friday", label: "Friday", short: "Fri" },
  { key: "saturday", label: "Saturday", short: "Sat" },
  { key: "sunday", label: "Sunday", short: "Sun" },
];

const TIMES = Array.from({ length: 28 }, (_, i) => {
  const totalMins = 7 * 60 + i * 30; // starts at 7:00 AM
  const h = Math.floor(totalMins / 60);
  const m = totalMins % 60;
  const ampm = h < 12 ? "AM" : "PM";
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${h12}:${m === 0 ? "00" : "30"} ${ampm}`;
});

// A new therapist starts on weekdays only; weekends are opt-in so nobody is bookable by surprise
export const DEFAULT_SCHEDULE: Schedule = {
  monday:    { enabled: true,  slots: [{ start: "9:00 AM", end: "6:00 PM" }] },
  tuesday:   { enabled: true,  slots: [{ start: "9:00 AM", end: "6:00 PM" }] },
  wednesday: { enabled: true,  slots: [{ start: "9:00 AM", end: "6:00 PM" }] },
  thursday:  { enabled: true,  slots: [{ start: "9:00 AM", end: "6:00 PM" }] },
  friday:    { enabled: true,  slots: [{ start: "9:00 AM", end: "5:00 PM" }] },
  saturday:  { enabled: false, slots: [{ start: "10:00 AM", end: "2:00 PM" }] },
  sunday:    { enabled: false, slots: [{ start: "10:00 AM", end: "2:00 PM" }] },
};

/** What is wrong with one day's hours ("" when fine): every range must end after it starts and ranges must not overlap */
export function dayProblem(cfg: DayConfig): string {
  if (!cfg?.enabled) return "";
  for (const s of cfg.slots) {
    const from = toMinutes(s.start);
    const to = toMinutes(s.end);
    if (from === null || to === null || to <= from) return `${s.start} – ${s.end}: the end time must be after the start time.`;
  }
  const clash = overlappingRanges(cfg.slots);
  return clash ? `${clash[0].start} – ${clash[0].end} and ${clash[1].start} – ${clash[1].end} overlap. Change or remove one of them.` : "";
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The therapist's Consultant _id; resolved from the signed-in email when not given */
  consultantId?: string;
  /** Called after the schedule is saved */
  onSaved?: () => void;
}

/** Minutes after midnight for "9:00 AM" or "14:00" */
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

/** "9:00 AM" (the dialog's time format) */
export function toLabel(total: number): string {
  const h = Math.floor(total / 60) % 24;
  const m = total % 60;
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${h12}:${String(m).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
}

/**
 * The saved weekly availability in the dialog's shape. Understands both stored shapes:
 * { monday: { enabled, slots: [{ start, end }] } } and { Monday: ["09:00", "10:00"] } (one-hour start times,
 * merged into ranges). Returns null when nothing is saved.
 */
export function scheduleFromSaved(saved: any): Schedule | null {
  if (!saved || typeof saved !== "object" || Array.isArray(saved) || Object.keys(saved).length === 0) return null;
  const entries = Object.entries(saved).map(([k, v]) => [k.toLowerCase(), v] as [string, any]);
  const result: Schedule = {};
  DAYS.forEach(({ key }) => {
    const value = entries.find(([k]) => k === key)?.[1];
    let slots: TimeSlot[] = [];
    let enabled = false;
    if (Array.isArray(value)) {
      const starts = value.map(toMinutes).filter((v): v is number => v !== null).sort((a, b) => a - b);
      starts.forEach((s) => {
        const last = slots[slots.length - 1];
        if (last && toMinutes(last.end) === s) last.end = toLabel(s + 60);
        else slots.push({ start: toLabel(s), end: toLabel(s + 60) });
      });
      enabled = slots.length > 0;
    } else if (value && typeof value === "object") {
      const raw = Array.isArray(value.slots) && value.slots.length ? value.slots : value.start ? [{ start: value.start, end: value.end }] : [];
      slots = raw
        .map((s: any) => ({ start: toMinutes(s?.start), end: toMinutes(s?.end) }))
        .filter((s: any) => s.start !== null)
        .map((s: any) => ({ start: toLabel(s.start), end: toLabel(s.end ?? s.start + 60) }));
      enabled = value.enabled !== false && slots.length > 0;
    }
    result[key] = { enabled, slots: slots.length ? slots : [{ start: "9:00 AM", end: "5:00 PM" }] };
  });
  return result;
}

/** The signed-in therapist's Consultant record id, matched by email */
async function resolveConsultantId(): Promise<string> {
  try {
    const storedUser = localStorage.getItem("hexpertify_auth_user");
    const email = String((storedUser ? JSON.parse(storedUser) : null)?.email || "").toLowerCase().trim();
    if (!email) return "";
    const res = await fetch("/api/consultants");
    if (!res.ok) return "";
    const data = await res.json();
    const list: any[] = Array.isArray(data?.consultants) ? data.consultants : Array.isArray(data) ? data : [];
    const mine = list.find((c) => String(c.email || "").toLowerCase().trim() === email);
    return mine ? String(mine._id || mine.id) : "";
  } catch {
    return "";
  }
}

export default function SetAvailabilityDialog({ open, onOpenChange, consultantId, onSaved }: Props) {
  const [schedule, setSchedule] = useState<Schedule>(DEFAULT_SCHEDULE);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resolvedId, setResolvedId] = useState("");
  const [error, setError] = useState("");

  // Opens with the therapist's saved schedule; the default schedule is only a fallback
  useEffect(() => {
    if (!open) return;
    setError("");
    let active = true;
    (async () => {
      setLoading(true);
      try {
        const id = consultantId || (await resolveConsultantId());
        if (!active) return;
        setResolvedId(id);
        if (!id) return;
        const res = await fetch(`/api/consultants/${encodeURIComponent(id)}`);
        const data = res.ok ? await res.json() : null;
        const consultant = data?.consultant || data;
        const savedSchedule = consultant?.availabilitySchedule ?? (typeof consultant?.availability === "object" ? consultant.availability : null);
        if (active) setSchedule(scheduleFromSaved(savedSchedule) || DEFAULT_SCHEDULE);
      } catch (err) {
        console.error("Error loading saved availability:", err);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [open, consultantId]);

  const toggleDay = (day: string) =>
    setSchedule((prev) => ({
      ...prev,
      [day]: { ...prev[day], enabled: !prev[day].enabled },
    }));

  const updateSlot = (day: string, idx: number, field: "start" | "end", value: string) =>
    setSchedule((prev) => {
      const slots = [...prev[day].slots];
      slots[idx] = { ...slots[idx], [field]: value };
      return { ...prev, [day]: { ...prev[day], slots } };
    });

  // New hours start where the day's latest hours end, so adding a range does not create an overlap
  const addSlot = (day: string) =>
    setSchedule((prev) => {
      const lastEnd = Math.max(...prev[day].slots.map((s) => toMinutes(s.end) ?? 0), 0);
      const latest = toMinutes(TIMES[TIMES.length - 1]) as number;
      const next = lastEnd && lastEnd + 60 <= latest
        ? { start: toLabel(lastEnd), end: toLabel(Math.min(lastEnd + 120, latest)) }
        : { start: "9:00 AM", end: "5:00 PM" };
      return { ...prev, [day]: { ...prev[day], slots: [...prev[day].slots, next] } };
    });

  const removeSlot = (day: string, idx: number) =>
    setSchedule((prev) => {
      const slots = prev[day].slots.filter((_, i) => i !== idx);
      return { ...prev, [day]: { ...prev[day], slots: slots.length ? slots : [{ start: "9:00 AM", end: "5:00 PM" }] } };
    });

  /** Gives every day the same hours as this day */
  const copyToAll = (day: string) =>
    setSchedule((prev) => {
      const next: Schedule = {};
      DAYS.forEach(({ key }) => { next[key] = { enabled: true, slots: prev[day].slots.map((s) => ({ ...s })) }; });
      return next;
    });

  // Problems per day; Save stays disabled while any day has one
  const problems: Record<string, string> = Object.fromEntries(DAYS.map(({ key }) => [key, dayProblem(schedule[key])]));
  const invalidDays = DAYS.filter(({ key }) => problems[key]);

  const handleSave = async () => {
    if (invalidDays.length) return;
    setSaving(true);
    setError("");
    try {
      // Saved on the therapist's Consultant record (not the login User id)
      const id = resolvedId || consultantId || (await resolveConsultantId());
      if (!id) throw new Error("Consultant profile not found");
      const res = await fetch(`/api/consultants/${encodeURIComponent(id)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ availability: schedule })
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || 'Could not save your hours. Please try again.');
      }
    } catch (err: any) {
      console.error('Error saving availability to DB:', err);
      setError(err?.message || 'Could not save your hours. Please try again.');
      setSaving(false);
      return;
    }
    setSaving(false);
    setSaved(true);
    onSaved?.();
    setTimeout(() => {
      setSaved(false);
      onOpenChange(false);
    }, 800);
  };

  const enabledCount = Object.values(schedule).filter((d) => d.enabled).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100vw-2rem)] sm:max-w-2xl max-h-[92vh] flex flex-col p-0 gap-0 overflow-hidden rounded-2xl">
        {/* Purple header */}
        <div className="bg-primary px-4 sm:px-8 pt-6 sm:pt-8 pb-4 sm:pb-6 text-white shrink-0">
          <DialogHeader>
            <DialogTitle className="text-xl sm:text-2xl font-bold text-white">Set Availability</DialogTitle>
            <DialogDescription className="text-white/70 text-xs sm:text-sm mt-1">
              Your weekly working hours. Clients can book one-hour sessions inside these hours.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-wrap items-center gap-2 sm:gap-3 mt-4 sm:mt-5">
            <div className="flex flex-wrap gap-1 sm:gap-1.5">
              {DAYS.map((d) => (
                <div
                  key={d.key}
                  className={cn(
                    "w-7 h-7 sm:w-9 sm:h-9 rounded-full flex items-center justify-center text-[10px] sm:text-xs font-semibold transition-all",
                    schedule[d.key].enabled
                      ? "bg-white text-primary font-bold shadow-xs"
                      : "bg-white/10 text-white/40"
                  )}
                >
                  {d.short.slice(0, 2)}
                </div>
              ))}
            </div>
            <span className="text-white/70 text-xs sm:text-sm ml-1">{enabledCount} days active</span>
          </div>
        </div>

        {/* Day rows */}
        <div className="divide-y divide-border flex-1 min-h-0 max-h-[55vh] overflow-y-auto">
          {DAYS.map((d) => {
            const cfg = schedule[d.key];
            return (
              <div
                key={d.key}
                className={cn(
                  "px-4 sm:px-8 py-3.5 sm:py-4 transition-colors",
                  cfg.enabled ? "bg-white" : "bg-secondary/30"
                )}
              >
                <div className="flex flex-col sm:flex-row sm:items-start gap-2.5 sm:gap-4">
                  {/* Toggle + label */}
                  <div className="flex items-center gap-3 w-32 pt-1 shrink-0">
                    <Switch
                      checked={cfg.enabled}
                      onCheckedChange={() => toggleDay(d.key)}
                      className="data-[state=checked]:bg-primary"
                    />
                    <Label
                      className={cn(
                        "font-semibold text-sm cursor-pointer",
                        cfg.enabled ? "text-foreground" : "text-muted-foreground"
                      )}
                      onClick={() => toggleDay(d.key)}
                    >
                      {d.label}
                    </Label>
                  </div>

                  {/* Slots */}
                  {cfg.enabled ? (
                    <div className="flex flex-col gap-2 flex-1">
                      {cfg.slots.map((slot, idx) => {
                        const backwards = (toMinutes(slot.end) ?? 0) <= (toMinutes(slot.start) ?? 0);
                        return (
                        <div key={idx} className="flex flex-wrap items-center gap-2">
                          <Clock className="w-3.5 h-3.5 text-muted-foreground shrink-0 hidden sm:inline" />
                          <Select
                            value={slot.start}
                            onValueChange={(v) => updateSlot(d.key, idx, "start", v)}
                          >
                            <SelectTrigger className={cn("h-8 w-[110px] text-xs sm:text-sm", backwards && "border-destructive")}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {TIMES.map((t) => (
                                <SelectItem key={t} value={t}>{t}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <span className="text-muted-foreground text-xs">to</span>
                          <Select
                            value={slot.end}
                            onValueChange={(v) => updateSlot(d.key, idx, "end", v)}
                          >
                            <SelectTrigger className={cn("h-8 w-[110px] text-xs sm:text-sm", backwards && "border-destructive")}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {TIMES.map((t) => (
                                <SelectItem key={t} value={t}>{t}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <button
                            type="button"
                            onClick={() => removeSlot(d.key, idx)}
                            className="text-muted-foreground hover:text-destructive transition-colors ml-1 p-1"
                            disabled={cfg.slots.length === 1}
                            title="Remove slot"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        );
                      })}
                      {problems[d.key] && (
                        <p className="text-xs font-semibold text-destructive">{problems[d.key]}</p>
                      )}
                      <div className="flex items-center gap-4 mt-0.5">
                        <button
                          type="button"
                          onClick={() => addSlot(d.key)}
                          className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 font-medium w-fit cursor-pointer"
                        >
                          <Plus className="w-3 h-3" />
                          Add hours
                        </button>
                        <button
                          type="button"
                          onClick={() => copyToAll(d.key)}
                          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary font-medium w-fit cursor-pointer"
                          title="Use these hours for every day of the week"
                        >
                          <Copy className="w-3 h-3" />
                          Copy to all days
                        </button>
                      </div>
                    </div>
                  ) : (
                    <span className="text-muted-foreground text-xs sm:text-sm pt-1 italic">Unavailable</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        {(error || invalidDays.length > 0) && (
          <p className="px-4 sm:px-8 py-2.5 text-xs font-semibold text-destructive bg-destructive/5 border-t border-destructive/20 shrink-0">
            {error || `Fix the hours on ${invalidDays.map((d) => d.label).join(", ")} before saving.`}
          </p>
        )}
        <div className="flex items-center justify-between px-4 sm:px-8 py-4 sm:py-5 border-t border-border bg-secondary/30 shrink-0">
          <Button variant="ghost" onClick={() => onOpenChange(false)} className="text-muted-foreground">
            Cancel
          </Button>
          <Button
            className="bg-primary hover:bg-primary/90 text-white px-8 rounded-xl font-bold shadow-md shadow-primary/20"
            onClick={handleSave}
            disabled={saving || saved || loading || invalidDays.length > 0}
          >
            {saved ? (
              <span className="flex items-center gap-2">
                <Check className="w-4 h-4" /> Saved!
              </span>
            ) : saving ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Saving…
              </span>
            ) : (
              "Save Availability"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

