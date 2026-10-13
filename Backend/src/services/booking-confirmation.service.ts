import { getDatabase } from '../db/mongodb';
import { MailService } from './mail.service';

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
      message: `${newBooking.clientName || 'A client'} booked a "${newBooking.serviceTitle}" consultation with you on ${formattedDate} at ${formattedTime}.`,
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
      title: 'New Session Booking',
      message: `Client ${newBooking.clientName || 'Client'} booked a session with Therapist ${newBooking.consultantName || 'Therapist'} on ${formattedDate} at ${formattedTime}.`,
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
      newBooking.clientEmail ? MailService.sendBookingConfirmation(emailPayload) : Promise.resolve(),
      MailService.sendTherapistNewBookingAlert(emailPayload),
      MailService.sendAdminNewBookingAlert(emailPayload)
    ]).catch((mailErr) => {
      console.error('Error in multi-recipient email dispatch:', mailErr);
    });
  } catch (notifErr) {
    console.error('Error dispatching booking notifications and emails:', notifErr);
  }
}
