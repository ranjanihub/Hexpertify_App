export interface AdminAuthUser {
  id: string;
  name: string;
  email: string;
  role: "super_admin" | "admin" | "therapist" | "client";
  avatarUrl?: string;
}

export const DEFAULT_ADMIN: AdminAuthUser = {
  id: "admin-1",
  name: "Super Administrator",
  email: "admin@example.com",
  role: "super_admin",
  avatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100",
};

const STORAGE_KEY = "hexpertify_admin_auth";

function checkSsoTransfer(): AdminAuthUser | null {
  try {
    const params = new URLSearchParams(window.location.search);
    const ssoRaw = params.get("sso_user") || params.get("sso");
    if (ssoRaw) {
      let user: AdminAuthUser;
      try {
        user = JSON.parse(decodeURIComponent(ssoRaw));
      } catch {
        user = DEFAULT_ADMIN;
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
      const url = new URL(window.location.href);
      url.searchParams.delete("sso_user");
      url.searchParams.delete("sso");
      window.history.replaceState({}, document.title, url.pathname + url.search);
      return user;
    }
  } catch (e) {}
  return null;
}

export function getAdminAuth(): AdminAuthUser | null {
  try {
    const ssoUser = checkSsoTransfer();
    if (ssoUser) return ssoUser;
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return null;
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

export function isAdminAuthenticated(): boolean {
  try {
    const ssoUser = checkSsoTransfer();
    if (ssoUser) {
      if (ssoUser.role === 'super_admin' || ssoUser.role === 'admin') {
        return true;
      }
      if (ssoUser.role === 'therapist') {
        launchConsultantPanel(ssoUser);
        return false;
      }
      if (ssoUser.role === 'client') {
        launchClientPanel(ssoUser);
        return false;
      }
      return false;
    }
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data || data === 'logged_out') {
      return false;
    }
    const parsed = JSON.parse(data);
    return parsed?.role === 'super_admin' || parsed?.role === 'admin';
  } catch (e) {
    return false;
  }
}

export function logoutAdmin(): void {
  try {
    localStorage.setItem(STORAGE_KEY, 'logged_out');
    window.dispatchEvent(new Event("auth_state_change"));
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
    const apiEndpoints = ['/api/auth/sso-ticket', 'http://localhost:5000/api/auth/sso-ticket', 'http://localhost:5001/api/auth/sso-ticket', 'http://localhost:3000/api/auth/sso-ticket'];
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
  const targetBaseUrl = isSinglePort ? '/client' : 'http://localhost:5173';
  let targetUrl = `${targetBaseUrl}/?sso_user=${encodeURIComponent(JSON.stringify(targetUser))}`;

  try {
    const apiEndpoints = ['/api/auth/sso-ticket', 'http://localhost:5000/api/auth/sso-ticket', 'http://localhost:5001/api/auth/sso-ticket', 'http://localhost:3000/api/auth/sso-ticket'];
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
