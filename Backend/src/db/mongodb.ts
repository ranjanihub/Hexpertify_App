import { MongoClient, Db } from 'mongodb';
import { config } from '../config';
import dns from 'dns';

dns.setServers(['8.8.8.8', '1.1.1.1']);

let client: MongoClient | null = null;
let db: Db | null = null;

export async function connectToDatabase(): Promise<Db> {
  if (db && client) {
    return db;
  }

  try {
    console.log('[MongoDB] Connecting to MongoDB Atlas cluster...');
    client = new MongoClient(config.mongodbUri);
    await client.connect();
    db = client.db(config.dbName);
    console.log(`[MongoDB] Connected successfully to database: "${config.dbName}"`);
    return db;
  } catch (error) {
    console.error('[MongoDB] Connection error:', error);
    throw error;
  }
}

export function getDatabase(): Db {
  if (!db) {
    throw new Error('Database not initialized. Call connectToDatabase() first.');
  }
  return db;
}

export async function closeDatabase(): Promise<void> {
  if (client) {
    await client.close();
    client = null;
    db = null;
    console.log('[MongoDB] Connection closed.');
  }
}
