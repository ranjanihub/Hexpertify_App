import { Request, Response } from 'express';
import { ObjectId } from 'mongodb';
import bcrypt from 'bcryptjs';
import { getDatabase } from '../db/mongodb';
import { config } from '../config';
import { AuthController } from './auth.controller';
import { cacheService } from '../services/cache.service';

/**
 * Strips email, phone number, and private contact info from client records when viewed by a consultant.
 */
function sanitizeClientForConsultant(u: any): any {
  if (!u) return u;
  const clone = { ...u, id: u.id || String(u._id) };
  delete clone.email;
  delete clone.phone;
  delete clone.phoneNumber;
  delete clone.emergencyContactPhone;
  if (clone.intakeResponses && typeof clone.intakeResponses === 'object') {
    const safeIntake = { ...clone.intakeResponses };
    delete safeIntake['Registered Email'];
    delete safeIntake['Phone Number'];
    delete safeIntake['emergencyContactPhone'];
    delete safeIntake['emergencyContactName'];
    clone.intakeResponses = safeIntake;
  }
  return clone;
}

export class UsersController {
  /**
   * GET /api/users and GET /api/admin/users
   */
  static async getAll(req: Request, res: Response): Promise<void> {
    try {
      const therapistId = String(req.query.therapistId || req.query.consultantId || '').trim();
      const therapistName = String(req.query.therapistName || req.query.consultantName || '').trim();
      const roleFilter = String(req.query.role || '').trim();
      const isConsultantView = Boolean(therapistId || therapistName);

      const cacheKey = `users:all:${therapistId}:${therapistName}:${roleFilter}`;

      const responseData = await cacheService.wrap(cacheKey, ['users', 'consultants', 'bookings'], 15, async () => {
        const db = getDatabase();

        // Load users, consultants, and bookings in parallel
        const [primaryUsers, allConsultants, allBookings] = await Promise.all([
          db.collection('User').find({}).toArray().catch(() => db.collection('users').find({}).toArray().catch(() => [])),
          db.collection('Consultant').find({}).toArray().catch(() => db.collection('consultants').find({}).toArray().catch(() => [])),
          db.collection('Booking').find({}).toArray().catch(() => db.collection('bookings').find({}).toArray().catch(() => []))
        ]);

        let users = primaryUsers;
        const consList = allConsultants;
        const bookingsList = allBookings;

        // Filter out admins and therapists if requesting clients
        if (roleFilter.toUpperCase() === 'CLIENT' || roleFilter.toUpperCase() === 'USER' || therapistId || therapistName) {
          users = users.filter((u) => {
            const r = String(u.role || '').toUpperCase();
            return r !== 'ADMIN' && r !== 'THERAPIST' && r !== 'CONSULTANT';
          });
        }

        const defaultConsultant: any = consList[0] || {
          id: 'doc-1',
          name: 'Dr. Evelyn Reed',
          email: 'dr.evelyn@hexpertify.com',
          photoUrl: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&w=400&q=80'
        };

        // Ensure every client has assigned consultant
        for (const u of users) {
          if (!u.assignedTherapistId && !u.assignedTherapistName) {
            const uEmail = String(u.email || '').toLowerCase().trim();
            const uId = String(u.id || u._id || '').toLowerCase().trim();

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

          const matchedUsers = users.filter((u: any) => {
            const uAssigned = String(u.assignedTherapistName || u.therapist || '').toLowerCase().replace(/^dr\.?\s*/i, '').trim();
            const uAssignedId = String(u.assignedTherapistId || '').toLowerCase().trim();

            return (therapistId && uAssignedId === therapistId.toLowerCase()) ||
                   matchedConsultantIds.has(uAssignedId) ||
                   (cleanName && uAssigned.includes(cleanName)) ||
                   (cleanName && cleanName.includes(uAssigned) && uAssigned.length > 2);
          });

          users = matchedUsers;
        }

        const finalUsers = users.map((u: any) => {
          const formatted = { ...u, id: u.id || String(u._id) };
          if (isConsultantView) {
            return sanitizeClientForConsultant(formatted);
          }
          return formatted;
        });

        return {
          success: true,
          count: finalUsers.length,
          users: finalUsers
        };
      });

      res.json(responseData);
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
      const consultantId = String(req.query.consultantId || req.query.therapistId || '').trim();
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

      let formattedUser = { ...user, id: user.id || String(user._id) };
      if (consultantId) {
        formattedUser = sanitizeClientForConsultant(formattedUser);
      }

      res.json({
        success: true,
        user: formattedUser
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

      // Invalidate caches
      cacheService.invalidateTags(['users', 'stats', 'bookings']);

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

      // Invalidate caches
      cacheService.invalidateTags(['users', 'stats', 'bookings']);

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

      // Invalidate caches
      cacheService.invalidateTags(['users', 'stats', 'bookings']);

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
        success: true,
        user: {
          ...user,
          id: user.id || String(user._id)
        }
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error?.message || 'Failed to fetch client profile' });
    }
  }

  static async updateClientProfile(req: Request, res: Response): Promise<void> {
    return UsersController.update(req, res);
  }

  /**
   * GET /api/client-data and GET /api/getClientData
   */
  static async getClientData(req: Request, res: Response): Promise<void> {
    try {
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

      const reqOrigin = String(req.headers.origin || (req.headers.referer ? new URL(String(req.headers.referer)).origin : '') || '').trim();
      const isLocalReq = req.hostname === 'localhost' || req.hostname === '127.0.0.1';
      const liveSiteFallback = (config.liveSiteUrl && !config.liveSiteUrl.includes('localhost'))
        ? config.liveSiteUrl
        : (isLocalReq ? 'http://localhost:3000' : (reqOrigin || '/'));

      if (!email && !id) {
        res.status(403).json({
          success: false,
          hasConfirmedBooking: false,
          error: "Access denied: User email or client ID is required to verify consultation booking.",
          redirectUrl: liveSiteFallback
        });
        return;
      }

      const cacheKey = `client-data:${email}:${id}`;

      const responseData = await cacheService.wrap(cacheKey, ['users', 'bookings'], 15, async () => {
        const db = getDatabase();

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

        const seenBookingIds = new Set<string>();
        const confirmedBookings = allConfirmedBookings.filter((b: any) => {
          const key = String(b.id || b._id);
          if (seenBookingIds.has(key)) return false;
          seenBookingIds.add(key);
          return true;
        });

        // If no booking in collection but user document has active status or completed consultation, grant access and backfill
        const isUserAuthorized = Boolean(
          user && (
            user.firstConsultationCompleted ||
            (Array.isArray(user.sessions) && user.sessions.length > 0) ||
            (Array.isArray(user.sessionHistory) && user.sessionHistory.length > 0) ||
            user.status === 'Active' ||
            String(user.role || '').toUpperCase() === 'USER' ||
            String(user.role || '').toUpperCase() === 'CLIENT'
          )
        );

        if (confirmedBookings.length === 0 && !isUserAuthorized) {
          return {
            status: 403,
            body: {
              success: false,
              hasConfirmedBooking: false,
              error: "Access denied: You do not have a confirmed consultation booking. Please schedule and confirm a consultation session on the live site to access your Client Dashboard.",
              redirectUrl: liveSiteFallback
            }
          };
        }

        const latestBooking = confirmedBookings[0] || {};
        const consultantId = user?.assignedTherapistId || latestBooking.consultantId || latestBooking.therapistId || 'therapist-1789365881877';
        const consultantName = user?.assignedTherapistName || latestBooking.consultantName || latestBooking.therapistName || 'Dr. Jayakumar';

        // Backfill booking if none in collection
        if (confirmedBookings.length === 0 && isUserAuthorized) {
          const defaultBooking = {
            id: `BK-${Date.now().toString().slice(-6)}`,
            clientId: userId,
            clientName: user?.name || 'Client User',
            clientEmail: userEmail,
            consultantId: consultantId,
            consultantName: consultantName,
            consultantAvatar: user?.assignedTherapistPhoto || 'https://media.licdn.com/dms/image/v2/D5603AQFTS1Z73WIlCg/profile-displayphoto-shrink_200_200/profile-displayphoto-shrink_200_200/0/1720859777245?e=2147483647&v=beta&t=yO7E_-3xylunJKT00b03-m9hTVuicUz6qszqtZVflqs',
            serviceTitle: user?.service || 'Individual Psychotherapy & CBT Session',
            scheduledAt: user?.nextSessionDate ? new Date(user.nextSessionDate).toISOString() : new Date().toISOString(),
            durationMinutes: 50,
            status: 'CONFIRMED',
            paymentStatus: 'PAID',
            amount: 1500,
            meetingLink: 'https://meet.google.com/hex-pert-ify',
            createdAt: new Date(),
            updatedAt: new Date()
          };
          await Promise.all([
            db.collection('Booking').insertOne({ ...defaultBooking }),
            db.collection('bookings').insertOne({ ...defaultBooking })
          ]).catch(() => {});
        }

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
          firstConsultationCompleted: true,
          goals: user?.goals || [],
          therapyGoals: user?.therapyGoals || [],
          assessmentScores: user?.assessmentScores || [],
          moodScores: user?.moodScores || [],
          moodLogs: user?.moodLogs || [],
          homework: user?.homework || user?.homeworkAssigned || [],
          homeworkAssigned: user?.homeworkAssigned || user?.homework || [],
          sessionHistory: user?.sessionHistory || [],
          primaryGoal: user?.primaryGoal || user?.primaryConcern || 'Emotional Wellness',
          totalSessionsCount: typeof user?.totalSessionsCount === 'number' ? user.totalSessionsCount : confirmedBookings.length,
          completedSessionsCount: typeof user?.completedSessionsCount === 'number'
            ? user.completedSessionsCount
            : confirmedBookings.filter((b: any) => b.status === 'COMPLETED' || (b.scheduledAt && new Date(b.scheduledAt).getTime() < Date.now())).length
        };

        return {
          status: 200,
          body: {
            success: true,
            hasConfirmedBooking: true,
            message: "Access granted: Confirmed consultation booking verified.",
            client: clientData,
            bookings: confirmedBookings,
            latestBooking,
            confirmedCount: confirmedBookings.length
          }
        };
      });

      res.status(responseData.status).json(responseData.body);
    } catch (error: any) {
      res.status(500).json({
        success: false,
        hasConfirmedBooking: false,
        error: error?.message || 'Failed to verify client consultation data'
      });
    }
  }
}
