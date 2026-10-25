import React, { useState, useEffect } from 'react';
import {
  FileCheck,
  Clock,
  CheckCircle2,
  XCircle,
  Search,
  Eye,
  Trash2,
  BookOpen,
  AlertCircle,
  Sparkles,
  RefreshCw,
  MessageSquare,
  FileText,
  Download,
  ExternalLink,
  ArrowLeft
} from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../lib/apiClient';
import { richTextToPlain } from '../lib/rich-text';
import { RichContent, RichInline } from '../components/common/RichContent';

export interface BlogPostItem {
  id: string | number;
  _id?: string;
  title: string;
  category: string;
  tags?: string[];
  content: string;
  featuredImage?: string | null;
  fileUrl?: string | null;
  fileName?: string | null;
  fileType?: string | null;
  fileSize?: number | null;
  isPdf?: boolean;
  status: 'pending' | 'submitted' | 'published' | 'approved' | 'rejected' | 'draft' | string;
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

export interface BlogOutlineItem {
  id: string | number;
  _id?: string;
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
  createdAt: string;
}

// ── Attachment utilities (PDF, Word, images, ...) for viewing & downloading ──────────────
const EXT_MIME: Record<string, string> = {
  pdf: 'application/pdf',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  txt: 'text/plain',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
  gif: 'image/gif'
};
const MIME_EXT: Record<string, string> = Object.fromEntries(
  Object.entries(EXT_MIME).filter(([ext]) => ext !== 'jpeg').map(([ext, mime]) => [mime, ext])
);
const GENERIC_MIME = new Set(['', 'application/octet-stream', 'binary/octet-stream']);

const extOf = (name?: string | null) => {
  const m = String(name || '').trim().toLowerCase().match(/\.([a-z0-9]{1,5})(?:[?#].*)?$/);
  return m ? m[1] : '';
};
const dataUrlMime = (url?: string | null) => {
  const m = String(url || '').match(/^data:([^;,]*)[;,]/i);
  return m ? m[1].trim().toLowerCase() : '';
};

export type AttachmentKind = 'pdf' | 'word' | 'image' | 'text' | 'other';

export interface AttachmentInfo {
  kind: AttachmentKind;
  /** Human label: "PDF document", "Word document", ... */
  label: string;
  mime: string;
  fileName: string;
  sizeLabel: string;
}

/** Describes a post/outline attachment from its data-URL mime, fileType, or file extension */
export function describeAttachment(item: {
  fileUrl?: string | null;
  fileName?: string | null;
  fileType?: string | null;
  fileSize?: number | null;
  isPdf?: boolean;
}): AttachmentInfo {
  const fromUrl = dataUrlMime(item.fileUrl);
  const sent = String(item.fileType || '').trim().toLowerCase();
  const ext = extOf(item.fileName) || extOf(item.fileUrl && !item.fileUrl.startsWith('data:') ? item.fileUrl : '');
  const mime =
    (!GENERIC_MIME.has(fromUrl) ? fromUrl : '') ||
    (!GENERIC_MIME.has(sent) ? sent : '') ||
    EXT_MIME[ext] ||
    (item.isPdf ? 'application/pdf' : '');

  let kind: AttachmentKind = 'other';
  if (mime === 'application/pdf' || ext === 'pdf') kind = 'pdf';
  else if (mime.includes('msword') || mime.includes('wordprocessingml') || ext === 'doc' || ext === 'docx') kind = 'word';
  else if (mime.startsWith('image/')) kind = 'image';
  else if (mime.startsWith('text/')) kind = 'text';

  const label = { pdf: 'PDF document', word: 'Word document', image: 'Image', text: 'Text file', other: 'Attachment' }[kind];
  let fileName = String(item.fileName || '').trim();
  const realExt = MIME_EXT[mime] || (kind === 'pdf' ? 'pdf' : '');
  if (!fileName) fileName = `Attachment${realExt ? `.${realExt}` : ''}`;
  else if (!extOf(fileName) && realExt) fileName = `${fileName}.${realExt}`;

  const size = Number(item.fileSize) || 0;
  const sizeLabel = !size ? '' : size >= 1024 * 1024 ? `${(size / (1024 * 1024)).toFixed(1)} MB` : `${(size / 1024).toFixed(1)} KB`;

  return { kind, label, mime, fileName, sizeLabel };
}

/** Legacy posts marked a PDF only through their text ("name.pdf") and carry no file */
const isLegacyPdfPost = (post: BlogPostItem) =>
  !post.fileUrl && Boolean(post.isPdf || post.fileType === 'application/pdf' || post.content?.toLowerCase().trim().endsWith('.pdf'));

/** Text that only stands in for the attachment ("[Attached Document: x.docx]", the file name) */
const isAttachmentPlaceholder = (text: string | null | undefined, fileName?: string | null) => {
  const t = String(text || '').trim();
  if (!t) return true;
  if (/^\[attached [^\]]*\]$/i.test(t)) return true;
  return Boolean(fileName && t === String(fileName).trim());
};

export function getPdfBlobUrl(urlOrDataUrl?: string | null): string {
  if (!urlOrDataUrl) return '';
  if (!urlOrDataUrl.startsWith('data:')) return urlOrDataUrl;
  try {
    const parts = urlOrDataUrl.split(',');
    const mimeMatch = parts[0].match(/:(.*?)[;,]/) || parts[0].match(/:(.*)$/);
    const mime = mimeMatch && mimeMatch[1] ? mimeMatch[1] : 'application/octet-stream';
    const isBase64 = /;base64/i.test(parts[0]);
    const payload = parts.slice(1).join(',');
    const byteCharacters = isBase64 ? atob(payload) : decodeURIComponent(payload);
    const byteNumbers = new Uint8Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const blob = new Blob([byteNumbers], { type: mime });
    return URL.createObjectURL(blob);
  } catch (err) {
    console.error('Failed to convert Data URL to Blob URL:', err);
    return urlOrDataUrl;
  }
}

export function openPdfWindow(urlOrDataUrl?: string | null) {
  if (!urlOrDataUrl) return;
  const blobUrl = getPdfBlobUrl(urlOrDataUrl);
  if (blobUrl) {
    const win = window.open(blobUrl, '_blank', 'noopener,noreferrer');
    if (win) {
      win.focus();
    }
  }
}

/** Downloads the attachment with its original file name and extension (type from the data URL) */
export function downloadFile(urlOrDataUrl?: string | null, fileName: string = 'Attachment') {
  if (!urlOrDataUrl) return;
  const blobUrl = getPdfBlobUrl(urlOrDataUrl);
  if (!blobUrl) return;
  const mimeExt = MIME_EXT[dataUrlMime(urlOrDataUrl)];
  const link = document.createElement('a');
  link.href = blobUrl;
  link.download = extOf(fileName) || !mimeExt ? fileName : `${fileName}.${mimeExt}`;
  link.rel = 'noopener';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  if (blobUrl.startsWith('blob:')) setTimeout(() => URL.revokeObjectURL(blobUrl), 30000);
}

const ATTACHMENT_STYLES: Record<AttachmentKind, { card: string; icon: string; badge: string; button: string }> = {
  pdf: { card: 'bg-rose-50/80 border-rose-200', icon: 'bg-rose-500 shadow-rose-500/20', badge: 'bg-rose-200 text-rose-800', button: 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/20' },
  word: { card: 'bg-blue-50/80 border-blue-200', icon: 'bg-blue-600 shadow-blue-600/20', badge: 'bg-blue-200 text-blue-800', button: 'bg-blue-600 hover:bg-blue-700 shadow-blue-600/20' },
  image: { card: 'bg-emerald-50/80 border-emerald-200', icon: 'bg-emerald-600 shadow-emerald-600/20', badge: 'bg-emerald-200 text-emerald-800', button: 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20' },
  text: { card: 'bg-slate-50 border-slate-200', icon: 'bg-slate-600 shadow-slate-600/20', badge: 'bg-slate-200 text-slate-800', button: 'bg-slate-700 hover:bg-slate-800 shadow-slate-700/20' },
  other: { card: 'bg-slate-50 border-slate-200', icon: 'bg-slate-600 shadow-slate-600/20', badge: 'bg-slate-200 text-slate-800', button: 'bg-slate-700 hover:bg-slate-800 shadow-slate-700/20' }
};

/** File name, type, size and Open / Download buttons for any attachment */
const AttachmentCard: React.FC<{ fileUrl: string; info: AttachmentInfo }> = ({ fileUrl, info }) => {
  const style = ATTACHMENT_STYLES[info.kind];
  return (
    <div className={`p-4 rounded-2xl border flex flex-wrap items-center justify-between gap-3 shadow-xs ${style.card}`}>
      <div className="flex items-center gap-3 min-w-0">
        <div className={`w-12 h-12 rounded-2xl text-white flex items-center justify-center shrink-0 shadow-md ${style.icon}`}>
          <FileText className="w-6 h-6" />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-md uppercase tracking-wider ${style.badge}`}>
              {info.label}
            </span>
            {info.sizeLabel && <span className="text-xs text-slate-600 font-medium">{info.sizeLabel}</span>}
          </div>
          <p className="text-sm font-bold text-slate-900 truncate mt-0.5" title={info.fileName}>
            {info.fileName}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => openPdfWindow(fileUrl)}
          className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs cursor-pointer"
        >
          <ExternalLink className="w-3.5 h-3.5" />
          <span>Open</span>
        </button>
        <button
          type="button"
          onClick={() => downloadFile(fileUrl, info.fileName)}
          className={`px-3 py-1.5 rounded-xl text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm cursor-pointer ${style.button}`}
        >
          <Download className="w-3.5 h-3.5" />
          <span>Download</span>
        </button>
      </div>
    </div>
  );
};

export const ReviewView: React.FC = () => {
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'published' | 'rejected'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');

  const [posts, setPosts] = useState<BlogPostItem[]>([]);
  const [outlines, setOutlines] = useState<BlogOutlineItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState<string | number | null>(null);

  // The open article / outline lives in the URL (/review/:postId, /review/outline/:outlineId)
  // so each one is a real page with working back/forward
  const { postId, outlineId } = useParams<{ postId?: string; outlineId?: string }>();
  const navigate = useNavigate();
  const isDetail = Boolean(postId || outlineId);
  const selectedPost = postId
    ? posts.find((p) => String(p.id) === postId || p._id === postId) ?? null
    : null;
  const selectedOutline = outlineId
    ? outlines.find((o) => String(o.id) === outlineId || o._id === outlineId) ?? null
    : null;
  const openPost = (post: BlogPostItem) => navigate(`/review/${post.id}`);
  const openOutline = (outline: BlogOutlineItem) => navigate(`/review/outline/${outline.id}`);
  const closePost = () => navigate('/review');

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [postId, outlineId]);

  // Modals & Active PDF Blob
  const [activeBlobUrl, setActiveBlobUrl] = useState<string | null>(null);
  const [rejectModalPost, setRejectModalPost] = useState<BlogPostItem | null>(null);
  const [rejectionNotes, setRejectionNotes] = useState('');
  const [rejectModalOutline, setRejectModalOutline] = useState<BlogOutlineItem | null>(null);
  const [outlinesError, setOutlinesError] = useState<string | null>(null);

  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const openFileUrl = selectedPost?.fileUrl || selectedOutline?.fileUrl || null;

  useEffect(() => {
    let cleanup: (() => void) | undefined;
    if (openFileUrl) {
      const bUrl = getPdfBlobUrl(openFileUrl);
      setActiveBlobUrl(bUrl);
      cleanup = () => {
        if (bUrl && bUrl.startsWith('blob:')) {
          URL.revokeObjectURL(bUrl);
        }
      };
    } else {
      setActiveBlobUrl(null);
    }
    return cleanup;
  }, [openFileUrl]);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  const fetchBlogs = async () => {
    setLoading(true);
    // Posts and outlines load independently: one failing never hides the other
    const [postsResult, outlinesResult] = await Promise.allSettled([
      api.get('/api/blog/posts'),
      api.get('/api/blog/outlines')
    ]);

    if (postsResult.status === 'fulfilled') {
      const postsData: any = postsResult.value;
      setPosts(Array.isArray(postsData) ? postsData : Array.isArray(postsData?.posts) ? postsData.posts : []);
    } else {
      console.error('Error loading blog posts:', postsResult.reason);
      showToast('Failed to load blog posts', 'error');
    }

    if (outlinesResult.status === 'fulfilled') {
      const outlinesData: any = outlinesResult.value;
      setOutlines(Array.isArray(outlinesData) ? outlinesData : Array.isArray(outlinesData?.outlines) ? outlinesData.outlines : []);
      setOutlinesError(null);
    } else {
      console.error('Error loading blog outlines:', outlinesResult.reason);
      setOutlinesError(outlinesResult.reason?.message || 'Could not load outline proposals');
    }
    setLoading(false);
  };

  const handleReviewOutline = async (outline: BlogOutlineItem, status: 'approved' | 'rejected', reviewNotes: string) => {
    setActionLoadingId(`outline-${outline.id}`);
    try {
      const data: any = await api.put(`/api/blog/outlines/${outline.id}/review`, { status, reviewNotes });
      const saved = data?.outline;
      setOutlines((prev) =>
        prev.map((o) =>
          o.id === outline.id ? { ...o, status, reviewNotes: saved?.reviewNotes ?? reviewNotes } : o
        )
      );
      showToast(status === 'approved' ? `Outline "${outline.proposedTitle}" approved.` : `Outline "${outline.proposedTitle}" sent back with feedback.`);
      return true;
    } catch (err: any) {
      console.error(err);
      showToast(`Outline not updated: ${err?.message || 'request failed'}`, 'error');
      return false;
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleRejectOutlineConfirm = async () => {
    if (!rejectModalOutline) return;
    const ok = await handleReviewOutline(
      rejectModalOutline,
      'rejected',
      rejectionNotes || 'Requires revision before drafting.'
    );
    if (ok) {
      setRejectModalOutline(null);
      setRejectionNotes('');
    }
  };

  useEffect(() => {
    fetchBlogs();
  }, []);

  const handleApprove = async (post: BlogPostItem) => {
    setActionLoadingId(post.id);
    try {
      const res = await fetch(`/api/blog/posts/${post.id}/review`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'approved',
          reviewNotes: 'Approved by Platform Editorial Admin.',
          reviewedBy: 'Super Admin'
        })
      });

      if (res.ok) {
        showToast(`"${post.title}" approved successfully!`);
        setPosts((prev) =>
          prev.map((p) =>
            p.id === post.id
              ? {
                  ...p,
                  status: 'approved',
                  reviewNotes: 'Approved by Platform Editorial Admin.',
                  reviewedAt: new Date().toISOString()
                }
              : p
          )
        );
      } else {
        showToast('Failed to approve post', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Error updating status', 'error');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleRejectConfirm = async () => {
    if (!rejectModalPost) return;
    setActionLoadingId(rejectModalPost.id);
    try {
      const res = await fetch(`/api/blog/posts/${rejectModalPost.id}/review`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'rejected',
          reviewNotes: rejectionNotes || 'Requires revision before publishing.',
          reviewedBy: 'Super Admin'
        })
      });

      if (res.ok) {
        showToast(`Post marked as rejected with editorial feedback.`);
        setPosts((prev) =>
          prev.map((p) =>
            p.id === rejectModalPost.id
              ? {
                  ...p,
                  status: 'rejected',
                  reviewNotes: rejectionNotes || 'Requires revision before publishing.',
                  reviewedAt: new Date().toISOString()
                }
              : p
          )
        );
        setRejectModalPost(null);
        setRejectionNotes('');
      } else {
        showToast('Failed to update rejection status', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Error updating status', 'error');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDelete = async (post: BlogPostItem) => {
    if (!window.confirm(`Are you sure you want to permanently delete "${post.title}"?`)) return;
    setActionLoadingId(post.id);
    try {
      const res = await fetch(`/api/blog/posts/${post.id}?by=admin`, { method: 'DELETE' });
      if (res.ok) {
        showToast('Blog submission removed.');
        setPosts((prev) => prev.filter((p) => p.id !== post.id));
        if (selectedPost?.id === post.id) closePost();
      } else {
        showToast('Failed to delete post', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Error deleting post', 'error');
    } finally {
      setActionLoadingId(null);
    }
  };

  // KPIs
  const pendingCount = posts.filter(
    (p) => p.status === 'pending' || p.status === 'submitted'
  ).length;
  const publishedCount = posts.filter(
    (p) => p.status === 'published' || p.status === 'approved'
  ).length;
  const rejectedCount = posts.filter((p) => p.status === 'rejected').length;

  // Filtered lists
  const filteredPosts = posts.filter((post) => {
    const isPending = post.status === 'pending' || post.status === 'submitted';
    const isPublished = post.status === 'published' || post.status === 'approved';
    const isRejected = post.status === 'rejected';

    if (statusFilter === 'pending' && !isPending) return false;
    if (statusFilter === 'published' && !isPublished) return false;
    if (statusFilter === 'rejected' && !isRejected) return false;

    if (categoryFilter !== 'all' && post.category.toLowerCase() !== categoryFilter.toLowerCase()) {
      return false;
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = post.title?.toLowerCase().includes(q);
      const matchAuthor = post.author?.toLowerCase().includes(q);
      const matchCategory = post.category?.toLowerCase().includes(q);
      const matchTags = post.tags?.some((t) => t.toLowerCase().includes(q));
      if (!matchTitle && !matchAuthor && !matchCategory && !matchTags) return false;
    }

    return true;
  });

  const categories = Array.from(new Set(posts.map((p) => p.category).filter(Boolean)));

  const formatRelativeTime = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      const diffSec = Math.floor((Date.now() - d.getTime()) / 1000);
      if (isNaN(diffSec)) return 'Recently';
      if (diffSec < 60) return 'Just now';
      if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
      if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
      if (diffSec < 604800) return `${Math.floor(diffSec / 86400)}d ago`;
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
      return 'Recently';
    }
  };

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Toast Alert */}
      {toastMessage && (
        <div
          className={`fixed top-5 right-5 z-50 px-4 py-3 rounded-xl shadow-xl border flex items-center gap-3 animate-in slide-in-from-top-4 ${
            toastMessage.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          {toastMessage.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          )}
          <span className="text-sm font-semibold">{toastMessage.text}</span>
        </div>
      )}

      {!isDetail && (
      <>
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#5e2be2] via-[#6d35f0] to-[#804bee] p-7 text-white shadow-xl shadow-[#5e2be2]/15">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md text-xs font-bold tracking-wider uppercase text-purple-100">
              <FileCheck className="w-3.5 h-3.5" />
              <span>Editorial & Quality Control</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Consultant Blog & Article Reviews
            </h1>
            <p className="text-sm text-purple-100/90 max-w-2xl leading-relaxed">
              Review psychoeducational articles and outline proposals submitted by licensed therapists.
              Verify and approve submissions for consultant clinical records.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={fetchBlogs}
              disabled={loading}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/15 hover:bg-white/25 text-white text-xs font-bold transition-all active:scale-95 cursor-pointer backdrop-blur-sm"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 bg-white rounded-2xl border border-slate-200/80 shadow-xs hover:border-[#5e2be2]/30 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Total Submissions
            </span>
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-[#5e2be2] flex items-center justify-center">
              <BookOpen className="w-5 h-5" />
            </div>
          </div>
          <p className="text-3xl font-extrabold text-slate-900 mt-2">{posts.length}</p>
          <p className="text-xs text-slate-500 font-medium mt-1">Articles submitted by consultants</p>
        </div>

        <div className="p-5 bg-white rounded-2xl border border-amber-200 shadow-xs hover:border-amber-400 transition-all bg-gradient-to-br from-white to-amber-50/40">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-700">
              Pending Review
            </span>
            <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
              <Clock className="w-5 h-5 animate-pulse" />
            </div>
          </div>
          <div className="flex items-baseline gap-2 mt-2">
            <p className="text-3xl font-extrabold text-amber-900">{pendingCount}</p>
            {pendingCount > 0 && (
              <span className="text-[11px] font-extrabold px-2 py-0.5 rounded-full bg-amber-200/70 text-amber-900">
                Action Required
              </span>
            )}
          </div>
          <p className="text-xs text-amber-800/80 font-medium mt-1">Awaiting editorial decision</p>
        </div>

        <div className="p-5 bg-white rounded-2xl border border-emerald-200 shadow-xs hover:border-emerald-400 transition-all bg-gradient-to-br from-white to-emerald-50/30">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">
              Approved
            </span>
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <p className="text-3xl font-extrabold text-emerald-900 mt-2">{publishedCount}</p>
          <p className="text-xs text-emerald-800/80 font-medium mt-1">Verified submissions</p>
        </div>

        <div className="p-5 bg-white rounded-2xl border border-slate-200/80 shadow-xs hover:border-rose-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Rejected / Revisions
            </span>
            <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <XCircle className="w-5 h-5" />
            </div>
          </div>
          <p className="text-3xl font-extrabold text-slate-900 mt-2">{rejectedCount}</p>
          <p className="text-xs text-slate-500 font-medium mt-1">Sent back with notes</p>
        </div>
      </div>

      {/* Main Filter & Navigation Tabs */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
        {/* Status Pills */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100/80 rounded-xl overflow-x-auto">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              statusFilter === 'all'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            All Submissions ({posts.length})
          </button>
          <button
            onClick={() => setStatusFilter('pending')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-2 ${
              statusFilter === 'pending'
                ? 'bg-amber-500 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Pending Review</span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-full font-extrabold ${
                statusFilter === 'pending' ? 'bg-white/25 text-white' : 'bg-amber-100 text-amber-800'
              }`}
            >
              {pendingCount}
            </span>
          </button>
          <button
            onClick={() => setStatusFilter('published')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              statusFilter === 'published'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Approved ({publishedCount})</span>
          </button>
          <button
            onClick={() => setStatusFilter('rejected')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              statusFilter === 'rejected'
                ? 'bg-rose-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <XCircle className="w-3.5 h-3.5" />
            <span>Rejected ({rejectedCount})</span>
          </button>
        </div>

        {/* Search & Category Filter */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by title or author..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs font-medium rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#5e2be2]/30 focus:border-[#5e2be2] transition-all"
            />
          </div>

          {categories.length > 0 && (
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#5e2be2]/30"
            >
              <option value="all">All Categories</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Submissions List */}
      {loading ? (
        <div className="py-24 text-center bg-white rounded-3xl border border-slate-200">
          <RefreshCw className="w-8 h-8 text-[#5e2be2] animate-spin mx-auto mb-3" />
          <p className="text-sm font-bold text-slate-700">Loading blog submissions...</p>
        </div>
      ) : filteredPosts.length === 0 ? (
        <div className="py-20 text-center bg-white rounded-3xl border border-slate-200 p-8 space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-purple-50 text-[#5e2be2] flex items-center justify-center mx-auto">
            <BookOpen className="w-7 h-7" />
          </div>
          <h3 className="text-lg font-bold text-slate-900">No blog submissions match your filter</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            {statusFilter === 'pending'
              ? 'Great news! All submitted consultant blogs have been reviewed.'
              : 'Try clearing your search or category filters to view other submissions.'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredPosts.map((post) => {
            const isPending = post.status === 'pending' || post.status === 'submitted';
            const isPublished = post.status === 'published' || post.status === 'approved';
            const isRejected = post.status === 'rejected';
            const attachment = post.fileUrl
              ? describeAttachment(post)
              : isLegacyPdfPost(post)
              ? describeAttachment({ ...post, fileName: post.fileName || (post.content?.trim().toLowerCase().endsWith('.pdf') ? post.content.trim() : null), isPdf: true })
              : null;

            return (
              <div
                key={post.id}
                className={`bg-white rounded-2xl border transition-all duration-200 overflow-hidden shadow-xs hover:shadow-md ${
                  isPending
                    ? 'border-amber-200 hover:border-amber-300 ring-1 ring-amber-100/50'
                    : isPublished
                    ? 'border-slate-200 hover:border-emerald-300'
                    : 'border-slate-200 hover:border-rose-300 opacity-80 hover:opacity-100'
                }`}
              >
                <div className="p-5 sm:p-6 flex flex-col md:flex-row md:items-center gap-6 justify-between">
                  {/* Left Column: Post Thumbnail & Details */}
                  <div className="flex items-start gap-4 min-w-0 flex-1">
                    {post.featuredImage ? (
                      <img
                        src={post.featuredImage}
                        alt={post.title}
                        className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl object-cover shrink-0 border border-slate-100 shadow-xs"
                      />
                    ) : (
                      <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-gradient-to-br from-[#5e2be2]/10 to-purple-100 flex items-center justify-center shrink-0 text-[#5e2be2]">
                        <BookOpen className="w-8 h-8" />
                      </div>
                    )}

                    <div className="space-y-2 min-w-0 flex-1">
                      {/* Status and Category badges */}
                      <div className="flex flex-wrap items-center gap-2">
                        {isPending && (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-amber-100 text-amber-800 border border-amber-200">
                            <Clock className="w-3.5 h-3.5 text-amber-600 animate-pulse" />
                            Pending Editorial Review
                          </span>
                        )}
                        {isPublished && (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-200">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            Approved
                          </span>
                        )}
                        {isRejected && (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-rose-100 text-rose-800 border border-rose-200">
                            <XCircle className="w-3.5 h-3.5 text-rose-600" />
                            Rejected / Revision
                          </span>
                        )}

                        {attachment && (
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold border ${
                              attachment.kind === 'pdf'
                                ? 'bg-rose-100 text-rose-700 border-rose-200'
                                : attachment.kind === 'word'
                                ? 'bg-blue-100 text-blue-700 border-blue-200'
                                : 'bg-slate-100 text-slate-700 border-slate-200'
                            }`}
                          >
                            <FileText className="w-3 h-3" />
                            {attachment.label}
                          </span>
                        )}

                        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700">
                          {post.category}
                        </span>

                        <span className="text-xs text-slate-400 font-medium">
                          • {formatRelativeTime(post.createdAt)}
                        </span>
                      </div>

                      {/* Title */}
                      <h3
                        onClick={() => openPost(post)}
                        className="text-base sm:text-lg font-extrabold text-slate-900 hover:text-[#5e2be2] cursor-pointer transition-colors leading-snug line-clamp-2"
                      >
                        {post.title}
                      </h3>

                      {/* Excerpt or PDF indicator */}
                      {attachment && isAttachmentPlaceholder(post.content, post.fileName) ? (
                        <p className={`text-xs font-semibold flex items-center gap-1.5 ${attachment.kind === 'word' ? 'text-blue-700' : attachment.kind === 'pdf' ? 'text-rose-700' : 'text-slate-700'}`}>
                          <FileText className="w-3.5 h-3.5 shrink-0" />
                          <span className="truncate">Attached {attachment.label}: {attachment.fileName}</span>
                          {attachment.sizeLabel && (
                            <span className="text-slate-400 font-normal">({attachment.sizeLabel})</span>
                          )}
                        </p>
                      ) : (
                        <p className="text-xs text-slate-500 line-clamp-2 font-medium leading-relaxed">
                          {richTextToPlain(post.content).replace(/[#*`_]/g, '')}
                        </p>
                      )}

                      {/* Author row & Tags */}
                      <div className="flex flex-wrap items-center gap-4 pt-1">
                        <div className="flex items-center gap-2">
                          <img
                            src={
                              post.authorAvatar ||
                              'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&w=100'
                            }
                            alt={post.author}
                            className="w-6 h-6 rounded-full object-cover ring-1 ring-purple-200"
                          />
                          <span className="text-xs font-bold text-slate-800">{post.author}</span>
                          <span className="text-[11px] text-slate-400">({post.authorRole})</span>
                        </div>

                        {post.tags && post.tags.length > 0 && (
                          <div className="hidden sm:flex items-center gap-1.5">
                            {post.tags.slice(0, 3).map((tag) => (
                              <span
                                key={tag}
                                className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-purple-50 text-purple-700"
                              >
                                #{tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Editorial notes if any */}
                      {post.reviewNotes && (
                        <div className="mt-2 p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 flex items-start gap-2">
                          <MessageSquare className="w-3.5 h-3.5 text-slate-400 mt-0.5 shrink-0" />
                          <div>
                            <span className="font-bold text-slate-800">Editorial Note: </span>
                            <span>{post.reviewNotes}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right Column: Action Buttons */}
                  <div className="flex items-center gap-2 shrink-0 self-end md:self-center border-t md:border-t-0 pt-3 md:pt-0 w-full md:w-auto justify-end">
                    <button
                      onClick={() => openPost(post)}
                      className="px-3.5 py-2 rounded-xl border border-slate-200 hover:border-[#5e2be2]/40 hover:bg-purple-50 text-slate-700 hover:text-[#5e2be2] text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Preview</span>
                    </button>

                    {isPending && (
                      <>
                        <button
                          onClick={() => handleApprove(post)}
                          disabled={actionLoadingId === post.id}
                          className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-sm hover:shadow-md flex items-center gap-1.5 cursor-pointer active:scale-95"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Approve</span>
                        </button>

                        <button
                          onClick={() => {
                            setRejectModalPost(post);
                            setRejectionNotes('');
                          }}
                          disabled={actionLoadingId === post.id}
                          className="px-3.5 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold transition-all border border-rose-200 flex items-center gap-1.5 cursor-pointer"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          <span>Reject</span>
                        </button>
                      </>
                    )}

                    {isPublished && (
                      <button
                        onClick={() => {
                          setRejectModalPost(post);
                          setRejectionNotes('');
                        }}
                        className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-600 text-xs font-semibold transition-all"
                      >
                        Revoke Approval
                      </button>
                    )}

                    {isRejected && (
                      <button
                        onClick={() => handleApprove(post)}
                        className="px-3 py-2 rounded-xl bg-purple-50 hover:bg-[#5e2be2] text-[#5e2be2] hover:text-white text-xs font-bold transition-all border border-purple-200"
                      >
                        Re-Approve
                      </button>
                    )}

                    <button
                      onClick={() => handleDelete(post)}
                      title="Delete post"
                      className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Outlines & Proposals Tab preview card at bottom */}
      {(outlines.length > 0 || outlinesError) && (
        <div className="mt-8 pt-6 border-t border-slate-200">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#5e2be2]" /> Blog Outlines & Proposals ({outlines.length})
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                Topics proposed by therapists before writing the full draft
              </p>
            </div>
          </div>

          {outlinesError && (
            <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>Outline proposals could not be loaded: {outlinesError}</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {outlines.map((outline) => {
              const attachment = outline.fileUrl ? describeAttachment(outline) : null;
              const outlineStatus = String(outline.status || 'pending').toLowerCase();
              const isOutlinePending = outlineStatus === 'pending' || outlineStatus === 'submitted';
              const isOutlineBusy = actionLoadingId === `outline-${outline.id}`;
              return (
                <div
                  key={outline.id}
                  className="p-5 bg-white rounded-2xl border border-slate-200 shadow-xs hover:border-[#5e2be2]/40 transition-all space-y-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-purple-100 text-[#5e2be2] uppercase">
                          Outline Proposal
                        </span>
                        {attachment && (
                          <span
                            className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border flex items-center gap-1 ${
                              attachment.kind === 'pdf'
                                ? 'bg-rose-100 text-rose-700 border-rose-200'
                                : attachment.kind === 'word'
                                ? 'bg-blue-100 text-blue-700 border-blue-200'
                                : 'bg-slate-100 text-slate-700 border-slate-200'
                            }`}
                          >
                            <FileText className="w-2.5 h-2.5" /> {attachment.label} attached
                          </span>
                        )}
                      </div>
                      <h4
                        onClick={() => openOutline(outline)}
                        className="text-sm font-bold text-slate-900 hover:text-[#5e2be2] cursor-pointer transition-colors"
                      >
                        {outline.proposedTitle}
                      </h4>
                    </div>
                    <span
                      className={`text-[11px] font-bold px-2 py-0.5 rounded-full shrink-0 capitalize ${
                        outlineStatus === 'approved'
                          ? 'bg-emerald-100 text-emerald-800'
                          : outlineStatus === 'rejected'
                          ? 'bg-rose-100 text-rose-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {outlineStatus}
                    </span>
                  </div>

                  <div className="text-xs text-slate-600 space-y-1">
                    <p className="font-semibold text-slate-700">Target Audience: <span className="font-normal">{outline.targetAudience}</span></p>
                    {(() => {
                      const points = (outline.keyPoints || []).filter(Boolean);
                      if (!points.length) return null;
                      return (
                        <p className="text-slate-500 line-clamp-2">
                          <span className="font-semibold text-slate-700">{points.length} key point{points.length === 1 ? '' : 's'}: </span>
                          {points.map((p) => richTextToPlain(p)).join(' · ')}
                        </p>
                      );
                    })()}
                  </div>

                  <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2 text-[11px] text-slate-400 font-medium">
                      <span>{outline.author}</span>
                      <span>• {formatRelativeTime(outline.createdAt)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => openOutline(outline)}
                        className="px-3 py-1.5 rounded-xl border border-slate-200 hover:border-[#5e2be2]/40 hover:bg-purple-50 text-slate-700 hover:text-[#5e2be2] text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>View</span>
                      </button>
                      {outlineStatus !== 'approved' && (
                        <button
                          type="button"
                          onClick={() => handleReviewOutline(outline, 'approved', 'Approved by Platform Editorial Admin.')}
                          disabled={isOutlineBusy}
                          className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>{isOutlinePending ? 'Approve' : 'Re-Approve'}</span>
                        </button>
                      )}
                      {outlineStatus !== 'rejected' && (
                        <button
                          type="button"
                          onClick={() => {
                            setRejectModalOutline(outline);
                            setRejectionNotes('');
                          }}
                          disabled={isOutlineBusy}
                          className="px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 disabled:opacity-60 text-rose-700 text-xs font-bold transition-all border border-rose-200 flex items-center gap-1.5 cursor-pointer"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          <span>{isOutlinePending ? 'Reject' : 'Revoke Approval'}</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      </>
      )}

      {/* ── FULL ARTICLE PAGE (/review/:postId) ───────────────── */}
      {isDetail && !selectedPost && !selectedOutline && (
        <div className="max-w-4xl mx-auto space-y-5">
          <button
            onClick={closePost}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-600 hover:text-[#5e2be2] hover:border-[#5e2be2]/40 transition-all cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to submissions
          </button>
          <div className="bg-white rounded-3xl border border-slate-200 p-10 text-center space-y-2">
            {loading ? (
              <>
                <RefreshCw className="w-6 h-6 text-[#5e2be2] animate-spin mx-auto" />
                <p className="text-sm font-semibold text-slate-600">{outlineId ? 'Loading outline…' : 'Loading article…'}</p>
              </>
            ) : (
              <>
                <BookOpen className="w-8 h-8 text-slate-300 mx-auto" />
                <p className="text-base font-bold text-slate-800">{outlineId ? 'Outline not found' : 'Article not found'}</p>
                <p className="text-xs text-slate-500">It may have been deleted. Go back to see all submissions.</p>
              </>
            )}
          </div>
        </div>
      )}

      {selectedPost && (() => {
        const isPending = selectedPost.status === 'pending' || selectedPost.status === 'submitted';
        const isPublished = selectedPost.status === 'published' || selectedPost.status === 'approved';
        const isRejected = selectedPost.status === 'rejected';
        return (
        <div className="max-w-4xl mx-auto space-y-5">
          {/* Page header */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <button
              onClick={closePost}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-600 hover:text-[#5e2be2] hover:border-[#5e2be2]/40 transition-all cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to submissions
            </button>
            <div className="flex items-center gap-2">
              {isPending && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-amber-100 text-amber-800 border border-amber-200">
                  <Clock className="w-3.5 h-3.5 text-amber-600" />
                  Pending Editorial Review
                </span>
              )}
              {isPublished && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-200">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  Approved
                </span>
              )}
              {isRejected && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-rose-100 text-rose-800 border border-rose-200">
                  <XCircle className="w-3.5 h-3.5 text-rose-600" />
                  Rejected / Revision
                </span>
              )}
            </div>
          </div>

          <article className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
            {selectedPost.featuredImage && (
              <img
                src={selectedPost.featuredImage}
                alt={selectedPost.title}
                className="w-full h-56 sm:h-80 object-cover"
              />
            )}

            <div className="p-5 sm:p-10 space-y-6">
              <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-2.5">
                  <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-[#5e2be2]/10 text-[#5e2be2]">
                    {selectedPost.category}
                  </span>
                  <span className="text-xs text-slate-400">
                    Submitted {formatRelativeTime(selectedPost.createdAt)}
                  </span>
                </div>

                <h1 className="text-2xl sm:text-4xl font-extrabold text-slate-900 leading-tight">
                  {selectedPost.title}
                </h1>

                {/* Author */}
                <div className="flex items-center gap-3">
                  <img
                    src={
                      selectedPost.authorAvatar ||
                      'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&w=100'
                    }
                    alt={selectedPost.author}
                    className="w-11 h-11 rounded-full object-cover ring-2 ring-purple-200 shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-slate-900 truncate">{selectedPost.author}</p>
                    <p className="text-xs text-slate-500 font-medium truncate">
                      {selectedPost.authorRole} • {selectedPost.authorEmail}
                    </p>
                  </div>
                </div>

                {/* Tags */}
                {selectedPost.tags && selectedPost.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {selectedPost.tags.map((t) => (
                      <span
                        key={t}
                        className="px-2.5 py-0.5 rounded-lg text-xs font-bold bg-slate-100 text-slate-700"
                      >
                        #{t}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {selectedPost.reviewNotes && !isPending && (
                <div className={`p-4 rounded-2xl border text-xs ${isRejected ? 'bg-rose-50 border-rose-200 text-rose-800' : 'bg-emerald-50 border-emerald-200 text-emerald-800'}`}>
                  <p className="font-bold mb-0.5">Editorial notes</p>
                  <p className="whitespace-pre-wrap">{selectedPost.reviewNotes}</p>
                </div>
              )}

              {/* Attachment (any type) and/or the written content */}
              {(() => {
                const fileUrl = selectedPost.fileUrl || '';
                const legacyPdf = isLegacyPdfPost(selectedPost);
                const attachment = fileUrl
                  ? describeAttachment(selectedPost)
                  : legacyPdf
                  ? describeAttachment({ ...selectedPost, fileName: selectedPost.fileName || selectedPost.content?.trim() || null, isPdf: true })
                  : null;
                const showContent = !attachment || !isAttachmentPlaceholder(selectedPost.content, attachment.fileName);
                const contentBlock = showContent && selectedPost.content ? (
                  <RichContent
                    value={selectedPost.content}
                    className="max-w-none text-[15px] sm:text-base text-slate-700 leading-8 font-serif border-t border-slate-100 pt-6"
                  />
                ) : null;

                if (!attachment) return contentBlock;

                return (
                  <div className="space-y-4 pt-2 border-t border-slate-100">
                    {fileUrl ? (
                      <AttachmentCard fileUrl={fileUrl} info={attachment} />
                    ) : (
                      <div className="p-6 rounded-2xl border border-dashed border-rose-200 bg-rose-50/40 text-center space-y-1.5">
                        <p className="text-xs font-bold text-rose-800">Attached PDF Document: {attachment.fileName}</p>
                        <p className="text-[11px] text-slate-500 max-w-md mx-auto">
                          This older submission references a PDF but the file itself was not stored, so it cannot be opened here.
                        </p>
                      </div>
                    )}

                    {fileUrl && attachment.kind === 'pdf' && activeBlobUrl && (
                      <div className="rounded-2xl overflow-hidden border border-slate-200 bg-slate-100 shadow-inner">
                        <object
                          data={`${activeBlobUrl}#toolbar=1&navpanes=1&scrollbar=1`}
                          type="application/pdf"
                          className="w-full h-[380px] sm:h-[460px] border-none"
                        >
                          <iframe
                            src={`${activeBlobUrl}#toolbar=1`}
                            className="w-full h-[380px] sm:h-[460px] border-none"
                            title={attachment.fileName}
                          />
                        </object>
                      </div>
                    )}

                    {fileUrl && attachment.kind === 'image' && (
                      <img
                        src={activeBlobUrl || fileUrl}
                        alt={attachment.fileName}
                        className="w-full max-h-[460px] object-contain rounded-2xl border border-slate-200 bg-slate-50"
                      />
                    )}

                    {fileUrl && attachment.kind === 'word' && (
                      <div className="p-4 rounded-2xl border border-dashed border-blue-200 bg-blue-50/40 text-center space-y-1">
                        <p className="text-xs font-bold text-blue-800">Word documents can't be previewed in the browser.</p>
                        <p className="text-[11px] text-slate-500">Use Download to open {attachment.fileName} in Word or another document app.</p>
                      </div>
                    )}

                    {fileUrl && (attachment.kind === 'text' || attachment.kind === 'other') && (
                      <p className="text-[11px] text-slate-500 text-center">
                        Use Open or Download to view {attachment.fileName}.
                      </p>
                    )}

                    {contentBlock}
                  </div>
                );
              })()}
            </div>
          </article>

          {/* Review actions stay in reach while reading */}
          <div className="sticky bottom-4 z-20 px-4 sm:px-5 py-3 rounded-2xl border border-slate-200 bg-white/95 backdrop-blur shadow-lg flex flex-wrap items-center justify-between gap-2">
              <button
                onClick={() => handleDelete(selectedPost)}
                disabled={actionLoadingId === selectedPost.id}
                className="px-3.5 py-2 rounded-xl text-xs font-bold text-slate-500 hover:text-rose-700 hover:bg-rose-50 transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                Delete
              </button>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setRejectModalPost(selectedPost);
                    setRejectionNotes('');
                  }}
                  className="px-3.5 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold transition-all border border-rose-200 cursor-pointer"
                >
                  Reject with Feedback
                </button>

                <button
                  onClick={() => handleApprove(selectedPost)}
                  disabled={actionLoadingId === selectedPost.id || isPublished}
                  className="px-4 py-2 rounded-xl bg-[#5e2be2] hover:bg-[#4f28d9] disabled:opacity-60 disabled:cursor-default text-white text-xs font-bold shadow-md shadow-[#5e2be2]/25 transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{isPublished ? 'Approved' : 'Approve Article'}</span>
                </button>
              </div>
          </div>
        </div>
        );
      })()}

      {/* ── FULL OUTLINE PAGE (/review/outline/:outlineId) ────── */}
      {selectedOutline && (() => {
        const outline = selectedOutline;
        const outlineStatus = String(outline.status || 'pending').toLowerCase();
        const isOutlinePending = outlineStatus === 'pending' || outlineStatus === 'submitted';
        const isOutlineBusy = actionLoadingId === `outline-${outline.id}`;
        const attachment = outline.fileUrl ? describeAttachment(outline) : null;
        const points = (outline.keyPoints || []).filter(Boolean);
        const keywords = (outline.keywords || []).map((k) => String(k).trim()).filter(Boolean);
        const initials = (outline.author || '?')
          .replace(/^(dr|mr|mrs|ms)\.?\s+/i, '')
          .split(/\s+/)
          .slice(0, 2)
          .map((w) => w[0]?.toUpperCase())
          .join('');
        return (
        <div className="max-w-4xl mx-auto space-y-5">
          {/* Page header */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <button
              onClick={closePost}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-600 hover:text-[#5e2be2] hover:border-[#5e2be2]/40 transition-all cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to submissions
            </button>
            {isOutlinePending && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-amber-100 text-amber-800 border border-amber-200">
                <Clock className="w-3.5 h-3.5 text-amber-600" />
                Pending Editorial Review
              </span>
            )}
            {outlineStatus === 'approved' && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-200">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                Approved
              </span>
            )}
            {outlineStatus === 'rejected' && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-rose-100 text-rose-800 border border-rose-200">
                <XCircle className="w-3.5 h-3.5 text-rose-600" />
                Rejected / Revision
              </span>
            )}
          </div>

          <article className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-5 sm:p-10 space-y-7">
              <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-2.5">
                  <span className="text-xs font-extrabold px-2.5 py-0.5 rounded-full bg-purple-100 text-[#5e2be2] uppercase">
                    Outline Proposal
                  </span>
                  <span className="text-xs text-slate-400">
                    Submitted {formatRelativeTime(outline.createdAt)}
                  </span>
                </div>

                <h1 className="text-2xl sm:text-4xl font-extrabold text-slate-900 leading-tight">
                  {outline.proposedTitle}
                </h1>

                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-full bg-gradient-to-br from-[#5e2be2] to-[#986af0] text-white text-sm font-extrabold flex items-center justify-center shrink-0">
                    {initials}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-slate-900 truncate">{outline.author}</p>
                    <p className="text-xs text-slate-500 font-medium truncate">
                      {[outline.authorRole, outline.authorEmail].filter(Boolean).join(' • ')}
                    </p>
                  </div>
                </div>
              </div>

              {outline.reviewNotes && !isOutlinePending && (
                <div className={`p-4 rounded-2xl border text-xs ${outlineStatus === 'rejected' ? 'bg-rose-50 border-rose-200 text-rose-800' : 'bg-emerald-50 border-emerald-200 text-emerald-800'}`}>
                  <p className="font-bold mb-0.5">Editorial notes</p>
                  <p className="whitespace-pre-wrap">{outline.reviewNotes}</p>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-slate-100 pt-6">
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                  <p className="text-[11px] font-extrabold uppercase tracking-wide text-slate-400 mb-1">Target audience</p>
                  <p className="text-sm font-semibold text-slate-800">{outline.targetAudience || '—'}</p>
                </div>
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                  <p className="text-[11px] font-extrabold uppercase tracking-wide text-slate-400 mb-1.5">Keywords</p>
                  {keywords.length ? (
                    <div className="flex flex-wrap gap-1.5">
                      {keywords.map((k) => (
                        <span key={k} className="px-2.5 py-0.5 rounded-lg text-xs font-bold bg-white border border-slate-200 text-slate-700">
                          #{k}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-slate-400">—</p>
                  )}
                </div>
              </div>

              {points.length > 0 && (
                <section className="space-y-3">
                  <h2 className="text-lg font-extrabold text-slate-900">Key points to cover</h2>
                  <ol className="space-y-2.5">
                    {points.map((p, i) => (
                      <li key={i} className="flex items-start gap-3">
                        <span className="w-6 h-6 rounded-full bg-[#5e2be2]/10 text-[#5e2be2] text-xs font-extrabold flex items-center justify-center shrink-0 mt-0.5">
                          {i + 1}
                        </span>
                        <RichInline value={p} className="text-[15px] sm:text-base text-slate-700 leading-7" />
                      </li>
                    ))}
                  </ol>
                </section>
              )}

              {outline.notes && !isAttachmentPlaceholder(outline.notes, outline.fileName) && (
                <section className="space-y-2">
                  <h2 className="text-lg font-extrabold text-slate-900">Additional notes</h2>
                  <p className="text-[15px] sm:text-base text-slate-700 leading-7 whitespace-pre-wrap">{outline.notes}</p>
                </section>
              )}

              {outline.fileUrl && attachment && (
                <section className="space-y-3">
                  <h2 className="text-lg font-extrabold text-slate-900">Attachment</h2>
                  <AttachmentCard fileUrl={outline.fileUrl} info={attachment} />
                  {attachment.kind === 'pdf' && activeBlobUrl && (
                    <div className="rounded-2xl overflow-hidden border border-slate-200 bg-slate-100 shadow-inner">
                      <iframe
                        src={`${activeBlobUrl}#toolbar=1`}
                        className="w-full h-[460px] border-none"
                        title={attachment.fileName}
                      />
                    </div>
                  )}
                  {attachment.kind === 'image' && (
                    <img
                      src={activeBlobUrl || outline.fileUrl}
                      alt={attachment.fileName}
                      className="w-full max-h-[460px] object-contain rounded-2xl border border-slate-200 bg-slate-50"
                    />
                  )}
                </section>
              )}
            </div>
          </article>

          {/* Review actions stay in reach while reading */}
          <div className="sticky bottom-4 z-20 px-4 sm:px-5 py-3 rounded-2xl border border-slate-200 bg-white/95 backdrop-blur shadow-lg flex flex-wrap items-center justify-end gap-2">
            {outlineStatus !== 'rejected' && (
              <button
                type="button"
                onClick={() => {
                  setRejectModalOutline(outline);
                  setRejectionNotes('');
                }}
                disabled={isOutlineBusy}
                className="px-3.5 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 disabled:opacity-60 text-rose-700 text-xs font-bold transition-all border border-rose-200 flex items-center gap-1.5 cursor-pointer"
              >
                <XCircle className="w-4 h-4" />
                <span>{isOutlinePending ? 'Reject with Feedback' : 'Revoke Approval'}</span>
              </button>
            )}
            {outlineStatus !== 'approved' && (
              <button
                type="button"
                onClick={() => handleReviewOutline(outline, 'approved', 'Approved by Platform Editorial Admin.')}
                disabled={isOutlineBusy}
                className="px-4 py-2 rounded-xl bg-[#5e2be2] hover:bg-[#4f28d9] disabled:opacity-60 text-white text-xs font-bold shadow-md shadow-[#5e2be2]/25 transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{isOutlinePending ? 'Approve Outline' : 'Re-Approve'}</span>
              </button>
            )}
          </div>
        </div>
        );
      })()}

      {/* ── REJECTION / FEEDBACK MODAL ───────────────────────── */}
      {(rejectModalPost || rejectModalOutline) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/80 backdrop-blur-sm animate-fade-in overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-md w-full p-5 sm:p-6 space-y-3.5 shadow-2xl border border-slate-200 my-auto max-h-[80vh] overflow-y-auto animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-slate-900">Request Revision / Reject</h3>
                <p className="text-xs text-slate-500 font-medium">Send editorial feedback to the author</p>
              </div>
            </div>

            <p className="text-xs text-slate-600">
              You are reviewing <span className="font-bold text-slate-800">"{rejectModalPost ? rejectModalPost.title : rejectModalOutline?.proposedTitle}"</span> by {(rejectModalPost || rejectModalOutline)?.author}.
            </p>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Editorial Feedback / Required Changes:</label>
              <textarea
                value={rejectionNotes}
                onChange={(e) => setRejectionNotes(e.target.value)}
                placeholder="E.g., Please add clinical citations for CBT techniques and soften language in section 2..."
                rows={4}
                className="w-full p-3 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-400"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setRejectModalPost(null);
                  setRejectModalOutline(null);
                }}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={rejectModalPost ? handleRejectConfirm : handleRejectOutlineConfirm}
                disabled={rejectModalPost ? actionLoadingId === rejectModalPost.id : actionLoadingId === `outline-${rejectModalOutline?.id}`}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-all shadow-sm active:scale-95 cursor-pointer"
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReviewView;
