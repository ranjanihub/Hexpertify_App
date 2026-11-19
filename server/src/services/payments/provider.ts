export type ProviderName = 'razorpay' | 'cashfree';

export interface CreateOrderInput {
  /** Our internal payment id (PAY-...), also used as receipt / gateway order id where supported */
  paymentId: string;
  amountPaise: number;
  currency: string;
  customer: {
    id: string;
    name?: string;
    email?: string;
    phone?: string;
  };
  description?: string;
  notes?: Record<string, string>;
}

export interface CreateOrderResult {
  providerOrderId: string;
  /** Parameters the browser needs to open the gateway checkout */
  checkout: Record<string, any>;
}

export type VerifiedStatus = 'PAID' | 'FAILED' | 'PENDING';

export interface VerifyResult {
  status: VerifiedStatus;
  providerPaymentId?: string;
  method?: string;
  failureReason?: string;
}

export interface RefundResult {
  providerRefundId: string;
  status: 'PENDING' | 'SUCCESS' | 'FAILED';
}

/** Gateway-independent webhook event */
export type WebhookEvent =
  | { type: 'PAID'; providerOrderId: string; providerPaymentId?: string; method?: string }
  | { type: 'FAILED'; providerOrderId: string; providerPaymentId?: string; reason?: string }
  | {
      type: 'REFUND';
      providerOrderId?: string;
      providerPaymentId?: string;
      refundId?: string;
      providerRefundId?: string;
      amountPaise?: number;
      status: 'PENDING' | 'SUCCESS' | 'FAILED';
    }
  | { type: 'IGNORED' };

export interface PaymentProvider {
  name: ProviderName;
  isConfigured(): boolean;
  createOrder(input: CreateOrderInput): Promise<CreateOrderResult>;
  /** Confirms a payment with the gateway; `clientResponse` is what the checkout handed back to the browser */
  verifyPayment(payment: any, clientResponse: Record<string, any>): Promise<VerifyResult>;
  verifyWebhookSignature(rawBody: Buffer, headers: Record<string, any>): boolean;
  parseWebhook(body: any): WebhookEvent;
  refund(payment: any, amountPaise: number, refundId: string, reason?: string): Promise<RefundResult>;
}

export class PaymentGatewayError extends Error {
  constructor(message: string, public details?: any) {
    super(message);
    this.name = 'PaymentGatewayError';
  }
}
