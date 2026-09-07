import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, password, role } = body || {};

    if (!email) {
      return NextResponse.json(
        { success: false, error: "Email is required" },
        {
          status: 400,
          headers: { "Access-Control-Allow-Origin": "*" },
        }
      );
    }

    const cleanEmail = email.toLowerCase().trim();

    // ─────────────────────────────────────────────────────────────
    // 1. SUPER ADMIN LOGIN
    // Controls all over the application (users, therapists, CMS, finance)
    // ─────────────────────────────────────────────────────────────
    if (role === "admin" || role === "super_admin" || cleanEmail === "admin@hexpertify.com" || cleanEmail === "admin@example.com" || cleanEmail === "ranjaniranjani5694@gmail.com" || cleanEmail.startsWith("admin@")) {
      let adminUser = await prisma.user.findUnique({
        where: { email: cleanEmail },
      });

      // If user exists and is not ADMIN and not the master admin email
      if (adminUser && adminUser.role !== "ADMIN" && cleanEmail !== "admin@hexpertify.com" && cleanEmail !== "admin@example.com" && cleanEmail !== "ranjaniranjani5694@gmail.com") {
        return NextResponse.json(
          {
            success: false,
            error: "Administrative access denied. This account does not possess Super Administrator privileges.",
          },
          {
            status: 403,
            headers: { "Access-Control-Allow-Origin": "*" },
          }
        );
      }

      if (!adminUser) {
        adminUser = await prisma.user.create({
          data: {
            email: cleanEmail,
            name: "Super Administrator",
            role: "ADMIN",
          },
        });
      }

      return NextResponse.json(
        {
          success: true,
          role: "super_admin",
          redirectUrl: "/admin",
          user: {
            id: adminUser.id,
            name: adminUser.name || "Super Administrator",
            email: adminUser.email,
            role: "super_admin",
            avatarUrl:
              adminUser.image ||
              "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100",
          },
          message: "Super Admin authenticated with full system control.",
        },
        { headers: { "Access-Control-Allow-Origin": "*" } }
      );
    }

    // ─────────────────────────────────────────────────────────────
    // 2. THERAPIST / CONSULTANT LOGIN
    // Manages tasks, activities, assessments & clinical care for clients.
    // STRICT RULE: Only therapists registered in the Super Admin DB can log in.
    // ─────────────────────────────────────────────────────────────
    if (role === "therapist" || role === "consultant") {
      const consultant = await prisma.consultant.findFirst({
        where: { email: cleanEmail },
        include: {
          profession: true,
        },
      });

      if (!consultant) {
        return NextResponse.json(
          {
            success: false,
            error: `Therapist email "${cleanEmail}" was not found in the practitioner database. Only therapists registered in the Super Admin panel can log in to the Consultant Suite.`,
          },
          {
            status: 403,
            headers: { "Access-Control-Allow-Origin": "*" },
          }
        );
      }

      const therapistUser = {
        id: consultant.id,
        name: consultant.name,
        email: consultant.email,
        title: consultant.profession?.name || "Licensed Clinical Psychologist & Consultant",
        role: "therapist",
        avatarInitials: consultant.name
          .split(" ")
          .map((n) => n[0])
          .join("")
          .slice(0, 2)
          .toUpperCase(),
        photoUrl:
          consultant.photoUrl ||
          "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&w=400&q=80",
        image:
          consultant.photoUrl ||
          "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&w=400&q=80",
      };

      return NextResponse.json(
        {
          success: true,
          role: "therapist",
          redirectUrl: "/consultant",
          user: therapistUser,
          message: "Therapist authenticated from MongoDB Atlas practitioner directory.",
        },
        { headers: { "Access-Control-Allow-Origin": "*" } }
      );
    }

    // ─────────────────────────────────────────────────────────────
    // 3. CLIENT LOGIN
    // Client who takes consultation; accesses sessions, activities, assessments.
    // ─────────────────────────────────────────────────────────────
    let user = await prisma.user.findUnique({
      where: { email: cleanEmail },
      include: {
        bookings: {
          include: {
            consultant: true,
          },
        },
      },
    });

    if (!user) {
      const namePart = cleanEmail.split("@")[0].replace(/[^a-zA-Z]/g, " ").trim();
      const formattedName = namePart
        ? namePart.charAt(0).toUpperCase() + namePart.slice(1)
        : "Client User";

      user = await prisma.user.create({
        data: {
          email: cleanEmail,
          name: formattedName,
          role: "USER",
        },
        include: {
          bookings: {
            include: {
              consultant: true,
            },
          },
        },
      });
    }

    const latestBooking = user.bookings?.[0];
    const assignedTherapist = latestBooking?.consultant;

    const clientUser = {
      id: user.id,
      name: user.name || "Client User",
      email: user.email,
      role: "client",
      phone: user.phoneNumber || "",
      avatarUrl:
        user.image ||
        "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80",
      assignedTherapistName: assignedTherapist?.name || "Dr. Evelyn Reed, PhD",
      assignedTherapistPhoto: assignedTherapist?.photoUrl || "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&w=400&q=80",
      firstConsultationCompleted: (user.bookings && user.bookings.length > 0) || true,
    };

    return NextResponse.json(
      {
        success: true,
        role: "client",
        redirectUrl: "/client",
        user: clientUser,
        message: "Client authenticated for consultation & therapy outcomes.",
      },
      { headers: { "Access-Control-Allow-Origin": "*" } }
    );
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Database authentication error",
      },
      {
        status: 500,
        headers: { "Access-Control-Allow-Origin": "*" },
      }
    );
  }
}
