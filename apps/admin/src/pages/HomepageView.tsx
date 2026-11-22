import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  Globe,
  Save,
  CheckCircle2,
  Plus,
  Trash2,
  Image as ImageIcon,
  HelpCircle,
  Quote,
  X,
  Smartphone,
  Monitor,
  Share2,
  Pencil
} from 'lucide-react';
import { KeywordsTagInput } from '../components/common/KeywordsTagInput';
import { ImageUploadButton } from '../components/common/ImageUploadButton';
import type {
  HomepageCMS,
  CarouselImageItem,
  HomepageFAQItem,
  HomepageTestimonialItem
} from '../types';

const emptyHomepageCMS: HomepageCMS = {
  general: {
    pageIdentifier: 'home',
    notificationTitle: '',
  },
  carouselImages: [],
  seo: {
    metaTitle: '',
    metaDescription: '',
    keywords: '',
    openGraphTitle: '',
    openGraphDescription: '',
    openGraphImageUrl: '',
    openGraphImageAltText: '',
  },
  faqs: [],
  testimonials: [],
};

export interface HomepageViewProps {
  onUnsavedChangesChange?: (isUnsaved: boolean) => void;
  onRegisterSaveHandler?: (handler: () => void) => void;
  onRegisterDiscardHandler?: (handler: () => void) => void;
}

export const HomepageView: React.FC<HomepageViewProps> = ({
  onUnsavedChangesChange,
  onRegisterSaveHandler,
  onRegisterDiscardHandler
}) => {
  const [cms, setCms] = useState<HomepageCMS>(() => {
    const saved = localStorage.getItem('hexpertify_homepage_cms');
    return saved ? JSON.parse(saved) : emptyHomepageCMS;
  });
  const [savedCmsState, setSavedCmsState] = useState<string>(() => {
    const saved = localStorage.getItem('hexpertify_homepage_cms');
    return saved || JSON.stringify(emptyHomepageCMS);
  });
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  // Auto-save: only after the live homepage has loaded, so a failed load can never overwrite it
  const [loadedFromServer, setLoadedFromServer] = useState(false);
  const [autoSaveError, setAutoSaveError] = useState<string | null>(null);
  const savingRef = React.useRef(false);

  // Fetch Homepage CMS live from MongoDB Atlas
  useEffect(() => {
    const fetchHomepageCMS = async () => {
      try {
        let res = await fetch('/api/admin/homepage').catch(() => null);
        if (!res && window.location.hostname === 'localhost') {
          res = await fetch('http://localhost:5000/api/admin/homepage').catch(() => null);
        }
        if (res && res.ok) {
          const data = await res.json();
          const homepageData = data?.homepage || data?.cms;
          if (homepageData && Object.keys(homepageData).length > 0) {
            setCms(homepageData);
            const stateStr = JSON.stringify(homepageData);
            setSavedCmsState(stateStr);
            try {
              localStorage.setItem('hexpertify_homepage_cms', stateStr);
            } catch {}
          }
          setLoadedFromServer(true);
        }
      } catch (err) {
        console.error('Error fetching homepage CMS from MongoDB:', err);
      }
    };
    fetchHomepageCMS();
  }, []);

  const isUnsaved = JSON.stringify(cms) !== savedCmsState;

  // Carousel Image Upload Modal / Form state
  const [isAddCarouselModalOpen, setIsAddCarouselModalOpen] = useState(false);
  const [newCarouselItem, setNewCarouselItem] = useState<{
    imageUrl: string;
    altText: string;
    isMobile: boolean;
  }>({
    imageUrl: '',
    altText: '',
    isMobile: false,
  });

  // Testimonial Modal / Form state
  const [isAddTestimonialModalOpen, setIsAddTestimonialModalOpen] = useState(false);
  const [newTestimonial, setNewTestimonial] = useState<{
    authorName: string;
    profession: string;
    authorEmail: string;
    authorImageUrl: string;
    authorImageAltText: string;
    content: string;
  }>({
    authorName: '',
    profession: '',
    authorEmail: '',
    authorImageUrl: '',
    authorImageAltText: '',
    content: '',
  });
  // Set while the testimonial form edits an existing testimonial (null = adding a new one)
  const [editingTestimonialId, setEditingTestimonialId] = useState<string | null>(null);

  const openAddTestimonial = () => {
    setEditingTestimonialId(null);
    setNewTestimonial({ authorName: '', profession: '', authorEmail: '', authorImageUrl: '', authorImageAltText: '', content: '' });
    setIsAddTestimonialModalOpen(true);
  };

  const openEditTestimonial = (item: HomepageTestimonialItem) => {
    setEditingTestimonialId(item.id);
    setNewTestimonial({
      authorName: item.authorName || '',
      profession: item.profession || '',
      authorEmail: item.authorEmail || '',
      authorImageUrl: item.authorImageUrl || '',
      authorImageAltText: item.authorImageAltText || '',
      content: item.content || '',
    });
    setIsAddTestimonialModalOpen(true);
  };

  const closeTestimonialModal = () => {
    setIsAddTestimonialModalOpen(false);
    setEditingTestimonialId(null);
  };

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isUnsaved) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isUnsaved]);

  useEffect(() => {
    onUnsavedChangesChange?.(isUnsaved);
  }, [isUnsaved, onUnsavedChangesChange]);

  /** Saves one snapshot of the editor; returns an error message, or null when saved */
  const saveSnapshot = React.useCallback(async (snapshot: string): Promise<string | null> => {
    savingRef.current = true;
    setIsSaving(true);
    try {
      let res = await fetch('/api/admin/homepage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: snapshot
      }).catch(() => null);

      // Only retry the local backend when the request never reached a server (local dev). A real answer such as
      // 401 "sign in again" must be shown as-is, not replaced by "could not be reached".
      if (!res && window.location.hostname === 'localhost') {
        res = await fetch('http://localhost:5000/api/admin/homepage', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: snapshot
        }).catch(() => null);
      }

      if (res && res.ok) {
        setSavedCmsState(snapshot);
        try {
          localStorage.setItem('hexpertify_homepage_cms', snapshot);
        } catch {}
        setAutoSaveError(null);
        return null;
      }
      const data = res ? await res.json().catch(() => null) : null;
      const reason = res?.status === 401
        ? 'Your admin session has expired. Please sign out and sign in again.'
        : data?.error || 'The server could not be reached.';
      setAutoSaveError(reason);
      return reason;
    } catch (err) {
      console.error('Error saving homepage CMS to MongoDB:', err);
      setAutoSaveError('Please try again.');
      return 'Please try again.';
    } finally {
      savingRef.current = false;
      setIsSaving(false);
    }
  }, []);

  // Manual save (Save Changes button): same save, plus the "Saved & Published" toast
  const handleSave = React.useCallback(async () => {
    const error = await saveSnapshot(JSON.stringify(cms));
    if (error) {
      alert(`Homepage changes were not saved.\n\n${error}`);
      return;
    }
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  }, [cms, saveSnapshot]);

  // A new edit after a failed save tries again
  useEffect(() => {
    setAutoSaveError(null);
  }, [cms]);

  // Auto-save: 1.5 s after the last edit. A change made while a save is running is saved right after it.
  useEffect(() => {
    if (!loadedFromServer || !isUnsaved || autoSaveError || isSaving) return;
    const snapshot = JSON.stringify(cms);
    const timer = setTimeout(() => {
      if (!savingRef.current) void saveSnapshot(snapshot);
    }, 1500);
    return () => clearTimeout(timer);
  }, [cms, loadedFromServer, isUnsaved, autoSaveError, isSaving, saveSnapshot]);

  const handleDiscardChanges = React.useCallback(() => {
    setCms(JSON.parse(savedCmsState));
  }, [savedCmsState]);

  useEffect(() => {
    onRegisterSaveHandler?.(handleSave);
  }, [handleSave, onRegisterSaveHandler]);

  useEffect(() => {
    onRegisterDiscardHandler?.(handleDiscardChanges);
  }, [handleDiscardChanges, onRegisterDiscardHandler]);

  // Add Carousel Image
  const handleAddCarouselImage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCarouselItem.imageUrl) return;

    const newItem: CarouselImageItem = {
      id: `CAR-${Date.now()}`,
      imageUrl: newCarouselItem.imageUrl,
      altText: newCarouselItem.altText,
      deviceType: newCarouselItem.isMobile ? 'Mobile' : 'Desktop',
    };

    setCms((prev) => ({
      ...prev,
      carouselImages: [...(prev.carouselImages || []), newItem],
    }));

    setNewCarouselItem({ imageUrl: '', altText: '', isMobile: false });
    setIsAddCarouselModalOpen(false);
  };

  const handleDeleteCarouselImage = (id: string) => {
    setCms((prev) => ({
      ...prev,
      carouselImages: (prev.carouselImages || []).filter((item) => item.id !== id),
    }));
  };

  // Add FAQ
  // FAQs open for editing (the others show as plain question + answer with an Edit button)
  const [editingFaqIds, setEditingFaqIds] = useState<string[]>([]);
  const toggleFaqEditing = (id: string, open: boolean) =>
    setEditingFaqIds((prev) => (open ? [...prev.filter((x) => x !== id), id] : prev.filter((x) => x !== id)));

  const handleAddFAQ = () => {
    const newFaq: HomepageFAQItem = {
      id: `FAQ-${Date.now()}`,
      question: '',
      answer: '',
    };
    setCms((prev) => ({
      ...prev,
      faqs: [...(prev.faqs || []), newFaq],
    }));
    toggleFaqEditing(newFaq.id, true);
  };

  const handleDeleteFAQ = (id: string) => {
    setCms((prev) => ({
      ...prev,
      faqs: (prev.faqs || []).filter((faq) => faq.id !== id),
    }));
  };

  // Add a testimonial, or save the one being edited
  const handleAddTestimonial = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTestimonial.authorName || !newTestimonial.content) return;

    if (editingTestimonialId) {
      setCms((prev) => ({
        ...prev,
        testimonials: (prev.testimonials || []).map((t) =>
          t.id === editingTestimonialId
            ? {
                ...t,
                authorName: newTestimonial.authorName,
                profession: newTestimonial.profession,
                authorImageUrl: newTestimonial.authorImageUrl,
                authorImageAltText: newTestimonial.authorImageAltText || `Portrait of ${newTestimonial.authorName}`,
                content: newTestimonial.content,
              }
            : t
        ),
      }));
      closeTestimonialModal();
      return;
    }

    const newItem: HomepageTestimonialItem = {
      id: `TEST-${Date.now()}`,
      authorName: newTestimonial.authorName,
      profession: newTestimonial.profession,
      authorEmail: newTestimonial.authorEmail,
      authorImageUrl: newTestimonial.authorImageUrl,
      authorImageAltText: newTestimonial.authorImageAltText || `Portrait of ${newTestimonial.authorName}`,
      content: newTestimonial.content,
    };

    setCms((prev) => ({
      ...prev,
      testimonials: [...(prev.testimonials || []), newItem],
    }));

    setNewTestimonial({
      authorName: '',
      profession: '',
      authorEmail: '',
      authorImageUrl: '',
      authorImageAltText: '',
      content: '',
    });
    setIsAddTestimonialModalOpen(false);
  };

  const handleDeleteTestimonial = (id: string) => {
    setCms((prev) => ({
      ...prev,
      testimonials: (prev.testimonials || []).filter((t) => t.id !== id),
    }));
  };

  return (
    <div className="space-y-8 pb-12 animate-fade-in font-['Plus_Jakarta_Sans']">
      {/* Toast Notification */}
      {savedSuccess && (
        <div className="fixed top-24 right-8 z-50 bg-emerald-600 text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-2 font-extrabold text-xs animate-in slide-in-from-top duration-300">
          <CheckCircle2 className="w-4 h-4" />
          <span>Homepage saved & published!</span>
        </div>
      )}

      {/* Hero Header */}
      <div className="relative rounded-[28px] bg-gradient-to-r from-[#4f28d9] via-[#5e2be2] to-[#3b1799] p-8 text-white shadow-xl overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="absolute -right-12 -top-12 w-96 h-96 bg-white/5 rounded-full blur-2xl pointer-events-none" />
        <div className="relative z-10">
          <h1 className="text-3xl font-extrabold tracking-tight">Homepage</h1>
          <p className="text-purple-100 text-sm mt-1 max-w-xl">
            Manage general page settings, carousel images, SEO metadata, Open Graph previews, FAQs, and testimonials.
          </p>
        </div>

        <div className="relative z-10 flex flex-col items-start md:items-end gap-2 shrink-0">
          <button
            onClick={handleSave}
            disabled={isSaving}
            className={`px-6 py-3 rounded-2xl font-extrabold text-sm flex items-center gap-2 shadow-lg transition-all active:scale-95 ${
              isSaving
                ? 'bg-purple-200 text-purple-800 opacity-80 cursor-wait'
                : isUnsaved
                ? 'bg-amber-400 text-slate-950 hover:bg-amber-300 ring-4 ring-amber-400/30'
                : 'bg-white text-[#4f28d9] hover:bg-purple-50'
            }`}
          >
            <Save className="w-4 h-4" />
            <span>{isSaving ? 'Saving…' : 'Save Changes'}</span>
            {isUnsaved && !isSaving && (
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            )}
          </button>

          {/* Auto-save status */}
          <p className="text-xs font-semibold text-purple-100 flex items-center gap-1.5" aria-live="polite">
            {!loadedFromServer ? (
              <span>Auto-save starts once the homepage has loaded…</span>
            ) : autoSaveError ? (
              <>
                <span className="text-amber-200">Auto-save failed: {autoSaveError}</span>
                <button type="button" onClick={handleSave} className="underline font-extrabold text-white">Retry</button>
              </>
            ) : isSaving ? (
              <span>Saving…</span>
            ) : isUnsaved ? (
              <span>Unsaved changes. Saving automatically…</span>
            ) : (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300" />
                <span>All changes saved</span>
              </>
            )}
          </p>
        </div>
      </div>

      {/* CMS Form Container */}
      <div className="space-y-8">
        {/* SECTION 1: General Settings */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <div className="w-1.5 h-5 bg-[#5e2be2] rounded-full" />
            <h3 className="font-extrabold text-slate-900 text-base">General Settings</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="space-y-1.5">
              <label className="font-extrabold text-slate-700 block">Page Identifier (slug) *</label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="e.g. home-page"
                  value={cms.general?.pageIdentifier || ''}
                  onChange={(e) =>
                    setCms({
                      ...cms,
                      general: {
                        ...cms.general,
                        pageIdentifier: e.target.value.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
                      }
                    })
                  }
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-mono text-slate-800 focus:bg-white focus:border-[#5e2be2] focus:ring-2 focus:ring-[#5e2be2]/10 transition-all"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[9px] font-bold text-slate-400 bg-slate-200 px-1.5 py-0.5 rounded-md">SLUG</span>
              </div>
              <p className="text-[10px] text-slate-400 font-medium">System URL slug identifying this landing page.</p>
            </div>

            <div className="space-y-1.5">
              <label className="font-extrabold text-slate-700 block">Notification Title *</label>
              <input
                type="text"
                placeholder="e.g. Welcome to Hexpertify - Book Your Therapy Session Online Today"
                value={cms.general?.notificationTitle || ''}
                onChange={(e) =>
                  setCms({
                    ...cms,
                    general: { ...cms.general, notificationTitle: e.target.value }
                  })
                }
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-semibold text-slate-800 focus:bg-white focus:border-[#5e2be2] focus:ring-2 focus:ring-[#5e2be2]/10 transition-all"
              />
              <p className="text-[10px] text-slate-400 font-medium">Top announcement banner title displayed to website visitors.</p>
            </div>
          </div>
        </div>

        {/* SECTION 2: Carousel Images */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-5 bg-purple-500 rounded-full" />
              <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-purple-600" />
                Carousel Images ({cms.carouselImages?.length || 0})
              </h3>
            </div>

            <button
              type="button"
              onClick={() => setIsAddCarouselModalOpen(true)}
              className="px-4 py-2 bg-[#5e2be2] hover:bg-[#4f28d9] text-white rounded-xl font-extrabold text-xs flex items-center gap-1.5 shadow-md transition-all active:scale-95"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Upload Image for Carousel</span>
            </button>
          </div>

          {(!cms.carouselImages || cms.carouselImages.length === 0) ? (
            <div className="text-center py-10 bg-slate-50 border border-dashed border-slate-200 rounded-2xl space-y-2">
              <ImageIcon className="w-8 h-8 text-slate-300 mx-auto" />
              <p className="text-xs font-semibold text-slate-400">No carousel images uploaded yet.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {cms.carouselImages.map((img) => (
                <div key={img.id} className="bg-slate-50 border border-slate-200 rounded-2xl overflow-hidden flex flex-col justify-between group">
                  <div className="relative aspect-[16/9] bg-slate-200 overflow-hidden">
                    <img
                      src={img.imageUrl}
                      alt={img.altText || 'Carousel banner image'}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'https://res.cloudinary.com/ddgvdabyf/image/upload/v1766903080/uploads/gycst00bn9dhs8ow8ghq.webp';
                      }}
                    />
                    <div className="absolute top-2 left-2">
                      <span className={`px-2.5 py-1 rounded-lg text-[10px] font-extrabold shadow-sm flex items-center gap-1 backdrop-blur-md ${
                        img.deviceType === 'Mobile'
                          ? 'bg-amber-500/90 text-white'
                          : 'bg-indigo-600/90 text-white'
                      }`}>
                        {img.deviceType === 'Mobile' ? <Smartphone className="w-3 h-3" /> : <Monitor className="w-3 h-3" />}
                        {img.deviceType}
                      </span>
                    </div>
                  </div>

                  <div className="p-3 space-y-2 text-xs flex-1 flex flex-col justify-between">
                    <div>
                      <p className="font-semibold text-slate-800 line-clamp-2">{img.altText || 'No Alt Text provided'}</p>
                      <p className="font-mono text-[10px] text-slate-400 truncate mt-1">{img.imageUrl}</p>
                    </div>

                    <div className="flex justify-end pt-2 border-t border-slate-200/60">
                      <button
                        type="button"
                        onClick={() => handleDeleteCarouselImage(img.id)}
                        className="text-rose-600 hover:text-rose-800 flex items-center gap-1 text-[11px] font-bold"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Remove</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* SECTION 3: SEO Metadata */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <div className="w-1.5 h-5 bg-emerald-500 rounded-full" />
            <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-2">
              <Globe className="w-4 h-4 text-emerald-600" />
              SEO Metadata Section
            </h3>
          </div>

          <div className="space-y-4 text-xs">
            <div className="space-y-1.5">
              <label className="font-extrabold text-slate-700 block">Meta Title *</label>
              <input
                type="text"
                placeholder="e.g. Hexpertify - Premier Online Therapy & Mental Health Platform"
                value={cms.seo?.metaTitle || ''}
                onChange={(e) => setCms({ ...cms, seo: { ...cms.seo, metaTitle: e.target.value } })}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-semibold text-slate-800 focus:bg-white focus:border-[#5e2be2]"
              />
            </div>

            <div className="space-y-1.5">
              <label className="font-extrabold text-slate-700 block">Meta Description *</label>
              <textarea
                rows={3}
                placeholder="e.g. Book confidential video consultation sessions with top licensed psychologists..."
                value={cms.seo?.metaDescription || ''}
                onChange={(e) => setCms({ ...cms, seo: { ...cms.seo, metaDescription: e.target.value } })}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none text-slate-800 focus:bg-white focus:border-[#5e2be2] leading-relaxed resize-none"
              />
            </div>

            <KeywordsTagInput
              value={cms.seo?.keywords || ''}
              onChange={(val) => setCms({ ...cms, seo: { ...cms.seo, keywords: val } })}
              placeholder="Add keyword..."
              label="Keywords"
            />
          </div>
        </div>

        {/* SECTION 4: Open Graph (Social Media) Section */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <div className="w-1.5 h-5 bg-indigo-500 rounded-full" />
            <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-2">
              <Share2 className="w-4 h-4 text-indigo-600" />
              Open Graph (Social Media) Section
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="space-y-1.5">
              <label className="font-extrabold text-slate-700 block">OG Title *</label>
              <input
                type="text"
                placeholder="e.g. Hexpertify — Online Therapy & Counseling Services"
                value={cms.seo?.openGraphTitle || ''}
                onChange={(e) => setCms({ ...cms, seo: { ...cms.seo, openGraphTitle: e.target.value } })}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-semibold text-slate-800 focus:bg-white focus:border-[#5e2be2]"
              />
            </div>

            <div className="space-y-1.5">
              <label className="font-extrabold text-slate-700 block">OG Image URL *</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Upload an image (1200×630), or paste its link"
                  value={cms.seo?.openGraphImageUrl || ''}
                  onChange={(e) => setCms({ ...cms, seo: { ...cms.seo, openGraphImageUrl: e.target.value } })}
                  className="flex-1 min-w-0 p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-mono text-slate-800 focus:bg-white focus:border-[#5e2be2]"
                />
                <ImageUploadButton
                  assetType="Banner"
                  assetName="Homepage social share image"
                  onUploaded={(url) => setCms((prev) => ({ ...prev, seo: { ...prev.seo, openGraphImageUrl: url } }))}
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="space-y-1.5">
              <label className="font-extrabold text-slate-700 block">OG Description *</label>
              <textarea
                rows={3}
                placeholder="e.g. Connect with expert psychologists, relationship counselors..."
                value={cms.seo?.openGraphDescription || ''}
                onChange={(e) => setCms({ ...cms, seo: { ...cms.seo, openGraphDescription: e.target.value } })}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none text-slate-800 focus:bg-white focus:border-[#5e2be2] resize-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="font-extrabold text-slate-700 block">OG Image Alt Text *</label>
              <textarea
                rows={3}
                placeholder="e.g. Hexpertify mental health platform hero banner preview"
                value={cms.seo?.openGraphImageAltText || ''}
                onChange={(e) => setCms({ ...cms, seo: { ...cms.seo, openGraphImageAltText: e.target.value } })}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none text-slate-800 focus:bg-white focus:border-[#5e2be2] resize-none"
              />
            </div>
          </div>

          {/* Social Share Preview Card */}
          <div className="pt-2">
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block mb-2">
              Social Media Share Preview (Open Graph)
            </span>

            {(() => {
              // What the website actually shares (see apps/web/app/page.tsx): the OG image, else the first desktop
              // carousel banner; the OG title/description, else the meta title/description
              const desktopBanner = (cms.carouselImages || []).find((c) => c.imageUrl && c.deviceType !== 'Mobile')?.imageUrl
                || (cms.carouselImages || []).find((c) => c.imageUrl)?.imageUrl;
              const previewImage = cms.seo?.openGraphImageUrl || desktopBanner || '';
              const previewTitle = cms.seo?.openGraphTitle || cms.seo?.metaTitle || '';
              const previewDescription = cms.seo?.openGraphDescription || cms.seo?.metaDescription || '';
              return (
            <div className="max-w-lg bg-slate-50 border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
              <div className="relative aspect-[1200/630] bg-slate-100 overflow-hidden">
                {previewImage ? (
                  <img
                    src={previewImage}
                    alt={cms.seo?.openGraphImageAltText || 'Social share preview'}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.visibility = 'hidden';
                    }}
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center gap-1.5 text-slate-400">
                    <ImageIcon className="w-8 h-8" />
                    <span className="text-[11px] font-semibold">No OG image or carousel banner yet</span>
                  </div>
                )}
                <div className="absolute top-2 right-2 bg-slate-900/80 text-white text-[9px] font-mono px-2 py-0.5 rounded-md backdrop-blur-xs">
                  1200 × 630
                </div>
                {!cms.seo?.openGraphImageUrl && previewImage && (
                  <div className="absolute bottom-2 left-2 bg-slate-900/80 text-white text-[10px] font-semibold px-2 py-0.5 rounded-md">
                    Using the carousel banner (no OG image set)
                  </div>
                )}
              </div>

              <div className="p-4 bg-white space-y-1.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block font-mono">
                  {window.location.hostname}
                </span>
                <p className={`text-sm font-extrabold leading-snug line-clamp-1 ${previewTitle ? 'text-slate-900' : 'text-slate-300'}`}>
                  {previewTitle || 'No title yet'}
                </p>
                <p className={`text-xs leading-relaxed line-clamp-2 ${previewDescription ? 'text-slate-600' : 'text-slate-300'}`}>
                  {previewDescription || 'No description yet'}
                </p>
                {cms.seo?.openGraphImageAltText && (
                  <p className="text-[10px] text-slate-400 font-medium italic pt-1 border-t border-slate-100">
                    Alt: {cms.seo.openGraphImageAltText}
                  </p>
                )}
              </div>
            </div>
              );
            })()}
          </div>
        </div>

        {/* SECTION 5: FAQs Section */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-5 bg-blue-500 rounded-full" />
              <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-blue-600" />
                FAQs Section
              </h3>
            </div>

            <button
              type="button"
              onClick={handleAddFAQ}
              className="px-4 py-2 bg-slate-900 hover:bg-[#5e2be2] text-white rounded-xl font-extrabold text-xs flex items-center gap-1.5 shadow-md transition-all active:scale-95"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add FAQ</span>
            </button>
          </div>

          {(!cms.faqs || cms.faqs.length === 0) ? (
            <div className="text-center py-10 bg-slate-50 border border-dashed border-slate-200 rounded-2xl space-y-2">
              <HelpCircle className="w-8 h-8 text-slate-300 mx-auto" />
              <p className="text-xs font-semibold text-slate-400">No FAQs added yet for homepage.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {cms.faqs.map((faq, idx) => (
                <div key={faq.id} className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-extrabold text-[#5e2be2] uppercase tracking-wider font-mono">
                      FAQ Item #{idx + 1}
                    </span>
                    <div className="flex items-center gap-4">
                      <button
                        type="button"
                        onClick={() => toggleFaqEditing(faq.id, !editingFaqIds.includes(faq.id))}
                        className="text-[#5e2be2] hover:text-[#4f28d9] flex items-center gap-1 text-[11px] font-bold"
                      >
                        {editingFaqIds.includes(faq.id) ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Pencil className="w-3.5 h-3.5" />}
                        <span>{editingFaqIds.includes(faq.id) ? 'Done' : 'Edit'}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteFAQ(faq.id)}
                        className="text-rose-600 hover:text-rose-800 flex items-center gap-1 text-[11px] font-bold"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Remove</span>
                      </button>
                    </div>
                  </div>

                  {!editingFaqIds.includes(faq.id) ? (
                    <div className="space-y-1.5 text-xs">
                      <p className="text-sm font-extrabold text-slate-900">{faq.question || <span className="text-slate-400 font-semibold">No question yet</span>}</p>
                      <p className="text-slate-600 leading-relaxed whitespace-pre-line">{faq.answer || <span className="text-slate-400">No answer yet</span>}</p>
                    </div>
                  ) : (
                  <div className="space-y-3 text-xs">
                    <div className="space-y-1">
                      <label className="font-extrabold text-slate-700 block">Question *</label>
                      <input
                        type="text"
                        placeholder="e.g. How do I book a session on Hexpertify?"
                        value={faq.question}
                        onChange={(e) => {
                          const updated = [...cms.faqs];
                          updated[idx] = { ...updated[idx], question: e.target.value };
                          setCms({ ...cms, faqs: updated });
                        }}
                        className="w-full p-3 bg-white border border-slate-200 rounded-xl outline-none font-semibold text-slate-800 focus:border-[#5e2be2]"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="font-extrabold text-slate-700 block">Answer *</label>
                      <textarea
                        rows={3}
                        placeholder="Provide detailed answer..."
                        value={faq.answer}
                        onChange={(e) => {
                          const updated = [...cms.faqs];
                          updated[idx] = { ...updated[idx], answer: e.target.value };
                          setCms({ ...cms, faqs: updated });
                        }}
                        className="w-full p-3 bg-white border border-slate-200 rounded-xl outline-none text-slate-800 focus:border-[#5e2be2] leading-relaxed resize-none"
                      />
                    </div>
                  </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* SECTION 6: Testimonials Section */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-5 bg-rose-500 rounded-full" />
              <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-2">
                <Quote className="w-4 h-4 text-rose-600" />
                Testimonials Section ({cms.testimonials?.length || 0})
              </h3>
            </div>

            <button
              type="button"
              onClick={openAddTestimonial}
              className="px-4 py-2 bg-[#5e2be2] hover:bg-[#4f28d9] text-white rounded-xl font-extrabold text-xs flex items-center gap-1.5 shadow-md transition-all active:scale-95"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Testimonial</span>
            </button>
          </div>

          {(!cms.testimonials || cms.testimonials.length === 0) ? (
            <div className="text-center py-10 bg-slate-50 border border-dashed border-slate-200 rounded-2xl space-y-2">
              <Quote className="w-8 h-8 text-slate-300 mx-auto" />
              <p className="text-xs font-semibold text-slate-400">No testimonials added yet for homepage.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {cms.testimonials.map((item) => (
                <div key={item.id} className="p-5 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col justify-between space-y-4 shadow-xs">
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      {/* The author's photo, or their initial when none is set (or it fails to load) */}
                      <div className="relative w-11 h-11 shrink-0 rounded-full ring-2 ring-[#5e2be2]/20 bg-purple-100 text-[#5e2be2] font-extrabold text-sm flex items-center justify-center overflow-hidden">
                        <span>{(item.authorName || '?').trim().charAt(0).toUpperCase()}</span>
                        {item.authorImageUrl && (
                          <img
                            src={item.authorImageUrl}
                            alt={item.authorImageAltText || item.authorName}
                            className="absolute inset-0 w-full h-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = 'none';
                            }}
                          />
                        )}
                      </div>
                      <div>
                        <h4 className="text-sm font-extrabold text-slate-900 leading-snug">{item.authorName}</h4>
                        <p className="text-xs text-purple-700 font-bold">{item.profession}</p>
                      </div>
                    </div>

                    <p className="text-xs text-slate-700 leading-relaxed italic bg-white p-3.5 rounded-xl border border-slate-200/80">
                      "{item.content}"
                    </p>

                    {item.authorImageAltText && (
                      <p className="text-[10px] text-slate-400 font-medium truncate">
                        Alt: {item.authorImageAltText}
                      </p>
                    )}
                  </div>

                  <div className="flex justify-end items-center gap-4 pt-2 border-t border-slate-200/60">
                    <button
                      type="button"
                      onClick={() => openEditTestimonial(item)}
                      className="text-[#5e2be2] hover:text-[#4f28d9] flex items-center gap-1 text-[11px] font-bold"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                      <span>Edit</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteTestimonial(item.id)}
                      className="text-rose-600 hover:text-rose-800 flex items-center gap-1 text-[11px] font-bold"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Remove Testimonial</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── MODAL 1: ADD CAROUSEL IMAGE ────────────────────────────────────── */}
      {isAddCarouselModalOpen && createPortal(
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-[110] flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-2xl sm:rounded-3xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden my-auto max-h-[94vh] sm:max-h-[90vh] flex flex-col animate-in fade-in zoom-in-95">
            <div className="bg-gradient-to-r from-[#4f28d9] to-[#5e2be2] p-4 sm:p-5 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ImageIcon className="w-5 h-5" />
                <h4 className="font-extrabold text-sm sm:text-base">Upload Carousel Image</h4>
              </div>
              <button
                type="button"
                onClick={() => setIsAddCarouselModalOpen(false)}
                className="p-1 text-purple-200 hover:text-white rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddCarouselImage} className="p-4 sm:p-6 space-y-3 sm:space-y-4 text-xs overflow-y-auto flex-1">
              <div className="space-y-1.5">
                <label className="font-extrabold text-slate-700 block">Image URL *</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    required
                    placeholder="Upload an image, or paste its link"
                    value={newCarouselItem.imageUrl}
                    onChange={(e) => setNewCarouselItem({ ...newCarouselItem, imageUrl: e.target.value })}
                    className="flex-1 min-w-0 p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-mono text-slate-800 focus:bg-white focus:border-[#5e2be2]"
                  />
                  <ImageUploadButton
                    assetType="Banner"
                    assetName={newCarouselItem.altText || 'Homepage banner'}
                    onUploaded={(url) => setNewCarouselItem((prev) => ({ ...prev, imageUrl: url }))}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="font-extrabold text-slate-700 block">Alt Text of the Image *</label>
                <input
                  type="text"
                  required
                  placeholder="Describe the banner image for accessibility and SEO..."
                  value={newCarouselItem.altText}
                  onChange={(e) => setNewCarouselItem({ ...newCarouselItem, altText: e.target.value })}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none text-slate-800 focus:bg-white focus:border-[#5e2be2]"
                />
              </div>

              {/* Checkbox: belongs to Mobile or Desktop image */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                <label className="font-extrabold text-slate-800 block">Device Target Specification</label>
                <label className="flex items-center gap-3 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={newCarouselItem.isMobile}
                    onChange={(e) => setNewCarouselItem({ ...newCarouselItem, isMobile: e.target.checked })}
                    className="w-4 h-4 text-[#5e2be2] rounded focus:ring-[#5e2be2]"
                  />
                  <span className="font-bold text-slate-700">
                    Check box if this image belongs to <span className="text-[#5e2be2]">Mobile View</span> (Unchecked = Desktop View)
                  </span>
                </label>
              </div>

              {newCarouselItem.imageUrl && (
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 block">Image Preview</span>
                  <div className="aspect-[16/9] bg-slate-100 rounded-xl overflow-hidden border border-slate-200">
                    <img
                      src={newCarouselItem.imageUrl}
                      alt={newCarouselItem.altText || 'Preview'}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.visibility = 'hidden';
                      }}
                    />
                  </div>
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddCarouselModalOpen(false)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-[#5e2be2] hover:bg-[#4f28d9] text-white font-extrabold text-xs rounded-xl shadow-md flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Carousel Image</span>
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* ── MODAL 2: ADD TESTIMONIAL ────────────────────────────────────────── */}
      {isAddTestimonialModalOpen && createPortal(
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-[110] flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-2xl sm:rounded-3xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden my-auto max-h-[94vh] sm:max-h-[90vh] flex flex-col animate-in fade-in zoom-in-95">
            <div className="bg-gradient-to-r from-[#4f28d9] to-[#5e2be2] p-4 sm:p-5 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Quote className="w-5 h-5" />
                <h4 className="font-extrabold text-sm sm:text-base">{editingTestimonialId ? 'Edit Testimonial' : 'Add New Testimonial'}</h4>
              </div>
              <button
                type="button"
                onClick={closeTestimonialModal}
                className="p-1 text-purple-200 hover:text-white rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddTestimonial} className="p-4 sm:p-6 space-y-3 sm:space-y-4 text-xs overflow-y-auto flex-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div className="space-y-1.5">
                  <label className="font-extrabold text-slate-700 block">Author Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Sarah Jenkins"
                    value={newTestimonial.authorName}
                    onChange={(e) => setNewTestimonial({ ...newTestimonial, authorName: e.target.value })}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-semibold text-slate-800 focus:bg-white focus:border-[#5e2be2]"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-extrabold text-slate-700 block">Profession *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Senior Product Designer"
                    value={newTestimonial.profession}
                    onChange={(e) => setNewTestimonial({ ...newTestimonial, profession: e.target.value })}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-semibold text-slate-800 focus:bg-white focus:border-[#5e2be2]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div className="space-y-1.5">
                  <label className="font-extrabold text-slate-700 block">Author Image URL *</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Upload a photo, or paste its link"
                      value={newTestimonial.authorImageUrl}
                      onChange={(e) => setNewTestimonial({ ...newTestimonial, authorImageUrl: e.target.value })}
                      className="flex-1 min-w-0 p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-mono text-slate-800 focus:bg-white focus:border-[#5e2be2]"
                    />
                    <ImageUploadButton
                      assetType="Images"
                      assetName={newTestimonial.authorName ? `Testimonial: ${newTestimonial.authorName}` : 'Testimonial photo'}
                      onUploaded={(url) => setNewTestimonial((prev) => ({ ...prev, authorImageUrl: url }))}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="font-extrabold text-slate-700 block">Author Image Alt Text *</label>
                  <input
                    type="text"
                    placeholder="e.g. Portrait of Sarah Jenkins"
                    value={newTestimonial.authorImageAltText}
                    onChange={(e) => setNewTestimonial({ ...newTestimonial, authorImageAltText: e.target.value })}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none text-slate-800 focus:bg-white focus:border-[#5e2be2]"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="font-extrabold text-slate-700 block">Testimonial Content *</label>
                <textarea
                  rows={3}
                  required
                  placeholder="Enter author testimonial quote..."
                  value={newTestimonial.content}
                  onChange={(e) => setNewTestimonial({ ...newTestimonial, content: e.target.value })}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none text-slate-800 focus:bg-white focus:border-[#5e2be2] leading-relaxed resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeTestimonialModal}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-[#5e2be2] hover:bg-[#4f28d9] text-white font-extrabold text-xs rounded-xl shadow-md flex items-center gap-1.5"
                >
                  {editingTestimonialId ? <Pencil className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                  <span>{editingTestimonialId ? 'Save Testimonial' : 'Add Testimonial'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default HomepageView;
