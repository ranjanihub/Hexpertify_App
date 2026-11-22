import { MongoClient } from "mongodb";
import dns from "dns";

dns.setServers(["8.8.8.8", "1.1.1.1"]);

const TARGET_URI = "mongodb+srv://ranjaniranjani5694_db_user:1kCjOE72je4p0CFU@cluster0.ibhuunq.mongodb.net/hexpertify?retryWrites=true&w=majority";

async function main() {
  const client = new MongoClient(TARGET_URI);
  await client.connect();
  const db = client.db("hexpertify");

  console.log("Connected to MongoDB Atlas: hexpertify");

  // 1. Update Booking collection
  const bookings = await db.collection("Booking").find({}).sort({ createdAt: 1 }).toArray();
  let counter = 9001;
  for (const b of bookings) {
    const bookingCode = b.bookingCode || `HEX-${counter}`;
    const bookingId = b.bookingId || `BK-${counter}`;
    await db.collection("Booking").updateOne(
      { _id: b._id },
      { $set: { bookingCode, bookingId, customId: bookingCode } }
    );
    counter++;
  }
  console.log(`Updated ${bookings.length} records in 'Booking' collection with bookingId and bookingCode.`);

  // 2. Update bookings collection
  const b2 = await db.collection("bookings").find({}).sort({ createdAt: 1 }).toArray();
  for (const b of b2) {
    const bookingCode = b.bookingCode || `HEX-${counter}`;
    const bookingId = b.bookingId || `BK-${counter}`;
    await db.collection("bookings").updateOne(
      { _id: b._id },
      { $set: { bookingCode, bookingId, customId: bookingCode } }
    );
    counter++;
  }
  console.log(`Updated ${b2.length} records in 'bookings' collection with bookingId and bookingCode.`);

  // Sample verification
  const sample = await db.collection("Booking").findOne({});
  console.log("Sample updated record from MongoDB Atlas:", JSON.stringify(sample, null, 2));

  await client.close();
}

main().catch(console.error);
