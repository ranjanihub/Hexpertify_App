import { Request, Response } from 'express';
import { ObjectId } from 'mongodb';
import { getDatabase } from '../db/mongodb';
import { MailService } from '../services/mail.service';
import { dispatchBookingConfirmed } from '../services/booking-confirmation.service';
import { isAdminUser } from '../middlewares/auth.middleware';

// Bookings awaiting gateway payment (or abandoned) are not real sessions yet
const UNSETTLED_STATUSES = new Set(['PENDING_PAYMENT', 'EXPIRED']);
import { cacheService } from '../services/cache.service';

export class BookingsController {
  /**
   * GET /api/bookings and GET /api/admin/bookings
   */
  static async getAll(req: Request, res: Response): Promise<void> {
    try {
      const { clientEmail, clientId, consultantId, status } = req.query;
      const isConsultantQuery = Boolean(consultantId || req.query.therapistId);
      const cacheKey = `bookings:all:${clientEmail || ''}:${clientId || ''}:${consultantId || ''}:${status || ''}`;

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

          const bookingDate = b.scheduledAt || b.date || b.createdAt;
          const dObj = new Date(bookingDate || Date.now());
          const timeStr = b.time || dObj.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
          const dateStr = dObj.toISOString().split('T')[0];

          let rawConsultantName = b.consultantName || c?.name;
          let consultantName = 'Assigned Therapist';
          let inferredService = b.serviceTitle || s?.title;

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
            status: (b.status || 'CONFIRMED').toUpperCase()
          };
        });

        let filtered = enriched;

        if (clientEmail) {
          const cEmail = String(clientEmail).toLowerCase().trim();
          filtered = filtered.filter((b: any) => (b.clientEmail || '').toLowerCase().trim() === cEmail);
        }
        if (clientId) {
          const cId = String(clientId);
          filtered = filtered.filter((b: any) => String(b.clientId || b.userId) === cId);
        }
        if (consultantId) {
          const consId = String(consultantId).toLowerCase().trim();
          filtered = filtered.filter((b: any) => {
            const bCid = String(b.consultantId || b.therapistId || '').toLowerCase().trim();
            return bCid === consId;
          });
        }
        if (status) {
          const st = String(status).toUpperCase();
          filtered = filtered.filter((b: any) => (b.status || '').toUpperCase() === st);
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
      const db = getDatabase();
      // Only administrators may record a booking as paid; customer payments go through /api/payments
      const canSetPayment = isAdminUser(req.user);

      const newBooking = {
        id: body.id || `BK-${Date.now().toString().slice(-5)}`,
        clientId: body.clientId,
        clientName: body.clientName || 'Client',
        clientEmail: body.clientEmail,
        clientPhone: body.clientPhone || '',
        consultantId: body.consultantId || body.therapistId,
        consultantName: body.consultantName || body.therapistName,
        consultantAvatar: body.consultantAvatar || body.therapistAvatar,
        serviceId: body.serviceId,
        serviceTitle: body.serviceTitle || body.service || 'Individual Clinical Consultation',
        date: body.date,
        time: body.time,
        scheduledAt: body.scheduledAt || (body.date ? new Date(body.date) : new Date()),
        durationMinutes: body.durationMinutes || 50,
        amount: canSetPayment ? (Number(body.amount) || 1500) : (Number(body.amount) || undefined),
        paymentStatus: canSetPayment ? (body.paymentStatus || 'PAID') : 'UNPAID',
        status: (body.status || 'CONFIRMED').toUpperCase(),
        meetingLink: body.meetingLink || body.meetingUrl || 'https://meet.google.com/hex-pert-ify',
        channel: body.channel || 'Video Call (Google Meet)',
        notes: body.notes || '',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // A repeated POST with the same booking ID (double submit, client retry) must not create a second booking or resend emails
      const result = await db.collection('Booking').updateOne(
        { id: newBooking.id },
        { $setOnInsert: newBooking },
        { upsert: true }
      );
      if (!result.upsertedId) {
        const existing = await db.collection('Booking').findOne({ id: newBooking.id });
        res.status(200).json({ success: true, booking: existing, duplicate: true, message: 'Booking already exists.' });
        return;
      }
      await db.collection('bookings').insertOne({ ...newBooking, _id: result.upsertedId }).catch(() => {});

      // Invalidate cache tags
      cacheService.invalidateTags(['bookings', 'stats', 'users', 'consultants']);

      // Send notifications and emails
      await dispatchBookingConfirmed(newBooking, body.consultantEmail);

      res.status(201).json({
        success: true,
        booking: { ...newBooking, _id: result.upsertedId },
        message: 'Booking confirmed. Client, Therapist, and Super Admin notifications and emails dispatched successfully.'
      });
    } catch (error: any) {
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
      if (updates.amount) updates.amount = Number(updates.amount);
      if (updates.status) updates.status = String(updates.status).toUpperCase();

      const db = getDatabase();
      const orConditions: any[] = [{ id }, { _id: id }, { bookingId: id }, { bookingCode: id }];
      if (ObjectId.isValid(id)) {
        orConditions.push({ _id: new ObjectId(id) });
      }
      const query = { $or: orConditions };

      const existing = await db.collection('Booking').findOne(query) || await db.collection('bookings').findOne(query);

      // Emails go out only for a real change, so repeated or concurrent requests don't resend them
      let isNewCancellation = false;
      if (updates.status === 'CANCELLED') {
        const transition = await db.collection('Booking').updateMany(
          { $and: [query, { status: { $ne: 'CANCELLED' } }] },
          { $set: { status: 'CANCELLED' } }
        );
        isNewCancellation = transition.modifiedCount > 0;
      }
      const changed = (field: string) => updates[field] !== undefined && String(updates[field]) !== String(existing?.[field] ?? '');
      const isReschedule = updates.status !== 'CANCELLED' &&
        (changed('date') || changed('time') || (updates.scheduledAt !== undefined && new Date(updates.scheduledAt).getTime() !== new Date(existing?.scheduledAt).getTime()) ||
         (updates.status === 'RESCHEDULED' && existing?.status !== 'RESCHEDULED'));

      await Promise.all([
        db.collection('Booking').updateMany(query, { $set: updates }),
        db.collection('bookings').updateMany(query, { $set: updates })
      ]);

      // Invalidate cache
      cacheService.invalidateTags(['bookings', 'stats', 'users', 'consultants']);

      // Automatically dispatch cancellation or reschedule email and in-app notifications
      if (existing && existing.clientEmail && existing.clientName !== 'Open Consultation Slot' && existing.clientName !== 'Blocked Time Slot') {
        const clientEmail = existing.clientEmail;
        const clientName = existing.clientName || 'Client';
        const consultantName = existing.consultantName || 'Therapist';
        const serviceTitle = existing.serviceTitle || 'Individual Clinical Consultation';

        // 1. Cancellation Email & Notification
        if (isNewCancellation) {
          const formattedDate = existing.date || new Date(existing.scheduledAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
          const formattedTime = existing.time || '10:00 AM';

          MailService.sendBookingCancellation({
            clientName,
            clientEmail,
            consultantName,
            serviceTitle,
            scheduledDate: formattedDate,
            scheduledTime: formattedTime,
            durationMinutes: existing.durationMinutes || 50,
            bookingId: existing.id
          }).catch(() => {});

          db.collection('Notification').insertOne({
            id: `NOTIF-${Date.now().toString().slice(-6)}-CL`,
            recipientId: existing.clientId || '',
            recipientEmail: clientEmail.toLowerCase(),
            recipientRole: 'CLIENT',
            type: 'SESSION_CANCELLED',
            title: 'Therapy Session Cancelled ❌',
            message: `Your consultation on ${formattedDate} at ${formattedTime} with ${consultantName} has been cancelled.`,
            bookingId: existing.id,
            read: false,
            createdAt: new Date(),
            updatedAt: new Date()
          }).catch(() => {});
        }

        // 2. Reschedule Email & Notification
        if (isReschedule) {
          const newDate = updates.date || (updates.scheduledAt ? new Date(updates.scheduledAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : existing.date);
          const newTime = updates.time || existing.time || '10:00 AM';

          MailService.sendBookingRescheduled({
            clientName,
            clientEmail,
            consultantName,
            serviceTitle,
            scheduledDate: newDate,
            scheduledTime: newTime,
            durationMinutes: updates.durationMinutes || existing.durationMinutes || 50,
            meetingLink: updates.meetingLink || existing.meetingLink,
            bookingId: existing.id
          }).catch(() => {});

          db.collection('Notification').insertOne({
            id: `NOTIF-${Date.now().toString().slice(-6)}-CL`,
            recipientId: existing.clientId || '',
            recipientEmail: clientEmail.toLowerCase(),
            recipientRole: 'CLIENT',
            type: 'SESSION_RESCHEDULED',
            title: 'Therapy Session Rescheduled 🕒',
            message: `Your consultation with ${consultantName} has been rescheduled to ${newDate} at ${newTime}.`,
            bookingId: existing.id,
            read: false,
            createdAt: new Date(),
            updatedAt: new Date()
          }).catch(() => {});
        }
      }

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
      if (removedNow && existing && existing.clientEmail && String(existing.status || '').toUpperCase() !== 'CANCELLED' &&
          existing.clientName !== 'Open Consultation Slot' && existing.clientName !== 'Blocked Time Slot') {
        const clientEmail = existing.clientEmail;
        const clientName = existing.clientName || 'Client';
        const consultantName = existing.consultantName || 'Therapist';
        const serviceTitle = existing.serviceTitle || 'Individual Clinical Consultation';
        const formattedDate = existing.date || new Date(existing.scheduledAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        const formattedTime = existing.time || '10:00 AM';

        MailService.sendBookingCancellation({
          clientName,
          clientEmail,
          consultantName,
          serviceTitle,
          scheduledDate: formattedDate,
          scheduledTime: formattedTime,
          durationMinutes: existing.durationMinutes || 50,
          bookingId: existing.id
        }).catch(() => {});

        db.collection('Notification').insertOne({
          id: `NOTIF-${Date.now().toString().slice(-6)}-CL`,
          recipientId: existing.clientId || '',
          recipientEmail: clientEmail.toLowerCase(),
          recipientRole: 'CLIENT',
          type: 'SESSION_CANCELLED',
          title: 'Therapy Session Cancelled ❌',
          message: `Your consultation session on ${formattedDate} at ${formattedTime} with ${consultantName} has been cancelled.`,
          bookingId: existing.id,
          read: false,
          createdAt: new Date(),
          updatedAt: new Date()
        }).catch(() => {});
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
