import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MessageSquareQuote } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Post-session feedback (Session Rating Scale) the therapist's clients submitted.
 * Score out of 30 from three 0–10 items; levels: healthy ≥ 27, watch 24–26, attention < 24.
 */

type FeedbackLevel = "healthy" | "watch" | "attention";

type Feedback = {
  id: string;
  bookingId: string;
  clientName: string;
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

function formatDate(value?: string) {
  const d = value ? new Date(value) : null;
  return d && !isNaN(d.getTime()) ? d.toLocaleDateString("en-IN", { day: "numeric", month: "short" }) : "";
}

export function SessionFeedbackCard() {
  const [feedback, setFeedback] = useState<Feedback[] | null>(null);
  // Set when loading failed, so the card says so instead of "No feedback yet"
  const [loadError, setLoadError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    setLoadError(null);
    fetch("/api/session-feedback")
      .then(async (r) => {
        if (r.status === 401 || r.status === 403) throw new Error("Your sign-in could not be confirmed, so feedback can't be shown. Sign in again to see it.");
        if (!r.ok) throw new Error("Couldn't load session feedback.");
        return r.json();
      })
      .then((data) => {
        if (active) setFeedback(Array.isArray(data?.feedback) ? data.feedback : []);
      })
      .catch((err) => {
        if (!active) return;
        setFeedback([]);
        setLoadError(err instanceof Error && err.message !== "Failed to fetch" ? err.message : "Couldn't load session feedback.");
      });
    return () => {
      active = false;
    };
  }, [attempt]);

  const items = feedback || [];
  const attention = items.filter((f) => f.level === "attention").length;
  const average = items.length ? (items.reduce((s, f) => s + f.totalScore, 0) / items.length).toFixed(1) : null;

  return (
    <Card className="shadow-sm border-border">
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="text-lg sm:text-xl flex items-center gap-2">
              <MessageSquareQuote className="w-5 h-5 text-[#450bc8]" />
              Session Feedback
            </CardTitle>
            <CardDescription>How clients rated their recent sessions (score out of 30)</CardDescription>
          </div>
          <div className="flex items-center gap-2 text-xs">
            {average && <Badge className="bg-slate-100 text-slate-700 border-0 font-bold">Average {average}/30</Badge>}
            {attention > 0 && <Badge className="bg-rose-100 text-rose-800 border-0 font-bold">🔴 {attention} need attention</Badge>}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loadError ? (
          <div className="py-6 text-center space-y-2">
            <p className="text-sm text-amber-700 font-medium">{loadError}</p>
            <button
              type="button"
              onClick={() => setAttempt((n) => n + 1)}
              className="text-xs font-bold text-[#450bc8] hover:underline cursor-pointer"
            >
              Try again
            </button>
          </div>
        ) : feedback === null ? (
          <p className="text-sm text-muted-foreground py-6 text-center">Loading feedback…</p>
        ) : items.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">
            No feedback yet. Clients are asked to rate a session after you mark it as completed.
          </p>
        ) : (
          <div className="space-y-3">
            {items.slice(0, 8).map((f) => {
              const level = LEVELS[f.level] || LEVELS.watch;
              return (
                <div key={f.id} className={cn("rounded-xl border p-3 sm:p-4 space-y-2", f.level === "attention" ? "border-rose-200 bg-rose-50/40" : "border-slate-200")}>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-slate-900 truncate">{f.clientName}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {f.serviceTitle}{formatDate(f.sessionDate) && ` · ${formatDate(f.sessionDate)}`}
                      </p>
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
                    <p className="text-xs text-slate-700 bg-white border border-slate-200 rounded-lg p-2.5 leading-relaxed">
                      “{f.message}”
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
