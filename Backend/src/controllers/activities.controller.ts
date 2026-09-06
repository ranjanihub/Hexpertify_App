import { Request, Response } from 'express';
import { ObjectId } from 'mongodb';
import { getDatabase } from '../db/mongodb';

const DEFAULT_SEED_ACTIVITIES = [
  {
    id: 'ACT-01',
    name: '5-4-3-2-1 Grounding Technique',
    description: '10-minute guided breathing session focusing on awareness of breath, sensory details, and body sensations.',
    filePath: 'src/activities/templates/GroundingTechnique54321.tsx',
    isVisible: true,
    categoryTag: 'MINDFULNESS',
    duration: '10 min',
    difficulty: 'Easy',
    repeat: 'Daily',
    assignedClientName: 'Sarah Jenkins',
    assignedTherapistName: 'Dr. Alex Harrison',
    assignedInfo: '2 Clients (Sarah Jenkins, +1) • Daily',
    imageUrl: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=600',
    templateId: 'ACT-01',
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'ACT-02',
    name: 'CBT Automatic Thought Record',
    description: 'Document recent anxiety trigger and write a balanced, rational reframe using Beck 5-column technique.',
    filePath: 'src/activities/templates/CBTThoughtRecord.tsx',
    isVisible: true,
    categoryTag: 'CBT',
    duration: '15 min',
    difficulty: 'Medium',
    repeat: '2-3 Times / Week',
    assignedClientName: 'Emily Rodriguez',
    assignedTherapistName: 'Dr. Elena Rostova',
    assignedInfo: 'Emily Rodriguez • 2-3 Times / Week',
    imageUrl: 'https://images.unsplash.com/photo-1517842645767-c639042777db?w=600',
    templateId: 'ACT-02',
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'ACT-03',
    name: 'Progressive Muscle Relaxation (PMR)',
    description: 'Guided audio session with pre/post somatic tension sliders to reduce physical stress and muscle tightness.',
    filePath: 'src/activities/templates/ProgressiveMuscleRelaxation.tsx',
    isVisible: true,
    categoryTag: 'SOMATIC',
    duration: '8 min',
    difficulty: 'Easy',
    repeat: 'Daily',
    assignedClientName: 'Amanda Miller',
    assignedTherapistName: 'Marcus Vance',
    assignedInfo: 'Amanda Miller • Daily',
    imageUrl: 'https://images.unsplash.com/photo-1545205597-3d9d02c29597?w=600',
    templateId: 'ACT-03',
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'ACT-04',
    name: 'Fear Hierarchy & Exposure Ladder',
    description: 'Hierarchy ladder for anxiety triggers using SUDS 0-100 graded exposure steps and habituation tracking.',
    filePath: 'src/activities/templates/ExposureHierarchyLadder.tsx',
    isVisible: true,
    categoryTag: 'EXPOSURE',
    duration: '25 min',
    difficulty: 'Advanced',
    repeat: 'Weekly',
    assignedClientName: 'Robert Garcia',
    assignedTherapistName: 'Dr. Sophia Bennett',
    assignedInfo: '3 Clients (Robert Garcia, +2) • Weekly',
    imageUrl: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=600',
    templateId: 'ACT-04',
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'ACT-05',
    name: 'Behavioral Activation Tracker',
    description: 'Schedule rewarding daily activities, track mood changes, and monitor Pleasure & Mastery scores.',
    filePath: 'src/activities/templates/BehavioralActivationTracker.tsx',
    isVisible: true,
    categoryTag: 'BEHAVIORAL',
    duration: '12 min',
    difficulty: 'Medium',
    repeat: 'Daily',
    assignedClientName: 'Michael Chen',
    assignedTherapistName: 'Dr. Alex Harrison',
    assignedInfo: 'Michael Chen • Daily',
    imageUrl: 'https://images.unsplash.com/photo-1484480974693-6ca0a78fb36b?w=600',
    templateId: 'ACT-05',
    createdAt: new Date(),
    updatedAt: new Date()
  }
];

export class ActivitiesController {
  /**
   * GET /api/activities and GET /api/admin/activities
   */
  static async getAll(_req: Request, res: Response): Promise<void> {
    try {
      const db = getDatabase();
      let activities = await db.collection('Activity').find({}).toArray();

      if (activities.length === 0) {
        // Auto-seed default clinical activities in MongoDB Atlas
        await db.collection('Activity').insertMany(DEFAULT_SEED_ACTIVITIES).catch(() => {});
        activities = await db.collection('Activity').find({}).toArray();
      }

      res.json({
        success: true,
        count: activities.length,
        activities: activities.map((a) => ({
          ...a,
          id: a.id || String(a._id)
        }))
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error?.message || 'Failed to fetch activities' });
    }
  }

  /**
   * GET /api/activities/:id
   */
  static async getById(req: Request, res: Response): Promise<void> {
    try {
      const id = String(req.params.id || req.query.id || '');
      const db = getDatabase();

      let query: any = { id };
      if (ObjectId.isValid(id)) {
        query = { $or: [{ _id: new ObjectId(id) }, { id }] };
      }

      const activity = await db.collection('Activity').findOne(query);
      if (!activity) {
        res.status(404).json({ success: false, error: 'Activity not found' });
        return;
      }

      res.json({
        success: true,
        activity: { ...activity, id: activity.id || String(activity._id) }
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error?.message || 'Failed to fetch activity' });
    }
  }

  /**
   * POST /api/activities and POST /api/admin/activities
   */
  static async create(req: Request, res: Response): Promise<void> {
    try {
      const db = getDatabase();
      const body = req.body || {};

      const newActivity = {
        ...body,
        id: body.id || `ACT-${Date.now().toString().slice(-4)}`,
        isVisible: body.isVisible !== undefined ? body.isVisible : true,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const result = await db.collection('Activity').insertOne(newActivity);

      res.status(201).json({
        success: true,
        activity: { ...newActivity, _id: result.insertedId },
        message: 'Activity created successfully in MongoDB'
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error?.message || 'Failed to create activity' });
    }
  }

  /**
   * PUT /api/activities and PUT /api/activities/:id
   */
  static async update(req: Request, res: Response): Promise<void> {
    try {
      const id = String(req.params.id || req.body?.id || req.body?._id || '');
      const updates = { ...req.body, updatedAt: new Date() };
      delete updates.id;
      delete updates._id;

      if (!id) {
        res.status(400).json({ success: false, error: 'Activity ID is required' });
        return;
      }

      const db = getDatabase();
      let query: any = { id };
      if (ObjectId.isValid(id)) {
        query = { $or: [{ _id: new ObjectId(id) }, { id }] };
      }

      await db.collection('Activity').updateOne(query, { $set: updates }, { upsert: true });

      res.json({
        success: true,
        message: 'Activity updated successfully in MongoDB'
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error?.message || 'Failed to update activity' });
    }
  }

  /**
   * DELETE /api/activities and DELETE /api/activities/:id
   */
  static async delete(req: Request, res: Response): Promise<void> {
    try {
      const id = String(req.params.id || req.query.id || req.body?.id || '');

      if (!id) {
        res.status(400).json({ success: false, error: 'Activity ID is required' });
        return;
      }

      const db = getDatabase();
      let query: any = { id };
      if (ObjectId.isValid(id)) {
        query = { $or: [{ _id: new ObjectId(id) }, { id }] };
      }

      await db.collection('Activity').deleteOne(query);

      res.json({
        success: true,
        message: 'Activity deleted successfully from MongoDB'
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error?.message || 'Failed to delete activity' });
    }
  }
}
