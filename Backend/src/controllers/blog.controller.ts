import { Request, Response } from 'express';
import { ObjectId } from 'mongodb';
import { getDatabase } from '../db/mongodb';

export interface BlogPostDocument {
  _id?: ObjectId;
  id: string | number;
  title: string;
  category: string;
  tags: string[];
  content: string;
  featuredImage?: string | null;
  fileUrl?: string | null;
  fileName?: string | null;
  fileType?: string | null;
  fileSize?: number | null;
  isPdf?: boolean;
  status: 'pending' | 'submitted' | 'published' | 'approved' | 'rejected' | 'draft';
  author: string;
  authorEmail: string;
  authorRole: string;
  authorAvatar?: string;
  consultantId?: string;
  reviewNotes?: string;
  reviewedBy?: string;
  reviewedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface BlogOutlineDocument {
  _id?: ObjectId;
  id: string | number;
  proposedTitle: string;
  keyPoints: string[];
  targetAudience: string;
  keywords: string[];
  notes?: string | null;
  fileUrl?: string | null;
  fileName?: string | null;
  fileType?: string | null;
  fileSize?: number | null;
  isPdf?: boolean;
  status: 'pending' | 'approved' | 'rejected';
  author: string;
  authorEmail: string;
  authorRole: string;
  reviewNotes?: string;
  reviewedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export class BlogController {
  /**
   * GET /api/blog/posts
   * Fetches all blog posts from MongoDB Atlas.
   * Can filter by query params: status, authorEmail, category, search
   */
  static async getAllPosts(req: Request, res: Response): Promise<void> {
    try {
      const db = getDatabase();
      const { status, authorEmail, category, search } = req.query;

      const query: any = {};

      if (status && status !== 'all') {
        const s = String(status).toLowerCase();
        if (s === 'pending' || s === 'submitted') {
          query.status = { $in: ['pending', 'submitted'] };
        } else if (s === 'published' || s === 'approved') {
          query.status = { $in: ['published', 'approved'] };
        } else {
          query.status = s;
        }
      }

      if (authorEmail) {
        query.authorEmail = String(authorEmail).toLowerCase();
      }

      if (category && category !== 'all') {
        query.category = { $regex: new RegExp(String(category), 'i') };
      }

      if (search) {
        const searchRegex = new RegExp(String(search), 'i');
        query.$or = [
          { title: searchRegex },
          { category: searchRegex },
          { tags: searchRegex },
          { author: searchRegex },
        ];
      }

      const posts = await db
        .collection('BlogPost')
        .find(query)
        .sort({ createdAt: -1 })
        .toArray();

      const formatted = posts.map((p: any) => {
        const isPdf = Boolean(
          p.isPdf ||
          p.fileType === 'application/pdf' ||
          (p.fileName && p.fileName.toLowerCase().endsWith('.pdf')) ||
          (typeof p.content === 'string' && (p.content.toLowerCase().endsWith('.pdf') || p.content.includes('.pdf]')))
        );
        const inferredFileName = p.fileName || (isPdf && typeof p.content === 'string' && p.content.toLowerCase().endsWith('.pdf') ? p.content : undefined);

        return {
          ...p,
          id: p.id || p._id?.toString(),
          isPdf,
          fileName: inferredFileName || p.fileName,
          status: p.status === 'pending' ? 'submitted' : p.status,
        };
      });

      // Return both raw array (required by consultant api-client) and JSON envelope
      res.json(formatted);
    } catch (error: any) {
      console.error('[BlogController.getAllPosts] Error:', error);
      res.status(500).json({ error: error?.message || 'Failed to fetch blog posts' });
    }
  }

  /**
   * GET /api/blog/posts/:id
   */
  static async getPostById(req: Request, res: Response): Promise<void> {
    try {
      const db = getDatabase();
      const id = String(req.params.id);

      let query: any = { id };
      if (ObjectId.isValid(id)) {
        query = { $or: [{ _id: new ObjectId(id) }, { id }, { id: Number(id) || -1 }] };
      } else if (!isNaN(Number(id))) {
        query = { $or: [{ id: Number(id) }, { id }] };
      }

      const post = await db.collection('BlogPost').findOne(query);
      if (!post) {
        res.status(404).json({ error: 'Blog post not found' });
        return;
      }

      const isPdf = Boolean(
        post.isPdf ||
        post.fileType === 'application/pdf' ||
        (post.fileName && post.fileName.toLowerCase().endsWith('.pdf')) ||
        (typeof post.content === 'string' && (post.content.toLowerCase().endsWith('.pdf') || post.content.includes('.pdf]')))
      );
      const inferredFileName = post.fileName || (isPdf && typeof post.content === 'string' && post.content.toLowerCase().endsWith('.pdf') ? post.content : undefined);

      res.json({
        ...post,
        id: post.id || post._id?.toString(),
        isPdf,
        fileName: inferredFileName || post.fileName,
      });
    } catch (error: any) {
      console.error('[BlogController.getPostById] Error:', error);
      res.status(500).json({ error: error?.message || 'Failed to fetch blog post' });
    }
  }

  /**
   * POST /api/blog/posts
   * Consultant submits a new blog post. Saved with status 'pending' (or 'submitted')
   */
  static async createPost(req: Request, res: Response): Promise<void> {
    try {
      const db = getDatabase();
      const body = req.body || {};

      const now = new Date().toISOString();
      const numericId = Date.now();

      const isPdf = Boolean(
        body.isPdf ||
        body.fileType === 'application/pdf' ||
        (body.fileName && body.fileName.toLowerCase().endsWith('.pdf')) ||
        (typeof body.content === 'string' && (body.content.toLowerCase().endsWith('.pdf') || body.content.includes('.pdf]')))
      );

      const newPost: BlogPostDocument = {
        id: body.id || numericId,
        title: body.title || 'Untitled Article',
        category: body.category || 'General Psychology',
        tags: Array.isArray(body.tags)
          ? body.tags
          : typeof body.tags === 'string'
          ? body.tags.split(',').map((t: string) => t.trim()).filter(Boolean)
          : [],
        content: body.content || '',
        featuredImage: body.featuredImage || null,
        fileUrl: body.fileUrl || null,
        fileName: body.fileName || (isPdf && typeof body.content === 'string' && body.content.toLowerCase().endsWith('.pdf') ? body.content : null),
        fileType: body.fileType || (isPdf ? 'application/pdf' : null),
        fileSize: body.fileSize || null,
        isPdf: isPdf,
        status: body.status || 'pending', // Consultant submits -> defaults to pending review!
        author: body.author || body.authorName || 'Dr. Evelyn Reed, PhD',
        authorEmail: body.authorEmail || 'dr.evelyn@hexpertify.com',
        authorRole: body.authorRole || 'Licensed Clinical Psychologist',
        authorAvatar:
          body.authorAvatar ||
          'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&w=400&q=80',
        consultantId: body.consultantId || 'doc-1',
        reviewNotes: '',
        reviewedBy: '',
        reviewedAt: null,
        createdAt: body.createdAt || now,
        updatedAt: now,
      };

      const result = await db.collection('BlogPost').insertOne(newPost as any);

      console.log(`[BlogController] Successfully saved new blog post: "${newPost.title}" by ${newPost.author} (Status: pending)`);

      res.status(201).json({
        ...newPost,
        _id: result.insertedId,
      });
    } catch (error: any) {
      console.error('[BlogController.createPost] Error:', error);
      res.status(500).json({ error: error?.message || 'Failed to submit blog post' });
    }
  }

  /**
   * PUT /api/blog/posts/:id/review or PATCH /api/blog/posts/:id/review
   * Admin reviews a blog post: approve or reject with feedback notes
   */
  static async reviewPost(req: Request, res: Response): Promise<void> {
    try {
      const db = getDatabase();
      const id = String(req.params.id);
      const { status, reviewNotes, reviewedBy } = req.body;

      if (!status) {
        res.status(400).json({ error: 'Status is required (e.g. published, approved, rejected)' });
        return;
      }

      let query: any = { id };
      if (ObjectId.isValid(id)) {
        query = { $or: [{ _id: new ObjectId(id) }, { id }, { id: Number(id) || -1 }] };
      } else if (!isNaN(Number(id))) {
        query = { $or: [{ id: Number(id) }, { id }] };
      }

      const updateData: any = {
        status: status,
        updatedAt: new Date().toISOString(),
        reviewedAt: new Date().toISOString(),
        reviewedBy: reviewedBy || 'Super Admin',
      };

      if (reviewNotes !== undefined) {
        updateData.reviewNotes = reviewNotes;
      }

      const result = await db.collection('BlogPost').findOneAndUpdate(
        query,
        { $set: updateData },
        { returnDocument: 'after' }
      );

      if (!result) {
        res.status(404).json({ error: 'Blog post not found' });
        return;
      }

      console.log(`[BlogController] Post "${id}" reviewed -> Status: ${updateData.status}`);

      res.json({
        success: true,
        message: `Post status updated to ${updateData.status}`,
        post: result,
      });
    } catch (error: any) {
      console.error('[BlogController.reviewPost] Error:', error);
      res.status(500).json({ error: error?.message || 'Failed to review blog post' });
    }
  }

  /**
   * PUT /api/blog/posts/:id or PATCH /api/blog/posts/:id
   */
  static async updatePost(req: Request, res: Response): Promise<void> {
    try {
      const db = getDatabase();
      const id = String(req.params.id);
      const body = req.body || {};

      let query: any = { id };
      if (ObjectId.isValid(id)) {
        query = { $or: [{ _id: new ObjectId(id) }, { id }, { id: Number(id) || -1 }] };
      } else if (!isNaN(Number(id))) {
        query = { $or: [{ id: Number(id) }, { id }] };
      }

      const updateFields: any = {
        ...body,
        updatedAt: new Date().toISOString(),
      };
      delete updateFields._id;
      delete updateFields.id;

      const result = await db.collection('BlogPost').findOneAndUpdate(
        query,
        { $set: updateFields },
        { returnDocument: 'after' }
      );

      if (!result) {
        res.status(404).json({ error: 'Blog post not found' });
        return;
      }

      res.json(result);
    } catch (error: any) {
      console.error('[BlogController.updatePost] Error:', error);
      res.status(500).json({ error: error?.message || 'Failed to update blog post' });
    }
  }

  /**
   * DELETE /api/blog/posts/:id
   */
  static async deletePost(req: Request, res: Response): Promise<void> {
    try {
      const db = getDatabase();
      const id = String(req.params.id);

      let query: any = { id };
      if (ObjectId.isValid(id)) {
        query = { $or: [{ _id: new ObjectId(id) }, { id }, { id: Number(id) || -1 }] };
      } else if (!isNaN(Number(id))) {
        query = { $or: [{ id: Number(id) }, { id }] };
      }

      const result = await db.collection('BlogPost').deleteOne(query);

      if (result.deletedCount === 0) {
        res.status(404).json({ error: 'Blog post not found' });
        return;
      }

      console.log(`[BlogController] Deleted blog post: ${id}`);
      res.json({ success: true, message: 'Blog post deleted successfully' });
    } catch (error: any) {
      console.error('[BlogController.deletePost] Error:', error);
      res.status(500).json({ error: error?.message || 'Failed to delete blog post' });
    }
  }

  /**
   * GET /api/blog/outlines
   */
  static async getAllOutlines(req: Request, res: Response): Promise<void> {
    try {
      const db = getDatabase();
      const outlines = await db
        .collection('BlogOutline')
        .find({})
        .sort({ createdAt: -1 })
        .toArray();

      res.json(
        outlines.map((o: any) => {
          const isPdf = Boolean(
            o.isPdf ||
            o.fileType === 'application/pdf' ||
            (o.fileName && o.fileName.toLowerCase().endsWith('.pdf')) ||
            (typeof o.notes === 'string' && (o.notes.toLowerCase().endsWith('.pdf') || o.notes.includes('.pdf]'))) ||
            (Array.isArray(o.keyPoints) && o.keyPoints.some((kp: string) => kp.toLowerCase().includes('.pdf')))
          );
          return {
            ...o,
            id: o.id || o._id?.toString(),
            isPdf,
          };
        })
      );
    } catch (error: any) {
      console.error('[BlogController.getAllOutlines] Error:', error);
      res.status(500).json({ error: error?.message || 'Failed to fetch blog outlines' });
    }
  }

  /**
   * POST /api/blog/outlines
   */
  static async createOutline(req: Request, res: Response): Promise<void> {
    try {
      const db = getDatabase();
      const body = req.body || {};
      const now = new Date().toISOString();

      const isPdf = Boolean(
        body.isPdf ||
        body.fileType === 'application/pdf' ||
        (body.fileName && body.fileName.toLowerCase().endsWith('.pdf')) ||
        (typeof body.notes === 'string' && (body.notes.toLowerCase().endsWith('.pdf') || body.notes.includes('.pdf]'))) ||
        (Array.isArray(body.keyPoints) && body.keyPoints.some((kp: string) => kp.toLowerCase().includes('.pdf')))
      );

      const newOutline: BlogOutlineDocument = {
        id: body.id || Date.now(),
        proposedTitle: body.proposedTitle || 'Untitled Pitch',
        keyPoints: Array.isArray(body.keyPoints) ? body.keyPoints : [String(body.keyPoints || '')],
        targetAudience: body.targetAudience || 'General Audience',
        keywords: Array.isArray(body.keywords)
          ? body.keywords
          : typeof body.keywords === 'string'
          ? body.keywords.split(',').map((k: string) => k.trim())
          : [],
        notes: body.notes || null,
        fileUrl: body.fileUrl || null,
        fileName: body.fileName || (isPdf && typeof body.notes === 'string' && body.notes.toLowerCase().endsWith('.pdf') ? body.notes : null),
        fileType: body.fileType || (isPdf ? 'application/pdf' : null),
        fileSize: body.fileSize || null,
        isPdf: isPdf,
        status: body.status || 'pending',
        author: body.author || 'Dr. Evelyn Reed, PhD',
        authorEmail: body.authorEmail || 'dr.evelyn@hexpertify.com',
        authorRole: body.authorRole || 'Licensed Clinical Psychologist',
        reviewNotes: '',
        reviewedAt: null,
        createdAt: now,
        updatedAt: now,
      };

      const result = await db.collection('BlogOutline').insertOne(newOutline as any);

      res.status(201).json({
        ...newOutline,
        _id: result.insertedId,
      });
    } catch (error: any) {
      console.error('[BlogController.createOutline] Error:', error);
      res.status(500).json({ error: error?.message || 'Failed to submit blog outline' });
    }
  }

  /**
   * PUT /api/blog/outlines/:id/review
   */
  static async reviewOutline(req: Request, res: Response): Promise<void> {
    try {
      const db = getDatabase();
      const id = String(req.params.id);
      const { status, reviewNotes } = req.body;

      let query: any = { id };
      if (ObjectId.isValid(id)) {
        query = { $or: [{ _id: new ObjectId(id) }, { id }, { id: Number(id) || -1 }] };
      } else if (!isNaN(Number(id))) {
        query = { $or: [{ id: Number(id) }, { id }] };
      }

      const result = await db.collection('BlogOutline').findOneAndUpdate(
        query,
        {
          $set: {
            status,
            reviewNotes: reviewNotes || '',
            reviewedAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        },
        { returnDocument: 'after' }
      );

      if (!result) {
        res.status(404).json({ error: 'Blog outline not found' });
        return;
      }

      res.json({ success: true, outline: result });
    } catch (error: any) {
      console.error('[BlogController.reviewOutline] Error:', error);
      res.status(500).json({ error: error?.message || 'Failed to review outline' });
    }
  }

  /**
   * DELETE /api/blog/outlines/:id
   */
  static async deleteOutline(req: Request, res: Response): Promise<void> {
    try {
      const db = getDatabase();
      const id = String(req.params.id);

      let query: any = { id };
      if (ObjectId.isValid(id)) {
        query = { $or: [{ _id: new ObjectId(id) }, { id }, { id: Number(id) || -1 }] };
      } else if (!isNaN(Number(id))) {
        query = { $or: [{ id: Number(id) }, { id }] };
      }

      await db.collection('BlogOutline').deleteOne(query);
      res.json({ success: true, message: 'Outline deleted successfully' });
    } catch (error: any) {
      console.error('[BlogController.deleteOutline] Error:', error);
      res.status(500).json({ error: error?.message || 'Failed to delete outline' });
    }
  }
}
