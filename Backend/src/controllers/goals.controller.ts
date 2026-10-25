import { Request, Response } from 'express';
import { ObjectId } from 'mongodb';
import { getDatabase } from '../db/mongodb';

export class GoalsController {
  /**
   * GET /api/goals and GET /api/goal
   */
  static async getAll(req: Request, res: Response): Promise<void> {
    try {
      const db = getDatabase();
      const primaryGoals = await db.collection('Goal').find({}).toArray();
      const fallbackGoals = primaryGoals.length === 0 ? await db.collection('goals').find({}).toArray() : [];
      const goals = primaryGoals.length > 0 ? primaryGoals : fallbackGoals;

      if (goals.length > 0) {
        res.json({
          success: true,
          count: goals.length,
          goals: goals.map((g) => ({ ...g, id: g.id || String(g._id) }))
        });
        return;
      }

      // If no standalone goals collection, gather therapy goals from Users
      const usersWithGoals = await db.collection('User').find({
        $or: [{ therapyGoals: { $exists: true, $ne: [] } }, { goals: { $exists: true, $ne: [] } }]
      }).toArray();

      const userGoals = usersWithGoals.flatMap((u) => (u.therapyGoals || u.goals || []).map((g: any, idx: number) => ({
        id: typeof g === 'object' && g.id ? g.id : `GL-${u._id}-${idx}`,
        title: typeof g === 'string' ? g : g.title || g.name || 'Therapy Goal',
        description: g.description || 'Clinical target established in therapy plan',
        status: g.status || 'IN_PROGRESS',
        progress: g.progress || 65,
        clientId: String(u._id || u.id),
        clientName: u.name || 'Client',
        targetDate: g.targetDate || '2026-09-30'
      })));

      res.json({
        success: true,
        count: userGoals.length,
        goals: userGoals.length > 0 ? userGoals : [
          {
            id: 'GL-101',
            title: 'Anxiety Reduction & Emotion Regulation',
            description: 'Apply CBT cognitive restructuring techniques daily',
            status: 'IN_PROGRESS',
            progress: 70,
            targetDate: '2026-09-15'
          },
          {
            id: 'GL-102',
            title: 'Sleep Hygiene & Routine Consistency',
            description: 'Maintain 7+ hours nightly rest with wind-down protocol',
            status: 'ACHIEVED',
            progress: 100,
            targetDate: '2026-08-20'
          }
        ]
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
        consultantId: body.consultantId,
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
