import { NextResponse } from "next/server";
import { backendConfigured } from "@/lib/backend";

const CORS_HEADERS = { "Access-Control-Allow-Origin": "*" };

/**
 * These /api/auth/* routes shadow the central Backend for the panels served from this domain, so when a
 * Backend is configured the request is forwarded to the same Backend path (full profile, API token and
 * SSO ticket come from there). Returns null when no Backend is configured, so the caller can fall back to
 * its local behaviour. The internal API key is deliberately not sent: these are end-user requests.
 */
export async function forwardAuthToBackend(req: Request, path: string, body: unknown): Promise<NextResponse | null> {
  if (!backendConfigured()) return null;

  const baseUrl = String(process.env.BACKEND_URL).replace(/\/$/, "");
  // Loop guard: never forward to this same site
  try {
    if (new URL(baseUrl).host === new URL(req.url).host) return null;
  } catch {
    return null;
  }

  const headers: Record<string, string> = { "Content-Type": "application/json" };
  for (const name of ["authorization", "user-agent", "x-forwarded-for"]) {
    const value = req.headers.get(name);
    if (value) headers[name] = value;
  }

  try {
    const res = await fetch(`${baseUrl}${path}`, {
      method: "POST",
      headers,
      body: JSON.stringify(body ?? {}),
      cache: "no-store",
    });
    const data = await res
      .json()
      .catch(() => ({ success: false, error: "Unexpected response from the authentication server." }));
    return NextResponse.json(data, { status: res.status, headers: CORS_HEADERS });
  } catch (error) {
    console.error(`AUTH_FORWARD_ERROR ${path}:`, error);
    return NextResponse.json(
      { success: false, error: "The authentication server is unreachable. Please try again shortly." },
      { status: 502, headers: CORS_HEADERS }
    );
  }
}
