import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import Script from "next/script";
import { getActiveZombiePage, normalizeSlug } from "@/lib/zombie-pages";
import ZombieArticle from "@/components/ZombieArticle";

// Zombie pages are edited in the Super Admin panel; always render the latest version
export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

/**
 * A canonical that points at the page's own slug (on any domain, or unset) is served on the
 * domain the visitor is on, so it stays right whichever domain hosts the site. A canonical to a
 * different path is kept as the admin wrote it.
 */
async function canonicalFor(slug: string, stored?: string): Promise<string | undefined> {
  let pointsAtSelf = !stored;
  if (stored) {
    try {
      pointsAtSelf = normalizeSlug(new URL(stored).pathname) === normalizeSlug(slug);
    } catch {
      pointsAtSelf = false;
    }
  }
  if (!pointsAtSelf) return stored;
  const h = await headers();
  const host = h.get("x-forwarded-host") || h.get("host");
  if (!host) return stored;
  const proto = h.get("x-forwarded-proto") || (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}${normalizeSlug(slug)}`;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const page = await getActiveZombiePage(decodeURIComponent(id));
  if (!page) return {};
  const seo = page.seo || {};
  const title = seo.metaTitle || page.pageTitle;
  const canonical = await canonicalFor(page.slug, seo.canonicalUrl);
  const description = seo.metaDescription || "";
  const ogImage = seo.ogImageUrl || "";
  return {
    title,
    description,
    keywords: seo.keywords ? seo.keywords.split(",").map((k) => k.trim()).filter(Boolean) : undefined,
    alternates: canonical ? { canonical } : undefined,
    openGraph: {
      type: "website",
      title: seo.ogTitle || title,
      description: seo.ogDescription || description,
      images: ogImage ? [{ url: ogImage, alt: seo.ogImageAltText || title }] : [],
    },
  };
}

export default async function ZombiePageView({ params }: Props) {
  const { id } = await params;
  const page = await getActiveZombiePage(decodeURIComponent(id));
  if (!page) notFound();

  let structuredData: string | null = null;
  if (page.seo?.structuredData) {
    try {
      structuredData = JSON.stringify(JSON.parse(page.seo.structuredData));
    } catch {
      structuredData = null; // invalid JSON-LD is skipped rather than breaking the page
    }
  }

  return (
    <>
      {structuredData && (
        <Script id={`zombie-schema-${page.id}`} type="application/ld+json" dangerouslySetInnerHTML={{ __html: structuredData }} />
      )}
      <ZombieArticle htmlChunk={page.htmlChunk} pageTitle={page.pageTitle} />
    </>
  );
}
