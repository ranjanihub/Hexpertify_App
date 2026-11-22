import { getClientAuth } from './auth';

/**
 * Booking status push notifications (Web Push). The service worker (/sw.js) shows them;
 * this module asks permission, subscribes the device and registers it with the backend.
 * iPhone/iPad only support this once Hexpertify is added to the home screen.
 */

export function isPushSupported(): boolean {
  return typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
}

export function pushPermission(): NotificationPermission | 'unsupported' {
  return isPushSupported() ? Notification.permission : 'unsupported';
}

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

/** Subscribes this device (permission must already be granted) and sends it to the backend */
async function registerDevice(): Promise<boolean> {
  const keyRes = await fetch('/api/push/public-key');
  const keyData = await keyRes.json().catch(() => null);
  if (!keyData?.enabled || !keyData.publicKey) return false;

  const registration = await navigator.serviceWorker.ready;
  const subscription = (await registration.pushManager.getSubscription()) ||
    (await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(keyData.publicKey) as BufferSource,
    }));

  const client = getClientAuth();
  const res = await fetch('/api/push/subscribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ subscription: subscription.toJSON(), clientEmail: client?.email, clientId: client?.id }),
  });
  return res.ok;
}

/** Asks the browser for permission, then registers the device. Resolves to the outcome. */
export async function enablePushNotifications(): Promise<'enabled' | 'denied' | 'unsupported' | 'failed'> {
  if (!isPushSupported()) return 'unsupported';
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return 'denied';
  try {
    return (await registerDevice()) ? 'enabled' : 'failed';
  } catch {
    return 'failed';
  }
}

/** Keeps an already-allowed device registered (e.g. after signing in on a new account) */
export async function syncPushSubscription(): Promise<void> {
  if (pushPermission() !== 'granted') return;
  try {
    await registerDevice();
  } catch {}
}
