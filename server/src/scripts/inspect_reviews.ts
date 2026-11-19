import { connectToDatabase, closeDatabase } from '../db/mongodb';

async function inspectReviews() {
  const db = await connectToDatabase();
  const sampleReviews = await db.collection('Review').find({}).limit(5).toArray();
  console.log('SAMPLE REVIEWS:', JSON.stringify(sampleReviews, null, 2));
  await closeDatabase();
}

inspectReviews().catch(console.error);
