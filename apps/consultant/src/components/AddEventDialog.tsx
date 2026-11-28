import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { Check, Video, Lock, Clock } from "lucide-react";

import { getAuthUser } from "@/lib/auth";

const EVENT_TYPES = [
  { value: "session",   label: "Client Session",    icon: Video,        color: "bg-primary/10 text-primary border-primary/20" },
  { value: "blocked",   label: "Block Time",        icon: Lock,         color: "bg-slate-100 text-slate-600 border-slate-200" },
  { value: "available", label: "Open Extra Hours",  icon: Clock,        color: "bg-green-50 text-green-700 border-green-200" },
];

const TIMES = Array.from({ length: 28 }, (_, i) => {
  const totalMins = 7 * 60 + i * 30;
  const h = Math.floor(totalMins / 60);
  const m = totalMins % 60;
  const ampm = h < 12 ? "AM" : "PM";
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${h12}:${m === 0 ? "00" : "30"} ${ampm}`;
});

function toMinutes(label: string): number {
  const m = String(label || "").match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!m) return -1;
  let h = parseInt(m[1], 10) % 12;
  if (m[3].toUpperCase() === "PM") h += 12;
  return h * 60 + parseInt(m[2], 10);
}

const DURATIONS = ["30 min", "50 min", "60 min", "80 min", "90 min", "120 min"];

const SESSION_TYPES = ["Individual Therapy", "CBT", "EMDR", "ACT", "DBT", "Couples Therapy", "Intake", "Crisis Check-in", "Group Therapy"];

/** Today's date in India time (sessions are scheduled in IST whatever the browser's timezone) */
function todayIST(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
}

/** The instant of an IST date + minutes after midnight, in ms */
function istMs(date: string, minutes: number): number | null {
  const m = String(date || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m || minutes < 0) return null;
  return Date.UTC(+m[1], +m[2] - 1, +m[3]) + (minutes - 330) * 60_000;
}

/** One of the therapist's existing sessions, used to refuse a double booking */
export interface BusySession { startMs: number; endMs: number; client: string; label: string }

export interface NewSlot { date: string; time: string; endTime?: string; title: string; client: string; type: string; duration: string; status: "booked" | "available" | "blocked" }

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultDate?: string; // e.g. "2026-07-27"
  /** Saves the event; resolves to an error message, or null when the server accepted it */
  onAddSlot?: (slot: NewSlot) => Promise<string | null>;
  /** The therapist's active sessions (for the overlap check) */
  sessions?: BusySession[];
}

export default function AddEventDialog({ open, onOpenChange, defaultDate, onAddSlot, sessions = [] }: Props) {
  const authUser = getAuthUser();
  const [saving, setSaving] = useState(false);
  const [saved,  setSaved]  = useState(false);
  const [error,  setError]  = useState("");
  const [clients, setClients] = useState<{ id: string; name: string; email: string }[]>([]);

  useEffect(() => {
    const myId = authUser?.id || '';
    const myName = authUser?.name || '';
    const query = new URLSearchParams();
    if (myId) query.set('consultantId', myId);
    if (myName) query.set('consultantName', myName);
    query.set('role', 'client');

    fetch(`/api/users?${query.toString()}`)
      .then(res => res.json())
      .then(data => {
        const raw = Array.isArray(data?.users) ? data.users : [];
        const clientList = raw.map((u: any) => ({
          id: String(u._id || u.id),
          name: u.name || 'Client',
          email: u.email || ''
        }));
        setClients(clientList);
        if (clientList.length > 0) {
          setForm(prev => ({ ...prev, client: clientList[0].name }));
        }
      })
      .catch(() => {});
  }, [authUser?.id, authUser?.name]);

  // A past day selected on the calendar opens on today instead
  const startDate = () => {
    const today = todayIST();
    return defaultDate && defaultDate >= today ? defaultDate : today;
  };

  const [form, setForm] = useState({
    type:        "session",
    client:      "",
    date:        startDate(),
    start:       "10:00 AM",
    end:         "11:00 AM",
    duration:    "50 min",
    title:       "Psychology Consultation",
    sessionType: "Individual Therapy",
  });

  useEffect(() => {
    if (open) {
      setForm(prev => ({ ...prev, date: startDate() }));
      setError("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defaultDate, open]);

  const set = (k: string, v: string) => {
    setForm(p => ({ ...p, [k]: v }));
    setError("");
  };

  const isSession = form.type === "session";

  const handleClose = () => {
    if (saving) return; // the save is still running; its result decides what happens next
    onOpenChange(false);
    setTimeout(() => {
      setSaved(false);
      setError("");
      setForm({ type: "session", client: clients[0]?.name || "", date: startDate(), start: "10:00 AM", end: "11:00 AM", duration: "50 min", title: "Psychology Consultation", sessionType: "Individual Therapy" });
    }, 300);
  };

  // Checked here so the therapist sees the reason before anything is sent (the server checks again)
  const problem = (() => {
    if (!form.date) return "";
    if (form.date < todayIST()) return "That date has already passed. Pick today or a later date.";
    const from = istMs(form.date, toMinutes(form.start));
    if (from === null) return "";
    const now = Date.now();
    if (isSession) {
      if (from <= now) return `${form.start} today has already passed. Pick a later time.`;
      const to = from + (parseInt(form.duration) || 50) * 60_000;
      const clash = sessions.find(s => s.startMs < to && s.endMs > from);
      if (clash) return `This overlaps your session with ${clash.client} (${clash.label}). Pick another time.`;
      return "";
    }
    const end = istMs(form.date, toMinutes(form.end));
    if (end !== null && end > from && end <= now) return "That time has already passed. Pick a later time.";
    return "";
  })();

  const handleSave = async () => {
    if (!onAddSlot || problem) return;
    setSaving(true);
    setError("");
    let failure: string | null;
    try {
      failure = await onAddSlot({
        date: form.date,
        time: form.start,
        endTime: isSession ? undefined : form.end,
        title: form.title,
        client: isSession ? (form.client || "Client Record") : (form.type === "blocked" ? "Blocked Time Slot" : "Open Consultation Slot"),
        type: isSession ? form.sessionType : form.title,
        duration: form.duration,
        status: form.type === "blocked" ? "blocked" : form.type === "available" ? "available" : "booked",
      });
    } catch (e: any) {
      failure = e?.message || "Could not save. Please try again.";
    }
    setSaving(false);

    // Keep the dialog open with the reason so nothing the therapist entered is lost
    if (failure) {
      setError(failure);
      return;
    }
    setSaved(true);
    setTimeout(() => {
      onOpenChange(false);
      setTimeout(() => {
        setSaved(false);
        setForm(p => ({ ...p, start: "10:00 AM", end: "11:00 AM" }));
      }, 300);
    }, 400);
  };

  const canSave = !problem && (isSession
    ? form.client && form.date && form.start && form.duration
    : form.date && form.start && toMinutes(form.end) > toMinutes(form.start));

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="w-[calc(100vw-2rem)] sm:max-w-lg max-h-[92vh] flex flex-col p-0 gap-0 overflow-hidden short:overflow-y-auto rounded-2xl">
        {/* Purple header */}
        <div className="bg-primary px-4 sm:px-8 pt-6 sm:pt-8 pb-4 sm:pb-6 text-white shrink-0">
          <DialogHeader>
            <DialogTitle className="text-xl sm:text-2xl font-bold text-white">Add Event</DialogTitle>
            <DialogDescription className="text-white/70 text-xs sm:text-sm mt-1">
              Schedule a session, block time, or mark availability for {authUser?.name || 'your profile'}.
            </DialogDescription>
          </DialogHeader>

          {/* Event type selector */}
          <div className="grid grid-cols-2 sm:flex flex-wrap gap-2 mt-4 sm:mt-5">
            {EVENT_TYPES.map(t => {
              const Icon = t.icon;
              const active = form.type === t.value;
              return (
                <button
                  key={t.value}
                  onClick={() => set("type", t.value)}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all",
                    active
                      ? "bg-white text-primary border-white"
                      : "bg-white/10 text-white/70 border-white/20 hover:bg-white/20"
                  )}
                >
                  <Icon className="w-3 h-3" />
                  {t.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Form body */}
        <div className="px-4 sm:px-8 py-5 sm:py-7 space-y-4 sm:space-y-5 flex-1 min-h-0 overflow-y-auto max-h-[60vh] short:shrink-0 short:overflow-visible short:max-h-none">
          {isSession ? (
            <div className="space-y-1.5">
              <Label>Client <span className="text-destructive">*</span></Label>
              {clients.length === 0 ? (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-500 font-medium">
                  No clients assigned to {authUser?.name || 'your consultant profile'} yet. When clients book sessions with you, they will appear here.
                </div>
              ) : (
                <Select value={form.client} onValueChange={v => set("client", v)}>
                  <SelectTrigger><SelectValue placeholder="Select your client" /></SelectTrigger>
                  <SelectContent>
                    {clients.map((c) => (
                      <SelectItem key={c.id || c.name} value={c.name}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          ) : (
            <p className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600 font-medium">
              {form.type === "blocked"
                ? "Every one-hour slot between the start and end time is blocked, so clients cannot book it."
                : "Every hour between the start and end time is opened for client booking on this date, even outside your weekly hours."}
            </p>
          )}

          <div className="space-y-1.5">
            <Label>Date <span className="text-destructive">*</span></Label>
            <Input
              type="date"
              min={todayIST()}
              value={form.date}
              onChange={e => set("date", e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div className="space-y-1.5">
              <Label>Start time <span className="text-destructive">*</span></Label>
              <Select value={form.start} onValueChange={v => set("start", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TIMES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {isSession ? (
              <div className="space-y-1.5">
                <Label>Duration</Label>
                <Select value={form.duration} onValueChange={v => set("duration", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {DURATIONS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <div className="space-y-1.5">
                <Label>End time <span className="text-destructive">*</span></Label>
                <Select value={form.end} onValueChange={v => set("end", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TIMES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {isSession && (
            <div className="space-y-1.5">
              <Label>Session type</Label>
              <Select value={form.sessionType} onValueChange={v => set("sessionType", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SESSION_TYPES.map(s =>
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
          )}

          {!isSession && toMinutes(form.end) <= toMinutes(form.start) && (
            <p className="text-xs font-semibold text-destructive">The end time must be after the start time.</p>
          )}
          {(error || problem) && (
            <p className="p-3 rounded-xl text-xs font-semibold text-destructive bg-destructive/5 border border-destructive/20">
              {error || problem}
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 sm:px-8 py-4 sm:py-5 border-t border-border bg-secondary/30 shrink-0">
          <Button variant="ghost" onClick={handleClose} disabled={saving} className="text-muted-foreground">
            Cancel
          </Button>
          <Button
            className="bg-primary text-white px-8"
            onClick={handleSave}
            disabled={!canSave || saving || saved}
          >
            {saved ? (
              <span className="flex items-center gap-2"><Check className="w-4 h-4" /> Added!</span>
            ) : saving ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Saving…
              </span>
            ) : "Add to Calendar"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
