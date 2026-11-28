import "server-only";
import crypto from "crypto";

/**
 * The admin homepage editor can store images inline as base64 "data:" URIs inside the Page document.
 * Rendering those inline repeats every image in the HTML and again in the page data (the home page grew to
 * ~800 KB). Instead, such images are served from /media/page/<identifier>/<slot>/<index> (app/media/...),
 * with a content hash in the URL so the browser can cache them for good and still see new uploads.
 */
export type PageMediaSlot = "carousel" | "testimonial";

function isDataUri(value: unknown): value is string {
  return typeof value === "string" && value.startsWith("data:image/");
}

/** The content hash in a media URL (?v=...) */
export function pageMediaVersion(dataUri: string): string {
  return crypto.createHash("sha1").update(dataUri).digest("hex").slice(0, 12);
}

export function pageMediaUrl(identifier: string, slot: PageMediaSlot, index: number, dataUri: string): string {
  return `/media/page/${encodeURIComponent(identifier)}/${slot}/${index}?v=${pageMediaVersion(dataUri)}`;
}

/** The stored data URI for a slot of a Page document (null when that slot is not an inline image) */
export function pageMediaDataUri(page: any, slot: PageMediaSlot, index: number): string | null {
  const value =
    slot === "carousel"
      ? page?.carouselImageUrls?.[index]
      : page?.testimonials?.[index]?.authorImageUrl;
  return isDataUri(value) ? value : null;
}

/** A copy of the Page document whose inline images are replaced by /media URLs (other values untouched) */
export function withPageMediaUrls<T extends Record<string, any> | null>(page: T): T {
  if (!page) return page;
  const identifier = String((page as any).identifier || "home");
  const out: any = { ...page };
  if (Array.isArray(out.carouselImageUrls)) {
    out.carouselImageUrls = out.carouselImageUrls.map((url: unknown, i: number) =>
      isDataUri(url) ? pageMediaUrl(identifier, "carousel", i, url) : url,
    );
  }
  if (Array.isArray(out.testimonials)) {
    out.testimonials = out.testimonials.map((t: any, i: number) =>
      t && isDataUri(t.authorImageUrl) ? { ...t, authorImageUrl: pageMediaUrl(identifier, "testimonial", i, t.authorImageUrl) } : t,
    );
  }
  return out;
}

/** Decodes a base64 data URI into its bytes and content type */
export function decodeDataUri(dataUri: string): { type: string; bytes: Buffer } | null {
  const match = /^data:(image\/[\w.+-]+);base64,([\s\S]+)$/.exec(dataUri);
  if (!match) return null;
  return { type: match[1], bytes: Buffer.from(match[2], "base64") };
}
