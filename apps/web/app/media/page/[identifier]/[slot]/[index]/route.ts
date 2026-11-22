import { prisma } from "@/lib/prisma";
import { decodeDataUri, pageMediaDataUri, type PageMediaSlot } from "@/lib/page-media";

/**
 * Serves an image the admin homepage editor stored inline (base64) in a Page document, as a normal image
 * file. URLs carry a content hash (?v=...), so a new upload gets a new URL and each one can be cached for good.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ identifier: string; slot: string; index: string }> },
) {
  const { identifier, slot, index } = await params;
  const i = Number(index);
  if ((slot !== "carousel" && slot !== "testimonial") || !Number.isInteger(i) || i < 0) {
    return new Response("Not found", { status: 404 });
  }

  const page = await prisma.page
    .findUnique({
      where: { identifier: decodeURIComponent(identifier) },
      select: { carouselImageUrls: true, testimonials: true },
    })
    .catch(() => null);

  const dataUri = pageMediaDataUri(page, slot as PageMediaSlot, i);
  const image = dataUri ? decodeDataUri(dataUri) : null;
  if (!image) return new Response("Not found", { status: 404 });

  return new Response(new Uint8Array(image.bytes), {
    headers: {
      "Content-Type": image.type,
      "Content-Length": String(image.bytes.length),
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
