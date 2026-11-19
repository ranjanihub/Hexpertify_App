/**
 * Sends a signed-in user from the live site to their panel (client / consultant / admin).
 *
 * The full user record (mood logs, session history, base64 photos) is far too large for a URL
 * and makes Vercel reject the request with URI_TOO_LONG. Panels served from this origin read the
 * session from localStorage, so it is handed over there; other origins get a compact profile.
 */

const STORAGE_KEYS = {
  client: "hexpertify_client_auth",
  therapist: "hexpertify_auth_user",
  admin: "hexpertify_admin_auth",
} as const;
const API_TOKEN_KEY = "hexpertify_api_token";

type AuthResponse = { user?: any; role?: string; ssoTicket?: string; token?: string };

function storageKeyFor(role?: string): string {
  if (role === "super_admin" || role === "admin") return STORAGE_KEYS.admin;
  if (role === "therapist") return STORAGE_KEYS.therapist;
  return STORAGE_KEYS.client;
}

/** Short scalar fields only: no arrays, no data: URLs */
function compactUser(user: any): Record<string, string> {
  const compact: Record<string, string> = {};
  for (const [key, value] of Object.entries(user || {})) {
    if (typeof value !== "string" && typeof value !== "number" && typeof value !== "boolean") continue;
    const str = String(value);
    if (str.startsWith("data:") || str.length > 300) continue;
    compact[key] = str;
  }
  return compact;
}

export function redirectToPanel(targetUrl: string, data: AuthResponse): void {
  const url = new URL(targetUrl, window.location.href);
  const role = data.role || data.user?.role;

  if (url.origin === window.location.origin) {
    try {
      const key = storageKeyFor(role);
      for (const other of Object.values(STORAGE_KEYS)) {
        if (other !== key) localStorage.removeItem(other);
      }
      localStorage.setItem(key, JSON.stringify({ ...data.user, role }));
      if (data.token) localStorage.setItem(API_TOKEN_KEY, data.token);
      else localStorage.removeItem(API_TOKEN_KEY);
      window.location.href = url.toString();
      return;
    } catch {
      // Storage unavailable (private mode): fall back to URL hand-off below
    }
  }

  url.searchParams.set("sso_user", JSON.stringify({ ...compactUser(data.user), role }));
  if (data.ssoTicket) url.searchParams.set("sso_ticket", data.ssoTicket);
  window.location.href = url.toString();
}
