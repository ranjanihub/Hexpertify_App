/**
 * Centralized API client for Hexpertify Admin Panel.
 *
 * - In dev mode (Vite), requests are proxied via vite.config.ts → localhost:5000.
 * - In production (served from Express), requests go to the same origin.
 * - If the primary request fails, falls back to http://localhost:5000.
 * - Validates response.ok and throws meaningful errors instead of silently swallowing them.
 */

const FALLBACK_BASE = 'http://localhost:5000';

export interface ApiResponse<T = any> {
  success: boolean;
  data: T | null;
  error: string | null;
}

/**
 * Make an API request with automatic fallback and proper error handling.
 *
 * @param endpoint  The API path, e.g. "/api/admin/consultants"
 * @param options   Standard fetch RequestInit (method, headers, body, etc.)
 * @returns         The parsed JSON response
 * @throws          Error with a descriptive message if both primary and fallback fail
 */
export async function apiRequest<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  // Ensure JSON content-type for requests with a body
  if (options.body && !options.headers) {
    options.headers = { 'Content-Type': 'application/json' };
  }

  // 1. Try primary URL (proxied in dev, same-origin in prod)
  try {
    const res = await fetch(endpoint, options);
    if (res.ok) {
      return await res.json();
    }
    // Non-OK response — try fallback
    console.warn(`[API] Primary request failed: ${res.status} ${res.statusText} for ${options.method || 'GET'} ${endpoint}`);
  } catch (primaryErr) {
    console.warn(`[API] Primary request error for ${options.method || 'GET'} ${endpoint}:`, primaryErr);
  }

  // 2. Fallback to explicit localhost:5000
  try {
    const fallbackUrl = `${FALLBACK_BASE}${endpoint}`;
    const res = await fetch(fallbackUrl, options);
    if (res.ok) {
      return await res.json();
    }
    const errorText = await res.text().catch(() => res.statusText);
    throw new Error(`API ${options.method || 'GET'} ${endpoint} failed: ${res.status} — ${errorText}`);
  } catch (fallbackErr: any) {
    // If this is our own thrown error, re-throw it
    if (fallbackErr?.message?.startsWith('API ')) {
      throw fallbackErr;
    }
    throw new Error(`API ${options.method || 'GET'} ${endpoint} failed: Network error — ${fallbackErr?.message || 'Unable to reach backend'}`);
  }
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
