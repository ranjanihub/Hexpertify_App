import React, { useState, useEffect } from 'react';
import {
  Search,
  Plus,
  Bookmark,
  FileText,
  FileSpreadsheet,
  Headphones,
  Video as VideoIcon,
  FileCheck,
  Star,
  Clock,
  X,
  Share2,
  CheckCircle2,
  BookOpen,
  Trash2,
  Upload,
  Link as LinkIcon,
  FileUp,
  ChevronDown,
  Check,
  Edit3
} from 'lucide-react';
import type { ResourceItem, ResourceType } from '../types';
import { api } from '../lib/apiClient';

const categories = [
  'All Resources',
  'Saved',
  'Articles',
  'Videos',
  'Worksheets',
  'Meditations',
  'PDFs'
] as const;

const DEFAULT_CONTEXT_OPTIONS = [
  { id: "c-1", name: "Jaswanth 2050", type: "Client" },
  { id: "c-2", name: "Sarah Jenkins", type: "Client" },
  { id: "c-3", name: "Michael Chen", type: "Client" },
  { id: "c-4", name: "Emily Rodriguez", type: "Client" },
  { id: "g-1", name: "Anxiety Support Group", type: "Group" },
  { id: "g-2", name: "CBT Skills Group", type: "Group" },
];

export const ResourcesView: React.FC = () => {
  const [resources, setResources] = useState<ResourceItem[]>(() => {
    const saved = localStorage.getItem('hexpertify_admin_resources');
    return saved ? JSON.parse(saved) : [];
  });

  const [activeCategory, setActiveCategory] = useState<string>('All Resources');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [bookmarkedIds, setBookmarkedIds] = useState<string[]>(() => {
    return resources.filter((r) => r.isSaved).map((r) => r.id);
  });

  const [selectedResource, setSelectedResource] = useState<ResourceItem | null>(null);
  const [editingResource, setEditingResource] = useState<ResourceItem | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);

  // Quenza-style Modal States
  const [resourceTab, setResourceTab] = useState<'file' | 'link'>('file');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [linkLabel, setLinkLabel] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [contextSearch, setContextSearch] = useState('');
  const [isContextDropdownOpen, setIsContextDropdownOpen] = useState(false);
  const [selectedContexts, setSelectedContexts] = useState<string[]>([]);
  const [contextOptions, setContextOptions] = useState(DEFAULT_CONTEXT_OPTIONS);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Fetch live resources from MongoDB Atlas
  useEffect(() => {
    const fetchResources = async () => {
      try {
        const data = await api.get('/api/admin/resources');
        if (data?.resources && Array.isArray(data.resources)) {
          setResources(data.resources);
          setBookmarkedIds(data.resources.filter((r: any) => r.isSaved).map((r: any) => r.id));
          try {
            localStorage.setItem('hexpertify_admin_resources', JSON.stringify(data.resources));
          } catch {}
        }
      } catch (err) {
        console.error('Error fetching resources:', err);
      }
    };
    fetchResources();

    // Fetch live users for context selection
    const fetchUsers = async () => {
      try {
        const data = await api.get('/api/admin/users');
        if (data?.users && Array.isArray(data.users) && data.users.length > 0) {
          const clientOpts = data.users.map((u: any) => ({
            id: u.id || String(u._id),
            name: u.name || u.email || 'Client',
            type: 'Client'
          }));
          setContextOptions([
            ...clientOpts,
            { id: 'g-1', name: 'Anxiety Support Group', type: 'Group' },
            { id: 'g-2', name: 'CBT Skills Group', type: 'Group' }
          ]);
        }
      } catch {}
    };
    fetchUsers();
  }, []);

  const saveToLocalStorage = (updated: ResourceItem[]) => {
    setResources(updated);
    try {
      localStorage.setItem('hexpertify_admin_resources', JSON.stringify(updated));
    } catch {}
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const toggleBookmark = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const willBeSaved = !bookmarkedIds.includes(id);
    const updatedIds = willBeSaved
      ? [...bookmarkedIds, id]
      : bookmarkedIds.filter((item) => item !== id);

    setBookmarkedIds(updatedIds);

    const updatedResources = resources.map((r) =>
      r.id === id ? { ...r, isSaved: willBeSaved } : r
    );
    saveToLocalStorage(updatedResources);

    // Persist to MongoDB Atlas
    api.put('/api/admin/resources', { id, isSaved: willBeSaved }).catch((err) => {
      console.error('Error toggling bookmark in DB:', err);
    });

    const targetRes = resources.find((r) => r.id === id);
    if (targetRes) {
      showToast(
        willBeSaved
          ? `Saved "${targetRes.title}" to library!`
          : `Removed "${targetRes.title}" from saved resources`
      );
    }
  };

  const handleDeleteResource = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const target = resources.find((r) => r.id === id);
    const updated = resources.filter((r) => r.id !== id);
    saveToLocalStorage(updated);
    if (selectedResource?.id === id) setSelectedResource(null);

    // Synchronize and remove from Client and Therapist local caches
    try {
      const clientResources = localStorage.getItem('hexpertify_client_resources');
      if (clientResources) {
        const parsed = JSON.parse(clientResources);
        localStorage.setItem('hexpertify_client_resources', JSON.stringify(parsed.filter((r: any) => String(r.id) !== String(id))));
      }
      const consultantResources = localStorage.getItem('hexpertify_consultant_resources');
      if (consultantResources) {
        const parsed = JSON.parse(consultantResources);
        localStorage.setItem('hexpertify_consultant_resources', JSON.stringify(parsed.filter((r: any) => String(r.id) !== String(id))));
      }
      const deletedIds = JSON.parse(localStorage.getItem('hexpertify_deleted_resource_ids') || '[]');
      if (!deletedIds.includes(String(id))) {
        deletedIds.push(String(id));
        localStorage.setItem('hexpertify_deleted_resource_ids', JSON.stringify(deletedIds));
      }
    } catch {}

    // Dispatch real-time global event across browser tabs and components
    window.dispatchEvent(new CustomEvent('resource_deleted', { detail: { id } }));
    window.dispatchEvent(new CustomEvent('resource_data_updated'));

    // Delete from MongoDB Atlas
    api.delete(`/api/admin/resources?id=${encodeURIComponent(id)}`).catch((err) => {
      console.error('Error deleting resource from DB:', err);
    });
    fetch(`/api/resources?id=${encodeURIComponent(id)}`, { method: 'DELETE' }).catch(() => {});

    showToast(`Deleted resource "${target?.title || id}" across all platform panels.`);
  };

  const handleAddResourceSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    let title = '';
    let type: ResourceType = 'article';
    let typeLabel = 'ARTICLE';
    let category = 'Articles';
    let duration = '5 min read';
    let description = '';
    let imageUrl = 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?auto=format&fit=crop&w=800&q=80';

    if (resourceTab === 'file') {
      if (!selectedFile) {
        showToast('Please select a file to upload.');
        return;
      }
      title = selectedFile.name.replace(/\.[^/.]+$/, '');
      const ext = selectedFile.name.split('.').pop()?.toLowerCase() || '';

      if (['pdf'].includes(ext)) {
        type = 'pdf';
        typeLabel = 'PDF';
        category = 'PDFs';
        duration = 'Document';
        imageUrl = 'https://images.unsplash.com/photo-1511295742362-92c96b124e52?auto=format&fit=crop&w=800&q=80';
      } else if (['doc', 'docx', 'xls', 'xlsx'].includes(ext)) {
        type = 'worksheet';
        typeLabel = 'WORKSHEET';
        category = 'Worksheets';
        duration = 'Interactive';
        imageUrl = 'https://images.unsplash.com/photo-1517842645767-c639042777db?auto=format&fit=crop&w=800&q=80';
      } else if (['mp3', 'wav', 'aac'].includes(ext)) {
        type = 'meditation';
        typeLabel = 'MEDITATION';
        category = 'Meditations';
        duration = 'Audio Guide';
        imageUrl = 'https://images.unsplash.com/photo-1545205597-3d9d02c29597?auto=format&fit=crop&w=800&q=80';
      } else if (['mp4', 'mov', 'avi', 'mkv'].includes(ext)) {
        type = 'video';
        typeLabel = 'VIDEO';
        category = 'Videos';
        duration = 'Video Session';
        imageUrl = 'https://images.unsplash.com/photo-1518241353330-0f7941c2d9b5?auto=format&fit=crop&w=800&q=80';
      }
      description = `Clinical resource file "${selectedFile.name}" (${(selectedFile.size / 1024).toFixed(1)} KB).`;
    } else {
      if (!linkLabel.trim() || !linkUrl.trim()) {
        showToast('Please enter both label and URL.');
        return;
      }
      title = linkLabel.trim();
      description = `External clinical link: ${linkUrl.trim()}`;
      if (linkUrl.includes('youtube') || linkUrl.includes('vimeo') || linkUrl.includes('.mp4')) {
        type = 'video';
        typeLabel = 'VIDEO';
        category = 'Videos';
        duration = 'Video Stream';
        imageUrl = 'https://images.unsplash.com/photo-1518241353330-0f7941c2d9b5?auto=format&fit=crop&w=800&q=80';
      } else if (linkUrl.endsWith('.pdf')) {
        type = 'pdf';
        typeLabel = 'PDF';
        category = 'PDFs';
        duration = 'PDF Link';
        imageUrl = 'https://images.unsplash.com/photo-1511295742362-92c96b124e52?auto=format&fit=crop&w=800&q=80';
      } else {
        type = 'article';
        typeLabel = 'ARTICLE';
        category = 'Articles';
        duration = 'Web Resource';
      }
    }

    const createdResource: ResourceItem = {
      id: `res-${Date.now()}`,
      type,
      typeLabel,
      category,
      isRecommended: true,
      title,
      description,
      fullContent: resourceTab === 'link' ? `Direct Link: ${linkUrl}\n\nShared Context: ${selectedContexts.join(', ') || 'Global'}` : `Uploaded file: ${selectedFile?.name}\n\nShared Context: ${selectedContexts.join(', ') || 'Global'}`,
      duration,
      imageUrl,
      tags: selectedContexts.length > 0 ? selectedContexts : ['Clinical', 'Resource'],
      isSaved: false,
      createdAt: new Date().toISOString().split('T')[0]
    };

    const updatedList = [createdResource, ...resources];
    saveToLocalStorage(updatedList);

    // Persist to MongoDB Atlas
    api.post('/api/admin/resources', createdResource).catch((err) => {
      console.error('Error creating resource in DB:', err);
    });

    // Reset Form
    setSelectedFile(null);
    setLinkLabel('');
    setLinkUrl('');
    setSelectedContexts([]);
    setIsAddModalOpen(false);

    showToast(`Successfully added "${createdResource.title}" to MongoDB Atlas!`);
  };

  const handleUpdateResourceSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingResource || !editingResource.title.trim()) return;

    const updatedList = resources.map((r) =>
      r.id === editingResource.id ? { ...editingResource } : r
    );
    saveToLocalStorage(updatedList);

    // Persist to MongoDB Atlas
    api.put('/api/admin/resources', editingResource).catch((err) => {
      console.error('Error updating resource in DB:', err);
    });

    if (selectedResource?.id === editingResource.id) {
      setSelectedResource(editingResource);
    }

    setEditingResource(null);
    showToast(`Successfully updated "${editingResource.title}" in MongoDB Atlas!`);
  };

  const filteredResources = resources.filter((res) => {
    const matchesCategory =
      activeCategory === 'All Resources'
        ? true
        : activeCategory === 'Saved'
        ? bookmarkedIds.includes(res.id)
        : res.category === activeCategory;

    const query = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !query ||
      res.title.toLowerCase().includes(query) ||
      res.description.toLowerCase().includes(query) ||
      res.tags.some((tag) => tag.toLowerCase().includes(query));

    return matchesCategory && matchesSearch;
  });

  const getResourceTypeIcon = (type: ResourceType) => {
    switch (type) {
      case 'article':
        return <FileText className="w-3.5 h-3.5" />;
      case 'worksheet':
        return <FileSpreadsheet className="w-3.5 h-3.5" />;
      case 'meditation':
        return <Headphones className="w-3.5 h-3.5" />;
      case 'video':
        return <VideoIcon className="w-3.5 h-3.5" />;
      case 'pdf':
        return <FileCheck className="w-3.5 h-3.5" />;
      default:
        return <FileText className="w-3.5 h-3.5" />;
    }
  };

  return (
    <div className="space-y-8 pb-12 animate-fade-in relative">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 right-6 z-[300] bg-slate-900 text-white text-xs font-semibold px-4 py-3 rounded-2xl shadow-xl border border-slate-700/50 flex items-center gap-2.5 animate-in fade-in slide-in-from-top-4">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold text-[#5e2be2] uppercase tracking-wider bg-purple-50 px-2.5 py-0.5 rounded-full border border-purple-200/60">
              Clinical Hub
            </span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900">
            Resource Library
          </h1>
          <p className="text-slate-500 text-sm sm:text-base mt-1 font-medium">
            Tools, exercises, and reading material to support your journey.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
          {/* Live Search Input */}
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search resources..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-9 py-2.5 rounded-full border border-slate-200 bg-white text-slate-800 placeholder-slate-400 shadow-sm focus:outline-none focus:ring-2 focus:ring-[#5e2be2] focus:border-transparent text-sm font-medium transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-bold text-slate-400 hover:text-slate-600 bg-slate-100 rounded-full px-1.5 py-0.5"
              >
                Clear
              </button>
            )}
          </div>

          {/* Add Resource Button */}
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="w-full sm:w-auto rounded-full bg-[#5e2be2] hover:bg-[#4f28d9] text-white font-bold h-10 px-5 shadow-md shadow-[#5e2be2]/25 shrink-0 flex items-center justify-center gap-2 transition-all active:scale-95 text-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Add Resource</span>
          </button>
        </div>
      </div>

      {/* Category Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        {categories.map((cat) => {
          const isActive = activeCategory === cat;
          const isSavedTab = cat === 'Saved';
          const savedCount = bookmarkedIds.length;

          return (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-5 py-2 rounded-full text-sm font-medium transition-all shrink-0 cursor-pointer flex items-center gap-1.5 ${
                isActive
                  ? 'bg-[#5e2be2] text-white shadow-md shadow-[#5e2be2]/25 font-bold'
                  : 'bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-50 border border-slate-200'
              }`}
            >
              {isSavedTab && (
                <Bookmark
                  className={`w-3.5 h-3.5 ${
                    isActive ? 'fill-white text-white' : 'text-slate-400'
                  }`}
                />
              )}
              <span>{cat}</span>
              {isSavedTab && (
                <span
                  className={`px-1.5 py-0.5 text-[10px] font-bold rounded-full ${
                    isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {savedCount}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Resources Card Grid */}
      {filteredResources.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredResources.map((res) => {
            const isBookmarked = bookmarkedIds.includes(res.id);

            return (
              <div
                key={res.id}
                onClick={() => setSelectedResource(res)}
                className="group bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-xs hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between cursor-pointer"
              >
                {/* Top Image Banner */}
                <div className="relative h-48 w-full overflow-hidden bg-slate-100">
                  <img
                    src={res.imageUrl}
                    alt={res.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/60 via-transparent to-transparent opacity-60" />

                  {/* Resource Type Badge */}
                  <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-md px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5 shadow-sm border border-white/50">
                    {getResourceTypeIcon(res.type)}
                    <span>{res.typeLabel}</span>
                  </div>

                  {/* Action Buttons: Bookmark, Edit, & Delete */}
                  <div className="absolute top-3 right-3 flex items-center gap-1.5">
                    <button
                      onClick={(e) => toggleBookmark(res.id, e)}
                      title={isBookmarked ? 'Remove Bookmark' : 'Save Bookmark'}
                      className="w-8 h-8 rounded-full bg-white/90 backdrop-blur-md hover:bg-white text-slate-700 flex items-center justify-center shadow-md border border-white/50 transition-all hover:scale-110 active:scale-95"
                    >
                      <Bookmark
                        className={`w-4 h-4 ${
                          isBookmarked ? 'fill-[#5e2be2] text-[#5e2be2]' : 'text-slate-600'
                        }`}
                      />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingResource(res);
                      }}
                      title="Edit Resource"
                      className="w-8 h-8 rounded-full bg-white/90 backdrop-blur-md hover:bg-purple-50 text-slate-500 hover:text-[#5e2be2] flex items-center justify-center shadow-md border border-white/50 transition-all hover:scale-110 active:scale-95"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={(e) => handleDeleteResource(res.id, e)}
                      title="Delete resource from DB"
                      className="w-8 h-8 rounded-full bg-white/90 backdrop-blur-md hover:bg-rose-50 text-slate-400 hover:text-rose-600 flex items-center justify-center shadow-md border border-white/50 transition-all hover:scale-110 active:scale-95"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Content Details */}
                <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                  <div>
                    {res.isRecommended && (
                      <div className="flex items-center gap-1.5 text-xs font-bold text-[#5e2be2] mb-2">
                        <Star className="w-3.5 h-3.5 fill-[#5e2be2] text-[#5e2be2]" />
                        <span>Recommended by Therapist</span>
                      </div>
                    )}

                    <h3 className="text-lg font-bold text-slate-900 leading-snug group-hover:text-[#5e2be2] transition-colors line-clamp-2 mb-2">
                      {res.title}
                    </h3>

                    <p className="text-xs sm:text-sm text-slate-500 leading-relaxed line-clamp-3">
                      {res.description}
                    </p>
                  </div>

                  {/* Card Footer Info */}
                  <div className="pt-4 border-t border-slate-100 flex items-center justify-between mt-auto text-xs text-slate-500 font-medium">
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      <span>{res.duration}</span>
                    </div>

                    <div className="flex items-center gap-1 flex-wrap justify-end">
                      {res.tags.slice(0, 2).map((tag) => (
                        <span
                          key={tag}
                          className="bg-slate-100 text-slate-600 text-[10px] font-semibold px-2 py-0.5 rounded-full"
                        >
                          {tag}
                        </span>
                      ))}
                      {res.tags.length > 2 && (
                        <span className="text-[10px] font-bold text-slate-400">
                          +{res.tags.length - 2}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Empty State */
        <div className="bg-white rounded-3xl p-12 text-center border border-slate-200/80 shadow-xs max-w-lg mx-auto space-y-4 my-8">
          <div className="w-16 h-16 rounded-2xl bg-purple-50 text-[#5e2be2] flex items-center justify-center mx-auto">
            <BookOpen className="w-8 h-8 text-[#5e2be2]" />
          </div>
          <h3 className="text-lg font-bold text-slate-900">No resources found</h3>
          <p className="text-xs text-slate-500">
            {searchQuery
              ? `No resources matching "${searchQuery}". Try searching for another keyword or clear filters.`
              : activeCategory === 'Saved'
              ? 'You have not saved any resources yet. Click the bookmark icon on any card to save it here.'
              : `No resources available in the "${activeCategory}" category.`}
          </p>
          <div className="pt-2">
            <button
              onClick={() => {
                setActiveCategory('All Resources');
                setSearchQuery('');
              }}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all"
            >
              Reset Filters
            </button>
          </div>
        </div>
      )}

      {/* ── RESOURCE DETAIL MODAL ────────────────────────────────────── */}
      {selectedResource && (
        <div className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl border border-slate-100 overflow-hidden my-auto animate-in fade-in zoom-in-95 max-h-[90vh] flex flex-col">
            {/* Modal Header Banner Image */}
            <div className="relative h-56 sm:h-64 w-full bg-slate-900 shrink-0">
              <img
                src={selectedResource.imageUrl}
                alt={selectedResource.title}
                className="w-full h-full object-cover opacity-90"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent" />

              <button
                onClick={() => setSelectedResource(null)}
                className="absolute top-4 right-4 w-9 h-9 rounded-full bg-slate-900/60 text-white hover:bg-slate-900 flex items-center justify-center backdrop-blur-md transition-all shadow-md"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="absolute bottom-4 left-6 right-6 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="bg-white/90 backdrop-blur-md px-3 py-0.5 rounded-full text-[11px] font-extrabold uppercase tracking-wider text-slate-900 flex items-center gap-1.5 shadow-xs">
                    {getResourceTypeIcon(selectedResource.type)}
                    <span>{selectedResource.typeLabel}</span>
                  </span>

                  {selectedResource.isRecommended && (
                    <span className="bg-[#5e2be2] text-white px-3 py-0.5 rounded-full text-[11px] font-extrabold tracking-wider flex items-center gap-1 shadow-xs">
                      <Star className="w-3 h-3 fill-white text-white" />
                      <span>Recommended by Therapist</span>
                    </span>
                  )}
                </div>

                <h2 className="text-xl sm:text-2xl font-extrabold text-white leading-snug">
                  {selectedResource.title}
                </h2>
              </div>
            </div>

            {/* Modal Body Content */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1 text-slate-700">
              {/* Meta information bar */}
              <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-100 text-xs font-medium text-slate-500">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-slate-400" />
                    <span>{selectedResource.duration}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    <span>Clinical Review Verified</span>
                  </div>
                </div>

                {/* Tags */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  {selectedResource.tags.map((tag) => (
                    <span
                      key={tag}
                      className="bg-purple-50 text-[#5e2be2] text-xs font-bold px-2.5 py-0.5 rounded-full border border-purple-100"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>

              {/* Short Summary Description */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/60 leading-relaxed text-sm font-medium text-slate-800">
                {selectedResource.description}
              </div>

              {/* Detailed Content / Guide steps */}
              {selectedResource.fullContent && (
                <div className="space-y-4 text-xs sm:text-sm leading-relaxed text-slate-700 font-normal whitespace-pre-line">
                  <div className="font-extrabold text-slate-900 text-base border-b border-slate-100 pb-2">
                    Clinical Overview & Implementation
                  </div>
                  <div className="prose prose-slate max-w-none text-slate-600">
                    {selectedResource.fullContent}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer Actions */}
            <div className="p-4 sm:p-5 border-t border-slate-100 bg-slate-50/80 flex flex-wrap items-center justify-between gap-3 shrink-0">
              <button
                onClick={(e) => toggleBookmark(selectedResource.id, e)}
                className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-all active:scale-95 ${
                  bookmarkedIds.includes(selectedResource.id)
                    ? 'bg-purple-100 text-[#5e2be2] border border-purple-200'
                    : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <Bookmark
                  className={`w-4 h-4 ${
                    bookmarkedIds.includes(selectedResource.id)
                      ? 'fill-[#5e2be2] text-[#5e2be2]'
                      : 'text-slate-500'
                  }`}
                />
                <span>
                  {bookmarkedIds.includes(selectedResource.id)
                    ? 'Saved in Library'
                    : 'Save to My Library'}
                </span>
              </button>

              <div className="flex items-center gap-2.5">
                <button
                  onClick={() => {
                    const resToEdit = selectedResource;
                    setSelectedResource(null);
                    setEditingResource(resToEdit);
                  }}
                  className="px-4 py-2.5 bg-white hover:bg-purple-50 text-[#5e2be2] border border-purple-200 font-bold text-xs rounded-xl transition-all flex items-center gap-1.5"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Edit Resource</span>
                </button>

                <button
                  onClick={(e) => handleDeleteResource(selectedResource.id, e)}
                  className="px-4 py-2.5 bg-white hover:bg-rose-50 text-rose-600 border border-rose-200 font-bold text-xs rounded-xl transition-all flex items-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete</span>
                </button>

                <button
                  onClick={() => {
                    navigator.clipboard?.writeText(window.location.href);
                    showToast('Resource reference link copied to clipboard!');
                  }}
                  className="px-4 py-2.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 font-bold text-xs rounded-xl transition-all flex items-center gap-1.5"
                >
                  <Share2 className="w-3.5 h-3.5 text-slate-500" />
                  <span>Share</span>
                </button>

                <button
                  onClick={() => setSelectedResource(null)}
                  className="px-5 py-2.5 bg-[#5e2be2] hover:bg-[#4f28d9] text-white font-bold text-xs rounded-xl shadow-md shadow-[#5e2be2]/20 transition-all"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── EDIT RESOURCE MODAL ─────────────────────────────────────── */}
      {editingResource && (
        <div className="fixed inset-0 z-[260] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-fade-in overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-xl w-full shadow-2xl border border-slate-100 overflow-hidden my-auto animate-in fade-in zoom-in-95 p-6 sm:p-7 space-y-5 max-h-[92vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-purple-50 text-[#5e2be2] flex items-center justify-center border border-purple-100">
                  <Edit3 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Edit Resource</h3>
                  <p className="text-xs text-slate-500">Update resource details and sync to MongoDB Atlas</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingResource(null)}
                className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 hover:text-slate-800 flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUpdateResourceSubmit} className="space-y-4 overflow-y-auto pr-1 flex-1">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">TITLE *</label>
                <input
                  type="text"
                  required
                  value={editingResource.title}
                  onChange={(e) => setEditingResource({ ...editingResource, title: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-xs text-slate-900 font-medium focus:ring-2 focus:ring-[#5e2be2] outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">TYPE</label>
                  <select
                    value={editingResource.type}
                    onChange={(e) => {
                      const t = e.target.value as ResourceType;
                      const catMap: Record<ResourceType, string> = {
                        article: 'Articles',
                        worksheet: 'Worksheets',
                        meditation: 'Meditations',
                        video: 'Videos',
                        pdf: 'PDFs'
                      };
                      setEditingResource({
                        ...editingResource,
                        type: t,
                        typeLabel: t.toUpperCase(),
                        category: catMap[t]
                      });
                    }}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-xs text-slate-900 font-medium focus:ring-2 focus:ring-[#5e2be2] outline-none"
                  >
                    <option value="article">Article</option>
                    <option value="worksheet">Worksheet</option>
                    <option value="meditation">Meditation</option>
                    <option value="video">Video</option>
                    <option value="pdf">PDF Document</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">DURATION / READ TIME</label>
                  <input
                    type="text"
                    value={editingResource.duration}
                    onChange={(e) => setEditingResource({ ...editingResource, duration: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-xs text-slate-900 font-medium focus:ring-2 focus:ring-[#5e2be2] outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">SHORT SUMMARY *</label>
                <textarea
                  rows={2}
                  required
                  value={editingResource.description}
                  onChange={(e) => setEditingResource({ ...editingResource, description: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-xs text-slate-900 font-medium focus:ring-2 focus:ring-[#5e2be2] outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">FULL CLINICAL CONTENT / GUIDE</label>
                <textarea
                  rows={4}
                  value={editingResource.fullContent || ''}
                  onChange={(e) => setEditingResource({ ...editingResource, fullContent: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-xs text-slate-900 font-medium focus:ring-2 focus:ring-[#5e2be2] outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">COVER IMAGE URL</label>
                <input
                  type="url"
                  value={editingResource.imageUrl}
                  onChange={(e) => setEditingResource({ ...editingResource, imageUrl: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-xs text-slate-900 font-medium focus:ring-2 focus:ring-[#5e2be2] outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">TAGS (COMMA SEPARATED)</label>
                <input
                  type="text"
                  value={editingResource.tags.join(', ')}
                  onChange={(e) =>
                    setEditingResource({
                      ...editingResource,
                      tags: e.target.value.split(',').map((t) => t.trim()).filter(Boolean)
                    })
                  }
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-xs text-slate-900 font-medium focus:ring-2 focus:ring-[#5e2be2] outline-none"
                />
              </div>

              <div className="flex items-center gap-6 pt-1">
                <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingResource.isRecommended || false}
                    onChange={(e) => setEditingResource({ ...editingResource, isRecommended: e.target.checked })}
                    className="w-4 h-4 text-[#5e2be2] rounded"
                  />
                  <span>Recommended by Therapist</span>
                </label>
                <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingResource.isSaved || false}
                    onChange={(e) => setEditingResource({ ...editingResource, isSaved: e.target.checked })}
                    className="w-4 h-4 text-[#5e2be2] rounded"
                  />
                  <span>Saved in Library</span>
                </label>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm(`Delete "${editingResource.title}"?`)) {
                      handleDeleteResource(editingResource.id);
                      setEditingResource(null);
                    }
                  }}
                  className="px-3.5 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 rounded-xl transition-all flex items-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete</span>
                </button>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingResource(null)}
                    className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-[#5e2be2] hover:bg-[#4f28d9] text-white font-bold text-xs rounded-xl shadow-md transition-all active:scale-95"
                  >
                    Save Changes
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── ADD NEW RESOURCE MODAL (QUENZA-STYLE) ────────────────────── */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-fade-in overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-100 overflow-hidden my-auto animate-in fade-in zoom-in-95 p-6 sm:p-7 space-y-5">
            {/* Modal Header */}
            <div>
              <h3 className="text-xl font-bold text-slate-900 tracking-tight">Add a resource</h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                You can add a file or a link as a resource. Choose the type of the resource that you want to add below.
              </p>
            </div>

            {/* Segmented Switcher (File | Link) */}
            <div className="flex justify-center">
              <div className="inline-flex bg-slate-100 p-1 rounded-xl border border-slate-200/80">
                <button
                  type="button"
                  onClick={() => setResourceTab('file')}
                  className={`flex items-center gap-1.5 px-5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    resourceTab === 'file'
                      ? 'bg-white text-[#5e2be2] shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <FileUp className="w-3.5 h-3.5" />
                  <span>File</span>
                </button>
                <button
                  type="button"
                  onClick={() => setResourceTab('link')}
                  className={`flex items-center gap-1.5 px-5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    resourceTab === 'link'
                      ? 'bg-white text-[#5e2be2] shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <LinkIcon className="w-3.5 h-3.5" />
                  <span>Link</span>
                </button>
              </div>
            </div>

            <form onSubmit={handleAddResourceSubmit} className="space-y-4">
              {/* FILE TAB */}
              {resourceTab === 'file' && (
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-800">
                    File <span className="text-rose-500">*</span>
                  </label>
                  <p className="text-[11px] text-slate-500 mb-1">
                    You can add a file to the client's resources
                  </p>

                  <label className="border-2 border-dashed border-slate-200 hover:border-[#5e2be2]/60 hover:bg-purple-50/20 rounded-2xl p-6 flex flex-col items-center justify-center gap-2 cursor-pointer transition-all group">
                    <input
                      type="file"
                      onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                      className="hidden"
                      accept=".pdf,.doc,.docx,.xls,.xlsx,.mp3,.wav,.mp4,.png,.jpg,.jpeg"
                    />
                    {selectedFile ? (
                      <div className="flex items-center gap-3 bg-purple-50 px-4 py-2 rounded-xl border border-purple-200">
                        <FileText className="w-5 h-5 text-[#5e2be2]" />
                        <div className="text-left">
                          <p className="text-xs font-bold text-slate-900 truncate max-w-xs">{selectedFile.name}</p>
                          <p className="text-[10px] text-slate-500">{(selectedFile.size / 1024).toFixed(1)} KB</p>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedFile(null);
                          }}
                          className="p-1 hover:bg-purple-100 rounded-full text-slate-400 hover:text-slate-600"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <>
                        <div className="w-10 h-10 rounded-full bg-slate-100 group-hover:bg-purple-100 text-slate-600 group-hover:text-[#5e2be2] flex items-center justify-center transition-colors">
                          <Upload className="w-5 h-5" />
                        </div>
                        <div className="text-xs font-medium text-slate-700">
                          <span className="text-[#5e2be2] font-bold">Upload a file</span> or drag and drop
                        </div>
                      </>
                    )}
                  </label>
                  <div className="text-right text-[11px] text-slate-400 font-medium">
                    up to 25MB
                  </div>
                </div>
              )}

              {/* LINK TAB */}
              {resourceTab === 'link' && (
                <div className="space-y-3.5">
                  <div>
                    <label className="block text-xs font-bold text-slate-800">
                      Label <span className="text-rose-500">*</span>
                    </label>
                    <p className="text-[11px] text-slate-500 mb-1.5">
                      A label for the link
                    </p>
                    <input
                      type="text"
                      placeholder=""
                      value={linkLabel}
                      onChange={(e) => setLinkLabel(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-slate-900 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#5e2be2]"
                      required={resourceTab === 'link'}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-800">
                      URL <span className="text-rose-500">*</span>
                    </label>
                    <p className="text-[11px] text-slate-500 mb-1.5">
                      The url for the link
                    </p>
                    <input
                      type="text"
                      placeholder="https://"
                      value={linkUrl}
                      onChange={(e) => setLinkUrl(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-slate-900 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#5e2be2]"
                      required={resourceTab === 'link'}
                    />
                  </div>
                </div>
              )}

              {/* CONTEXT FIELD (SHARED) */}
              <div className="space-y-1 pt-1">
                <label className="block text-xs font-bold text-slate-800">
                  Context
                </label>
                <p className="text-[11px] text-slate-500 mb-1.5 leading-snug">
                  Select the clients or groups this resource is associated with. Use the sharing toggle to control whether they have access to it.
                </p>

                <div className="relative">
                  <div className="relative">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Find a client or group by name"
                      value={contextSearch}
                      onFocus={() => setIsContextDropdownOpen(true)}
                      onChange={(e) => {
                        setContextSearch(e.target.value);
                        setIsContextDropdownOpen(true);
                      }}
                      className="w-full pl-10 pr-10 py-2 rounded-xl border border-slate-200 bg-white text-slate-900 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#5e2be2]"
                    />
                    <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                  </div>

                  {isContextDropdownOpen && (
                    <>
                      <div
                        className="fixed inset-0 z-10"
                        onClick={() => setIsContextDropdownOpen(false)}
                      />
                      <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-20 max-h-48 overflow-y-auto p-1 space-y-0.5 animate-in fade-in-50 zoom-in-95">
                        {contextOptions
                          .filter((opt) => opt.name.toLowerCase().includes(contextSearch.toLowerCase()))
                          .map((opt) => {
                            const isSelected = selectedContexts.includes(opt.name);
                            return (
                              <button
                                key={opt.id}
                                type="button"
                                onClick={() => {
                                  if (isSelected) {
                                    setSelectedContexts((prev) => prev.filter((n) => n !== opt.name));
                                  } else {
                                    setSelectedContexts((prev) => [...prev, opt.name]);
                                  }
                                }}
                                className={`w-full px-3 py-2 text-left rounded-lg text-xs flex items-center justify-between transition-colors cursor-pointer ${
                                  isSelected
                                    ? 'bg-purple-50 text-[#5e2be2] font-bold'
                                    : 'hover:bg-slate-50 text-slate-700 font-medium'
                                }`}
                              >
                                <div className="flex items-center gap-2">
                                  <span>{opt.name}</span>
                                  <span className="text-[10px] px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded font-normal">
                                    {opt.type}
                                  </span>
                                </div>
                                {isSelected && <Check className="w-3.5 h-3.5 text-[#5e2be2]" />}
                              </button>
                            );
                          })}
                      </div>
                    </>
                  )}
                </div>

                <div className="mt-2 min-h-[20px]">
                  {selectedContexts.length === 0 ? (
                    <p className="text-xs text-slate-400 font-medium">No clients or groups selected yet</p>
                  ) : (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {selectedContexts.map((name) => (
                        <span
                          key={name}
                          className="inline-flex items-center gap-1.5 bg-purple-50 border border-purple-100 text-[#5e2be2] font-semibold text-xs px-2.5 py-1 rounded-full"
                        >
                          <span>{name}</span>
                          <button
                            type="button"
                            onClick={() => setSelectedContexts((prev) => prev.filter((n) => n !== name))}
                            className="hover:bg-purple-200/50 rounded-full p-0.5 cursor-pointer"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Modal Footer Actions */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-[#5e2be2] hover:bg-[#4f28d9] text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer active:scale-95"
                >
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ResourcesView;
