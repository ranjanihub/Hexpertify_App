import "server-only";
import http from "http";
import type { AddressInfo } from "net";
import apiApp from "@backend/app";
import { inProcessKey } from "@backend/middlewares/auth.middleware";

/**
 * The website's server code calls the Hexpertify API (server/src/app.ts) inside this same process: the
 * Express app gets a private listener on 127.0.0.1 (random port, started on first use), so requests are
 * real Node HTTP requests that never leave the machine. No BACKEND_URL, no deployment-to-deployment hop.
 * Requests carry the per-process internal key, so internal-only endpoints accept them.
 */
let localApi: Promise<string> | null = null;

function localApiBase(): Promise<string> {
  if (!localApi) {
    localApi = new Promise<string>((resolve, reject) => {
      const server = http.createServer(apiApp);
      server.once("error", (err) => {
        localApi = null;
        reject(err);
      });
      server.listen(0, "127.0.0.1", () => {
        server.unref(); // never keeps the process alive on its own
        resolve(`http://127.0.0.1:${(server.address() as AddressInfo).port}`);
      });
    });
  }
  return localApi;
}

export async function callBackend(
  path: string,
  body?: Record<string, any>,
  method: "GET" | "POST" | "PUT" | "DELETE" = "POST",
): Promise<{ ok: boolean; status: number; data: any }> {
  const base = await localApiBase();
  const res = await fetch(`${base}${path}`, {
    method,
    headers: { "Content-Type": "application/json", "X-Internal-Key": inProcessKey },
    body: method === "GET" || body === undefined ? undefined : JSON.stringify(body),
    cache: "no-store",
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
}

/** Welcome email for a new website account; never throws (sign-up must not fail on email) */
export async function sendWelcomeEmail(name: string, email: string): Promise<void> {
  try {
    await callBackend("/api/emails/welcome", { name, email });
  } catch (err) {
    console.error("Welcome email failed:", err);
  }
}
