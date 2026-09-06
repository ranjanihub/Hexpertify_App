import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://hexpertify.com";

  const professions = await prisma.profession.findMany({
    select: {
      identifier: true,
      createdAt: true,
    },
  });

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
