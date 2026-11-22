import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, ChevronLeft, ChevronRight, Copy, Plus, RotateCcw, Trash2, X } from 'lucide-react';
import {
  PLAN_TIMES,
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
  weeksOfMonth
} from '../../lib/month-plan';
import type { PlanDay, PlanWeek, WeekHours } from '../../lib/month-plan';

interface Conflict { bookingId: string; date: string; time: string; clientName: string; serviceTitle: string }

interface Props {
  open: boolean;
  onClose: () => void;
  consultantId: string;
  consultantName: string;
  /** YYYY-MM to open (defaults to next month) */
  initialMonth?: string;
  onSaved?: (message: string) => void;
}

/** Same default as the therapist panel and the backend, for therapists who never saved weekly hours */
const DEFAULT_WEEK: WeekHours = {
  monday: { enabled: true, slots: [{ start: '9:00 AM', end: '6:00 PM' }] },
  tuesday: { enabled: true, slots: [{ start: '9:00 AM', end: '6:00 PM' }] },
  wednesday: { enabled: true, slots: [{ start: '9:00 AM', end: '6:00 PM' }] },
  thursday: { enabled: true, slots: [{ start: '9:00 AM', end: '6:00 PM' }] },
  friday: { enabled: true, slots: [{ start: '9:00 AM', end: '5:00 PM' }] },
  saturday: { enabled: true, slots: [{ start: '10:00 AM', end: '2:00 PM' }] },
  sunday: { enabled: true, slots: [{ start: '10:00 AM', end: '2:00 PM' }] }
};

const SHORT_DAY: Record<string, string> = Object.fromEntries(WEEK_DAYS.map((d) => [d.key, d.short]));
const selectClass =
  'h-8 px-2 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 outline-none focus:border-[#5e2be2] cursor-pointer';

export const PlanMonthModal: React.FC<Props> = ({ open, onClose, consultantId, consultantName, initialMonth, onSaved }) => {
  const thisMonth = monthOf(new Date());
  const [month, setMonth] = useState(initialMonth || shiftMonth(thisMonth, 1));
  const [weeks, setWeeks] = useState<PlanWeek[]>([]);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [savedBy, setSavedBy] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [conflicts, setConflicts] = useState<Conflict[] | null>(null);
  const [dirty, setDirty] = useState(false);

  const rows = useMemo(() => weeksOfMonth(month), [month]);
  const now = new Date();
  const today = `${monthOf(now)}-${String(now.getDate()).padStart(2, '0')}`;

  useEffect(() => {
    if (open) setMonth(initialMonth || shiftMonth(thisMonth, 1));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initialMonth]);

  useEffect(() => {
    if (!open || !consultantId) return;
    let active = true;
    setLoading(true);
    setError('');
    setConflicts(null);
    setDirty(false);
    fetch(`/api/availability/month-plan?consultantId=${encodeURIComponent(consultantId)}&month=${month}`)
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data?.error || 'Could not load the plan.');
        return data;
      })
      .then((data) => {
        if (!active) return;
        setWeeks(initialWeeks(month, weekFromWeekly(data?.weekly, DEFAULT_WEEK), data?.plan));
        setSavedAt(data?.plan?.updatedAt || null);
        setSavedBy(data?.plan?.updatedBy?.role === 'therapist' ? 'therapist' : data?.plan?.updatedBy?.role ? 'admin' : '');
      })
      .catch((err) => {
        if (!active) return;
        setWeeks(initialWeeks(month, weekFromWeekly(null, DEFAULT_WEEK), null));
        setSavedAt(null);
        setError(err?.message || 'Could not load the plan.');
      })
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [open, consultantId, month]);

  if (!open) return null;

  const update = (fn: (prev: PlanWeek[]) => PlanWeek[]) => {
    setWeeks(fn);
    setDirty(true);
    setConflicts(null);
    setError('');
  };

  const setMode = (index: number, value: string) =>
    update((prev) =>
      prev.map((w, i) => {
        if (i !== index) return w;
        if (value === 'custom') return { sameAs: null, days: cloneWeek(resolveWeek(prev, i)) };
        return { ...w, sameAs: Number(value) };
      })
    );

  const setDay = (index: number, dayKey: string, fn: (d: PlanDay) => PlanDay) =>
    update((prev) => prev.map((w, i) => (i === index ? { ...w, days: { ...w.days, [dayKey]: fn(w.days[dayKey]) } } : w)));

  const copyToFollowing = (index: number) => update((prev) => prev.map((w, i) => (i > index ? { ...w, sameAs: index } : w)));

  const save = async (confirm: boolean) => {
    const problem = planProblem(month, weeks);
    if (problem) {
      setError(problem);
      return;
    }
    setSaving(true);
    setError('');
    try {
      const res = await fetch('/api/availability/month-plan', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ consultantId, month, days: planDays(month, weeks), weeks, confirm })
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 409 && Array.isArray(data?.conflicts)) {
        setConflicts(data.conflicts);
        return;
      }
      if (!res.ok) throw new Error(data?.error || 'Could not save the plan.');
      setDirty(false);
      onSaved?.(`${monthLabel(month)} hours saved for ${consultantName}`);
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Could not save the plan.');
    } finally {
      setSaving(false);
    }
  };

  const reset = async () => {
    if (!window.confirm(`Remove ${consultantName}'s ${monthName(month)} plan? Their usual weekly hours will apply.`)) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/availability/month-plan?consultantId=${encodeURIComponent(consultantId)}&month=${month}`, { method: 'DELETE' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'Could not reset the plan.');
      onSaved?.(`${monthLabel(month)} plan removed – weekly hours apply`);
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Could not reset the plan.');
    } finally {
      setSaving(false);
    }
  };

  const goMonth = (delta: number) => {
    if (dirty && !window.confirm('You have unsaved changes for this month. Switch month anyway?')) return;
    setMonth((m) => shiftMonth(m, delta));
  };

  return createPortal(
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white w-full sm:max-w-3xl max-h-[94dvh] rounded-t-3xl sm:rounded-3xl shadow-2xl border border-slate-100 flex flex-col overflow-hidden animate-fade-in">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#431bb5] via-[#5e2be2] to-[#361394] px-4 sm:px-6 pt-5 pb-4 text-white shrink-0">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="text-lg sm:text-xl font-extrabold">Plan Month</h3>
              <p className="text-xs text-white/80 mt-0.5 truncate">Hours for {consultantName}, week by week. Booked sessions are never changed.</p>
            </div>
            <button type="button" onClick={onClose} className="p-1.5 rounded-full hover:bg-white/15 shrink-0" aria-label="Close">
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2 mt-3">
            <div className="flex items-center gap-1 bg-white/10 rounded-full p-1">
              <button
                type="button"
                onClick={() => goMonth(-1)}
                disabled={month <= thisMonth || loading || saving}
                className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-white/15 disabled:opacity-30"
                aria-label="Previous month"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="px-2 text-sm font-bold min-w-[120px] text-center">{monthLabel(month)}</span>
              <button
                type="button"
                onClick={() => goMonth(1)}
                disabled={month >= shiftMonth(thisMonth, 6) || loading || saving}
                className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-white/15 disabled:opacity-30"
                aria-label="Next month"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
            <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${savedAt ? 'bg-emerald-400/20 text-emerald-100' : 'bg-amber-300/20 text-amber-100'}`}>
              {savedAt
                ? `Planned${savedBy ? ` by ${savedBy}` : ''} · ${new Date(savedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`
                : 'Not planned – weekly hours apply'}
            </span>
          </div>
        </div>

        {/* Weeks */}
        <div className="flex-1 min-h-0 overflow-y-auto bg-slate-50/60 overscroll-contain">
          {loading ? (
            <div className="p-10 text-center text-sm text-slate-400">Loading hours…</div>
          ) : (
            <div className="p-3 sm:p-5 space-y-3">
              {rows.map((dates, i) => {
                const week = weeks[i];
                if (!week) return null;
                const hours = resolveWeek(weeks, i);
                const isCustom = week.sameAs === null;
                const allPast = dates[dates.length - 1].date < today;
                return (
                  <div key={i} className={`bg-white rounded-2xl border border-slate-200 ${allPast ? 'opacity-60' : ''}`}>
                    <div className="flex flex-wrap items-center justify-between gap-2 px-3 sm:px-4 py-3 border-b border-slate-100">
                      <p className="text-sm font-extrabold text-slate-900">
                        Week {i + 1} <span className="font-semibold text-slate-400">· {weekRangeLabel(dates)}</span>
                        {allPast && <span className="ml-2 text-[11px] font-semibold text-slate-400">past</span>}
                      </p>
                      <select value={isCustom ? 'custom' : String(week.sameAs)} onChange={(e) => setMode(i, e.target.value)} className={`${selectClass} w-[160px]`}>
                        <option value="custom">Own hours</option>
                        {Array.from({ length: i }, (_, j) => (
                          <option key={j} value={String(j)}>
                            Same as Week {j + 1}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="divide-y divide-slate-100">
                      {dates.map((d) => {
                        const day = hours[d.dayKey];
                        return (
                          <div key={d.date} className="px-3 sm:px-4 py-2.5 flex flex-col sm:flex-row sm:items-start gap-2 sm:gap-3">
                            <label className="flex items-center gap-2.5 sm:w-28 shrink-0 sm:pt-1.5 select-none">
                              {isCustom && (
                                <input
                                  type="checkbox"
                                  checked={!!day?.enabled}
                                  onChange={(e) =>
                                    setDay(i, d.dayKey, (prev) => ({
                                      enabled: e.target.checked,
                                      slots: e.target.checked && !prev?.slots?.length ? [{ start: '10:00 AM', end: '1:00 PM' }] : prev?.slots || []
                                    }))
                                  }
                                  className="w-4 h-4 accent-[#5e2be2] cursor-pointer"
                                />
                              )}
                              <span className={`text-sm font-bold ${day?.enabled ? 'text-slate-800' : 'text-slate-400'}`}>
                                {SHORT_DAY[d.dayKey]} {d.day}
                              </span>
                            </label>

                            {!isCustom || !day?.enabled ? (
                              <span className={`text-xs sm:text-sm sm:pt-1.5 ${day?.enabled ? 'text-slate-700 font-medium' : 'text-slate-400 italic'}`}>
                                {day?.enabled ? dayHoursLabel(day) : 'Off / leave'}
                              </span>
                            ) : (
                              <div className="flex flex-col gap-2 flex-1 min-w-0">
                                {day.slots.map((slot, idx) => (
                                  <div key={idx} className="flex flex-wrap items-center gap-2">
                                    <select
                                      value={slot.start}
                                      onChange={(e) =>
                                        setDay(i, d.dayKey, (prev) => ({ ...prev, slots: prev.slots.map((s, k) => (k === idx ? { ...s, start: e.target.value } : s)) }))
                                      }
                                      className={`${selectClass} w-[100px]`}
                                    >
                                      {!PLAN_TIMES.includes(slot.start) && <option value={slot.start}>{slot.start}</option>}
                                      {PLAN_TIMES.map((t) => (
                                        <option key={t} value={t}>{t}</option>
                                      ))}
                                    </select>
                                    <span className="text-xs text-slate-400 font-bold">to</span>
                                    <select
                                      value={slot.end}
                                      onChange={(e) =>
                                        setDay(i, d.dayKey, (prev) => ({ ...prev, slots: prev.slots.map((s, k) => (k === idx ? { ...s, end: e.target.value } : s)) }))
                                      }
                                      className={`${selectClass} w-[100px]`}
                                    >
                                      {!PLAN_TIMES.includes(slot.end) && <option value={slot.end}>{slot.end}</option>}
                                      {PLAN_TIMES.map((t) => (
                                        <option key={t} value={t}>{t}</option>
                                      ))}
                                    </select>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setDay(i, d.dayKey, (prev) => {
                                          const slots = prev.slots.filter((_, k) => k !== idx);
                                          return { enabled: slots.length > 0, slots };
                                        })
                                      }
                                      className="p-1 text-slate-400 hover:text-rose-600"
                                      title="Remove these hours"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                ))}
                                <button
                                  type="button"
                                  onClick={() => setDay(i, d.dayKey, (prev) => ({ ...prev, slots: [...prev.slots, { start: '4:00 PM', end: '7:00 PM' }] }))}
                                  className="flex items-center gap-1 text-xs font-bold text-[#5e2be2] w-fit"
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
                      <div className="px-3 sm:px-4 py-2 border-t border-slate-100 bg-slate-50/60 rounded-b-2xl">
                        <button type="button" onClick={() => copyToFollowing(i)} className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-[#5e2be2]">
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

        {conflicts && conflicts.length > 0 && (
          <div className="px-4 sm:px-6 py-3 border-t border-amber-200 bg-amber-50 shrink-0 max-h-[30vh] overflow-y-auto">
            <p className="flex items-center gap-2 text-sm font-extrabold text-amber-900">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              {conflicts.length} booked session{conflicts.length === 1 ? '' : 's'} fall outside these hours
            </p>
            <ul className="mt-1.5 space-y-0.5 text-xs text-amber-900">
              {conflicts.map((c) => (
                <li key={c.bookingId}>
                  {new Date(`${c.date}T00:00:00`).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })} · {c.time} · {c.clientName}
                </li>
              ))}
            </ul>
            <p className="mt-1.5 text-[11px] text-amber-800">Saving keeps these sessions as booked. Reschedule or cancel them separately if needed.</p>
          </div>
        )}

        {error && <p className="px-4 sm:px-6 py-2.5 text-xs font-bold text-rose-700 bg-rose-50 border-t border-rose-200 shrink-0">{error}</p>}

        <div className="flex flex-col-reverse sm:flex-row sm:items-center justify-between gap-2 px-4 sm:px-6 py-3 sm:py-4 border-t border-slate-100 bg-slate-50/60 shrink-0">
          <div>
            {savedAt && (
              <button
                type="button"
                onClick={reset}
                disabled={saving || loading}
                className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-3 py-2.5 text-xs font-bold text-slate-500 hover:text-slate-800 rounded-xl"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Use weekly hours instead
              </button>
            )}
          </div>
          <div className="flex flex-col-reverse sm:flex-row gap-2">
            <button type="button" onClick={onClose} className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs">
              Cancel
            </button>
            <button
              type="button"
              onClick={() => save(!!conflicts?.length)}
              disabled={saving || loading || !weeks.length}
              className={`px-5 py-2.5 rounded-xl text-white font-extrabold text-xs shadow-md disabled:opacity-50 ${
                conflicts?.length ? 'bg-amber-600 hover:bg-amber-700' : 'bg-[#5e2be2] hover:bg-[#4f28d9] shadow-[#5e2be2]/20'
              }`}
            >
              {saving ? 'Saving…' : conflicts?.length ? 'Save anyway' : `Save ${monthName(month)}`}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default PlanMonthModal;
