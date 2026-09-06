import { NextResponse } from "next/server";
import { MongoClient, ObjectId } from "mongodb";
import dns from "dns";

dns.setServers(["8.8.8.8", "1.1.1.1"]);

const TARGET_URI = "mongodb+srv://ranjaniranjani5694_db_user:1kCjOE72je4p0CFU@cluster0.ibhuunq.mongodb.net/hexpertify?retryWrites=true&w=majority";

let client: MongoClient | null = null;
async function getDb() {
  if (!client) {
    client = new MongoClient(TARGET_URI);
    await client.connect();
  }
  return client.db("hexpertify");
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const email = searchParams.get("email");
    const id = searchParams.get("id");

    const db = await getDb();
    let query: any = {};

    if (id && ObjectId.isValid(id)) {
      query = { _id: new ObjectId(id) };
    } else if (email) {
      query = { email: email.toLowerCase().trim() };
    } else {
      // Return first user or default
      const u = await db.collection("users").findOne({});
      if (u) query = { _id: u._id };
    }

    const user = await db.collection("users").findOne(query);

    if (!user) {
      return NextResponse.json(
        {
          success: true,
          user: {
            id: id || "client-1",
            name: "Client User",
            email: email || "user@example.com",
            phone: "+1 555-019-2834",
            role: "client",
            avatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80",
          },
        },
        { headers: { "Access-Control-Allow-Origin": "*" } }
      );
    }

    // Count user's bookings
    const bookingsCount = await db.collection("bookings").countDocuments({
      $or: [{ userId: user._id }, { userId: String(user._id) }],
    });

    return NextResponse.json(
      {
        success: true,
        user: {
          id: String(user._id),
          name: user.name || user.username || "Client User",
          email: user.email,
          phone: user.phoneNumber || "+1 555-019-2834",
          role: user.role === "admin" ? "admin" : "client",
          avatarUrl: user.image || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80",
          createdAt: user.createdAt,
          servicesCount: Array.isArray(user.services) ? user.services.length : 0,
          bookingsCount,
          preferredLanguage: "English",
          timezone: "America/New_York",
        },
      },
      { headers: { "Access-Control-Allow-Origin": "*" } }
    );
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500, headers: { "Access-Control-Allow-Origin": "*" } }
    );
  }
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const { email, id, name, phone, preferredLanguage, timezone } = body || {};

    const db = await getDb();
    let query: any = {};
    if (id && ObjectId.isValid(id)) {
      query = { _id: new ObjectId(id) };
    } else if (email) {
      query = { email: email.toLowerCase().trim() };
    }

    const updates: any = {};
    if (name) updates.name = name;
    if (phone) updates.phoneNumber = phone;
    if (preferredLanguage) updates.preferredLanguage = preferredLanguage;
    if (timezone) updates.timezone = timezone;
    updates.updatedAt = new Date();

    if (Object.keys(query).length > 0) {
      await db.collection("users").updateOne(query, { $set: updates });
    }

    return NextResponse.json(
      { success: true, message: "Profile updated in MongoDB Atlas user collection." },
      { headers: { "Access-Control-Allow-Origin": "*" } }
    );
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500, headers: { "Access-Control-Allow-Origin": "*" } }
    );
  }
}
