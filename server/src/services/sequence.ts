import { getDatabase } from '../db/mongodb';
import { cacheService } from './cache.service';

/**
 * Readable running numbers for bookings (BK-00001), payments (TXN-00001) and clients (CL-00001).
 * A `Counter` document per kind hands out the next number atomically. Records without a number (everything
 * created before numbering existed, or by a path that does not number, such as the website's Prisma booking)
 * are numbered in creation order before any new number is handed out, so the sequence follows creation time.
 * Numbers are only ever added, never changed.
 */
const KINDS = {
  booking: { counter: 'bookingNumber', collection: 'Booking', mirror: 'bookings', field: 'bookingNumber', prefix: 'BK', only: null, tags: ['bookings', 'payments'] },
  payment: { counter: 'paymentNumber', collection: 'Payment', mirror: '', field: 'paymentNumber', prefix: 'TXN', only: null, tags: ['bookings', 'payments'] },
  // Only client accounts are numbered: admin and therapist logins share the User collection
  client: {
    counter: 'clientNumber', collection: 'User', mirror: 'users', field: 'clientNumber', prefix: 'CL',
    only: { role: { $not: /^(admin|super_admin|therapist|consultant)$/i } }, tags: ['users']
  },
  // Therapist payout invoices (INV-00001), handed out by the server when a payout is released
  payoutInvoice: { counter: 'payoutInvoiceNumber', collection: 'PayoutInvoice', mirror: '', field: 'invoiceNumber', prefix: 'INV', only: null, tags: ['payouts'] }
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

/** Hands back a number nobody used, when it is still the last one given out (otherwise it stays a gap). */
async function giveBack(kind: SequenceKind, n: number): Promise<void> {
  await getDatabase()
    .collection<{ _id: string; seq: number }>('Counter')
    .updateOne({ _id: KINDS[kind].counter, seq: n }, { $inc: { seq: -1 } })
    .catch(() => {});
}

/**
 * The next unused number of a kind (e.g. INV-00012). The counter is atomic, so concurrent callers never
 * get the same number; a number some older record already holds is skipped.
 */
export async function nextSequenceNumber(kind: SequenceKind): Promise<string> {
  const { collection, field } = KINDS[kind];
  for (let attempt = 0; attempt < 50; attempt++) {
    const value = format(kind, await nextValue(kind));
    const taken = await getDatabase().collection(collection).findOne({ [field]: value }, { projection: { _id: 1 } });
    if (!taken) return value;
  }
  throw new Error(`Could not allocate a new ${kind} number`);
}

const lastBackfill: Record<SequenceKind, number> = { booking: 0, payment: 0, client: 0, payoutInvoice: 0 };
const running: Partial<Record<SequenceKind, Promise<void>>> = {};
const followUp: Partial<Record<SequenceKind, Promise<void>>> = {};

/** Numbers every record of this kind that has none yet, oldest first. Throttled unless `force`. */
export async function numberMissing(kind: SequenceKind, force = false): Promise<void> {
  if (!force && Date.now() - lastBackfill[kind] < 60_000) return;
  if (running[kind]) {
    if (!force) return running[kind];
    // A record stored after the running pass looked for unnumbered ones gets one follow-up pass
    if (!followUp[kind]) {
      followUp[kind] = running[kind]!.catch(() => {}).then(() => {
        delete followUp[kind];
        return numberMissing(kind, true);
      });
    }
    return followUp[kind];
  }
  running[kind] = (async () => {
    const { collection, mirror, field, only, tags } = KINDS[kind];
    const db = getDatabase();
    const unnumbered = { $or: [{ [field]: { $exists: false } }, { [field]: null }, { [field]: '' }] };
    const missing = await db
      .collection(collection)
      .find(only ? { $and: [unnumbered, only] } : unnumbered, { projection: { _id: 1, createdAt: 1 } })
      .sort({ createdAt: 1, _id: 1 })
      .toArray();
    let numbered = 0;
    // A number taken for a record that another pass numbered first is used for the next record, not dropped
    let spare: number | null = null;
    for (const doc of missing) {
      const n: number = spare ?? await nextValue(kind);
      spare = null;
      const value = format(kind, n);
      const set = await db
        .collection(collection)
        .updateOne({ _id: doc._id, ...unnumbered }, { $set: { [field]: value } });
      if (!set.modifiedCount) {
        spare = n;
        continue;
      }
      numbered++;
      if (mirror) {
        await db.collection(mirror).updateOne({ _id: doc._id }, { $set: { [field]: value } }).catch(() => {});
      }
    }
    if (spare !== null) await giveBack(kind, spare);
    if (numbered) cacheService.invalidateTags([...tags]);
    lastBackfill[kind] = Date.now();
  })().finally(() => {
    delete running[kind];
  });
  return running[kind];
}

