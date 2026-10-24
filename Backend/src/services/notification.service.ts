import crypto from 'crypto';
import { getDatabase } from '../db/mongodb';
import { cacheService } from './cache.service';
import { adminAlertEmail, MailService, portalUrl } from './mail.service';

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

/** Titles are plain text; the panels pick an icon per type (older titles carry emoji) */
export function cleanNotificationTitle(title: unknown): string {
  return String(title || '').replace(/[\p{Extended_Pictographic}\u{FE0F}\u{200D}]/gu, '').replace(/\s{2,}/g, ' ').trim();
}

/** Repeats of one booking event closer together than this are duplicates (double submit, retries) */
export const DUPLICATE_WINDOW_MS = 60 * 1000;

export function newNotificationId(): string {
  return `NOTIF-${Date.now().toString(36).toUpperCase()}${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
}

/**
 * Notification types that are also emailed, with the email's button label.
 * Booking and payment events have their own emails; frequent ones (messages, daily activity check-ins) stay in-app.
 */
const EMAILED_TYPES: Record<string, string> = {
  ASSESSMENT_ASSIGNED: 'Start assessment',
  ASSESSMENT_COMPLETED: 'View results',
  ACTIVITY_ASSIGNED: 'Start activity',
  SESSION_FEEDBACK_ALERT: 'Review feedback',
  CUSTOM_SLOT_REQUEST: 'Open my calendar',
  THERAPIST_SWITCH_REQUEST: 'Review request'
};

/**
 * Emails a copy of an in-app notification when its type is in EMAILED_TYPES; never throws.
 * Therapist addresses come from the Consultant record, so a request body can't redirect them.
 */
export async function emailNotification(n: NewNotification): Promise<void> {
  const type = String(n.type || '').toUpperCase();
  const ctaLabel = EMAILED_TYPES[type];
  if (!ctaLabel) return;
  try {
    const db = getDatabase();
    let to = '';
    let toName = '';
    if (n.recipientRole === 'ADMIN') {
      to = adminAlertEmail();
      toName = 'Admin';
    } else if (n.recipientRole === 'CONSULTANT') {
      const id = String(n.recipientId || '');
      const consultant: any = id
        ? await db.collection('Consultant').findOne({ $or: [{ id }, { _id: id as any }] }).catch(() => null)
        : await db.collection('Consultant').findOne({ email: String(n.recipientEmail || '').toLowerCase() }).catch(() => null);
      to = consultant?.email || '';
      toName = consultant?.name || '';
    } else {
      const id = String(n.recipientId || '');
      const email = String(n.recipientEmail || '').toLowerCase();
      const user: any = await db.collection('User').findOne({ $or: [...(email ? [{ email }] : []), ...(id ? [{ id }, { _id: id as any }] : [])] }).catch(() => null);
      to = email || user?.email || '';
      toName = user?.name || '';
    }
    if (!to) return;

    const link = n.link || defaultNotificationLink(n.recipientRole, type);
    const url = portalUrl(n.recipientRole === 'ADMIN' ? `/admin/${link.replace(/^\//, '')}` : link);
    await MailService.sendNotificationEmail({
      to,
      toName,
      audience: n.recipientRole,
      title: cleanNotificationTitle(n.title),
      message: n.message,
      url,
      ctaLabel,
      ref: n.bookingId
    });
  } catch (err: any) {
    console.warn('[Notifications] Email failed:', err?.message);
  }
}

/** Creates one notification per entry; never throws (notifications are best-effort) */
export async function createNotifications(entries: NewNotification[]): Promise<void> {
  let docs = entries
    .filter((e) => e.recipientRole === 'ADMIN' || e.recipientId || e.recipientEmail)
    .map((e) => {
      const now = new Date();
      return {
        id: newNotificationId(),
        recipientRole: e.recipientRole,
        recipientId: String(e.recipientId || ''),
        recipientEmail: String(e.recipientEmail || '').toLowerCase(),
        type: e.type,
        title: cleanNotificationTitle(e.title),
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
    const since = new Date(Date.now() - DUPLICATE_WINDOW_MS);
    const fresh = [];
    for (const d of docs) {
      const repeat = d.bookingId && await db.collection('Notification').findOne(
        { bookingId: d.bookingId, type: d.type, recipientRole: d.recipientRole, recipientEmail: d.recipientEmail, createdAt: { $gte: since } },
        { projection: { _id: 1 } }
      ).catch(() => null);
      if (!repeat) fresh.push(d);
    }
    docs = fresh;
    if (!docs.length) return;

    await db.collection('Notification').insertMany(docs.map((d) => ({ ...d })));
    await db.collection('notifications').insertMany(docs.map((d) => ({ ...d }))).catch(() => {});
    cacheService.invalidateTags(['notifications']);
  } catch (err: any) {
    console.warn('[Notifications] Create failed:', err?.message);
  }
}
