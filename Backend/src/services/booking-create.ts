import crypto from 'crypto';
import { getDatabase } from '../db/mongodb';
import { config } from '../config';
import { cacheService } from './cache.service';
import { dispatchBookingConfirmed } from './booking-confirmation.service';
import { resolveClientUser, resolveConsultant, resolveService } from './booking-refs';
import { consultantBookingBlockReason, isConsultantBookable } from './live-content';
import { normalizeBookingStatus, normalizePaymentStatus, UPCOMING_STATUSES } from './booking-status';
import { isToBeScheduled, istLabels, resolveScheduledAt, ScheduleError } from './booking-time';

const DEFAULT_MEETING_LINK = 'https://meet.google.com/hex-pert-ify';

/** A booking request the caller got wrong; `status` is the HTTP status to answer with */
export class BookingInputError extends Error {
  constructor(message: string, public status = 400) {
    super(message);
    this.name = 'BookingInputError';
  }
}

export function newBookingId(): string {
  return `BK-${Date.now().toString(36).toUpperCase()}${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
}

/** Drops undefined fields so they are not stored as nulls */
function compact<T extends Record<string, any>>(doc: T): T {
  Object.keys(doc).forEach((k) => doc[k] === undefined && delete doc[k]);
  return doc;
}

export interface BuildOptions {
  /** Administrators may record the amount and payment status; everyone else gets the server price, UNPAID */
  canSetPayment?: boolean;
  /** Fixed values that override the body (e.g. the payment flow's PENDING_PAYMENT) */
  overrides?: Record<string, any>;
  /** Server price; by default the service price, else the consultant's minimum price, else the configured session fee */
  price?: number;
  /** Refuse consultants who are archived, inactive/suspended or have booking switched off (non-admin callers) */
  requireBookable?: boolean;
}

/**
 * Builds a canonical booking document from a request body: the consultant is resolved to a real Consultant
 * `_id`, the client to their User `_id` (userId), the service by id or title, statuses are normalised and the
 * session instant is computed in India time. `_id` equals `id` so the website (Prisma) can read the booking.
 * Throws BookingInputError for unknown consultants, invalid statuses and invalid dates.
 */
export async function buildBookingDoc(body: any, opts: BuildOptions = {}): Promise<Record<string, any>> {
  const consultant = await resolveConsultant({ id: body.consultantId || body.therapistId, email: body.consultantEmail || body.therapistEmail });
  if (!consultant) throw new BookingInputError('Unknown consultant. Send the consultant\'s id or email.');
  if (opts.requireBookable && !isConsultantBookable(consultant)) {
    throw new BookingInputError(consultantBookingBlockReason(consultant) || 'This therapist cannot be booked right now.');
  }
  const consultantId = String(consultant._id);

  const [user, service] = await Promise.all([
    resolveClientUser({ id: body.clientId || body.userId, email: body.clientEmail }),
    resolveService({ id: body.serviceId, title: body.serviceTitle || body.service, consultantId })
  ]);

  const rawStatus = opts.overrides?.status ?? body.status;
  const status = rawStatus === undefined || rawStatus === '' ? 'CONFIRMED' : normalizeBookingStatus(rawStatus);
  if (!status) throw new BookingInputError(`Unknown booking status "${rawStatus}"`);

  const price = opts.price ??
    (Number(service?.price) > 0 ? Number(service.price) : Number(consultant.minPrice) > 0 ? Number(consultant.minPrice) : config.payment.defaultSessionFee);
  let paymentStatus: string;
  let amount: number;
  if (opts.canSetPayment) {
    paymentStatus = body.paymentStatus ? normalizePaymentStatus(body.paymentStatus) || '' : 'PAID';
    if (!paymentStatus) throw new BookingInputError(`Unknown payment status "${body.paymentStatus}"`);
    const given = Number(body.amount);
    amount = Number.isFinite(given) && given > 0 ? given : price;
  } else {
    paymentStatus = 'UNPAID';
    amount = price;
  }

  let scheduledAt: Date | undefined;
  try {
    scheduledAt = resolveScheduledAt(body);
  } catch (err) {
    if (err instanceof ScheduleError) throw new BookingInputError(err.message);
    throw err;
  }
  const labels = scheduledAt ? istLabels(scheduledAt) : null;

  const id = String(body.id || newBookingId());
  const now = new Date();
  const doc: Record<string, any> = {
    _id: id,
    id,
    clientId: user ? String(user._id) : (body.clientId ? String(body.clientId) : undefined),
    userId: user ? String(user._id) : undefined,
    clientName: body.clientName || user?.name || 'Client',
    clientEmail: String(body.clientEmail || user?.email || '').toLowerCase().trim(),
    clientPhone: body.clientPhone || user?.phoneNumber || user?.phone || '',
    consultantId,
    // The resolved consultant record wins over names/photos sent by panels (they may be placeholders)
    consultantName: consultant.name || body.consultantName || body.therapistName,
    consultantEmail: String(consultant.email || '').toLowerCase() || undefined,
    consultantAvatar: consultant.photoUrl || consultant.image || body.consultantAvatar || body.therapistAvatar || undefined,
    serviceId: service ? String(service._id) : undefined,
    serviceTitle: body.serviceTitle || body.service || service?.name || service?.title || 'Individual Clinical Consultation',
    date: body.date || labels?.date,
    time: body.time || labels?.time,
    scheduledAt,
    durationMinutes: Math.round(Number(body.durationMinutes)) || Number(service?.duration) || 50,
    amount,
    paymentStatus,
    status,
    meetingLink: body.meetingLink || body.meetingUrl || DEFAULT_MEETING_LINK,
    channel: body.channel || 'Video Call (Google Meet)',
    notes: body.notes || '',
    createdAt: now,
    updatedAt: now,
    ...(opts.overrides || {})
  };
  doc.status = status;
  return compact(doc);
}

/**
 * Stores a booking in `Booking` and its legacy mirror `bookings` with the same `_id`.
 * Idempotent on `id`: returns duplicate=true (and the stored booking) when it already exists.
 */
export async function insertBooking(doc: Record<string, any>): Promise<{ booking: any; duplicate: boolean }> {
  const db = getDatabase();
  const result = await db.collection('Booking').updateOne({ id: doc.id }, { $setOnInsert: doc }, { upsert: true });
  if (!result.upsertedId) {
    return { booking: await db.collection('Booking').findOne({ id: doc.id }), duplicate: true };
  }
  await db.collection('bookings').insertOne({ ...doc } as any).catch(() => {});
  cacheService.invalidateTags(['bookings', 'stats', 'users', 'consultants', 'revenue', 'payouts', 'payments']);
  return { booking: doc, duplicate: false };
}

/**
 * The one way bookings are created outside the payment flow (admin/therapist create, slot assignment):
 * build, store in both collections, then notify client, therapist and admins for upcoming sessions.
 */
export async function createBooking(body: any, opts: BuildOptions & { consultantEmailHint?: string } = {}): Promise<{ booking: any; duplicate: boolean }> {
  const doc = await buildBookingDoc(body, opts);
  const stored = await insertBooking(doc);
  if (!stored.duplicate && UPCOMING_STATUSES.has(doc.status)) {
    await dispatchBookingConfirmed({ ...doc, toBeScheduled: isToBeScheduled(doc) }, opts.consultantEmailHint || doc.consultantEmail);
  }
  return stored;
}
