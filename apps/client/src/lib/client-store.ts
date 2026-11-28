import { getClientAuth, getApiAuthHeaders, ClientAuthUser } from "./auth";

export interface SessionItem {
  id: number | string;
  status: "upcoming" | "past" | "cancelled";
  /** ISO instant of the session; empty for website bookings that are paid but not scheduled yet */
  scheduledAt: string;
  /** Paid on the website, the team will fix the time: show "To be scheduled" */
  toBeScheduled?: boolean;
  /** Canonical booking status from the Backend (CONFIRMED, RESCHEDULED, COMPLETED, NO_SHOW_CLIENT…) */
  bookingStatus?: string;
  /** India-time labels from the Backend, e.g. "2026-10-20" and "02:00 PM - 03:00 PM" */
  date?: string | null;
  time?: string | null;
  durationMinutes: number;
  therapistName: string;
  therapistAvatarUrl: string;
  therapistTitle?: string;
  joinUrl?: string | null;
  notes?: string | null;
  clientName?: string;
  clientEmail?: string;
}

export interface ActivityStoreItem {
  id: number | string;
  title: string;
  description: string;
  category: string;
  difficulty: string;
  duration: string;
  dueDate: string;
  imageUrl: string;
  status: "pending" | "completed";
  instructions?: string;
  completedAt?: string | null;
  assignmentId?: string;
  assignedAt?: string | null;
  assignedTo?: string[];
  frequency?: string;
  timeOfDay?: string;
}

export interface MessageItem {
  id: number | string;
  type: string;
  senderRole?: 'client' | 'therapist';
  senderId: number | string;
  senderName: string;
  senderAvatarUrl: string;
  content: string;
  sentAt: string;
  isRead: boolean;
}

export interface AssessmentResult {
  id: number | string;
  type: "GAD-7" | "PHQ-9" | "CBT" | "OQ-45";
  title: string;
  score: number;
  maxScore: number;
  severity: "Minimal" | "Mild" | "Moderate" | "Severe";
  completedAt: string;
  notes?: string;
}

function getUserKey(prefix: string): string {
  const user = getClientAuth();
  const userIdentifier = user?.email || user?.id || "default_client";
  return `${prefix}_${userIdentifier.replace(/[^a-zA-Z0-9_-]/g, "_")}`;
}

// ----------------------------------------------------
// 1. SESSIONS STORE
// ----------------------------------------------------
export function getUserSessions(): SessionItem[] {
  const key = getUserKey("hexpertify_sessions");
  try {
    const data = localStorage.getItem(key);
    if (data) return JSON.parse(data);
  } catch (e) {}

  return [];
}

export async function syncUserSessions(): Promise<SessionItem[]> {
  const key = getUserKey("hexpertify_sessions");
  const user = getClientAuth();
  const clientEmail = (user?.email || "").toLowerCase().trim();
  const clientId = user?.id || "";

  // Only this client's bookings are requested; without an identity there is nothing to fetch
  if (!clientEmail && !clientId) return getUserSessions();
  const query = clientEmail
    ? `clientEmail=${encodeURIComponent(clientEmail)}`
    : `clientId=${encodeURIComponent(String(clientId))}`;

  try {
    const res = await fetch(`/api/bookings?${query}`, { headers: getApiAuthHeaders() });
    // Keep the cached copy only when the server could not be reached or failed
    if (!res.ok) return getUserSessions();
    const data = await res.json();
    const raw = Array.isArray(data?.bookings) ? data.bookings : Array.isArray(data) ? data : [];
    {
      // Matched by the client's email or id only (never by name); sessions the client removed from their list stay hidden
      const matched = raw.filter((b: any) =>
        !b.hiddenByClient && (
          (clientEmail && b.clientEmail && String(b.clientEmail).toLowerCase().trim() === clientEmail) ||
          (clientId && (String(b.clientId || '') === String(clientId) || String(b.userId || '') === String(clientId)))
        )
      );

      const mappedSessions: SessionItem[] = matched.map((b: any) => {
        const bookingStatus = String(b.status || "CONFIRMED").toUpperCase();
        // Website bookings are paid first and scheduled later: no session time yet (never the purchase time)
        const toBeScheduled = !!b.toBeScheduled || (!b.scheduledAt && !b.date);
        const scheduledDate = toBeScheduled
          ? ""
          : b.scheduledAt || (b.date ? `${b.date}T00:00:00+05:30` : "");
        const isCancelled = bookingStatus === "CANCELLED" || bookingStatus === "EXPIRED";
        const isFinished = bookingStatus === "COMPLETED" || bookingStatus === "NO_SHOW_CLIENT" || bookingStatus === "NO_SHOW_CONSULTANT";
        // A session is past once it has ended (start + its length), not a day later
        const durationMinutes = Number(b.durationMinutes || b.duration) || 50;
        const endsAt = scheduledDate ? new Date(scheduledDate).getTime() + durationMinutes * 60000 : NaN;
        const isPast = !isCancelled && (isFinished || (!toBeScheduled && !Number.isNaN(endsAt) && endsAt < Date.now()));

        let therapist = b.consultantName || b.therapistName || "";
        let serviceTitle = b.serviceTitle || "";
        if (therapist.includes(" - By ")) {
          const parts = therapist.split(" - By ");
          serviceTitle = serviceTitle || parts[0].trim();
          therapist = parts[1]?.trim() || therapist;
        }
        if (!therapist) {
          therapist = user?.assignedTherapistName || "Assigned Therapist";
        }

        return {
          id: b.id || String(b._id),
          status: isCancelled ? "cancelled" : isPast ? "past" : "upcoming",
          scheduledAt: scheduledDate,
          toBeScheduled,
          bookingStatus,
          date: b.date || null,
          time: b.time || null,
          durationMinutes: b.durationMinutes || b.duration || 50,
          therapistName: therapist,
          therapistAvatarUrl: b.consultantAvatar || b.therapistAvatar || user?.assignedTherapistPhoto || "",
          therapistTitle: serviceTitle || "Individual Therapy Consultation",
          // Only the real meeting link the therapist or team set; none means "link available soon"
          joinUrl: b.meetingLink || b.meetLink || null,
          notes: b.notes || `Consultation session for ${b.clientName || 'Client'}.`,
          clientName: b.clientName || user?.name || "Client",
          clientEmail: b.clientEmail || clientEmail
        };
      });

      // Soonest upcoming first (unscheduled ones last); past and cancelled newest first
      const timeOf = (s: SessionItem) => (s.scheduledAt ? new Date(s.scheduledAt).getTime() : NaN);
      mappedSessions.sort((x, y) => {
        const a = timeOf(x), c = timeOf(y);
        if (x.status === "upcoming" && y.status === "upcoming") {
          if (Number.isNaN(a)) return Number.isNaN(c) ? 0 : 1;
          if (Number.isNaN(c)) return -1;
          return a - c;
        }
        return (Number.isNaN(c) ? 0 : c) - (Number.isNaN(a) ? 0 : a);
      });

      // The server's list replaces the cached copy, even when it is empty
      const prevStr = localStorage.getItem(key);
      const newStr = JSON.stringify(mappedSessions);
      if (prevStr !== newStr) {
        localStorage.setItem(key, newStr);
        window.dispatchEvent(new Event("client_data_updated"));
      }
      return mappedSessions;
    }
  } catch (e) {}

  return getUserSessions();
}

export function saveUserSessions(sessions: SessionItem[]): void {
  const key = getUserKey("hexpertify_sessions");
  try {
    localStorage.setItem(key, JSON.stringify(sessions));
    window.dispatchEvent(new Event("client_data_updated"));
  } catch (e) {}
}

export function addUserSession(sessionData: Partial<SessionItem>, options: { persist?: boolean } = {}): SessionItem {
  const sessions = getUserSessions();
  const user = getClientAuth();

  let therapist = sessionData.therapistName || "";
  if (therapist.includes(" - By ")) {
    therapist = therapist.split(" - By ").pop()?.trim() || therapist;
  }
  if (!therapist) {
    therapist = user?.assignedTherapistName || "Assigned Therapist";
  }

  const sid = sessionData.id ? String(sessionData.id) : `BK-${Date.now().toString().slice(-6)}`;
  const scheduledTime = sessionData.scheduledAt || new Date(Date.now() + 86400000).toISOString();

  const newSession: SessionItem = {
    id: sid,
    status: sessionData.status || "upcoming",
    scheduledAt: scheduledTime,
    bookingStatus: sessionData.bookingStatus || "CONFIRMED",
    date: sessionData.date || null,
    time: sessionData.time || null,
    durationMinutes: sessionData.durationMinutes || 50,
    therapistName: therapist,
    therapistAvatarUrl: sessionData.therapistAvatarUrl || user?.assignedTherapistPhoto || "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&w=400&q=80",
    therapistTitle: sessionData.therapistTitle || "Mental Health Consultation",
    joinUrl: sessionData.joinUrl || null,
    notes: sessionData.notes || `Virtual appointment booked for ${user?.name || "Client"}.`,
    clientName: user?.name || "Client",
    clientEmail: user?.email || "",
  };

  const updated = [newSession, ...sessions.filter(s => String(s.id) !== String(sid))];
  saveUserSessions(updated);

  // Paid bookings are already stored by the payment service
  if (options.persist === false) return newSession;

  // A booking needs the real consultant id: never a placeholder therapist
  if (!user?.assignedTherapistId) {
    console.warn("[Sessions] No assigned therapist: the session was not saved to the server.");
    return newSession;
  }

  // Persist session to live MongoDB Atlas bookings collection (payment status is set by the server)
  fetch("/api/bookings", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...getApiAuthHeaders() },
    body: JSON.stringify({
      id: sid,
      clientId: user?.id,
      clientName: user?.name || "Client",
      clientEmail: (user?.email || "").toLowerCase(),
      consultantId: user.assignedTherapistId,
      consultantName: therapist,
      consultantAvatar: newSession.therapistAvatarUrl,
      serviceTitle: newSession.therapistTitle,
      scheduledAt: scheduledTime,
      durationMinutes: newSession.durationMinutes,
      status: "CONFIRMED",
      meetingLink: newSession.joinUrl,
    }),
  }).catch(() => {});

  return newSession;
}

export interface SessionChangeResult {
  ok: boolean;
  /** Why the change did not happen, in words for the client */
  error?: string;
}

/** Sends a change of the client's own booking; the list is refreshed from the server only when it succeeds */
async function changeUserSession(sessionId: number | string, body: Record<string, unknown>): Promise<SessionChangeResult> {
  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    return { ok: false, error: "You are offline. Please reconnect and try again." };
  }
  try {
    const res = await fetch(`/api/bookings/${encodeURIComponent(String(sessionId))}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", ...getApiAuthHeaders() },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok || data?.success === false) {
      return { ok: false, error: data?.error || `The change could not be saved (error ${res.status}). Please try again.` };
    }
    await syncUserSessions();
    return { ok: true };
  } catch (e) {
    return { ok: false, error: "Hexpertify could not be reached. Please check your connection and try again." };
  }
}

/** Cancels an upcoming session (the server applies the 3-hour rule) */
export function cancelUserSession(sessionId: number | string): Promise<SessionChangeResult> {
  return changeUserSession(sessionId, { status: "CANCELLED" });
}

/** Moves an upcoming session to another offered slot of the same therapist (no new payment) */
export function rescheduleUserSession(sessionId: number | string, slot: { date: string; time: string }): Promise<SessionChangeResult> {
  return changeUserSession(sessionId, { date: slot.date, time: slot.time });
}

/** Removes a past or cancelled session from this client's list only; the booking itself stays on record */
export function hideUserSession(sessionId: number | string): Promise<SessionChangeResult> {
  return changeUserSession(sessionId, { hiddenByClient: true });
}

/** Releases the slot held for a payment the client did not complete (payment window closed) */
export function releaseUnpaidSession(sessionId: number | string): Promise<SessionChangeResult> {
  return changeUserSession(sessionId, { status: "EXPIRED" });
}

// ----------------------------------------------------
// 2. ACTIVITIES STORE
// Only the activities a therapist assigned to this client (ActivityAssignment records),
// cached per user. Nothing is seeded: a client with no assignments sees an empty list.
// ----------------------------------------------------
const ACTIVITIES_KEY = "hexpertify_assigned_activities";
const COMPLETIONS_KEY = "hexpertify_activity_completions";

/**
 * A localStorage key that belongs to the signed-in client only (their email or id is part of it),
 * so two people using the same device never see each other's saved data.
 */
export function getUserStorageKey(prefix: string): string {
  return getUserKey(prefix);
}

export function getUserActivities(): ActivityStoreItem[] {
  try {
    // Drop the old sample list that used to be seeded for every client
    localStorage.removeItem(getUserKey("hexpertify_activities"));
    const data = localStorage.getItem(getUserKey(ACTIVITIES_KEY));
    if (data) {
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {}
  return [];
}

/** ISO timestamps of every completed assignment (all of them, not just the latest per activity) */
export function getUserActivityCompletions(): string[] {
  try {
    const data = localStorage.getItem(getUserKey(COMPLETIONS_KEY));
    if (data) {
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed)) return parsed.filter((d) => typeof d === "string");
    }
  } catch (e) {}
  return [];
}

export async function syncUserActivities(): Promise<ActivityStoreItem[]> {
  const user = getClientAuth();
  const clientEmail = (user?.email || "").toLowerCase().trim();
  const clientId = String(user?.id || "").trim();
  if (!clientEmail && !clientId) return getUserActivities();

  const query = [
    clientEmail ? `clientEmail=${encodeURIComponent(clientEmail)}` : "",
    clientId ? `clientId=${encodeURIComponent(clientId)}` : "",
  ].filter(Boolean).join("&");

  try {
    const headers = getApiAuthHeaders();
    const [asnRes, actRes] = await Promise.all([
      fetch(`/api/activities/assignments?${query}`, { headers }),
      fetch("/api/activities", { headers }).catch(() => null),
    ]);
    // Keep the cached copy when the server could not be reached or failed
    if (!asnRes.ok) return getUserActivities();
    const asnData = await asnRes.json().catch(() => null);
    const assignments: any[] = Array.isArray(asnData?.assignments) ? asnData.assignments : [];

    // Templates only add details (duration, difficulty…); they never add activities
    const templates = new Map<string, any>();
    if (actRes && actRes.ok) {
      const actData = await actRes.json().catch(() => null);
      const list: any[] = Array.isArray(actData?.activities) ? actData.activities : [];
      list.forEach((t) => templates.set(String(t.id || t._id), t));
    }

    // One row per activity: a pending assignment outranks a completed one, otherwise the newest wins
    const latestByActivity = new Map<string, any>();
    assignments.forEach((asn) => {
      const key = String(asn.activityId);
      const prev = latestByActivity.get(key);
      if (!prev || (prev.status === "completed" && asn.status !== "completed") ||
          (prev.status === asn.status && new Date(asn.assignedAt).getTime() > new Date(prev.assignedAt).getTime())) {
        latestByActivity.set(key, asn);
      }
    });

    const activities: ActivityStoreItem[] = Array.from(latestByActivity.values())
      .sort((a, b) => new Date(b.assignedAt).getTime() - new Date(a.assignedAt).getTime())
      .map((asn) => {
        const t = templates.get(String(asn.activityId)) || {};
        return {
          id: asn.activityId,
          assignmentId: String(asn.id),
          title: t.title || t.name || asn.activityTitle || "Wellness Activity",
          description: t.description || "",
          category: String(t.categoryTag || t.category || "MINDFULNESS").toUpperCase(),
          difficulty: t.difficulty || "Easy",
          duration: t.duration || "10 min",
          dueDate: t.dueDate || "",
          imageUrl: t.imageUrl || t.image || "",
          status: asn.status === "completed" ? "completed" : "pending",
          completedAt: asn.completedAt || null,
          assignedAt: asn.assignedAt || null,
          frequency: asn.frequency || t.frequency || "Daily",
          timeOfDay: asn.timeOfDay || t.timeOfDay || "Any Time",
        };
      });

    const completions = assignments
      .filter((a) => a.status === "completed" && a.completedAt)
      .map((a) => String(a.completedAt));

    localStorage.setItem(getUserKey(ACTIVITIES_KEY), JSON.stringify(activities));
    localStorage.setItem(getUserKey(COMPLETIONS_KEY), JSON.stringify(completions));
    window.dispatchEvent(new Event("client_data_updated"));
    return activities;
  } catch (e) {
    return getUserActivities();
  }
}

// ----------------------------------------------------
// 3. MESSAGES STORE
// ----------------------------------------------------
export function getUserMessages(): MessageItem[] {
  const key = getUserKey("hexpertify_messages");

  try {
    const data = localStorage.getItem(key);
    if (data) {
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed)) {
        // Filter out any stale mock greetings
        const clean = parsed.filter(m => 
          !m.content?.includes('welcome to your personalized care portal') &&
          !m.content?.includes('looking forward to our upcoming consultation session') &&
          !m.content?.includes('grounding exercise has been really helpful')
        );
        return clean;
      }
    }
  } catch (e) {}

  return [];
}

export async function syncUserMessages(): Promise<MessageItem[]> {
  const key = getUserKey("hexpertify_messages");
  const user = getClientAuth();
  const clientName = user?.name || "Client";
  const clientEmail = (user?.email || "").toLowerCase().trim();
  const clientAvatar = user?.avatarUrl || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80";

  if (!clientEmail) return getUserMessages();

  try {
    const res = await fetch(`/api/messages?clientEmail=${encodeURIComponent(clientEmail)}`);
    if (!res.ok) return getUserMessages();
    const data = await res.json();
    if (data?.messages && Array.isArray(data.messages)) {
      const assignedConsultant = data.consultant;
      const mapped: MessageItem[] = data.messages.map((m: any) => {
        const isClient = (
          m.senderRole === 'client' || 
          m.sender === 'client' || 
          m.senderRole === 'user' ||
          m.sender === 'user' ||
          (m.senderEmail && clientEmail && m.senderEmail.toLowerCase().trim() === clientEmail) ||
          (m.senderName && clientName && m.senderName.toLowerCase().trim() === clientName.toLowerCase().trim()) ||
          (m.clientId && user?.id && String(m.clientId) === String(user.id))
        );
        const consultantName = m.consultantName || m.senderName || assignedConsultant?.name || user?.assignedTherapistName || 'Your therapist';
        const consultantAvatar = assignedConsultant?.avatarUrl || user?.assignedTherapistPhoto || 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&w=400&q=80';

        return {
          id: m.id || m._id,
          type: "text",
          senderRole: isClient ? 'client' : 'therapist',
          senderId: isClient ? (user?.id || 'client-1') : (m.consultantId || assignedConsultant?.id || ''),
          senderName: isClient ? clientName : consultantName,
          senderAvatarUrl: isClient ? clientAvatar : consultantAvatar,
          content: m.content || m.text || '',
          sentAt: m.createdAt || m.sentAt || new Date().toISOString(),
          isRead: isClient ? true : Boolean(m.read === true || m.isRead === true)
        };
      });

      const currentStr = localStorage.getItem(key);
      const newStr = JSON.stringify(mapped);
      if (currentStr !== newStr) {
        localStorage.setItem(key, newStr);
        window.dispatchEvent(new Event("client_data_updated"));
        return mapped;
      }
    }
  } catch (e) {}

  return getUserMessages();
}

export function saveUserMessages(messages: MessageItem[]): void {
  const key = getUserKey("hexpertify_messages");
  try {
    localStorage.setItem(key, JSON.stringify(messages));
    window.dispatchEvent(new Event("client_data_updated"));
  } catch (e) {}
}

export function markUserMessagesRead(consultantId?: string): void {
  const messages = getUserMessages();
  const user = getClientAuth();
  const clientEmail = (user?.email || "").toLowerCase().trim();
  const clientId = user?.id || "";
  const docId = consultantId || user?.assignedTherapistId || "";

  let hasUnread = false;
  const updated = messages.map(m => {
    if (!m.isRead) {
      hasUnread = true;
      return { ...m, isRead: true };
    }
    return m;
  });

  if (hasUnread) {
    saveUserMessages(updated);
  }

  // Persist mark-as-read to backend MongoDB Atlas
  fetch('/api/messages/read', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      clientEmail,
      clientId,
      consultantId: docId,
      readerRole: 'client'
    })
  }).catch(() => {});
}

export interface SendMessageResult {
  ok: boolean;
  /** The message as the server stored it (only when ok) */
  message?: MessageItem;
  /** Why it was not sent, in words for the client */
  error?: string;
}

/**
 * Sends a message to the client's therapist. It is added to the cached conversation only after the
 * server stored it, so a failed or offline send is never shown as delivered.
 */
export async function sendUserMessage(content: string, consultantInfo?: { consultantId?: string; consultantName?: string; consultantEmail?: string }): Promise<SendMessageResult> {
  const user = getClientAuth();
  const clientName = user?.name || "Client";
  const clientEmail = (user?.email || "").toLowerCase();
  const clientAvatar = user?.avatarUrl || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80";

  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    return { ok: false, error: "You are offline. Reconnect to the internet and press Retry." };
  }

  try {
    const res = await fetch('/api/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        senderRole: 'client',
        senderName: clientName,
        senderEmail: clientEmail,
        clientName: clientName,
        clientEmail: clientEmail,
        clientId: user?.id || '',
        consultantId: consultantInfo?.consultantId || user?.assignedTherapistId || '',
        consultantName: consultantInfo?.consultantName || user?.assignedTherapistName || '',
        consultantEmail: consultantInfo?.consultantEmail || '',
        content
      })
    });
    const data = await res.json().catch(() => null);
    if (!res.ok || data?.success === false) {
      return { ok: false, error: data?.error || `The message could not be sent (error ${res.status}). Please press Retry.` };
    }

    const saved = data?.message || {};
    const newMsg: MessageItem = {
      id: saved.id || saved._id || Date.now(),
      type: "text",
      senderRole: 'client',
      senderId: user?.id || "client-1",
      senderName: clientName,
      senderAvatarUrl: clientAvatar,
      content,
      sentAt: saved.createdAt ? new Date(saved.createdAt).toISOString() : new Date().toISOString(),
      isRead: true,
    };
    const messages = getUserMessages();
    if (!messages.some((m) => String(m.id) === String(newMsg.id))) {
      saveUserMessages([...messages, newMsg]);
    }
    return { ok: true, message: newMsg };
  } catch (e) {
    return { ok: false, error: "Hexpertify could not be reached. Check your connection and press Retry." };
  }
}

// ----------------------------------------------------
// 4. ASSESSMENTS STORE
// ----------------------------------------------------
export function getUserAssessments(): AssessmentResult[] {
  const key = getUserKey("hexpertify_assessments");
  try {
    const data = localStorage.getItem(key);
    if (data) {
      const parsed = JSON.parse(data);
      // Drop the sample scores that used to be seeded for every client (ids 1 and 2)
      if (Array.isArray(parsed)) return parsed.filter((a) => a && a.id !== 1 && a.id !== 2);
    }
  } catch (e) {}
  // Nothing is seeded: a client who has not taken an assessment has no scores
  return [];
}

export function saveUserAssessments(assessments: AssessmentResult[]): void {
  const key = getUserKey("hexpertify_assessments");
  try {
    localStorage.setItem(key, JSON.stringify(assessments));
    window.dispatchEvent(new Event("client_data_updated"));
  } catch (e) {}
}

export interface SaveScoreResult {
  ok: boolean;
  result?: AssessmentResult;
  /** Why the score did not reach the therapist, in words for the client */
  error?: string;
}

/** Saves a score on the server (which notifies the therapist); it is cached locally only once the server confirmed it */
export async function saveUserAssessmentScore(result: Omit<AssessmentResult, "id" | "completedAt">): Promise<SaveScoreResult> {
  const user = getClientAuth();
  const newAssessment: AssessmentResult = {
    ...result,
    id: Date.now(),
    completedAt: new Date().toISOString(),
  };

  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    return { ok: false, error: "You are offline, so your result was not sent to your therapist. Reconnect and try again." };
  }

  let res: Response;
  try {
    res = await fetch('/api/assessments/score', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: result.type,
        assessmentAcronym: result.type,
        title: result.title,
        assessmentTitle: result.title,
        score: result.score,
        totalScore: result.score,
        maxScore: result.maxScore,
        severity: result.severity,
        severityLabel: result.severity,
        clientId: user?.id || '',
        clientName: user?.name || 'Client',
        clientEmail: user?.email || '',
        consultantId: user?.assignedTherapistId || '',
        consultantName: user?.assignedTherapistName || '',
        notes: result.notes || `Completed ${result.type} assessment.`
      })
    });
  } catch (e) {
    return { ok: false, error: "Hexpertify could not be reached, so your result was not sent to your therapist. Check your connection and try again." };
  }
  const data = await res.json().catch(() => null);
  if (!res.ok || data?.success === false) {
    return { ok: false, error: data?.error || `Your result could not be sent to your therapist (error ${res.status}). Please try again.` };
  }

  saveUserAssessments([newAssessment, ...getUserAssessments()]);
  return { ok: true, result: newAssessment };
}
