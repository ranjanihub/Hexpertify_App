import { getDatabase } from '../db/mongodb';
import { BookingEmailPayload, MailService } from './mail.service';
import { sendPushToClient } from './push.service';
import { createNotifications } from './notification.service';

/** Sessions are booked in India time; servers run in UTC */
const SESSION_TIME_ZONE = 'Asia/Kolkata';

/**
 * The session's date ("Oct 13, 2026") and time ("09:30 AM - 10:30 AM") for notifications and emails.
 * Uses the booked slot when present, otherwise the scheduled instant in India time.
 */
export function formatSessionWhen(booking: any): { date: string; time: string } {
  const when = booking?.scheduledAt ? new Date(booking.scheduledAt) : null;
  const valid = !!when && !isNaN(when.getTime());

  let date = String(booking?.date || '').trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    // A calendar day, not an instant: format it without shifting time zones
    date = new Date(`${date}T12:00:00Z`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
  } else if (!date) {
    date = valid
      ? when!.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: SESSION_TIME_ZONE })
      : 'the scheduled date';
  }

  const time = String(booking?.time || '').trim() ||
    (valid ? when!.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: SESSION_TIME_ZONE }) : 'the scheduled time');

  return { date, time };
}

/** In-app "booking confirmed" notifications for the client, the therapist and the admins */
export async function notifyBookingConfirmed(booking: any, consultantEmail: string, formattedDate: string, formattedTime: string): Promise<void> {
  const service = booking.serviceTitle || 'therapy';
  const therapist = booking.consultantName || 'your therapist';
  // Website bookings are paid before a time is fixed
  const when = booking.toBeScheduled ? '. Our team will share time slots shortly' : ` on ${formattedDate} at ${formattedTime}`;
  await createNotifications([
    { recipientRole: 'CLIENT', recipientId: booking.clientId, recipientEmail: booking.clientEmail, type: 'SESSION_SCHEDULED', bookingId: booking.id,
      title: 'Therapy Session Confirmed', message: `Your "${service}" consultation with ${therapist} is ${booking.toBeScheduled ? 'booked' : 'scheduled'}${when}.` },
    { recipientRole: 'CONSULTANT', recipientId: booking.consultantId, recipientEmail: consultantEmail, type: 'NEW_CLIENT_BOOKING', bookingId: booking.id,
      title: 'New Client Appointment Booked', message: `${booking.clientName || 'A client'} booked a "${service}" consultation with you${when}.` },
    { recipientRole: 'ADMIN', type: 'NEW_BOOKING_ALERT', bookingId: booking.id,
      title: 'New Session Booking', message: `Client ${booking.clientName || 'Client'} booked a session with ${booking.consultantName || 'a therapist'}${when}.` }
  ]);
}

/**
 * Assigns the client to the consultant, writes in-app notifications for client, therapist and admin,
 * and dispatches the three booking confirmation emails. Used for direct bookings and paid bookings,
 * including website bookings (`toBeScheduled`: paid first, the team fixes the time afterwards).
 */
export async function dispatchBookingConfirmed(newBooking: any, consultantEmailHint = ''): Promise<void> {
  try {
    const db = getDatabase();
    let consultantEmail = consultantEmailHint || '';
    let consultantName = newBooking.consultantName;

    const consDoc: any = newBooking.consultantId
      ? await db.collection('Consultant').findOne({ id: newBooking.consultantId }) ||
        await db.collection('Consultant').findOne({ _id: newBooking.consultantId }) ||
        await db.collection('consultants').findOne({ id: newBooking.consultantId })
      : null;
    if (consDoc) {
      consultantEmail = consultantEmail || consDoc.email || '';
      consultantName = consultantName || consDoc.name;
    }
    const profession: any = consDoc?.professionId
      ? await db.collection('Profession').findOne({ $or: [{ _id: consDoc.professionId }, { id: consDoc.professionId }] }).catch(() => null)
      : null;

    const toBeScheduled = !!newBooking.toBeScheduled;
    const { date: formattedDate, time: formattedTime } = formatSessionWhen(newBooking);

    // Auto-assign user to this consultant if not assigned yet
    try {
      if (newBooking.clientEmail && newBooking.consultantId) {
        const updateAssignment = {
          $set: {
            assignedTherapistId: newBooking.consultantId,
            assignedTherapistName: consultantName,
            assignedTherapistEmail: consultantEmail,
            assignedTherapistPhoto: newBooking.consultantAvatar || consDoc?.photoUrl || '',
            updatedAt: new Date()
          }
        };
        await Promise.all([
          db.collection('User').updateOne({ email: newBooking.clientEmail.toLowerCase() }, updateAssignment).catch(() => {}),
          db.collection('users').updateOne({ email: newBooking.clientEmail.toLowerCase() }, updateAssignment).catch(() => {})
        ]);
      }
    } catch {}

    // In-app notifications for the client, the therapist and the admins
    await notifyBookingConfirmed({ ...newBooking, consultantName }, consultantEmail, formattedDate, formattedTime);

    const emailPayload: BookingEmailPayload = {
      clientName: newBooking.clientName || 'Valued Client',
      clientEmail: newBooking.clientEmail,
      clientPhone: newBooking.clientPhone,
      consultantName: consultantName || 'Therapist',
      consultantEmail,
      therapistEmail: consultantEmail,
      serviceTitle: newBooking.serviceTitle || 'Individual Clinical Consultation',
      scheduledDate: formattedDate,
      scheduledTime: formattedTime,
      durationMinutes: newBooking.durationMinutes || 50,
      meetingLink: newBooking.meetingLink,
      bookingId: newBooking.id,
      toBeScheduled,
      amountPaid: newBooking.amountPaid,
      consultantPhoto: newBooking.consultantAvatar || consDoc?.photoUrl || consDoc?.avatarUrl,
      consultantProfession: profession?.name || consDoc?.specialization,
      consultantExperience: Number(consDoc?.experience) || undefined
    };

    // Emails and the client's push notification are awaited: serverless functions may freeze after responding
    const results = await Promise.allSettled([
      newBooking.clientEmail ? MailService.sendBookingConfirmation(emailPayload) : Promise.resolve(),
      consultantEmail ? MailService.sendTherapistNewBookingAlert(emailPayload) : Promise.resolve(),
      MailService.sendAdminNewBookingAlert(emailPayload),
      sendPushToClient({ email: newBooking.clientEmail, id: newBooking.clientId }, {
        title: 'Session confirmed 📅',
        body: toBeScheduled
          ? `Your ${emailPayload.serviceTitle} consultation with ${emailPayload.consultantName} is booked. We'll share time slots shortly.`
          : `Your ${emailPayload.serviceTitle} session with ${emailPayload.consultantName} is on ${formattedDate} at ${formattedTime}.`,
        tag: `booking-${newBooking.id}`
      })
    ]);
    results.forEach((r) => r.status === 'rejected' && console.error('Error in booking confirmation dispatch:', r.reason));
  } catch (notifErr) {
    console.error('Error dispatching booking notifications and emails:', notifErr);
  }
}

const PAID_STATUSES = ['PAID', 'PARTIALLY_REFUNDED', 'REFUND_PENDING', 'REFUNDED'];

/**
 * Who and what a booking is about, for its emails. Website (Prisma) bookings store only ids, so the
 * client, expert and plan are looked up. Returns null for calendar placeholders and bookings without a client email.
 */
export async function bookingContact(b: any) {
  if (!b || b.clientName === 'Open Consultation Slot' || b.clientName === 'Blocked Time Slot') return null;
  const db = getDatabase();
  const [user, consultant, service]: any[] = await Promise.all([
    !b.clientEmail && b.userId ? db.collection('User').findOne({ _id: b.userId }).catch(() => null) : null,
    !b.consultantName && b.consultantId ? db.collection('Consultant').findOne({ _id: b.consultantId }).catch(() => null) : null,
    !b.serviceTitle && b.serviceId ? db.collection('Service').findOne({ _id: b.serviceId }).catch(() => null) : null
  ]);
  const clientEmail = String(b.clientEmail || user?.email || '').toLowerCase();
  if (!clientEmail) return null;
  return {
    clientEmail,
    clientName: b.clientName || user?.name || 'Client',
    consultantName: b.consultantName || consultant?.name || 'Therapist',
    serviceTitle: b.serviceTitle || service?.name || service?.title || 'Individual Clinical Consultation',
    bookingId: String(b.id || b._id),
    durationMinutes: b.durationMinutes || service?.duration || 50,
    // Website bookings are paid before a time is fixed
    toBeScheduled: !b.date && !b.time && !b.scheduledAt,
    amountPaid: PAID_STATUSES.includes(String(b.paymentStatus || '').toUpperCase()) && Number(b.amount) > 0 ? Number(b.amount) : undefined
  };
}

