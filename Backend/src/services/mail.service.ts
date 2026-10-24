import nodemailer from 'nodemailer';
import { getDatabase } from '../db/mongodb';
import {
  button,
  callout,
  details,
  emailLayout,
  esc,
  heading,
  paragraph,
  personCard,
  portalUrl,
  raw,
  Row,
  rupees,
  statusTracker,
  textRows,
  toneText,
  WEBSITE_URL
} from './email-layout';

export { portalUrl } from './email-layout';

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
  /** Website bookings are paid first; the team fixes the time afterwards */
  toBeScheduled?: boolean;
  amountPaid?: number;
  consultantPhoto?: string;
  consultantProfession?: string;
  consultantExperience?: number;
  /** Who cancelled, for the admin and therapist emails */
  cancelledBy?: 'client' | 'therapist' | 'admin';
}

export type MailResult = { success: boolean; error?: string; messageId?: string };

/** Placeholder written on bookings that have no real meeting room yet */
const PLACEHOLDER_MEETING_LINK = 'https://meet.google.com/hex-pert-ify';

function meetingLinkOf(link?: string): string {
  return link && /^https?:\/\//.test(link) && link !== PLACEHOLDER_MEETING_LINK ? link : '';
}

export function adminAlertEmail(): string {
  return process.env.ADMIN_ALERT_EMAIL || process.env.ADMIN_EMAIL || process.env.SMTP_USER || process.env.AUTH_EMAIL || 'admin@hexpertify.com';
}

function firstName(name: string): string {
  return String(name || '').trim().split(/\s+/)[0] || 'there';
}

/** Session rows shared by the booking emails */
function sessionRows(p: BookingEmailPayload, extra: Row[] = []): Row[] {
  const when: Row[] = p.toBeScheduled
    ? [['Date & time', 'Our team will share slots with you']]
    : [['Date', p.scheduledDate], ['Time', p.scheduledTime]];
  return [
    ['Expert', p.consultantName],
    ['Service', p.serviceTitle],
    ...when,
    ['Duration', p.durationMinutes ? `${p.durationMinutes} minutes` : undefined],
    ...extra,
    ['Booking ID', p.bookingId]
  ];
}

const whenText = (p: BookingEmailPayload) => (p.toBeScheduled ? 'a time our team will confirm with you' : `${p.scheduledDate} at ${p.scheduledTime}`);

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

  /** Sends (when SMTP is configured) and records the email in EmailLog; never throws */
  private static async deliver(m: { to: string; toName: string; subject: string; html: string; text: string; ref?: string; logSubject?: string }): Promise<MailResult> {
    try {
      if (!m.to) return { success: false, error: 'No recipient email provided' };
      let messageId = `msg-${Date.now()}`;
      if (process.env.AUTH_EMAIL_PASSWORD && process.env.AUTH_EMAIL_PASSWORD !== 'localpassword') {
        const info = await this.getTransporter().sendMail({
          from: process.env.MAIL_FROM || process.env.AUTH_EMAIL || '"Hexpertify" <support@hexpertify.com>',
          to: m.to,
          subject: m.subject,
          html: m.html,
          text: m.text
        });
        messageId = info.messageId;
      }
      await this.logEmail(m.to, m.toName, m.logSubject || m.subject, m.ref, messageId);
      return { success: true, messageId };
    } catch (error: any) {
      console.error(`❌ [MailService] "${m.subject}" to ${m.to} failed:`, error);
      return { success: false, error: error?.message || 'Mail dispatch failed' };
    }
  }

  /**
   * Booking confirmed (paid) — to the client
   */
  static async sendBookingConfirmation(p: BookingEmailPayload): Promise<MailResult> {
    const join = meetingLinkOf(p.meetingLink);
    const rows = sessionRows(p, [['Amount paid', p.amountPaid ? rupees(p.amountPaid) : undefined]]);
    const html = emailLayout({
      preheader: p.toBeScheduled
        ? `Your consultation with ${p.consultantName} is booked. We'll share time slots shortly.`
        : `Your session with ${p.consultantName} is on ${p.scheduledDate} at ${p.scheduledTime}.`,
      headline: 'Woohoo! You\'re booked',
      illustration: 'rocket',
      intro: `Dear <strong class="tx">${esc(p.clientName)}</strong>,<br><br>Thank you for booking your consultation with Hexpertify. ` +
        (p.toBeScheduled
          ? 'Our team will contact you with the available slots shortly.'
          : `Your session with <strong class="tx">${esc(p.consultantName)}</strong> is confirmed.`),
      body: [
        heading('Expert details'),
        personCard({
          name: p.consultantName,
          photoUrl: p.consultantPhoto,
          lines: [
            p.consultantProfession,
            p.consultantExperience ? `Experience: ${p.consultantExperience} years` : undefined,
            `Plan: ${p.serviceTitle}`
          ]
        }),
        statusTracker(2, `Your session with <strong class="tx">${esc(p.consultantName)}</strong> is confirmed.`),
        heading('Session details'),
        details(rows),
        join ? button(join, 'Join video session') : paragraph('We\'ll email you the joining link before your session.')
      ],
      reason: 'You are receiving this email because you booked a consultation with Hexpertify.'
    });
    return this.deliver({
      to: p.clientEmail,
      toName: p.clientName,
      subject: `Booking confirmed: ${p.serviceTitle} with ${p.consultantName} 🎉`,
      logSubject: `Session Confirmed: ${p.serviceTitle}`,
      html,
      text: `Hi ${p.clientName}, your "${p.serviceTitle}" consultation with ${p.consultantName} is confirmed for ${whenText(p)}.\n\n${textRows(rows)}${join ? `\n\nJoin: ${join}` : ''}`,
      ref: p.bookingId
    });
  }

  /**
   * New booking — to the therapist
   */
  static async sendTherapistNewBookingAlert(p: BookingEmailPayload): Promise<MailResult> {
    const to = p.therapistEmail || p.consultantEmail || process.env.THERAPIST_ALERT_EMAIL || '';
    const rows: Row[] = [
      ['Client', p.clientName],
      ['Client email', p.clientEmail],
      ['Client phone', p.clientPhone],
      ...sessionRows(p).filter(([label]) => label !== 'Expert')
    ];
    const html = emailLayout({
      preheader: `${p.clientName} booked "${p.serviceTitle}" for ${whenText(p)}.`,
      headline: 'New booking received',
      illustration: 'rocket',
      intro: `Hi <strong class="tx">${esc(firstName(p.consultantName))}</strong>,<br><br><strong class="tx">${esc(p.clientName)}</strong> has booked a consultation with you.` +
        (p.toBeScheduled ? ' Our team will coordinate the time with you and the client.' : ''),
      body: [details(rows), button(portalUrl('/consultant/calendar'), 'Open my calendar')],
      reason: 'You are receiving this email because a client booked a session with you on Hexpertify.'
    });
    return this.deliver({
      to,
      toName: p.consultantName,
      subject: `New booking: ${p.clientName}${p.toBeScheduled ? '' : ` on ${p.scheduledDate} at ${p.scheduledTime}`} 🚀`,
      logSubject: `Therapist Alert: New Booking by ${p.clientName}`,
      html,
      text: `Hi ${p.consultantName}, ${p.clientName} booked "${p.serviceTitle}" with you for ${whenText(p)}.\n\n${textRows(rows)}`,
      ref: p.bookingId
    });
  }

  /**
   * New booking — to the admins
   */
  static async sendAdminNewBookingAlert(p: BookingEmailPayload): Promise<MailResult> {
    const rows: Row[] = [
      ['Client', p.clientName],
      ['Client email', p.clientEmail],
      ['Client phone', p.clientPhone],
      ...sessionRows(p, [['Amount paid', p.amountPaid ? rupees(p.amountPaid) : undefined]]),
      ['Status', toneText('Confirmed (paid)', 'success')]
    ];
    const html = emailLayout({
      preheader: `${p.clientName} booked ${p.consultantName}.`,
      headline: 'New booking alert',
      intro: `A new consultation was booked on Hexpertify.${p.toBeScheduled ? ' <strong class="tx">The client is waiting for time slots.</strong>' : ''}`,
      body: [details(rows), button(portalUrl('/admin/bookings'), 'Manage bookings')],
      reason: 'You are receiving this email because you are a Hexpertify administrator.'
    });
    return this.deliver({
      to: p.adminEmail || adminAlertEmail(),
      toName: 'Super Administrator',
      subject: `New booking: ${p.clientName} with ${p.consultantName} 🔔`,
      logSubject: `Admin Alert: New Booking by ${p.clientName}`,
      html,
      text: `${p.clientName} booked ${p.consultantName} for ${whenText(p)}.\n\n${textRows(rows)}`,
      ref: p.bookingId
    });
  }

  /**
   * Session rescheduled — to the client
   */
  static async sendBookingRescheduled(p: BookingEmailPayload): Promise<MailResult> {
    const join = meetingLinkOf(p.meetingLink);
    const rows = sessionRows(p, [
      ['Previous slot', p.oldDate ? `${p.oldDate}${p.oldTime ? ` at ${p.oldTime}` : ''}` : undefined]
    ]).map(([l, v]): Row => (l === 'Date' || l === 'Time') ? [`New ${l.toLowerCase()}`, toneText(String(v), 'brand')] : [l, v]);
    const html = emailLayout({
      preheader: `Your session with ${p.consultantName} is now on ${p.scheduledDate} at ${p.scheduledTime}.`,
      headline: 'Your session has moved',
      intro: `Hi <strong class="tx">${esc(p.clientName)}</strong>,<br><br>Your consultation with <strong class="tx">${esc(p.consultantName)}</strong> has been rescheduled. Here is your updated schedule.`,
      body: [details(rows), join ? button(join, 'Join video session') : button(portalUrl('/client/sessions'), 'View my sessions')],
      reason: 'You are receiving this email because you have a session booked on Hexpertify.'
    });
    return this.deliver({
      to: p.clientEmail,
      toName: p.clientName,
      subject: `Session rescheduled: ${p.scheduledDate} at ${p.scheduledTime} 🕒`,
      logSubject: `Session Rescheduled: ${p.serviceTitle}`,
      html,
      text: `Hi ${p.clientName}, your session with ${p.consultantName} has been rescheduled to ${p.scheduledDate} at ${p.scheduledTime}.\n\n${textRows(rows)}`,
      ref: p.bookingId
    });
  }

  /**
   * Session rescheduled — to the therapist
   */
  static async sendTherapistRescheduledAlert(p: BookingEmailPayload): Promise<MailResult> {
    const to = p.therapistEmail || p.consultantEmail || '';
    const rows: Row[] = [
      ['Client', p.clientName],
      ['Service', p.serviceTitle],
      ['Previous slot', p.oldDate ? `${p.oldDate}${p.oldTime ? ` at ${p.oldTime}` : ''}` : undefined],
      ['New date', toneText(p.scheduledDate, 'brand')],
      ['New time', toneText(p.scheduledTime, 'brand')],
      ['Booking ID', p.bookingId]
    ];
    const html = emailLayout({
      preheader: `${p.clientName}'s session is now on ${p.scheduledDate} at ${p.scheduledTime}.`,
      headline: 'A session was rescheduled',
      intro: `Hi <strong class="tx">${esc(firstName(p.consultantName))}</strong>,<br><br><strong class="tx">${esc(p.clientName)}</strong>'s session has moved to a new time.`,
      body: [details(rows), button(portalUrl('/consultant/calendar'), 'Open my calendar')],
      reason: 'You are receiving this email because you have a session booked on Hexpertify.'
    });
    return this.deliver({
      to,
      toName: p.consultantName,
      subject: `Rescheduled: ${p.clientName} is now on ${p.scheduledDate} at ${p.scheduledTime} 🕒`,
      html,
      text: `Hi ${p.consultantName}, ${p.clientName}'s "${p.serviceTitle}" session is now on ${p.scheduledDate} at ${p.scheduledTime}.`,
      ref: p.bookingId
    });
  }

  /**
   * Session cancelled — to the client
   */
  static async sendBookingCancellation(p: BookingEmailPayload): Promise<MailResult> {
    const rows = sessionRows(p, [['Status', toneText('Cancelled', 'danger')]]);
    const html = emailLayout({
      preheader: `Your session with ${p.consultantName} on ${whenText(p)} was cancelled.`,
      headline: 'Session cancelled',
      intro: `Hi <strong class="tx">${esc(p.clientName)}</strong>,<br><br>Your consultation with <strong class="tx">${esc(p.consultantName)}</strong> has been cancelled.`,
      body: [
        details(rows),
        ...(p.reason ? [callout(`<strong>Reason:</strong> ${esc(p.reason)}`, 'danger')] : []),
        paragraph('If you paid for this session, any refund is processed to your original payment method and we\'ll email you once it is on its way. You can book another time whenever you are ready.'),
        button(`${WEBSITE_URL}`, 'Book a new session')
      ],
      reason: 'You are receiving this email because you had a session booked on Hexpertify.'
    });
    return this.deliver({
      to: p.clientEmail,
      toName: p.clientName,
      subject: `Session cancelled: ${p.serviceTitle} with ${p.consultantName}`,
      logSubject: `Session Cancelled: ${p.serviceTitle}`,
      html,
      text: `Hi ${p.clientName}, your "${p.serviceTitle}" session with ${p.consultantName} on ${whenText(p)} has been cancelled.${p.reason ? ` Reason: ${p.reason}` : ''}`,
      ref: p.bookingId
    });
  }

  /**
   * Session cancelled by the client or an admin — to the therapist
   */
  static async sendTherapistCancellationAlert(p: BookingEmailPayload): Promise<MailResult> {
    const to = p.therapistEmail || p.consultantEmail || '';
    const by = p.cancelledBy === 'admin' ? 'the Hexpertify team' : p.clientName;
    const rows: Row[] = [
      ['Client', p.clientName],
      ['Service', p.serviceTitle],
      ['Date', p.toBeScheduled ? undefined : p.scheduledDate],
      ['Time', p.toBeScheduled ? undefined : p.scheduledTime],
      ['Cancelled by', by],
      ['Booking ID', p.bookingId]
    ];
    const html = emailLayout({
      preheader: `${p.clientName}'s session on ${whenText(p)} was cancelled.`,
      headline: 'A session was cancelled',
      intro: `Hi <strong class="tx">${esc(firstName(p.consultantName))}</strong>,<br><br>The following session was cancelled by ${esc(by)}. The time slot is free again in your calendar.`,
      body: [details(rows), button(portalUrl('/consultant/calendar'), 'Open my calendar')],
      reason: 'You are receiving this email because you had a session booked on Hexpertify.'
    });
    return this.deliver({
      to,
      toName: p.consultantName,
      subject: `Session cancelled: ${p.clientName}${p.toBeScheduled ? '' : `, ${p.scheduledDate} ${p.scheduledTime}`}`,
      logSubject: `Client Cancelled: ${p.serviceTitle}`,
      html,
      text: `Hi ${p.consultantName}, ${p.clientName}'s "${p.serviceTitle}" session on ${whenText(p)} was cancelled by ${by}.`,
      ref: p.bookingId
    });
  }

  /**
   * Session cancelled — to the admins (so refunds can be handled)
   */
  static async sendAdminCancellationAlert(p: BookingEmailPayload): Promise<MailResult> {
    const by = p.cancelledBy === 'therapist' ? p.consultantName : p.cancelledBy === 'admin' ? 'An administrator' : p.clientName;
    const rows: Row[] = [
      ['Client', p.clientName],
      ['Client email', p.clientEmail],
      ...sessionRows(p, [['Amount paid', p.amountPaid ? rupees(p.amountPaid) : undefined]]),
      ['Cancelled by', by]
    ];
    const html = emailLayout({
      preheader: `${p.clientName}'s session with ${p.consultantName} was cancelled.`,
      headline: 'Session cancelled',
      intro: `A session was cancelled by <strong class="tx">${esc(by)}</strong>. Check whether the client needs a refund.`,
      body: [details(rows), button(portalUrl('/admin/bookings'), 'Manage bookings')],
      reason: 'You are receiving this email because you are a Hexpertify administrator.'
    });
    return this.deliver({
      to: p.adminEmail || adminAlertEmail(),
      toName: 'Super Administrator',
      subject: `Cancelled: ${p.clientName} with ${p.consultantName}`,
      html,
      text: `${p.clientName}'s "${p.serviceTitle}" session with ${p.consultantName} on ${whenText(p)} was cancelled by ${by}.`,
      ref: p.bookingId
    });
  }

  /**
   * Session completed — to the client, inviting them to rate the session
   */
  static async sendSessionCompleted(p: BookingEmailPayload): Promise<MailResult> {
    const rateUrl = portalUrl('/client');
    const html = emailLayout({
      preheader: `How was your session with ${p.consultantName}? Rate it in under a minute.`,
      headline: 'Session completed',
      illustration: 'namaste',
      intro: `Dear <strong class="tx">${esc(p.clientName)}</strong>,<br><br>Thank you for attending your session with <strong class="tx">${esc(p.consultantName)}</strong>. We hope it helped.`,
      body: [
        statusTracker(3, `Your session with <strong class="tx">${esc(p.consultantName)}</strong> is complete.`),
        details(sessionRows(p)),
        paragraph('How did it go? Rating today\'s session takes under a minute and helps your expert shape your next one.'),
        button(rateUrl, 'Rate your session')
      ],
      reason: 'You are receiving this email because you attended a consultation on Hexpertify.'
    });
    return this.deliver({
      to: p.clientEmail,
      toName: p.clientName,
      subject: `How was your session with ${p.consultantName}? ✅`,
      logSubject: `Session Completed: ${p.serviceTitle}`,
      html,
      text: `Hi ${p.clientName}, your "${p.serviceTitle}" session with ${p.consultantName} is complete. Rate it here: ${rateUrl}`,
      ref: p.bookingId
    });
  }

  /**
   * Upcoming session reminder — to the client or the therapist
   */
  static async sendSessionReminder(p: BookingEmailPayload, opts: { audience: 'client' | 'therapist'; window: '24h' | '1h' }): Promise<MailResult> {
    const join = meetingLinkOf(p.meetingLink);
    const soon = opts.window === '1h';
    const isClient = opts.audience === 'client';
    const other = isClient ? p.consultantName : p.clientName;
    const to = isClient ? p.clientEmail : (p.therapistEmail || p.consultantEmail || '');
    const name = isClient ? p.clientName : p.consultantName;
    const rows = isClient ? sessionRows(p) : [['Client', p.clientName] as Row, ...sessionRows(p).filter(([l]) => l !== 'Expert')];
    const html = emailLayout({
      preheader: `${soon ? 'Starting in about an hour' : 'Tomorrow'}: your session with ${other} at ${p.scheduledTime}.`,
      headline: soon ? 'Your session starts soon' : 'Your session is tomorrow',
      intro: `Hi <strong class="tx">${esc(firstName(name))}</strong>,<br><br>A reminder that your session with <strong class="tx">${esc(other)}</strong> is on <strong class="tx">${esc(p.scheduledDate)}</strong> at <strong class="tx">${esc(p.scheduledTime)}</strong>.`,
      body: [
        details(rows),
        ...(isClient && !soon ? [paragraph('Find a quiet, private spot with a steady internet connection. Need to change the time? Reply to this email and we\'ll help.')] : []),
        join ? button(join, 'Join video session') : button(isClient ? portalUrl('/client/sessions') : portalUrl('/consultant/calendar'), isClient ? 'View my sessions' : 'Open my calendar')
      ],
      reason: 'You are receiving this email because you have a session booked on Hexpertify.'
    });
    return this.deliver({
      to,
      toName: name,
      subject: soon ? `Starting soon: your session with ${other} at ${p.scheduledTime} ⏰` : `Reminder: session with ${other} tomorrow at ${p.scheduledTime} 📅`,
      html,
      text: `Hi ${name}, your session with ${other} is on ${p.scheduledDate} at ${p.scheduledTime}.${join ? ` Join: ${join}` : ''}`,
      ref: p.bookingId
    });
  }

  /**
   * Payment failed — to the client
   */
  static async sendPaymentFailed(p: { clientName: string; clientEmail: string; consultantName?: string; serviceTitle?: string; amount?: number; reason?: string; paymentId?: string; retryUrl?: string }): Promise<MailResult> {
    const rows: Row[] = [
      ['Expert', p.consultantName],
      ['Service', p.serviceTitle],
      ['Amount', p.amount ? rupees(p.amount) : undefined],
      ['Status', toneText('Payment failed', 'danger')],
      ['Payment ID', p.paymentId]
    ];
    const html = emailLayout({
      preheader: 'Your payment did not go through, and your session is not booked yet.',
      headline: 'Payment didn\'t go through',
      intro: `Hi <strong class="tx">${esc(p.clientName)}</strong>,<br><br>We couldn't complete your payment${p.consultantName ? ` for your session with <strong class="tx">${esc(p.consultantName)}</strong>` : ''}, so the session is not booked yet. If any money left your account, your bank will return it automatically within 5–7 working days.`,
      body: [
        details(rows),
        ...(p.reason ? [callout(`<strong>Reason from the payment gateway:</strong> ${esc(p.reason)}`, 'danger')] : []),
        button(p.retryUrl || WEBSITE_URL, 'Try booking again')
      ],
      reason: 'You are receiving this email because you tried to book a consultation on Hexpertify.'
    });
    return this.deliver({
      to: p.clientEmail,
      toName: p.clientName,
      subject: 'Your payment didn\'t go through',
      html,
      text: `Hi ${p.clientName}, your payment${p.consultantName ? ` for the session with ${p.consultantName}` : ''} didn't go through, so the session is not booked.${p.reason ? ` Reason: ${p.reason}.` : ''} You can try again at ${p.retryUrl || WEBSITE_URL}.`,
      ref: p.paymentId
    });
  }

  /**
   * Refund started / completed / failed — to the client
   */
  static async sendRefundUpdate(p: { clientName: string; clientEmail: string; amount: number; status: 'PENDING' | 'SUCCESS' | 'FAILED'; consultantName?: string; serviceTitle?: string; bookingId?: string; refundId?: string; reason?: string }): Promise<MailResult> {
    const copy = {
      PENDING: {
        headline: 'Your refund is on its way',
        intro: `We've started a refund of <strong class="tx">${rupees(p.amount)}</strong> to your original payment method. It usually reaches your account within 5–7 working days, depending on your bank.`,
        status: toneText('Processing', 'warning'),
        subject: `Refund of ${rupees(p.amount)} started`
      },
      SUCCESS: {
        headline: 'Refund completed',
        intro: `Your refund of <strong class="tx">${rupees(p.amount)}</strong> has been completed. Depending on your bank, it can take a couple of days to show in your statement.`,
        status: toneText('Refunded', 'success'),
        subject: `Refund of ${rupees(p.amount)} completed ✅`
      },
      FAILED: {
        headline: 'We couldn\'t process your refund',
        intro: `Your refund of <strong class="tx">${rupees(p.amount)}</strong> could not be processed. Our team has been notified and will contact you to sort it out.`,
        status: toneText('Failed', 'danger'),
        subject: `Update on your refund of ${rupees(p.amount)}`
      }
    }[p.status];
    const rows: Row[] = [
      ['Expert', p.consultantName],
      ['Service', p.serviceTitle],
      ['Refund amount', rupees(p.amount)],
      ['Status', copy.status],
      ['Refund ID', p.refundId],
      ['Booking ID', p.bookingId]
    ];
    const html = emailLayout({
      preheader: copy.subject,
      headline: copy.headline,
      intro: `Hi <strong class="tx">${esc(p.clientName)}</strong>,<br><br>${copy.intro}`,
      body: [details(rows), ...(p.reason ? [callout(`<strong>Note:</strong> ${esc(p.reason)}`)] : [])],
      reason: 'You are receiving this email because you made a payment on Hexpertify.'
    });
    return this.deliver({
      to: p.clientEmail,
      toName: p.clientName,
      subject: copy.subject,
      html,
      text: `Hi ${p.clientName}, ${copy.intro.replace(/<[^>]+>/g, '')}\n\n${textRows(rows)}`,
      ref: p.refundId || p.bookingId
    });
  }

  /**
   * Welcome — to a newly registered client
   */
  static async sendWelcome(p: { name: string; email: string }): Promise<MailResult> {
    const html = emailLayout({
      preheader: 'Your Hexpertify account is ready. Find the right expert, anytime, anywhere.',
      headline: 'Welcome to Hexpertify',
      illustration: 'namaste',
      intro: `Hi <strong class="tx">${esc(firstName(p.name))}</strong>,<br><br>Thank you for joining Hexpertify. Your account is ready.`,
      body: [
        heading('What happens next'),
        details([
          ['1. Choose an expert', 'Browse verified experts'],
          ['2. Book & pay securely', 'Pick a plan that suits you'],
          ['3. Meet online', 'Join from your phone or laptop']
        ]),
        button(WEBSITE_URL, 'Find an expert')
      ],
      reason: 'You are receiving this email because you created an account on Hexpertify.'
    });
    return this.deliver({
      to: p.email,
      toName: p.name,
      subject: 'Welcome to Hexpertify 👋',
      html,
      text: `Hi ${p.name}, welcome to Hexpertify! Your account is ready. Find an expert at ${WEBSITE_URL}.`
    });
  }

  /**
   * Short alert mirroring an in-app notification (assessments, activities, feedback, requests)
   */
  static async sendNotificationEmail(n: { to: string; toName: string; audience: 'CLIENT' | 'CONSULTANT' | 'ADMIN'; title: string; message: string; url: string; ctaLabel: string; ref?: string }): Promise<MailResult> {
    const html = emailLayout({
      preheader: n.message,
      headline: n.title,
      intro: `Hi <strong class="tx">${esc(firstName(n.toName))}</strong>,<br><br>${esc(n.message)}`,
      body: [button(n.url, n.ctaLabel)],
      reason: n.audience === 'ADMIN'
        ? 'You are receiving this email because you are a Hexpertify administrator.'
        : n.audience === 'CONSULTANT'
          ? 'You are receiving this email because you are an expert on Hexpertify.'
          : 'You are receiving this email because you are receiving care through Hexpertify.'
    });
    return this.deliver({ to: n.to, toName: n.toName, subject: n.title, html, text: `${n.message}\n\n${n.url}`, ref: n.ref });
  }

  /**
   * Payout invoice — to the therapist (payment receipt) & admin (financial audit copy)
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
      const summary: Row[] = [
        ['Invoice no.', payload.invoiceNumber],
        ['Payout date', payload.payoutDate],
        ['Expert', payload.therapistName],
        ['Profession', payload.profession],
        ['Payment method', payload.paymentMethod],
        [payload.paymentMethod === 'UPI' ? 'UPI ID' : 'Account', payload.accountNumber],
        ['Transaction ref', payload.transactionRef]
      ];
      const totals: Row[] = [
        [`Gross (${payload.sessionsCount} sessions)`, rupees(payload.grossAmount)],
        ['Hexpertify platform fee', toneText(`-${rupees(payload.platformFee)}`, 'danger')],
        ['Net amount paid', toneText(rupees(payload.netPayout), 'success')]
      ];
      const sessions = (payload.sessions || []).map((s): Row => [
        `${s.date} · ${s.clientName}`,
        raw(`${esc(rupees(s.net))} <span class="tx-muted" style="font-weight:500;">(fee ${esc(rupees(s.fee))} − ${esc(rupees(s.commission))})</span>`)
      ]);

      const build = (role: 'therapist' | 'admin') => emailLayout({
        preheader: `Payout ${payload.invoiceNumber}: ${rupees(payload.netPayout)} sent.`,
        headline: role === 'admin' ? 'Payout invoice (admin copy)' : 'Your payout is on its way',
        intro: role === 'admin'
          ? `A payout of <strong class="tx">${rupees(payload.netPayout)}</strong> was released to <strong class="tx">${esc(payload.therapistName)}</strong>. Keep this copy for your financial records.`
          : `Hi <strong class="tx">${esc(firstName(payload.therapistName))}</strong>,<br><br>We've paid <strong class="tx">${rupees(payload.netPayout)}</strong> for your sessions. Please keep this invoice for your records.`,
        body: [
          details(summary),
          ...(sessions.length ? [heading('Session breakdown'), details(sessions)] : []),
          heading('Summary'),
          details(totals),
          ...(role === 'admin' ? [button(portalUrl('/admin/payments'), 'View payouts')] : [])
        ],
        reason: role === 'admin'
          ? 'You are receiving this email because you are a Hexpertify administrator.'
          : 'You are receiving this email because Hexpertify released a payout to you.'
      });

      const text = `${textRows(summary)}\n\n${textRows(totals)}`;
      const adminTo = payload.adminEmail || adminAlertEmail();
      await Promise.allSettled([
        payload.therapistEmail ? this.deliver({
          to: payload.therapistEmail,
          toName: payload.therapistName,
          subject: `Payout sent: ${rupees(payload.netPayout)} | ${payload.invoiceNumber} ✅`,
          html: build('therapist'),
          text,
          ref: payload.invoiceNumber
        }) : Promise.resolve(),
        this.deliver({
          to: adminTo,
          toName: 'Super Administrator',
          subject: `Payout invoice [admin copy]: ${payload.therapistName}, ${rupees(payload.netPayout)} | ${payload.invoiceNumber}`,
          html: build('admin'),
          text,
          ref: payload.invoiceNumber
        })
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
