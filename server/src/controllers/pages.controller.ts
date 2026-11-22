import { Request, Response } from 'express';
import { ObjectId } from 'mongodb';
import { getDatabase } from '../db/mongodb';
import { newId, readSeoMeta, seoToAdmin, toFaqs, upsertSeoMeta } from '../services/live-content';

/** The public website reads its homepage from Page { identifier: 'home' } */
const HOME_IDENTIFIER = 'home';

function sanitizeZombiePage(raw: any, index: number): any {
  const id = String(raw.id || raw._id || `ZMB-${101 + index}`);
  const pageTitle = String(raw.pageTitle || raw.notificationTitle || raw.title || raw.name || 'Untitled Zombie Page');
  const slug = String(raw.slug || (raw.identifier ? `/${raw.identifier}` : `/${id.toLowerCase()}`));
  const targetUrl = String(raw.targetUrl || `https://hexpertify.com${slug.startsWith('/') ? slug : '/' + slug}`);
  const htmlChunk = String(raw.htmlChunk || raw.content || '');
  const status = raw.status === 'Active' || raw.status === 'Draft' || raw.status === 'Archived' ? raw.status : 'Active';
  const createdAt = raw.createdAt ? String(raw.createdAt).slice(0, 10) : new Date().toISOString().slice(0, 10);
  const updatedAt = raw.updatedAt ? String(raw.updatedAt).slice(0, 10) : new Date().toISOString().slice(0, 10);
  const viewsCount = typeof raw.viewsCount === 'number' ? raw.viewsCount : 0;

  const rawSeo = raw.seo || {};
  const seo = {
    metaTitle: String(rawSeo.metaTitle || `${pageTitle} | Hexpertify Therapy`),
    metaDescription: String(rawSeo.metaDescription || `Book sessions for ${pageTitle} on Hexpertify. Certified clinical psychologists & therapists.`),
    keywords: String(rawSeo.keywords || 'mental health, therapy, psychologist, counseling'),
    canonicalUrl: String(rawSeo.canonicalUrl || targetUrl),
    ogTitle: String(rawSeo.ogTitle || rawSeo.metaTitle || pageTitle),
    ogDescription: String(rawSeo.ogDescription || rawSeo.metaDescription || ''),
    ogImageUrl: String(rawSeo.ogImageUrl || ''),
    ogImageAltText: String(rawSeo.ogImageAltText || ''),
    structuredData: String(rawSeo.structuredData || '')
  };

  return {
    id,
    pageTitle,
    slug,
    targetUrl,
    htmlChunk,
    status,
    createdAt,
    updatedAt,
    viewsCount,
    seo
  };
}

export class PagesController {
  /**
   * GET /api/admin/zombie-pages and GET /api/zombie-pages
   */
  static async getZombiePages(req: Request, res: Response): Promise<void> {
    try {
      const db = getDatabase();
      // Only the pages created in the Super Admin panel (demo pages are never seeded)
      const pages = await db.collection('zombie_pages').find({}).toArray();

      const sanitized = pages.map((p, i) => sanitizeZombiePage(p, i));

      res.json({
        success: true,
        count: sanitized.length,
        pages: sanitized,
        zombiePages: sanitized
      });
    } catch (error: any) {
      console.error('[PagesController] Error fetching zombie pages:', error);
      res.status(500).json({ success: false, error: error?.message || 'Failed to fetch zombie pages' });
    }
  }

  /**
   * POST /api/admin/zombie-pages
   */
  static async saveZombiePage(req: Request, res: Response): Promise<void> {
    try {
      const db = getDatabase();
      const body = req.body || {};
      const id = String(body.id || `ZMB-${Date.now()}`);

      let query: any = { id };
      if (ObjectId.isValid(id)) {
        query = { $or: [{ _id: new ObjectId(id) }, { id }] };
      }

      const today = new Date().toISOString().split('T')[0];
      // Partial saves (e.g. the status toggle sends only id + status) keep the stored content
      const stored = await db.collection('zombie_pages').findOne(query);
      const merged = stored ? { ...stored, ...body, seo: { ...(stored.seo || {}), ...(body.seo || {}) } } : body;
      const sanitized = sanitizeZombiePage(merged, 0);
      const updatedPage = {
        ...sanitized,
        id,
        updatedAt: today
      };

      await db.collection('zombie_pages').updateOne(query, { $set: updatedPage }, { upsert: true });

      res.json({
        success: true,
        page: updatedPage,
        message: 'Zombie page saved successfully in MongoDB Atlas (zombie_pages)'
      });
    } catch (error: any) {
      console.error('[PagesController] Error saving zombie page:', error);
      res.status(500).json({ success: false, error: error?.message || 'Failed to save zombie page' });
    }
  }

  /**
   * DELETE /api/admin/zombie-pages
   */
  static async deleteZombiePage(req: Request, res: Response): Promise<void> {
    try {
      const id = String(req.query.id || req.body?.id || '');
      if (!id) {
        res.status(400).json({ success: false, error: 'Zombie page ID is required' });
        return;
      }

      const db = getDatabase();
      let query: any = { id };
      if (ObjectId.isValid(id)) {
        query = { $or: [{ _id: new ObjectId(id) }, { id }] };
      }

      await db.collection('zombie_pages').deleteOne(query);

      res.json({
        success: true,
        message: `Zombie page ${id} deleted successfully from MongoDB Atlas (zombie_pages)`
      });
    } catch (error: any) {
      console.error('[PagesController] Error deleting zombie page:', error);
      res.status(500).json({ success: false, error: error?.message || 'Failed to delete zombie page' });
    }
  }

  /**
   * GET /api/admin/homepage and GET /api/homepage
   * Reads the public website's `Page { identifier: 'home' }` (+ SeoMeta) in the admin CMS shape.
   */
  static async getHomepage(_req: Request, res: Response): Promise<void> {
    try {
      const db = getDatabase();
      const page: any = await db.collection('Page').findOne({ identifier: HOME_IDENTIFIER });
      const seo = page ? await readSeoMeta(page.seoMetaId) : null;
      const adminSeo = seoToAdmin(seo) || {};
      const urls: string[] = page?.carouselImageUrls || [];

      const homepage = {
        general: { pageIdentifier: HOME_IDENTIFIER, notificationTitle: page?.notificationTitle || '' },
        carouselImages: urls.map((url, i) => ({
          id: `carousel-${i + 1}`,
          imageUrl: url,
          altText: (page.carouselImageAltTexts || [])[i] || '',
          deviceType: (page.carouselImageIsMobileFlags || [])[i] ? 'Mobile' : 'Desktop'
        })),
        seo: {
          metaTitle: adminSeo.metaTitle || '',
          metaDescription: adminSeo.metaDescription || '',
          keywords: adminSeo.keywords || '',
          openGraphTitle: adminSeo.openGraphTitle || '',
          openGraphDescription: adminSeo.openGraphDescription || '',
          openGraphImageUrl: adminSeo.openGraphImageUrl || '',
          openGraphImageAltText: adminSeo.openGraphImageAltText || ''
        },
        faqs: (page?.faqs || []).map((f: any, i: number) => ({ id: `faq-${i + 1}`, question: f.question, answer: f.answer })),
        testimonials: (page?.testimonials || []).map((t: any, i: number) => ({
          id: `testimonial-${i + 1}`,
          authorName: t.authorName || '',
          profession: t.authorProfessional || '',
          authorEmail: t.authorEmail || '',
          authorImageUrl: t.authorImageUrl || '',
          authorImageAltText: t.authorImageAltText || '',
          content: t.quote || ''
        }))
      };

      res.json({ success: true, homepage, cms: homepage });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error?.message || 'Failed to fetch homepage' });
    }
  }

  /**
   * POST/PUT /api/admin/homepage (admins)
   * Writes the admin CMS payload into the public website's Page + SeoMeta. Sections missing from
   * the payload are left unchanged.
   */
  static async updateHomepage(req: Request, res: Response): Promise<void> {
    try {
      const db = getDatabase();
      const body = req.body || {};
      const page: any = await db.collection('Page').findOne({ identifier: HOME_IDENTIFIER });
      const set: Record<string, any> = {};

      if (body.general) set.notificationTitle = String(body.general.notificationTitle || '').trim() || null;

      if (Array.isArray(body.carouselImages)) {
        const images = body.carouselImages
          .map((c: any) => ({ url: String(c?.imageUrl || '').trim(), alt: String(c?.altText || '').trim(), mobile: String(c?.deviceType || '').toLowerCase() === 'mobile' }))
          .filter((c: any) => c.url);
        set.carouselImageUrls = images.map((c: any) => c.url);
        set.carouselImageAltTexts = images.map((c: any, i: number) => c.alt || `Hexpertify banner ${i + 1}`);
        set.carouselImageIsMobileFlags = images.map((c: any) => c.mobile);
      }

      if (Array.isArray(body.faqs)) set.faqs = toFaqs(body.faqs);

      if (Array.isArray(body.testimonials)) {
        set.testimonials = body.testimonials
          .map((t: any) => ({
            quote: String(t?.content ?? t?.quote ?? '').trim(),
            authorName: String(t?.authorName || '').trim(),
            authorProfessional: String(t?.profession ?? t?.authorProfessional ?? '').trim() || null,
            authorImageUrl: String(t?.authorImageUrl || '').trim() || null,
            authorImageAltText: String(t?.authorImageAltText || '').trim() || null,
            authorEmail: String(t?.authorEmail || '').trim() || null
          }))
          .filter((t: any) => t.quote && t.authorName);
      }

      if (body.seo) {
        set.seoMetaId = await upsertSeoMeta(page?.seoMetaId, body.seo, 'Hexpertify | Online Therapy & Counselling in India');
      }

      if (page) {
        await db.collection('Page').updateOne({ _id: page._id }, { $set: set });
      } else {
        await db.collection('Page').insertOne({
          _id: newId() as any,
          identifier: HOME_IDENTIFIER,
          notificationTitle: null,
          carouselImageUrls: [],
          carouselImageAltTexts: [],
          carouselImageIsMobileFlags: [],
          faqs: [],
          testimonials: [],
          seoMetaId: set.seoMetaId || await upsertSeoMeta(null, {}, 'Hexpertify | Online Therapy & Counselling in India'),
          ...set
        });
      }

      res.json({ success: true, message: 'Homepage updated. Changes are live on the website.' });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error?.message || 'Failed to update homepage' });
    }
  }
}
