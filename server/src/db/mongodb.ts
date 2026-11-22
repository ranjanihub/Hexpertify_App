import { MongoClient, Db } from 'mongodb';
import { config } from '../config';
import dns from 'dns';

/**
 * Local machines (Windows especially) often refuse the SRV lookup a mongodb+srv:// URI needs, so outside
 * Vercel the lookup goes to public DNS. Applied right before connecting: setServers throws while another
 * lookup is in flight, which can happen at import time inside the website's server.
 */
function usePublicDnsLocally(): void {
  if (process.env.VERCEL) return;
  const servers = ['8.8.8.8', '1.1.1.1'];
  try {
    dns.setServers(servers);
    dns.promises.setServers(servers);
  } catch (err: any) {
    console.warn('[MongoDB] Could not switch to public DNS:', err?.message || err);
  }
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
      usePublicDnsLocally();
      console.log('[MongoDB] Connecting to MongoDB Atlas cluster with optimized pool...');
      client = new MongoClient(config.mongodbUri, {
        // Serverless: each instance handles few concurrent requests, so a small pool that opens connections on
        // demand. A min pool made every cold start open 10 TLS connections up front (the cluster is M0).
        maxPoolSize: 10,
        minPoolSize: 0,
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
    { collection: 'Payment', index: { id: 1 } },
    { collection: 'Payment', index: { bookingId: 1 } },
    { collection: 'Payment', index: { status: 1, createdAt: -1 } },
    { collection: 'Payment', index: { providerPaymentId: 1 } },
  ];

  try {
    await database.collection('Payment').createIndex({ provider: 1, providerOrderId: 1 }, { unique: true, background: true });
  } catch {}

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
