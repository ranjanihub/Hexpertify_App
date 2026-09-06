import { Request, Response } from 'express';
import { ObjectId } from 'mongodb';
import { getDatabase } from '../db/mongodb';

export class ProfessionsController {
  /**
   * GET /api/professions and GET /api/admin/professions
   */
  static async getAll(req: Request, res: Response): Promise<void> {
    try {
      const db = getDatabase();
      const professions = await db.collection('Profession').find({}).toArray();

      res.json({
        success: true,
        count: professions.length,
        professions: professions.map((p) => ({
          ...p,
          id: p.id || String(p._id)
        }))
      });
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
      const db = getDatabase();

      let query: any = { id };
      if (ObjectId.isValid(id)) {
        query = { $or: [{ _id: new ObjectId(id) }, { id }] };
      }

      const prof = await db.collection('Profession').findOne(query);
      if (!prof) {
        res.status(404).json({ success: false, error: 'Profession not found' });
        return;
      }

      res.json({
        success: true,
        profession: { ...prof, id: prof.id || String(prof._id) }
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error?.message || 'Failed to fetch profession' });
    }
  }

  /**
   * POST /api/professions
   */
  static async create(req: Request, res: Response): Promise<void> {
    try {
      const db = getDatabase();
      const body = req.body || {};

      const newProf = {
        ...body,
        id: body.id || `PROF-${Date.now()}`,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const result = await db.collection('Profession').insertOne(newProf);

      res.status(201).json({
        success: true,
        profession: { ...newProf, _id: result.insertedId },
        message: 'Profession created successfully'
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error?.message || 'Failed to create profession' });
    }
  }

  /**
   * PUT /api/professions and PUT /api/professions/:id
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

      await db.collection('Profession').updateOne(query, { $set: updates }, { upsert: true });

      res.json({
        success: true,
        message: 'Profession saved successfully'
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error?.message || 'Failed to update profession' });
    }
  }

  /**
   * DELETE /api/professions and DELETE /api/professions/:id
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

      await db.collection('Profession').deleteOne(query);

      res.json({
        success: true,
        message: 'Profession deleted successfully'
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error?.message || 'Failed to delete profession' });
    }
  }
}
