/**
 * Adds the backend-signed API token (stored by setApiToken in ./auth) to every same-origin /api
 * request that doesn't set its own Authorization header. The backend uses it to decide who may
 * see a client's full record (only their assigned therapist).
 *
 * Keep in sync with the copies in the Client and Consultant panels.
 */
const API_TOKEN_KEY = "hexpertify_api_token";

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
