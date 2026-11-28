import { useEffect, useMemo, useState } from "react";
import {
  LineChart as LineChartIcon,
  TrendingDown,
  TrendingUp,
  Minus,
  Users,
  FileCheck,
  AlertCircle,
  RotateCcw,
} from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { outcomesFromScores, OutcomeRecord } from "@/lib/outcome-store";
import { getAuthUser } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";

/**
 * Outcomes for the signed-in therapist, built only from their clients' real assessment submissions
 * (GET /api/assessments?consultantId=). An outcome compares a client's latest score on a scale with
 * the one before it. Changes are shown neutrally (higher or lower), since "better" differs by scale.
 */

const scoreOf = (s: any) => Number(s?.totalScore ?? s?.score);
const whenOf = (s: any) => new Date(s?.createdAt || s?.completedAt || 0).getTime() || 0;
const clientKeyOf = (s: any) => String(s?.clientEmail || s?.clientId || "").toLowerCase();
const scaleOf = (s: any) => String(s?.assessmentAcronym || s?.assessmentId || "").toUpperCase();

export default function Outcomes() {
  const authUser = getAuthUser();
  const myId = String(authUser?.id || "");

  const [submissions, setSubmissions] = useState<any[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [selectedClient, setSelectedClient] = useState<string>("");
  const [selectedScale, setSelectedScale] = useState<string>("");
  const [selectedOutcome, setSelectedOutcome] = useState<OutcomeRecord | null>(null);

  const load = async () => {
    if (!myId) {
      setStatus("error");
      return;
    }
    setStatus("loading");
    try {
      // By id only: the server returns submissions from this therapist's own clients
      const res = await fetch(`/api/assessments?consultantId=${encodeURIComponent(myId)}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const list = Array.isArray(data?.submissions) ? data.submissions : Array.isArray(data?.scores) ? data.scores : [];
      // Results restricted to another therapist carry no score and are left out
      setSubmissions(list.filter((s: any) => Number.isFinite(scoreOf(s)) && clientKeyOf(s) && scaleOf(s)));
      setStatus("ready");
    } catch {
      setStatus("error");
    }
  };

  useEffect(() => {
    load();
  }, [myId]);

  const outcomes = useMemo(() => outcomesFromScores(submissions), [submissions]);

  // Clients that have at least one scored submission, for the trend picker
  const clients = useMemo(() => {
    const map = new Map<string, string>();
    submissions.forEach((s) => {
      const key = clientKeyOf(s);
      if (!map.has(key)) map.set(key, String(s.clientName || s.clientEmail || "Client"));
    });
    return Array.from(map.entries()).map(([key, name]) => ({ key, name })).sort((a, b) => a.name.localeCompare(b.name));
  }, [submissions]);

  const clientScales = useMemo(() => {
    const set = new Set<string>();
    submissions.filter((s) => clientKeyOf(s) === selectedClient).forEach((s) => set.add(scaleOf(s)));
    return Array.from(set).sort();
  }, [submissions, selectedClient]);

  // Keep the pickers on something that exists
  useEffect(() => {
    if (clients.length > 0 && !clients.some((c) => c.key === selectedClient)) setSelectedClient(clients[0].key);
  }, [clients, selectedClient]);
  useEffect(() => {
    if (clientScales.length > 0 && !clientScales.includes(selectedScale)) setSelectedScale(clientScales[0]);
  }, [clientScales, selectedScale]);

  const trend = useMemo(
    () =>
      submissions
        .filter((s) => clientKeyOf(s) === selectedClient && scaleOf(s) === selectedScale)
        .sort((a, b) => whenOf(a) - whenOf(b))
        .map((s) => ({
          date: whenOf(s) ? new Date(whenOf(s)).toLocaleDateString(undefined, { day: "numeric", month: "short" }) : "—",
          score: scoreOf(s),
          max: Number(s.maxScore) || undefined,
        })),
    [submissions, selectedClient, selectedScale]
  );
  const trendMax = trend.reduce((m, t) => Math.max(m, t.max || 0, t.score), 0);

  const counts = {
    lower: outcomes.filter((o) => o.changeDirection === "decreased").length,
    higher: outcomes.filter((o) => o.changeDirection === "increased").length,
    same: outcomes.filter((o) => o.changeDirection === "unchanged").length,
  };

  const directionBadge = (o: OutcomeRecord) => (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold",
        o.changeDirection === "decreased" && "bg-sky-50 text-sky-700",
        o.changeDirection === "increased" && "bg-amber-50 text-amber-700",
        o.changeDirection === "unchanged" && "bg-slate-100 text-slate-600"
      )}
    >
      {o.changeDirection === "decreased" ? <TrendingDown className="w-3 h-3" /> : o.changeDirection === "increased" ? <TrendingUp className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
      {o.changeLabel}
    </span>
  );

  return (
    <div className="space-y-8 pb-12">
      <PageHeader
        title="Client Outcomes"
        description="How your clients' assessment scores have changed between their most recent check-ins."
        badge="OUTCOMES"
        icon={<LineChartIcon className="w-4 h-4 text-purple-200" />}
      />

      {status === "loading" && (
        <div className="bg-white rounded-3xl border border-slate-200 p-10 text-center text-sm font-semibold text-slate-500 shadow-sm">
          Loading your clients' results…
        </div>
      )}

      {status === "error" && (
        <div className="bg-white rounded-3xl border border-rose-200 p-8 text-center shadow-sm space-y-3">
          <AlertCircle className="w-8 h-8 text-rose-500 mx-auto" />
          <p className="text-sm font-bold text-slate-900">We couldn't load your clients' assessment results.</p>
          <p className="text-xs text-slate-500">Check your connection and try again.</p>
          <button
            type="button"
            onClick={load}
            className="inline-flex items-center gap-2 h-9 px-4 rounded-xl bg-[#450bc8] hover:bg-[#3a0aa8] text-white font-bold text-xs cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Try again
          </button>
        </div>
      )}

      {status === "ready" && submissions.length === 0 && (
        <div className="bg-white rounded-3xl border border-dashed border-slate-300 p-10 text-center shadow-sm space-y-2">
          <FileCheck className="w-8 h-8 text-slate-400 mx-auto" />
          <p className="text-base font-bold text-slate-900">No assessment results yet</p>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            When your clients complete assessments, their scores appear here. An outcome is shown once a client has
            completed the same assessment at least twice.
          </p>
        </div>
      )}

      {status === "ready" && submissions.length > 0 && (
        <>
          {/* Summary from real records */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 rounded-3xl bg-white border border-slate-200 shadow-2xs space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-500"><Users className="w-4 h-4 text-[#450bc8]" /> Clients with results</div>
              <div className="text-3xl font-extrabold text-slate-900 font-mono">{clients.length}</div>
            </div>
            <div className="p-5 rounded-3xl bg-white border border-slate-200 shadow-2xs space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-500"><TrendingDown className="w-4 h-4 text-sky-600" /> Score went down</div>
              <div className="text-3xl font-extrabold text-slate-900 font-mono">{counts.lower}</div>
            </div>
            <div className="p-5 rounded-3xl bg-white border border-slate-200 shadow-2xs space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-500"><TrendingUp className="w-4 h-4 text-amber-600" /> Score went up</div>
              <div className="text-3xl font-extrabold text-slate-900 font-mono">{counts.higher}</div>
            </div>
            <div className="p-5 rounded-3xl bg-white border border-slate-200 shadow-2xs space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-500"><Minus className="w-4 h-4 text-slate-500" /> No change</div>
              <div className="text-3xl font-extrabold text-slate-900 font-mono">{counts.same}</div>
            </div>
          </div>
          <p className="text-[11px] text-slate-500 -mt-4">
            Whether a higher score is better depends on the scale (on WHO-5 higher is better; on PHQ-9 or GAD-7 lower is better).
          </p>

          {/* Score trend for one client and scale */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">Score history</h3>
                <p className="text-xs text-slate-500 font-medium">Every completed attempt, oldest first</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Select value={selectedClient} onValueChange={setSelectedClient}>
                  <SelectTrigger className="w-[200px] h-9 text-xs bg-slate-50 border-slate-200 rounded-xl font-bold text-slate-900">
                    <SelectValue placeholder="Choose a client" />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.map((c) => (
                      <SelectItem key={c.key} value={c.key}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={selectedScale} onValueChange={setSelectedScale}>
                  <SelectTrigger className="w-[130px] h-9 text-xs bg-slate-50 border-slate-200 rounded-xl font-bold text-slate-900">
                    <SelectValue placeholder="Scale" />
                  </SelectTrigger>
                  <SelectContent>
                    {clientScales.map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {trend.length > 0 ? (
              <div className="h-64 w-full pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="outcomeScore" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#450bc8" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="#450bc8" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#64748b" }} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#64748b" }} domain={[0, trendMax || "auto"]} allowDecimals={false} />
                    <Tooltip
                      contentStyle={{ backgroundColor: "#ffffff", borderRadius: "16px", border: "1px solid #e2e8f0", boxShadow: "0 10px 25px -5px rgba(0,0,0,0.1)" }}
                      labelStyle={{ fontWeight: "bold", color: "#0f172a" }}
                    />
                    <Area type="monotone" dataKey="score" name={selectedScale || "Score"} stroke="#450bc8" strokeWidth={2.5} fill="url(#outcomeScore)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="text-xs text-slate-500 py-8 text-center">Choose a client to see their scores.</p>
            )}
          </div>

          {/* Outcomes: latest score compared with the one before it */}
          <div className="bg-white rounded-3xl border border-slate-200 p-4 sm:p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">Latest changes</h3>
                <p className="text-xs text-slate-500 font-medium">Each client's newest score on a scale, compared with their previous one</p>
              </div>
              <Badge className="bg-purple-50 text-[#450bc8] border-purple-200 font-bold text-[10px]">{outcomes.length} tracked</Badge>
            </div>

            {outcomes.length === 0 ? (
              <p className="text-xs text-slate-500 py-6 text-center">
                No changes to compare yet — a client needs to complete the same assessment at least twice.
              </p>
            ) : (
              <div className="divide-y divide-slate-100">
                {outcomes.map((o) => (
                  <button
                    key={o.id}
                    type="button"
                    onClick={() => setSelectedOutcome(o)}
                    className="w-full flex flex-col sm:flex-row sm:items-center justify-between gap-2 py-3 text-left hover:bg-slate-50/70 rounded-xl px-2 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={cn("w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0", o.avatarBg)}>
                        {o.clientInitials}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-slate-900 truncate">{o.clientName}</p>
                        <p className="text-[11px] text-slate-500 font-medium truncate">{o.assessmentCode || o.assessmentName} · {o.completedDate}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="font-mono text-sm font-bold text-slate-800">{o.previousScore} → {o.currentScore}</span>
                      {directionBadge(o)}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {/* Outcome Detail Modal */}
      <Dialog open={!!selectedOutcome} onOpenChange={(open) => !open && setSelectedOutcome(null)}>
        <DialogContent className="w-[calc(100vw-2rem)] sm:max-w-xl p-4 sm:p-7 rounded-[20px] sm:rounded-[24px] bg-white border-none shadow-2xl space-y-0 gap-0 outline-none max-h-[92vh] overflow-y-auto">
          {selectedOutcome && (
            <div className="space-y-5">
              <DialogHeader className="space-y-1 text-left">
                <DialogTitle className="text-xl font-bold text-slate-900">
                  {selectedOutcome.assessmentName}
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500 font-medium">
                  {selectedOutcome.clientName} · {selectedOutcome.sessionMilestone} attempts · latest on {selectedOutcome.completedDate}
                </DialogDescription>
              </DialogHeader>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-center">
                  <p className="text-[11px] font-semibold text-slate-500">Previous Score</p>
                  <p className="text-xl font-extrabold text-slate-800 mt-0.5">{selectedOutcome.previousScore}<span className="text-xs text-slate-400"> / {selectedOutcome.maxScore}</span></p>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-center">
                  <p className="text-[11px] font-semibold text-slate-500">Current Score</p>
                  <p className="text-xl font-extrabold text-[#450bc8] mt-0.5">{selectedOutcome.currentScore}<span className="text-xs text-slate-400"> / {selectedOutcome.maxScore}</span></p>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-center">
                  <p className="text-[11px] font-semibold text-slate-500">Change</p>
                  <p className="text-xl font-extrabold text-slate-700 mt-0.5">{selectedOutcome.changeLabel}</p>
                </div>
              </div>

              {selectedOutcome.details && selectedOutcome.details.length > 0 && (
                <div className="rounded-xl border border-slate-200 overflow-hidden">
                  <table className="w-full text-xs">
                    <thead className="bg-slate-50 text-slate-500 font-bold">
                      <tr>
                        <th className="text-left px-3 py-2">Question</th>
                        <th className="text-left px-3 py-2">Before</th>
                        <th className="text-left px-3 py-2">Now</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {selectedOutcome.details.map((d, i) => (
                        <tr key={i}>
                          <td className="px-3 py-2 text-slate-700">{d.q}</td>
                          <td className="px-3 py-2 text-slate-500">{d.prev}</td>
                          <td className="px-3 py-2 font-semibold text-slate-800">{d.curr}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <div className="flex items-center justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedOutcome(null)}
                  className="h-10 px-5 rounded-xl bg-[#450bc8] text-white font-bold text-xs hover:bg-[#3a0aa8] transition-colors cursor-pointer"
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
