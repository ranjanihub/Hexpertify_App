import crypto from 'crypto';
import { getDatabase } from '../../db/mongodb';
import { config } from '../../config';
import { cacheService } from '../cache.service';
import { dispatchBookingConfirmed, notifyBookingConfirmed } from '../booking-confirmation.service';
import { sendPushToClient } from '../push.service';
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
  const db = getDatabase();
  await expireStalePayments();

  const price = await resolveSessionPrice(input.serviceId, input.consultantId);
  const bookingId = newId('BK');
  const now = new Date();

  const booking = {
    id: bookingId,
    clientId: input.clientId,
    clientName: input.clientName || 'Client',
    clientEmail: (input.clientEmail || '').toLowerCase(),
    clientPhone: input.clientPhone || '',
    consultantId: input.consultantId,
    consultantName: input.consultantName,
    consultantAvatar: input.consultantAvatar,
    serviceId: input.serviceId,
    serviceTitle: input.serviceTitle || price.serviceTitle || 'Individual Clinical Consultation',
    date: input.date,
    time: input.time,
    scheduledAt: input.scheduledAt ? new Date(input.scheduledAt) : now,
    durationMinutes: input.durationMinutes || price.durationMinutes || 50,
    amount: price.amount,
    paymentStatus: 'PENDING',
    status: 'PENDING_PAYMENT',
    meetingLink: 'https://meet.google.com/hex-pert-ify',
    channel: 'Video Call (Google Meet)',
    notes: input.notes || '',
    createdAt: now,
    updatedAt: now
  };

  await db.collection('Booking').insertOne({ ...booking });
  await db.collection('bookings').insertOne({ ...booking }).catch(() => {});

  return createPaymentForBooking(provider, {
    bookingId,
    bookingSource: 'backend',
    amount: price.amount,
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
    scheduledAt: booking.createdAt
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
export async function finalizePayment(payment: any, result: VerifyResult, opts: { dispatchNotifications: boolean }) {
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

  if (opts.dispatchNotifications) {
    await dispatchBookingConfirmed({
      id: updated.bookingId,
      clientId: updated.clientId,
      clientName: updated.clientName,
      clientEmail: updated.clientEmail,
      consultantId: updated.consultantId,
      consultantName: updated.consultantName,
      serviceTitle: updated.serviceTitle,
      scheduledAt: updated.scheduledAt,
      date: updated.date,
      time: updated.time
    });
  } else {
    // The live website sends its own emails; in-app and push notifications still go out
    const when = updated.scheduledAt ? new Date(updated.scheduledAt) : null;
    const date = updated.date || (when && !isNaN(when.getTime()) ? when.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'the scheduled date');
    const time = updated.time || (when && !isNaN(when.getTime()) ? when.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '');
    const consultant: any = updated.consultantId
      ? await getDatabase().collection('Consultant').findOne({ $or: [{ _id: updated.consultantId }, { id: updated.consultantId }] }).catch(() => null)
      : null;
    await Promise.allSettled([
      notifyBookingConfirmed({ ...updated, id: updated.bookingId }, consultant?.email || '', date, time),
      sendPushToClient({ email: updated.clientEmail, id: updated.clientId }, {
        title: 'Session confirmed 📅',
        body: `Your payment was received and your ${updated.serviceTitle || 'therapy'} session${updated.consultantName ? ` with ${updated.consultantName}` : ''} is confirmed.`,
        tag: `booking-${updated.bookingId}`
      })
    ]);
  }

  return { newlyConfirmed: true, payment: updated };
}

export async function markPaymentFailed(payment: any, reason?: string, providerPaymentId?: string): Promise<void> {
  const db = getDatabase();
  const res = await db.collection(PAYMENTS).updateOne(
    { id: payment.id, status: 'CREATED' },
    { $set: { status: 'FAILED', failureReason: reason || 'Payment failed', providerPaymentId: providerPaymentId || payment.providerPaymentId, updatedAt: new Date() } }
  );
  if (res.modifiedCount) {
    await updateBooking(payment, { paymentStatus: 'FAILED' });
  }
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
      await finalizePayment(payment, { status: 'PAID', providerPaymentId: event.providerPaymentId, method: event.method }, { dispatchNotifications: true });
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
    await db.collection(PAYMENTS).updateOne(
      { id: payment.id, 'refunds.id': existing.id },
      { $set: { 'refunds.$.status': event.status, 'refunds.$.providerRefundId': event.providerRefundId || existing.providerRefundId, 'refunds.$.updatedAt': new Date() } }
    );
  } else {
    // Refund initiated outside the admin panel (e.g. from the gateway dashboard)
    await db.collection(PAYMENTS).updateOne(
      { id: payment.id },
      {
        $push: {
          refunds: {
            id: event.refundId || newId('RFD'),
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
  }
  await syncRefundState(payment.id);
}

/** Admin listing with booking-facing fields in rupees */
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

  const payments = await db.collection(PAYMENTS).find(query).sort({ createdAt: -1 }).limit(500).toArray();
  return payments.map(serializePayment);
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
