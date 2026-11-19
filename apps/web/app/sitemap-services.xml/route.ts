import { NextResponse } from "next/server";
import { isConsultantPublic, isProfessionPublic } from "@/lib/visibility";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://hexpertify.com";

  let professions: any[] = [];
  try {
    professions = await prisma.profession.findMany({
      select: {
        identifier: true,
        status: true,
        visibility: true,
        createdAt: true,
      },
    });
    professions = professions.filter(isProfessionPublic);
  } catch (err) {
    console.warn("Could not fetch professions for sitemap-services.xml:", err);
  }

  const urls = professions
    .filter(
      (profession) =>
        profession.identifier !== "corporate-webinars-and-group-sessions",
    )
    .map(
      (profession) => `
    <url>
      <loc>${baseUrl}/services/${profession.identifier}</loc>
      <lastmod>${profession.createdAt.toISOString()}</lastmod>
    </url>
  `,
    )
    .join("");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`;

  return new NextResponse(xml, {
    headers: { "Content-Type": "application/xml" },
  });
}
