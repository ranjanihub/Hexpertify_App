import { Request, Response } from 'express';
import { ObjectId } from 'mongodb';
import { getDatabase } from '../db/mongodb';
import { cacheService } from '../services/cache.service';
import { idQuery } from '../services/live-content';
import { resolveClientViewer } from '../services/client-access';

/**
 * Who may edit or delete a resource: an admin (or the server itself), or the therapist who created it.
 * Resources made before creators were recorded can only be changed by an admin. Returns the refusal or null.
 */
async function resourceChangeRefusal(req: Request, query: any): Promise<{ status: number; error: string } | null> {
  const viewer = await resolveClientViewer(req);
  if (viewer.kind === 'internal' || viewer.kind === 'admin') return null;
  if (viewer.kind === 'anonymous') return { status: 401, error: 'Please sign in to change resources.' };
  if (viewer.kind !== 'therapist') return { status: 403, error: 'Only therapists and the admin team can change resources.' };
  const db = getDatabase();
  const resource: any = await db.collection('Resource').findOne(query) || await db.collection('resources').findOne(query);
  if (!resource) return { status: 404, error: 'Resource not found' };
  const owner = [resource.createdByEmail, resource.authorEmail, resource.consultantEmail, resource.therapistEmail, resource.consultantId, resource.therapistId]
    .filter(Boolean).map((v: any) => String(v).toLowerCase().trim());
  if (owner.some((v) => viewer.ids.has(v))) return null;
  return { status: 403, error: 'You can only change resources you added. Ask the admin team to change this one.' };
}

/** sharedWith: [{ clientId, clientEmail }] — the clients a therapist shared a resource with */
function normalizeSharedWith(value: unknown): { clientId: string; clientEmail: string }[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const seen = new Set<string>();
  const out: { clientId: string; clientEmail: string }[] = [];
  for (const v of value) {
    const clientId = String((v as any)?.clientId || (v as any)?.id || '').trim();
    const clientEmail = String((v as any)?.clientEmail || (v as any)?.email || '').toLowerCase().trim();
    const key = clientEmail || clientId;
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push({ clientId, clientEmail });
  }
  return out;
}

const low = (v: unknown) => String(v ?? '').trim().toLowerCase();

/** The therapist ids/emails a resource was shared with "all my clients" of (kept current as clients join) */
const allClientsOf = (r: any): string[] => (Array.isArray(r?.sharedWithAllClientsOf) ? r.sharedWithAllClientsOf.map(low).filter(Boolean) : []);

/** Public = not limited to particular clients (no sharedWith entries and no "all my clients" share) */
const isPublicResource = (r: any) => (!Array.isArray(r?.sharedWith) || r.sharedWith.length === 0) && allClientsOf(r).length === 0;

const isOwnResource = (r: any, ids: Set<string>) =>
  [r?.createdByEmail, r?.authorEmail, r?.consultantEmail, r?.therapistEmail, r?.consultantId, r?.therapistId]
    .map(low).filter(Boolean).some((v) => ids.has(v));

interface ResourceViewer {
  kind: 'internal' | 'admin' | 'therapist' | 'client' | 'anonymous';
  ids: Set<string>;
  /** For a client: their assigned therapist's ids/emails (for "all my clients" shares) */
  therapistIds: Set<string>;
}

/** Who is asking, from the sign-in token (never from query parameters) */
async function resourceViewer(req: Request): Promise<ResourceViewer> {
  const viewer = await resolveClientViewer(req);
  const therapistIds = new Set<string>();
  if (viewer.kind === 'client') {
    const db = getDatabase();
    const or = [...viewer.ids].map((v) => (v.includes('@') ? { email: v } : { id: v }));
    const user: any = or.length ? await db.collection('User').findOne({ $or: or }).catch(() => null) : null;
    [user?.assignedTherapistId, user?.assignedTherapistEmail].map(low).filter(Boolean).forEach((v) => therapistIds.add(v));
    if (user?.assignedTherapistId) {
      const c: any = await db.collection('Consultant').findOne(idQuery(String(user.assignedTherapistId))).catch(() => null);
      [c?.id, c?._id, c?.email].map(low).filter(Boolean).forEach((v) => therapistIds.add(v));
    }
  }
  return { kind: viewer.kind, ids: viewer.ids, therapistIds };
}

/**
 * Admins see every resource; a therapist sees public ones and their own; a client sees public ones, ones shared
 * with them, and "all my clients" shares from their own therapist; someone not signed in sees public ones only.
 */
function canSeeResource(r: any, v: ResourceViewer): boolean {
  if (v.kind === 'admin' || v.kind === 'internal') return true;
  if (isPublicResource(r)) return true;
  if (v.kind === 'therapist') return isOwnResource(r, v.ids);
  if (v.kind === 'client') {
    const sharedWithMe = Array.isArray(r.sharedWith) && r.sharedWith.some((s: any) =>
      (s?.clientEmail && v.ids.has(low(s.clientEmail))) || (s?.clientId && v.ids.has(low(s.clientId))));
    return sharedWithMe || allClientsOf(r).some((t) => v.therapistIds.has(t));
  }
  return false;
}

export class ResourcesController {
  /**
   * GET /api/resources and GET /api/admin/resources
   */
  static async getAll(req: Request, res: Response): Promise<void> {
    try {
      const responseData = await cacheService.wrap('resources:all', ['resources'], 60, async () => {
        const db = getDatabase();
        // Only resources added in the panels (demo resources are never seeded)
        const resources = await db.collection('Resource').find({}).toArray();

        return {
          success: true,
          count: resources.length,
          resources: resources.map((r) => ({
            ...r,
            id: r.id || String(r._id),
            category: r.category || (r.type ? r.type.charAt(0).toUpperCase() + r.type.slice(1) + 's' : 'Articles')
          }))
        };
      });

      // Each person only gets the resources they may see (decided by their sign-in, not by query parameters);
      // ?email= marks the ones that person saved
      const viewer = await resourceViewer(req);
      const viewerEmail = String(req.query.email || req.query.clientEmail || '').toLowerCase().trim();
      const list = (responseData.resources as any[])
        .filter((r) => canSeeResource(r, viewer))
        .map((r) => (viewerEmail
          ? { ...r, isSaved: Array.isArray(r.savedBy) && r.savedBy.map((e: any) => String(e).toLowerCase()).includes(viewerEmail) }
          : r));
      res.json({ ...responseData, count: list.length, resources: list });
    } catch (error: any) {
      res.json({
        success: true,
        count: 0,
        resources: []
      });
    }
  }

  /**
   * GET /api/resources/:id
   */
  static async getById(req: Request, res: Response): Promise<void> {
    try {
      const id = String(req.params.id || req.query.id || '');
      const cacheKey = `resource:${id}`;

      const responseData = await cacheService.wrap(cacheKey, ['resources'], 60, async () => {
        const db = getDatabase();

        let query: any = { id };
        if (ObjectId.isValid(id)) {
          query = { $or: [{ _id: new ObjectId(id) }, { id }] };
        }

        const resource = await db.collection('Resource').findOne(query);
        if (!resource) {
          return null;
        }

        return {
          success: true,
          resource: { ...resource, id: resource.id || String(resource._id) }
        };
      });

      // A private resource is "not found" for anyone who may not see it
      if (!responseData || !canSeeResource(responseData.resource, await resourceViewer(req))) {
        res.status(404).json({ success: false, error: 'Resource not found' });
        return;
      }

      res.json(responseData);
    } catch (error: any) {
      res.status(500).json({ success: false, error: error?.message || 'Failed to fetch resource' });
    }
  }

  /**
   * POST /api/resources
   */
  static async create(req: Request, res: Response): Promise<void> {
    try {
      const db = getDatabase();
      const body = req.body || {};

      // Who made it comes from the sign-in token (never the request body), so only they (or an admin) can change it
      const viewer = await resolveClientViewer(req);
      if (viewer.kind === 'anonymous' || viewer.kind === 'client') {
        res.status(viewer.kind === 'anonymous' ? 401 : 403).json({ success: false, error: 'Only therapists and the admin team can add resources.' });
        return;
      }
      const creatorEmail = [...viewer.ids].find((v) => v.includes('@')) || '';

      const sharedWith = normalizeSharedWith(body.sharedWith);
      // "All my clients": stored as the therapist's ids, so clients who join later see it too
      const allMine = body.shareWithAllClients === true && viewer.kind === 'therapist' ? [...viewer.ids] : [];
      delete body.shareWithAllClients;
      delete body.sharedWithAllClientsOf;
      const newResource = {
        ...body,
        createdByRole: viewer.kind,
        createdByEmail: creatorEmail || undefined,
        ...(allMine.length ? { sharedWithAllClientsOf: allMine, isSharedByTherapist: true } : {}),
        ...(sharedWith ? { sharedWith, isSharedByTherapist: sharedWith.length > 0 || allMine.length > 0 || Boolean(body.isSharedByTherapist) } : {}),
        savedBy: [],
        isSaved: false,
        id: body.id || `RES-${Date.now()}`,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const result = await db.collection('Resource').insertOne(newResource);
      await db.collection('resources').insertOne(newResource).catch(() => {});

      cacheService.invalidateTags(['resources']);

      res.status(201).json({
        success: true,
        resource: { ...newResource, _id: result.insertedId },
        message: 'Resource created successfully in MongoDB'
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error?.message || 'Failed to create resource' });
    }
  }

  /**
   * PUT /api/resources and PUT /api/resources/:id
   */
  static async update(req: Request, res: Response): Promise<void> {
    try {
      const id = String(req.params.id || req.body?.id || req.body?._id || '');
      const updates = { ...req.body, updatedAt: new Date() };
      delete updates.id;
      delete updates._id;
      delete updates.savedBy; // per-user saves go through PUT /api/resources/:id/save
      if ('sharedWith' in updates) updates.sharedWith = normalizeSharedWith(updates.sharedWith) || [];

      if (!id) {
        res.status(400).json({ success: false, error: 'Resource ID is required' });
        return;
      }

      const db = getDatabase();
      let query: any = { id };
      if (ObjectId.isValid(id)) {
        query = { $or: [{ _id: new ObjectId(id) }, { id }] };
      }

      const refusal = await resourceChangeRefusal(req, query);
      if (refusal) {
        res.status(refusal.status).json({ success: false, error: refusal.error });
        return;
      }
      // The recorded creator never changes
      delete updates.createdByEmail;
      delete updates.createdByRole;
      // "All my clients" can be switched on or off by the owner; its therapist ids come from the sign-in
      delete updates.sharedWithAllClientsOf;
      if ('shareWithAllClients' in updates) {
        const viewer = await resolveClientViewer(req);
        updates.sharedWithAllClientsOf = updates.shareWithAllClients === true && viewer.kind === 'therapist' ? [...viewer.ids] : [];
        delete updates.shareWithAllClients;
      }

      // Never upsert: a deleted resource must not come back as a stub
      const result = await db.collection('Resource').updateOne(query, { $set: updates });
      await db.collection('resources').updateOne(query, { $set: updates }).catch(() => {});

      cacheService.invalidateTags(['resources']);

      if (!result.matchedCount) {
        res.status(404).json({ success: false, error: 'Resource not found' });
        return;
      }

      res.json({
        success: true,
        message: 'Resource updated successfully'
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error?.message || 'Failed to update resource' });
    }
  }

  /**
   * PUT /api/resources/:id/save { email, saved } — saves/unsaves the resource for one user
   */
  static async setSaved(req: Request, res: Response): Promise<void> {
    try {
      const id = String(req.params.id || '');
      const email = String(req.body?.email || req.body?.clientEmail || '').toLowerCase().trim();
      const saved = req.body?.saved !== false;
      if (!id || !email) {
        res.status(400).json({ success: false, error: 'Resource ID and email are required' });
        return;
      }
      // People save resources for themselves only (an admin may act for anyone)
      const viewer = await resolveClientViewer(req);
      if (viewer.kind === 'anonymous') {
        res.status(401).json({ success: false, error: 'Please sign in again.' });
        return;
      }
      if (viewer.kind !== 'admin' && viewer.kind !== 'internal' && !viewer.ids.has(email)) {
        res.status(403).json({ success: false, error: 'You can only save resources for yourself.' });
        return;
      }

      const db = getDatabase();
      const query = idQuery(id);
      const change: any = saved
        ? { $addToSet: { savedBy: email }, $set: { updatedAt: new Date() } }
        : { $pull: { savedBy: email }, $set: { updatedAt: new Date() } };
      const result = await db.collection('Resource').updateOne(query, change);
      await db.collection('resources').updateOne(query, change).catch(() => {});
      cacheService.invalidateTags(['resources']);

      if (!result.matchedCount) {
        res.status(404).json({ success: false, error: 'Resource not found' });
        return;
      }
      res.json({ success: true, id, saved });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error?.message || 'Failed to save resource' });
    }
  }

  /**
   * DELETE /api/resources and DELETE /api/resources/:id
   */
  static async delete(req: Request, res: Response): Promise<void> {
    try {
      const id = String(req.params.id || req.query.id || req.body?.id || '');

      if (!id) {
        res.status(400).json({ success: false, error: 'Resource ID is required' });
        return;
      }

      const db = getDatabase();
      const query = idQuery(id);

      const refusal = await resourceChangeRefusal(req, query);
      if (refusal) {
        res.status(refusal.status).json({ success: false, error: refusal.error });
        return;
      }

      await db.collection('Resource').deleteMany(query);
      await db.collection('resources').deleteMany(query);

      cacheService.invalidateTags(['resources']);

      res.json({
        success: true,
        message: 'Resource deleted successfully'
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error?.message || 'Failed to delete resource' });
    }
  }
}
