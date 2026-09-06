"use server";

import { prisma } from "@/lib/prisma";

export const getConsultantByProfessionByIdentifier = async (
  identifer: string,
  page: number,
  limit: number,
) => {
  try {
    const consultant = await prisma.consultant.findMany({
      where: {
        profession: {
          identifier: identifer,
        },
      },
      // skip: (page - 1) * limit,
      // take: limit,
      orderBy: {
        minPrice: "asc",
      },
      include: {
        profession: {
          include: { seoMeta: true },
        },
        services: true,
        reviews: true,
        seoMeta: true,
      },
    });
    const total = await prisma.consultant.count({
      where: {
        profession: {
          identifier: identifer,
        },
      },
    });
    if (!consultant) {
      return { success: false, error: "Consultant not found." };
    }

    return { success: true, data: consultant, total };
  } catch (error) {
    return {
      success: false,
      error: "An error occurred while fetching the consultant.",
    };
  }
};
