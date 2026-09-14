import { Request, Response } from 'express';
import { ObjectId } from 'mongodb';
import { getDatabase } from '../db/mongodb';
import { MailService } from '../services/mail.service';

export class BookingsController {
  /**
   * GET /api/bookings and GET /api/admin/bookings
   */
  static async getAll(req: Request, res: Response): Promise<void> {
    try {
      const db = getDatabase();
      const [primaryBookings, users, consultants, services] = await Promise.all([
        db.collection('Booking').find({}).toArray(),
        db.collection('User').find({}).toArray(),
        db.collection('Consultant').find({}).toArray(),
        db.collection('Service').find({}).toArray()
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

        return {
          ...b,
          id: b.id || String(b._id),
          clientName: b.clientName || u?.name || u?.email?.split('@')[0] || 'Client',
          clientEmail: b.clientEmail || u?.email || '',
          clientPhone: b.clientPhone || u?.phoneNumber || u?.phone || '',
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
      const { clientEmail, clientId, consultantId, status } = req.query;

      if (clientEmail) {
        const cEmail = String(clientEmail).toLowerCase().trim();
        filtered = filtered.filter((b: any) => (b.clientEmail || '').toLowerCase().trim() === cEmail);
      }
      if (clientId) {
        const cId = String(clientId);
        filtered = filtered.filter((b: any) => String(b.clientId || b.userId) === cId);
      }
      if (consultantId) {
        const consId = String(consultantId);
        filtered = filtered.filter((b: any) => String(b.consultantId || b.therapistId) === consId);
      }
      if (status) {
        const st = String(status).toUpperCase();
        filtered = filtered.filter((b: any) => (b.status || '').toUpperCase() === st);
      }

      res.json({
        success: true,
        count: filtered.length,
        bookings: filtered
      });
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

      const newBooking = {
        id: body.id || `BK-${Date.now().toString().slice(-5)}`,
        clientId: body.clientId,
        clientName: body.clientName || 'Client',
        clientEmail: body.clientEmail,
        consultantId: body.consultantId || body.therapistId,
        consultantName: body.consultantName || body.therapistName,
        serviceTitle: body.serviceTitle || 'Individual Clinical Consultation',
        scheduledAt: body.scheduledAt || body.date || new Date().toISOString(),
        durationMinutes: body.durationMinutes || 50,
        status: body.status || 'CONFIRMED',
        paymentStatus: body.paymentStatus || 'PAID',
        amount: body.amount || 1500,
        meetingLink: body.meetingLink || 'https://meet.google.com/hex-pert-ify',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const result = await db.collection('Booking').insertOne(newBooking);
      await db.collection('bookings').insertOne(newBooking).catch(() => {});

      // Automatically dispatch notifications to Client and Super Admin
      try {
        const scheduledDateObj = new Date(newBooking.scheduledAt);
        const formattedDate = !isNaN(scheduledDateObj.getTime())
          ? scheduledDateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
          : (body.date || 'upcoming session');
        const formattedTime = body.time || (!isNaN(scheduledDateObj.getTime())
          ? scheduledDateObj.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
          : '10:00 AM');

        // Look up consultant details in database
        let consultantEmail = '';
        let consultantPhoto = '';
        try {
          const consultantDoc = await db.collection<any>('Consultant').findOne({
            $or: [
              { id: newBooking.consultantId },
              { name: new RegExp(newBooking.consultantName, 'i') }
            ]
          }) || await db.collection<any>('consultants').findOne({
            $or: [
              { id: newBooking.consultantId },
              { name: new RegExp(newBooking.consultantName, 'i') }
            ]
          });
          if (consultantDoc?.email) consultantEmail = consultantDoc.email;
          if (consultantDoc?.photoUrl || consultantDoc?.photo || consultantDoc?.avatarUrl) {
            consultantPhoto = consultantDoc.photoUrl || consultantDoc.photo || consultantDoc.avatarUrl;
          }
        } catch {}

        // Bind client to this booked consultant for messaging lock
        try {
          const cEmailClean = (newBooking.clientEmail || '').toLowerCase().trim();
          if (cEmailClean) {
            const userUpdateDoc = {
              $set: {
                assignedTherapistId: newBooking.consultantId,
                assignedTherapistName: newBooking.consultantName,
                assignedTherapistEmail: consultantEmail,
                assignedTherapistPhoto: consultantPhoto,
                updatedAt: new Date()
              },
              $setOnInsert: {
                id: newBooking.clientId || `USR-${Date.now().toString().slice(-4)}`,
                name: newBooking.clientName || 'Client User',
                email: cEmailClean,
                role: 'USER',
                status: 'Active',
                firstConsultationCompleted: true,
                createdAt: new Date()
              }
            };
            await Promise.all([
              db.collection<any>('User').updateOne(
                { email: cEmailClean },
                userUpdateDoc,
                { upsert: true }
              ),
              db.collection<any>('users').updateOne(
                { email: cEmailClean },
                userUpdateDoc,
                { upsert: true }
              )
            ]);
          }
        } catch {}

        // 1. Notification for Client
        const clientNotif = {
          id: `NOTIF-${Date.now().toString().slice(-6)}-CL`,
          recipientId: newBooking.clientId || '',
          recipientEmail: (newBooking.clientEmail || '').toLowerCase(),
          recipientRole: 'CLIENT',
          type: 'SESSION_SCHEDULED',
          title: 'Therapy Session Confirmed 📅',
          message: `Your "${newBooking.serviceTitle}" consultation with ${newBooking.consultantName || 'Your Therapist'} is scheduled on ${formattedDate} at ${formattedTime}.`,
          bookingId: newBooking.id,
          read: false,
          createdAt: new Date(),
          updatedAt: new Date()
        };

        // 2. Notification for Therapist / Consultant
        const therapistNotif = {
          id: `NOTIF-${Date.now().toString().slice(-6)}-TH`,
          recipientId: newBooking.consultantId || '',
          recipientEmail: consultantEmail.toLowerCase(),
          recipientRole: 'CONSULTANT',
          type: 'NEW_CLIENT_BOOKING',
          title: 'New Client Appointment Booked 🩺',
          message: `${newBooking.clientName || 'A client'} (${newBooking.clientEmail || ''}) booked a "${newBooking.serviceTitle}" consultation with you on ${formattedDate} at ${formattedTime}.`,
          bookingId: newBooking.id,
          read: false,
          createdAt: new Date(),
          updatedAt: new Date()
        };

        // 3. Notification for Super Admin
        const adminNotif = {
          id: `NOTIF-${Date.now().toString().slice(-6)}-AD`,
          recipientRole: 'ADMIN',
          type: 'NEW_BOOKING_ALERT',
          title: 'New Session Booking ',
          message: `Client ${newBooking.clientName || 'Client'} (${newBooking.clientEmail || ''}) booked a session with Therapist ${newBooking.consultantName || 'Therapist'} on ${formattedDate} at ${formattedTime}.`,
          bookingId: newBooking.id,
          read: false,
          createdAt: new Date(),
          updatedAt: new Date()
        };

        await Promise.all([
          db.collection('Notification').insertMany([clientNotif, therapistNotif, adminNotif]).catch(() => {}),
          db.collection('notifications').insertMany([clientNotif, therapistNotif, adminNotif]).catch(() => {})
        ]);

        const emailPayload: any = {
          clientName: newBooking.clientName || 'Valued Client',
          clientEmail: newBooking.clientEmail,
          consultantName: newBooking.consultantName || 'Therapist',
          consultantEmail,
          therapistEmail: consultantEmail,
          serviceTitle: newBooking.serviceTitle || 'Individual Clinical Consultation',
          scheduledDate: formattedDate,
          scheduledTime: formattedTime,
          durationMinutes: newBooking.durationMinutes || 50,
          meetingLink: newBooking.meetingLink || 'https://meet.google.com/hex-pert-ify',
          bookingId: newBooking.id
        };

        // Dispatch all 3 emails asynchronously
        Promise.all([
          // A) Email to Client
          newBooking.clientEmail ? MailService.sendBookingConfirmation(emailPayload) : Promise.resolve(),
          // B) Email to Therapist
          MailService.sendTherapistNewBookingAlert(emailPayload),
          // C) Email to Super Admin
          MailService.sendAdminNewBookingAlert(emailPayload)
        ]).catch((mailErr) => {
          console.error('Error in multi-recipient email dispatch:', mailErr);
        });
      } catch (notifErr) {
        console.error('Error dispatching booking notifications and emails:', notifErr);
      }

      res.status(201).json({
        success: true,
        booking: { ...newBooking, _id: result.insertedId },
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
      const id = String(req.params.id || req.body?.id || req.body?._id || '');
      const updates = { ...req.body, updatedAt: new Date() };
      delete updates.id;
      delete updates._id;

      if (!id) {
        res.status(400).json({ success: false, error: 'Booking ID is required' });
        return;
      }

      const db = getDatabase();
      let query: any = { id };
      if (ObjectId.isValid(id)) {
        query = { $or: [{ _id: new ObjectId(id) }, { id }] };
      }

      const existing = await db.collection('Booking').findOne(query);
      await db.collection('Booking').updateOne(query, { $set: updates });
      await db.collection('bookings').updateOne(query, { $set: updates });

      // Automatically dispatch cancellation or reschedule email and in-app notifications
      if (existing && existing.clientEmail && existing.clientName !== 'Open Consultation Slot' && existing.clientName !== 'Blocked Time Slot') {
        const clientEmail = existing.clientEmail;
        const clientName = existing.clientName || 'Client';
        const consultantName = existing.consultantName || 'Therapist';
        const serviceTitle = existing.serviceTitle || 'Individual Clinical Consultation';

        // 1. Cancellation Email & Notification
        if (updates.status === 'CANCELLED' || updates.status === 'cancelled') {
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
        if (updates.scheduledAt || updates.date || updates.time || updates.status === 'RESCHEDULED') {
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
      const id = String(req.params.id || req.query.id || req.body?.id || '');

      if (!id) {
        res.status(400).json({ success: false, error: 'Booking ID is required' });
        return;
      }

      const db = getDatabase();
      let query: any = { id };
      if (ObjectId.isValid(id)) {
        query = { $or: [{ _id: new ObjectId(id) }, { id }] };
      }

      const existing = await db.collection('Booking').findOne(query);
      await Promise.all([
        db.collection('Booking').deleteOne(query),
        db.collection('bookings').deleteOne(query),
        db.collection('Availability').deleteOne(query).catch(() => {})
      ]);

      // If a scheduled client booking was deleted/cancelled, send cancellation email
      if (existing && existing.clientEmail && existing.clientName !== 'Open Consultation Slot' && existing.clientName !== 'Blocked Time Slot') {
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
