import { ObjectId } from 'mongodb';
import { getDatabase } from '../db/mongodb';

const escapeRx = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Matches a document by its `id` field or its `_id` (string or ObjectId) */
function idMatch(value: string): any {
  const or: any[] = [{ id: value }, { _id: value }];
  if (ObjectId.isValid(value) && /^[0-9a-f]{24}$/i.test(value)) or.push({ _id: new ObjectId(value) });
  return { $or: or };
}

const emailMatch = (email: string) => ({ email: { $regex: `^${escapeRx(email.trim())}$`, $options: 'i' } });

/** A consultant by id, then _id, then email. Never resolves to a User. */
export async function resolveConsultant(ref: { id?: unknown; email?: unknown }): Promise<any | null> {
  const db = getDatabase();
  const id = String(ref.id ?? '').trim();
  const email = String(ref.email ?? '').trim();
  if (id) {
    const byId = await db.collection('Consultant').findOne(idMatch(id)).catch(() => null);
    if (byId) return byId;
    // A therapist's login id or email sent as the consultant id
    if (id.includes('@')) return db.collection('Consultant').findOne(emailMatch(id)).catch(() => null);
  }
  if (email) return db.collection('Consultant').findOne(emailMatch(email)).catch(() => null);
  return null;
}

/** The client's User record by id/_id, then email */
export async function resolveClientUser(ref: { id?: unknown; email?: unknown }): Promise<any | null> {
  const db = getDatabase();
  const id = String(ref.id ?? '').trim();
  const email = String(ref.email ?? '').trim();
  if (id && !id.includes('@')) {
    const byId = await db.collection('User').findOne(idMatch(id)).catch(() => null);
    if (byId) return byId;
  }
  const byEmail = email || (id.includes('@') ? id : '');
  return byEmail ? db.collection('User').findOne(emailMatch(byEmail)).catch(() => null) : null;
}

/** A service by id, else by its name/title (preferring the consultant's own service) */
export async function resolveService(ref: { id?: unknown; title?: unknown; consultantId?: unknown }): Promise<any | null> {
  const db = getDatabase();
  const id = String(ref.id ?? '').trim();
  if (id) {
    const byId = await db.collection('Service').findOne(idMatch(id)).catch(() => null);
    if (byId) return byId;
  }
  const title = String(ref.title ?? '').trim();
  if (!title) return null;
  const titleMatch = { $or: [{ name: { $regex: `^${escapeRx(title)}$`, $options: 'i' } }, { title: { $regex: `^${escapeRx(title)}$`, $options: 'i' } }] };
  const consultantId = String(ref.consultantId ?? '').trim();
  if (consultantId) {
    const own = await db.collection('Service').findOne({ $and: [titleMatch, { consultantId }] }).catch(() => null);
    if (own) return own;
  }
  return db.collection('Service').findOne(titleMatch).catch(() => null);
}

/** Every id a booking may store for this consultant (`_id` and legacy `id`) */
export function consultantIds(consultant: any): string[] {
  return Array.from(new Set([consultant?._id, consultant?.id].filter(Boolean).map(String)));
}
