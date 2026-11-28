import { prisma } from "@/lib/prisma";
import { decodeDataUri, pageMediaDataUri, pageMediaVersion, type PageMediaSlot } from "@/lib/page-media";

/**
 * Serves an image the admin homepage editor stored inline (base64) in a Page document, as a normal image
 * file. URLs carry a content hash (?v=...), so a new upload gets a new URL and each one can be cached for good.
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ identifier: string; slot: string; index: string }> },
) {
  const { identifier, slot, index } = await params;
  const i = Number(index);
  if ((slot !== "carousel" && slot !== "testimonial") || !Number.isInteger(i) || i < 0) {
    return new Response("Not found", { status: 404 });
  }

  // Only the field this slot lives in (the Page document carries every inline image)
  const page = await prisma.page
    .findUnique({
      where: { identifier: decodeURIComponent(identifier) },
      select: slot === "carousel" ? { carouselImageUrls: true } : { testimonials: true },
    })
    .catch(() => null);

  const dataUri = pageMediaDataUri(page, slot as PageMediaSlot, i);
  const image = dataUri ? decodeDataUri(dataUri) : null;
  if (!dataUri || !image) return new Response("Not found", { status: 404 });

  // When the URL's hash is this image's, the CDN may keep it too (s-maxage), so a new visitor gets the
  // home page banner from the edge instead of this function reading the Page document. Any other ?v= is
  // served as before (browser cache only), so a stale hash can never pin the wrong image at the edge.
  const exact = new URL(req.url).searchParams.get("v") === pageMediaVersion(dataUri);
  return new Response(new Uint8Array(image.bytes), {
    headers: {
      "Content-Type": image.type,
      "Content-Length": String(image.bytes.length),
      "Cache-Control": exact
        ? "public, max-age=31536000, s-maxage=31536000, immutable"
        : "public, max-age=31536000, immutable",
    },
  });
}
