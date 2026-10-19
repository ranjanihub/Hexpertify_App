import { Request, Response } from 'express';
import { getDatabase } from '../db/mongodb';
import { cacheService } from '../services/cache.service';
import { idQuery, newId, readSeoMeta, seoToAdmin, slugify, toFaqs, toFloat, toInt, upsertSeoMeta } from '../services/live-content';

/**
 * Professions are read by the public website through Prisma (`Profession` + `SeoMeta`), so writes
 * store its field names: name, identifier, imageUrl, imageAltText, bannerUrl, bannerTitle, faqs,
 * seoMetaId. The admin panel's names (serviceName, heroBannerUrl, seo{...}) are mapped both ways.
 */

/** Profession document (+ SeoMeta) → the admin panel's ProfessionService shape */
async function toAdmin(p: any) {
  const name = p.name || p.serviceName || 'Untitled Profession';
  const seo = await readSeoMeta(p.seoMetaId);
  return {
    ...p,
    id: String(p._id ?? p.id),
    name,
    serviceName: name,
    identifier: p.identifier || slugify(name),
    slug: p.identifier || slugify(name),
    heroBannerUrl: p.bannerUrl || p.heroBannerUrl || '',
    heroBannerTitle: p.bannerTitle || p.heroBannerTitle || '',
    bannerUrl: p.bannerUrl || '',
    bannerTitle: p.bannerTitle || '',
    status: p.status || 'Active',
    visibility: p.visibility || 'Public',
    faqs: p.faqs || [],
    seo: seoToAdmin(seo) || p.seo
  };
}

/** Admin payload → Prisma-shaped fields; only fields present in the payload are returned */
function fieldsFromAdmin(body: any): Record<string, any> {
  const set: Record<string, any> = {};
  const has = (k: string) => body[k] !== undefined;
  if (has('serviceName') || has('name')) set.name = String(body.serviceName ?? body.name).trim();
  if (has('identifier') || has('slug')) set.identifier = slugify(String(body.identifier || body.slug || ''));
  if (has('imageUrl')) set.imageUrl = String(body.imageUrl || '') || null;
  if (has('imageAltText')) set.imageAltText = String(body.imageAltText || '') || null;
  if (has('heroBannerUrl') || has('bannerUrl')) set.bannerUrl = String(body.heroBannerUrl ?? body.bannerUrl ?? '') || null;
  if (has('heroBannerTitle') || has('bannerTitle')) set.bannerTitle = String(body.heroBannerTitle ?? body.bannerTitle ?? '') || null;
  if (has('faqs')) set.faqs = toFaqs(body.faqs);
  // Admin-only fields; status/visibility also decide whether the public site lists the profession
  if (has('status')) set.status = String(body.status);
  if (has('visibility')) set.visibility = String(body.visibility);
  if (has('description')) set.description = String(body.description || '');
  if (has('consultationFee')) set.consultationFee = toFloat(body.consultationFee, 0);
  if (has('sessionDurationMinutes')) set.sessionDurationMinutes = toInt(body.sessionDurationMinutes, 50);
  Object.keys(set).forEach((k) => (set[k] === '' && (k === 'name' || k === 'identifier')) && delete set[k]);
  return set;
}

async function assertUnique(name: string | undefined, identifier: string | undefined, exceptId?: string): Promise<string | null> {
  const db = getDatabase();
  const or: any[] = [];
  if (name) or.push({ name: new RegExp(`^${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') });
  if (identifier) or.push({ identifier });
  if (!or.length) return null;
  const clash: any = await db.collection('Profession').findOne(exceptId ? { $and: [{ $or: or }, { _id: { $ne: exceptId as any } }] } : { $or: or });
  if (!clash) return null;
  return clash.identifier === identifier ? `Another profession already uses the identifier "${identifier}"` : `A profession named "${name}" already exists`;
}

export class ProfessionsController {
  /**
   * GET /api/professions and GET /api/admin/professions
   */
  static async getAll(_req: Request, res: Response): Promise<void> {
    try {
      const responseData = await cacheService.wrap('professions:all', ['professions'], 60, async () => {
        const db = getDatabase();
        let professions = await db.collection('Profession').find({}).sort({ createdAt: 1 }).toArray();
        if (!professions.length) professions = await db.collection('professions').find({}).toArray();
        const list = await Promise.all(professions.map(toAdmin));
        return { success: true, count: list.length, professions: list };
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
      const prof = await getDatabase().collection('Profession').findOne(idQuery(id)) ||
                   await getDatabase().collection('Profession').findOne({ identifier: id });
      if (!prof) {
        res.status(404).json({ success: false, error: 'Profession not found' });
        return;
      }
      res.json({ success: true, profession: await toAdmin(prof) });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error?.message || 'Failed to fetch profession' });
    }
  }

  /**
   * POST /api/professions and POST /api/admin/professions
   */
  static async create(req: Request, res: Response): Promise<void> {
    try {
      const body = req.body || {};
      const fields = fieldsFromAdmin(body);
      if (!fields.name) {
        res.status(400).json({ success: false, error: 'Profession name is required' });
        return;
      }
      fields.identifier = fields.identifier || slugify(fields.name);

      const clash = await assertUnique(fields.name, fields.identifier);
      if (clash) {
        res.status(409).json({ success: false, error: clash });
        return;
      }

      const id = newId();
      const seoMetaId = await upsertSeoMeta(null, body.seo, fields.name);
      const doc = {
        _id: id,
        name: fields.name,
        identifier: fields.identifier,
        imageUrl: null,
        imageAltText: null,
        bannerUrl: null,
        bannerTitle: null,
        faqs: [],
        status: 'Active',
        visibility: 'Public',
        ...fields,
        seoMetaId,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      await getDatabase().collection('Profession').insertOne(doc as any);

      cacheService.invalidateTags(['professions', 'consultants']);
      res.status(201).json({ success: true, profession: await toAdmin(doc), message: 'Profession created' });
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
      if (!id) {
        res.status(400).json({ success: false, error: 'Profession ID is required' });
        return;
      }

      const db = getDatabase();
      const existing: any = await db.collection('Profession').findOne(idQuery(id));
      if (!existing) {
        res.status(404).json({ success: false, error: 'Profession not found' });
        return;
      }

      const body = req.body || {};
      const set = fieldsFromAdmin(body);
      const clash = await assertUnique(set.name, set.identifier, existing._id);
      if (clash) {
        res.status(409).json({ success: false, error: clash });
        return;
      }
      if (body.seo !== undefined) {
        set.seoMetaId = await upsertSeoMeta(existing.seoMetaId, body.seo, set.name || existing.name);
      }

      await db.collection('Profession').updateOne({ _id: existing._id }, { $set: { ...set, updatedAt: new Date() } });
      if (set.name && set.name !== existing.name) {
        // Consultants keep a display copy of their profession name
        await db.collection('Consultant').updateMany({ professionId: String(existing._id) }, { $set: { profession: set.name } }).catch(() => {});
      }

      cacheService.invalidateTags(['professions', 'consultants']);
      const updated = await db.collection('Profession').findOne({ _id: existing._id });
      res.json({ success: true, profession: await toAdmin(updated), message: 'Profession updated' });
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
      const existing: any = await db.collection('Profession').findOne(idQuery(id));
      if (!existing) {
        res.status(404).json({ success: false, error: 'Profession not found' });
        return;
      }
      const linked = await db.collection('Consultant').countDocuments({ professionId: String(existing._id) });
      if (linked) {
        res.status(409).json({ success: false, error: `${linked} therapist(s) still belong to this profession. Move them to another profession first, or set the profession to Archived to hide it.` });
        return;
      }

      await db.collection('Profession').deleteOne({ _id: existing._id });
      if (existing.seoMetaId) await db.collection('SeoMeta').deleteOne({ _id: existing.seoMetaId }).catch(() => {});

      cacheService.invalidateTags(['professions', 'consultants']);
      res.json({ success: true, message: 'Profession removed' });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error?.message || 'Failed to delete profession' });
    }
  }
}
