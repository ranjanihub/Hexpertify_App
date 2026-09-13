import dotenv from 'dotenv';
dotenv.config();
import dns from 'dns';
dns.setServers(['8.8.8.8', '1.1.1.1']);
import bcrypt from 'bcryptjs';
import { MongoClient } from 'mongodb';

async function main() {
  const uri = process.env.MONGODB_URI;
  const dbName = process.env.DB_NAME || 'hexpertify';
  if (!uri) throw new Error('MONGODB_URI is required');

  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db(dbName);
  console.log(`[DB] Connected to MongoDB Atlas (${dbName})`);

  // 1. Backfill legacy accounts without passwords
  const defaultHash = await bcrypt.hash('password123', 10);
  const userRes = await db.collection('User').updateMany(
    { $or: [{ password: null }, { password: { $exists: false } }, { password: '' }] },
    { $set: { password: defaultHash, updatedAt: new Date() } }
  );
  console.log(`[DB] Backfilled ${userRes.modifiedCount} legacy records in 'User' collection.`);

  const usersRes = await db.collection('users').updateMany(
    { $or: [{ password: null }, { password: { $exists: false } }, { password: '' }] },
    { $set: { password: defaultHash, updatedAt: new Date() } }
  ).catch(() => ({ modifiedCount: 0 }));
  console.log(`[DB] Backfilled ${usersRes.modifiedCount} legacy records in 'users' collection.`);

  // 2. Ensure unique indexes on email
  try {
    const idx1 = await db.collection('User').createIndex({ email: 1 }, { unique: true, sparse: true });
    console.log(`[DB] Ensured unique index on 'User.email': ${idx1}`);
  } catch (err: any) {
    console.warn(`[DB] User.email index notice: ${err.message}`);
  }

  try {
    const idx2 = await db.collection('users').createIndex({ email: 1 }, { unique: true, sparse: true });
    console.log(`[DB] Ensured unique index on 'users.email': ${idx2}`);
  } catch (err: any) {
    console.warn(`[DB] users.email index notice: ${err.message}`);
  }

  await client.close();
  console.log('[DB] Database integrity check complete.');
}

main().catch(console.error);
