import crypto from 'crypto';
import { config } from '../../config';
import {
  CreateOrderInput,
  CreateOrderResult,
  PaymentGatewayError,
  PaymentProvider,
  RefundResult,
  VerifyResult,
  WebhookEvent
} from './provider';

const API_BASE = 'https://api.razorpay.com/v1';

function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(String(a || ''));
  const bb = Buffer.from(String(b || ''));
  return ba.length === bb.length && ba.length > 0 && crypto.timingSafeEqual(ba, bb);
}

async function razorpayRequest(method: string, path: string, body?: any): Promise<any> {
  const { keyId, keySecret } = config.payment.razorpay;
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      Authorization: `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString('base64')}`,
      'Content-Type': 'application/json'
    },
    body: body ? JSON.stringify(body) : undefined
  });
  const data: any = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new PaymentGatewayError(data?.error?.description || `Razorpay ${method} ${path} failed (${res.status})`, data);
  }
  return data;
}

export const razorpayProvider: PaymentProvider = {
  name: 'razorpay',

  isConfigured() {
    const { keyId, keySecret } = config.payment.razorpay;
    return Boolean(keyId && keySecret);
  },

  async createOrder(input: CreateOrderInput): Promise<CreateOrderResult> {
    const order = await razorpayRequest('POST', '/orders', {
      amount: input.amountPaise,
      currency: input.currency,
      receipt: input.paymentId,
      payment_capture: 1,
      notes: { paymentId: input.paymentId, ...(input.notes || {}) }
    });

    return {
      providerOrderId: order.id,
      checkout: {
        provider: 'razorpay',
        keyId: config.payment.razorpay.keyId,
        orderId: order.id,
        amount: input.amountPaise,
        currency: input.currency,
        description: input.description,
        prefill: {
          name: input.customer.name || '',
          email: input.customer.email || '',
          contact: input.customer.phone || ''
        }
      }
    };
  },

  async verifyPayment(payment: any, clientResponse: Record<string, any>): Promise<VerifyResult> {
    const providerPaymentId = String(clientResponse?.razorpay_payment_id || payment.providerPaymentId || '');
    const signature = String(clientResponse?.razorpay_signature || '');

    if (!providerPaymentId) {
      return { status: 'PENDING' };
    }

    // If the browser handed us a signature it must be valid for this order
    if (signature) {
      const expected = crypto
        .createHmac('sha256', config.payment.razorpay.keySecret)
        .update(`${payment.providerOrderId}|${providerPaymentId}`)
        .digest('hex');
      if (!safeEqual(expected, signature)) {
        throw new PaymentGatewayError('Invalid Razorpay payment signature');
      }
    }

    // Always confirm with the gateway (source of truth)
    let rpPayment = await razorpayRequest('GET', `/payments/${encodeURIComponent(providerPaymentId)}`);
    if (rpPayment.order_id !== payment.providerOrderId || Number(rpPayment.amount) !== Number(payment.amount)) {
      throw new PaymentGatewayError('Razorpay payment does not match this order');
    }

    if (rpPayment.status === 'authorized') {
      rpPayment = await razorpayRequest('POST', `/payments/${encodeURIComponent(providerPaymentId)}/capture`, {
        amount: payment.amount,
        currency: payment.currency
      }).catch(() => rpPayment);
    }

    if (rpPayment.status === 'captured') {
      return { status: 'PAID', providerPaymentId, method: rpPayment.method };
    }
    if (rpPayment.status === 'failed') {
      return { status: 'FAILED', providerPaymentId, failureReason: rpPayment.error_description || 'Payment failed' };
    }
    return { status: 'PENDING', providerPaymentId };
  },

  verifyWebhookSignature(rawBody: Buffer, headers: Record<string, any>): boolean {
    const secret = config.payment.razorpay.webhookSecret;
    if (!secret) return false;
    const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
    return safeEqual(expected, String(headers['x-razorpay-signature'] || ''));
  },

  parseWebhook(body: any): WebhookEvent {
    const event = String(body?.event || '');
    const pay = body?.payload?.payment?.entity;
    const refund = body?.payload?.refund?.entity;

    if ((event === 'payment.captured' || event === 'order.paid') && pay?.order_id) {
      return { type: 'PAID', providerOrderId: pay.order_id, providerPaymentId: pay.id, method: pay.method };
    }
    if (event === 'payment.failed' && pay?.order_id) {
      return { type: 'FAILED', providerOrderId: pay.order_id, providerPaymentId: pay.id, reason: pay.error_description };
    }
    if ((event === 'refund.processed' || event === 'refund.failed' || event === 'refund.created') && refund) {
      return {
        type: 'REFUND',
        providerPaymentId: refund.payment_id,
        providerRefundId: refund.id,
        refundId: refund.notes?.refundId,
        amountPaise: Number(refund.amount),
        status: event === 'refund.processed' ? 'SUCCESS' : event === 'refund.failed' ? 'FAILED' : 'PENDING'
      };
    }
    return { type: 'IGNORED' };
  },

  async refund(payment: any, amountPaise: number, refundId: string, reason?: string): Promise<RefundResult> {
    if (!payment.providerPaymentId) {
      throw new PaymentGatewayError('This payment has no Razorpay payment id to refund');
    }
    const refund = await razorpayRequest('POST', `/payments/${encodeURIComponent(payment.providerPaymentId)}/refund`, {
      amount: amountPaise,
      receipt: refundId,
      notes: { refundId, reason: reason || '' }
    });
    return {
      providerRefundId: refund.id,
      status: refund.status === 'processed' ? 'SUCCESS' : refund.status === 'failed' ? 'FAILED' : 'PENDING'
    };
  }
};
