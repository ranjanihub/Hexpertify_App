import { Request, Response } from 'express';
import { ObjectId } from 'mongodb';
import bcrypt from 'bcryptjs';
import { getDatabase } from '../db/mongodb';
import { config } from '../config';
import { AuthController } from './auth.controller';

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

      // Load all registered consultants for canonical assignment matching
      const allConsultants = await db.collection('Consultant').find({}).toArray();
      const fallbackCons = allConsultants.length === 0 ? await db.collection('consultants').find({}).toArray() : [];
      const consList = allConsultants.length > 0 ? allConsultants : fallbackCons;
      const defaultConsultant: any = consList[0] || {
        id: 'doc-1',
        name: 'Dr. Evelyn Reed',
        email: 'dr.evelyn@hexpertify.com',
        photoUrl: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&w=400&q=80'
      };

      // Load bookings for orphan/fallback discovery
      const allBookings = await db.collection('Booking').find({}).toArray();
      const fallbackBookings = allBookings.length === 0 ? await db.collection('bookings').find({}).toArray() : [];
      const bookingsList = allBookings.length > 0 ? allBookings : fallbackBookings;

      // Ensure every client has exactly ONE assigned consultant (auto-heal unassigned clients)
      for (const u of users) {
        if (!u.assignedTherapistId && !u.assignedTherapistName) {
          const uEmail = String(u.email || '').toLowerCase().trim();
          const uId = String(u.id || u._id || '').toLowerCase().trim();
          
          // Look up latest booking for this client
          const userBooking = bookingsList.find((b: any) => {
            const bEmail = String(b.clientEmail || '').toLowerCase().trim();
            const bId = String(b.clientId || b.userId || '').toLowerCase().trim();
            return (uEmail && bEmail === uEmail) || (uId && bId === uId);
          });

          let assignedC: any = defaultConsultant;
          if (userBooking && (userBooking.consultantId || userBooking.consultantName || userBooking.therapistId || userBooking.therapistName)) {
            const bCid = String(userBooking.consultantId || userBooking.therapistId || '').toLowerCase();
            const bCname = String(userBooking.consultantName || userBooking.therapistName || '').toLowerCase().replace(/^dr\.?\s*/i, '').trim();
            const matched = consList.find((c: any) => {
              const cId = String(c.id || c._id || '').toLowerCase();
              const cName = String(c.name || '').toLowerCase().replace(/^dr\.?\s*/i, '').trim();
              return (bCid && cId === bCid) || (bCname && cName.includes(bCname));
            });
            if (matched) assignedC = matched;
          }

          u.assignedTherapistId = assignedC.id || String(assignedC._id || 'doc-1');
          u.assignedTherapistName = assignedC.name;
          u.assignedTherapistEmail = assignedC.email || '';
          u.assignedTherapistPhoto = assignedC.photoUrl || assignedC.photo || assignedC.avatarUrl || '';

          // Persist assignment lock to DB in background
          const queryUser = { $or: [{ email: u.email }, { id: u.id }, { _id: u._id }] };
          const updateDoc = {
            $set: {
              assignedTherapistId: u.assignedTherapistId,
              assignedTherapistName: u.assignedTherapistName,
              assignedTherapistEmail: u.assignedTherapistEmail,
              assignedTherapistPhoto: u.assignedTherapistPhoto,
              updatedAt: new Date()
            }
          };
          db.collection('User').updateOne(queryUser, updateDoc).catch(() => {});
          db.collection('users').updateOne(queryUser, updateDoc).catch(() => {});
        }
      }

      // If filtering by consultant, strictly match only clients assigned to this consultant
      if (therapistId || therapistName) {
        const cleanName = therapistName.toLowerCase().replace(/^dr\.?\s*/i, '').trim();

        const matchedConsultantIds = new Set<string>();
        if (therapistId) matchedConsultantIds.add(therapistId.toLowerCase());

        consList.forEach((c: any) => {
          const cId = String(c.id || c._id || '').toLowerCase();
          const cName = String(c.name || '').toLowerCase().replace(/^dr\.?\s*/i, '').trim();
          if ((therapistId && cId === therapistId.toLowerCase()) ||
              (cleanName && cName.includes(cleanName)) ||
              (cleanName && cleanName.includes(cName) && cName.length > 2)) {
            matchedConsultantIds.add(cId);
            if (c.id) matchedConsultantIds.add(String(c.id).toLowerCase());
            if (c._id) matchedConsultantIds.add(String(c._id).toLowerCase());
          }
        });

        // Strict 1:1 match: client's assignedTherapistId must match this consultant or assignedTherapistName match
        const matchedUsers = users.filter((u: any) => {
          const uAssigned = String(u.assignedTherapistName || u.therapist || '').toLowerCase().replace(/^dr\.?\s*/i, '').trim();
          const uAssignedId = String(u.assignedTherapistId || '').toLowerCase().trim();

          const isAssigned = (therapistId && uAssignedId === therapistId.toLowerCase()) ||
                             matchedConsultantIds.has(uAssignedId) ||
                             (cleanName && uAssigned.includes(cleanName)) ||
                             (cleanName && cleanName.includes(uAssigned) && uAssigned.length > 2);

          return isAssigned;
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
      const { name, email, role, password } = body;

      if (!name || !email) {
        res.status(400).json({ success: false, error: 'Name and email are required' });
        return;
      }

      if (!password || String(password).length < 6) {
        res.status(400).json({ success: false, error: 'Password is required and must be at least 6 characters' });
        return;
      }

      const cleanEmail = email.toLowerCase().trim();
      const db = getDatabase();

      // Check if user with this email already exists in User or users collection
      const existingUser = await db.collection('User').findOne({ email: cleanEmail }) ||
                           await db.collection('users').findOne({ email: cleanEmail });

      if (existingUser) {
        res.status(409).json({
          success: false,
          error: 'An account with this email address already exists. Please log in instead.'
        });
        return;
      }

      const hashedPassword = await bcrypt.hash(String(password), 10);
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

      const userId = body.id || `USR-${Date.now().toString().slice(-4)}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
      const newUser: any = {
        _id: userId,
        id: userId,
        name: name.trim(),
        email: cleanEmail,
        password: hashedPassword,
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

      await db.collection('User').insertOne(newUser);
      await db.collection('users').insertOne(newUser).catch(() => {});

      const safeUser = {
        id: String(newUser._id || newUser.id),
        name: newUser.name,
        email: newUser.email,
        role: isUserRole ? 'client' as const : 'admin' as const,
        phone: newUser.phone,
        avatarUrl: newUser.image,
        assignedTherapistId: newUser.assignedTherapistId,
        assignedTherapistName: newUser.assignedTherapistName,
        assignedTherapistEmail: newUser.assignedTherapistEmail,
        assignedTherapistPhoto: newUser.assignedTherapistPhoto,
        firstConsultationCompleted: true
      };

      const ssoTicket = AuthController.issueSsoTicket(safeUser, isUserRole ? 'client' : 'super_admin');

      res.status(201).json({
        success: true,
        user: safeUser,
        role: safeUser.role,
        redirectUrl: isUserRole ? '/client' : '/admin',
        ssoTicket,
        message: 'Client registered successfully in MongoDB Atlas'
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

      // If assigning or reassigning a consultant, resolve full canonical consultant info
      if (updates.assignedTherapistId || updates.assignedTherapistName) {
        const tId = String(updates.assignedTherapistId || '').trim();
        const tName = String(updates.assignedTherapistName || '').replace(/^dr\.?\s*/i, '').trim();

        const consQuery: any[] = [];
        if (tId) {
          consQuery.push({ id: tId }, { _id: tId });
          if (ObjectId.isValid(tId)) {
            try { consQuery.push({ _id: new ObjectId(tId) }); } catch {}
          }
        }
        if (tName) {
          consQuery.push({ name: { $regex: tName, $options: 'i' } });
        }

        if (consQuery.length > 0) {
          const consDoc = await db.collection('Consultant').findOne({ $or: consQuery }) ||
                          await db.collection('consultants').findOne({ $or: consQuery });
          if (consDoc) {
            updates.assignedTherapistId = consDoc.id || String(consDoc._id);
            updates.assignedTherapistName = consDoc.name;
            updates.assignedTherapistEmail = consDoc.email || updates.assignedTherapistEmail || '';
            updates.assignedTherapistPhoto = consDoc.photoUrl || consDoc.photo || consDoc.avatarUrl || updates.assignedTherapistPhoto || '';
          }
        }
      }

      const query = { $or: orClauses };

      await db.collection('User').updateMany(query, { $set: updates });
      await db.collection('users').updateMany(query, { $set: updates }).catch(() => {});

      const updatedUser = await db.collection('User').findOne(query) || await db.collection('users').findOne(query);

      res.json({
        success: true,
        user: updatedUser ? { ...updatedUser, id: updatedUser.id || String(updatedUser._id) } : undefined,
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
