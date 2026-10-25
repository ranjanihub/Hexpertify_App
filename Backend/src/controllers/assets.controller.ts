import { Request, Response } from 'express';
import { ObjectId } from 'mongodb';
import { getDatabase } from '../db/mongodb';

export class AssetsController {
  /**
   * GET /api/assets and GET /api/admin/assets
   */
  static async getAll(req: Request, res: Response): Promise<void> {
    try {
      const db = getDatabase();
      const assets = await db.collection('Asset').find({}).toArray();

      res.json({
        success: true,
        count: assets.length,
        assets: assets.map((a) => ({
          ...a,
          id: a.id || String(a._id)
        }))
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error?.message || 'Failed to fetch assets' });
    }
  }

  /**
   * GET /api/assets/:id
   */
  static async getById(req: Request, res: Response): Promise<void> {
    try {
      const id = String(req.params.id || req.query.id || '');
      const db = getDatabase();

      let query: any = { id };
      if (ObjectId.isValid(id)) {
        query = { $or: [{ _id: new ObjectId(id) }, { id }] };
      }

      const asset = await db.collection('Asset').findOne(query);
      if (!asset) {
        res.status(404).json({ success: false, error: 'Asset not found' });
        return;
      }

      res.json({
        success: true,
        asset: { ...asset, id: asset.id || String(asset._id) }
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error?.message || 'Failed to fetch asset' });
    }
  }

  /**
   * POST /api/assets
   */
  static async create(req: Request, res: Response): Promise<void> {
    try {
      const db = getDatabase();
      const body = req.body || {};

      const newAsset = {
        ...body,
        id: body.id || `AST-${Date.now()}`,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const result = await db.collection('Asset').insertOne(newAsset);

      res.status(201).json({
        success: true,
        asset: { ...newAsset, _id: result.insertedId },
        message: 'Asset created successfully in MongoDB'
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error?.message || 'Failed to create asset' });
    }
  }

  /**
   * PUT /api/assets and PUT /api/assets/:id
   */
  static async update(req: Request, res: Response): Promise<void> {
    try {
      const id = String(req.params.id || req.body?.id || req.body?._id || '');
      const updates = { ...req.body, updatedAt: new Date() };
      delete updates.id;
      delete updates._id;

      if (!id) {
        res.status(400).json({ success: false, error: 'Asset ID is required' });
        return;
      }

      const db = getDatabase();
      let query: any = { id };
      if (ObjectId.isValid(id)) {
        query = { $or: [{ _id: new ObjectId(id) }, { id }] };
      }

      await db.collection('Asset').updateOne(query, { $set: updates }, { upsert: true });

      res.json({
        success: true,
        message: 'Asset updated successfully'
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error?.message || 'Failed to update asset' });
    }
  }

  /**
   * DELETE /api/assets and DELETE /api/assets/:id
   */
  static async delete(req: Request, res: Response): Promise<void> {
    try {
      const id = String(req.params.id || req.query.id || req.body?.id || '');

      if (!id) {
        res.status(400).json({ success: false, error: 'Asset ID is required' });
        return;
      }

      const db = getDatabase();
      let query: any = { id };
      if (ObjectId.isValid(id)) {
        query = { $or: [{ _id: new ObjectId(id) }, { id }] };
      }

      await db.collection('Asset').deleteOne(query);

      res.json({
        success: true,
        message: 'Asset deleted successfully'
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error?.message || 'Failed to delete asset' });
    }
  }
}
