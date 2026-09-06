import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  Search,
  X,
  Plus,
  Edit,
  Trash2,
  Eye,
  Globe,
  FileCode,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  Download,
  Code,
  Sparkles,
  ArrowLeft,
  Search as SearchIcon,
  ChevronLeft,
  ChevronRight,
  CheckSquare,
  Play,
  FileText
} from 'lucide-react';
import type { ZombiPage } from '../types';

export const ZombiView: React.FC = () => {
  // Main Pages State from MongoDB Atlas (100% dynamic)
  const [zombiPagesList, setZombiPagesList] = useState<ZombiPage[]>(() => {
    const saved = localStorage.getItem('hexpertify_zombie_pages');
    return saved ? JSON.parse(saved) : [];
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);

  // Fetch live from MongoDB Atlas Collection: zombie_pages
  useEffect(() => {
    const fetchZombiePages = async () => {
      try {
        let res = await fetch('/api/admin/zombie-pages').catch(() => null);
        if (!res || !res.ok) {
          res = await fetch('http://localhost:5000/api/admin/zombie-pages').catch(() => null);
        }
        if (res && res.ok) {
          const data = await res.json();
          const pagesList = Array.isArray(data?.zombiePages) ? data.zombiePages : Array.isArray(data?.pages) ? data.pages : [];
          if (pagesList.length > 0) {
            setZombiPagesList(pagesList);
            try {
              localStorage.setItem('hexpertify_zombie_pages', JSON.stringify(pagesList));
            } catch {}
          }
        }
      } catch {}
    };
    fetchZombiePages();
  }, []);

  // View Mode: 'list' | 'editor' | 'preview'
  const [viewMode, setViewMode] = useState<'list' | 'editor' | 'preview'>('list');


  // Currently editing/inspecting page object
  const [editingPageId, setEditingPageId] = useState<string | null>(null);
  const [inspectingPage, setInspectingPage] = useState<ZombiPage | null>(null);
  const [deletingPage, setDeletingPage] = useState<ZombiPage | null>(null);

  // Editor Sub-Tab: 'all' | 'details' | 'html' | 'seo'
  const [editorSection, setEditorSection] = useState<'all' | 'details' | 'html' | 'seo'>('all');
  const [htmlPreviewMode, setHtmlPreviewMode] = useState<'code' | 'rendered'>('code');

  // Form state for Full-Page Editor
  const [formData, setFormData] = useState<Partial<ZombiPage>>({
    pageTitle: '',
    slug: '',
    targetUrl: '',
    htmlChunk: '',
    status: 'Draft',
    seo: {
      metaTitle: '',
      metaDescription: '',
      keywords: '',
      canonicalUrl: '',
      ogTitle: '',
      ogDescription: '',
      ogImageUrl: '',
      ogImageAltText: '',
      structuredData: ''
    }
  });

  // Toast Notification state
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'warning' } | null>(null);

  const showToast = (text: string, type: 'success' | 'warning' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleCopyUrl = (url: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    navigator.clipboard.writeText(url);
    setCopiedUrl(url);
    setTimeout(() => setCopiedUrl(null), 2000);
    showToast('Target URL copied to clipboard!', 'success');
  };

  const handleToggleLive = (id: string, targetStatus: 'Active' | 'Draft', e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const today = new Date().toISOString().split('T')[0];
    setZombiPagesList((prev) => {
      const updated = prev.map((p) => (p.id === id ? { ...p, status: targetStatus, updatedAt: today } : p));
      try {
        localStorage.setItem('hexpertify_zombie_pages', JSON.stringify(updated));
      } catch {}
      return updated;
    });

    // Persist to MongoDB Atlas collection: zombie_pages
    fetch('/api/admin/zombie-pages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status: targetStatus, updatedAt: today })
    }).catch(() => {
      fetch('http://localhost:5000/api/admin/zombie-pages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: targetStatus, updatedAt: today })
      }).catch(() => {});
    });

    if (targetStatus === 'Active') {
      showToast(`Zombie Page ${id} is now LIVE & Saved to MongoDB Atlas (zombie_pages)!`, 'success');
    } else {
      showToast(`Zombie Page ${id} moved to Draft in MongoDB Atlas.`, 'warning');
    }
  };

  const handleOpenCreatePage = () => {
    setEditingPageId(null);
    setFormData({
      pageTitle: '',
      slug: '',
      targetUrl: '',
      htmlChunk: '',
      status: 'Draft',
      seo: {
        metaTitle: '',
        metaDescription: '',
        keywords: '',
        canonicalUrl: '',
        ogTitle: '',
        ogDescription: '',
        ogImageUrl: '',
        ogImageAltText: '',
        structuredData: ''
      }
    });
    setEditorSection('all');
    setViewMode('editor');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };


  const handleOpenEditPage = (page: ZombiPage) => {
    setEditingPageId(page.id);
    setFormData(JSON.parse(JSON.stringify(page)));
    setEditorSection('all');
    setViewMode('editor');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleOpenPreviewPage = (page: ZombiPage) => {
    setInspectingPage(page);
    setViewMode('preview');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleTitleOrSlugChange = (field: 'pageTitle' | 'slug', val: string) => {
    if (field === 'pageTitle') {
      const generatedSlug = '/' + val.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
      setFormData((prev: any) => {
        const newSlug = prev?.slug && prev.slug !== '/' ? prev.slug : generatedSlug;
        const target = `https://hexpertify.com${newSlug}`;
        return {
          ...prev,
          pageTitle: val,
          slug: newSlug,
          targetUrl: target,
          seo: {
            ...prev.seo!,
            metaTitle: prev.seo?.metaTitle || (val ? `${val} | Hexpertify Online Therapy` : ''),
            metaDescription: prev.seo?.metaDescription || (val ? `Book confidential video sessions for ${val} on Hexpertify. Verified clinical psychologists & counselors.` : ''),
            canonicalUrl: prev.seo?.canonicalUrl || target
          }
        };
      });
    } else {
      const cleanSlug = val.startsWith('/') ? val : '/' + val;
      const target = `https://hexpertify.com${cleanSlug}`;
      setFormData((prev: any) => ({
        ...prev,
        slug: cleanSlug,
        targetUrl: target,
        seo: {
          ...prev.seo!,
          canonicalUrl: prev.seo?.canonicalUrl || target
        }
      }));
    }
  };

  const handleSavePage = (overrideStatus?: 'Draft' | 'Active' | 'Archived', e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!formData.pageTitle || !formData.slug) {
      showToast('Please provide a Page Title and Slug.', 'warning');
      return;
    }

    const cleanSlug = formData.slug.startsWith('/') ? formData.slug : '/' + formData.slug;
    const finalTargetUrl = formData.targetUrl || `https://hexpertify.com${cleanSlug}`;
    const today = new Date().toISOString().split('T')[0];
    const finalStatus = overrideStatus || formData.status || 'Draft';

    if (editingPageId) {
      // Update existing
      const updated: ZombiPage = {
        id: editingPageId,
        pageTitle: formData.pageTitle,
        slug: cleanSlug,
        targetUrl: finalTargetUrl,
        htmlChunk: formData.htmlChunk || '',
        status: finalStatus as any,
        createdAt: formData.createdAt || today,
        updatedAt: today,
        viewsCount: formData.viewsCount || 0,
        seo: {
          metaTitle: formData.seo?.metaTitle || `${formData.pageTitle} | Hexpertify`,
          metaDescription: formData.seo?.metaDescription || '',
          keywords: formData.seo?.keywords || '',
          canonicalUrl: formData.seo?.canonicalUrl || finalTargetUrl,
          ogTitle: formData.seo?.ogTitle || formData.seo?.metaTitle,
          ogDescription: formData.seo?.ogDescription || formData.seo?.metaDescription,
          ogImageUrl: formData.seo?.ogImageUrl || '',
          ogImageAltText: formData.seo?.ogImageAltText || '',
          structuredData: formData.seo?.structuredData || ''
        }
      };

      setZombiPagesList((prev) => {
        const next = prev.map((p) => (p.id === editingPageId ? updated : p));
        try {
          localStorage.setItem('hexpertify_zombie_pages', JSON.stringify(next));
        } catch {}
        return next;
      });

      // Persist to MongoDB Atlas collection: zombie_pages
      fetch('/api/admin/zombie-pages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated)
      }).catch(() => {
        fetch('http://localhost:5000/api/admin/zombie-pages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updated)
        }).catch(() => {});
      });

      if (finalStatus === 'Active') {
        showToast(`Zombie Page ${updated.id} published & saved to DB (zombie_pages)!`, 'success');
      } else {
        showToast(`Zombie Page ${updated.id} saved in Draft mode in DB (zombie_pages).`, 'warning');
      }
    } else {
      // Create new
      const nextNum = 100 + zombiPagesList.length + 1;
      const created: ZombiPage = {
        id: `ZMB-${nextNum}`,
        pageTitle: formData.pageTitle,
        slug: cleanSlug,
        targetUrl: finalTargetUrl,
        htmlChunk: formData.htmlChunk || '',
        status: finalStatus as any,
        createdAt: today,
        updatedAt: today,
        viewsCount: 0,
        seo: {
          metaTitle: formData.seo?.metaTitle || `${formData.pageTitle} | Hexpertify`,
          metaDescription: formData.seo?.metaDescription || '',
          keywords: formData.seo?.keywords || '',
          canonicalUrl: formData.seo?.canonicalUrl || finalTargetUrl,
          ogTitle: formData.seo?.ogTitle || formData.seo?.metaTitle,
          ogDescription: formData.seo?.ogDescription || formData.seo?.metaDescription,
          ogImageUrl: formData.seo?.ogImageUrl || '',
          ogImageAltText: formData.seo?.ogImageAltText || '',
          structuredData: formData.seo?.structuredData || ''
        }
      };

      setZombiPagesList((prev) => {
        const next = [created, ...prev];
        try {
          localStorage.setItem('hexpertify_zombie_pages', JSON.stringify(next));
        } catch {}
        return next;
      });

      // Persist to MongoDB Atlas collection: zombie_pages
      fetch('/api/admin/zombie-pages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(created)
      }).catch(() => {
        fetch('http://localhost:5000/api/admin/zombie-pages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(created)
        }).catch(() => {});
      });

      if (finalStatus === 'Active') {
        showToast(`Zombie Page ${created.id} created & saved to DB (zombie_pages)!`, 'success');
      } else {
        showToast(`Zombie Page ${created.id} saved as Draft in DB (zombie_pages)!`, 'warning');
      }
    }

    setViewMode('list');
  };

  const handleDeletePage = (id: string) => {
    const target = zombiPagesList.find((p) => p.id === id);
    setZombiPagesList((prev) => {
      const next = prev.filter((p) => p.id !== id);
      try {
        localStorage.setItem('hexpertify_zombie_pages', JSON.stringify(next));
      } catch {}
      return next;
    });
    setDeletingPage(null);

    // Delete from MongoDB Atlas collection: zombie_pages
    fetch(`/api/admin/zombie-pages?id=${encodeURIComponent(id)}`, {
      method: 'DELETE'
    }).catch(() => {
      fetch(`http://localhost:5000/api/admin/zombie-pages?id=${encodeURIComponent(id)}`, {
        method: 'DELETE'
      }).catch(() => {});
    });

    showToast(`Zombie Page ${target?.id || id} deleted from DB (zombie_pages).`, 'warning');
  };

  const handleInsertHtmlPreset = (preset: 'hero' | 'cta' | 'faq' | 'doctor') => {
    let chunk = '';
    if (preset === 'hero') {
      chunk = `<section class="zombi-hero bg-gradient-to-br from-[#4f28d9] via-[#5e2be2] to-[#3b1799] text-white p-8 rounded-3xl my-4 shadow-xl">
  <div class="max-w-2xl">
    <span class="bg-white/20 text-purple-100 text-[11px] px-3 py-1 rounded-full font-bold uppercase tracking-wider border border-white/20">Programmatic SEO Landing</span>
    <h1 class="text-3xl font-extrabold mt-3 tracking-tight">Top Certified Therapy & Counseling Services</h1>
    <p class="text-purple-100 text-xs mt-2 leading-relaxed">Book confidential video consultation sessions with top licensed clinical psychologists on Hexpertify.</p>
    <div class="mt-6 flex flex-wrap gap-3">
      <a href="/bookings" class="px-5 py-3 bg-white text-[#4f28d9] rounded-xl font-extrabold text-xs shadow-md hover:bg-purple-50 transition-all">Book Instant Session</a>
    </div>
  </div>
</section>`;
    } else if (preset === 'cta') {
      chunk = `<div class="bg-slate-900 text-white p-6 rounded-2xl border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 my-4">
  <div>
    <h3 class="text-lg font-bold text-white">Need Support Right Now?</h3>
    <p class="text-xs text-slate-400 mt-0.5">Verified therapists are online and available for confidential 1-on-1 calls.</p>
  </div>
  <a href="/bookings" class="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white font-extrabold text-xs rounded-xl shadow-md whitespace-nowrap">Schedule Session</a>
</div>`;
    } else if (preset === 'faq') {
      chunk = `<div class="space-y-3 my-4 bg-purple-50/60 p-5 rounded-2xl border border-purple-100">
  <h4 class="font-extrabold text-purple-900 text-sm">Frequently Asked Questions</h4>
  <div class="bg-white p-3.5 rounded-xl border border-purple-100/80">
    <p class="font-bold text-xs text-slate-800">Q: Are online sessions on Hexpertify completely private?</p>
    <p class="text-xs text-slate-600 mt-1">A: Yes, all consultations are 100% confidential and conducted over end-to-end encrypted video channels.</p>
  </div>
  <div class="bg-white p-3.5 rounded-xl border border-purple-100/80">
    <p class="font-bold text-xs text-slate-800">Q: Can I reschedule or cancel my booking?</p>
    <p class="text-xs text-slate-600 mt-1">A: You can reschedule any session up to 4 hours before the appointment directly from your client dashboard.</p>
  </div>
</div>`;
    } else if (preset === 'doctor') {
      chunk = `<div class="bg-white border border-purple-100 p-6 rounded-2xl shadow-xs my-4 flex flex-col sm:flex-row items-center gap-5">
  <img src="https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=400" alt="Specialist Doctor" class="w-20 h-20 rounded-2xl object-cover border-2 border-purple-200" />
  <div class="space-y-1 text-center sm:text-left">
    <span class="text-[10px] font-bold text-purple-600 uppercase tracking-wider bg-purple-50 px-2 py-0.5 rounded-md">Lead Clinical Psychologist</span>
    <h4 class="text-base font-bold text-slate-900">Dr. Evelyn Reed, PhD</h4>
    <p class="text-xs text-slate-500">12+ years experience in Anxiety, CBT & Trauma Recovery. Over 1,400+ sessions completed.</p>
  </div>
</div>`;
    }

    setFormData((prev: any) => ({
      ...prev,
      htmlChunk: prev.htmlChunk ? prev.htmlChunk + '\n\n' + chunk : chunk
    }));
    showToast(`Inserted ${preset.toUpperCase()} HTML preset!`, 'success');
  };

  const handleExportCSV = () => {
    const dataToExport = filteredPages.length > 0 ? filteredPages : zombiPagesList;
    const headers = [
      'Zombie Page ID',
      'Page Title',
      'Slug',
      'Target URL',
      'Status',
      'Meta Title',
      'Meta Description',
      'Keywords',
      'Canonical URL',
      'Organic Views',
      'Created At',
      'Updated At'
    ];

    const csvRows = [
      headers.join(','),
      ...dataToExport.map((p) =>
        [
          `"${p.id}"`,
          `"${p.pageTitle.replace(/"/g, '""')}"`,
          `"${p.slug}"`,
          `"${p.targetUrl}"`,
          `"${p.status}"`,
          `"${(p.seo.metaTitle || '').replace(/"/g, '""')}"`,
          `"${(p.seo.metaDescription || '').replace(/"/g, '""')}"`,
          `"${(p.seo.keywords || '').replace(/"/g, '""')}"`,
          `"${p.seo.canonicalUrl || ''}"`,
          `"${p.viewsCount || 0}"`,
          `"${p.createdAt}"`,
          `"${p.updatedAt}"`
        ].join(',')
      )
    ];

    const csvContent = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csvRows.join('\n'));
    const link = document.createElement('a');
    link.setAttribute('href', csvContent);
    const today = new Date().toISOString().split('T')[0];
    link.setAttribute('download', `Hexpertify_Zombie_Pages_${today}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showToast(`Exported ${dataToExport.length} Zombie Pages to CSV!`, 'success');
  };

  const filteredPages = zombiPagesList.filter((p) => {
    const matchesSearch =
      p.pageTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.slug.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.targetUrl.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.seo.keywords.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'All' || p.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusCount = (status: string) => {
    if (status === 'All') return zombiPagesList.length;
    return zombiPagesList.filter((p) => p.status === status).length;
  };

  const totalOrganicViews = zombiPagesList.reduce((acc, curr) => acc + (curr.viewsCount || 0), 0);

  // Calculate SEO Health score for current editor formData
  const currentHasTitle = Boolean(formData.seo?.metaTitle);
  const currentHasDesc = Boolean(formData.seo?.metaDescription);
  const currentHasHtml = Boolean(formData.htmlChunk);
  const currentHasCanonical = Boolean(formData.seo?.canonicalUrl);
  const currentSeoScore = [currentHasTitle, currentHasDesc, currentHasHtml, currentHasCanonical].filter(Boolean).length;

  return (
    <div className="space-y-8 pb-12 animate-fade-in relative font-['Plus_Jakarta_Sans']">
      {/* Toast Notification Banner */}
      {toastMessage && (
        <div
          className={`fixed top-24 right-8 z-50 px-5 py-4 rounded-2xl shadow-2xl flex items-center gap-3 border animate-in slide-in-from-top duration-300 ${
            toastMessage.type === 'success'
              ? 'bg-emerald-600 text-white border-emerald-500'
              : 'bg-amber-600 text-white border-amber-500'
          }`}
        >
          {toastMessage.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-white shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-white shrink-0" />
          )}
          <span className="font-extrabold text-xs">{toastMessage.text}</span>
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────────────
          PAGE VIEW 1: ZOMBIE PAGES LIST DASHBOARD
         ────────────────────────────────────────────────────────────────── */}
      {viewMode === 'list' && (
        <div className="space-y-8">
          {/* Hero Header */}
          <div className="relative rounded-[28px] bg-gradient-to-r from-[#4f28d9] via-[#5e2be2] to-[#3b1799] p-8 text-white shadow-xl overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="absolute -right-12 -top-12 w-96 h-96 bg-white/5 rounded-full blur-2xl pointer-events-none" />
            <div className="relative z-10">
              <div className="flex items-center gap-2">
                <span className="px-3.5 py-1.5 bg-white/15 backdrop-blur-md rounded-full text-xs font-bold tracking-wide uppercase text-purple-200 border border-white/20 flex items-center gap-1.5">
                  <FileCode className="w-3.5 h-3.5 text-purple-300" />
                  Content Management & Programmatic SEO
                </span>
              </div>
              <h1 className="text-3xl font-extrabold tracking-tight mt-3">Zombie Pages</h1>
              <p className="text-purple-100 text-sm mt-1 max-w-xl">
                Create lightweight programmatic SEO pages using HTML chunks and connect them directly to your desired URLs with complete search engine optimization metadata.
              </p>
            </div>

            {/* Header Actions & Stats */}
            <div className="relative z-10 flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
              <div className="bg-white/10 backdrop-blur-md px-4 py-3 rounded-2xl border border-white/20">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-purple-200 block">Total Pages</span>
                <span className="text-xl font-extrabold text-white">{zombiPagesList.length}</span>
              </div>

              <div className="bg-white/10 backdrop-blur-md px-4 py-3 rounded-2xl border border-white/20">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-purple-200 block">Organic Views</span>
                <span className="text-xl font-extrabold text-white">{totalOrganicViews.toLocaleString()}</span>
              </div>

              <button
                type="button"
                onClick={handleExportCSV}
                className="px-4 py-3.5 bg-white/10 hover:bg-white/20 text-white rounded-2xl font-extrabold text-xs flex items-center justify-center gap-2 backdrop-blur-md transition-all active:scale-95 border border-white/20 whitespace-nowrap"
              >
                <Download className="w-4 h-4" />
                <span>Export CSV</span>
              </button>

              <button
                type="button"
                onClick={handleOpenCreatePage}
                className="px-5 py-3.5 bg-white text-[#4f28d9] hover:bg-purple-50 rounded-2xl font-extrabold text-xs flex items-center justify-center gap-2 shadow-lg transition-all active:scale-95 border border-white/20 whitespace-nowrap"
              >
                <Plus className="w-4 h-4" />
                <span>New Zombie Page</span>
              </button>
            </div>
          </div>

          {/* Filter & Search Bar */}
          <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs space-y-4 md:space-y-0 md:flex md:items-center md:justify-between gap-4">
            {/* Search Field */}
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by page title, slug, target URL, or keywords..."
                className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 outline-none focus:bg-white focus:border-[#5e2be2] focus:ring-2 focus:ring-[#5e2be2]/10 transition-all placeholder:text-slate-400"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 rounded-md"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Status Filter Tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
              {['All', 'Active', 'Draft', 'Archived'].map((status) => {
                const count = getStatusCount(status);
                const isActive = statusFilter === status;
                return (
                  <button
                    key={status}
                    onClick={() => setStatusFilter(status)}
                    className={`px-3.5 py-2 rounded-xl text-xs font-extrabold flex items-center gap-2 whitespace-nowrap transition-all ${
                      isActive
                        ? 'bg-[#5e2be2] text-white shadow-md shadow-[#5e2be2]/20'
                        : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200/60'
                    }`}
                  >
                    <span>{status}</span>
                    <span
                      className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono ${
                        isActive ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
                      }`}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Zombie Pages Table */}
          <div className="bg-white rounded-3xl border border-slate-200/90 shadow-md shadow-slate-200/40 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/90 border-b border-slate-200/80 text-[11px] font-extrabold text-slate-500 uppercase tracking-wider whitespace-nowrap">
                    <th className="py-4 px-5 whitespace-nowrap">Zombie Page & ID</th>
                    <th className="py-4 px-5 whitespace-nowrap">Desired Target URL / Slug</th>
                    <th className="py-4 px-5 whitespace-nowrap">HTML Chunk</th>
                    <th className="py-4 px-5 whitespace-nowrap">SEO Health</th>
                    <th className="py-4 px-5 whitespace-nowrap">Status</th>
                    <th className="py-4 px-5 text-right whitespace-nowrap">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-150/80 text-xs">
                  {filteredPages.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-16 text-center text-slate-400">
                        <div className="max-w-xs mx-auto space-y-2">
                          <FileCode className="w-8 h-8 text-slate-300 mx-auto" />
                          <p className="font-semibold text-slate-600">No Zombie Pages match your filter criteria.</p>
                          <button
                            onClick={() => {
                              setSearchTerm('');
                              setStatusFilter('All');
                            }}
                            className="text-[#5e2be2] font-bold text-xs hover:underline"
                          >
                            Reset search filters
                          </button>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredPages.map((p) => {
                      const hasMetaTitle = Boolean(p.seo.metaTitle);
                      const hasMetaDesc = Boolean(p.seo.metaDescription);
                      const hasHtml = Boolean(p.htmlChunk);
                      const seoScore = [hasMetaTitle, hasMetaDesc, hasHtml, Boolean(p.seo.canonicalUrl)].filter(Boolean).length;

                      return (
                        <tr key={p.id} className="hover:bg-purple-50/40 transition-colors duration-150 group">
                          {/* Page Title & ID */}
                          <td className="py-4 px-5 whitespace-nowrap">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="px-2 py-0.5 bg-purple-50 text-[#5e2be2] font-mono font-extrabold text-[10px] rounded-md border border-purple-200/60">
                                  {p.id}
                                </span>
                                <p className="font-extrabold text-slate-900 group-hover:text-[#5e2be2] transition-colors leading-tight">
                                  {p.pageTitle}
                                </p>
                              </div>
                              <span className="text-[10px] text-slate-400 font-medium block">
                                Updated: {p.updatedAt}
                              </span>
                            </div>
                          </td>

                          {/* Slug & Target URL */}
                          <td className="py-4 px-5 whitespace-nowrap">
                            <div className="space-y-1 max-w-xs">
                              <div className="flex items-center gap-1.5">
                                <span className="font-mono text-xs font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-md border border-purple-100 truncate max-w-[200px]">
                                  {p.slug}
                                </span>
                                <button
                                  type="button"
                                  onClick={(e) => handleCopyUrl(p.targetUrl, e)}
                                  className="p-1 text-slate-400 hover:text-[#5e2be2] rounded-md transition-colors"
                                  title="Copy Connected Target URL"
                                >
                                  {copiedUrl === p.targetUrl ? (
                                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                                  ) : (
                                    <Copy className="w-3.5 h-3.5" />
                                  )}
                                </button>
                              </div>
                              <p className="text-[10px] text-slate-400 truncate font-mono" title={p.targetUrl}>
                                {p.targetUrl}
                              </p>
                            </div>
                          </td>

                          {/* HTML Chunk Info */}
                          <td className="py-4 px-5 whitespace-nowrap">
                            <div className="space-y-1">
                              <span className="inline-flex items-center gap-1 text-[11px] font-extrabold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-lg">
                                <Code className="w-3 h-3 text-purple-600" />
                                {p.htmlChunk.length.toLocaleString()} chars
                              </span>
                              <p className="text-[10px] text-slate-400 font-medium">
                                {p.htmlChunk ? 'Raw HTML Embedded' : 'Empty Chunk'}
                              </p>
                            </div>
                          </td>

                          {/* SEO Health Indicator */}
                          <td className="py-4 px-5 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <span
                                className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold flex items-center gap-1 ${
                                  seoScore === 4
                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                    : seoScore >= 2
                                    ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                    : 'bg-rose-50 text-rose-700 border border-rose-200'
                                }`}
                              >
                                <Sparkles className="w-3 h-3" />
                                SEO Health {seoScore}/4
                              </span>
                            </div>
                          </td>

                          {/* Status */}
                          <td className="py-4 px-5 whitespace-nowrap">
                            <span
                              className={`inline-flex items-center gap-1.5 text-[11px] px-3 py-1 rounded-full font-extrabold shadow-2xs ${
                                p.status === 'Active'
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : p.status === 'Draft'
                                  ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                  : 'bg-slate-100 text-slate-600 border border-slate-200'
                              }`}
                            >
                              <span
                                className={`w-1.5 h-1.5 rounded-full ${
                                  p.status === 'Active'
                                    ? 'bg-emerald-500'
                                    : p.status === 'Draft'
                                    ? 'bg-amber-500'
                                    : 'bg-slate-400'
                                }`}
                              />
                              {p.status}
                            </span>
                          </td>

                          {/* Actions */}
                          <td className="py-4 px-5 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-2">
                              {p.status === 'Draft' ? (
                                <button
                                  type="button"
                                  onClick={(e) => handleToggleLive(p.id, 'Active', e)}
                                  className="px-3.5 py-1.5 bg-emerald-50 hover:bg-emerald-600 hover:text-white text-emerald-700 border border-emerald-200/90 rounded-xl font-extrabold text-xs flex items-center gap-1.5 transition-all active:scale-95 shadow-2xs"
                                  title="Publish and make page live"
                                >
                                  <Play className="w-3.5 h-3.5" />
                                  <span>Make Live</span>
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={(e) => handleToggleLive(p.id, 'Draft', e)}
                                  className="px-3.5 py-1.5 bg-amber-50 hover:bg-amber-500 hover:text-white text-amber-800 border border-amber-200/90 rounded-xl font-extrabold text-xs flex items-center gap-1.5 transition-all active:scale-95 shadow-2xs"
                                  title="Unpublish and move page back to Draft"
                                >
                                  <FileText className="w-3.5 h-3.5" />
                                  <span>Move to Draft</span>
                                </button>
                              )}

                              <button
                                type="button"
                                onClick={() => handleOpenPreviewPage(p)}
                                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-extrabold text-xs flex items-center gap-1 transition-all active:scale-95"
                                title="Inspect & Live Preview HTML/SEO"
                              >
                                <Eye className="w-3.5 h-3.5 text-slate-600" />
                                <span>Preview</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => handleOpenEditPage(p)}
                                className="px-3.5 py-1.5 bg-[#5e2be2] hover:bg-[#4f28d9] text-white rounded-xl font-extrabold text-xs flex items-center gap-1 shadow-md shadow-[#5e2be2]/20 transition-all active:scale-95"
                                title="Edit Zombie Page details, HTML chunk, and SEO settings"
                              >
                                <Edit className="w-3.5 h-3.5" />
                                <span>Edit Page</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => setDeletingPage(p)}
                                className="p-2 text-rose-500 hover:bg-rose-50 rounded-xl transition-colors"
                                title="Delete Zombie Page"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Table Footer Bar */}
            <div className="p-4 bg-slate-50/80 border-t border-slate-200/80 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500 font-semibold">
              <div>
                Showing <span className="font-extrabold text-slate-900">{filteredPages.length}</span> of{' '}
                <span className="font-extrabold text-slate-900">{zombiPagesList.length}</span> total Zombie Pages
              </div>

              <div className="flex items-center gap-2">
                <button disabled className="p-1.5 bg-white border border-slate-200 rounded-lg text-slate-300 cursor-not-allowed">
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="px-3 py-1 bg-white border border-slate-200 rounded-lg text-slate-800 font-extrabold text-xs">
                  Page 1 of 1
                </span>
                <button disabled className="p-1.5 bg-white border border-slate-200 rounded-lg text-slate-300 cursor-not-allowed">
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────────────
          PAGE VIEW 2: DEDICATED FULL-PAGE EDITOR (NOT A POPUP / MODAL!)
         ────────────────────────────────────────────────────────────────── */}
      {viewMode === 'editor' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Top Header & Navigation Bar */}
          <div className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-4 sticky top-4 z-30">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setViewMode('list')}
                className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl font-extrabold text-xs flex items-center gap-1.5 transition-all active:scale-95"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back to Zombie Pages</span>
              </button>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-extrabold text-[#5e2be2] uppercase tracking-wider font-mono">
                    {editingPageId ? `Editing Page · ${editingPageId}` : 'Create New Zombie Page'}
                  </span>
                </div>
                <h2 className="text-xl font-extrabold text-slate-900 leading-tight">
                  {formData.pageTitle || 'Untitled Zombie Page'}
                </h2>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                onClick={() => setViewMode('list')}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-extrabold text-xs transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleSavePage('Draft')}
                className="px-4 py-2.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300/80 rounded-xl font-extrabold text-xs transition-all flex items-center gap-1.5 shadow-2xs"
                title="Save page in Draft status"
              >
                <FileText className="w-4 h-4 text-amber-600" />
                <span>Save as Draft</span>
              </button>
              <button
                type="button"
                onClick={() => handleSavePage('Active')}
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-extrabold text-xs shadow-md shadow-emerald-600/25 transition-all active:scale-95 flex items-center gap-2"
                title="Publish & make page live immediately"
              >
                <Play className="w-4 h-4" />
                <span>Make Live (Publish)</span>
              </button>
            </div>
          </div>

          {/* Section Filter Pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {[
              { id: 'all', label: 'All Editor Sections' },
              { id: 'details', label: '1. Page & Target URL' },
              { id: 'html', label: '2. HTML Chunk Builder' },
              { id: 'seo', label: '3. SEO & SERP Metadata' }
            ].map((sec) => (
              <button
                key={sec.id}
                type="button"
                onClick={() => setEditorSection(sec.id as any)}
                className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all whitespace-nowrap ${
                  editorSection === sec.id
                    ? 'bg-[#5e2be2] text-white shadow-sm'
                    : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/80'
                }`}
              >
                {sec.label}
              </button>
            ))}
          </div>

          {/* Editor Grid: 2 Columns */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
            {/* Left 2 Columns: Full Form Sections */}
            <div className="lg:col-span-2 space-y-6">
              {/* SECTION 1: Page Details & Connected Target URL */}
              {(editorSection === 'all' || editorSection === 'details') && (
                <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-md space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-purple-50 text-[#5e2be2] flex items-center justify-center font-bold text-xs">
                        1
                      </div>
                      <div>
                        <h3 className="font-extrabold text-slate-900 text-sm">Page Details & Connected URL</h3>
                        <p className="text-[11px] text-slate-400">Configure page name, slug, status, and URL endpoint.</p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4 text-xs">
                    <div className="space-y-1.5">
                      <label className="font-extrabold text-slate-700 block">Page Title / Topic *</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Top CBT Therapists in Delhi NCR"
                        value={formData.pageTitle || ''}
                        onChange={(e) => handleTitleOrSlugChange('pageTitle', e.target.value)}
                        className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl outline-none font-semibold text-slate-800 text-sm focus:bg-white focus:border-[#5e2be2] transition-all"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="font-extrabold text-slate-700 block">Slug / URL Path *</label>
                        <input
                          type="text"
                          required
                          placeholder="/cbt-therapists-delhi-ncr"
                          value={formData.slug || ''}
                          onChange={(e) => handleTitleOrSlugChange('slug', e.target.value)}
                          className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-mono font-semibold text-slate-800 focus:bg-white focus:border-[#5e2be2] transition-all"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="font-extrabold text-slate-700 block">Publication Status</label>
                        <select
                          value={formData.status || 'Active'}
                          onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                          className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-semibold text-slate-800 focus:bg-white focus:border-[#5e2be2] transition-all"
                        >
                          <option value="Active">Active (Published & Indexed)</option>
                          <option value="Draft">Draft (Internal Only)</option>
                          <option value="Archived">Archived (Deactivated)</option>
                        </select>
                      </div>
                    </div>

                    {/* Connected Target URL Card */}
                    <div className="p-4 bg-purple-50/70 border border-purple-100 rounded-2xl space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-extrabold text-purple-900 flex items-center gap-1.5">
                          <Globe className="w-4 h-4 text-[#5e2be2]" />
                          Connected Desired Target URL
                        </span>
                        <span className="text-[10px] text-purple-700 font-mono font-bold bg-white px-2 py-0.5 rounded-md border border-purple-200">
                          Live Endpoint
                        </span>
                      </div>
                      <input
                        type="text"
                        required
                        value={formData.targetUrl || ''}
                        onChange={(e) => setFormData({ ...formData, targetUrl: e.target.value })}
                        className="w-full p-3 bg-white border border-purple-200 rounded-xl outline-none font-mono text-xs text-purple-900 font-bold focus:border-[#5e2be2]"
                      />
                      <p className="text-[11px] text-purple-700 font-medium">
                        This target URL is linked directly to your custom HTML chunk and SEO metadata.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* SECTION 2: HTML Chunk Builder */}
              {(editorSection === 'all' || editorSection === 'html') && (
                <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-md space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-purple-50 text-[#5e2be2] flex items-center justify-center font-bold text-xs">
                        2
                      </div>
                      <div>
                        <h3 className="font-extrabold text-slate-900 text-sm">HTML Chunk Code Builder</h3>
                        <p className="text-[11px] text-slate-400">Embed clean custom HTML5 code, Tailwind styling, or rich content blocks.</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1 border border-slate-200 bg-slate-50 rounded-lg p-0.5">
                        <button
                          type="button"
                          onClick={() => setHtmlPreviewMode('code')}
                          className={`px-3 py-1 rounded-md text-xs font-extrabold transition-all ${
                            htmlPreviewMode === 'code' ? 'bg-[#5e2be2] text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
                          }`}
                        >
                          Code View
                        </button>
                        <button
                          type="button"
                          onClick={() => setHtmlPreviewMode('rendered')}
                          className={`px-3 py-1 rounded-md text-xs font-extrabold transition-all ${
                            htmlPreviewMode === 'rendered' ? 'bg-[#5e2be2] text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
                          }`}
                        >
                          Live Output Preview
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Preset HTML Helpers */}
                  <div className="flex items-center gap-2 overflow-x-auto pb-1">
                    <span className="text-[11px] font-extrabold text-slate-400 whitespace-nowrap">Insert Presets:</span>
                    <button
                      type="button"
                      onClick={() => handleInsertHtmlPreset('hero')}
                      className="px-3 py-1.5 bg-slate-50 border border-slate-200 hover:bg-purple-50 hover:text-[#5e2be2] text-slate-700 rounded-xl font-bold text-xs whitespace-nowrap transition-all"
                    >
                      + Hero Banner
                    </button>
                    <button
                      type="button"
                      onClick={() => handleInsertHtmlPreset('cta')}
                      className="px-3 py-1.5 bg-slate-50 border border-slate-200 hover:bg-purple-50 hover:text-[#5e2be2] text-slate-700 rounded-xl font-bold text-xs whitespace-nowrap transition-all"
                    >
                      + CTA Section
                    </button>
                    <button
                      type="button"
                      onClick={() => handleInsertHtmlPreset('faq')}
                      className="px-3 py-1.5 bg-slate-50 border border-slate-200 hover:bg-purple-50 hover:text-[#5e2be2] text-slate-700 rounded-xl font-bold text-xs whitespace-nowrap transition-all"
                    >
                      + FAQ Accordion
                    </button>
                    <button
                      type="button"
                      onClick={() => handleInsertHtmlPreset('doctor')}
                      className="px-3 py-1.5 bg-slate-50 border border-slate-200 hover:bg-purple-50 hover:text-[#5e2be2] text-slate-700 rounded-xl font-bold text-xs whitespace-nowrap transition-all"
                    >
                      + Doctor Card
                    </button>
                  </div>

                  {htmlPreviewMode === 'code' ? (
                    <div className="space-y-1.5">
                      <textarea
                        rows={14}
                        placeholder="<!-- Enter custom HTML snippet code for your Zombie Page here -->"
                        value={formData.htmlChunk || ''}
                        onChange={(e) => setFormData({ ...formData, htmlChunk: e.target.value })}
                        className="w-full p-4 bg-slate-900 text-purple-200 border border-slate-800 rounded-2xl outline-none font-mono text-xs leading-relaxed focus:border-[#5e2be2] focus:ring-2 focus:ring-[#5e2be2]/20 resize-y"
                      />
                      <div className="flex justify-between items-center text-[10px] text-slate-400 font-mono px-1">
                        <span>Characters: {formData.htmlChunk?.length || 0}</span>
                        <span>Supports raw HTML5 markup, Tailwind CSS classes, & CTA links</span>
                      </div>
                    </div>
                  ) : (
                    <div className="p-5 bg-slate-100 rounded-2xl border border-slate-200 min-h-[250px]">
                      <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block mb-2 font-mono">Rendered Output Preview</span>
                      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                        {formData.htmlChunk ? (
                          <div dangerouslySetInnerHTML={{ __html: formData.htmlChunk }} />
                        ) : (
                          <p className="text-slate-400 text-center py-12">HTML chunk is empty. Add HTML code to render output.</p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* SECTION 3: SEO & SERP Settings */}
              {(editorSection === 'all' || editorSection === 'seo') && (
                <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-md space-y-4">
                  <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                    <div className="w-8 h-8 rounded-xl bg-purple-50 text-[#5e2be2] flex items-center justify-center font-bold text-xs">
                      3
                    </div>
                    <div>
                      <h3 className="font-extrabold text-slate-900 text-sm">SEO & Search Engine Metadata</h3>
                      <p className="text-[11px] text-slate-400">Configure search titles, meta descriptions, canonical links, and JSON-LD schema.</p>
                    </div>
                  </div>

                  <div className="space-y-4 text-xs">
                    {/* Meta Title */}
                    <div className="space-y-1">
                      <div className="flex justify-between items-center">
                        <label className="font-extrabold text-slate-700">Meta Title *</label>
                        <span className={`text-[10px] font-mono font-bold ${
                          (formData.seo?.metaTitle?.length || 0) > 60 ? 'text-amber-600' : 'text-slate-400'
                        }`}>
                          {formData.seo?.metaTitle?.length || 0} / 60 recommended
                        </span>
                      </div>
                      <input
                        type="text"
                        placeholder="e.g. Top CBT Therapists in Delhi NCR | Hexpertify"
                        value={formData.seo?.metaTitle || ''}
                        onChange={(e) => setFormData({
                          ...formData,
                          seo: { ...formData.seo!, metaTitle: e.target.value }
                        })}
                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-semibold text-slate-800 focus:bg-white focus:border-[#5e2be2]"
                      />
                    </div>

                    {/* Meta Description */}
                    <div className="space-y-1">
                      <div className="flex justify-between items-center">
                        <label className="font-extrabold text-slate-700">Meta Description *</label>
                        <span className={`text-[10px] font-mono font-bold ${
                          (formData.seo?.metaDescription?.length || 0) > 160 ? 'text-amber-600' : 'text-slate-400'
                        }`}>
                          {formData.seo?.metaDescription?.length || 0} / 160 recommended
                        </span>
                      </div>
                      <textarea
                        rows={3}
                        placeholder="e.g. Book 1-on-1 video sessions with certified CBT practitioners in Delhi NCR..."
                        value={formData.seo?.metaDescription || ''}
                        onChange={(e) => setFormData({
                          ...formData,
                          seo: { ...formData.seo!, metaDescription: e.target.value }
                        })}
                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-medium text-slate-800 focus:bg-white focus:border-[#5e2be2] resize-none leading-relaxed"
                      />
                    </div>

                    {/* Keywords & Canonical URL */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="font-extrabold text-slate-700">Target Keywords (Comma Separated)</label>
                        <input
                          type="text"
                          placeholder="cbt therapist, psychology delhi, anxiety care"
                          value={formData.seo?.keywords || ''}
                          onChange={(e) => setFormData({
                            ...formData,
                            seo: { ...formData.seo!, keywords: e.target.value }
                          })}
                          className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-semibold text-slate-800 focus:bg-white focus:border-[#5e2be2]"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="font-extrabold text-slate-700">Canonical URL</label>
                        <input
                          type="text"
                          placeholder="https://hexpertify.com/cbt-therapists-delhi-ncr"
                          value={formData.seo?.canonicalUrl || ''}
                          onChange={(e) => setFormData({
                            ...formData,
                            seo: { ...formData.seo!, canonicalUrl: e.target.value }
                          })}
                          className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-mono text-slate-800 focus:bg-white focus:border-[#5e2be2]"
                        />
                      </div>
                    </div>

                    {/* Structured Data (JSON-LD Markup) */}
                    <div className="space-y-1">
                      <label className="font-extrabold text-slate-700">Structured Data (JSON-LD Schema Markup)</label>
                      <textarea
                        rows={4}
                        placeholder={`{\n  "@context": "https://schema.org",\n  "@type": "MedicalWebPage",\n  "name": "Top CBT Therapists in Delhi NCR"\n}`}
                        value={formData.seo?.structuredData || ''}
                        onChange={(e) => setFormData({
                          ...formData,
                          seo: { ...formData.seo!, structuredData: e.target.value }
                        })}
                        className="w-full p-3 bg-slate-900 text-emerald-400 border border-slate-800 rounded-xl outline-none font-mono text-[11px] leading-relaxed focus:border-[#5e2be2] resize-none"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Right Column: Sticky Inspector Sidebar & Google SERP Preview */}
            <div className="space-y-6 lg:sticky lg:top-24">
              {/* Google SERP Live Card Preview */}
              <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-md space-y-3">
                <div className="flex items-center gap-2 text-xs font-extrabold text-slate-800 border-b border-slate-100 pb-2.5">
                  <SearchIcon className="w-4 h-4 text-emerald-600" />
                  Google SERP Live Card Preview
                </div>
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 space-y-1.5">
                  <div className="text-[11px] text-slate-500 font-mono flex items-center gap-1 truncate">
                    <span className="text-emerald-700 font-semibold">{formData.targetUrl || 'https://hexpertify.com/zombie-pages'}</span>
                    <span className="text-slate-300">›</span>
                  </div>
                  <h4 className="text-base font-bold text-blue-700 hover:underline cursor-pointer leading-tight truncate">
                    {formData.seo?.metaTitle || formData.pageTitle || 'Page Meta Title'}
                  </h4>
                  <p className="text-xs text-slate-600 line-clamp-3 leading-relaxed">
                    {formData.seo?.metaDescription || 'Enter a meta description to preview how your snippet will look in Google search results.'}
                  </p>
                </div>
              </div>

              {/* SEO Health Checklist */}
              <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-md space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                  <span className="text-xs font-extrabold text-slate-800 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-[#5e2be2]" />
                    SEO Health Index
                  </span>
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-extrabold ${
                    currentSeoScore === 4 ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                  }`}>
                    {currentSeoScore}/4 Checks Passed
                  </span>
                </div>

                <div className="space-y-2 text-xs font-semibold">
                  <div className="flex items-center gap-2">
                    {currentHasTitle ? <CheckSquare className="w-4 h-4 text-emerald-600" /> : <X className="w-4 h-4 text-slate-300" />}
                    <span className={currentHasTitle ? 'text-slate-800' : 'text-slate-400'}>Meta Title Defined</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {currentHasDesc ? <CheckSquare className="w-4 h-4 text-emerald-600" /> : <X className="w-4 h-4 text-slate-300" />}
                    <span className={currentHasDesc ? 'text-slate-800' : 'text-slate-400'}>Meta Description Configured</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {currentHasHtml ? <CheckSquare className="w-4 h-4 text-emerald-600" /> : <X className="w-4 h-4 text-slate-300" />}
                    <span className={currentHasHtml ? 'text-slate-800' : 'text-slate-400'}>HTML Chunk Embedded</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {currentHasCanonical ? <CheckSquare className="w-4 h-4 text-emerald-600" /> : <X className="w-4 h-4 text-slate-300" />}
                    <span className={currentHasCanonical ? 'text-slate-800' : 'text-slate-400'}>Canonical URL Set</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────────────
          PAGE VIEW 3: DEDICATED FULL-PAGE PREVIEW INSPECTOR
         ────────────────────────────────────────────────────────────────── */}
      {viewMode === 'preview' && inspectingPage && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Preview Navigation Header */}
          <div className="bg-slate-900 text-white rounded-3xl p-5 border border-slate-800 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setViewMode('list')}
                className="p-2.5 bg-white/10 hover:bg-white/20 text-white rounded-2xl font-extrabold text-xs flex items-center gap-1.5 transition-all active:scale-95"
              >
                <ArrowLeft className="w-4 h-4 text-purple-200" />
                <span>Back to List</span>
              </button>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-extrabold text-purple-300 uppercase tracking-wider font-mono">
                    Page Inspection · {inspectingPage.id}
                  </span>
                </div>
                <h2 className="text-xl font-extrabold text-white leading-tight">{inspectingPage.pageTitle}</h2>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={(e) => handleCopyUrl(inspectingPage.targetUrl, e)}
                className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white font-extrabold text-xs rounded-xl flex items-center gap-1.5"
              >
                <Copy className="w-3.5 h-3.5 text-purple-300" />
                <span>Copy Connected URL</span>
              </button>
              <button
                type="button"
                onClick={() => handleOpenEditPage(inspectingPage)}
                className="px-6 py-2.5 bg-[#5e2be2] hover:bg-[#4f28d9] text-white font-extrabold text-xs rounded-xl shadow-md flex items-center gap-1.5"
              >
                <Edit className="w-3.5 h-3.5" />
                <span>Edit Zombie Page</span>
              </button>
            </div>
          </div>

          {/* Preview Main Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* SERP Card Preview */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-md space-y-3">
              <span className="font-extrabold text-slate-800 uppercase tracking-wider text-xs block">Google SERP Snippet Preview</span>
              <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-1.5">
                <span className="text-xs text-emerald-700 font-mono font-semibold block">{inspectingPage.targetUrl}</span>
                <h3 className="text-lg font-bold text-blue-700 leading-tight">{inspectingPage.seo.metaTitle}</h3>
                <p className="text-xs text-slate-600 leading-relaxed">{inspectingPage.seo.metaDescription}</p>
              </div>
            </div>

            {/* Rendered HTML Chunk Output */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-md space-y-3">
              <span className="font-extrabold text-slate-800 uppercase tracking-wider text-xs block">Rendered HTML Chunk Output</span>
              <div className="p-5 bg-slate-50 border border-slate-200 rounded-2xl">
                {inspectingPage.htmlChunk ? (
                  <div dangerouslySetInnerHTML={{ __html: inspectingPage.htmlChunk }} />
                ) : (
                  <p className="text-slate-400 text-center py-6">No HTML chunk provided for this Zombie Page.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── DELETE CONFIRMATION MODAL ─────────────────────────────────── */}
      {deletingPage && createPortal(
        <div className="fixed inset-0 z-[130] flex items-center justify-center p-3 sm:p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-200 space-y-4 my-auto animate-in fade-in zoom-in-95">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h4 className="text-lg font-extrabold text-slate-900">Delete Zombie Page?</h4>
              <p className="text-xs text-slate-500 leading-relaxed">
                Are you sure you want to delete <span className="font-extrabold text-slate-800">{deletingPage.pageTitle}</span> ({deletingPage.id})? The connected target URL <span className="font-mono font-bold text-purple-700">{deletingPage.slug}</span> will be unlinked.
              </p>
            </div>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeletingPage(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleDeletePage(deletingPage.id)}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs rounded-xl shadow-md"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default ZombiView;
