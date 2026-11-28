import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Video, Clock, Users, FileText, AlertCircle, ArrowRight, ShieldCheck } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { SessionReportDialog } from "@/components/session-report-dialog";
import { SessionFeedbackCard } from "@/components/session-feedback-card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { getAuthUser } from "@/lib/auth";

// Bookings are dated and timed in India time (IST, UTC+5:30, no daylight saving)
const IST_OFFSET_MS = 330 * 60 * 1000;
const UPCOMING_STATUSES = new Set(["CONFIRMED", "RESCHEDULED", "PENDING"]);
// Sessions that take (or took) the therapist's time: counted in "today" and "hours this week"
const HELD_STATUSES = new Set(["CONFIRMED", "RESCHEDULED", "PENDING", "COMPLETED"]);
const CANCEL_POLICY_HOURS = 3;

/** IST calendar day "YYYY-MM-DD" of an instant */
function istDayKey(ms: number): string {
  return new Date(ms + IST_OFFSET_MS).toISOString().slice(0, 10);
}

/** Minutes after midnight for "10:00 AM", "9:30 pm", "14:00" or the start of "10:00 AM - 11:00 AM"; null if unreadable */
function clockMinutes(value: string): number | null {
  const m = String(value || "").trim().match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i);
  if (!m) return null;
  let h = Number(m[1]);
  const min = Number(m[2] || 0);
  const ampm = (m[3] || "").toLowerCase();
  if (ampm === "pm" && h < 12) h += 12;
  if (ampm === "am" && h === 12) h = 0;
  if (h > 23 || min > 59) return null;
  return h * 60 + min;
}

/** The booking's start instant: scheduledAt, else its IST date + start time */
function bookingStartMs(b: any): number | null {
  if (b?.scheduledAt) {
    const t = new Date(b.scheduledAt).getTime();
    if (!isNaN(t)) return t;
  }
  if (typeof b?.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(b.date)) {
    const mins = clockMinutes(b.time);
    if (mins !== null) return new Date(`${b.date}T00:00:00+05:30`).getTime() + mins * 60000;
  }
  return null;
}

function formatIstTime(ms: number): string {
  return new Date(ms).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata" });
}

function formatIstDay(ms: number): string {
  return new Date(ms).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", timeZone: "Asia/Kolkata" });
}

function initialsOf(name: string): string {
  return name.split(" ").filter(Boolean).map((n) => n[0]).join("").slice(0, 2).toUpperCase();
}

/** "in 25 min", "in 3 h", "In progress" */
function countdownLabel(startMs: number, endMs: number, now: number): string {
  if (startMs <= now) return endMs > now ? "In progress" : "Ended";
  const minutes = Math.round((startMs - now) / 60000);
  if (minutes < 60) return `in ${minutes} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `in ${hours} h`;
  const days = Math.round(hours / 24);
  return `in ${days} day${days === 1 ? "" : "s"}`;
}

function formatHours(minutes: number): string {
  if (!minutes) return "0h";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}

type DashboardSession = {
  id: string;
  clientName: string;
  clientInitials: string;
  clientKey: string;
  status: string;
  dayKey: string;
  startMs: number;
  endMs: number;
  dayLabel: string;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  meetingLink: string;
  sessionNumber: number | null;
  hasReport: boolean;
};

function toSession(b: any): DashboardSession | null {
  const startMs = bookingStartMs(b);
  if (startMs === null || !b?.id) return null;
  const durationMinutes = Number(b.durationMinutes) > 0 ? Number(b.durationMinutes) : 60;
  const endMs = startMs + durationMinutes * 60000;
  // The booking's own "10:00 AM - 11:00 AM" when it has one; otherwise derived from start + duration
  const [ownStart, ownEnd] = String(b.time || "").split(/\s*[-–]\s*/);
  const clientName = String(b.clientName || "").trim();
  return {
    id: String(b.id),
    clientName: clientName || "—",
    clientInitials: clientName ? initialsOf(clientName) : "—",
    clientKey: String(b.clientId || b.clientEmail || "").toLowerCase(),
    status: String(b.status || "").toUpperCase(),
    dayKey: typeof b.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(b.date) ? b.date : istDayKey(startMs),
    startMs,
    endMs,
    dayLabel: formatIstDay(startMs),
    startTime: ownStart && clockMinutes(ownStart) !== null ? ownStart.trim() : formatIstTime(startMs),
    endTime: ownEnd && clockMinutes(ownEnd) !== null ? ownEnd.trim() : formatIstTime(endMs),
    durationMinutes,
    meetingLink: typeof b.meetingLink === "string" ? b.meetingLink.trim() : "",
    sessionNumber: null,
    hasReport: Boolean(b.sessionReport),
  };
}

function openMeeting(link: string) {
  window.open(link, "_blank", "noopener,noreferrer");
}

export default function Dashboard() {
  const { toast } = useToast();

  const [reportSessionId, setReportSessionId] = useState<string | null>(null);
  const [reportClientName, setReportClientName] = useState<string>("");
  const [scheduleTab, setScheduleTab] = useState<'today' | 'week' | 'month'>('today');

  // Cancellation Policy & Modal Flow State
  const [cancelModalSession, setCancelModalSession] = useState<{
    id: string;
    clientName: string;
    startTime: string;
    hoursUntilSession: number;
  } | null>(null);
  const [cancelStep, setCancelStep] = useState<'confirm' | 'reason'>('confirm');
  const [cancellationReason, setCancellationReason] = useState<string>("Therapist Schedule Overlap & Conflict");
  const [cancelling, setCancelling] = useState(false);
  const [policyBlockedModal, setPolicyBlockedModal] = useState<{ clientName: string; startTime: string } | null>(null);

  const authUser = getAuthUser();
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  // Only this therapist's bookings: the server filters by their consultant id / email
  const loadBookings = useCallback(async () => {
    const query = new URLSearchParams();
    if (authUser?.id) query.set("consultantId", String(authUser.id));
    if (authUser?.email) query.set("consultantEmail", String(authUser.email).toLowerCase());
    if (!query.toString()) {
      setLoading(false);
      setLoadError(true);
      return;
    }
    try {
      const res = await fetch(`/api/bookings?${query.toString()}`);
      if (!res.ok) throw new Error(`bookings ${res.status}`);
      const data = await res.json();
      setBookings(Array.isArray(data?.bookings) ? data.bookings : []);
      setLoadError(false);
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
      setNow(Date.now());
    }
  }, [authUser?.id, authUser?.email]);

  useEffect(() => {
    loadBookings();
  }, [loadBookings]);

  // Keep countdowns and "today" current while the page stays open
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(t);
  }, []);

  const todayDateStr = new Date(now).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', timeZone: 'Asia/Kolkata' });

  // IST date windows: today, this week (Monday–Sunday) and this calendar month
  const todayKey = istDayKey(now);
  const istNow = new Date(now + IST_OFFSET_MS);
  const daysSinceMonday = (istNow.getUTCDay() + 6) % 7;
  const weekStartKey = istDayKey(now - daysSinceMonday * 86400000);
  const weekEndKey = istDayKey(now + (6 - daysSinceMonday) * 86400000);
  const monthKey = todayKey.slice(0, 7);

  const allSessions = bookings
    .map(toSession)
    .filter((s): s is DashboardSession => s !== null)
    .sort((a, b) => a.startMs - b.startMs);

  // Session number = this client's nth held/completed session with this therapist
  const countByClient = new Map<string, number>();
  for (const s of allSessions) {
    if (!s.clientKey || !HELD_STATUSES.has(s.status)) continue;
    const n = (countByClient.get(s.clientKey) || 0) + 1;
    countByClient.set(s.clientKey, n);
    s.sessionNumber = n;
  }

  // Upcoming = still to happen or in progress, and not cancelled / completed
  const upcoming = allSessions.filter((s) => UPCOMING_STATUSES.has(s.status) && s.endMs > now);
  const todaySessions = upcoming.filter((s) => s.dayKey === todayKey);
  const weekSessions = upcoming.filter((s) => s.dayKey >= weekStartKey && s.dayKey <= weekEndKey);
  const monthSessions = upcoming.filter((s) => s.dayKey.slice(0, 7) === monthKey);
  const nextSession = upcoming[0] || null;

  // Pending reports = this therapist's completed sessions without a stored report
  const reportList = allSessions
    .filter((s) => s.status === "COMPLETED" && !s.hasReport)
    .sort((a, b) => b.startMs - a.startMs);

  const sessionsTodayAll = allSessions.filter((s) => s.dayKey === todayKey && HELD_STATUSES.has(s.status));
  const weekMinutes = allSessions
    .filter((s) => s.dayKey >= weekStartKey && s.dayKey <= weekEndKey && HELD_STATUSES.has(s.status))
    .reduce((sum, s) => sum + s.durationMinutes, 0);

  // Active clients = distinct clients with an upcoming session or one held in the last 30 days
  const activeSince = now - 30 * 86400000;
  const activeClients = new Set(
    allSessions
      .filter((s) => s.clientKey && (upcoming.includes(s) || (s.status === "COMPLETED" && s.startMs >= activeSince)))
      .map((s) => s.clientKey)
  );

  const stats = {
    sessionsToday: sessionsTodayAll.length,
    sessionsRemaining: todaySessions.length,
    activeClients: activeClients.size,
    pendingReports: reportList.length,
    therapyHoursThisWeek: formatHours(weekMinutes),
    therapistName: authUser?.name || "",
    therapistTitle: authUser?.title || "",
  };

  const SESSIONS_DATA = {
    today: { title: "Today's schedule", list: todaySessions },
    week: { title: "This week's schedule", list: weekSessions },
    month: { title: "This month's schedule", list: monthSessions },
  };

  const currentSchedule = SESSIONS_DATA[scheduleTab];
  const activeSessionList = currentSchedule.list;

  const requestCancel = (session: DashboardSession) => {
    const hoursLeft = (session.startMs - Date.now()) / 3600000;
    if (hoursLeft < CANCEL_POLICY_HOURS) {
      setPolicyBlockedModal({ clientName: session.clientName, startTime: `${session.dayLabel}, ${session.startTime}` });
      return;
    }
    setCancelStep('confirm');
    setCancelModalSession({
      id: session.id,
      clientName: session.clientName,
      startTime: `${session.dayLabel}, ${session.startTime}`,
      hoursUntilSession: hoursLeft,
    });
  };

  const confirmCancel = async () => {
    if (!cancelModalSession || cancelling) return;
    setCancelling(true);
    try {
      const res = await fetch(`/api/bookings/${encodeURIComponent(cancelModalSession.id)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "CANCELLED", cancellationReason }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || data?.success === false) {
        throw new Error(data?.error || "The server did not accept the cancellation.");
      }
      // Only now take it off the schedule
      setBookings((prev) => prev.map((b) => (String(b.id) === cancelModalSession.id ? { ...b, ...(data?.booking || {}), status: "CANCELLED" } : b)));
      toast({
        title: "Session cancelled",
        description: `Your session with ${cancelModalSession.clientName} is cancelled and the client has been told.`,
      });
      setCancelModalSession(null);
    } catch (err: any) {
      toast({
        title: "Couldn't cancel the session",
        description: `${err?.message || "Something went wrong."} The session is still booked. Please try again.`,
        variant: "destructive",
      });
    } finally {
      setCancelling(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Hero Banner (Compact & Streamlined) */}
      <div className="rounded-2xl bg-gradient-to-r from-[#3a0aa8] via-[#450bc8] to-[#3b1799] p-4 sm:p-6 text-white shadow-lg overflow-hidden relative">
        <div className="absolute top-0 right-0 w-72 h-72 bg-white/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3"></div>
        <div className="absolute bottom-0 left-1/4 w-48 h-48 bg-black/10 rounded-full blur-3xl translate-y-1/2"></div>

        <div className="relative z-10 flex flex-col lg:flex-row gap-5 justify-between items-start lg:items-center">
          <div className="space-y-3 flex-1">
            <div className="inline-flex items-center rounded-full bg-white/10 px-3 py-0.5 text-xs font-medium backdrop-blur-sm border border-white/10">
              {todayDateStr}
            </div>

            <div className="space-y-1">
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
                {stats.therapistName ? `Welcome back, ${stats.therapistName}` : "Welcome back"}
              </h1>
              <p className="text-primary-foreground/80 text-xs sm:text-sm max-w-lg">
                {loading ? <Skeleton className="h-5 w-80 bg-white/20" /> : `${stats.therapistTitle ? `${stats.therapistTitle} · ` : ""}${stats.sessionsToday} session${stats.sessionsToday === 1 ? "" : "s"} today and ${stats.pendingReports} report${stats.pendingReports === 1 ? "" : "s"} awaiting review.`}
              </p>
            </div>
          </div>

          {/* Next Session Card (Compact) */}
          {nextSession && (
            <div className="w-full lg:w-[320px] shrink-0 bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-3.5 shadow-xl">
              <div className="flex items-center justify-between mb-2.5">
                <h3 className="text-[11px] font-bold tracking-wider text-primary-foreground/70 uppercase">NEXT SESSION</h3>
                <Badge variant="secondary" className="bg-green-500/20 text-green-300 hover:bg-green-500/20 border-green-500/30 text-[10px] px-2 py-0.5">
                  <Clock className="w-3 h-3 mr-1" />
                  {countdownLabel(nextSession.startMs, nextSession.endMs, now)}
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
                <div className="font-medium">
                  {nextSession.dayKey !== todayKey && `${nextSession.dayLabel} · `}{nextSession.startTime} — {nextSession.endTime}
                </div>
                {nextSession.sessionNumber !== null && (
                  <div className="text-primary-foreground/70">Session #{nextSession.sessionNumber}</div>
                )}
              </div>

              <Button
                className="w-full rounded-full bg-white text-primary hover:bg-white/90 font-bold h-9 text-xs"
                disabled={!nextSession.meetingLink}
                title={nextSession.meetingLink ? "Open the meeting in a new tab" : "Meeting link not set"}
                onClick={() => nextSession.meetingLink && openMeeting(nextSession.meetingLink)}
              >
                <Video className="w-3.5 h-3.5 mr-1.5" />
                {nextSession.meetingLink ? "Join session" : "Meeting link not set"}
              </Button>
            </div>
          )}
        </div>
      </div>

      {loadError && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 flex flex-wrap items-center justify-between gap-2 text-xs text-amber-900 font-medium">
          <span>Couldn&apos;t load your sessions, so the numbers below may be incomplete.</span>
          <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => { setLoading(true); loadBookings(); }}>
            Try again
          </Button>
        </div>
      )}

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
        <StatCard
          title="Sessions today"
          value={stats.sessionsToday}
          description={`${stats.sessionsRemaining} remaining`}
          icon={<Video className="w-5 h-5 text-blue-500" />}
          loading={loading}
        />
        <StatCard
          title="Active clients"
          value={stats.activeClients}
          description="Upcoming or seen in the last 30 days"
          icon={<Users className="w-5 h-5 text-indigo-500" />}
          loading={loading}
        />
        <StatCard
          title="Pending reports"
          value={stats.pendingReports}
          description="Completed sessions without a report"
          icon={<FileText className="w-5 h-5 text-orange-500" />}
          loading={loading}
        />
        <StatCard
          title="Therapy hours"
          value={stats.therapyHoursThisWeek}
          description="This week (Mon–Sun)"
          icon={<Clock className="w-5 h-5 text-emerald-500" />}
          loading={loading}
        />
      </div>

      {/* Schedule & Reports */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <Card className="xl:col-span-2 shadow-sm border-border min-w-0">
          <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4">
            <div>
              <CardTitle className="text-lg sm:text-xl">{currentSchedule.title}</CardTitle>
              <CardDescription>
                {activeSessionList.length} session{activeSessionList.length === 1 ? "" : "s"}
              </CardDescription>
            </div>
            <Tabs value={scheduleTab} onValueChange={(val) => setScheduleTab(val as 'today' | 'week' | 'month')} className="w-full sm:w-[200px]">
              <TabsList className="grid w-full grid-cols-3 h-auto sm:h-9">
                <TabsTrigger value="today" className="py-2 sm:py-1">Today</TabsTrigger>
                <TabsTrigger value="week" className="py-2 sm:py-1">Week</TabsTrigger>
                <TabsTrigger value="month" className="py-2 sm:py-1">Month</TabsTrigger>
              </TabsList>
            </Tabs>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-4">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-20 w-full rounded-xl" />)}
              </div>
            ) : (
              <div className="space-y-4">
                {activeSessionList.map((session) => {
                  const isNext = nextSession?.id === session.id;
                  return (
                    <div key={session.id} className="flex items-center justify-between p-4 rounded-xl border border-border hover:border-border/80 hover:bg-secondary/30 transition-colors group">
                      <div className="flex items-center gap-4">
                        <div>
                          <div className="font-semibold text-[15px]">{session.clientName}</div>
                          <div className="flex items-center gap-3 text-sm mt-1">
                            <span className="flex items-center text-muted-foreground">
                              <Clock className="w-3.5 h-3.5 mr-1" />
                              {scheduleTab !== 'today' && `${session.dayLabel} · `}{session.startTime} · {session.durationMinutes} min
                            </span>
                            {isNext && (
                              <Badge variant="secondary" className="bg-primary/10 text-primary hover:bg-primary/10 rounded-md py-0 font-medium">
                                {countdownLabel(session.startMs, session.endMs, now)}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2.5 shrink-0">
                        <Button
                          variant="outline"
                          className="border-slate-200 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 text-slate-700 font-bold text-xs h-9 px-3.5 rounded-xl transition-colors cursor-pointer"
                          onClick={() => requestCancel(session)}
                        >
                          Cancel
                        </Button>
                        <Button
                          className="bg-[#450bc8] hover:bg-[#3a0aa8] text-white font-extrabold text-xs h-9 px-4 rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
                          disabled={!session.meetingLink}
                          title={session.meetingLink ? "Open the meeting in a new tab" : "Meeting link not set"}
                          onClick={() => session.meetingLink && openMeeting(session.meetingLink)}
                        >
                          <Video className="w-3.5 h-3.5" />
                          <span>Join</span>
                        </Button>
                      </div>
                    </div>
                  );
                })}
                {!activeSessionList.length && (
                  <div className="text-center py-8 text-muted-foreground">No active sessions scheduled for this period.</div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-sm border-border flex flex-col h-full">
          {/* Same header style as the "Today's schedule" card next to it */}
          <CardHeader className="pb-4 shrink-0">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <CardTitle className="text-lg sm:text-xl">Pending reports</CardTitle>
              {reportList.length > 0 && (
                <Badge variant="outline" className="bg-purple-50 text-[#450bc8] border-purple-200 font-medium shrink-0">Action required</Badge>
              )}
            </div>
            <CardDescription>{stats.pendingReports} report{stats.pendingReports === 1 ? "" : "s"} awaiting your review</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col flex-1 justify-between pt-0 gap-4">
            {loading ? (
              <div className="space-y-3 flex-1">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-14 w-full rounded-xl" />)}
              </div>
            ) : (
              <div className="space-y-3 flex-1 overflow-y-auto max-h-[300px] pr-1">
                {reportList.map((report) => (
                  <div key={report.id} className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-xl bg-slate-50/80 border border-slate-200/80 hover:border-purple-200 transition-all">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex flex-col min-w-0">
                        <span className="font-semibold text-slate-900 text-sm truncate">{report.clientName}</span>
                        <span className="text-xs text-slate-500 font-medium">{report.dayLabel} · {report.startTime}</span>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-[#450bc8] bg-purple-50 hover:bg-purple-100 border border-purple-200/60 font-extrabold h-9 sm:h-8 px-3 rounded-lg text-xs transition-colors shrink-0 ml-auto"
                      onClick={() => {
                        setReportSessionId(report.id);
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
              <p className="text-xs font-semibold leading-relaxed">Write each report soon after the session, while the details are fresh. Your follow-up message reaches the client when you submit.</p>
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
        onSuccess={(booking) => {
          // Mark it reported locally right away, then reload from the server
          if (booking?.id) setBookings((prev) => prev.map((b) => (String(b.id) === String(booking.id) ? { ...b, ...booking } : b)));
          loadBookings();
        }}
      />

      {/* Policy Blocked Modal (< 3 hours) */}
      {policyBlockedModal && (
        <Dialog open={!!policyBlockedModal} onOpenChange={(open) => !open && setPolicyBlockedModal(null)}>
          <DialogContent className="w-[calc(100vw-2rem)] max-w-md bg-white rounded-3xl p-4 sm:p-6 shadow-2xl border border-slate-200 max-h-[90dvh] overflow-y-auto">
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
        <Dialog open={!!cancelModalSession} onOpenChange={(open) => !open && !cancelling && setCancelModalSession(null)}>
          <DialogContent className="w-[calc(100vw-2rem)] max-w-md bg-white rounded-3xl p-4 sm:p-6 shadow-2xl border border-slate-200 animate-in zoom-in-95 max-h-[90dvh] overflow-y-auto">
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
                  <div className="w-10 h-10 rounded-2xl bg-purple-100 text-[#450bc8] flex items-center justify-center font-bold mb-1">
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
                    <div className="flex items-center gap-1.5 text-xs font-extrabold text-[#450bc8]">
                      <ShieldCheck className="w-3.5 h-3.5 text-[#450bc8] shrink-0" />
                      <span>Platform Cancellation Policy</span>
                    </div>
                    <ul className="text-[11px] text-purple-900/90 font-medium space-y-1 pl-4 list-disc leading-relaxed">
                      <li><strong>{cancelModalSession.clientName}</strong> is notified that the session is cancelled.</li>
                    </ul>
                  </div>

                  {/* Reason Dropdown */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 block">Select Cancellation Reason *</label>
                    <select
                      value={cancellationReason}
                      onChange={(e) => setCancellationReason(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 outline-none focus:bg-white focus:border-[#450bc8]"
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
                    disabled={cancelling}
                    className="text-slate-600 font-bold text-xs h-10 px-4 rounded-xl hover:bg-slate-100 cursor-pointer"
                  >
                    ← Back
                  </Button>
                  <Button
                    type="button"
                    onClick={confirmCancel}
                    disabled={cancelling}
                    className="flex-1 bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs h-10 rounded-xl shadow-sm cursor-pointer"
                  >
                    {cancelling ? "Cancelling…" : "Confirm Cancellation"}
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
  loading
}: {
  title: string;
  value: React.ReactNode;
  description: string;
  icon: React.ReactNode;
  loading?: boolean;
}) {
  return (
    <Card className="shadow-sm border-border overflow-hidden group">
      <CardContent className="p-4 sm:p-5">
        <div className="flex justify-between items-start mb-4">
          <div className="p-2 bg-secondary rounded-lg text-primary">{icon}</div>
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
