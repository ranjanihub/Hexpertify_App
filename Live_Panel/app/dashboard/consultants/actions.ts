"use server";

import { prisma } from "@/lib/prisma"; // Adjust this path to your prisma client
import { revalidatePath } from "next/cache";
import * as yup from "yup";

// -----------------------------------------------------
// YUP SCHEMAS
// -----------------------------------------------------

const faqItemSchema = yup.object({
  question: yup.string().required("Question is required"),
  answer: yup.string().required("Answer is required"),
});

const seoMetaSchema = yup.object({
  metaTitle: yup.string().required("Meta title is required"),
  metaDescription: yup.string().required("Meta description is required"),
  metaKeywords: yup.array().of(yup.string().required()).default([]),
  ogTitle: yup.string().nullable().optional(),
  ogDescription: yup.string().nullable().optional(),
  ogImage: yup.string().nullable().optional(),
  ogImageAlt: yup.string().nullable().optional(),
  htmlChunk: yup.string().nullable().optional(),
});

// Review schema for form input. Reviews entered here are admin reviews (authorId null);
// reviews written by clients are kept as they are and never edited from this form.
const reviewInputSchema = yup.object({
  id: yup.string().optional(),
  clientName: yup.string().required("Client name is required"),
  clientTitle: yup.string().nullable().optional(),
  rating: yup.number().integer().min(1).max(5).required("Rating is required"),
  comment: yup.string().required("Comment is required"),
  createdAt: yup.string().nullable().optional(),
  reviewImages: yup
    .array()
    .of(
      yup.object({
        url: yup.string().url().required(),
        alt: yup.string().optional(),
      }),
    )
    .default([]),
});

// Service schema
const serviceSchema = yup.object({
  id: yup.string().optional(),
  name: yup.string().required("Service name is required"),
  price: yup.number().min(0).required("Price is required"),
  duration: yup.number().min(1).required("Duration is required"),
  sessionCount: yup.number().min(1).default(1),
  platform: yup.string().default("G-Meet"),
});

const consultantSchema = yup.object({
  name: yup.string().required(),
  notificationTitle: yup
    .string()
    .trim()
    .max(120, "Notification title must be 120 characters or less")
    .transform((value, originalValue) => (originalValue === "" ? null : value))
    .nullable()
    .optional(),
  identifier: yup
    .string()
    .required()
    .matches(
      /^[a-z0-9-]+$/,
      "Identifier must be lowercase, numbers, and dashes only",
    ),
  email: yup.string().email().required(),
  sequence: yup
    .number()
    .transform((value, originalValue) => (originalValue === "" ? null : value))
    .integer()
    .typeError("Sequence must be a number")
    .nullable()
    .optional(),

  photoUrl: yup.string().url().nullable(),
  photoAltText: yup.string().nullable(),
  youtubeUrl: yup.string().url().nullable(),
  certificateImages: yup
    .array()
    .of(
      yup.object({
        url: yup.string().url().required(),
        alt: yup.string().optional(),
      }),
    )
    .default([]),
  qualifications: yup.array().of(yup.string().required()).default([]),
  specialties: yup.array().of(yup.string().required()).default([]),
  experience: yup.number().integer().min(0).required(),
  clientCount: yup.number().integer().min(0).default(0),
  languages: yup.array().of(yup.string().required()).default([]),
  about: yup.string().nullable(),
  isCertified: yup.boolean().default(false),
  faqs: yup.array().of(faqItemSchema).default([]),
  professionId: yup.string().required("Profession is required"),

  // Reviews array (optional)
  reviews: yup.array().of(reviewInputSchema).default([]),

  // Services array
  services: yup.array().of(serviceSchema).default([]),

  // SeoMeta is optional on creation
  seoMeta: seoMetaSchema.nullable().optional(),
});

// Partial schema for updates
const consultantUpdateSchema = consultantSchema.partial();

// -----------------------------------------------------
// TYPES
// -----------------------------------------------------

type ConsultantInput = yup.InferType<typeof consultantSchema>;
type ConsultantUpdateInput = yup.InferType<typeof consultantUpdateSchema>;

// -----------------------------------------------------
// HELPER FOR ERROR RESPONSE
// -----------------------------------------------------
function handleError(error: unknown) {
  if (error instanceof yup.ValidationError) {
    return { success: false, error: error.errors.join(", ") };
  }
  if (error instanceof Error) {
    // Check for Prisma unique constraint errors
    if (error.message.includes("Unique constraint failed")) {
      if (error.message.includes("identifier")) {
        return { success: false, error: "This identifier is already in use." };
      }
      if (error.message.includes("email")) {
        return { success: false, error: "This email is already in use." };
      }
    }
    // Check for foreign key constraint errors (e.g. deleting service with bookings)
    if (error.message.includes("Foreign key constraint failed")) {
      return {
        success: false,
        error:
          "Cannot delete item because it is being used (e.g. in bookings).",
      };
    }
    return { success: false, error: error.message };
  }
  return { success: false, error: "An unknown error occurred." };
}

// -----------------------------------------------------
// SHARED-DATABASE HELPERS
// (the Backend reads these documents too; keep in sync with Backend/src/services/live-content.ts)
// -----------------------------------------------------

type RawDoc = Record<string, any>;
const rawId = (doc: RawDoc) =>
  String(doc?._id?.$oid ?? doc?._id ?? doc?.id ?? "");

/** Client-written reviews carry authorId, clientId or verified; admin reviews have none of them */
function isClientReview(r: RawDoc) {
  return Boolean((r?.authorId && r.authorId !== "ADMIN") || r?.clientId || r?.verified);
}

/** The consultant's reviews split into admin-entered and client-written ids */
async function reviewIdsByAuthorship(consultantId: string) {
  const raw = (await prisma.review.findRaw({
    filter: { consultantId },
    options: { projection: { _id: 1, authorId: 1, clientId: 1, verified: 1 } },
  })) as unknown as RawDoc[];
  const list = Array.isArray(raw) ? raw : [];
  return {
    admin: list.filter((r) => !isClientReview(r)).map(rawId),
    client: new Set(list.filter(isClientReview).map(rawId)),
  };
}

/** Lowest price among plans that are actually offered (not retired, above ₹0) */
function lowestOfferedPrice(services: { price: number; retired?: boolean | null }[]) {
  const prices = services
    .filter((s) => !s.retired && Number(s.price) > 0)
    .map((s) => Number(s.price));
  return prices.length ? Math.min(...prices) : null;
}

/** Another consultant already using this website slug */
async function identifierTaken(identifier: string | undefined, exceptId?: string) {
  if (!identifier) return false;
  const clash = await prisma.consultant.findFirst({
    where: { identifier, ...(exceptId ? { NOT: { id: exceptId } } : {}) },
    select: { id: true },
  });
  return Boolean(clash);
}

/**
 * Keeps the copies other panels read equal to the website's fields: the profession name next to
 * professionId, bio next to about, and the older photo names next to photoUrl.
 */
async function syncConsultantCopies(id: string) {
  const c = await prisma.consultant.findUnique({
    where: { id },
    select: { about: true, photoUrl: true, profession: { select: { name: true } } },
  });
  if (!c) return;
  const set: Record<string, unknown> = {
    bio: c.about ?? null,
    photo: c.photoUrl ?? null,
    image: c.photoUrl ?? null,
    avatarUrl: c.photoUrl ?? null,
  };
  if (c.profession?.name) set.profession = c.profession.name;
  await prisma.$runCommandRaw({
    update: "Consultant",
    updates: [{ q: { _id: id }, u: { $set: set } }],
  } as any);
}

function revalidateConsultantPaths(consultant: {
  id: string;
  identifier: string;
  profession?: { identifier: string } | null;
}) {
  revalidatePath("/dashboard/consultants");
  revalidatePath(`/dashboard/consultants/${consultant.id}/edit`);

  if (consultant.profession?.identifier) {
    revalidatePath(`/services/${consultant.profession.identifier}`);
    revalidatePath(
      `/services/${consultant.profession.identifier}/${consultant.identifier}`,
    );
  }

  revalidatePath("/");
}

// -----------------------------------------------------
// HELPER TO GET SESSION USER
// -----------------------------------------------------

// -----------------------------------------------------
// CREATE CONSULTANT
// -----------------------------------------------------

export async function createConsultant(input: ConsultantInput) {
  try {
    const { seoMeta, reviews, services, certificateImages, ...consultantData } =
      await consultantSchema.validate(input, {
        abortEarly: false,
        stripUnknown: true,
      });

    if (await identifierTaken(consultantData.identifier)) {
      return { success: false, error: "This identifier is already in use by another consultant." };
    }

    const certificateUrls = (certificateImages || []).map((img) => img.url);
    const certificateAltTexts = (certificateImages || []).map(
      (img) => img.alt || "",
    );

    let seoMetaId: string | undefined = undefined;

    // --- Handle SeoMeta Creation ---
    // Because Consultant owns the foreign key, we must create SeoMeta first.
    if (seoMeta) {
      const newSeoMeta = await prisma.seoMeta.create({
        data: seoMeta,
      });
      seoMetaId = newSeoMeta.id;
    }

    const consultant = await prisma.consultant.create({
      data: {
        sequence: Number(consultantData.sequence) || null,
        ...consultantData,
        certificateUrls,
        certificateAltTexts,
        seoMetaId: seoMetaId, // Link the newly created SeoMeta
        minPrice: lowestOfferedPrice(services || []),
      },
      include: { seoMeta: true, profession: true },
    });

    // Create reviews if provided (admin-entered: no author)
    if (reviews && reviews.length > 0) {
      await prisma.review.createMany({
        data: reviews.map((review) => ({
          rating: review.rating,
          comment: review.comment,
          clientName: review.clientName,
          clientTitle: review.clientTitle,
          consultantId: consultant.id,
          imageUrls: (review.reviewImages || []).map((img) => img.url),
          imageAltTexts: (review.reviewImages || []).map(
            (img) => img.alt || "",
          ),
          createdAt: review.createdAt ? new Date(review.createdAt) : new Date(),
        })),
      });
    }

    // Create services if provided
    if (services && services.length > 0) {
      await prisma.service.createMany({
        data: services.map((service) => ({
          name: service.name,
          price: service.price,
          duration: service.duration,
          sessionCount: service.sessionCount,
          platform: service.platform,
          consultantId: consultant.id,
        })),
      });
    }

    await syncConsultantCopies(consultant.id);
    revalidateConsultantPaths(consultant);
    return { success: true, data: consultant };
  } catch (error) {
    return handleError(error);
  }
}

// -----------------------------------------------------
// GET CONSULTANT
// -----------------------------------------------------
export async function getConsultant(id: string) {
  try {
    const consultant = await prisma.consultant.findUnique({
      where: { id },
      include: {
        seoMeta: true,
        profession: true,
        services: true,
        reviews: true,
      },
    });

    if (!consultant) {
      return { success: false, error: "Consultant not found." };
    }

    // The edit form shows the plans currently offered (retired plans are kept only for past
    // bookings) and the admin-entered reviews (client reviews are not edited here)
    const { client } = await reviewIdsByAuthorship(id);
    return {
      success: true,
      data: {
        ...consultant,
        services: consultant.services.filter((s) => !s.retired),
        reviews: consultant.reviews.filter((r) => !client.has(r.id)),
        clientReviewCount: client.size,
      },
    };
  } catch (error) {
    return handleError(error);
  }
}

// -----------------------------------------------------
// LIST CONSULTANTS (pagination)
// -----------------------------------------------------
export async function listConsultants(page = 1, limit = 10) {
  try {
    const skip = (page - 1) * limit;

    const [consultants, total] = await Promise.all([
      prisma.consultant.findMany({
        skip,
        take: limit,
        include: {
          seoMeta: true,
          profession: true,
          reviews: {
            select: {
              rating: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.consultant.count(),
    ]);

    // Calculate review aggregates
    const data = consultants.map((consultant) => ({
      ...consultant,
      reviewsCount: consultant.reviews.length,
      averageRating:
        consultant.reviews.length > 0
          ? consultant.reviews.reduce((sum, r) => sum + r.rating, 0) /
            consultant.reviews.length
          : null,
      reviews: undefined, // Remove reviews array from response to keep it clean
    }));

    return {
      success: true,
      data: {
        data,
        total,
        page,
        totalPages: Math.ceil(total / limit),
      },
    };
  } catch (error) {
    return handleError(error);
  }
}

// -----------------------------------------------------
// UPDATE CONSULTANT
// -----------------------------------------------------
export async function updateConsultant(
  id: string,
  input: ConsultantUpdateInput,
) {
  try {
    const { seoMeta, reviews, services, certificateImages, ...consultantData } =
      await consultantUpdateSchema.validate(input, {
        abortEarly: false,
        stripUnknown: true,
      });
    const existing = await prisma.consultant.findUnique({
      where: { id },
      select: {
        id: true,
        identifier: true,
        seoMetaId: true,
        profession: { select: { identifier: true } },
      },
    });

    if (!existing) {
      return { success: false, error: "Consultant not found." };
    }
    if (await identifierTaken(consultantData.identifier, id)) {
      return { success: false, error: "This identifier is already in use by another consultant." };
    }

    const consultantUpdates = { ...consultantData } as typeof consultantData & {
      seoMetaId?: string;
      minPrice?: number | null;
    };
    // Only offered plans (not retired, above ₹0) set the starting price
    if (services !== undefined) consultantUpdates.minPrice = lowestOfferedPrice(services);
    // Prepare certificate arrays if provided
    let certificateUpdates = {};
    if (certificateImages) {
      certificateUpdates = {
        certificateUrls: certificateImages
          .map((img) => img?.url)
          .filter(Boolean),
        certificateAltTexts: certificateImages.map((img) => img?.alt || ""),
      };
    }

    // --- Handle SeoMeta Update ---
    if (seoMeta) {
      if (existing.seoMetaId) {
        // Consultant already has SeoMeta, so update it
        await prisma.seoMeta.update({
          where: { id: existing.seoMetaId },
          data: seoMeta,
        });
      } else {
        // Consultant does not have SeoMeta, so create and link it
        const newSeoMeta = await prisma.seoMeta.create({
          data: seoMeta as yup.InferType<typeof seoMetaSchema>, // Cast as non-null
        });
        consultantUpdates.seoMetaId = newSeoMeta.id; // Add seoMetaId to the update data
      }
    }

    const updatedConsultant = await prisma.consultant.update({
      where: { id },
      data: {
        ...consultantUpdates,
        ...certificateUpdates,
      },
      include: { seoMeta: true, profession: true },
    });

    // --- Handle Reviews Update ---
    if (reviews !== undefined) {
      // Replace only the admin-entered reviews; client-written reviews are kept untouched
      const { admin, client } = await reviewIdsByAuthorship(id);
      if (admin.length > 0) {
        await prisma.review.deleteMany({
          where: { id: { in: admin } },
        });
      }

      // Entries that are client reviews are not re-created (prevents duplicates)
      const adminReviews = reviews.filter((r) => !(r.id && client.has(r.id)));
      if (adminReviews.length > 0) {
        await prisma.review.createMany({
          data: adminReviews.map((review) => ({
            rating: review.rating,
            comment: review.comment,
            clientName: review.clientName,
            clientTitle: review.clientTitle,
            consultantId: id,
            imageUrls: (review.reviewImages || []).map((img) => img.url),
            imageAltTexts: (review.reviewImages || []).map(
              (img) => img.alt || "",
            ),
            createdAt: review.createdAt
              ? new Date(review.createdAt)
              : new Date(),
          })),
        });
      }
    }

    // --- Handle Services Update ---
    if (services !== undefined) {
      // 1. Get existing services (retired plans are not in the form and stay retired)
      const existingServices = await prisma.service.findMany({
        where: { consultantId: id },
        select: { id: true, retired: true },
      });
      const existingIds = existingServices.map((s) => s.id);
      const offeredIds = existingServices.filter((s) => !s.retired).map((s) => s.id);

      // 2. Identify services to update, create, and remove (ids stay stable)
      const incomingIds = services
        .filter((s) => s.id)
        .map((s) => s.id as string);
      const servicesToCreate = services.filter(
        (s) => !s.id || !existingIds.includes(s.id),
      );
      const servicesToUpdate = services.filter(
        (s) => s.id && existingIds.includes(s.id),
      );
      const idsToRemove = offeredIds.filter((sid) => !incomingIds.includes(sid));

      // 3. Removed plans: booked ones are retired (kept for past bookings), unused ones deleted
      if (idsToRemove.length > 0) {
        const booked = (await prisma.booking.findRaw({
          filter: { serviceId: { $in: idsToRemove } },
          options: { projection: { serviceId: 1 } },
        })) as unknown as RawDoc[];
        const bookedIds = new Set((Array.isArray(booked) ? booked : []).map((b) => String(b.serviceId)));
        const toRetire = idsToRemove.filter((sid) => bookedIds.has(sid));
        const toDelete = idsToRemove.filter((sid) => !bookedIds.has(sid));
        if (toRetire.length > 0) {
          await prisma.service.updateMany({
            where: { id: { in: toRetire } },
            data: { retired: true },
          });
        }
        if (toDelete.length > 0) {
          await prisma.service.deleteMany({
            where: { id: { in: toDelete } },
          });
        }
      }

      // 4. Create new services
      if (servicesToCreate.length > 0) {
        await prisma.service.createMany({
          data: servicesToCreate.map((s) => ({
            name: s.name,
            price: s.price,
            duration: s.duration,
            sessionCount: s.sessionCount,
            platform: s.platform,
            consultantId: id,
          })),
        });
      }

      // 5. Update existing services
      for (const service of servicesToUpdate) {
        if (service.id) {
          await prisma.service.update({
            where: { id: service.id },
            data: {
              name: service.name,
              price: service.price,
              duration: service.duration,
              sessionCount: service.sessionCount,
              platform: service.platform,
            },
          });
        }
      }
    }

    await syncConsultantCopies(id);
    revalidateConsultantPaths(existing);
    revalidateConsultantPaths(updatedConsultant);
    return { success: true, data: updatedConsultant };
  } catch (error) {
    return handleError(error);
  }
}

// -----------------------------------------------------
// DELETE CONSULTANT
// -----------------------------------------------------
export async function deleteConsultant(id: string) {
  try {
    // Booking history must stay intact (same rule as the Backend's DELETE /api/consultants)
    const bookings = await prisma.booking.count({ where: { consultantId: id } });
    if (bookings > 0) {
      return {
        success: false,
        error: `This consultant has ${bookings} booking(s). Archive or hide them from the website instead of deleting, so booking history stays intact.`,
      };
    }

    const deletedConsultant = await prisma.$transaction(async (tx) => {
      const consultant = await tx.consultant.findUnique({
        where: { id },
        select: { id: true, seoMetaId: true, identifier: true },
      });

      if (!consultant) {
        throw new Error("Consultant not found.");
      }

      // 1. Delete direct children
      await tx.review.deleteMany({ where: { consultantId: id } });
      await tx.service.deleteMany({ where: { consultantId: id } });

      // 3. Delete the consultant
      const deleted = await tx.consultant.delete({
        where: { id },
      });

      // 4. Delete the related SeoMeta (use deleteMany to avoid error if missing)
      if (consultant.seoMetaId) {
        await tx.seoMeta.deleteMany({
          where: { id: consultant.seoMetaId },
        });
      }

      return deleted;
    });

    // The older lowercase `consultants` copy read by the panels goes too
    await prisma.$runCommandRaw({
      delete: "consultants",
      deletes: [{ q: { $or: [{ _id: id }, { id }] }, limit: 0 }],
    } as any);

    revalidatePath("/dashboard/consultants");
    revalidatePath(`/dashboard/consultants/${deletedConsultant.identifier}`);
    revalidatePath("/"); // Revalidate homepage cache
    return { success: true, data: deletedConsultant };
  } catch (error) {
    return handleError(error);
  }
}

// GET PROFESSIONS LIST
export async function listProfessions() {
  try {
    const professions = await prisma.profession.findMany();
    return { success: true, data: professions };
  } catch (error) {
    return handleError(error);
  }
}

export const getConsultantByProfessionByIdentifier = async (
  identifier: string,
  page: number = 1,
  limit: number = 10,
) => {
  try {
    const skip = (page - 1) * limit;

    const consultants = await prisma.consultant.findMany({
      where: { identifier },
      skip,
      take: limit,
      include: {
        profession: true,
        services: true,
        reviews: true,
        seoMeta: true,
      },
    });

    const total = await prisma.consultant.count({
      where: { identifier },
    });

    if (!consultants || consultants.length === 0) {
      return { success: false, error: "Consultant not found." };
    }

    return { success: true, data: consultants, total };
  } catch (error) {
    console.error(error); // optional: log the actual error for debugging
    return {
      success: false,
      error: "An error occurred while fetching the consultant.",
    };
  }
};
