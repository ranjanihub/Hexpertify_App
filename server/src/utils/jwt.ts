import crypto from 'crypto';
import { config } from '../config';

export interface AuthTokenPayload {
  sub: string;
  email: string;
  role: 'super_admin' | 'admin' | 'therapist' | 'client';
  iat?: number;
  exp?: number;
}

const DEFAULT_TTL_SECONDS = 12 * 60 * 60;

function getSecret(): string {
  // On deployed environments the secret must come from env, never from the source-code default
  if (process.env.VERCEL && !process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET is not configured on this deployment');
  }
  return config.jwtSecret;
}

function sign(data: string, secret: string): string {
  return crypto.createHmac('sha256', secret).update(data).digest('base64url');
}

/**
 * Minimal HS256 JWT (no external dependency) used for API authorization.
 */
export function signAuthToken(payload: Omit<AuthTokenPayload, 'iat' | 'exp'>, ttlSeconds = DEFAULT_TTL_SECONDS): string {
  const now = Math.floor(Date.now() / 1000);
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify({ ...payload, iat: now, exp: now + ttlSeconds })).toString('base64url');
  return `${header}.${body}.${sign(`${header}.${body}`, getSecret())}`;
}

export function verifyAuthToken(token: string): AuthTokenPayload | null {
  try {
    const [header, body, signature] = String(token || '').split('.');
    if (!header || !body || !signature) return null;

    const expected = Buffer.from(sign(`${header}.${body}`, getSecret()));
    const actual = Buffer.from(signature);
    if (expected.length !== actual.length || !crypto.timingSafeEqual(expected, actual)) return null;

    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf-8')) as AuthTokenPayload;
    if (!payload.exp || payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

/**
 * Issues a token for a verified login, or returns undefined if signing is unavailable.
 */
export function tryIssueAuthToken(user: { id?: string; email?: string }, role: AuthTokenPayload['role']): string | undefined {
  try {
    if (!user?.email) return undefined;
    return signAuthToken({ sub: String(user.id || user.email), email: String(user.email).toLowerCase(), role });
  } catch (err: any) {
    console.warn('[Auth] Could not issue auth token:', err?.message);
    return undefined;
  }
}
