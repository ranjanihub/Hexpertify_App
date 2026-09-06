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
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}

// 1. READ ALL (GET)
export async function GET() {
  try {
    const db = await getDb();

    // 1. Fetch Users
    const [rawUsers1, rawUsers2] = await Promise.all([
      db.collection("users").find({}).toArray(),
      db.collection("User").find({}).toArray(),
    ]);
    const usersMap = new Map();
    [...rawUsers1, ...rawUsers2].forEach((u) => {
      const uName = u.name || u.username || (u.email ? u.email.split("@")[0] : null);
      if (uName) {
        usersMap.set(String(u._id), { name: uName, avatar: u.image || null });
        if (u.id) usersMap.set(String(u.id), { name: uName, avatar: u.image || null });
      }
    });

    // Fetch Professions Map
    const professions = await db.collection("Profession").find({}).toArray();
    const professionMap = new Map<string, string>();
    professions.forEach((p: any) => {
      professionMap.set(String(p._id), p.name || p.serviceName || "Clinical Specialist");
      if (p.id) professionMap.set(String(p.id), p.name || p.serviceName || "Clinical Specialist");
    });

    // 2. Fetch Consultants
    const [rawCons1, rawCons2] = await Promise.all([
      db.collection("consultants").find({}).toArray(),
      db.collection("Consultant").find({}).toArray(),
    ]);
    const consMap = new Map();
    [...rawCons1, ...rawCons2].forEach((c) => {
      const cName = c.name || "Dr. Specialist";
      const cAvatar = c.imageURL || c.photoUrl || null;
      const cProf = c.profession || professionMap.get(String(c.professionId)) || c.title || "Clinical Specialist";
      consMap.set(String(c._id), { name: cName, avatar: cAvatar, title: cProf, profession: cProf });
      if (c.id) consMap.set(String(c.id), { name: cName, avatar: cAvatar, title: cProf, profession: cProf });
    });

    // 3. Fetch Services
    const [rawServ1, rawServ2] = await Promise.all([
      db.collection("Service").find({}).toArray(),
      db.collection("services").find({}).toArray(),
    ]);
    const servMap = new Map();
    [...rawServ1, ...rawServ2].forEach((s) => {
      const sName = s.name?.trim() || "1-on-1 Consultation";
      servMap.set(String(s._id), { name: sName, price: s.price || 349, duration: s.duration || 50 });
      if (s.id) servMap.set(String(s.id), { name: sName, price: s.price || 349, duration: s.duration || 50 });
    });

    // 4. Fetch Bookings
    const [rawBookings1, rawBookings2] = await Promise.all([
      db.collection("bookings").find({}).sort({ createdAt: -1 }).toArray(),
      db.collection("Booking").find({}).sort({ createdAt: -1 }).toArray(),
    ]);

    const seenIds = new Set();
    const allBookings: any[] = [];

    for (const b of [...rawBookings1, ...rawBookings2]) {
      const bId = String(b._id);
      if (seenIds.has(bId)) continue;
      seenIds.add(bId);

      const uInfo = usersMap.get(String(b.userId)) || null;
      const cInfo = consMap.get(String(b.consultantId)) || null;
      const sInfo = servMap.get(String(b.serviceId)) || null;

      const clientName = uInfo?.name || "Client User";
      const therapistName = cInfo?.name || "Dr. Specialist";
      const therapistProfession = cInfo?.profession || cInfo?.title || "Clinical Specialist";

      // Resolve Service Name (e.g. "1-on-1 Consultation", "Super Saver", etc.)
      let serviceName = sInfo?.name || b.service || b.serviceName || "1-on-1 Consultation";
      if (serviceName === "Mental Health Counsellor" || !serviceName.trim()) {
        serviceName = sInfo?.name && sInfo.name !== "Mental Health Counsellor" ? sInfo.name : "1-on-1 Consultation";
      }

      const amount = Number(b.amount) || Number(sInfo?.price) || Number(b.fee) || 349;

      const createdAt = new Date(b.createdAt || Date.now());
      const timeStr = createdAt.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
      const dateStr = createdAt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

      const rawStatus = String(b.status || "confirmed").toUpperCase();
      let status = "Scheduled";
      if (rawStatus === "COMPLETED") status = "Completed";
      else if (rawStatus === "CANCELLED") status = "Rescheduled";
      else if (rawStatus === "PENDING") status = "Scheduled";

      const bookingCode = b.bookingCode || `HEX-${bId.slice(-4).toUpperCase()}`;
      const bookingId = b.bookingId || `BK-${bId.slice(-4).toUpperCase()}`;

      let paymentStatus = "Paid";
      if (rawStatus === "CANCELLED") paymentStatus = "Refunded";
      else if (rawStatus === "PENDING") paymentStatus = "Pending Payout";

      allBookings.push({
        id: bookingId,
        bookingId,
        bookingCode,
        fullId: bId,
        clientName,
        clientAvatar: uInfo?.avatar || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100",
        therapistName,
        therapistAvatar: cInfo?.avatar || "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=100",
        therapistProfession,
        service: serviceName,
        date: dateStr,
        time: timeStr,
        duration: `${sInfo?.duration || 50} mins`,
        status,
        amount,
        paymentStatus,
        channel: "Video Call (Google Meet)",
        meetingUrl: "https://meet.google.com/xyz-hexpertify-session",
      });
    }

    return NextResponse.json(
      { success: true, count: allBookings.length, bookings: allBookings },
      { headers: { "Access-Control-Allow-Origin": "*" } }
    );
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500, headers: { "Access-Control-Allow-Origin": "*" } }
    );
  }
}

// 2. CREATE (POST)
export async function POST(req: Request) {
  try {
    const db = await getDb();
    const body = await req.json();

    const newId = body.id || new ObjectId().toString();
    const count = await db.collection("Booking").countDocuments();
    const codeNum = 9000 + count + 1;
    const bookingCode = body.bookingCode || `HEX-${codeNum}`;
    const bookingId = body.bookingId || `BK-${codeNum}`;

    const doc = {
      _id: newId,
      bookingCode,
      bookingId,
      customId: bookingCode,
      clientName: body.clientName || "New Client",
      therapistName: body.therapistName || "Dr. Alex Harrison",
      service: body.service || "Individual Therapy",
      date: body.date || new Date().toISOString().split("T")[0],
      time: body.time || "09:00 AM - 10:00 AM",
      amount: Number(body.amount || 2500),
      paymentStatus: body.paymentStatus || "Paid",
      userId: body.userId || new ObjectId().toString(),
      consultantId: body.consultantId || new ObjectId().toString(),
      serviceId: body.serviceId || new ObjectId().toString(),
      status: String(body.status || "CONFIRMED").toUpperCase(),
      createdAt: new Date(),
      updatedAt: new Date()
    };

    await db.collection("Booking").insertOne(doc);

    return NextResponse.json(
      {
        success: true,
        message: "Booking created successfully in MongoDB Atlas",
        booking: {
          id: bookingId,
          bookingId,
          bookingCode,
          clientName: doc.clientName,
          therapistName: doc.therapistName,
          service: doc.service,
          date: doc.date,
          time: doc.time,
          amount: doc.amount,
          paymentStatus: doc.paymentStatus,
          status: doc.status === "COMPLETED" ? "Completed" : doc.status === "CANCELLED" ? "Rescheduled" : "Scheduled",
          duration: "50 mins",
          channel: "Video Call (Google Meet)",
          meetingUrl: "https://meet.google.com/xyz-hexpertify-session"
        }
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

// 3. UPDATE (PUT)
export async function PUT(req: Request) {
  try {
    const db = await getDb();
    const body = await req.json();
    const id = body.id || body.fullId || body._id;

    if (!id) {
      return NextResponse.json({ success: false, error: "Booking ID is required for update" }, { status: 400 });
    }

    const query = { $or: [{ _id: id }, { id }, { _id: new ObjectId(ObjectId.isValid(id) ? id : undefined) }] };

    const updateDoc: any = {
      $set: {
        status: String(body.status || "CONFIRMED").toUpperCase(),
        updatedAt: new Date()
      }
    };

    await db.collection("Booking").updateOne(query, updateDoc);

    return NextResponse.json(
      { success: true, message: "Booking status updated successfully in MongoDB" },
      { headers: { "Access-Control-Allow-Origin": "*" } }
    );
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500, headers: { "Access-Control-Allow-Origin": "*" } }
    );
  }
}

// 4. DELETE (DELETE)
export async function DELETE(req: Request) {
  try {
    const db = await getDb();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ success: false, error: "ID parameter is required" }, { status: 400 });
    }

    const query = { $or: [{ _id: id }, { id }, { _id: new ObjectId(ObjectId.isValid(id) ? id : undefined) }] };
    await db.collection("Booking").deleteOne(query);

    return NextResponse.json(
      { success: true, message: "Booking deleted successfully from MongoDB" },
      { headers: { "Access-Control-Allow-Origin": "*" } }
    );
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500, headers: { "Access-Control-Allow-Origin": "*" } }
    );
  }
}
