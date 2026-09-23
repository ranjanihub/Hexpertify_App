import { Request, Response } from 'express';
import { ObjectId } from 'mongodb';
import { getDatabase } from '../db/mongodb';
import { cacheService } from '../services/cache.service';

export class ProfessionsController {
  /**
   * GET /api/professions and GET /api/admin/professions
   */
  static async getAll(req: Request, res: Response): Promise<void> {
    try {
      const responseData = await cacheService.wrap('professions:all', ['professions'], 60, async () => {
        const db = getDatabase();
        let professions = await db.collection('Profession').find({}).toArray();
        if (!professions || professions.length === 0) {
          professions = await db.collection('professions').find({}).toArray();
        }

        return {
          success: true,
          count: professions.length,
          professions: professions.map((p) => {
            const name = p.name || p.serviceName || 'Untitled Profession';
            const serviceName = p.serviceName || p.name || 'Untitled Profession';
            return {
              ...p,
              id: p.id || String(p._id),
              name,
              serviceName,
              identifier: p.identifier || p.slug || name.toLowerCase().replace(/[^a-z0-9]+/g, '-')
            };
          })
        };
      });

      res.json(responseData);
    } catch (error: any) {
      res.status(500).json({ success: false, error: error?.message || 'Failed to fetch professions' });
    }
  }

  /**
   * GET /api/professions/:id
   */
  static async getById(req: Request, res: Response): Promise<void> {
    try {
      const id = String(req.params.id || req.query.id || '');
      const cacheKey = `profession:${id}`;

      const responseData = await cacheService.wrap(cacheKey, ['professions'], 60, async () => {
        const db = getDatabase();

        let query: any = { id };
        if (ObjectId.isValid(id)) {
          query = { $or: [{ _id: new ObjectId(id) }, { id }] };
        }

        let prof = await db.collection('Profession').findOne(query);
        if (!prof) {
          prof = await db.collection('professions').findOne(query);
        }

        if (!prof) {
          return null;
        }

        const name = prof.name || prof.serviceName || 'Untitled Profession';
        const serviceName = prof.serviceName || prof.name || 'Untitled Profession';

        return {
          success: true,
          profession: {
            ...prof,
            id: prof.id || String(prof._id),
            name,
            serviceName,
            identifier: prof.identifier || prof.slug || name.toLowerCase().replace(/[^a-z0-9]+/g, '-')
          }
        };
      });

      if (!responseData) {
        res.status(404).json({ success: false, error: 'Profession not found' });
        return;
      }

      res.json(responseData);
    } catch (error: any) {
      res.status(500).json({ success: false, error: error?.message || 'Failed to fetch profession' });
    }
  }

  /**
   * POST /api/professions and POST /api/admin/professions
   */
  static async create(req: Request, res: Response): Promise<void> {
    try {
      const db = getDatabase();
      const body = req.body || {};
      const { name, serviceName } = body;

      const title = name || serviceName;
      if (!title) {
        res.status(400).json({ success: false, error: 'Profession name is required' });
        return;
      }

      const generatedId = body.id || `PROF-${Date.now().toString().slice(-4)}`;
      const cleanSlug = body.identifier || body.slug || title.toLowerCase().replace(/[^a-z0-9]+/g, '-');

      const newProfession = {
        ...body,
        id: generatedId,
        _id: generatedId,
        name: title,
        serviceName: serviceName || title,
        identifier: cleanSlug,
        isActive: body.isActive !== undefined ? body.isActive : true,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      await Promise.all([
        db.collection('Profession').insertOne(newProfession).catch(() => {}),
        db.collection('professions').insertOne(newProfession).catch(() => {})
      ]);

      cacheService.invalidateTags(['professions', 'consultants']);

      res.status(201).json({
        success: true,
        profession: newProfession,
        message: 'Profession created successfully in MongoDB'
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error?.message || 'Failed to create profession' });
    }
  }

  /**
   * PUT /api/professions/:id and PUT /api/admin/professions/:id
   */
  static async update(req: Request, res: Response): Promise<void> {
    try {
      const id = String(req.params.id || req.body?.id || req.body?._id || '');
      const updates = { ...req.body, updatedAt: new Date() };
      delete updates.id;
      delete updates._id;

      if (!id) {
        res.status(400).json({ success: false, error: 'Profession ID is required' });
        return;
      }

      const db = getDatabase();
      let query: any = { id };
      if (ObjectId.isValid(id)) {
        query = { $or: [{ _id: new ObjectId(id) }, { id }] };
      }

      await Promise.all([
        db.collection('Profession').updateMany(query, { $set: updates }),
        db.collection('professions').updateMany(query, { $set: updates })
      ]);

      cacheService.invalidateTags(['professions', 'consultants']);

      res.json({
        success: true,
        message: 'Profession updated successfully in MongoDB'
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error?.message || 'Failed to update profession' });
    }
  }

  /**
   * DELETE /api/professions/:id and DELETE /api/admin/professions/:id
   */
  static async delete(req: Request, res: Response): Promise<void> {
    try {
      const id = String(req.params.id || req.query.id || req.body?.id || '');

      if (!id) {
        res.status(400).json({ success: false, error: 'Profession ID is required' });
        return;
      }

      const db = getDatabase();
      let query: any = { id };
      if (ObjectId.isValid(id)) {
        query = { $or: [{ _id: new ObjectId(id) }, { id }] };
      }

      await Promise.all([
        db.collection('Profession').deleteMany(query),
        db.collection('professions').deleteMany(query)
      ]);

      cacheService.invalidateTags(['professions', 'consultants']);

      res.json({
        success: true,
        message: 'Profession removed successfully from MongoDB'
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error?.message || 'Failed to delete profession' });
    }
  }
}
