import { prisma } from "@/lib/prisma";
import { isConsultantPublic, isProfessionPublic } from "@/lib/visibility";

const CONSULTANT_FLAGS = { isHiddenFromLive: true, isArchived: true, accountStatus: true } as const;

/** Loads one homepage section; a failure (e.g. one malformed record) only empties that section */
async function section<T>(label: string, load: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await load();
  } catch (error) {
    console.error(`Error loading home page section "${label}":`, error);
    return fallback;
  }
}

export const getPageData = async () => {
  const [metaData, professions, topConsultants, recentlyBookedConsultants] = await Promise.all([
    // Home page metadata, carousel, FAQs and testimonials
    section("page", () => prisma.page.findUnique({ where: { identifier: "home" }, include: { seoMeta: true } }), null),

    // Professions (with their consultants)
    section("professions", async () => {
      const list = await prisma.profession.findMany({
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
              ...CONSULTANT_FLAGS,
            },
          },
        },
        orderBy: { createdAt: "asc" },
      });
      return list
        .filter(isProfessionPublic)
        .map((p) => ({ ...p, consultants: p.consultants.filter(isConsultantPublic) }));
    }, []),

    // Top consultants by admin-defined sequence
    section("topConsultants", async () => {
      const list = await prisma.consultant.findMany({
        orderBy: { sequence: "asc" },
        take: 30,
        select: {
          id: true,
          name: true,
          identifier: true,
          photoUrl: true,
          photoAltText: true,
          clientCount: true,
          specialties: true,
          about: true,
          ...CONSULTANT_FLAGS,
          profession: { select: { name: true, identifier: true, status: true, visibility: true } },
        },
      });
      return list.filter((c) => isConsultantPublic(c) && (!c.profession || isProfessionPublic(c.profession))).slice(0, 10);
    }, []),

    // Recently onboarded consultants
    section("recentConsultants", async () => {
      const list = await prisma.consultant.findMany({
        orderBy: { createdAt: "desc" },
        take: 30,
        select: {
          id: true,
          name: true,
          identifier: true,
          photoUrl: true,
          clientCount: true,
          specialties: true,
          about: true,
          services: true,
          minPrice: true,
          photoAltText: true,
          experience: true,
          ...CONSULTANT_FLAGS,
          profession: { select: { name: true, identifier: true, status: true, visibility: true } },
        },
      });
      return list.filter((c) => isConsultantPublic(c) && (!c.profession || isProfessionPublic(c.profession))).slice(0, 10);
    }, []),
  ]);

  return { metaData, professions, topConsultants, recentlyBookedConsultants };
};
