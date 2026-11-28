import { useState } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  User,
  Target,
  ClipboardList,
  ChevronRight,
  ChevronLeft,
  Check,
  X,
  Plus,
} from "lucide-react";
import { getAuthUser } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";

interface AddClientDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const STEPS = [
  { id: 1, label: "Personal Info", icon: User },
  { id: 2, label: "Care", icon: ClipboardList },
  { id: 3, label: "Goals", icon: Target },
];

const PRESENTING_PROBLEMS_OPTIONS = [
  "Generalized Anxiety", "Social Anxiety", "Panic Disorder",
  "Depression", "Major Depressive Disorder", "Dysthymia",
  "PTSD", "Trauma", "Complex Trauma",
  "OCD", "Burnout", "Grief",
  "Relationship Issues", "Anger Management", "ADHD",
  "Bipolar Disorder", "Eating Concerns", "Body Image",
  "Substance Use", "Life Transitions", "Identity Issues",
];

export default function AddClientDialog({ open, onOpenChange }: AddClientDialogProps) {
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [problemInput, setProblemInput] = useState("");
  const { toast } = useToast();

  const [form, setForm] = useState({
    name: "", email: "", phone: "", age: "", gender: "", preferredLanguage: "English",
    communicationPreference: "Video", status: "new", primaryGoal: "",
    presentingProblems: [] as string[], therapyTimeline: "", therapyGoals: ["", "", ""],
    aiIntakeSummary: "",
  });

  const set = (field: string, value: unknown) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const toggleProblem = (p: string) => {
    set(
      "presentingProblems",
      form.presentingProblems.includes(p)
        ? form.presentingProblems.filter((x) => x !== p)
        : [...form.presentingProblems, p]
    );
  };

  const addCustomProblem = () => {
    const val = problemInput.trim();
    if (val && !form.presentingProblems.includes(val)) {
      set("presentingProblems", [...form.presentingProblems, val]);
    }
    setProblemInput("");
  };

  const updateGoal = (i: number, val: string) => {
    const goals = [...form.therapyGoals];
    goals[i] = val;
    set("therapyGoals", goals);
  };

  const handleClose = () => {
    onOpenChange(false);
    setTimeout(() => {
      setStep(1);
      setForm({
        name: "", email: "", phone: "", age: "", gender: "", preferredLanguage: "English",
        communicationPreference: "Video", status: "new", primaryGoal: "",
        presentingProblems: [], therapyTimeline: "", therapyGoals: ["", "", ""],
        aiIntakeSummary: "",
      });
    }, 300);
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const authUser = getAuthUser();
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name.trim(),
          email: form.email.trim().toLowerCase(),
          phone: form.phone.trim(),
          role: 'USER',
          status: form.status === 'new' ? 'Active' : form.status.charAt(0).toUpperCase() + form.status.slice(1),
          assignedTherapistId: authUser?.id || '',
          assignedTherapistName: authUser?.name || '',
          primaryGoal: form.primaryGoal.trim(),
          therapyGoals: form.therapyGoals.filter(Boolean),
          presentingProblems: form.presentingProblems,
          aiIntakeSummary: form.aiIntakeSummary,
          therapyTimeline: form.therapyTimeline,
          gender: form.gender,
          age: form.age,
          preferredLanguage: form.preferredLanguage,
          communicationPreference: form.communicationPreference
        })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data?.success === false) {
        toast({
          title: "Could not create client",
          description: data?.error || "The client could not be saved. Please try again.",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Client created",
        description: data?.temporaryPassword
          ? `Temporary password for ${form.email.trim()}: ${data.temporaryPassword} — share it securely with the client.`
          : "The client profile has been saved.",
      });
      window.dispatchEvent(new Event('client_created'));
      handleClose();
    } catch (e: any) {
      console.error('Error creating client:', e);
      toast({
        title: "Could not create client",
        description: e?.message || "Unable to reach the server. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const emailValid = /^[^s@]+@[^s@]+.[^s@]+$/.test(form.email.trim());
  const canNext1 = form.name.trim() && emailValid && form.age && form.gender;
  const canNext2 = form.primaryGoal.trim() && form.presentingProblems.length > 0;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="w-[calc(100vw-2rem)] sm:max-w-2xl max-h-[92vh] flex flex-col p-0 gap-0 overflow-hidden short:overflow-y-auto rounded-2xl">
        {/* Purple header */}
        <div className="bg-primary px-4 sm:px-8 pt-6 sm:pt-8 pb-4 sm:pb-6 text-white shrink-0">
          <DialogHeader>
            <DialogTitle className="text-xl sm:text-2xl font-bold text-white">Add New Client</DialogTitle>
            <DialogDescription className="text-white/70 text-xs sm:text-sm mt-1">
              Complete the intake form to create a new client profile.
            </DialogDescription>
          </DialogHeader>

          {/* Step indicators */}
          <div className="flex flex-wrap sm:flex-nowrap items-center gap-1.5 sm:gap-2 mt-4 sm:mt-6">
            {STEPS.map((s, i) => {
              const Icon = s.icon;
              const active = step === s.id;
              const done = step > s.id;
              return (
                <div key={s.id} className="flex items-center gap-2">
                  <div className={cn(
                    "flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-all",
                    active && "bg-white text-primary",
                    done && "bg-white/20 text-white",
                    !active && !done && "bg-white/10 text-white/50",
                  )}>
                    {done
                      ? <Check className="w-3.5 h-3.5" />
                      : <Icon className="w-3.5 h-3.5" />
                    }
                    <span>{s.label}</span>
                  </div>
                  {i < STEPS.length - 1 && (
                    <ChevronRight className="w-4 h-4 text-white/30" />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Step content */}
        <div className="px-4 sm:px-8 py-5 sm:py-7 space-y-5 flex-1 min-h-0 overflow-y-auto max-h-[60vh] short:shrink-0 short:overflow-visible short:max-h-none">
          {step === 1 && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
                <div className="col-span-2 space-y-1.5">
                  <Label>Full Name <span className="text-destructive">*</span></Label>
                  <Input
                    placeholder="e.g. Emma Martinez"
                    value={form.name}
                    onChange={(e) => set("name", e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Email <span className="text-destructive">*</span></Label>
                  <Input
                    type="email"
                    placeholder="client@email.com"
                    value={form.email}
                    onChange={(e) => set("email", e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Phone</Label>
                  <Input
                    type="tel"
                    placeholder="e.g. +91 98765 43210"
                    value={form.phone}
                    onChange={(e) => set("phone", e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Age <span className="text-destructive">*</span></Label>
                  <Input
                    type="number"
                    placeholder="e.g. 28"
                    min={5}
                    max={120}
                    value={form.age}
                    onChange={(e) => set("age", e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Gender <span className="text-destructive">*</span></Label>
                  <Select value={form.gender} onValueChange={(v) => set("gender", v)}>
                    <SelectTrigger><SelectValue placeholder="Select gender" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Female">Female</SelectItem>
                      <SelectItem value="Male">Male</SelectItem>
                      <SelectItem value="Non-binary">Non-binary</SelectItem>
                      <SelectItem value="Prefer not to say">Prefer not to say</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Preferred Language</Label>
                  <Select value={form.preferredLanguage} onValueChange={(v) => set("preferredLanguage", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="English">English</SelectItem>
                      <SelectItem value="Spanish">Spanish</SelectItem>
                      <SelectItem value="French">French</SelectItem>
                      <SelectItem value="Mandarin">Mandarin</SelectItem>
                      <SelectItem value="Arabic">Arabic</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Session Format</Label>
                  <Select value={form.communicationPreference} onValueChange={(v) => set("communicationPreference", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Video">Video</SelectItem>
                      <SelectItem value="Phone">Phone</SelectItem>
                      <SelectItem value="In-person">In-person</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Initial Status</Label>
                  <Select value={form.status} onValueChange={(v) => set("status", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="new">New</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <div className="space-y-1.5">
                <Label>Primary Goal <span className="text-destructive">*</span></Label>
                <Input
                  placeholder="e.g. Manage anxiety and improve relationships"
                  value={form.primaryGoal}
                  onChange={(e) => set("primaryGoal", e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Presenting Problems <span className="text-destructive">*</span></Label>
                <div className="flex flex-wrap gap-2">
                  {PRESENTING_PROBLEMS_OPTIONS.map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => toggleProblem(p)}
                      className={cn(
                        "px-3 py-1 rounded-full text-xs font-medium border transition-all",
                        form.presentingProblems.includes(p)
                          ? "bg-primary text-white border-primary"
                          : "bg-secondary text-muted-foreground border-border hover:border-primary/40 hover:text-primary"
                      )}
                    >
                      {p}
                    </button>
                  ))}
                </div>
                <div className="flex gap-2 mt-1">
                  <Input
                    placeholder="Add custom concern..."
                    value={problemInput}
                    onChange={(e) => setProblemInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addCustomProblem())}
                    className="h-8 text-sm"
                  />
                  <Button size="sm" variant="outline" onClick={addCustomProblem} className="h-8 px-3">
                    <Plus className="w-3.5 h-3.5" />
                  </Button>
                </div>
                {form.presentingProblems.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {form.presentingProblems.map((p) => (
                      <Badge key={p} className="bg-primary/10 text-primary border-primary/20 gap-1 pr-1">
                        {p}
                        <button onClick={() => toggleProblem(p)} className="hover:text-destructive ml-0.5">
                          <X className="w-3 h-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-1.5">
                <Label>Therapy Timeline</Label>
                <Select value={form.therapyTimeline} onValueChange={(v) => set("therapyTimeline", v)}>
                  <SelectTrigger><SelectValue placeholder="Estimated duration" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="3 months">3 months</SelectItem>
                    <SelectItem value="3-6 months">3–6 months</SelectItem>
                    <SelectItem value="6 months">6 months</SelectItem>
                    <SelectItem value="6-9 months">6–9 months</SelectItem>
                    <SelectItem value="9-12 months">9–12 months</SelectItem>
                    <SelectItem value="12+ months">12+ months</SelectItem>
                    <SelectItem value="Ongoing">Ongoing</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </>
          )}

          {step === 3 && (
            <>
              <div className="space-y-3">
                <Label>Therapy Goals</Label>
                <p className="text-xs text-muted-foreground -mt-1">List up to 3 specific goals for this client.</p>
                {form.therapyGoals.map((g, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center shrink-0">
                      {i + 1}
                    </div>
                    <Input
                      placeholder={`Goal ${i + 1}…`}
                      value={g}
                      onChange={(e) => updateGoal(i, e.target.value)}
                    />
                  </div>
                ))}
              </div>

              <div className="space-y-1.5">
                <Label>AI Intake Summary <span className="text-muted-foreground font-normal">(optional)</span></Label>
                <Textarea
                  placeholder="Brief summary of the client's presenting situation, background, and initial impression…"
                  value={form.aiIntakeSummary}
                  onChange={(e) => set("aiIntakeSummary", e.target.value)}
                  className="resize-none h-28 text-sm"
                />
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 sm:px-8 py-4 sm:py-5 border-t border-border bg-secondary/30 shrink-0">
          <Button
            variant="ghost"
            onClick={step === 1 ? handleClose : () => setStep(step - 1)}
            className="text-muted-foreground"
          >
            {step === 1 ? "Cancel" : (
              <><ChevronLeft className="w-4 h-4 mr-1" />Back</>
            )}
          </Button>

          {step < 3 ? (
            <Button
              className="bg-primary text-white px-6"
              onClick={() => setStep(step + 1)}
              disabled={step === 1 ? !canNext1 : !canNext2}
            >
              Continue
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          ) : (
            <Button
              className="bg-primary text-white px-6"
              onClick={handleSubmit}
              disabled={submitting}
            >
              {submitting ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Creating…
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Check className="w-4 h-4" />
                  Create Client
                </span>
              )}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
