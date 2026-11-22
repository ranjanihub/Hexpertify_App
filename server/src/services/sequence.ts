import { getDatabase } from '../db/mongodb';
import { cacheService } from './cache.service';

/**
 * Readable running numbers for bookings (BK-00001) and payments (TXN-00001).
 * A `Counter` document per kind hands out the next number atomically. Records without a number (everything
 * created before numbering existed, or by a path that does not number, such as the website's Prisma booking)
 * are numbered in creation order before any new number is handed out, so the sequence follows creation time.
 * Numbers are only ever added, never changed.
 */
const KINDS = {
  booking: { counter: 'bookingNumber', collection: 'Booking', mirror: 'bookings', field: 'bookingNumber', prefix: 'BK' },
  payment: { counter: 'paymentNumber', collection: 'Payment', mirror: '', field: 'paymentNumber', prefix: 'TXN' }
} as const;

export type SequenceKind = keyof typeof KINDS;

const format = (kind: SequenceKind, n: number) => `${KINDS[kind].prefix}-${String(n).padStart(5, '0')}`;

async function nextValue(kind: SequenceKind): Promise<number> {
  const result: any = await getDatabase()
    .collection<{ _id: string; seq: number }>('Counter')
    .findOneAndUpdate({ _id: KINDS[kind].counter }, { $inc: { seq: 1 } }, { upsert: true, returnDocument: 'after' });
  // The driver returns the document (v6) or { value } (older versions)
  return Number((result?.value ?? result)?.seq) || 1;
}

const lastBackfill: Record<SequenceKind, number> = { booking: 0, payment: 0 };
const running: Partial<Record<SequenceKind, Promise<void>>> = {};

/** Numbers every record of this kind that has none yet, oldest first. Throttled unless `force`. */
export async function numberMissing(kind: SequenceKind, force = false): Promise<void> {
  if (!force && Date.now() - lastBackfill[kind] < 60_000) return;
  if (running[kind]) return running[kind];
  running[kind] = (async () => {
    const { collection, mirror, field } = KINDS[kind];
    const db = getDatabase();
    const missing = await db
      .collection(collection)
      .find({ $or: [{ [field]: { $exists: false } }, { [field]: null }, { [field]: '' }] }, { projection: { _id: 1, createdAt: 1 } })
      .sort({ createdAt: 1, _id: 1 })
      .toArray();
    let numbered = 0;
    for (const doc of missing) {
      const value = format(kind, await nextValue(kind));
      const set = await db
        .collection(collection)
        .updateOne({ _id: doc._id, $or: [{ [field]: { $exists: false } }, { [field]: null }, { [field]: '' }] }, { $set: { [field]: value } });
      if (set.modifiedCount) numbered++;
      if (set.modifiedCount && mirror) {
        await db.collection(mirror).updateOne({ _id: doc._id }, { $set: { [field]: value } }).catch(() => {});
      }
    }
    if (numbered) cacheService.invalidateTags(['bookings', 'payments']);
    lastBackfill[kind] = Date.now();
  })().finally(() => {
    delete running[kind];
  });
  return running[kind];
}

