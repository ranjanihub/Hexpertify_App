import { NextResponse } from "next/server";
import { MongoClient } from "mongodb";
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
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}

export async function GET() {
  try {
    const db = await getDb();

    const [u1, u2, c1, c2, b1, b2, s1, s2] = await Promise.all([
      db.collection("users").countDocuments(),
      db.collection("User").countDocuments(),
      db.collection("consultants").countDocuments(),
      db.collection("Consultant").countDocuments(),
      db.collection("bookings").countDocuments(),
      db.collection("Booking").countDocuments(),
      db.collection("services").countDocuments(),
      db.collection("Service").countDocuments(),
    ]);

    return NextResponse.json(
      {
        success: true,
        database: "MongoDB Atlas (ranjaniranjani5694_db_user / Cluster0)",
        counts: {
          users: u1 + u2,
          consultants: c1 + c2,
          bookings: b1 + b2,
          services: s1 + s2,
          professions: 8,
          reviews: 45,
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
