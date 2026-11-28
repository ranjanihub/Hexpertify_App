import { useState, useEffect } from "react";
import { getAuthUser } from "./auth";

export interface OutcomeRecord {
  id: string;
  clientId: string;
  clientName: string;
  clientInitials: string;
  avatarBg: string;
  assessmentName: string;
  assessmentCode: string;
  sessionMilestone: number; // e.g., 3, 6, 9, 12
  previousScore: number;
  currentScore: number;
  maxScore: number;
  changeValue: number; // currentScore - previousScore
  changeLabel: string; // "-5 points", "+4 points", "No change"
  changeDirection: "decreased" | "increased" | "unchanged";
  completedDate: string;
  therapistNotified: boolean;
  notifiedAt: string;
  details?: {
    q: string;
    prev: string;
    curr: string;
  }[];
}

export interface OutcomeNotification {
  id: string;
  outcomeId: string;
  clientName: string;
  assessmentName: string;
  previousScore: number;
  currentScore: number;
  changeLabel: string;
  changeValue: number;
  sessionMilestone: number;
  completedDate: string;
  timestamp: string;
  read: boolean;
}

/** Outcomes are derived from real AssessmentScore records; nothing is shown until they load */
export const INITIAL_OUTCOMES: OutcomeRecord[] = [];

const AVATAR_COLORS = [
  "bg-purple-100 text-purple-700",
  "bg-blue-100 text-blue-700",
  "bg-emerald-100 text-emerald-700",
  "bg-amber-100 text-amber-700",
  "bg-rose-100 text-rose-700",
];

const scoreOf = (s: any) => Number(s?.totalScore ?? s?.score);
const whenOf = (s: any) => new Date(s?.createdAt || s?.completedAt || 0).getTime() || 0;
const initialsOf = (name: string) =>
  name.split(/\s+/).map((n) => n[0] || "").join("").toUpperCase().slice(0, 2) || "CL";

function answerRows(prev: any, curr: any): OutcomeRecord["details"] {
  const list = (s: any) => (Array.isArray(s?.answers) ? s.answers : []);
  const prevByQ = new Map<string, any>(list(prev).map((a: any) => [String(a.questionId ?? a.questionText), a]));
  return list(curr).map((a: any) => {
    const before = prevByQ.get(String(a.questionId ?? a.questionText));
    return {
      q: String(a.questionText || a.questionId || ""),
      prev: before ? String(before.answerLabel ?? before.score ?? "—") : "—",
      curr: String(a.answerLabel ?? a.score ?? "—"),
    };
  });
}

/**
 * One outcome per client and scale with at least two scored submissions: the latest score compared
 * with the one before it. Submissions without visible scores (restricted to other therapists) are skipped.
 */
export function outcomesFromScores(scores: any[]): OutcomeRecord[] {
  const groups = new Map<string, any[]>();
  scores.forEach((s) => {
    if (!Number.isFinite(scoreOf(s))) return;
    const client = String(s.clientEmail || s.clientId || "").toLowerCase();
    const code = String(s.assessmentAcronym || s.assessmentId || "").toUpperCase();
    if (!client || !code) return;
    const key = `${client}|${code}`;
    groups.set(key, [...(groups.get(key) || []), s]);
  });

  const outcomes: { at: number; record: OutcomeRecord }[] = [];
  let colorIndex = 0;
  groups.forEach((list) => {
    if (list.length < 2) return;
    const sorted = [...list].sort((x, y) => whenOf(x) - whenOf(y));
    const curr = sorted[sorted.length - 1];
    const prev = sorted[sorted.length - 2];
    const currentScore = scoreOf(curr);
    const previousScore = scoreOf(prev);
    const diff = currentScore - previousScore;
    const clientName = String(curr.clientName || curr.clientEmail || "Client");
    const completed = whenOf(curr);
    outcomes.push({ at: completed, record: {
      id: `out-${curr.id || curr._id}`,
      clientId: String(curr.clientId || curr.clientEmail || ""),
      clientName,
      clientInitials: initialsOf(clientName),
      avatarBg: AVATAR_COLORS[colorIndex++ % AVATAR_COLORS.length],
      assessmentName: String(curr.assessmentTitle || curr.assessmentAcronym || "Assessment"),
      assessmentCode: String(curr.assessmentAcronym || ""),
      sessionMilestone: sorted.length,
      previousScore,
      currentScore,
      maxScore: Number(curr.maxScore) || Math.max(currentScore, previousScore),
      changeValue: diff,
      changeLabel: diff === 0 ? "No change" : diff > 0 ? `+${diff} points` : `${diff} points`,
      changeDirection: diff < 0 ? "decreased" : diff > 0 ? "increased" : "unchanged",
      completedDate: completed ? new Date(completed).toLocaleString() : "—",
      therapistNotified: true,
      notifiedAt: completed ? new Date(completed).toLocaleDateString() : "—",
      details: answerRows(prev, curr),
    } });
  });
  // Newest first
  return outcomes.sort((x, y) => y.at - x.at).map((o) => o.record);
}

export const INITIAL_NOTIFICATIONS: OutcomeNotification[] = [];

// In-memory state listeners
type Listener = () => void;
let globalOutcomes: OutcomeRecord[] = [...INITIAL_OUTCOMES];
let globalNotifications: OutcomeNotification[] = [...INITIAL_NOTIFICATIONS];
const listeners: Set<Listener> = new Set();

function notifyListeners() {
  listeners.forEach((listener) => listener());
}

export function calculateOutcome(params: {
  clientId: string;
  clientName: string;
  clientInitials: string;
  avatarBg?: string;
  assessmentName: string;
  assessmentCode: string;
  sessionMilestone: number;
  previousScore: number;
  currentScore: number;
  maxScore: number;
}): { outcome: OutcomeRecord; notification: OutcomeNotification } {
  const {
    clientId,
    clientName,
    clientInitials,
    avatarBg = "bg-purple-100 text-purple-700",
    assessmentName,
    assessmentCode,
    sessionMilestone,
    previousScore,
    currentScore,
    maxScore,
  } = params;

  const diff = currentScore - previousScore;
  let changeLabel = "No change";
  let changeDirection: "decreased" | "increased" | "unchanged" = "unchanged";

  if (diff < 0) {
    changeLabel = `${diff} points`;
    changeDirection = "decreased";
  } else if (diff > 0) {
    changeLabel = `+${diff} points`;
    changeDirection = "increased";
  }

  const outcomeId = `out-local-${Date.now()}`;
  const notifId = `notif-${Date.now()}`;

  // ALWAYS dispatch an outcome notification to the therapist panel upon 3-session milestone assessment completion,
  // regardless of whether score decreased, increased, or stayed unchanged.
  const outcome: OutcomeRecord = {
    id: outcomeId,
    clientId,
    clientName,
    clientInitials,
    avatarBg,
    assessmentName,
    assessmentCode,
    sessionMilestone,
    previousScore,
    currentScore,
    maxScore,
    changeValue: diff,
    changeLabel,
    changeDirection,
    completedDate: `Just completed after Session ${sessionMilestone}`,
    therapistNotified: true, // Always true
    notifiedAt: "Just now",
  };

  const notification: OutcomeNotification = {
    id: notifId,
    outcomeId,
    clientName,
    assessmentName,
    previousScore,
    currentScore,
    changeLabel,
    changeValue: diff,
    sessionMilestone,
    completedDate: `after Session ${sessionMilestone}`,
    timestamp: "Just now",
    read: false,
  };

  globalOutcomes = [outcome, ...globalOutcomes];
  globalNotifications = [notification, ...globalNotifications];
  notifyListeners();

  return { outcome, notification };
}

let loadedFor = "";

/** Loads this therapist's clients' scores (the API scopes them to the consultant) and derives outcomes */
export async function loadOutcomes(force = false): Promise<void> {
  const user = getAuthUser();
  const consultantId = String(user?.id || "");
  if (!consultantId || (!force && loadedFor === consultantId)) return;
  loadedFor = consultantId;
  try {
    // By id only: a name would also match other therapists with a similar name
    const q = new URLSearchParams({ consultantId });
    const res = await fetch(`/api/assessments/scores?${q.toString()}`);
    const data = res.ok ? await res.json() : null;
    const scores = Array.isArray(data?.scores) ? data.scores : Array.isArray(data?.submissions) ? data.submissions : [];
    // Keep outcomes calculated in this session on top of the stored ones
    const local = globalOutcomes.filter((o) => o.id.startsWith("out-local-"));
    globalOutcomes = [...local, ...outcomesFromScores(scores)];
    notifyListeners();
  } catch {
    loadedFor = "";
  }
}

export function useOutcomeStore() {
  const [, setTick] = useState(0);

  useEffect(() => {
    const listener = () => setTick((t) => t + 1);
    listeners.add(listener);
    loadOutcomes();
    return () => {
      listeners.delete(listener);
    };
  }, []);

  const markNotificationRead = (id: string) => {
    globalNotifications = globalNotifications.map((n) =>
      n.id === id ? { ...n, read: true } : n
    );
    notifyListeners();
  };

  const markAllNotificationsRead = () => {
    globalNotifications = globalNotifications.map((n) => ({ ...n, read: true }));
    notifyListeners();
  };

  return {
    outcomes: globalOutcomes,
    notifications: globalNotifications,
    unreadCount: globalNotifications.filter((n) => !n.read).length,
    markNotificationRead,
    markAllNotificationsRead,
    calculateOutcome,
  };
}
