"use server";

import { BookingStatus } from "@/generated/prisma";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { sendMail } from "@/lib/mail";
import {
  BookingConfirmationToCustomerHtml,
  ConsultationCompletedToCustomerHtml,
} from "@/lib/email-templates";

// ------------------------------------------------------
// ✅ 1. Get Paginated Bookings
// ------------------------------------------------------
export async function listBookings(
  page: number = 1,
  limit: number = 10,
  filters?: {
    status?: string;
    userId?: string;
    consultantId?: string;
    search?: string;
  },
) {
  try {
    const skip = (page - 1) * limit;

    const where: any = {};
    if (filters?.status) where.status = filters.status;
    if (filters?.userId) where.userId = filters.userId;
    if (filters?.consultantId) where.consultantId = filters.consultantId;

    // Add search functionality
    if (filters?.search && filters.search.trim() !== "") {
      const searchTerm = filters.search.trim();
      where.OR = [
        { user: { name: { contains: searchTerm, mode: "insensitive" } } },
        { user: { email: { contains: searchTerm, mode: "insensitive" } } },
        { consultant: { name: { contains: searchTerm, mode: "insensitive" } } },
        { service: { name: { contains: searchTerm, mode: "insensitive" } } },
      ];
    }

    const [data, total] = await Promise.all([
      prisma.booking.findMany({
        skip,
        take: limit,
        where,
        include: {
          user: true,
          consultant: true,
          service: true,
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.booking.count({ where }),
    ]);

    return {
      success: true,
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
      data,
    };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}

// ------------------------------------------------------
// ✅ 2. Update Booking Status (Approve / Confirm / Cancel)
export async function updateBookingStatus(id: string, status: string) {
  try {
    const allowed = [
      BookingStatus.PENDING,
      BookingStatus.CONFIRMED,
      BookingStatus.COMPLETED,
      BookingStatus.CANCELLED,
    ];

    if (!allowed.includes(status as BookingStatus)) {
      return { success: false, message: "Invalid booking status" };
    }

    const updated = await prisma.booking.update({
      where: { id },
      data: { status: status as BookingStatus },
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

    // Send Email if Confirmed
    if (status === BookingStatus.CONFIRMED && updated.user.email) {
      try {
        const html = BookingConfirmationToCustomerHtml({
          customerName: updated.user.name || "Customer",
          consultantName: updated.consultant.name,
          consultantImage: updated.consultant.photoUrl || undefined,
          profession: updated.consultant.profession?.name || "Consultant",
          experience: updated.consultant.experience,
          planName: updated.service.name,
          price: updated.service.price,
          status: "Confirmed",
        });

        await sendMail({
          to: updated.user.email,
          subject: "Booking Confirmed! ✅",
          html,
        });
      } catch (emailError) {
        console.error("Failed to send confirmation email:", emailError);
      }
    }

    // Send Email if Completed
    if (status === BookingStatus.COMPLETED && updated.user.email) {
      try {
        const html = ConsultationCompletedToCustomerHtml({
          customerName: updated.user.name || "Customer",
          consultantName: updated.consultant.name,
          consultantImage: updated.consultant.photoUrl || undefined,
          appointmentUrl: `${process.env.NEXT_PUBLIC_APP_URL || "https://hexpertify.com"}/dashboard/bookings`,
        });

        await sendMail({
          to: updated.user.email,
          subject: "Consultation Completed! 🎉",
          html,
        });
      } catch (emailError) {
        console.error("Failed to send completion email:", emailError);
      }
    }

    revalidatePath("/dashboard/bookings");
    revalidatePath("/"); // Revalidate homepage cache

    return {
      success: true,
      message: "Booking status updated",
      data: updated,
    };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}
