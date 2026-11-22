import { useState } from "react";
import { 
  LineChart as LineChartIcon, 
  Sparkles, 
  ArrowRight, 
  Bell, 
  CheckCircle2, 
  Clock, 
  TrendingDown, 
  TrendingUp, 
  Minus, 
  RotateCcw,
  Sliders,
  ChevronRight,
  Activity,
  UserCheck,
  Brain,
  Layers,
  FileCheck,
  AlertCircle,
  ArrowDown,
  UserPlus,
  FileText,
  Target,
  Sparkle,
  Calculator,
  GitCompare,
  Eye,
  Repeat,
  MapPin,
  Trophy,
  Flame,
  Calendar,
  Heart,
  BarChart2,
  Check,
  User
} from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useOutcomeStore, calculateOutcome, OutcomeRecord } from "@/lib/outcome-store";
import { cn } from "@/lib/utils";
import { ResponsiveContainer, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";

interface ClientProgress {
  id: string;
  name: string;
  initials: string;
  avatarBg: string;
  wellnessScore: number;
  goalsAchieved: number;
  currentStreak: number;
  attendanceRate: string;
  therapyType: string;
  primaryConcern: string;
  lastOutcome: string;
  currentSession: number;
  nextMilestone: number;
  moodTrend: { session: string; score: number }[];
  activityCompletion: { day: string; count: number }[];
  currentGoals: { title: string; current: number; total: number; progress: number }[];
}

const CLIENT_PROGRESS_DATA: Record<string, ClientProgress> = {
  "1": {
    id: "1",
    name: "Sarah Jenkins",
    initials: "SJ",
    avatarBg: "bg-[#5e2be2] text-white",
    wellnessScore: 78,
    goalsAchieved: 3,
    currentStreak: 7,
    attendanceRate: "92%",
    therapyType: "CBT · Generalized Anxiety & Depression",
    primaryConcern: "Generalized Anxiety Disorder",
    lastOutcome: "PHQ-9: 14 → 6 (-8 pts)",
    currentSession: 12,
    nextMilestone: 15,
    moodTrend: [
      { session: "Week 1", score: 5 },
      { session: "Week 2", score: 6 },
      { session: "Week 3", score: 5.8 },
      { session: "Week 4", score: 7 },
      { session: "Week 5", score: 7.5 },
      { session: "Week 6", score: 8.2 },
    ],
    activityCompletion: [
      { day: "Mon", count: 2 },
      { day: "Tue", count: 1 },
      { day: "Wed", count: 3 },
      { day: "Thu", count: 2 },
      { day: "Fri", count: 4 },
      { day: "Sat", count: 1 },
      { day: "Sun", count: 3 },
    ],
    currentGoals: [
      { title: "Mindfulness & Grounding Practice", current: 8, total: 10, progress: 80 },
      { title: "Sleep Hygiene & Routine Adherence", current: 6, total: 8, progress: 75 },
      { title: "Cognitive Restructuring Thought Records", current: 7, total: 10, progress: 70 },
      { title: "Workplace Assertiveness Exercises", current: 5, total: 10, progress: 50 },
    ]
  },
  "2": {
    id: "2",
    name: "Michael Chen",
    initials: "MC",
    avatarBg: "bg-blue-600 text-white",
    wellnessScore: 65,
    goalsAchieved: 2,
    currentStreak: 5,
    attendanceRate: "88%",
    therapyType: "ACT · Major Depression Protocol",
    primaryConcern: "Depressive Episodes & Isolation",
    lastOutcome: "PHQ-9: 18 → 12 (-6 pts)",
    currentSession: 8,
    nextMilestone: 9,
    moodTrend: [
      { session: "Week 1", score: 3 },
      { session: "Week 2", score: 4 },
      { session: "Week 3", score: 4.5 },
      { session: "Week 4", score: 5 },
      { session: "Week 5", score: 6 },
      { session: "Week 6", score: 6.5 },
    ],
    activityCompletion: [
      { day: "Mon", count: 1 },
      { day: "Tue", count: 2 },
      { day: "Wed", count: 2 },
      { day: "Thu", count: 3 },
      { day: "Fri", count: 2 },
      { day: "Sat", count: 3 },
      { day: "Sun", count: 2 },
    ],
    currentGoals: [
      { title: "Behavioral Activation Exercise Logs", current: 6, total: 10, progress: 60 },
      { title: "Weekend Social Re-engagement Group", current: 4, total: 8, progress: 50 },
      { title: "Daily Negative Thought Challenging", current: 5, total: 10, progress: 50 },
    ]
  },
  "3": {
    id: "3",
    name: "Emily Rodriguez",
    initials: "ER",
    avatarBg: "bg-emerald-600 text-white",
    wellnessScore: 82,
    goalsAchieved: 4,
    currentStreak: 12,
    attendanceRate: "96%",
    therapyType: "DBT · Emotional Regulation & Stress",
    primaryConcern: "Interpersonal Stress & Burnout",
    lastOutcome: "PCL-5: 24 → 24 (No change)",
    currentSession: 9,
    nextMilestone: 12,
    moodTrend: [
      { session: "Week 1", score: 6 },
      { session: "Week 2", score: 6.5 },
      { session: "Week 3", score: 7 },
      { session: "Week 4", score: 7.8 },
      { session: "Week 5", score: 8 },
      { session: "Week 6", score: 8.5 },
    ],
    activityCompletion: [
      { day: "Mon", count: 3 },
      { day: "Tue", count: 3 },
      { day: "Wed", count: 4 },
      { day: "Thu", count: 3 },
      { day: "Fri", count: 4 },
      { day: "Sat", count: 2 },
      { day: "Sun", count: 4 },
    ],
    currentGoals: [
      { title: "DBT TIPP Distress Tolerance Skills", current: 9, total: 10, progress: 90 },
      { title: "Family Interpersonal Boundary Setting", current: 7, total: 8, progress: 87.5 },
      { title: "Daily Mindfulness Meditation", current: 8, total: 10, progress: 80 },
    ]
  },
  "4": {
    id: "4",
    name: "David Kim",
    initials: "DK",
    avatarBg: "bg-indigo-600 text-white",
    wellnessScore: 58,
    goalsAchieved: 1,
    currentStreak: 4,
    attendanceRate: "100%",
    therapyType: "CBT · Social Anxiety Protocol",
    primaryConcern: "Social Anxiety & Public Speaking",
    lastOutcome: "GAD-7: 16 → 14 (-2 pts)",
    currentSession: 2,
    nextMilestone: 3,
    moodTrend: [
      { session: "Week 1", score: 4 },
      { session: "Week 2", score: 5 },
    ],
    activityCompletion: [
      { day: "Mon", count: 1 },
      { day: "Tue", count: 1 },
      { day: "Wed", count: 2 },
      { day: "Thu", count: 1 },
      { day: "Fri", count: 2 },
      { day: "Sat", count: 1 },
      { day: "Sun", count: 2 },
    ],
    currentGoals: [
      { title: "Public Speaking Exposure Hierarchy", current: 3, total: 10, progress: 30 },
      { title: "Grounding Exercises during Briefings", current: 4, total: 8, progress: 50 },
    ]
  },
  "5": {
    id: "5",
    name: "Jessica Taylor",
    initials: "JT",
    avatarBg: "bg-rose-600 text-white",
    wellnessScore: 95,
    goalsAchieved: 4,
    currentStreak: 16,
    attendanceRate: "100%",
    therapyType: "CBT · Panic Protocol (Graduated)",
    primaryConcern: "Panic Disorder & Agoraphobia",
    lastOutcome: "GAD-7: 12 → 3 (-9 pts)",
    currentSession: 16,
    nextMilestone: 16,
    moodTrend: [
      { session: "Week 1", score: 4 },
      { session: "Week 2", score: 5 },
      { session: "Week 3", score: 7 },
      { session: "Week 4", score: 8.5 },
      { session: "Week 5", score: 9 },
      { session: "Week 6", score: 9.5 },
    ],
    activityCompletion: [
      { day: "Mon", count: 4 },
      { day: "Tue", count: 4 },
      { day: "Wed", count: 4 },
      { day: "Thu", count: 4 },
      { day: "Fri", count: 4 },
      { day: "Sat", count: 3 },
      { day: "Sun", count: 4 },
    ],
    currentGoals: [
      { title: "Interoceptive Exposure Protocol", current: 10, total: 10, progress: 100 },
      { title: "Subway Travel Independence", current: 8, total: 8, progress: 100 },
    ]
  }
};

export default function Outcomes() {
  const { outcomes } = useOutcomeStore();
  const [selectedClientId, setSelectedClientId] = useState<string>("1");
  const [selectedOutcome, setSelectedOutcome] = useState<OutcomeRecord | null>(null);
  const [showSimulator, setShowSimulator] = useState(false);

  const activeClient: ClientProgress = CLIENT_PROGRESS_DATA[selectedClientId] || CLIENT_PROGRESS_DATA["1"];

  // Simulator state
  const [simClient, setSimClient] = useState("Sarah Jenkins");
  const [simAssessment, setSimAssessment] = useState("Anxiety & Worry (GAD-7)");
  const [simSession, setSimSession] = useState("12");
  const [simPrevScore, setSimPrevScore] = useState("16");
  const [simCurrScore, setSimCurrScore] = useState("11");
  const [simSuccessMsg, setSimSuccessMsg] = useState<string | null>(null);

  const handleSimulate = (e: React.FormEvent) => {
    e.preventDefault();
    const prev = parseInt(simPrevScore, 10) || 0;
    const curr = parseInt(simCurrScore, 10) || 0;
    const sessionNum = parseInt(simSession, 10) || 3;

    const res = calculateOutcome({
      clientId: selectedClientId,
      clientName: activeClient.name,
      clientInitials: activeClient.initials,
      avatarBg: activeClient.avatarBg,
      assessmentName: simAssessment.split("(")[0].trim(),
      assessmentCode: simAssessment.includes("GAD-7") ? "GAD-7" : simAssessment.includes("PHQ-9") ? "PHQ-9" : "PCL-5",
      sessionMilestone: sessionNum,
      previousScore: prev,
      currentScore: curr,
      maxScore: 21,
    });

    setSimSuccessMsg(`Outcome calculated for ${activeClient.name}: ${prev} → ${curr} (${res.outcome.changeLabel}). Notification dispatched.`);
    setTimeout(() => setSimSuccessMsg(null), 5000);
  };

  return (
    <div className="space-y-8 pb-12">
      {/* Top Header Bar with Per-Client Selector */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
              Your Progress
            </h1>
            <Badge className="bg-[#5e2be2] text-white border-none font-bold text-xs">
              Client Suite View
            </Badge>
          </div>
          <p className="text-slate-500 text-xs sm:text-sm font-medium">
            Celebrate how far you've come. Every step counts.
          </p>
        </div>

        {/* Client Selection Bar */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-500">Select Client:</span>
            <Select value={selectedClientId} onValueChange={setSelectedClientId}>
              <SelectTrigger className="w-[240px] h-10 text-xs bg-slate-50 border-slate-200 rounded-2xl font-bold text-slate-900 shadow-2xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">Sarah Jenkins (Session 12)</SelectItem>
                <SelectItem value="2">Michael Chen (Session 8)</SelectItem>
                <SelectItem value="3">Emily Rodriguez (Session 9)</SelectItem>
                <SelectItem value="4">Client A - James Chen (Session 6)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-purple-50 text-[#5e2be2] font-bold text-xs border border-purple-200/80 shadow-2xs">
            <Sparkles className="w-4 h-4 text-[#5e2be2]" />
            <span>Wellness Score: {activeClient.wellnessScore}/100</span>
          </div>

          <Button
            onClick={() => setShowSimulator(true)}
            className="bg-[#5e2be2] hover:bg-[#4f28d9] text-white font-extrabold text-xs h-10 px-4 rounded-2xl shadow-md shadow-[#5e2be2]/20 flex items-center gap-2 cursor-pointer"
          >
            <Sliders className="w-4 h-4" />
            <span>Simulate 3-Session Calculation</span>
          </Button>
        </div>
      </div>

      {/* TOP METRIC CARDS ROW (3 Pastel Cards Across - Exact Screenshot Match) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Card 1: Goals Achieved */}
        <div className="p-6 rounded-3xl bg-emerald-50/70 border border-emerald-200/70 space-y-4 shadow-2xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
              <Trophy className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Goals Achieved</h3>
              <p className="text-xs text-slate-500 font-medium">Milestones reached for {activeClient.name}</p>
            </div>
          </div>
          <div className="text-4xl font-extrabold text-slate-900 font-mono tracking-tight">
            {activeClient.goalsAchieved}
          </div>
        </div>

        {/* Card 2: Current Streak */}
        <div className="p-6 rounded-3xl bg-amber-50/70 border border-amber-200/70 space-y-4 shadow-2xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center font-bold">
              <Flame className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Current Streak</h3>
              <p className="text-xs text-slate-500 font-medium">Consecutive days active</p>
            </div>
          </div>
          <div className="text-4xl font-extrabold text-slate-900 font-mono tracking-tight">
            {activeClient.currentStreak}
          </div>
        </div>

        {/* Card 3: Attendance */}
        <div className="p-6 rounded-3xl bg-blue-50/70 border border-blue-200/70 space-y-4 shadow-2xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Attendance</h3>
              <p className="text-xs text-slate-500 font-medium">Session completion rate</p>
            </div>
          </div>
          <div className="text-4xl font-extrabold text-slate-900 font-mono tracking-tight">
            {activeClient.attendanceRate}
          </div>
        </div>
      </div>

      {/* MIDDLE SECTION: ACTIVITY COMPLETION CHART */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Right Chart: Activity Completion */}
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-emerald-100 text-emerald-600">
                <BarChart2 className="w-4 h-4" />
              </span>
              <div>
                <h3 className="text-base font-bold text-slate-900">Activity Completion</h3>
                <p className="text-xs text-slate-500 font-medium">Weekly exercises finished by {activeClient.name}</p>
              </div>
            </div>
            <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 font-bold text-[10px]">
              Weekly Exercises
            </Badge>
          </div>

          <div className="h-64 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={activeClient.activityCompletion} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)' }}
                  labelStyle={{ fontWeight: 'bold', color: '#0f172a' }}
                />
                <Bar dataKey="count" fill="#10b981" radius={[8, 8, 0, 0]} barSize={36} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* BOTTOM SECTION: CURRENT GOALS CARD (Exact Screenshot Match) */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div>
            <h3 className="text-lg font-bold text-slate-900">Current Goals for {activeClient.name}</h3>
            <p className="text-xs text-slate-500 font-medium">
              3-session outcome milestones & active treatment objectives
            </p>
          </div>
          <Badge className="bg-[#5e2be2] text-white border-none text-xs font-bold px-3 py-1">
            Session {activeClient.currentSession} / {activeClient.nextMilestone}
          </Badge>
        </div>

        {/* Goal Progress Bars */}
        <div className="space-y-6">
          {activeClient.currentGoals.map((goal, idx) => (
            <div key={idx} className="space-y-2">
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="text-slate-900">{goal.title}</span>
                <span className="text-[#5e2be2] font-mono font-extrabold">{goal.current} / {goal.total}</span>
              </div>
              <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden p-0.5 border border-slate-200/60">
                <div 
                  className="h-full bg-[#5e2be2] rounded-full transition-all duration-500" 
                  style={{ width: `${goal.progress}%` }} 
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 3-SESSION OUTCOME CALCULATION WORKFLOW & THERAPIST NOTIFICATION PANEL */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div>
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Layers className="w-5 h-5 text-[#5e2be2]" />
              <span>3-Session Outcome Calculation Workflow</span>
            </h3>
            <p className="text-xs text-slate-500 font-medium">
              Automated trigger after every 3 sessions: Assessment → Calculate → Compare → 🔔 Notify Therapist
            </p>
          </div>
          <Badge className="bg-[#5e2be2] text-white border-none text-xs font-bold px-3 py-1">
            BRD Rule Specification
          </Badge>
        </div>

        {/* 6-Step Intake & 3-Session Trigger Pipeline */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-1 text-center">
            <div className="w-7 h-7 mx-auto rounded-lg bg-[#5e2be2] text-white text-xs font-bold flex items-center justify-center">1</div>
            <p className="text-xs font-bold text-slate-900">CLIENT BOOKS</p>
            <p className="text-[11px] text-slate-500 leading-tight">Assigned to therapist</p>
          </div>

          <div className="p-3.5 rounded-2xl bg-purple-50/70 border border-purple-200 space-y-1 text-center">
            <div className="w-7 h-7 mx-auto rounded-lg bg-purple-600 text-white text-xs font-bold flex items-center justify-center">2</div>
            <p className="text-xs font-bold text-slate-900">GENERAL ASSESSMENTS</p>
            <p className="text-[11px] text-purple-900 leading-tight font-medium">Assigned automatically</p>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-1 text-center">
            <div className="w-7 h-7 mx-auto rounded-lg bg-slate-700 text-white text-xs font-bold flex items-center justify-center">3</div>
            <p className="text-xs font-bold text-slate-900">BEFORE SESSION 1</p>
            <p className="text-[11px] text-slate-500 leading-tight">Client completes</p>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-1 text-center">
            <div className="w-7 h-7 mx-auto rounded-lg bg-indigo-600 text-white text-xs font-bold flex items-center justify-center">4</div>
            <p className="text-xs font-bold text-slate-900">SESSION 1</p>
            <p className="text-[11px] text-slate-500 leading-tight">Identify concern</p>
          </div>

          <div className="p-3.5 rounded-2xl bg-purple-50/70 border border-purple-200 space-y-1 text-center">
            <div className="w-7 h-7 mx-auto rounded-lg bg-purple-700 text-white text-xs font-bold flex items-center justify-center">5</div>
            <p className="text-xs font-bold text-slate-900">CONCERN ASSESSMENT</p>
            <p className="text-[11px] text-purple-900 leading-tight font-medium">Assigned automatically</p>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-1 text-center">
            <div className="w-7 h-7 mx-auto rounded-lg bg-slate-800 text-white text-xs font-bold flex items-center justify-center">6</div>
            <p className="text-xs font-bold text-slate-900">COMPLETES CONCERN</p>
            <p className="text-[11px] text-slate-500 leading-tight">Baseline established</p>
          </div>
        </div>

        {/* Milestone Trigger Engine Container */}
        <div className="p-5 rounded-3xl bg-[#5e2be2] text-white space-y-3 shadow-lg shadow-[#5e2be2]/20">
          <div className="flex items-center justify-between border-b border-white/20 pb-2">
            <span className="text-xs font-extrabold uppercase tracking-wider flex items-center gap-1.5">
              <Calculator className="w-4 h-4" /> RECURRING EVERY 3 SESSIONS OUTCOME ENGINE (SESSIONS 3, 6, 9, 12...)
            </span>
            <Badge className="bg-white text-[#5e2be2] font-bold text-xs">Continuous Loop</Badge>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-5 gap-2 text-xs font-semibold">
            <div className="p-2.5 rounded-xl bg-white/10 text-center">1. GENERAL + CONCERN ASSESSMENTS</div>
            <div className="p-2.5 rounded-xl bg-white/10 text-center">2. SYSTEM CALCULATES OUTCOME</div>
            <div className="p-2.5 rounded-xl bg-white/10 text-center">3. COMPARE PREVIOUS RESULT</div>
            <div className="p-2.5 rounded-xl bg-white text-[#5e2be2] font-black text-center shadow-xs">4. 🔔 NOTIFY THERAPIST</div>
            <div className="p-2.5 rounded-xl bg-white/10 text-center">5. THERAPIST + CLIENT SEE PROGRESS</div>
          </div>
        </div>
      </div>

      {/* 3 Main Therapist Notification Cases Showcase */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Bell className="w-5 h-5 text-[#5e2be2]" />
            <span>Therapist Notification Formatting Cases</span>
          </h3>
          <span className="text-xs text-slate-500 font-medium font-mono">Previous Score → Current Score → Change</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Case 1: Score Decreases */}
          <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-sm space-y-3 relative overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                🔔 Outcome Updated
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                Score Decreased
              </span>
            </div>

            <div className="space-y-2 text-xs">
              <p className="text-slate-700 font-medium">
                <strong>{activeClient.name}</strong>'s assessment outcome has been updated.
              </p>

              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 space-y-1 font-mono">
                <div className="flex justify-between text-slate-800 font-bold">
                  <span>Anxiety & Worry:</span>
                  <span className="text-[#5e2be2]">16 → 11</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Change:</span>
                  <span className="font-bold text-emerald-600">-5 points</span>
                </div>
                <div className="text-[10px] text-slate-400 font-sans mt-1">
                  Assessment completed after Session 6.
                </div>
              </div>
            </div>

            <div className="pt-2">
              <button 
                type="button" 
                onClick={() => {
                  const item = outcomes.find(o => o.changeValue === -5);
                  if (item) setSelectedOutcome(item);
                }}
                className="w-full h-9 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-[#5e2be2] font-bold text-xs transition-colors cursor-pointer"
              >
                [View Outcome]
              </button>
            </div>
          </div>

          {/* Case 2: Score Increases */}
          <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-sm space-y-3 relative overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                🔔 Outcome Updated
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                Score Increased
              </span>
            </div>

            <div className="space-y-2 text-xs">
              <p className="text-slate-700 font-medium">
                <strong>{activeClient.name}</strong>'s assessment outcome has been updated.
              </p>

              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 space-y-1 font-mono">
                <div className="flex justify-between text-slate-800 font-bold">
                  <span>Anxiety & Worry:</span>
                  <span className="text-[#5e2be2]">11 → 15</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Change:</span>
                  <span className="font-bold text-amber-600">+4 points</span>
                </div>
                <div className="text-[10px] text-slate-400 font-sans mt-1">
                  Assessment completed after Session 9.
                </div>
              </div>
            </div>

            <div className="pt-2">
              <button 
                type="button"
                onClick={() => {
                  const item = outcomes.find(o => o.changeValue === 4);
                  if (item) setSelectedOutcome(item);
                }}
                className="w-full h-9 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-[#5e2be2] font-bold text-xs transition-colors cursor-pointer"
              >
                [View Outcome]
              </button>
            </div>
          </div>

          {/* Case 3: No Change */}
          <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-sm space-y-3 relative overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                🔔 Outcome Updated
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                No Change
              </span>
            </div>

            <div className="space-y-2 text-xs">
              <p className="text-slate-700 font-medium">
                <strong>{activeClient.name}</strong>'s assessment outcome has been updated.
              </p>

              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 space-y-1 font-mono">
                <div className="flex justify-between text-slate-800 font-bold">
                  <span>Anxiety & Worry:</span>
                  <span className="text-[#5e2be2]">11 → 11</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Change:</span>
                  <span className="font-bold text-slate-600">No change</span>
                </div>
                <div className="text-[10px] text-slate-400 font-sans mt-1">
                  Assessment completed after Session 12.
                </div>
              </div>
            </div>

            <div className="pt-2">
              <button 
                type="button"
                onClick={() => {
                  const item = outcomes.find(o => o.changeValue === 0);
                  if (item) setSelectedOutcome(item);
                }}
                className="w-full h-9 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-[#5e2be2] font-bold text-xs transition-colors cursor-pointer"
              >
                [View Outcome]
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Interactive Simulation Drawer Modal */}
      <Dialog open={showSimulator} onOpenChange={setShowSimulator}>
        <DialogContent className="w-[calc(100vw-2rem)] sm:max-w-md p-4 sm:p-6 rounded-[20px] sm:rounded-[24px] bg-white border-none shadow-2xl space-y-4 outline-none max-h-[92vh] overflow-y-auto">
          <DialogHeader className="text-left space-y-1">
            <DialogTitle className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <Sliders className="w-5 h-5 text-[#5e2be2]" />
              <span>Simulate 3-Session Outcome</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500 font-medium">
              Calculate score delta and fire automatic notification to therapist
            </DialogDescription>
          </DialogHeader>

          {simSuccessMsg && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{simSuccessMsg}</span>
            </div>
          )}

          <form onSubmit={handleSimulate} className="space-y-4">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Select Client</label>
              <Select value={selectedClientId} onValueChange={setSelectedClientId}>
                <SelectTrigger className="rounded-xl border-slate-200">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Sarah Jenkins</SelectItem>
                  <SelectItem value="2">Michael Chen</SelectItem>
                  <SelectItem value="3">Emily Rodriguez</SelectItem>
                  <SelectItem value="4">Client A - James Chen</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Assessment Instrument</label>
              <Select value={simAssessment} onValueChange={setSimAssessment}>
                <SelectTrigger className="rounded-xl border-slate-200">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Anxiety & Worry (GAD-7)">Anxiety & Worry (GAD-7)</SelectItem>
                  <SelectItem value="Mood & Wellbeing (PHQ-9)">Mood & Wellbeing (PHQ-9)</SelectItem>
                  <SelectItem value="Post-Traumatic Symptoms (PCL-5)">Post-Traumatic Symptoms (PCL-5)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Session #</label>
                <Select value={simSession} onValueChange={setSimSession}>
                  <SelectTrigger className="rounded-xl border-slate-200">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="3">Session 3</SelectItem>
                    <SelectItem value="6">Session 6</SelectItem>
                    <SelectItem value="9">Session 9</SelectItem>
                    <SelectItem value="12">Session 12</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Previous Score</label>
                <Input 
                  type="number" 
                  value={simPrevScore} 
                  onChange={(e) => setSimPrevScore(e.target.value)} 
                  className="rounded-xl border-slate-200 font-mono text-center font-bold"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Current Score</label>
                <Input 
                  type="number" 
                  value={simCurrScore} 
                  onChange={(e) => setSimCurrScore(e.target.value)} 
                  className="rounded-xl border-slate-200 font-mono text-center font-bold"
                />
              </div>
            </div>

            <div className="pt-2 flex items-center justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowSimulator(false)}
                className="rounded-xl border-slate-200 font-bold text-xs"
              >
                Close
              </Button>
              <Button
                type="submit"
                className="bg-[#5e2be2] hover:bg-[#4f28d9] text-white font-bold text-xs rounded-xl"
              >
                Calculate & Send Notification
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Outcome Detail Modal */}
      <Dialog open={!!selectedOutcome} onOpenChange={(open) => !open && setSelectedOutcome(null)}>
        <DialogContent className="w-[calc(100vw-2rem)] sm:max-w-xl p-4 sm:p-7 rounded-[20px] sm:rounded-[24px] bg-white border-none shadow-2xl space-y-0 gap-0 outline-none max-h-[92vh] overflow-y-auto">
          {selectedOutcome && (
            <div className="space-y-5">
              <DialogHeader className="space-y-1 text-left">
                <div className="flex items-center gap-2 mb-1">
                  <span className="p-2 rounded-xl bg-purple-100 text-[#5e2be2] text-lg font-bold">🧠</span>
                  <div>
                    <DialogTitle className="text-xl font-bold text-slate-900">
                      Assessment Outcome Details
                    </DialogTitle>
                    <DialogDescription className="text-xs text-slate-500 font-medium">
                      3-Session Assessment Outcome Workflow Calculation
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-slate-400 uppercase font-bold tracking-wider">Client</p>
                    <p className="text-sm font-bold text-slate-900">{selectedOutcome.clientName}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-slate-400 uppercase font-bold tracking-wider">Milestone</p>
                    <p className="text-xs font-bold px-2.5 py-1 rounded-full bg-purple-100 text-[#5e2be2]">
                      Completed after Session {selectedOutcome.sessionMilestone}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3 pt-2 border-t border-slate-200/60">
                  <div className="p-3 bg-white rounded-xl border border-slate-200 text-center">
                    <p className="text-[11px] font-semibold text-slate-500">Previous Score</p>
                    <p className="text-xl font-extrabold text-slate-800 mt-0.5">{selectedOutcome.previousScore}</p>
                  </div>
                  <div className="p-3 bg-white rounded-xl border border-slate-200 text-center">
                    <p className="text-[11px] font-semibold text-slate-500">Current Score</p>
                    <p className="text-xl font-extrabold text-[#5e2be2] mt-0.5">{selectedOutcome.currentScore}</p>
                  </div>
                  <div className="p-3 bg-white rounded-xl border border-slate-200 text-center">
                    <p className="text-[11px] font-semibold text-slate-500">Score Change</p>
                    <p className={cn(
                      "text-xl font-extrabold mt-0.5",
                      selectedOutcome.changeValue < 0 && "text-emerald-600",
                      selectedOutcome.changeValue > 0 && "text-amber-600",
                      selectedOutcome.changeValue === 0 && "text-slate-600"
                    )}>
                      {selectedOutcome.changeLabel}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-slate-50/70 p-3.5 rounded-xl border border-slate-200 text-xs leading-relaxed text-slate-600">
                <p className="font-semibold text-slate-800 mb-1">BRD Neutral Rule Enforcement:</p>
                <p>
                  This system calculates score changes neutrally without pre-labeling them as "good" or "bad". 
                  The outcome calculation is automatically dispatched to the therapist notification panel after Session {selectedOutcome.sessionMilestone}.
                </p>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedOutcome(null)}
                  className="h-10 px-5 rounded-xl bg-[#5e2be2] text-white font-bold text-xs hover:bg-[#4f28d9] transition-colors cursor-pointer"
                >
                  Done
                </button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
