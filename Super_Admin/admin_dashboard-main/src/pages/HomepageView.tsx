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
  Share2
} from 'lucide-react';
import { KeywordsTagInput } from '../components/common/KeywordsTagInput';
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

  // Fetch Homepage CMS live from MongoDB Atlas
  useEffect(() => {
    const fetchHomepageCMS = async () => {
      try {
        let res = await fetch('/api/admin/homepage').catch(() => null);
        if (!res || !res.ok) {
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

  const handleSave = React.useCallback(async () => {
    try {
      setIsSaving(true);
      let res = await fetch('/api/admin/homepage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cms)
      }).catch(() => null);

      if (!res || !res.ok) {
        res = await fetch('http://localhost:5000/api/admin/homepage', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(cms)
        }).catch(() => null);
      }

      if (res && res.ok) {
        setSavedCmsState(JSON.stringify(cms));
        setSavedSuccess(true);
        setTimeout(() => setSavedSuccess(false), 3000);
      }
    } catch (err) {
      console.error('Error saving homepage CMS to MongoDB:', err);
    } finally {
      setIsSaving(false);
    }
  }, [cms]);

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
  };

  const handleDeleteFAQ = (id: string) => {
    setCms((prev) => ({
      ...prev,
      faqs: (prev.faqs || []).filter((faq) => faq.id !== id),
    }));
  };

  // Add Testimonial
  const handleAddTestimonial = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTestimonial.authorName || !newTestimonial.content) return;

    const newItem: HomepageTestimonialItem = {
      id: `TEST-${Date.now()}`,
      authorName: newTestimonial.authorName,
      profession: newTestimonial.profession,
      authorEmail: newTestimonial.authorEmail,
      authorImageUrl: newTestimonial.authorImageUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400',
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
          <span>Homepage CMS Settings Saved & Published!</span>
        </div>
      )}

      {/* Hero Header */}
      <div className="relative rounded-[28px] bg-gradient-to-r from-[#4f28d9] via-[#5e2be2] to-[#3b1799] p-8 text-white shadow-xl overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="absolute -right-12 -top-12 w-96 h-96 bg-white/5 rounded-full blur-2xl pointer-events-none" />
        <div className="relative z-10">
          <span className="px-3.5 py-1.5 bg-white/15 backdrop-blur-md rounded-full text-xs font-bold tracking-wide uppercase text-purple-200 border border-white/20">
            No-Code Website CMS
          </span>
          <h1 className="text-3xl font-extrabold tracking-tight mt-3">Homepage CMS Editor</h1>
          <p className="text-purple-100 text-sm mt-1 max-w-xl">
            Manage general page settings, carousel images, SEO metadata, Open Graph previews, FAQs, and testimonials.
          </p>
        </div>

        <button
          onClick={handleSave}
          disabled={isSaving}
          className={`relative z-10 px-6 py-3 rounded-2xl font-extrabold text-sm flex items-center gap-2 shadow-lg transition-all active:scale-95 shrink-0 ${
            isSaving
              ? 'bg-purple-200 text-purple-800 opacity-80 cursor-wait'
              : isUnsaved
              ? 'bg-amber-400 text-slate-950 hover:bg-amber-300 ring-4 ring-amber-400/30'
              : 'bg-white text-[#4f28d9] hover:bg-purple-50'
          }`}
        >
          <Save className="w-4 h-4" />
          <span>{isSaving ? 'Saving to Database...' : 'Save Changes'}</span>
          {isUnsaved && !isSaving && (
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
          )}
        </button>
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
                placeholder="e.g. Book confidential video consultation sessions with top licensed clinical psychologists..."
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
              <input
                type="text"
                placeholder="https://images.unsplash.com/..."
                value={cms.seo?.openGraphImageUrl || ''}
                onChange={(e) => setCms({ ...cms, seo: { ...cms.seo, openGraphImageUrl: e.target.value } })}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-mono text-slate-800 focus:bg-white focus:border-[#5e2be2]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="space-y-1.5">
              <label className="font-extrabold text-slate-700 block">OG Description *</label>
              <textarea
                rows={3}
                placeholder="e.g. Connect with expert clinical psychologists, relationship counselors..."
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

            <div className="max-w-lg bg-slate-50 border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
              <div className="relative aspect-[1200/630] bg-slate-200 overflow-hidden">
                <img
                  src={cms.seo?.openGraphImageUrl || 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=1200'}
                  alt={cms.seo?.openGraphImageAltText || 'Social share preview'}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=1200';
                  }}
                />
                <div className="absolute top-2 right-2 bg-slate-900/80 text-white text-[9px] font-mono px-2 py-0.5 rounded-md backdrop-blur-xs">
                  1200 × 630
                </div>
              </div>

              <div className="p-4 bg-white space-y-1.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block font-mono">
                  hexpertify.com
                </span>
                <p className="text-sm font-extrabold text-slate-900 leading-snug line-clamp-1">
                  {cms.seo?.openGraphTitle || 'OG Title'}
                </p>
                <p className="text-xs text-slate-600 leading-relaxed line-clamp-2">
                  {cms.seo?.openGraphDescription || 'OG Description preview will appear here...'}
                </p>
                {cms.seo?.openGraphImageAltText && (
                  <p className="text-[10px] text-slate-400 font-medium italic pt-1 border-t border-slate-100">
                    Alt: {cms.seo.openGraphImageAltText}
                  </p>
                )}
              </div>
            </div>
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
                    <button
                      type="button"
                      onClick={() => handleDeleteFAQ(faq.id)}
                      className="text-rose-600 hover:text-rose-800 flex items-center gap-1 text-[11px] font-bold"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Remove</span>
                    </button>
                  </div>

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
              onClick={() => setIsAddTestimonialModalOpen(true)}
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
                      <img
                        src={item.authorImageUrl}
                        alt={item.authorImageAltText || item.authorName}
                        className="w-11 h-11 rounded-full object-cover ring-2 ring-[#5e2be2]/20"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(item.authorName || 'Client')}`;
                        }}
                      />
                      <div>
                        <h4 className="text-sm font-extrabold text-slate-900 leading-snug">{item.authorName}</h4>
                        <p className="text-xs text-purple-700 font-bold">{item.profession}</p>
                        <p className="text-[10px] text-slate-400 font-mono">{item.authorEmail}</p>
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

                  <div className="flex justify-end pt-2 border-t border-slate-200/60">
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
                <input
                  type="text"
                  required
                  placeholder="https://images.unsplash.com/..."
                  value={newCarouselItem.imageUrl}
                  onChange={(e) => setNewCarouselItem({ ...newCarouselItem, imageUrl: e.target.value })}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-mono text-slate-800 focus:bg-white focus:border-[#5e2be2]"
                />
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
                        (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=800';
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
                <h4 className="font-extrabold text-sm sm:text-base">Add New Testimonial</h4>
              </div>
              <button
                type="button"
                onClick={() => setIsAddTestimonialModalOpen(false)}
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

              <div className="space-y-1.5">
                <label className="font-extrabold text-slate-700 block">Author Email *</label>
                <input
                  type="email"
                  required
                  placeholder="e.g. sarah.j@example.com"
                  value={newTestimonial.authorEmail}
                  onChange={(e) => setNewTestimonial({ ...newTestimonial, authorEmail: e.target.value })}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-mono text-slate-800 focus:bg-white focus:border-[#5e2be2]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div className="space-y-1.5">
                  <label className="font-extrabold text-slate-700 block">Author Image URL *</label>
                  <input
                    type="text"
                    placeholder="https://images.unsplash.com/..."
                    value={newTestimonial.authorImageUrl}
                    onChange={(e) => setNewTestimonial({ ...newTestimonial, authorImageUrl: e.target.value })}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-mono text-slate-800 focus:bg-white focus:border-[#5e2be2]"
                  />
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
                  onClick={() => setIsAddTestimonialModalOpen(false)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-[#5e2be2] hover:bg-[#4f28d9] text-white font-extrabold text-xs rounded-xl shadow-md flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Testimonial</span>
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
