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

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultDate?: string; // e.g. "2026-07-27"
  onAddSlot?: (slot: { date: string; time: string; endTime?: string; title: string; client: string; type: string; duration: string; status: "booked" | "available" | "blocked" }) => void;
}

export default function AddEventDialog({ open, onOpenChange, defaultDate, onAddSlot }: Props) {
  const authUser = getAuthUser();
  const [saving, setSaving] = useState(false);
  const [saved,  setSaved]  = useState(false);
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

  const [form, setForm] = useState({
    type:     "session",
    client:   "",
    date:     defaultDate ?? new Date().toISOString().slice(0, 10),
    start:    "10:00 AM",
    end:      "11:00 AM",
    duration: "50 min",
    title:    "Psychology Consultation",
  });

  useEffect(() => {
    if (defaultDate) {
      setForm(prev => ({ ...prev, date: defaultDate }));
    }
  }, [defaultDate, open]);

  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));

  const isSession = form.type === "session";

  const handleClose = () => {
    onOpenChange(false);
    setTimeout(() => {
      setSaved(false);
      setForm({ type: "session", client: clients[0]?.name || "", date: defaultDate ?? new Date().toISOString().slice(0, 10), start: "10:00 AM", end: "11:00 AM", duration: "50 min", title: "Psychology Consultation" });
    }, 300);
  };

  const handleSave = async () => {
    setSaving(true);
    await new Promise(r => setTimeout(r, 200));

    if (onAddSlot) {
      onAddSlot({
        date: form.date,
        time: form.start,
        endTime: isSession ? undefined : form.end,
        title: form.title,
        client: isSession ? (form.client || "Client Record") : (form.type === "blocked" ? "Blocked Time Slot" : "Open Consultation Slot"),
        type: isSession ? "Individual Therapy" : form.title,
        duration: form.duration,
        status: form.type === "blocked" ? "blocked" : form.type === "available" ? "available" : "booked",
      });
    }

    setSaving(false);
    setSaved(true);
    setTimeout(() => {
      handleClose();
    }, 400);
  };

  const canSave = isSession
    ? form.client && form.date && form.start && form.duration
    : form.date && form.start && toMinutes(form.end) > toMinutes(form.start);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="w-[calc(100vw-2rem)] sm:max-w-lg max-h-[92vh] flex flex-col p-0 gap-0 overflow-hidden rounded-2xl">
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
        <div className="px-4 sm:px-8 py-5 sm:py-7 space-y-4 sm:space-y-5 flex-1 overflow-y-auto max-h-[60vh]">
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
              <Select defaultValue="CBT">
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["CBT","EMDR","ACT","DBT","Couples Therapy","Intake","Crisis Check-in","Group Therapy"].map(s =>
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 sm:px-8 py-4 sm:py-5 border-t border-border bg-secondary/30 shrink-0">
          <Button variant="ghost" onClick={handleClose} className="text-muted-foreground">
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
