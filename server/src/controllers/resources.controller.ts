import { Request, Response } from 'express';
import { ObjectId } from 'mongodb';
import { getDatabase } from '../db/mongodb';
import { cacheService } from '../services/cache.service';
import { idQuery } from '../services/live-content';

export const DEFAULT_RESOURCES = [
  {
    id: 'res-2',
    title: 'Cognitive Distortions Reference Guide & Worksheet',
    type: 'worksheet',
    typeLabel: 'WORKSHEET',
    category: 'Worksheets',
    isRecommended: true,
    isSaved: true,
    isSharedByTherapist: true,
    description: 'Identify and reframe the 10 most common unhelpful thinking habits with real-life examples.',
    fullContent: `Cognitive distortions are biased ways of thinking that reinforce negative emotions. Use this guide to identify automatic thoughts and reframe them into objective perspectives.

### Common Distortions Covered:
1. **All-or-Nothing Thinking:** Seeing things in black-and-white categories.
2. **Catastrophizing:** Expecting the worst possible outcome.
3. **Mind Reading:** Assuming you know what others are thinking without evidence.
4. **Emotional Reasoning:** Assuming feelings reflect objective reality ("I feel anxious, so it must be dangerous").

### Practical Reframing Exercise:
Write down the triggering situation, your automatic thought, the cognitive distortion type, and an alternative balanced thought.`,
    duration: '8 min read',
    readingMinutes: 8,
    imageUrl: 'https://images.unsplash.com/photo-1517842645767-c639042777db?auto=format&fit=crop&w=800&q=80',
    thumbnailUrl: 'https://images.unsplash.com/photo-1517842645767-c639042777db?auto=format&fit=crop&w=800&q=80',
    tags: ['CBT', 'Reframing', 'Cognitive Health', 'Self-Reflection']
  },
  {
    id: 'res-3',
    title: '15-Minute Progressive Muscle Relaxation (PMR)',
    type: 'meditation',
    typeLabel: 'MEDITATION',
    category: 'Meditations',
    isRecommended: false,
    isSaved: false,
    isSharedByTherapist: false,
    description: 'Guided audio session systematically tensing and relaxing major muscle groups to release somatic tension.',
    fullContent: `Progressive Muscle Relaxation (PMR) is an evidence-based exercise designed to reduce muscular tension and sympathetic nervous system activation.

### Guided Steps:
1. Sit or lie down comfortably in a quiet room.
2. Tense your toes and feet firmly for 5 seconds, then suddenly release completely. Notice the sensation of warmth and relaxation.
3. Move systematically upward through calf muscles, thighs, abdomen, chest, shoulders, arms, hands, neck, and face.
4. Conclude with 3 deep abdominal breaths, enjoying total body lightness.`,
    duration: '15 min listen',
    readingMinutes: 15,
    imageUrl: 'https://images.unsplash.com/photo-1545205597-3d9d02c29597?auto=format&fit=crop&w=800&q=80',
    thumbnailUrl: 'https://images.unsplash.com/photo-1545205597-3d9d02c29597?auto=format&fit=crop&w=800&q=80',
    tags: ['Mindfulness', 'PMR', 'Stress Release', 'Body Scan']
  },
  {
    id: 'res-4',
    title: 'Diaphragmatic Breathing & Vagus Nerve Stimulation',
    type: 'video',
    typeLabel: 'VIDEO',
    category: 'Videos',
    isRecommended: true,
    isSaved: false,
    isSharedByTherapist: true,
    description: 'Visual walkthrough and biofeedback demonstration for activating the parasympathetic nervous system.',
    fullContent: `Diaphragmatic breathing (belly breathing) expands the diaphragm, pulling air deep into the lower lungs and signaling safety to the autonomic nervous system.

### Key Takeaways:
- Place one hand on your upper chest and the other on your abdomen.
- Breathe in slowly through your nose so your abdominal hand rises while your chest hand stays quiet.
- Exhale slowly through pursed lips, allowing abdominal muscles to collapse inward.
- Practicing 5–10 minutes daily lowers cortisol levels and improves baseline heart rate variability (HRV).`,
    duration: '10 min video',
    readingMinutes: 10,
    imageUrl: 'https://images.unsplash.com/photo-1518241353330-0f7941c2d9b5?auto=format&fit=crop&w=800&q=80',
    thumbnailUrl: 'https://images.unsplash.com/photo-1518241353330-0f7941c2d9b5?auto=format&fit=crop&w=800&q=80',
    tags: ['Vagus Nerve', 'Breathing', 'Biofeedback', 'Autonomic Relief']
  },
  {
    id: 'res-5',
    title: 'Sleep Hygiene & Circadian Rhythm Protocol',
    type: 'pdf',
    typeLabel: 'PDF',
    category: 'PDFs',
    isRecommended: false,
    isSaved: false,
    isSharedByTherapist: false,
    description: 'Evidence-based checklist for evening wind-down rituals, light exposure management, and sleep tracking.',
    fullContent: `Quality sleep is foundational for emotional regulation and cognitive health. This protocol provides non-pharmacological guidelines for restorative rest.

### Core Guidelines:
- **Morning Sunlight:** Get 10–15 minutes of direct sunlight within 1 hour of waking.
- **Screen Cutoff:** Turn off blue-light emitting screens 60 minutes before bed.
- **Temperature Control:** Keep bedroom cool (around 65°F / 18°C).
- **Consistent Wake Time:** Wake up at the same time daily, even on weekends.`,
    duration: '6 min read',
    readingMinutes: 6,
    imageUrl: 'https://images.unsplash.com/photo-1511295742362-92c96b124e52?auto=format&fit=crop&w=800&q=80',
    thumbnailUrl: 'https://images.unsplash.com/photo-1511295742362-92c96b124e52?auto=format&fit=crop&w=800&q=80',
    tags: ['Sleep', 'Circadian Rhythm', 'Wellness', 'Checklist']
  },
  {
    id: 'res-6',
    title: '5-Column CBT Thought Record & Restructuring',
    type: 'worksheet',
    typeLabel: 'WORKSHEET',
    category: 'Worksheets',
    isRecommended: false,
    isSaved: false,
    isSharedByTherapist: false,
    description: 'Structured exercise to log distressing situations, catch automatic thoughts, and form balanced perspectives.',
    fullContent: `The 5-Column Thought Record is one of the most effective tools in Cognitive Behavioral Therapy for modifying unhelpful thought patterns.

### Column Structure:
1. **Situation:** Who, what, when, where?
2. **Automatic Thought:** What thoughts or images went through your mind? (Rate belief 0–100%)
3. **Emotion:** What did you feel? (Rate intensity 0–100%)
4. **Evidence:** Facts supporting vs. facts contradicting the automatic thought.
5. **Alternative Thought:** Objective, realistic perspective (Re-rate emotion intensity).`,
    duration: '12 min read',
    readingMinutes: 12,
    imageUrl: 'https://images.unsplash.com/photo-1499209974431-9dac3ada00d7?auto=format&fit=crop&w=800&q=80',
    thumbnailUrl: 'https://images.unsplash.com/photo-1499209974431-9dac3ada00d7?auto=format&fit=crop&w=800&q=80',
    tags: ['CBT', 'Thought Record', 'Restructuring', 'Journaling']
  }
];

/** sharedWith: [{ clientId, clientEmail }] — the clients a therapist shared a resource with */
function normalizeSharedWith(value: unknown): { clientId: string; clientEmail: string }[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const seen = new Set<string>();
  const out: { clientId: string; clientEmail: string }[] = [];
  for (const v of value) {
    const clientId = String((v as any)?.clientId || (v as any)?.id || '').trim();
    const clientEmail = String((v as any)?.clientEmail || (v as any)?.email || '').toLowerCase().trim();
    const key = clientEmail || clientId;
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push({ clientId, clientEmail });
  }
  return out;
}

/** A resource is visible to a client when it is public (no sharedWith) or shared with them */
function isVisibleTo(r: any, email: string, ids: string[]): boolean {
  if (!Array.isArray(r.sharedWith) || r.sharedWith.length === 0) return true;
  return r.sharedWith.some((s: any) =>
    (email && String(s?.clientEmail || '').toLowerCase() === email) || (s?.clientId && ids.includes(String(s.clientId))));
}

export class ResourcesController {
  /**
   * GET /api/resources and GET /api/admin/resources
   */
  static async getAll(req: Request, res: Response): Promise<void> {
    try {
      const responseData = await cacheService.wrap('resources:all', ['resources'], 60, async () => {
        const db = getDatabase();
        let resources = await db.collection('Resource').find({}).toArray();

        const meta = await db.collection('SystemMeta').findOne({ key: 'resources_seeded' });
        if (!meta && (!resources || resources.length === 0)) {
          try {
            await db.collection('Resource').insertMany(DEFAULT_RESOURCES as any);
            await db.collection('resources').insertMany(DEFAULT_RESOURCES as any);
            await db.collection('SystemMeta').updateOne(
              { key: 'resources_seeded' },
              { $set: { key: 'resources_seeded', seededAt: new Date() } },
              { upsert: true }
            );
            resources = await db.collection('Resource').find({}).toArray();
          } catch {
            resources = DEFAULT_RESOURCES as any;
          }
        }

        return {
          success: true,
          count: resources.length,
          resources: resources.map((r) => ({
            ...r,
            id: r.id || String(r._id),
            category: r.category || (r.type ? r.type.charAt(0).toUpperCase() + r.type.slice(1) + 's' : 'Articles')
          }))
        };
      });

      // Per-viewer view: ?clientEmail=/clientId= limits to public + shared-with-me; ?email= sets isSaved from savedBy
      const viewerEmail = String(req.query.email || req.query.clientEmail || '').toLowerCase().trim();
      const clientEmail = String(req.query.clientEmail || '').toLowerCase().trim();
      const clientId = String(req.query.clientId || '').trim();
      if (viewerEmail || clientEmail || clientId) {
        const list = (responseData.resources as any[])
          .filter((r) => (!clientEmail && !clientId) || isVisibleTo(r, clientEmail, clientId ? [clientId] : []))
          .map((r) => (viewerEmail
            ? { ...r, isSaved: Array.isArray(r.savedBy) && r.savedBy.map((e: any) => String(e).toLowerCase()).includes(viewerEmail) }
            : r));
        res.json({ ...responseData, count: list.length, resources: list });
        return;
      }

      res.json(responseData);
    } catch (error: any) {
      res.json({
        success: true,
        count: 0,
        resources: []
      });
    }
  }

  /**
   * GET /api/resources/:id
   */
  static async getById(req: Request, res: Response): Promise<void> {
    try {
      const id = String(req.params.id || req.query.id || '');
      const cacheKey = `resource:${id}`;

      const responseData = await cacheService.wrap(cacheKey, ['resources'], 60, async () => {
        const db = getDatabase();

        let query: any = { id };
        if (ObjectId.isValid(id)) {
          query = { $or: [{ _id: new ObjectId(id) }, { id }] };
        }

        const resource = await db.collection('Resource').findOne(query);
        if (!resource) {
          return null;
        }

        return {
          success: true,
          resource: { ...resource, id: resource.id || String(resource._id) }
        };
      });

      if (!responseData) {
        res.status(404).json({ success: false, error: 'Resource not found' });
        return;
      }

      res.json(responseData);
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

      const sharedWith = normalizeSharedWith(body.sharedWith);
      const newResource = {
        ...body,
        ...(sharedWith ? { sharedWith, isSharedByTherapist: sharedWith.length > 0 || Boolean(body.isSharedByTherapist) } : {}),
        savedBy: [],
        isSaved: false,
        id: body.id || `RES-${Date.now()}`,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const result = await db.collection('Resource').insertOne(newResource);
      await db.collection('resources').insertOne(newResource).catch(() => {});

      cacheService.invalidateTags(['resources']);

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
      delete updates.savedBy; // per-user saves go through PUT /api/resources/:id/save
      if ('sharedWith' in updates) updates.sharedWith = normalizeSharedWith(updates.sharedWith) || [];

      if (!id) {
        res.status(400).json({ success: false, error: 'Resource ID is required' });
        return;
      }

      const db = getDatabase();
      let query: any = { id };
      if (ObjectId.isValid(id)) {
        query = { $or: [{ _id: new ObjectId(id) }, { id }] };
      }

      // Never upsert: a deleted resource must not come back as a stub
      const result = await db.collection('Resource').updateOne(query, { $set: updates });
      await db.collection('resources').updateOne(query, { $set: updates }).catch(() => {});

      cacheService.invalidateTags(['resources']);

      if (!result.matchedCount) {
        res.status(404).json({ success: false, error: 'Resource not found' });
        return;
      }

      res.json({
        success: true,
        message: 'Resource updated successfully'
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error?.message || 'Failed to update resource' });
    }
  }

  /**
   * PUT /api/resources/:id/save { email, saved } — saves/unsaves the resource for one user
   */
  static async setSaved(req: Request, res: Response): Promise<void> {
    try {
      const id = String(req.params.id || '');
      const email = String(req.body?.email || req.body?.clientEmail || '').toLowerCase().trim();
      const saved = req.body?.saved !== false;
      if (!id || !email) {
        res.status(400).json({ success: false, error: 'Resource ID and email are required' });
        return;
      }

      const db = getDatabase();
      const query = idQuery(id);
      const change: any = saved
        ? { $addToSet: { savedBy: email }, $set: { updatedAt: new Date() } }
        : { $pull: { savedBy: email }, $set: { updatedAt: new Date() } };
      const result = await db.collection('Resource').updateOne(query, change);
      await db.collection('resources').updateOne(query, change).catch(() => {});
      cacheService.invalidateTags(['resources']);

      if (!result.matchedCount) {
        res.status(404).json({ success: false, error: 'Resource not found' });
        return;
      }
      res.json({ success: true, id, saved });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error?.message || 'Failed to save resource' });
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
      const query = idQuery(id);

      await db.collection('Resource').deleteMany(query);
      await db.collection('resources').deleteMany(query);

      cacheService.invalidateTags(['resources']);

      res.json({
        success: true,
        message: 'Resource deleted successfully'
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error?.message || 'Failed to delete resource' });
    }
  }
}
