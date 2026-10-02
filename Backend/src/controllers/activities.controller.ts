import { Request, Response } from 'express';
import { ObjectId } from 'mongodb';
import { getDatabase } from '../db/mongodb';

const DEFAULT_SEED_ACTIVITIES = [
  {
    id: 'ACT-01',
    name: '5-4-3-2-1 Grounding Technique',
    title: '5-4-3-2-1 Grounding Technique',
    description: '10-minute guided breathing session focusing on awareness of breath, sensory details (5 Sights, 4 Touches, 3 Sounds, 2 Scents, 1 Taste), and body sensations.',
    categoryTag: 'MINDFULNESS',
    category: 'MINDFULNESS',
    duration: '10 min',
    difficulty: 'Easy',
    repeat: 'Daily',
    frequency: 'Daily',
    timeOfDay: 'Morning (8:00 AM)',
    dueDate: 'Today',
    imageUrl: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?auto=format&fit=crop&w=800&q=80',
    instructions: '1. Look around and name 5 things you can see.\n2. Touch and observe 4 physical textures.\n3. Tune in and listen to 3 distinct sounds.\n4. Take a slow breath and notice 2 scents.\n5. Notice 1 taste or take a refreshing sip of water.',
    filePath: 'src/activities/templates/GroundingTechnique54321.tsx',
    templateId: 'ACT-01',
    assignedTo: ['Sarah Jenkins'],
    clientAssignments: [
      { clientName: 'Sarah Jenkins', frequency: 'Daily', timeOfDay: 'Morning (8:00 AM)' }
    ],
    assignedTherapistName: 'Dr. Alex Harrison',
    assignedInfo: 'Sarah Jenkins • Daily',
    isVisible: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'ACT-02',
    name: 'CBT Automatic Thought Record',
    title: 'CBT Automatic Thought Record',
    description: 'Document recent anxiety trigger and write a balanced, rational reframe using Beck 5-column cognitive distortion analysis.',
    categoryTag: 'CBT',
    category: 'CBT',
    duration: '15 min',
    difficulty: 'Medium',
    repeat: '2-3 Times / Week',
    frequency: '2-3 Times / Week',
    timeOfDay: 'Evening (7:00 PM)',
    dueDate: 'Today',
    imageUrl: 'https://images.unsplash.com/photo-1517842645767-c639042777db?auto=format&fit=crop&w=800&q=80',
    instructions: '1. Record the triggering situation (Where were you? Who was there?).\n2. Catch your automatic thought and rate its emotional intensity (0-100%).\n3. Identify cognitive distortions (catastrophizing, all-or-nothing, mind reading).\n4. Challenge the thought with objective evidence.\n5. Formulate a realistic replacement thought.',
    filePath: 'src/activities/templates/CBTThoughtRecord.tsx',
    templateId: 'ACT-02',
    assignedTo: ['Emily Rodriguez'],
    clientAssignments: [
      { clientName: 'Emily Rodriguez', frequency: '2-3 Times / Week', timeOfDay: 'Evening (7:00 PM)' }
    ],
    assignedTherapistName: 'Dr. Elena Rostova',
    assignedInfo: 'Emily Rodriguez • 2-3 Times / Week',
    isVisible: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'ACT-03',
    name: 'Progressive Muscle Relaxation (PMR)',
    title: 'Progressive Muscle Relaxation (PMR)',
    description: 'Systematically tense and release muscle groups from toes to head to dissolve physical anxiety and somatic stress.',
    categoryTag: 'SOMATIC',
    category: 'SOMATIC',
    duration: '12 min',
    difficulty: 'Easy',
    repeat: 'Daily',
    frequency: 'Daily',
    timeOfDay: 'Evening (7:00 PM)',
    dueDate: 'Today',
    imageUrl: 'https://images.unsplash.com/photo-1545205597-3d9d02c29597?auto=format&fit=crop&w=800&q=80',
    instructions: '1. Settle into a comfortable reclining position.\n2. Tense your feet/toes firmly for 5 seconds, then release completely for 10 seconds.\n3. Progress upwards through calves, thighs, abdomen, chest, shoulders, and face.\n4. Observe the contrast between tension and deep soothing relaxation.',
    filePath: 'src/activities/templates/ProgressiveMuscleRelaxation.tsx',
    templateId: 'ACT-03',
    assignedTo: ['Amanda Miller'],
    clientAssignments: [
      { clientName: 'Amanda Miller', frequency: 'Daily', timeOfDay: 'Evening (7:00 PM)' }
    ],
    assignedTherapistName: 'Marcus Vance',
    assignedInfo: 'Amanda Miller • Daily',
    isVisible: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'ACT-04',
    name: 'Fear Hierarchy & Exposure Ladder',
    title: 'Fear Hierarchy & Exposure Ladder',
    description: 'Hierarchy ladder for anxiety triggers using SUDS 0-100 graded exposure steps and habituation tracking.',
    categoryTag: 'EXPOSURE',
    category: 'EXPOSURE',
    duration: '25 min',
    difficulty: 'Advanced',
    repeat: 'Weekly',
    frequency: 'Weekly',
    timeOfDay: 'Afternoon (1:00 PM)',
    dueDate: 'Tomorrow',
    imageUrl: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=800&q=80',
    instructions: '1. Define your primary fear target.\n2. Break the situation down into 5 graded steps from mild (SUDS 20) to severe (SUDS 90).\n3. Complete repeated trials on the current rung until anxiety drops by 50% before climbing.',
    filePath: 'src/activities/templates/ExposureHierarchyLadder.tsx',
    templateId: 'ACT-04',
    assignedTo: ['Robert Garcia'],
    clientAssignments: [
      { clientName: 'Robert Garcia', frequency: 'Weekly', timeOfDay: 'Afternoon (1:00 PM)' }
    ],
    assignedTherapistName: 'Dr. Sophia Bennett',
    assignedInfo: 'Robert Garcia • Weekly',
    isVisible: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'ACT-05',
    name: 'Behavioral Activation Tracker',
    title: 'Behavioral Activation Tracker',
    description: 'Schedule rewarding daily activities, track mood changes, and monitor Pleasure & Mastery scores.',
    categoryTag: 'BEHAVIORAL',
    category: 'BEHAVIORAL',
    duration: '12 min',
    difficulty: 'Medium',
    repeat: 'Daily',
    frequency: 'Daily',
    timeOfDay: 'Morning (8:00 AM)',
    dueDate: 'Today',
    imageUrl: 'https://images.unsplash.com/photo-1484480974693-6ca0a78fb36b?auto=format&fit=crop&w=800&q=80',
    instructions: '1. Identify 3 small meaningful actions you can take today.\n2. Rate anticipated Pleasure (0-10) and Mastery (0-10).\n3. Log your actual mood shift immediately after finishing.',
    filePath: 'src/activities/templates/BehavioralActivationTracker.tsx',
    templateId: 'ACT-05',
    assignedTo: ['Michael Chen'],
    clientAssignments: [
      { clientName: 'Michael Chen', frequency: 'Daily', timeOfDay: 'Morning (8:00 AM)' }
    ],
    assignedTherapistName: 'Dr. Alex Harrison',
    assignedInfo: 'Michael Chen • Daily',
    isVisible: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'ACT-06',
    name: '4-7-8 Parasympathetic Breathing',
    title: '4-7-8 Parasympathetic Breathing',
    description: 'Calm your nervous system using rhythmic 4-second inhale, 7-second hold, and 8-second exhale wave cycles.',
    categoryTag: 'BREATHING',
    category: 'BREATHING',
    duration: '5 min',
    difficulty: 'Easy',
    repeat: 'As Needed (PRN)',
    frequency: 'As Needed (PRN)',
    timeOfDay: 'Any Time',
    dueDate: 'Today',
    imageUrl: 'https://images.unsplash.com/photo-1518241353330-0f7941c2d9b5?auto=format&fit=crop&w=800&q=80',
    instructions: '1. Inhale silently through your nose for 4 seconds.\n2. Hold your breath gently for 7 seconds.\n3. Exhale completely through your mouth for 8 seconds. Complete 4 consecutive cycles.',
    filePath: 'src/activities/templates/GroundingTechnique54321.tsx',
    templateId: 'ACT-06',
    assignedTo: ['Sarah Jenkins'],
    clientAssignments: [
      { clientName: 'Sarah Jenkins', frequency: 'As Needed (PRN)', timeOfDay: 'Any Time' }
    ],
    assignedTherapistName: 'Dr. Alex Harrison',
    assignedInfo: 'Sarah Jenkins • As Needed',
    isVisible: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'ACT-07',
    name: 'Daily Gratitude Journal & Reflection',
    title: 'Daily Gratitude Journal & Reflection',
    description: 'Write down 3 things you felt grateful for today and reflect on why they brought meaning, joy, or relief.',
    categoryTag: 'GRATITUDE',
    category: 'GRATITUDE',
    duration: '8 min',
    difficulty: 'Easy',
    repeat: 'Daily',
    frequency: 'Daily',
    timeOfDay: 'Before Bed (10:00 PM)',
    dueDate: 'Today',
    imageUrl: 'https://images.unsplash.com/photo-1511295742362-92c96b124e52?auto=format&fit=crop&w=800&q=80',
    instructions: '1. Take 2 slow abdominal breaths.\n2. Write down 3 specific moments from today that brought warmth, satisfaction, or relief.\n3. Reflect on *why* they mattered to absorb positive emotions.',
    filePath: 'src/activities/templates/GroundingTechnique54321.tsx',
    templateId: 'ACT-07',
    assignedTo: ['Amanda Miller'],
    clientAssignments: [
      { clientName: 'Amanda Miller', frequency: 'Daily', timeOfDay: 'Before Bed (10:00 PM)' }
    ],
    assignedTherapistName: 'Marcus Vance',
    assignedInfo: 'Amanda Miller • Daily',
    isVisible: true,
    createdAt: new Date(),
    updatedAt: new Date()
  }
];

import { cacheService } from '../services/cache.service';

export class ActivitiesController {
  /**
   * GET /api/activities and GET /api/admin/activities
   */
  static async getAll(req: Request, res: Response): Promise<void> {
    try {
      const isAdmin =
        req.path.includes('admin') ||
        req.baseUrl.includes('admin') ||
        req.query.role === 'ADMIN' ||
        req.query.isAdmin === 'true';

      const cacheKey = isAdmin ? 'activities:admin' : 'activities:public';

      const responseData = await cacheService.wrap(cacheKey, ['activities'], 30, async () => {
        const db = getDatabase();
        let activities = await db.collection('Activity').find({}).toArray();

        if (activities.length === 0) {
          // Auto-seed default clinical activities in MongoDB Atlas
          await db.collection('Activity').insertMany(DEFAULT_SEED_ACTIVITIES).catch(() => {});
          activities = await db.collection('Activity').find({}).toArray();
        }

        // Filter for non-admin viewers (consultants and clients only see activities approved/visible by admin)
        const filtered = isAdmin
          ? activities
          : activities.filter((a) => a.isVisible !== false);

        return {
          success: true,
          count: filtered.length,
          activities: filtered.map((a) => ({
            ...a,
            id: a.id || String(a._id),
            title: a.title || a.name || 'Therapeutic Activity',
            name: a.name || a.title || 'Therapeutic Activity',
            category: (a.categoryTag || a.category || 'MINDFULNESS').toUpperCase(),
            categoryTag: (a.categoryTag || a.category || 'MINDFULNESS').toUpperCase(),
            isVisible: a.isVisible !== undefined ? a.isVisible : true
          }))
        };
      });

      res.json(responseData);
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
      cacheService.invalidateTags(['activities', 'stats']);

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
      cacheService.invalidateTags(['activities', 'stats']);

      res.json({
        success: true,
        message: 'Activity updated successfully in MongoDB'
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error?.message || 'Failed to update activity' });
    }
  }

  /**
   * POST /api/activities/assign
   * Assign activity to clients and dispatch notifications to client panels
   */
  static async assign(req: Request, res: Response): Promise<void> {
    try {
      const db = getDatabase();
      const body = req.body || {};

      const activityId = String(body.activityId || body.id || '');
      const activityTitle = body.activityTitle || body.title || 'Morning Mindfulness Meditation';
      const activityCategory = body.activityCategory || body.category || 'MINDFULNESS';
      const consultantId = String(body.consultantId || '');
      const consultantName = body.consultantName || body.therapistName || 'Your Consultant';
      const clients = Array.isArray(body.clients) ? body.clients : [];
      const assignedToNames = Array.isArray(body.assignedTo) 
        ? body.assignedTo 
        : clients.map((c: any) => c.clientName || c.name).filter(Boolean);

      if (!activityId && !activityTitle) {
        res.status(400).json({ success: false, error: 'Activity ID or Title is required' });
        return;
      }

      const searchConditions: any[] = [];
      if (activityId) {
        searchConditions.push({ id: activityId });
        searchConditions.push({ id: Number(activityId) || -1 });
        searchConditions.push({ id: `ACT-0${activityId}` });
        if (ObjectId.isValid(activityId)) {
          searchConditions.push({ _id: new ObjectId(activityId) });
        }
      }
      if (activityTitle) {
        const safeRegex = new RegExp(`^${activityTitle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i');
        searchConditions.push({ name: activityTitle });
        searchConditions.push({ title: activityTitle });
        searchConditions.push({ name: { $regex: safeRegex } });
        searchConditions.push({ title: { $regex: safeRegex } });
      }

      const query = searchConditions.length > 0 ? { $or: searchConditions } : { id: activityId };

      const updateFields: any = {
        id: activityId || '1',
        name: activityTitle,
        title: activityTitle,
        categoryTag: activityCategory,
        category: activityCategory,
        assignedTo: assignedToNames,
        clientAssignments: clients,
        assignedTherapistId: consultantId,
        assignedTherapistName: consultantName,
        frequency: clients[0]?.frequency || body.frequency || 'Daily',
        timeOfDay: clients[0]?.timeOfDay || body.timeOfDay || 'Morning (8:00 AM)',
        updatedAt: new Date()
      };

      if (body.description) updateFields.description = body.description;
      if (body.duration) updateFields.duration = body.duration;
      if (body.difficulty) updateFields.difficulty = body.difficulty;
      if (body.imageUrl) updateFields.imageUrl = body.imageUrl;
      if (body.instructions) updateFields.instructions = body.instructions;
      if (body.dueDate) updateFields.dueDate = body.dueDate;

      // Update or upsert the activity in MongoDB Atlas
      await Promise.all([
        db.collection('Activity').updateMany(
          query,
          {
            $set: updateFields,
            $setOnInsert: {
              createdAt: new Date(),
              status: 'pending',
              isVisible: true
            }
          },
          { upsert: true }
        ),
        db.collection('activities').updateMany(
          query,
          {
            $set: updateFields,
            $setOnInsert: {
              createdAt: new Date(),
              status: 'pending',
              isVisible: true
            }
          },
          { upsert: true }
        ).catch(() => {})
      ]);

      // Create in-app notifications for each assigned client
      const notificationsToInsert: any[] = [];
      for (const client of clients) {
        const clientEmail = String(client.clientEmail || client.email || '').toLowerCase().trim();
        const clientId = String(client.clientId || client.id || '');
        const clientName = client.clientName || client.name || 'Client';
        const freq = client.frequency || 'Daily';
        const timeSlot = client.timeOfDay || 'Morning (8:00 AM)';

        const notifDoc = {
          id: `NOTIF-${Date.now().toString().slice(-6)}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
          recipientId: clientId,
          recipientEmail: clientEmail,
          clientEmail: clientEmail,
          clientName: clientName,
          recipientRole: 'CLIENT',
          type: 'ACTIVITY_ASSIGNED',
          title: `New Activity Assigned: ${activityTitle} ⚡`,
          message: `Your consultant ${consultantName} assigned you "${activityTitle}" (${freq} • ${timeSlot}). Tap to start your therapeutic exercise.`,
          link: '/activities',
          activityId: activityId,
          activityTitle: activityTitle,
          frequency: freq,
          timeOfDay: timeSlot,
          consultantId: consultantId,
          consultantName: consultantName,
          read: false,
          createdAt: new Date(),
          updatedAt: new Date()
        };

        notificationsToInsert.push(notifDoc);
      }

      if (notificationsToInsert.length > 0) {
        await db.collection('Notification').insertMany(notificationsToInsert).catch(() => {});
        await db.collection('notifications').insertMany(notificationsToInsert).catch(() => {});
      }

      cacheService.invalidateTags(['activities', 'stats', 'users']);

      res.status(200).json({
        success: true,
        message: `Activity assigned and ${notificationsToInsert.length} client notification(s) dispatched.`,
        assignedCount: notificationsToInsert.length,
        notifications: notificationsToInsert
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error?.message || 'Failed to assign activity' });
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
      cacheService.invalidateTags(['activities', 'stats']);

      res.json({
        success: true,
        message: 'Activity deleted successfully from MongoDB'
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error?.message || 'Failed to delete activity' });
    }
  }
}
