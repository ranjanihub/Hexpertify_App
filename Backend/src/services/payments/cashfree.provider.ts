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

function apiBase(): string {
  return config.payment.cashfree.env === 'production' ? 'https://api.cashfree.com/pg' : 'https://sandbox.cashfree.com/pg';
}

async function cashfreeRequest(method: string, path: string, body?: any): Promise<any> {
  const { appId, secretKey, apiVersion } = config.payment.cashfree;
  const res = await fetch(`${apiBase()}${path}`, {
    method,
    headers: {
      'x-client-id': appId,
      'x-client-secret': secretKey,
      'x-api-version': apiVersion,
      'Content-Type': 'application/json'
    },
    body: body ? JSON.stringify(body) : undefined
  });
  const data: any = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new PaymentGatewayError(data?.message || `Cashfree ${method} ${path} failed (${res.status})`, data);
  }
  return data;
}

const toRupees = (paise: number) => Math.round(Number(paise)) / 100;

/** Cashfree requires a 10-digit phone and an alphanumeric customer id */
function normalizePhone(phone?: string): string {
  const digits = String(phone || '').replace(/\D/g, '');
  return digits.length >= 10 ? digits.slice(-10) : '9999999999';
}

function normalizeCustomerId(id: string): string {
  return String(id || 'guest').replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 50) || 'guest';
}

function mapRefundStatus(status: string): 'PENDING' | 'SUCCESS' | 'FAILED' {
  const s = String(status || '').toUpperCase();
  if (s === 'SUCCESS') return 'SUCCESS';
  if (s === 'CANCELLED' || s === 'FAILED') return 'FAILED';
  return 'PENDING';
}

export const cashfreeProvider: PaymentProvider = {
  name: 'cashfree',

  isConfigured() {
    const { appId, secretKey } = config.payment.cashfree;
    return Boolean(appId && secretKey);
  },

  async createOrder(input: CreateOrderInput): Promise<CreateOrderResult> {
    const notifyUrl = config.payment.publicBaseUrl
      ? `${config.payment.publicBaseUrl.replace(/\/$/, '')}/api/payments/webhook/cashfree`
      : undefined;

    const order = await cashfreeRequest('POST', '/orders', {
      order_id: input.paymentId,
      order_amount: toRupees(input.amountPaise),
      order_currency: input.currency,
      order_note: input.description,
      customer_details: {
        customer_id: normalizeCustomerId(input.customer.id),
        customer_name: input.customer.name || undefined,
        customer_email: input.customer.email || undefined,
        customer_phone: normalizePhone(input.customer.phone)
      },
      order_meta: notifyUrl ? { notify_url: notifyUrl } : undefined,
      order_tags: input.notes
    });

    return {
      providerOrderId: order.order_id,
      checkout: {
        provider: 'cashfree',
        paymentSessionId: order.payment_session_id,
        orderId: order.order_id,
        mode: config.payment.cashfree.env === 'production' ? 'production' : 'sandbox',
        amount: input.amountPaise,
        currency: input.currency
      }
    };
  },

  async verifyPayment(payment: any): Promise<VerifyResult> {
    const orderId = encodeURIComponent(payment.providerOrderId);
    const order = await cashfreeRequest('GET', `/orders/${orderId}`);

    if (Math.round(Number(order.order_amount) * 100) !== Number(payment.amount)) {
      throw new PaymentGatewayError('Cashfree order amount does not match this payment');
    }

    if (order.order_status === 'PAID') {
      const attempts: any[] = await cashfreeRequest('GET', `/orders/${orderId}/payments`).catch(() => []);
      const success = (Array.isArray(attempts) ? attempts : []).find((p) => p.payment_status === 'SUCCESS');
      return {
        status: 'PAID',
        providerPaymentId: success ? String(success.cf_payment_id) : undefined,
        method: success?.payment_group
      };
    }
    if (order.order_status === 'EXPIRED' || order.order_status === 'TERMINATED') {
      return { status: 'FAILED', failureReason: `Order ${String(order.order_status).toLowerCase()}` };
    }
    return { status: 'PENDING' };
  },

  verifyWebhookSignature(rawBody: Buffer, headers: Record<string, any>): boolean {
    const secret = config.payment.cashfree.secretKey;
    const timestamp = String(headers['x-webhook-timestamp'] || '');
    const signature = String(headers['x-webhook-signature'] || '');
    if (!secret || !timestamp || !signature) return false;

    const expected = crypto.createHmac('sha256', secret).update(timestamp + rawBody.toString('utf-8')).digest('base64');
    const a = Buffer.from(expected);
    const b = Buffer.from(signature);
    return a.length === b.length && crypto.timingSafeEqual(a, b);
  },

  parseWebhook(body: any): WebhookEvent {
    const type = String(body?.type || '');
    const data = body?.data || {};

    if (type === 'PAYMENT_SUCCESS_WEBHOOK' && data.order?.order_id) {
      return {
        type: 'PAID',
        providerOrderId: data.order.order_id,
        providerPaymentId: data.payment?.cf_payment_id ? String(data.payment.cf_payment_id) : undefined,
        method: data.payment?.payment_group
      };
    }
    if ((type === 'PAYMENT_FAILED_WEBHOOK' || type === 'PAYMENT_USER_DROPPED_WEBHOOK') && data.order?.order_id) {
      return {
        type: 'FAILED',
        providerOrderId: data.order.order_id,
        providerPaymentId: data.payment?.cf_payment_id ? String(data.payment.cf_payment_id) : undefined,
        reason: data.payment?.payment_message
      };
    }
    if (type === 'REFUND_STATUS_WEBHOOK' && data.refund) {
      return {
        type: 'REFUND',
        providerOrderId: data.refund.order_id,
        refundId: data.refund.refund_id,
        providerRefundId: data.refund.cf_refund_id ? String(data.refund.cf_refund_id) : undefined,
        amountPaise: Math.round(Number(data.refund.refund_amount || 0) * 100),
        status: mapRefundStatus(data.refund.refund_status)
      };
    }
    return { type: 'IGNORED' };
  },

  async refund(payment: any, amountPaise: number, refundId: string, reason?: string): Promise<RefundResult> {
    const refund = await cashfreeRequest('POST', `/orders/${encodeURIComponent(payment.providerOrderId)}/refunds`, {
      refund_amount: toRupees(amountPaise),
      refund_id: refundId,
      refund_note: reason || undefined
    });
    return {
      providerRefundId: refund.cf_refund_id ? String(refund.cf_refund_id) : refundId,
      status: mapRefundStatus(refund.refund_status)
    };
  }
};
