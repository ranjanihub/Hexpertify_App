import { Request, Response } from 'express';
import { ObjectId } from 'mongodb';
import { getDatabase } from '../db/mongodb';

export class ResourcesController {
  /**
   * GET /api/resources and GET /api/admin/resources
   */
  static async getAll(req: Request, res: Response): Promise<void> {
    try {
      const db = getDatabase();
      const resources = await db.collection('Resource').find({}).toArray();

      res.json({
        success: true,
        count: resources.length,
        resources: resources.map((r) => ({
          ...r,
          id: r.id || String(r._id)
        }))
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error?.message || 'Failed to fetch resources' });
    }
  }

  /**
   * GET /api/resources/:id
   */
  static async getById(req: Request, res: Response): Promise<void> {
    try {
      const id = String(req.params.id || req.query.id || '');
      const db = getDatabase();

      let query: any = { id };
      if (ObjectId.isValid(id)) {
        query = { $or: [{ _id: new ObjectId(id) }, { id }] };
      }

      const resource = await db.collection('Resource').findOne(query);
      if (!resource) {
        res.status(404).json({ success: false, error: 'Resource not found' });
        return;
      }

      res.json({
        success: true,
        resource: { ...resource, id: resource.id || String(resource._id) }
      });
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

      const newResource = {
        ...body,
        id: body.id || `RES-${Date.now()}`,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const result = await db.collection('Resource').insertOne(newResource);

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

      if (!id) {
        res.status(400).json({ success: false, error: 'Resource ID is required' });
        return;
      }

      const db = getDatabase();
      let query: any = { id };
      if (ObjectId.isValid(id)) {
        query = { $or: [{ _id: new ObjectId(id) }, { id }] };
      }

      await db.collection('Resource').updateOne(query, { $set: updates }, { upsert: true });

      res.json({
        success: true,
        message: 'Resource updated successfully'
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error?.message || 'Failed to update resource' });
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
      let query: any = { id };
      if (ObjectId.isValid(id)) {
        query = { $or: [{ _id: new ObjectId(id) }, { id }] };
      }

      await db.collection('Resource').deleteOne(query);

      res.json({
        success: true,
        message: 'Resource deleted successfully'
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error?.message || 'Failed to delete resource' });
    }
  }
}
