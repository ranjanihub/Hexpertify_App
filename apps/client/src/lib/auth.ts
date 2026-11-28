export interface ClientAuthUser {
  id: string;
  name: string;
  email: string;
  role: "client" | "therapist" | "admin";
  avatarUrl?: string;
  phone?: string;
  age?: number | string;
  gender?: string;
  preferredLanguage?: string;
  assignedTherapistId?: string;
  assignedTherapistName?: string;
  assignedTherapistPhoto?: string;
  assignedTherapistEmail?: string;
  assignedTherapistProfession?: string;
  firstConsultationCompleted?: boolean;
  goals?: Array<{
    id: string | number;
    title: string;
    targetDate?: string;
    status?: string;
    progress?: number;
    current?: number;
    total?: number;
    color?: string;
  }>;
  therapyGoals?: string[];
  assessmentScores?: Array<{
    name: string;
    score: number;
    maxScore: number;
    date: string;
    severity?: string;
  }>;
  moodScores?: Array<{
    date: string;
    score: number;
  }>;
  moodLogs?: Array<{
    date: string;
    mood: string;
    score: number;
    notes?: string;
  }>;
  homework?: Array<{
    title: string;
    dueDate?: string;
    status?: string;
    completed?: boolean;
  }>;
  homeworkAssigned?: Array<{
    title: string;
    dueDate?: string;
    completed?: boolean;
  }>;
  sessionHistory?: Array<{
    id: string;
    date: string;
    summary: string;
    therapistNotes?: string;
  }>;
  primaryGoal?: string;
  totalSessionsCount?: number;
  completedSessionsCount?: number;
}

export interface ConsultantAuthUser {
  id: string;
  name: string;
  title?: string;
  email: string;
  role: "therapist";
  avatarInitials?: string;
  photoUrl?: string;
}

export interface AdminAuthUser {
  id: string;
  name: string;
  email: string;
  role: "super_admin" | "admin";
  avatarUrl?: string;
}

export const DEFAULT_CONSULTANT: ConsultantAuthUser = {
  id: "doc-1",
  name: "Dr. Evelyn Reed, PhD",
  title: "Licensed Psychologist",
  email: "dr.evelyn@hexpertify.com",
  role: "therapist",
  avatarInitials: "ER",
  photoUrl: "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&w=400&q=80",
};

export const DEFAULT_ADMIN: AdminAuthUser = {
  id: "admin-1",
  name: "Super Administrator",
  email: "admin@example.com",
  role: "super_admin",
  avatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100",
};

const CLIENT_STORAGE_KEY = "hexpertify_client_auth";
const CONSULTANT_STORAGE_KEY = "hexpertify_auth_user";
const ADMIN_STORAGE_KEY = "hexpertify_admin_auth";

/** Removes the given parameters from the address bar */
function stripParams(...names: string[]): void {
  try {
    const url = new URL(window.location.href);
    if (!names.some((n) => url.searchParams.has(n))) return;
    names.forEach((n) => url.searchParams.delete(n));
    window.history.replaceState({}, document.title, url.pathname + url.search);
  } catch (e) {}
}

/**
 * A user in the address (?sso_user=… / ?sso=…) is never trusted: anyone can type it. It is only removed.
 * Signing in happens through a signed ?sso_ticket=, which redeemSsoTicket() checks with the server.
 */
function checkSsoTransfer(): null {
  stripParams("sso_user", "sso");
  return null;
}

let ssoRedeem: Promise<boolean> | null = null;

/**
 * Exchanges a signed single-use ?sso_ticket= (from the sign-in redirect or an admin "Launch" button) for the
 * account and API token, using only this site's server. Stores them under the role the server confirms.
 * Resolves true when a ticket was redeemed; runs once per page load.
 */
export function redeemSsoTicket(): Promise<boolean> {
  if (ssoRedeem) return ssoRedeem;
  ssoRedeem = (async () => {
    const ticket = new URLSearchParams(window.location.search).get("sso_ticket");
    checkSsoTransfer();
    if (!ticket) return false;
    stripParams("sso_ticket", "google_auth");
    try {
      const res = await fetch("/api/auth/sso-verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticket }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success || !data?.user || !data?.token) return false;
      setApiToken(data.token);
      const user = data.user;
      if (user.role === "therapist") {
        localStorage.removeItem(CLIENT_STORAGE_KEY);
        localStorage.removeItem(ADMIN_STORAGE_KEY);
        localStorage.setItem(CONSULTANT_STORAGE_KEY, JSON.stringify(user));
      } else if (user.role === "super_admin" || user.role === "admin") {
        localStorage.removeItem(CLIENT_STORAGE_KEY);
        localStorage.removeItem(CONSULTANT_STORAGE_KEY);
        localStorage.setItem(ADMIN_STORAGE_KEY, JSON.stringify(user));
      } else {
        localStorage.removeItem(CONSULTANT_STORAGE_KEY);
        localStorage.removeItem(ADMIN_STORAGE_KEY);
        localStorage.setItem(CLIENT_STORAGE_KEY, JSON.stringify(user));
      }
      return true;
    } catch (e) {
      return false;
    }
  })();
  return ssoRedeem;
}

/**
 * Checks the stored API token with the server. "ok": signed in with one of `roles`; "invalid": no token,
 * a forged or expired one, or another role; "error": the check itself could not be made (network, server).
 */
export async function verifyApiSession(roles: string[]): Promise<"ok" | "invalid" | "error"> {
  const headers = getApiAuthHeaders();
  if (!headers.Authorization) return "invalid";
  try {
    const res = await fetch("/api/auth/whoami", { headers, cache: "no-store" });
    if (res.status === 401 || res.status === 403) return "invalid";
    if (!res.ok) return "error";
    const data = await res.json().catch(() => null);
    return roles.includes(String(data?.user?.role || "")) ? "ok" : "invalid";
  } catch (e) {
    return "error";
  }
}

// ── Client Auth ──
export function getClientAuth(): ClientAuthUser | null {
  try {
    checkSsoTransfer();
    const data = localStorage.getItem(CLIENT_STORAGE_KEY);
    if (!data) return null;
    return JSON.parse(data);
  } catch (e) {
    return null;
  }
}

export function setClientAuth(user: ClientAuthUser, emitEvent = true): void {
  try {
    const prev = localStorage.getItem(CLIENT_STORAGE_KEY);
    const next = JSON.stringify(user);
    if (prev === next) return;

    localStorage.removeItem(ADMIN_STORAGE_KEY);
    localStorage.removeItem("admin_user");
    localStorage.removeItem("hexpertify_admin_token");
    localStorage.removeItem(CONSULTANT_STORAGE_KEY);
    localStorage.removeItem("consultant_token");
    localStorage.setItem(CLIENT_STORAGE_KEY, next);
    if (emitEvent) {
      window.dispatchEvent(new Event("auth_state_change"));
    }
  } catch (e) {}
}

export function isClientAuthenticated(): boolean {
  try {
    checkSsoTransfer();
    const data = localStorage.getItem(CLIENT_STORAGE_KEY);
    return !!data;
  } catch (e) {
    return false;
  }
}

/** Device settings that are not about the person signed in, so they survive a sign-out */
const DEVICE_KEYS = new Set(["hexpertify_push_banner_dismissed_at"]);
/** Older keys from earlier panel versions that also hold a client's data */
const LEGACY_CLIENT_KEYS = ["completed_activities_log", "therapist_switch_requests", "admin_notifications", "client_token", "client_user", "consultant_token", "admin_user"];

/**
 * Signs the client out of this device: ends the server session, stops booking notifications to this
 * device, and removes every cached copy of the client's data (sessions, messages, answers, resources), so
 * the next person on a shared device sees nothing of theirs.
 */
export function logoutClient(): void {
  try {
    const token = localStorage.getItem(API_TOKEN_KEY);
    fetch("/api/auth/logout", { method: "POST", headers: token ? { Authorization: `Bearer ${token}` } : {} }).catch(() => {});
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.getRegistration()
        .then((reg) => reg?.pushManager.getSubscription())
        .then((sub) => {
          if (!sub) return;
          fetch("/api/push/unsubscribe", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ endpoint: sub.endpoint }),
          }).catch(() => {});
          return sub.unsubscribe();
        })
        .catch(() => {});
    }
    for (const key of Object.keys(localStorage)) {
      if ((key.startsWith("hexpertify_") && !DEVICE_KEYS.has(key)) || LEGACY_CLIENT_KEYS.includes(key)) {
        localStorage.removeItem(key);
      }
    }
    try {
      sessionStorage.clear();
    } catch (e) {}
    window.dispatchEvent(new Event("auth_state_change"));
  } catch (e) {}
}

// ── Consultant / Therapist Auth ──
export function getAuthUser(): ConsultantAuthUser | null {
  try {
    checkSsoTransfer();
    // Nobody signed in as a consultant: no user (never a placeholder therapist)
    const data = localStorage.getItem(CONSULTANT_STORAGE_KEY);
    if (!data) return null;
    return JSON.parse(data);
  } catch (e) {
    return null;
  }
}

export function setAuthUser(user: ConsultantAuthUser): void {
  try {
    localStorage.setItem(CONSULTANT_STORAGE_KEY, JSON.stringify(user));
    window.dispatchEvent(new Event("auth_state_change"));
  } catch (e) {}
}

export function isAuthenticated(): boolean {
  try {
    checkSsoTransfer();
    const data = localStorage.getItem(CONSULTANT_STORAGE_KEY);
    return !!data;
  } catch (e) {
    return false;
  }
}

export function logoutUser(): void {
  try {
    localStorage.removeItem(CONSULTANT_STORAGE_KEY);
    localStorage.removeItem(ADMIN_STORAGE_KEY);
    window.dispatchEvent(new Event("auth_state_change"));
    fetch('/api/auth/logout', { method: 'POST' }).catch(() => {});
  } catch (e) {}
}

// ── Super Admin Auth ──
export function getAdminAuth(): AdminAuthUser | null {
  try {
    checkSsoTransfer();
    const data = localStorage.getItem(ADMIN_STORAGE_KEY);
    if (!data) return null;
    return JSON.parse(data);
  } catch (e) {
    return null;
  }
}

export function setAdminAuth(user: AdminAuthUser): void {
  try {
    localStorage.removeItem(CLIENT_STORAGE_KEY);
    localStorage.removeItem(CONSULTANT_STORAGE_KEY);
    localStorage.setItem(ADMIN_STORAGE_KEY, JSON.stringify(user));
    window.dispatchEvent(new Event("auth_state_change"));
  } catch (e) {}
}

export function isAdminAuthenticated(): boolean {
  try {
    checkSsoTransfer();
    const data = localStorage.getItem(ADMIN_STORAGE_KEY);
    if (!data || data === 'logged_out') return false;
    const parsed = JSON.parse(data);
    return parsed?.role === "super_admin" || parsed?.role === "admin";
  } catch (e) {
    return false;
  }
}

export function logoutAdmin(): void {
  try {
    localStorage.removeItem(ADMIN_STORAGE_KEY);
    window.dispatchEvent(new Event("auth_state_change"));
  } catch (e) {}
}

// ── API Token (signed by the backend at login, shared by all panels on this origin) ──
const API_TOKEN_KEY = "hexpertify_api_token";

export function setApiToken(token?: string | null): void {
  try {
    if (token) localStorage.setItem(API_TOKEN_KEY, token);
    else localStorage.removeItem(API_TOKEN_KEY);
  } catch (e) {}
}

export function getApiAuthHeaders(): Record<string, string> {
  try {
    const token = localStorage.getItem(API_TOKEN_KEY);
    return token ? { Authorization: `Bearer ${token}` } : {};
  } catch (e) {
    return {};
  }
}

// ── Global Sign Out ──
export function logoutAll(): void {
  try {
    localStorage.removeItem(CLIENT_STORAGE_KEY);
    localStorage.removeItem(CONSULTANT_STORAGE_KEY);
    localStorage.removeItem(ADMIN_STORAGE_KEY);
    localStorage.removeItem(API_TOKEN_KEY);
    window.dispatchEvent(new Event("auth_state_change"));
  } catch (e) {}
}
