import { NextResponse } from "next/server";
import { MongoClient } from "mongodb";
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
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}

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

    // 2. Fetch Consultants / Therapists
    const [rawCons1, rawCons2] = await Promise.all([
      db.collection("consultants").find({}).toArray(),
      db.collection("Consultant").find({}).toArray(),
    ]);
    const consMap = new Map();
    const allConsultants: any[] = [];
    [...rawCons1, ...rawCons2].forEach((c) => {
      const cId = String(c._id);
      const cName = c.name || "Dr. Specialist";
      const cAvatar = c.imageURL || c.photoUrl || c.photo || "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=100";
      const cProfession = c.profession || c.title || "Clinical Specialist";
      consMap.set(cId, { name: cName, avatar: cAvatar, profession: cProfession });
      if (c.id) consMap.set(String(c.id), { name: cName, avatar: cAvatar, profession: cProfession });
      allConsultants.push({ id: cId, name: cName, avatar: cAvatar, profession: cProfession });
    });

    // 3. Fetch Services
    const [rawServ1, rawServ2] = await Promise.all([
      db.collection("services").find({}).toArray(),
      db.collection("Service").find({}).toArray(),
    ]);
    const servMap = new Map();
    [...rawServ1, ...rawServ2].forEach((s) => {
      servMap.set(String(s._id), { name: s.name || "Consultation Care", price: s.price || 150 });
      if (s.id) servMap.set(String(s.id), { name: s.name || "Consultation Care", price: s.price || 150 });
    });

    // 4. Fetch Bookings
    const [rawBookings1, rawBookings2] = await Promise.all([
      db.collection("bookings").find({}).sort({ createdAt: -1 }).toArray(),
      db.collection("Booking").find({}).sort({ createdAt: -1 }).toArray(),
    ]);

    const seenIds = new Set();
    const transactions: any[] = [];
    let totalGrossRevenue = 0;
    let revenueToday = 0;
    const todayStr = new Date().toISOString().split("T")[0];

    const serviceRevenueMap: Record<string, number> = {};
    const therapistRevenueMap: Record<string, { name: string; profession: string; avatar: string; sessions: number; gross: number }> = {};

    [...rawBookings1, ...rawBookings2].forEach((b: any) => {
      const bId = String(b._id || b.id);
      if (seenIds.has(bId)) return;
      seenIds.add(bId);

      const uInfo = usersMap.get(String(b.userId || b.clientId)) || { name: b.clientName || "Client User", avatar: null };
      const cInfo = consMap.get(String(b.consultantId || b.therapistId)) || { name: b.therapistName || "Ahamed Amina Nahla", avatar: null, profession: "Clinical Specialist" };
      const sInfo = servMap.get(String(b.serviceId)) || { name: b.service || b.serviceName || "Individual Therapy", price: b.amount || 150 };

      const amount = Number(b.amount || b.price || sInfo.price || 150);
      const normalizedStatus = String(b.status || '').toUpperCase();
      let paymentStatus = b.paymentStatus;
      if (!paymentStatus) {
        if (normalizedStatus === 'CANCELLED' || normalizedStatus === 'REFUNDED') {
          paymentStatus = 'Refunded';
        } else if (normalizedStatus === 'PENDING') {
          paymentStatus = 'Pending Payout';
        } else {
          paymentStatus = 'Paid';
        }
      }
      const dateStr = b.date ? (typeof b.date === "string" ? b.date : new Date(b.date).toISOString().split("T")[0]) : (b.createdAt ? new Date(b.createdAt).toISOString().split("T")[0] : todayStr);

      totalGrossRevenue += amount;
      if (dateStr === todayStr) {
        revenueToday += amount;
      }

      // Service Map
      const sName = sInfo.name;
      serviceRevenueMap[sName] = (serviceRevenueMap[sName] || 0) + amount;

      // Therapist Map
      const tKey = cInfo.name;
      if (!therapistRevenueMap[tKey]) {
        therapistRevenueMap[tKey] = {
          name: cInfo.name,
          profession: cInfo.profession,
          avatar: cInfo.avatar || "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=100",
          sessions: 0,
          gross: 0,
        };
      }
      therapistRevenueMap[tKey].sessions += 1;
      therapistRevenueMap[tKey].gross += amount;

      transactions.push({
        id: bId,
        bookingCode: b.bookingCode || `HEX-${bId.slice(-6).toUpperCase()}`,
        clientName: uInfo.name,
        clientAvatar: uInfo.avatar || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100",
        therapistName: cInfo.name,
        therapistAvatar: cInfo.avatar || "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=100",
        service: sName,
        date: dateStr,
        amount,
        paymentStatus,
      });
    });

    const totalSessions = transactions.length;
    const platformShare20 = Math.round(totalGrossRevenue * 0.20);
    const therapistPayouts80 = totalGrossRevenue - platformShare20;
    const avgRevenuePerSession = totalSessions > 0 ? Math.round(totalGrossRevenue / totalSessions) : 0;

    // Service Breakdown Chart Data
    const colors = ["#5e2be2", "#3b1799", "#10b981", "#3b82f6", "#f59e0b", "#ec4899", "#8b5cf6", "#14b8a6"];
    const serviceBreakdown = Object.entries(serviceRevenueMap).map(([name, value], idx) => ({
      name,
      value,
      color: colors[idx % colors.length],
    }));

    // Therapist Leaderboard
    const therapistLeaderboard = Object.values(therapistRevenueMap).map((t) => ({
      ...t,
      platformFee: Math.round(t.gross * 0.20),
      payout: t.gross - Math.round(t.gross * 0.20),
    })).sort((a, b) => b.gross - a.gross);

    return NextResponse.json(
      {
        success: true,
        summary: {
          totalGrossRevenue,
          revenueToday: revenueToday,
          platformShare20,
          therapistPayouts80,
          avgRevenuePerSession,
          totalSessions,
        },
        serviceBreakdown,
        therapistLeaderboard,
        transactions,
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
