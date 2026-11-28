/*
List of Assessments:
1. PSS-10 (Stress) (General for all clients)
2. WHO-5 (Well Being) (General for all Clients)
3. WSAS (Functioning) (General for all Clients)
4. PHQ-9 (Depression) 
5. GAD-7 (Anxiety)
6. PCL-5 (PTSD)
7. OCI-R (OCD)
8. ASRS v1.1 (ADHD)

Other assessments are for specific clients with the concerns
*/
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { PageHeader } from '@/components/shared';
import { 
  Activity, 
  Calendar, 
  ShieldCheck, 
  TrendingUp, 
  Brain, 
  Lock, 
  Clock, 
  Plus, 
  Check,
  Sparkles,
  ShieldAlert,
  ArrowRight
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip 
} from 'recharts';
import { Link } from 'wouter';

import { getClientAuth, ClientAuthUser } from '@/lib/auth';
import { getUserSessions, syncUserSessions, SessionItem } from '@/lib/client-store';
import { BookingModal } from '@/components/booking-modal';

interface AssessmentOutcomeMetric {
  id: string;
  acronym: string;
  title: string;
  scaleDescription: string;
  category: string;
  categoryColor: string;
  isGeneral: boolean;
  isAssigned: boolean;
  assignedFrequency?: string;
  Icon: React.ComponentType<{ className?: string }>;
  iconBgClass: string;
  chartColor: string;
  maxScore: number;
  hasResult: boolean;
  score?: number;
  severityLabel?: string;
  severityColor?: string;
  date?: string;
  statusHeading: string;
  statusSubtext: string;
  intervalTag: string;
  chartData: Array<{ milestone: string; score: number }>;
  baseScore: number | null;
  currentScore: number | null;
}

const CANONICAL_DEFINITIONS: Record<string, {
  title: string;
  scaleDesc: string;
  category: string;
  categoryColor: string;
  Icon: React.ComponentType<{ className?: string }>;
  iconBgClass: string;
  chartColor: string;
  maxScore: number;
}> = {
  'WHO-5': {
    title: 'Overall Wellbeing',
    scaleDesc: 'WHO-5 Well-Being Index (Scale: 0 – 25, higher is better)',
    category: 'Wellbeing',
    categoryColor: 'text-emerald-600 dark:text-emerald-400',
    Icon: Activity,
    iconBgClass: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
    chartColor: '#10b981',
    maxScore: 25
  },
  'PSS-10': {
    title: 'General Stress',
    scaleDesc: 'Standardized PSS-10 Perceived Stress (Scale: 0 – 40)',
    category: 'Stress',
    categoryColor: 'text-blue-600 dark:text-blue-400',
    Icon: TrendingUp,
    iconBgClass: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
    chartColor: '#3b82f6',
    maxScore: 40
  },
  'WSAS': {
    title: 'Work & Social Functioning',
    scaleDesc: 'Work and Social Adjustment Scale (Scale: 0 – 40)',
    category: 'Functioning',
    categoryColor: 'text-indigo-600 dark:text-indigo-400',
    Icon: Sparkles,
    iconBgClass: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400',
    chartColor: '#6366f1',
    maxScore: 40
  },
  'GAD-7': {
    title: 'Generalized Anxiety (GAD-7)',
    scaleDesc: 'Anxiety Severity Screener (Scale: 0 – 21)',
    category: 'Anxiety',
    categoryColor: 'text-purple-600 dark:text-purple-400',
    Icon: Brain,
    iconBgClass: 'bg-purple-500/10 text-purple-600 dark:text-purple-400',
    chartColor: '#9333ea',
    maxScore: 21
  },
  'PHQ-9': {
    title: 'Depression Severity (PHQ-9)',
    scaleDesc: 'Standardized Depression Screener (Scale: 0 – 27)',
    category: 'Depression',
    categoryColor: 'text-rose-600 dark:text-rose-400',
    Icon: ShieldCheck,
    iconBgClass: 'bg-rose-500/10 text-rose-600 dark:text-rose-400',
    chartColor: '#e11d48',
    maxScore: 27
  },
  'PCL-5': {
    title: 'PTSD Checklist (PCL-5)',
    scaleDesc: 'DSM-5 Trauma & PTSD Measure (Scale: 0 – 80)',
    category: 'PTSD & Trauma',
    categoryColor: 'text-amber-600 dark:text-amber-400',
    Icon: ShieldAlert,
    iconBgClass: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
    chartColor: '#d97706',
    maxScore: 80
  },
  'OCI-R': {
    title: 'Obsessive-Compulsive (OCI-R)',
    scaleDesc: 'OCD Symptom Inventory (Scale: 0 – 72)',
    category: 'OCD',
    categoryColor: 'text-cyan-600 dark:text-cyan-400',
    Icon: Activity,
    iconBgClass: 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400',
    chartColor: '#0891b2',
    maxScore: 72
  },
  'ASRS': {
    title: 'ADHD Self-Report (ASRS v1.1)',
    scaleDesc: 'Adult ADHD Symptom Screener (Scale: 0 – 18)',
    category: 'ADHD',
    categoryColor: 'text-violet-600 dark:text-violet-400',
    Icon: TrendingUp,
    iconBgClass: 'bg-violet-500/10 text-violet-600 dark:text-violet-400',
    chartColor: '#7c3aed',
    maxScore: 18
  }
};

function normalizeAcronym(raw: string): string {
  const upper = (raw || '').trim().toUpperCase();
  if (upper.includes('WHO')) return 'WHO-5';
  if (upper.includes('PSS') || upper.includes('STRESS')) return 'PSS-10';
  if (upper.includes('WSAS') || upper.includes('FUNCTION')) return 'WSAS';
  if (upper.includes('GAD') || upper.includes('ANXIETY')) return 'GAD-7';
  if (upper.includes('PHQ') || upper.includes('DEPRESSION')) return 'PHQ-9';
  if (upper.includes('PCL') || upper.includes('PTSD') || upper.includes('TRAUMA')) return 'PCL-5';
  if (upper.includes('OCI') || upper.includes('OCD')) return 'OCI-R';
  if (upper.includes('ASRS') || upper.includes('ADHD')) return 'ASRS';
  return upper.replace(/[^A-Z0-9-]/g, '');
}

export default function ProgressPage() {
  const [authUser, setAuthUserState] = useState<ClientAuthUser | null>(() => getClientAuth());
  const [sessions, setSessions] = useState<SessionItem[]>(() => getUserSessions());
  const [clientAssignments, setClientAssignments] = useState<any[]>([]);
  const [clientSubmissions, setClientSubmissions] = useState<any[]>([]);
  const [isBookingOpen, setIsBookingOpen] = useState<boolean>(false);

  // Sync client data once on mount without causing render loops
  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      // 1. Sync live sessions
      syncUserSessions().then((s) => {
        if (isMounted) setSessions(s);
      });

      const current = getClientAuth();
      if (!current?.email) return;

      const clientEmail = current.email.toLowerCase().trim();
      const clientId = String(current.id || '');

      // 2. Fetch client profile
      try {
        const emailParam = `?email=${encodeURIComponent(current.email)}`;
        const res = await fetch(`/api/client-data${emailParam}`).catch(() => null);
        if (res && res.ok) {
          const data = await res.json().catch(() => ({}));
          if (data?.success && data?.client && isMounted) {
            setAuthUserState((prev) => ({ ...prev, ...current, ...data.client }));
          }
        }
      } catch (err) {
        console.warn('Failed to refresh client progress data:', err);
      }

      // 3. Fetch assessment assignments & submissions
      try {
        const q = new URLSearchParams();
        if (clientEmail) q.set('clientEmail', clientEmail);
        if (clientId) q.set('clientId', clientId);
        const aRes = await fetch(`/api/assessments?${q.toString()}`).catch(() => null);
        if (aRes && aRes.ok) {
          const aData = await aRes.json().catch(() => ({}));
          if (isMounted) {
            if (Array.isArray(aData.assignments)) {
              const myAssignments = aData.assignments.filter((asn: any) => {
                if (!asn) return false;
                const aEmail = (asn.clientEmail || '').toLowerCase().trim();
                const aId = String(asn.clientId || '');
                // By email or id only: another client can have the same name
                return (clientEmail && aEmail === clientEmail) || (clientId && aId === clientId);
              });
              setClientAssignments(myAssignments);
            }
            if (Array.isArray(aData.submissions)) {
              const mySubmissions = aData.submissions.filter((sub: any) => {
                if (!sub) return false;
                const sEmail = (sub.clientEmail || '').toLowerCase().trim();
                const sId = String(sub.clientId || '');
                return (clientEmail && sEmail === clientEmail) || (clientId && sId === clientId);
              });
              setClientSubmissions(mySubmissions);
            }
          }
        }
      } catch {}
    }

    loadData();

    return () => {
      isMounted = false;
    };
  }, []);

  const clientName = authUser?.name || "Client User";

  // Compute completed sessions accurately across storage, bookings & user profile
  const completedSessionsCount = useMemo(() => {
    // Only sessions the server marked COMPLETED count (not cancelled or no-show ones whose time has passed)
    const pastCount = sessions.filter(s => s.bookingStatus === 'COMPLETED').length;
    const profileCompleted = authUser?.completedSessionsCount ?? 0;
    const historyCount = authUser?.sessionHistory?.length ?? 0;

    return Math.max(pastCount, profileCompleted, historyCount);
  }, [sessions, authUser]);

  const upcomingSessions = useMemo(() => {
    return sessions.filter(s => 
      s.status === 'upcoming' && 
      (!s.scheduledAt || new Date(s.scheduledAt).getTime() >= Date.now() - 1000 * 60 * 60)
    );
  }, [sessions]);

  // CLINICAL OUTCOME EVALUATION CYCLE GATING:
  const isMetricsUnlocked = completedSessionsCount >= 3;
  const sessionsRemainingForUnlock = Math.max(0, 3 - completedSessionsCount);
  const currentEvaluationCycle = Math.max(1, Math.floor(completedSessionsCount / 3));
  const nextMilestoneSession = (Math.floor(completedSessionsCount / 3) + 1) * 3;
  const sessionsUntilNextUpdate = nextMilestoneSession - completedSessionsCount;

  // Build the outcome cards from the client's own submitted assessments only (no estimated baselines or trends)
  const assessmentMetrics: AssessmentOutcomeMetric[] = useMemo(() => {
    const submissions = clientSubmissions || [];

    const toTime = (value: unknown) => {
      const t = new Date(String(value ?? '').replace(' ', 'T')).getTime();
      return Number.isFinite(t) ? t : 0;
    };
    const shortDate = (t: number) =>
      t ? new Date(t).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : '';

    type Attempt = { score: number; maxScore?: number; severity?: string; time: number; date?: string };
    const attemptsFor = (canonicalAcronym: string): Attempt[] => {
      const fromSubs: Attempt[] = submissions
        .filter((s: any) => normalizeAcronym(s.assessmentAcronym || s.assessmentTitle || '') === canonicalAcronym)
        .map((s: any) => ({
          score: Number(s.totalScore ?? s.score),
          maxScore: Number(s.maxScore) || undefined,
          severity: s.severityLabel || s.severity,
          time: toTime(s.createdAt || s.completedAt),
          date: s.completedAt || s.createdAt,
        }))
        .filter((a) => Number.isFinite(a.score));
      // The API already includes attempts saved only on the profile, so this matches the therapist's view
      return fromSubs.sort((a, b) => a.time - b.time);
    };

    const generalSet = ['WHO-5', 'PSS-10', 'WSAS'];
    const assignedSet = new Set<string>();
    // Same rule as the Assessments page: the general three plus only what the therapist assigned to this client
    clientAssignments.forEach((asn) => {
      const norm = normalizeAcronym(asn.assessmentAcronym || '');
      if (norm && !generalSet.includes(norm)) assignedSet.add(norm);
    });

    const build = (canonicalAcronym: string, isGeneral: boolean): AssessmentOutcomeMetric => {
      const def = CANONICAL_DEFINITIONS[canonicalAcronym] || {
        title: `Screener (${canonicalAcronym})`,
        scaleDesc: `Assigned evaluation (${canonicalAcronym})`,
        category: 'Assessment',
        categoryColor: 'text-primary',
        Icon: Brain,
        iconBgClass: 'bg-primary/10 text-primary',
        chartColor: '#450bc8',
        maxScore: 21
      };
      const attempts = attemptsFor(canonicalAcronym);
      const first = attempts[0];
      const latest = attempts[attempts.length - 1];
      const matchingAssignment = clientAssignments.find((a) => normalizeAcronym(a.assessmentAcronym || '') === canonicalAcronym);
      const frequency = matchingAssignment?.frequency || (isGeneral ? 'General' : 'Assigned');

      return {
        id: `${isGeneral ? 'gen' : 'spec'}-${canonicalAcronym.toLowerCase()}`,
        acronym: canonicalAcronym,
        title: def.title,
        scaleDescription: def.scaleDesc,
        category: def.category,
        categoryColor: def.categoryColor,
        isGeneral,
        isAssigned: !isGeneral,
        assignedFrequency: frequency,
        Icon: def.Icon,
        iconBgClass: def.iconBgClass,
        chartColor: def.chartColor,
        maxScore: latest?.maxScore || def.maxScore,
        hasResult: attempts.length > 0,
        score: latest?.score,
        severityLabel: latest?.severity || '',
        severityColor: 'bg-primary/10 text-primary',
        date: latest?.date,
        statusHeading: attempts.length ? `${attempts.length} attempt${attempts.length === 1 ? '' : 's'}` : 'Not taken yet',
        statusSubtext: attempts.length ? '' : 'Your score will appear here after you complete this assessment.',
        intervalTag: attempts.length ? `Last: ${shortDate(latest.time) || '—'}` : frequency,
        chartData: attempts.map((a, i) => ({ milestone: shortDate(a.time) || `#${i + 1}`, score: a.score })),
        baseScore: first ? first.score : null,
        currentScore: latest ? latest.score : null,
      };
    };

    return [
      ...generalSet.map((a) => build(a, true)),
      ...Array.from(assignedSet).map((a) => build(a, false)),
    ];
  }, [clientSubmissions, clientAssignments]);

  return (
    <div className="w-full space-y-8 pb-12 animate-fade-in">
      {/* Page Header */}
      <PageHeader 
        title="Progress Insights" 
        description="View outcome metrics, wellbeing trends, stress reduction, and goal milestones."
        badge="WELLBEING OUTCOMES"
        icon={<Activity className="w-4 h-4 text-purple-200" />}
      />

      {/* ── 3-SESSION MILESTONE CLINICAL OUTCOME SECTION ── */}
      <div className="hex-card !p-4 sm:!p-6 md:!p-8 space-y-6 shadow-sm border border-border">
        {/* Section Header */}
        <div className="flex items-center justify-between border-b border-border pb-4 flex-wrap gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <span className={`p-2.5 shrink-0 rounded-2xl ${isMetricsUnlocked ? 'bg-primary/10 text-primary' : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'}`}>
              {isMetricsUnlocked ? <Activity className="w-6 h-6" /> : <Lock className="w-6 h-6" />}
            </span>
            <div>
              <h3 className="text-lg sm:text-xl font-extrabold text-foreground">Outcomes &amp; Assessments</h3>
              <p className="text-xs text-muted-foreground font-medium">
                Standardized outcome evaluations &amp; assigned assessments for {clientName}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isMetricsUnlocked ? (
              <span className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 text-xs font-extrabold px-3.5 py-1.5 rounded-full flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5" />
                Cycle {currentEvaluationCycle} Active (Updates Every 3 Sessions)
              </span>
            ) : (
              <span className="bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20 text-xs font-extrabold px-3.5 py-1.5 rounded-full flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" />
                Updates After 3 Sessions ({completedSessionsCount}/3 Completed)
              </span>
            )}
          </div>
        </div>

        {/* ── CONDITIONAL RENDERING: LOCKED STATE (< 3 SESSIONS) vs UNLOCKED STATE (>= 3 SESSIONS) ── */}
        {!isMetricsUnlocked ? (
          /* LOCKED STATE / 3-SESSION MILESTONE ROADMAP (< 3 SESSIONS) */
          <div className="space-y-6">
            {/* Informational Guidance Banner */}
            <div className="rounded-2xl border border-amber-500/20 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent p-4 sm:p-5 md:p-6 space-y-4">
              <div className="flex items-start gap-3 sm:gap-3.5">
                <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-700 dark:text-amber-400 shrink-0 mt-0.5">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div className="space-y-1.5 min-w-0">
                  <h4 className="text-base font-bold text-foreground">
                    Outcome Metrics Unlock After 3 Completed Sessions
                  </h4>
                  <p className="text-xs md:text-sm text-muted-foreground leading-relaxed">
                    Standardized outcome evaluations (General Screeners &amp; Consultant Assigned Assessments) are measured in <strong>3-session cycles</strong> to ensure evidence-based measurement of your therapeutic progress. Complete your 3rd session with your practitioner to unlock your personalized outcome baselines and trajectory graphs.
                  </p>
                </div>
              </div>

              {/* Visual 3-Session Milestone Tracker */}
              <div className="pt-2 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-xs font-bold text-foreground">
                  <span>Session Progress Toward Evaluation</span>
                  <span className="text-amber-600 dark:text-amber-400 font-mono">
                    {completedSessionsCount} of 3 Sessions Completed ({sessionsRemainingForUnlock} more needed)
                  </span>
                </div>

                {/* Progress bar */}
                <div className="h-3.5 w-full bg-muted rounded-full overflow-hidden p-0.5 border border-border">
                  <div 
                    className="h-full bg-gradient-to-r from-amber-500 to-primary rounded-full transition-all duration-700"
                    style={{ width: `${Math.min(100, Math.round((completedSessionsCount / 3) * 100))}%` }}
                  />
                </div>

                {/* Step indicators */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-4 pt-2">
                  {/* Step 1 */}
                  <div className={`p-3 rounded-xl border flex items-center gap-2.5 text-xs ${
                    completedSessionsCount >= 1 
                      ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400' 
                      : 'border-border bg-card text-muted-foreground'
                  }`}>
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 text-[10px] font-bold ${
                      completedSessionsCount >= 1 ? 'bg-emerald-500 text-white' : 'bg-muted text-muted-foreground'
                    }`}>
                      {completedSessionsCount >= 1 ? <Check className="w-3 h-3" /> : '1'}
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold truncate">Session 1</p>
                      <p className="text-[10px] opacity-80">{completedSessionsCount >= 1 ? 'Completed' : 'Pending'}</p>
                    </div>
                  </div>

                  {/* Step 2 */}
                  <div className={`p-3 rounded-xl border flex items-center gap-2.5 text-xs ${
                    completedSessionsCount >= 2 
                      ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400' 
                      : 'border-border bg-card text-muted-foreground'
                  }`}>
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 text-[10px] font-bold ${
                      completedSessionsCount >= 2 ? 'bg-emerald-500 text-white' : 'bg-muted text-muted-foreground'
                    }`}>
                      {completedSessionsCount >= 2 ? <Check className="w-3 h-3" /> : '2'}
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold truncate">Session 2</p>
                      <p className="text-[10px] opacity-80">{completedSessionsCount >= 2 ? 'Completed' : 'Pending'}</p>
                    </div>
                  </div>

                  {/* Step 3 */}
                  <div className={`p-3 rounded-xl border flex items-center gap-2.5 text-xs ${
                    completedSessionsCount >= 3 
                      ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400' 
                      : 'border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-300'
                  }`}>
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 text-[10px] font-bold ${
                      completedSessionsCount >= 3 ? 'bg-emerald-500 text-white' : 'bg-amber-500 text-white'
                    }`}>
                      {completedSessionsCount >= 3 ? <Check className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold truncate">Session 3</p>
                      <p className="text-[10px] opacity-80 font-semibold">Evaluation Milestone</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-3 pt-2 flex-wrap">
                <button
                  onClick={() => setIsBookingOpen(true)}
                  className="px-4 py-2.5 rounded-xl bg-primary text-primary-foreground font-bold text-xs hover:bg-primary/90 transition-all flex items-center gap-2 shadow-sm cursor-pointer"
                >
                  <Plus className="w-4 h-4" /> Book Next Session
                </button>
                <Link
                  href="/sessions"
                  className="px-4 py-2.5 rounded-xl border border-border bg-card hover:bg-accent text-foreground font-bold text-xs transition-all flex items-center gap-2 cursor-pointer"
                >
                  <Calendar className="w-4 h-4 text-primary" /> View Scheduled Sessions ({upcomingSessions.length} Upcoming)
                </Link>
                <Link
                  href="/assessments"
                  className="px-4 py-2.5 rounded-xl border border-purple-200 bg-purple-50 hover:bg-purple-100 text-[#450bc8] font-bold text-xs transition-all flex items-center gap-2 cursor-pointer ml-auto"
                >
                  <span>Go to Assessments Library</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>

            {/* Individual Separate Locked Cards (< 3 Sessions) */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
              {assessmentMetrics.map((item) => {
                const ItemIcon = item.Icon;
                return (
                  <div 
                    key={item.id}
                    className="relative overflow-hidden p-4 sm:p-6 rounded-2xl border border-border bg-card/60 backdrop-blur-sm space-y-4 shadow-2xs flex flex-col justify-between opacity-85 hover:opacity-100 transition-opacity"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="text-sm font-extrabold text-foreground">{item.title}</h4>
                          {item.isAssigned ? (
                            <span className="px-2 py-0.5 bg-purple-50 text-[#450bc8] border border-purple-200 rounded-md text-[10px] font-extrabold">
                              Assigned
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-md text-[10px] font-extrabold">
                              General
                            </span>
                          )}
                        </div>
                        <span className="p-1.5 rounded-lg bg-muted text-muted-foreground shrink-0">
                          <Lock className="w-3.5 h-3.5" />
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">{item.scaleDescription}</p>
                    </div>

                    <div className="py-6 flex flex-col items-center justify-center text-center space-y-2 bg-muted/30 rounded-xl border border-dashed border-border">
                      <div className={`w-10 h-10 rounded-full ${item.iconBgClass} flex items-center justify-center`}>
                        <ItemIcon className="w-5 h-5" />
                      </div>
                      <p className="text-xs font-bold text-foreground">Evaluated at Session 3</p>
                      <p className="text-[11px] text-muted-foreground max-w-[210px]">
                        {item.acronym === 'WHO-5'
                          ? 'Baseline & trend will update after your 3rd therapy consultation.'
                          : item.acronym === 'PSS-10'
                          ? 'Stress reduction trajectory updates automatically at Session 3.'
                          : item.acronym === 'WSAS'
                          ? 'Daily functioning metrics unlock after your 3rd therapy session.'
                          : 'Progress milestones unlock after 3 completed sessions.'}
                      </p>
                    </div>

                    <div className="pt-3 border-t border-border flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-xs font-semibold text-muted-foreground">
                      <span>Category: <strong className={`${item.categoryColor} font-extrabold`}>{item.category}</strong></span>
                      <span className="text-muted-foreground/70">{item.intervalTag}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          /* UNLOCKED ACTIVE OUTCOME GRAPHS (>= 3 SESSIONS COMPLETED) */
          <div className="space-y-6">
            {/* Active Cycle Status Banner */}
            <div className="p-4 rounded-xl border border-primary/20 bg-primary/5 flex items-center justify-between flex-wrap gap-2 text-xs">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-primary" />
                <span className="font-semibold text-foreground">
                  Evaluation Cycle {currentEvaluationCycle} Active ({completedSessionsCount} Sessions Completed)
                </span>
              </div>
              <span className="text-muted-foreground">
                Next outcome assessment update after <strong>Session {nextMilestoneSession}</strong> ({sessionsUntilNextUpdate} session{sessionsUntilNextUpdate === 1 ? '' : 's'} to next cycle)
              </span>
            </div>

            {/* Individual Side-by-Side Graph Cards for Every General & Assigned Assessment */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
              {assessmentMetrics.map((item) => (
                <div 
                  key={item.id}
                  className="p-4 sm:p-5 rounded-2xl border border-border bg-gradient-to-b from-card/80 via-background to-background space-y-4 shadow-2xs flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex flex-col items-start gap-1.5">
                        <h4 className="text-sm font-extrabold text-foreground leading-snug">{item.title}</h4>
                        {item.isAssigned && (
                          <span className="inline-flex items-center px-2 py-0.5 bg-purple-50 text-[#450bc8] border border-purple-200 rounded-md text-[10px] leading-4 font-extrabold">
                            Assigned
                          </span>
                        )}
                      </div>
                      <span className="shrink-0 whitespace-nowrap pt-0.5 text-xs font-bold text-muted-foreground">{item.acronym}</span>
                    </div>
                    <div className="flex items-baseline gap-2 pt-1 flex-wrap">
                      <span className="text-3xl font-black text-foreground font-mono">
                        {item.currentScore ?? '—'} <span className="text-xs text-muted-foreground font-normal">/ {item.maxScore}</span>
                      </span>
                      {item.chartData.length > 1 && item.baseScore !== null && (
                        <span className="text-xs text-muted-foreground font-medium">
                          First score: <strong className="text-foreground font-bold">{item.baseScore}/{item.maxScore}</strong>
                        </span>
                      )}
                      {item.severityLabel && (
                        <span className="text-xs text-muted-foreground font-medium">· {item.severityLabel}</span>
                      )}
                    </div>
                  </div>

                  {!item.hasResult ? (
                    <div className="h-48 w-full flex flex-col items-center justify-center text-center gap-2 rounded-xl border border-dashed border-border bg-muted/30 px-4">
                      <p className="text-xs font-bold text-foreground">Not taken yet</p>
                      <p className="text-[11px] text-muted-foreground max-w-[220px]">Your score will appear here after you complete this assessment.</p>
                      <Link href="/assessments" className="text-[11px] font-bold text-[#450bc8] hover:underline py-2 sm:py-0">Go to Assessments →</Link>
                    </div>
                  ) : (
                  <div className="h-48 w-full pt-2">
                    <ResponsiveContainer width="100%" height={192} debounce={50}>
                      <AreaChart data={item.chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <defs>
                          <linearGradient id={`grad_${item.id}`} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={item.chartColor} stopOpacity={0.4} />
                            <stop offset="95%" stopColor={item.chartColor} stopOpacity={0.0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                        <XAxis dataKey="milestone" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} dy={5} />
                        <YAxis domain={[0, item.maxScore]} axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                        <Tooltip
                          contentStyle={{ 
                            backgroundColor: 'hsl(var(--card))', 
                            borderRadius: '14px', 
                            border: '1px solid hsl(var(--border))', 
                            boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)',
                            color: 'hsl(var(--foreground))'
                          }}
                          labelStyle={{ fontWeight: 'bold', color: 'hsl(var(--foreground))', fontSize: '12px' }}
                          formatter={(val: any) => [`${val} / ${item.maxScore}`, item.title]}
                        />
                        <Area 
                          type="monotone" 
                          dataKey="score" 
                          stroke={item.chartColor} 
                          strokeWidth={3} 
                          fillOpacity={1} 
                          fill={`url(#grad_${item.id})`} 
                          dot={{ r: 4, fill: item.chartColor, strokeWidth: 2, stroke: '#fff' }} 
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                  )}

                  <div className="pt-3 border-t border-border flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-xs font-semibold text-muted-foreground">
                    <span>Category: <strong className={`${item.categoryColor} font-extrabold`}>{item.category}</strong></span>
                    <span className="text-muted-foreground/70">{item.intervalTag}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Booking Modal */}
      <BookingModal
        isOpen={isBookingOpen}
        onClose={() => setIsBookingOpen(false)}
        therapistName={authUser?.assignedTherapistName || "Your Assigned Consultant"}
        therapistAvatar={authUser?.assignedTherapistPhoto || "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&w=400&q=80"}
        therapistTitle={authUser?.assignedTherapistProfession || "Licensed Psychologist"}
        onBookingSuccess={() => {
          setSessions(getUserSessions());
        }}
      />
    </div>
  );
}
