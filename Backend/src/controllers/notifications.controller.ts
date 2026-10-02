import { Request, Response } from 'express';
import { ObjectId } from 'mongodb';
import { getDatabase } from '../db/mongodb';

export class NotificationsController {
  /**
   * GET /api/notifications
   * Supports query filters: role, recipientId, recipientEmail
   */
  static async getAll(req: Request, res: Response): Promise<void> {
    try {
      const db = getDatabase();
      const role = String(req.query.role || '').toUpperCase();
      const recipientId = String(req.query.recipientId || '');
      const recipientEmail = String(req.query.recipientEmail || '').toLowerCase();

      let query: any = {};

      if (role === 'ADMIN') {
        query = {
          $or: [
            { recipientRole: 'ADMIN' },
            { role: 'ADMIN' },
            { targetRole: 'ADMIN' },
            { type: 'NEW_BOOKING_ALERT' },
            { type: 'ADMIN_ALERT' }
          ]
        };
      } else if (role === 'CONSULTANT' || role === 'THERAPIST') {
        const roleMatch = { $or: [{ recipientRole: 'CONSULTANT' }, { recipientRole: 'THERAPIST' }, { role: 'CONSULTANT' }, { role: 'THERAPIST' }] };
        if (recipientEmail || recipientId) {
          const specificConditions: any[] = [];
          if (recipientEmail) {
            const emailRegex = new RegExp(`^${recipientEmail.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i');
            specificConditions.push({ recipientEmail: emailRegex });
            specificConditions.push({ consultantEmail: emailRegex });
            specificConditions.push({ userEmail: emailRegex });
          }
          if (recipientId) {
            specificConditions.push({ recipientId: recipientId });
            specificConditions.push({ consultantId: recipientId });
            specificConditions.push({ userId: recipientId });
          }
          query = { $and: [roleMatch, { $or: specificConditions }] };
        } else {
          query = roleMatch;
        }
      } else if (role === 'CLIENT' || (!role && (recipientEmail || recipientId))) {
        const clientConditions: any[] = [];
        if (recipientEmail) {
          const emailRegex = new RegExp(`^${recipientEmail.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i');
          clientConditions.push({ recipientEmail: emailRegex });
          clientConditions.push({ userEmail: emailRegex });
          clientConditions.push({ clientEmail: emailRegex });
        }
        if (recipientId) {
          clientConditions.push({ recipientId: recipientId });
          clientConditions.push({ userId: recipientId });
          clientConditions.push({ clientId: recipientId });
        }
        // General broadcasts for all clients
        clientConditions.push({ recipientRole: 'CLIENT', recipientEmail: { $in: ['', null, 'all', 'ALL'] } });

        query = { $and: [{ recipientRole: { $in: ['CLIENT', undefined, null] } }, { $or: clientConditions }] };
      }

      const primaryList = await db.collection('Notification').find(query).sort({ createdAt: -1 }).toArray();
      const fallbackList = primaryList.length === 0 ? await db.collection('notifications').find(query).sort({ createdAt: -1 }).toArray() : [];
      const notifications = primaryList.length > 0 ? primaryList : fallbackList;

      res.json({
        success: true,
        count: notifications.length,
        notifications: notifications.map((n) => ({
          ...n,
          id: n.id || String(n._id)
        }))
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error?.message || 'Failed to fetch notifications' });
    }
  }

  /**
   * POST /api/notifications
   */
  static async create(req: Request, res: Response): Promise<void> {
    try {
      const db = getDatabase();
      const body = req.body || {};

      const newNotification = {
        id: body.id || `NOTIF-${Date.now().toString().slice(-6)}`,
        recipientId: body.recipientId || body.userId || body.clientId || body.consultantId || '',
        recipientEmail: (body.recipientEmail || body.userEmail || body.consultantEmail || body.clientEmail || '').toLowerCase(),
        consultantEmail: (body.consultantEmail || body.recipientEmail || '').toLowerCase(),
        consultantId: body.consultantId || body.recipientId || '',
        consultantName: body.consultantName || body.recipientName || '',
        clientEmail: (body.clientEmail || '').toLowerCase(),
        clientName: body.clientName || '',
        recipientRole: (body.recipientRole || body.role || (body.consultantEmail || body.consultantId ? 'CONSULTANT' : 'ADMIN')).toUpperCase(),
        type: body.type || 'ALERT',
        title: body.title || 'Notification',
        message: body.message || '',
        link: body.link || (body.type === 'ACTIVITY_ASSIGNED' ? '/activities' : body.type === 'ASSESSMENT_ASSIGNED' ? '/assessments' : '/progress'),
        bookingId: body.bookingId || '',
        activityId: body.activityId || '',
        activityTitle: body.activityTitle || '',
        assessmentId: body.assessmentId || '',
        assessmentTitle: body.assessmentTitle || '',
        isPrivate: !!body.isPrivate,
        sharingPreference: body.sharingPreference || 'full',
        submissionData: body.submissionData || null,
        read: false,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const result = await db.collection('Notification').insertOne(newNotification);
      await db.collection('notifications').insertOne(newNotification).catch(() => {});

      res.status(201).json({
        success: true,
        notification: { ...newNotification, _id: result.insertedId },
        message: 'Notification created in MongoDB Atlas'
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error?.message || 'Failed to create notification' });
    }
  }

  /**
   * PUT /api/notifications/:id/read
   */
  static async markRead(req: Request, res: Response): Promise<void> {
    try {
      const id = String(req.params.id || '');
      const db = getDatabase();

      let query: any = { id };
      if (ObjectId.isValid(id)) {
        query = { $or: [{ _id: new ObjectId(id) }, { id }] };
      }

      await db.collection('Notification').updateOne(query, { $set: { read: true, updatedAt: new Date() } });
      await db.collection('notifications').updateOne(query, { $set: { read: true, updatedAt: new Date() } });

      res.json({
        success: true,
        message: 'Notification marked as read'
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error?.message || 'Failed to mark notification as read' });
    }
  }

  /**
   * POST /api/notifications/mark-all-read
   */
  static async markAllRead(req: Request, res: Response): Promise<void> {
    try {
      const db = getDatabase();
      const role = String(req.body?.role || '').toUpperCase();

      let query: any = {};
      if (role) {
        query = { recipientRole: role };
      }

      await db.collection('Notification').updateMany(query, { $set: { read: true, updatedAt: new Date() } });
      await db.collection('notifications').updateMany(query, { $set: { read: true, updatedAt: new Date() } });

      res.json({
        success: true,
        message: 'All notifications marked as read'
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error?.message || 'Failed to mark all as read' });
    }
  }
}
