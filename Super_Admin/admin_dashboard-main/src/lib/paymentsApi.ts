import { getApiAuthHeaders } from './auth';
import type { Payment } from '../types';

const FALLBACK_BASE = 'http://localhost:5000';

/**
 * Payments API calls surface the server's error message (e.g. invalid refund amount),
 * and only fall back to localhost:5000 when the same-origin request cannot be made at all.
 */
async function paymentsRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const init: RequestInit = {
    ...options,
    headers: { 'Content-Type': 'application/json', ...getApiAuthHeaders(), ...(options.headers as Record<string, string> || {}) },
  };

  let res: Response;
  try {
    res = await fetch(endpoint, init);
  } catch {
    res = await fetch(`${FALLBACK_BASE}${endpoint}`, init);
  }

  const data = await res.json().catch(() => null);
  if (!res.ok || data?.success === false) {
    if (res.status === 401) {
      throw new Error('Your admin session has expired. Please sign out and sign in again to manage payments.');
    }
    throw new Error(data?.error || `Request failed (${res.status})`);
  }
  return data as T;
}

export interface PaymentsListResponse {
  success: boolean;
  activeProvider: 'razorpay' | 'cashfree';
  count: number;
  summary: { collected: number; refunded: number; net: number; paidCount: number; failedCount: number };
  payments: Payment[];
}

export function fetchPayments(filters: { status?: string; provider?: string; from?: string; to?: string; q?: string } = {}) {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value) params.set(key, value);
  });
  const qs = params.toString();
  return paymentsRequest<PaymentsListResponse>(`/api/admin/payments${qs ? `?${qs}` : ''}`);
}

export function refundPayment(paymentId: string, body: { amount?: number; reason: string }) {
  return paymentsRequest<{ success: boolean; payment: Payment }>(`/api/admin/payments/${encodeURIComponent(paymentId)}/refund`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}
