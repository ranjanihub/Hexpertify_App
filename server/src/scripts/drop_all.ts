import { MongoClient } from 'mongodb';

import { mongodbUri as uri } from '../config/database';

async function dropAll() {
  console.log('Connecting to MongoDB Atlas (direct)...');
  const client = new MongoClient(uri, {
    serverSelectionTimeoutMS: 30000,
    connectTimeoutMS: 30000,
  });

  try {
    await client.connect();
    const db = client.db('hexpertify');
    const collections = await db.listCollections().toArray();
    console.log(`Found ${collections.length} collections. Dropping all data...`);
    for (const col of collections) {
      const result = await db.collection(col.name).deleteMany({});
      console.log(`  ✓ ${col.name}: deleted ${result.deletedCount} documents`);
    }
    console.log('\n✅ All data removed from hexpertify database.');
  } finally {
    await client.close();
  }
}

dropAll().catch((err) => {
  console.error('Failed:', err.message);
});
