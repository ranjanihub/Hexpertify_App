import React, { useState, useEffect } from 'react';
import { getClientAuth } from '@/lib/auth';
import { motion, AnimatePresence } from 'framer-motion';
import { pageTransition, staggerContainer, staggerItem, PageHeader } from '@/components/shared';
import {
  BookOpen,
  PlayCircle,
  FileText,
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
  Tag,
  Headphones,
  FileSpreadsheet
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

const DEFAULT_CLIENT_RESOURCES: ResourceItem[] = [
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

export default function ResourcesPage() {
  const [activeCategory, setActiveCategory] = useState<string>('All Resources');
  const [searchQuery, setSearchQuery] = useState('');
  const authUser = getClientAuth();
  const myEmail = String(authUser?.email || '').toLowerCase().trim();
  const myId = String(authUser?.id || '').trim();

  const [resources, setResources] = useState<ResourceItem[]>(() => {
    try {
      const saved = localStorage.getItem('hexpertify_client_resources');
      return saved ? JSON.parse(saved) : DEFAULT_CLIENT_RESOURCES.map((r) => ({ ...r, isSaved: false }));
    } catch {
      return DEFAULT_CLIENT_RESOURCES.map((r) => ({ ...r, isSaved: false }));
    }
  });

  const [savedIds, setSavedIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('hexpertify_client_saved_resource_ids');
      if (saved) return JSON.parse(saved);
    } catch {}
    return [];
  });

  const [selectedResource, setSelectedResource] = useState<ResourceItem | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  const fetchLiveResources = () => {
    const q = new URLSearchParams();
    if (myEmail) q.set('clientEmail', myEmail);
    if (myId) q.set('clientId', myId);
    fetch(`/api/resources${q.toString() ? `?${q.toString()}` : ''}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.resources && Array.isArray(data.resources)) {
          const active: ResourceItem[] = data.resources;
          setResources(active);
          const mySaved = active.filter((r) => r.isSaved).map((r) => String(r.id));
          setSavedIds(mySaved);
          try {
            localStorage.setItem('hexpertify_client_resources', JSON.stringify(active));
            localStorage.setItem('hexpertify_client_saved_resource_ids', JSON.stringify(mySaved));
          } catch {}
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

  const handleToggleSave = (e: React.MouseEvent, id: string | number) => {
    e.preventDefault();
    e.stopPropagation();
    const strId = String(id);
    const isCurrentlySaved = savedIds.includes(strId);
    const nextSavedIds = isCurrentlySaved
      ? savedIds.filter((item) => item !== strId)
      : [...savedIds, strId];

    setSavedIds(nextSavedIds);
    try {
      localStorage.setItem('hexpertify_client_saved_resource_ids', JSON.stringify(nextSavedIds));
    } catch {}

    // Also update local resource isSaved flag
    setResources((prev) =>
      prev.map((r) => (String(r.id) === strId ? { ...r, isSaved: !isCurrentlySaved } : r))
    );

    // Saved per user (Resource.savedBy), never as a global flag
    if (myEmail) {
      fetch(`/api/resources/${encodeURIComponent(strId)}/save`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: myEmail, saved: !isCurrentlySaved })
      }).catch(() => {});
    }
  };

  const getCategoryIcon = (category: string) => {
    const cat = category.toLowerCase();
    if (cat.includes('video')) return <PlayCircle className="w-4 h-4 text-rose-500" />;
    if (cat.includes('pdf')) return <FileText className="w-4 h-4 text-emerald-500" />;
    if (cat.includes('worksheet')) return <FileSpreadsheet className="w-4 h-4 text-amber-500" />;
    if (cat.includes('meditation')) return <Headphones className="w-4 h-4 text-blue-500" />;
    return <BookOpen className="w-4 h-4 text-purple-500" />;
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
            className="w-full pl-10 pr-4 py-2.5 bg-white/95 text-slate-900 placeholder:text-slate-400 rounded-full text-xs font-semibold shadow-sm border border-slate-200 focus:border-[#5e2be2] outline-none transition-all"
          />
        </div>
      </PageHeader>

      {/* Category Filter Tabs */}
      <div className="flex overflow-x-auto pb-2 -mx-2 px-2 gap-2 hide-scrollbar">
        {CATEGORY_TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveCategory(tab.id)}
            className={`whitespace-nowrap px-5 py-2 rounded-full font-semibold text-xs tracking-wide transition-all cursor-pointer ${
              activeCategory === tab.id
                ? 'bg-[#5e2be2] text-white shadow-md shadow-[#5e2be2]/25'
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
          <div className="w-16 h-16 rounded-2xl bg-purple-50 text-[#5e2be2] flex items-center justify-center mb-4">
            <Search className="w-7 h-7" />
          </div>
          <h3 className="text-lg font-bold text-slate-900 mb-1">No resources found</h3>
          <p className="text-xs text-slate-500 max-w-sm">
            Try adjusting your search criteria or switching to a different category.
          </p>
        </div>
      ) : (
        <motion.div variants={staggerContainer} initial="hidden" animate="show" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredResources.map((resource) => {
            const isSaved = savedIds.includes(String(resource.id)) || resource.isSaved;
            const categoryLabel = resource.category || (resource.type ? resource.type.charAt(0).toUpperCase() + resource.type.slice(1) + 's' : 'Articles');
            const img = resource.imageUrl || resource.thumbnailUrl || 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?auto=format&fit=crop&w=800&q=80';

            return (
              <motion.div
                key={resource.id}
                variants={staggerItem}
                onClick={() => setSelectedResource(resource)}
                className="bg-white rounded-3xl border border-slate-200/90 overflow-hidden flex flex-col group hover:shadow-xl hover:border-[#5e2be2]/30 transition-all duration-300 cursor-pointer"
              >
                {/* Image Header */}
                <div className="relative h-48 bg-slate-100 overflow-hidden">
                  <img
                    src={img}
                    alt={resource.title}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/60 via-transparent to-black/20" />

                  {/* Top Badges */}
                  <div className="absolute top-3.5 left-3.5 flex items-center gap-2">
                    <span className="px-3 py-1 bg-white/95 backdrop-blur text-slate-900 rounded-full text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5 shadow-sm">
                      {getCategoryIcon(categoryLabel)}
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
                      <BookmarkCheck className="w-5 h-5 text-[#5e2be2]" fill="currentColor" />
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
                    <div className="flex items-center gap-1.5 text-[11px] font-extrabold text-[#5e2be2] uppercase tracking-wide mb-2.5">
                      <Star className="w-3.5 h-3.5 fill-[#5e2be2]" />
                      <span>Recommended by Care Team</span>
                    </div>
                  )}

                  <h3 className="text-base font-bold text-slate-900 mb-2 leading-snug group-hover:text-[#5e2be2] transition-colors line-clamp-2">
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
                    <span className="text-xs font-bold text-[#5e2be2] group-hover:underline flex items-center gap-1">
                      Read Complete Guide
                    </span>
                    <div className="w-8 h-8 rounded-full bg-purple-50 text-[#5e2be2] flex items-center justify-center group-hover:bg-[#5e2be2] group-hover:text-white transition-colors">
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
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-950/60 backdrop-blur-sm animate-fade-in overflow-y-auto">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-8 max-h-[90vh] flex flex-col"
            >
              {/* Modal Cover Image & Close */}
              <div className="relative h-56 sm:h-64 bg-slate-900 shrink-0">
                <img
                  src={selectedResource.imageUrl || selectedResource.thumbnailUrl || 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?auto=format&fit=crop&w=800&q=80'}
                  alt={selectedResource.title}
                  className="w-full h-full object-cover opacity-85"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/40 to-transparent" />

                <button
                  onClick={() => setSelectedResource(null)}
                  className="absolute top-4 right-4 w-9 h-9 rounded-full bg-black/40 text-white hover:bg-black/70 flex items-center justify-center transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>

                <div className="absolute bottom-4 left-6 right-6 text-white space-y-1.5">
                  <div className="flex items-center gap-2">
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
              <div className="p-6 sm:p-8 overflow-y-auto flex-1 space-y-6 text-slate-700">
                {/* Description Callout */}
                <div className="p-4 bg-purple-50/70 border border-purple-100 rounded-2xl text-xs sm:text-sm text-purple-950 font-medium leading-relaxed">
                  {selectedResource.description}
                </div>

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
              <div className="p-4 sm:p-5 border-t border-slate-100 bg-slate-50 flex items-center justify-between shrink-0">
                <button
                  onClick={(e) => handleToggleSave(e, selectedResource.id)}
                  className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-all cursor-pointer ${
                    savedIds.includes(String(selectedResource.id)) || selectedResource.isSaved
                      ? 'bg-purple-100 text-[#5e2be2]'
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
                    onClick={() => {
                      navigator.clipboard?.writeText(window.location.href);
                      setCopiedLink(true);
                      setTimeout(() => setCopiedLink(false), 2000);
                    }}
                    className="px-3.5 py-2.5 bg-white border border-slate-200 hover:bg-slate-100 rounded-xl font-bold text-xs text-slate-700 flex items-center gap-1.5 cursor-pointer"
                  >
                    {copiedLink ? <Check className="w-4 h-4 text-emerald-600" /> : <Share2 className="w-4 h-4" />}
                    <span>{copiedLink ? 'Link Copied' : 'Share'}</span>
                  </button>

                  <button
                    onClick={() => setSelectedResource(null)}
                    className="px-5 py-2.5 bg-[#5e2be2] hover:bg-[#4f28d9] text-white rounded-xl font-bold text-xs shadow-md shadow-[#5e2be2]/25 cursor-pointer"
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
