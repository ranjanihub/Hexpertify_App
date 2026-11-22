import webpush from 'web-push';
import { getDatabase } from '../db/mongodb';

/**
 * Browser / phone push notifications (Web Push) for booking status updates.
 * Free: delivered through the browsers' own push services. Each device a client
 * allows is stored in `PushSubscription`; dead subscriptions are removed on send.
 */
const SUBSCRIPTIONS = 'PushSubscription';

let configured: boolean | null = null;

export function pushPublicKey(): string {
  return process.env.VAPID_PUBLIC_KEY || '';
}

function ensureConfigured(): boolean {
  if (configured !== null) return configured;
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  configured = Boolean(publicKey && privateKey);
  if (configured) {
    webpush.setVapidDetails(process.env.VAPID_SUBJECT || 'mailto:support@hexpertify.com', publicKey!, privateKey!);
  }
  return configured;
}

export function isPushConfigured(): boolean {
  return ensureConfigured();
}

const norm = (v: unknown) => String(v ?? '').trim().toLowerCase();

export async function saveSubscription(subscription: any, client: { email?: string; id?: string }): Promise<void> {
  const db = getDatabase();
  await db.collection(SUBSCRIPTIONS).updateOne(
    { endpoint: subscription.endpoint },
    {
      $set: {
        endpoint: subscription.endpoint,
        keys: subscription.keys,
        clientEmail: norm(client.email),
        clientId: String(client.id || ''),
        updatedAt: new Date()
      },
      $setOnInsert: { createdAt: new Date() }
    },
    { upsert: true }
  );
}

export async function removeSubscription(endpoint: string): Promise<void> {
  await getDatabase().collection(SUBSCRIPTIONS).deleteOne({ endpoint });
}

export interface PushMessage {
  title: string;
  body: string;
  /** Path opened when the notification is clicked */
  url?: string;
  /** Notifications with the same tag replace each other (one per booking) */
  tag?: string;
}

/** Sends to every device the client allowed. Never throws: notifications are best-effort. */
export async function sendPushToClient(client: { email?: string; id?: string }, message: PushMessage): Promise<void> {
  try {
    if (!ensureConfigured()) return;
    const or: any[] = [];
    if (client.email) or.push({ clientEmail: norm(client.email) });
    if (client.id) or.push({ clientId: String(client.id) });
    if (!or.length) return;

    const db = getDatabase();
    const subs = await db.collection(SUBSCRIPTIONS).find({ $or: or }).toArray();
    const payload = JSON.stringify({ url: '/client/sessions', ...message });

    await Promise.all(subs.map(async (s: any) => {
      try {
        await webpush.sendNotification({ endpoint: s.endpoint, keys: s.keys }, payload, { TTL: 24 * 60 * 60 });
      } catch (err: any) {
        // 404 / 410: the browser revoked the subscription
        if (err?.statusCode === 404 || err?.statusCode === 410) {
          await db.collection(SUBSCRIPTIONS).deleteOne({ endpoint: s.endpoint }).catch(() => {});
        } else {
          console.warn('[Push] Send failed:', err?.statusCode || err?.message);
        }
      }
    }));
  } catch (err: any) {
    console.warn('[Push] Dispatch failed:', err?.message);
  }
}
