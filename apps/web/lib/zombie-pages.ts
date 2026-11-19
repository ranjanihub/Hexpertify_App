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

export function normalizeSlug(path: string): string {
  const clean = "/" + String(path || "").split(/[?#]/)[0].replace(/^https?:\/\/[^/]+/i, "").replace(/^\/+|\/+$/g, "");
  return clean.toLowerCase();
}

/** Parses the API's zombie-page list response */
export function zombiePagesFrom(data: any): ZombiePage[] {
  return Array.isArray(data?.pages) ? data.pages : [];
}

/**
 * Fetches every zombie page from this site's own API. The middleware passes its request origin; it does not
 * load the API in-process (that would put the whole Express app into the middleware bundle).
 * Server pages use getActiveZombiePage in lib/zombie-pages.server.ts instead.
 */
export async function fetchZombiePages(origin: string): Promise<ZombiePage[]> {
  const res = await fetch(`${origin.replace(/\/$/, "")}/api/zombie-pages`, { cache: "no-store", signal: AbortSignal.timeout(4000) });
  if (!res.ok) return [];
  return zombiePagesFrom(await res.json().catch(() => null));
}

// Middleware-side cache of active slugs → id (refreshed at most once a minute per instance)
const SLUG_CACHE_MS = 60 * 1000;
let slugCache: { at: number; map: Map<string, string> } | null = null;

export async function matchZombieSlug(pathname: string, origin: string): Promise<string | null> {
  if (!slugCache || Date.now() - slugCache.at > SLUG_CACHE_MS) {
    try {
      const pages = await fetchZombiePages(origin);
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
