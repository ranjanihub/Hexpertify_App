import { connectToDatabase, closeDatabase } from '../db/mongodb';

async function check() {
  const db = await connectToDatabase();
  const cols = await db.listCollections().toArray();
  console.log('MongoDB Collections in hexpertify:');
  for (const c of cols) {
    const count = await db.collection(c.name).countDocuments();
    console.log(` - ${c.name}: ${count} records`);
  }
  await closeDatabase();
}

check().catch(console.error);
