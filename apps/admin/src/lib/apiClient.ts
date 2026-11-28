/**
 * Centralized API client for Hexpertify Admin Panel.
 *
 * - Requests always go to the same origin (the web app serves /api/*); nothing is retried elsewhere.
 * - Validates response.ok and throws meaningful errors instead of silently swallowing them.
 */

import { getApiAuthHeaders } from './auth';

export interface ApiResponse<T = any> {
  success: boolean;
  data: T | null;
  error: string | null;
}

/**
 * Make an API request with proper error handling.
 *
 * @param endpoint  The API path, e.g. "/api/admin/consultants"
 * @param options   Standard fetch RequestInit (method, headers, body, etc.)
 * @returns         The parsed JSON response
 * @throws          Error carrying the server's message (or a network error)
 */
export async function apiRequest<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  // Ensure JSON content-type for requests with a body
  if (options.body && !options.headers) {
    options.headers = { 'Content-Type': 'application/json' };
  }
  // Attach the admin API token (required by protected endpoints such as payments/refunds)
  options.headers = { ...getApiAuthHeaders(), ...(options.headers as Record<string, string> || {}) };

  // Same-origin only: an error answer from the server is reported with its own message,
  // and nothing is ever retried against another host (that would also leak the token).
  let res: Response;
  try {
    res = await fetch(endpoint, options);
  } catch (err: any) {
    throw new Error(`Could not reach the server (${err?.message || 'network error'}). Check your connection and try again.`);
  }
  if (res.ok) {
    return await res.json();
  }
  const data = await res.json().catch(() => null);
  throw new Error(data?.error || data?.message || `API ${options.method || 'GET'} ${endpoint} failed: ${res.status}`);
}

/**
 * Convenience wrappers
 */
export const api = {
  get: <T = any>(endpoint: string) =>
    apiRequest<T>(endpoint),

  post: <T = any>(endpoint: string, body: any) =>
    apiRequest<T>(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }),

  put: <T = any>(endpoint: string, body: any) =>
    apiRequest<T>(endpoint, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }),

  delete: <T = any>(endpoint: string) =>
    apiRequest<T>(endpoint, { method: 'DELETE' }),
};
