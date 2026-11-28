/**
 * Adds the backend-signed API token (stored by setApiToken in ./auth) to every same-origin /api
 * request that doesn't set its own Authorization header. The backend uses it to decide who may
 * see a client's full record (only their assigned therapist).
 *
 * When a request sent with the token is refused (401), the server is asked whether the sign-in itself has
 * ended (expired, or the admin account was switched off); only then "hexpertify_session_expired" is raised
 * and the panel signs out (see App.tsx). Other refusals are left to the page.
 *
 * Keep in sync with the copies in the Client and Consultant panels.
 */
const API_TOKEN_KEY = "hexpertify_api_token";

export function installApiAuthFetch(): void {
  const w = window as any;
  if (w.__hexpertifyApiAuth) return;
  w.__hexpertifyApiAuth = true;

  const nativeFetch = window.fetch.bind(window);

  // One check at a time, so a burst of 401s makes a single whoami call
  let checking: Promise<void> | null = null;
  const confirmSessionStillValid = (token: string) => {
    if (checking) return;
    checking = nativeFetch("/api/auth/whoami", { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" })
      .then((res) => {
        if ((res.status === 401 || res.status === 403) && localStorage.getItem(API_TOKEN_KEY) === token) {
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
