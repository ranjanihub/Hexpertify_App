import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { ObjectId } from 'mongodb';
import { getDatabase } from '../db/mongodb';
import { canViewFullClient, resolveClientViewer } from '../services/client-access';

/**
 * Private notes a therapist keeps about a client (the "Personal notes" on the client page).
 * Only the client's assigned therapist can read or add them, and each therapist sees only their own notes.
 */
const router = Router();

async function noteAccess(req: Request, clientId: string) {
  const viewer = await resolveClientViewer(req);
  if (viewer.kind === 'anonymous') return { error: { status: 401, message: 'Please sign in again.' } } as const;
  if (viewer.kind !== 'therapist') return { error: { status: 403, message: 'Only the client\'s therapist can use these notes.' } } as const;
  if (!clientId) return { error: { status: 400, message: 'clientId is required' } } as const;
  const db = getDatabase();
  const or: any[] = [{ id: clientId }, { _id: clientId as any }];
  if (ObjectId.isValid(clientId)) or.push({ _id: new ObjectId(clientId) });
  const client = await db.collection('User').findOne({ $or: or }) || await db.collection('users').findOne({ $or: or });
  if (!client) return { error: { status: 404, message: 'Client not found' } } as const;
  if (!canViewFullClient(viewer, client)) return { error: { status: 403, message: 'This client is not assigned to you.' } } as const;
  const therapistEmail = [...viewer.ids].find((v) => v.includes('@')) || '';
  return { viewer, client, clientKey: String(client.id || client._id), therapistEmail } as const;
}

/** GET /api/client-notes?clientId= */
router.get('/', async (req: Request, res: Response) => {
  try {
    const access = await noteAccess(req, String(req.query.clientId || '').trim());
    if ('error' in access && access.error) {
      res.status(access.error.status).json({ success: false, error: access.error.message });
      return;
    }
    const notes = await getDatabase().collection('ClientNote')
      .find({ clientId: access.clientKey, therapistEmail: access.therapistEmail })
      .sort({ createdAt: -1 }).limit(200).toArray();
    res.json({ success: true, notes: notes.map((n: any) => ({ id: String(n._id), text: n.text, createdAt: n.createdAt })) });
  } catch (error: any) {
    res.status(500).json({ success: false, error: 'Could not load notes. Please try again.' });
  }
});

/** POST /api/client-notes { clientId, text } */
router.post('/', async (req: Request, res: Response) => {
  try {
    const text = String(req.body?.text || '').trim();
    if (!text) {
      res.status(400).json({ success: false, error: 'Write a note first.' });
      return;
    }
    if (text.length > 5000) {
      res.status(400).json({ success: false, error: 'Notes can be up to 5000 characters.' });
      return;
    }
    const access = await noteAccess(req, String(req.body?.clientId || '').trim());
    if ('error' in access && access.error) {
      res.status(access.error.status).json({ success: false, error: access.error.message });
      return;
    }
    const note = { _id: crypto.randomUUID() as any, clientId: access.clientKey, therapistEmail: access.therapistEmail, text, createdAt: new Date() };
    await getDatabase().collection('ClientNote').insertOne(note);
    res.status(201).json({ success: true, note: { id: String(note._id), text, createdAt: note.createdAt } });
  } catch (error: any) {
    res.status(500).json({ success: false, error: 'Could not save the note. Please try again.' });
  }
});

export default router;
