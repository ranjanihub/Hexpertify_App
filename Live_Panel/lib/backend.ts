import "server-only";

/** True when the central Backend (payments, emails) is configured for this deployment */
export function backendConfigured(): boolean {
  return !!process.env.BACKEND_URL && !!process.env.INTERNAL_API_KEY;
}

/** Server-to-server call to the central Backend, authenticated with the internal key */
export async function callBackend(path: string, body: Record<string, any>, method: "POST" | "PUT" = "POST") {
  const baseUrl = process.env.BACKEND_URL;
  const internalKey = process.env.INTERNAL_API_KEY;
  if (!baseUrl || !internalKey) {
    throw new Error("Online payments are not configured. Please contact support.");
  }
  const res = await fetch(`${baseUrl.replace(/\/$/, "")}${path}`, {
    method,
    headers: { "Content-Type": "application/json", "X-Internal-Key": internalKey },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
}

/** Welcome email for a new website account; never throws (sign-up must not fail on email) */
export async function sendWelcomeEmail(name: string, email: string): Promise<void> {
  if (!backendConfigured()) return;
  try {
    await callBackend("/api/emails/welcome", { name, email });
  } catch (err) {
    console.error("Welcome email failed:", err);
  }
}
