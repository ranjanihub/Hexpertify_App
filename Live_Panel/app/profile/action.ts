"use server";

import { authConfig } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { revalidatePath } from "next/cache";

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

    const updatedUser = await prisma.user.update({
      where: { id: session.user.id },
      data: {
        name: data.name,
        email: data.email,
        phoneNumber: data.phoneNumber || null,
      },
    });

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
      where: { userId: session.user.id },
      include: {
        consultant: {
          select: {
            id: true,
            name: true,
            photoUrl: true,
            email: true,
          },
        },
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

export async function cancelBooking(bookingId: string) {
  try {
    const session = await getServerSession(authConfig);

    if (!session?.user?.id) {
      return { success: false, error: "Not authenticated" };
    }

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
    });

    if (!booking) {
      return { success: false, error: "Booking not found" };
    }

    if (booking.userId !== session.user.id) {
      return { success: false, error: "Unauthorized" };
    }

    const updatedBooking = await prisma.booking.update({
      where: { id: bookingId },
      data: { status: "CANCELLED" },
    });

    revalidatePath("/profile");
    return { success: true, booking: updatedBooking };
  } catch (error) {
    console.error("Error canceling booking:", error);
    return { success: false, error: "Failed to cancel booking" };
  }
}
