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

/** Adds the API token to every same-origin /api request that doesn't set its own Authorization header */
export function installApiAuthFetch(): void {
  const w = window as any;
  if (w.__hexpertifyApiAuth) return;
  w.__hexpertifyApiAuth = true;

  const nativeFetch = window.fetch.bind(window);
  window.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
    try {
      const token = localStorage.getItem(API_TOKEN_KEY);
      const rawUrl = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
      const url = new URL(rawUrl, window.location.href);
      if (token && url.origin === window.location.origin && url.pathname.startsWith("/api/")) {
        const headers = new Headers(init?.headers ?? (input instanceof Request ? input.headers : undefined));
        if (!headers.has("Authorization")) {
          headers.set("Authorization", `Bearer ${token}`);
          return nativeFetch(input, { ...init, headers });
        }
      }
    } catch {}
    return nativeFetch(input, init);
  };
}
