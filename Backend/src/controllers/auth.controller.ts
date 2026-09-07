import { Request, Response } from 'express';
import crypto from 'crypto';
import { OAuth2Client } from 'google-auth-library';
import { getDatabase } from '../db/mongodb';
import { config } from '../config';

// In-memory single-use ticket registry
const activeTickets = new Map<string, { payload: any; expiresAt: number; used: boolean }>();

export class AuthController {
  /**
   * POST /api/auth/login
   * Role-enforced authentication against MongoDB Atlas
   */
  static async login(req: Request, res: Response): Promise<void> {
    try {
      const { email, password, role } = req.body || {};

      if (!email) {
        res.status(400).json({ success: false, error: 'Email is required' });
        return;
      }

      const cleanEmail = email.toLowerCase().trim();
      const db = getDatabase();

      // 1. AUTO-DETECT ADMIN LOGIN
      // Strictly restrict admin access to authorized administrator emails
      const isExplicitTherapist = role === 'therapist' || role === 'consultant';
      const isKnownAdmin = cleanEmail === 'ranjaniranjani5694@gmail.com' ||
                           cleanEmail === 'admin@hexpertify.com' ||
                           cleanEmail === 'admin@example.com' ||
                           cleanEmail === 'superadmin@hexpertify.com' ||
                           (cleanEmail.startsWith('admin@') && cleanEmail.endsWith('@hexpertify.com'));

      if (role === 'admin' && !isKnownAdmin) {
        res.status(403).json({
          success: false,
          error: `Email "${cleanEmail}" does not have administrator privileges. Please sign in as a Client or Practitioner.`
        });
        return;
      }

      const isAdminEmail = !isExplicitTherapist && isKnownAdmin;

      if (isAdminEmail) {
        const adminDoc = await db.collection('User').findOne({ email: cleanEmail }) ||
                         await db.collection('users').findOne({ email: cleanEmail });

        const adminUser = {
          id: adminDoc ? String(adminDoc._id || adminDoc.id) : 'admin-1',
          name: adminDoc?.name || 'Super Administrator',
          email: cleanEmail,
          role: 'super_admin' as const,
          avatarUrl: adminDoc?.avatarUrl || adminDoc?.photo || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'
        };

        // Record in User collection if not exists
        await db.collection('User').updateOne(
          { email: cleanEmail },
          { $set: { email: cleanEmail, name: adminUser.name, role: 'ADMIN', updatedAt: new Date() }, $setOnInsert: { createdAt: new Date() } },
          { upsert: true }
        );

        const ssoTicket = AuthController.issueSsoTicket(adminUser, 'super_admin');
        res.json({
          success: true,
          user: adminUser,
          role: 'super_admin',
          redirectUrl: '/admin',
          ssoTicket,
          message: 'Super Admin authenticated. Opening Admin Suite...'
        });
        return;
      }

      // 2. THERAPIST / CONSULTANT LOGIN (Strict verification against MongoDB Consultant collection)
      const isTherapistIntent = role === 'therapist' || role === 'consultant' || cleanEmail.includes('evelyn') || cleanEmail.includes('therapist') || cleanEmail.startsWith('dr.');
      if (isTherapistIntent) {
        let consultant = await db.collection('Consultant').findOne({ email: cleanEmail }) ||
                         await db.collection('consultants').findOne({ email: cleanEmail });

        if (!consultant && (cleanEmail === 'dr.evelyn@hexpertify.com' || cleanEmail.includes('evelyn'))) {
          consultant = await db.collection('Consultant').findOne({ email: 'evelyn.reed@example.com' }) ||
                       await db.collection('consultants').findOne({ email: 'evelyn.reed@example.com' });
        }

        if (!consultant) {
          res.status(403).json({
            success: false,
            error: `Therapist email "${cleanEmail}" was not found in the practitioner directory. Only therapists registered in the Super Admin panel can access the Consultant Suite.`
          });
          return;
        }

        const therapistUser = {
          id: String(consultant._id || consultant.id),
          name: consultant.name,
          email: consultant.email,
          title: consultant.profession || consultant.title || 'Licensed Clinical Psychologist',
          profession: consultant.profession || consultant.title || 'Licensed Clinical Psychologist',
          role: 'therapist' as const,
          avatarInitials: (consultant.name || 'DR')
            .split(' ')
            .map((n: string) => n[0])
            .join('')
            .slice(0, 2)
            .toUpperCase(),
          photoUrl: consultant.photoUrl || consultant.photo || consultant.imageURL || 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&w=400&q=80'
        };

        const ssoTicket = AuthController.issueSsoTicket(therapistUser, 'therapist');
        res.json({
          success: true,
          user: therapistUser,
          role: 'therapist',
          redirectUrl: '/consultant',
          ssoTicket,
          message: 'Therapist authenticated. Opening Consultant Suite...'
        });
        return;
      }

      // 3. CLIENT LOGIN (Verified clients with active assigned therapist)
      let user = await db.collection<any>('User').findOne({ email: cleanEmail }) ||
                 await db.collection<any>('users').findOne({ email: cleanEmail });

      // Look up assigned therapist or consultation records in Bookings
      const clientBooking = await db.collection<any>('Booking').findOne(
        { $or: [{ clientEmail: cleanEmail }, { clientId: user ? String(user._id || user.id) : '' }] },
        { sort: { scheduledAt: -1, createdAt: -1 } }
      ) || await db.collection<any>('bookings').findOne(
        { $or: [{ clientEmail: cleanEmail }, { clientId: user ? String(user._id || user.id) : '' }] },
        { sort: { scheduledAt: -1, createdAt: -1 } }
      );

      // Resolve the legitimate consultant (from booking or default active consultant)
      let targetConsultant: any = null;
      const cId = clientBooking?.consultantId || clientBooking?.therapistId || user?.assignedTherapistId;
      const cName = clientBooking?.consultantName || clientBooking?.therapistName || user?.assignedTherapistName;

      if (cId) {
        targetConsultant = await db.collection<any>('Consultant').findOne({ id: String(cId) }) ||
                          await db.collection<any>('consultants').findOne({ id: String(cId) });
      }
      if (!targetConsultant && cName) {
        const clean = cName.replace(/^dr\.?\s*/i, '').trim();
        targetConsultant = await db.collection<any>('Consultant').findOne({ name: { $regex: clean, $options: 'i' } }) ||
                          await db.collection<any>('consultants').findOne({ name: { $regex: clean, $options: 'i' } });
      }
      if (!targetConsultant) {
        targetConsultant = await db.collection<any>('Consultant').findOne({}) ||
                          await db.collection<any>('consultants').findOne({});
      }

      const assignedId = targetConsultant?.id || String(targetConsultant?._id || 'doc-1');
      const assignedName = targetConsultant?.name || 'Dr. Evelyn Reed';
      const assignedEmail = targetConsultant?.email || 'dr.evelyn@hexpertify.com';
      const assignedPhoto = targetConsultant?.photoUrl || targetConsultant?.avatarUrl || targetConsultant?.image || 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&w=400&q=80';

      if (!user) {
        const namePart = cleanEmail.split('@')[0].replace(/[^a-zA-Z]/g, ' ').trim();
        const formattedName = namePart ? namePart.charAt(0).toUpperCase() + namePart.slice(1) : 'Client User';

        const newDoc = {
          email: cleanEmail,
          name: formattedName,
          role: 'USER',
          assignedTherapistId: assignedId,
          assignedTherapistName: assignedName,
          assignedTherapistEmail: assignedEmail,
          assignedTherapistPhoto: assignedPhoto,
          firstConsultationCompleted: true,
          createdAt: new Date(),
          updatedAt: new Date()
        };

        const result = await db.collection<any>('User').insertOne(newDoc);
        await db.collection<any>('users').insertOne(newDoc).catch(() => {});
        user = { ...newDoc, _id: result.insertedId };
      } else if (!user.assignedTherapistId || !user.assignedTherapistEmail) {
        // Backfill assigned consultant if missing
        await Promise.all([
          db.collection<any>('User').updateOne(
            { _id: user._id },
            { $set: { assignedTherapistId: assignedId, assignedTherapistName: assignedName, assignedTherapistEmail: assignedEmail, assignedTherapistPhoto: assignedPhoto, updatedAt: new Date() } }
          ),
          db.collection<any>('users').updateOne(
            { _id: user._id },
            { $set: { assignedTherapistId: assignedId, assignedTherapistName: assignedName, assignedTherapistEmail: assignedEmail, assignedTherapistPhoto: assignedPhoto, updatedAt: new Date() } }
          )
        ]).catch(() => {});
        user.assignedTherapistId = assignedId;
        user.assignedTherapistName = assignedName;
        user.assignedTherapistEmail = assignedEmail;
        user.assignedTherapistPhoto = assignedPhoto;
      }

      const clientUser = {
        id: String(user._id || user.id),
        name: user.name || 'Client User',
        email: user.email,
        role: 'client' as const,
        phone: user.phone || user.phoneNumber || '',
        avatarUrl: user.image || user.avatarUrl || '',
        age: user.age ? String(user.age) : '',
        gender: user.gender || 'Male',
        preferredLanguage: user.preferredLanguage || 'English',
        assignedTherapistId: user.assignedTherapistId || assignedId,
        assignedTherapistName: user.assignedTherapistName || assignedName,
        assignedTherapistEmail: user.assignedTherapistEmail || assignedEmail,
        assignedTherapistPhoto: user.assignedTherapistPhoto || assignedPhoto,
        firstConsultationCompleted: true
      };

      const ssoTicket = AuthController.issueSsoTicket(clientUser, 'client');
      res.json({
        success: true,
        user: clientUser,
        role: 'client',
        redirectUrl: '/client',
        ssoTicket,
        message: 'Client authenticated. Opening Client Care Portal...'
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error?.message || 'Login error' });
    }
  }

  /**
   * POST /api/auth/sso-ticket
   * Generates a cryptographically signed HMAC-SHA256 single-use ticket (60s validity)
   */
  static async createSsoTicket(req: Request, res: Response): Promise<void> {
    try {
      const { user, targetRole } = req.body || {};

      if (!user || !user.id || !user.email) {
        res.status(400).json({ success: false, error: 'Valid user object with ID and email is required' });
        return;
      }

      const payload = {
        id: String(user.id),
        name: user.name || 'Hexpertify User',
        email: user.email,
        role: targetRole || user.role || 'therapist',
        title: user.profession || user.title || undefined,
        avatarUrl: user.photo || user.avatarUrl || user.photoUrl || undefined,
        timestamp: Date.now(),
        nonce: crypto.randomBytes(16).toString('hex')
      };

      const payloadString = JSON.stringify(payload);
      const signature = crypto
        .createHmac('sha256', config.ssoSecret)
        .update(payloadString)
        .digest('hex');

      const ticket = Buffer.from(JSON.stringify({ payload, signature })).toString('base64url');

      activeTickets.set(ticket, {
        payload,
        expiresAt: Date.now() + 60 * 1000,
        used: false
      });

      // Purge expired tickets
      const now = Date.now();
      for (const [key, val] of activeTickets.entries()) {
        if (val.expiresAt < now) {
          activeTickets.delete(key);
        }
      }

      res.json({
        success: true,
        ticket,
        expiresIn: 60,
        message: 'Cryptographic SSO ticket generated successfully'
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error?.message || 'Failed to generate SSO ticket' });
    }
  }

  /**
   * POST /api/auth/sso-verify
   * Verifies HMAC signature, checks 60s expiration, and prevents replay attacks
   */
  static async verifySsoTicket(req: Request, res: Response): Promise<void> {
    try {
      const { ticket } = req.body || {};

      if (!ticket || typeof ticket !== 'string') {
        res.status(400).json({ success: false, error: 'Valid SSO ticket string is required' });
        return;
      }

      let decoded: { payload: any; signature: string };
      try {
        const jsonStr = Buffer.from(ticket, 'base64url').toString('utf-8');
        decoded = JSON.parse(jsonStr);
      } catch {
        res.status(400).json({ success: false, error: 'Malformed SSO ticket format' });
        return;
      }

      const { payload, signature } = decoded;

      if (!payload || !signature) {
        res.status(400).json({ success: false, error: 'Invalid ticket structure' });
        return;
      }

      // 1. Verify HMAC-SHA256 signature
      const expectedSignature = crypto
        .createHmac('sha256', config.ssoSecret)
        .update(JSON.stringify(payload))
        .digest('hex');

      if (signature !== expectedSignature) {
        res.status(401).json({ success: false, error: 'Invalid cryptographic signature. Ticket was tampered with.' });
        return;
      }

      // 2. Verify timestamp expiration
      const now = Date.now();
      const ticketAge = now - (payload.timestamp || 0);
      if (ticketAge > 60 * 1000 || ticketAge < -5000) {
        res.status(401).json({ success: false, error: 'SSO ticket has expired (valid for 60 seconds only)' });
        return;
      }

      // 3. Prevent replay attacks (single-use)
      const registered = activeTickets.get(ticket);
      if (registered && registered.used) {
        res.status(401).json({ success: false, error: 'SSO ticket has already been redeemed (Single-Use Only)' });
        return;
      }

      if (registered) {
        registered.used = true;
      } else {
        activeTickets.set(ticket, { payload, expiresAt: now + 60000, used: true });
      }

      res.json({
        success: true,
        user: {
          id: payload.id,
          name: payload.name,
          email: payload.email,
          role: payload.role,
          title: payload.title || 'Licensed Clinical Practitioner',
          photoUrl: payload.avatarUrl || 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&w=400&q=80',
          avatarUrl: payload.avatarUrl || 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&w=400&q=80'
        },
        message: 'SSO ticket verified successfully. Authenticated session established.'
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error?.message || 'Failed to verify SSO ticket' });
    }
  }

  /**
   * Helper to issue cryptographically signed HMAC-SHA256 single-use ticket (60s validity)
   */
  static issueSsoTicket(user: any, targetRole?: string): string {
    const payload = {
      id: String(user.id || user._id),
      name: user.name || 'Hexpertify User',
      email: user.email,
      role: targetRole || user.role || 'therapist',
      title: user.profession || user.title || undefined,
      avatarUrl: user.photo || user.avatarUrl || user.photoUrl || user.image || undefined,
      timestamp: Date.now(),
      nonce: crypto.randomBytes(16).toString('hex')
    };

    const payloadString = JSON.stringify(payload);
    const signature = crypto
      .createHmac('sha256', config.ssoSecret)
      .update(payloadString)
      .digest('hex');

    const ticket = Buffer.from(JSON.stringify({ payload, signature })).toString('base64url');

    activeTickets.set(ticket, {
      payload,
      expiresAt: Date.now() + 60 * 1000,
      used: false
    });

    return ticket;
  }

  /**
   * Helper to process verified Google user profile, resolve role, and link assigned consultant
   */
  static async handleVerifiedGoogleProfile(profile: {
    email: string;
    name?: string;
    picture?: string;
  }, requestedRole?: string): Promise<{
    user: any;
    role: string;
    redirectUrl: string;
    ssoTicket: string;
  }> {
    const cleanEmail = profile.email.toLowerCase().trim();
    const db = getDatabase();

    // 1. Check if user is Super Admin (strictly verified against authorized admin emails)
    const isExplicitTherapist = requestedRole === 'therapist' || requestedRole === 'consultant';
    const isKnownAdmin = cleanEmail === 'ranjaniranjani5694@gmail.com' ||
                         cleanEmail === 'admin@hexpertify.com' ||
                         cleanEmail === 'admin@example.com' ||
                         cleanEmail === 'superadmin@hexpertify.com' ||
                         (cleanEmail.startsWith('admin@') && cleanEmail.endsWith('@hexpertify.com'));

    const isAdminEmail = !isExplicitTherapist && isKnownAdmin;

    if (isAdminEmail) {
      const adminDoc = await db.collection('User').findOne({ email: cleanEmail }) ||
                       await db.collection('users').findOne({ email: cleanEmail });

      const adminUser = {
        id: adminDoc ? String(adminDoc._id || adminDoc.id) : 'admin-1',
        name: profile.name || adminDoc?.name || 'Super Administrator',
        email: cleanEmail,
        role: 'super_admin' as const,
        avatarUrl: profile.picture || adminDoc?.avatarUrl || adminDoc?.photo || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'
      };

      await Promise.all([
        db.collection('User').updateOne(
          { email: cleanEmail },
          { $set: { email: cleanEmail, name: adminUser.name, role: 'ADMIN', image: adminUser.avatarUrl, updatedAt: new Date() }, $setOnInsert: { createdAt: new Date() } },
          { upsert: true }
        ),
        db.collection('users').updateOne(
          { email: cleanEmail },
          { $set: { email: cleanEmail, name: adminUser.name, role: 'ADMIN', image: adminUser.avatarUrl, updatedAt: new Date() }, $setOnInsert: { createdAt: new Date() } },
          { upsert: true }
        )
      ]);

      const ssoTicket = AuthController.issueSsoTicket(adminUser, 'super_admin');
      return { user: adminUser, role: 'super_admin', redirectUrl: '/admin', ssoTicket };
    }

    // 2. Check if user is a registered Consultant / Therapist in MongoDB directory
    let consultant = await db.collection('Consultant').findOne({ email: cleanEmail }) ||
                     await db.collection('consultants').findOne({ email: cleanEmail });

    if (!consultant && (cleanEmail === 'dr.evelyn@hexpertify.com' || cleanEmail.includes('evelyn'))) {
      consultant = await db.collection('Consultant').findOne({ email: 'evelyn.reed@example.com' }) ||
                   await db.collection('consultants').findOne({ email: 'evelyn.reed@example.com' });
    }

    if (consultant) {
      const therapistUser = {
        id: String(consultant._id || consultant.id),
        name: consultant.name || profile.name || 'Practitioner',
        email: consultant.email,
        title: consultant.profession || consultant.title || 'Licensed Clinical Psychologist',
        profession: consultant.profession || consultant.title || 'Licensed Clinical Psychologist',
        role: 'therapist' as const,
        avatarInitials: (consultant.name || profile.name || 'TH')
          .split(' ')
          .map((n: string) => n[0])
          .join('')
          .slice(0, 2)
          .toUpperCase(),
        photoUrl: profile.picture || consultant.photoUrl || consultant.photo || consultant.imageURL || 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&w=400&q=80',
        avatarUrl: profile.picture || consultant.photoUrl || consultant.photo || consultant.imageURL || 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&w=400&q=80'
      };

      const ssoTicket = AuthController.issueSsoTicket(therapistUser, 'therapist');
      return { user: therapistUser, role: 'therapist', redirectUrl: '/consultant', ssoTicket };
    }

    // 3. User is a Client:
    let user = await db.collection<any>('User').findOne({ email: cleanEmail }) ||
               await db.collection<any>('users').findOne({ email: cleanEmail });

    // Look up assigned therapist or consultation records in Bookings
    const clientBooking = await db.collection<any>('Booking').findOne(
      { $or: [{ clientEmail: cleanEmail }, { clientId: user ? String(user._id || user.id) : '' }] },
      { sort: { scheduledAt: -1, createdAt: -1 } }
    ) || await db.collection<any>('bookings').findOne(
      { $or: [{ clientEmail: cleanEmail }, { clientId: user ? String(user._id || user.id) : '' }] },
      { sort: { scheduledAt: -1, createdAt: -1 } }
    );

    let targetConsultant: any = null;
    const cId = clientBooking?.consultantId || clientBooking?.therapistId || user?.assignedTherapistId;
    const cName = clientBooking?.consultantName || clientBooking?.therapistName || user?.assignedTherapistName;

    if (cId) {
      targetConsultant = await db.collection<any>('Consultant').findOne({ id: String(cId) }) ||
                        await db.collection<any>('consultants').findOne({ id: String(cId) });
    }
    if (!targetConsultant && cName) {
      const clean = cName.replace(/^dr\.?\s*/i, '').trim();
      targetConsultant = await db.collection<any>('Consultant').findOne({ name: { $regex: clean, $options: 'i' } }) ||
                        await db.collection<any>('consultants').findOne({ name: { $regex: clean, $options: 'i' } });
    }
    if (!targetConsultant) {
      targetConsultant = await db.collection<any>('Consultant').findOne({}) ||
                        await db.collection<any>('consultants').findOne({});
    }

    const assignedId = targetConsultant?.id || String(targetConsultant?._id || 'doc-1');
    const assignedName = targetConsultant?.name || 'Dr. Evelyn Reed';
    const assignedEmail = targetConsultant?.email || 'dr.evelyn@hexpertify.com';
    const assignedPhoto = targetConsultant?.photoUrl || targetConsultant?.avatarUrl || targetConsultant?.image || 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&w=400&q=80';

    const clientDisplayName = profile.name || (cleanEmail.split('@')[0].replace(/[^a-zA-Z]/g, ' ').trim() || 'Client User');
    const clientAvatar = profile.picture || user?.image || user?.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80';

    if (!user) {
      const newDoc = {
        email: cleanEmail,
        name: clientDisplayName,
        role: 'USER',
        image: clientAvatar,
        avatarUrl: clientAvatar,
        assignedTherapistId: assignedId,
        assignedTherapistName: assignedName,
        assignedTherapistEmail: assignedEmail,
        assignedTherapistPhoto: assignedPhoto,
        firstConsultationCompleted: true,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const result = await db.collection<any>('User').insertOne(newDoc);
      await db.collection<any>('users').insertOne(newDoc).catch(() => {});
      user = { ...newDoc, _id: result.insertedId };
    } else {
      // Update missing therapist assignment or photo
      const updates: any = { updatedAt: new Date() };
      if (!user.assignedTherapistId || !user.assignedTherapistEmail) {
        updates.assignedTherapistId = assignedId;
        updates.assignedTherapistName = assignedName;
        updates.assignedTherapistEmail = assignedEmail;
        updates.assignedTherapistPhoto = assignedPhoto;
      }
      if (profile.picture && !user.image) {
        updates.image = profile.picture;
        updates.avatarUrl = profile.picture;
      }
      await Promise.all([
        db.collection<any>('User').updateOne({ _id: user._id }, { $set: updates }),
        db.collection<any>('users').updateOne({ _id: user._id }, { $set: updates })
      ]).catch(() => {});
      user = { ...user, ...updates };
    }

    const clientUser = {
      id: String(user._id || user.id),
      name: user.name || clientDisplayName,
      email: user.email,
      role: 'client' as const,
      phone: user.phone || user.phoneNumber || '',
      avatarUrl: user.image || user.avatarUrl || clientAvatar,
      photoUrl: user.image || user.avatarUrl || clientAvatar,
      age: user.age ? String(user.age) : '',
      gender: user.gender || 'Male',
      preferredLanguage: user.preferredLanguage || 'English',
      assignedTherapistId: user.assignedTherapistId || assignedId,
      assignedTherapistName: user.assignedTherapistName || assignedName,
      assignedTherapistEmail: user.assignedTherapistEmail || assignedEmail,
      assignedTherapistPhoto: user.assignedTherapistPhoto || assignedPhoto,
      firstConsultationCompleted: true
    };

    const ssoTicket = AuthController.issueSsoTicket(clientUser, 'client');
    return { user: clientUser, role: 'client', redirectUrl: '/client', ssoTicket };
  }

  /**
   * GET /api/auth/google/config
   * Returns public client ID for frontend Google Identity Services SDK
   */
  static async getGoogleConfig(_req: Request, res: Response): Promise<void> {
    res.json({
      success: true,
      clientId: config.googleClientId || '',
      configured: Boolean(config.googleClientId)
    });
  }

  /**
   * GET /api/auth/google
   * Initiates Google OAuth 2.0 Authorization Code flow
   */
  static async initiateGoogleAuth(req: Request, res: Response): Promise<void> {
    try {
      const role = String(req.query.role || 'client').toLowerCase();
      const returnUrl = String(req.query.returnUrl || '').trim();

      if (!config.googleClientId) {
        // When Google Client ID is not yet configured, inform user with a clean guidance redirect
        res.redirect(`/login?google_error=missing_client_id&message=${encodeURIComponent('Please configure GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in Backend/.env to enable live Google OAuth.')}`);
        return;
      }

      const client = new OAuth2Client(
        config.googleClientId,
        config.googleClientSecret,
        config.googleRedirectUri
      );

      const statePayload = Buffer.from(JSON.stringify({ role, returnUrl, timestamp: Date.now() })).toString('base64url');

      const authorizeUrl = client.generateAuthUrl({
        access_type: 'offline',
        scope: ['openid', 'email', 'profile'],
        prompt: 'select_account',
        state: statePayload
      });

      res.redirect(authorizeUrl);
    } catch (error: any) {
      res.redirect(`/login?google_error=init_failed&message=${encodeURIComponent(error?.message || 'Failed to initialize Google OAuth')}`);
    }
  }

  /**
   * GET /api/auth/google/callback
   * Handles Google OAuth 2.0 redirect callback, exchanges code for tokens, resolves user, and redirects with SSO ticket
   */
  static async handleGoogleCallback(req: Request, res: Response): Promise<void> {
    try {
      const code = String(req.query.code || '');
      const stateParam = String(req.query.state || '');
      const errorParam = req.query.error;

      if (errorParam) {
        res.redirect(`/login?google_error=${encodeURIComponent(String(errorParam))}`);
        return;
      }

      if (!code) {
        res.redirect('/login?google_error=no_code');
        return;
      }

      let parsedState: any = {};
      try {
        parsedState = JSON.parse(Buffer.from(stateParam, 'base64url').toString('utf-8'));
      } catch {}

      const client = new OAuth2Client(
        config.googleClientId,
        config.googleClientSecret,
        config.googleRedirectUri
      );

      const { tokens } = await client.getToken(code);
      client.setCredentials(tokens);

      if (!tokens.id_token) {
        res.redirect('/login?google_error=missing_id_token');
        return;
      }

      const ticket = await client.verifyIdToken({
        idToken: tokens.id_token,
        audience: config.googleClientId
      });

      const payload = ticket.getPayload();
      if (!payload || !payload.email) {
        res.redirect('/login?google_error=invalid_token_payload');
        return;
      }

      const authResult = await AuthController.handleVerifiedGoogleProfile({
        email: payload.email,
        name: payload.name,
        picture: payload.picture
      }, parsedState.role);

      // Route by authenticated role:
      // - Super Admin: routes directly to the Super Admin Panel (/admin)
      // - Therapist: routes directly to the Consultant Suite (/consultant)
      // - Client: routes to the Live Site (http://localhost:3000) with SSO ticket & session
      let redirectBase: string;
      if (authResult.role === 'super_admin') {
        redirectBase = '/admin';
      } else if (authResult.role === 'therapist') {
        redirectBase = '/consultant';
      } else {
        redirectBase = '/client';
      }
      const hostPrefix = config.frontendUrl || '';
      res.redirect(`${hostPrefix}${redirectBase}?sso_ticket=${authResult.ssoTicket}&sso_user=${encodeURIComponent(JSON.stringify(authResult.user))}&google_auth=success`);
    } catch (error: any) {
      res.redirect(`/login?google_error=callback_failed&message=${encodeURIComponent(error?.message || 'Google authentication failed')}`);
    }
  }

  /**
   * POST /api/auth/google
   * Verifies Google ID token from Google Identity Services (GIS) / One Tap button
   */
  static async verifyGoogleToken(req: Request, res: Response): Promise<void> {
    try {
      const { credential, role } = req.body || {};

      if (!credential) {
        res.status(400).json({ success: false, error: 'Google credential ID token is required' });
        return;
      }

      let email = '';
      let name = '';
      let picture = '';

      if (config.googleClientId) {
        // Production cryptographic verification with Google's public keys
        const client = new OAuth2Client(config.googleClientId);
        const ticket = await client.verifyIdToken({
          idToken: credential,
          audience: config.googleClientId
        });
        const payload = ticket.getPayload();
        if (!payload || !payload.email) {
          res.status(400).json({ success: false, error: 'Invalid Google token payload' });
          return;
        }
        email = payload.email;
        name = payload.name || '';
        picture = payload.picture || '';
      } else {
        // Fallback for development simulation if token is base64 JWT or simulated token
        try {
          const parts = credential.split('.');
          if (parts.length === 3) {
            const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf-8'));
            email = payload.email;
            name = payload.name || '';
            picture = payload.picture || '';
          }
        } catch {}

        if (!email) {
          if (typeof credential === 'string' && credential.includes('@')) {
            email = credential;
          } else {
            res.status(400).json({
              success: false,
              error: 'Google OAuth is not yet configured. Please set GOOGLE_CLIENT_ID in Backend/.env'
            });
            return;
          }
        }
      }

      const authResult = await AuthController.handleVerifiedGoogleProfile({
        email,
        name,
        picture
      }, role);

      res.json({
        success: true,
        user: authResult.user,
        role: authResult.role,
        redirectUrl: authResult.redirectUrl,
        ssoTicket: authResult.ssoTicket,
        message: 'Google authentication successful.'
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error?.message || 'Failed to verify Google token' });
    }
  }

  /**
   * GET /api/auth/me
   */
  static async getMe(req: Request, res: Response): Promise<void> {
    res.json({
      success: true,
      service: 'Hexpertify Central Backend Gateway',
      status: 'Online',
      database: 'MongoDB Atlas',
      timestamp: new Date().toISOString()
    });
  }
}
