import { MongoClient } from 'mongodb';

// Direct connection string (non-SRV) to bypass local DNS SRV resolution issues
const uri = 'mongodb://ranjaniranjani5694_db_user:1kCjOE72je4p0CFU@ac-n5nn3cx-shard-00-00.ibhuunq.mongodb.net:27017,ac-n5nn3cx-shard-00-01.ibhuunq.mongodb.net:27017,ac-n5nn3cx-shard-00-02.ibhuunq.mongodb.net:27017/hexpertify?ssl=true&replicaSet=atlas-bsr4el-shard-0&authSource=admin&retryWrites=true&w=majority';

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
