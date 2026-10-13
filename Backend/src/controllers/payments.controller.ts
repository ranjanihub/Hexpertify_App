import { Request, Response } from 'express';
import { z } from 'zod';
import { config } from '../config';
import { getPaymentProvider, PaymentGatewayError } from '../services/payments';
import {
  applyWebhookEvent,
  BackendOrderInput,
  createOrderForLiveBooking,
  createOrderForNewBooking,
  finalizePayment,
  getPayment,
  listPayments,
  markPaymentFailed,
  refundPayment,
  serializePayment,
  toRupees
} from '../services/payments/payment.service';

const orderSchema = z.object({
  consultantId: z.string().min(1),
  consultantName: z.string().optional(),
  consultantAvatar: z.string().optional(),
  serviceId: z.string().optional(),
  serviceTitle: z.string().optional(),
  scheduledAt: z.string().optional(),
  date: z.string().optional(),
  time: z.string().optional(),
  durationMinutes: z.coerce.number().int().positive().max(600).optional(),
  notes: z.string().max(2000).optional(),
  clientId: z.string().optional(),
  clientName: z.string().optional(),
  clientEmail: z.string().email().optional().or(z.literal('')),
  clientPhone: z.string().optional()
});

const refundSchema = z.object({
  amount: z.coerce.number().positive().optional(),
  reason: z.string().trim().min(3, 'Please give a reason for the refund').max(500)
});

function sendError(res: Response, error: any, fallback: string): void {
  if (error instanceof z.ZodError) {
    res.status(400).json({ success: false, error: error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ') });
    return;
  }
  if (error instanceof PaymentGatewayError) {
    res.status(400).json({ success: false, error: error.message });
    return;
  }
  console.error(`[Payments] ${fallback}:`, error);
  res.status(500).json({ success: false, error: error?.message || fallback });
}

export class PaymentsController {
  /**
   * POST /api/payments/order
   * Live site (internal key): { source: 'live', bookingId }
   * Client dashboard: booking details (amount is always resolved on the server)
   */
  static async createOrder(req: Request, res: Response): Promise<void> {
    try {
      const body = req.body || {};

      if (body.source === 'live') {
        if (!req.isInternal) {
          res.status(401).json({ success: false, error: 'Live bookings must be initiated by the website server' });
          return;
        }
        const order = await createOrderForLiveBooking(String(body.bookingId || ''));
        res.status(201).json({ success: true, ...order });
        return;
      }

      const input = orderSchema.parse(body);
      // A signed-in client's identity comes from their token, not from the request body
      if (req.user?.role === 'client') {
        input.clientEmail = req.user.email;
        input.clientId = req.user.sub;
      }
      if (!input.clientEmail) {
        res.status(400).json({ success: false, error: 'Client email is required to book a session' });
        return;
      }

      const order = await createOrderForNewBooking(input as BackendOrderInput);
      res.status(201).json({ success: true, ...order });
    } catch (error: any) {
      sendError(res, error, 'Failed to create payment order');
    }
  }

  /**
   * POST /api/payments/verify
   * Body: { paymentId, ...gateway checkout response }
   */
  static async verify(req: Request, res: Response): Promise<void> {
    try {
      const { paymentId, ...gatewayResponse } = req.body || {};
      const payment: any = await getPayment(String(paymentId || ''));
      if (!payment) {
        res.status(404).json({ success: false, error: 'Payment not found' });
        return;
      }

      if (!['CREATED', 'FAILED', 'EXPIRED'].includes(payment.status)) {
        res.json({ success: true, status: payment.status, newlyConfirmed: false, bookingId: payment.bookingId });
        return;
      }

      const provider = getPaymentProvider(payment.provider);
      const result = await provider.verifyPayment(payment, gatewayResponse);

      if (result.status === 'PAID') {
        // The live website sends its own branded emails when it calls us with the internal key
        const dispatchNotifications = !(payment.bookingSource === 'live' && req.isInternal);
        const { newlyConfirmed } = await finalizePayment(payment, result, { dispatchNotifications });
        res.json({
          success: true,
          status: 'PAID',
          newlyConfirmed,
          bookingId: payment.bookingId,
          amount: toRupees(payment.amount)
        });
        return;
      }

      if (result.status === 'FAILED') {
        await markPaymentFailed(payment, result.failureReason, result.providerPaymentId);
        res.status(402).json({ success: false, status: 'FAILED', error: result.failureReason || 'Payment failed' });
        return;
      }

      res.status(202).json({ success: false, status: 'PENDING', error: 'Payment is still being processed. We will confirm your booking shortly.' });
    } catch (error: any) {
      sendError(res, error, 'Failed to verify payment');
    }
  }

  /**
   * POST /api/payments/webhook/:provider  (raw body, signature verified)
   */
  static async webhook(req: Request, res: Response): Promise<void> {
    try {
      const providerName = String(req.params.provider || '').toLowerCase();
      const provider = getPaymentProvider(providerName);
      const rawBody: Buffer = Buffer.isBuffer(req.body) ? req.body : Buffer.from(JSON.stringify(req.body || {}));

      if (!provider.verifyWebhookSignature(rawBody, req.headers as Record<string, any>)) {
        res.status(401).json({ success: false, error: 'Invalid webhook signature' });
        return;
      }

      const event = provider.parseWebhook(JSON.parse(rawBody.toString('utf-8')));
      await applyWebhookEvent(provider.name, event);
      res.json({ success: true });
    } catch (error: any) {
      // A 5xx makes the gateway retry the webhook later
      console.error('[Payments] Webhook processing error:', error);
      res.status(500).json({ success: false, error: 'Webhook processing failed' });
    }
  }

  /**
   * GET /api/admin/payments
   */
  static async list(req: Request, res: Response): Promise<void> {
    try {
      const { status, provider, from, to, q } = req.query as Record<string, string>;
      const payments = await listPayments({ status, provider, from, to, q });

      const summary = payments.reduce(
        (acc, p) => {
          if (['PAID', 'PARTIALLY_REFUNDED', 'REFUND_PENDING', 'REFUNDED'].includes(p.status)) {
            acc.collected += p.amount;
            acc.refunded += p.refundedAmount;
            acc.paidCount += 1;
          }
          if (p.status === 'FAILED') acc.failedCount += 1;
          return acc;
        },
        { collected: 0, refunded: 0, paidCount: 0, failedCount: 0 }
      );

      res.json({
        success: true,
        activeProvider: config.payment.provider,
        count: payments.length,
        summary: { ...summary, net: summary.collected - summary.refunded },
        payments
      });
    } catch (error: any) {
      sendError(res, error, 'Failed to fetch payments');
    }
  }

  /**
   * GET /api/admin/payments/:id
   */
  static async getOne(req: Request, res: Response): Promise<void> {
    try {
      const payment = await getPayment(String(req.params.id));
      if (!payment) {
        res.status(404).json({ success: false, error: 'Payment not found' });
        return;
      }
      res.json({ success: true, payment: serializePayment(payment) });
    } catch (error: any) {
      sendError(res, error, 'Failed to fetch payment');
    }
  }

  /**
   * POST /api/admin/payments/:id/refund  { amount?: rupees, reason }
   */
  static async refund(req: Request, res: Response): Promise<void> {
    try {
      const { amount, reason } = refundSchema.parse(req.body || {});
      const payment = await refundPayment(String(req.params.id), amount, reason, req.user?.email || 'admin');
      res.json({ success: true, payment: serializePayment(payment) });
    } catch (error: any) {
      sendError(res, error, 'Failed to refund payment');
    }
  }
}
