import { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://hexpertify.com";

  // Static pages
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: `${baseUrl}/about-us`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/contact-us`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${baseUrl}/privacy-policy`,
      lastModified: new Date(),
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${baseUrl}/terms-conditions`,
      lastModified: new Date(),
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${baseUrl}/refund-policy`,
      lastModified: new Date(),
      changeFrequency: "yearly",
      priority: 0.3,
    },
  ];

  let professionPages: MetadataRoute.Sitemap = [];
  let consultantPages: MetadataRoute.Sitemap = [];

  try {
    // Fetch all professions for service pages
    const professions = await prisma.profession.findMany({
      select: {
        identifier: true,
        createdAt: true,
      },
    });

    professionPages = professions.map((profession) => ({
      url: `${baseUrl}/services/${profession.identifier}`,
      lastModified: profession.createdAt,
      changeFrequency: "weekly",
      priority: 0.9,
    }));

    // Fetch all consultants for consultant pages
    const consultants = await prisma.consultant.findMany({
      select: {
        identifier: true,
        professionId: true,
        updatedAt: true,
        profession: {
          select: {
            identifier: true,
          },
        },
      },
    });

    consultantPages = consultants
      .filter(
        (consultant) =>
          Boolean(consultant.profession?.identifier && consultant.identifier),
      )
      .map((consultant) => ({
        url: `${baseUrl}/services/${consultant.profession!.identifier}/${consultant.identifier}`,
        lastModified: consultant.updatedAt,
        changeFrequency: "weekly",
        priority: 0.8,
      }));
  } catch (err) {
    console.warn("Could not load dynamic sitemaps during build, using static pages fallback:", err);
  }

  return [...staticPages, ...professionPages, ...consultantPages];
}
