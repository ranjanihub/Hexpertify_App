/**
 * Signed API token issued by the backend at login, shared by every panel on this origin.
 * The backend uses it to decide who may see a client's full record (only their assigned therapist).
 *
 * Keep in sync with the copies in the Client and Super Admin panels.
 */
const API_TOKEN_KEY = "hexpertify_api_token";

export function setApiToken(token?: string | null): void {
  try {
    if (token) localStorage.setItem(API_TOKEN_KEY, token);
    else localStorage.removeItem(API_TOKEN_KEY);
  } catch {}
}

export function getApiToken(): string | null {
  try {
    return localStorage.getItem(API_TOKEN_KEY);
  } catch {
    return null;
  }
}

/** Adds the API token to every same-origin /api request that doesn't set its own Authorization header */
export function installApiAuthFetch(): void {
  const w = window as any;
  if (w.__hexpertifyApiAuth) return;
  w.__hexpertifyApiAuth = true;

  const nativeFetch = window.fetch.bind(window);

  // A request sent with the token was refused: ask the server whether the sign-in itself has ended (expired
  // or revoked). Only then is "hexpertify_session_expired" raised; other refusals are left to the page.
  // One check at a time, so a burst of 401s makes a single whoami call.
  let checking: Promise<void> | null = null;
  const confirmSessionStillValid = (token: string) => {
    if (checking) return;
    checking = nativeFetch("/api/auth/whoami", { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" })
      .then((res) => {
        if (res.status === 401 && localStorage.getItem(API_TOKEN_KEY) === token) {
          window.dispatchEvent(new Event("hexpertify_session_expired"));
        }
      })
      .catch(() => {})
      .finally(() => {
        checking = null;
      });
  };

  window.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
    try {
      const token = localStorage.getItem(API_TOKEN_KEY);
      const rawUrl = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
      const url = new URL(rawUrl, window.location.href);
      if (token && url.origin === window.location.origin && url.pathname.startsWith("/api/")) {
        const headers = new Headers(init?.headers ?? (input instanceof Request ? input.headers : undefined));
        if (!headers.has("Authorization")) headers.set("Authorization", `Bearer ${token}`);
        const sentToken = headers.get("Authorization") === `Bearer ${token}`;
        return nativeFetch(input, { ...init, headers }).then((res) => {
          if (res.status === 401 && sentToken && url.pathname !== "/api/auth/whoami") confirmSessionStillValid(token);
          return res;
        });
      }
    } catch {}
    return nativeFetch(input, init);
  };
}
