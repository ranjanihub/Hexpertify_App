import { NextResponse } from "next/server";
import crypto from "crypto";

const SSO_SECRET = process.env.SSO_SECRET || "hexpertify_enterprise_sso_secret_key_2026_secure";

// Shared ticket store with sso-ticket route
declare global {
  var __HEXPERTIFY_SSO_TICKETS__: Map<string, { payload: any; expiresAt: number; used: boolean }> | undefined;
}

if (!global.__HEXPERTIFY_SSO_TICKETS__) {
  global.__HEXPERTIFY_SSO_TICKETS__ = new Map();
}

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
 * POST /api/auth/sso-verify
 * Verifies a signed SSO ticket, ensures it is within 60s validity, and prevents replay
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { ticket } = body || {};

    if (!ticket || typeof ticket !== "string") {
      return NextResponse.json(
        { success: false, error: "Valid SSO ticket string is required" },
        { status: 400, headers: { "Access-Control-Allow-Origin": "*" } }
      );
    }

    let decoded: { payload: any; signature: string };
    try {
      const jsonStr = Buffer.from(ticket, "base64url").toString("utf-8");
      decoded = JSON.parse(jsonStr);
    } catch {
      return NextResponse.json(
        { success: false, error: "Malformed SSO ticket format" },
        { status: 400, headers: { "Access-Control-Allow-Origin": "*" } }
      );
    }

    const { payload, signature } = decoded;

    if (!payload || !signature) {
      return NextResponse.json(
        { success: false, error: "Invalid ticket structure" },
        { status: 400, headers: { "Access-Control-Allow-Origin": "*" } }
      );
    }

    // 1. Verify cryptographic HMAC signature
    const expectedSignature = crypto
      .createHmac("sha256", SSO_SECRET)
      .update(JSON.stringify(payload))
      .digest("hex");

    if (signature !== expectedSignature) {
      return NextResponse.json(
        { success: false, error: "Invalid cryptographic signature. Ticket has been tampered with." },
        { status: 401, headers: { "Access-Control-Allow-Origin": "*" } }
      );
    }

    // 2. Verify timestamp expiration (max 60 seconds)
    const now = Date.now();
    const ticketAge = now - (payload.timestamp || 0);
    if (ticketAge > 60 * 1000 || ticketAge < -5000) {
      return NextResponse.json(
        { success: false, error: "SSO ticket has expired (valid for 60 seconds only)" },
        { status: 401, headers: { "Access-Control-Allow-Origin": "*" } }
      );
    }

    // 3. Prevent replay attacks (single-use verification)
    if (!global.__HEXPERTIFY_SSO_TICKETS__) {
      global.__HEXPERTIFY_SSO_TICKETS__ = new Map();
    }
    const registry = global.__HEXPERTIFY_SSO_TICKETS__;
    const registered = registry.get(ticket);
    if (registered && registered.used) {
      return NextResponse.json(
        { success: false, error: "SSO ticket has already been redeemed (Single-Use Only)" },
        { status: 401, headers: { "Access-Control-Allow-Origin": "*" } }
      );
    }

    if (registered) {
      registered.used = true;
    } else {
      registry.set(ticket, { payload, expiresAt: now + 60000, used: true });
    }

    return NextResponse.json(
      {
        success: true,
        user: {
          id: payload.id,
          name: payload.name,
          email: payload.email,
          role: payload.role,
          title: payload.title || "Licensed Clinical Practitioner",
          photoUrl: payload.avatarUrl || "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&w=400&q=80",
          avatarUrl: payload.avatarUrl || "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&w=400&q=80"
        },
        message: "SSO ticket verified successfully. Authenticated session established.",
      },
      { headers: { "Access-Control-Allow-Origin": "*" } }
    );
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to verify SSO ticket" },
      { status: 500, headers: { "Access-Control-Allow-Origin": "*" } }
    );
  }
}
