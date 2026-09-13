import nodemailer from 'nodemailer';
import { getDatabase } from '../db/mongodb';

export interface BookingEmailPayload {
  clientName: string;
  clientEmail: string;
  clientPhone?: string;
  consultantName: string;
  consultantEmail?: string;
  serviceTitle: string;
  scheduledDate: string;
  scheduledTime: string;
  durationMinutes: number | string;
  meetingLink?: string;
  bookingId?: string;
  oldDate?: string;
  oldTime?: string;
  reason?: string;
  adminEmail?: string;
  therapistEmail?: string;
}

export class MailService {
  private static transporter: nodemailer.Transporter | null = null;

  private static getTransporter(): nodemailer.Transporter {
    if (!this.transporter) {
      const host = process.env.SMTP_HOST || 'smtp.gmail.com';
      const port = parseInt(process.env.SMTP_PORT || '465');
      const user = process.env.SMTP_USER || process.env.AUTH_EMAIL || 'support@hexpertify.com';
      const pass = process.env.SMTP_PASS || process.env.AUTH_EMAIL_PASSWORD || '';

      this.transporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: user && pass ? { user, pass } : undefined,
        tls: { rejectUnauthorized: false }
      });
    }
    return this.transporter;
  }

  /**
   * 1. Send Booking Confirmation Email to Client
   */
  static async sendBookingConfirmation(payload: BookingEmailPayload): Promise<{ success: boolean; error?: string; messageId?: string }> {
    try {
      if (!payload.clientEmail) {
        return { success: false, error: 'No client email provided' };
      }

      const transporter = this.getTransporter();
      const fromAddress = process.env.MAIL_FROM || process.env.AUTH_EMAIL || '"Hexpertify Health" <support@hexpertify.com>';
      const meetingUrl = payload.meetingLink || 'https://meet.google.com/hex-pert-ify';

      const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 20px auto; background-color: #ffffff; border-radius: 20px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
    .header { background: linear-gradient(135deg, #5e2be2 0%, #7c3aed 100%); padding: 32px 24px; text-align: center; color: #ffffff; }
    .header h1 { margin: 0 0 8px; font-size: 24px; font-weight: 800; }
    .content { padding: 32px 24px; color: #1e293b; }
    .details-box { background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 16px; padding: 20px; margin-bottom: 24px; }
    .detail-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f1f5f9; font-size: 14px; }
    .detail-row:last-child { border-bottom: none; }
    .detail-label { color: #64748b; font-weight: 600; }
    .detail-value { color: #0f172a; font-weight: 700; text-align: right; }
    .cta-button { display: inline-block; background-color: #5e2be2; color: #ffffff !important; font-size: 15px; font-weight: 700; padding: 14px 32px; border-radius: 12px; text-decoration: none; box-shadow: 0 4px 14px rgba(94, 43, 226, 0.35); }
    .footer { background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 20px 24px; text-align: center; font-size: 12px; color: #94a3b8; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Hexpertify Therapy</h1>
      <p style="margin:0; font-size: 14px; opacity: 0.9;">Your session has been successfully confirmed</p>
    </div>
    <div class="content">
      <div style="font-size: 16px; font-weight: 700; margin-bottom: 12px; color: #0f172a;">Hi ${payload.clientName},</div>
      <p style="font-size: 14px; line-height: 1.6; color: #475569; margin-bottom: 20px;">
        Great news! Your consultation session with <strong>${payload.consultantName}</strong> is confirmed. Here are your appointment details:
      </p>

      <div class="details-box">
        <div class="detail-row">
          <span class="detail-label">Therapist:</span>
          <span class="detail-value">${payload.consultantName}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Modality:</span>
          <span class="detail-value">${payload.serviceTitle}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Date:</span>
          <span class="detail-value">${payload.scheduledDate}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Time:</span>
          <span class="detail-value">${payload.scheduledTime}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Duration:</span>
          <span class="detail-value">${payload.durationMinutes} Minutes</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Booking Reference:</span>
          <span class="detail-value">${payload.bookingId || 'CONFIRMED'}</span>
        </div>
      </div>

      <div style="text-align: center; margin: 28px 0;">
        <a href="${meetingUrl}" class="cta-button" target="_blank">Join Video Session</a>
      </div>
    </div>
    <div class="footer">
      <p>© 2026 Hexpertify Healthcare. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
      `;

      let messageId = `msg-${Date.now()}`;
      if (process.env.AUTH_EMAIL_PASSWORD && process.env.AUTH_EMAIL_PASSWORD !== 'localpassword') {
        const info = await transporter.sendMail({
          from: fromAddress,
          to: payload.clientEmail,
          subject: `Session Confirmed: ${payload.serviceTitle} with ${payload.consultantName} 📅`,
          html: emailHtml,
          text: `Hi ${payload.clientName}, your session "${payload.serviceTitle}" with ${payload.consultantName} is confirmed for ${payload.scheduledDate} at ${payload.scheduledTime}.`
        });
        messageId = info.messageId;
      }

      await this.logEmail(payload.clientEmail, payload.clientName, `Session Confirmed: ${payload.serviceTitle}`, payload.bookingId, messageId);
      return { success: true, messageId };
    } catch (error: any) {
      console.error('❌ [MailService] sendBookingConfirmation failed:', error);
      return { success: false, error: error?.message || 'Mail dispatch failed' };
    }
  }

  /**
   * 2. Send New Booking Alert Email to Therapist
   */
  static async sendTherapistNewBookingAlert(payload: BookingEmailPayload): Promise<{ success: boolean; error?: string; messageId?: string }> {
    try {
      const recipient = payload.therapistEmail || payload.consultantEmail || process.env.THERAPIST_ALERT_EMAIL || 'sadaf.bhimani@hexpertify.com';
      const transporter = this.getTransporter();
      const fromAddress = process.env.MAIL_FROM || process.env.AUTH_EMAIL || '"Hexpertify Portal" <support@hexpertify.com>';
      const dashboardUrl = 'http://localhost:5000/consultant/calendar';

      const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 20px auto; background-color: #ffffff; border-radius: 20px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
    .header { background: linear-gradient(135deg, #059669 0%, #10b981 100%); padding: 32px 24px; text-align: center; color: #ffffff; }
    .header h1 { margin: 0 0 8px; font-size: 24px; font-weight: 800; }
    .content { padding: 32px 24px; color: #1e293b; }
    .details-box { background-color: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 16px; padding: 20px; margin-bottom: 24px; }
    .detail-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #d1fae5; font-size: 14px; }
    .detail-row:last-child { border-bottom: none; }
    .detail-label { color: #065f46; font-weight: 600; }
    .detail-value { color: #064e3b; font-weight: 700; text-align: right; }
    .cta-button { display: inline-block; background-color: #059669; color: #ffffff !important; font-size: 15px; font-weight: 700; padding: 14px 32px; border-radius: 12px; text-decoration: none; box-shadow: 0 4px 14px rgba(5, 150, 105, 0.35); }
    .footer { background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 20px 24px; text-align: center; font-size: 12px; color: #94a3b8; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>New Appointment Booked 🩺</h1>
      <p style="margin:0; font-size: 14px; opacity: 0.95;">A client has scheduled a consultation with you</p>
    </div>
    <div class="content">
      <div style="font-size: 16px; font-weight: 700; margin-bottom: 12px; color: #0f172a;">Hello ${payload.consultantName},</div>
      <p style="font-size: 14px; line-height: 1.6; color: #475569; margin-bottom: 20px;">
        You have a new therapy session booking from <strong>${payload.clientName}</strong>. Here are the session details:
      </p>

      <div class="details-box">
        <div class="detail-row">
          <span class="detail-label">Client Name:</span>
          <span class="detail-value">${payload.clientName}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Client Email:</span>
          <span class="detail-value">${payload.clientEmail}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Modality:</span>
          <span class="detail-value">${payload.serviceTitle}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Appointment Date:</span>
          <span class="detail-value">${payload.scheduledDate}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Appointment Time:</span>
          <span class="detail-value">${payload.scheduledTime}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Duration:</span>
          <span class="detail-value">${payload.durationMinutes} Minutes</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Booking Reference:</span>
          <span class="detail-value">${payload.bookingId || 'CONFIRMED'}</span>
        </div>
      </div>

      <div style="text-align: center; margin: 28px 0;">
        <a href="${dashboardUrl}" class="cta-button" target="_blank">View in Therapist Calendar</a>
      </div>
    </div>
    <div class="footer">
      <p>© 2026 Hexpertify Healthcare Ecosystem. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
      `;

      let messageId = `msg-th-${Date.now()}`;
      if (process.env.AUTH_EMAIL_PASSWORD && process.env.AUTH_EMAIL_PASSWORD !== 'localpassword') {
        const info = await transporter.sendMail({
          from: fromAddress,
          to: recipient,
          subject: `New Session Booked: ${payload.clientName} on ${payload.scheduledDate} at ${payload.scheduledTime} 🩺`,
          html: emailHtml,
          text: `Hello ${payload.consultantName}, ${payload.clientName} (${payload.clientEmail}) has booked a "${payload.serviceTitle}" consultation on ${payload.scheduledDate} at ${payload.scheduledTime}.`
        });
        messageId = info.messageId;
      }

      await this.logEmail(recipient, payload.consultantName, `Therapist Alert: New Booking by ${payload.clientName}`, payload.bookingId, messageId);
      return { success: true, messageId };
    } catch (error: any) {
      console.error('❌ [MailService] sendTherapistNewBookingAlert failed:', error);
      return { success: false, error: error?.message || 'Mail dispatch failed' };
    }
  }

  /**
   * 3. Send New Booking Alert Email to Super Admin
   */
  static async sendAdminNewBookingAlert(payload: BookingEmailPayload): Promise<{ success: boolean; error?: string; messageId?: string }> {
    try {
      const adminRecipient = payload.adminEmail || process.env.ADMIN_ALERT_EMAIL || process.env.SMTP_USER || 'admin@hexpertify.com';
      const transporter = this.getTransporter();
      const fromAddress = process.env.MAIL_FROM || process.env.AUTH_EMAIL || '"Hexpertify Central" <support@hexpertify.com>';
      const adminUrl = 'http://localhost:5000/admin/bookings';

      const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 20px auto; background-color: #ffffff; border-radius: 20px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
    .header { background: linear-gradient(135deg, #1e1b4b 0%, #4338ca 100%); padding: 32px 24px; text-align: center; color: #ffffff; }
    .header h1 { margin: 0 0 8px; font-size: 24px; font-weight: 800; }
    .content { padding: 32px 24px; color: #1e293b; }
    .details-box { background-color: #f1f5f9; border: 1px solid #cbd5e1; border-radius: 16px; padding: 20px; margin-bottom: 24px; }
    .detail-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e2e8f0; font-size: 14px; }
    .detail-row:last-child { border-bottom: none; }
    .detail-label { color: #475569; font-weight: 600; }
    .detail-value { color: #0f172a; font-weight: 700; text-align: right; }
    .cta-button { display: inline-block; background-color: #4338ca; color: #ffffff !important; font-size: 15px; font-weight: 700; padding: 14px 32px; border-radius: 12px; text-decoration: none; box-shadow: 0 4px 14px rgba(67, 56, 202, 0.35); }
    .footer { background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 20px 24px; text-align: center; font-size: 12px; color: #94a3b8; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Hexpertify Admin Notification</h1>
      <p style="margin:0; font-size: 14px; opacity: 0.95;">New Patient Appointment Created</p>
    </div>
    <div class="content">
      <div style="font-size: 16px; font-weight: 700; margin-bottom: 12px; color: #0f172a;">Platform Activity Alert:</div>
      <p style="font-size: 14px; line-height: 1.6; color: #475569; margin-bottom: 20px;">
        A new clinical session booking has been placed on the Hexpertify platform:
      </p>

      <div class="details-box">
        <div class="detail-row">
          <span class="detail-label">Therapist:</span>
          <span class="detail-value">${payload.consultantName}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Client Name:</span>
          <span class="detail-value">${payload.clientName}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Client Email:</span>
          <span class="detail-value">${payload.clientEmail}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Modality:</span>
          <span class="detail-value">${payload.serviceTitle}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Session Date:</span>
          <span class="detail-value">${payload.scheduledDate}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Session Time:</span>
          <span class="detail-value">${payload.scheduledTime}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Booking ID:</span>
          <span class="detail-value">${payload.bookingId || 'CONFIRMED'}</span>
        </div>
      </div>

      <div style="text-align: center; margin: 28px 0;">
        <a href="${adminUrl}" class="cta-button" target="_blank">Manage in Super Admin Panel</a>
      </div>
    </div>
    <div class="footer">
      <p>© 2026 Hexpertify Central Administration. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
      `;

      let messageId = `msg-ad-${Date.now()}`;
      if (process.env.AUTH_EMAIL_PASSWORD && process.env.AUTH_EMAIL_PASSWORD !== 'localpassword') {
        const info = await transporter.sendMail({
          from: fromAddress,
          to: adminRecipient,
          subject: `Admin Alert: New Booking - ${payload.clientName} with ${payload.consultantName} `,
          html: emailHtml,
          text: `Admin Alert: ${payload.clientName} booked a session with ${payload.consultantName} on ${payload.scheduledDate} at ${payload.scheduledTime}.`
        });
        messageId = info.messageId;
      }

      await this.logEmail(adminRecipient, 'Super Administrator', `Admin Alert: New Booking by ${payload.clientName}`, payload.bookingId, messageId);
      return { success: true, messageId };
    } catch (error: any) {
      console.error('❌ [MailService] sendAdminNewBookingAlert failed:', error);
      return { success: false, error: error?.message || 'Mail dispatch failed' };
    }
  }

  /**
   * 4. Send Booking Rescheduled Email to Client
   */
  static async sendBookingRescheduled(payload: BookingEmailPayload): Promise<{ success: boolean; error?: string; messageId?: string }> {
    try {
      if (!payload.clientEmail) {
        return { success: false, error: 'No client email provided' };
      }

      const transporter = this.getTransporter();
      const fromAddress = process.env.MAIL_FROM || process.env.AUTH_EMAIL || '"Hexpertify Health" <support@hexpertify.com>';
      const meetingUrl = payload.meetingLink || 'https://meet.google.com/hex-pert-ify';

      const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 20px auto; background-color: #ffffff; border-radius: 20px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
    .header { background: linear-gradient(135deg, #4f46e5 0%, #6366f1 100%); padding: 32px 24px; text-align: center; color: #ffffff; }
    .header h1 { margin: 0 0 8px; font-size: 24px; font-weight: 800; }
    .content { padding: 32px 24px; color: #1e293b; }
    .details-box { background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 16px; padding: 20px; margin-bottom: 24px; }
    .detail-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f1f5f9; font-size: 14px; }
    .detail-row:last-child { border-bottom: none; }
    .detail-label { color: #64748b; font-weight: 600; }
    .detail-value { color: #0f172a; font-weight: 700; text-align: right; }
    .cta-button { display: inline-block; background-color: #4f46e5; color: #ffffff !important; font-size: 15px; font-weight: 700; padding: 14px 32px; border-radius: 12px; text-decoration: none; }
    .footer { background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 20px 24px; text-align: center; font-size: 12px; color: #94a3b8; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Hexpertify Therapy</h1>
      <p style="margin:0; font-size: 14px; opacity: 0.9;">Your session schedule has been updated</p>
    </div>
    <div class="content">
      <div style="font-size: 16px; font-weight: 700; margin-bottom: 12px; color: #0f172a;">Hi ${payload.clientName},</div>
      <p style="font-size: 14px; line-height: 1.6; color: #475569; margin-bottom: 20px;">
        Your consultation session with <strong>${payload.consultantName}</strong> has been rescheduled. Here is your updated schedule:
      </p>

      <div class="details-box">
        <div class="detail-row">
          <span class="detail-label">Therapist:</span>
          <span class="detail-value">${payload.consultantName}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Modality:</span>
          <span class="detail-value">${payload.serviceTitle}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">New Date:</span>
          <span class="detail-value" style="color: #4f46e5;">${payload.scheduledDate}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">New Time:</span>
          <span class="detail-value" style="color: #4f46e5;">${payload.scheduledTime}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Duration:</span>
          <span class="detail-value">${payload.durationMinutes} Minutes</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Booking Reference:</span>
          <span class="detail-value">${payload.bookingId || 'RESCHEDULED'}</span>
        </div>
      </div>

      <div style="text-align: center; margin: 28px 0;">
        <a href="${meetingUrl}" class="cta-button" target="_blank">Join Video Session</a>
      </div>
    </div>
    <div class="footer">
      <p>© 2026 Hexpertify Healthcare. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
      `;

      let messageId = `msg-${Date.now()}`;
      if (process.env.AUTH_EMAIL_PASSWORD && process.env.AUTH_EMAIL_PASSWORD !== 'localpassword') {
        const info = await transporter.sendMail({
          from: fromAddress,
          to: payload.clientEmail,
          subject: `Session Rescheduled: ${payload.serviceTitle} with ${payload.consultantName} 🕒`,
          html: emailHtml,
          text: `Hi ${payload.clientName}, your session with ${payload.consultantName} has been rescheduled to ${payload.scheduledDate} at ${payload.scheduledTime}.`
        });
        messageId = info.messageId;
      }

      await this.logEmail(payload.clientEmail, payload.clientName, `Session Rescheduled: ${payload.serviceTitle}`, payload.bookingId, messageId);
      return { success: true, messageId };
    } catch (error: any) {
      console.error('❌ [MailService] sendBookingRescheduled failed:', error);
      return { success: false, error: error?.message || 'Mail dispatch failed' };
    }
  }

  /**
   * 5. Send Booking Cancellation Email to Client
   */
  static async sendBookingCancellation(payload: BookingEmailPayload): Promise<{ success: boolean; error?: string; messageId?: string }> {
    try {
      if (!payload.clientEmail) {
        return { success: false, error: 'No client email provided' };
      }

      const transporter = this.getTransporter();
      const fromAddress = process.env.MAIL_FROM || process.env.AUTH_EMAIL || '"Hexpertify Health" <support@hexpertify.com>';
      const portalUrl = 'http://localhost:5000/client/sessions';

      const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 20px auto; background-color: #ffffff; border-radius: 20px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
    .header { background: linear-gradient(135deg, #e11d48 0%, #f43f5e 100%); padding: 32px 24px; text-align: center; color: #ffffff; }
    .header h1 { margin: 0 0 8px; font-size: 24px; font-weight: 800; }
    .content { padding: 32px 24px; color: #1e293b; }
    .details-box { background-color: #fff1f2; border: 1px solid #fecdd3; border-radius: 16px; padding: 20px; margin-bottom: 24px; }
    .detail-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #ffe4e6; font-size: 14px; }
    .detail-row:last-child { border-bottom: none; }
    .detail-label { color: #9f1239; font-weight: 600; }
    .detail-value { color: #881337; font-weight: 700; text-align: right; }
    .cta-button { display: inline-block; background-color: #5e2be2; color: #ffffff !important; font-size: 15px; font-weight: 700; padding: 14px 32px; border-radius: 12px; text-decoration: none; }
    .footer { background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 20px 24px; text-align: center; font-size: 12px; color: #94a3b8; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Hexpertify Therapy</h1>
      <p style="margin:0; font-size: 14px; opacity: 0.9;">Session Cancellation Notice</p>
    </div>
    <div class="content">
      <div style="font-size: 16px; font-weight: 700; margin-bottom: 12px; color: #0f172a;">Hi ${payload.clientName},</div>
      <p style="font-size: 14px; line-height: 1.6; color: #475569; margin-bottom: 20px;">
        This is to notify you that your consultation session with <strong>${payload.consultantName}</strong> has been cancelled.
      </p>

      <div class="details-box">
        <div class="detail-row">
          <span class="detail-label">Therapist:</span>
          <span class="detail-value">${payload.consultantName}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Modality:</span>
          <span class="detail-value">${payload.serviceTitle}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Cancelled Session Date:</span>
          <span class="detail-value">${payload.scheduledDate}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Cancelled Session Time:</span>
          <span class="detail-value">${payload.scheduledTime}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Booking Reference:</span>
          <span class="detail-value">${payload.bookingId || 'CANCELLED'}</span>
        </div>
      </div>

      <p style="font-size: 14px; line-height: 1.6; color: #475569; margin-bottom: 24px;">
        You can easily book another available time slot anytime from your client portal:
      </p>

      <div style="text-align: center; margin: 24px 0;">
        <a href="${portalUrl}" class="cta-button" target="_blank">Book New Session</a>
      </div>
    </div>
    <div class="footer">
      <p>© 2026 Hexpertify Healthcare. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
      `;

      let messageId = `msg-${Date.now()}`;
      if (process.env.AUTH_EMAIL_PASSWORD && process.env.AUTH_EMAIL_PASSWORD !== 'localpassword') {
        const info = await transporter.sendMail({
          from: fromAddress,
          to: payload.clientEmail,
          subject: `Session Cancelled: ${payload.serviceTitle} with ${payload.consultantName} ❌`,
          html: emailHtml,
          text: `Hi ${payload.clientName}, your session "${payload.serviceTitle}" with ${payload.consultantName} scheduled for ${payload.scheduledDate} at ${payload.scheduledTime} has been cancelled.`
        });
        messageId = info.messageId;
      }

      await this.logEmail(payload.clientEmail, payload.clientName, `Session Cancelled: ${payload.serviceTitle}`, payload.bookingId, messageId);
      return { success: true, messageId };
    } catch (error: any) {
      console.error('❌ [MailService] sendBookingCancellation failed:', error);
      return { success: false, error: error?.message || 'Mail dispatch failed' };
    }
  }

  /**
   * 6. Send Payout Invoice — to Therapist (payment receipt) & Admin (financial audit copy)
   */
  static async sendPayoutInvoice(payload: {
    invoiceNumber: string;
    payoutDate: string;
    therapistName: string;
    therapistEmail: string;
    adminEmail?: string;
    profession: string;
    sessionsCount: number;
    grossAmount: number;
    platformFee: number;
    netPayout: number;
    paymentMethod: string;
    accountNumber: string;
    transactionRef: string;
    sessions?: Array<{ id: string; clientName: string; date: string; fee: number; commission: number; net: number }>;
  }): Promise<{ success: boolean; error?: string }> {
    try {
      const transporter = this.getTransporter();
      const fromAddress = process.env.MAIL_FROM || process.env.AUTH_EMAIL || '"Hexpertify Finance" <finance@hexpertify.com>';
      const adminRecipient = payload.adminEmail || process.env.ADMIN_ALERT_EMAIL || process.env.SMTP_USER || 'admin@hexpertify.com';
      const therapistRecipient = payload.therapistEmail;

      const sessionRows = (payload.sessions || []).map(s => `
        <tr>
          <td style="padding:10px 12px; font-family:monospace; font-weight:700; color:#5e2be2; font-size:12px;">${s.id}</td>
          <td style="padding:10px 12px; font-weight:600; color:#1e293b; font-size:12px;">${s.clientName}</td>
          <td style="padding:10px 12px; color:#64748b; font-size:12px;">${s.date}</td>
          <td style="padding:10px 12px; font-weight:700; color:#1e293b; font-size:12px; text-align:right;">₹${s.fee.toLocaleString('en-IN')}</td>
          <td style="padding:10px 12px; color:#e11d48; font-size:12px; text-align:right;">-₹${s.commission.toLocaleString('en-IN')}</td>
          <td style="padding:10px 12px; font-weight:800; color:#059669; font-size:12px; text-align:right;">₹${s.net.toLocaleString('en-IN')}</td>
        </tr>`).join('');

      const buildHtml = (recipientRole: 'therapist' | 'admin') => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Hexpertify Payout Invoice ${payload.invoiceNumber}</title>
</head>
<body style="margin:0; padding:0; background-color:#f1f5f9; font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <div style="max-width:640px; margin:24px auto; background:#ffffff; border-radius:24px; overflow:hidden; border:1px solid #e2e8f0; box-shadow:0 8px 24px rgba(0,0,0,0.08);">

    <!-- Header -->
    <div style="background:linear-gradient(135deg, #1e1b4b 0%, #5e2be2 60%, #7c3aed 100%); padding:36px 32px; text-align:center;">
      <div style="display:inline-block; background:rgba(255,255,255,0.12); border-radius:12px; padding:6px 16px; margin-bottom:12px;">
        <span style="color:#c4b5fd; font-size:11px; font-weight:800; letter-spacing:2px; text-transform:uppercase;">Hexpertify Finance</span>
      </div>
      <h1 style="margin:0 0 6px; font-size:26px; font-weight:900; color:#ffffff;">Payout Invoice</h1>
      <p style="margin:0; font-size:13px; color:rgba(255,255,255,0.75);">
        ${recipientRole === 'admin' ? '📋 Admin Audit Copy — Financial Records' : '✅ Payment Successfully Disbursed'}
      </p>
    </div>

    <!-- Invoice Meta -->
    <div style="background:#f8fafc; padding:20px 32px; border-bottom:1px solid #e2e8f0; display:flex; justify-content:space-between;">
      <div>
        <div style="font-size:10px; font-weight:700; color:#94a3b8; text-transform:uppercase; letter-spacing:1px;">Invoice No.</div>
        <div style="font-size:15px; font-weight:800; color:#5e2be2; margin-top:2px;">${payload.invoiceNumber}</div>
      </div>
      <div style="text-align:right;">
        <div style="font-size:10px; font-weight:700; color:#94a3b8; text-transform:uppercase; letter-spacing:1px;">Payout Date</div>
        <div style="font-size:15px; font-weight:800; color:#0f172a; margin-top:2px;">${payload.payoutDate}</div>
      </div>
    </div>

    <!-- Consultant Info -->
    <div style="padding:28px 32px;">
      <div style="background:linear-gradient(135deg, #ede9fe, #f5f3ff); border:1px solid #ddd6fe; border-radius:16px; padding:20px; margin-bottom:24px;">
        <div style="font-size:10px; font-weight:800; color:#7c3aed; text-transform:uppercase; letter-spacing:1px; margin-bottom:10px;">Consultant Details</div>
        <div style="display:flex; justify-content:space-between; margin-bottom:8px;">
          <span style="font-size:13px; color:#6b7280; font-weight:600;">Name:</span>
          <span style="font-size:13px; font-weight:800; color:#1e293b;">${payload.therapistName}</span>
        </div>
        <div style="display:flex; justify-content:space-between; margin-bottom:8px;">
          <span style="font-size:13px; color:#6b7280; font-weight:600;">Profession:</span>
          <span style="font-size:13px; font-weight:700; color:#374151;">${payload.profession}</span>
        </div>
        <div style="display:flex; justify-content:space-between; margin-bottom:8px;">
          <span style="font-size:13px; color:#6b7280; font-weight:600;">Payment Method:</span>
          <span style="font-size:13px; font-weight:700; color:#374151;">${payload.paymentMethod}</span>
        </div>
        <div style="display:flex; justify-content:space-between; margin-bottom:8px;">
          <span style="font-size:13px; color:#6b7280; font-weight:600;">${payload.paymentMethod === 'UPI' ? 'UPI ID' : 'Account'}:</span>
          <span style="font-size:13px; font-weight:700; color:#374151; font-family:monospace;">${payload.accountNumber}</span>
        </div>
        <div style="display:flex; justify-content:space-between;">
          <span style="font-size:13px; color:#6b7280; font-weight:600;">Transaction Ref:</span>
          <span style="font-size:13px; font-weight:800; color:#5e2be2; font-family:monospace;">${payload.transactionRef}</span>
        </div>
      </div>

      ${sessionRows ? `
      <!-- Session Breakdown Table -->
      <div style="margin-bottom:24px;">
        <div style="font-size:10px; font-weight:800; color:#94a3b8; text-transform:uppercase; letter-spacing:1px; margin-bottom:10px;">Session Breakdown</div>
        <table style="width:100%; border-collapse:collapse; border-radius:12px; overflow:hidden; border:1px solid #e2e8f0;">
          <thead>
            <tr style="background:#f1f5f9;">
              <th style="padding:10px 12px; text-align:left; font-size:10px; font-weight:800; color:#64748b; text-transform:uppercase; letter-spacing:0.5px;">Session Code</th>
              <th style="padding:10px 12px; text-align:left; font-size:10px; font-weight:800; color:#64748b; text-transform:uppercase;">Client</th>
              <th style="padding:10px 12px; text-align:left; font-size:10px; font-weight:800; color:#64748b; text-transform:uppercase;">Date</th>
              <th style="padding:10px 12px; text-align:right; font-size:10px; font-weight:800; color:#64748b; text-transform:uppercase;">Fee</th>
              <th style="padding:10px 12px; text-align:right; font-size:10px; font-weight:800; color:#64748b; text-transform:uppercase;">Platform</th>
              <th style="padding:10px 12px; text-align:right; font-size:10px; font-weight:800; color:#64748b; text-transform:uppercase;">Net</th>
            </tr>
          </thead>
          <tbody>
            ${sessionRows}
          </tbody>
        </table>
      </div>` : ''}

      <!-- Financial Summary -->
      <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:16px; padding:20px;">
        <div style="display:flex; justify-content:space-between; padding:8px 0; border-bottom:1px solid #f1f5f9;">
          <span style="font-size:13px; color:#64748b; font-weight:600;">Gross Sessions Total (${payload.sessionsCount} sessions):</span>
          <span style="font-size:13px; font-weight:700; color:#0f172a;">₹${payload.grossAmount.toLocaleString('en-IN')}</span>
        </div>
        <div style="display:flex; justify-content:space-between; padding:8px 0; border-bottom:1px solid #f1f5f9;">
          <span style="font-size:13px; color:#e11d48; font-weight:600;">Hexpertify Platform Fee:</span>
          <span style="font-size:13px; font-weight:700; color:#e11d48;">-₹${payload.platformFee.toLocaleString('en-IN')}</span>
        </div>
        <div style="display:flex; justify-content:space-between; padding:12px 0 4px; margin-top:4px; border-top:2px solid #e2e8f0;">
          <span style="font-size:15px; font-weight:900; color:#0f172a;">Net Amount Disbursed:</span>
          <span style="font-size:18px; font-weight:900; color:#059669;">₹${payload.netPayout.toLocaleString('en-IN')}</span>
        </div>
      </div>

      <!-- Status Badge -->
      <div style="text-align:center; margin-top:24px;">
        <span style="display:inline-block; background:#dcfce7; color:#166534; font-size:12px; font-weight:800; padding:8px 20px; border-radius:50px; letter-spacing:0.5px;">
          ✅ PAYMENT COMPLETED — ${payload.transactionRef}
        </span>
      </div>

      ${recipientRole === 'admin' ? `
      <div style="margin-top:20px; text-align:center;">
        <a href="http://localhost:5000/admin/payments" style="display:inline-block; background:#5e2be2; color:#ffffff; font-size:13px; font-weight:700; padding:12px 28px; border-radius:12px; text-decoration:none;">
          View in Super Admin Panel
        </a>
      </div>` : `
      <div style="margin-top:20px; text-align:center;">
        <p style="font-size:12px; color:#94a3b8; margin:0;">This invoice has been automatically generated by the Hexpertify Finance system.<br>Please retain this for your accounting records.</p>
      </div>`}
    </div>

    <!-- Footer -->
    <div style="background:#f8fafc; border-top:1px solid #e2e8f0; padding:20px 32px; text-align:center;">
      <p style="margin:0; font-size:11px; color:#94a3b8;">© 2026 Hexpertify Healthcare. All rights reserved. | finance@hexpertify.com</p>
    </div>
  </div>
</body>
</html>`;

      const therapistSubject = `✅ Payout Confirmed: ₹${payload.netPayout.toLocaleString('en-IN')} | ${payload.invoiceNumber}`;
      const adminSubject = `📋 Payout Invoice [Admin Copy]: ${payload.therapistName} — ₹${payload.netPayout.toLocaleString('en-IN')} | ${payload.invoiceNumber}`;

      const sendEmail = async (to: string, subject: string, html: string, role: 'therapist' | 'admin') => {
        if (process.env.AUTH_EMAIL_PASSWORD && process.env.AUTH_EMAIL_PASSWORD !== 'localpassword') {
          const info = await transporter.sendMail({ from: fromAddress, to, subject, html });
          await this.logEmail(to, role === 'therapist' ? payload.therapistName : 'Super Administrator', subject, payload.invoiceNumber, info.messageId);
        } else {
          await this.logEmail(to, role === 'therapist' ? payload.therapistName : 'Super Administrator', subject, payload.invoiceNumber, `mock-${Date.now()}`);
        }
      };

      // Send both emails in parallel (fire-and-forget; don't fail payout if email fails)
      await Promise.allSettled([
        therapistRecipient ? sendEmail(therapistRecipient, therapistSubject, buildHtml('therapist'), 'therapist') : Promise.resolve(),
        sendEmail(adminRecipient, adminSubject, buildHtml('admin'), 'admin')
      ]);

      return { success: true };
    } catch (error: any) {
      console.error('❌ [MailService] sendPayoutInvoice failed:', error);
      return { success: false, error: error?.message || 'Mail dispatch failed' };
    }
  }

  private static async logEmail(to: string, clientName: string, subject: string, bookingId?: string, messageId?: string) {
    try {
      const db = getDatabase();
      await db.collection('EmailLog').insertOne({
        id: `EML-${Date.now().toString().slice(-6)}`,
        to,
        clientName,
        subject,
        bookingId,
        status: process.env.AUTH_EMAIL_PASSWORD ? 'SENT' : 'LOGGED',
        messageId,
        sentAt: new Date(),
        createdAt: new Date()
      });
    } catch {}
  }
}
