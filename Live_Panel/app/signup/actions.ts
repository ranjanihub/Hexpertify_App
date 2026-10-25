// app/actions/auth.ts
"use server";

import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { sendWelcomeEmail } from "@/lib/backend";

// Define the shape of the return object
interface ActionResult {
  success: boolean;
  message: string;
}

export async function registerUser(formData: FormData): Promise<ActionResult> {
  const name = formData.get("name") as string;
  const email = formData.get("email") as string;
  const phoneNumber = formData.get("phoneNumber") as string;
  const password = formData.get("password") as string;

  try {
    // --- 1. Validation ---
    if (!email || !name || !password) {
      return { success: false, message: "Missing required fields" };
    }

    if (password.length < 8) {
      return {
        success: false,
        message: "Password must be at least 8 characters long",
      };
    }

    const cleanEmail = email.toLowerCase().trim();
    const cleanName = name.trim();

    // --- 2. Check for existing user ---
    const existingUser = await prisma.user.findUnique({
      where: { email: cleanEmail },
    });

    if (existingUser) {
      return { success: false, message: "User with this email already exists" };
    }

    // --- 3. Hash password and create user ---
    const hashedPassword = await bcrypt.hash(password, 10);

    const cleanPhone = phoneNumber?.trim() || null;
    const created = await prisma.user.create({
      data: {
        email: cleanEmail,
        name: cleanName,
        phoneNumber: cleanPhone,
        password: hashedPassword,
        role: "USER",
      },
    });

    // The panels read `phone` (not in the Prisma model): keep both fields in sync
    if (cleanPhone) {
      await prisma
        .$runCommandRaw({ update: "User", updates: [{ q: { _id: created.id }, u: { $set: { phone: cleanPhone } } }] })
        .catch(() => {});
    }

    await sendWelcomeEmail(cleanName, cleanEmail);

    // --- 4. Return success ---
    return { success: true, message: "Account created successfully!" };
  } catch (error: any) {
    console.error("REGISTER_ACTION_ERROR:", error);
    return { success: false, message: "An internal server error occurred" };
  }
}
