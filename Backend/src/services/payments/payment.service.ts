import crypto from 'crypto';
import { getDatabase } from '../../db/mongodb';
import { config } from '../../config';
import { cacheService } from '../cache.service';
import { dispatchBookingConfirmed } from '../booking-confirmation.service';
import { BookingInputError, buildBookingDoc, insertBooking } from '../booking-create';
import { resolveConsultant } from '../booking-refs';
import { consultantBookingBlockReason } from '../live-content';
import { slotUnavailableReason } from '../booking-slots';
import { bookingStatusOf, normalizePaymentStatus } from '../booking-status';
import { bookingInstant } from '../booking-time';
import { MailService } from '../mail.service';
import { portalUrl, WEBSITE_URL } from '../email-layout';
import { getActivePaymentProvider, getPaymentProvider } from './index';
import { PaymentGatewayError, VerifyResult, WebhookEvent } from './provider';

/**
 * Payment document (collection `Payment`). Amounts are integers in paise.
 *
 * status: CREATED → PAID → (REFUND_PENDING | PARTIALLY_REFUNDED | REFUNDED)
 *         CREATED → FAILED | EXPIRED (a late successful payment can still move these to PAID)
 */
export type PaymentStatus = 'CREATED' | 'PAID' | 'FAILED' | 'EXPIRED' | 'REFUND_PENDING' | 'PARTIALLY_REFUNDED' | 'REFUNDED';

const PAYMENTS = 'Payment';
const FINALIZABLE: PaymentStatus[] = ['CREATED', 'FAILED', 'EXPIRED'];
const REFUNDABLE: PaymentStatus[] = ['PAID', 'PARTIALLY_REFUNDED', 'REFUND_PENDING'];

export const toPaise = (rupees: number) => Math.round(Number(rupees) * 100);
export const toRupees = (paise: number) => Math.round(Number(paise || 0)) / 100;

function newId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36).toUpperCase()}${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
}

/** The chosen time slot is taken, blocked or not offered (HTTP 409) */
export class SlotUnavailableError extends PaymentGatewayError {
  status = 409;
  constructor(message: string) {
    super(message);
    this.name = 'SlotUnavailableError';
  }
}

function idQuery(id: string): any {
  return { $or: [{ id }, { _id: id }] };
}

/**
 * Server-side price resolution. Client-supplied amounts are never used.
 */
export async function resolveSessionPrice(serviceId?: string, consultantId?: string): Promise<{ amount: number; serviceTitle?: string; durationMinutes?: number }> {
  const db = getDatabase();
  if (serviceId) {
    const service: any = await db.collection('Service').findOne(idQuery(serviceId)) ||
                         await db.collection('services').findOne(idQuery(serviceId));
    if (service && Number(service.price) > 0) {
      return { amount: Number(service.price), serviceTitle: service.name || service.title, durationMinutes: service.duration };
    }
  }
  if (consultantId) {
    const consultant: any = await db.collection('Consultant').findOne(idQuery(consultantId)) ||
                            await db.collection('consultants').findOne(idQuery(consultantId));
    if (consultant && Number(consultant.minPrice) > 0) {
      return { amount: Number(consultant.minPrice) };
    }
  }
  return { amount: config.payment.defaultSessionFee };
}

/** Booking writes: live (Prisma) bookings are keyed by _id in `Booking`; backend bookings by `id` in both collections */
async function updateBooking(payment: any, set: Record<string, any>): Promise<void> {
  const db = getDatabase();
  const update = { $set: { ...set, updatedAt: new Date() } };
  if (payment.bookingSource === 'live') {
    await db.collection('Booking').updateOne({ _id: payment.bookingId }, update);
  } else {
    await Promise.all([
      db.collection('Booking').updateMany({ id: payment.bookingId }, update),
      db.collection('bookings').updateMany({ id: payment.bookingId }, update).catch(() => {})
    ]);
  }
  cacheService.invalidateTags(['bookings', 'stats', 'revenue', 'payments']);
}

/**
 * Lazily expires abandoned checkouts so they don't hold slots or show as pending revenue.
 */
export async function expireStalePayments(): Promise<void> {
  const db = getDatabase();
  const cutoff = new Date(Date.now() - config.payment.pendingExpiryMinutes * 60 * 1000);
  const set = { $set: { status: 'EXPIRED', paymentStatus: 'EXPIRED', updatedAt: new Date() } };
  await Promise.all([
    db.collection(PAYMENTS).updateMany({ status: 'CREATED', createdAt: { $lt: cutoff } }, { $set: { status: 'EXPIRED', updatedAt: new Date() } }),
    db.collection('Booking').updateMany({ status: 'PENDING_PAYMENT', createdAt: { $lt: cutoff } }, set),
    db.collection('bookings').updateMany({ status: 'PENDING_PAYMENT', createdAt: { $lt: cutoff } }, set).catch(() => {})
  ]).catch((err) => console.warn('[Payments] Expiry sweep failed:', err?.message));
}

export interface BackendOrderInput {
  consultantId: string;
  consultantName?: string;
  consultantAvatar?: string;
  serviceId?: string;
  serviceTitle?: string;
  scheduledAt?: string;
  date?: string;
  time?: string;
  durationMinutes?: number;
  notes?: string;
  clientId?: string;
  clientName?: string;
  clientEmail?: string;
  clientPhone?: string;
}

/**
 * Client dashboard flow: creates a PENDING_PAYMENT booking and a gateway order for it.
 */
export async function createOrderForNewBooking(input: BackendOrderInput) {
  const provider = getActivePaymentProvider();
  await expireStalePayments();

  // Same canonical booking as POST /api/bookings: real consultant/client/service ids, India-time scheduledAt,
  // server price (client-supplied amounts are never used)
  let booking: Record<string, any>;
  try {
    booking = await buildBookingDoc(
      { ...input, clientEmail: (input.clientEmail || '').toLowerCase() },
      { canSetPayment: false, requireBookable: true, overrides: { status: 'PENDING_PAYMENT', paymentStatus: 'PENDING' } }
    );
  } catch (err) {
    if (err instanceof BookingInputError) throw new PaymentGatewayError(err.message);
    throw err;
  }
  if (!booking.scheduledAt) throw new PaymentGatewayError('Please pick a date and time slot for the session.');

  // The slot must be offered by the consultant and not blocked or booked by someone else
  const consultant = await resolveConsultant({ id: booking.consultantId });
  const reason = await slotUnavailableReason(consultant, booking.scheduledAt, booking.durationMinutes);
  if (reason) throw new SlotUnavailableError(reason);

  await insertBooking(booking);
  const bookingId = booking.id;

  return createPaymentForBooking(provider, {
    bookingId,
    bookingSource: 'backend',
    amount: booking.amount,
    clientId: booking.clientId || booking.clientEmail || bookingId,
    clientName: booking.clientName,
    clientEmail: booking.clientEmail,
    clientPhone: booking.clientPhone,
    consultantId: booking.consultantId,
    consultantName: booking.consultantName,
    serviceTitle: booking.serviceTitle,
    scheduledAt: booking.scheduledAt,
    date: booking.date,
    time: booking.time
  });
}

/**
 * Live website flow: the booking already exists (created by Prisma with status PENDING_PAYMENT).
 */
export async function createOrderForLiveBooking(liveBookingId: string) {
  const provider = getActivePaymentProvider();
  const db = getDatabase();
  await expireStalePayments();

  const booking: any = await db.collection('Booking').findOne({ _id: liveBookingId as any });
  if (!booking) throw new PaymentGatewayError('Booking not found');
  if (booking.status !== 'PENDING_PAYMENT') throw new PaymentGatewayError('This booking is not awaiting payment');

  const [user, consultant, service]: any[] = await Promise.all([
    db.collection('User').findOne({ _id: booking.userId }),
    db.collection('Consultant').findOne({ _id: booking.consultantId }),
    db.collection('Service').findOne({ _id: booking.serviceId })
  ]);
  if (!service || !(Number(service.price) > 0)) throw new PaymentGatewayError('This service has no valid price');
  const blockReason = consultantBookingBlockReason(consultant);
  if (blockReason) throw new PaymentGatewayError(blockReason);

  await db.collection('Booking').updateOne(
    { _id: liveBookingId as any },
    { $set: { amount: Number(service.price), paymentStatus: 'PENDING', updatedAt: new Date() } }
  );

  return createPaymentForBooking(provider, {
    bookingId: liveBookingId,
    bookingSource: 'live',
    amount: Number(service.price),
    clientId: String(booking.userId),
    clientName: user?.name || 'Customer',
    clientEmail: (user?.email || '').toLowerCase(),
    clientPhone: user?.phoneNumber || user?.phone || '',
    consultantId: String(booking.consultantId),
    consultantName: consultant?.name,
    serviceTitle: service.name,
    // Website bookings are paid first and scheduled later: no session time yet
    scheduledAt: booking.scheduledAt || undefined
  });
}

async function createPaymentForBooking(provider: ReturnType<typeof getActivePaymentProvider>, snapshot: Record<string, any>) {
  const db = getDatabase();
  const paymentId = newId('PAY');
  const amountPaise = toPaise(snapshot.amount);
  const currency = config.payment.currency;

  const order = await provider.createOrder({
    paymentId,
    amountPaise,
    currency,
    customer: {
      id: snapshot.clientId,
      name: snapshot.clientName,
      email: snapshot.clientEmail,
      phone: snapshot.clientPhone
    },
    description: `${snapshot.serviceTitle || 'Consultation'}${snapshot.consultantName ? ` with ${snapshot.consultantName}` : ''}`.slice(0, 250),
    notes: { bookingId: String(snapshot.bookingId) }
  });

  const now = new Date();
  const { amount: _rupees, ...rest } = snapshot;
  const payment = {
    id: paymentId,
    ...rest,
    provider: provider.name,
    providerOrderId: order.providerOrderId,
    amount: amountPaise,
    currency,
    status: 'CREATED' as PaymentStatus,
    refundedAmount: 0,
    refunds: [],
    createdAt: now,
    updatedAt: now
  };
  await db.collection(PAYMENTS).insertOne(payment);
  await updateBooking(payment, { paymentId });

  return {
    paymentId,
    bookingId: snapshot.bookingId,
    amount: toRupees(amountPaise),
    currency,
    checkout: order.checkout
  };
}

export async function getPayment(paymentId: string): Promise<any> {
  return getDatabase().collection(PAYMENTS).findOne({ id: paymentId });
}

/**
 * Idempotently marks a payment PAID and confirms its booking.
 * Returns newlyConfirmed=true only for the caller that performed the transition.
 */
export async function finalizePayment(payment: any, result: VerifyResult) {
  const db = getDatabase();
  const updated: any = await db.collection(PAYMENTS).findOneAndUpdate(
    { id: payment.id, status: { $in: FINALIZABLE } },
    {
      $set: {
        status: 'PAID',
        providerPaymentId: result.providerPaymentId || payment.providerPaymentId,
        method: result.method || payment.method,
        paidAt: new Date(),
        updatedAt: new Date()
      }
    },
    { returnDocument: 'after' }
  );

  if (!updated) {
    return { newlyConfirmed: false, payment: await getPayment(payment.id) };
  }

  await updateBooking(updated, {
    status: 'CONFIRMED',
    paymentStatus: 'PAID',
    amount: toRupees(updated.amount),
    paymentId: updated.id
  });

  // Website bookings carry no session time yet (the team schedules them after payment)
  const isLive = updated.bookingSource === 'live';
  const booking: any = isLive ? null : await getDatabase().collection('Booking').findOne({ id: updated.bookingId }).catch(() => null);
  await dispatchBookingConfirmed({
    id: updated.bookingId,
    clientId: updated.clientId,
    clientName: updated.clientName,
    clientEmail: updated.clientEmail,
    clientPhone: updated.clientPhone,
    consultantId: updated.consultantId,
    consultantName: updated.consultantName,
    consultantAvatar: booking?.consultantAvatar,
    serviceTitle: updated.serviceTitle,
    scheduledAt: updated.scheduledAt,
    date: updated.date,
    time: updated.time,
    durationMinutes: booking?.durationMinutes,
    meetingLink: booking?.meetingLink,
    amountPaid: toRupees(updated.amount),
    toBeScheduled: isLive
  });

  return { newlyConfirmed: true, payment: updated };
}

/** Where a client can try booking again after a failed payment */
function retryUrlFor(payment: any): string {
  return payment.bookingSource === 'live' ? WEBSITE_URL : portalUrl('/client/sessions');
}

export async function markPaymentFailed(payment: any, reason?: string, providerPaymentId?: string): Promise<void> {
  const db = getDatabase();
  const res = await db.collection(PAYMENTS).updateOne(
    { id: payment.id, status: 'CREATED' },
    { $set: { status: 'FAILED', failureReason: reason || 'Payment failed', providerPaymentId: providerPaymentId || payment.providerPaymentId, updatedAt: new Date() } }
  );
  if (res.modifiedCount) {
    await updateBooking(payment, { paymentStatus: 'FAILED' });
    if (payment.clientEmail) {
      await MailService.sendPaymentFailed({
        clientName: payment.clientName || 'there',
        clientEmail: payment.clientEmail,
        consultantName: payment.consultantName,
        serviceTitle: payment.serviceTitle,
        amount: toRupees(payment.amount),
        reason,
        paymentId: payment.id,
        retryUrl: retryUrlFor(payment)
      });
    }
  }
}

/** Emails the client about a refund's progress */
async function emailRefund(payment: any, refund: { id?: string; amount: number; status: 'PENDING' | 'SUCCESS' | 'FAILED'; reason?: string }): Promise<void> {
  if (!payment?.clientEmail || !(refund.amount > 0)) return;
  await MailService.sendRefundUpdate({
    clientName: payment.clientName || 'there',
    clientEmail: payment.clientEmail,
    amount: toRupees(refund.amount),
    status: refund.status,
    consultantName: payment.consultantName,
    serviceTitle: payment.serviceTitle,
    bookingId: payment.bookingId,
    refundId: refund.id
  });
}

/** Recomputes refundedAmount/status from the refunds array and mirrors it onto the booking */
async function syncRefundState(paymentId: string): Promise<any> {
  const db = getDatabase();
  const payment: any = await getPayment(paymentId);
  if (!payment) return null;

  const refunds: any[] = payment.refunds || [];
  const refundedAmount = refunds.filter((r) => r.status === 'SUCCESS').reduce((sum, r) => sum + Number(r.amount || 0), 0);
  const hasPending = refunds.some((r) => r.status === 'PENDING');

  let status: PaymentStatus = 'PAID';
  if (refundedAmount >= payment.amount) status = 'REFUNDED';
  else if (hasPending) status = 'REFUND_PENDING';
  else if (refundedAmount > 0) status = 'PARTIALLY_REFUNDED';

  await db.collection(PAYMENTS).updateOne({ id: paymentId }, { $set: { status, refundedAmount, updatedAt: new Date() } });
  await updateBooking(payment, { paymentStatus: status, refundedAmount: toRupees(refundedAmount) });
  return { ...payment, status, refundedAmount };
}

export async function refundPayment(paymentId: string, amountRupees: number | undefined, reason: string, adminEmail: string) {
  const db = getDatabase();
  const payment: any = await getPayment(paymentId);
  if (!payment) throw new PaymentGatewayError('Payment not found');
  if (!REFUNDABLE.includes(payment.status)) throw new PaymentGatewayError(`A ${payment.status} payment cannot be refunded`);

  const committed = (payment.refunds || [])
    .filter((r: any) => r.status === 'SUCCESS' || r.status === 'PENDING')
    .reduce((sum: number, r: any) => sum + Number(r.amount || 0), 0);
  const refundable = payment.amount - committed;
  const amountPaise = amountRupees ? toPaise(amountRupees) : refundable;

  if (!(amountPaise > 0) || amountPaise > refundable) {
    throw new PaymentGatewayError(`Refund amount must be between ₹1 and ₹${toRupees(refundable)}`);
  }

  const provider = getPaymentProvider(payment.provider);
  const refundId = newId('RFD');
  const result = await provider.refund(payment, amountPaise, refundId, reason);

  await db.collection(PAYMENTS).updateOne(
    { id: paymentId },
    {
      $push: {
        refunds: {
          id: refundId,
          providerRefundId: result.providerRefundId,
          amount: amountPaise,
          status: result.status,
          reason,
          requestedBy: adminEmail,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      } as any
    }
  );
  await emailRefund(payment, { id: refundId, amount: amountPaise, status: result.status });
  return syncRefundState(paymentId);
}

/**
 * Applies a verified gateway webhook. Safe to receive the same event multiple times.
 */
export async function applyWebhookEvent(providerName: string, event: WebhookEvent): Promise<void> {
  const db = getDatabase();
  if (event.type === 'IGNORED') return;

  if (event.type === 'PAID' || event.type === 'FAILED') {
    const payment: any = await db.collection(PAYMENTS).findOne({ provider: providerName, providerOrderId: event.providerOrderId });
    if (!payment) return;
    if (event.type === 'PAID') {
      await finalizePayment(payment, { status: 'PAID', providerPaymentId: event.providerPaymentId, method: event.method });
    } else {
      await markPaymentFailed(payment, event.reason, event.providerPaymentId);
    }
    return;
  }

  // REFUND
  const lookup: any[] = [];
  if (event.providerOrderId) lookup.push({ providerOrderId: event.providerOrderId });
  if (event.providerPaymentId) lookup.push({ providerPaymentId: event.providerPaymentId });
  if (!lookup.length) return;

  const payment: any = await db.collection(PAYMENTS).findOne({ provider: providerName, $or: lookup });
  if (!payment) return;

  const refunds: any[] = payment.refunds || [];
  const existing = refunds.find((r) =>
    (event.refundId && r.id === event.refundId) || (event.providerRefundId && r.providerRefundId === event.providerRefundId)
  );

  if (existing) {
    const res = await db.collection(PAYMENTS).updateOne(
      { id: payment.id, refunds: { $elemMatch: { id: existing.id, status: { $ne: event.status } } } },
      { $set: { 'refunds.$.status': event.status, 'refunds.$.providerRefundId': event.providerRefundId || existing.providerRefundId, 'refunds.$.updatedAt': new Date() } }
    );
    // Only the delivery that changed the status emails the client (gateways retry webhooks)
    if (res.modifiedCount) await emailRefund(payment, { id: existing.id, amount: existing.amount, status: event.status });
  } else {
    // Refund initiated outside the admin panel (e.g. from the gateway dashboard)
    const refundId = event.refundId || newId('RFD');
    await db.collection(PAYMENTS).updateOne(
      { id: payment.id },
      {
        $push: {
          refunds: {
            id: refundId,
            providerRefundId: event.providerRefundId,
            amount: event.amountPaise || 0,
            status: event.status,
            reason: 'Initiated from gateway dashboard',
            createdAt: new Date(),
            updatedAt: new Date()
          }
        } as any
      }
    );
    await emailRefund(payment, { id: refundId, amount: event.amountPaise || 0, status: event.status });
  }
  await syncRefundState(payment.id);
}

const escapeRx = (v: string) => v.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Bookings an administrator marked paid without a gateway payment, listed as MANUAL transactions
 * (provider 'manual', method 'MANUAL') so the admin transactions view matches revenue.
 */
async function listManualPayments(filters: { status?: string; provider?: string; from?: string; to?: string; q?: string }) {
  if (filters.provider && String(filters.provider).toLowerCase() !== 'manual') return [];
  const db = getDatabase();
  const bookings: any[] = await db.collection('Booking').find({
    paymentStatus: { $regex: '^(paid|partially[ _]refunded|refund[ _]pending|refunded)$', $options: 'i' },
    $or: [{ paymentId: { $exists: false } }, { paymentId: null }, { paymentId: '' }]
  }).toArray().catch(() => []);

  // Website bookings store only ids
  const idsOf = (field: string, missing: string) => bookings.filter((b) => !b[missing] && b[field]).map((b) => b[field]);
  const [users, consultants, services]: any[][] = await Promise.all([
    db.collection('User').find({ _id: { $in: idsOf('userId', 'clientEmail') } }).toArray().catch(() => []),
    db.collection('Consultant').find({ _id: { $in: idsOf('consultantId', 'consultantName') } }).toArray().catch(() => []),
    db.collection('Service').find({ _id: { $in: idsOf('serviceId', 'serviceTitle') } }).toArray().catch(() => [])
  ]);
  const byId = (docs: any[]) => new Map(docs.map((d) => [String(d._id), d]));
  const userMap = byId(users);
  const consultantMap = byId(consultants);
  const serviceMap = byId(services);

  const status = filters.status ? String(filters.status).toUpperCase() : '';
  const from = filters.from ? new Date(filters.from).getTime() : NaN;
  const to = filters.to ? new Date(`${filters.to}T23:59:59.999Z`).getTime() : NaN;
  const q = filters.q ? new RegExp(escapeRx(String(filters.q)), 'i') : null;

  return bookings
    .filter((b) => !['PENDING_PAYMENT', 'EXPIRED'].includes(bookingStatusOf(b)))
    .map((b) => {
      const user = userMap.get(String(b.userId));
      const consultant = consultantMap.get(String(b.consultantId));
      const service = serviceMap.get(String(b.serviceId));
      const bookingId = String(b.id || b._id);
      const amount = Number(b.amount);
      const refunded = Number(b.refundedAmount);
      return {
        id: `MANUAL-${bookingId}`,
        bookingId,
        bookingSource: b.id ? 'backend' : 'live',
        provider: 'manual',
        method: 'MANUAL',
        manual: true,
        amount: Number.isFinite(amount) ? amount : 0,
        currency: config.payment.currency,
        status: normalizePaymentStatus(b.paymentStatus) || 'PAID',
        refundedAmount: Number.isFinite(refunded) ? refunded : 0,
        refunds: [],
        clientId: String(b.clientId || b.userId || ''),
        clientName: b.clientName || user?.name || 'Client',
        clientEmail: String(b.clientEmail || user?.email || '').toLowerCase(),
        consultantId: String(b.consultantId || b.therapistId || ''),
        consultantName: b.consultantName || b.therapistName || consultant?.name || '',
        serviceTitle: b.serviceTitle || service?.name || service?.title || '',
        scheduledAt: bookingInstant(b),
        date: b.date,
        time: b.time,
        paidAt: b.updatedAt || b.createdAt,
        createdAt: b.createdAt,
        updatedAt: b.updatedAt
      };
    })
    .filter((p) => {
      if (status && p.status !== status) return false;
      const created = new Date(p.createdAt || 0).getTime();
      if (!isNaN(from) && created < from) return false;
      if (!isNaN(to) && created > to) return false;
      if (q && ![p.id, p.bookingId, p.clientName, p.clientEmail, p.consultantName].some((v) => q.test(String(v || '')))) return false;
      return true;
    });
}

/** Admin listing with booking-facing fields in rupees: gateway payments plus manually recorded paid bookings */
export async function listPayments(filters: { status?: string; provider?: string; from?: string; to?: string; q?: string }) {
  const db = getDatabase();
  await expireStalePayments();

  const query: any = {};
  if (filters.status) query.status = String(filters.status).toUpperCase();
  if (filters.provider) query.provider = String(filters.provider).toLowerCase();
  if (filters.from || filters.to) {
    query.createdAt = {};
    if (filters.from) query.createdAt.$gte = new Date(filters.from);
    if (filters.to) query.createdAt.$lte = new Date(`${filters.to}T23:59:59.999Z`);
  }
  if (filters.q) {
    const rx = { $regex: String(filters.q).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' };
    query.$or = [{ id: rx }, { bookingId: rx }, { clientName: rx }, { clientEmail: rx }, { consultantName: rx }, { providerOrderId: rx }, { providerPaymentId: rx }];
  }

  const [payments, manual] = await Promise.all([
    db.collection(PAYMENTS).find(query).sort({ createdAt: -1 }).limit(500).toArray(),
    listManualPayments(filters)
  ]);
  return [...payments.map(serializePayment), ...manual]
    .sort((x: any, y: any) => new Date(y.createdAt || 0).getTime() - new Date(x.createdAt || 0).getTime())
    .slice(0, 500);
}

export function serializePayment(p: any) {
  const { _id, ...rest } = p || {};
  return {
    ...rest,
    amount: toRupees(p.amount),
    refundedAmount: toRupees(p.refundedAmount),
    refunds: (p.refunds || []).map((r: any) => ({ ...r, amount: toRupees(r.amount) }))
  };
}
