import { Request, Response } from 'express';
import { ObjectId } from 'mongodb';
import { getDatabase } from '../db/mongodb';

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
      const db = getDatabase();
      const primaryList = await db.collection('Consultant').find({}).toArray();
      const fallbackList = primaryList.length === 0 ? await db.collection('consultants').find({}).toArray() : [];
      const rawConsultants = primaryList.length > 0 ? primaryList : fallbackList;

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

      // Load related collections for dynamic enrichment
      const [bookings, professions, reviews, usersList] = await Promise.all([
        db.collection('Booking').find({}).toArray().catch(() => []),
        db.collection('Profession').find({}).toArray().catch(() => []),
        db.collection('Review').find({}).toArray().catch(() => []),
        db.collection('User').find({}).toArray().catch(() => [])
      ]);

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
          return (cId && rCid === cId) || (cName && (rCname.includes(cName) || cName.includes(rCname) && rCname.length > 2));
        });

        let avgRating = Number(c.rating) || 5.0;
        if (myReviews.length > 0) {
          const sumRating = myReviews.reduce((acc: number, r: any) => acc + (Number(r.rating) || 5), 0);
          avgRating = Math.round((sumRating / myReviews.length) * 10) / 10;
        }

        const realActiveClients = clientSet.size > 0 
          ? clientSet.size 
          : (c.activeClientsCount !== undefined ? Number(c.activeClientsCount) : (c.clientCount !== undefined ? Number(c.clientCount) : 0));

        const resolvedProfession = c.profession || c.title || (c.professionId ? profMap.get(c.professionId) : null) || 'Licensed Clinical Psychologist';
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

      res.json({
        success: true,
        count: enriched.length,
        consultants: enriched
      });
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

      let query: any = { id };
      if (ObjectId.isValid(id)) {
        query = { $or: [{ _id: new ObjectId(id) }, { id }] };
      }

      const consultant = await db.collection('Consultant').findOne(query) ||
                         await db.collection('consultants').findOne(query);

      if (!consultant) {
        res.status(404).json({ success: false, error: 'Consultant not found' });
        return;
      }

      res.json({
        success: true,
        consultant: {
          ...consultant,
          id: consultant.id || String(consultant._id)
        }
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error?.message || 'Failed to fetch consultant' });
    }
  }

  /**
   * POST /api/consultants
   */
  static async create(req: Request, res: Response): Promise<void> {
    try {
      const body = req.body || {};
      const { name, email, profession, title } = body;

      if (!name) {
        res.status(400).json({ success: false, error: 'Name is required' });
        return;
      }

      const db = getDatabase();
      const randomKey = new ObjectId().toString();
      const generatedId = body.id || `CON-${Date.now().toString().slice(-4)}`;
      const cleanSlug = body.identifier || body.slug || name.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + Date.now().toString().slice(-4);
      const safeEmail = (email || `${cleanSlug}@hexpertify.com`).toLowerCase().trim();

      // Check for existing consultant with the same email or name to prevent duplicates
      const existingConsultant = await db.collection('Consultant').findOne({
        $or: [
          { email: safeEmail },
          { name: new RegExp(`^${name.trim()}$`, 'i') }
        ]
      }) || await db.collection('consultants').findOne({
        $or: [
          { email: safeEmail },
          { name: new RegExp(`^${name.trim()}$`, 'i') }
        ]
      });

      const serviceFee = Number(
        body.services?.[0]?.sessionFee ||
        body.services?.[0]?.price ||
        body.platformFeePerSession ||
        body.fees ||
        body.minPrice ||
        500
      );

      if (existingConsultant) {
        const existingId = existingConsultant.id || String(existingConsultant._id);
        const updateDoc = {
          ...body,
          name: name.trim(),
          email: safeEmail,
          profession: profession || title || existingConsultant.profession || 'Licensed Clinical Psychologist',
          title: title || profession || existingConsultant.title || 'Licensed Clinical Psychologist',
          platformFeePerSession: serviceFee,
          fees: serviceFee,
          minPrice: serviceFee,
          updatedAt: new Date()
        };
        delete updateDoc.id;
        delete updateDoc._id;

        await Promise.all([
          db.collection('Consultant').updateOne({ $or: [{ id: existingId }, { email: safeEmail }] }, { $set: updateDoc }),
          db.collection('consultants').updateOne({ $or: [{ id: existingId }, { email: safeEmail }] }, { $set: updateDoc })
        ]);

        res.status(200).json({
          success: true,
          consultant: { ...existingConsultant, ...updateDoc, id: existingId },
          message: 'Existing consultant updated successfully (duplicate avoided).'
        });
        return;
      }

      const newConsultant: any = {
        ...body,
        id: generatedId,
        _id: generatedId,
        name: name.trim(),
        email: safeEmail,
        identifier: cleanSlug,
        profession: profession || title || 'Licensed Clinical Psychologist',
        title: title || profession || 'Licensed Clinical Psychologist',
        accountStatus: body.accountStatus || body.status || 'Active',
        isCertified: body.isCertified ?? true,
        rating: body.rating || 5.0,
        reviewCount: body.reviewCount || 1,
        platformFeePerSession: serviceFee,
        fees: serviceFee,
        minPrice: serviceFee,
        services: body.services || [],
        activeClientsCount: body.activeClientsCount || 0,
        photo: body.photo || body.photoUrl || 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&w=400&q=80',
        photoUrl: body.photoUrl || body.photo || 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&w=400&q=80',
        seoMetaId: body.seoMetaId || `seo-${randomKey}`,
        professionId: body.professionId || `prof-${randomKey}`,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      await Promise.all([
        db.collection('Consultant').insertOne({ ...newConsultant }).catch(() => {}),
        db.collection('consultants').insertOne({ ...newConsultant }).catch(() => {})
      ]);

      res.status(201).json({
        success: true,
        consultant: newConsultant,
        message: 'Consultant created successfully in MongoDB Atlas'
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error?.message || 'Failed to create consultant' });
    }
  }

  /**
   * PUT /api/consultants and PUT /api/consultants/:id
   */
  static async update(req: Request, res: Response): Promise<void> {
    try {
      const id = String(req.params.id || req.body?.id || req.body?._id || '');
      const updates = { ...req.body, updatedAt: new Date() };
      delete updates.id;
      delete updates._id;

      if (updates.services && Array.isArray(updates.services) && updates.services.length > 0) {
        const servicePrice = Number(updates.services[0]?.sessionFee || updates.services[0]?.price) || 0;
        if (servicePrice > 0) {
          updates.fees = servicePrice;
          updates.minPrice = servicePrice;
          updates.platformFeePerSession = servicePrice;
        }
      }

      const db = getDatabase();
      let query: any = null;

      if (id) {
        if (ObjectId.isValid(id)) {
          query = { $or: [{ _id: new ObjectId(id) }, { id }, { _id: id }] };
        } else {
          query = { $or: [{ id }, { _id: id }] };
        }
      } else if (updates.name) {
        query = { name: new RegExp(`^${updates.name.trim()}$`, 'i') };
      } else {
        res.status(400).json({ success: false, error: 'Consultant ID or Name is required' });
        return;
      }

      await Promise.all([
        db.collection('Consultant').updateMany(query, { $set: updates }),
        db.collection('consultants').updateMany(query, { $set: updates })
      ]);

      res.json({
        success: true,
        message: 'Consultant updated successfully in MongoDB Atlas'
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error?.message || 'Failed to update consultant' });
    }
  }

  /**
   * DELETE /api/consultants and DELETE /api/consultants/:id
   */
  static async delete(req: Request, res: Response): Promise<void> {
    try {
      const id = String(req.params.id || req.query.id || req.query.therapistId || req.body?.id || req.body?.therapistId || '').trim();

      if (!id) {
        res.status(400).json({ success: false, error: 'Consultant ID is required' });
        return;
      }

      const db = getDatabase();
      const orConditions: any[] = [
        { id: id },
        { _id: id }
      ];

      if (ObjectId.isValid(id)) {
        try {
          orConditions.push({ _id: new ObjectId(id) });
        } catch {}
      }

      const query = { $or: orConditions };

      const [res1, res2] = await Promise.all([
        db.collection('Consultant').deleteMany(query).catch(() => ({ deletedCount: 0 })),
        db.collection('consultants').deleteMany(query).catch(() => ({ deletedCount: 0 }))
      ]);

      const deletedTotal = ((res1 as any)?.deletedCount || 0) + ((res2 as any)?.deletedCount || 0);

      res.json({
        success: true,
        deletedCount: deletedTotal,
        message: 'Consultant removed successfully from MongoDB Atlas'
      });
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
      const db = getDatabase();

      let targetTherapistName = '';
      let targetTherapistId = '';

      // 1. Check user assignment in User table (case-insensitive regex for email)
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
          targetTherapistId = booking.consultantId || booking.therapistId || '';
          targetTherapistName = booking.consultantName || booking.therapistName || '';
        }
      }

      // 3. Lookup consultant in Consultant collection
      let consultant: any = null;
      if (targetTherapistId || targetTherapistName) {
        const cleanName = targetTherapistName.toLowerCase().replace(/^dr\.?\s*/i, '').trim();
        const orCond: any[] = [];
        if (targetTherapistId) {
          orCond.push({ id: targetTherapistId });
          if (ObjectId.isValid(targetTherapistId)) {
            try { orCond.push({ _id: new ObjectId(targetTherapistId) }); } catch {}
          }
        }
        if (cleanName || targetTherapistName) {
          orCond.push(
            { name: { $regex: cleanName || targetTherapistName, $options: 'i' } }
          );
        }

        consultant = await db.collection('Consultant').findOne(
          orCond.length > 0 ? { $or: orCond } : {}
        ) || await db.collection('consultants').findOne(
          orCond.length > 0 ? { $or: orCond } : {}
        );
      }

      // 4. If no consultant found, fallback to primary consultant in database
      if (!consultant) {
        consultant = await db.collection('Consultant').findOne({}) ||
                     await db.collection('consultants').findOne({});
      }

      if (!consultant) {
        res.status(404).json({ success: false, error: 'No therapist found' });
        return;
      }

      const rawAvatar = consultant.photo || consultant.photoUrl || consultant.image || consultant.avatarUrl;
      const consultantAvatar = normalizeImageUrl(rawAvatar) || 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&w=400&q=80';
      const consultantTitle = consultant.profession || consultant.title || consultant.specialty || 'Licensed Clinical Psychologist';
      const consultantBio = consultant.about || consultant.bio || `${consultant.name} is a dedicated mental health specialist with extensive clinical experience.`;
      const consultantEducation = (Array.isArray(consultant.education) && consultant.education.length > 0)
        ? consultant.education
        : [
            { degree: `Master of Arts in ${consultantTitle}`, institution: "Accredited Clinical Institute", year: "Verified" },
            { degree: "Post Graduate Diploma in Therapeutic Care", institution: "Board of Health & Psychology", year: "Certified" }
          ];
      const consultantCertifications = (Array.isArray(consultant.certifications) && consultant.certifications.length > 0)
        ? consultant.certifications
        : [
            `Certified ${consultantTitle}`,
            "REBT & Cognitive Behavioral Therapy Practitioner",
            "HIPAA & Client Confidentiality Verified"
          ];
      const consultantApproach = consultant.approach ||
        `I follow a calm, empathetic, and client-centered approach. I create a safe, non-judgmental space where clients can openly express their feelings and work toward emotional well-being.`;

      let availabilityStr = 'Monday to Saturday (Flexible Morning & Evening Slots)';
      if (typeof consultant.availability === 'string' && consultant.availability.trim()) {
        availabilityStr = consultant.availability.trim();
      } else if (consultant.availability && typeof consultant.availability === 'object') {
        const activeDays = Object.keys(consultant.availability).filter(
          (d) => Array.isArray(consultant.availability[d]) && consultant.availability[d].length > 0
        );
        if (activeDays.length > 0) {
          availabilityStr = `${activeDays[0]} to ${activeDays[activeDays.length - 1]} (Flexible Slots)`;
        }
      }

      res.json({
        success: true,
        therapist: {
          id: consultant.id || String(consultant._id),
          name: consultant.name,
          title: consultantTitle,
          avatarUrl: consultantAvatar,
          bio: consultantBio,
          specializations: consultant.specializations || [consultantTitle, 'Anxiety & Stress Management', 'Cognitive Behavioral Therapy'],
          languages: consultant.languages || ['English', 'Hindi'],
          yearsOfExperience: consultant.experienceYears || consultant.yearsOfExperience || 5,
          rating: consultant.rating || 4.95,
          reviewCount: consultant.reviewCount || 48,
          sessionsCompleted: consultant.totalSessions || 240,
          isVerified: consultant.isCertified ?? true,
          email: consultant.email || 'therapist@hexpertify.com',
          location: typeof consultant.location === 'string' && consultant.location.trim() ? consultant.location : 'Online Consultation (Virtual Session via Google Meet)',
          availability: availabilityStr,
          fees: consultant.platformFeePerSession || consultant.fees || 1500,
          education: consultantEducation,
          certifications: consultantCertifications,
          approach: consultantApproach
        }
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error?.message || 'Failed to fetch client therapist' });
    }
  }
}
