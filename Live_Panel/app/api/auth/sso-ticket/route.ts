import { NextResponse } from "next/server";
import crypto from "crypto";

const SSO_SECRET = process.env.SSO_SECRET || "hexpertify_enterprise_sso_secret_key_2026_secure";

// In-memory single-use ticket registry (or MongoDB backed) with timestamps
const activeTickets = new Map<string, { payload: any; expiresAt: number; used: boolean }>();

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}

/**
 * POST /api/auth/sso-ticket
 * Generates a cryptographically signed, single-use, 60-second valid SSO ticket
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { user, targetRole } = body || {};

    if (!user || !user.id || !user.email) {
      return NextResponse.json(
        { success: false, error: "Valid user object with ID and email is required" },
        { status: 400, headers: { "Access-Control-Allow-Origin": "*" } }
      );
    }

    const payload = {
      id: String(user.id),
      name: user.name || "Hexpertify User",
      email: user.email,
      role: targetRole || user.role || "therapist",
      title: user.profession || user.title || undefined,
      avatarUrl: user.photo || user.avatarUrl || user.photoUrl || undefined,
      timestamp: Date.now(),
      nonce: crypto.randomBytes(16).toString("hex"),
    };

    const payloadString = JSON.stringify(payload);
    const signature = crypto
      .createHmac("sha256", SSO_SECRET)
      .update(payloadString)
      .digest("hex");

    const ticket = Buffer.from(JSON.stringify({ payload, signature })).toString("base64url");

    // Register ticket as active with 60-second expiry
    activeTickets.set(ticket, {
      payload,
      expiresAt: Date.now() + 60 * 1000,
      used: false,
    });

    // Cleanup expired tickets
    const now = Date.now();
    for (const [key, val] of activeTickets.entries()) {
      if (val.expiresAt < now) {
        activeTickets.delete(key);
      }
    }

    return NextResponse.json(
      {
        success: true,
        ticket,
        expiresIn: 60,
        message: "Cryptographic SSO ticket generated successfully",
      },
      { headers: { "Access-Control-Allow-Origin": "*" } }
    );
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to generate SSO ticket" },
      { status: 500, headers: { "Access-Control-Allow-Origin": "*" } }
    );
  }
}
