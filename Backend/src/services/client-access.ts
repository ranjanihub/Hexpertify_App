import { Request } from 'express';
import { Db, ObjectId } from 'mongodb';
import { getDatabase } from '../db/mongodb';
import { isAdminUser, isInternalRequest } from '../middlewares/auth.middleware';
import { verifyAuthToken } from '../utils/jwt';

/**
 * Client privacy rule: a client's full record (clinical history, assessments, mood logs, goals,
 * homework, intake answers, documents) is visible only to their assigned therapist and to the client.
 * Everyone else, administrators included, sees basic details.
 */

export const BASIC_CLIENT_FIELDS = [
  '_id', 'id', 'name', 'email', 'phone', 'phoneNumber', 'role', 'status', 'isActive', 'inactive',
  'image', 'avatarUrl', 'createdAt', 'updatedAt', 'joinedDate', 'lastActive', 'service',
  'assignedTherapistId', 'assignedTherapistName', 'assignedTherapistEmail', 'assignedTherapistPhoto',
  'totalSessionsCount', 'completedSessionsCount'
];

export interface ClientViewer {
  kind: 'internal' | 'admin' | 'therapist' | 'client' | 'anonymous';
  /** Every id/email this viewer is known by (consultant id and _id for therapists) */
  ids: Set<string>;
}

const norm = (v: unknown) => String(v ?? '').trim().toLowerCase();

export function isClientRecord(user: any): boolean {
  const role = String(user?.role || '').toUpperCase();
  return role !== 'ADMIN' && role !== 'SUPER_ADMIN' && role !== 'THERAPIST' && role !== 'CONSULTANT';
}

/** Identifies the caller from the internal key or a signed API token. Request-supplied ids are never trusted. */
export async function resolveClientViewer(req: Request): Promise<ClientViewer> {
  if (req.isInternal || isInternalRequest(req)) return { kind: 'internal', ids: new Set() };

  let user = req.user;
  if (!user) {
    const token = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '').trim();
    if (token.split('.').length === 3) user = verifyAuthToken(token) || undefined;
  }
  if (!user) return { kind: 'anonymous', ids: new Set() };

  const ids = new Set([norm(user.sub), norm(user.email)].filter(Boolean));
  if (isAdminUser(user)) return { kind: 'admin', ids };

  if (user.role === 'therapist') {
    // Clients may reference their therapist by the consultant's custom id or its Mongo _id
    const db = getDatabase();
    const or: any[] = [{ id: user.sub }, { _id: user.sub as any }, { email: user.email }];
    const consultant: any = await db.collection('Consultant').findOne({ $or: or }).catch(() => null) ||
                            await db.collection('consultants').findOne({ $or: or }).catch(() => null);
    if (consultant) {
      [consultant.id, consultant._id, consultant.email].forEach((v) => v && ids.add(norm(v)));
    }
    return { kind: 'therapist', ids };
  }

  return { kind: 'client', ids };
}

export function canViewFullClient(viewer: ClientViewer, client: any): boolean {
  if (!client) return false;
  if (viewer.kind === 'internal') return true;
  if (viewer.kind === 'therapist') {
    return [client.assignedTherapistId, client.assignedTherapistEmail].some((v) => v && viewer.ids.has(norm(v)));
  }
  if (viewer.kind === 'client') {
    return [client.id, client._id, client.email].some((v) => v && viewer.ids.has(norm(v)));
  }
  return false;
}

export function toBasicClient(client: any): any {
  const basic: any = { detailsRestricted: true };
  for (const key of BASIC_CLIENT_FIELDS) {
    if (client[key] !== undefined) basic[key] = client[key];
  }
  return basic;
}

/**
 * Client panel rule: a client's login opens the client panel only after at least one completed session.
 * Keep in sync with Live_Panel/app/api/auth/login/route.ts.
 */
export const CLIENT_PANEL_LOCKED_MESSAGE =
  'Your client portal opens after your first completed session. Please book a session to get started.';

const escapeRx = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export async function hasCompletedSession(db: Db, email: string, user?: any): Promise<boolean> {
  const or: any[] = [];
  if (email) or.push({ clientEmail: { $regex: `^${escapeRx(email)}$`, $options: 'i' } });

  const ids: any[] = [];
  [user?._id, user?.id, user?.clientId].filter(Boolean).forEach((v) => {
    ids.push(String(v));
    if (ObjectId.isValid(String(v))) ids.push(new ObjectId(String(v)));
  });
  if (ids.length) or.push({ clientId: { $in: ids } }, { userId: { $in: ids } });
  if (!or.length) return false;

  const filter = { $and: [{ $or: or }, { status: { $regex: '^completed$', $options: 'i' } }] };
  for (const name of ['Booking', 'bookings']) {
    const found = await db.collection(name).findOne(filter, { projection: { _id: 1 } }).catch(() => null);
    if (found) return true;
  }
  return false;
}

/** Returns the record unchanged for the assigned therapist / the client, basic details for anyone else */
export function applyClientPrivacy(viewer: ClientViewer, user: any): any {
  if (!user || !isClientRecord(user) || canViewFullClient(viewer, user)) return user;
  return toBasicClient(user);
}
