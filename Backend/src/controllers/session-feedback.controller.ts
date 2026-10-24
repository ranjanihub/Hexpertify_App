import { Request, Response } from 'express';
import { ObjectId } from 'mongodb';
import { getDatabase } from '../db/mongodb';
import { cacheService } from '../services/cache.service';
import { resolveClientViewer } from '../services/client-access';
import { emailNotification } from '../services/notification.service';

/**
 * Post-session feedback (Session Rating Scale, 3 items).
 * Each item is 0–10; total out of 30.
 * Alert levels: healthy ≥ 27, watch 24–26, attention < 24.
 */
const FEEDBACK = 'SessionFeedback';
export const FEEDBACK_ITEMS = ['helpfulness', 'goalsHeard', 'approach'] as const;
export const MAX_SCORE = 30;
const PENDING_WINDOW_DAYS = 30;

export function feedbackLevel(total: number): 'healthy' | 'watch' | 'attention' {
  if (total >= 27) return 'healthy';
  if (total >= 24) return 'watch';
  return 'attention';
}

const norm = (v: unknown) => String(v ?? '').trim().toLowerCase();
const escapeRx = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const bookingKey = (b: any) => String(b.id || b._id);

/** The client a request speaks for: their API token, or (legacy client panel) their email/id */
async function resolveClientIdentity(req: Request): Promise<{ email: string; ids: string[] } | null> {
  const viewer = await resolveClientViewer(req);
  if (viewer.kind === 'client') {
    const ids = [...viewer.ids];
    return { email: ids.find((v) => v.includes('@')) || '', ids };
  }
  if (viewer.kind !== 'anonymous') return null;

  const email = norm(req.query.clientEmail || req.body?.clientEmail);
  const id = String(req.query.clientId || req.body?.clientId || '').trim();
  if (!email && !id) return null;
  return { email, ids: [email, id].filter(Boolean) };
}

/** Completed bookings that belong to this client (backend bookings by email/id, live-site bookings by userId) */
async function findClientCompletedBookings(identity: { email: string; ids: string[] }): Promise<any[]> {
  const db = getDatabase();
  const db_user = identity.email
    ? await db.collection('User').findOne({ email: { $regex: `^${escapeRx(identity.email)}$`, $options: 'i' } }).catch(() => null)
    : null;

  const idValues = new Set<string>(identity.ids.filter((v) => !v.includes('@')));
  if (db_user) idValues.add(String(db_user._id));
  const idMatchers: any[] = [];
  idValues.forEach((v) => {
    idMatchers.push(v);
    if (ObjectId.isValid(v)) idMatchers.push(new ObjectId(v));
  });

  const or: any[] = [];
  if (identity.email) or.push({ clientEmail: { $regex: `^${escapeRx(identity.email)}$`, $options: 'i' } });
  if (idMatchers.length) or.push({ clientId: { $in: idMatchers } }, { userId: { $in: idMatchers } });
  if (!or.length) return [];

  const since = new Date(Date.now() - PENDING_WINDOW_DAYS * 24 * 60 * 60 * 1000);
  const bookings = await db.collection('Booking')
    .find({ $and: [{ $or: or }, { status: { $in: ['COMPLETED', 'completed'] } }, { updatedAt: { $gte: since } }] })
    .sort({ updatedAt: -1 })
    .toArray();
  return bookings.map((b) => ({ ...b, _client: db_user }));
}

/** Fills consultant / service names for live-site bookings that only store ids */
async function describeBooking(b: any) {
  const db = getDatabase();
  let consultantName = b.consultantName || b.therapistName;
  let consultantEmail = b.consultantEmail || '';
  if ((!consultantName || !consultantEmail) && b.consultantId) {
    const or: any[] = [{ id: String(b.consultantId) }, { _id: b.consultantId }];
    if (ObjectId.isValid(String(b.consultantId))) or.push({ _id: new ObjectId(String(b.consultantId)) });
    const c: any = await db.collection('Consultant').findOne({ $or: or }).catch(() => null);
    consultantName = consultantName || c?.name;
    consultantEmail = consultantEmail || c?.email || '';
  }
  let serviceTitle = b.serviceTitle;
  if (!serviceTitle && b.serviceId) {
    const s: any = await db.collection('Service').findOne({ _id: b.serviceId }).catch(() => null);
    serviceTitle = s?.name;
  }
  return {
    bookingId: bookingKey(b),
    consultantId: String(b.consultantId || b.therapistId || ''),
    consultantName: consultantName || 'Your Therapist',
    consultantEmail,
    serviceTitle: serviceTitle || 'Therapy Session',
    sessionDate: b.date || b.scheduledAt || b.createdAt,
    sessionTime: b.time || ''
  };
}

export class SessionFeedbackController {
  /**
   * GET /api/session-feedback/pending — completed sessions this client hasn't rated yet (most recent first)
   */
  static async pending(req: Request, res: Response): Promise<void> {
    try {
      const identity = await resolveClientIdentity(req);
      if (!identity) {
        res.json({ success: true, pending: [] });
        return;
      }
      const bookings = await findClientCompletedBookings(identity);
      if (!bookings.length) {
        res.json({ success: true, pending: [] });
        return;
      }
      const answered = await getDatabase().collection(FEEDBACK)
        .find({ bookingId: { $in: bookings.map(bookingKey) } }, { projection: { bookingId: 1 } })
        .toArray();
      const answeredIds = new Set(answered.map((f: any) => f.bookingId));
      const pending = await Promise.all(bookings.filter((b) => !answeredIds.has(bookingKey(b))).map(describeBooking));
      res.json({ success: true, pending });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error?.message || 'Failed to load pending feedback' });
    }
  }

  /**
   * POST /api/session-feedback — { bookingId, helpfulness, goalsHeard, approach, message? }
   */
  static async submit(req: Request, res: Response): Promise<void> {
    try {
      const body = req.body || {};
      const scores: Record<string, number> = {};
      for (const item of FEEDBACK_ITEMS) {
        const value = Number(body[item]);
        if (!Number.isInteger(value) || value < 0 || value > 10) {
          res.status(400).json({ success: false, error: 'Please answer all three questions (0–10).' });
          return;
        }
        scores[item] = value;
      }
      const message = String(body.message || '').trim().slice(0, 2000);

      const identity = await resolveClientIdentity(req);
      if (!identity) {
        res.status(401).json({ success: false, error: 'Please sign in to share feedback.' });
        return;
      }

      // Only a completed session that belongs to this client can be rated
      const bookings = await findClientCompletedBookings(identity);
      const booking = bookings.find((b) => bookingKey(b) === String(body.bookingId || ''));
      if (!booking) {
        res.status(404).json({ success: false, error: 'This session is not available for feedback.' });
        return;
      }

      const details = await describeBooking(booking);
      const client = booking._client;
      const totalScore = scores.helpfulness + scores.goalsHeard + scores.approach;
      const level = feedbackLevel(totalScore);
      const now = new Date();
      const doc = {
        id: `SFB-${Date.now().toString(36).toUpperCase()}`,
        bookingId: details.bookingId,
        clientId: String(client?._id || booking.clientId || booking.userId || ''),
        clientName: client?.name || booking.clientName || 'Client',
        clientEmail: norm(client?.email || booking.clientEmail || identity.email),
        consultantId: details.consultantId,
        consultantKey: norm(details.consultantId),
        consultantName: details.consultantName,
        serviceTitle: details.serviceTitle,
        sessionDate: details.sessionDate,
        sessionTime: details.sessionTime,
        scores,
        totalScore,
        maxScore: MAX_SCORE,
        level,
        message,
        createdAt: now
      };

      // One response per session, even if the form is submitted twice
      const result = await getDatabase().collection(FEEDBACK).updateOne(
        { bookingId: doc.bookingId },
        { $setOnInsert: doc },
        { upsert: true }
      );
      if (!result.upsertedId) {
        res.status(409).json({ success: false, error: 'Feedback for this session was already submitted.' });
        return;
      }

      if (level === 'attention') {
        const alert = {
          id: `NOTIF-${Date.now().toString().slice(-6)}-SFB`,
          recipientId: doc.consultantId,
          recipientEmail: norm(details.consultantEmail),
          recipientRole: 'CONSULTANT',
          type: 'SESSION_FEEDBACK_ALERT',
          title: 'Session feedback needs attention 🔴',
          message: `${doc.clientName} rated their ${doc.serviceTitle} session ${totalScore}/${MAX_SCORE}. Review their feedback before the next session.`,
          bookingId: doc.bookingId,
          read: false,
          createdAt: now,
          updatedAt: now
        };
        await Promise.all([
          getDatabase().collection('Notification').insertOne({ ...alert }).catch(() => {}),
          getDatabase().collection('notifications').insertOne({ ...alert }).catch(() => {}),
          emailNotification({ ...alert, recipientRole: 'CONSULTANT' })
        ]);
      }

      cacheService.invalidateTags(['notifications', 'session-feedback']);
      res.status(201).json({ success: true, totalScore, maxScore: MAX_SCORE, level });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error?.message || 'Failed to save feedback' });
    }
  }

  /**
   * GET /api/session-feedback — therapists: their own sessions' feedback (with the written message);
   * admins: scores only. Optional ?clientId= / ?clientEmail= filter.
   */
  static async list(req: Request, res: Response): Promise<void> {
    try {
      const viewer = await resolveClientViewer(req);
      const query: any = {};

      if (viewer.kind === 'therapist') {
        query.consultantKey = { $in: [...viewer.ids] };
      } else if (viewer.kind !== 'admin' && viewer.kind !== 'internal') {
        res.status(401).json({ success: false, error: 'Sign in as a therapist or administrator to view session feedback.' });
        return;
      }

      const clientFilters: any[] = [];
      if (req.query.clientId) clientFilters.push({ clientId: String(req.query.clientId) });
      if (req.query.clientEmail) clientFilters.push({ clientEmail: norm(req.query.clientEmail) });
      if (clientFilters.length) query.$or = clientFilters;

      const rows = await getDatabase().collection(FEEDBACK).find(query).sort({ createdAt: -1 }).limit(500).toArray();
      // The written message is between the client and their therapist
      const feedback = rows.map(({ _id, ...f }: any) => (viewer.kind === 'therapist' || viewer.kind === 'internal' ? f : { ...f, message: undefined, hasMessage: Boolean(f.message) }));

      const summary = {
        count: feedback.length,
        averageScore: feedback.length ? Math.round((feedback.reduce((s, f) => s + f.totalScore, 0) / feedback.length) * 10) / 10 : null,
        healthy: feedback.filter((f) => f.level === 'healthy').length,
        watch: feedback.filter((f) => f.level === 'watch').length,
        attention: feedback.filter((f) => f.level === 'attention').length
      };
      res.json({ success: true, maxScore: MAX_SCORE, summary, feedback });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error?.message || 'Failed to load session feedback' });
    }
  }
}
