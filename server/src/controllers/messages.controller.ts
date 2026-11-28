import { Request, Response } from 'express';
import { ObjectId } from 'mongodb';
import { getDatabase } from '../db/mongodb';
import { cacheService } from '../services/cache.service';
import { idQuery } from '../services/live-content';
import { ClientViewer, findConsultantById, resolveClientViewer } from '../services/client-access';
import { signScopedToken, verifyScopedToken } from '../utils/jwt';

const escapeRx = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Logs the real error server-side and answers with a generic message (internals never reach the caller) */
function serverError(res: Response, err: unknown, message: string): void {
  console.error(`[messages] ${message}:`, err);
  res.status(500).json({ success: false, error: message });
}

/** The email and the non-email ids a signed-in viewer is known by */
function viewerIdentity(viewer: ClientViewer): { email: string; emails: string[]; ids: string[] } {
  const all = [...viewer.ids];
  const emails = all.filter((v) => v.includes('@'));
  return { email: emails[0] || '', emails, ids: all.filter((v) => !v.includes('@')) };
}

/** Messages on the consultant's side of a conversation, by consultant id / email (name only when neither is known) */
function consultantSide(ids: string[], emails: string[], name = ''): any[] {
  const conditions: any[] = [];
  if (ids.length) {
    conditions.push({ consultantId: { $in: ids } }, { recipientId: { $in: ids } }, { receiverId: { $in: ids } }, { senderId: { $in: ids } });
  }
  if (emails.length) {
    conditions.push({ consultantEmail: { $in: emails } }, { recipientEmail: { $in: emails } }, { senderEmail: { $in: emails } });
  }
  const cleanName = name.replace(/^dr\.?\s*/i, '').trim();
  if (cleanName && !ids.length && !emails.length) {
    const rx = new RegExp(escapeRx(cleanName), 'i');
    conditions.push({ consultantName: { $regex: rx } }, { receiverName: { $regex: rx } }, { senderName: { $regex: rx } });
  }
  return conditions;
}

/** Messages on the client's side of a conversation, by client email / id */
function clientSide(email: string, id: string): any[] {
  return [
    ...(email ? [{ clientEmail: email }, { recipientEmail: email }, { senderEmail: email }] : []),
    ...(id ? [{ clientId: id }, { recipientId: id }, { receiverId: id }, { senderId: id }, { userId: id }] : [])
  ];
}

interface SSEClient {
  id: string;
  email: string;
  role: string;
  /** Who is listening, from the stream ticket: admins see every event, everyone else only their own */
  kind: 'admin' | 'therapist' | 'client';
  /** Every id/email this listener is known by */
  ids: Set<string>;
  /** Emails whose online status this listener may see (their therapist, or their clients); null = everyone (admin) */
  contacts: Set<string> | null;
  res: Response;
  connectedAt: Date;
}

interface StreamTicket {
  kind: 'admin' | 'therapist' | 'client';
  ids: string[];
  email: string;
}

const STREAM_SCOPE = 'message-stream';
const lc = (v: unknown) => String(v ?? '').trim().toLowerCase();

/** True when any of the given ids/emails belongs to this listener */
const isParty = (client: SSEClient, values: unknown[]) =>
  values.some((v) => {
    const key = lc(v);
    return !!key && client.ids.has(key);
  });

export class MessagesController {
  private static sseClients: SSEClient[] = [];

  /**
   * Helper to get list of currently connected emails
   */
  static getOnlineEmails(): string[] {
    return Array.from(
      new Set(
        MessagesController.sseClients
          .map(c => c.email?.toLowerCase().trim())
          .filter(Boolean)
      )
    );
  }

  /**
   * The client's assigned therapist: User.assignedTherapistId (or assignedTherapistEmail) matched
   * against Consultant by id OR _id, else the therapist of their latest booking. Read-only: never
   * writes an assignment and never picks an arbitrary consultant. Returns null when there is none.
   */
  static async getClientAssignedConsultant(clientEmail?: string, clientId?: string): Promise<{
    id: string;
    name: string;
    email: string;
    title: string;
    avatarUrl: string;
    clientId: string;
    clientEmail: string;
  } | null> {
    const db = getDatabase();
    const cleanEmail = String(clientEmail || '').toLowerCase().trim();
    const cleanId = String(clientId || '').trim();
    if (!cleanEmail && !cleanId) return null;

    const userOr: any[] = [
      ...(cleanEmail ? [{ email: cleanEmail }] : []),
      ...(cleanId ? idQuery(cleanId).$or : [])
    ];
    const user = await db.collection<any>('User').findOne({ $or: userOr }) ||
                 await db.collection<any>('users').findOne({ $or: userOr });

    const resolvedClientId = user ? String(user.id || user._id) : cleanId;
    const resolvedClientEmail = String(user?.email || cleanEmail).toLowerCase();

    const findConsultant = async (query: any) =>
      await db.collection<any>('Consultant').findOne(query) || await db.collection<any>('consultants').findOne(query);

    let consultant: any = null;
    if (user?.assignedTherapistId) consultant = await findConsultant(idQuery(String(user.assignedTherapistId)));
    if (!consultant && user?.assignedTherapistEmail) consultant = await findConsultant({ email: String(user.assignedTherapistEmail).toLowerCase() });

    // No direct assignment: the therapist of the client's most recent booking
    if (!consultant && !user?.assignedTherapistId) {
      const bookingOr: any[] = [
        ...(resolvedClientEmail ? [{ clientEmail: resolvedClientEmail }] : []),
        ...[...new Set([resolvedClientId, cleanId].filter(Boolean))].flatMap((id) => [{ clientId: id }, { userId: id }])
      ];
      const booking = await db.collection<any>('Booking').findOne({ $or: bookingOr }, { sort: { scheduledAt: -1, createdAt: -1 } }) ||
                      await db.collection<any>('bookings').findOne({ $or: bookingOr }, { sort: { scheduledAt: -1, createdAt: -1 } });
      const bookedId = String(booking?.consultantId || booking?.therapistId || '');
      if (bookedId) consultant = await findConsultant(idQuery(bookedId));
    }

    if (!consultant) return null;

    // Normalize Google search URLs and check all photo properties
    const normalizeImg = (u?: string) => {
      if (!u || typeof u !== 'string') return '';
      const t = u.trim();
      if (t.includes('google.com/imgres') || t.includes('imgurl=')) {
        try {
          const m = t.match(/[?&]imgurl=([^&]+)/i);
          if (m && m[1]) return decodeURIComponent(m[1]);
        } catch {}
      }
      return t;
    };

    const rawPhoto = consultant.photo || consultant.photoUrl || consultant.avatarUrl || consultant.image;

    return {
      id: String(consultant.id || consultant._id),
      name: consultant.name || '',
      email: String(consultant.email || '').toLowerCase(),
      title: consultant.title || consultant.profession || '',
      avatarUrl: normalizeImg(rawPhoto),
      clientId: resolvedClientId,
      clientEmail: resolvedClientEmail
    };
  }

  /**
   * GET /api/messages/consultant
   * Returns the client's exclusively assigned consultant info & presence (consultant: null when none)
   */
  static async getAssignedConsultant(req: Request, res: Response): Promise<void> {
    try {
      const clientEmail = String(req.query.email || req.query.clientEmail || '').toLowerCase().trim();
      const clientId = String(req.query.clientId || req.query.id || '').trim();

      const consultant = await MessagesController.getClientAssignedConsultant(clientEmail, clientId);
      if (!consultant) {
        res.json({ success: true, consultant: null, message: 'No therapist assigned yet' });
        return;
      }
      const onlineEmails = MessagesController.getOnlineEmails();
      const isOnline = Boolean(consultant.email) && onlineEmails.includes(consultant.email);

      res.json({
        success: true,
        consultant: {
          id: consultant.id,
          name: consultant.name,
          email: consultant.email,
          title: consultant.title,
          avatarUrl: consultant.avatarUrl,
          isOnline
        }
      });
    } catch (error: any) {
      serverError(res, error, 'Failed to fetch assigned consultant');
    }
  }

  /**
   * GET /api/messages/presence
   * Returns live list of online emails
   */
  static async getPresence(req: Request, res: Response): Promise<void> {
    try {
      // Who is online is only shown to signed-in people, and only for their own therapist or clients
      const viewer = await resolveClientViewer(req);
      if (viewer.kind === 'anonymous') {
        res.status(401).json({ success: false, error: 'Please sign in again.' });
        return;
      }
      const contacts = viewer.kind === 'admin' || viewer.kind === 'internal'
        ? null
        : await MessagesController.contactEmails(viewer.kind, viewer.ids);
      const onlineEmails = MessagesController.getOnlineEmails().filter((e) => !contacts || contacts.has(e));
      res.json({ success: true, onlineEmails, count: onlineEmails.length });
    } catch (error: any) {
      serverError(res, error, 'Failed to read presence');
    }
  }

  /**
   * The emails whose online status a person may see: a client's assigned therapist, or a therapist's
   * assigned and booked clients. Looked up once when the stream opens (a reconnect refreshes it).
   */
  private static async contactEmails(kind: 'therapist' | 'client', ids: Set<string>): Promise<Set<string>> {
    const db = getDatabase();
    const contacts = new Set<string>();
    const idList = [...ids];
    if (kind === 'client') {
      const email = idList.find((v) => v.includes('@')) || '';
      const id = idList.find((v) => !v.includes('@')) || '';
      const consultant = await MessagesController.getClientAssignedConsultant(email, id).catch(() => null);
      if (consultant?.email) contacts.add(lc(consultant.email));
      return contacts;
    }
    const [assigned, booked] = await Promise.all([
      db.collection<any>('User').distinct('email', {
        $or: [{ assignedTherapistId: { $in: idList } }, { assignedTherapistEmail: { $in: idList } }]
      }).catch(() => [] as any[]),
      db.collection<any>('Booking').distinct('clientEmail', {
        $or: [{ consultantId: { $in: idList } }, { therapistId: { $in: idList } }, { consultantEmail: { $in: idList } }]
      }).catch(() => [] as any[])
    ]);
    [...assigned, ...booked].forEach((e) => e && contacts.add(lc(e)));
    return contacts;
  }

  /**
   * POST /api/messages/stream-ticket
   * A browser's EventSource cannot send the sign-in header, so the panel first trades its API token for a
   * one-minute ticket (good only for opening the stream) and opens /stream?ticket=… with it.
   */
  static async streamTicket(req: Request, res: Response): Promise<void> {
    try {
      const viewer = await resolveClientViewer(req);
      if (viewer.kind === 'anonymous' || viewer.kind === 'internal') {
        res.status(401).json({ success: false, error: 'Please sign in again.' });
        return;
      }
      const ids = [...viewer.ids];
      const ticket = signScopedToken(STREAM_SCOPE, {
        kind: viewer.kind,
        ids,
        email: ids.find((v) => v.includes('@')) || ''
      }, 60);
      res.json({ success: true, ticket });
    } catch (error: any) {
      serverError(res, error, 'Could not open the message stream');
    }
  }

  /**
   * GET /api/messages/stream
   * Live Server-Sent Events (SSE) stream for instantaneous 0ms real-time chat & live presence
   */
  static async stream(req: Request, res: Response): Promise<void> {
    // Only a signed-in person (holding a fresh stream ticket) may listen; who they are comes from the ticket,
    // never from the query string
    const ticket = verifyScopedToken<StreamTicket>(STREAM_SCOPE, String(req.query.ticket || ''));
    if (!ticket || !['admin', 'therapist', 'client'].includes(ticket.kind) || !Array.isArray(ticket.ids)) {
      res.status(401).json({ success: false, error: 'Please sign in again.' });
      return;
    }

    const ids = new Set(ticket.ids.map(lc).filter(Boolean));
    const contacts = ticket.kind === 'admin'
      ? null
      : await MessagesController.contactEmails(ticket.kind, ids).catch(() => new Set<string>());

    res.setHeader('Content-Type', 'text/event-stream');
    // no-transform: Next's gzip compression (and proxies) would otherwise hold every event in a buffer and the
    // browser would never receive them
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('X-Accel-Buffering', 'no');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();

    const clientEmail = lc(ticket.email);
    const id = `sse-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const sseClient: SSEClient = {
      id,
      email: clientEmail,
      role: ticket.kind,
      kind: ticket.kind,
      ids,
      contacts,
      res,
      connectedAt: new Date()
    };
    MessagesController.sseClients.push(sseClient);

    // Initial handshake: which of this person's contacts are online right now
    MessagesController.send(sseClient, {
      type: 'CONNECTED',
      id,
      time: new Date().toISOString(),
      onlineEmails: MessagesController.visibleOnline(sseClient)
    });

    // Tell this person's contacts (and admins) that they came online
    if (clientEmail) MessagesController.broadcastPresence(clientEmail);

    // Keep connection alive with heartbeat every 15s
    const heartbeat = setInterval(() => {
      MessagesController.send(sseClient, { type: 'HEARTBEAT' });
    }, 15000);

    req.on('close', () => {
      clearInterval(heartbeat);
      MessagesController.sseClients = MessagesController.sseClients.filter(c => c.id !== id);
      if (clientEmail) MessagesController.broadcastPresence(clientEmail);
    });
  }

  /** The online emails one listener may see */
  private static visibleOnline(client: SSEClient): string[] {
    return MessagesController.getOnlineEmails().filter((e) => !client.contacts || client.contacts.has(e));
  }

  /** A person's online status changed: tell only the listeners who may see it, each with their own list */
  private static broadcastPresence(email: string): void {
    const online = MessagesController.getOnlineEmails();
    for (const client of MessagesController.sseClients) {
      if (client.contacts && !client.contacts.has(email)) continue;
      MessagesController.send(client, {
        type: 'PRESENCE_CHANGE',
        data: {
          email,
          status: online.includes(email) ? 'online' : 'offline',
          onlineEmails: MessagesController.visibleOnline(client)
        }
      });
    }
  }

  private static send(client: SSEClient, event: unknown): void {
    try {
      client.res.write(`data: ${JSON.stringify(event)}\n\n`);
    } catch {
      MessagesController.sseClients = MessagesController.sseClients.filter(c => c.id !== client.id);
    }
  }

  /**
   * Send an event to the listeners it concerns: admins, plus anyone known by one of `parties`
   * (the sender, the recipient, the conversation's client or therapist). Never to everyone.
   */
  private static broadcast(event: { type: string; data: any }, parties: unknown[]): void {
    for (const client of [...MessagesController.sseClients]) {
      if (client.kind === 'admin' || isParty(client, parties)) MessagesController.send(client, event);
    }
  }

  /**
   * POST /api/messages/typing
   * Broadcast live typing indicators
   */
  static async setTyping(req: Request, res: Response): Promise<void> {
    try {
      const { senderName, senderRole, recipientEmail, recipientId, isTyping } = req.body || {};
      // Who is typing comes from the sign-in token when there is one, so the other side can match the open chat
      const viewer = await resolveClientViewer(req);
      if (viewer.kind === 'anonymous') {
        res.status(401).json({ success: false, error: 'Please sign in again.' });
        return;
      }
      const tokenEmail = [...viewer.ids].find((v) => v.includes('@')) || '';
      // Only the person being typed to hears it
      MessagesController.broadcast({
        type: 'TYPING',
        data: {
          senderName: senderName || 'Someone',
          senderRole: viewer.kind === 'client' ? 'client' : viewer.kind === 'therapist' ? 'therapist' : senderRole || 'therapist',
          senderEmail: tokenEmail || String(req.body?.senderEmail || '').toLowerCase().trim(),
          senderId: String(req.body?.senderId || ''),
          recipientEmail: (recipientEmail || '').toLowerCase().trim(),
          recipientId: String(recipientId || ''),
          isTyping: Boolean(isTyping),
          timestamp: new Date().toISOString()
        }
      }, [recipientEmail, recipientId]);
      res.json({ success: true });
    } catch {
      res.status(500).json({ success: false });
    }
  }

  /**
   * GET /api/messages
   * STRICT ENFORCEMENT: A client can ONLY retrieve messages between themselves and their assigned consultant.
   */
  static async getAll(req: Request, res: Response): Promise<void> {
    try {
      const db = getDatabase();
      const { clientEmail, clientId, consultantId, consultantName, consultantEmail, role } = req.query;

      // Private conversations: only the two people in them (identified by the API token), an admin or the server
      const viewer = await resolveClientViewer(req);
      if (viewer.kind === 'anonymous') {
        res.status(401).json({ success: false, error: 'Please sign in to read messages.' });
        return;
      }
      const me = viewerIdentity(viewer);

      let cEmail = clientEmail ? String(clientEmail).toLowerCase().trim() : '';
      let cId = clientId ? String(clientId).trim() : '';

      if (viewer.kind === 'therapist') {
        // A therapist reads only their own conversations; naming another consultant is refused
        const thId = String(consultantId || '').toLowerCase().trim();
        const thEmail = String(consultantEmail || '').toLowerCase().trim();
        if ((thId && !viewer.ids.has(thId)) || (thEmail && !viewer.ids.has(thEmail))) {
          res.status(403).json({ success: false, error: 'You can only read your own conversations.' });
          return;
        }
        const query: any = { $or: consultantSide(me.ids, me.emails) };
        // Optionally one client's conversation with this therapist
        const oneClient = clientSide(cEmail, cId);
        const messages = await db.collection<any>('Message')
          .find(oneClient.length ? { $and: [query, { $or: oneClient }] } : query)
          .sort({ createdAt: 1 })
          .toArray();
        res.json({ success: true, count: messages.length, messages });
        return;
      }

      if (viewer.kind === 'client') {
        // A client reads only their own conversation, found from the token; naming someone else is refused
        const own = await MessagesController.getClientAssignedConsultant(me.email, me.ids[0] || '');
        const ownValues = new Set([...viewer.ids, lc(own?.clientEmail), lc(own?.clientId)].filter(Boolean));
        if ((cEmail && !ownValues.has(cEmail)) || (cId && !ownValues.has(lc(cId)))) {
          res.status(403).json({ success: false, error: 'You can only read your own conversations.' });
          return;
        }
        cEmail = lc(own?.clientEmail) || me.email;
        cId = own?.clientId || me.ids[0] || '';
      }

      // A client (or an admin / the server reading one client's conversation): only with the client's assigned consultant
      if (viewer.kind === 'client' || cEmail || cId || role === 'client') {
        const assigned = await MessagesController.getClientAssignedConsultant(cEmail, cId);
        if (!assigned) {
          res.json({ success: true, count: 0, messages: [], consultant: null });
          return;
        }
        const cleanConsultantName = assigned.name.replace(/^dr\.?\s*/i, '').trim();
        const userClientEmail = assigned.clientEmail || cEmail;
        const userClientId = assigned.clientId || cId;

        // Strictly match:
        // 1. Client is either sender or recipient/clientEmail/clientId
        // 2. Consultant is strictly the assigned consultant!
        const clientConditions: any[] = clientSide(userClientEmail, userClientId);

        const consultantConditions: any[] = [
          { consultantId: assigned.id },
          { recipientId: assigned.id },
          { receiverId: assigned.id },
          { senderId: assigned.id },
          ...(assigned.email ? [{ consultantEmail: assigned.email }, { recipientEmail: assigned.email }, { senderEmail: assigned.email }] : []),
          ...(cleanConsultantName ? [
            { consultantName: { $regex: new RegExp(escapeRx(cleanConsultantName), 'i') } },
            { receiverName: { $regex: new RegExp(escapeRx(cleanConsultantName), 'i') } },
            { senderName: { $regex: new RegExp(escapeRx(cleanConsultantName), 'i') } }
          ] : [])
        ];

        const query: any = {
          $and: [
            { $or: clientConditions },
            { $or: consultantConditions }
          ]
        };

        const messages = await db.collection<any>('Message')
          .find(query)
          .sort({ createdAt: 1 })
          .toArray();

        res.json({
          success: true,
          count: messages.length,
          messages,
          consultant: {
            id: assigned.id,
            name: assigned.name,
            email: assigned.email,
            title: assigned.title,
            avatarUrl: assigned.avatarUrl
          }
        });
        return;
      }

      // Admin / server: one therapist's messages with their clients, by consultant id (custom id or _id), email or name
      const query: any = {};
      const thId = String(consultantId || '').trim();
      const thEmail = String(consultantEmail || '').toLowerCase().trim();
      if (thId || thEmail || consultantName) {
        const consultantOr: any[] = [...(thId ? idQuery(thId).$or : []), ...(thEmail ? [{ email: thEmail }] : [])];
        const consultant: any = consultantOr.length
          ? await db.collection<any>('Consultant').findOne({ $or: consultantOr }).catch(() => null)
          : null;
        const ids = [...new Set([thId, consultant?.id, consultant?._id].filter(Boolean).map(String))];
        const emails = [...new Set([thEmail, consultant?.email].filter(Boolean).map((e) => String(e).toLowerCase()))];

        const cConditions = consultantSide(ids, emails, String(consultantName || ''));
        if (!cConditions.length) {
          res.json({ success: true, count: 0, messages: [] });
          return;
        }
        query.$or = cConditions;
      } else if (['consultant', 'therapist'].includes(String(role || '').toLowerCase())) {
        // A therapist who did not identify themselves sees nothing rather than everyone's messages
        res.json({ success: true, count: 0, messages: [] });
        return;
      }

      const messages = await db.collection<any>('Message')
        .find(query)
        .sort({ createdAt: 1 })
        .toArray();

      res.json({
        success: true,
        count: messages.length,
        messages
      });
    } catch (error: any) {
      serverError(res, error, 'Failed to fetch messages');
    }
  }

  /**
   * POST /api/messages
   * STRICT ENFORCEMENT: All clients are STRICTLY restricted to message only with their assigned consultant.
   */
  static async create(req: Request, res: Response): Promise<void> {
    try {
      const db = getDatabase();
      const body = req.body || {};

      if (!body.content && !body.text && !body.message) {
        res.status(400).json({ success: false, error: 'Message content is required' });
        return;
      }

      const text = String(body.content || body.text || body.message || '');

      // Who sends comes from the API token: a client sends as themself, a therapist as themself.
      // Only an admin or the server may send on someone's behalf (the body then names the sender).
      const viewer = await resolveClientViewer(req);
      if (viewer.kind === 'anonymous') {
        res.status(401).json({ success: false, error: 'Please sign in to send a message.' });
        return;
      }
      const onBehalf = viewer.kind === 'admin' || viewer.kind === 'internal';
      const me = viewerIdentity(viewer);
      const senderRole = viewer.kind === 'client' ? 'client'
        : viewer.kind === 'therapist' ? 'therapist'
        : body.senderRole || (body.sender === 'therapist' ? 'therapist' : body.sender === 'client' ? 'client' : 'therapist');

      let consultantId = String(body.consultantId || '');
      let consultantName = body.consultantName || 'Therapist';
      let consultantEmail = String(body.consultantEmail || body.recipientEmail || '').toLowerCase();
      let clientId = String(body.clientId || '');
      let clientName = body.clientName || 'Client';
      let clientEmail = String(body.clientEmail || body.senderEmail || '').toLowerCase();

      if (viewer.kind === 'client') {
        // The sender is the signed-in client, whatever the body says
        clientEmail = me.email;
        clientId = me.ids[0] || '';
      }

      // 🔒 ENFORCEMENT: If the sender is a client, override & lock recipient strictly to their assigned consultant!
      if (senderRole === 'client') {
        const assigned = await MessagesController.getClientAssignedConsultant(clientEmail, clientId);
        if (!assigned) {
          res.status(409).json({ success: false, code: 'NO_THERAPIST', error: 'You do not have an assigned therapist yet.' });
          return;
        }
        consultantId = assigned.id;
        consultantName = assigned.name;
        consultantEmail = assigned.email.toLowerCase();

        if (onBehalf) {
          clientName = body.senderName || body.clientName || clientName;
          clientEmail = String(body.senderEmail || body.clientEmail || assigned.clientEmail || clientEmail).toLowerCase();
          clientId = body.senderId || body.clientId || assigned.clientId || clientId;
        } else {
          const self: any = assigned.clientId ? await db.collection<any>('User').findOne(idQuery(assigned.clientId)).catch(() => null) : null;
          clientName = self?.name || body.senderName || body.clientName || clientName;
          clientEmail = assigned.clientEmail || clientEmail;
          clientId = assigned.clientId || clientId;
        }
      }

      // 🔒 ENFORCEMENT: If the sender is a consultant, verify that the client belongs to this consultant!
      if (senderRole === 'therapist') {
        let thId = String(body.senderId || body.consultantId || consultantId).trim();
        let thEmail = String(body.senderEmail || body.consultantEmail || consultantEmail).toLowerCase().trim();
        let thName = String(body.senderName || body.consultantName || consultantName).trim();
        if (viewer.kind === 'therapist') {
          // The sender is the signed-in therapist's own consultant record
          let self: any = null;
          for (const id of me.ids) {
            self = await findConsultantById(db, id);
            if (self) break;
          }
          if (!self && me.email) self = await db.collection<any>('Consultant').findOne({ email: me.email }).catch(() => null);
          thId = String(self?.id || self?._id || me.ids[0] || '');
          thEmail = String(self?.email || me.email).toLowerCase();
          thName = String(self?.name || thName);
          consultantId = thId;
          consultantEmail = thEmail;
          consultantName = thName || consultantName;
        }
        const cleanThName = thName.replace(/^dr\.?\s*/i, '').trim();
        const thNameRx = cleanThName ? new RegExp(escapeRx(cleanThName), 'i') : null;
        // A signed-in therapist is known by their consultant id, its _id and their sign-in id
        const thIds = [...new Set([thId, ...(viewer.kind === 'therapist' ? me.ids : [])].filter(Boolean))];
        if (!clientEmail && !clientId) {
          res.status(400).json({ success: false, error: 'Say which client the message is for.' });
          return;
        }

        const [targetUser, targetBooking] = await Promise.all([
          db.collection<any>('User').findOne({
            $or: [
              ...(clientEmail ? [{ email: clientEmail }] : []),
              ...(clientId ? [{ id: clientId }, { _id: clientId }] : [])
            ]
          }) || await db.collection<any>('users').findOne({
            $or: [
              ...(clientEmail ? [{ email: clientEmail }] : []),
              ...(clientId ? [{ id: clientId }, { _id: clientId }] : [])
            ]
          }),
          db.collection<any>('Booking').findOne({
            $and: [
              {
                $or: [
                  ...(clientEmail ? [{ clientEmail }] : []),
                  ...(clientId ? [{ clientId }, { userId: clientId }] : [])
                ]
              },
              {
                $or: [
                  ...(thIds.length ? [{ consultantId: { $in: thIds } }, { therapistId: { $in: thIds } }] : []),
                  ...(thEmail ? [{ consultantEmail: thEmail }] : []),
                  ...(thNameRx ? [{ consultantName: { $regex: thNameRx } }] : [])
                ]
              }
            ]
          }) || await db.collection<any>('bookings').findOne({
            $and: [
              {
                $or: [
                  ...(clientEmail ? [{ clientEmail }] : []),
                  ...(clientId ? [{ clientId }, { userId: clientId }] : [])
                ]
              },
              {
                $or: [
                  ...(thIds.length ? [{ consultantId: { $in: thIds } }, { therapistId: { $in: thIds } }] : []),
                  ...(thEmail ? [{ consultantEmail: thEmail }] : []),
                  ...(thNameRx ? [{ consultantName: { $regex: thNameRx } }] : [])
                ]
              }
            ]
          })
        ]);

        const isAssigned = targetUser && (
          (thIds.some((v) => lc(v) === lc(targetUser.assignedTherapistId)) || (!!consultantId && targetUser.assignedTherapistId === consultantId)) ||
          (thEmail && targetUser.assignedTherapistEmail?.toLowerCase() === thEmail) ||
          (cleanThName && targetUser.assignedTherapistName?.toLowerCase().includes(cleanThName.toLowerCase()))
        );

        if (!isAssigned && !targetBooking) {
          res.status(403).json({
            success: false,
            error: 'Access denied: Consultants are only permitted to message their own assigned or booked clients.'
          });
          return;
        }

        if (targetUser) {
          clientName = targetUser.name || clientName;
          clientEmail = (targetUser.email || clientEmail).toLowerCase();
          clientId = targetUser.id || String(targetUser._id || clientId);
        }
      }

      const isClientSender = (senderRole === 'client');

      const newMessage = {
        id: body.id || `MSG-${Date.now().toString().slice(-6)}`,
        senderRole,
        senderId: isClientSender ? (clientId || 'client-1') : consultantId,
        senderName: isClientSender ? clientName : consultantName,
        senderEmail: isClientSender ? clientEmail : consultantEmail,
        recipientRole: isClientSender ? 'therapist' : 'client',
        recipientId: isClientSender ? consultantId : clientId,
        recipientName: isClientSender ? consultantName : clientName,
        recipientEmail: isClientSender ? consultantEmail : clientEmail,
        consultantId,
        consultantName,
        consultantEmail,
        clientId,
        clientName,
        clientEmail,
        content: text,
        text: text,
        read: false,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const result = await db.collection<any>('Message').insertOne(newMessage);
      const saved = { ...newMessage, _id: result.insertedId };

      // Live delivery to the two people in this conversation (and admins) only
      MessagesController.broadcast({
        type: 'NEW_MESSAGE',
        data: saved
      }, [
        saved.consultantId, saved.consultantEmail, saved.clientId, saved.clientEmail,
        saved.senderId, saved.senderEmail, saved.recipientId, saved.recipientEmail
      ]);

      // Persistent in-app notification
      try {
        const notifRecipientRole = isClientSender ? 'CONSULTANT' : 'CLIENT';
        await db.collection<any>('Notification').insertOne({
          id: `NOTIF-${Date.now().toString().slice(-6)}-MSG`,
          recipientId: isClientSender ? newMessage.consultantId : newMessage.clientId,
          recipientEmail: isClientSender ? newMessage.consultantEmail : newMessage.clientEmail,
          recipientRole: notifRecipientRole,
          type: 'NEW_MESSAGE',
          title: `New message from ${newMessage.senderName} 💬`,
          message: text.length > 80 ? `${text.substring(0, 80)}...` : text,
          read: false,
          createdAt: new Date(),
          updatedAt: new Date()
        });
      } catch (notifErr) {
        console.error('Error creating message notification:', notifErr);
      }

      res.status(201).json({
        success: true,
        message: saved,
        consultant: isClientSender ? { id: consultantId, name: consultantName, email: consultantEmail } : undefined
      });
    } catch (error: any) {
      serverError(res, error, 'Failed to create message');
    }
  }

  /**
   * PUT /api/messages/read
   */
  static async markRead(req: Request, res: Response): Promise<void> {
    try {
      const db = getDatabase();
      const { clientEmail, clientId, consultantId, messageIds } = req.body || {};

      // Only a signed-in person marks messages read, and only messages sent TO them (never their own)
      const viewer = await resolveClientViewer(req);
      if (viewer.kind === 'anonymous') {
        res.status(401).json({ success: false, error: 'Please sign in again.' });
        return;
      }

      const conditions: any[] = [];
      if (viewer.kind === 'therapist') conditions.push({ senderRole: { $ne: 'therapist' } });
      if (viewer.kind === 'client') conditions.push({ senderRole: { $ne: 'client' } });
      const scoped = conditions.length;

      if (Array.isArray(messageIds) && messageIds.length > 0) {
        const idMatches: any[] = [];
        for (const mid of messageIds) {
          idMatches.push({ id: mid }, { id: String(mid) });
          if (ObjectId.isValid(mid)) {
            idMatches.push({ _id: new ObjectId(mid) });
          }
        }
        conditions.push({ $or: idMatches });
      }

      if (clientEmail) {
        const cEmail = String(clientEmail).toLowerCase().trim();
        conditions.push({
          $or: [
            { clientEmail: cEmail },
            { recipientEmail: cEmail },
            { senderEmail: cEmail }
          ]
        });
      }

      if (clientId) {
        const cId = String(clientId).trim();
        conditions.push({
          $or: [
            { clientId: cId },
            { recipientId: cId },
            { receiverId: cId },
            { senderId: cId },
            { userId: cId }
          ]
        });
      }

      if (consultantId) {
        const docId = String(consultantId).trim();
        conditions.push({
          $or: [
            { consultantId: docId },
            { recipientId: docId },
            { receiverId: docId },
            { senderId: docId }
          ]
        });
      }

      // Without message ids or a conversation the request would match every message
      if (conditions.length === scoped) {
        res.status(400).json({ success: false, error: 'Say which messages to mark as read (messageIds, or the conversation).' });
        return;
      }
      const finalFilter: any = conditions.length === 1 ? conditions[0] : { $and: conditions };

      await Promise.all([
        db.collection<any>('Message').updateMany(finalFilter, {
          $set: { read: true, isRead: true, readAt: new Date(), updatedAt: new Date() }
        }),
        db.collection<any>('messages').updateMany(finalFilter, {
          $set: { read: true, isRead: true, readAt: new Date(), updatedAt: new Date() }
        })
      ]);

      cacheService.invalidateTag('messages');

      MessagesController.broadcast({
        type: 'MESSAGES_READ',
        data: { clientEmail, clientId, consultantId }
      }, [clientEmail, clientId, consultantId, ...viewer.ids]);

      res.json({ success: true, message: 'Messages marked as read' });
    } catch (error: any) {
      serverError(res, error, 'Failed to mark messages as read');
    }
  }

  /**
   * DELETE /api/messages/cleanup-greetings
   * Remove artificial mock / hardcoded greeting messages from MongoDB collections
   */
  static async deleteHardcodedGreetings(req: Request, res: Response): Promise<void> {
    try {
      // A destructive maintenance task: administrators and the server only
      const viewer = await resolveClientViewer(req);
      if (viewer.kind !== 'admin' && viewer.kind !== 'internal') {
        res.status(viewer.kind === 'anonymous' ? 401 : 403).json({ success: false, error: 'Administrator authentication required.' });
        return;
      }
      const db = getDatabase();
      const filter = {
        $or: [
          { content: { $regex: /looking forward to our upcoming/i } },
          { content: { $regex: /grounding exercise has been really helpful/i } },
          { content: { $regex: /welcome to your personalized care portal/i } }
        ]
      };

      const [res1, res2] = await Promise.all([
        db.collection('Message').deleteMany(filter),
        db.collection('messages').deleteMany(filter)
      ]);

      res.json({
        success: true,
        deletedCount: (res1.deletedCount || 0) + (res2.deletedCount || 0),
        message: 'Hardcoded greetings deleted from MongoDB Atlas.'
      });
    } catch (error: any) {
      serverError(res, error, 'Failed to delete hardcoded greetings');
    }
  }
}
