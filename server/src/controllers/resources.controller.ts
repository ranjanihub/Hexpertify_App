import { Request, Response } from 'express';
import { ObjectId } from 'mongodb';
import { getDatabase } from '../db/mongodb';
import { cacheService } from '../services/cache.service';
import { idQuery } from '../services/live-content';

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

/** A resource is visible to a client when it is public (no sharedWith) or shared with them */
function isVisibleTo(r: any, email: string, ids: string[]): boolean {
  if (!Array.isArray(r.sharedWith) || r.sharedWith.length === 0) return true;
  return r.sharedWith.some((s: any) =>
    (email && String(s?.clientEmail || '').toLowerCase() === email) || (s?.clientId && ids.includes(String(s.clientId))));
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

      // Per-viewer view: ?clientEmail=/clientId= limits to public + shared-with-me; ?email= sets isSaved from savedBy
      const viewerEmail = String(req.query.email || req.query.clientEmail || '').toLowerCase().trim();
      const clientEmail = String(req.query.clientEmail || '').toLowerCase().trim();
      const clientId = String(req.query.clientId || '').trim();
      if (viewerEmail || clientEmail || clientId) {
        const list = (responseData.resources as any[])
          .filter((r) => (!clientEmail && !clientId) || isVisibleTo(r, clientEmail, clientId ? [clientId] : []))
          .map((r) => (viewerEmail
            ? { ...r, isSaved: Array.isArray(r.savedBy) && r.savedBy.map((e: any) => String(e).toLowerCase()).includes(viewerEmail) }
            : r));
        res.json({ ...responseData, count: list.length, resources: list });
        return;
      }

      res.json(responseData);
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

      if (!responseData) {
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

      const sharedWith = normalizeSharedWith(body.sharedWith);
      const newResource = {
        ...body,
        ...(sharedWith ? { sharedWith, isSharedByTherapist: sharedWith.length > 0 || Boolean(body.isSharedByTherapist) } : {}),
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
