"use server";

import { cache } from "react";
import * as yup from "yup";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authConfig } from "@/lib/auth";
import { sendMail } from "@/lib/mail";
import { activeServices, isConsultantPublic, isProfessionPublic, lowestPrice as lowestServicePrice } from "@/lib/visibility";
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

  // Hidden, archived or inactive profiles (and hidden professions) are not public
  if (!consultant || !isConsultantPublic(consultant) || !isProfessionPublic(consultant.profession)) return null;
  const services = activeServices(consultant.services);
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
  const lowestPrice = lowestServicePrice(services, consultant.minPrice) ?? 0;

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
    // Admin switch: the profile stays visible but cannot be booked
    bookingDisabled: Boolean(consultant.isBookingGreyedOut),
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
    services,
    seoMeta: consultant.seoMeta,
    profession: consultant.profession,
    faqs: consultant.faqs,
  };
});

const bookingSchema = yup.object({
  consultantId: yup.string().required("Consultant ID is required"),
  serviceId: yup.string().required("Service ID is required"),
});

async function callBackend(path: string, body: Record<string, any>) {
  const baseUrl = process.env.BACKEND_URL;
  const internalKey = process.env.INTERNAL_API_KEY;
  if (!baseUrl || !internalKey) {
    throw new Error("Online payments are not configured. Please contact support.");
  }
  const res = await fetch(`${baseUrl.replace(/\/$/, "")}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Internal-Key": internalKey },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
}

/**
 * Step 1: creates a booking awaiting payment and a gateway order for it.
 * The price is resolved on the server from the selected service.
 */
export const initiateBookingPayment = async (data: any) => {
  try {
    const session: any = await getServerSession(authConfig);
    const userId = session?.user?.id;
    if (!userId) {
      return { success: false, error: "Please sign in to book a consultation." };
    }

    const validated = await bookingSchema.validate(data, { abortEarly: false });
    const userHasPhoneNumber = await prisma.user.findUnique({
      where: { id: userId },
      select: { phoneNumber: true },
    });
    if (!userHasPhoneNumber?.phoneNumber) {
      return {
        success: false,
        error: "Please add a phone number to your profile before booking.",
      };
    }

    const service = await prisma.service.findFirst({
      where: { id: validated.serviceId, consultantId: validated.consultantId },
      select: { id: true, retired: true, consultant: { select: { isHiddenFromLive: true, isArchived: true, accountStatus: true, isBookingGreyedOut: true } } },
    });
    if (!service || service.retired) {
      return { success: false, error: "This service is no longer available." };
    }
    if (!isConsultantPublic(service.consultant) || service.consultant.isBookingGreyedOut) {
      return { success: false, error: "This therapist isn't taking new bookings right now." };
    }

    const booking = await prisma.booking.create({
      data: {
        userId,
        consultantId: validated.consultantId,
        serviceId: validated.serviceId,
        status: "PENDING_PAYMENT",
        paymentStatus: "PENDING",
      },
    });

    const { ok, data: order } = await callBackend("/api/payments/order", {
      source: "live",
      bookingId: booking.id,
    });
    if (!ok || !order?.success) {
      await prisma.booking.update({ where: { id: booking.id }, data: { status: "EXPIRED", paymentStatus: "FAILED" } }).catch(() => {});
      return { success: false, error: order?.error || "Could not start the payment. Please try again." };
    }

    return {
      success: true,
      data: {
        bookingId: booking.id,
        paymentId: order.paymentId as string,
        amount: order.amount as number,
        checkout: order.checkout,
      },
    };
  } catch (err: any) {
    if (err instanceof yup.ValidationError) {
      return { success: false, error: err.errors.join(", ") };
    }
    console.error("Initiate booking payment error:", err);
    return { success: false, error: err?.message || "Internal server error" };
  }
};

/**
 * Step 2: verifies the payment with the gateway (via the Backend) and, if this call
 * confirmed the booking, sends the confirmation emails.
 */
export const confirmBookingPayment = async (paymentId: string, gatewayResponse: Record<string, any> = {}) => {
  try {
    const { status, data: result } = await callBackend("/api/payments/verify", {
      ...gatewayResponse,
      paymentId,
    });

    if (result?.status === "PENDING" || status === 202) {
      return { success: false, pending: true, error: result?.error || "Payment is still processing. We will email you once it is confirmed." };
    }
    if (!result?.success) {
      return { success: false, error: result?.error || "Payment could not be verified." };
    }

    const booking = await prisma.booking.findUnique({
      where: { id: result.bookingId },
      include: {
        user: true,
        consultant: { include: { profession: true } },
        service: true,
      },
    });

    // Emails are sent only by whoever confirmed the payment first (this call or the gateway webhook)
    if (booking && result.newlyConfirmed) {
      await sendBookingEmails(booking);
    }

    return { success: true, data: booking };
  } catch (err: any) {
    console.error("Confirm booking payment error:", err);
    return { success: false, error: err?.message || "Internal server error" };
  }
};

async function sendBookingEmails(booking: any) {
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
        price: booking.amount ?? booking.service.price,
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
          status: "CONFIRMED (PAID)",
          date: date,
          userName: booking.user.name || "N/A",
          userEmail: booking.user.email || "N/A",
          userPhone: booking.user.phoneNumber || "N/A",
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
}
