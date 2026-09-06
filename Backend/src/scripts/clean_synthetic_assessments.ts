import { connectToDatabase, closeDatabase } from '../db/mongodb';

async function clean() {
  const db = await connectToDatabase();
  const res1 = await db.collection('AssessmentScore').deleteMany({
    id: { $in: ['ASC-001', 'ASC-002', 'SUB-REAL-01', 'SUB-REAL-02'] }
  });
  const res2 = await db.collection('AssessmentAssignment').deleteMany({
    id: { $in: ['ASN-001', 'ASN-002', 'ASN-REAL-01', 'ASN-REAL-02'] }
  });
  console.log(`✅ Removed ${res1.deletedCount} synthetic scores and ${res2.deletedCount} synthetic assignments.`);
  await closeDatabase();
}

clean().catch(console.error);
