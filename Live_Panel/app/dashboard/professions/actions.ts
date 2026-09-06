"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

import * as Yup from "yup";

const professionSchema = Yup.object({
  name: Yup.string().required("Name is required"),
  identifier: Yup.string().required("Identifier is required"),
  imageUrl: Yup.string().url().nullable(),
  imageAltText: Yup.string().optional(),
  bannerUrl: Yup.string().url().nullable().optional(),
  bannerTitle: Yup.string().nullable().optional(),
  faqs: Yup.array()
    .of(
      Yup.object({
        question: Yup.string().required(),
        answer: Yup.string().required(),
      }),
    )
    .default([]),

  seoMeta: Yup.object({
    metaTitle: Yup.string().required(),
    metaDescription: Yup.string().required(),
    metaKeywords: Yup.array()
      .of(Yup.string().required())
      .transform((value) => value.filter(Boolean))
      .default([]),
    ogTitle: Yup.string().nullable().optional(),
    ogDescription: Yup.string().nullable().optional(),
    ogImage: Yup.string().nullable().optional(),
    ogImageAlt: Yup.string().nullable().optional(),
    htmlChunk: Yup.string().nullable().optional(),
  }),
});

// ✅ CREATE PROFESSION
export async function createProfession(data: any) {
  try {
    const validated = await professionSchema.validate(data, {
      abortEarly: false,
    });

    const result = await prisma.profession.create({
      data: {
        name: validated.name,
        identifier: validated.identifier,
        imageUrl: validated.imageUrl,
        imageAltText: validated.imageAltText,
        bannerUrl: validated.bannerUrl,
        bannerTitle: validated.bannerTitle,
        faqs: validated.faqs,
        seoMeta: {
          create: {
            metaTitle: validated.seoMeta.metaTitle,
            metaDescription: validated.seoMeta.metaDescription,
            metaKeywords: validated.seoMeta.metaKeywords,
            ogTitle: validated.seoMeta.ogTitle,
            ogDescription: validated.seoMeta.ogDescription,
            ogImage: validated.seoMeta.ogImage,
            ogImageAlt: validated.seoMeta.ogImageAlt,
            htmlChunk: validated.seoMeta.htmlChunk,
          },
        },
      },
    });

    revalidatePath("/dashboard/professions");
    revalidatePath("/"); // Revalidate homepage cache
    return { success: true, data: result };
  } catch (err: any) {
    return { success: false, error: err.errors || err.message };
  }
}

// ✅ LIST ALL PROFESSIONS
export async function listProfessions(page: number = 1, limit: number = 10) {
  try {
    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      prisma.profession.findMany({
        skip,
        include: { seoMeta: true },

        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      prisma.profession.count(),
    ]);

    return {
      success: true,
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
      items,
    };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// ✅ GET PROFESSION BY ID
export async function getProfessionById(id: string) {
  try {
    const profession = await prisma.profession.findUnique({
      where: { id },
      include: { seoMeta: true, consultants: true },
    });

    if (!profession) throw new Error("Profession not found");
    return { success: true, data: profession };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// ✅ UPDATE PROFESSION
export async function updateProfession(id: string, data: any) {
  try {
    if (!id) throw new Error("Profession ID is required");
    const validated = await professionSchema.validate(data, {
      abortEarly: false,
    });

    const result = await prisma.profession.update({
      where: { id },
      data: {
        name: validated.name,
        identifier: validated.identifier,
        imageUrl: validated.imageUrl,
        imageAltText: validated.imageAltText,
        bannerUrl: validated.bannerUrl,
        bannerTitle: validated.bannerTitle,
        faqs: validated.faqs,

        seoMeta: validated.seoMeta && {
          upsert: {
            create: {
              metaTitle: validated.seoMeta.metaTitle,
              metaDescription: validated.seoMeta.metaDescription,
              metaKeywords: validated.seoMeta.metaKeywords,
              ogTitle: validated.seoMeta.ogTitle,
              ogDescription: validated.seoMeta.ogDescription,
              ogImage: validated.seoMeta.ogImage,
              ogImageAlt: validated.seoMeta.ogImageAlt,
              htmlChunk: validated.seoMeta.htmlChunk,
            },
            update: {
              metaTitle: validated.seoMeta.metaTitle,
              metaDescription: validated.seoMeta.metaDescription,
              metaKeywords: validated.seoMeta.metaKeywords,
              ogTitle: validated.seoMeta.ogTitle,
              ogDescription: validated.seoMeta.ogDescription,
              ogImage: validated.seoMeta.ogImage,
              ogImageAlt: validated.seoMeta.ogImageAlt,
              htmlChunk: validated.seoMeta.htmlChunk,
            },
          },
        },
      },
    });

    revalidatePath(`/admin/professions/${id}`);
    revalidatePath("/"); // Revalidate homepage cache
    revalidatePath("/services");
    return { success: true, data: result };
  } catch (err: any) {
    return { success: false, error: err.errors || err.message };
  }
}

// ✅ DELETE PROFESSION
export async function deleteProfession(id: string) {
  try {
    await prisma.profession.delete({ where: { id } });
    revalidatePath("/admin/professions");
    revalidatePath("/"); // Revalidate homepage cache
    revalidatePath("/services");

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
