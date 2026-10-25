import { Request, Response } from 'express';
import crypto from 'crypto';
import { ObjectId } from 'mongodb';
import bcrypt from 'bcryptjs';
import { getDatabase } from '../db/mongodb';
import { config } from '../config';
import { AuthController } from './auth.controller';
import { cacheService } from '../services/cache.service';
import { MailService } from '../services/mail.service';
import {
  applyClientPrivacy,
  canViewFullClient,
  CLIENT_PANEL_LOCKED_MESSAGE,
  ClientViewer,
  consultantAssignment,
  findConsultantById,
  findConsultantByName,
  hasCompletedSession,
  resolveClientConsultant,
  resolveClientViewer
} from '../services/client-access';
import { verifyAuthToken } from '../utils/jwt';

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

/**
 * Privacy for a client record: basic details unless the viewer may see the full record; consultant views
 * additionally hide contact details unless the viewer is the client's assigned therapist.
 */
function protectClient(viewer: ClientViewer, u: any, consultantView: boolean): any {
  const visible = applyClientPrivacy(viewer, u);
  return consultantView && !canViewFullClient(viewer, u) ? sanitizeClientForConsultant(visible) : visible;
}

const escapeRx = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const emailFilter = (email: string) => ({ email: { $regex: `^${escapeRx(email)}$`, $options: 'i' } });

/** Profile fields staff may set when creating a client (intake form) */
const INTAKE_FIELDS = [
  'age', 'gender', 'preferredLanguage', 'communicationPreference', 'dateOfBirth', 'location', 'occupation',
  'primaryGoal', 'primaryConcern', 'presentingProblems', 'therapyGoals', 'goals', 'therapyTimeline',
  'aiIntakeSummary', 'summary', 'notes', 'service', 'emergencyContactName', 'emergencyContactPhone', 'intakeResponses'
];

/** Fields only staff (admin / internal) may change through the profile update endpoints */
const STAFF_ONLY_FIELDS = [
  'role', 'password', 'firstConsultationCompleted',
  'assignedTherapistId', 'assignedTherapistName', 'assignedTherapistEmail', 'assignedTherapistPhoto'
];

/** Matches a user by custom `id`, string `_id` or ObjectId `_id` */
function userIdQuery(id: string): any {
  const or: any[] = [{ id }, { _id: id }];
  if (/^[0-9a-f]{24}$/i.test(id)) or.push({ _id: new ObjectId(id) });
  return { $or: or };
}

/**
 * Older clients send the user's email or id as the bearer value. A signed API token is resolved
 * to the client's email; staff tokens never act as a client identity.
 */
function legacyBearerIdentity(authHeader: string): string {
  const bearer = authHeader.replace(/^Bearer\s+/i, '').trim();
  if (bearer.split('.').length !== 3) return bearer;
  const payload = verifyAuthToken(bearer);
  return payload?.role === 'client' ? payload.email : '';
}

/** Client self-service endpoints stay open to the client panel; staff only get basic details unless assigned */
async function protectForStaff(req: Request, client: any): Promise<any> {
  const viewer = await resolveClientViewer(req);
  return viewer.kind === 'admin' || viewer.kind === 'therapist' ? applyClientPrivacy(viewer, client) : client;
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

        // Show the consultant from the client's booking when no assignment is stored (never a guessed one)
        for (const u of users) {
          if (!u.assignedTherapistId && !u.assignedTherapistName) {
            const uEmail = String(u.email || '').toLowerCase().trim();
            const uId = String(u.id || u._id || '').toLowerCase().trim();

            const userBooking = bookingsList.find((b: any) => {
              const bEmail = String(b.clientEmail || '').toLowerCase().trim();
              const bId = String(b.clientId || b.userId || '').toLowerCase().trim();
              return (uEmail && bEmail === uEmail) || (uId && bId === uId);
            });

            if (userBooking && (userBooking.consultantId || userBooking.consultantName || userBooking.therapistId || userBooking.therapistName)) {
              const bCid = String(userBooking.consultantId || userBooking.therapistId || '').toLowerCase();
              const bCname = String(userBooking.consultantName || userBooking.therapistName || '').toLowerCase().replace(/^dr\.?\s*/i, '').trim();
              const matched = consList.find((c: any) => {
                const cIds = [c.id, c._id].filter(Boolean).map((v: any) => String(v).toLowerCase());
                const cName = String(c.name || '').toLowerCase().replace(/^dr\.?\s*/i, '').trim();
                return (bCid && cIds.includes(bCid)) || (bCname && cName.includes(bCname));
              });
              if (matched) Object.assign(u, consultantAssignment(matched));
            }
          }
        }

        // If filtering by consultant, strictly match only clients assigned to this consultant
        if (therapistId || therapistName) {
          const cleanName = therapistName.toLowerCase().replace(/^dr\.?\s*/i, '').trim();

          const matchedConsultantIds = new Set<string>();
          if (therapistId) matchedConsultantIds.add(therapistId.toLowerCase());

          consList.forEach((c: any) => {
            // The consultant can be named by its custom `id` or its `_id`
            const cIds = [c.id, c._id].filter(Boolean).map((v: any) => String(v).toLowerCase());
            const cName = String(c.name || '').toLowerCase().replace(/^dr\.?\s*/i, '').trim();
            if ((therapistId && cIds.includes(therapistId.toLowerCase())) ||
                (cleanName && cName.includes(cleanName)) ||
                (cleanName && cleanName.includes(cName) && cName.length > 2)) {
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

        const finalUsers = users.map((u: any) => ({ ...u, id: u.id || String(u._id) }));

        return {
          success: true,
          count: finalUsers.length,
          users: finalUsers
        };
      });

      // Full client records only for the assigned therapist (applied after the shared cache)
      const viewer = await resolveClientViewer(req);
      res.json({ ...responseData, users: responseData.users.map((u: any) => protectClient(viewer, u, isConsultantView)) });
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

      // Prisma / website users only have a string `_id`
      const query = userIdQuery(id);

      const user = await db.collection('User').findOne(query) ||
                   await db.collection('users').findOne(query);

      if (!user) {
        res.status(404).json({ success: false, error: 'User not found' });
        return;
      }

      const formattedUser = { ...user, id: user.id || String(user._id) };

      res.json({
        success: true,
        user: protectClient(await resolveClientViewer(req), formattedUser, Boolean(consultantId))
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

      // Staff (admin / therapist / internal) may create accounts without a password and with intake details;
      // only admins (or internal calls) may create administrators
      const viewer = await resolveClientViewer(req);
      const isPrivileged = viewer.kind === 'admin' || viewer.kind === 'internal';
      const isStaff = isPrivileged || viewer.kind === 'therapist';

      let temporaryPassword = '';
      if (!password && isStaff) {
        temporaryPassword = crypto.randomBytes(9).toString('base64url');
      } else if (!password || String(password).length < 6) {
        res.status(400).json({ success: false, error: 'Password is required and must be at least 6 characters' });
        return;
      }

      const cleanEmail = String(email).toLowerCase().trim();
      const db = getDatabase();

      const existingUser = await db.collection('User').findOne(emailFilter(cleanEmail)) ||
                           await db.collection('users').findOne(emailFilter(cleanEmail));

      if (existingUser) {
        res.status(409).json({
          success: false,
          error: 'An account with this email address already exists. Please log in instead.'
        });
        return;
      }

      const hashedPassword = await bcrypt.hash(String(password || temporaryPassword), 10);
      const isUserRole = !isPrivileged || (role !== 'ADMIN' && role !== 'Super Admin');

      // Assign a consultant only when the given one is real (never a guessed "first consultant")
      const consultant = isUserRole
        ? (await findConsultantById(db, body.assignedTherapistId) ||
           (!body.assignedTherapistId ? await findConsultantByName(db, body.assignedTherapistName || body.therapist) : null))
        : null;

      const userId = String(body.id || crypto.randomUUID());
      const phone = String(body.phone || body.phoneNumber || '').trim();
      const photo = body.image || body.avatarUrl || '';
      const newUser: any = {
        _id: userId,
        id: userId,
        name: String(name).trim(),
        email: cleanEmail,
        password: hashedPassword,
        role: isUserRole ? 'USER' : 'ADMIN',
        status: body.status || 'Active',
        emailVerified: null,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      if (phone) {
        newUser.phone = phone;
        newUser.phoneNumber = phone;
      }
      if (photo) {
        newUser.image = photo;
        newUser.avatarUrl = photo;
      }

      if (isUserRole) {
        if (isStaff) {
          for (const key of INTAKE_FIELDS) {
            if (body[key] !== undefined && body[key] !== '') newUser[key] = body[key];
          }
        }
        if (consultant) Object.assign(newUser, consultantAssignment(consultant));
        newUser.firstConsultationCompleted = false;
      }

      await db.collection('User').insertOne(newUser);
      await db.collection('users').insertOne(newUser).catch(() => {});

      // Invalidate caches
      cacheService.invalidateTags(['users', 'stats', 'bookings']);

      if (isUserRole) await MailService.sendWelcome({ name: newUser.name, email: newUser.email });

      const safeUser = {
        id: String(newUser._id || newUser.id),
        name: newUser.name,
        email: newUser.email,
        role: isUserRole ? 'client' as const : 'admin' as const,
        phone: newUser.phone || '',
        avatarUrl: newUser.image || '',
        assignedTherapistId: newUser.assignedTherapistId || '',
        assignedTherapistName: newUser.assignedTherapistName || '',
        assignedTherapistEmail: newUser.assignedTherapistEmail || '',
        assignedTherapistPhoto: newUser.assignedTherapistPhoto || '',
        firstConsultationCompleted: !isUserRole
      };

      // A new client's portal opens after their first completed session, so no sign-in ticket for clients
      const ssoTicket = isUserRole ? undefined : AuthController.issueSsoTicket(safeUser, 'super_admin');

      res.status(201).json({
        success: true,
        user: safeUser,
        role: safeUser.role,
        redirectUrl: isUserRole ? '/client' : '/admin',
        ssoTicket,
        ...(isUserRole ? { clientPanelAccess: false, notice: CLIENT_PANEL_LOCKED_MESSAGE } : {}),
        // Returned once to the staff member who created the account so it can be passed on to the user
        ...(temporaryPassword ? { temporaryPassword } : {}),
        message: isUserRole ? 'Client registered successfully in MongoDB Atlas' : 'Administrator created successfully'
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
      const body = req.body || {};
      const id = String(req.params.id || body.id || body._id || req.query.id || '').trim();
      const bearerIdentity = legacyBearerIdentity(String(req.headers.authorization || '').trim());
      const lookupEmail = String(body.email || req.query.email || (bearerIdentity.includes('@') ? bearerIdentity : '')).toLowerCase().trim();

      if (!id && !lookupEmail) {
        res.status(400).json({ success: false, error: 'User ID or email is required' });
        return;
      }

      const db = getDatabase();

      // Resolve exactly one account: by id when one is given (the body email may be a new address), else by email
      const lookup = id
        ? (id.includes('@') ? emailFilter(id.toLowerCase()) : userIdQuery(id))
        : emailFilter(lookupEmail);
      const target = await db.collection('User').findOne(lookup) || await db.collection('users').findOne(lookup);

      if (!target) {
        res.status(404).json({ success: false, error: 'User not found' });
        return;
      }

      const updates: any = { ...body };
      delete updates.id;
      delete updates._id;
      delete updates.createdAt;

      // Role, password and therapist assignment are staff-only (clients update their own profile here)
      const viewer = await resolveClientViewer(req);
      const isPrivileged = viewer.kind === 'admin' || viewer.kind === 'internal';
      if (!isPrivileged) {
        for (const key of STAFF_ONLY_FIELDS) delete updates[key];
      } else if (updates.password) {
        updates.password = String(updates.password).startsWith('$2')
          ? updates.password
          : await bcrypt.hash(String(updates.password), 10);
      } else {
        delete updates.password;
      }

      // Website (Prisma) reads phoneNumber / image, the panels read phone / avatarUrl: keep both in sync
      if (updates.phone !== undefined || updates.phoneNumber !== undefined) {
        const phone = String(updates.phone ?? updates.phoneNumber ?? '').trim();
        updates.phone = phone;
        updates.phoneNumber = phone;
      }
      if (updates.image !== undefined || updates.avatarUrl !== undefined) {
        const photo = updates.image || updates.avatarUrl || '';
        updates.image = photo;
        updates.avatarUrl = photo;
      }

      // Email changes: normalised, unique, and carried over to the user's bookings
      const oldEmail = String(target.email || '').toLowerCase().trim();
      let emailChanged = false;
      if (updates.email !== undefined) {
        const newEmail = String(updates.email || '').toLowerCase().trim();
        if (!newEmail) {
          delete updates.email;
        } else {
          updates.email = newEmail;
          if (newEmail !== oldEmail) {
            const taken = await db.collection('User').findOne({ ...emailFilter(newEmail), _id: { $ne: target._id } }) ||
                          await db.collection('users').findOne({ ...emailFilter(newEmail), _id: { $ne: target._id } });
            if (taken) {
              res.status(409).json({ success: false, error: 'Another account already uses this email address.' });
              return;
            }
            emailChanged = true;
          }
        }
      }

      // If assigning or reassigning a consultant, resolve full canonical consultant info
      if (updates.assignedTherapistId || updates.assignedTherapistName) {
        const consDoc = await findConsultantById(db, updates.assignedTherapistId) ||
                        (!updates.assignedTherapistId ? await findConsultantByName(db, updates.assignedTherapistName) : null);
        if (consDoc) {
          const assignment = consultantAssignment(consDoc);
          updates.assignedTherapistId = assignment.assignedTherapistId;
          updates.assignedTherapistName = assignment.assignedTherapistName;
          updates.assignedTherapistEmail = assignment.assignedTherapistEmail || updates.assignedTherapistEmail || '';
          updates.assignedTherapistPhoto = assignment.assignedTherapistPhoto || updates.assignedTherapistPhoto || '';
        }
      }

      updates.updatedAt = new Date();
      const query = { _id: target._id };

      await db.collection('User').updateOne(query, { $set: updates });
      await db.collection('users').updateOne(query, { $set: updates }).catch(() => {});

      if (emailChanged && oldEmail) {
        const bookingFilter = { clientEmail: { $regex: `^${escapeRx(oldEmail)}$`, $options: 'i' } };
        await Promise.all([
          db.collection('Booking').updateMany(bookingFilter, { $set: { clientEmail: updates.email } }),
          db.collection('bookings').updateMany(bookingFilter, { $set: { clientEmail: updates.email } })
        ]).catch(() => {});
      }

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
      const bearerToken = legacyBearerIdentity(authHeader);

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

      // Without an id or email there is no client to show (never fall back to some other client)
      if (orClauses.length === 0) {
        res.status(400).json({ success: false, error: 'Client id or email is required' });
        return;
      }
      query = { $or: orClauses };

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
        user: await protectForStaff(req, {
          ...user,
          id: user.id || String(user._id)
        })
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
      const bearerToken = legacyBearerIdentity(authHeader);

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

        // Same rule as login: the client panel opens only after the client's first completed session
        if (!(await hasCompletedSession(db, userEmail, user))) {
          return {
            status: 403,
            body: {
              success: false,
              hasConfirmedBooking: false,
              code: 'NO_COMPLETED_SESSION',
              error: CLIENT_PANEL_LOCKED_MESSAGE,
              redirectUrl: liveSiteFallback
            }
          };
        }

        const latestBooking = confirmedBookings[0] || {};
        // The stored assignment wins; otherwise the consultant from the latest booking (never a guessed one)
        const consultant = await resolveClientConsultant(db, user, null) || await resolveClientConsultant(db, null, latestBooking);
        const consultantId = consultant ? consultantAssignment(consultant).assignedTherapistId : (user?.assignedTherapistId || '');
        const consultantName = consultant?.name || user?.assignedTherapistName || latestBooking.consultantName || latestBooking.therapistName || '';

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
          assignedTherapistName: consultantName,
          assignedTherapistEmail: consultant?.email || user?.assignedTherapistEmail || '',
          assignedTherapistPhoto: consultant?.photoUrl || consultant?.photo || consultant?.avatarUrl || user?.assignedTherapistPhoto || '',
          assignedTherapistProfession: consultant?.profession || consultant?.title || '',
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

      const body: any = { ...responseData.body }; // copy: responseData is shared through the cache
      if (body.client) {
        body.client = await protectForStaff(req, body.client);
      }
      res.status(responseData.status).json(body);
    } catch (error: any) {
      res.status(500).json({
        success: false,
        hasConfirmedBooking: false,
        error: error?.message || 'Failed to verify client consultation data'
      });
    }
  }
}
