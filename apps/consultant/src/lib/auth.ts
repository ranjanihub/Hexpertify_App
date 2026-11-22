import { setApiToken } from "./api-auth";

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

function checkSsoTransfer(): AuthUser | null {
  try {
    const params = new URLSearchParams(window.location.search);
    const ssoTicket = params.get("sso_ticket");
    let ssoRaw = params.get("sso_user") || params.get("sso");

    // 1. Verify signed cryptographic SSO ticket if present
    if (ssoTicket) {
      const endpoints = ["/api/auth/sso-verify", "http://localhost:5000/api/auth/sso-verify", "http://localhost:3000/api/auth/sso-verify"];
      for (const ep of endpoints) {
        fetch(ep, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ticket: ssoTicket }),
        })
          .then((res) => res.json())
          .then((data) => {
            if (data?.success && data?.user) {
              if (data.token) setApiToken(data.token);
              const verifiedUser: AuthUser = {
                id: data.user.id || data.user._id,
                name: data.user.name,
                title: data.user.profession || data.user.title || "Licensed Psychologist",
                email: data.user.email,
                role: data.user.role || "therapist",
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
              window.dispatchEvent(new Event("auth_state_change"));
            }
          })
          .catch(() => {});
      }
    }

    // 2. Immediate synchronous payload decode
    if (ssoTicket && !ssoRaw) {
      try {
        const b64 = ssoTicket.replace(/-/g, "+").replace(/_/g, "/");
        const jsonStr = atob(b64);
        const parsed = JSON.parse(jsonStr);
        if (parsed?.payload) {
          ssoRaw = encodeURIComponent(JSON.stringify(parsed.payload));
        }
      } catch {}
    }

    if (ssoRaw || ssoTicket) {
      // Only a real signed-in therapist is stored; never a placeholder account
      let user: AuthUser | null = null;
      if (ssoRaw) {
        try {
          const parsed = JSON.parse(decodeURIComponent(ssoRaw));
          const id = parsed.id || parsed._id;
          if (!id && !parsed.email) throw new Error("No account in the SSO payload");
          user = {
            id: id || "",
            name: parsed.name || parsed.email || "",
            title: parsed.profession || parsed.title || "",
            email: parsed.email || "",
            role: "therapist",
            avatarInitials: (parsed.name || "TH")
              .split(" ")
              .map((n: string) => n[0])
              .join("")
              .slice(0, 2)
              .toUpperCase(),
            photoUrl: parsed.image || parsed.photo || parsed.photoUrl || undefined,
            image: parsed.image || parsed.photo || parsed.photoUrl || undefined
          };
        } catch {}
      }

      if (user) localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
      const url = new URL(window.location.href);
      url.searchParams.delete("sso_ticket");
      url.searchParams.delete("sso_user");
      url.searchParams.delete("sso");
      window.history.replaceState({}, document.title, url.pathname + url.search);
      return user;
    }
  } catch (e) {}
  return null;
}

export function getAuthUser(): AuthUser | null {
  try {
    const ssoUser = checkSsoTransfer();
    if (ssoUser) return ssoUser;
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
    if (checkSsoTransfer()) return true;
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
    fetch('http://localhost:5000/api/auth/logout', { method: 'POST' }).catch(() => {
      fetch('/api/auth/logout', { method: 'POST' }).catch(() => {});
    });
  } catch (e) {}
}
