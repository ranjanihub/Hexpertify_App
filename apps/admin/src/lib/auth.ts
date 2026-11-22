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

/** True only when the server accepts the stored token as an admin's (not forged, not expired) */
export async function verifyAdminSession(): Promise<boolean> {
  try {
    const res = await fetch("/api/auth/whoami", { headers: getApiAuthHeaders(), cache: "no-store" });
    if (!res.ok) return false;
    const data = await res.json().catch(() => null);
    const role = data?.user?.role;
    return role === "super_admin" || role === "admin";
  } catch (e) {
    return false;
  }
}

/** Forget the local sign-in (used when the server rejects the token) */
export function clearAdminAuth(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(API_TOKEN_KEY);
  } catch (e) {}
}

export function logoutAdmin(): void {
  try {
    localStorage.setItem(STORAGE_KEY, 'logged_out');
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(API_TOKEN_KEY);
    window.dispatchEvent(new Event("auth_state_change"));
    fetch('http://localhost:5000/api/auth/logout', { method: 'POST' }).catch(() => {
      fetch('/api/auth/logout', { method: 'POST' }).catch(() => {});
    });
  } catch (e) {}
}

/**
 * Generates a signed cryptographic SSO launch URL and opens target workspace in new tab or current window
 */
export async function launchConsultantPanel(targetUser: any, newTab: boolean = true): Promise<void> {
  const isSinglePort = window.location.pathname.startsWith('/admin') || window.location.port === '5000';
  const targetBaseUrl = isSinglePort ? '/consultant' : 'http://localhost:5000';
  let targetUrl = `${targetBaseUrl}/?sso_user=${encodeURIComponent(JSON.stringify(targetUser))}`;

  try {
    const apiEndpoints = ['http://localhost:5000/api/auth/sso-ticket', '/api/auth/sso-ticket'];
    let res: Response | null = null;

    for (const endpoint of apiEndpoints) {
      try {
        const r = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ user: targetUser, targetRole: 'therapist' }),
          signal: AbortSignal.timeout(600)
        });
        if (r && r.ok) {
          res = r;
          break;
        }
      } catch {}
    }

    if (res && res.ok) {
      const data = await res.json();
      if (data?.ticket) {
        targetUrl = `${targetBaseUrl}/?sso_ticket=${encodeURIComponent(data.ticket)}&sso_user=${encodeURIComponent(JSON.stringify(targetUser))}`;
      }
    }
  } catch (e) {}

  if (newTab) {
    window.open(targetUrl, '_blank');
  } else {
    window.location.href = targetUrl;
  }
}

/**
 * Generates a signed cryptographic SSO launch URL and opens Client Portal
 */
export async function launchClientPanel(targetUser: any, newTab: boolean = true): Promise<void> {
  const isSinglePort = window.location.pathname.startsWith('/admin') || window.location.port === '5000';
  const targetBaseUrl = isSinglePort ? '/client' : 'http://localhost:5000';
  let targetUrl = `${targetBaseUrl}/?sso_user=${encodeURIComponent(JSON.stringify(targetUser))}`;

  try {
    const apiEndpoints = ['http://localhost:5000/api/auth/sso-ticket', '/api/auth/sso-ticket'];
    let res: Response | null = null;

    for (const endpoint of apiEndpoints) {
      try {
        const r = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ user: targetUser, targetRole: 'client' }),
          signal: AbortSignal.timeout(600)
        });
        if (r && r.ok) {
          res = r;
          break;
        }
      } catch {}
    }

    if (res && res.ok) {
      const data = await res.json();
      if (data?.ticket) {
        targetUrl = `${targetBaseUrl}/?sso_ticket=${encodeURIComponent(data.ticket)}&sso_user=${encodeURIComponent(JSON.stringify(targetUser))}`;
      }
    }
  } catch (e) {}

  if (newTab) {
    window.open(targetUrl, '_blank');
  } else {
    window.location.href = targetUrl;
  }
}
