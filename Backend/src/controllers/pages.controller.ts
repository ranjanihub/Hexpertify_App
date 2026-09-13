import { Request, Response } from 'express';
import { ObjectId } from 'mongodb';
import { getDatabase } from '../db/mongodb';

const SEED_ZOMBIE_PAGES = [
  {
    id: 'ZMB-101',
    pageTitle: 'Online Cognitive Behavioral Therapy (CBT) Specialists',
    slug: '/therapy/cbt-online-specialists',
    targetUrl: 'https://hexpertify.com/therapy/cbt-online-specialists',
    htmlChunk: `<section class="zombi-hero bg-gradient-to-br from-[#4f28d9] via-[#5e2be2] to-[#3b1799] text-white p-8 rounded-3xl my-4 shadow-xl">
  <div class="max-w-2xl">
    <span class="bg-white/20 text-purple-100 text-[11px] px-3 py-1 rounded-full font-bold uppercase tracking-wider border border-white/20">Evidence-Based Clinical Care</span>
    <h1 class="text-3xl font-extrabold mt-3 tracking-tight">Online Cognitive Behavioral Therapy (CBT) Specialists</h1>
    <p class="text-purple-100 text-xs mt-2 leading-relaxed">Work with certified clinical psychologists trained in trauma-informed CBT, behavioral activation, and cognitive restructuring.</p>
    <div class="mt-6 flex flex-wrap gap-3">
      <a href="/bookings" class="px-5 py-3 bg-white text-[#4f28d9] rounded-xl font-extrabold text-xs shadow-md hover:bg-purple-50 transition-all">Book 1-on-1 Consultation</a>
    </div>
  </div>
</section>`,
    status: 'Active',
    createdAt: '2025-01-15',
    updatedAt: '2026-09-12',
    viewsCount: 1420,
    seo: {
      metaTitle: 'Online Cognitive Behavioral Therapy (CBT) Specialists | Hexpertify',
      metaDescription: 'Connect with verified clinical psychologists specializing in CBT for anxiety, depression, and stress management.',
      keywords: 'CBT therapy online, cognitive behavioral therapy, online psychologist, anxiety counseling',
      canonicalUrl: 'https://hexpertify.com/therapy/cbt-online-specialists',
      ogTitle: 'Online CBT Therapy Specialists | Hexpertify',
      ogDescription: 'Connect with verified clinical psychologists specializing in CBT.',
      ogImageUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=1200',
      ogImageAltText: 'Online CBT Therapy Session',
      structuredData: '{"@context":"https://schema.org","@type":"MedicalWebPage","name":"Online CBT Specialists"}'
    }
  },
  {
    id: 'ZMB-102',
    pageTitle: 'Top Anxiety & Panic Attack Counselors in Delhi NCR',
    slug: '/counseling/anxiety-specialists-delhi-ncr',
    targetUrl: 'https://hexpertify.com/counseling/anxiety-specialists-delhi-ncr',
    htmlChunk: `<div class="anxiety-landing bg-white border border-slate-200 p-8 rounded-3xl shadow-sm my-4">
  <span class="text-xs font-bold text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full uppercase">Immediate Availability</span>
  <h1 class="text-2xl font-extrabold text-slate-900 mt-2">Specialized Panic & Anxiety Therapy in Delhi NCR</h1>
  <p class="text-xs text-slate-600 mt-2">Confidential video & in-person consultations with RCI-licensed neuropsychiatrists and counselors.</p>
  <div class="mt-4 flex gap-3">
    <a href="/bookings" class="px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold">Schedule Instant Call</a>
  </div>
</div>`,
    status: 'Active',
    createdAt: '2025-02-10',
    updatedAt: '2026-09-12',
    viewsCount: 890,
    seo: {
      metaTitle: 'Top Anxiety & Panic Attack Counselors in Delhi NCR | Hexpertify',
      metaDescription: 'Find certified clinical psychologists and counselors for panic attacks and generalized anxiety in Delhi NCR.',
      keywords: 'anxiety counseling delhi, panic attack therapy, licensed psychologist delhi ncr',
      canonicalUrl: 'https://hexpertify.com/counseling/anxiety-specialists-delhi-ncr',
      ogTitle: 'Anxiety & Panic Attack Counselors Delhi NCR',
      ogDescription: 'Find certified clinical psychologists for panic and anxiety relief.',
      ogImageUrl: '',
      ogImageAltText: '',
      structuredData: ''
    }
  },
  {
    id: 'ZMB-103',
    pageTitle: 'Couples & Marriage Relationship Counseling Online',
    slug: '/therapy/couples-marriage-counseling',
    targetUrl: 'https://hexpertify.com/therapy/couples-marriage-counseling',
    htmlChunk: `<div class="couples-counseling p-8 rounded-3xl bg-rose-50/70 border border-rose-100 my-4">
  <span class="text-xs font-bold text-rose-600 bg-rose-100/80 px-3 py-1 rounded-full uppercase">Relationship Healing</span>
  <h1 class="text-2xl font-extrabold text-rose-950 mt-2">Strengthen Your Bond with Couples Counseling</h1>
  <p class="text-xs text-rose-800 mt-2">Resolve communication breakdowns, rebuild emotional intimacy, and navigate life transitions together with experienced relationship counselors.</p>
</div>`,
    status: 'Active',
    createdAt: '2025-03-01',
    updatedAt: '2026-09-12',
    viewsCount: 645,
    seo: {
      metaTitle: 'Couples & Marriage Relationship Counseling Online | Hexpertify',
      metaDescription: 'Confidential online marriage counseling and relationship guidance with certified family therapists.',
      keywords: 'couples counseling, marriage therapist, relationship coaching online',
      canonicalUrl: 'https://hexpertify.com/therapy/couples-marriage-counseling',
      ogTitle: 'Couples & Marriage Counseling | Hexpertify',
      ogDescription: 'Rebuild connection with certified marriage therapists.',
      ogImageUrl: '',
      ogImageAltText: '',
      structuredData: ''
    }
  },
  {
    id: 'ZMB-104',
    pageTitle: 'Adolescent & Child Behavioral Psychology',
    slug: '/therapy/child-adolescent-psychology',
    targetUrl: 'https://hexpertify.com/therapy/child-adolescent-psychology',
    htmlChunk: `<div class="child-therapy p-8 rounded-3xl bg-purple-50/70 border border-purple-100 my-4">
  <span class="text-xs font-bold text-purple-600 bg-purple-100 px-3 py-1 rounded-full uppercase">Youth Mental Health</span>
  <h1 class="text-2xl font-extrabold text-purple-950 mt-2">Compassionate Support for Children & Teenagers</h1>
  <p class="text-xs text-purple-800 mt-2">Evidence-based interventions for ADHD, academic stress, behavioral patterns, and emotional regulation.</p>
</div>`,
    status: 'Draft',
    createdAt: '2025-04-12',
    updatedAt: '2026-09-12',
    viewsCount: 210,
    seo: {
      metaTitle: 'Adolescent & Child Behavioral Psychology | Hexpertify',
      metaDescription: 'Specialized therapy for children, teens, and young adults facing behavioral or emotional challenges.',
      keywords: 'child psychologist, teen counseling, adolescent behavioral therapy',
      canonicalUrl: 'https://hexpertify.com/therapy/child-adolescent-psychology',
      ogTitle: 'Child & Adolescent Behavioral Psychology',
      ogDescription: 'Specialized counseling for teenagers and children.',
      ogImageUrl: '',
      ogImageAltText: '',
      structuredData: ''
    }
  },
  {
    id: 'ZMB-105',
    pageTitle: 'Workplace Burnout & Corporate Stress Management',
    slug: '/wellness/corporate-burnout-stress-management',
    targetUrl: 'https://hexpertify.com/wellness/corporate-burnout-stress-management',
    htmlChunk: `<div class="burnout-care p-8 rounded-3xl bg-slate-900 text-white border border-slate-800 my-4">
  <span class="text-xs font-bold text-indigo-400 bg-indigo-950/80 px-3 py-1 rounded-full uppercase">Executive Wellness</span>
  <h1 class="text-2xl font-extrabold text-white mt-2">Overcome Burnout & Restore Your Energy</h1>
  <p class="text-xs text-slate-300 mt-2">Tailored executive coaching and clinical therapy designed for high-stress professional environments.</p>
</div>`,
    status: 'Active',
    createdAt: '2025-05-18',
    updatedAt: '2026-09-12',
    viewsCount: 1150,
    seo: {
      metaTitle: 'Workplace Burnout & Stress Management | Hexpertify',
      metaDescription: 'Evidence-backed therapy and executive mental wellness strategies to tackle chronic workplace burnout.',
      keywords: 'workplace burnout, executive coaching, career stress therapy',
      canonicalUrl: 'https://hexpertify.com/wellness/corporate-burnout-stress-management',
      ogTitle: 'Workplace Burnout & Stress Management',
      ogDescription: 'Restore your focus and well-being with executive therapy.',
      ogImageUrl: '',
      ogImageAltText: '',
      structuredData: ''
    }
  }
];

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
      let pages = await db.collection('zombie_pages').find({}).toArray();

      // If zombie_pages collection is empty, automatically seed with programmatic SEO pages
      if (pages.length === 0) {
        console.log('[PagesController] Seeding initial zombie_pages collection...');
        await db.collection('zombie_pages').insertMany(SEED_ZOMBIE_PAGES);
        pages = await db.collection('zombie_pages').find({}).toArray();
      }

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
      const sanitized = sanitizeZombiePage(body, 0);
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
