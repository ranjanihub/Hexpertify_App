import { Request, Response } from 'express';
import { ObjectId } from 'mongodb';
import { getDatabase } from '../db/mongodb';
import { createNotifications, emailNotification, NewNotification } from '../services/notification.service';
import { ClientViewer, resolveClientViewer } from '../services/client-access';
import { escapeRegex, ownConsultant, serverError } from '../services/clinical-access';

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

/** Attachment types the therapist panel uploads, by extension */
const EXT_MIME: Record<string, string> = {
  pdf: 'application/pdf',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  txt: 'text/plain',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  webp: 'image/webp'
};
const MIME_EXT: Record<string, string> = Object.fromEntries(
  Object.entries(EXT_MIME).filter(([ext]) => ext !== 'jpeg').map(([ext, mime]) => [mime, ext])
);
const GENERIC_MIME = new Set(['', 'application/octet-stream', 'binary/octet-stream']);

const extOf = (name: unknown) => {
  const m = String(name || '').trim().toLowerCase().match(/\.([a-z0-9]{1,5})$/);
  return m ? m[1] : '';
};
const dataUrlMime = (url: unknown) => {
  const m = String(url || '').match(/^data:([^;,]*)[;,]/i);
  return m ? m[1].trim().toLowerCase() : '';
};

/**
 * The real type of an uploaded attachment: the data URL's mime, else the file extension, else the
 * type the browser reported (Windows often reports an empty type for .doc). isPdf only for actual PDFs.
 * Documents without fileName/fileType/fileUrl fall back to the legacy "text ends with .pdf" marker.
 */
function describeAttachment(doc: any, legacyText?: unknown): { fileType: string | null; fileName: string | null; isPdf: boolean } {
  const fileUrl = doc?.fileUrl;
  let fileName = String(doc?.fileName || '').trim();
  const sent = String(doc?.fileType || '').trim().toLowerCase();
  const fromUrl = dataUrlMime(fileUrl);
  const fromExt = EXT_MIME[extOf(fileName)] || '';

  let fileType = !GENERIC_MIME.has(fromUrl) ? fromUrl : fromExt || (!GENERIC_MIME.has(sent) ? sent : '');
  if (!fileName && !fileUrl && !fileType) {
    // Older posts mark a PDF only through the text ("name.pdf" or "[...pdf]")
    const text = typeof legacyText === 'string' ? legacyText.trim() : '';
    if (text.toLowerCase().endsWith('.pdf')) {
      fileName = text;
      fileType = 'application/pdf';
    } else if (text.includes('.pdf]')) {
      fileType = 'application/pdf';
    }
  }
  // Keep the real extension on the name
  if (fileName && !extOf(fileName) && MIME_EXT[fileType]) fileName = `${fileName}.${MIME_EXT[fileType]}`;

  return { fileType: fileType || null, fileName: fileName || null, isPdf: fileType === 'application/pdf' };
}

// Notes the admin panel fills in on its own; they say nothing the status doesn't, so they stay out of messages
const BOILERPLATE_NOTES = new Set([
  'approved by platform editorial admin.',
  'requires revision before publishing.',
  'requires revision before drafting.',
]);

/**
 * Tells the therapist who wrote a post or outline that an admin approved, rejected, changed or
 * deleted it: a bell notification in the consultant panel plus an email. Best-effort, never throws.
 */
async function notifyAuthor(
  kind: 'post' | 'outline',
  doc: any,
  event: string,
  notes?: string
): Promise<void> {
  try {
    const email = String(doc?.authorEmail || '').toLowerCase().trim();
    if (!email) return;

    const db = getDatabase();
    const consultant: any = await db
      .collection('Consultant')
      .findOne({ email }, { projection: { id: 1 } })
      .catch(() => null);

    const label = kind === 'post' ? 'article' : 'outline';
    const Label = kind === 'post' ? 'Article' : 'Outline';
    const name = String((kind === 'post' ? doc.title : doc.proposedTitle) || `Untitled ${label}`);
    const status = String(event || '').toLowerCase();
    const note = String(notes || '').trim();
    const feedback = note && !BOILERPLATE_NOTES.has(note.toLowerCase()) ? note : '';

    let type: string;
    let title: string;
    let message: string;
    if (status === 'approved' || status === 'published') {
      type = `BLOG_${kind.toUpperCase()}_APPROVED`;
      title = `${Label} approved`;
      message = kind === 'post'
        ? `Your article "${name}" was approved.`
        : `Your outline "${name}" was approved. You can start writing the full article.`;
      if (feedback) message += ` Editor's note: ${feedback}`;
    } else if (status === 'rejected') {
      type = `BLOG_${kind.toUpperCase()}_REJECTED`;
      title = `${Label} needs revision`;
      message = `Your ${label} "${name}" was sent back for revision.`;
      message += feedback ? ` Feedback: ${feedback}` : ' Open it to see what to change.';
    } else if (status === 'deleted') {
      type = `BLOG_${kind.toUpperCase()}_DELETED`;
      title = `${Label} removed`;
      message = `Your ${label} "${name}" was removed by the Hexpertify editorial team.`;
    } else {
      type = `BLOG_${kind.toUpperCase()}_STATUS`;
      title = `${Label} status updated`;
      message = `Your ${label} "${name}" is now marked as ${status || 'updated'}.`;
      if (feedback) message += ` Note: ${feedback}`;
    }

    const notification: NewNotification = {
      recipientRole: 'CONSULTANT',
      recipientId: consultant?.id ? String(consultant.id) : undefined,
      recipientEmail: email,
      type,
      title,
      message,
    };
    await createNotifications([notification]);
    await emailNotification(notification);
  } catch (err: any) {
    console.warn('[BlogController] Author notification failed:', err?.message);
  }
}

/** Statuses the public may read */
const PUBLISHED = ['published', 'approved'];
const POST_STATUSES = ['pending', 'submitted', 'published', 'approved', 'rejected', 'draft'] as const;
const postStatusOf = (value: unknown): BlogPostDocument['status'] =>
  (POST_STATUSES as readonly string[]).includes(String(value)) ? (value as BlogPostDocument['status']) : 'pending';

const canSeeAllPosts = (viewer: ClientViewer) => viewer.kind === 'admin' || viewer.kind === 'internal';

/** The emails a therapist writes under (their posts and outlines carry it as authorEmail) */
const authorEmailsOf = (viewer: ClientViewer) =>
  viewer.kind === 'therapist' ? [...viewer.ids].filter((v) => v.includes('@')) : [];

type BlogAuthor = { name: string; email: string; role: string; avatar: string; consultantId: string; trusted: boolean };

/**
 * Who is submitting a post or outline: a signed-in therapist (identity from their Consultant record)
 * or the admin team (`trusted`: may set the status). The website's server code (internal) keeps the
 * author it sends. Anyone else is refused.
 */
async function blogAuthor(req: Request, body: any): Promise<BlogAuthor | { status: number; error: string }> {
  const viewer = await resolveClientViewer(req);
  const text = (v: unknown, max = 300) => String(v ?? '').trim().slice(0, max);
  if (viewer.kind === 'anonymous') return { status: 401, error: 'Please sign in to submit to the blog.' };
  if (viewer.kind === 'internal') {
    return {
      name: text(body.author || body.authorName), email: text(body.authorEmail).toLowerCase(), role: text(body.authorRole),
      avatar: text(body.authorAvatar, 2000), consultantId: text(body.consultantId), trusted: true
    };
  }
  const email = [...viewer.ids].find((v) => v.includes('@')) || '';
  if (viewer.kind === 'admin') {
    return {
      name: text(body.author || body.authorName) || 'Hexpertify Editorial', email, role: text(body.authorRole) || 'Admin',
      avatar: text(body.authorAvatar, 2000), consultantId: '', trusted: true
    };
  }
  if (viewer.kind !== 'therapist') return { status: 403, error: 'Only therapists and the admin team can submit to the blog.' };
  const consultant: any = await ownConsultant(getDatabase(), viewer);
  return {
    name: text(consultant?.name) || text(body.author || body.authorName),
    email: String(consultant?.email || email).toLowerCase().trim(),
    // Display details (job title, photo) may come from the panel; the identity never does
    role: text(body.authorRole || consultant?.title || consultant?.profession),
    avatar: text(consultant?.photoUrl || consultant?.photo || consultant?.image || body.authorAvatar, 2000),
    consultantId: consultant ? String(consultant.id || consultant._id) : '',
    trusted: false
  };
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
        query.category = { $regex: escapeRegex(category), $options: 'i' };
      }

      if (search) {
        const searchRegex = { $regex: escapeRegex(search), $options: 'i' };
        query.$or = [
          { title: searchRegex },
          { category: searchRegex },
          { tags: searchRegex },
          { author: searchRegex },
        ];
      }

      // Published posts are public; unpublished ones only for the admin team and their own author
      const viewer = await resolveClientViewer(req);
      if (!canSeeAllPosts(viewer)) {
        const own = authorEmailsOf(viewer);
        query.$and = [{ $or: [{ status: { $in: PUBLISHED } }, ...(own.length ? [{ authorEmail: { $in: own } }] : [])] }];
      }

      const posts = await db
        .collection('BlogPost')
        .find(query)
        .sort({ createdAt: -1 })
        .toArray();

      const formatted = posts.map((p: any) => {
        const file = describeAttachment(p, p.content);
        return {
          ...p,
          id: p.id || p._id?.toString(),
          isPdf: file.isPdf,
          fileType: file.fileType,
          fileName: file.fileName,
          status: p.status === 'pending' ? 'submitted' : p.status,
        };
      });

      // Return both raw array (required by consultant api-client) and JSON envelope
      res.json(formatted);
    } catch (error: any) {
      console.error('[BlogController.getAllPosts] Error:', error);
      serverError(res, 'blog', error, 'Failed to fetch blog posts', 'plain');
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
      const viewer = await resolveClientViewer(req);
      const visible = post && (
        PUBLISHED.includes(String(post.status)) || canSeeAllPosts(viewer) ||
        authorEmailsOf(viewer).includes(String(post.authorEmail || '').toLowerCase())
      );
      if (!post || !visible) {
        res.status(404).json({ error: 'Blog post not found' });
        return;
      }

      const file = describeAttachment(post, post.content);
      res.json({
        ...post,
        id: post.id || post._id?.toString(),
        isPdf: file.isPdf,
        fileType: file.fileType,
        fileName: file.fileName,
      });
    } catch (error: any) {
      console.error('[BlogController.getPostById] Error:', error);
      serverError(res, 'blog', error, 'Failed to fetch blog post', 'plain');
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

      // A signed-in therapist or the admin team; the author is the signed-in account
      const author = await blogAuthor(req, body);
      if ('status' in author) {
        res.status(author.status).json({ error: author.error });
        return;
      }

      const now = new Date().toISOString();
      const numericId = Date.now();

      const file = describeAttachment(body, body.content);

      const newPost: BlogPostDocument = {
        id: author.trusted && body.id ? body.id : numericId,
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
        fileName: file.fileName,
        fileType: file.fileType,
        fileSize: body.fileSize || null,
        isPdf: file.isPdf,
        // Only the admin team publishes: a therapist's post always waits for review
        status: author.trusted ? postStatusOf(body.status) : 'pending',
        author: author.name,
        authorEmail: author.email,
        authorRole: author.role,
        authorAvatar: author.avatar,
        consultantId: author.consultantId,
        reviewNotes: '',
        reviewedBy: '',
        reviewedAt: null,
        createdAt: author.trusted && body.createdAt ? body.createdAt : now,
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
      serverError(res, 'blog', error, 'Failed to submit blog post', 'plain');
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
      await notifyAuthor('post', result, updateData.status, reviewNotes);

      res.json({
        success: true,
        message: `Post status updated to ${updateData.status}`,
        post: result,
      });
    } catch (error: any) {
      console.error('[BlogController.reviewPost] Error:', error);
      serverError(res, 'blog', error, 'Failed to review blog post', 'plain');
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
      serverError(res, 'blog', error, 'Failed to update blog post', 'plain');
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

      const deleted = await db.collection('BlogPost').findOneAndDelete(query);

      if (!deleted) {
        res.status(404).json({ error: 'Blog post not found' });
        return;
      }

      console.log(`[BlogController] Deleted blog post: ${id}`);
      // Therapists delete their own drafts through this route too; only an admin removal is news to them
      if (req.query.by === 'admin') await notifyAuthor('post', deleted, 'deleted');
      res.json({ success: true, message: 'Blog post deleted successfully' });
    } catch (error: any) {
      console.error('[BlogController.deletePost] Error:', error);
      serverError(res, 'blog', error, 'Failed to delete blog post', 'plain');
    }
  }

  /**
   * GET /api/blog/outlines
   */
  static async getAllOutlines(req: Request, res: Response): Promise<void> {
    try {
      const db = getDatabase();
      const query: any = {};
      if (req.query.authorEmail) query.authorEmail = String(req.query.authorEmail).toLowerCase().trim();

      // Outlines are unpublished pitches: the admin team sees all, a therapist only their own
      const viewer = await resolveClientViewer(req);
      if (viewer.kind === 'anonymous') {
        res.status(401).json({ error: 'Please sign in to see blog outlines.' });
        return;
      }
      if (!canSeeAllPosts(viewer)) {
        const own = authorEmailsOf(viewer);
        if (!own.length) {
          res.status(403).json({ error: 'Only therapists and the admin team can see blog outlines.' });
          return;
        }
        query.$and = [{ authorEmail: { $in: own } }];
      }
      const outlines = await db
        .collection('BlogOutline')
        .find(query)
        .sort({ createdAt: -1 })
        .toArray();

      res.json(
        outlines.map((o: any) => {
          const file = describeAttachment(o, o.notes);
          return {
            ...o,
            id: o.id || o._id?.toString(),
            isPdf: file.isPdf,
            fileType: file.fileType,
            fileName: file.fileName,
          };
        })
      );
    } catch (error: any) {
      console.error('[BlogController.getAllOutlines] Error:', error);
      serverError(res, 'blog', error, 'Failed to fetch blog outlines', 'plain');
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

      // A signed-in therapist or the admin team; the author is the signed-in account
      const author = await blogAuthor(req, body);
      if ('status' in author) {
        res.status(author.status).json({ error: author.error });
        return;
      }

      const file = describeAttachment(body, body.notes);

      const newOutline: BlogOutlineDocument = {
        id: author.trusted && body.id ? body.id : Date.now(),
        proposedTitle: body.proposedTitle || 'Untitled Outline',
        keyPoints: Array.isArray(body.keyPoints) ? body.keyPoints : [String(body.keyPoints || '')],
        targetAudience: body.targetAudience || 'General Audience',
        keywords: Array.isArray(body.keywords)
          ? body.keywords
          : typeof body.keywords === 'string'
          ? body.keywords.split(',').map((k: string) => k.trim())
          : [],
        notes: body.notes || null,
        fileUrl: body.fileUrl || null,
        fileName: file.fileName,
        fileType: file.fileType,
        fileSize: body.fileSize || null,
        isPdf: file.isPdf,
        // Only the admin team approves outlines
        status: author.trusted && ['pending', 'approved', 'rejected'].includes(String(body.status)) ? body.status : 'pending',
        author: author.name,
        authorEmail: author.email,
        authorRole: author.role,
        ...(author.consultantId ? { consultantId: author.consultantId } : {}),
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
      serverError(res, 'blog', error, 'Failed to submit blog outline', 'plain');
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

      await notifyAuthor('outline', result, status, reviewNotes);
      res.json({ success: true, outline: result });
    } catch (error: any) {
      console.error('[BlogController.reviewOutline] Error:', error);
      serverError(res, 'blog', error, 'Failed to review outline', 'plain');
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

      const deleted = await db.collection('BlogOutline').findOneAndDelete(query);
      if (deleted && req.query.by === 'admin') await notifyAuthor('outline', deleted, 'deleted');
      res.json({ success: true, message: 'Outline deleted successfully' });
    } catch (error: any) {
      console.error('[BlogController.deleteOutline] Error:', error);
      serverError(res, 'blog', error, 'Failed to delete outline', 'plain');
    }
  }
}
