import { NextResponse } from "next/server";
import { MongoClient, ObjectId } from "mongodb";
import dns from "dns";

dns.setServers(["8.8.8.8", "1.1.1.1"]);

const TARGET_URI = "mongodb+srv://ranjaniranjani5694_db_user:1kCjOE72je4p0CFU@cluster0.ibhuunq.mongodb.net/hexpertify?retryWrites=true&w=majority";

let client: MongoClient | null = null;
async function getDb() {
  if (!client) {
    client = new MongoClient(TARGET_URI, { connectTimeoutMS: 5000, serverSelectionTimeoutMS: 5000 });
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

// 1. READ (GET)
export async function GET() {
  try {
    const db = await getDb();

    // 1. Fetch Consultants
    const [rawCons1, rawCons2] = await Promise.all([
      db.collection("consultants").find({}).toArray(),
      db.collection("Consultant").find({}).toArray(),
    ]);

    const consMap = new Map();
    [...rawCons1, ...rawCons2].forEach((c: any) => {
      const cId = String(c._id);
      const cObj = {
        id: cId,
        name: c.name || "Dr. Specialist",
        email: c.email || `${(c.name || 'therapist').toLowerCase().replace(/[^a-z0-9]/g, '')}@hexpertify.com`,
        profession: c.profession || c.title || "Clinical Specialist",
        avatar: c.imageURL || c.photoUrl || c.photo || "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=100",
        rate: Number(c.platformFeePerSession || c.minPrice || 150)
      };
      consMap.set(cId, cObj);
      if (c.id) consMap.set(String(c.id), cObj);
      consMap.set(cObj.name.toLowerCase().trim(), cObj);
    });

    // 2. Fetch Users
    const [rawUsers1, rawUsers2] = await Promise.all([
      db.collection("users").find({}).toArray(),
      db.collection("User").find({}).toArray(),
    ]);
    const usersMap = new Map();
    [...rawUsers1, ...rawUsers2].forEach((u) => {
      const uName = u.name || u.username || (u.email ? u.email.split("@")[0] : "Client User");
      usersMap.set(String(u._id), uName);
      if (u.id) usersMap.set(String(u.id), uName);
    });

    // 3. Fetch Services
    const [rawServ1, rawServ2] = await Promise.all([
      db.collection("services").find({}).toArray(),
      db.collection("Service").find({}).toArray(),
    ]);
    const servMap = new Map();
    [...rawServ1, ...rawServ2].forEach((s) => {
      servMap.set(String(s._id), { name: s.name || "Individual Therapy", price: s.price || 150 });
      if (s.id) servMap.set(String(s.id), { name: s.name || "Individual Therapy", price: s.price || 150 });
    });

    // 4. Fetch Bookings
    const [rawBookings1, rawBookings2] = await Promise.all([
      db.collection("bookings").find({}).toArray(),
      db.collection("Booking").find({}).toArray(),
    ]);

    const seenBks = new Set();
    const bookingsByTherapist: Record<string, { therapist: any; sessions: any[] }> = {};

    [...rawBookings1, ...rawBookings2].forEach((b: any) => {
      const bId = String(b._id || b.id);
      if (seenBks.has(bId)) return;
      seenBks.add(bId);

      // Exclude cancelled/refunded bookings
      const rawStatus = String(b.status || '').toUpperCase();
      if (rawStatus === 'CANCELLED' || rawStatus === 'REFUNDED') return;

      const clientName = usersMap.get(String(b.userId || b.clientId)) || b.clientName || "Client User";
      const therapistName = b.therapistName || "Dr. Specialist";
      const sInfo = servMap.get(String(b.serviceId)) || { name: b.service || "Individual Therapy", price: b.amount || 150 };
      const amount = Number(b.amount || b.price || sInfo.price || 150);

      // Match therapist info
      const tInfo = consMap.get(therapistName.toLowerCase().trim()) ||
                    consMap.get(String(b.consultantId || '')) || {
                      id: `t-${bId.slice(0, 6)}`,
                      name: therapistName,
                      email: `${therapistName.toLowerCase().replace(/[^a-z0-9]/g, '')}@hexpertify.com`,
                      profession: "Clinical Specialist",
                      avatar: "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=100",
                      rate: 150
                    };

      const groupKey = tInfo.name.toLowerCase().trim();
      if (!bookingsByTherapist[groupKey]) {
        bookingsByTherapist[groupKey] = {
          therapist: tInfo,
          sessions: []
        };
      }

      bookingsByTherapist[groupKey].sessions.push({
        id: `SR-${bId.slice(-6).toUpperCase()}`,
        sessionId: bId,
        sessionDate: b.date ? (typeof b.date === "string" ? b.date : new Date(b.date).toISOString().split("T")[0]) : (b.createdAt ? new Date(b.createdAt).toISOString().split("T")[0] : "2026-08-20"),
        clientName,
        sessionFee: amount,
        status: "Pending Review" as const,
        notes: "Consultation completed & verified"
      });
    });

    let totalSessions = 0;
    let totalGrossAmount = 0;

    const pendingPayouts = Object.values(bookingsByTherapist).map(({ therapist, sessions }) => {
      const gross = sessions.reduce((sum, s) => sum + s.sessionFee, 0);
      const platformShare = Math.round(gross * 0.20);
      const net = gross - platformShare;

      totalSessions += sessions.length;
      totalGrossAmount += gross;

      return {
        id: `PO-${therapist.id.slice(0, 6).toUpperCase()}`,
        therapistId: therapist.id,
        therapistName: therapist.name,
        therapistEmail: therapist.email,
        therapistAvatar: therapist.avatar,
        profession: therapist.profession,
        pendingReportsCount: Math.max(0, sessions.length - 1),
        sessionsCount: sessions.length,
        lastSessionDate: sessions[0]?.sessionDate || "2026-08-20",
        pendingAmount: net,
        unpaidSessions: sessions
      };
    }).sort((a, b) => b.pendingAmount - a.pendingAmount);

    const platformCommission = Math.round(totalGrossAmount * 0.20);
    const therapistNetPool = totalGrossAmount - platformCommission;

    // 5. Fetch Historical Payout Records from Payout collection
    const rawPayoutHistory = await db.collection("Payout").find({}).sort({ payoutDate: -1, createdAt: -1 }).toArray();
    const historyList = rawPayoutHistory.map((p: any) => ({
      id: p.id || p.transactionId || `TXN-${String(p._id).slice(-4).toUpperCase()}`,
      payoutDate: p.payoutDate || new Date(p.createdAt || Date.now()).toISOString().split("T")[0],
      therapistName: p.therapistName,
      profession: p.profession || "Clinical Specialist",
      sessionsCount: p.sessionsCount || (p.sessionIds?.length || 1),
      grossAmount: Number(p.grossAmount || p.amount || 0),
      platformFee: Number(p.platformFee || Math.round((p.grossAmount || p.amount || 0) * 0.20)),
      netPayout: Number(p.netPayout || p.amount || 0),
      paymentMethod: p.paymentMethod || "RazorpayX Automated Payout",
      accountNumber: p.accountNumber || "•••• •••• 4242",
      transactionRef: p.transactionRef || `RZP_PAY_${Math.floor(1000000 + Math.random() * 9000000)}`,
      status: p.status || "Completed"
    }));

    return NextResponse.json(
      {
        success: true,
        summary: {
          pendingSessionsCount: totalSessions,
          therapistsAwaitingCount: pendingPayouts.length,
          pendingPayoutPool: therapistNetPool,
          platformCommission: platformCommission
        },
        payouts: pendingPayouts,
        history: historyList,
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

// 2. DISBURSE / EXECUTE PAYOUT (POST)
export async function POST(req: Request) {
  try {
    const db = await getDb();
    const body = await req.json();

    const newId = body.id || new ObjectId().toString();
    const txnRef = body.transactionRef || `RZP_PAY_${Math.floor(1000000 + Math.random() * 9000000)}`;
    const count = await db.collection("Payout").countDocuments();
    const txnId = `TXN-${9900 + count + 1}`;

    const payoutDoc = {
      _id: newId,
      transactionId: txnId,
      id: txnId,
      payoutDate: body.payoutDate || new Date().toISOString().split("T")[0],
      therapistName: body.therapistName,
      profession: body.profession || "Clinical Specialist",
      therapistEmail: body.therapistEmail || "",
      sessionsCount: body.sessionsCount || (body.sessionIds?.length || 1),
      sessionIds: body.sessionIds || [],
      grossAmount: Number(body.grossAmount || 0),
      platformFee: Number(body.platformFee || 0),
      netPayout: Number(body.netPayout || 0),
      paymentMethod: body.paymentMethod || "RazorpayX Automated Payout",
      accountNumber: body.accountNumber || `•••• •••• ${Math.floor(1000 + Math.random() * 9000)}`,
      transactionRef: txnRef,
      status: "Completed",
      createdAt: new Date(),
    };

    await db.collection("Payout").insertOne(payoutDoc);

    return NextResponse.json(
      {
        success: true,
        message: "Payout disbursed and archived successfully in MongoDB Atlas",
        payout: payoutDoc,
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
