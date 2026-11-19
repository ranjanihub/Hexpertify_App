import { useEffect, useState } from "react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Badge } from "@/components/ui/badge";
import { Lock, MessageSquareQuote } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * One client's post-session feedback (Session Rating Scale: three 0–10 items, total out of 30), one point per
 * completed session. Loaded from /api/session-feedback, which only returns rows to the session's therapist
 * (clients cannot read it), so this is therapist-only by construction.
 */

type FeedbackLevel = "healthy" | "watch" | "attention";

type Feedback = {
  id: string;
  bookingId: string;
  serviceTitle: string;
  sessionDate?: string;
  scores: { helpfulness: number; goalsHeard: number; approach: number };
  totalScore: number;
  maxScore: number;
  level: FeedbackLevel;
  message?: string;
  createdAt: string;
};

const LEVELS: Record<FeedbackLevel, { label: string; dot: string; badge: string }> = {
  healthy: { label: "Healthy", dot: "🟢", badge: "bg-emerald-100 text-emerald-800" },
  watch: { label: "Watch", dot: "🟡", badge: "bg-amber-100 text-amber-800" },
  attention: { label: "Needs attention", dot: "🔴", badge: "bg-rose-100 text-rose-800" },
};

const ITEMS: { key: keyof Feedback["scores"]; label: string }[] = [
  { key: "helpfulness", label: "Helpfulness" },
  { key: "goalsHeard", label: "Goals & heard" },
  { key: "approach", label: "Approach" },
];

const sessionTime = (f: Feedback) => {
  const d = new Date(f.sessionDate || f.createdAt);
  return isNaN(d.getTime()) ? 0 : d.getTime();
};

function shortDate(f: Feedback) {
  const t = sessionTime(f);
  return t ? new Date(t).toLocaleDateString("en-IN", { day: "numeric", month: "short" }) : "";
}

function FeedbackTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const f: Feedback & { label: string } = payload[0].payload;
  const level = LEVELS[f.level] || LEVELS.watch;
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-lg text-xs space-y-1.5 min-w-[180px]">
      <p className="font-bold text-slate-900">{f.label}{shortDate(f) && ` · ${shortDate(f)}`}</p>
      <p className="text-slate-500 truncate">{f.serviceTitle}</p>
      <p className="font-extrabold text-slate-900 text-sm">
        {f.totalScore}/{f.maxScore || 30} <span className="font-semibold">{level.dot} {level.label}</span>
      </p>
      {ITEMS.map((item) => (
        <p key={item.key} className="text-slate-600">{item.label}: <span className="font-bold">{f.scores?.[item.key] ?? "–"}/10</span></p>
      ))}
    </div>
  );
}

export function ClientSessionFeedback({ clientId, clientEmail, clientName }: { clientId?: string; clientEmail?: string; clientName: string }) {
  const [feedback, setFeedback] = useState<Feedback[] | null>(null);

  useEffect(() => {
    const q = new URLSearchParams();
    if (clientId) q.set("clientId", clientId);
    if (clientEmail) q.set("clientEmail", clientEmail.trim().toLowerCase());
    if (!q.toString()) {
      setFeedback([]);
      return;
    }
    let alive = true;
    fetch(`/api/session-feedback?${q.toString()}`)
      .then((r) => (r.ok ? r.json() : { feedback: [] }))
      .then((data) => alive && setFeedback(Array.isArray(data?.feedback) ? data.feedback : []))
      .catch(() => alive && setFeedback([]));
    return () => { alive = false; };
  }, [clientId, clientEmail]);

  // Oldest session first so the line reads left to right
  const points = (feedback || [])
    .slice()
    .sort((a, b) => sessionTime(a) - sessionTime(b))
    .map((f, i) => ({ ...f, label: `Session ${i + 1}`, short: `#${i + 1}` }));
  const latest = points[points.length - 1];
  const average = points.length ? (points.reduce((s, f) => s + f.totalScore, 0) / points.length).toFixed(1) : null;

  return (
    <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-5">
      <div className="flex items-start justify-between flex-wrap gap-3 border-b border-slate-100 pb-4">
        <div className="flex items-center gap-2">
          <span className="p-2 rounded-xl bg-purple-100 text-[#5e2be2]">
            <MessageSquareQuote className="w-5 h-5" />
          </span>
          <div>
            <h3 className="text-base font-extrabold text-slate-900">Session Feedback Trend</h3>
            <p className="text-xs text-slate-500 font-medium">
              How {clientName} rated each completed session (score out of 30)
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {average && <Badge className="bg-slate-100 text-slate-700 border-0 font-bold">Average {average}/30</Badge>}
          {latest && (
            <Badge className={cn("border-0 font-bold", (LEVELS[latest.level] || LEVELS.watch).badge)}>
              Latest {latest.totalScore}/30
            </Badge>
          )}
          <Badge className="bg-purple-50 text-[#5e2be2] border border-purple-200 font-bold gap-1">
            <Lock className="w-3 h-3" /> Only visible to you
          </Badge>
        </div>
      </div>

      {feedback === null ? (
        <p className="text-sm text-muted-foreground py-10 text-center">Loading feedback…</p>
      ) : points.length === 0 ? (
        <p className="text-sm text-muted-foreground py-10 text-center">
          No feedback yet. {clientName} is asked to rate each session after you mark it as completed, and each rating appears here.
        </p>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">
          {/* Same card size and chart style as the Assessment Score Trends cards */}
          <div className="rounded-2xl border border-slate-200 p-4 space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-sm font-extrabold text-slate-900">Session Rating</p>
                <p className="text-xs text-slate-500 truncate">Score out of 30 after each session</p>
              </div>
              {latest && (
                <div className="text-right shrink-0">
                  <p className="text-lg font-black text-slate-900">
                    {latest.totalScore}<span className="text-xs font-normal text-slate-400">/30</span>
                  </p>
                  <p className="text-[11px] font-semibold text-slate-500">{(LEVELS[latest.level] || LEVELS.watch).label}</p>
                </div>
              )}
            </div>
            <div className="h-[150px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={points} margin={{ top: 8, right: 12, left: -24, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="short" tick={{ fontSize: 10, fill: "#64748b" }} tickLine={false} axisLine={false} />
                  <YAxis domain={[0, 30]} ticks={[0, 10, 20, 30]} tick={{ fontSize: 10, fill: "#64748b" }} tickLine={false} axisLine={false} />
                  <Tooltip content={<FeedbackTooltip />} />
                  <Line
                    type="monotone"
                    dataKey="totalScore"
                    stroke="#5e2be2"
                    strokeWidth={3}
                    dot={(props: any) => {
                      const lvl = props?.payload?.level as FeedbackLevel;
                      const fill = lvl === "attention" ? "#e11d48" : lvl === "watch" ? "#f59e0b" : "#10b981";
                      return <circle key={props.key ?? props.index} cx={props.cx} cy={props.cy} r={4} fill={fill} stroke="#fff" strokeWidth={2} />;
                    }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="flex items-center justify-between gap-2 flex-wrap text-[11px] text-slate-500">
              <span>{points.length} session{points.length === 1 ? "" : "s"} rated{latest && shortDate(latest) ? ` · last on ${shortDate(latest)}` : ""}</span>
            </div>
          </div>

          <div className="space-y-3 lg:max-h-[262px] lg:overflow-y-auto lg:pr-1">
            {points.slice().reverse().map((f) => {
              const level = LEVELS[f.level] || LEVELS.watch;
              return (
                <div key={f.id} className={cn("rounded-xl border p-3 sm:p-4 space-y-2", f.level === "attention" ? "border-rose-200 bg-rose-50/40" : "border-slate-200")}>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-slate-900">{f.label}{shortDate(f) && ` · ${shortDate(f)}`}</p>
                      <p className="text-xs text-muted-foreground truncate">{f.serviceTitle}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-extrabold text-slate-900">{f.totalScore}<span className="text-xs font-semibold text-muted-foreground">/{f.maxScore || 30}</span></span>
                      <Badge className={cn("border-0 font-bold text-[11px]", level.badge)}>{level.dot} {level.label}</Badge>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {ITEMS.map((item) => (
                      <span key={item.key} className="text-[11px] font-semibold bg-slate-100 text-slate-700 rounded-md px-2 py-0.5">
                        {item.label}: {f.scores?.[item.key] ?? "–"}/10
                      </span>
                    ))}
                  </div>
                  {f.message && (
                    <p className="text-xs text-slate-700 bg-white border border-slate-200 rounded-lg p-2.5 leading-relaxed">“{f.message}”</p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
