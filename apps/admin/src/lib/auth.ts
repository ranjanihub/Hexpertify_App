export interface AdminAuthUser {
  id: string;
  name: string;
  email: string;
  role: "super_admin" | "admin" | "therapist" | "client";
  avatarUrl?: string;
}

const STORAGE_KEY = "hexpertify_admin_auth";
// Signed API token issued by the backend at login (shared with the central login page on the same origin)
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
    return token ? { Authorization: 'Bearer ' + token } : {};
  } catch (e) {
    return {};
  }
}

/**
 * Old links could carry a user in the address (?sso_user=…). That is never trusted: anyone can type it.
 * It is only removed from the address bar. Admins sign in on /login, which stores a signed API token.
 */
function stripSsoParams(): void {
  try {
    const url = new URL(window.location.href);
    if (!url.searchParams.has("sso_user") && !url.searchParams.has("sso")) return;
    url.searchParams.delete("sso_user");
    url.searchParams.delete("sso");
    window.history.replaceState({}, document.title, url.pathname + url.search);
  } catch (e) {}
}

export function getAdminAuth(): AdminAuthUser | null {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data || data === "logged_out") return null;
    return JSON.parse(data);
  } catch (e) {
    return null;
  }
}

export function setAdminAuth(user: AdminAuthUser): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
    window.dispatchEvent(new Event("auth_state_change"));
  } catch (e) {}
}

/**
 * Quick local check before anything renders: a stored admin user and a signed API token from /login.
 * It never signs anyone in by itself; verifyAdminSession asks the server whether the token is real.
 */
export function isAdminAuthenticated(): boolean {
  stripSsoParams();
  try {
    const user = getAdminAuth();
    const hasToken = Boolean(localStorage.getItem(API_TOKEN_KEY));
    return hasToken && (user?.role === "super_admin" || user?.role === "admin");
  } catch (e) {
    return false;
  }
}

/**
 * Checks the stored token with the server. "ok": a signed-in, active administrator; "invalid": no token, a forged
 * or expired one, another role, or an admin account switched off; "error": the check itself could not be made
 * (offline, server down), which is not a reason to sign out.
 */
export async function checkAdminSession(): Promise<"ok" | "invalid" | "error"> {
  let token: string | null = null;
  try {
    token = localStorage.getItem(API_TOKEN_KEY);
  } catch (e) {}
  if (!token) return "invalid";
  try {
    const res = await fetch("/api/auth/whoami", { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
    if (res.status === 401 || res.status === 403) return "invalid";
    if (!res.ok) return "error";
    const data = await res.json().catch(() => null);
    const role = data?.user?.role;
    return role === "super_admin" || role === "admin" ? "ok" : "invalid";
  } catch (e) {
    return "error";
  }
}

/** True only when the server accepts the stored token as an active admin's */
export async function verifyAdminSession(): Promise<boolean> {
  return (await checkAdminSession()) === "ok";
}

/** Every key the admin panel keeps in this browser (sign-in, cached lists with client data, drafts) */
function removeAdminStorage(): void {
  try {
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith("hexpertify_admin")) keys.push(key);
    }
    keys.forEach((key) => localStorage.removeItem(key));
    localStorage.removeItem(API_TOKEN_KEY);
    // Written by the login page next to the admin sign-in
    localStorage.removeItem("admin_user");
  } catch (e) {}
  try {
    const keys: string[] = [];
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      if (key && key.startsWith("hexpertify_admin")) keys.push(key);
    }
    keys.forEach((key) => sessionStorage.removeItem(key));
  } catch (e) {}
}

/** Forget the local sign-in and everything cached with it (used when the server rejects the token) */
export function clearAdminAuth(): void {
  removeAdminStorage();
}

/**
 * Signs out in this browser: removes the token and every hexpertify_admin_* key (the cached lists hold client
 * data). The API token is stateless (a signed token that expires after 12 hours), so the server call only
 * tidies up; it can't revoke a copied token before it expires.
 */
export function logoutAdmin(): void {
  let token: string | null = null;
  try {
    token = localStorage.getItem(API_TOKEN_KEY);
  } catch (e) {}
  removeAdminStorage();
  try {
    window.dispatchEvent(new Event("auth_state_change"));
  } catch (e) {}
  fetch("/api/auth/logout", {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    keepalive: true
  }).catch(() => {});
}

/** Where to go after signing in again: the admin page that was open (kept for this tab only) */
const RETURN_KEY = "hexpertify_return_admin";

export function rememberAdminReturnPath(path: string): void {
  try {
    if (path && path !== "/" && !path.startsWith("/login")) {
      sessionStorage.setItem(RETURN_KEY, JSON.stringify({ path, at: Date.now() }));
    }
  } catch (e) {}
}

/** The remembered page (once), if it was saved in the last 30 minutes */
export function takeAdminReturnPath(): string | null {
  try {
    const raw = sessionStorage.getItem(RETURN_KEY);
    sessionStorage.removeItem(RETURN_KEY);
    if (!raw) return null;
    const { path, at } = JSON.parse(raw);
    if (typeof path !== "string" || !path.startsWith("/") || path.startsWith("//")) return null;
    return Date.now() - Number(at) < 30 * 60_000 ? path : null;
  } catch (e) {
    return null;
  }
}

/** The signed-in admin's own photo; the stock placeholder the sign-in once filled in is not a photo of them */
export function adminAvatarUrl(): string | undefined {
  const url = getAdminAuth()?.avatarUrl;
  if (!url || /images\.unsplash\.com\/photo-1534528741775/.test(url)) return undefined;
  return url;
}

/** Initials for the avatar placeholder ("HX" for "Hexpertify", "AB" for "Asha Bose") */
export function adminInitials(): string {
  const a = getAdminAuth();
  const source = (a?.name || a?.email || "Admin").trim();
  const parts = source.split(/[\s@._-]+/).filter(Boolean);
  const letters = parts.length > 1 ? parts[0][0] + parts[1][0] : source.slice(0, 2);
  return letters.toUpperCase();
}

/**
 * Opens the therapist or client panel as that account. The server issues a signed single-use ticket only to a
 * signed-in admin, and builds it from the account stored in the database; the panel redeems it for its own
 * API token. Only the ticket travels in the address (no user details).
 */
async function launchPanel(targetUser: any, targetRole: 'therapist' | 'client', newTab: boolean): Promise<void> {
  const label = targetRole === 'therapist' ? 'the Consultant Suite' : 'the Client Portal';
  try {
    const res = await fetch('/api/auth/sso-ticket', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getApiAuthHeaders() },
      body: JSON.stringify({ user: { id: targetUser?.id, email: targetUser?.email }, targetRole })
    });
    const data = await res.json().catch(() => null);
    if (!res.ok || !data?.ticket) {
      throw new Error(data?.error || `The server refused the request (HTTP ${res.status}).`);
    }
    const targetUrl = `/${targetRole === 'therapist' ? 'consultant' : 'client'}/?sso_ticket=${encodeURIComponent(data.ticket)}`;
    if (newTab) window.open(targetUrl, '_blank');
    else window.location.href = targetUrl;
  } catch (err: any) {
    window.alert(`Could not open ${label} for ${targetUser?.name || targetUser?.email || 'this account'}: ${err?.message || 'request failed'}`);
  }
}

export function launchConsultantPanel(targetUser: any, newTab: boolean = true): Promise<void> {
  return launchPanel(targetUser, 'therapist', newTab);
}

export function launchClientPanel(targetUser: any, newTab: boolean = true): Promise<void> {
  return launchPanel(targetUser, 'client', newTab);
}
