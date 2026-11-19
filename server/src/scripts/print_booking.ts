import { connectToDatabase, closeDatabase } from '../db/mongodb';

async function printFullBooking() {
  const db = await connectToDatabase();
  const sample = await db.collection('Booking').findOne({ clientName: { $exists: false } });
  console.log('SAMPLE SCHEMA OF MONGODB BOOKING:', JSON.stringify(sample, null, 2));

  const sampleWithClient = await db.collection('Booking').findOne({ clientName: { $exists: true } });
  console.log('SAMPLE WITH CLIENT:', JSON.stringify(sampleWithClient, null, 2));

  await closeDatabase();
}

printFullBooking().catch(console.error);
