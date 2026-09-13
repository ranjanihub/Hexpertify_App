import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://hexpertify.com";

  let consultants: any[] = [];
  try {
    consultants = await prisma.consultant.findMany({
      select: {
        identifier: true,
        updatedAt: true,
        profession: {
          select: { identifier: true },
        },
      },
    });
  } catch (err) {
    console.warn("Could not fetch consultants for sitemap-consultants.xml:", err);
  }

  const urls = consultants
    .filter(
      (consultant) =>
        consultant.profession?.identifier &&
        consultant.profession.identifier !==
        "corporate-webinars-and-group-sessions",
    )
    .map(
      (consultant) => `
    <url>
      <loc>${baseUrl}/services/${consultant.profession!.identifier}/${consultant.identifier}</loc>
      <lastmod>${consultant.updatedAt?.toISOString() || new Date().toISOString()}</lastmod>
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
