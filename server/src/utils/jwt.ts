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

/**
 * Values that were once written in the source code as defaults. They are public (anyone with the code has them),
 * so a deployment still using one would let anyone forge sign-ins: refused everywhere, like a missing key.
 */
const PUBLISHED_SECRETS = new Set([
  'hexpertify_jwt_super_secret_key_2026',
  'hexpertify_enterprise_sso_secret_key_2026_secure'
]);

/** A signing key from the environment, or an error: no sign-in is issued or accepted with a weak or known key */
export function requireSecret(name: 'JWT_SECRET' | 'SSO_SECRET', value: string): string {
  if (!value) throw new Error(`${name} is not configured. Set a long random value in the environment.`);
  if (PUBLISHED_SECRETS.has(value) || value.length < 32) {
    throw new Error(`${name} is a known or too-short value. Set a new random value of at least 32 characters.`);
  }
  return value;
}

function getSecret(): string {
  return requireSecret('JWT_SECRET', config.jwtSecret);
}

/** The key that signs SSO tickets (admin → panel hand-over) */
export function getSsoSecret(): string {
  return requireSecret('SSO_SECRET', config.ssoSecret);
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
 * Short-lived token for one narrow purpose (e.g. opening the message stream, where the browser cannot send an
 * Authorization header). Signed with a key derived for that scope, so it is never accepted as an API token,
 * and a normal API token is never accepted in its place.
 */
export function signScopedToken(scope: string, payload: Record<string, unknown>, ttlSeconds: number): string {
  const now = Math.floor(Date.now() / 1000);
  const body = Buffer.from(JSON.stringify({ ...payload, scope, iat: now, exp: now + ttlSeconds })).toString('base64url');
  return `${body}.${sign(body, `${getSecret()}:${scope}`)}`;
}

export function verifyScopedToken<T = Record<string, unknown>>(scope: string, token: string): T | null {
  try {
    const [body, signature] = String(token || '').split('.');
    if (!body || !signature) return null;
    const expected = Buffer.from(sign(body, `${getSecret()}:${scope}`));
    const actual = Buffer.from(signature);
    if (expected.length !== actual.length || !crypto.timingSafeEqual(expected, actual)) return null;
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf-8'));
    if (payload.scope !== scope || !payload.exp || payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload as T;
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
