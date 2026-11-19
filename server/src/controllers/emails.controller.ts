import { Request, Response } from 'express';
import { z } from 'zod';
import { getDatabase } from '../db/mongodb';
import { isInternalRequest } from '../middlewares/auth.middleware';
import { MailService } from '../services/mail.service';
import { bookingContact, formatSessionWhen } from '../services/booking-confirmation.service';

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
/** Statuses that are not upcoming sessions */
const NOT_UPCOMING = ['CANCELLED', 'COMPLETED', 'PENDING_PAYMENT', 'EXPIRED', 'NO_SHOW', 'NO-SHOW', 'NO_SHOW_CLIENT', 'NO_SHOW_CONSULTANT', 'Cancelled', 'Completed'];

const welcomeSchema = z.object({ name: z.string().trim().min(1).max(200), email: z.string().trim().email() });

/** The scheduler authenticates with the internal key or Vercel Cron's `Authorization: Bearer <CRON_SECRET>` */
function isScheduler(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  const bearer = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '').trim();
  return isInternalRequest(req) || (!!secret && bearer === secret);
}

async function therapistEmailFor(booking: any): Promise<string> {
  if (booking.consultantEmail) return booking.consultantEmail;
  const id = booking.consultantId || booking.therapistId;
  if (!id) return '';
  const consultant: any = await getDatabase().collection('Consultant').findOne({ $or: [{ id: String(id) }, { _id: id }] }).catch(() => null);
  return consultant?.email || '';
}

export class EmailsController {
  /**
   * POST /api/emails/welcome (internal) — the live website's sign-up
   */
  static async welcome(req: Request, res: Response): Promise<void> {
    const parsed = welcomeSchema.safeParse(req.body || {});
    if (!parsed.success) {
      res.status(400).json({ success: false, error: 'Name and a valid email are required' });
      return;
    }
    const result = await MailService.sendWelcome({ name: parsed.data.name!, email: parsed.data.email! });
    res.json(result);
  }

  /**
   * GET|POST /api/emails/session-reminders — run every 30 minutes by the scheduler.
   * Sends the "tomorrow" reminder once a session is within 24 hours and the "starts soon" reminder
   * in its last 80 minutes, to the client and the therapist. Each is sent once per booking.
   */
  static async sessionReminders(req: Request, res: Response): Promise<void> {
    if (!isScheduler(req)) {
      res.status(401).json({ success: false, error: 'Not authorised' });
      return;
    }
    try {
      const db = getDatabase();
      const now = Date.now();
      const bookings = await db.collection('Booking').find({
        scheduledAt: { $gt: new Date(now), $lte: new Date(now + 24 * HOUR) },
        status: { $nin: NOT_UPCOMING },
        clientName: { $nin: ['Open Consultation Slot', 'Blocked Time Slot'] }
      }).limit(500).toArray();

      let sent = 0;
      for (const booking of bookings) {
        const until = new Date(booking.scheduledAt).getTime() - now;
        const window: '24h' | '1h' | null = until <= 80 * MINUTE ? '1h' : until > 3 * HOUR ? '24h' : null;
        if (!window) continue;

        // Claim the reminder first so overlapping runs never send it twice
        const flag = window === '1h' ? 'reminder1hSentAt' : 'reminder24hSentAt';
        const claim = await db.collection('Booking').updateOne({ _id: booking._id, [flag]: { $exists: false } }, { $set: { [flag]: new Date() } });
        if (!claim.modifiedCount) continue;

        const contact = await bookingContact(booking);
        if (!contact) continue;
        const { date, time } = formatSessionWhen(booking);
        const therapistEmail = await therapistEmailFor(booking);
        const payload = {
          clientName: contact.clientName,
          clientEmail: contact.clientEmail,
          consultantName: contact.consultantName,
          therapistEmail,
          serviceTitle: contact.serviceTitle,
          scheduledDate: date,
          scheduledTime: time,
          durationMinutes: contact.durationMinutes,
          meetingLink: booking.meetingLink,
          bookingId: contact.bookingId
        };
        const results = await Promise.all([
          MailService.sendSessionReminder(payload, { audience: 'client', window }),
          therapistEmail ? MailService.sendSessionReminder(payload, { audience: 'therapist', window }) : Promise.resolve({ success: false })
        ]);
        sent += results.filter((r) => r.success).length;
      }

      res.json({ success: true, checked: bookings.length, sent });
    } catch (error: any) {
      console.error('[Emails] Session reminders failed:', error);
      res.status(500).json({ success: false, error: error?.message || 'Failed to send reminders' });
    }
  }
}
