import { Request, Response } from 'express';
import { ObjectId } from 'mongodb';
import { getDatabase } from '../db/mongodb';
import { idQuery } from '../services/live-content';

export class GoalsController {
  /**
   * GET /api/goals and GET /api/goal
   */
  static async getAll(req: Request, res: Response): Promise<void> {
    try {
      const db = getDatabase();
      const clientEmail = String(req.query.clientEmail || req.query.email || '').toLowerCase().trim();
      const clientId = String(req.query.clientId || req.query.userId || '').trim();
      const consultantId = String(req.query.consultantId || req.query.therapistId || '').trim();

      // Goals store the client id (and sometimes email) and the therapist as consultantId or therapistId
      const and: any[] = [];
      if (clientEmail || clientId) {
        const ids = new Set<string>(clientId ? [clientId] : []);
        if (clientEmail) {
          const user: any = await db.collection('User').findOne({ email: clientEmail }).catch(() => null);
          [user?.id, user?._id].filter(Boolean).forEach((v) => ids.add(String(v)));
        }
        and.push({
          $or: [
            ...(clientEmail ? [{ clientEmail }] : []),
            ...(ids.size ? [{ clientId: { $in: [...ids] } }, { userId: { $in: [...ids] } }] : [])
          ]
        });
      }
      if (consultantId) {
        const consultant: any = await db.collection('Consultant').findOne(idQuery(consultantId)).catch(() => null);
        const ids = [...new Set([consultantId, consultant?.id, consultant?._id].filter(Boolean).map(String))];
        and.push({ $or: [{ consultantId: { $in: ids } }, { therapistId: { $in: ids } }] });
      }
      const query = and.length === 0 ? {} : and.length === 1 ? and[0] : { $and: and };

      const primaryGoals = await db.collection('Goal').find(query).sort({ createdAt: -1 }).toArray();
      const goals = primaryGoals.length > 0
        ? primaryGoals
        : await db.collection('goals').find(query).sort({ createdAt: -1 }).toArray().catch(() => []);

      res.json({
        success: true,
        count: goals.length,
        goals: goals.map((g) => ({ ...g, id: g.id || String(g._id) }))
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error?.message || 'Failed to fetch goals' });
    }
  }

  /**
   * POST /api/goals
   */
  static async create(req: Request, res: Response): Promise<void> {
    try {
      const body = req.body || {};
      const db = getDatabase();

      const newGoal = {
        id: body.id || `GL-${Date.now().toString().slice(-4)}`,
        title: body.title || 'New Therapy Target',
        description: body.description || '',
        status: body.status || 'IN_PROGRESS',
        progress: body.progress || 0,
        clientId: body.clientId,
        ...(body.clientEmail ? { clientEmail: String(body.clientEmail).toLowerCase().trim() } : {}),
        ...(body.clientName ? { clientName: body.clientName } : {}),
        // Existing goals carry therapistId; the panels send consultantId
        consultantId: body.consultantId || body.therapistId,
        therapistId: body.therapistId || body.consultantId,
        ...(body.therapistName || body.consultantName ? { therapistName: body.therapistName || body.consultantName } : {}),
        targetDate: body.targetDate || new Date().toISOString().split('T')[0],
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const result = await db.collection('Goal').insertOne(newGoal);

      res.status(201).json({
        success: true,
        goal: { ...newGoal, _id: result.insertedId },
        message: 'Goal created successfully in MongoDB Atlas'
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error?.message || 'Failed to create goal' });
    }
  }

  /**
   * PUT /api/goals/:id
   */
  static async update(req: Request, res: Response): Promise<void> {
    try {
      const id = String(req.params.id || req.body?.id || req.body?._id || '');
      const updates = { ...req.body, updatedAt: new Date() };
      delete updates.id;
      delete updates._id;

      const db = getDatabase();
      let query: any = { id };
      if (ObjectId.isValid(id)) {
        query = { $or: [{ _id: new ObjectId(id) }, { id }] };
      }

      await db.collection('Goal').updateOne(query, { $set: updates });
      await db.collection('goals').updateOne(query, { $set: updates });

      res.json({
        success: true,
        message: 'Goal updated successfully in MongoDB Atlas'
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error?.message || 'Failed to update goal' });
    }
  }
}
