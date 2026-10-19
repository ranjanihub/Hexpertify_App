/**
 * Zombie (programmatic SEO) pages are managed in the Super Admin panel and stored by the central
 * Backend. The middleware rewrites a matching path to /z/<id>, which renders the page.
 */

export interface ZombiePage {
  id: string;
  pageTitle: string;
  slug: string;
  htmlChunk: string;
  status: "Active" | "Draft" | "Archived" | string;
  seo?: {
    metaTitle?: string;
    metaDescription?: string;
    keywords?: string;
    canonicalUrl?: string;
    ogTitle?: string;
    ogDescription?: string;
    ogImageUrl?: string;
    ogImageAltText?: string;
    structuredData?: string;
  };
}

/** Same rules as the /api rewrite in next.config.ts */
export function backendBaseUrl(): string {
  let url =
    process.env.BACKEND_API_URL ||
    process.env.NEXT_PUBLIC_BACKEND_API_URL ||
    (process.env.VERCEL || process.env.NODE_ENV === "production" ? "https://hexpertify-backend.vercel.app" : "http://localhost:5000");
  if (!url || url.includes("hexpertify-app") || url === "/" || (Boolean(process.env.VERCEL) && url.includes("localhost"))) {
    url = "https://hexpertify-backend.vercel.app";
  }
  return url.replace(/\/$/, "");
}

export function normalizeSlug(path: string): string {
  const clean = "/" + String(path || "").split(/[?#]/)[0].replace(/^https?:\/\/[^/]+/i, "").replace(/^\/+|\/+$/g, "");
  return clean.toLowerCase();
}

/** Fetches every zombie page from the Backend (no caching: callers decide) */
export async function fetchZombiePages(): Promise<ZombiePage[]> {
  const res = await fetch(`${backendBaseUrl()}/api/zombie-pages`, { cache: "no-store", signal: AbortSignal.timeout(4000) });
  if (!res.ok) return [];
  const data = await res.json().catch(() => null);
  return Array.isArray(data?.pages) ? data.pages : [];
}

export async function getActiveZombiePage(id: string): Promise<ZombiePage | null> {
  const pages = await fetchZombiePages().catch(() => []);
  return pages.find((p) => p.id === id && p.status === "Active") || null;
}

// Middleware-side cache of active slugs → id (refreshed at most once a minute per instance)
const SLUG_CACHE_MS = 60 * 1000;
let slugCache: { at: number; map: Map<string, string> } | null = null;

export async function matchZombieSlug(pathname: string): Promise<string | null> {
  if (!slugCache || Date.now() - slugCache.at > SLUG_CACHE_MS) {
    try {
      const pages = await fetchZombiePages();
      slugCache = {
        at: Date.now(),
        map: new Map(pages.filter((p) => p.status === "Active" && p.slug).map((p) => [normalizeSlug(p.slug), p.id])),
      };
    } catch {
      // Backend unreachable: keep serving the previous list (or none) and retry later
      slugCache = { at: Date.now(), map: slugCache?.map || new Map() };
    }
  }
  return slugCache.map.get(normalizeSlug(pathname)) || null;
}
