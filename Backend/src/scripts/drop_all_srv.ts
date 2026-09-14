import { MongoClient } from 'mongodb';

// SRV connection string 
const uri = 'mongodb+srv://ranjaniranjani5694_db_user:1kCjOE72je4p0CFU@cluster0.ibhuunq.mongodb.net/hexpertify?retryWrites=true&w=majority';

async function dropAll() {
  console.log('Connecting to MongoDB Atlas (SRV)...');
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
