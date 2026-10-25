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

// Review schema for form input (without authorId - we'll add admin ID server-side)
const reviewInputSchema = yup.object({
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

    // Get current logged-in user ID for reviews
    const lowestService = services?.reduce(
      (min, s) => (s.price < min.price ? s : min),
      services[0],
    );

    const consultant = await prisma.consultant.create({
      data: {
        sequence: Number(consultantData.sequence) || null,
        ...consultantData,
        certificateUrls,
        certificateAltTexts,
        seoMetaId: seoMetaId, // Link the newly created SeoMeta
        minPrice: lowestService?.price ?? 0,
      },
      include: { seoMeta: true, profession: true },
    });

    // Create reviews if provided
    if (reviews && reviews.length > 0) {
      await prisma.review.createMany({
        data: reviews.map((review) => ({
          rating: review.rating,
          comment: review.comment,
          clientName: review.clientName,
          clientTitle: review.clientTitle,
          authorId: "ADMIN",
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

    return { success: true, data: consultant };
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

    const consultantUpdates = { ...consultantData } as typeof consultantData & {
      seoMetaId?: string;
    };
    const lowestService = services?.reduce(
      (min, s) => (s.price < min.price ? s : min),
      services[0],
    );
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
        minPrice: lowestService?.price ?? 0,
      },
      include: { seoMeta: true, profession: true },
    });

    // --- Handle Reviews Update ---
    if (reviews !== undefined) {
      // Delete all existing reviews for this consultant
      await prisma.review.deleteMany({
        where: { consultantId: id },
      });

      // Create new reviews if provided
      if (reviews.length > 0) {
        await prisma.review.createMany({
          data: reviews.map((review) => ({
            rating: review.rating,
            comment: review.comment,
            clientName: review.clientName,
            clientTitle: review.clientTitle,
            authorId: "ADMIN", // Use logged-in user ID
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
      // 1. Get existing services
      const existingServices = await prisma.service.findMany({
        where: { consultantId: id },
        select: { id: true },
      });
      const existingIds = existingServices.map((s) => s.id);

      // 2. Identify services to update, create, and delete
      const incomingIds = services
        .filter((s) => s.id)
        .map((s) => s.id as string);
      const servicesToCreate = services.filter((s) => !s.id);
      const servicesToUpdate = services.filter(
        (s) => s.id && existingIds.includes(s.id),
      );
      const idsToDelete = existingIds.filter((id) => !incomingIds.includes(id));

      // 3. Delete removed services
      if (idsToDelete.length > 0) {
        // Note: This might fail if bookings exist. We catch this in handleError.
        await prisma.service.deleteMany({
          where: { id: { in: idsToDelete } },
        });
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
    const deletedConsultant = await prisma.$transaction(async (tx) => {
      const consultant = await tx.consultant.findUnique({
        where: { id },
        select: { id: true, seoMetaId: true, identifier: true },
      });

      if (!consultant) {
        throw new Error("Consultant not found.");
      }

      // 1. Delete all dependent records (Child of Child first)
      // Bookings depend on Services and Consultants, so delete them first
      await tx.booking.deleteMany({ where: { consultantId: id } });

      // 2. Delete direct children
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
