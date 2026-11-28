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
import { isAdminUser, isInternalRequest } from '../middlewares/auth.middleware';
import { numberMissing } from '../services/sequence';
import { bookingStatusOf, UPCOMING_STATUSES } from '../services/booking-status';
import { bookingInstant } from '../services/booking-time';

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

/** Logs the real error server-side and answers with a generic message (internals never reach the caller) */
function serverError(res: Response, err: unknown, message: string, extra: Record<string, unknown> = {}): void {
  console.error(`[users] ${message}:`, err);
  res.status(500).json({ success: false, ...extra, error: message });
}

/** Staff only get basic details unless assigned; a client record never carries its password hash */
function protectForStaff(viewer: ClientViewer, client: any): any {
  const { password: _password, ...safe } = client || {};
  return viewer.kind === 'admin' || viewer.kind === 'therapist' ? applyClientPrivacy(viewer, safe) : safe;
}

/** The client record a request names in its query string (never from headers or a bearer email) */
function requestedClient(req: Request): { email: string; id: string } {
  const q: any = req.query || {};
  return {
    email: String(q.email || q.clientEmail || '').trim().toLowerCase(),
    id: String(q.id || q.clientId || q.userId || '').trim()
  };
}

async function findUserBy(query: any): Promise<any | null> {
  const db = getDatabase();
  return await db.collection('User').findOne(query) || await db.collection('users').findOne(query);
}

interface ClientTarget {
  viewer: ClientViewer;
  user: any | null;
  email: string;
  id: string;
}

/**
 * The client a per-client read is for, or null once a refusal was sent. Who asks comes from the API token
 * only: a client reads their own record, a therapist their assigned clients, an admin or the server any.
 */
async function resolveClientTarget(req: Request, res: Response): Promise<ClientTarget | null> {
  const viewer = await resolveClientViewer(req);
  if (viewer.kind === 'anonymous') {
    res.status(401).json({ success: false, error: 'Please sign in to view this profile.' });
    return null;
  }
  const asked = requestedClient(req);

  if (viewer.kind === 'client') {
    const ids = [...viewer.ids];
    const tokenEmail = ids.find((v) => v.includes('@')) || '';
    const tokenId = ids.find((v) => !v.includes('@')) || '';
    // By id first: after an email change the token still carries the old address
    const user = (tokenId ? await findUserBy(userIdQuery(tokenId)) : null) ||
                 (tokenEmail ? await findUserBy(emailFilter(tokenEmail)) : null);
    const ownValues = [user?.email, user?.id, user?._id, tokenEmail, tokenId]
      .filter(Boolean).map((v) => String(v).toLowerCase().trim());
    const asksForOther = (asked.email && !ownValues.includes(asked.email)) ||
                         (asked.id && !ownValues.includes(asked.id.toLowerCase()));
    if (asksForOther || (user && !canViewFullClient(viewer, user))) {
      res.status(403).json({ success: false, error: 'You can only view your own profile.' });
      return null;
    }
    return {
      viewer,
      user,
      email: String(user?.email || tokenEmail).toLowerCase().trim(),
      id: user ? String(user.id || user._id) : tokenId
    };
  }

  if (!asked.email && !asked.id) {
    res.status(400).json({ success: false, error: 'Client id or email is required' });
    return null;
  }
  const or: any[] = [...(asked.id ? userIdQuery(asked.id).$or : []), ...(asked.email ? [emailFilter(asked.email)] : [])];
  const user = await findUserBy({ $or: or });

  if (viewer.kind === 'therapist' && (!user || !canViewFullClient(viewer, user))) {
    res.status(403).json({ success: false, error: 'You can only view your own clients.' });
    return null;
  }
  return {
    viewer,
    user,
    email: String(user?.email || asked.email).toLowerCase().trim(),
    id: user ? String(user.id || user._id) : asked.id
  };
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
      // Older clients get their running numbers (CL-00001…, in sign-up order) the first time they are listed
      await numberMissing('client').catch((err) => console.warn('[users] numbering failed:', err?.message || err));

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
      serverError(res, error, 'Failed to fetch users');
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
      serverError(res, error, 'Failed to fetch user');
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
      // The forms check these too, but a request can skip the form
      const cleanName = String(name).trim().replace(/\s+/g, ' ');
      if (cleanName.length < 2 || !/\p{L}/u.test(cleanName)) {
        res.status(400).json({ success: false, error: 'Please enter your full name.' });
        return;
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
        res.status(400).json({ success: false, error: 'Please enter a valid email address.' });
        return;
      }
      const typedPhone = String(body.phone || body.phoneNumber || '').trim();
      if (typedPhone && !/^\+?\d{10,15}$/.test(typedPhone.replace(/[\s\-()]/g, ''))) {
        res.status(400).json({ success: false, error: 'Please enter a valid phone number (10 to 15 digits, e.g. +91 98765 43210).' });
        return;
      }
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
        name: cleanName,
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
      // Running client number (CL-00001), given once the account is stored
      if (isUserRole) {
        await numberMissing('client', true).catch((err) => console.warn('[users] numbering failed:', err?.message || err));
      }

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
      serverError(res, error, 'Failed to create user');
    }
  }

  /**
   * PUT /api/users and PUT /api/users/:id
   */
  static async update(req: Request, res: Response): Promise<void> {
    try {
      // Only a signed-in admin (or the server itself) may edit any account; a signed-in client only their own
      const viewer = await resolveClientViewer(req);
      if (viewer.kind === 'anonymous') {
        res.status(401).json({ success: false, error: 'Please sign in to change a profile.' });
        return;
      }
      if (viewer.kind === 'therapist') {
        res.status(403).json({ success: false, error: 'Therapists cannot change client accounts.' });
        return;
      }
      const isPrivileged = viewer.kind === 'admin' || viewer.kind === 'internal';

      const body = req.body || {};
      // A client's account comes from their sign-in token: the body email may be the new address
      const tokenEmail = viewer.kind === 'client' ? [...viewer.ids].find((v) => v.includes('@')) || '' : '';
      const id = String(req.params.id || body.id || body._id || req.query.id || '').trim();
      const lookupEmail = String(isPrivileged ? (body.email || req.query.email || '') : tokenEmail).toLowerCase().trim();

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
      if (!isPrivileged && ![target.id, target._id, target.email].some((v) => v && viewer.ids.has(String(v).toLowerCase().trim()))) {
        res.status(403).json({ success: false, error: 'You can only change your own profile.' });
        return;
      }

      const updates: any = { ...body };
      delete updates.id;
      delete updates._id;
      delete updates.createdAt;

      // Role, password and therapist assignment are staff-only (clients update their own profile here)
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
      serverError(res, error, 'Failed to update user');
    }
  }

  /**
   * DELETE /api/users and DELETE /api/users/:id
   */
  static async delete(req: Request, res: Response): Promise<void> {
    try {
      if (!isInternalRequest(req) && !isAdminUser(req.user)) {
        res.status(401).json({ success: false, error: 'Administrator authentication required. Please sign in again.' });
        return;
      }
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

      // A client with a session still to come is not deleted: the therapist would be left with an unknown client.
      // Past bookings and payments are kept (they carry the client's name and email) for the records.
      const targets = [
        ...(await db.collection('User').find(query).toArray()),
        ...(await db.collection('users').find(query).toArray().catch(() => []))
      ];
      if (!targets.length) {
        res.status(404).json({ success: false, error: 'User not found' });
        return;
      }
      const emails = [...new Set(targets.map((u: any) => String(u.email || '').toLowerCase().trim()).filter(Boolean))];
      const ids = [...new Set(targets.flatMap((u: any) => [u.id, u._id]).filter(Boolean).map(String))];
      const bookingOr: any[] = [];
      if (emails.length) bookingOr.push({ clientEmail: { $in: emails } });
      if (ids.length) bookingOr.push({ clientId: { $in: ids } }, { userId: { $in: ids } });
      const now = Date.now();
      const upcoming = bookingOr.length
        ? (await db.collection('Booking').find({ $or: bookingOr }).toArray()).filter((b: any) => {
            const at = bookingInstant(b);
            return UPCOMING_STATUSES.has(bookingStatusOf(b)) && (!at || at.getTime() > now);
          }).length
        : 0;
      if (upcoming) {
        res.status(409).json({
          success: false,
          error: `This client has ${upcoming} upcoming session(s). Cancel them first, then delete the client.`
        });
        return;
      }

      await db.collection('User').deleteMany(query);
      await db.collection('users').deleteMany(query).catch(() => {});

      // Invalidate caches
      cacheService.invalidateTags(['users', 'stats', 'bookings']);

      res.json({
        success: true,
        message: 'User deleted'
      });
    } catch (error: any) {
      serverError(res, error, 'Failed to delete user');
    }
  }

  /**
   * GET /api/client/me and GET /api/client/profile
   */
  static async getClientProfile(req: Request, res: Response): Promise<void> {
    try {
      // Signed-in client: their own record; their assigned therapist, an admin or the server: the named client
      const target = await resolveClientTarget(req, res);
      if (!target) return;
      const user = target.user;

      if (!user) {
        res.status(404).json({ success: false, error: 'Client profile not found' });
        return;
      }

      res.json({
        success: true,
        user: protectForStaff(target.viewer, {
          ...user,
          id: user.id || String(user._id)
        })
      });
    } catch (error: any) {
      serverError(res, error, 'Failed to fetch client profile');
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
      // Same rule as /client/me: the client themself (from the token), their assigned therapist, an admin or the server
      const target = await resolveClientTarget(req, res);
      if (!target) return;
      const { email, id } = target;

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
        body.client = protectForStaff(target.viewer, body.client);
      }
      res.status(responseData.status).json(body);
    } catch (error: any) {
      serverError(res, error, 'Failed to verify client consultation data', { hasConfirmedBooking: false });
    }
  }
}
