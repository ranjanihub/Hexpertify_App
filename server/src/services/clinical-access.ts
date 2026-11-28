import { NextFunction, Request, Response } from 'express';
import { Db } from 'mongodb';
import { idQuery } from './live-content';
import { canViewFullClient, ClientViewer, isClientRecord, resolveClientViewer } from './client-access';

/**
 * Access checks shared by the clinical endpoints (assessments, goals, activity assignments):
 * a client's records are read or written only by the client, their assigned therapist,
 * an administrator or the website's own server code (internal key). The caller is always
 * identified from the signed token; ids sent in the request only say which record is meant.
 */

/** Escapes text for use inside a RegExp / $regex (user input never becomes a pattern) */
export const escapeRegex = (value: unknown) => String(value ?? '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const norm = (v: unknown) => String(v ?? '').trim().toLowerCase();

/** A client account by email and/or id (custom id, string _id or ObjectId), from User then users */
export async function findClientUser(db: Db, ref: { email?: unknown; id?: unknown }): Promise<any | null> {
  const email = norm(ref.email);
  const id = String(ref.id ?? '').trim();
  const or: any[] = [...(email ? [{ email }] : []), ...(id ? idQuery(id).$or : [])];
  if (!or.length) return null;
  for (const name of ['User', 'users']) {
    const found = await db.collection(name).findOne({ $or: or }).catch(() => null);
    if (found && isClientRecord(found)) return found;
  }
  return null;
}

/** The signed-in client's own account */
export async function ownClientUser(db: Db, viewer: ClientViewer): Promise<any | null> {
  if (viewer.kind !== 'client') return null;
  const ids = [...viewer.ids];
  const email = ids.find((v) => v.includes('@'));
  const id = ids.find((v) => !v.includes('@'));
  return (email && await findClientUser(db, { email })) || (id && await findClientUser(db, { id })) || null;
}

/** The signed-in therapist's Consultant record */
export async function ownConsultant(db: Db, viewer: ClientViewer): Promise<any | null> {
  if (viewer.kind !== 'therapist') return null;
  const ids = [...viewer.ids];
  const or: any[] = [];
  ids.forEach((v) => (v.includes('@') ? or.push({ email: v }) : or.push(...idQuery(v).$or)));
  if (!or.length) return null;
  for (const name of ['Consultant', 'consultants']) {
    const found = await db.collection(name).findOne({ $or: or }).catch(() => null);
    if (found) return found;
  }
  return null;
}

/** Every id/email a client account is known by (records store either) */
export function clientKeys(user: any): { ids: string[]; email: string } {
  const ids = [...new Set([user?.id, user?._id].filter(Boolean).map(String))];
  return { ids, email: norm(user?.email) };
}

/** True when the request names a client other than this one (an id or email that is not theirs) */
export function namesOtherClient(user: any, ref: { email?: unknown; id?: unknown }): boolean {
  const { ids, email } = clientKeys(user);
  const askedEmail = norm(ref.email);
  const askedId = String(ref.id ?? '').trim();
  if (askedEmail && askedEmail !== email) return true;
  if (askedId && !ids.includes(askedId)) return true;
  return false;
}

export interface Refusal { status: number; error: string }

/**
 * May this viewer read or write the full record of this client account?
 * Admins and internal calls may; a therapist only for their assigned clients; a client only for themself.
 */
export function clientAccessRefusal(viewer: ClientViewer, client: any): Refusal | null {
  if (viewer.kind === 'anonymous') return { status: 401, error: 'Please sign in again.' };
  if (viewer.kind === 'admin' || viewer.kind === 'internal') return null;
  if (canViewFullClient(viewer, client)) return null;
  return viewer.kind === 'therapist'
    ? { status: 403, error: 'This client is not assigned to you.' }
    : { status: 403, error: 'You can only access your own records.' };
}

/** Route guard: administrators and the website's own server code (internal key) only */
export function requireAdminOrInternal(req: Request, res: Response, next: NextFunction): void {
  resolveClientViewer(req)
    .then((viewer) => {
      if (viewer.kind === 'admin' || viewer.kind === 'internal') return next();
      res.status(viewer.kind === 'anonymous' ? 401 : 403).json({
        success: false,
        error: viewer.kind === 'anonymous' ? 'Administrator sign-in required.' : 'Only the admin team can do this.'
      });
    })
    .catch((err) => serverError(res, 'requireAdminOrInternal', err, 'Request failed'));
}

/** Logs the real error on the server and answers with a generic message */
export function serverError(res: Response, context: string, error: unknown, message: string, shape: 'success' | 'plain' = 'success'): void {
  console.error(`[${context}]`, error);
  if (res.headersSent) return;
  res.status(500).json(shape === 'plain' ? { error: message } : { success: false, error: message });
}

/** Responds with a refusal; returns true when one was sent */
export function refuse(res: Response, refusal: Refusal | null, shape: 'success' | 'plain' = 'success'): boolean {
  if (!refusal) return false;
  res.status(refusal.status).json(shape === 'plain' ? { error: refusal.error } : { success: false, error: refusal.error });
  return true;
}

