import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Script from "next/script";
import { getActiveZombiePage } from "@/lib/zombie-pages";
import ZombieArticle from "@/components/ZombieArticle";

// Zombie pages are edited in the Super Admin panel; always render the latest version
export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const page = await getActiveZombiePage(decodeURIComponent(id));
  if (!page) return {};
  const seo = page.seo || {};
  const title = seo.metaTitle || page.pageTitle;
  const description = seo.metaDescription || "";
  const ogImage = seo.ogImageUrl || "";
  return {
    title,
    description,
    keywords: seo.keywords ? seo.keywords.split(",").map((k) => k.trim()).filter(Boolean) : undefined,
    alternates: seo.canonicalUrl ? { canonical: seo.canonicalUrl } : undefined,
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
