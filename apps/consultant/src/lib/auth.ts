import { getApiToken, setApiToken } from "./api-auth";

export interface AuthUser {
  id: string;
  name: string;
  title: string;
  profession?: string;
  email: string;
  role: "therapist" | "admin" | "client";
  avatarInitials: string;
  photoUrl?: string;
  image?: string;
  avatarUrl?: string;
}


const STORAGE_KEY = "hexpertify_auth_user";

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
 * A therapist in the address (?sso_user=… / ?sso=…) is never trusted: anyone can type it. It is only removed.
 * Signing in happens through a signed ?sso_ticket=, which redeemSsoTicket() checks with the server.
 */
function checkSsoTransfer(): null {
  stripParams("sso_user", "sso");
  return null;
}

let ssoRedeem: Promise<boolean> | null = null;

/**
 * Exchanges a signed single-use ?sso_ticket= (from the sign-in redirect or an admin "Launch" button) for the
 * therapist account and API token, using only this site's server. Runs once per page load.
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
      if (!res.ok || !data?.success || !data?.user || !data?.token || data.user.role !== "therapist") return false;
      setApiToken(data.token);
      const verifiedUser: AuthUser = {
        id: data.user.id || data.user._id,
        name: data.user.name,
        title: data.user.profession || data.user.title || "",
        email: data.user.email,
        role: "therapist",
        avatarInitials: (data.user.name || "TH")
          .split(" ")
          .map((n: string) => n[0])
          .join("")
          .slice(0, 2)
          .toUpperCase(),
        photoUrl: data.user.image || data.user.photoUrl || undefined,
        image: data.user.image || data.user.photoUrl || undefined
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(verifiedUser));
      return true;
    } catch (e) {
      return false;
    }
  })();
  return ssoRedeem;
}

/**
 * Checks the stored API token with the server. "ok": a signed-in therapist; "invalid": no token, a forged or
 * expired one, or another role; "error": the check itself could not be made (network, server).
 */
export async function verifyApiSession(): Promise<"ok" | "invalid" | "error"> {
  const token = getApiToken();
  if (!token) return "invalid";
  try {
    const res = await fetch("/api/auth/whoami", { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
    if (res.status === 401 || res.status === 403) return "invalid";
    if (!res.ok) return "error";
    const data = await res.json().catch(() => null);
    return data?.user?.role === "therapist" ? "ok" : "invalid";
  } catch (e) {
    return "error";
  }
}

export function getAuthUser(): AuthUser | null {
  try {
    checkSsoTransfer();
    // Nobody signed in: no user (pages are behind the AuthGuard, which sends visitors to login)
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return null;
    const parsed = JSON.parse(data);
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch (e) {
    return null;
  }
}

export function setAuthUser(user: AuthUser): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
    window.dispatchEvent(new Event("auth_state_change"));
  } catch (e) {}
}

export function isAuthenticated(): boolean {
  try {
    checkSsoTransfer();
    const data = localStorage.getItem(STORAGE_KEY);
    return !!data;
  } catch (e) {
    return false;
  }
}

export function logoutUser(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
    setApiToken(null);
    window.dispatchEvent(new Event("auth_state_change"));
    fetch('/api/auth/logout', { method: 'POST' }).catch(() => {});
  } catch (e) {}
}
