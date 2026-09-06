import { connectToDatabase, closeDatabase } from '../db/mongodb';

async function checkBookings() {
  const db = await connectToDatabase();
  const bookings = await db.collection('Booking').find({}).toArray();
  console.log(`Total bookings: ${bookings.length}`);
  bookings.slice(0, 15).forEach((b: any, idx: number) => {
    console.log(`[${idx}] id: ${b.id || b._id} | client: "${b.clientName}" | consultant: "${b.consultantName || b.therapistName}" | cid: "${b.consultantId}" | status: ${b.status} | fee: ${b.fee}`);
  });
  await closeDatabase();
}

checkBookings().catch(console.error);
