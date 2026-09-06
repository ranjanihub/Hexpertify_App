// app/actions/auth.ts
"use server";

import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

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

    // --- 2. Check for existing user ---
    const existingUser = await prisma.user.findUnique({
      where: { email: email },
    });

    if (existingUser) {
      return { success: false, message: "User with this email already exists" };
    }

    // --- 3. Hash password and create user ---
    const hashedPassword = await bcrypt.hash(password, 10);

    await prisma.user.create({
      data: {
        email,
        name,
        phoneNumber: phoneNumber || null,
        password: hashedPassword,
      },
    });

    // --- 4. Return success ---
    return { success: true, message: "Account created successfully!" };
  } catch (error: any) {
    console.error("REGISTER_ACTION_ERROR:", error);
    return { success: false, message: "An internal server error occurred" };
  }
}
