import crypto from 'crypto';
import { getDatabase } from '../db/mongodb';
import { cacheService } from './cache.service';

/**
 * In-app notifications (the bell in the client, consultant and admin panels).
 * Stored in `Notification` (mirrored to the legacy `notifications` collection).
 */
export type NotificationRole = 'CLIENT' | 'CONSULTANT' | 'ADMIN';

export interface NewNotification {
  recipientRole: NotificationRole;
  recipientId?: string;
  recipientEmail?: string;
  type: string;
  title: string;
  message: string;
  bookingId?: string;
  /** Page opened from the bell, relative to the recipient's panel */
  link?: string;
}

/** Default page for each notification type, per panel */
export function defaultNotificationLink(role: NotificationRole, type: string): string {
  const t = String(type || '').toUpperCase();
  if (role === 'CLIENT') {
    if (t.startsWith('ACTIVITY')) return '/activities';
    if (t.startsWith('ASSESSMENT')) return '/assessments';
    if (t.includes('MESSAGE')) return '/messages';
    if (t.includes('COMPLETED')) return '/client';
    if (t.startsWith('SESSION') || t.includes('BOOKING')) return '/sessions';
    return '/progress';
  }
  if (role === 'CONSULTANT') {
    if (t.includes('FEEDBACK')) return '/consultant';
    if (t.includes('MESSAGE')) return '/consultant/messages';
    if (t.startsWith('ASSESSMENT')) return '/consultant/assessments';
    return '/consultant/calendar';
  }
  if (t.includes('PAYMENT') || t.includes('REFUND')) return 'payments';
  return 'bookings';
}

export function newNotificationId(): string {
  return `NOTIF-${Date.now().toString(36).toUpperCase()}${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
}

/** Creates one notification per entry; never throws (notifications are best-effort) */
export async function createNotifications(entries: NewNotification[]): Promise<void> {
  const docs = entries
    .filter((e) => e.recipientRole === 'ADMIN' || e.recipientId || e.recipientEmail)
    .map((e) => {
      const now = new Date();
      return {
        id: newNotificationId(),
        recipientRole: e.recipientRole,
        recipientId: String(e.recipientId || ''),
        recipientEmail: String(e.recipientEmail || '').toLowerCase(),
        type: e.type,
        title: e.title,
        message: e.message,
        bookingId: e.bookingId || '',
        link: e.link || defaultNotificationLink(e.recipientRole, e.type),
        read: false,
        createdAt: now,
        updatedAt: now
      };
    });
  if (!docs.length) return;
  try {
    const db = getDatabase();
    await db.collection('Notification').insertMany(docs.map((d) => ({ ...d })));
    await db.collection('notifications').insertMany(docs.map((d) => ({ ...d }))).catch(() => {});
    cacheService.invalidateTags(['notifications']);
  } catch (err: any) {
    console.warn('[Notifications] Create failed:', err?.message);
  }
}
