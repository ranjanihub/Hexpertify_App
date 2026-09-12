import { Request, Response } from 'express';
import { ObjectId } from 'mongodb';
import { getDatabase } from '../db/mongodb';
import { config } from '../config';

export class UsersController {
  /**
   * GET /api/users and GET /api/admin/users
   */
  static async getAll(req: Request, res: Response): Promise<void> {
    try {
      const db = getDatabase();
      const therapistId = String(req.query.therapistId || req.query.consultantId || '').trim();
      const therapistName = String(req.query.therapistName || req.query.consultantName || '').trim();
      const roleFilter = String(req.query.role || '').trim();

      const primaryUsers = await db.collection('User').find({}).toArray();
      const fallbackUsers = primaryUsers.length === 0 ? await db.collection('users').find({}).toArray() : [];
      let users = primaryUsers.length > 0 ? primaryUsers : fallbackUsers;

      // Filter out admins and therapists if requesting clients
      if (roleFilter.toUpperCase() === 'CLIENT' || roleFilter.toUpperCase() === 'USER' || therapistId || therapistName) {
        users = users.filter((u) => {
          const r = String(u.role || '').toUpperCase();
          return r !== 'ADMIN' && r !== 'THERAPIST' && r !== 'CONSULTANT';
        });
      }

      if (therapistId || therapistName) {
        const cleanName = therapistName.toLowerCase().replace(/^dr\.?\s*/i, '').trim();

        // 1. Find all matching consultant IDs
        const allConsultants = await db.collection('Consultant').find({}).toArray();
        const fallbackCons = allConsultants.length === 0 ? await db.collection('consultants').find({}).toArray() : [];
        const consList = allConsultants.length > 0 ? allConsultants : fallbackCons;

        const matchedConsultantIds = new Set<string>();
        if (therapistId) matchedConsultantIds.add(therapistId.toLowerCase());

        consList.forEach((c: any) => {
          const cId = String(c.id || c._id || '').toLowerCase();
          const cName = String(c.name || '').toLowerCase();
          if ((therapistId && cId === therapistId.toLowerCase()) ||
              (cleanName && cName.includes(cleanName)) ||
              (therapistName && cName.includes(therapistName.toLowerCase()))) {
            matchedConsultantIds.add(cId);
            if (c.id) matchedConsultantIds.add(String(c.id).toLowerCase());
            if (c._id) matchedConsultantIds.add(String(c._id).toLowerCase());
          }
        });

        // 2. Query bookings for this consultant
        const allBookings = await db.collection('Booking').find({}).toArray();
        const fallbackBookings = allBookings.length === 0 ? await db.collection('bookings').find({}).toArray() : [];
        const bookingsList = allBookings.length > 0 ? allBookings : fallbackBookings;

        const matchedBookings = bookingsList.filter((b: any) => {
          const bCid = String(b.consultantId || b.therapistId || '').toLowerCase();
          const bCname = String(b.consultantName || b.therapistName || '').toLowerCase();
          return matchedConsultantIds.has(bCid) ||
                 (cleanName && bCname.includes(cleanName)) ||
                 (therapistName && bCname.includes(therapistName.toLowerCase()));
        });

        const clientEmails = new Set<string>();
        const clientNames = new Set<string>();
        const clientIds = new Set<string>();

        matchedBookings.forEach((b: any) => {
          if (b.clientEmail) clientEmails.add(b.clientEmail.toLowerCase().trim());
          if (b.clientName) clientNames.add(b.clientName.toLowerCase().trim());
          if (b.clientId) clientIds.add(String(b.clientId).toLowerCase().trim());
          if (b.userId) clientIds.add(String(b.userId).toLowerCase().trim());
        });

        const matchedUsers = users.filter((u: any) => {
          const uEmail = String(u.email || '').toLowerCase().trim();
          const uName = String(u.name || '').toLowerCase().trim();
          const uId = String(u.id || u._id || '').toLowerCase().trim();
          const uAssigned = String(u.assignedTherapistName || u.therapist || '').toLowerCase().trim();
          const uAssignedId = String(u.assignedTherapistId || '').toLowerCase().trim();

          const isAssigned = (therapistId && uAssignedId === therapistId.toLowerCase()) ||
                             matchedConsultantIds.has(uAssignedId) ||
                             (cleanName && uAssigned.includes(cleanName)) ||
                             (therapistName && uAssigned.includes(therapistName.toLowerCase()));

          const hasBooking = clientEmails.has(uEmail) || clientNames.has(uName) || clientIds.has(uId);

          return isAssigned || hasBooking;
        });

        // Also create client objects for any booking clients not in the User collection
        matchedBookings.forEach((b: any, idx: number) => {
          const bEmail = String(b.clientEmail || '').toLowerCase().trim();
          const bName = String(b.clientName || '').toLowerCase().trim();
          const exists = matchedUsers.some((u: any) => 
            (bEmail && String(u.email || '').toLowerCase().trim() === bEmail) ||
            (bName && String(u.name || '').toLowerCase().trim() === bName)
          );
          if (!exists && (b.clientName || b.clientEmail)) {
            matchedUsers.push({
              _id: new ObjectId(),
              id: b.clientId || b.userId || `BK-CLI-${idx + 1}`,
              name: b.clientName || 'Client User',
              email: b.clientEmail || 'client@example.com',
              phone: b.clientPhone || '+91 98765 43210',
              role: 'USER',
              assignedTherapistName: b.consultantName || b.therapistName || therapistName,
              assignedTherapistId: b.consultantId || therapistId,
              createdAt: b.scheduledAt ? new Date(b.scheduledAt) : (b.date ? new Date(b.date) : new Date())
            });
          }
        });

        users = matchedUsers;
      }

      res.json({
        success: true,
        count: users.length,
        users: users.map((u: any) => ({
          ...u,
          id: u.id || String(u._id)
        }))
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error?.message || 'Failed to fetch users' });
    }
  }

  /**
   * GET /api/users/:id
   */
  static async getById(req: Request, res: Response): Promise<void> {
    try {
      const id = String(req.params.id || '');
      const db = getDatabase();

      let query: any = { id };
      if (ObjectId.isValid(id)) {
        query = { $or: [{ _id: new ObjectId(id) }, { id }] };
      }

      const user = await db.collection('User').findOne(query) ||
                   await db.collection('users').findOne(query);

      if (!user) {
        res.status(404).json({ success: false, error: 'User not found' });
        return;
      }

      res.json({
        success: true,
        user: { ...user, id: user.id || String(user._id) }
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error?.message || 'Failed to fetch user' });
    }
  }

  /**
   * POST /api/users
   */
  static async create(req: Request, res: Response): Promise<void> {
    try {
      const body = req.body || {};
      const { name, email, role } = body;

      if (!name || !email) {
        res.status(400).json({ success: false, error: 'Name and email are required' });
        return;
      }

      const db = getDatabase();
      const isUserRole = (role !== 'ADMIN' && role !== 'Super Admin');
      let assignedTherapistId = body.assignedTherapistId || '';
      let assignedTherapistName = body.assignedTherapistName || body.therapist || '';
      let assignedTherapistEmail = body.assignedTherapistEmail || '';
      let assignedTherapistPhoto = body.assignedTherapistPhoto || '';

      if (isUserRole && (!assignedTherapistId || !assignedTherapistName || !assignedTherapistEmail)) {
        let consultant: any = null;
        if (assignedTherapistId) {
          consultant = await db.collection('Consultant').findOne({ id: assignedTherapistId }) ||
                       await db.collection('consultants').findOne({ id: assignedTherapistId });
        }
        if (!consultant && assignedTherapistName) {
          const clean = assignedTherapistName.replace(/^dr\.?\s*/i, '').trim();
          consultant = await db.collection('Consultant').findOne({ name: { $regex: clean, $options: 'i' } }) ||
                       await db.collection('consultants').findOne({ name: { $regex: clean, $options: 'i' } });
        }
        if (!consultant) {
          consultant = await db.collection('Consultant').findOne({}) ||
                       await db.collection('consultants').findOne({});
        }
        if (consultant) {
          assignedTherapistId = consultant.id || String(consultant._id || 'doc-1');
          assignedTherapistName = consultant.name || 'Dr. Evelyn Reed';
          assignedTherapistEmail = consultant.email || 'dr.evelyn@hexpertify.com';
          assignedTherapistPhoto = consultant.photoUrl || consultant.avatarUrl || consultant.image || '';
        }
      }

      const newUser: any = {
        id: body.id || `USR-${Date.now().toString().slice(-4)}`,
        name: name.trim(),
        email: email.toLowerCase().trim(),
        role: isUserRole ? 'USER' : 'ADMIN',
        status: body.status || 'Active',
        image: body.image || body.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
        phone: body.phone || '+1 555-019-2834',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      if (isUserRole) {
        newUser.assignedTherapistId = assignedTherapistId;
        newUser.assignedTherapistName = assignedTherapistName;
        newUser.assignedTherapistEmail = assignedTherapistEmail;
        newUser.assignedTherapistPhoto = assignedTherapistPhoto;
        newUser.firstConsultationCompleted = true;
      }

      const result = await db.collection('User').insertOne(newUser);
      await db.collection('users').insertOne({ ...newUser, _id: result.insertedId }).catch(() => {});

      res.status(201).json({
        success: true,
        user: { ...newUser, _id: result.insertedId },
        message: 'User created successfully in MongoDB Atlas'
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error?.message || 'Failed to create user' });
    }
  }

  /**
   * PUT /api/users and PUT /api/users/:id
   */
  static async update(req: Request, res: Response): Promise<void> {
    try {
      const id = String(req.params.id || req.body?.id || req.body?._id || req.query.id || '').trim();
      const email = String(req.body?.email || req.query.email || '').toLowerCase().trim();
      const updates = { ...req.body, updatedAt: new Date() };
      delete updates.id;
      delete updates._id;

      if (!id && !email) {
        res.status(400).json({ success: false, error: 'User ID or email is required' });
        return;
      }

      const db = getDatabase();
      const orClauses: any[] = [];
      if (id) {
        orClauses.push({ id }, { _id: id });
        if (ObjectId.isValid(id)) {
          try { orClauses.push({ _id: new ObjectId(id) }); } catch {}
        }
        if (id.includes('@')) {
          orClauses.push({ email: id.toLowerCase().trim() });
        }
      }
      if (email) {
        orClauses.push({ email });
      }

      const query = { $or: orClauses };

      await db.collection('User').updateMany(query, { $set: updates });
      await db.collection('users').updateMany(query, { $set: updates }).catch(() => {});

      res.json({
        success: true,
        message: 'User updated successfully in MongoDB Atlas'
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error?.message || 'Failed to update user' });
    }
  }

  /**
   * DELETE /api/users and DELETE /api/users/:id
   */
  static async delete(req: Request, res: Response): Promise<void> {
    try {
      const id = String(req.params.id || req.query.id || req.body?.id || req.body?._id || '').trim();
      const email = String(req.query.email || req.body?.email || '').toLowerCase().trim();

      if (!id && !email) {
        res.status(400).json({ success: false, error: 'User ID or email is required' });
        return;
      }

      const db = getDatabase();
      const orClauses: any[] = [];
      if (id) {
        orClauses.push({ id }, { _id: id });
        if (ObjectId.isValid(id)) {
          try { orClauses.push({ _id: new ObjectId(id) }); } catch {}
        }
        if (id.includes('@')) {
          orClauses.push({ email: id.toLowerCase().trim() });
        }
      }
      if (email) {
        orClauses.push({ email });
      }

      const query = { $or: orClauses };

      await db.collection('User').deleteMany(query);
      await db.collection('users').deleteMany(query).catch(() => {});

      res.json({
        success: true,
        message: 'User removed successfully from MongoDB Atlas'
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error?.message || 'Failed to delete user' });
    }
  }

  /**
   * GET /api/client/me and GET /api/client/profile
   */
  static async getClientProfile(req: Request, res: Response): Promise<void> {
    try {
      const db = getDatabase();
      const authHeader = String(req.headers.authorization || '').trim();
      const bearerToken = authHeader.replace(/^Bearer\s+/i, '').trim();

      const email = String(
        req.query.email || 
        req.headers['x-user-email'] || 
        req.headers['x-client-email'] || 
        (bearerToken.includes('@') ? bearerToken : '')
      ).trim().toLowerCase();

      const id = String(
        req.query.id || 
        req.headers['x-user-id'] || 
        req.headers['x-client-id'] || 
        (!bearerToken.includes('@') ? bearerToken : '')
      ).trim();

      let query: any = {};
      const orClauses: any[] = [];
      if (id) {
        orClauses.push({ _id: id }, { id });
        if (ObjectId.isValid(id)) {
          try { orClauses.push({ _id: new ObjectId(id) }); } catch {}
        }
      }
      if (email) {
        orClauses.push({ email });
      }

      if (orClauses.length > 0) {
        query = { $or: orClauses };
      } else {
        query = { role: { $in: ['USER', 'user', 'client', 'CLIENT'] } };
      }

      let user = await db.collection('User').findOne(query);
      if (!user) {
        user = await db.collection('users').findOne(query);
      }

      if (!user) {
        res.status(404).json({ success: false, error: 'Client profile not found' });
        return;
      }

      res.json({
        id: String(user._id || user.id),
        name: user.name || 'Client',
        email: user.email,
        phone: user.phoneNumber || user.phone || '',
        age: user.age ? Number(user.age) : undefined,
        gender: user.gender || '',
        preferredLanguage: user.preferredLanguage || 'English',
        avatarUrl: user.image || user.avatarUrl || ''
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error?.message || 'Failed to fetch profile' });
    }
  }

  /**
   * PATCH /api/client/me, PUT /api/client/me, and PATCH /api/client/profile
   */
  static async updateClientProfile(req: Request, res: Response): Promise<void> {
    try {
      const db = getDatabase();
      const body = req.body || {};
      const authHeader = String(req.headers.authorization || '').trim();
      const bearerToken = authHeader.replace(/^Bearer\s+/i, '').trim();

      const email = String(
        body.email || 
        req.query.email || 
        req.headers['x-user-email'] || 
        (bearerToken.includes('@') ? bearerToken : '')
      ).trim().toLowerCase();

      const id = String(
        body.id || 
        req.query.id || 
        req.headers['x-user-id'] || 
        (!bearerToken.includes('@') ? bearerToken : '')
      ).trim();

      let query: any = {};
      const orClauses: any[] = [];
      if (id) {
        orClauses.push({ _id: id }, { id });
        if (ObjectId.isValid(id)) {
          try { orClauses.push({ _id: new ObjectId(id) }); } catch {}
        }
      }
      if (email) {
        orClauses.push({ email });
      }

      if (orClauses.length > 0) {
        query = { $or: orClauses };
      } else {
        query = { email: 'jaswanthjegan70585@gmail.com' };
      }

      const updates: any = {
        updatedAt: new Date()
      };
      if (body.name !== undefined) updates.name = body.name;
      if (body.email !== undefined) updates.email = body.email;
      if (body.phone !== undefined) {
        updates.phone = body.phone;
        updates.phoneNumber = body.phone;
      }
      if (body.age !== undefined && body.age !== '') updates.age = Number(body.age);
      if (body.gender !== undefined) updates.gender = body.gender;
      if (body.preferredLanguage !== undefined) updates.preferredLanguage = body.preferredLanguage;
      if (body.avatarUrl !== undefined) {
        updates.image = body.avatarUrl;
        updates.avatarUrl = body.avatarUrl;
      }
      if (body.image !== undefined) {
        updates.image = body.image;
        updates.avatarUrl = body.image;
      }

      await db.collection('User').updateOne(query, { $set: updates });
      await db.collection('users').updateOne(query, { $set: updates });

      const updated = await db.collection('User').findOne(query) || await db.collection('users').findOne(query);

      res.json({
        success: true,
        message: 'Profile updated successfully in MongoDB Atlas',
        id: String(updated?._id || updated?.id),
        name: updated?.name,
        email: updated?.email,
        phone: updated?.phoneNumber || updated?.phone,
        age: updated?.age,
        gender: updated?.gender,
        preferredLanguage: updated?.preferredLanguage,
        avatarUrl: updated?.image || updated?.avatarUrl
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error?.message || 'Failed to update profile' });
    }
  }

  /**
   * GET /api/client-data and GET /api/getClientData
   * Gated client data endpoint:
   * Checks if user has a confirmed consultation booking in MongoDB (CONFIRMED, PAID, COMPLETED).
   * - If no confirmed booking: returns 403 Forbidden with clear access denied message and redirectUrl to live site.
   * - If confirmed booking: returns 200 OK with client panel data and confirmed consultation details.
   */
  static async getClientData(req: Request, res: Response): Promise<void> {
    try {
      const db = getDatabase();
      const authHeader = String(req.headers.authorization || '').trim();
      const bearerToken = authHeader.replace(/^Bearer\s+/i, '').trim();

      const email = String(
        req.query.email ||
        req.query.clientEmail ||
        req.headers['x-user-email'] ||
        (bearerToken.includes('@') ? bearerToken : '')
      ).trim().toLowerCase();

      const id = String(
        req.query.id ||
        req.query.clientId ||
        req.query.userId ||
        req.headers['x-user-id'] ||
        (!bearerToken.includes('@') ? bearerToken : '')
      ).trim();

      if (!email && !id) {
        res.status(403).json({
          success: false,
          hasConfirmedBooking: false,
          error: "Access denied: User email or client ID is required to verify consultation booking.",
          redirectUrl: config.liveSiteUrl || 'http://localhost:3000'
        });
        return;
      }

      // 1. Resolve user record from MongoDB
      const orClauses: any[] = [];
      if (email) {
        orClauses.push({ email });
      }
      if (id) {
        orClauses.push({ id }, { _id: id });
        if (ObjectId.isValid(id)) {
          try { orClauses.push({ _id: new ObjectId(id) }); } catch {}
        }
      }

      const user = (orClauses.length > 0)
        ? (await db.collection('User').findOne({ $or: orClauses }) || await db.collection('users').findOne({ $or: orClauses }))
        : null;

      const userEmail = (user?.email || email).toLowerCase().trim();
      const userId = String(user?._id || user?.id || id).trim();

      // 2. Query MongoDB Booking and bookings collections for CONFIRMED consultation
      const confirmedStatuses = ['CONFIRMED', 'confirmed', 'PAID', 'paid', 'COMPLETED', 'completed'];

      const bookingFilter: any = {
        $and: [
          {
            $or: [
              ...(userEmail ? [{ clientEmail: { $regex: `^${userEmail.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, $options: 'i' } }] : []),
              ...(userId ? [{ clientId: userId }, { userId: userId }] : [])
            ]
          },
          {
            $or: [
              { status: { $in: confirmedStatuses } },
              { paymentStatus: { $in: confirmedStatuses } }
            ]
          }
        ]
      };

      const [primaryBookings, fallbackBookings] = await Promise.all([
        db.collection('Booking').find(bookingFilter).sort({ scheduledAt: -1, createdAt: -1 }).toArray(),
        db.collection('bookings').find(bookingFilter).sort({ scheduledAt: -1, createdAt: -1 }).toArray().catch(() => [])
      ]);

      const allConfirmedBookings = [...primaryBookings, ...fallbackBookings];

      // Remove duplicates by id / _id
      const seenBookingIds = new Set<string>();
      const confirmedBookings = allConfirmedBookings.filter((b: any) => {
        const key = String(b.id || b._id);
        if (seenBookingIds.has(key)) return false;
        seenBookingIds.add(key);
        return true;
      });

      // 3. Gate verification: If NO confirmed booking exists, respond with 403 Forbidden
      if (confirmedBookings.length === 0) {
        res.status(403).json({
          success: false,
          hasConfirmedBooking: false,
          error: "Access denied: You do not have a confirmed consultation booking. Please schedule and confirm a consultation session on the live site to access your Client Dashboard.",
          redirectUrl: config.liveSiteUrl || 'http://localhost:3000'
        });
        return;
      }

      // 4. Confirmed consultation exists! Resolve client panel data and return 200 OK
      const latestBooking = confirmedBookings[0];
      const consultantId = user?.assignedTherapistId || latestBooking.consultantId || latestBooking.therapistId || 'doc-1';
      const consultantName = user?.assignedTherapistName || latestBooking.consultantName || latestBooking.therapistName || 'Dr. Evelyn Reed';

      // Look up assigned consultant details
      const consultant = await db.collection('Consultant').findOne({
        $or: [{ id: consultantId }, { name: { $regex: consultantName.replace(/^dr\.?\s*/i, '').trim(), $options: 'i' } }]
      }) || await db.collection('consultants').findOne({
        $or: [{ id: consultantId }, { name: { $regex: consultantName.replace(/^dr\.?\s*/i, '').trim(), $options: 'i' } }]
      });

      const clientData = {
        id: userId || String(latestBooking.clientId || 'client-user'),
        name: user?.name || latestBooking.clientName || 'Client User',
        email: userEmail,
        phone: user?.phoneNumber || user?.phone || '',
        age: user?.age ? Number(user.age) : undefined,
        gender: user?.gender || 'Male',
        preferredLanguage: user?.preferredLanguage || 'English',
        avatarUrl: user?.image || user?.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
        assignedTherapistId: consultantId,
        assignedTherapistName: consultant?.name || consultantName,
        assignedTherapistEmail: consultant?.email || user?.assignedTherapistEmail || 'dr.evelyn@hexpertify.com',
        assignedTherapistPhoto: consultant?.photoUrl || consultant?.photo || consultant?.avatarUrl || user?.assignedTherapistPhoto || 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&w=400&q=80',
        assignedTherapistProfession: consultant?.profession || consultant?.title || 'Licensed Clinical Psychologist',
        firstConsultationCompleted: true
      };

      res.status(200).json({
        success: true,
        hasConfirmedBooking: true,
        message: "Access granted: Confirmed consultation booking verified.",
        client: clientData,
        bookings: confirmedBookings,
        latestBooking,
        confirmedCount: confirmedBookings.length
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        hasConfirmedBooking: false,
        error: error?.message || 'Failed to verify client consultation data'
      });
    }
  }
}
