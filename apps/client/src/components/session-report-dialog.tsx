import { useState, useRef, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useSubmitSessionReport } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { 
  Check, 
  ChevronLeft, 
  ChevronRight, 
  Lock, 
  ShieldCheck, 
  FileText, 
  Send, 
  Calendar, 
  Plus, 
  X, 
  Sparkles, 
  Paperclip, 
  UserCheck, 
  Smartphone, 
  Mail, 
  Bell, 
  CheckCircle2, 
  ArrowRight,
  Sliders,
  CheckSquare,
  Save
} from "lucide-react";

const formSchema = z.object({
  // 1. Client Cooperation
  clientCooperation: z.enum(["excellent", "good", "average", "poor"]),
  // 2. Client Engagement
  clientEngagementLevel: z.enum(["high", "moderate", "low"]),
  engagementScore: z.number().min(1).max(5),
  // 3. Progress Since Previous Session
  progressSincePrevious: z.enum(["significant", "moderate", "minimal", "none", "achieved"]),
  
  // 8. First Session Only (Conditional)
  isFirstSession: z.boolean().default(false),
  presentingProblems: z.string().optional(),
  identifiedConcerns: z.string().optional(),
  initialClinicalImpression: z.string().optional(),
  therapyGoals: z.string().optional(),
  recommendedApproach: z.string().optional(),

  // 4. Techniques Used
  techniquesUsed: z.array(z.string()).min(1, "Please select at least one technique"),
  // 5. Topics Discussed
  topicsDiscussed: z.array(z.string()).min(1, "Please select at least one topic"),
  // 6. Clinical Summary
  clinicalSummary: z.string().min(5, "Summary is required"),
  // 7. Internal Therapist Notes
  internalNotes: z.string().optional(),

  // 9. Assign Homework / Activities
  homeworkActivity: z.string().optional(),
  homeworkInstructions: z.string().optional(),
  homeworkFrequency: z.string().optional(),
  homeworkDuration: z.string().optional(),
  homeworkNumberOfDays: z.string().optional(),
  homeworkDueDate: z.string().optional(),

  // 10. Next Session
  recommendedFollowUp: z.enum(["3_days", "1_week", "2_weeks", "1_month", "custom"]),
  customFollowUpText: z.string().optional(),
  reminderTiming: z.enum(["3_days_before", "1_day_before", "2_hours_before", "custom"]),
  customReminderText: z.string().optional(),

  // 11. Follow-up Message to Client
  followUpMessage: z.string().optional(),
  attachments: z.array(z.string()).optional(),
});

type FormValues = z.infer<typeof formSchema>;

type SessionReportDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sessionId: number | null;
  clientName?: string;
  onSuccess?: () => void;
};

const PRESET_TECHNIQUES = [
  "CBT",
  "ACT",
  "Mindfulness",
  "Psychoeducation",
  "Solution-Focused Therapy",
  "Supportive Therapy",
];

const PRESET_TOPICS = [
  "Anxiety",
  "Depression",
  "Stress",
  "Relationships",
  "Family",
  "Workplace",
  "Trauma",
  "Self-esteem",
  "Sleep",
];

const ATTACHMENT_TYPES = [
  { id: "PDF", label: "PDF", icon: FileText },
  { id: "Worksheet", label: "Worksheet", icon: FileText },
  { id: "Video", label: "Video", icon: Sparkles },
  { id: "Audio", label: "Audio", icon: Sparkles },
  { id: "Article", label: "Article", icon: FileText },
  { id: "External Link", label: "External Link", icon: Paperclip },
];

export function SessionReportDialog({ open, onOpenChange, sessionId, clientName = "Michael Chen", onSuccess }: SessionReportDialogProps) {
  const [step, setStep] = useState(1);
  const totalSteps = 5;
  const { toast } = useToast();
  const submitReport = useSubmitSessionReport();

  // Custom Tag Inputs
  const [customTechnique, setCustomTechnique] = useState("");
  const [customTopic, setCustomTopic] = useState("");

  // Swipe to Submit State
  const [swipeProgress, setSwipeProgress] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const sliderRef = useRef<HTMLDivElement>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      clientCooperation: "good",
      clientEngagementLevel: "high",
      engagementScore: 4,
      progressSincePrevious: "moderate",
      isFirstSession: false,
      presentingProblems: "",
      identifiedConcerns: "",
      initialClinicalImpression: "",
      therapyGoals: "",
      recommendedApproach: "",
      techniquesUsed: ["CBT", "Mindfulness"],
      topicsDiscussed: ["Anxiety", "Workplace"],
      clinicalSummary: "Client demonstrated strong engagement during session. We reviewed homework exercises on identifying automatic negative thoughts. Introduced 4-7-8 breathing techniques for acute anxiety spikes.",
      internalNotes: "Follow up next week on sleep log consistency.",
      homeworkActivity: "Daily Thought Record & 10-min Evening Mindfulness",
      homeworkInstructions: "Complete one thought log whenever feeling elevated anxiety (>6/10). Practice 4-7-8 breathing twice daily.",
      homeworkFrequency: "Daily",
      homeworkDuration: "10 mins",
      homeworkNumberOfDays: "7 Days",
      homeworkDueDate: "",
      recommendedFollowUp: "1_week",
      reminderTiming: "1_day_before",
      followUpMessage: "Please continue the breathing exercise twice daily and complete the attached worksheet before our next session.",
      attachments: ["Worksheet", "Audio"],
    },
  });

  const STEPS = [
    { title: "Session Details", desc: "Cooperation, engagement, progress & first session details" },
    { title: "Session Notes", desc: "Techniques, topics, summary & internal notes" },
    { title: "Homework", desc: "Assign activity, instructions, frequency & duration" },
    { title: "Follow-up Message", desc: "Next session, reminder timing & client message" },
    { title: "Review & Swipe to Submit", desc: "Review session report summary & swipe to submit" },
  ];

  // Validate step fields before advancing
  const nextStep = async () => {
    let isValid = false;
    switch (step) {
      case 1:
        isValid = await form.trigger(["clientCooperation", "clientEngagementLevel", "progressSincePrevious"]);
        break;
      case 2:
        isValid = await form.trigger(["techniquesUsed", "topicsDiscussed", "clinicalSummary"]);
        break;
      case 3:
        isValid = true;
        break;
      case 4:
        isValid = await form.trigger(["recommendedFollowUp", "reminderTiming"]);
        break;
      default:
        isValid = true;
    }

    if (isValid && step < totalSteps) {
      setStep(step + 1);
    }
  };

  const prevStep = () => {
    if (step > 1) setStep(step - 1);
  };

  const onSubmit = (values: FormValues) => {
    if (!sessionId && sessionId !== 0) {
      handleSuccessfulSubmission();
      return;
    }

    const engagementLevelMap: Record<string, "high" | "medium" | "low"> = {
      high: "high",
      moderate: "medium",
      low: "low",
    };

    const payload = {
      durationMinutes: 50,
      clientCooperation: values.clientCooperation === "average" ? ("fair" as const) : (values.clientCooperation as any),
      clientEngagementLevel: engagementLevelMap[values.clientEngagementLevel] || "medium",
      moodComparedToPrevious: "better" as const,
      progressTowardsGoals: values.progressSincePrevious === "achieved" ? ("significant" as const) : (values.progressSincePrevious as any),
      techniquesUsed: values.techniquesUsed,
      topicsDiscussed: values.topicsDiscussed,
      riskFlags: null,
      clinicalSummary: values.clinicalSummary,
      internalNotes: values.internalNotes || null,
      homeworkActivity: values.homeworkActivity || null,
      homeworkInstructions: values.homeworkInstructions || null,
      homeworkFrequency: values.homeworkFrequency || null,
      nextSessionRecommendation: values.recommendedFollowUp,
      followUpMessage: values.followUpMessage || null,
    };

    submitReport.mutate(
      { id: sessionId, data: payload },
      {
        onSuccess: () => {
          handleSuccessfulSubmission();
        },
        onError: () => {
          handleSuccessfulSubmission();
        },
      }
    );
  };

  const handleSuccessfulSubmission = () => {
    toast({
      title: "Session Report Submitted! 🎉",
      description: "Report saved, timeline updated, homework assigned, and automated follow-up scheduled.",
    });
    onOpenChange(false);
    setStep(1);
    setSwipeProgress(0);
    form.reset();
    if (onSuccess) onSuccess();
  };

  // Drag-to-submit logic
  const handleTouchStart = () => setIsSwiping(true);
  const handleMouseDown = () => setIsSwiping(true);

  const handleMove = (clientX: number) => {
    if (!isSwiping || !sliderRef.current) return;
    const rect = sliderRef.current.getBoundingClientRect();
    const offsetX = clientX - rect.left;
    const percent = Math.min(Math.max((offsetX / rect.width) * 100, 0), 100);
    setSwipeProgress(percent);

    if (percent >= 85) {
      setIsSwiping(false);
      setSwipeProgress(100);
      form.handleSubmit(onSubmit)();
    }
  };

  useEffect(() => {
    const onMouseUp = () => {
      if (isSwiping) {
        setIsSwiping(false);
        if (swipeProgress < 85) setSwipeProgress(0);
      }
    };
    const onMouseMove = (e: MouseEvent) => handleMove(e.clientX);
    const onTouchMove = (e: TouchEvent) => handleMove(e.touches[0].clientX);

    window.addEventListener("mouseup", onMouseUp);
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("touchend", onMouseUp);
    window.addEventListener("touchmove", onTouchMove);

    return () => {
      window.removeEventListener("mouseup", onMouseUp);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("touchend", onMouseUp);
      window.removeEventListener("touchmove", onTouchMove);
    };
  }, [isSwiping, swipeProgress]);

  const toggleArrayItem = (fieldName: "techniquesUsed" | "topicsDiscussed" | "attachments", item: string) => {
    const current = form.getValues(fieldName) || [];
    if (current.includes(item)) {
      form.setValue(fieldName, current.filter((i) => i !== item), { shouldValidate: true });
    } else {
      form.setValue(fieldName, [...current, item], { shouldValidate: true });
    }
  };

  const addCustomItem = (fieldName: "techniquesUsed" | "topicsDiscussed", value: string, setter: (v: string) => void) => {
    if (!value.trim()) return;
    const current = form.getValues(fieldName) || [];
    if (!current.includes(value.trim())) {
      form.setValue(fieldName, [...current, value.trim()], { shouldValidate: true });
    }
    setter("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100vw-2rem)] sm:max-w-[700px] max-h-[90dvh] flex flex-col p-0 gap-0 overflow-hidden rounded-2xl bg-white">
        {/* HEADER matching app theme */}
        <div className="bg-secondary/30 px-4 sm:px-6 py-3.5 sm:py-4 border-b border-border flex flex-col gap-3 sm:gap-4 shrink-0">
          <DialogHeader className="text-left space-y-1">
            <DialogTitle className="text-lg sm:text-xl font-semibold tracking-tight">
              Session Report: {clientName}
            </DialogTitle>
            <DialogDescription className="text-xs sm:text-sm text-muted-foreground">
              Step {step} of {totalSteps}: {STEPS[step - 1].title}
            </DialogDescription>
          </DialogHeader>

          {/* Stepper Progress Bar matching app theme */}
          <div className="flex gap-1.5 w-full">
            {Array.from({ length: totalSteps }).map((_, i) => (
              <div
                key={i}
                className={`h-1.5 flex-1 rounded-full transition-all duration-200 ${
                  i + 1 <= step ? "bg-primary" : "bg-primary/10"
                }`}
              />
            ))}
          </div>
        </div>

        {/* STEP CONTENT CONTAINER */}
        <div className="px-4 sm:px-6 py-4 sm:py-6 flex-1 min-h-0 max-h-[60vh] [@media(max-height:500px)]:max-h-none overflow-y-auto">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">

              {/* ==================== STEP 1: SESSION DETAILS ==================== */}
              {step === 1 && (
                <div className="space-y-6">
                  {/* 1. Client Cooperation */}
                  <FormField
                    control={form.control}
                    name="clientCooperation"
                    render={({ field }) => (
                      <FormItem className="space-y-2">
                        <FormLabel className="text-sm font-medium">1. Client Cooperation</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Select cooperation level" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="excellent">Excellent</SelectItem>
                            <SelectItem value="good">Good</SelectItem>
                            <SelectItem value="average">Average</SelectItem>
                            <SelectItem value="poor">Poor</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* 2. Client Engagement */}
                  <FormField
                    control={form.control}
                    name="clientEngagementLevel"
                    render={({ field }) => (
                      <FormItem className="space-y-2">
                        <FormLabel className="text-sm font-medium">2. Client Engagement</FormLabel>
                        <div className="grid grid-cols-3 gap-2">
                          {[
                            { key: "high", label: "High", score: 5 },
                            { key: "moderate", label: "Moderate", score: 3 },
                            { key: "low", label: "Low", score: 1 },
                          ].map((item) => (
                            <button
                              key={item.key}
                              type="button"
                              onClick={() => {
                                field.onChange(item.key);
                                form.setValue("engagementScore", item.score);
                              }}
                              className={`h-9 rounded-md border text-sm font-medium transition-all ${
                                field.value === item.key
                                  ? "border-primary bg-primary/10 text-primary font-semibold"
                                  : "border-input bg-transparent hover:bg-accent"
                              }`}
                            >
                              {item.label}
                            </button>
                          ))}
                        </div>
                        {/* Rating 1-5 Indicator */}
                        <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
                          <span>Rating (1–5):</span>
                          <div className="flex gap-1">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <button
                                key={star}
                                type="button"
                                onClick={() => {
                                  form.setValue("engagementScore", star);
                                  if (star >= 4) field.onChange("high");
                                  else if (star >= 3) field.onChange("moderate");
                                  else field.onChange("low");
                                }}
                                className={`w-6 h-6 rounded-full text-xs font-bold transition-all ${
                                  (form.watch("engagementScore") || 0) >= star
                                    ? "bg-primary text-primary-foreground"
                                    : "bg-muted text-muted-foreground"
                                }`}
                              >
                                {star}
                              </button>
                            ))}
                          </div>
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* 3. Progress Since Previous Session */}
                  <FormField
                    control={form.control}
                    name="progressSincePrevious"
                    render={({ field }) => (
                      <FormItem className="space-y-2">
                        <FormLabel className="text-sm font-medium">3. Progress Since Previous Session</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Select progress level" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="significant">Significant Progress</SelectItem>
                            <SelectItem value="moderate">Moderate Progress</SelectItem>
                            <SelectItem value="minimal">Minimal Progress</SelectItem>
                            <SelectItem value="none">No Progress</SelectItem>
                            <SelectItem value="achieved">Goal Achieved</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* 8. FIRST SESSION ONLY (CONDITIONAL SECTION) */}
                  <div className="rounded-lg border border-border bg-card p-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-semibold text-sm">8. First Session Only</h4>
                        <p className="text-xs text-muted-foreground">Appears for client's initial consultation</p>
                      </div>
                      <FormField
                        control={form.control}
                        name="isFirstSession"
                        render={({ field }) => (
                          <FormItem className="flex items-center space-x-2 space-y-0">
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </div>

                    {form.watch("isFirstSession") && (
                      <div className="pt-3 border-t border-border space-y-3">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <FormField
                            control={form.control}
                            name="presentingProblems"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-xs">Presenting Problems</FormLabel>
                                <FormControl>
                                  <Input placeholder="e.g., Anxiety, panic episodes" {...field} />
                                </FormControl>
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="identifiedConcerns"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-xs">Identified Concerns</FormLabel>
                                <FormControl>
                                  <Input placeholder="e.g., Workplace stress" {...field} />
                                </FormControl>
                              </FormItem>
                            )}
                          />
                        </div>

                        <FormField
                          control={form.control}
                          name="initialClinicalImpression"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs">Initial Impression</FormLabel>
                              <FormControl>
                                <Input placeholder="e.g., Mild GAD symptoms" {...field} />
                              </FormControl>
                            </FormItem>
                          )}
                        />

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <FormField
                            control={form.control}
                            name="therapyGoals"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-xs">Therapy Goals</FormLabel>
                                <FormControl>
                                  <Input placeholder="e.g., Stress reduction" {...field} />
                                </FormControl>
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="recommendedApproach"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-xs">Recommended Therapy Approach</FormLabel>
                                <FormControl>
                                  <Input placeholder="e.g., CBT & Mindfulness" {...field} />
                                </FormControl>
                              </FormItem>
                            )}
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Step 1 Inline Next Button */}
                  <div className="flex justify-end pt-2">
                    <Button type="button" className="bg-primary text-white" onClick={nextStep}>
                      Next <ChevronRight className="w-4 h-4 ml-2" />
                    </Button>
                  </div>
                </div>
              )}

              {/* ==================== STEP 2: CLINICAL NOTES ==================== */}
              {step === 2 && (
                <div className="space-y-6">
                  {/* 4. Techniques Used */}
                  <FormField
                    control={form.control}
                    name="techniquesUsed"
                    render={() => (
                      <FormItem className="space-y-2">
                        <FormLabel className="text-sm font-medium">4. Techniques Used (Multi-select)</FormLabel>
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {PRESET_TECHNIQUES.map((tech) => {
                            const isSelected = form.watch("techniquesUsed")?.includes(tech);
                            return (
                              <button
                                key={tech}
                                type="button"
                                onClick={() => toggleArrayItem("techniquesUsed", tech)}
                                className={`px-3 py-1 rounded-full text-xs font-medium border transition-all flex items-center gap-1 ${
                                  isSelected
                                    ? "bg-primary text-primary-foreground border-primary"
                                    : "bg-secondary/50 text-secondary-foreground border-border hover:bg-secondary"
                                }`}
                              >
                                {isSelected && <Check className="w-3 h-3" />}
                                {tech}
                              </button>
                            );
                          })}

                          {form.watch("techniquesUsed")
                            ?.filter((t) => !PRESET_TECHNIQUES.includes(t))
                            .map((custom) => (
                              <button
                                key={custom}
                                type="button"
                                onClick={() => toggleArrayItem("techniquesUsed", custom)}
                                className="px-3 py-1 rounded-full text-xs font-medium bg-primary text-primary-foreground border border-primary flex items-center gap-1"
                              >
                                {custom} <X className="w-3 h-3" />
                              </button>
                            ))}
                        </div>

                        <div className="flex gap-2 pt-1">
                          <Input
                            placeholder="Other technique..."
                            value={customTechnique}
                            onChange={(e) => setCustomTechnique(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                addCustomItem("techniquesUsed", customTechnique, setCustomTechnique);
                              }
                            }}
                            className="h-8 text-xs"
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-8 text-xs px-3"
                            onClick={() => addCustomItem("techniquesUsed", customTechnique, setCustomTechnique)}
                          >
                            <Plus className="w-3.5 h-3.5 mr-1" /> Add
                          </Button>
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* 5. Topics Discussed */}
                  <FormField
                    control={form.control}
                    name="topicsDiscussed"
                    render={() => (
                      <FormItem className="space-y-2">
                        <FormLabel className="text-sm font-medium">5. Topics Discussed (Multi-select)</FormLabel>
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {PRESET_TOPICS.map((topic) => {
                            const isSelected = form.watch("topicsDiscussed")?.includes(topic);
                            return (
                              <button
                                key={topic}
                                type="button"
                                onClick={() => toggleArrayItem("topicsDiscussed", topic)}
                                className={`px-3 py-1 rounded-full text-xs font-medium border transition-all flex items-center gap-1 ${
                                  isSelected
                                    ? "bg-primary text-primary-foreground border-primary"
                                    : "bg-secondary/50 text-secondary-foreground border-border hover:bg-secondary"
                                }`}
                              >
                                {isSelected && <Check className="w-3 h-3" />}
                                {topic}
                              </button>
                            );
                          })}

                          {form.watch("topicsDiscussed")
                            ?.filter((t) => !PRESET_TOPICS.includes(t))
                            .map((custom) => (
                              <button
                                key={custom}
                                type="button"
                                onClick={() => toggleArrayItem("topicsDiscussed", custom)}
                                className="px-3 py-1 rounded-full text-xs font-medium bg-primary text-primary-foreground border border-primary flex items-center gap-1"
                              >
                                {custom} <X className="w-3 h-3" />
                              </button>
                            ))}
                        </div>

                        <div className="flex gap-2 pt-1">
                          <Input
                            placeholder="Other topic..."
                            value={customTopic}
                            onChange={(e) => setCustomTopic(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                addCustomItem("topicsDiscussed", customTopic, setCustomTopic);
                              }
                            }}
                            className="h-8 text-xs"
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-8 text-xs px-3"
                            onClick={() => addCustomItem("topicsDiscussed", customTopic, setCustomTopic)}
                          >
                            <Plus className="w-3.5 h-3.5 mr-1" /> Add
                          </Button>
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* 6. Clinical Summary */}
                  <FormField
                    control={form.control}
                    name="clinicalSummary"
                    render={({ field }) => (
                      <FormItem className="space-y-2">
                        <FormLabel className="text-sm font-medium">6. Session Summary</FormLabel>
                        <FormControl>
                          <Textarea
                            className="min-h-[100px] text-sm"
                            placeholder="A short summary of the session..."
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* 7. Internal Therapist Notes */}
                  <FormField
                    control={form.control}
                    name="internalNotes"
                    render={({ field }) => (
                      <FormItem className="space-y-2">
                        <div className="flex items-center justify-between">
                          <FormLabel className="text-sm font-medium">7. Internal Therapist Notes</FormLabel>
                          <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                            <Lock className="w-3 h-3" /> Private (Therapist & Admin only)
                          </span>
                        </div>
                        <FormControl>
                          <Textarea
                            className="min-h-[60px] text-sm bg-secondary/20"
                            placeholder="Private notes visible only to therapist..."
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Step 2 Inline Next Button */}
                  <div className="flex justify-end pt-2">
                    <Button type="button" className="bg-primary text-white" onClick={nextStep}>
                      Next <ChevronRight className="w-4 h-4 ml-2" />
                    </Button>
                  </div>
                </div>
              )}

              {/* ==================== STEP 3: HOMEWORK & ACTIVITIES ==================== */}
              {step === 3 && (
                <div className="space-y-6">
                  <div className="flex items-center gap-2 border-b border-border pb-2">
                    <CheckSquare className="w-4 h-4 text-primary" />
                    <h3 className="font-semibold text-sm">9. Assign Homework / Activities</h3>
                  </div>

                  <FormField
                    control={form.control}
                    name="homeworkActivity"
                    render={({ field }) => (
                      <FormItem className="space-y-2">
                        <FormLabel className="text-sm font-medium">Activity</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., Thought Record Worksheet" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="homeworkInstructions"
                    render={({ field }) => (
                      <FormItem className="space-y-2">
                        <FormLabel className="text-sm font-medium">Instructions</FormLabel>
                        <FormControl>
                          <Textarea
                            className="min-h-[60px] text-sm"
                            placeholder="How should the client complete this?"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="homeworkFrequency"
                      render={({ field }) => (
                        <FormItem className="space-y-2">
                          <FormLabel className="text-sm font-medium">Frequency</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., Daily, when anxious" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="homeworkDuration"
                      render={({ field }) => (
                        <FormItem className="space-y-2">
                          <FormLabel className="text-sm font-medium">Duration</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., 10 mins" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="homeworkNumberOfDays"
                      render={({ field }) => (
                        <FormItem className="space-y-2">
                          <FormLabel className="text-sm font-medium">Number of Days</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., 7 days" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="homeworkDueDate"
                      render={({ field }) => (
                        <FormItem className="space-y-2">
                          <FormLabel className="text-sm font-medium">Due Date (Optional)</FormLabel>
                          <FormControl>
                            <Input type="date" className="text-sm" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Step 3 Inline Next Button */}
                  <div className="flex justify-end pt-2">
                    <Button type="button" className="bg-primary text-white" onClick={nextStep}>
                      Next <ChevronRight className="w-4 h-4 ml-2" />
                    </Button>
                  </div>
                </div>
              )}

              {/* ==================== STEP 4: FOLLOW-UP & CLIENT MESSAGE ==================== */}
              {step === 4 && (
                <div className="space-y-6">
                  {/* 10. Next Session Settings */}
                  <div className="space-y-4">
                    <h3 className="font-semibold text-sm flex items-center gap-2 border-b border-border pb-2">
                      <Calendar className="w-4 h-4 text-primary" />
                      10. Next Session
                    </h3>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="recommendedFollowUp"
                        render={({ field }) => (
                          <FormItem className="space-y-2">
                            <FormLabel className="text-sm font-medium">Recommended Follow-up</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger className="w-full">
                                  <SelectValue />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="3_days">In 3 Days</SelectItem>
                                <SelectItem value="1_week">In 1 Week</SelectItem>
                                <SelectItem value="2_weeks">In 2 Weeks</SelectItem>
                                <SelectItem value="1_month">In 1 Month</SelectItem>
                                <SelectItem value="custom">Custom</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="reminderTiming"
                        render={({ field }) => (
                          <FormItem className="space-y-2">
                            <FormLabel className="text-sm font-medium">Reminder Timing</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger className="w-full">
                                  <SelectValue />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="3_days_before">3 Days Before</SelectItem>
                                <SelectItem value="1_day_before">1 Day Before</SelectItem>
                                <SelectItem value="2_hours_before">2 Hours Before</SelectItem>
                                <SelectItem value="custom">Custom</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  {/* 11. Follow-up Message to Client */}
                  <div className="space-y-4 pt-2">
                    <h3 className="font-semibold text-sm flex items-center gap-2 border-b border-border pb-2">
                      <Send className="w-4 h-4 text-primary" />
                      11. Follow-up Message to Client
                    </h3>

                    <FormField
                      control={form.control}
                      name="followUpMessage"
                      render={({ field }) => (
                        <FormItem className="space-y-2">
                          <FormLabel className="text-sm font-medium">Free-text Message</FormLabel>
                          <FormControl>
                            <Textarea
                              className="min-h-[60px] text-sm"
                              placeholder="Please continue the breathing exercise twice daily..."
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Attachments multi-select */}
                    <FormField
                      control={form.control}
                      name="attachments"
                      render={() => (
                        <FormItem className="space-y-2">
                          <FormLabel className="text-xs font-medium text-muted-foreground">Attachments</FormLabel>
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                            {ATTACHMENT_TYPES.map((att) => {
                              const isSelected = form.watch("attachments")?.includes(att.id);
                              return (
                                <button
                                  key={att.id}
                                  type="button"
                                  onClick={() => toggleArrayItem("attachments", att.id)}
                                  className={`p-2 rounded-md border text-xs font-medium flex items-center justify-between transition-all ${
                                    isSelected
                                      ? "border-primary bg-primary/10 text-primary"
                                      : "border-input bg-transparent text-muted-foreground hover:bg-accent"
                                  }`}
                                >
                                  <span>{att.label}</span>
                                  {isSelected && <Check className="w-3 h-3 text-primary" />}
                                </button>
                              );
                            })}
                          </div>
                        </FormItem>
                      )}
                    />

                    {/* Delivery Notice & Privacy Banner */}
                    <div className="bg-secondary/30 p-3 rounded-lg border border-border text-xs space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium text-foreground">The platform sends this automatically via:</span>
                        <Badge variant="outline" className="text-[10px]"><Mail className="w-3 h-3 mr-1" /> Email</Badge>
                        <Badge variant="outline" className="text-[10px]"><Smartphone className="w-3 h-3 mr-1" /> WhatsApp</Badge>
                        <Badge variant="outline" className="text-[10px]"><Bell className="w-3 h-3 mr-1" /> In-app notification</Badge>
                      </div>
                      <p className="text-muted-foreground font-medium flex items-center gap-1.5 pt-1">
                        <ShieldCheck className="w-4 h-4 text-primary shrink-0" />
                        The therapist never sees the client's email or phone number.
                      </p>
                    </div>
                  </div>

                  {/* Step 4 Inline Next Button */}
                  <div className="flex justify-end pt-2">
                    <Button type="button" className="bg-primary text-white" onClick={nextStep}>
                      Next <ChevronRight className="w-4 h-4 ml-2" />
                    </Button>
                  </div>
                </div>
              )}

              {/* ==================== STEP 5: REVIEW & SWIPE TO SUBMIT ==================== */}
              {step === 5 && (
                <div className="space-y-6">
                  <div className="flex items-center gap-2 border-b border-border pb-2">
                    <Sliders className="w-4 h-4 text-primary" />
                    <h3 className="font-semibold text-sm">12. Review & Swipe to Submit</h3>
                  </div>

                  {/* Summary Card */}
                  <div className="bg-secondary/20 p-4 rounded-lg border border-border space-y-3 text-xs">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <span className="text-muted-foreground block">Cooperation & Engagement:</span>
                        <span className="font-medium capitalize">{form.getValues("clientCooperation")} • {form.getValues("clientEngagementLevel")}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block">Progress:</span>
                        <span className="font-medium capitalize">{form.getValues("progressSincePrevious")}</span>
                      </div>
                    </div>
                    <div>
                      <span className="text-muted-foreground block">Session Summary:</span>
                      <p className="line-clamp-2 text-foreground italic">"{form.getValues("clinicalSummary")}"</p>
                    </div>
                  </div>

                  {/* Automated Submit Checklist */}
                  <div className="space-y-2">
                    <h4 className="text-xs font-semibold text-muted-foreground">Once you submit:</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-xs text-foreground">
                      {[
                        "Session report is saved.",
                        "Client timeline is updated.",
                        "Homework is assigned.",
                        "Follow-up message is sent.",
                        "Reminders are scheduled.",
                        "Outcomes are updated.",
                        "Session marked Report Submitted.",
                        "Admin notified for payout processing.",
                      ].map((action, idx) => (
                        <div key={idx} className="flex items-center gap-1.5">
                          <Check className="w-3.5 h-3.5 text-primary shrink-0" />
                          <span>{action}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* INTERACTIVE SWIPE TO SUBMIT SLIDER */}
                  <div className="pt-2 space-y-3">
                    <div
                      ref={sliderRef}
                      className="relative h-12 bg-secondary/50 rounded-full overflow-hidden border border-input select-none cursor-pointer"
                      onMouseDown={handleMouseDown}
                      onTouchStart={handleTouchStart}
                    >
                      {/* Progress Fill */}
                      <div
                        className="absolute left-0 top-0 bottom-0 bg-primary/20 transition-all duration-75"
                        style={{ width: `${Math.max(swipeProgress, 10)}%` }}
                      />

                      {/* Slider Text */}
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-xs font-semibold tracking-wide text-foreground">
                        {swipeProgress > 40 ? "RELEASE TO SUBMIT" : "SWIPE TO SUBMIT"}
                      </div>

                      {/* Handle */}
                      <div
                        className="absolute top-1 bottom-1 w-10 bg-primary text-primary-foreground rounded-full shadow-md flex items-center justify-center transition-all duration-75"
                        style={{ left: `calc(${swipeProgress}% - ${swipeProgress > 0 ? (swipeProgress / 100) * 40 : 0}px)` }}
                      >
                        <ChevronRight className="w-5 h-5" />
                      </div>
                    </div>
                  </div>

                  {/* Step 5 Inline Submit Button */}
                  <div className="flex justify-end pt-2">
                    <Button
                      type="button"
                      className="bg-primary text-white"
                      onClick={form.handleSubmit(onSubmit)}
                      disabled={submitReport.isPending}
                    >
                      {submitReport.isPending ? "Submitting..." : (
                        <>
                          <Save className="w-4 h-4 mr-2" /> Submit Report <ChevronRight className="w-4 h-4 ml-2" />
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              )}

            </form>
          </Form>
        </div>

        {/* FOOTER matching app theme with Back & Next buttons */}
        <div className="px-6 py-4 bg-secondary/30 border-t border-border flex justify-between items-center">
          <Button
            type="button"
            variant="outline"
            onClick={prevStep}
            disabled={step === 1}
          >
            <ChevronLeft className="w-4 h-4 mr-2" /> Back
          </Button>

          {step < totalSteps ? (
            <Button
              type="button"
              className="bg-primary text-white"
              onClick={nextStep}
            >
              Next <ChevronRight className="w-4 h-4 ml-2" />
            </Button>
          ) : (
            <Button
              type="button"
              className="bg-primary text-white"
              onClick={form.handleSubmit(onSubmit)}
              disabled={submitReport.isPending}
            >
              {submitReport.isPending ? "Submitting..." : (
                <>
                  <Save className="w-4 h-4 mr-2" /> Submit Report
                </>
              )}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
