"use server";

import { cache } from "react";
import { prisma } from "@/lib/prisma";
import { activeServices, isConsultantPublic, isProfessionPublic } from "@/lib/visibility";

/**
 * Loads a profession page in 3 database round trips (it used to take 8, and generateMetadata and the page
 * each ran them): the profession, then its SEO record and therapists together, then the therapists' plans
 * and reviews together. cache(): generateMetadata and the page share one load per request.
 */
const loadProfessionPage = cache(async (identifier: string) => {
  try {
    const found = await prisma.profession.findUnique({ where: { identifier } });
    if (!found || !isProfessionPublic(found)) {
      return { success: false, error: "Profession not found.", data: [], total: 0, profession: null };
    }

    const [seoMeta, consultants] = await Promise.all([
      found.seoMetaId ? prisma.seoMeta.findUnique({ where: { id: found.seoMetaId } }) : null,
      prisma.consultant.findMany({ where: { professionId: found.id }, orderBy: { minPrice: "asc" } }),
    ]);
    const profession = { ...found, seoMeta };

    const visible = consultants.filter(isConsultantPublic);
    const ids = visible.map((c) => c.id);
    const [services, reviews] = ids.length
      ? await Promise.all([
          prisma.service.findMany({ where: { consultantId: { in: ids } } }),
          prisma.review.findMany({ where: { consultantId: { in: ids } } }),
        ])
      : [[], []];

    const data = visible.map((c) => ({
      ...c,
      // Every therapist here belongs to this profession (the same record each one used to load again)
      profession,
      services: activeServices(services.filter((s) => s.consultantId === c.id)),
      reviews: reviews.filter((r) => r.consultantId === c.id),
    }));

    return { success: true, data, total: data.length, profession };
  } catch (error) {
    console.error("Error loading profession page:", error);
    return {
      success: false,
      error: "An error occurred while fetching the consultant.",
      data: [],
      total: 0,
      profession: null,
    };
  }
});

/**
 * A profession page: the profession itself (loaded directly, so it shows its banner, FAQs and SEO
 * even before any therapist joins) and its public therapists.
 */
export const getConsultantByProfessionByIdentifier = async (
  identifer: string,
  _page: number,
  _limit: number,
) => loadProfessionPage(identifer);
