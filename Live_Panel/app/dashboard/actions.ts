"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function savePageAction(values: any) {
  try {
    const {
      identifier,
      notificationTitle,
      carouselImages,
      seoMeta,
      faqs,
      testimonials,
    } = values;
    const trimmedNotificationTitle = notificationTitle?.trim() || null;

    // Separate carouselImages into parallel arrays
    const carouselImageUrls = (carouselImages || []).map((img: any) => img.url);
    const carouselImageAltTexts = (carouselImages || []).map(
      (img: any) => img.alt || "",
    );
    const carouselImageIsMobileFlags = (carouselImages || []).map(
      (img: any) => img.carouselImageIsMobileFlags || false,
    );

    // Map testimonials to match schema (TestimonialItem)
    // Schema: quote, authorName, authorProfessional?, authorImageUrl?, authorEmail?, authorImageAltText?
    // Form: content, author, authorProfessional, authorImageUrl, authorEmail, authorImageAltText
    const mappedTestimonials = testimonials.map((t: any) => ({
      quote: t.content,
      authorName: t.author,
      authorProfessional: t.authorProfessional || "", // Optional in schema
      authorImageUrl: t.authorImageUrl || "", // Optional in schema
      authorImageAltText: t.authorImageAltText || "", // Optional in schema
      authorEmail: t.authorEmail || "", // Optional in schema
    }));

    // Use upsert to ensure we update if exists, or create if new
    await prisma.page.upsert({
      where: { identifier: identifier },
      update: {
        notificationTitle: trimmedNotificationTitle,
        carouselImageUrls,
        carouselImageAltTexts,
        carouselImageIsMobileFlags,
        seoMeta: {
          upsert: {
            create: {
              metaTitle: seoMeta.metaTitle,
              metaDescription: seoMeta.metaDescription,
              metaKeywords: seoMeta.metaKeywords,
              ogTitle: seoMeta.ogTitle,
              ogDescription: seoMeta.ogDescription,
              ogImage: seoMeta.ogImage,
              ogImageAlt: seoMeta.ogImageAlt,
            },
            update: {
              metaTitle: seoMeta.metaTitle,
              metaDescription: seoMeta.metaDescription,
              metaKeywords: seoMeta.metaKeywords,
              ogTitle: seoMeta.ogTitle,
              ogDescription: seoMeta.ogDescription,
              ogImage: seoMeta.ogImage,
              ogImageAlt: seoMeta.ogImageAlt,
            },
          },
        },
        // For embedded types (Composite Types in MongoDB), direct assignment works
        faqs: faqs,
        testimonials: mappedTestimonials,
      },
      create: {
        identifier,
        notificationTitle: trimmedNotificationTitle,
        carouselImageUrls,
        carouselImageAltTexts,
        carouselImageIsMobileFlags,
        seoMeta: {
          create: {
            metaTitle: seoMeta.metaTitle,
            metaDescription: seoMeta.metaDescription,
            metaKeywords: seoMeta.metaKeywords,
            ogTitle: seoMeta.ogTitle,
            ogDescription: seoMeta.ogDescription,
            ogImage: seoMeta.ogImage,
            ogImageAlt: seoMeta.ogImageAlt,
          },
        },
        faqs: faqs,
        testimonials: mappedTestimonials,
      },
    });

    revalidatePath("/dashboard");
    revalidatePath("/"); // Revalidate homepage cache
    return { success: true, message: "Page saved successfully" };
  } catch (error) {
    console.error("Failed to save page:", error);
    return { success: false, message: "Failed to save data" };
  }
}
