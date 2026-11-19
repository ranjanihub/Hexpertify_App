import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { pageTransition, PageHeader } from '@/components/shared';
import { BookingModal } from '@/components/booking-modal';
import { 
  ShieldCheck, 
  GraduationCap, 
  Globe, 
  HeartPulse, 
  Mail, 
  Video, 
  Star, 
  Award, 
  Clock, 
  MapPin, 
  CheckCircle2, 
  BookOpen,
  Calendar,
  MessageSquare,
  Sparkles,
  RefreshCw,
  AlertCircle,
  ArrowRightLeft,
  Check,
  Send,
  HelpCircle,
  UserCheck,
  X
} from 'lucide-react';
import { Link } from 'wouter';
import { getClientAuth } from '@/lib/auth';
import { useToast } from '@/hooks/use-toast';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription, 
  DialogFooter 
} from '@/components/ui/dialog';

// Shown until the assigned therapist loads; every value comes from the therapist's real profile
const DEFAULT_THERAPIST = {
  id: "",
  name: "",
  title: "",
  avatarUrl: "",
  email: "",
  rating: 0,
  reviewCount: 0,
  yearsOfExperience: 0,
  sessionsCompleted: 0,
  languages: [] as string[],
  isVerified: false,
  bio: "",
  approach: "",
  specializations: [] as string[],
  availability: "",
  education: [] as any[],
  certifications: [] as string[],
  certificates: [] as { url: string; name: string }[],
};

const FALLBACK_AVATAR = "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&w=400&q=80";

const SWITCH_REASONS = [
  { id: "scheduling", label: "Scheduling & Timezone Mismatch", desc: "Need appointments at different days or evening hours" },
  { id: "specialization", label: "Different Specialization Desired", desc: "Want specialized support (e.g. CBT, EMDR, Trauma, MBSR)" },
  { id: "style", label: "Communication or Therapeutic Style", desc: "Seeking a different conversational or therapeutic approach" },
  { id: "comfort", label: "Personal Comfort / Demographic Preference", desc: "Seeking a therapist of specific gender, background, or language" },
  { id: "other", label: "Other Reasons / General Reset", desc: "Looking for a fresh start with a new clinician" },
];

const SPECIALTY_OPTIONS = [
  "CBT & Cognitive Restructuring",
  "Mindfulness & Stress Management",
  "Trauma & EMDR Recovery",
  "Anxiety & Panic Regulation",
  "Depression & Mood Support",
  "Workplace Burnout & Executive Coaching",
  "Relationship & Interpersonal Therapy"
];

export default function TherapistPage() {
  const { toast } = useToast();
  const [isBookingOpen, setIsBookingOpen] = useState<boolean>(false);
  const [isSwitchModalOpen, setIsSwitchModalOpen] = useState<boolean>(false);
  const [switchReason, setSwitchReason] = useState<string>("scheduling");
  const [switchNotes, setSwitchNotes] = useState<string>("");
  const [selectedSpecialties, setSelectedSpecialties] = useState<string[]>([]);
  const [switchUrgency, setSwitchUrgency] = useState<string>("standard");
  const [isSubmittingSwitch, setIsSubmittingSwitch] = useState<boolean>(false);
  const [pendingSwitchRequest, setPendingSwitchRequest] = useState<any>(null);

  const authUser = getClientAuth();
  const myName = authUser?.name || "Client User";
  const myEmail = (authUser?.email || "").toLowerCase().trim();

  const [therapist, setTherapist] = useState<any>(() => {
    if (authUser?.assignedTherapistName) {
      return {
        ...DEFAULT_THERAPIST,
        id: authUser.assignedTherapistId || DEFAULT_THERAPIST.id,
        name: authUser.assignedTherapistName || DEFAULT_THERAPIST.name,
        title: authUser.assignedTherapistProfession || DEFAULT_THERAPIST.title,
        avatarUrl: authUser.assignedTherapistPhoto || DEFAULT_THERAPIST.avatarUrl,
        email: authUser.assignedTherapistEmail || DEFAULT_THERAPIST.email,
      };
    }
    return DEFAULT_THERAPIST;
  });

  // Check for any existing pending switch requests in localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem("therapist_switch_requests");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          const myRequest = parsed.find(
            (r: any) =>
              (r.clientEmail && r.clientEmail.toLowerCase() === myEmail) ||
              (r.clientName && r.clientName.toLowerCase() === myName.toLowerCase())
          );
          if (myRequest) {
            setPendingSwitchRequest(myRequest);
          }
        }
      }
    } catch {}
  }, [myEmail, myName]);

  useEffect(() => {
    let isMounted = true;
    const userParam = myEmail ? `?email=${encodeURIComponent(myEmail)}` : '';

    async function loadTherapist() {
      try {
        let res = await fetch(`/api/client/therapist${userParam}`).catch(() => null);
        if (!res || !res.ok) {
          res = await fetch(`http://localhost:5000/api/client/therapist${userParam}`).catch(() => null);
        }
        if (res && res.ok && isMounted) {
          const data = await res.json().catch(() => null);
          if (data?.success && data?.therapist) {
            setTherapist((prev: any) => ({
              ...DEFAULT_THERAPIST,
              ...prev,
              ...data.therapist,
              title: data.therapist.profession || data.therapist.title || prev?.title || "",
              avatarUrl: data.therapist.photoUrl || data.therapist.avatarUrl || prev?.avatarUrl || "",
              bio: data.therapist.about ?? data.therapist.bio ?? "",
              specializations: data.therapist.specializations || [],
              education: data.therapist.education || [],
              certifications: data.therapist.certifications || [],
              certificates: data.therapist.certificates || [],
            }));
          }
        }
      } catch (err) {
        console.warn('Could not fetch therapist details:', err);
      }
    }

    loadTherapist();

    return () => {
      isMounted = false;
    };
  }, [myEmail]);

  const toggleSpecialty = (spec: string) => {
    setSelectedSpecialties(prev =>
      prev.includes(spec) ? prev.filter(s => s !== spec) : [...prev, spec]
    );
  };

  const handleSwitchSubmit = async () => {
    setIsSubmittingSwitch(true);

    const reasonObj = SWITCH_REASONS.find(r => r.id === switchReason);
    const reasonLabel = reasonObj ? reasonObj.label : switchReason;

    const requestPayload = {
      id: `SW-REQ-${Date.now()}`,
      recipientRole: "ADMIN",
      role: "ADMIN",
      targetRole: "ADMIN",
      type: "THERAPIST_SWITCH_REQUEST",
      title: `Therapist Switch Request: ${myName}`,
      message: `${myName} (${myEmail || 'No email'}) requested a therapist switch from ${therapist.name}. Reason: ${reasonLabel}. Notes: ${switchNotes || 'None specified'}. Preferred Focus: ${selectedSpecialties.join(', ') || 'General'}. Urgency: ${switchUrgency}.`,
      clientName: myName,
      clientEmail: myEmail,
      clientId: authUser?.id || '',
      currentTherapistName: therapist.name,
      currentTherapistId: therapist.id,
      currentTherapistEmail: therapist.email,
      reason: reasonLabel,
      reasonId: switchReason,
      notes: switchNotes,
      preferredSpecialties: selectedSpecialties,
      urgency: switchUrgency,
      status: "PENDING_ADMIN_REASSIGNMENT",
      createdAt: new Date().toISOString()
    };

    // 1. Send notification to central backend
    try {
      await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestPayload)
      }).catch(() => {});
    } catch {}

    // 2. Persist to local admin notifications & switch requests log
    try {
      const existingAdminNotifs = JSON.parse(localStorage.getItem("admin_notifications") || "[]");
      localStorage.setItem("admin_notifications", JSON.stringify([requestPayload, ...existingAdminNotifs]));

      const existingSwitchReqs = JSON.parse(localStorage.getItem("therapist_switch_requests") || "[]");
      const updatedReqs = [requestPayload, ...existingSwitchReqs.filter((r: any) => r.clientEmail !== myEmail)];
      localStorage.setItem("therapist_switch_requests", JSON.stringify(updatedReqs));

      window.dispatchEvent(new Event("notification_created"));
      window.dispatchEvent(new Event("client_data_updated"));
    } catch {}

    setPendingSwitchRequest(requestPayload);
    setIsSubmittingSwitch(false);
    setIsSwitchModalOpen(false);

    toast({
      title: "Therapist Switch Request Sent!",
      description: `Your request has been forwarded to the Admin & Care team. You will be assigned a new therapist shortly.`,
    });
  };

  return (
    <motion.div {...pageTransition} className="w-full space-y-8 pb-16 font-['Plus_Jakarta_Sans']">
      <PageHeader title="My Therapist" description="Your dedicated partner in your wellness journey." />

      {/* Active Pending Switch Request Alert Banner */}
      {pendingSwitchRequest && (
        <div className="rounded-3xl p-5 sm:p-6 bg-gradient-to-r from-purple-50 via-indigo-50/80 to-purple-50 dark:from-purple-950/40 dark:via-indigo-950/30 dark:to-purple-950/40 border border-purple-200 dark:border-purple-800/60 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-2xl bg-[#5e2be2] text-white flex items-center justify-center shrink-0 shadow-sm mt-0.5">
              <RefreshCw className="w-5 h-5 animate-spin-slow" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                  Therapist Switch Request Pending
                </h4>
                <span className="text-[10px] font-extrabold uppercase bg-amber-100 text-amber-800 px-2.5 py-0.5 rounded-full border border-amber-200">
                  Under Admin Review
                </span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed max-w-2xl">
                You requested a switch from <strong>{pendingSwitchRequest.currentTherapistName || therapist.name}</strong> ({pendingSwitchRequest.reason}). The Super Admin and coordination team have been alerted and are matching you with an optimal clinician.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsSwitchModalOpen(true)}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-white dark:bg-slate-900 border border-purple-200 text-[#5e2be2] hover:bg-purple-50 transition-colors shadow-xs cursor-pointer shrink-0"
          >
            Update Preferences
          </button>
        </div>
      )}

      {/* Main Profile Header Card */}
      <div className="hex-card !p-8 md:!p-10 relative overflow-hidden shadow-lg border border-border">
        {/* Decorative ambient background */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-primary/10 rounded-full blur-3xl -translate-y-1/3 translate-x-1/3 pointer-events-none"></div>
        
        <div className="flex flex-col md:flex-row gap-8 items-start relative z-10">
          <div className="shrink-0 relative mx-auto md:mx-0">
            <div className="w-36 h-36 md:w-44 md:h-44 rounded-[32px] overflow-hidden bg-muted shadow-xl ring-4 ring-primary/10">
              <img 
                src={therapist.avatarUrl || FALLBACK_AVATAR} 
                alt={therapist.name} 
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = FALLBACK_AVATAR;
                }}
              />
            </div>
            {therapist.isVerified && (
              <div className="absolute -bottom-2 -right-2 bg-background p-1.5 rounded-full shadow-md border border-border" title="Verified Professional">
                <ShieldCheck className="w-7 h-7 text-primary fill-primary/10" />
              </div>
            )}
          </div>

          <div className="flex-1 space-y-4 text-center md:text-left">
            <div>
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 mb-1">
                <h2 className="text-3xl font-bold tracking-tight text-foreground">{therapist.name}</h2>
                <span className="inline-flex items-center gap-1.5 bg-amber-500/10 text-amber-600 dark:text-amber-400 px-3 py-1 rounded-full text-sm font-semibold border border-amber-500/20">
                  <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                  {therapist.reviewCount ? `${therapist.rating} (${therapist.reviewCount} review${therapist.reviewCount === 1 ? "" : "s"})` : "No reviews yet"}
                </span>
              </div>
              <p className="text-lg text-primary font-medium">{therapist.title}</p>
            </div>

            {/* Key stats badges */}
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 text-sm text-muted-foreground pt-1">
              <div className="flex items-center gap-1.5 bg-muted/60 px-3 py-1.5 rounded-xl">
                <Award className="w-4 h-4 text-primary" />
                <span className="font-semibold text-foreground">{therapist.yearsOfExperience || 0} Years</span> Experience
              </div>
              <div className="flex items-center gap-1.5 bg-muted/60 px-3 py-1.5 rounded-xl">
                <Calendar className="w-4 h-4 text-primary" />
                <span className="font-semibold text-foreground">{therapist.sessionsCompleted || 0}</span> Sessions
              </div>
              <div className="flex items-center gap-1.5 bg-muted/60 px-3 py-1.5 rounded-xl">
                <Globe className="w-4 h-4 text-primary" />
                <span>{(Array.isArray(therapist.languages) ? therapist.languages.join(', ') : therapist.languages) || 'Languages not listed'}</span>
              </div>
            </div>

            {/* Action buttons with Switch Therapist */}
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 pt-3">
              <button 
                onClick={() => setIsBookingOpen(true)}
                className="inline-flex items-center gap-2 bg-primary text-primary-foreground font-semibold px-6 py-2.5 rounded-full shadow-md hover:bg-primary/90 transition-colors cursor-pointer"
              >
                <Video className="w-4 h-4" />
                Book Session
              </button>
              <Link 
                href="/messages"
                className="inline-flex items-center gap-2 bg-card hover:bg-accent text-foreground font-semibold px-6 py-2.5 rounded-full border border-border shadow-sm transition-colors cursor-pointer"
              >
                <MessageSquare className="w-4 h-4" />
                Send Message
              </Link>
              <button 
                type="button"
                onClick={() => setIsSwitchModalOpen(true)}
                className="inline-flex items-center gap-2 bg-purple-50 dark:bg-purple-950/50 hover:bg-purple-100 dark:hover:bg-purple-900/60 text-[#5e2be2] dark:text-purple-300 font-semibold px-5 py-2.5 rounded-full border border-purple-200/80 dark:border-purple-800/60 shadow-xs transition-all cursor-pointer"
                title="Request to be reassigned to a different therapist"
              >
                <RefreshCw className="w-4 h-4" />
                Switch Therapist
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Detail Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        
        {/* Left 2 Cols: Clinical Philosophy, Specializations, Approach */}
        <div className="md:col-span-2 space-y-8">
          
          {/* About Section */}
          <div className="hex-card !p-8 space-y-4">
            <h3 className="text-xl font-bold text-foreground flex items-center gap-2.5">
              <HeartPulse className="w-5 h-5 text-primary" />
              About {therapist.name}
            </h3>
            <p className="text-muted-foreground leading-relaxed text-base">
              {therapist.bio || "Your therapist has not added a profile description yet."}
            </p>
          </div>

          {/* Therapeutic Approach (only when the therapist has written one) */}
          {therapist.approach && (
          <div className="hex-card !p-8 space-y-4">
            <h3 className="text-xl font-bold text-foreground flex items-center gap-2.5">
              <Sparkles className="w-5 h-5 text-primary" />
              Approach & Philosophy
            </h3>
            <p className="text-muted-foreground leading-relaxed text-base">
              {therapist.approach}
            </p>
          </div>
          )}

          {/* Specializations & Focus Areas */}
          <div className="hex-card !p-8 space-y-4">
            <h3 className="text-xl font-bold text-foreground flex items-center gap-2.5">
              <CheckCircle2 className="w-5 h-5 text-primary" />
              Areas of Specialization
            </h3>
            {!therapist.specializations?.length && (
              <p className="text-sm text-muted-foreground">No specializations listed yet.</p>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              {therapist.specializations?.map((spec: string, idx: number) => (
                <div key={idx} className="flex items-center gap-3 p-3 rounded-2xl bg-muted/40 border border-border/50">
                  <div className="w-2.5 h-2.5 rounded-full bg-primary shrink-0"></div>
                  <span className="text-sm font-medium text-foreground">{spec}</span>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* Right 1 Col: Practice Info, Education, Certifications */}
        <div className="space-y-8">
          
          {/* Practice Information */}
          <div className="hex-card !p-6 space-y-5">
            <h3 className="text-lg font-bold text-foreground pb-2 border-b border-border">
              Practice Information
            </h3>
            
            <div className="space-y-4 text-sm">
              <div className="flex items-start gap-3">
                <Clock className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-foreground">Availability</p>
                  <p className="text-muted-foreground">{therapist.availability || "Not published yet"}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Education */}
          <div className="hex-card !p-6 space-y-4">
            <h3 className="text-lg font-bold text-foreground flex items-center gap-2 pb-2 border-b border-border">
              <GraduationCap className="w-5 h-5 text-primary" />
              Education & Training
            </h3>
            <div className="space-y-3">
              {!therapist.education?.length && (
                <p className="text-sm text-muted-foreground">No qualifications listed yet.</p>
              )}
              {therapist.education?.map((edu: any, idx: number) => (
                <div key={idx} className="text-sm space-y-0.5">
                  {typeof edu === 'string' ? (
                    <p className="font-semibold text-foreground">{edu}</p>
                  ) : (
                    <>
                      <p className="font-semibold text-foreground">{edu.degree}</p>
                      <p className="text-xs text-muted-foreground">{[edu.institution, edu.year].filter(Boolean).join(' · ')}</p>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Certifications */}
          <div className="hex-card !p-6 space-y-4">
            <h3 className="text-lg font-bold text-foreground flex items-center gap-2 pb-2 border-b border-border">
              <BookOpen className="w-5 h-5 text-primary" />
              Board Certifications
            </h3>
            <ul className="space-y-2.5 text-sm text-muted-foreground">
              {!therapist.certifications?.length && (
                <li className="text-sm">No certificates uploaded yet.</li>
              )}
              {therapist.certifications?.map((cert: string, idx: number) => (
                <li key={idx} className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  {therapist.certificates?.[idx]?.url ? (
                    <a href={therapist.certificates[idx].url} target="_blank" rel="noreferrer" className="text-xs font-medium leading-snug text-primary hover:underline">{cert}</a>
                  ) : (
                    <span className="text-xs font-medium leading-snug">{cert}</span>
                  )}
                </li>
              ))}
            </ul>
          </div>

        </div>

      </div>

      {/* Bottom Switch Therapist Support Card */}
      <div className="rounded-3xl bg-gradient-to-br from-slate-900 via-[#27116b] to-slate-950 text-white p-8 sm:p-10 relative overflow-hidden shadow-xl border border-purple-500/20">
        <div className="absolute top-0 right-0 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-purple-200 text-xs font-bold">
              <ArrowRightLeft className="w-3.5 h-3.5 text-purple-300" />
              <span>CARE CONTINUITY GUARANTEE</span>
            </div>
            <h3 className="text-2xl font-bold text-white tracking-tight">
              Looking for a Different Fit or Schedule?
            </h3>
            <p className="text-sm text-purple-100/80 leading-relaxed">
              Therapy is most transformative when you feel 100% aligned with your provider. If you'd like to switch to a different therapist or need different hours, our Super Admin team will match you seamlessly.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setIsSwitchModalOpen(true)}
            className="px-6 py-3.5 rounded-2xl bg-white text-slate-900 hover:bg-purple-50 font-extrabold text-sm shadow-xl transition-all hover:scale-[1.02] active:scale-95 cursor-pointer shrink-0 flex items-center gap-2.5"
          >
            <RefreshCw className="w-4 h-4 text-[#5e2be2]" />
            <span>Request Therapist Switch</span>
          </button>
        </div>
      </div>

      {/* Switch Therapist Modal Dialog */}
      <Dialog open={isSwitchModalOpen} onOpenChange={setIsSwitchModalOpen}>
        <DialogContent className="max-w-xl rounded-3xl p-6 sm:p-8 space-y-6 max-h-[90vh] overflow-y-auto">
          <DialogHeader className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-50 text-[#5e2be2] text-xs font-bold w-fit">
              <RefreshCw className="w-3.5 h-3.5" />
              <span>SWITCH THERAPIST REQUEST</span>
            </div>
            <DialogTitle className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white">
              Request a Different Therapist
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Submit your reassignment preferences. The Super Admin and coordination team will be notified immediately to assign your new match.
            </DialogDescription>
          </DialogHeader>

          {/* Current Assigned Therapist Summary */}
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-800 flex items-center gap-3">
            <img 
              src={therapist.avatarUrl || FALLBACK_AVATAR} 
              alt={therapist.name} 
              className="w-11 h-11 rounded-xl object-cover"
            />
            <div className="flex-1 min-w-0">
              <p className="text-[11px] text-slate-400 font-medium">Currently Assigned:</p>
              <h4 className="text-sm font-bold text-slate-900 dark:text-white truncate">{therapist.name}</h4>
              <p className="text-xs text-purple-600 dark:text-purple-400 truncate">{therapist.title}</p>
            </div>
          </div>

          <div className="space-y-5 text-xs">
            {/* Step 1: Reason for Switching */}
            <div className="space-y-2.5">
              <label className="text-xs font-bold text-slate-900 dark:text-white block">
                1. What is the primary reason for switching?
              </label>
              <div className="space-y-2">
                {SWITCH_REASONS.map((r) => (
                  <div
                    key={r.id}
                    onClick={() => setSwitchReason(r.id)}
                    className={`p-3 rounded-2xl border-2 transition-all cursor-pointer flex items-start gap-3 select-none ${
                      switchReason === r.id
                        ? "border-[#5e2be2] bg-purple-50/50 dark:bg-purple-950/30"
                        : "border-slate-200 dark:border-slate-800 hover:border-slate-300"
                    }`}
                  >
                    <div className={`w-4 h-4 rounded-full border mt-0.5 flex items-center justify-center shrink-0 ${
                      switchReason === r.id ? "border-[#5e2be2] bg-[#5e2be2]" : "border-slate-300 dark:border-slate-600"
                    }`}>
                      {switchReason === r.id && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                    </div>
                    <div>
                      <p className="font-bold text-slate-900 dark:text-white">{r.label}</p>
                      <p className="text-[11px] text-slate-500 mt-0.5">{r.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Step 2: Preferred Specialties */}
            <div className="space-y-2.5">
              <label className="text-xs font-bold text-slate-900 dark:text-white block">
                2. Preferred Specializations or Focus Areas (Optional):
              </label>
              <div className="flex flex-wrap gap-2">
                {SPECIALTY_OPTIONS.map((spec) => {
                  const isSelected = selectedSpecialties.includes(spec);
                  return (
                    <button
                      key={spec}
                      type="button"
                      onClick={() => toggleSpecialty(spec)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer border ${
                        isSelected
                          ? "bg-[#5e2be2] text-white border-[#5e2be2] shadow-xs"
                          : "bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-slate-300"
                      }`}
                    >
                      {isSelected ? "✓ " : "+ "}{spec}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Step 3: Specific Notes */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-900 dark:text-white block">
                3. Additional Notes for the Admin / Care Coordination Team:
              </label>
              <textarea
                value={switchNotes}
                onChange={(e) => setSwitchNotes(e.target.value)}
                placeholder="e.g., I would prefer appointments on Tuesdays/Thursdays after 6:00 PM, or a clinician with a focus on work-life balance..."
                rows={3}
                className="w-full p-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#5e2be2] resize-none"
              />
            </div>

            {/* Step 4: Urgency */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-900 dark:text-white block">
                4. Priority:
              </label>
              <div className="grid grid-cols-2 gap-3">
                <div
                  onClick={() => setSwitchUrgency("standard")}
                  className={`p-3 rounded-2xl border-2 text-center cursor-pointer font-bold ${
                    switchUrgency === "standard"
                      ? "border-[#5e2be2] bg-purple-50/50 text-[#5e2be2]"
                      : "border-slate-200 dark:border-slate-800 text-slate-600"
                  }`}
                >
                  Standard (24–48 Hours)
                </div>
                <div
                  onClick={() => setSwitchUrgency("urgent")}
                  className={`p-3 rounded-2xl border-2 text-center cursor-pointer font-bold ${
                    switchUrgency === "urgent"
                      ? "border-[#5e2be2] bg-purple-50/50 text-[#5e2be2]"
                      : "border-slate-200 dark:border-slate-800 text-slate-600"
                  }`}
                >
                  Priority (Immediate / Next Session)
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="flex flex-row items-center justify-between gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setIsSwitchModalOpen(false)}
              className="px-5 py-2.5 rounded-2xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="button"
              disabled={isSubmittingSwitch}
              onClick={handleSwitchSubmit}
              className="px-6 py-2.5 rounded-2xl bg-[#5e2be2] hover:bg-[#4d1fc4] text-white text-xs font-bold shadow-md cursor-pointer flex items-center gap-2 transition-all disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{isSubmittingSwitch ? "Submitting..." : "Submit Switch Request & Notify Admin"}</span>
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Booking Modal */}
      <BookingModal 
        isOpen={isBookingOpen} 
        onClose={() => setIsBookingOpen(false)}
        therapistName={therapist.name}
        therapistAvatar={therapist.avatarUrl}
        therapistTitle={therapist.title}
      />
    </motion.div>
  );
}

