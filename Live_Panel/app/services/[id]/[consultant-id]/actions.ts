"use server";

import { cache } from "react";
import * as yup from "yup";
import { prisma } from "@/lib/prisma";
import { sendMail } from "@/lib/mail";
import {
  AdminBookingEmailHtml,
  BookingConfirmationToConsultantHtml,
  BookingConfirmationToCustomerHtml,
} from "@/lib/email-templates";

export const getConsultantByIdentifier = cache(async (
  professionIdentifier: string,
  identifier: string,
) => {
  if (!professionIdentifier || !identifier) return null;

  const consultant = await prisma.consultant.findFirst({
    where: {
      identifier,
      profession: {
        identifier: professionIdentifier,
      },
    },
    include: {
      profession: {
        include: { seoMeta: true },
      },
      seoMeta: true,
      services: true,
      reviews: {
        include: {
          author: true,
        },
      },
    },
  });

  if (!consultant) return null;
  const ratingBreakdown = {
    fiveStar: consultant.reviews.filter((r) => r.rating === 5).length,
    fourStar: consultant.reviews.filter((r) => r.rating === 4).length,
    threeStar: consultant.reviews.filter((r) => r.rating === 3).length,
    twoStar: consultant.reviews.filter((r) => r.rating === 2).length,
    oneStar: consultant.reviews.filter((r) => r.rating === 1).length,
  };

  // const averageRating =
  //     consultant.reviews.length > 0
  //         ? consultant.reviews.reduce((acc, r) => acc + r.rating, 0) /
  //         consultant.reviews.length
  //         : 0;
  const averageRating = consultant.reviews.length
    ? Number(
        (
          consultant.reviews.reduce(
            (sum, review) => sum + (review.rating || 0),
            0,
          ) / consultant.reviews.length
        ).toFixed(1)
      )
    : 0;
  const lowestPrice =
    consultant.services.length > 0
      ? Math.min(...consultant.services.map((s) => s.price))
      : 0;

  const formatted = {
    profileUrl: consultant.photoUrl,
    profileUrlAltText: consultant.photoAltText,
    name: consultant.name,
    notificationTitle: consultant.notificationTitle,
    rating: averageRating,
    id: consultant.id,
    identifier: consultant.identifier,
    experience: consultant.experience,
    specialties: consultant.specialties,
    info: {
      patients: consultant.clientCount,
      bookingPrice: lowestPrice ? `₹${lowestPrice}` : "N/A",
      certified: consultant.isCertified,
      certificateUrls:
        consultant.certificateUrls?.map((url, index) => ({
          url,
          alt:
            consultant?.certificateAltTexts?.[index] ||
            `Certificate ${index + 1}`,
        })) || [],
      experience: `${consultant.experience}+ Yrs`,
      languages: consultant.languages,
    },
    description: consultant.about,
    videoUrl: consultant.youtubeUrl,
    userReview: {
      overallRating: averageRating,
      totalReviews: consultant.reviews.length,
      ratingBreakdown,
      reviewCards: consultant.reviews.map((r) => ({
        name: r?.clientName ?? "Anonymous",
        date: r.createdAt.toLocaleDateString("en-IN"),
        feedback: r.comment,
        profileUrl: r?.author?.image,
        rating: r.rating,
        imageUrls:
          r.imageUrls?.map((url, index) => ({
            url,
            alt: r?.imageAltTexts?.[index] || `Review Image ${index + 1}`,
          })) || [],
      })),
    },
  };

  return {
    consultant: formatted,
    services: consultant.services,
    seoMeta: consultant.seoMeta,
    profession: consultant.profession,
    faqs: consultant.faqs,
  };
});

const bookingSchema = yup.object({
  userId: yup.string().required("User ID is required"),
  consultantId: yup.string().required("Consultant ID is required"),
  serviceId: yup.string().required("Service ID is required"),
});

export const createBooking = async (data: any) => {
  try {
    const validated = await bookingSchema.validate(data, { abortEarly: false });
    const userHasPhoneNumber = await prisma.user.findUnique({
      where: { id: validated.userId },
      select: { phoneNumber: true },
    });
    if (!userHasPhoneNumber?.phoneNumber) {
      return {
        success: false,
        error: "Please add a phone number to your profile before booking.",
      };
    }
    const booking = await prisma.booking.create({
      data: {
        userId: validated.userId,
        consultantId: validated.consultantId,
        serviceId: validated.serviceId,
      },
      include: {
        user: true,
        consultant: {
          include: {
            profession: true,
          },
        },
        service: true,
      },
    });

    // Send Emails
    try {
      const date = new Date().toLocaleDateString("en-IN", {
        day: "numeric",
        month: "long",
        year: "numeric",
      });

      // 1. To Consultant
      if (booking.consultant.email) {
        const consultantHtml = BookingConfirmationToConsultantHtml({
          consultantName: booking.consultant.name,
          consultantImage: booking.consultant.photoUrl || undefined,
          customerName: booking.user.name || "Customer",
          planName: booking.service.name,
          date: date,
        });

        await sendMail({
          to: booking.consultant.email,
          subject: "New Booking Received! 🚀",
          html: consultantHtml,
        });
      }

      // 2. To Customer
      if (booking.user.email) {
        const customerHtml = BookingConfirmationToCustomerHtml({
          customerName: booking.user.name || "Customer",
          consultantName: booking.consultant.name,
          consultantImage: booking.consultant.photoUrl || undefined,
          profession: booking.consultant.profession?.name || "Consultant",
          experience: booking.consultant.experience,
          planName: booking.service.name,
          price: booking.service.price,
        });

        await sendMail({
          to: booking.user.email,
          subject: "Booking Confirmed! 🎉",
          html: customerHtml,
        });
      }

      // 3. To Admin
      const adminEmail = process.env.ADMIN_EMAIL || "hexpertifyapp@gmail.com";
      if (adminEmail) {
        const adminHtml = AdminBookingEmailHtml({
          booking: {
            serviceName: booking.service.name,
            consultantName: booking.consultant.name,
            status: "PENDING",
            date: date,
            userName: booking.user.name || "N/A",
            userEmail: booking.user.email || "N/A",
            userPhone: userHasPhoneNumber?.phoneNumber || "N/A",
          },
        });

        await sendMail({
          to: adminEmail,
          subject: "New Booking Alert 🔔",
          html: adminHtml,
        });
      }
    } catch (emailError) {
      console.error("Failed to send booking emails:", emailError);
      // Don't fail the booking if email fails, just log it
    }

    return { success: true, data: booking };
  } catch (err: any) {
    if (err instanceof yup.ValidationError) {
      return { success: false, error: err.errors };
    }

    console.error("Create booking error:", err);
    return { success: false, error: "Internal server error" };
  }
};
