import crypto from 'crypto';
import { Request, Response } from 'express';
import { getDatabase } from '../db/mongodb';
import { idQuery, newId } from '../services/live-content';
import { serverError } from '../services/clinical-access';
import { ASSET_FOLDER, deleteFromCloudinary, uploadToCloudinary, type UploadedFile } from '../services/cloudinary';

/** apps/web/prisma/schema.prisma enum AssetCategory */
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

/**
 * Uploaded files arrive as base64 data: URIs. The bytes are kept in the asset's `data` field and the asset gets a
 * real address instead, /api/assets/<id>/file?v=<content hash> (served by getFile, cacheable for good), so pages
 * link to the image rather than repeating it inline. Older assets stored with a data: url are served the same way.
 */
const DATA_URI = /^data:([^;,]+);base64,/;
const isDataUri = (value: unknown): value is string => typeof value === 'string' && DATA_URI.test(value);
const contentVersion = (dataUri: string) => crypto.createHash('sha1').update(dataUri).digest('hex').slice(0, 12);
const fileUrl = (id: string, dataUri: string) => `/api/assets/${encodeURIComponent(id)}/file?v=${contentVersion(dataUri)}`;
const isOwnFileUrl = (value: string) => /^\/api\/assets\/[^/]+\/file(\?|$)/.test(value);

/** Content types served inline from /api/assets/:id/file; anything else is a download */
const SERVABLE_TYPES = new Set([
  'image/png', 'image/jpeg', 'image/gif', 'image/webp', 'image/avif', 'image/bmp', 'image/x-icon', 'image/vnd.microsoft.icon', 'image/svg+xml',
  'video/mp4', 'video/webm', 'video/ogg', 'video/quicktime',
  'application/pdf',
  'font/woff', 'font/woff2', 'font/ttf', 'font/otf', 'application/font-woff', 'application/font-woff2'
]);

/** The Content-Type to serve for a stored file: a whitelisted media type, else application/octet-stream */
function servedContentType(claimed: string, bytes: Buffer): string {
  let type = String(claimed || '').trim().toLowerCase().split(';')[0];
  if (type === 'image/jpg') type = 'image/jpeg';
  if (!SERVABLE_TYPES.has(type)) return 'application/octet-stream';
  if (type === 'image/svg+xml') {
    // SVG is markup: one carrying script, event handlers or foreign HTML is never served as an image
    const text = bytes.toString('utf8');
    if (/<script|\bon[a-z]+\s*=|javascript:|<foreignObject|<iframe|<embed|<object/i.test(text)) return 'application/octet-stream';
  }
  return type;
}

function readableBytes(bytes: number): string {
  return bytes >= 1024 * 1024 ? `${(bytes / (1024 * 1024)).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

function readableSize(dataUri: string): string {
  return readableBytes(Math.round(((dataUri.length - (DATA_URI.exec(dataUri)?.[0].length || 0)) * 3) / 4));
}

/** An asset as the API returns it: never the inline bytes, always a usable url */
function publicAsset(a: any): any {
  const { data, ...rest } = a;
  const id = a.id || String(a._id);
  const inline = isDataUri(data) ? data : isDataUri(a.url) ? a.url : null;
  return {
    ...rest,
    id,
    url: inline ? fileUrl(id, inline) : rest.url,
    // The real size of a stored file (older uploads saved sizes like "0.0 MB")
    ...(inline ? { size: readableSize(inline) } : {})
  };
}

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
        assets: assets.map(publicAsset)
      });
    } catch (error: any) {
      serverError(res, 'assets', error, 'Failed to fetch assets');
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
        asset: publicAsset(asset)
      });
    } catch (error: any) {
      serverError(res, 'assets', error, 'Failed to fetch asset');
    }
  }

  /**
   * GET /api/assets/:id/file
   * The asset's file (for uploads kept inline). The url carries a content hash, so it can be cached for good.
   */
  static async getFile(req: Request, res: Response): Promise<void> {
    try {
      const id = String(req.params.id || '');
      const asset: any = await getDatabase().collection('Asset').findOne(assetQuery(id), { projection: { data: 1, url: 1 } });
      const inline = asset && (isDataUri(asset.data) ? asset.data : isDataUri(asset.url) ? asset.url : null);
      if (!inline) {
        if (asset?.url && /^https?:\/\//i.test(asset.url)) {
          res.redirect(302, asset.url);
          return;
        }
        res.status(404).json({ success: false, error: 'Asset file not found' });
        return;
      }
      const header = DATA_URI.exec(inline)!;
      const bytes = Buffer.from(inline.slice(header[0].length), 'base64');
      // The stored type is whatever the uploader claimed: only media types are served as such
      const type = servedContentType(header[1], bytes);
      res.setHeader('Content-Type', type);
      res.setHeader('X-Content-Type-Options', 'nosniff');
      if (type === 'application/octet-stream') {
        res.setHeader('Content-Disposition', 'attachment');
      }
      if (type === 'image/svg+xml') {
        // An SVG opened directly is a document: no scripts, no outside requests
        res.setHeader('Content-Security-Policy', "default-src 'none'; img-src data:; style-src 'unsafe-inline'; sandbox");
      }
      res.setHeader('Content-Length', String(bytes.length));
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      res.end(bytes);
    } catch (error: any) {
      serverError(res, 'assets', error, 'Failed to load asset file');
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

      // An uploaded file (data: URI) is stored on Cloudinary; the asset keeps its Cloudinary URL
      let uploaded: UploadedFile | null = null;
      if (isDataUri(url)) {
        try {
          uploaded = await uploadToCloudinary(url);
        } catch (err: any) {
          res.status(502).json({ success: false, error: err?.message || 'The file could not be uploaded to Cloudinary' });
          return;
        }
      }

      // The website reads Asset through Prisma: string _id, enum category, required url and publicId
      const id = newId();
      const label = String(body.category || body.type || '').trim();
      const newAsset = {
        _id: id,
        id,
        name: String(body.name || '').trim() || 'Untitled',
        category: toAssetCategory(label),
        url: uploaded ? uploaded.url : url,
        publicId: uploaded ? uploaded.publicId : String(body.publicId || '').trim() || cloudinaryPublicId(url),
        ...(uploaded ? { resourceType: uploaded.resourceType } : {}),
        // Admin panel display fields (ignored by the website)
        type: label || 'Other',
        ...(uploaded ? { size: readableBytes(uploaded.bytes) } : body.size ? { size: String(body.size) } : {}),
        ...(body.uploadedDate ? { uploadedDate: String(body.uploadedDate) } : {}),
        ...(body.id ? { clientRef: String(body.id) } : {}),
        createdAt: new Date(),
        updatedAt: new Date()
      };

      await db.collection('Asset').insertOne(newAsset as any);

      res.status(201).json({
        success: true,
        asset: publicAsset(newAsset),
        message: 'Asset created successfully in MongoDB'
      });
    } catch (error: any) {
      serverError(res, 'assets', error, 'Failed to create asset');
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
      if (!id) {
        res.status(400).json({ success: false, error: 'Asset ID is required' });
        return;
      }
      const db = getDatabase();
      const existing: any = await db.collection('Asset').findOne(assetQuery(id), { projection: { publicId: 1, resourceType: 1 } });
      if (!existing) {
        res.status(404).json({ success: false, error: 'Asset not found' });
        return;
      }

      const newUrl = String(body.url || '').trim();
      let replacedPublicId = '';
      if (newUrl && isDataUri(newUrl)) {
        // A replacement file: upload it to Cloudinary, then remove the old upload
        let uploaded: UploadedFile;
        try {
          uploaded = await uploadToCloudinary(newUrl);
        } catch (err: any) {
          res.status(502).json({ success: false, error: err?.message || 'The file could not be uploaded to Cloudinary' });
          return;
        }
        updates.url = uploaded.url;
        updates.publicId = uploaded.publicId;
        updates.resourceType = uploaded.resourceType;
        updates.size = readableBytes(uploaded.bytes);
        updates.data = null;
        replacedPublicId = existing.publicId || '';
      } else if (newUrl && !isOwnFileUrl(newUrl)) {
        updates.url = newUrl;
        updates.data = null;
        updates.publicId = String(body.publicId || '').trim() || cloudinaryPublicId(newUrl);
      } else if (body.publicId !== undefined) {
        updates.publicId = String(body.publicId || '').trim();
      }

      await db.collection('Asset').updateOne(assetQuery(id), { $set: updates });
      if (replacedPublicId.startsWith(`${ASSET_FOLDER}/`)) {
        await deleteFromCloudinary(replacedPublicId, existing.resourceType);
      }

      res.json({
        success: true,
        message: 'Asset updated successfully'
      });
    } catch (error: any) {
      serverError(res, 'assets', error, 'Failed to update asset');
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
      const asset: any = await db.collection('Asset').findOne(assetQuery(id), { projection: { publicId: 1, resourceType: 1 } });
      await db.collection('Asset').deleteOne(assetQuery(id));
      // Files uploaded from the admin panel are removed from Cloudinary too (other images are left alone)
      if (asset?.publicId && String(asset.publicId).startsWith(`${ASSET_FOLDER}/`)) {
        await deleteFromCloudinary(asset.publicId, asset.resourceType);
      }

      res.json({
        success: true,
        message: 'Asset deleted successfully'
      });
    } catch (error: any) {
      serverError(res, 'assets', error, 'Failed to delete asset');
    }
  }
}
