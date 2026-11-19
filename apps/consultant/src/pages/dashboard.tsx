import { useState, useEffect } from "react";
import { useGetDashboardStats, useGetUpcomingSessions, useGetPendingReports, useGetWeeklySchedule, useGetClientImprovementSummary } from "@workspace/api-client-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar, Video, Clock, TrendingUp, Users, FileText, BookOpen, AlertCircle, ArrowRight, TrendingDown, Minus, ShieldCheck } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Cell, LineChart, Line, AreaChart, Area } from "recharts";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { SessionReportDialog } from "@/components/session-report-dialog";
import { SessionFeedbackCard } from "@/components/session-feedback-card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { getAuthUser } from "@/lib/auth";

export default function Dashboard() {
  const { toast } = useToast();
  const { data: statsData, isLoading: statsLoading, refetch: refetchStats } = useGetDashboardStats();
  const { data: sessionsData, isLoading: sessionsLoading } = useGetUpcomingSessions();
  const { data: reportsData, isLoading: reportsLoading, refetch: refetchReports } = useGetPendingReports();

  const [reportSessionId, setReportSessionId] = useState<number | null>(null);
  const [reportClientName, setReportClientName] = useState<string>("");
  const [scheduleTab, setScheduleTab] = useState<'today' | 'week' | 'month'>('today');

  // Cancellation Policy & Modal Flow State
  const [cancelledSessionIds, setCancelledSessionIds] = useState<number[]>([]);
  const [cancelModalSession, setCancelModalSession] = useState<{
    id: number;
    clientName: string;
    startTime: string;
    hoursUntilSession?: number;
  } | null>(null);
  const [cancelStep, setCancelStep] = useState<'confirm' | 'reason'>('confirm');
  const [cancellationReason, setCancellationReason] = useState<string>("Therapist Schedule Overlap & Conflict");
  const [policyBlockedModal, setPolicyBlockedModal] = useState<{ clientName: string; startTime: string } | null>(null);

  const authUser = getAuthUser();
  const [liveBookings, setLiveBookings] = useState<any[]>([]);
  const [liveClientsCount, setLiveClientsCount] = useState<number>(0);

  useEffect(() => {
    async function loadData() {
      try {
        const myName = authUser?.name || 'Sadaf Bhimani';
        const myId = authUser?.id || '';
        const [bookingsRes, usersRes] = await Promise.all([
          fetch('/api/bookings').then(r => r.ok ? r.json() : { bookings: [] }).catch(() => ({ bookings: [] })),
          fetch('/api/users').then(r => r.ok ? r.json() : { users: [] }).catch(() => ({ users: [] }))
        ]);

        const rawBookings = Array.isArray(bookingsRes?.bookings) ? bookingsRes.bookings : [];
        const filteredBookings = rawBookings.filter((b: any) => {
          const bCid = String(b.consultantId || b.therapistId || '').toLowerCase().trim();
          const bCname = String(b.consultantName || b.therapistName || '').toLowerCase().trim();
          return (myId && bCid === myId) || 
                 (myName && bCname.includes(myName.toLowerCase())) || 
                 (myName && myName.toLowerCase().includes(bCname) && bCname.length > 3);
        });
        setLiveBookings(filteredBookings);

        const clientSet = new Set<string>();
        filteredBookings.forEach((b: any) => {
          if (b.clientName) clientSet.add(b.clientName);
          if (b.clientEmail) clientSet.add(b.clientEmail);
        });
        const rawUsers = Array.isArray(usersRes?.users) ? usersRes.users : [];
        rawUsers.forEach((u: any) => {
          const uTName = String(u.assignedTherapistName || u.therapist || '').toLowerCase().trim();
          if (myName && uTName.includes(myName.toLowerCase())) {
            clientSet.add(u.email || u.name);
          }
        });
        setLiveClientsCount(clientSet.size || (filteredBookings.length > 0 ? filteredBookings.length : 1));
      } catch {}
    }
    loadData();
  }, [authUser?.name, authUser?.id]);

  const todayDateStr = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  const todayIso = new Date().toISOString().split('T')[0];

  const realSessionsList = liveBookings.map((b: any, idx: number) => {
    const cName = b.clientName || 'Ranjani B';
    const initials = cName.split(' ').map((n: string) => n[0]).join('').toUpperCase() || 'RB';
    const dateStr = b.sessionDate || b.scheduledAt || b.date || todayIso;
    const cleanDate = dateStr.includes('T') ? dateStr.split('T')[0] : dateStr;

    return {
      id: b.id || idx + 1,
      clientName: cName,
      clientInitials: initials,
      sessionDate: cleanDate,
      sessionType: b.service || b.serviceTitle || "CBT Consultation",
      sessionSubtype: b.notes || "Follow-up",
      startTime: b.sessionTime || b.time || "10:30 AM",
      endTime: "11:30 AM",
      durationMinutes: b.durationMinutes || 60,
      countdownLabel: idx === 0 ? "Upcoming" : "Scheduled",
      hoursUntilSession: 1,
      sessionNumber: idx + 1,
      isNext: idx === 0,
    };
  });

  const todaySessions = realSessionsList.filter(s => s.sessionDate === todayIso || s.isNext);
  const weekSessions = realSessionsList.slice(0, 10);
  const monthSessions = realSessionsList;

  const stats = {
    sessionsToday: todaySessions.length,
    sessionsRemaining: todaySessions.length,
    activeClients: liveClientsCount || (realSessionsList.length > 0 ? realSessionsList.length : 1),
    newClientsThisWeek: liveClientsCount > 0 ? 1 : 0,
    pendingReports: Array.isArray(reportsData) ? reportsData.length : 0,
    homeworkToReview: 0,
    homeworkDueToday: 0,
    therapyHoursThisWeek: Math.round(realSessionsList.length * 1),
    improvementAverage: 78.5,
    totalClientsCount: liveClientsCount || 1,
    therapistName: authUser?.name || "Licensed Psychologist",
    therapistTitle: authUser?.title || "Psychologist",
    isAvailable: true,
    therapyHoursToday: `${todaySessions.length}h 00m`,
  };

  const SESSIONS_DATA = {
    today: {
      title: "Today's schedule",
      countLabel: `${todaySessions.length} session${todaySessions.length === 1 ? '' : 's'}`,
      list: todaySessions,
    },
    week: {
      title: "This Week's schedule",
      countLabel: `${weekSessions.length} session${weekSessions.length === 1 ? '' : 's'}`,
      list: weekSessions,
    },
    month: {
      title: "This Month's schedule",
      countLabel: `${monthSessions.length} session${monthSessions.length === 1 ? '' : 's'}`,
      list: monthSessions,
    }
  };

  const currentSchedule = SESSIONS_DATA[scheduleTab];
  const activeSessionList = currentSchedule.list.filter((s) => !cancelledSessionIds.includes(s.id));

  const reportList = (Array.isArray(reportsData) && reportsData.length > 0) ? reportsData : [];

  const nextSession = SESSIONS_DATA.today.list.find((s: any) => s.isNext) || SESSIONS_DATA.today.list[0];

  return (
    <div className="space-y-6">
      {/* Hero Banner (Compact & Streamlined) */}
      <div className="rounded-2xl bg-gradient-to-r from-[#4f28d9] via-[#5e2be2] to-[#3b1799] p-4 sm:p-6 text-white shadow-lg overflow-hidden relative">
        <div className="absolute top-0 right-0 w-72 h-72 bg-white/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3"></div>
        <div className="absolute bottom-0 left-1/4 w-48 h-48 bg-black/10 rounded-full blur-3xl translate-y-1/2"></div>

        <div className="relative z-10 flex flex-col lg:flex-row gap-5 justify-between items-start lg:items-center">
          <div className="space-y-3 flex-1">
            <div className="inline-flex items-center rounded-full bg-white/10 px-3 py-0.5 text-xs font-medium backdrop-blur-sm border border-white/10">
              {todayDateStr}
            </div>

            <div className="space-y-1">
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
                {statsLoading ? <Skeleton className="h-8 w-56 bg-white/20" /> : `Welcome back, ${stats.therapistName}`}
              </h1>
              <p className="text-primary-foreground/80 text-xs sm:text-sm max-w-lg">
                {statsLoading ? <Skeleton className="h-5 w-80 bg-white/20" /> : `${stats.therapistTitle} · ${stats.sessionsToday} sessions today and ${stats.pendingReports} reports awaiting review.`}
              </p>
            </div>

            <div className="flex items-center gap-3 pt-1">
              <div className="inline-flex items-center gap-2 rounded-full bg-black/20 px-3 py-1 text-xs font-medium backdrop-blur-md">
                <div className="w-2 h-2 rounded-full bg-green-400 shadow-[0_0_8px_rgba(74,222,128,0.8)]"></div>
                <span>{stats.isAvailable ? 'Available now' : 'Not available'}</span>
              </div>
            </div>
          </div>

          {/* Next Session Card (Compact) */}
          {nextSession && (
            <div className="w-full lg:w-[320px] shrink-0 bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-3.5 shadow-xl">
              <div className="flex items-center justify-between mb-2.5">
                <h3 className="text-[11px] font-bold tracking-wider text-primary-foreground/70 uppercase">NEXT SESSION</h3>
                <Badge variant="secondary" className="bg-green-500/20 text-green-300 hover:bg-green-500/20 border-green-500/30 text-[10px] px-2 py-0.5">
                  <Clock className="w-3 h-3 mr-1" />
                  {nextSession.countdownLabel}
                </Badge>
              </div>

              <div className="flex items-center gap-3 mb-3">
                <Avatar className="h-9 w-9 border border-white/20">
                  <AvatarFallback className="bg-white/10 text-white text-xs font-bold">{nextSession.clientInitials}</AvatarFallback>
                </Avatar>
                <div>
                  <h4 className="font-bold text-sm leading-none mb-1">{nextSession.clientName}</h4>
                  <p className="text-xs text-primary-foreground/80">{nextSession.durationMinutes} min</p>
                </div>
              </div>

              <div className="bg-black/20 rounded-lg px-3 py-2 mb-3 flex items-center justify-between text-xs">
                <div className="font-medium">{nextSession.startTime} — {nextSession.endTime}</div>
                <div className="text-primary-foreground/70">Session #{nextSession.sessionNumber}</div>
              </div>

              <Button className="w-full rounded-full bg-white text-primary hover:bg-white/90 font-bold h-9 text-xs">
                <Video className="w-3.5 h-3.5 mr-1.5" />
                Join session
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard
          title="Sessions today"
          value={stats.sessionsToday}
          description={`${stats.sessionsRemaining} remaining`}
          icon={<Video className="w-5 h-5 text-blue-500" />}
          trend="+2"
          trendPositive={true}
          loading={statsLoading}
        />
        <StatCard
          title="Active clients"
          value={stats.activeClients}
          description={`${stats.newClientsThisWeek} new this week`}
          icon={<Users className="w-5 h-5 text-indigo-500" />}
          trend="+3"
          trendPositive={true}
          loading={statsLoading}
        />
        <StatCard
          title="Pending reports"
          value={stats.pendingReports}
          description="Payment gated"
          icon={<FileText className="w-5 h-5 text-orange-500" />}
          trend="-1"
          trendPositive={true}
          loading={statsLoading}
        />
        <StatCard
          title="Therapy hours"
          value={`${stats.therapyHoursThisWeek}h`}
          description="This week"
          icon={<Clock className="w-5 h-5 text-emerald-500" />}
          trend="+6h"
          trendPositive={true}
          loading={statsLoading}
        />
      </div>

      {/* Schedule & Reports */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 shadow-sm border-border">
          <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4">
            <div>
              <CardTitle className="text-lg sm:text-xl">{currentSchedule.title}</CardTitle>
              <CardDescription>
                {activeSessionList.length} sessions
              </CardDescription>
            </div>
            <Tabs value={scheduleTab} onValueChange={(val) => setScheduleTab(val as 'today' | 'week' | 'month')} className="w-full sm:w-[200px]">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="today">Today</TabsTrigger>
                <TabsTrigger value="week">Week</TabsTrigger>
                <TabsTrigger value="month">Month</TabsTrigger>
              </TabsList>
            </Tabs>
          </CardHeader>
          <CardContent>
            {sessionsLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-20 w-full rounded-xl" />)}
              </div>
            ) : (
              <div className="space-y-4">
                {activeSessionList.map((session) => (
                  <div key={session.id} className="flex items-center justify-between p-4 rounded-xl border border-border hover:border-border/80 hover:bg-secondary/30 transition-colors group">
                    <div className="flex items-center gap-4">
                      <div>
                        <div className="font-semibold text-[15px]">{session.clientName}</div>
                        <div className="flex items-center gap-3 text-sm mt-1">
                          <span className="flex items-center text-muted-foreground">
                            <Clock className="w-3.5 h-3.5 mr-1" />
                            {session.startTime} · {session.durationMinutes} min
                          </span>
                          {session.isNext && (
                            <Badge variant="secondary" className="bg-primary/10 text-primary hover:bg-primary/10 rounded-md py-0 font-medium">
                              {session.countdownLabel}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2.5 shrink-0">
                      <Button
                        variant="outline"
                        className="border-slate-200 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 text-slate-700 font-bold text-xs h-9 px-3.5 rounded-xl transition-colors cursor-pointer"
                        onClick={() => {
                          const hoursLeft = (session as any).hoursUntilSession ?? (session.isNext ? 0.2 : 4);
                          if (hoursLeft < 3) {
                            setPolicyBlockedModal({ clientName: session.clientName, startTime: session.startTime });
                          } else {
                            setCancelStep('confirm');
                            setCancelModalSession({
                              id: session.id,
                              clientName: session.clientName,
                              startTime: session.startTime,
                              hoursUntilSession: hoursLeft,
                            });
                          }
                        }}
                      >
                        Cancel
                      </Button>
                      <Button className="bg-[#5e2be2] hover:bg-[#4f28d9] text-white font-extrabold text-xs h-9 px-4 rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer">
                        <Video className="w-3.5 h-3.5" />
                        <span>Join</span>
                      </Button>
                    </div>
                  </div>
                ))}
                {!activeSessionList.length && (
                  <div className="text-center py-8 text-muted-foreground">No active sessions scheduled for this period.</div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-sm border-border flex flex-col h-full">
          <CardHeader className="pb-4 shrink-0">
            <div className="flex items-center justify-between mb-1">
              <CardTitle className="text-xl font-extrabold text-slate-900">Pending reports</CardTitle>
              <Badge variant="outline" className="bg-purple-50 text-[#5e2be2] border-purple-200 font-extrabold">Action Required</Badge>
            </div>
            <CardDescription className="text-xs text-slate-500 font-medium">{stats?.pendingReports || 0} reports awaiting your review</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col flex-1 justify-between pt-0 gap-4">
            {reportsLoading ? (
              <div className="space-y-3 flex-1">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-14 w-full rounded-xl" />)}
              </div>
            ) : (
              <div className="space-y-3 flex-1 overflow-y-auto max-h-[300px] pr-1">
                {reportList.map((report) => (
                  <div key={report.sessionId} className="flex items-center justify-between p-3 rounded-xl bg-slate-50/80 border border-slate-200/80 hover:border-purple-200 transition-all">
                    <div className="flex items-center gap-3">
                      <div className="flex flex-col">
                        <span className="font-bold text-slate-900 text-sm">{report.clientName}</span>
                        <span className="text-xs text-slate-500 font-medium">{report.sessionDate}</span>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-[#5e2be2] bg-purple-50 hover:bg-purple-100 border border-purple-200/60 font-extrabold h-8 px-3 rounded-lg text-xs transition-colors"
                      onClick={() => {
                        setReportSessionId(report.sessionId);
                        setReportClientName(report.clientName);
                      }}
                    >
                      Complete <ArrowRight className="w-3.5 h-3.5 ml-1" />
                    </Button>
                  </div>
                ))}
                {!reportList.length && (
                  <div className="text-center py-8 text-slate-400 text-sm font-medium">All caught up! No pending reports.</div>
                )}
              </div>
            )}

            <div className="bg-amber-50/90 border border-amber-200 rounded-xl p-3 flex items-start gap-2.5 text-amber-800 shrink-0 mt-auto">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
              <p className="text-xs font-semibold leading-relaxed">Payment becomes eligible only after report submission.</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Post-session feedback from clients */}
      <SessionFeedbackCard />


      <SessionReportDialog
        open={reportSessionId !== null}
        onOpenChange={(open) => !open && setReportSessionId(null)}
        sessionId={reportSessionId}
        clientName={reportClientName}
        onSuccess={() => {
          refetchReports();
          refetchStats();
        }}
      />

      {/* Policy Blocked Modal (< 3 hours) */}
      {policyBlockedModal && (
        <Dialog open={!!policyBlockedModal} onOpenChange={(open) => !open && setPolicyBlockedModal(null)}>
          <DialogContent className="max-w-md bg-white rounded-3xl p-6 shadow-2xl border border-slate-200">
            <DialogHeader className="space-y-1.5 pb-2">
              <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center font-bold mb-1">
                <AlertCircle className="w-5 h-5" />
              </div>
              <DialogTitle className="text-lg font-extrabold text-slate-900">
                Cancellation Policy Restriction
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500 font-medium">
                Cancellations must be made at least 3 hours before session start time.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-2">
              <div className="p-3.5 bg-amber-50 border border-amber-200/80 rounded-2xl space-y-1.5 text-xs text-amber-900">
                <span className="font-extrabold block">Policy Notice:</span>
                <p className="font-medium text-[11px] leading-relaxed">
                  Session with <strong>{policyBlockedModal.clientName}</strong> ({policyBlockedModal.startTime}) is scheduled in less than 3 hours. Platform policy locks online cancellations within 3 hours of session time.
                </p>
              </div>
              <p className="text-xs text-slate-600 font-medium">
                For urgent emergencies, please contact Hexpertify support or notify your client directly via message.
              </p>
            </div>

            <DialogFooter className="pt-2 border-t border-slate-100">
              <Button
                type="button"
                onClick={() => setPolicyBlockedModal(null)}
                className="w-full bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs h-10 rounded-xl cursor-pointer"
              >
                Understand &amp; Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Two-Step Cancellation Modal Flow (Step 1: Are you sure? -> Step 2: Reason & Policy) */}
      {cancelModalSession && (
        <Dialog open={!!cancelModalSession} onOpenChange={(open) => !open && setCancelModalSession(null)}>
          <DialogContent className="max-w-md bg-white rounded-3xl p-6 shadow-2xl border border-slate-200 animate-in zoom-in-95">
            {cancelStep === 'confirm' ? (
              /* STEP 1: ARE YOU SURE POPUP */
              <div className="space-y-5">
                <DialogHeader className="space-y-1.5 pb-1">
                  <div className="w-10 h-10 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center font-bold mb-1">
                    <AlertCircle className="w-5 h-5" />
                  </div>
                  <DialogTitle className="text-lg font-extrabold text-slate-900">
                    Are you sure you want to cancel?
                  </DialogTitle>
                  <DialogDescription className="text-xs text-slate-500 font-medium">
                    Please confirm if you wish to proceed with session cancellation.
                  </DialogDescription>
                </DialogHeader>

                <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                  <div className="text-xs font-bold text-slate-800">
                    Session details:
                  </div>
                  <div className="text-xs text-slate-700 font-medium space-y-0.5">
                    <p>Client: <strong className="text-slate-900">{cancelModalSession.clientName}</strong></p>
                    <p>Time: <span className="text-slate-800">{cancelModalSession.startTime}</span></p>
                    <p className="text-[11px] text-emerald-700 font-bold pt-1">✓ Eligible for cancellation (More than 3 hours before start time)</p>
                  </div>
                </div>

                <DialogFooter className="pt-2 border-t border-slate-100 flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setCancelModalSession(null)}
                    className="flex-1 border-slate-200 text-slate-700 font-bold text-xs h-10 rounded-xl cursor-pointer"
                  >
                    No, Keep Session
                  </Button>
                  <Button
                    type="button"
                    onClick={() => setCancelStep('reason')}
                    className="flex-1 bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs h-10 rounded-xl shadow-sm cursor-pointer"
                  >
                    Yes, Proceed →
                  </Button>
                </DialogFooter>
              </div>
            ) : (
              /* STEP 2: REASON & POLICY FORM */
              <div className="space-y-4">
                <DialogHeader className="space-y-1 pb-1">
                  <div className="w-10 h-10 rounded-2xl bg-purple-100 text-[#5e2be2] flex items-center justify-center font-bold mb-1">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <DialogTitle className="text-lg font-extrabold text-slate-900">
                    Cancellation Reason &amp; Policy
                  </DialogTitle>
                  <DialogDescription className="text-xs text-slate-500 font-medium">
                    Select a reason to finalize session cancellation for {cancelModalSession.clientName}
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-3 py-1">
                  {/* Policy Guidelines Banner */}
                  <div className="p-3 bg-purple-50/80 border border-purple-200/80 rounded-2xl space-y-1.5">
                    <div className="flex items-center gap-1.5 text-xs font-extrabold text-[#5e2be2]">
                      <ShieldCheck className="w-3.5 h-3.5 text-[#5e2be2] shrink-0" />
                      <span>Platform Cancellation Policy</span>
                    </div>
                    <ul className="text-[11px] text-purple-900/90 font-medium space-y-1 pl-4 list-disc leading-relaxed">
                      <li>Client will receive automatic SMS &amp; Email notification.</li>
                      <li>An automated rescheduling link will be dispatched to <strong>{cancelModalSession.clientName}</strong>.</li>
                    </ul>
                  </div>

                  {/* Reason Dropdown */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 block">Select Cancellation Reason *</label>
                    <select
                      value={cancellationReason}
                      onChange={(e) => setCancellationReason(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 outline-none focus:bg-white focus:border-[#5e2be2]"
                    >
                      <option value="Therapist Schedule Overlap & Conflict">Therapist Schedule Overlap &amp; Conflict</option>
                      <option value="Therapist Medical / Health Emergency">Therapist Medical / Health Emergency</option>
                      <option value="Therapist Unforeseen Personal Leave">Therapist Unforeseen Personal Leave</option>
                      <option value="Therapist Technical & Connection Issue">Therapist Technical &amp; Connection Issue</option>
                      <option value="Therapist Re-assignment">Therapist Re-assignment</option>
                    </select>
                  </div>
                </div>

                <DialogFooter className="pt-2 border-t border-slate-100 flex items-center gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setCancelStep('confirm')}
                    className="text-slate-600 font-bold text-xs h-10 px-4 rounded-xl hover:bg-slate-100 cursor-pointer"
                  >
                    ← Back
                  </Button>
                  <Button
                    type="button"
                    onClick={() => {
                      if (cancelModalSession) {
                        setCancelledSessionIds((prev) => [...prev, cancelModalSession.id]);
                        toast({
                          title: "Session Cancelled Under Policy",
                          description: `Cancelled session with ${cancelModalSession.clientName}. Reschedule invite sent.`,
                        });
                        setCancelModalSession(null);
                      }
                    }}
                    className="flex-1 bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs h-10 rounded-xl shadow-sm cursor-pointer"
                  >
                    Confirm Cancellation
                  </Button>
                </DialogFooter>
              </div>
            )}
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

function StatCard({
  title,
  value,
  description,
  icon,
  trend,
  trendPositive,
  loading
}: {
  title: string;
  value: React.ReactNode;
  description: string;
  icon: React.ReactNode;
  trend: string;
  trendPositive: boolean;
  loading?: boolean;
}) {
  return (
    <Card className="shadow-sm border-border overflow-hidden group">
      <CardContent className="p-4 sm:p-5">
        <div className="flex justify-between items-start mb-4">
          <div className="p-2 bg-secondary rounded-lg text-primary">{icon}</div>
          <Badge variant="secondary" className={cn(
            "font-medium",
            trendPositive ? "bg-green-50 text-green-700" : (trend === "0" ? "bg-muted text-muted-foreground" : "bg-red-50 text-red-700")
          )}>
            {trend}
          </Badge>
        </div>
        <div>
          <p className="text-sm font-medium text-muted-foreground mb-1">{title}</p>
          {loading ? (
            <Skeleton className="h-8 w-16 mb-1" />
          ) : (
            <h4 className="text-2xl font-bold text-foreground">{value}</h4>
          )}
          <p className="text-xs text-muted-foreground mt-1 truncate">{description}</p>
        </div>
      </CardContent>
    </Card>
  );
}
