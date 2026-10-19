import { getDatabase } from '../db/mongodb';
import { MailService } from './mail.service';
import { sendPushToClient } from './push.service';
import { createNotifications } from './notification.service';

/** In-app "booking confirmed" notifications for the client, the therapist and the admins */
export async function notifyBookingConfirmed(booking: any, consultantEmail: string, formattedDate: string, formattedTime: string): Promise<void> {
  const service = booking.serviceTitle || 'therapy';
  const therapist = booking.consultantName || 'your therapist';
  await createNotifications([
    { recipientRole: 'CLIENT', recipientId: booking.clientId, recipientEmail: booking.clientEmail, type: 'SESSION_SCHEDULED', bookingId: booking.id,
      title: 'Therapy Session Confirmed 📅', message: `Your "${service}" consultation with ${therapist} is scheduled on ${formattedDate} at ${formattedTime}.` },
    { recipientRole: 'CONSULTANT', recipientId: booking.consultantId, recipientEmail: consultantEmail, type: 'NEW_CLIENT_BOOKING', bookingId: booking.id,
      title: 'New Client Appointment Booked 🩺', message: `${booking.clientName || 'A client'} booked a "${service}" consultation with you on ${formattedDate} at ${formattedTime}.` },
    { recipientRole: 'ADMIN', type: 'NEW_BOOKING_ALERT', bookingId: booking.id,
      title: 'New Session Booking', message: `Client ${booking.clientName || 'Client'} booked a session with ${booking.consultantName || 'a therapist'} on ${formattedDate} at ${formattedTime}.` }
  ]);
}

/**
 * Assigns the client to the consultant, writes in-app notifications for client, therapist and admin,
 * and dispatches the three booking confirmation emails. Used for direct bookings and paid bookings.
 */
export async function dispatchBookingConfirmed(newBooking: any, consultantEmailHint = ''): Promise<void> {
  try {
    const db = getDatabase();
    let consultantEmail = consultantEmailHint || '';
    let consultantName = newBooking.consultantName;

    if (!consultantEmail && newBooking.consultantId) {
      const consDoc = await db.collection('Consultant').findOne({ id: newBooking.consultantId }) ||
                      await db.collection('Consultant').findOne({ _id: newBooking.consultantId }) ||
                      await db.collection('consultants').findOne({ id: newBooking.consultantId });
      if (consDoc) {
        consultantEmail = consDoc.email || 'therapist@hexpertify.com';
        consultantName = consultantName || consDoc.name;
      }
    }

    if (!consultantEmail) {
      consultantEmail = 'therapist@hexpertify.com';
    }

    const formattedDate = newBooking.date || new Date(newBooking.scheduledAt || newBooking.createdAt || Date.now()).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    const formattedTime = newBooking.time || '10:00 AM';

    // Auto-assign user to this consultant if not assigned yet
    try {
      if (newBooking.clientEmail && newBooking.consultantId) {
        const updateAssignment = {
          $set: {
            assignedTherapistId: newBooking.consultantId,
            assignedTherapistName: consultantName,
            assignedTherapistEmail: consultantEmail,
            assignedTherapistPhoto: newBooking.consultantAvatar || '',
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

    // Emails and the client's push notification are awaited: serverless functions may freeze after responding
    const results = await Promise.allSettled([
      newBooking.clientEmail ? MailService.sendBookingConfirmation(emailPayload) : Promise.resolve(),
      MailService.sendTherapistNewBookingAlert(emailPayload),
      MailService.sendAdminNewBookingAlert(emailPayload),
      sendPushToClient({ email: newBooking.clientEmail, id: newBooking.clientId }, {
        title: 'Session confirmed 📅',
        body: `Your ${emailPayload.serviceTitle} session with ${emailPayload.consultantName} is on ${formattedDate} at ${formattedTime}.`,
        tag: `booking-${newBooking.id}`
      })
    ]);
    results.forEach((r) => r.status === 'rejected' && console.error('Error in booking confirmation dispatch:', r.reason));
  } catch (notifErr) {
    console.error('Error dispatching booking notifications and emails:', notifErr);
  }
}
