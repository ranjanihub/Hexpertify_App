import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { AlertTriangle, ChevronLeft, ChevronRight, Copy, Plus, RotateCcw, Trash2 } from "lucide-react";
import { DEFAULT_SCHEDULE } from "@/components/SetAvailabilityDialog";
import {
  PLAN_TIMES,
  PlanDay,
  PlanWeek,
  WEEK_DAYS,
  cloneWeek,
  dayHoursLabel,
  initialWeeks,
  monthLabel,
  monthName,
  monthOf,
  planDays,
  planProblem,
  resolveWeek,
  shiftMonth,
  weekFromWeekly,
  weekRangeLabel,
  weeksOfMonth,
} from "@/lib/month-plan";

interface Conflict { bookingId: string; date: string; time: string; clientName: string; serviceTitle: string }

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The therapist's Consultant _id */
  consultantId: string;
  /** The month to open, YYYY-MM (defaults to next month) */
  initialMonth?: string;
  /** Called after a plan is saved or reset */
  onSaved?: () => void;
}

const SHORT_DAY: Record<string, string> = Object.fromEntries(WEEK_DAYS.map((d) => [d.key, d.short]));

export default function PlanMonthDialog({ open, onOpenChange, consultantId, initialMonth, onSaved }: Props) {
  const thisMonth = monthOf(new Date());
  const [month, setMonth] = useState(initialMonth || shiftMonth(thisMonth, 1));
  const [weeks, setWeeks] = useState<PlanWeek[]>([]);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [conflicts, setConflicts] = useState<Conflict[] | null>(null);
  const [dirty, setDirty] = useState(false);

  const rows = useMemo(() => weeksOfMonth(month), [month]);
  const now = new Date();
  const today = `${monthOf(now)}-${String(now.getDate()).padStart(2, "0")}`;

  useEffect(() => {
    if (open) setMonth(initialMonth || shiftMonth(thisMonth, 1));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initialMonth]);

  // Load the saved plan (or the weekly hours) whenever the month changes
  useEffect(() => {
    if (!open || !consultantId) return;
    let active = true;
    setLoading(true);
    setError("");
    setConflicts(null);
    setDirty(false);
    fetch(`/api/availability/month-plan?consultantId=${encodeURIComponent(consultantId)}&month=${month}`)
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data?.error || "Could not load your plan.");
        return data;
      })
      .then((data) => {
        if (!active) return;
        const weekly = weekFromWeekly(data?.weekly, DEFAULT_SCHEDULE);
        setWeeks(initialWeeks(month, weekly, data?.plan));
        setSavedAt(data?.plan?.updatedAt || null);
      })
      .catch((err) => {
        if (!active) return;
        setWeeks(initialWeeks(month, weekFromWeekly(null, DEFAULT_SCHEDULE), null));
        setSavedAt(null);
        setError(err?.message || "Could not load your plan.");
      })
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [open, consultantId, month]);

  const update = (fn: (prev: PlanWeek[]) => PlanWeek[]) => {
    setWeeks(fn);
    setDirty(true);
    setConflicts(null);
    setError("");
  };

  const setMode = (index: number, value: string) =>
    update((prev) =>
      prev.map((w, i) => {
        if (i !== index) return w;
        // "Custom" starts from the hours the week showed so far
        if (value === "custom") return { sameAs: null, days: cloneWeek(resolveWeek(prev, i)) };
        return { ...w, sameAs: Number(value) };
      })
    );

  const setDay = (index: number, dayKey: string, fn: (d: PlanDay) => PlanDay) =>
    update((prev) => prev.map((w, i) => (i === index ? { ...w, days: { ...w.days, [dayKey]: fn(w.days[dayKey]) } } : w)));

  /** Every later week uses this week's hours */
  const copyToFollowing = (index: number) =>
    update((prev) => prev.map((w, i) => (i > index ? { ...w, sameAs: index } : w)));

  const save = async (confirm: boolean) => {
    const problem = planProblem(month, weeks);
    if (problem) {
      setError(problem);
      return;
    }
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/availability/month-plan", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ consultantId, month, days: planDays(month, weeks), weeks, confirm }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 409 && Array.isArray(data?.conflicts)) {
        setConflicts(data.conflicts);
        return;
      }
      if (!res.ok) throw new Error(data?.error || "Could not save your plan. Please try again.");
      setSavedAt(data?.plan?.updatedAt || new Date().toISOString());
      setDirty(false);
      setConflicts(null);
      onSaved?.();
      onOpenChange(false);
    } catch (err: any) {
      setError(err?.message || "Could not save your plan. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const reset = async () => {
    if (!window.confirm(`Remove the ${monthName(month)} plan? Clients will see your usual weekly hours for ${monthName(month)}.`)) return;
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/availability/month-plan?consultantId=${encodeURIComponent(consultantId)}&month=${month}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Could not reset the plan.");
      onSaved?.();
      onOpenChange(false);
    } catch (err: any) {
      setError(err?.message || "Could not reset the plan.");
    } finally {
      setSaving(false);
    }
  };

  const goMonth = (delta: number) => {
    if (dirty && !window.confirm("You have unsaved changes for this month. Switch month anyway?")) return;
    setMonth((m) => shiftMonth(m, delta));
  };

  // Cancel, X, Esc and clicking outside all land here: unsaved edits are only dropped after a confirm
  const handleOpenChange = (next: boolean) => {
    if (!next && dirty && !saving && !window.confirm(`You have unsaved changes to your ${monthName(month)} hours. Close without saving?`)) return;
    onOpenChange(next);
  };

  const canGoBack = month > thisMonth;
  const canGoForward = month < shiftMonth(thisMonth, 6);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="w-[calc(100vw-1rem)] sm:w-[calc(100vw-2rem)] sm:max-w-3xl max-h-[94dvh] flex flex-col p-0 gap-0 overflow-hidden rounded-2xl">
        {/* Header */}
        <div className="bg-primary px-4 sm:px-8 pt-6 sm:pt-7 pb-4 sm:pb-5 text-white shrink-0">
          <DialogHeader>
            <DialogTitle className="text-xl sm:text-2xl font-bold text-white">Plan Month</DialogTitle>
            <DialogDescription className="text-white/75 text-xs sm:text-sm mt-1">
              Set your hours for each week of the month. Clients see exactly these slots. Booked sessions are never changed.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-wrap items-center justify-between gap-3 mt-4">
            <div className="flex items-center gap-1 bg-white/10 rounded-full p-1">
              <button
                type="button"
                onClick={() => goMonth(-1)}
                disabled={!canGoBack || loading || saving}
                className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-white/15 disabled:opacity-30"
                aria-label="Previous month"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="px-2 text-sm font-bold min-w-[120px] text-center">{monthLabel(month)}</span>
              <button
                type="button"
                onClick={() => goMonth(1)}
                disabled={!canGoForward || loading || saving}
                className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-white/15 disabled:opacity-30"
                aria-label="Next month"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
            <span
              className={cn(
                "text-[11px] font-bold px-2.5 py-1 rounded-full",
                savedAt ? "bg-emerald-400/20 text-emerald-100" : "bg-amber-300/20 text-amber-100"
              )}
            >
              {savedAt ? `Planned · saved ${new Date(savedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}` : "Not planned yet – your weekly hours apply"}
            </span>
          </div>
        </div>

        {/* Weeks */}
        <div className="flex-1 min-h-0 overflow-y-auto bg-secondary/20">
          {loading ? (
            <div className="p-10 text-center text-sm text-muted-foreground">Loading your hours…</div>
          ) : (
            <div className="p-3 sm:p-5 space-y-3">
              {rows.map((dates, i) => {
                const week = weeks[i];
                if (!week) return null;
                const hours = resolveWeek(weeks, i);
                const isCustom = week.sameAs === null;
                const allPast = dates[dates.length - 1].date < today;
                return (
                  <div key={i} className={cn("bg-white rounded-2xl border border-border shadow-xs", allPast && "opacity-60")}>
                    <div className="flex flex-wrap items-center justify-between gap-2 px-3 sm:px-4 py-3 border-b border-border">
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-foreground">
                          Week {i + 1} <span className="font-medium text-muted-foreground">· {weekRangeLabel(dates)}</span>
                        </p>
                        {allPast && <p className="text-[11px] text-muted-foreground">Already past</p>}
                      </div>
                      <Select value={isCustom ? "custom" : String(week.sameAs)} onValueChange={(v) => setMode(i, v)}>
                        <SelectTrigger className="h-8 w-[170px] text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="custom">Own hours</SelectItem>
                          {Array.from({ length: i }, (_, j) => (
                            <SelectItem key={j} value={String(j)}>Same as Week {j + 1}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="divide-y divide-border">
                      {dates.map((d) => {
                        const day = hours[d.dayKey];
                        const past = d.date < today;
                        return (
                          <div key={d.date} className="px-3 sm:px-4 py-2.5 flex flex-col sm:flex-row sm:items-start gap-2 sm:gap-3">
                            <div className="flex items-center gap-2.5 sm:w-28 shrink-0 sm:pt-1">
                              {isCustom && (
                                <Switch
                                  checked={!!day?.enabled}
                                  onCheckedChange={(on) =>
                                    setDay(i, d.dayKey, (prev) => ({
                                      enabled: on,
                                      slots: on && !prev?.slots?.length ? [{ start: "10:00 AM", end: "1:00 PM" }] : prev?.slots || [],
                                    }))
                                  }
                                  className="data-[state=checked]:bg-primary"
                                />
                              )}
                              <span className={cn("text-sm font-semibold", day?.enabled ? "text-foreground" : "text-muted-foreground")}>
                                {SHORT_DAY[d.dayKey]} {d.day}
                              </span>
                              {past && <span className="text-[10px] text-muted-foreground">past</span>}
                            </div>

                            {!isCustom || !day?.enabled ? (
                              <span className={cn("text-xs sm:text-sm sm:pt-1", day?.enabled ? "text-foreground" : "text-muted-foreground italic")}>
                                {day?.enabled ? dayHoursLabel(day) : "Off / leave"}
                              </span>
                            ) : (
                              <div className="flex flex-col gap-2 flex-1 min-w-0">
                                {day.slots.map((slot, idx) => (
                                  <div key={idx} className="flex flex-wrap items-center gap-2">
                                    <Select
                                      value={slot.start}
                                      onValueChange={(v) =>
                                        setDay(i, d.dayKey, (prev) => ({ ...prev, slots: prev.slots.map((s, k) => (k === idx ? { ...s, start: v } : s)) }))
                                      }
                                    >
                                      <SelectTrigger className="h-8 w-[105px] text-xs"><SelectValue /></SelectTrigger>
                                      <SelectContent>
                                        {PLAN_TIMES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                                      </SelectContent>
                                    </Select>
                                    <span className="text-muted-foreground text-xs">to</span>
                                    <Select
                                      value={slot.end}
                                      onValueChange={(v) =>
                                        setDay(i, d.dayKey, (prev) => ({ ...prev, slots: prev.slots.map((s, k) => (k === idx ? { ...s, end: v } : s)) }))
                                      }
                                    >
                                      <SelectTrigger className="h-8 w-[105px] text-xs"><SelectValue /></SelectTrigger>
                                      <SelectContent>
                                        {PLAN_TIMES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                                      </SelectContent>
                                    </Select>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setDay(i, d.dayKey, (prev) => {
                                          const slots = prev.slots.filter((_, k) => k !== idx);
                                          return { enabled: slots.length > 0, slots };
                                        })
                                      }
                                      className="text-muted-foreground hover:text-destructive p-1"
                                      title="Remove these hours"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                ))}
                                <button
                                  type="button"
                                  onClick={() =>
                                    setDay(i, d.dayKey, (prev) => ({ ...prev, slots: [...prev.slots, { start: "4:00 PM", end: "7:00 PM" }] }))
                                  }
                                  className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 font-medium w-fit"
                                >
                                  <Plus className="w-3 h-3" /> Add hours
                                </button>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {isCustom && i < rows.length - 1 && (
                      <div className="px-3 sm:px-4 py-2 border-t border-border bg-secondary/20 rounded-b-2xl">
                        <button
                          type="button"
                          onClick={() => copyToFollowing(i)}
                          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary font-medium"
                        >
                          <Copy className="w-3 h-3" /> Use these hours for all weeks after this
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Booked sessions outside the new hours */}
        {conflicts && conflicts.length > 0 && (
          <div className="px-4 sm:px-8 py-3 border-t border-amber-200 bg-amber-50 shrink-0 max-h-[30vh] overflow-y-auto">
            <p className="flex items-center gap-2 text-sm font-bold text-amber-900">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              {conflicts.length} booked session{conflicts.length === 1 ? " falls" : "s fall"} outside these hours
            </p>
            <ul className="mt-1.5 space-y-0.5 text-xs text-amber-900">
              {conflicts.map((c) => (
                <li key={c.bookingId}>
                  {new Date(`${c.date}T00:00:00`).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" })} · {c.time} · {c.clientName}
                </li>
              ))}
            </ul>
            <p className="mt-1.5 text-[11px] text-amber-800">
              Saving keeps these sessions as booked. Reschedule or cancel them yourself if you won't be available.
            </p>
          </div>
        )}

        {error && (
          <p className="px-4 sm:px-8 py-2.5 text-xs font-semibold text-destructive bg-destructive/5 border-t border-destructive/20 shrink-0">{error}</p>
        )}

        {/* Footer */}
        <div className="flex flex-col-reverse sm:flex-row sm:items-center justify-between gap-2 px-4 sm:px-8 py-3 sm:py-4 border-t border-border bg-secondary/30 shrink-0">
          <div>
            {savedAt && (
              <Button variant="ghost" onClick={reset} disabled={saving || loading} className="text-muted-foreground w-full sm:w-auto">
                <RotateCcw className="w-3.5 h-3.5 mr-1.5" /> Use weekly hours instead
              </Button>
            )}
          </div>
          <div className="flex flex-col-reverse sm:flex-row gap-2">
            <Button variant="ghost" onClick={() => handleOpenChange(false)} className="text-muted-foreground">
              Cancel
            </Button>
            <Button
              className={cn(
                "text-white px-6 rounded-xl font-bold shadow-md",
                conflicts?.length ? "bg-amber-600 hover:bg-amber-700" : "bg-primary hover:bg-primary/90 shadow-primary/20"
              )}
              onClick={() => save(!!conflicts?.length)}
              disabled={saving || loading || !weeks.length}
            >
              {saving ? "Saving…" : conflicts?.length ? "Save anyway" : `Save ${monthName(month)}`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
