import React, { useState, useEffect, useRef } from 'react';
import { getClientAuth } from '@/lib/auth';
import { getUserStorageKey } from '@/lib/client-store';
import { useToast } from '@/hooks/use-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { pageTransition, staggerContainer, staggerItem, PageHeader } from '@/components/shared';
import {
  BookOpen,
  PlayCircle,
  Download,
  Bookmark,
  BookmarkCheck,
  Search,
  Star,
  Clock,
  X,
  ExternalLink,
  Share2,
  Check,
  Tag
} from 'lucide-react';

export interface ResourceItem {
  id: string | number;
  title: string;
  type?: 'article' | 'worksheet' | 'meditation' | 'video' | 'pdf';
  typeLabel?: string;
  category: string;
  description: string;
  fullContent?: string;
  thumbnailUrl?: string;
  imageUrl?: string;
  duration?: string;
  readingMinutes?: number;
  author?: string;
  isSaved?: boolean;
  isRecommended?: boolean;
  isSharedByTherapist?: boolean;
  tags?: string[];
  downloadUrl?: string;
  externalUrl?: string;
  fileUrl?: string;
  url?: string;
}

/** Old device-wide cache keys, shared by everyone who signed in on this device */
const LEGACY_RESOURCES_KEY = 'hexpertify_client_resources';
const LEGACY_SAVED_IDS_KEY = 'hexpertify_client_saved_resource_ids';

/** Only web addresses and same-site paths may be opened (never javascript: or other schemes) */
function safeLink(value: unknown): string {
  const s = String(value || '').trim();
  if (/^https?:\/\//i.test(s)) return s;
  if (s.startsWith('/') && !s.startsWith('//')) return s;
  return '';
}

/**
 * The file or page a resource points to. Older resources only carry their link inside the text
 * ("Direct Link: …", "URL: …", "External link: …"), so that is checked last.
 */
function getResourceLink(r: ResourceItem): string {
  const direct = safeLink(r.downloadUrl) || safeLink(r.fileUrl) || safeLink(r.externalUrl) || safeLink(r.url);
  if (direct) return direct;
  const text = `${r.fullContent || ''}\n${r.description || ''}`;
  const match = text.match(/https?:\/\/[^\s)"'<>]+/i);
  return match ? safeLink(match[0].replace(/[.,;]+$/, '')) : '';
}

const CATEGORY_TABS = [
  { id: 'All Resources', label: 'All Resources' },
  { id: 'Saved', label: 'Saved' },
  { id: 'Articles', label: 'Articles' },
  { id: 'Worksheets', label: 'Worksheets' },
  { id: 'Meditations', label: 'Meditations' },
  { id: 'Videos', label: 'Videos' },
  { id: 'PDFs', label: 'PDFs' },
];

export default function ResourcesPage() {
  const [activeCategory, setActiveCategory] = useState<string>('All Resources');
  const [searchQuery, setSearchQuery] = useState('');
  const { toast } = useToast();
  const authUser = getClientAuth();
  const myEmail = String(authUser?.email || '').toLowerCase().trim();
  const myId = String(authUser?.id || '').trim();
  // Cached per signed-in client, so another person on this device never sees this list or these saves
  const resourcesKey = getUserStorageKey(LEGACY_RESOURCES_KEY);
  const savedIdsKey = getUserStorageKey(LEGACY_SAVED_IDS_KEY);

  const [resources, setResources] = useState<ResourceItem[]>(() => {
    try {
      // The old shared copies may hold someone else's list: drop them
      localStorage.removeItem(LEGACY_RESOURCES_KEY);
      localStorage.removeItem(LEGACY_SAVED_IDS_KEY);
      const saved = localStorage.getItem(resourcesKey);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [savedIds, setSavedIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(savedIdsKey);
      if (saved) return JSON.parse(saved);
    } catch {}
    return [];
  });

  const [selectedResource, setSelectedResource] = useState<ResourceItem | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  // Resource ids whose save/unsave is on its way to the server
  const [savingIds, setSavingIds] = useState<string[]>([]);
  // A shared link (?id=…) names the resource to open once the list is loaded
  const [linkedId] = useState<string>(() => {
    try {
      return new URLSearchParams(window.location.search).get('id') || '';
    } catch {
      return '';
    }
  });
  const requestedIdRef = useRef<string>(linkedId);

  /** Drops ?id= from the address so a refresh does not open (or report) it again */
  const clearIdParam = () => {
    try {
      const url = new URL(window.location.href);
      if (url.searchParams.has('id')) {
        url.searchParams.delete('id');
        window.history.replaceState(window.history.state, '', `${url.pathname}${url.search}${url.hash}`);
      }
    } catch {}
  };

  useEffect(() => {
    const wanted = requestedIdRef.current;
    if (!wanted || resources.length === 0) return;
    const match = resources.find((r) => String(r.id) === wanted);
    if (match) {
      requestedIdRef.current = '';
      setSelectedResource(match);
    }
  }, [resources]);

  const closeResource = () => {
    setSelectedResource(null);
    requestedIdRef.current = '';
    clearIdParam();
  };

  const handleShare = async (resource: ResourceItem) => {
    const link = `${window.location.origin}${window.location.pathname}?id=${encodeURIComponent(String(resource.id))}`;
    try {
      if (!navigator.clipboard?.writeText) throw new Error('no clipboard');
      await navigator.clipboard.writeText(link);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    } catch {
      toast({
        title: 'Could not copy the link',
        description: `Your browser did not allow copying. Copy this link by hand: ${link}`,
        variant: 'destructive'
      });
    }
  };

  const fetchLiveResources = () => {
    const q = new URLSearchParams();
    if (myEmail) q.set('clientEmail', myEmail);
    if (myId) q.set('clientId', myId);
    fetch(`/api/resources${q.toString() ? `?${q.toString()}` : ''}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.resources && Array.isArray(data.resources)) {
          // The server sends who saved each resource; this client only needs its own isSaved flag
          const active: ResourceItem[] = data.resources.map(({ savedBy, ...r }: any) => r);
          setResources(active);
          const mySaved = active.filter((r) => r.isSaved).map((r) => String(r.id));
          setSavedIds(mySaved);
          try {
            localStorage.setItem(resourcesKey, JSON.stringify(active));
            localStorage.setItem(savedIdsKey, JSON.stringify(mySaved));
          } catch {}
          // A shared link to a resource this client cannot see
          const wanted = requestedIdRef.current;
          if (wanted && !active.some((r) => String(r.id) === wanted)) {
            requestedIdRef.current = '';
            clearIdParam();
            toast({
              title: 'Resource not available',
              description: 'The resource in this link was removed or is not shared with you.',
              variant: 'destructive'
            });
          }
        }
      })
      .catch((err) => {
        console.log('[Client Resources] Loaded standard resource cache:', err?.message);
      });
  };

  // Fetch live resources and bind real-time cross-panel synchronization listeners
  useEffect(() => {
    fetchLiveResources();

    const handleResourceDeleted = (e: any) => {
      const delId = e?.detail?.id;
      if (delId) {
        setResources((prev) => prev.filter((r) => String(r.id) !== String(delId)));
        if (selectedResource && String(selectedResource.id) === String(delId)) {
          setSelectedResource(null);
        }
      } else {
        fetchLiveResources();
      }
    };

    window.addEventListener('resource_deleted', handleResourceDeleted);
    window.addEventListener('resource_data_updated', fetchLiveResources);
    window.addEventListener('storage', fetchLiveResources);
    window.addEventListener('focus', fetchLiveResources);

    return () => {
      window.removeEventListener('resource_deleted', handleResourceDeleted);
      window.removeEventListener('resource_data_updated', fetchLiveResources);
      window.removeEventListener('storage', fetchLiveResources);
      window.removeEventListener('focus', fetchLiveResources);
    };
  }, []);

  const applySaved = (strId: string, saved: boolean) => {
    setSavedIds((prev) => {
      const next = saved ? Array.from(new Set([...prev, strId])) : prev.filter((item) => item !== strId);
      try {
        localStorage.setItem(savedIdsKey, JSON.stringify(next));
      } catch {}
      return next;
    });
    setResources((prev) => prev.map((r) => (String(r.id) === strId ? { ...r, isSaved: saved } : r)));
    setSelectedResource((prev) => (prev && String(prev.id) === strId ? { ...prev, isSaved: saved } : prev));
  };

  const handleToggleSave = async (e: React.MouseEvent, id: string | number) => {
    e.preventDefault();
    e.stopPropagation();
    const strId = String(id);
    if (savingIds.includes(strId)) return;
    const resource = resources.find((r) => String(r.id) === strId);
    const isCurrentlySaved = savedIds.includes(strId) || Boolean(resource?.isSaved);
    const action = isCurrentlySaved ? 'remove it from Saved' : 'save it';

    // Saved per user (Resource.savedBy) on the server, never as a global flag
    if (!myEmail) {
      toast({
        title: 'Could not change Saved',
        description: 'Your sign-in details are missing. Please sign out and sign in again, then try once more.',
        variant: 'destructive'
      });
      return;
    }

    // Shown at once, and put back if the server does not confirm it
    applySaved(strId, !isCurrentlySaved);
    setSavingIds((prev) => [...prev, strId]);
    let failure = '';
    try {
      const res = await fetch(`/api/resources/${encodeURIComponent(strId)}/save`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: myEmail, saved: !isCurrentlySaved })
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || data?.success === false) {
        failure = data?.error || `The server answered with error ${res.status}.`;
      }
    } catch {
      failure = 'Hexpertify could not be reached.';
    }
    setSavingIds((prev) => prev.filter((item) => item !== strId));

    if (failure) {
      applySaved(strId, isCurrentlySaved);
      toast({
        title: 'Could not change Saved',
        description: `We could not ${action}. ${failure} Check your connection and try again.`,
        variant: 'destructive'
      });
    }
  };

  const filteredResources = resources.filter((resource) => {
    const strId = String(resource.id);
    const categoryName = resource.category || (resource.type ? resource.type.charAt(0).toUpperCase() + resource.type.slice(1) + 's' : 'Articles');
    
    // Category match
    if (activeCategory === 'Saved') {
      if (!savedIds.includes(strId) && !resource.isSaved) return false;
    } else if (activeCategory !== 'All Resources') {
      const activeLower = activeCategory.toLowerCase();
      const catLower = categoryName.toLowerCase();
      const typeLower = (resource.type || '').toLowerCase();
      if (!catLower.includes(activeLower.slice(0, 4)) && !typeLower.includes(activeLower.slice(0, 4))) {
        return false;
      }
    }

    // Search query match
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = (resource.title || '').toLowerCase().includes(q);
      const matchDesc = (resource.description || '').toLowerCase().includes(q);
      const matchTags = (resource.tags || []).some((t) => t.toLowerCase().includes(q));
      if (!matchTitle && !matchDesc && !matchTags) return false;
    }

    return true;
  });

  return (
    <motion.div {...pageTransition} className="w-full space-y-8 pb-12 font-sans">
      <PageHeader
        title="Resource Library"
        description="Tools, evidence-based guides, worksheets, and guided audio to support your wellness journey."
        badge="RESOURCE LIBRARY"
        icon={<BookOpen className="w-4 h-4 text-purple-200" />}
      >
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search guides, worksheets, topics..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white/95 text-slate-900 placeholder:text-slate-400 rounded-full text-xs font-semibold shadow-sm border border-slate-200 focus:border-[#450bc8] outline-none transition-all"
          />
        </div>
      </PageHeader>

      {/* Category Filter Tabs */}
      <div className="flex overflow-x-auto pb-2 -mx-2 px-2 gap-2 hide-scrollbar">
        {CATEGORY_TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveCategory(tab.id)}
            className={`whitespace-nowrap px-5 py-2.5 sm:py-2 rounded-full font-semibold text-xs tracking-wide transition-all cursor-pointer ${
              activeCategory === tab.id
                ? 'bg-[#450bc8] text-white shadow-md shadow-[#450bc8]/25'
                : 'bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200/80'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Resource Cards Grid */}
      {filteredResources.length === 0 ? (
        <div className="bg-white rounded-3xl p-16 border border-slate-200 text-center flex flex-col items-center justify-center">
          <div className="w-16 h-16 rounded-2xl bg-purple-50 text-[#450bc8] flex items-center justify-center mb-4">
            <Search className="w-7 h-7" />
          </div>
          <h3 className="text-lg font-bold text-slate-900 mb-1">No resources found</h3>
          <p className="text-xs text-slate-500 max-w-sm">
            Try adjusting your search criteria or switching to a different category.
          </p>
        </div>
      ) : (
        <motion.div variants={staggerContainer} initial="hidden" animate="show" className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 min-[1800px]:grid-cols-4 gap-4 sm:gap-6">
          {filteredResources.map((resource) => {
            const isSaved = savedIds.includes(String(resource.id)) || resource.isSaved;
            const categoryLabel = resource.category || (resource.type ? resource.type.charAt(0).toUpperCase() + resource.type.slice(1) + 's' : 'Articles');
            const img = resource.imageUrl || resource.thumbnailUrl || 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?auto=format&fit=crop&w=800&q=80';

            return (
              <motion.div
                key={resource.id}
                variants={staggerItem}
                onClick={() => setSelectedResource(resource)}
                className="bg-white rounded-3xl border border-slate-200/90 overflow-hidden flex flex-col group hover:shadow-xl hover:border-[#450bc8]/30 transition-all duration-300 cursor-pointer"
              >
                {/* Image Header */}
                <div className="relative h-44 sm:h-48 bg-slate-100 overflow-hidden">
                  <img
                    src={img}
                    alt={resource.title}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/60 via-transparent to-black/20" />

                  {/* Top Badges */}
                  <div className="absolute top-3.5 left-3.5 flex items-center gap-2">
                    <span className="px-3 py-1 bg-white/95 backdrop-blur text-slate-900 rounded-full text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5 shadow-sm">
                      <span>{categoryLabel}</span>
                    </span>
                  </div>

                  {/* Bookmark Button */}
                  <button
                    type="button"
                    onClick={(e) => handleToggleSave(e, resource.id)}
                    className="absolute top-3.5 right-3.5 w-9 h-9 rounded-full bg-white/95 backdrop-blur flex items-center justify-center text-slate-700 hover:bg-white transition-all shadow-sm cursor-pointer"
                  >
                    {isSaved ? (
                      <BookmarkCheck className="w-5 h-5 text-[#450bc8]" fill="currentColor" />
                    ) : (
                      <Bookmark className="w-5 h-5 text-slate-500" />
                    )}
                  </button>

                  {/* Read / Watch Duration Badge */}
                  <div className="absolute bottom-3.5 left-3.5 flex items-center gap-1.5 text-white text-xs font-semibold drop-shadow-md">
                    <Clock className="w-3.5 h-3.5" />
                    <span>{resource.duration || `${resource.readingMinutes || 5} min read`}</span>
                  </div>
                </div>

                {/* Content Body */}
                <div className="p-5 flex flex-col flex-1">
                  {resource.isRecommended && (
                    <div className="flex items-center gap-1.5 text-[11px] font-extrabold text-[#450bc8] uppercase tracking-wide mb-2.5">
                      <Star className="w-3.5 h-3.5 fill-[#450bc8]" />
                      <span>Recommended by Care Team</span>
                    </div>
                  )}

                  <h3 className="text-base font-bold text-slate-900 mb-2 leading-snug group-hover:text-[#450bc8] transition-colors line-clamp-2">
                    {resource.title}
                  </h3>

                  <p className="text-slate-500 text-xs line-clamp-2 mb-4 flex-1 leading-relaxed">
                    {resource.description || 'Access insights, somatic steps, and guided reflection exercises.'}
                  </p>

                  {/* Tags */}
                  {resource.tags && resource.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-4">
                      {resource.tags.slice(0, 3).map((tag, idx) => (
                        <span key={idx} className="text-[10px] font-semibold bg-slate-100 text-slate-600 px-2.5 py-0.5 rounded-md">
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Footer */}
                  <div className="flex items-center justify-between pt-3 border-t border-slate-100 mt-auto">
                    <span className="text-xs font-bold text-[#450bc8] group-hover:underline flex items-center gap-1">
                      Read Complete Guide
                    </span>
                    <div className="w-8 h-8 rounded-full bg-purple-50 text-[#450bc8] flex items-center justify-center group-hover:bg-[#450bc8] group-hover:text-white transition-colors">
                      <ExternalLink className="w-4 h-4" />
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      )}

      {/* Full Resource Reading Modal */}
      <AnimatePresence>
        {selectedResource && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/60 backdrop-blur-sm animate-fade-in overflow-y-auto">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-auto max-h-[92dvh] flex flex-col"
            >
              {/* Modal Cover Image & Close */}
              <div className="relative h-44 sm:h-64 [@media(max-height:500px)]:max-h-28 bg-slate-900 shrink-0">
                <img
                  src={selectedResource.imageUrl || selectedResource.thumbnailUrl || 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?auto=format&fit=crop&w=800&q=80'}
                  alt={selectedResource.title}
                  className="w-full h-full object-cover opacity-85"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/40 to-transparent" />

                <button
                  onClick={closeResource}
                  aria-label="Close"
                  className="absolute top-4 right-4 w-9 h-9 rounded-full bg-black/40 text-white hover:bg-black/70 flex items-center justify-center transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>

                <div className="absolute bottom-4 left-4 right-4 sm:left-6 sm:right-6 text-white space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="px-3 py-0.5 bg-white/20 backdrop-blur rounded-full text-[11px] font-bold uppercase tracking-wider">
                      {selectedResource.category || 'Article'}
                    </span>
                    <span className="text-xs text-slate-300 font-medium flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" /> {selectedResource.duration || '5 min read'}
                    </span>
                  </div>
                  <h2 className="text-xl sm:text-2xl font-black leading-tight text-white">
                    {selectedResource.title}
                  </h2>
                </div>
              </div>

              {/* Modal Content Body */}
              <div className="p-4 sm:p-8 overflow-y-auto flex-1 min-h-0 space-y-6 text-slate-700">
                {/* Description Callout */}
                <div className="p-4 bg-purple-50/70 border border-purple-100 rounded-2xl text-xs sm:text-sm text-purple-950 font-medium leading-relaxed">
                  {selectedResource.description}
                </div>

                {/* The video, PDF, worksheet or page this resource points to */}
                {(() => {
                  const link = getResourceLink(selectedResource);
                  if (!link) return null;
                  const kind = String(selectedResource.type || selectedResource.category || '').toLowerCase();
                  const isFile = /pdf|worksheet/.test(kind) || /\.(pdf|docx?|xlsx?|pptx?|mp3|wav|mp4|mov)(\?|#|$)/i.test(link);
                  return (
                    <div className="flex flex-wrap items-center gap-2">
                      <a
                        href={link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#450bc8] hover:bg-[#3a0aa8] text-white font-bold text-xs shadow-md shadow-[#450bc8]/25"
                      >
                        {/video|meditation/.test(kind) ? <PlayCircle className="w-4 h-4" /> : <ExternalLink className="w-4 h-4" />}
                        <span>{/video/.test(kind) ? 'Watch video' : /meditation/.test(kind) ? 'Listen' : 'Open'}</span>
                      </a>
                      {isFile && (
                        <a
                          href={link}
                          download
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 font-bold text-xs"
                        >
                          <Download className="w-4 h-4" />
                          <span>Download</span>
                        </a>
                      )}
                    </div>
                  );
                })()}

                {/* Formatted Full Content */}
                <div className="space-y-4 text-sm leading-relaxed whitespace-pre-line font-normal text-slate-700">
                  {selectedResource.fullContent || selectedResource.description}
                </div>

                {/* Tags Section */}
                {selectedResource.tags && selectedResource.tags.length > 0 && (
                  <div className="pt-4 border-t border-slate-100 space-y-2">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Related Focus Areas</p>
                    <div className="flex flex-wrap gap-2">
                      {selectedResource.tags.map((tag, i) => (
                        <span key={i} className="text-xs font-semibold px-3 py-1 bg-slate-100 text-slate-700 rounded-lg">
                          #{tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Modal Footer Actions */}
              <div className="p-4 sm:p-5 border-t border-slate-100 bg-slate-50 flex flex-wrap items-center justify-between gap-2 shrink-0">
                <button
                  onClick={(e) => handleToggleSave(e, selectedResource.id)}
                  disabled={savingIds.includes(String(selectedResource.id))}
                  className={`disabled:opacity-60 px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-all cursor-pointer ${
                    savedIds.includes(String(selectedResource.id)) || selectedResource.isSaved
                      ? 'bg-purple-100 text-[#450bc8]'
                      : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  {savedIds.includes(String(selectedResource.id)) || selectedResource.isSaved ? (
                    <>
                      <BookmarkCheck className="w-4 h-4" />
                      <span>Saved to Library</span>
                    </>
                  ) : (
                    <>
                      <Bookmark className="w-4 h-4" />
                      <span>Save Resource</span>
                    </>
                  )}
                </button>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => void handleShare(selectedResource)}
                    className="px-3.5 py-2.5 bg-white border border-slate-200 hover:bg-slate-100 rounded-xl font-bold text-xs text-slate-700 flex items-center gap-1.5 cursor-pointer"
                  >
                    {copiedLink ? <Check className="w-4 h-4 text-emerald-600" /> : <Share2 className="w-4 h-4" />}
                    <span>{copiedLink ? 'Link Copied' : 'Share'}</span>
                  </button>

                  <button
                    onClick={closeResource}
                    className="px-5 py-2.5 bg-[#450bc8] hover:bg-[#3a0aa8] text-white rounded-xl font-bold text-xs shadow-md shadow-[#450bc8]/25 cursor-pointer"
                  >
                    Close
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
