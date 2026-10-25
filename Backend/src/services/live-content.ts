import crypto from 'crypto';
import { ObjectId } from 'mongodb';
import { getDatabase } from '../db/mongodb';

/**
 * The public website (Live_Panel, Prisma) reads Page, Profession, Consultant, Service, Review and
 * SeoMeta documents in an exact shape (Live_Panel/prisma/schema.prisma). Prisma rejects a whole query
 * when one document has a missing required field or a wrong type, which blanks entire pages. Every
 * admin write to public content goes through these helpers so the stored shape always matches.
 */

export const newId = () => crypto.randomUUID();

const str = (v: unknown, fallback = '') => (v === undefined || v === null ? fallback : String(v));
export const toInt = (v: unknown, fallback = 0) => {
  const n = Math.round(Number(v));
  return Number.isFinite(n) ? n : fallback;
};
export const toFloat = (v: unknown, fallback = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
};
export const toStrArr = (v: unknown): string[] =>
  Array.isArray(v) ? v.map((x) => String(x ?? '').trim()).filter(Boolean) : typeof v === 'string' && v.trim() ? v.split(',').map((x) => x.trim()).filter(Boolean) : [];
export const slugify = (s: string) => s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

/** Matches a document by its string _id, a legacy ObjectId _id, or a custom `id` field */
export function idQuery(id: string): any {
  const or: any[] = [{ _id: id }, { id }];
  if (ObjectId.isValid(id) && String(new ObjectId(id)) === id) or.push({ _id: new ObjectId(id) });
  return { $or: or };
}

/** FAQItem: { question, answer } with both present */
export const toFaqs = (v: unknown) =>
  (Array.isArray(v) ? v : [])
    .map((f: any) => ({ question: str(f?.question).trim(), answer: str(f?.answer).trim() }))
    .filter((f) => f.question && f.answer);

// ---------------------------------------------------------------------------
// SeoMeta (shared by Page, Profession and Consultant through seoMetaId)
// ---------------------------------------------------------------------------

export interface AdminSeo {
  metaTitle?: string;
  metaDescription?: string;
  keywords?: string | string[];
  ogTitle?: string;
  openGraphTitle?: string;
  ogDescription?: string;
  openGraphDescription?: string;
  ogImageUrl?: string;
  openGraphImageUrl?: string;
  ogImageAltText?: string;
  openGraphImageAltText?: string;
  htmlChunk?: string;
  structuredData?: string;
  structuredDataJson?: string;
  canonicalUrl?: string;
}

/** Creates or updates the SeoMeta document and returns its id */
export async function upsertSeoMeta(existingId: string | null | undefined, seo: AdminSeo | undefined, fallbackTitle: string): Promise<string> {
  const db = getDatabase();
  const s = seo || {};
  const doc = {
    metaTitle: str(s.metaTitle).trim() || fallbackTitle,
    metaDescription: str(s.metaDescription).trim() || fallbackTitle,
    metaKeywords: toStrArr(s.keywords),
    ogTitle: str(s.ogTitle ?? s.openGraphTitle).trim() || null,
    ogDescription: str(s.ogDescription ?? s.openGraphDescription).trim() || null,
    ogImage: str(s.ogImageUrl ?? s.openGraphImageUrl).trim() || null,
    ogImageAlt: str(s.ogImageAltText ?? s.openGraphImageAltText).trim() || null,
    htmlChunk: str(s.htmlChunk ?? s.structuredData ?? s.structuredDataJson).trim() || null,
    canonicalUrl: str(s.canonicalUrl).trim() || null
  };
  if (existingId) {
    const res = await db.collection('SeoMeta').updateOne({ _id: existingId as any }, { $set: doc });
    if (res.matchedCount) return existingId;
  }
  const id = newId();
  await db.collection('SeoMeta').insertOne({ _id: id as any, ...doc });
  return id;
}

export async function readSeoMeta(id: string | null | undefined): Promise<any | null> {
  if (!id) return null;
  return getDatabase().collection('SeoMeta').findOne({ _id: id as any });
}

/** SeoMeta → the admin panel's field names (both naming styles the panels use) */
export function seoToAdmin(seo: any): any {
  if (!seo) return undefined;
  const keywords = Array.isArray(seo.metaKeywords) ? seo.metaKeywords.join(', ') : str(seo.metaKeywords);
  return {
    metaTitle: seo.metaTitle || '',
    metaDescription: seo.metaDescription || '',
    keywords,
    canonicalUrl: seo.canonicalUrl || '',
    ogTitle: seo.ogTitle || '',
    ogDescription: seo.ogDescription || '',
    ogImageUrl: seo.ogImage || '',
    ogImageAltText: seo.ogImageAlt || '',
    openGraphTitle: seo.ogTitle || '',
    openGraphDescription: seo.ogDescription || '',
    openGraphImageUrl: seo.ogImage || '',
    openGraphImageAltText: seo.ogImageAlt || '',
    htmlChunk: seo.htmlChunk || '',
    structuredData: seo.htmlChunk || '',
    structuredDataJson: seo.htmlChunk || ''
  };
}

// ---------------------------------------------------------------------------
// Professions
// ---------------------------------------------------------------------------

/** Resolves a profession given its id, identifier or name (the admin sends the name) */
export async function resolveProfession(ref: unknown): Promise<any | null> {
  const value = str(ref).trim();
  if (!value) return null;
  const db = getDatabase();
  const rx = new RegExp(`^${value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i');
  return db.collection('Profession').findOne({ $or: [...idQuery(value).$or, { identifier: rx }, { name: rx }, { serviceName: rx }] });
}

// ---------------------------------------------------------------------------
// Consultant services (Service collection) and reviews (Review collection)
// ---------------------------------------------------------------------------

/**
 * Saves the admin's plan list into the Service collection and returns the lowest price.
 * Plans are matched by their id so ids stay stable (bookings and open website checkouts keep
 * working); plans missing from the list are retired when booked and deleted otherwise.
 */
export async function replaceConsultantServices(consultantId: string, services: unknown): Promise<number | null> {
  const db = getDatabase();
  const now = new Date();
  const existing = await db.collection('Service').find({ consultantId }).toArray();
  const byId = new Map<string, any>(existing.map((e: any) => [String(e._id), e]));
  const kept = new Set<string>();
  const prices: number[] = [];

  for (const s of (Array.isArray(services) ? services : []) as any[]) {
    const fields = {
      name: str(s?.serviceName ?? s?.name).trim() || 'Consultation',
      price: toFloat(s?.sessionFee ?? s?.price, 0),
      duration: toInt(s?.durationMinutes ?? s?.duration, 50),
      sessionCount: Math.max(1, toInt(s?.sessions ?? s?.sessionCount, 1)),
      platform: str(s?.platform).trim() || 'G-Meet',
      platformFee: toFloat(s?.platformFee, 0),
      description: str(s?.description),
      retired: false,
      updatedAt: now
    };
    if (fields.price <= 0) continue;
    const incomingId = str(s?.id ?? s?._id).trim();
    const match = incomingId && !kept.has(incomingId) ? byId.get(incomingId) : undefined;
    if (match) {
      await db.collection('Service').updateOne({ _id: match._id }, { $set: fields });
      kept.add(String(match._id));
    } else {
      const id = newId();
      await db.collection('Service').insertOne({ _id: id as any, ...fields, consultantId, createdAt: now });
      kept.add(id);
    }
    prices.push(fields.price);
  }

  // Plans no longer offered: booked ones stay readable for past bookings, unused ones are removed
  const removed = existing.filter((e: any) => !kept.has(String(e._id))).map((e: any) => e._id);
  if (removed.length) {
    const used = new Set((await db.collection('Booking').distinct('serviceId', { serviceId: { $in: removed } })).map(String));
    const unused = removed.filter((id: any) => !used.has(String(id)));
    const booked = removed.filter((id: any) => used.has(String(id)));
    if (unused.length) await db.collection('Service').deleteMany({ _id: { $in: unused } });
    if (booked.length) await db.collection('Service').updateMany({ _id: { $in: booked } }, { $set: { retired: true, updatedAt: now } });
  }
  return prices.length ? Math.min(...prices) : null;
}

/**
 * One authorship rule for reviews: admin-entered reviews have no author (authorId null, or the
 * legacy "ADMIN" marker) and no clientId; reviews written by clients carry authorId, clientId or verified.
 */
export function isClientReview(r: any): boolean {
  return Boolean((r?.authorId && r.authorId !== 'ADMIN') || r?.clientId || r?.verified);
}

/** Mongo filter matching admin-entered reviews only */
export const ADMIN_REVIEW_FILTER = {
  $and: [{ $or: [{ authorId: null }, { authorId: 'ADMIN' }] }, { clientId: null }, { verified: { $ne: true } }]
};

/** Replaces the admin-entered reviews; reviews written by clients are never changed, dropped or duplicated */
export async function replaceAdminReviews(consultantId: string, reviews: unknown): Promise<void> {
  const db = getDatabase();
  const incoming = (Array.isArray(reviews) ? reviews : []) as any[];
  // The admin panel lists client reviews too; those entries come back and are skipped
  const incomingIds = incoming.map((r) => str(r?.id ?? r?._id).trim()).filter(Boolean);
  const clientReviewIds = new Set(
    (incomingIds.length ? await db.collection('Review').find({ _id: { $in: incomingIds as any[] } }).toArray() : [])
      .filter(isClientReview)
      .map((r: any) => String(r._id))
  );
  const list = incoming
    .filter((r) => !clientReviewIds.has(str(r?.id ?? r?._id).trim()) && !isClientReview(r) && !r?.isVerifiedClient)
    .map((r: any) => {
      const created = r?.date ? new Date(r.date) : new Date();
      return {
        _id: newId() as any,
        rating: Math.min(5, Math.max(1, toInt(r?.rating, 5))),
        comment: str(r?.comment).trim() || null,
        clientName: str(r?.clientName).trim() || null,
        clientTitle: str(r?.clientTitle).trim() || null,
        imageUrls: toStrArr(r?.images ?? r?.imageUrls),
        imageAltTexts: [] as string[],
        authorId: null,
        consultantId,
        createdAt: isNaN(created.getTime()) ? new Date() : created,
        updatedAt: new Date()
      };
    })
    .filter((r) => r.comment || r.clientName);
  await db.collection('Review').deleteMany({ consultantId, ...ADMIN_REVIEW_FILTER });
  if (list.length) await db.collection('Review').insertMany(list);
}

/** Average rating (one decimal) and number of reviews; both 0 when there are none */
export function reviewStats(reviews: any[]): { rating: number; reviewCount: number } {
  if (!reviews.length) return { rating: 0, reviewCount: 0 };
  const sum = reviews.reduce((acc: number, r: any) => acc + (Number(r.rating) || 0), 0);
  return { rating: Math.round((sum / reviews.length) * 10) / 10, reviewCount: reviews.length };
}

// ---------------------------------------------------------------------------
// Consultant status switches (set in the Super Admin panel)
// ---------------------------------------------------------------------------

const isAccountOff = (c: any) => ['inactive', 'suspended'].includes(String(c?.accountStatus || 'Active').trim().toLowerCase());

/** Listed on the public website (same rule as isConsultantPublic in Live_Panel/lib/visibility.ts) */
export function isConsultantPublic(c: any): boolean {
  return Boolean(c) && !c.isHiddenFromLive && !c.isArchived && !isAccountOff(c);
}

/**
 * Whether new sessions can be booked: not archived, account not Inactive/Suspended, and booking not
 * switched off (isBookingGreyedOut). Hiding a profile from the website (isHiddenFromLive) only
 * removes it from public listings; it does not block bookings.
 */
export function isConsultantBookable(c: any): boolean {
  return consultantBookingBlockReason(c) === null;
}

/** Why a consultant cannot be booked, or null when they can */
export function consultantBookingBlockReason(c: any): string | null {
  if (!c) return 'This therapist was not found.';
  if (c.isArchived) return 'This therapist is no longer available for booking.';
  if (isAccountOff(c)) return 'This therapist is not accepting bookings right now.';
  if (c.isBookingGreyedOut) return 'Booking is currently switched off for this therapist.';
  return null;
}

// ---------------------------------------------------------------------------
// Consultant privacy
// ---------------------------------------------------------------------------

/** Never returned by any endpoint */
const SECRET_CONSULTANT_FIELDS = ['password', 'passwordHash', 'hashedPassword', 'resetToken', 'resetPasswordToken', 'resetPasswordExpires', 'otp', 'otpExpires', 'refreshToken'];
/** Returned only to administrators, internal callers and the consultant themself */
const PRIVATE_CONSULTANT_FIELDS = ['bankName', 'bankAccountNumber', 'bankIfsc', 'accountHolderName', 'upiId', 'assignedClientIds', 'alternateEmail'];

export function stripConsultantPrivateFields<T extends Record<string, any>>(c: T, includePrivate: boolean): T {
  const out: Record<string, any> = { ...c };
  SECRET_CONSULTANT_FIELDS.forEach((k) => delete out[k]);
  if (!includePrivate) PRIVATE_CONSULTANT_FIELDS.forEach((k) => delete out[k]);
  return out as T;
}

// ---------------------------------------------------------------------------
// Consultant document (admin payload → Prisma shape)
// ---------------------------------------------------------------------------

const CONSULTANT_FLAGS = ['isHiddenFromLive', 'isArchived', 'isBookingGreyedOut'] as const;

/** Invalid admin input; controllers answer with `status` and the message */
export class ContentInputError extends Error {
  constructor(message: string, public status = 400) {
    super(message);
    this.name = 'ContentInputError';
  }
}

/**
 * Prisma-shaped $set for the fields present in the admin payload. Only provided fields are
 * returned, so partial updates (toggles) never clear other data.
 * Throws ContentInputError when a profession is sent that does not exist.
 */
export async function consultantFieldsFromAdmin(body: any): Promise<Record<string, any>> {
  const set: Record<string, any> = {};
  const has = (k: string) => body[k] !== undefined;

  if (has('name')) set.name = str(body.name).trim();
  if (has('email')) set.email = str(body.email).trim().toLowerCase();
  if (has('identifier')) set.identifier = slugify(str(body.identifier)) || undefined;
  if (has('notificationTitle')) set.notificationTitle = str(body.notificationTitle).trim() || null;
  if (has('sequence')) set.sequence = body.sequence === '' || body.sequence === null ? null : toInt(body.sequence);
  if (has('photo') || has('photoUrl')) {
    // photoUrl is what the website reads; the other names are kept equal for older readers
    set.photoUrl = str(body.photo ?? body.photoUrl).trim() || null;
    set.photo = set.photoUrl;
    set.image = set.photoUrl;
    set.avatarUrl = set.photoUrl;
  }
  if (has('photoAltText')) set.photoAltText = str(body.photoAltText).trim() || null;
  if (has('youtubeUrl')) set.youtubeUrl = str(body.youtubeUrl).trim() || null;
  if (has('about') || has('bio')) {
    // `about` is the website's field; `bio` is the same text for the panels
    set.about = str(body.about ?? body.bio).trim() || null;
    set.bio = set.about;
  }
  if (has('isCertified')) set.isCertified = Boolean(body.isCertified);
  if (has('experienceYears') || has('experience')) set.experience = toInt(body.experienceYears ?? body.experience, 0);
  if (has('clientsServed') || has('clientCount')) set.clientCount = toInt(body.clientsServed ?? body.clientCount, 0);
  if (has('specializations') || has('specialties')) set.specialties = toStrArr(body.specializations ?? body.specialties);
  if (has('languages')) set.languages = toStrArr(body.languages);
  if (has('qualifications')) set.qualifications = toStrArr(body.qualifications);
  if (has('faqs')) set.faqs = toFaqs(body.faqs);
  if (has('certificates') || has('certificateUrls')) {
    const certs = Array.isArray(body.certificates)
      ? body.certificates.map((c: any) => (typeof c === 'string' ? { url: c, name: '' } : { url: str(c?.url), name: str(c?.name) })).filter((c: any) => c.url)
      : toStrArr(body.certificateUrls).map((url, i) => ({ url, name: toStrArr(body.certificateAltTexts)[i] || '' }));
    set.certificateUrls = certs.map((c: any) => c.url);
    set.certificateAltTexts = certs.map((c: any, i: number) => c.name || `Certificate ${i + 1}`);
  }
  if (has('profession') || has('professionId')) {
    // professionId is preferred; a profession id, identifier or name also resolves. The stored
    // name always mirrors the Profession document, and an unknown value is rejected.
    const byId = str(body.professionId).trim();
    const byName = str(body.profession).trim();
    if (byId || byName) {
      const prof = (byId && await resolveProfession(byId)) || (byName && await resolveProfession(byName)) || null;
      if (!prof) {
        throw new ContentInputError(`Profession "${byId || byName}" does not exist. Choose one from the professions list.`);
      }
      set.professionId = String(prof._id);
      set.profession = prof.name;
    }
  }
  if (has('accountStatus')) set.accountStatus = str(body.accountStatus);
  CONSULTANT_FLAGS.forEach((k) => {
    if (has(k)) set[k] = Boolean(body[k]);
  });

  // Fields the admin panel keeps for its own screens (not used by the public site)
  ['licenseNumber', 'platformFeePerSession', 'platformFeeType', 'verificationStatus', 'bankName', 'bankAccountNumber', 'bankIfsc', 'accountHolderName', 'upiId', 'availability', 'workingHours']
    .forEach((k) => { if (has(k)) set[k] = body[k]; });

  Object.keys(set).forEach((k) => set[k] === undefined && delete set[k]);
  return set;
}

/** Required Prisma fields a newly created consultant must have */
export function consultantDefaults(name: string, email: string, identifier: string) {
  return {
    name,
    email,
    identifier,
    clientCount: 0,
    experience: 0,
    certificateUrls: [] as string[],
    certificateAltTexts: [] as string[],
    qualifications: [] as string[],
    specialties: [] as string[],
    languages: [] as string[],
    faqs: [] as any[],
    isCertified: false
  };
}

/** Prisma-shaped consultant + its Service/Review/SeoMeta → the admin panel's Therapist fields */
export async function consultantToAdmin(c: any): Promise<any> {
  const db = getDatabase();
  const id = String(c._id ?? c.id);
  const [services, reviews, seo, profession] = await Promise.all([
    db.collection('Service').find({ consultantId: id, retired: { $ne: true } }).sort({ price: 1 }).toArray(),
    db.collection('Review').find({ consultantId: id }).sort({ createdAt: -1 }).toArray(),
    readSeoMeta(c.seoMetaId),
    c.professionId ? db.collection('Profession').findOne({ _id: c.professionId }) : null
  ]);
  return {
    services: services.map((s: any) => ({
      id: String(s._id),
      serviceName: s.name,
      sessionFee: s.price,
      durationMinutes: s.duration,
      sessions: s.sessionCount,
      platform: s.platform,
      platformFee: s.platformFee || 0,
      description: s.description || ''
    })),
    reviews: reviews.map((r: any) => ({
      id: String(r._id),
      clientName: r.clientName || 'Client',
      clientTitle: r.clientTitle || '',
      rating: r.rating,
      comment: r.comment || '',
      date: r.createdAt ? new Date(r.createdAt).toISOString().slice(0, 10) : '',
      images: r.imageUrls || [],
      isVerifiedClient: isClientReview(r)
    })),
    ...reviewStats(reviews),
    seo: seoToAdmin(seo),
    professionName: profession?.name,
    about: c.about ?? c.bio ?? '',
    bio: c.about ?? c.bio ?? '',
    isBookable: isConsultantBookable(c),
    photo: c.photoUrl || c.photo || '',
    specializations: c.specialties || c.specializations || [],
    clientsServed: c.clientCount ?? c.clientsServed ?? 0,
    experienceYears: c.experience ?? c.experienceYears ?? 0,
    certificates: (c.certificateUrls || []).map((url: string, i: number) => ({ url, name: (c.certificateAltTexts || [])[i] || '' }))
  };
}
