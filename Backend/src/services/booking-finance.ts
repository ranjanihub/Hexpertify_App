import { bookingStatusOf, normalizePaymentStatus } from './booking-status';

/** Platform share of each session fee; the therapist receives the rest (default 15% → therapist 85%) */
export function platformCommissionRate(): number {
  const rate = Number(process.env.PLATFORM_COMMISSION_RATE);
  return process.env.PLATFORM_COMMISSION_RATE && Number.isFinite(rate) && rate >= 0 && rate < 1 ? rate : 0.15;
}

const PAID_PAYMENT_STATUSES = new Set(['PAID', 'PARTIALLY_REFUNDED', 'REFUND_PENDING']);
// Abandoned/failed checkouts and manually scheduled unpaid sessions carry no revenue
const NON_FINANCIAL_PAYMENT_STATUSES = new Set(['FAILED', 'EXPIRED', 'UNPAID']);

export type FinancialKind = 'paid' | 'pending' | 'refunded' | 'ignore';

/**
 * Classifies a booking financially. Bookings created before gateway integration have no
 * paymentStatus and are treated as paid once confirmed/completed.
 */
export function classifyBooking(b: any, servicePrice?: number): { kind: FinancialKind; fee: number; net: number } {
  const statusStr = bookingStatusOf(b);
  const rawPayment = String(b?.paymentStatus || '').trim();
  const paymentStatusStr = normalizePaymentStatus(rawPayment) || rawPayment.toUpperCase();
  const isLegacy = !paymentStatusStr;
  const feeValue = Number(b?.amount ?? b?.fee ?? b?.price ?? servicePrice ?? 0);
  const fee = Number.isFinite(feeValue) ? feeValue : 0;
  const refundedValue = Number(b?.refundedAmount || 0);
  const refunded = Number.isFinite(refundedValue) ? refundedValue : 0;

  if (statusStr === 'PENDING_PAYMENT' && paymentStatusStr !== 'PENDING') return { kind: 'ignore', fee, net: 0 };
  if (statusStr === 'EXPIRED' || NON_FINANCIAL_PAYMENT_STATUSES.has(paymentStatusStr)) return { kind: 'ignore', fee, net: 0 };
  if (paymentStatusStr === 'REFUNDED') return { kind: 'refunded', fee, net: 0 };
  if (PAID_PAYMENT_STATUSES.has(paymentStatusStr) || (isLegacy && (statusStr === 'CONFIRMED' || statusStr === 'COMPLETED'))) {
    return { kind: 'paid', fee, net: Math.max(0, fee - refunded) };
  }
  if (paymentStatusStr === 'PENDING' || (isLegacy && statusStr === 'PENDING')) return { kind: 'pending', fee, net: 0 };
  return { kind: 'ignore', fee, net: 0 };
}

/**
 * The platform fee for one paid session, from the therapist's plans (Service docs: price, platformFee).
 * Uses the plan with the same price, else the first plan (as a % of it for Percentage therapists).
 * Null when the therapist has no plans, so callers fall back to the default commission rate.
 * Never more than the session amount. Keep in step with getSessionCommission in the admin PaymentsView.
 */
export function planPlatformFee(net: number, plans: any[], feeType?: string): number | null {
  const amount = Number.isFinite(net) ? Math.max(0, net) : 0;
  const usable = (Array.isArray(plans) ? plans : [])
    .filter((p: any) => !p?.retired && Number(p?.price) > 0 && Number.isFinite(Number(p?.platformFee)));
  if (!usable.length) return null;
  const match = usable.find((p: any) => Number(p.price) === amount);
  const plan = match || usable[0];
  const fee = match || feeType !== 'Percentage'
    ? Number(plan.platformFee)
    : Math.round((amount * Number(plan.platformFee)) / Number(plan.price));
  return Math.min(Math.max(0, fee), amount);
}

/** The therapist's share of one paid session: the amount minus the plan's platform fee (default rate without plans) */
export function therapistShareOf(net: number, plans: any[], feeType?: string): number {
  const fee = planPlatformFee(net, plans, feeType);
  return fee === null ? splitFee(net).therapist : Math.max(0, net) - fee;
}

/** Splits a session fee into the platform commission and the therapist's share */
export function splitFee(amount: number): { platform: number; therapist: number } {
  const gross = Number.isFinite(amount) ? amount : 0;
  const therapist = Math.round(gross * (1 - platformCommissionRate()));
  return { platform: gross - therapist, therapist };
}
