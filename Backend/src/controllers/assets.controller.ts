import { Request, Response } from 'express';
import { getDatabase } from '../db/mongodb';
import { idQuery, newId } from '../services/live-content';

/** Live_Panel/prisma/schema.prisma enum AssetCategory */
const ASSET_CATEGORIES = ['PROFESSIONAL', 'BLOG', 'CONSULTANT', 'BANNER', 'CERTIFICATE', 'ICON', 'OTHER'] as const;
type AssetCategory = typeof ASSET_CATEGORIES[number];

/** Maps the admin panel's labels (Banner, Client, PDF File, Video...) onto the website's enum */
function toAssetCategory(value: unknown): AssetCategory {
  const v = String(value || '').trim().toUpperCase();
  if ((ASSET_CATEGORIES as readonly string[]).includes(v)) return v as AssetCategory;
  if (v === 'CLIENT' || v === 'PROFILE') return 'PROFESSIONAL';
  if (v === 'THERAPIST') return 'CONSULTANT';
  if (v === 'ARTICLE') return 'BLOG';
  return 'OTHER';
}

/** Cloudinary public id from a delivery URL (…/upload/[transformations/]v123/folder/name.ext → folder/name) */
function cloudinaryPublicId(url: string): string {
  const m = url.match(/res\.cloudinary\.com\/[^/]+\/[^/]+\/upload\/(?:[^/]+\/)*?v\d+\/(.+?)(?:\.[a-z0-9]+)?$/i);
  return m ? decodeURIComponent(m[1]) : '';
}

/** By _id (string or ObjectId), id, or the id the admin panel generated before saving */
const assetQuery = (id: string) => ({ $or: [...idQuery(id).$or, { clientRef: id }] });

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

      const asset = await db.collection('Asset').findOne(assetQuery(id));
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

      const url = String(body.url || '').trim();
      if (!url) {
        res.status(400).json({ success: false, error: 'Asset url is required' });
        return;
      }

      // The website reads Asset through Prisma: string _id, enum category, required url and publicId
      const id = newId();
      const label = String(body.category || body.type || '').trim();
      const newAsset = {
        _id: id,
        id,
        name: String(body.name || '').trim() || 'Untitled',
        category: toAssetCategory(label),
        url,
        publicId: String(body.publicId || '').trim() || cloudinaryPublicId(url),
        // Admin panel display fields (ignored by the website)
        type: label || 'Other',
        ...(body.size ? { size: String(body.size) } : {}),
        ...(body.uploadedDate ? { uploadedDate: String(body.uploadedDate) } : {}),
        ...(body.id ? { clientRef: String(body.id) } : {}),
        createdAt: new Date(),
        updatedAt: new Date()
      };

      await db.collection('Asset').insertOne(newAsset as any);

      res.status(201).json({
        success: true,
        asset: newAsset,
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
      const body = req.body || {};
      const updates: any = { updatedAt: new Date() };
      if (body.name !== undefined) updates.name = String(body.name).trim() || 'Untitled';
      if (body.category !== undefined || body.type !== undefined) {
        const label = String(body.category ?? body.type ?? '').trim();
        updates.category = toAssetCategory(label);
        updates.type = label || 'Other';
      }
      if (body.url) {
        updates.url = String(body.url).trim();
        updates.publicId = String(body.publicId || '').trim() || cloudinaryPublicId(updates.url);
      } else if (body.publicId !== undefined) {
        updates.publicId = String(body.publicId || '').trim();
      }

      if (!id) {
        res.status(400).json({ success: false, error: 'Asset ID is required' });
        return;
      }

      const db = getDatabase();
      const result = await db.collection('Asset').updateOne(assetQuery(id), { $set: updates });
      if (!result.matchedCount) {
        res.status(404).json({ success: false, error: 'Asset not found' });
        return;
      }

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
      await db.collection('Asset').deleteOne(assetQuery(id));

      res.json({
        success: true,
        message: 'Asset deleted successfully'
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error?.message || 'Failed to delete asset' });
    }
  }
}
