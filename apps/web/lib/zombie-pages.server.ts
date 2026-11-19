import "server-only";
import { callBackend } from "@/lib/backend";
import { type ZombiePage, zombiePagesFrom } from "@/lib/zombie-pages";

/** An Active zombie page by id, read from the API in this same process */
export async function getActiveZombiePage(id: string): Promise<ZombiePage | null> {
  try {
    const { ok, data } = await callBackend("/api/zombie-pages", undefined, "GET");
    if (!ok) return null;
    return zombiePagesFrom(data).find((p) => p.id === id && p.status === "Active") || null;
  } catch {
    return null;
  }
}
