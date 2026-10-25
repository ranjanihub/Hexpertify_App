import { Request, Response } from 'express';
import { ObjectId } from 'mongodb';
import { getDatabase } from '../db/mongodb';
import { cacheService } from '../services/cache.service';
import { isAdminUser, isInternalRequest } from '../middlewares/auth.middleware';
import { resolveClientViewer } from '../services/client-access';
import {
  consultantDefaults, consultantFieldsFromAdmin, consultantToAdmin, idQuery, newId, replaceAdminReviews,
  replaceConsultantServices, slugify, upsertSeoMeta
} from '../services/live-content';

// Prisma-typed or derived fields that must never be copied from a request body as-is
const RESERVED_KEYS = new Set([
  'id', '_id', 'services', 'reviews', 'seo', 'minPrice', 'seoMetaId', 'createdAt', 'updatedAt',
  'name', 'email', 'identifier', 'notificationTitle', 'sequence', 'photo', 'photoUrl', 'photoAltText', 'youtubeUrl',
  'about', 'bio', 'isCertified', 'experience', 'experienceYears', 'clientCount', 'clientsServed', 'specialties',
  'specializations', 'languages', 'qualifications', 'faqs', 'certificates', 'certificateUrls', 'certificateAltTexts',
  'profession', 'professionId', 'accountStatus', 'isHiddenFromLive', 'isArchived', 'isBookingGreyedOut',
  // Computed by the list endpoint
  'rating', 'reviewCount', 'activeClientsCount', 'totalSessions', 'totalRevenue', 'therapyHours', 'fees', 'title', 'outcomes', 'professionName'
]);

/** Other keys (availability, working hours, ...) are kept as the panels send them */
function passthrough(body: any): Record<string, any> {
  const out: Record<string, any> = {};
  Object.keys(body || {}).forEach((k) => { if (!RESERVED_KEYS.has(k) && body[k] !== undefined) out[k] = body[k]; });
  return out;
}

/** Writes services, reviews and SEO (when present in the payload) and returns extra fields to $set */
async function writeRelatedContent(consultantId: string, body: any, existingSeoMetaId: string | null, name: string): Promise<Record<string, any>> {
  const extra: Record<string, any> = {};
  if (body.services !== undefined) {
    const minPrice = await replaceConsultantServices(consultantId, body.services);
    extra.minPrice = minPrice;
    if (minPrice) extra.fees = minPrice;
  }
  if (body.reviews !== undefined) await replaceAdminReviews(consultantId, body.reviews);
  if (body.seo !== undefined) extra.seoMetaId = await upsertSeoMeta(existingSeoMetaId, body.seo, name);
  return extra;
}

async function canEditConsultant(req: Request, consultant: any): Promise<boolean> {
  if (isInternalRequest(req) || isAdminUser(req.user)) return true;
  const viewer = await resolveClientViewer(req);
  if (viewer.kind !== 'therapist') return false;
  return [consultant._id, consultant.id, consultant.email].some((v) => v && viewer.ids.has(String(v).toLowerCase()));
}

export function normalizeImageUrl(url?: string): string {
  if (!url || typeof url !== 'string') return '';
  const trimmed = url.trim();
  if (trimmed.includes('google.com/imgres') || trimmed.includes('imgurl=')) {
    try {
      const match = trimmed.match(/[?&]imgurl=([^&]+)/i);
      if (match && match[1]) {
        return decodeURIComponent(match[1]);
      }
    } catch {}
  }
  return trimmed;
}

export class ConsultantsController {
  /**
   * GET /api/consultants and GET /api/admin/consultants
   */
  static async getAll(req: Request, res: Response): Promise<void> {
    try {
      const responseData = await cacheService.wrap('consultants:all', ['consultants', 'professions', 'reviews', 'users', 'bookings'], 20, async () => {
        const db = getDatabase();

        // Load all collections simultaneously
        const [rawConsultants, bookings, professions, reviews, usersList] = await Promise.all([
          db.collection('Consultant').find({}).toArray().catch(() => db.collection('consultants').find({}).toArray().catch(() => [])),
          db.collection('Booking').find({}).toArray().catch(() => db.collection('bookings').find({}).toArray().catch(() => [])),
          db.collection('Profession').find({}).toArray().catch(() => db.collection('professions').find({}).toArray().catch(() => [])),
          db.collection('Review').find({}).toArray().catch(() => db.collection('reviews').find({}).toArray().catch(() => [])),
          db.collection('User').find({}).toArray().catch(() => db.collection('users').find({}).toArray().catch(() => []))
        ]);

        // Deduplicate consultants by email or clean name
        const uniqueMap = new Map<string, any>();
        rawConsultants.forEach((c: any) => {
          const emailKey = (c.email || '').toLowerCase().trim();
          const nameKey = (c.name || '').toLowerCase().replace(/^dr\.?\s*/i, '').trim();
          const key = emailKey || nameKey || String(c.id || c._id);
          if (key && !uniqueMap.has(key)) {
            uniqueMap.set(key, c);
          }
        });
        const consultants = Array.from(uniqueMap.values());

        const profMap = new Map<string, string>();
        professions.forEach((p: any) => {
          profMap.set(String(p.id || p._id), p.name);
        });

        const enriched = consultants.map((c: any) => {
          const cId = String(c.id || c._id || '').toLowerCase();
          const cName = String(c.name || '').toLowerCase().replace(/^dr\.?\s*/i, '').trim();

          // 1. Calculate matching bookings
          const myBookings = bookings.filter((b: any) => {
            const bCid = String(b.consultantId || b.therapistId || '').toLowerCase();
            const bCname = String(b.consultantName || b.therapistName || '').toLowerCase();
            return (cId && bCid === cId) || (cName && (bCname.includes(cName) || cName.includes(bCname) && bCname.length > 2));
          });

          const clientSet = new Set<string>();
          let totalRev = 0;
          let totalMins = 0;

          // Count clients exclusively assigned to this consultant in User collection
          usersList.forEach((u: any) => {
            const uAssignedId = String(u.assignedTherapistId || '').toLowerCase().trim();
            const uAssignedName = String(u.assignedTherapistName || u.therapist || '').toLowerCase().replace(/^dr\.?\s*/i, '').trim();
            const isMyClient = (cId && uAssignedId === cId) || (cName && (uAssignedName.includes(cName) || cName.includes(uAssignedName) && uAssignedName.length > 2));
            if (isMyClient) {
              clientSet.add(String(u.email || u.id || u._id).toLowerCase());
            }
          });

          myBookings.forEach((b: any) => {
            if (String(b.status || '').toUpperCase() === 'COMPLETED' || String(b.paymentStatus || '').toUpperCase() === 'PAID') {
              totalRev += Number(b.amount) || 0;
            }
            totalMins += Number(b.durationMinutes || b.duration) || 50;
          });

          // 2. Calculate matching reviews
          const myReviews = reviews.filter((r: any) => {
            const rCid = String(r.consultantId || r.therapistId || '').toLowerCase();
            const rCname = String(r.consultantName || r.therapistName || '').toLowerCase();
            return (cId && rCid === cId) || (cName && (rCname.includes(cName) || rCname.includes(rCname) && rCname.length > 2));
          });

          let avgRating = Number(c.rating) || 5.0;
          if (myReviews.length > 0) {
            const sumRating = myReviews.reduce((acc: number, r: any) => acc + (Number(r.rating) || 5), 0);
            avgRating = Math.round((sumRating / myReviews.length) * 10) / 10;
          }

          const realActiveClients = clientSet.size > 0 
            ? clientSet.size 
            : (c.activeClientsCount !== undefined ? Number(c.activeClientsCount) : (c.clientCount !== undefined ? Number(c.clientCount) : 0));

          const resolvedProfession = (c.professionId ? profMap.get(String(c.professionId)) : null) || c.profession || c.title || 'Licensed Clinical Psychologist';
          const photoUrl = normalizeImageUrl(c.photo || c.photoUrl || c.image || c.avatarUrl) || 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&w=400&q=80';
          const primaryServiceFee = Number(
            c.services?.[0]?.sessionFee || 
            c.services?.[0]?.price || 
            c.platformFeePerSession ||
            c.fees || 
            c.minPrice
          ) || 500;

          return {
            ...c,
            id: c.id || String(c._id),
            profession: resolvedProfession,
            title: resolvedProfession,
            photo: photoUrl,
            photoUrl: photoUrl,
            services: c.services || [],
            activeClientsCount: realActiveClients,
            totalSessions: myBookings.length > 0 ? myBookings.length : (c.totalSessions || 0),
            totalRevenue: totalRev > 0 ? totalRev : (c.totalRevenue || 0),
            therapyHours: totalMins > 0 ? Math.round(totalMins / 60) : (c.therapyHours || 0),
            rating: avgRating,
            reviewCount: myReviews.length > 0 ? myReviews.length : (c.reviewCount || 1),
            experienceYears: c.experienceYears !== undefined ? Number(c.experienceYears) : (c.experience !== undefined ? Number(c.experience) : 0),
            clientsServed: c.clientsServed !== undefined ? Number(c.clientsServed) : (c.clientCount !== undefined ? Number(c.clientCount) : 0),
            fees: primaryServiceFee,
            minPrice: primaryServiceFee,
            platformFeePerSession: primaryServiceFee
          };
        });

        // Plans, reviews and SEO come from the collections the public website reads
        const withContent = await Promise.all(enriched.map(async (c: any) => {
          const content = await consultantToAdmin(c);
          const fee = content.services[0]?.sessionFee;
          return {
            ...c,
            ...content,
            profession: content.professionName || c.profession,
            title: content.professionName || c.title,
            photoUrl: content.photo || c.photoUrl,
            ...(fee ? { fees: fee, minPrice: fee } : {})
          };
        }));

        return {
          success: true,
          count: withContent.length,
          consultants: withContent
        };
      });

      res.json(responseData);
    } catch (error: any) {
      res.status(500).json({ success: false, error: error?.message || 'Failed to fetch consultants' });
    }
  }

  /**
   * GET /api/consultants/:id
   */
  static async getById(req: Request, res: Response): Promise<void> {
    try {
      const id = String(req.params.id || '');
      const db = getDatabase();
      const consultant: any = await db.collection('Consultant').findOne(idQuery(id)) ||
                              await db.collection('Consultant').findOne({ identifier: id });
      if (!consultant) {
        res.status(404).json({ success: false, error: 'Consultant not found' });
        return;
      }
      const content = await consultantToAdmin(consultant);
      res.json({
        success: true,
        consultant: { ...consultant, ...content, id: String(consultant._id ?? consultant.id), profession: content.professionName || consultant.profession }
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error?.message || 'Failed to fetch consultant' });
    }
  }

  /**
   * POST /api/consultants (admins). Stored in the shape the public website reads.
   */
  static async create(req: Request, res: Response): Promise<void> {
    try {
      if (!isInternalRequest(req) && !isAdminUser(req.user)) {
        res.status(401).json({ success: false, error: 'Administrator authentication required. Please sign in again.' });
        return;
      }
      const body = req.body || {};
      const name = String(body.name || '').trim();
      if (!name) {
        res.status(400).json({ success: false, error: 'Name is required' });
        return;
      }

      const db = getDatabase();
      const identifier = slugify(String(body.identifier || body.slug || '')) || `${slugify(name.replace(/^dr\.?\s*/i, ''))}-${Date.now().toString().slice(-4)}`;
      const email = String(body.email || `${identifier}@hexpertify.com`).toLowerCase().trim();

      // Same email: update that consultant instead of creating a duplicate
      const duplicate: any = await db.collection('Consultant').findOne({ email });
      if (duplicate) {
        req.params.id = String(duplicate._id);
        await ConsultantsController.update(req, res);
        return;
      }

      const id = newId();
      const fields = await consultantFieldsFromAdmin({ ...body, name, email, identifier });
      const doc: any = {
        _id: id,
        ...passthrough(body),
        ...consultantDefaults(name, email, identifier),
        ...fields,
        accountStatus: fields.accountStatus || 'Active',
        createdAt: new Date(),
        updatedAt: new Date()
      };
      await db.collection('Consultant').insertOne(doc);
      const related = await writeRelatedContent(id, body, null, name);
      if (Object.keys(related).length) await db.collection('Consultant').updateOne({ _id: id as any }, { $set: related });

      cacheService.invalidateTags(['consultants', 'stats', 'users']);
      const saved: any = await db.collection('Consultant').findOne({ _id: id as any });
      res.status(201).json({ success: true, consultant: { ...saved, ...(await consultantToAdmin(saved)), id }, message: 'Consultant created' });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error?.message || 'Failed to create consultant' });
    }
  }

  /**
   * PUT /api/consultants and PUT /api/consultants/:id (admins, or the therapist editing themselves).
   * Only the fields present in the payload change, so status toggles never clear other data.
   */
  static async update(req: Request, res: Response): Promise<void> {
    try {
      const body = req.body || {};
      const id = String(req.params.id || body.id || body._id || '');
      const db = getDatabase();

      let existing: any = null;
      if (id) {
        existing = await db.collection('Consultant').findOne(idQuery(id));
      } else if (body.name) {
        const rx = new RegExp(`^${String(body.name).trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i');
        existing = await db.collection('Consultant').findOne({ name: rx });
      }
      if (!existing) {
        const missingId = !id && !body.name;
        res.status(missingId ? 400 : 404).json({ success: false, error: missingId ? 'Consultant ID or Name is required' : 'Consultant not found' });
        return;
      }
      if (!(await canEditConsultant(req, existing))) {
        res.status(401).json({ success: false, error: 'You are not allowed to edit this profile. Please sign in again.' });
        return;
      }

      const fields = await consultantFieldsFromAdmin(body);
      if (fields.email) {
        const clash = await db.collection('Consultant').findOne({ email: fields.email, _id: { $ne: existing._id } });
        if (clash) {
          res.status(409).json({ success: false, error: `Another therapist already uses ${fields.email}` });
          return;
        }
      }
      if (fields.name === '') delete fields.name;

      const consultantId = String(existing._id);
      const related = await writeRelatedContent(consultantId, body, existing.seoMetaId || null, fields.name || existing.name);
      // Required Prisma fields older records may lack
      const repairs: Record<string, any> = {};
      if (typeof existing.clientCount !== 'number' && fields.clientCount === undefined) repairs.clientCount = 0;
      if (typeof existing.experience !== 'number' && fields.experience === undefined) repairs.experience = 0;
      if (!existing.email && !fields.email) repairs.email = `${existing.identifier || consultantId}@hexpertify.com`;

      await db.collection('Consultant').updateOne(
        { _id: existing._id },
        { $set: { ...passthrough(body), ...repairs, ...fields, ...related, updatedAt: new Date() } }
      );

      cacheService.invalidateTags(['consultants', 'stats', 'users']);
      const saved: any = await db.collection('Consultant').findOne({ _id: existing._id });
      res.json({ success: true, consultant: { ...saved, ...(await consultantToAdmin(saved)), id: consultantId }, message: 'Consultant updated' });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error?.message || 'Failed to update consultant' });
    }
  }

  /**
   * DELETE /api/consultants and DELETE /api/consultants/:id (admins)
   */
  static async delete(req: Request, res: Response): Promise<void> {
    try {
      if (!isInternalRequest(req) && !isAdminUser(req.user)) {
        res.status(401).json({ success: false, error: 'Administrator authentication required. Please sign in again.' });
        return;
      }
      const id = String(req.params.id || req.query.id || req.query.therapistId || req.body?.id || req.body?.therapistId || '').trim();
      if (!id) {
        res.status(400).json({ success: false, error: 'Consultant ID is required' });
        return;
      }

      const db = getDatabase();
      const existing: any = await db.collection('Consultant').findOne(idQuery(id));
      if (!existing) {
        res.status(404).json({ success: false, error: 'Consultant not found' });
        return;
      }
      const consultantId = String(existing._id);
      const bookings = await db.collection('Booking').countDocuments({ consultantId });
      if (bookings) {
        res.status(409).json({ success: false, error: `This therapist has ${bookings} booking(s). Archive or hide them from the website instead of deleting, so booking history stays intact.` });
        return;
      }

      await Promise.all([
        db.collection('Consultant').deleteOne({ _id: existing._id }),
        db.collection('consultants').deleteMany(idQuery(id)).catch(() => {}),
        db.collection('Service').deleteMany({ consultantId }),
        db.collection('Review').deleteMany({ consultantId }),
        existing.seoMetaId ? db.collection('SeoMeta').deleteOne({ _id: existing.seoMetaId }) : Promise.resolve()
      ]);

      cacheService.invalidateTags(['consultants', 'stats', 'users']);
      res.json({ success: true, deletedCount: 1, message: 'Consultant removed' });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error?.message || 'Failed to delete consultant' });
    }
  }


  /**
   * GET /api/client/therapist
   */
  static async getClientTherapist(req: Request, res: Response): Promise<void> {
    try {
      const email = String(req.query.email || req.query.clientEmail || '').toLowerCase().trim();
      const clientId = String(req.query.id || req.query.clientId || '').trim();
      const cacheKey = `client-therapist:${email}:${clientId}`;

      const responseData = await cacheService.wrap(cacheKey, ['consultants', 'users', 'bookings'], 15, async () => {
        const db = getDatabase();

        let targetTherapistName = '';
        let targetTherapistId = '';

        // 1. Check user assignment in User table
        if (email || clientId) {
          const userOrConditions: any[] = [];
          if (email) {
            userOrConditions.push({ email: { $regex: `^${email.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, $options: 'i' } });
          }
          if (clientId) {
            userOrConditions.push({ id: clientId });
            if (ObjectId.isValid(clientId)) {
              try { userOrConditions.push({ _id: new ObjectId(clientId) }); } catch {}
            }
          }

          const user = (userOrConditions.length > 0)
            ? (await db.collection('User').findOne({ $or: userOrConditions }) || await db.collection('users').findOne({ $or: userOrConditions }))
            : null;

          if (user?.assignedTherapistName || user?.therapist) {
            targetTherapistName = user.assignedTherapistName || user.therapist;
          }
          if (user?.assignedTherapistId) {
            targetTherapistId = user.assignedTherapistId;
          }
        }

        // 2. If no direct assignment, check latest booking
        if (!targetTherapistName && !targetTherapistId && (email || clientId)) {
          const bookingOrConditions: any[] = [];
          if (email) {
            bookingOrConditions.push({ clientEmail: { $regex: `^${email.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, $options: 'i' } });
          }
          if (clientId) {
            bookingOrConditions.push({ clientId: clientId }, { userId: clientId });
          }

          const booking = await db.collection('Booking').findOne(
            { $or: bookingOrConditions },
            { sort: { scheduledAt: -1, createdAt: -1 } }
          ) || await db.collection('bookings').findOne(
            { $or: bookingOrConditions },
            { sort: { scheduledAt: -1, createdAt: -1 } }
          );

          if (booking) {
            targetTherapistName = booking.consultantName || booking.therapistName || '';
            targetTherapistId = booking.consultantId || booking.therapistId || '';
          }
        }

        // 3. Find consultant document
        const consConditions: any[] = [];
        if (targetTherapistId) {
          consConditions.push({ id: targetTherapistId });
          if (ObjectId.isValid(targetTherapistId)) {
            try { consConditions.push({ _id: new ObjectId(targetTherapistId) }); } catch {}
          }
        }
        if (targetTherapistName) {
          const cleanName = targetTherapistName.replace(/^dr\.?\s*/i, '').trim();
          consConditions.push({ name: { $regex: cleanName, $options: 'i' } });
        }

        let consultant = (consConditions.length > 0)
          ? (await db.collection('Consultant').findOne({ $or: consConditions }) || await db.collection('consultants').findOne({ $or: consConditions }))
          : null;

        if (!consultant) {
          consultant = await db.collection('Consultant').findOne({}) || await db.collection('consultants').findOne({});
        }

        if (!consultant) {
          return null;
        }

        const photo = normalizeImageUrl(consultant.photo || consultant.photoUrl || consultant.image || consultant.avatarUrl) || 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&w=400&q=80';

        return {
          success: true,
          therapist: {
            id: consultant.id || String(consultant._id || 'doc-1'),
            name: consultant.name || 'Dr. Evelyn Reed',
            email: consultant.email || 'dr.evelyn@hexpertify.com',
            photo: photo,
            photoUrl: photo,
            avatarUrl: photo,
            profession: consultant.profession || consultant.title || 'Licensed Clinical Psychologist',
            title: consultant.title || consultant.profession || 'Licensed Clinical Psychologist',
            rating: consultant.rating !== undefined ? Number(consultant.rating) : 4.9,
            experience: consultant.experience || consultant.experienceYears || '12+ years',
            experienceYears: consultant.experienceYears || consultant.experience || 12,
            bio: consultant.bio || consultant.about || 'Dedicated clinical psychologist specializing in cognitive behavioral therapy and emotional resilience.',
            qualifications: consultant.qualifications || ['Psy.D. in Clinical Psychology', 'Licensed Mental Health Counselor (LMHC)', 'Certified CBT Practitioner'],
            certificates: consultant.certificates || [],
            languages: consultant.languages || ['English', 'Hindi'],
            specializations: consultant.specializations || consultant.specialties || ['Anxiety & Depression', 'Stress Management', 'CBT Therapy'],
            isCertified: consultant.isCertified !== false,
            services: consultant.services || []
          }
        };
      });

      if (!responseData) {
        res.status(404).json({ success: false, error: 'No assigned therapist found.' });
        return;
      }

      res.json(responseData);
    } catch (error: any) {
      res.status(500).json({ success: false, error: error?.message || 'Failed to fetch assigned therapist' });
    }
  }
}
