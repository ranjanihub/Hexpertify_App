import crypto from 'crypto';
import { NextFunction, Request, Response } from 'express';
import { getDatabase } from '../db/mongodb';
import { isAdminUser } from '../middlewares/auth.middleware';
import { AuthTokenPayload, verifyAuthToken } from '../utils/jwt';

/**
 * Server-side audit trail for the admin team. Every successful state-changing request (POST/PUT/PATCH/DELETE)
 * made with an admin's token under /api is recorded with who did it (from the signed token, never from the
 * request), the client IP, method, route, target id and the response status. Request bodies are never stored
 * (they can carry passwords or bank details); only id-like values are read from them to name the target.
 */

export type AuditSeverity = 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR' | 'CRITICAL';

export interface AuditActor {
  user: string;
  userId: string;
  role: string;
}

/** The caller's IP: the first x-forwarded-for hop (set by the hosting proxy), else the socket address */
export function clientIp(req: Request): string {
  const forwarded = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim();
  return (forwarded || req.socket?.remoteAddress || req.ip || '').slice(0, 64);
}

/** The signed-in admin, read from the verified token (null for anyone else) */
export function adminActor(req: Request): AuditActor | null {
  let user: AuthTokenPayload | null | undefined = req.user;
  if (!user) {
    const token = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '').trim();
    if (token && token.split('.').length === 3) user = verifyAuthToken(token);
  }
  if (!user || !isAdminUser(user)) return null;
  return { user: user.email, userId: user.sub, role: user.role === 'super_admin' ? 'Super Admin' : 'Admin' };
}

/** Writes one audit entry (best effort: a failed write never fails the admin's request) */
export async function recordAudit(
  req: Request,
  actor: AuditActor,
  entry: { action: string; module: string; severity: AuditSeverity; details?: Record<string, unknown> }
): Promise<void> {
  const now = new Date();
  await getDatabase()
    .collection('AuditLog')
    .insertOne({
      id: `LOG-${crypto.randomUUID().slice(0, 8).toUpperCase()}`,
      user: actor.user,
      userId: actor.userId,
      role: actor.role,
      action: entry.action.slice(0, 300),
      module: entry.module.slice(0, 60),
      severity: entry.severity,
      timestamp: now.toISOString(),
      createdAt: now,
      ipAddress: clientIp(req),
      details: entry.details || {},
      userAgent: String(req.headers['user-agent'] || '').slice(0, 300)
    } as any)
    .catch((err) => console.warn('[audit] could not record entry:', err?.message || err));
}

const CHANGE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

/** Requests that are not admin changes worth auditing (sign-in plumbing, read receipts, the log itself) */
const SKIP = [
  /^\/api\/(admin\/)?(logs|audit-logs)(\/|$)/,
  /^\/api\/auth\/(login|logout|whoami|sso-verify|forgot-password|reset-password|register)(\/|$)/,
  /^\/api\/(admin\/)?notifications(\/|$)/,
  /^\/api\/push(\/|$)/,
  /^\/api\/payments\/webhook(\/|$)/
];

const MODULES: Record<string, string> = {
  bookings: 'Bookings',
  users: 'Clients',
  client: 'Clients',
  'client-notes': 'Clients',
  consultants: 'Therapists',
  availability: 'Availability',
  payments: 'Payments',
  payouts: 'Payouts',
  revenue: 'Revenue',
  professions: 'Professions',
  resources: 'Resources',
  assets: 'Assets',
  assessments: 'Assessments',
  reviews: 'Reviews',
  'session-feedback': 'Reviews',
  blog: 'Blog',
  blogs: 'Blog',
  activities: 'Activities',
  emails: 'Emails',
  goals: 'Clients',
  messages: 'Messages',
  auth: 'Security'
};

/** Singular names used in the entry text */
const LABELS: Record<string, string> = {
  bookings: 'booking',
  users: 'client account',
  consultants: 'therapist',
  professions: 'profession',
  resources: 'resource',
  assets: 'asset',
  assessments: 'assessment',
  reviews: 'review',
  blog: 'blog post',
  blogs: 'blog post',
  payments: 'payment',
  availability: 'availability'
};

const ID_KEYS = ['id', 'bookingId', 'consultantId', 'therapistId', 'userId', 'clientId', 'paymentId', 'payoutId', 'postId'];
const ID_LIKE = /^([0-9a-fA-F]{24}|[0-9a-fA-F]{8}-([0-9a-fA-F]{4}-){3}[0-9a-fA-F]{12}|[A-Z]{2,5}-[A-Za-z0-9_-]{2,60}|\d{1,12}|[a-z0-9]+(-[a-z0-9]+){2,})$/;

function pickId(source: unknown): string {
  if (!source || typeof source !== 'object') return '';
  for (const key of ID_KEYS) {
    const v = (source as Record<string, unknown>)[key];
    if (typeof v === 'string' && v.length <= 100 && ID_LIKE.test(v)) return v;
    if (typeof v === 'number' && Number.isFinite(v)) return String(v);
  }
  return '';
}

/** How serious a change is: deletes, refunds and payouts are CRITICAL */
function severityOf(method: string, route: string): AuditSeverity {
  if (method === 'DELETE' || /refund|payout/i.test(route)) return 'CRITICAL';
  if (/\/payments(\/|$)|\/cancel(\/|$)|\/auth\/sso-ticket/i.test(route)) return 'WARNING';
  return 'INFO';
}

function describe(method: string, route: string, resource: string, targetId: string): string {
  const target = targetId ? ` ${targetId}` : '';
  if (/refund/i.test(route)) return `Issued refund${target}`;
  if (/\/payouts(\/|$)/i.test(route) && method !== 'DELETE') return `Released / updated payout${target}`;
  if (/\/cancel(\/|$)/i.test(route)) return `Cancelled booking${target}`;
  if (/\/auth\/sso-ticket/i.test(route)) return `Opened a panel as account${target}`;
  const verb = method === 'POST' ? 'Created' : method === 'DELETE' ? 'Deleted' : 'Updated';
  return `${verb} ${resource || 'record'}${target}`;
}

/**
 * Express middleware (mounted before the API routes): after the response is sent, records successful
 * admin changes. It never blocks or alters the response.
 */
export function adminAuditMiddleware(req: Request, res: Response, next: NextFunction): void {
  if (!CHANGE_METHODS.has(req.method)) return next();
  const route = String(req.originalUrl || req.url || '').split('?')[0];
  if (!route.startsWith('/api/') || SKIP.some((re) => re.test(route))) return next();
  const actor = adminActor(req);
  if (!actor) return next();

  // Read the target id now (later handlers may change req.body); only id-like values are kept
  const segments = route.split('/').filter(Boolean).slice(1); // drop "api"
  if (segments[0] === 'admin') segments.shift();
  const resource = segments[0] || '';
  const decode = (s: string) => {
    try {
      return decodeURIComponent(s);
    } catch {
      return s;
    }
  };
  const pathId = segments.slice(1).map(decode).find((s) => s.length <= 100 && ID_LIKE.test(s)) || '';
  const targetId = pathId || pickId(req.query) || pickId(req.body) || pickId(req.body?.user);
  const startedAt = Date.now();

  res.on('finish', () => {
    if (res.statusCode < 200 || res.statusCode >= 300) return;
    const module = MODULES[resource] || (resource ? resource.charAt(0).toUpperCase() + resource.slice(1) : 'System');
    void recordAudit(req, actor, {
      action: describe(req.method, route, LABELS[resource] || resource.replace(/s$/, '').replace(/-/g, ' '), targetId),
      module,
      severity: severityOf(req.method, route),
      details: {
        method: req.method,
        route,
        targetId: targetId || null,
        status: res.statusCode,
        durationMs: Date.now() - startedAt,
        source: 'server'
      }
    });
  });
  next();
}
