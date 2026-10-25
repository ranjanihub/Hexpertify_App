"use server";

import { authConfig } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { backendConfigured, callBackend } from "@/lib/backend";
import { getServerSession } from "next-auth";
import { revalidatePath } from "next/cache";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function updateUserProfile(data: {
  name: string;
  email: string;
  phoneNumber: string;
}) {
  try {
    const session = await getServerSession(authConfig);

    if (!session?.user?.id) {
      return { success: false, error: "Not authenticated" };
    }
    const userId = session.user.id;

    const current = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true },
    });
    if (!current) {
      return { success: false, error: "User not found" };
    }

    // Emails are stored lowercased and must belong to one account only
    const oldEmail = current.email || "";
    const email = String(data.email || "").trim().toLowerCase() || oldEmail;
    if (email && !EMAIL_RE.test(email)) {
      return { success: false, error: "Please enter a valid email address" };
    }
    const emailChanged = email.toLowerCase() !== oldEmail.toLowerCase();
    if (emailChanged) {
      const taken = await prisma.user.findFirst({
        where: { email: { equals: email, mode: "insensitive" }, NOT: { id: userId } },
        select: { id: true },
      });
      if (taken) {
        return { success: false, error: "This email is already used by another account" };
      }
    }

    const phone = String(data.phoneNumber || "").trim() || null;

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        name: data.name,
        email: email || null,
        phoneNumber: phone,
      },
    });

    // The panels read `phone`; the website reads `phoneNumber`
    await prisma.$runCommandRaw({
      update: "User",
      updates: [{ q: { _id: userId }, u: { $set: { phone } } }],
    });

    // Bookings carry the client's email for notifications: keep them in step
    if (emailChanged && email) {
      const oldEmails = Array.from(new Set([oldEmail, oldEmail.toLowerCase()].filter(Boolean)));
      const match: any[] = [{ userId }, { clientId: userId }];
      if (oldEmails.length) match.push({ clientEmail: { $in: oldEmails } });
      for (const collection of ["Booking", "bookings"]) {
        await prisma.$runCommandRaw({
          update: collection,
          updates: [{ q: { $or: match }, u: { $set: { clientEmail: email } }, multi: true }],
        });
      }
    }

    revalidatePath("/profile");
    return { success: true, user: updatedUser };
  } catch (error) {
    console.error("Error updating profile:", error);
    return { success: false, error: "Failed to update profile" };
  }
}

export async function getUserProfile() {
  try {
    const session = await getServerSession(authConfig);

    if (!session?.user?.id) {
      return { success: false, error: "Not authenticated" };
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        phoneNumber: true,
        image: true,
        role: true,
        createdAt: true,
      },
    });

    if (!user) {
      return { success: false, error: "User not found" };
    }

    return { success: true, user };
  } catch (error) {
    console.error("Error fetching profile:", error);
    return { success: false, error: "Failed to fetch profile" };
  }
}

export async function getUserBookings() {
  try {
    const session = await getServerSession(authConfig);

    if (!session?.user?.id) {
      return { success: false, error: "Not authenticated" };
    }

    const bookings = await prisma.booking.findMany({
      // Unpaid/abandoned checkouts are not real bookings yet
      where: { userId: session.user.id, status: { notIn: ["PENDING_PAYMENT", "EXPIRED"] } },
      include: {
        consultant: {
          select: {
            id: true,
            name: true,
            photoUrl: true,
            email: true,
          },
        },
        // Optional: bookings made in the panels may have no plan
        service: {
          select: {
            id: true,
            name: true,
            price: true,
            duration: true,
            sessionCount: true,
            platform: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return { success: true, bookings };
  } catch (error) {
    console.error("Error fetching bookings:", error);
    return { success: false, error: "Failed to fetch bookings" };
  }
}

/** The client cancels their own booking. The central Backend applies it and emails the client, the expert and the admins. */
export async function cancelBooking(bookingId: string) {
  try {
    const session = await getServerSession(authConfig);

    if (!session?.user?.id) {
      return { success: false, error: "Not authenticated" };
    }

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      select: { id: true, userId: true, status: true },
    });

    if (!booking) {
      return { success: false, error: "Booking not found" };
    }

    if (booking.userId !== session.user.id) {
      return { success: false, error: "Unauthorized" };
    }

    if (!["PENDING", "CONFIRMED", "RESCHEDULED"].includes(booking.status)) {
      return { success: false, error: "This booking can no longer be cancelled" };
    }

    if (backendConfigured()) {
      const { ok, data } = await callBackend(
        `/api/bookings/${encodeURIComponent(bookingId)}`,
        { status: "CANCELLED", actor: "client" },
        "PUT",
      );
      if (!ok || !data?.success) {
        return { success: false, error: data?.error || "Failed to cancel booking" };
      }
    } else {
      // Local development without the Backend: status change only, no emails
      await prisma.booking.update({
        where: { id: bookingId },
        data: { status: "CANCELLED" },
      });
    }

    revalidatePath("/profile");
    return { success: true };
  } catch (error) {
    console.error("Error canceling booking:", error);
    return { success: false, error: "Failed to cancel booking" };
  }
}
