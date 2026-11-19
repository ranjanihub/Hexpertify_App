"use server";

import { prisma } from "@/lib/prisma";
import { activeServices, isConsultantPublic, isProfessionPublic } from "@/lib/visibility";

/**
 * A profession page: the profession itself (loaded directly, so it shows its banner, FAQs and SEO
 * even before any therapist joins) and its public therapists.
 */
export const getConsultantByProfessionByIdentifier = async (
  identifer: string,
  _page: number,
  _limit: number,
) => {
  try {
    const profession = await prisma.profession.findUnique({
      where: { identifier: identifer },
      include: { seoMeta: true },
    });
    if (!profession || !isProfessionPublic(profession)) {
      return { success: false, error: "Profession not found.", data: [], total: 0, profession: null };
    }

    const consultants = await prisma.consultant.findMany({
      where: { professionId: profession.id },
      orderBy: { minPrice: "asc" },
      include: {
        profession: { include: { seoMeta: true } },
        services: true,
        reviews: true,
        seoMeta: true,
      },
    });

    const data = consultants
      .filter(isConsultantPublic)
      .map((c) => ({ ...c, services: activeServices(c.services) }));

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
};
