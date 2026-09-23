import { MongoClient, Db } from 'mongodb';
import { config } from '../config';
import dns from 'dns';

if (!process.env.VERCEL) {
  try {
    dns.setServers(['8.8.8.8', '1.1.1.1']);
  } catch {}
}

let client: MongoClient | null = null;
let db: Db | null = null;
let connectionPromise: Promise<Db> | null = null;
let indexesInitialized = false;

export async function connectToDatabase(): Promise<Db> {
  if (db && client) {
    return db;
  }

  if (connectionPromise) {
    return connectionPromise;
  }

  connectionPromise = (async () => {
    try {
      console.log('[MongoDB] Connecting to MongoDB Atlas cluster with optimized pool...');
      client = new MongoClient(config.mongodbUri, {
        maxPoolSize: 50,
        minPoolSize: 10,
        maxIdleTimeMS: 60000,
        connectTimeoutMS: 10000,
        socketTimeoutMS: 45000,
        serverSelectionTimeoutMS: 5000,
        retryWrites: true
      });
      await client.connect();
      db = client.db(config.dbName);
      console.log(`[MongoDB] Connected successfully to database: "${config.dbName}"`);

      // Initialize indexes in the background
      if (!indexesInitialized) {
        indexesInitialized = true;
        initIndexes(db).catch((err) => console.warn('[MongoDB] Index creation non-fatal error:', err?.message));
      }

      return db;
    } catch (error) {
      console.error('[MongoDB] Connection error:', error);
      connectionPromise = null;
      throw error;
    }
  })();

  return connectionPromise;
}

async function initIndexes(database: Db): Promise<void> {
  const indexSpecs: { collection: string; index: Record<string, 1 | -1> }[] = [
    { collection: 'User', index: { email: 1 } },
    { collection: 'User', index: { id: 1 } },
    { collection: 'User', index: { assignedTherapistId: 1 } },
    { collection: 'users', index: { email: 1 } },
    { collection: 'users', index: { id: 1 } },
    { collection: 'Consultant', index: { email: 1 } },
    { collection: 'Consultant', index: { id: 1 } },
    { collection: 'Consultant', index: { identifier: 1 } },
    { collection: 'consultants', index: { email: 1 } },
    { collection: 'consultants', index: { id: 1 } },
    { collection: 'Booking', index: { clientEmail: 1 } },
    { collection: 'Booking', index: { clientId: 1 } },
    { collection: 'Booking', index: { consultantId: 1 } },
    { collection: 'Booking', index: { status: 1 } },
    { collection: 'bookings', index: { clientEmail: 1 } },
    { collection: 'bookings', index: { consultantId: 1 } },
    { collection: 'Message', index: { recipientId: 1 } },
    { collection: 'messages', index: { recipientId: 1 } },
    { collection: 'Review', index: { consultantId: 1 } },
    { collection: 'Activity', index: { assignedTherapistId: 1 } },
  ];

  for (const { collection, index } of indexSpecs) {
    try {
      await database.collection(collection).createIndex(index, { background: true });
    } catch {
      // Non-blocking if collection doesn't exist yet
    }
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
    connectionPromise = null;
    console.log('[MongoDB] Connection closed.');
  }
}
