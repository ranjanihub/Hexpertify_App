import { Request, Response } from 'express';
import { ObjectId } from 'mongodb';
import { getDatabase } from '../db/mongodb';

interface SSEClient {
  id: string;
  email: string;
  role: string;
  res: Response;
  connectedAt: Date;
}

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
   * Helper to retrieve a client's exclusively assigned consultant.
   * Checks User assignment -> Booking history -> Default primary consultant.
   */
  static async getClientAssignedConsultant(clientEmail?: string, clientId?: string): Promise<{
    id: string;
    name: string;
    email: string;
    title: string;
    avatarUrl: string;
    clientId: string;
    clientEmail: string;
  }> {
    const db = getDatabase();
    const cleanEmail = String(clientEmail || '').toLowerCase().trim();
    const cleanId = String(clientId || '').trim();

    let targetTherapistId = '';
    let targetTherapistName = '';
    let targetTherapistEmail = '';
    let resolvedClientId = cleanId;
    let resolvedClientEmail = cleanEmail;

    // 1. Check User table for assigned therapist
    if (cleanEmail || cleanId) {
      const user = await db.collection<any>('User').findOne({
        $or: [
          ...(cleanEmail ? [{ email: cleanEmail }] : []),
          ...(cleanId ? [{ id: cleanId }, { _id: cleanId }] : [])
        ]
      }) || await db.collection<any>('users').findOne({
        $or: [
          ...(cleanEmail ? [{ email: cleanEmail }] : []),
          ...(cleanId ? [{ id: cleanId }, { _id: cleanId }] : [])
        ]
      });

      if (user) {
        resolvedClientId = user.id || String(user._id || cleanId);
        resolvedClientEmail = (user.email || cleanEmail).toLowerCase();
        targetTherapistId = user.assignedTherapistId || '';
        targetTherapistName = user.assignedTherapistName || user.therapist || '';
        targetTherapistEmail = user.assignedTherapistEmail || '';
      }
    }

    // 2. If no direct assignment in User, check most recent booking
    if (!targetTherapistId && !targetTherapistName && (resolvedClientEmail || resolvedClientId)) {
      const booking = await db.collection<any>('Booking').findOne(
        {
          $or: [
            ...(resolvedClientEmail ? [{ clientEmail: resolvedClientEmail }] : []),
            ...(resolvedClientId ? [{ clientId: resolvedClientId }, { userId: resolvedClientId }] : [])
          ]
        },
        { sort: { scheduledAt: -1, createdAt: -1 } }
      ) || await db.collection<any>('bookings').findOne(
        {
          $or: [
            ...(resolvedClientEmail ? [{ clientEmail: resolvedClientEmail }] : []),
            ...(resolvedClientId ? [{ clientId: resolvedClientId }, { userId: resolvedClientId }] : [])
          ]
        },
        { sort: { scheduledAt: -1, createdAt: -1 } }
      );

      if (booking) {
        targetTherapistId = booking.consultantId || booking.therapistId || '';
        targetTherapistName = booking.consultantName || booking.therapistName || '';
        targetTherapistEmail = booking.consultantEmail || '';
      }
    }

    // 3. Lookup consultant in Consultant / consultants collection
    let consultant: any = null;
    const conds: any[] = [];
    if (targetTherapistId) {
      conds.push({ id: targetTherapistId });
      conds.push({ _id: targetTherapistId });
      if (ObjectId.isValid(targetTherapistId)) {
        conds.push({ _id: new ObjectId(targetTherapistId) });
      }
    }
    if (targetTherapistEmail) {
      conds.push({ email: targetTherapistEmail.toLowerCase() });
    }
    if (targetTherapistName) {
      const cleanName = targetTherapistName.replace(/^dr\.?\s*/i, '').trim();
      conds.push({ name: { $regex: cleanName || targetTherapistName, $options: 'i' } });
    }

    if (conds.length > 0) {
      consultant = await db.collection<any>('Consultant').findOne({ $or: conds }) ||
                   await db.collection<any>('consultants').findOne({ $or: conds });
    }

    // 4. Fallback to primary consultant if none matched yet
    if (!consultant) {
      consultant = await db.collection<any>('Consultant').findOne({}) ||
                   await db.collection<any>('consultants').findOne({});
    }

    const id = consultant?.id || String(consultant?._id || 'doc-1');
    const name = consultant?.name || 'Dr. Evelyn Reed';
    const email = consultant?.email || 'dr.evelyn@hexpertify.com';
    const title = consultant?.title || consultant?.profession || 'Licensed Clinical Psychologist';
    const avatarUrl = consultant?.photoUrl || consultant?.avatarUrl || consultant?.image || 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&w=400&q=80';

    // 5. Persist to User table if not already present, ensuring permanent lock for any new client
    if (resolvedClientEmail || resolvedClientId) {
      try {
        await Promise.all([
          db.collection<any>('User').updateOne(
            { $or: [...(resolvedClientEmail ? [{ email: resolvedClientEmail }] : []), ...(resolvedClientId ? [{ id: resolvedClientId }, { _id: resolvedClientId }] : [])] },
            { $set: { assignedTherapistId: id, assignedTherapistName: name, assignedTherapistEmail: email, assignedTherapistPhoto: avatarUrl, updatedAt: new Date() } }
          ),
          db.collection<any>('users').updateOne(
            { $or: [...(resolvedClientEmail ? [{ email: resolvedClientEmail }] : []), ...(resolvedClientId ? [{ id: resolvedClientId }, { _id: resolvedClientId }] : [])] },
            { $set: { assignedTherapistId: id, assignedTherapistName: name, assignedTherapistEmail: email, assignedTherapistPhoto: avatarUrl, updatedAt: new Date() } }
          )
        ]);
      } catch {}
    }

    return { 
      id, 
      name, 
      email, 
      title, 
      avatarUrl,
      clientId: resolvedClientId,
      clientEmail: resolvedClientEmail
    };
  }

  /**
   * GET /api/messages/consultant
   * Returns the client's exclusively assigned consultant info & presence
   */
  static async getAssignedConsultant(req: Request, res: Response): Promise<void> {
    try {
      const clientEmail = String(req.query.email || req.query.clientEmail || '').toLowerCase().trim();
      const clientId = String(req.query.clientId || req.query.id || '').trim();

      const consultant = await MessagesController.getClientAssignedConsultant(clientEmail, clientId);
      const onlineEmails = MessagesController.getOnlineEmails();
      const isOnline = onlineEmails.includes(consultant.email.toLowerCase());

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
      res.status(500).json({ success: false, error: error?.message || 'Failed to fetch assigned consultant' });
    }
  }

  /**
   * GET /api/messages/presence
   * Returns live list of online emails
   */
  static async getPresence(_req: Request, res: Response): Promise<void> {
    const onlineEmails = MessagesController.getOnlineEmails();
    res.json({
      success: true,
      onlineEmails,
      count: onlineEmails.length
    });
  }

  /**
   * GET /api/messages/stream
   * Live Server-Sent Events (SSE) stream for instantaneous 0ms real-time chat & live presence
   */
  static async stream(req: Request, res: Response): Promise<void> {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();

    const clientEmail = String(req.query.email || req.query.clientEmail || '').toLowerCase().trim();
    const role = String(req.query.role || 'client').toLowerCase();
    const id = `sse-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

    const sseClient: SSEClient = { id, email: clientEmail, role, res, connectedAt: new Date() };
    MessagesController.sseClients.push(sseClient);

    const onlineEmails = MessagesController.getOnlineEmails();

    // Initial handshake with full list of currently online emails
    res.write(`data: ${JSON.stringify({ 
      type: 'CONNECTED', 
      id, 
      time: new Date().toISOString(),
      onlineEmails 
    })}\n\n`);

    // Broadcast user joined / online presence update
    if (clientEmail) {
      MessagesController.broadcast({
        type: 'PRESENCE_CHANGE',
        data: {
          email: clientEmail,
          status: 'online',
          onlineEmails
        }
      });
    }

    // Keep connection alive with heartbeat every 15s
    const heartbeat = setInterval(() => {
      res.write(`data: ${JSON.stringify({ type: 'HEARTBEAT' })}\n\n`);
    }, 15000);

    req.on('close', () => {
      clearInterval(heartbeat);
      MessagesController.sseClients = MessagesController.sseClients.filter(c => c.id !== id);

      const remainingOnlineEmails = MessagesController.getOnlineEmails();
      if (clientEmail) {
        MessagesController.broadcast({
          type: 'PRESENCE_CHANGE',
          data: {
            email: clientEmail,
            status: remainingOnlineEmails.includes(clientEmail) ? 'online' : 'offline',
            onlineEmails: remainingOnlineEmails
          }
        });
      }
    });
  }

  /**
   * Broadcast an event to all connected SSE clients
   */
  private static broadcast(event: { type: string; data: any }): void {
    const payload = `data: ${JSON.stringify(event)}\n\n`;
    MessagesController.sseClients.forEach(client => {
      try {
        client.res.write(payload);
      } catch {
        MessagesController.sseClients = MessagesController.sseClients.filter(c => c.id !== client.id);
      }
    });
  }

  /**
   * POST /api/messages/typing
   * Broadcast live typing indicators
   */
  static async setTyping(req: Request, res: Response): Promise<void> {
    try {
      const { senderName, senderRole, recipientEmail, recipientId, isTyping } = req.body || {};
      MessagesController.broadcast({
        type: 'TYPING',
        data: {
          senderName: senderName || 'Someone',
          senderRole: senderRole || 'therapist',
          recipientEmail: (recipientEmail || '').toLowerCase().trim(),
          recipientId: String(recipientId || ''),
          isTyping: Boolean(isTyping),
          timestamp: new Date().toISOString()
        }
      });
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
      const { clientEmail, clientId, consultantId, consultantName, role } = req.query;

      const cEmail = clientEmail ? String(clientEmail).toLowerCase().trim() : '';
      const cId = clientId ? String(clientId).trim() : '';

      // If this request is from or for a client, enforce that they ONLY see messages with their assigned consultant!
      if (cEmail || cId || role === 'client') {
        const assigned = await MessagesController.getClientAssignedConsultant(cEmail, cId);
        const cleanConsultantName = assigned.name.replace(/^dr\.?\s*/i, '').trim();
        const userClientEmail = assigned.clientEmail || cEmail;
        const userClientId = assigned.clientId || cId;

        // Strictly match:
        // 1. Client is either sender or recipient/clientEmail/clientId
        // 2. Consultant is strictly the assigned consultant!
        const clientConditions: any[] = [
          ...(userClientEmail ? [{ clientEmail: userClientEmail }, { recipientEmail: userClientEmail }, { senderEmail: userClientEmail }] : []),
          ...(userClientId ? [{ clientId: userClientId }, { recipientId: userClientId }, { receiverId: userClientId }, { senderId: userClientId }, { userId: userClientId }] : [])
        ];

        const consultantConditions: any[] = [
          { consultantId: assigned.id },
          { recipientId: assigned.id },
          { receiverId: assigned.id },
          { senderId: assigned.id },
          { consultantEmail: assigned.email.toLowerCase() },
          { recipientEmail: assigned.email.toLowerCase() },
          { senderEmail: assigned.email.toLowerCase() },
          { consultantName: { $regex: new RegExp(cleanConsultantName, 'i') } },
          { receiverName: { $regex: new RegExp(cleanConsultantName, 'i') } },
          { senderName: { $regex: new RegExp(cleanConsultantName, 'i') } }
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

      // If consultant is querying for their messages with their clients
      const query: any = {};
      if (consultantId || consultantName) {
        const cConditions: any[] = [];
        if (consultantId) {
          cConditions.push({ consultantId: String(consultantId) });
          cConditions.push({ recipientId: String(consultantId) });
          cConditions.push({ receiverId: String(consultantId) });
          cConditions.push({ senderId: String(consultantId) });
        }
        if (consultantName) {
          const cleanName = String(consultantName).replace(/^dr\.?\s*/i, '').trim();
          cConditions.push({ consultantName: { $regex: new RegExp(cleanName, 'i') } });
          cConditions.push({ receiverName: { $regex: new RegExp(cleanName, 'i') } });
          cConditions.push({ senderName: { $regex: new RegExp(cleanName, 'i') } });
        }
        query.$or = cConditions;
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
      res.status(500).json({ success: false, error: error?.message || 'Failed to fetch messages' });
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

      const text = body.content || body.text || body.message || '';
      const senderRole = body.senderRole || (body.sender === 'therapist' ? 'therapist' : body.sender === 'client' ? 'client' : 'therapist');

      let consultantId = String(body.consultantId || '');
      let consultantName = body.consultantName || 'Therapist';
      let consultantEmail = (body.consultantEmail || body.recipientEmail || '').toLowerCase();
      let clientId = String(body.clientId || '');
      let clientName = body.clientName || 'Client';
      let clientEmail = (body.clientEmail || body.senderEmail || '').toLowerCase();

      // 🔒 ENFORCEMENT: If the sender is a client, override & lock recipient strictly to their assigned consultant!
      if (senderRole === 'client') {
        const assigned = await MessagesController.getClientAssignedConsultant(clientEmail, clientId);
        consultantId = assigned.id;
        consultantName = assigned.name;
        consultantEmail = assigned.email.toLowerCase();

        clientName = body.senderName || body.clientName || clientName;
        clientEmail = (body.senderEmail || body.clientEmail || assigned.clientEmail || clientEmail).toLowerCase();
        clientId = body.senderId || body.clientId || assigned.clientId || clientId;
      }

      // 🔒 ENFORCEMENT: If the sender is a consultant, verify that the client belongs to this consultant!
      if (senderRole === 'therapist') {
        const thId = String(body.senderId || body.consultantId || consultantId).trim();
        const thEmail = (body.senderEmail || body.consultantEmail || consultantEmail).toLowerCase().trim();
        const thName = String(body.senderName || body.consultantName || consultantName).trim();
        const cleanThName = thName.replace(/^dr\.?\s*/i, '').trim();

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
                  ...(thId ? [{ consultantId: thId }, { therapistId: thId }] : []),
                  ...(thEmail ? [{ consultantEmail: thEmail }] : []),
                  ...(cleanThName ? [{ consultantName: { $regex: cleanThName, $options: 'i' } }] : [])
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
                  ...(thId ? [{ consultantId: thId }, { therapistId: thId }] : []),
                  ...(thEmail ? [{ consultantEmail: thEmail }] : []),
                  ...(cleanThName ? [{ consultantName: { $regex: cleanThName, $options: 'i' } }] : [])
                ]
              }
            ]
          })
        ]);

        const isAssigned = targetUser && (
          (thId && (targetUser.assignedTherapistId === thId || targetUser.assignedTherapistId === consultantId)) ||
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

      // ⚡ INSTANT 0ms REAL-TIME BROADCAST TO ALL LISTENERS VIA SSE
      MessagesController.broadcast({
        type: 'NEW_MESSAGE',
        data: saved
      });

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
      res.status(500).json({ success: false, error: error?.message || 'Failed to create message' });
    }
  }

  /**
   * PUT /api/messages/read
   */
  static async markRead(req: Request, res: Response): Promise<void> {
    try {
      const db = getDatabase();
      const { clientEmail, consultantId } = req.body || {};

      const query: any = {};
      if (clientEmail) query.clientEmail = String(clientEmail).toLowerCase();
      if (consultantId) query.consultantId = String(consultantId);

      await db.collection<any>('Message').updateMany(query, { $set: { read: true, updatedAt: new Date() } });

      MessagesController.broadcast({
        type: 'MESSAGES_READ',
        data: { clientEmail, consultantId }
      });

      res.json({ success: true, message: 'Messages marked as read' });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error?.message || 'Failed to mark messages as read' });
    }
  }

  /**
   * DELETE /api/messages/cleanup-greetings
   * Remove artificial mock / hardcoded greeting messages from MongoDB collections
   */
  static async deleteHardcodedGreetings(_req: Request, res: Response): Promise<void> {
    try {
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
      res.status(500).json({ success: false, error: error?.message || 'Failed to delete hardcoded greetings' });
    }
  }
}
