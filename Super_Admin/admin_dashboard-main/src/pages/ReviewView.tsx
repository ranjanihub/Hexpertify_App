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
  X,
  MessageSquare
} from 'lucide-react';

export interface BlogPostItem {
  id: string | number;
  _id?: string;
  title: string;
  category: string;
  tags?: string[];
  content: string;
  featuredImage?: string | null;
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
  status: 'pending' | 'approved' | 'rejected';
  author: string;
  authorEmail: string;
  authorRole: string;
  reviewNotes?: string;
  createdAt: string;
}

export const ReviewView: React.FC = () => {
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'published' | 'rejected'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');

  const [posts, setPosts] = useState<BlogPostItem[]>([]);
  const [outlines, setOutlines] = useState<BlogOutlineItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState<string | number | null>(null);

  // Modals
  const [selectedPost, setSelectedPost] = useState<BlogPostItem | null>(null);
  const [rejectModalPost, setRejectModalPost] = useState<BlogPostItem | null>(null);
  const [rejectionNotes, setRejectionNotes] = useState('');

  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  const fetchBlogs = async () => {
    try {
      setLoading(true);
      const [postsRes, outlinesRes] = await Promise.all([
        fetch('/api/blog/posts'),
        fetch('/api/blog/outlines')
      ]);

      if (postsRes.ok) {
        const postsData = await postsRes.json();
        setPosts(Array.isArray(postsData) ? postsData : []);
      }
      if (outlinesRes.ok) {
        const outlinesData = await outlinesRes.json();
        setOutlines(Array.isArray(outlinesData) ? outlinesData : []);
      }
    } catch (err) {
      console.error('Error loading blog submissions:', err);
      showToast('Failed to load blog submissions', 'error');
    } finally {
      setLoading(false);
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
          status: 'published',
          reviewNotes: 'Approved by Platform Editorial Admin. Post is now published.',
          reviewedBy: 'Super Admin'
        })
      });

      if (res.ok) {
        showToast(`"${post.title}" approved and published successfully!`);
        setPosts((prev) =>
          prev.map((p) =>
            p.id === post.id
              ? {
                  ...p,
                  status: 'published',
                  reviewNotes: 'Approved by Platform Editorial Admin. Post is now published.',
                  reviewedAt: new Date().toISOString()
                }
              : p
          )
        );
        if (selectedPost && selectedPost.id === post.id) {
          setSelectedPost((prev) => prev ? { ...prev, status: 'published' } : null);
        }
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
        if (selectedPost && selectedPost.id === rejectModalPost.id) {
          setSelectedPost((prev) => prev ? { ...prev, status: 'rejected' } : null);
        }
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
      const res = await fetch(`/api/blog/posts/${post.id}`, { method: 'DELETE' });
      if (res.ok) {
        showToast('Blog submission removed.');
        setPosts((prev) => prev.filter((p) => p.id !== post.id));
        if (selectedPost?.id === post.id) setSelectedPost(null);
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
              Review psychoeducational articles and outline pitches submitted by licensed therapists.
              Approve verified content to publish live across the Hexpertify patient portal.
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
              Approved / Published
            </span>
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <p className="text-3xl font-extrabold text-emerald-900 mt-2">{publishedCount}</p>
          <p className="text-xs text-emerald-800/80 font-medium mt-1">Live on Hexpertify</p>
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
            <span>Approved & Live ({publishedCount})</span>
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
                            Approved & Live
                          </span>
                        )}
                        {isRejected && (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-rose-100 text-rose-800 border border-rose-200">
                            <XCircle className="w-3.5 h-3.5 text-rose-600" />
                            Rejected / Revision
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
                        onClick={() => setSelectedPost(post)}
                        className="text-base sm:text-lg font-extrabold text-slate-900 hover:text-[#5e2be2] cursor-pointer transition-colors leading-snug line-clamp-2"
                      >
                        {post.title}
                      </h3>

                      {/* Excerpt */}
                      <p className="text-xs text-slate-500 line-clamp-2 font-medium leading-relaxed">
                        {post.content.replace(/[#*`_]/g, '')}
                      </p>

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
                      onClick={() => setSelectedPost(post)}
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
                          <span>Approve & Publish</span>
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
                        Revoke / Unpublish
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

      {/* Outlines & Pitches Tab preview card at bottom */}
      {outlines.length > 0 && (
        <div className="mt-8 pt-6 border-t border-slate-200">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#5e2be2]" /> Pitch Outlines & PDF Proposals ({outlines.length})
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                Topics pitched by therapists before writing the full draft
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {outlines.map((outline) => (
              <div
                key={outline.id}
                className="p-5 bg-white rounded-2xl border border-slate-200 shadow-xs hover:border-[#5e2be2]/40 transition-all space-y-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-purple-100 text-[#5e2be2] uppercase">
                      Outline Pitch
                    </span>
                    <h4 className="text-sm font-bold text-slate-900">{outline.proposedTitle}</h4>
                  </div>
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                    {outline.status}
                  </span>
                </div>

                <div className="text-xs text-slate-600 space-y-1">
                  <p className="font-semibold text-slate-700">Target Audience: <span className="font-normal">{outline.targetAudience}</span></p>
                  <div className="space-y-1 pt-1">
                    <p className="font-semibold text-slate-700">Key Points:</p>
                    <ul className="list-disc list-inside space-y-0.5 pl-1 text-slate-500">
                      {outline.keyPoints?.map((p, i) => (
                        <li key={i} className="truncate">{p}</li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[11px] text-slate-400 font-medium">{outline.author}</span>
                  <span className="text-[11px] text-slate-400">{formatRelativeTime(outline.createdAt)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── FULL ARTICLE PREVIEW MODAL ───────────────────────── */}
      {selectedPost && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-3">
                <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-[#5e2be2]/10 text-[#5e2be2]">
                  {selectedPost.category}
                </span>
                <span className="text-xs text-slate-400">
                  Submitted {formatRelativeTime(selectedPost.createdAt)}
                </span>
              </div>
              <button
                onClick={() => setSelectedPost(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/50 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-6">
              {selectedPost.featuredImage && (
                <img
                  src={selectedPost.featuredImage}
                  alt={selectedPost.title}
                  className="w-full h-64 object-cover rounded-2xl shadow-sm border border-slate-100"
                />
              )}

              <div>
                <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 leading-tight">
                  {selectedPost.title}
                </h2>

                {/* Author Card */}
                <div className="flex items-center gap-3 mt-4 p-3 rounded-2xl bg-slate-50 border border-slate-100">
                  <img
                    src={
                      selectedPost.authorAvatar ||
                      'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&w=100'
                    }
                    alt={selectedPost.author}
                    className="w-10 h-10 rounded-full object-cover ring-2 ring-purple-200"
                  />
                  <div>
                    <p className="text-xs font-bold text-slate-900">{selectedPost.author}</p>
                    <p className="text-[11px] text-slate-500 font-medium">
                      {selectedPost.authorRole} • {selectedPost.authorEmail}
                    </p>
                  </div>
                </div>
              </div>

              {/* Tags */}
              {selectedPost.tags && selectedPost.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {selectedPost.tags.map((t) => (
                    <span
                      key={t}
                      className="px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-100 text-slate-700"
                    >
                      #{t}
                    </span>
                  ))}
                </div>
              )}

              {/* Full Content */}
              <div className="prose prose-slate max-w-none text-sm text-slate-700 leading-relaxed whitespace-pre-wrap font-serif border-t border-slate-100 pt-6">
                {selectedPost.content}
              </div>
            </div>

            {/* Modal Footer Actions */}
            <div className="p-5 border-t border-slate-100 bg-slate-50 flex items-center justify-between gap-3">
              <button
                onClick={() => setSelectedPost(null)}
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-200/50 transition-all"
              >
                Close Preview
              </button>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    const post = selectedPost;
                    setSelectedPost(null);
                    setRejectModalPost(post);
                    setRejectionNotes('');
                  }}
                  className="px-4 py-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold transition-all border border-rose-200"
                >
                  Reject with Feedback
                </button>

                <button
                  onClick={() => handleApprove(selectedPost)}
                  disabled={actionLoadingId === selectedPost.id}
                  className="px-5 py-2.5 rounded-xl bg-[#5e2be2] hover:bg-[#4f28d9] text-white text-xs font-bold shadow-md shadow-[#5e2be2]/25 transition-all active:scale-95 flex items-center gap-2"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Approve & Publish Article</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── REJECTION / FEEDBACK MODAL ───────────────────────── */}
      {rejectModalPost && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95">
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
              You are reviewing <span className="font-bold text-slate-800">"{rejectModalPost.title}"</span> by {rejectModalPost.author}.
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
                onClick={() => setRejectModalPost(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRejectConfirm}
                disabled={actionLoadingId === rejectModalPost.id}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-all shadow-sm active:scale-95"
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
