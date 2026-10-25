import { Request, Response } from 'express';
import { ObjectId } from 'mongodb';
import { getDatabase } from '../db/mongodb';
import { BookingEmailPayload, MailService } from '../services/mail.service';
import { bookingContact, formatSessionWhen } from '../services/booking-confirmation.service';
import { isAdminUser } from '../middlewares/auth.middleware';
import { sendPushToClient } from '../services/push.service';
import { createNotifications } from '../services/notification.service';
import { BookingInputError, createBooking } from '../services/booking-create';
import { consultantIds, resolveConsultant } from '../services/booking-refs';
import { bookingStatusOf, normalizeBookingStatus, normalizePaymentStatus } from '../services/booking-status';
import { bookingInstant, isDateLabel, istLabels, resolveScheduledAt, ScheduleError } from '../services/booking-time';

// Bookings awaiting gateway payment (or abandoned) are not real sessions yet
const UNSETTLED_STATUSES = new Set(['PENDING_PAYMENT', 'EXPIRED']);
import { cacheService } from '../services/cache.service';

/** The booking's therapist email: stored on the booking, else looked up from the consultant record */
async function consultantEmailFor(booking: any): Promise<string> {
  if (booking?.consultantEmail) return booking.consultantEmail;
  const cid = booking?.consultantId || booking?.therapistId;
  if (!cid) return '';
  const db = getDatabase();
  const or: any[] = [{ id: String(cid) }, { _id: cid }];
  if (ObjectId.isValid(String(cid))) or.push({ _id: new ObjectId(String(cid)) });
  const consultant: any = await db.collection('Consultant').findOne({ $or: or }).catch(() => null) ||
                          await db.collection('consultants').findOne({ $or: or }).catch(() => null);
  return consultant?.email || '';
}

/** Who changed the booking, for the cancellation/reschedule emails */
function actorOf(req: Request, hint?: unknown): 'client' | 'therapist' | 'admin' {
  // The website server calls with the internal key on behalf of a signed-in client (body `actor: 'client'`)
  if (req.isInternal && hint === 'client') return 'client';
  if (req.user?.role === 'therapist') return 'therapist';
  if (isAdminUser(req.user) || req.isInternal) return 'admin';
  return 'client';
}

/** In-app cancellation notifications: the client, the therapist (unless they cancelled it) and the admins */
function notifyCancellation(
  booking: any,
  d: { clientEmail: string; clientName: string; consultantName: string; serviceTitle: string; formattedDate: string; formattedTime: string },
  cancelledByTherapist: boolean,
  pending: Promise<unknown>[]
): void {
  pending.push(consultantEmailFor(booking).then((therapistEmail) => createNotifications([
    { recipientRole: 'CLIENT', recipientId: booking.clientId, recipientEmail: d.clientEmail, type: 'SESSION_CANCELLED', bookingId: booking.id,
      title: 'Therapy Session Cancelled ❌', message: `Your consultation on ${d.formattedDate} at ${d.formattedTime} with ${d.consultantName} has been cancelled.` },
    ...(cancelledByTherapist ? [] : [{
      recipientRole: 'CONSULTANT' as const, recipientId: booking.consultantId, recipientEmail: therapistEmail, type: 'SESSION_CANCELLED', bookingId: booking.id,
      title: 'Session Cancelled ❌', message: `${d.clientName} cancelled their "${d.serviceTitle}" session on ${d.formattedDate} at ${d.formattedTime}.`
    }]),
    { recipientRole: 'ADMIN', type: 'SESSION_CANCELLED', bookingId: booking.id,
      title: 'Session Cancelled', message: `${d.clientName}'s session with ${d.consultantName} on ${d.formattedDate} at ${d.formattedTime} was cancelled.` }
  ])));
}

export class BookingsController {
  /**
   * GET /api/bookings and GET /api/admin/bookings
   */
  static async getAll(req: Request, res: Response): Promise<void> {
    try {
      const { clientEmail, clientId, status, consultantEmail } = req.query;
      const consultantId = req.query.consultantId || req.query.therapistId;
      const isConsultantQuery = Boolean(consultantId || consultantEmail);
      const cacheKey = `bookings:all:${clientEmail || ''}:${clientId || ''}:${consultantId || ''}:${consultantEmail || ''}:${status || ''}`;

      const responseData = await cacheService.wrap(cacheKey, ['bookings', 'users', 'consultants'], 15, async () => {
        const db = getDatabase();
        const [primaryBookings, users, consultants, services] = await Promise.all([
          db.collection('Booking').find({}).toArray().catch(() => db.collection('bookings').find({}).toArray().catch(() => [])),
          db.collection('User').find({}).toArray().catch(() => db.collection('users').find({}).toArray().catch(() => [])),
          db.collection('Consultant').find({}).toArray().catch(() => db.collection('consultants').find({}).toArray().catch(() => [])),
          db.collection('Service').find({}).toArray().catch(() => db.collection('services').find({}).toArray().catch(() => []))
        ]);

        const userMap = new Map();
        users.forEach((u: any) => {
          userMap.set(String(u._id), u);
          if (u.id) userMap.set(String(u.id), u);
        });

        const consultantMap = new Map();
        consultants.forEach((c: any) => {
          consultantMap.set(String(c._id), c);
          if (c.id) consultantMap.set(String(c.id), c);
        });

        const serviceMap = new Map();
        services.forEach((s: any) => {
          serviceMap.set(String(s._id), s);
          if (s.id) serviceMap.set(String(s.id), s);
        });

        const enriched = primaryBookings.map((b: any) => {
          const u = userMap.get(String(b.userId || b.clientId));
          const c = consultantMap.get(String(b.consultantId || b.therapistId));
          const s = serviceMap.get(String(b.serviceId));

          // Session time in India time; website bookings are paid first and scheduled later (never the purchase time)
          const when = bookingInstant(b);
          const labels = when ? istLabels(when) : null;
          const dateStr: string | null = (isDateLabel(b.date) ? b.date : null) || labels?.date || null;
          const timeStr: string | null = b.time || labels?.time || null;

          let rawConsultantName = b.consultantName || c?.name;
          let consultantName = 'Assigned Therapist';
          let inferredService = b.serviceTitle || s?.name || s?.title;

          if (rawConsultantName) {
            if (rawConsultantName.includes(' - By ')) {
              const parts = rawConsultantName.split(' - By ');
              inferredService = inferredService || parts[0].trim();
              consultantName = parts[1]?.trim() || rawConsultantName;
            } else {
              consultantName = rawConsultantName;
            }
          }

          const rawClientEmail = b.clientEmail || u?.email || '';
          const rawClientPhone = b.clientPhone || u?.phoneNumber || u?.phone || '';

          return {
            ...b,
            id: b.id || String(b._id),
            clientName: b.clientName || u?.name || u?.email?.split('@')[0] || 'Client',
            clientEmail: isConsultantQuery ? undefined : rawClientEmail,
            clientPhone: isConsultantQuery ? undefined : rawClientPhone,
            consultantName,
            consultantAvatar: b.consultantAvatar || c?.photoUrl || c?.photo || '',
            serviceTitle: inferredService || 'Individual Clinical Psychology',
            duration: b.durationMinutes || s?.duration || 50,
            date: dateStr,
            time: timeStr,
            scheduledAt: when ? when.toISOString() : null,
            toBeScheduled: !when && !dateStr,
            status: bookingStatusOf(b),
            paymentStatus: b.paymentStatus ? (normalizePaymentStatus(b.paymentStatus) || String(b.paymentStatus).toUpperCase()) : b.paymentStatus
          };
        });

        let filtered = enriched;

        if (clientEmail) {
          const cEmail = String(clientEmail).toLowerCase().trim();
          filtered = filtered.filter((b: any) => (b.clientEmail || '').toLowerCase().trim() === cEmail);
        }
        if (clientId) {
          const cId = String(clientId);
          filtered = filtered.filter((b: any) => String(b.clientId) === cId || String(b.userId) === cId);
        }
        if (consultantId || consultantEmail) {
          // Accept the consultant's _id, legacy id or email
          const consEmail = String(consultantEmail || '').toLowerCase().trim();
          const consIds = new Set<string>();
          if (consultantId) consIds.add(String(consultantId).toLowerCase().trim());
          consultants.forEach((c: any) => {
            const ids = consultantIds(c).map((v) => v.toLowerCase());
            const email = String(c.email || '').toLowerCase().trim();
            if (ids.some((v) => consIds.has(v)) || (consEmail && email === consEmail)) ids.forEach((v) => consIds.add(v));
          });
          filtered = filtered.filter((b: any) => {
            const bCid = String(b.consultantId || b.therapistId || '').toLowerCase().trim();
            return consIds.has(bCid);
          });
        }
        if (status) {
          const st = normalizeBookingStatus(status) || String(status).toUpperCase();
          filtered = filtered.filter((b: any) => b.status === st);
        } else {
          filtered = filtered.filter((b: any) => !UNSETTLED_STATUSES.has((b.status || '').toUpperCase()));
        }

        return {
          success: true,
          count: filtered.length,
          bookings: filtered
        };
      });

      res.json(responseData);
    } catch (error: any) {
      res.status(500).json({ success: false, error: error?.message || 'Failed to fetch bookings' });
    }
  }

  /**
   * POST /api/bookings
   */
  static async create(req: Request, res: Response): Promise<void> {
    try {
      const body = req.body || {};
      // Only administrators may record a booking as paid; customer payments go through /api/payments.
      // A repeated POST with the same booking ID (double submit, client retry) must not create a second booking or resend emails.
      const { booking, duplicate } = await createBooking(body, {
        canSetPayment: isAdminUser(req.user),
        consultantEmailHint: body.consultantEmail,
        // Admins and the website server may still book a consultant who is not open for booking
        requireBookable: !isAdminUser(req.user) && !req.isInternal
      });
      if (duplicate) {
        res.status(200).json({ success: true, booking, duplicate: true, message: 'Booking already exists.' });
        return;
      }

      res.status(201).json({
        success: true,
        booking,
        message: 'Booking confirmed. Client, Therapist, and Super Admin notifications and emails dispatched successfully.'
      });
    } catch (error: any) {
      if (error instanceof BookingInputError) {
        res.status(error.status).json({ success: false, error: error.message });
        return;
      }
      res.status(500).json({ success: false, error: error?.message || 'Failed to create booking' });
    }
  }

  /**
   * PUT /api/bookings/:id
   */
  static async update(req: Request, res: Response): Promise<void> {
    try {
      const id = String(req.params.id || req.body?.id || req.body?._id || req.body?.bookingId || req.body?.bookingCode || '');
      const updates = { ...req.body, updatedAt: new Date() };
      delete updates.id;
      delete updates._id;
      if (!isAdminUser(req.user)) {
        // Payment fields are owned by the payment service / administrators
        delete updates.paymentStatus;
        delete updates.paymentId;
        delete updates.amount;
      }

      if (!id) {
        res.status(400).json({ success: false, error: 'Booking ID is required' });
        return;
      }

      // Sync field aliases
      if (updates.service && !updates.serviceTitle) updates.serviceTitle = updates.service;
      if (updates.serviceTitle && !updates.service) updates.service = updates.serviceTitle;
      if (updates.therapistName && !updates.consultantName) updates.consultantName = updates.therapistName;
      if (updates.consultantName && !updates.therapistName) updates.therapistName = updates.consultantName;
      const actorHint = updates.actor;
      delete updates.actor;
      const reject = (error: string, status = 400) => { res.status(status).json({ success: false, error }); };

      // Canonical values only: labels like "Scheduled", "Completed", "NO SHOW - CLIENT" or "Paid" are mapped
      if (updates.status !== undefined) {
        const status = normalizeBookingStatus(updates.status);
        if (!status) return reject(`Unknown booking status "${updates.status}"`);
        updates.status = status;
      }
      if (updates.paymentStatus !== undefined) {
        const paymentStatus = normalizePaymentStatus(updates.paymentStatus);
        if (!paymentStatus) return reject(`Unknown payment status "${updates.paymentStatus}"`);
        updates.paymentStatus = paymentStatus;
      }
      if (updates.amount !== undefined) {
        const amount = Number(updates.amount);
        if (!Number.isFinite(amount) || amount < 0) return reject('Amount must be a number');
        updates.amount = amount;
      }
      if (updates.durationMinutes !== undefined) {
        const minutes = Math.round(Number(updates.durationMinutes));
        if (!(minutes > 0)) return reject('durationMinutes must be a positive number');
        updates.durationMinutes = minutes;
      }

      const db = getDatabase();
      const orConditions: any[] = [{ id }, { _id: id }, { bookingId: id }, { bookingCode: id }];
      if (ObjectId.isValid(id)) {
        orConditions.push({ _id: new ObjectId(id) });
      }
      const query = { $or: orConditions };

      const existing = await db.collection('Booking').findOne(query) || await db.collection('bookings').findOne(query);
      if (!existing) return reject('Booking not found', 404);

      // A reassigned booking stores the real Consultant _id, never a User id or a placeholder
      if (updates.consultantId !== undefined || updates.therapistId !== undefined) {
        const consultant = await resolveConsultant({ id: updates.consultantId || updates.therapistId, email: updates.consultantEmail });
        if (!consultant) return reject('Unknown consultant');
        updates.consultantId = String(consultant._id);
        if (existing.therapistId !== undefined || updates.therapistId !== undefined) updates.therapistId = updates.consultantId;
        updates.consultantName = updates.consultantName || consultant.name;
        updates.consultantEmail = String(consultant.email || '').toLowerCase() || undefined;
        if (!updates.consultantEmail) delete updates.consultantEmail;
      }

      // The session instant is a Date, computed in India time from date + time when only the labels are sent
      let newInstant: Date | undefined;
      try {
        newInstant = resolveScheduledAt(updates, existing);
      } catch (err) {
        if (err instanceof ScheduleError) return reject(err.message);
        throw err;
      }
      const oldInstant = bookingInstant(existing);
      const moved = !!newInstant && (!oldInstant || oldInstant.getTime() !== newInstant.getTime());
      if (newInstant) {
        updates.scheduledAt = newInstant;
        // Keep the India-time labels in step with a new instant
        if (moved && updates.date === undefined && updates.time === undefined) Object.assign(updates, istLabels(newInstant));
      } else {
        delete updates.scheduledAt;
      }

      // Emails go out only for a real change, so repeated or concurrent requests don't resend them
      let isNewCancellation = false;
      if (updates.status === 'CANCELLED') {
        const transition = await db.collection('Booking').updateMany(
          { $and: [query, { status: { $ne: 'CANCELLED' } }] },
          { $set: { status: 'CANCELLED' } }
        );
        isNewCancellation = transition.modifiedCount > 0;
      }
      let isNewConfirmation = false;
      if (updates.status === 'CONFIRMED') {
        const transition = await db.collection('Booking').updateMany(
          { $and: [query, { status: { $nin: ['CONFIRMED', ...Array.from(UNSETTLED_STATUSES)] } }] },
          { $set: { status: 'CONFIRMED' } }
        );
        isNewConfirmation = transition.modifiedCount > 0;
      }
      let isNewCompletion = false;
      if (updates.status === 'COMPLETED') {
        const transition = await db.collection('Booking').updateMany(
          { $and: [query, { status: { $ne: 'COMPLETED' } }] },
          { $set: { status: 'COMPLETED' } }
        );
        isNewCompletion = transition.modifiedCount > 0;
      }
      const changed = (field: string) => updates[field] !== undefined && String(updates[field]) !== String(existing?.[field] ?? '');
      const isReschedule = updates.status !== 'CANCELLED' &&
        (moved || (!newInstant && (changed('date') || changed('time'))) ||
         (updates.status === 'RESCHEDULED' && bookingStatusOf(existing) !== 'RESCHEDULED'));

      await Promise.all([
        db.collection('Booking').updateMany(query, { $set: updates }),
        db.collection('bookings').updateMany(query, { $set: updates })
      ]);

      // Invalidate cache
      cacheService.invalidateTags(['bookings', 'stats', 'users', 'consultants', 'revenue', 'payouts', 'payments']);

      // Automatically dispatch cancellation, reschedule, confirmation or completion emails, push and in-app notifications.
      // Awaited before responding: serverless functions may be frozen once the response is sent.
      const pending: Promise<unknown>[] = [];
      const contact = await bookingContact(existing);
      const actor = actorOf(req, actorHint);
      if (existing && contact) {
        const { clientEmail, clientName, consultantName, serviceTitle, bookingId } = contact;
        const { date: formattedDate, time: formattedTime } = formatSessionWhen(existing);
        const client = { email: clientEmail, id: existing.clientId || existing.userId };
        const base: BookingEmailPayload = {
          clientName,
          clientEmail,
          consultantName,
          serviceTitle,
          scheduledDate: formattedDate,
          scheduledTime: formattedTime,
          durationMinutes: contact.durationMinutes,
          meetingLink: updates.meetingLink || existing.meetingLink,
          bookingId,
          toBeScheduled: contact.toBeScheduled,
          amountPaid: contact.amountPaid,
          cancelledBy: actor
        };

        // 1. Cancellation Email & Notification
        if (isNewCancellation) {
          pending.push(MailService.sendBookingCancellation({ ...base, reason: updates.cancellationReason || updates.reason }).catch(() => {}));

          pending.push(sendPushToClient(client, {
            title: 'Session cancelled ❌',
            body: `Your ${serviceTitle} session with ${consultantName} on ${formattedDate} at ${formattedTime} has been cancelled.`,
            tag: `booking-${bookingId}`
          }));

          // Let the therapist know, unless they cancelled it themselves; admins hear about every cancellation they didn't make
          if (actor !== 'therapist') {
            pending.push(consultantEmailFor(existing).then((therapistEmail) => therapistEmail && MailService.sendTherapistCancellationAlert({ ...base, therapistEmail })).catch(() => {}));
          }
          if (actor !== 'admin') {
            pending.push(MailService.sendAdminCancellationAlert(base).catch(() => {}));
          }

          notifyCancellation({ ...existing, id: bookingId, clientId: client.id },
            { clientEmail, clientName, consultantName, serviceTitle, formattedDate, formattedTime }, actor === 'therapist', pending);
        }

        // 2. Reschedule Email & Notification
        if (isReschedule) {
          // A new scheduledAt without a new slot label makes the old date/time stale
          const { date: newDate, time: newTime } = formatSessionWhen({
            date: updates.date || (updates.scheduledAt ? undefined : existing.date),
            time: updates.time || (updates.scheduledAt ? undefined : existing.time),
            scheduledAt: updates.scheduledAt || existing.scheduledAt
          });
          const moved: BookingEmailPayload = {
            ...base,
            scheduledDate: newDate,
            scheduledTime: newTime,
            durationMinutes: updates.durationMinutes || base.durationMinutes,
            toBeScheduled: false,
            oldDate: contact.toBeScheduled ? undefined : formattedDate,
            oldTime: contact.toBeScheduled ? undefined : formattedTime
          };

          if (contact.toBeScheduled) {
            // A website booking just got its first time slot: that's a confirmation, not a move
            pending.push(MailService.sendBookingConfirmation(moved).catch(() => {}));
            pending.push(consultantEmailFor(existing).then((therapistEmail) => therapistEmail && MailService.sendTherapistNewBookingAlert({ ...moved, therapistEmail })).catch(() => {}));
          } else {
            pending.push(MailService.sendBookingRescheduled(moved).catch(() => {}));
            if (actor !== 'therapist') {
              pending.push(consultantEmailFor(existing).then((therapistEmail) => therapistEmail && MailService.sendTherapistRescheduledAlert({ ...moved, therapistEmail })).catch(() => {}));
            }
          }

          pending.push(sendPushToClient(client, {
            title: contact.toBeScheduled ? 'Session scheduled 📅' : 'Session rescheduled 🕒',
            body: `Your session with ${consultantName} is ${contact.toBeScheduled ? '' : 'now '}on ${newDate} at ${newTime}.`,
            tag: `booking-${bookingId}`
          }));

          pending.push(consultantEmailFor(existing).then((therapistEmail) => createNotifications([
            { recipientRole: 'CLIENT', recipientId: client.id, recipientEmail: clientEmail, type: 'SESSION_RESCHEDULED', bookingId,
              title: 'Therapy Session Rescheduled 🕒', message: `Your consultation with ${consultantName} has been rescheduled to ${newDate} at ${newTime}.` },
            { recipientRole: 'CONSULTANT', recipientId: existing.consultantId, recipientEmail: therapistEmail, type: 'SESSION_RESCHEDULED', bookingId,
              title: 'Session Rescheduled 🕒', message: `${clientName}'s "${serviceTitle}" session is now on ${newDate} at ${newTime}.` }
          ])));
        }

        // 3. Confirmation by an admin or therapist (e.g. a pending booking accepted)
        if (isNewConfirmation && !isReschedule) {
          pending.push(MailService.sendBookingConfirmation(base).catch(() => {}));
        }

        // 4. Completion Email & Notification (invites the client to rate the session)
        if (isNewCompletion) {
          pending.push(MailService.sendSessionCompleted(base).catch(() => {}));

          pending.push(createNotifications([
            { recipientRole: 'CLIENT', recipientId: client.id, recipientEmail: clientEmail, type: 'SESSION_COMPLETED', bookingId,
              title: 'Session Completed ✅', message: `How was your session with ${consultantName}? Share quick feedback. It takes under a minute.` }
          ]));

          pending.push(sendPushToClient(client, {
            title: 'Session completed ✅',
            body: `How was your session with ${consultantName}? Tap to rate it. It takes under a minute.`,
            url: '/client',
            tag: `booking-${bookingId}`
          }));
        }
      }

      await Promise.allSettled(pending);
      res.json({
        success: true,
        message: 'Booking updated successfully in MongoDB Atlas and client notified.'
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error?.message || 'Failed to update booking' });
    }
  }

  /**
   * DELETE /api/bookings/:id
   */
  static async delete(req: Request, res: Response): Promise<void> {
    try {
      const id = String(req.params.id || req.query.id || req.body?.id || req.body?._id || req.body?.bookingId || req.body?.bookingCode || '');

      if (!id) {
        res.status(400).json({ success: false, error: 'Booking ID is required' });
        return;
      }

      const db = getDatabase();
      const orConditions: any[] = [{ id }, { _id: id }, { bookingId: id }, { bookingCode: id }];
      if (ObjectId.isValid(id)) {
        orConditions.push({ _id: new ObjectId(id) });
      }
      const query = { $or: orConditions };

      const existingMain = await db.collection('Booking').findOne(query);
      const existing = existingMain || await db.collection('bookings').findOne(query);
      const [deleted, deletedLegacy] = await Promise.all([
        db.collection('Booking').deleteMany(query),
        db.collection('bookings').deleteMany(query),
        db.collection('Availability').deleteMany(query).catch(() => {})
      ]);

      // Invalidate cache
      cacheService.invalidateTags(['bookings', 'stats', 'users', 'consultants']);

      // Only the request that actually removed the booking emails the client (clients fire parallel DELETEs);
      // an already-cancelled booking got its cancellation email when it was cancelled
      const removedNow = existingMain ? deleted.deletedCount > 0 : deletedLegacy.deletedCount > 0;
      const contact = removedNow && String(existing?.status || '').toUpperCase() !== 'CANCELLED' ? await bookingContact(existing) : null;
      if (existing && contact) {
        const { clientEmail, clientName, consultantName, serviceTitle, bookingId } = contact;
        const { date: formattedDate, time: formattedTime } = formatSessionWhen(existing);
        const actor = actorOf(req, req.body?.actor);
        const emailPayload: BookingEmailPayload = {
          clientName,
          clientEmail,
          consultantName,
          serviceTitle,
          scheduledDate: formattedDate,
          scheduledTime: formattedTime,
          durationMinutes: contact.durationMinutes,
          bookingId,
          toBeScheduled: contact.toBeScheduled,
          amountPaid: contact.amountPaid,
          cancelledBy: actor
        };

        const pending: Promise<unknown>[] = [
          MailService.sendBookingCancellation(emailPayload).catch(() => {}),
          sendPushToClient({ email: clientEmail, id: existing.clientId || existing.userId }, {
            title: 'Session cancelled ❌',
            body: `Your ${serviceTitle} session with ${consultantName} on ${formattedDate} at ${formattedTime} has been cancelled.`,
            tag: `booking-${bookingId}`
          })
        ];
        // Let the therapist know, unless they removed it themselves; admins hear about removals they didn't make
        if (actor !== 'therapist') {
          pending.push(consultantEmailFor(existing)
            .then((therapistEmail) => therapistEmail && MailService.sendTherapistCancellationAlert({ ...emailPayload, therapistEmail }))
            .catch(() => {}));
        }
        if (actor !== 'admin') {
          pending.push(MailService.sendAdminCancellationAlert(emailPayload).catch(() => {}));
        }

        notifyCancellation({ ...existing, id: bookingId, clientId: existing.clientId || existing.userId },
          { clientEmail, clientName, consultantName, serviceTitle, formattedDate, formattedTime }, actor === 'therapist', pending);

        await Promise.allSettled(pending);
      }

      res.json({
        success: true,
        message: 'Booking removed successfully from MongoDB Atlas and client notified.'
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error?.message || 'Failed to delete booking' });
    }
  }
}
