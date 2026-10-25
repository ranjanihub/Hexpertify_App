"use server";

import { BookingStatus } from "@/generated/prisma";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { backendConfigured, callBackend } from "@/lib/backend";

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
    // Unpaid/abandoned checkouts are not real bookings yet
    else where.status = { notIn: [BookingStatus.PENDING_PAYMENT, BookingStatus.EXPIRED] };
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

    const [rows, total] = await Promise.all([
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

    // Bookings made in the panels may have no website account or plan: use the client/service they store
    const missing = rows.filter((b) => !b.user || !b.service).map((b) => b.id);
    const stored = new Map<string, any>();
    if (missing.length) {
      const raw = (await prisma.booking.findRaw({
        filter: { _id: { $in: missing } },
        options: { projection: { clientName: 1, clientEmail: 1, clientPhone: 1, serviceTitle: 1 } },
      })) as unknown as any[];
      raw.forEach((r) => stored.set(String(r._id), r));
    }
    const data = rows.map((b) => {
      const s = stored.get(b.id) || {};
      return {
        ...b,
        user: b.user ?? { name: s.clientName || "Client", email: s.clientEmail || "", phoneNumber: s.clientPhone || null },
        service: b.service ?? {
          name: s.serviceTitle || "Consultation",
          platform: "G-Meet",
          duration: b.durationMinutes ?? 50,
          price: b.amount ?? 0,
        },
        // When the session happens (India-time labels / instant); null until a website booking is scheduled
        toBeScheduled: !b.scheduledAt && !b.date,
      };
    });

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
// ------------------------------------------------------
// ✅ 2. Update Booking Status (Approve / Confirm / Cancel)
// The central Backend applies the change and emails the client, the expert and the admins.
export async function updateBookingStatus(id: string, status: string) {
  try {
    const allowed: BookingStatus[] = [
      BookingStatus.PENDING,
      BookingStatus.CONFIRMED,
      BookingStatus.RESCHEDULED,
      BookingStatus.COMPLETED,
      BookingStatus.CANCELLED,
      BookingStatus.NO_SHOW_CLIENT,
      BookingStatus.NO_SHOW_CONSULTANT,
    ];

    if (!allowed.includes(status as BookingStatus)) {
      return { success: false, message: "Invalid booking status" };
    }

    if (backendConfigured()) {
      const { ok, data } = await callBackend(`/api/bookings/${encodeURIComponent(id)}`, { status }, "PUT");
      if (!ok || !data?.success) {
        return { success: false, message: data?.error || "Could not update the booking" };
      }
    } else {
      // Local development without the Backend: status changes only, no emails
      await prisma.booking.update({ where: { id }, data: { status: status as BookingStatus } });
    }

    const updated = await prisma.booking.findUnique({
      where: { id },
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
