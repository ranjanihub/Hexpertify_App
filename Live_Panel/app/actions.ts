import { prisma } from "@/lib/prisma";

export const getPageData = async () => {
  try {
    // ✅ Get home page metadata
    const metaData = await prisma.page.findUnique({
      where: { identifier: "home" },
      include: {
        seoMeta: true,
      },
    });

    // ✅ Get all professions (with seoMeta + consultants)
    const professions = await prisma.profession.findMany({
      include: {
        consultants: {
          select: {
            id: true,
            name: true,
            identifier: true,
            photoUrl: true,
            photoAltText: true,
            experience: true,
            specialties: true,
          },
        },
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    // ✅ Example: Top consultants by clientCount
    const topConsultants = await prisma.consultant.findMany({
      orderBy: {
        sequence: "asc",
      },
      take: 10,
      select: {
        id: true,
        name: true,
        identifier: true,
        photoUrl: true,
        photoAltText: true,
        clientCount: true,
        specialties: true,
        about: true,
        profession: {
          select: { name: true, identifier: true },
        },
      },
    });
    const recentlyBookedConsultants = await prisma.consultant.findMany({
      take: 10,
      select: {
        id: true,
        name: true,
        identifier: true,
        photoUrl: true,
        clientCount: true,
        specialties: true,
        about: true,
        services: true,
        photoAltText: true,
        experience: true,
        profession: {
          select: { name: true, identifier: true },
        },
      },
    });
    // ✅ Combine all into one response
    return {
      metaData,
      professions,
      topConsultants,
      recentlyBookedConsultants,
    };
  } catch (error) {
    console.error("Error fetching home page data:", error);
    throw new Error("Failed to fetch home page data");
  }
};
