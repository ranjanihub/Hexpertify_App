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
    const userId = searchParams.get("userId");
    const email = searchParams.get("email");

    const db = await getDb();

    let targetUserId = userId;
    if (!targetUserId && email) {
      const user = await db.collection("users").findOne({ email: email.toLowerCase().trim() });
      if (user) targetUserId = String(user._id);
    }

    let filter: any = {};
    if (targetUserId) {
      filter = {
        $or: [
          ObjectId.isValid(targetUserId) ? { userId: new ObjectId(targetUserId) } : null,
          { userId: targetUserId },
        ].filter(Boolean),
      };
    }

    const rawBookings = await db.collection("bookings").find(filter).sort({ createdAt: -1 }).toArray();

    // Map consultants
    const consultantsMap = new Map();
    const allConsultants = await db.collection("consultants").find({}).toArray();
    allConsultants.forEach((c) => {
      consultantsMap.set(String(c._id), {
        name: c.name || "Dr. Evelyn Reed",
        title: c.profession || "Licensed Clinical Psychologist",
        avatarUrl: c.imageURL || "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&w=400&q=80",
      });
    });

    const bookings = rawBookings.map((b) => {
      const consultant = consultantsMap.get(String(b.consultantId)) || {
        name: "Dr. Evelyn Reed, PhD",
        title: "Licensed Clinical Psychologist",
        avatarUrl: "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&w=400&q=80",
      };

      const rawStatus = String(b.status || "confirmed").toLowerCase();
      let status: "upcoming" | "completed" | "cancelled" = "upcoming";
      if (rawStatus === "completed") status = "completed";
      else if (rawStatus === "cancelled") status = "cancelled";

      return {
        id: String(b._id),
        therapistName: consultant.name,
        therapistTitle: consultant.title,
        therapistAvatar: consultant.avatarUrl,
        date: new Date(b.createdAt || Date.now()).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        }),
        time: "10:00 AM",
        duration: "50 mins",
        type: "video" as const,
        status,
        meetingLink: "https://meet.google.com/xyz-care-session",
        notes: "Individual Cognitive Behavioral Session via Hexpertify",
      };
    });

    return NextResponse.json(
      { success: true, count: bookings.length, bookings },
      { headers: { "Access-Control-Allow-Origin": "*" } }
    );
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500, headers: { "Access-Control-Allow-Origin": "*" } }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { userId, email, therapistName, date, time, type } = body || {};

    const db = await getDb();

    let targetUserId = userId;
    if (!targetUserId && email) {
      const user = await db.collection("users").findOne({ email: email.toLowerCase().trim() });
      if (user) targetUserId = String(user._id);
    }

    // Find consultant by name or take first
    let consultant = await db.collection("consultants").findOne({
      name: { $regex: new RegExp(therapistName || "Evelyn", "i") },
    });
    if (!consultant) consultant = await db.collection("consultants").findOne({});

    const created = await db.collection("bookings").insertOne({
      userId: targetUserId && ObjectId.isValid(targetUserId) ? new ObjectId(targetUserId) : targetUserId || "user-1",
      consultantId: consultant?._id || new ObjectId("66e6781a3dc1bbf5ba3b7571"),
      status: "confirmed",
      date: date || new Date().toISOString(),
      time: time || "10:00 AM",
      type: type || "video",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return NextResponse.json(
      {
        success: true,
        booking: {
          id: String(created.insertedId),
          therapistName: consultant?.name || "Dr. Evelyn Reed, PhD",
          therapistTitle: consultant?.profession || "Licensed Clinical Psychologist",
          therapistAvatar: consultant?.imageURL || "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&w=400&q=80",
          date: date || "Tomorrow",
          time: time || "10:00 AM",
          duration: "50 mins",
          type: type || "video",
          status: "upcoming",
          meetingLink: "https://meet.google.com/xyz-care-session",
        },
        message: "Booking saved in MongoDB Atlas bookings collection.",
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
