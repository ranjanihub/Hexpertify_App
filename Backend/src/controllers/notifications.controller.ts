import { Request, Response } from 'express';
import { ObjectId } from 'mongodb';
import { getDatabase } from '../db/mongodb';
import { ClientViewer, resolveClientViewer } from '../services/client-access';
import {
  cleanNotificationTitle, defaultNotificationLink, DUPLICATE_WINDOW_MS, newNotificationId, NotificationRole
} from '../services/notification.service';

const escapeRx = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const exact = (s: string) => new RegExp(`^${escapeRx(s)}$`, 'i');
const LIST_LIMIT = 100;

/** Clients that predate API tokens identify themselves by email/id in the query or body */
function legacyIdentity(req: Request): string[] {
  const src: any = { ...(req.body || {}), ...req.query };
  return [src.recipientEmail, src.recipientId, src.email, src.clientEmail, src.clientId]
    .map((v) => String(v || '').trim())
    .filter(Boolean);
}

function recipientMatch(ids: string[]): any[] {
  const or: any[] = [];
  ids.forEach((v) => {
    if (v.includes('@')) {
      const rx = exact(v);
      or.push({ recipientEmail: rx }, { consultantEmail: rx }, { userEmail: rx }, { clientEmail: rx });
    } else {
      or.push({ recipientId: v }, { consultantId: v }, { userId: v }, { clientId: v });
    }
  });
  return or;
}

/**
 * The notifications the caller may see: admins get admin alerts; therapists and clients get only
 * their own, identified by their API token (or, for the legacy client panel, the email/id they send).
 */
function scopeFor(viewer: ClientViewer, req: Request): { role: NotificationRole; query: any } | null {
  const requestedRole = String(req.query.role || req.body?.role || '').toUpperCase();

  if (viewer.kind === 'admin' || viewer.kind === 'internal') {
    if (requestedRole === 'CLIENT' || requestedRole === 'CONSULTANT' || requestedRole === 'THERAPIST') {
      // Internal tools may still read a specific person's feed
      const ids = legacyIdentity(req);
      if (!ids.length) return null;
      const role: NotificationRole = requestedRole === 'CLIENT' ? 'CLIENT' : 'CONSULTANT';
      return { role, query: { $and: [roleMatch(role), { $or: recipientMatch(ids) }] } };
    }
    return {
      role: 'ADMIN',
      query: { $or: [{ recipientRole: 'ADMIN' }, { role: 'ADMIN' }, { targetRole: 'ADMIN' }, { type: 'NEW_BOOKING_ALERT' }, { type: 'ADMIN_ALERT' }] }
    };
  }

  if (viewer.kind === 'therapist') {
    return { role: 'CONSULTANT', query: { $and: [roleMatch('CONSULTANT'), { $or: recipientMatch([...viewer.ids]) }] } };
  }

  const ids = viewer.kind === 'client' ? [...viewer.ids] : legacyIdentity(req);
  if (!ids.length) return null;
  return {
    role: 'CLIENT',
    query: {
      $and: [
        roleMatch('CLIENT'),
        { $or: [...recipientMatch(ids), { recipientRole: 'CLIENT', recipientEmail: { $in: ['all', 'ALL'] } }] }
      ]
    }
  };
}

function roleMatch(role: NotificationRole): any {
  if (role === 'CONSULTANT') {
    return { $or: [{ recipientRole: { $in: ['CONSULTANT', 'THERAPIST'] } }, { role: { $in: ['CONSULTANT', 'THERAPIST'] } }] };
  }
  if (role === 'CLIENT') return { recipientRole: { $in: ['CLIENT', null] } };
  return { recipientRole: 'ADMIN' };
}

/**
 * Older code wrote some events twice: with identical text, or (bookings) seconds apart with a
 * fallback time. Shows each once, keeping the original, which carries the booked slot.
 * Expects newest-first input and returns newest-first.
 */
function dedupe(list: any[]): any[] {
  const seenText = new Set<string>();
  const lastEventAt = new Map<string, number>();
  const kept: any[] = [];
  for (const n of [...list].reverse()) {
    const textKey = `${n.title}|${n.message}|${n.bookingId || ''}`;
    if (seenText.has(textKey)) continue;
    if (n.bookingId) {
      const eventKey = `${n.bookingId}|${n.type}|${n.recipientRole || ''}`;
      const at = new Date(n.createdAt).getTime() || 0;
      const prev = lastEventAt.get(eventKey);
      if (prev !== undefined && at - prev < DUPLICATE_WINDOW_MS) continue;
      lastEventAt.set(eventKey, at);
    }
    seenText.add(textKey);
    kept.push(n);
  }
  return kept.reverse();
}

export class NotificationsController {
  /**
   * GET /api/notifications — the caller's own notifications (newest first)
   */
  static async getAll(req: Request, res: Response): Promise<void> {
    try {
      const scope = scopeFor(await resolveClientViewer(req), req);
      if (!scope) {
        res.json({ success: true, count: 0, unreadCount: 0, notifications: [] });
        return;
      }

      const db = getDatabase();
      const primary = await db.collection('Notification').find(scope.query).sort({ createdAt: -1 }).limit(LIST_LIMIT * 2).toArray();
      const list = primary.length
        ? primary
        : await db.collection('notifications').find(scope.query).sort({ createdAt: -1 }).limit(LIST_LIMIT * 2).toArray();

      const notifications = dedupe(list).slice(0, LIST_LIMIT).map(({ _id, ...n }: any) => ({
        ...n,
        id: n.id || String(_id),
        title: cleanNotificationTitle(n.title),
        link: n.link || defaultNotificationLink(scope.role, n.type)
      }));

      res.json({
        success: true,
        count: notifications.length,
        unreadCount: notifications.filter((n) => !n.read).length,
        notifications
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error?.message || 'Failed to fetch notifications' });
    }
  }

  /**
   * POST /api/notifications
   */
  static async create(req: Request, res: Response): Promise<void> {
    try {
      const db = getDatabase();
      const body = req.body || {};

      const recipientRole = (body.recipientRole || body.role || (body.consultantEmail || body.consultantId ? 'CONSULTANT' : 'ADMIN')).toUpperCase();
      const newNotification = {
        id: body.id || newNotificationId(),
        recipientId: body.recipientId || body.userId || body.clientId || body.consultantId || '',
        recipientEmail: (body.recipientEmail || body.userEmail || body.consultantEmail || body.clientEmail || '').toLowerCase(),
        consultantEmail: (body.consultantEmail || body.recipientEmail || '').toLowerCase(),
        consultantId: body.consultantId || body.recipientId || '',
        consultantName: body.consultantName || body.recipientName || '',
        clientEmail: (body.clientEmail || '').toLowerCase(),
        clientName: body.clientName || '',
        recipientRole,
        type: body.type || 'ALERT',
        title: cleanNotificationTitle(body.title) || 'Notification',
        message: body.message || '',
        link: body.link || defaultNotificationLink(recipientRole === 'THERAPIST' ? 'CONSULTANT' : recipientRole, body.type || ''),
        bookingId: body.bookingId || '',
        activityId: body.activityId || '',
        activityTitle: body.activityTitle || '',
        assessmentId: body.assessmentId || '',
        assessmentTitle: body.assessmentTitle || '',
        isPrivate: !!body.isPrivate,
        sharingPreference: body.sharingPreference || 'full',
        submissionData: body.submissionData || null,
        read: false,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const result = await db.collection('Notification').insertOne(newNotification);
      await db.collection('notifications').insertOne(newNotification).catch(() => {});

      res.status(201).json({
        success: true,
        notification: { ...newNotification, _id: result.insertedId },
        message: 'Notification created in MongoDB Atlas'
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error?.message || 'Failed to create notification' });
    }
  }

  /**
   * PUT /api/notifications/:id/read — only within the caller's own notifications
   */
  static async markRead(req: Request, res: Response): Promise<void> {
    try {
      const id = String(req.params.id || '');
      const scope = scopeFor(await resolveClientViewer(req), req);
      const idMatch: any = ObjectId.isValid(id) ? { $or: [{ _id: new ObjectId(id) }, { id }] } : { id };
      const query = scope ? { $and: [idMatch, scope.query] } : idMatch;

      const db = getDatabase();
      await Promise.all([
        db.collection('Notification').updateMany(query, { $set: { read: true, updatedAt: new Date() } }),
        db.collection('notifications').updateMany(query, { $set: { read: true, updatedAt: new Date() } }).catch(() => {})
      ]);

      res.json({ success: true, message: 'Notification marked as read' });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error?.message || 'Failed to mark notification as read' });
    }
  }

  /**
   * POST /api/notifications/mark-all-read — the caller's own notifications only
   */
  static async markAllRead(req: Request, res: Response): Promise<void> {
    try {
      const scope = scopeFor(await resolveClientViewer(req), req);
      if (!scope) {
        res.json({ success: true, message: 'Nothing to mark' });
        return;
      }

      const db = getDatabase();
      const query = { $and: [scope.query, { read: { $ne: true } }] };
      await Promise.all([
        db.collection('Notification').updateMany(query, { $set: { read: true, updatedAt: new Date() } }),
        db.collection('notifications').updateMany(query, { $set: { read: true, updatedAt: new Date() } }).catch(() => {})
      ]);

      res.json({ success: true, message: 'All notifications marked as read' });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error?.message || 'Failed to mark all as read' });
    }
  }
}
