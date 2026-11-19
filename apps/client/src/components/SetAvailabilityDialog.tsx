import { useState } from "react";
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
import { Check, Clock, Plus, Trash2 } from "lucide-react";

interface TimeSlot {
  start: string;
  end: string;
}

interface DayConfig {
  enabled: boolean;
  slots: TimeSlot[];
}

type Schedule = Record<string, DayConfig>;

const DAYS = [
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

const DEFAULT_SCHEDULE: Schedule = {
  monday:    { enabled: true,  slots: [{ start: "9:00 AM", end: "6:00 PM" }] },
  tuesday:   { enabled: true,  slots: [{ start: "9:00 AM", end: "6:00 PM" }] },
  wednesday: { enabled: true,  slots: [{ start: "9:00 AM", end: "6:00 PM" }] },
  thursday:  { enabled: true,  slots: [{ start: "9:00 AM", end: "6:00 PM" }] },
  friday:    { enabled: true,  slots: [{ start: "9:00 AM", end: "5:00 PM" }] },
  saturday:  { enabled: true,  slots: [{ start: "10:00 AM", end: "2:00 PM" }] },
  sunday:    { enabled: true,  slots: [{ start: "10:00 AM", end: "2:00 PM" }] },
};

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function SetAvailabilityDialog({ open, onOpenChange }: Props) {
  const [schedule, setSchedule] = useState<Schedule>(DEFAULT_SCHEDULE);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

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

  const addSlot = (day: string) =>
    setSchedule((prev) => ({
      ...prev,
      [day]: {
        ...prev[day],
        slots: [...prev[day].slots, { start: "9:00 AM", end: "5:00 PM" }],
      },
    }));

  const removeSlot = (day: string, idx: number) =>
    setSchedule((prev) => {
      const slots = prev[day].slots.filter((_, i) => i !== idx);
      return { ...prev, [day]: { ...prev[day], slots: slots.length ? slots : [{ start: "9:00 AM", end: "5:00 PM" }] } };
    });

  const handleSave = async () => {
    setSaving(true);
    try {
      const storedUser = localStorage.getItem("hexpertify_auth_user");
      const user = storedUser ? JSON.parse(storedUser) : null;
      if (user?.id) {
        await fetch(`/api/consultants/${user.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ availability: schedule })
        });
      }
    } catch (err) {
      console.error('Error saving availability to DB:', err);
    }
    setSaving(false);
    setSaved(true);
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
              Configure your weekly working hours for session bookings.
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
                      {cfg.slots.map((slot, idx) => (
                        <div key={idx} className="flex flex-wrap items-center gap-2">
                          <Clock className="w-3.5 h-3.5 text-muted-foreground shrink-0 hidden sm:inline" />
                          <Select
                            value={slot.start}
                            onValueChange={(v) => updateSlot(d.key, idx, "start", v)}
                          >
                            <SelectTrigger className="h-8 w-[110px] text-xs sm:text-sm">
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
                            <SelectTrigger className="h-8 w-[110px] text-xs sm:text-sm">
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
                      ))}
                      <button
                        type="button"
                        onClick={() => addSlot(d.key)}
                        className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 font-medium mt-0.5 w-fit cursor-pointer"
                      >
                        <Plus className="w-3 h-3" />
                        Add slot
                      </button>
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
        <div className="flex items-center justify-between px-4 sm:px-8 py-4 sm:py-5 border-t border-border bg-secondary/30 shrink-0">
          <Button variant="ghost" onClick={() => onOpenChange(false)} className="text-muted-foreground">
            Cancel
          </Button>
          <Button
            className="bg-primary hover:bg-primary/90 text-white px-8 rounded-xl font-bold shadow-md shadow-primary/20"
            onClick={handleSave}
            disabled={saving || saved}
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
