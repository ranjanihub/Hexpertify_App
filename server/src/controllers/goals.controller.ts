import { Request, Response } from 'express';
import { ObjectId } from 'mongodb';
import { getDatabase } from '../db/mongodb';
import { resolveClientViewer } from '../services/client-access';
import { idQuery } from '../services/live-content';
import {
  clientAccessRefusal, findClientUser, namesOtherClient, ownClientUser, ownConsultant, refuse, serverError
} from '../services/clinical-access';

/** Fields that say whose goal it is: changed only by admins / internal calls */
const GOAL_OWNER_FIELDS = ['clientId', 'userId', 'clientEmail', 'consultantId', 'therapistId'];

/**
 * Goals are part of a client's clinical record: only the client, their assigned therapist,
 * an admin or the website's own server code (internal key) read or change them.
 */
export class GoalsController {
  /**
   * GET /api/goals and GET /api/goal
   */
  static async getAll(req: Request, res: Response): Promise<void> {
    try {
      const db = getDatabase();
      let clientEmail = String(req.query.clientEmail || req.query.email || '').toLowerCase().trim();
      let clientId = String(req.query.clientId || req.query.userId || '').trim();
      let consultantId = String(req.query.consultantId || req.query.therapistId || '').trim();

      const viewer = await resolveClientViewer(req);
      if (viewer.kind === 'anonymous') {
        refuse(res, { status: 401, error: 'Please sign in to see goals.' });
        return;
      }

      // The client account the request is about, when it names one (or the client's own account)
      let client: any = null;
      if (viewer.kind === 'client') {
        client = await ownClientUser(db, viewer);
        if (!client || namesOtherClient(client, { email: clientEmail, id: clientId })) {
          refuse(res, { status: 403, error: 'You can only view your own goals.' });
          return;
        }
        consultantId = '';
      } else if (clientEmail || clientId) {
        client = await findClientUser(db, { email: clientEmail, id: clientId });
        if (!client || namesOtherClient(client, { email: clientEmail, id: clientId })) {
          refuse(res, { status: 404, error: 'Client not found' });
          return;
        }
        if (refuse(res, clientAccessRefusal(viewer, client))) return;
      } else if (viewer.kind === 'therapist') {
        // No client named: the therapist's own goals only
        const me = await ownConsultant(db, viewer);
        if (!me || (consultantId && !viewer.ids.has(consultantId.toLowerCase()))) {
          refuse(res, { status: 403, error: 'You can only view your own clients\' goals.' });
          return;
        }
        consultantId = String(me.id || me._id);
      }
      if (client) {
        clientEmail = String(client.email || '').toLowerCase().trim();
        clientId = String(client.id || client._id);
      }

      // Goals store the client id (and sometimes email) and the therapist as consultantId or therapistId
      const and: any[] = [];
      if (clientEmail || clientId) {
        const ids = new Set<string>([clientId, client?.id, client?._id].filter(Boolean).map(String));
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
      serverError(res, 'GoalsController.getAll', error, 'Failed to fetch goals');
    }
  }

  /**
   * POST /api/goals
   */
  static async create(req: Request, res: Response): Promise<void> {
    try {
      const body = req.body || {};
      const db = getDatabase();

      const viewer = await resolveClientViewer(req);
      if (viewer.kind === 'anonymous') {
        refuse(res, { status: 401, error: 'Please sign in to add a goal.' });
        return;
      }
      const askedEmail = String(body.clientEmail || '').toLowerCase().trim();
      const askedId = String(body.clientId || body.userId || '').trim();
      const client: any = viewer.kind === 'client'
        ? await ownClientUser(db, viewer)
        : await findClientUser(db, { email: askedEmail, id: askedId });
      if (!client || namesOtherClient(client, { email: askedEmail, id: askedId })) {
        refuse(res, viewer.kind === 'client'
          ? { status: 403, error: 'You can only add your own goals.' }
          : { status: 404, error: 'Client not found' });
        return;
      }
      if (refuse(res, clientAccessRefusal(viewer, client))) return;

      // A therapist's goal is recorded as theirs; others keep the therapist the request names
      const consultant: any = viewer.kind === 'therapist' ? await ownConsultant(db, viewer) : null;
      const therapistRef = consultant ? String(consultant.id || consultant._id) : (body.consultantId || body.therapistId);
      const therapistName = consultant?.name || body.therapistName || body.consultantName;

      const newGoal = {
        id: `GL-${Date.now().toString().slice(-6)}`,
        title: body.title || 'New Therapy Target',
        description: body.description || '',
        status: body.status || 'IN_PROGRESS',
        progress: body.progress || 0,
        clientId: String(client.id || client._id),
        clientEmail: String(client.email || '').toLowerCase().trim(),
        clientName: client.name || body.clientName || 'Client',
        // Existing goals carry therapistId; the panels send consultantId
        consultantId: therapistRef,
        therapistId: therapistRef,
        ...(therapistName ? { therapistName } : {}),
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
      serverError(res, 'GoalsController.create', error, 'Failed to create goal');
    }
  }

  /**
   * PUT /api/goals/:id
   */
  static async update(req: Request, res: Response): Promise<void> {
    try {
      const id = String(req.params.id || req.body?.id || req.body?._id || '');
      const viewer = await resolveClientViewer(req);
      if (viewer.kind === 'anonymous') {
        refuse(res, { status: 401, error: 'Please sign in to update a goal.' });
        return;
      }

      const updates = { ...(req.body || {}), updatedAt: new Date() };
      delete updates.id;
      delete updates._id;
      if (viewer.kind !== 'admin' && viewer.kind !== 'internal') GOAL_OWNER_FIELDS.forEach((f) => delete updates[f]);

      const db = getDatabase();
      let query: any = { id };
      if (ObjectId.isValid(id)) {
        query = { $or: [{ _id: new ObjectId(id) }, { id }] };
      }

      const goal: any = await db.collection('Goal').findOne(query) || await db.collection('goals').findOne(query).catch(() => null);
      if (!id || !goal) {
        refuse(res, { status: 404, error: 'Goal not found' });
        return;
      }
      // The goal's client decides who may change it
      if (viewer.kind !== 'admin' && viewer.kind !== 'internal') {
        const client = await findClientUser(db, { email: goal.clientEmail, id: goal.clientId || goal.userId });
        if (!client) {
          refuse(res, { status: 403, error: 'You cannot change this goal.' });
          return;
        }
        if (refuse(res, clientAccessRefusal(viewer, client))) return;
      }

      await db.collection('Goal').updateOne(query, { $set: updates });
      await db.collection('goals').updateOne(query, { $set: updates }).catch(() => {});

      res.json({
        success: true,
        message: 'Goal updated successfully in MongoDB Atlas'
      });
    } catch (error: any) {
      serverError(res, 'GoalsController.update', error, 'Failed to update goal');
    }
  }
}
