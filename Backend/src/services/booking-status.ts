/**
 * Canonical booking and payment statuses. Every panel sends its own labels ("Scheduled", "Completed",
 * "NO SHOW - CLIENT", "Paid"…); bookings are stored with these uppercase values only.
 */
export const BOOKING_STATUSES = [
  'PENDING',
  'PENDING_PAYMENT',
  'EXPIRED',
  'CONFIRMED',
  'RESCHEDULED',
  'COMPLETED',
  'CANCELLED',
  'NO_SHOW_CLIENT',
  'NO_SHOW_CONSULTANT'
] as const;
export type BookingStatus = typeof BOOKING_STATUSES[number];

const STATUS_ALIASES: Record<string, BookingStatus> = {
  SCHEDULED: 'CONFIRMED',
  UPCOMING: 'CONFIRMED',
  BOOKED: 'CONFIRMED',
  ACCEPTED: 'CONFIRMED',
  APPROVED: 'CONFIRMED',
  ACTIVE: 'CONFIRMED',
  AWAITING_PAYMENT: 'PENDING_PAYMENT',
  PAYMENT_PENDING: 'PENDING_PAYMENT',
  CANCELED: 'CANCELLED',
  COMPLETE: 'COMPLETED',
  DONE: 'COMPLETED',
  NO_SHOW: 'NO_SHOW_CLIENT',
  NOSHOW: 'NO_SHOW_CLIENT',
  CLIENT_NO_SHOW: 'NO_SHOW_CLIENT',
  NO_SHOW_BY_CLIENT: 'NO_SHOW_CLIENT',
  CONSULTANT_NO_SHOW: 'NO_SHOW_CONSULTANT',
  THERAPIST_NO_SHOW: 'NO_SHOW_CONSULTANT',
  NO_SHOW_THERAPIST: 'NO_SHOW_CONSULTANT',
  NO_SHOW_BY_CONSULTANT: 'NO_SHOW_CONSULTANT'
};

/** "No show - Client" → "NO_SHOW_CLIENT" */
function toKey(raw: unknown): string {
  return String(raw ?? '').trim().toUpperCase().replace(/[^A-Z0-9]+/g, '_').replace(/^_+|_+$/g, '');
}

/** The canonical status for any label, or null when the label is unknown */
export function normalizeBookingStatus(raw: unknown): BookingStatus | null {
  const key = toKey(raw);
  if (!key) return null;
  if ((BOOKING_STATUSES as readonly string[]).includes(key)) return key as BookingStatus;
  return STATUS_ALIASES[key] || null;
}

/** Canonical status for reading stored data: unknown labels are kept, uppercased */
export function bookingStatusOf(b: any): string {
  return normalizeBookingStatus(b?.status) || toKey(b?.status) || 'CONFIRMED';
}

export const PAYMENT_STATUSES = ['UNPAID', 'PENDING', 'PAID', 'FAILED', 'EXPIRED', 'REFUND_PENDING', 'PARTIALLY_REFUNDED', 'REFUNDED'] as const;

const PAYMENT_ALIASES: Record<string, string> = {
  NOT_PAID: 'UNPAID',
  DUE: 'UNPAID',
  CREATED: 'PENDING',
  SUCCESS: 'PAID',
  CAPTURED: 'PAID',
  COMPLETED: 'PAID',
  REFUND_INITIATED: 'REFUND_PENDING',
  PARTIAL_REFUND: 'PARTIALLY_REFUNDED'
};

/** "Paid" → "PAID", "Partially Refunded" → "PARTIALLY_REFUNDED"; null when the label is unknown */
export function normalizePaymentStatus(raw: unknown): string | null {
  const key = toKey(raw);
  if (!key) return null;
  if ((PAYMENT_STATUSES as readonly string[]).includes(key)) return key;
  return PAYMENT_ALIASES[key] || null;
}

/** Statuses of sessions that still hold their time slot */
export const SLOT_HOLDING_STATUSES = new Set<string>(['PENDING', 'PENDING_PAYMENT', 'CONFIRMED', 'RESCHEDULED']);
/** Statuses of sessions that are still to happen */
export const UPCOMING_STATUSES = new Set<string>(['PENDING', 'CONFIRMED', 'RESCHEDULED']);
