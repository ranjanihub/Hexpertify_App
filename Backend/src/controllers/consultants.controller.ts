import { Request, Response } from 'express';
import { ObjectId } from 'mongodb';
import { getDatabase } from '../db/mongodb';

export class ConsultantsController {
  /**
   * GET /api/consultants and GET /api/admin/consultants
   */
  static async getAll(req: Request, res: Response): Promise<void> {
    try {
      const db = getDatabase();
      const primaryList = await db.collection('Consultant').find({}).toArray();
      const fallbackList = primaryList.length === 0 ? await db.collection('consultants').find({}).toArray() : [];
      const consultants = primaryList.length > 0 ? primaryList : fallbackList;

      // Load related collections for dynamic enrichment
      const [bookings, professions, reviews] = await Promise.all([
        db.collection('Booking').find({}).toArray().catch(() => []),
        db.collection('Profession').find({}).toArray().catch(() => []),
        db.collection('Review').find({}).toArray().catch(() => [])
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

        myBookings.forEach((b: any) => {
          if (b.clientEmail) clientSet.add(b.clientEmail.toLowerCase().trim());
          else if (b.clientName) clientSet.add(b.clientName.toLowerCase().trim());
          else if (b.clientId) clientSet.add(String(b.clientId).toLowerCase().trim());

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
        const photoUrl = c.photo || c.photoUrl || c.image || 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&w=400&q=80';
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

      const serviceFee = Number(
        body.services?.[0]?.sessionFee ||
        body.services?.[0]?.price ||
        body.platformFeePerSession ||
        body.fees ||
        body.minPrice ||
        500
      );

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

      // 1. Check user assignment in User table
      if (email || clientId) {
        const user = await db.collection('User').findOne({
          $or: [
            ...(email ? [{ email: email }] : []),
            ...(clientId ? [{ id: clientId }] : [])
          ]
        }) || await db.collection('users').findOne({
          $or: [
            ...(email ? [{ email: email }] : []),
            ...(clientId ? [{ id: clientId }] : [])
          ]
        });

        if (user?.assignedTherapistName || user?.therapist) {
          targetTherapistName = user.assignedTherapistName || user.therapist;
        }
        if (user?.assignedTherapistId) {
          targetTherapistId = user.assignedTherapistId;
        }
      }

      // 2. If no direct assignment, check latest booking
      if (!targetTherapistName && !targetTherapistId && (email || clientId)) {
        const booking = await db.collection('Booking').findOne(
          {
            $or: [
              ...(email ? [{ clientEmail: email }] : []),
              ...(clientId ? [{ clientId: clientId }, { userId: clientId }] : [])
            ]
          },
          { sort: { scheduledAt: -1, createdAt: -1 } }
        ) || await db.collection('bookings').findOne(
          {
            $or: [
              ...(email ? [{ clientEmail: email }] : []),
              ...(clientId ? [{ clientId: clientId }, { userId: clientId }] : [])
            ]
          },
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
            orCond.push({ _id: new ObjectId(targetTherapistId) });
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

      res.json({
        success: true,
        therapist: {
          id: consultant.id || String(consultant._id),
          name: consultant.name,
          title: consultant.profession || consultant.title || consultant.specialty || 'Licensed Clinical Psychologist',
          avatarUrl: consultant.photo || consultant.image || consultant.photoUrl || 'https://res.cloudinary.com/ddgvdabyf/image/upload/v1766954534/uploads/orwxj9dw0f2bnj5cgxex.webp',
          bio: consultant.about || consultant.bio || `${consultant.name} is a dedicated mental health specialist with extensive clinical experience.`,
          specializations: consultant.specializations || [consultant.profession || 'Clinical Psychology', 'Anxiety & Stress Management', 'Cognitive Behavioral Therapy'],
          languages: consultant.languages || ['English', 'Hindi'],
          yearsOfExperience: consultant.experienceYears || consultant.yearsOfExperience || 5,
          rating: consultant.rating || 4.9,
          reviewCount: consultant.reviewCount || 45,
          sessionsCompleted: consultant.totalSessions || 120,
          isVerified: consultant.isCertified ?? true,
          email: consultant.email || 'therapist@hexpertify.com',
          location: 'Online Consultation (Virtual Session via Google Meet)',
          availability: 'Monday to Saturday (Flexible Morning & Evening Slots)',
          fees: consultant.platformFeePerSession || consultant.fees || 349
        }
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error?.message || 'Failed to fetch client therapist' });
    }
  }
}
