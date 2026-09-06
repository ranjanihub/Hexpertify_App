import { Request, Response } from 'express';
import { ObjectId } from 'mongodb';
import { getDatabase } from '../db/mongodb';

export class PagesController {
  /**
   * GET /api/admin/zombie-pages and GET /api/zombie-pages
   */
  static async getZombiePages(req: Request, res: Response): Promise<void> {
    try {
      const db = getDatabase();
      const pages = await db.collection('Page').find({}).toArray();

      res.json({
        success: true,
        count: pages.length,
        pages: pages.map((p) => ({
          ...p,
          id: p.id || String(p._id)
        }))
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error?.message || 'Failed to fetch pages' });
    }
  }

  /**
   * POST /api/admin/zombie-pages
   */
  static async saveZombiePage(req: Request, res: Response): Promise<void> {
    try {
      const db = getDatabase();
      const body = req.body || {};
      const id = String(body.id || `PAGE-${Date.now()}`);

      let query: any = { id };
      if (ObjectId.isValid(id)) {
        query = { $or: [{ _id: new ObjectId(id) }, { id }] };
      }

      const updatedPage = {
        ...body,
        id,
        updatedAt: new Date()
      };
      delete updatedPage._id;

      await db.collection('Page').updateOne(query, { $set: updatedPage }, { upsert: true });

      res.json({
        success: true,
        page: updatedPage,
        message: 'Page saved successfully in MongoDB'
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error?.message || 'Failed to save page' });
    }
  }

  /**
   * DELETE /api/admin/zombie-pages
   */
  static async deleteZombiePage(req: Request, res: Response): Promise<void> {
    try {
      const id = String(req.query.id || req.body?.id || '');
      if (!id) {
        res.status(400).json({ success: false, error: 'Page ID is required' });
        return;
      }

      const db = getDatabase();
      let query: any = { id };
      if (ObjectId.isValid(id)) {
        query = { $or: [{ _id: new ObjectId(id) }, { id }] };
      }

      await db.collection('Page').deleteOne(query);

      res.json({
        success: true,
        message: 'Page deleted successfully'
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error?.message || 'Failed to delete page' });
    }
  }

  /**
   * GET /api/admin/homepage and GET /api/homepage
   */
  static async getHomepage(req: Request, res: Response): Promise<void> {
    try {
      const db = getDatabase();
      const configDoc = await db.collection('userinterfaces').findOne({ type: 'homepage' }) ||
                        await db.collection('userinterfaces').findOne({}) ||
                        await db.collection('Page').findOne({ slug: 'home' });

      res.json({
        success: true,
        homepage: configDoc || {}
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error?.message || 'Failed to fetch homepage' });
    }
  }

  /**
   * POST /api/admin/homepage
   */
  static async updateHomepage(req: Request, res: Response): Promise<void> {
    try {
      const db = getDatabase();
      const body = req.body || {};
      const updates = { ...body, type: 'homepage', updatedAt: new Date() };
      delete updates._id;

      await db.collection('userinterfaces').updateOne(
        { type: 'homepage' },
        { $set: updates },
        { upsert: true }
      );

      res.json({
        success: true,
        message: 'Homepage settings updated successfully'
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error?.message || 'Failed to update homepage' });
    }
  }
}
