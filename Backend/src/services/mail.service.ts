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
