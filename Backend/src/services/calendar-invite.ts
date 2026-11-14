/**
 * Calendar invites (iCalendar, RFC 5545) attached to booking emails, so a session shows up in the
 * recipient's Google / Outlook / Apple calendar without them doing anything (subject to their own
 * calendar's "add invitations" setting, which Google applies to every invite).
 *
 * One event per booking per audience: the client and the therapist each get their own event (their own
 * UID), so neither invite lists the other person's email address. A reschedule re-sends the same UID with
 * a higher SEQUENCE, which moves the existing event; a cancellation sends METHOD:CANCEL, which removes it.
 */

export type InviteAudience = 'client' | 'therapist';

export interface CalendarInvite {
  method: 'REQUEST' | 'CANCEL';
  /** The .ics body; nodemailer sends it as the text/calendar part Gmail recognises as an invite */
  content: string;
}

export interface InviteInput {
  bookingId: string;
  audience: InviteAudience;
  start: Date;
  durationMinutes: number;
  title: string;
  description: string;
  /** The join link when there is a real one */
  location?: string;
  attendee: { name: string; email: string };
}

/** The address invites are sent from (it must be the email's From address for Gmail to accept updates) */
function organizer(): { name: string; email: string } {
  const from = process.env.MAIL_FROM || process.env.AUTH_EMAIL || '"Hexpertify" <support@hexpertify.com>';
  const angle = from.match(/^\s*"?([^"<]*)"?\s*<([^>]+)>\s*$/);
  if (angle) return { name: angle[1].trim() || 'Hexpertify', email: angle[2].trim() };
  return { name: 'Hexpertify', email: from.trim() };
}

/** 20261112T033000Z */
function icsDate(d: Date): string {
  return d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
}

/** Escapes TEXT values (RFC 5545 3.3.11) */
function text(value: string): string {
  return String(value ?? '')
    .replace(/\\/g, '\\\\')
    .replace(/\r?\n/g, '\\n')
    .replace(/[,;]/g, (c) => `\\${c}`);
}

/** Quoted parameter values (CN) may not contain DQUOTE */
function param(value: string): string {
  return `"${String(value ?? '').replace(/"/g, "'")}"`;
}

/** Folds lines longer than 75 octets (RFC 5545 3.1) */
function fold(line: string): string {
  const bytes = Buffer.from(line, 'utf8');
  if (bytes.length <= 75) return line;
  const parts: string[] = [];
  let current = '';
  let size = 0;
  for (const ch of line) {
    const len = Buffer.byteLength(ch, 'utf8');
    const limit = parts.length === 0 ? 75 : 74; // continuation lines start with a space
    if (size + len > limit) {
      parts.push(current);
      current = '';
      size = 0;
    }
    current += ch;
    size += len;
  }
  parts.push(current);
  return parts.join('\r\n ');
}

/** Stable per booking and audience, so updates and cancellations hit the same calendar event */
function uidOf(bookingId: string, audience: InviteAudience): string {
  const domain = organizer().email.split('@')[1] || 'hexpertify.com';
  return `booking-${String(bookingId).replace(/[^A-Za-z0-9_-]/g, '')}-${audience}@${domain}`;
}

/** Calendars apply the update with the highest SEQUENCE; seconds since epoch only ever grow */
function sequenceNow(): number {
  return Math.floor(Date.now() / 1000);
}

function build(method: 'REQUEST' | 'CANCEL', i: InviteInput): string {
  const org = organizer();
  const end = new Date(i.start.getTime() + Math.max(1, Number(i.durationMinutes) || 50) * 60 * 1000);
  const lines = [
    'BEGIN:VCALENDAR',
    'PRODID:-//Hexpertify//Sessions//EN',
    'VERSION:2.0',
    'CALSCALE:GREGORIAN',
    `METHOD:${method}`,
    'BEGIN:VEVENT',
    `UID:${uidOf(i.bookingId, i.audience)}`,
    `SEQUENCE:${sequenceNow()}`,
    `DTSTAMP:${icsDate(new Date())}`,
    `DTSTART:${icsDate(i.start)}`,
    `DTEND:${icsDate(end)}`,
    `SUMMARY:${text(i.title)}`,
    `DESCRIPTION:${text(i.description)}`,
    ...(i.location ? [`LOCATION:${text(i.location)}`, `URL:${i.location}`] : []),
    `ORGANIZER;CN=${param(org.name)}:mailto:${org.email}`,
    `ATTENDEE;CN=${param(i.attendee.name)};ROLE=REQ-PARTICIPANT;PARTSTAT=${method === 'CANCEL' ? 'DECLINED' : 'NEEDS-ACTION'};RSVP=${method === 'CANCEL' ? 'FALSE' : 'TRUE'}:mailto:${i.attendee.email}`,
    `STATUS:${method === 'CANCEL' ? 'CANCELLED' : 'CONFIRMED'}`,
    'TRANSP:OPAQUE',
    ...(method === 'REQUEST'
      ? ['BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${text(i.title)}`, 'TRIGGER:-PT30M', 'END:VALARM']
      : []),
    'END:VEVENT',
    'END:VCALENDAR'
  ];
  return lines.map(fold).join('\r\n') + '\r\n';
}

/** A new or moved session */
export function sessionInvite(i: InviteInput): CalendarInvite {
  return { method: 'REQUEST', content: build('REQUEST', i) };
}

/** Removes the session from the calendar it was added to */
export function sessionCancellation(i: InviteInput): CalendarInvite {
  return { method: 'CANCEL', content: build('CANCEL', i) };
}
