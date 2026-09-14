import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  Save,
  CheckCircle2,
  Plus,
  Trash2,
  Code,
  Eye,
  Bold,
  Italic,
  Strikethrough,
  Heading,
  Link,
  Quote,
  Braces,
  MessageSquare,
  Table,
  List,
  AlertCircle,
  Search,
  Sparkles,
  X,
  Globe,
  Edit,
  Layers,
  Check,
  FileText,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  Loader2
} from 'lucide-react';
import { KeywordsTagInput } from '../components/common/KeywordsTagInput';
import { api } from '../lib/apiClient';
import type { ProfessionService } from '../types';

interface RichCodeEditorProps {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  helperText?: string;
}

const RichCodeEditor: React.FC<RichCodeEditorProps> = ({
  value,
  onChange,
  placeholder,
  helperText
}) => {
  const [isPreview, setIsPreview] = useState(false);
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  const insertText = (before: string, after: string = '') => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const currentVal = textarea.value;

    const selectedText = currentVal.substring(start, end);
    const replacement = before + (selectedText || after) + (selectedText ? after : '');

    const newVal = currentVal.substring(0, start) + replacement + currentVal.substring(end);
    onChange(newVal);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + before.length, start + before.length + (selectedText || after).length);
    }, 0);
  };

  return (
    <div className="w-full border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-xs focus-within:border-[#5e2be2] focus-within:ring-1 focus-within:ring-[#5e2be2]/10 transition-all text-xs">
      <div className="bg-slate-50 border-b border-slate-150 px-4 py-2 flex items-center justify-between gap-2 overflow-x-auto">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => insertText('**', '**')}
            disabled={isPreview}
            className="p-1 hover:bg-slate-200/60 disabled:opacity-40 rounded-lg text-slate-500 hover:text-slate-800 transition-colors text-[10px] font-bold"
            title="Bold"
          >
            <Bold className="w-3 h-3" />
          </button>
          <button
            type="button"
            onClick={() => insertText('*', '*')}
            disabled={isPreview}
            className="p-1 hover:bg-slate-200/60 disabled:opacity-40 rounded-lg text-slate-500 hover:text-slate-800 transition-colors text-[10px] font-bold"
            title="Italic"
          >
            <Italic className="w-3 h-3" />
          </button>
          <button
            type="button"
            onClick={() => insertText('~~', '~~')}
            disabled={isPreview}
            className="p-1 hover:bg-slate-200/60 disabled:opacity-40 rounded-lg text-slate-500 hover:text-slate-800 transition-colors text-[10px] font-bold"
            title="Strikethrough"
          >
            <Strikethrough className="w-3 h-3" />
          </button>
          <button
            type="button"
            onClick={() => insertText('# ', '')}
            disabled={isPreview}
            className="p-1 hover:bg-slate-200/60 disabled:opacity-40 rounded-lg text-slate-500 hover:text-slate-800 transition-colors text-[10px] font-bold"
            title="Heading"
          >
            <Heading className="w-3 h-3" />
          </button>
          <button
            type="button"
            onClick={() => insertText('[Link Title](', ')')}
            disabled={isPreview}
            className="p-1 hover:bg-slate-200/60 disabled:opacity-40 rounded-lg text-slate-500 hover:text-slate-800 transition-colors text-[10px] font-bold"
            title="Link"
          >
            <Link className="w-3 h-3" />
          </button>
          <button
            type="button"
            onClick={() => insertText('> ', '')}
            disabled={isPreview}
            className="p-1 hover:bg-slate-200/60 disabled:opacity-40 rounded-lg text-slate-500 hover:text-slate-800 transition-colors text-[10px] font-bold"
            title="Quote"
          >
            <Quote className="w-3 h-3" />
          </button>
          <button
            type="button"
            onClick={() => insertText('`', '`')}
            disabled={isPreview}
            className="p-1 hover:bg-slate-200/60 disabled:opacity-40 rounded-lg text-slate-500 hover:text-slate-800 transition-colors text-[10px] font-bold"
            title="Inline Code"
          >
            <Code className="w-3 h-3" />
          </button>
          <button
            type="button"
            onClick={() => insertText('{\n  "key": "value"\n}')}
            disabled={isPreview}
            className="p-1 hover:bg-slate-200/60 disabled:opacity-40 rounded-lg text-slate-500 hover:text-slate-800 transition-colors text-[10px] font-bold"
            title="JSON Schema"
          >
            <Braces className="w-3 h-3" />
          </button>
          <button
            type="button"
            onClick={() => insertText('<div className="p-4 bg-purple-50 text-purple-900 rounded-xl">\n  <p>Custom callout message</p>\n</div>')}
            disabled={isPreview}
            className="p-1 hover:bg-slate-200/60 disabled:opacity-40 rounded-lg text-slate-500 hover:text-slate-800 transition-colors text-[10px] font-bold"
            title="HTML Banner / Callout"
          >
            <MessageSquare className="w-3 h-3" />
          </button>
          <button
            type="button"
            onClick={() => insertText('<table className="w-full border">\n  <thead>\n    <tr><th>Header 1</th><th>Header 2</th></tr>\n  </thead>\n  <tbody>\n    <tr><td>Data 1</td><td>Data 2</td></tr>\n  </tbody>\n</table>')}
            disabled={isPreview}
            className="p-1 hover:bg-slate-200/60 disabled:opacity-40 rounded-lg text-slate-500 hover:text-slate-800 transition-colors text-[10px] font-bold"
            title="Table"
          >
            <Table className="w-3 h-3" />
          </button>
          <button
            type="button"
            onClick={() => insertText('<ul>\n  <li>Item 1</li>\n  <li>Item 2</li>\n</ul>')}
            disabled={isPreview}
            className="p-1 hover:bg-slate-200/60 disabled:opacity-40 rounded-lg text-slate-500 hover:text-slate-800 transition-colors text-[10px] font-bold"
            title="Bulleted List"
          >
            <List className="w-3 h-3" />
          </button>
        </div>

        <button
          type="button"
          onClick={() => setIsPreview(!isPreview)}
          className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[9px] font-extrabold transition-all ${
            isPreview
              ? 'bg-[#5e2be2] text-white'
              : 'bg-slate-100 text-slate-700 hover:bg-slate-200/80'
          }`}
        >
          <Eye className="w-2.5 h-2.5" />
          <span>{isPreview ? 'Editing' : 'Preview'}</span>
        </button>
      </div>

      <div className="bg-slate-50/50">
        {isPreview ? (
          <div className="p-3 min-h-[140px] text-slate-800 bg-white text-xs border-none font-medium overflow-y-auto leading-relaxed">
            {value.trim() ? (
              <div dangerouslySetInnerHTML={{ __html: value }} />
            ) : (
              <span className="text-slate-400 italic">No output to preview. Write custom code tags to see them rendered here.</span>
            )}
          </div>
        ) : (
          <textarea
            ref={textareaRef}
            rows={5}
            placeholder={placeholder}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="w-full min-h-[140px] p-3 bg-white text-xs font-mono text-slate-800 border-none outline-none resize-y block focus:ring-0"
          />
        )}
      </div>

      {helperText && (
        <div className="bg-slate-50/50 border-t border-slate-150 px-3 py-1.5 flex items-center justify-between text-[9px] text-slate-400 font-medium">
          <span>{helperText}</span>
          <span className="font-mono">{value.length} characters</span>
        </div>
      )}
    </div>
  );
};

// ── ImagePreview (Icon & Thumbnail) ──────────────────────────────────────────
interface ImagePreviewProps {
  src: string;
  alt: string;
  altText?: string;
}

const ImagePreview: React.FC<ImagePreviewProps> = ({ src, alt, altText }) => {
  const [status, setStatus] = useState<'loading' | 'loaded' | 'error'>('loading');

  useEffect(() => {
    setStatus('loading');
  }, [src]);

  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3.5 flex items-center gap-4">
      <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl overflow-hidden border-2 border-purple-200 bg-white shrink-0 flex items-center justify-center relative shadow-xs">
        <img
          key={src}
          src={src}
          alt={alt}
          className={`w-full h-full object-contain transition-opacity duration-300 ${status === 'loaded' ? 'opacity-100' : 'opacity-0'}`}
          onLoad={() => setStatus('loaded')}
          onError={() => setStatus('error')}
        />
        {status === 'loading' && (
          <div className="absolute inset-0 bg-slate-200 animate-pulse flex items-center justify-center">
            <span className="text-[9px] text-slate-400 font-bold">Loading…</span>
          </div>
        )}
        {status === 'error' && (
          <div className="absolute inset-0 bg-rose-50 flex items-center justify-center">
            <AlertCircle className="w-4 h-4 text-rose-500" />
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-purple-700 bg-purple-100 px-2 py-0.5 rounded-md">
            Icon / Thumbnail Preview
          </span>
        </div>
        <p className="text-xs font-bold text-slate-800 truncate">{alt || 'Service Category Icon'}</p>
        {altText && (
          <p className="text-[11px] text-slate-500 truncate">
            <strong className="text-slate-700">Alt text:</strong> {altText}
          </p>
        )}
      </div>
    </div>
  );
};

// ── BannerPreview (Wide Hero Landing Banner) ──────────────────────────────────
interface BannerPreviewProps {
  src: string;
  alt: string;
  title?: string;
}

const BannerPreview: React.FC<BannerPreviewProps> = ({ src, alt, title }) => {
  const [status, setStatus] = useState<'loading' | 'loaded' | 'error'>('loading');
  const [fitMode, setFitMode] = useState<'cover' | 'contain'>('cover');

  useEffect(() => {
    setStatus('loading');
  }, [src]);

  return (
    <div className="rounded-2xl overflow-hidden border border-slate-200 bg-slate-950 relative min-h-[160px] max-h-[260px] flex items-center justify-center group shadow-md">
      <img
        key={src}
        src={src}
        alt={alt}
        className={`w-full h-52 sm:h-60 transition-all duration-300 ${
          fitMode === 'contain' ? 'object-contain p-2' : 'object-cover'
        } ${status === 'loaded' ? 'opacity-90' : 'opacity-0 absolute inset-0'}`}
        onLoad={() => setStatus('loaded')}
        onError={() => setStatus('error')}
      />

      {status === 'loading' && (
        <div className="w-full h-44 bg-slate-900 animate-pulse flex items-center justify-center">
          <span className="text-xs text-slate-400 font-semibold">Loading banner preview…</span>
        </div>
      )}

      {status === 'error' && (
        <div className="w-full h-44 bg-rose-950/40 border border-rose-800/40 flex flex-col items-center justify-center gap-1.5 px-4">
          <AlertCircle className="w-5 h-5 text-rose-400" />
          <span className="text-xs font-bold text-rose-300">Could not load banner image from URL</span>
          <span className="text-[10px] text-rose-400/80 font-mono text-center break-all line-clamp-1 max-w-sm">{src}</span>
        </div>
      )}

      {status === 'loaded' && (
        <>
          {/* Top Bar with Badge and Fit Mode Toggle */}
          <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-auto">
            <span className="bg-slate-950/80 backdrop-blur-md text-white text-[10px] font-extrabold uppercase tracking-wider px-3 py-1 rounded-full border border-white/20 flex items-center gap-1.5 shadow-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              Banner Preview
            </span>
            <button
              type="button"
              onClick={() => setFitMode(fitMode === 'cover' ? 'contain' : 'cover')}
              className="bg-slate-950/80 backdrop-blur-md hover:bg-slate-900 text-purple-200 hover:text-white text-[10px] font-bold px-2.5 py-1 rounded-xl border border-white/20 transition-all shadow-sm active:scale-95"
              title="Toggle full-bleed cover vs full-fit contain"
            >
              Fit: {fitMode === 'cover' ? 'Fill Crop' : 'Full Image'}
            </button>
          </div>

          {/* Bottom Overlay with Banner Title & CTA preview */}
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950/95 via-slate-950/60 to-transparent p-4 pt-10 flex flex-col sm:flex-row sm:items-end justify-between gap-2 pointer-events-none">
            <div className="max-w-md">
              <span className="text-[9px] font-extrabold text-purple-300 uppercase tracking-widest block">Landing Hero Title</span>
              <p className="text-white font-extrabold text-sm sm:text-base mt-0.5 leading-snug drop-shadow-md">
                {title || alt || 'Hero Consultation Banner'}
              </p>
            </div>
            <div className="shrink-0 hidden sm:block">
              <span className="px-3.5 py-1.5 bg-gradient-to-r from-[#4f28d9] to-[#5e2be2] text-white text-xs font-bold rounded-xl shadow-md border border-white/20 block">
                Book Consultation
              </span>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export const ProfessionsView: React.FC = () => {
  const [professions, setProfessions] = useState<ProfessionService[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [editingProf, setEditingProf] = useState<ProfessionService | null>(null);
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'Basic Info' | 'FAQs' | 'SEO'>('Basic Info');
  const [searchQuery, setSearchQuery] = useState('');
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(true);
  const [autoSaveStatus, setAutoSaveStatus] = useState<'saved' | 'saving' | 'idle'>('saved');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Fetch live professions from MongoDB Atlas on mount
  useEffect(() => {
    setIsLoading(true);
    const fetchProfessions = async () => {
      try {
        let res = await fetch('/api/admin/professions').catch(() => null);
        if (!res || !res.ok) {
          res = await fetch('http://localhost:5000/api/admin/professions').catch(() => null);
        }
        if (res && res.ok) {
          const data = await res.json();
          if (data?.professions && Array.isArray(data.professions)) {
            setProfessions(data.professions);
          }
        }
      } catch (err) {
        console.error('Error fetching live professions:', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchProfessions();
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const createBlankProfession = (): ProfessionService => ({
    id: `PROF-${Date.now()}`,
    serviceName: '',
    identifier: '',
    slug: '',
    status: 'Active',
    description: '',
    imageUrl: 'https://res.cloudinary.com/ddgvdabyf/image/upload/v1766960577/uploads/vxgxmznjcqf88gd7b3hz.webp',
    imageAltText: 'consultation category icon',
    heroBannerUrl: 'https://res.cloudinary.com/ddgvdabyf/image/upload/v1767777320/uploads/ktdvkdkkxecmoxzba5k6.webp',
    heroBannerTitle: 'Affordable Online Consultations in India',
    faqs: [
      { question: 'How do I book a consultation?', answer: 'Select a verified specialist and schedule your session online in seconds.' }
    ],
    consultationFee: 998,
    sessionDurationMinutes: 50,
    visibility: 'Public',
    seo: {
      metaTitle: '',
      metaDescription: '',
      keywords: '',
      canonicalUrl: '',
      openGraphTitle: '',
      openGraphDescription: '',
      openGraphImageUrl: '',
      openGraphImageAltText: '',
      structuredDataJson: '',
    },
  });

  const filteredProfessions = professions.filter((prof) => {
    return (
      (prof.serviceName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (prof.identifier || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (prof.heroBannerTitle && prof.heroBannerTitle.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  });

  const handleInspect = (prof: ProfessionService) => {
    setEditingProf({ ...prof });
    setIsNewModalOpen(false);
    setActiveTab('Basic Info');
    setAutoSaveStatus('saved');
  };

  const handleAddNewTrigger = () => {
    setEditingProf(createBlankProfession());
    setIsNewModalOpen(true);
    setActiveTab('Basic Info');
    setAutoSaveStatus('idle');
  };

  const handleModalFieldChange = (updated: ProfessionService) => {
    setEditingProf(updated);

    if (autoSaveEnabled && !isNewModalOpen) {
      setAutoSaveStatus('saving');
      setTimeout(() => {
        setProfessions((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
        setAutoSaveStatus('saved');
      }, 500);
    }
  };

  const handleSaveModal = () => {
    if (!editingProf) return;
    if (!editingProf.serviceName.trim()) {
      alert('Please enter a Profession Name (e.g. Couple Therapist).');
      return;
    }

    if (isNewModalOpen) {
      // Create new profession — use POST
      api.post('/api/admin/professions', editingProf).catch((err) => {
        console.error('Error creating profession in DB:', err);
        showToast(`Error saving new profession to database.`);
      });
      setProfessions((prev) => [editingProf, ...prev]);
      showToast(`Added new profession "${editingProf.serviceName}" to MongoDB`);
    } else {
      // Update existing profession — use PUT
      api.put('/api/admin/professions', { ...editingProf, id: editingProf.id }).catch((err) => {
        console.error('Error updating profession in DB:', err);
        showToast(`Error saving changes for "${editingProf.serviceName}" to database.`);
      });
      setProfessions((prev) => prev.map((p) => (p.id === editingProf.id ? editingProf : p)));
      showToast(`Saved changes for "${editingProf.serviceName}" to MongoDB`);
    }
    setEditingProf(null);
    setIsNewModalOpen(false);
  };

  const handleDeleteProfession = async (id: string) => {
    const target = professions.find((p) => p.id === id);
    try {
      // Direct live deletion from MongoDB Atlas
      await api.delete(`/api/admin/professions?id=${encodeURIComponent(id)}`);
      setProfessions((prev) => prev.filter((p) => p.id !== id));
      if (editingProf?.id === id) {
        setEditingProf(null);
      }
      setDeletingId(null);
      showToast(`Deleted "${target?.serviceName || id}" from MongoDB Atlas`);
    } catch (err) {
      console.error('Error deleting profession from DB:', err);
      showToast(`Error deleting "${target?.serviceName || id}" from database.`);
      setDeletingId(null);
    }
  };

  const totalProfessionsCount = professions.length;

  return (
    <div className="space-y-8 pb-12 animate-fade-in font-['Plus_Jakarta_Sans']">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-24 right-8 z-[100] bg-emerald-600 text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-2 font-extrabold text-xs animate-in slide-in-from-top duration-300">
          <CheckCircle2 className="w-4 h-4" />
          {toastMessage}
        </div>
      )}

      {/* Hero Header */}
      <div className="relative rounded-[28px] bg-gradient-to-r from-[#4f28d9] via-[#5e2be2] to-[#3b1799] p-8 text-white shadow-xl overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="absolute -right-12 -top-12 w-96 h-96 bg-white/5 rounded-full blur-2xl pointer-events-none" />
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-2">
            <span className="px-3.5 py-1.5 bg-white/15 backdrop-blur-md rounded-full text-xs font-bold tracking-wide uppercase text-purple-200 border border-white/20">
              Service Catalog & SEO CMS
            </span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight mt-1">Services & Professions Catalog</h1>
          <p className="text-purple-100 text-sm mt-1 max-w-xl">
            Configure profession names, identifiers, icon/banner assets, and full SEO metadata.
          </p>
        </div>

        {/* TOP RIGHT PRIMARY ACTION: Add New Profession Popup Trigger */}
        <button
          onClick={handleAddNewTrigger}
          className="relative z-10 px-6 py-3 bg-white text-[#4f28d9] hover:bg-purple-50 rounded-2xl font-extrabold text-sm flex items-center gap-2 shadow-lg transition-all active:scale-95 shrink-0"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          <span>Add New Profession</span>
        </button>
      </div>

      {/* Search Toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-96">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search professions by name, identifier..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 outline-none focus:bg-white focus:border-[#5e2be2] focus:ring-2 focus:ring-[#5e2be2]/10 transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="text-xs font-bold text-slate-500">
          Showing <span className="text-slate-900">{filteredProfessions.length}</span> of {totalProfessionsCount} professions
        </div>
      </div>

      {/* Professions Cards Grid */}
      {isLoading ? (
        <div className="text-center py-24 bg-white border border-slate-100 rounded-3xl space-y-3">
          <Loader2 className="w-10 h-10 text-[#5e2be2] animate-spin mx-auto" />
          <p className="text-sm font-extrabold text-slate-800">Loading Live Professions & Categories...</p>
          <p className="text-xs text-slate-400">Fetching verified services and SEO metadata from MongoDB Atlas</p>
        </div>
      ) : filteredProfessions.length === 0 ? (
        <div className="text-center py-16 bg-white border border-dashed border-slate-200 rounded-3xl space-y-3">
          <Layers className="w-12 h-12 text-slate-300 mx-auto" />
          <p className="text-sm font-extrabold text-slate-700">No professions found</p>
          <p className="text-xs text-slate-400">Try adjusting your search query or add a new profession.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProfessions.map((prof) => (
          <div
            key={prof.id}
            className="bg-white rounded-3xl border border-slate-200/80 shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden flex flex-col group hover:-translate-y-1"
          >
            {/* Card Top Banner Area */}
            <div className="relative aspect-[16/9] w-full bg-slate-100 overflow-hidden">
              <img
                src={prof.heroBannerUrl || prof.imageUrl || 'https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=800'}
                alt={prof.imageAltText || prof.serviceName}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=800';
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-900/20 to-transparent" />

              <div className="absolute top-3 right-3 flex items-center gap-2 pointer-events-none">
                {prof.seo?.metaTitle ? (
                  <span className="text-[10px] px-2.5 py-1 font-extrabold rounded-lg shadow-sm tracking-wider uppercase bg-emerald-500/90 text-white backdrop-blur-md flex items-center gap-1">
                    <Check className="w-3 h-3" /> SEO Ready
                  </span>
                ) : (
                  <span className="text-[10px] px-2.5 py-1 font-extrabold rounded-lg shadow-sm tracking-wider uppercase bg-amber-500/90 text-white backdrop-blur-md">
                    SEO Pending
                  </span>
                )}
              </div>

              <div className="absolute bottom-3 left-4 right-4 text-white">
                <span className="text-[10px] font-extrabold text-purple-200 uppercase tracking-widest block font-mono">
                  @{prof.identifier || prof.id}
                </span>
                <h3 className="text-lg font-extrabold tracking-tight truncate drop-shadow-sm">
                  {prof.serviceName || 'Untitled Profession'}
                </h3>
              </div>
            </div>

            {/* Card Content Body */}
            <div className="p-5 space-y-4 flex-1 flex flex-col justify-between">
              <div className="space-y-2">
                {prof.heroBannerTitle && (
                  <p className="text-xs text-slate-700 font-semibold leading-relaxed line-clamp-2">
                    "{prof.heroBannerTitle}"
                  </p>
                )}
                {prof.imageAltText && (
                  <p className="text-[11px] text-slate-400 font-medium truncate">
                    Alt: {prof.imageAltText}
                  </p>
                )}
              </div>

              {/* Card Footer Action Buttons */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                <button
                  onClick={() => setDeletingId(prof.id)}
                  className="p-2.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
                  title="Delete Profession"
                >
                  <Trash2 className="w-4 h-4" />
                </button>

                <button
                  onClick={() => handleInspect(prof)}
                  className="flex-1 py-2.5 px-4 bg-slate-900 hover:bg-[#5e2be2] text-white font-extrabold text-xs rounded-xl flex items-center justify-center gap-2 shadow-xs transition-all active:scale-95 group/btn"
                >
                  <Eye className="w-3.5 h-3.5 text-purple-300 group-hover/btn:text-white" />
                  <span>Inspect & Edit</span>
                </button>
              </div>
            </div>
          </div>
        ))}
        </div>
      )}

      {/* ── INSPECT & EDIT POPUP MODAL ────────────────────────────────────────────── */}
      {editingProf && createPortal(
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-md z-[100] flex items-center justify-center p-2 sm:p-4 md:p-6">
          <div className="bg-white rounded-2xl sm:rounded-3xl shadow-2xl max-w-4xl w-full border border-slate-200 overflow-hidden flex flex-col max-h-[94vh] sm:max-h-[88vh] my-auto animate-in fade-in zoom-in-95 duration-200">

            {/* Hexpertify Vibe Modal Header */}
            <div className="bg-gradient-to-r from-[#4f28d9] via-[#5e2be2] to-[#3b1799] text-white p-4 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-white/10 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-white/15 backdrop-blur-md flex items-center justify-center text-white font-extrabold border border-white/20 shrink-0">
                  <Edit className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] font-extrabold px-2.5 py-0.5 bg-white/20 rounded-full text-purple-100 uppercase tracking-widest font-mono border border-white/20">
                      {isNewModalOpen ? 'NEW PROFESSION' : editingProf.id}
                    </span>
                    {autoSaveEnabled && !isNewModalOpen && (
                      <span className="text-[10px] font-extrabold text-emerald-300 flex items-center gap-1 bg-emerald-950/40 px-2.5 py-0.5 rounded-full border border-emerald-400/30">
                        <Sparkles className="w-3 h-3 text-emerald-300" />
                        {autoSaveStatus === 'saving' ? 'Auto-saving…' : 'Auto-Saved'}
                      </span>
                    )}
                  </div>
                  <h3 className="text-lg sm:text-xl font-extrabold tracking-tight mt-1 text-white">
                    {isNewModalOpen
                      ? 'Add New Profession'
                      : editingProf.serviceName || 'Inspect & Edit Profession'}
                  </h3>
                </div>
              </div>

              {/* Modal Top Actions */}
              <div className="flex items-center justify-between sm:justify-end w-full sm:w-auto gap-2 sm:gap-3">
                {!isNewModalOpen && (
                  <button
                    type="button"
                    onClick={() => setAutoSaveEnabled(!autoSaveEnabled)}
                    className={`hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-extrabold border transition-colors ${
                      autoSaveEnabled
                        ? 'bg-emerald-500/25 text-emerald-200 border-emerald-400/30'
                        : 'bg-white/10 text-purple-200 border-white/20 hover:text-white'
                    }`}
                    title="Toggle auto-save changes"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Auto-Save: {autoSaveEnabled ? 'ON' : 'OFF'}</span>
                  </button>
                )}

                <button
                  onClick={handleSaveModal}
                  className="px-5 py-2.5 bg-white text-[#4f28d9] hover:bg-purple-50 rounded-2xl font-extrabold text-xs flex items-center gap-1.5 shadow-lg transition-all active:scale-95"
                >
                  <Save className="w-4 h-4" />
                  <span>Save Changes</span>
                </button>

                <button
                  onClick={() => setEditingProf(null)}
                  className="p-2 text-purple-200 hover:text-white hover:bg-white/15 rounded-xl transition-colors"
                  title="Close popup"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Tabs Bar */}
            <div className="bg-slate-50 border-b border-slate-150 px-4 sm:px-6 py-2.5 sm:py-3 flex items-center gap-2 overflow-x-auto shrink-0 scrollbar-none">
              {(
                [
                  { id: 'Basic Info', label: 'Basic Info', icon: FileText },
                  { id: 'FAQs', label: 'FAQs', icon: HelpCircle },
                  { id: 'SEO', label: 'SEO & Metadata', icon: Globe }
                ] as const
              ).map((tab) => {
                const IconComponent = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`px-3.5 sm:px-4 py-2 rounded-xl text-xs font-extrabold flex items-center gap-2 whitespace-nowrap transition-all ${
                      isActive
                        ? 'bg-[#5e2be2] text-white shadow-md'
                        : 'bg-white text-slate-600 hover:bg-slate-200/70 border border-slate-200/60'
                    }`}
                  >
                    <IconComponent className="w-3.5 h-3.5" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Modal Body Scrollable Content */}
            <div className="p-4 sm:p-6 overflow-y-auto space-y-4 sm:space-y-6 flex-1 bg-slate-50/30">

              {/* ── TAB 1: BASIC INFO ────────────────────────────────────────────── */}
              {activeTab === 'Basic Info' && (
                <div className="space-y-6 text-xs">
                  {/* General Info Card */}
                  <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
                    <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                      <div className="w-1 h-4 bg-[#5e2be2] rounded-full" />
                      <h4 className="font-extrabold text-slate-800 uppercase tracking-wider text-xs">General Profession Identity</h4>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Profession Name */}
                      <div className="space-y-1.5">
                        <label className="font-extrabold text-slate-700 block">Profession Name *</label>
                        <input
                          type="text"
                          placeholder="e.g. Couple Therapist"
                          value={editingProf.serviceName}
                          onChange={(e) => {
                            const name = e.target.value;
                            const autoId = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
                            handleModalFieldChange({
                              ...editingProf,
                              serviceName: name,
                              identifier: editingProf.identifier || autoId,
                              slug: editingProf.slug || autoId
                            });
                          }}
                          className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none text-sm font-semibold text-slate-800 focus:bg-white focus:border-[#5e2be2] focus:ring-2 focus:ring-[#5e2be2]/10 transition-all"
                        />
                      </div>

                      {/* Identifier */}
                      <div className="space-y-1.5">
                        <label className="font-extrabold text-slate-700 block">Identifier *</label>
                        <div className="relative">
                          <input
                            type="text"
                            placeholder="e.g. couple-therapist"
                            value={editingProf.identifier || ''}
                            onChange={(e) =>
                              handleModalFieldChange({
                                ...editingProf,
                                identifier: e.target.value.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
                              })
                            }
                            className="w-full p-3 pl-3 pr-10 bg-slate-50 border border-slate-200 rounded-xl outline-none font-mono text-slate-800 focus:bg-white focus:border-[#5e2be2] focus:ring-2 focus:ring-[#5e2be2]/10 transition-all"
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[9px] font-bold text-slate-400 bg-slate-200 px-1.5 py-0.5 rounded-md">ID</span>
                        </div>
                        <p className="text-[9px] text-slate-400 font-medium">Lowercase system slug used in URLs and clinical bookings.</p>
                      </div>
                    </div>
                  </div>

                  {/* Icon & Banner Assets Card */}
                  <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
                    <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                      <div className="w-1 h-4 bg-purple-500 rounded-full" />
                      <h4 className="font-extrabold text-slate-800 uppercase tracking-wider text-xs">Icon & Banner Assets</h4>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Image URL or Icon URL */}
                      <div className="space-y-1.5">
                        <label className="font-extrabold text-slate-700 block">Image URL or Icon URL *</label>
                        <input
                          type="text"
                          placeholder="https://images.unsplash.com/..."
                          value={editingProf.imageUrl || ''}
                          onChange={(e) => handleModalFieldChange({ ...editingProf, imageUrl: e.target.value })}
                          className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-mono text-slate-800 focus:bg-white focus:border-[#5e2be2]"
                        />
                      </div>

                      {/* Alt Text for that Icon */}
                      <div className="space-y-1.5">
                        <label className="font-extrabold text-slate-700 block">Alt Text for that Icon/Image *</label>
                        <input
                          type="text"
                          placeholder="Describe the icon or image for accessibility & SEO..."
                          value={editingProf.imageAltText || ''}
                          onChange={(e) => handleModalFieldChange({ ...editingProf, imageAltText: e.target.value })}
                          className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-medium text-slate-800 focus:bg-white focus:border-[#5e2be2]"
                        />
                      </div>
                    </div>

                    {/* Icon / Image Preview */}
                    {editingProf.imageUrl && (
                      <ImagePreview
                        src={editingProf.imageUrl}
                        alt={editingProf.imageAltText || 'Service icon preview'}
                        altText={editingProf.imageAltText}
                      />
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                      {/* Banner URL */}
                      <div className="space-y-1.5">
                        <label className="font-extrabold text-slate-700 block">Banner URL *</label>
                        <input
                          type="text"
                          placeholder="https://images.unsplash.com/..."
                          value={editingProf.heroBannerUrl || editingProf.bannerUrl || ''}
                          onChange={(e) => handleModalFieldChange({ ...editingProf, heroBannerUrl: e.target.value, bannerUrl: e.target.value })}
                          className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-mono text-slate-800 focus:bg-white focus:border-[#5e2be2]"
                        />
                      </div>

                      {/* Banner Title */}
                      <div className="space-y-1.5">
                        <label className="font-extrabold text-slate-700 block">Banner Title *</label>
                        <input
                          type="text"
                          placeholder="e.g. Rebuild Connection — Expert Couple Therapy"
                          value={editingProf.heroBannerTitle || editingProf.bannerTitle || ''}
                          onChange={(e) => handleModalFieldChange({ ...editingProf, heroBannerTitle: e.target.value, bannerTitle: e.target.value })}
                          className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-extrabold text-slate-800 focus:bg-white focus:border-[#5e2be2]"
                        />
                      </div>
                    </div>

                    {/* Banner Preview */}
                    {(editingProf.heroBannerUrl || editingProf.bannerUrl || editingProf.imageUrl) && (
                      <BannerPreview
                        src={(editingProf.heroBannerUrl || editingProf.bannerUrl || editingProf.imageUrl)!}
                        alt={editingProf.serviceName || 'Banner asset'}
                        title={editingProf.heroBannerTitle || editingProf.bannerTitle || editingProf.serviceName}
                      />
                    )}
                  </div>
                </div>
              )}

              {/* ── TAB 2: FAQs ──────────────────────────────────────────────────── */}
              {activeTab === 'FAQs' && (
                <div className="space-y-5 text-xs">
                  <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                      <div className="flex items-center gap-2">
                        <div className="w-1 h-4 bg-[#5e2be2] rounded-full" />
                        <div>
                          <h4 className="font-extrabold text-slate-800 uppercase tracking-wider text-xs">Profession FAQs</h4>
                          <p className="text-[10px] text-slate-400 font-medium mt-0.5">
                            These FAQs will appear on the service page for this profession.
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          handleModalFieldChange({
                            ...editingProf,
                            faqs: [...(editingProf.faqs || []), { question: '', answer: '' }]
                          })
                        }
                        className="flex items-center gap-1.5 px-4 py-2 bg-[#5e2be2] hover:bg-[#4f28d9] text-white font-extrabold text-xs rounded-xl shadow-md transition-all active:scale-95 shrink-0"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add FAQ</span>
                      </button>
                    </div>

                    {/* FAQ list */}
                    {(!editingProf.faqs || editingProf.faqs.length === 0) ? (
                      <div className="py-10 text-center border border-dashed border-slate-200 rounded-2xl space-y-2">
                        <HelpCircle className="w-8 h-8 text-slate-300 mx-auto" />
                        <p className="text-slate-500 font-bold text-xs">No FAQs added yet</p>
                        <p className="text-slate-400 text-[11px]">Click "Add FAQ" above to create the first question.</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {editingProf.faqs.map((faq, idx) => (
                          <div
                            key={idx}
                            className="border border-slate-200 rounded-2xl bg-slate-50/60 overflow-hidden"
                          >
                            {/* FAQ Card Header */}
                            <div className="flex items-center gap-2 px-4 py-2.5 bg-white border-b border-slate-100">
                              <span className="w-5 h-5 rounded-full bg-[#5e2be2]/10 text-[#5e2be2] flex items-center justify-center text-[10px] font-extrabold shrink-0">
                                {idx + 1}
                              </span>
                              <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider flex-1">
                                FAQ #{idx + 1}
                              </span>
                              {/* Move up */}
                              <button
                                type="button"
                                disabled={idx === 0}
                                onClick={() => {
                                  const updated = [...editingProf.faqs];
                                  [updated[idx - 1], updated[idx]] = [updated[idx], updated[idx - 1]];
                                  handleModalFieldChange({ ...editingProf, faqs: updated });
                                }}
                                className="p-1 hover:bg-slate-100 disabled:opacity-30 text-slate-400 hover:text-slate-700 rounded-lg transition-colors"
                                title="Move up"
                              >
                                <ChevronUp className="w-3.5 h-3.5" />
                              </button>
                              {/* Move down */}
                              <button
                                type="button"
                                disabled={idx === editingProf.faqs.length - 1}
                                onClick={() => {
                                  const updated = [...editingProf.faqs];
                                  [updated[idx + 1], updated[idx]] = [updated[idx], updated[idx + 1]];
                                  handleModalFieldChange({ ...editingProf, faqs: updated });
                                }}
                                className="p-1 hover:bg-slate-100 disabled:opacity-30 text-slate-400 hover:text-slate-700 rounded-lg transition-colors"
                                title="Move down"
                              >
                                <ChevronDown className="w-3.5 h-3.5" />
                              </button>
                              {/* Delete */}
                              <button
                                type="button"
                                onClick={() => {
                                  const updated = editingProf.faqs.filter((_, i) => i !== idx);
                                  handleModalFieldChange({ ...editingProf, faqs: updated });
                                }}
                                className="p-1 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-lg transition-colors"
                                title="Remove this FAQ"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>

                            {/* FAQ Question */}
                            <div className="p-4 space-y-3">
                              <div className="space-y-1">
                                <label className="font-extrabold text-slate-700 block">Question *</label>
                                <input
                                  type="text"
                                  placeholder="e.g. How long does a session last?"
                                  value={faq.question}
                                  onChange={(e) => {
                                    const updated = editingProf.faqs.map((f, i) =>
                                      i === idx ? { ...f, question: e.target.value } : f
                                    );
                                    handleModalFieldChange({ ...editingProf, faqs: updated });
                                  }}
                                  className="w-full p-3 bg-white border border-slate-200 rounded-xl outline-none font-semibold text-slate-800 focus:border-[#5e2be2] focus:ring-2 focus:ring-[#5e2be2]/10 transition-all"
                                />
                              </div>

                              {/* FAQ Answer */}
                              <div className="space-y-1">
                                <label className="font-extrabold text-slate-700 block">Answer *</label>
                                <textarea
                                  rows={3}
                                  placeholder="Provide a clear, helpful answer..."
                                  value={faq.answer}
                                  onChange={(e) => {
                                    const updated = editingProf.faqs.map((f, i) =>
                                      i === idx ? { ...f, answer: e.target.value } : f
                                    );
                                    handleModalFieldChange({ ...editingProf, faqs: updated });
                                  }}
                                  className="w-full p-3 bg-white border border-slate-200 rounded-xl outline-none font-medium text-slate-800 focus:border-[#5e2be2] focus:ring-2 focus:ring-[#5e2be2]/10 transition-all leading-relaxed resize-none"
                                />
                              </div>
                            </div>
                          </div>
                        ))}

                        {/* Add FAQ shortcut at bottom */}
                        <button
                          type="button"
                          onClick={() =>
                            handleModalFieldChange({
                              ...editingProf,
                              faqs: [...(editingProf.faqs || []), { question: '', answer: '' }]
                            })
                          }
                          className="w-full py-3 border-2 border-dashed border-[#5e2be2]/30 hover:border-[#5e2be2]/60 text-[#5e2be2] hover:bg-purple-50/40 rounded-xl font-extrabold text-xs flex items-center justify-center gap-2 transition-all"
                        >
                          <Plus className="w-4 h-4" />
                          <span>Add Another FAQ</span>
                        </button>
                      </div>
                    )}
                  </div>

                  {/* FAQ Count Summary */}
                  {editingProf.faqs && editingProf.faqs.length > 0 && (
                    <div className="flex items-center gap-2 px-4 py-3 bg-emerald-50 border border-emerald-100 rounded-2xl">
                      <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span className="text-xs font-extrabold text-emerald-700">
                        {editingProf.faqs.length} FAQ{editingProf.faqs.length !== 1 ? 's' : ''} configured for this profession
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* ── TAB 3: SEO ──────────────────────────────────────────────────── */}
              {activeTab === 'SEO' && (
                <div className="space-y-6 text-xs">
                  {/* SECTION 1: Session SEO Meta */}
                  <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
                    <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                      <div className="w-1 h-4 bg-[#5e2be2] rounded-full" />
                      <h4 className="font-extrabold text-slate-800 uppercase tracking-wider text-xs">Session SEO Meta</h4>
                    </div>

                    <div className="space-y-1.5">
                      <label className="font-extrabold text-slate-700 block">Meta Title *</label>
                      <input
                        type="text"
                        placeholder="e.g. Online Couple Therapy & Relationship Counseling | Hexpertify"
                        value={editingProf.seo?.metaTitle || ''}
                        onChange={(e) =>
                          handleModalFieldChange({
                            ...editingProf,
                            seo: { ...editingProf.seo, metaTitle: e.target.value }
                          })
                        }
                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-medium text-slate-800 focus:bg-white focus:border-[#5e2be2]"
                      />
                      <div className="flex justify-between text-[9px] text-slate-400 font-medium px-0.5">
                        <span>Recommended: 50–60 characters</span>
                        <span
                          className={`font-mono font-bold ${
                            (editingProf.seo?.metaTitle?.length || 0) > 60
                              ? 'text-rose-500'
                              : (editingProf.seo?.metaTitle?.length || 0) > 45
                              ? 'text-amber-500'
                              : 'text-emerald-500'
                          }`}
                        >
                          {editingProf.seo?.metaTitle?.length || 0} / 60
                        </span>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="font-extrabold text-slate-700 block">Meta Description *</label>
                      <textarea
                        rows={3}
                        placeholder="Summarise this profession page for search engine crawlers..."
                        value={editingProf.seo?.metaDescription || ''}
                        onChange={(e) =>
                          handleModalFieldChange({
                            ...editingProf,
                            seo: { ...editingProf.seo, metaDescription: e.target.value }
                          })
                        }
                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-[#5e2be2] leading-relaxed resize-none text-slate-800"
                      />
                      <div className="flex justify-between text-[9px] text-slate-400 font-medium px-0.5">
                        <span>Recommended: 150–160 characters</span>
                        <span
                          className={`font-mono font-bold ${
                            (editingProf.seo?.metaDescription?.length || 0) > 160
                              ? 'text-rose-500'
                              : (editingProf.seo?.metaDescription?.length || 0) > 140
                              ? 'text-amber-500'
                              : 'text-emerald-500'
                          }`}
                        >
                          {editingProf.seo?.metaDescription?.length || 0} / 160
                        </span>
                      </div>
                    </div>

                    <KeywordsTagInput
                      value={editingProf.seo?.keywords || ''}
                      onChange={(val) =>
                        handleModalFieldChange({
                          ...editingProf,
                          seo: { ...editingProf.seo, keywords: val }
                        })
                      }
                      placeholder="Add keyword..."
                      label="Meta Keywords"
                    />

                    {/* Google SERP Preview */}
                    {(editingProf.seo?.metaTitle || editingProf.seo?.metaDescription) && (
                      <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-1">
                        <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider block mb-2">
                          Google Search Result Preview
                        </span>
                        <p className="text-[13px] font-semibold text-blue-700 truncate leading-snug hover:underline cursor-pointer">
                          {editingProf.seo?.metaTitle || 'Page Title'}
                        </p>
                        <p className="text-[10px] text-emerald-800 font-medium">
                          hexpertify.com › services › {editingProf.identifier || 'service'}
                        </p>
                        <p className="text-[11px] text-slate-600 leading-relaxed line-clamp-2 mt-0.5">
                          {editingProf.seo?.metaDescription || 'No description configured.'}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* SECTION 2: Open Graph (Social Media) */}
                  <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
                    <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                      <div className="w-1 h-4 bg-indigo-500 rounded-full" />
                      <h4 className="font-extrabold text-slate-800 uppercase tracking-wider text-xs">Open Graph (Social Media)</h4>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="font-extrabold text-slate-700 block">OG Title *</label>
                        <input
                          type="text"
                          placeholder="e.g. Couples Counseling Services on Hexpertify"
                          value={editingProf.seo?.openGraphTitle || ''}
                          onChange={(e) =>
                            handleModalFieldChange({
                              ...editingProf,
                              seo: { ...editingProf.seo, openGraphTitle: e.target.value }
                            })
                          }
                          className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-medium text-slate-800 focus:bg-white focus:border-[#5e2be2]"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="font-extrabold text-slate-700 block">OG Image URL *</label>
                        <input
                          type="text"
                          placeholder="https://... (1200×630 recommended)"
                          value={editingProf.seo?.openGraphImageUrl || ''}
                          onChange={(e) =>
                            handleModalFieldChange({
                              ...editingProf,
                              seo: { ...editingProf.seo, openGraphImageUrl: e.target.value }
                            })
                          }
                          className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-medium text-slate-800 focus:bg-white focus:border-[#5e2be2]"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="font-extrabold text-slate-700 block">OG Description *</label>
                      <textarea
                        rows={2}
                        placeholder="Description shown in social media link share previews..."
                        value={editingProf.seo?.openGraphDescription || ''}
                        onChange={(e) =>
                          handleModalFieldChange({
                            ...editingProf,
                            seo: { ...editingProf.seo, openGraphDescription: e.target.value }
                          })
                        }
                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-[#5e2be2] resize-none text-slate-800"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="font-extrabold text-slate-700 block">OG Image Alt Text *</label>
                      <input
                        type="text"
                        placeholder="Describe the social share image..."
                        value={editingProf.seo?.openGraphImageAltText || ''}
                        onChange={(e) =>
                          handleModalFieldChange({
                            ...editingProf,
                            seo: { ...editingProf.seo, openGraphImageAltText: e.target.value }
                          })
                        }
                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-medium text-slate-800 focus:bg-white focus:border-[#5e2be2]"
                      />
                    </div>
                  </div>

                  {/* SECTION 3: Structured Data (Session HTML Chunk) */}
                  <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
                    <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                      <div className="w-1 h-4 bg-emerald-500 rounded-full" />
                      <div>
                        <h4 className="font-extrabold text-slate-800 uppercase tracking-wider text-xs">Structured Data</h4>
                        <span className="text-[10px] text-slate-400 font-medium block mt-0.5">Session HTML Chunk (JSON-LD Markup)</span>
                      </div>
                    </div>

                    <RichCodeEditor
                      value={editingProf.seo?.structuredDataJson || ''}
                      onChange={(val) =>
                        handleModalFieldChange({
                          ...editingProf,
                          seo: { ...editingProf.seo, structuredDataJson: val }
                        })
                      }
                      placeholder={`<script type="application/ld+json">\n{\n  "@context": "https://schema.org",\n  "@type": "Service",\n  "name": "${editingProf.serviceName || 'Couple Therapist'}",\n  "provider": {\n    "@type": "Organization",\n    "name": "Hexpertify"\n  }\n}\n</script>`}
                      helperText="Session HTML Chunk — edit raw schema.org JSON-LD code. Click ⌘ Braces to insert starter template."
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer Actions */}
            <div className="bg-slate-50 border-t border-slate-200 p-4 px-6 flex items-center justify-between gap-4 shrink-0">
              {!isNewModalOpen ? (
                <button
                  type="button"
                  onClick={() => setDeletingId(editingProf.id)}
                  className="flex items-center gap-1.5 text-xs font-bold text-rose-600 hover:text-rose-800 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Delete Profession</span>
                </button>
              ) : (
                <div />
              )}

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setEditingProf(null)}
                  className="px-5 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-extrabold text-xs rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveModal}
                  className="px-6 py-2.5 bg-[#5e2be2] hover:bg-[#4f28d9] text-white font-extrabold text-xs rounded-xl shadow-md transition-all active:scale-95 flex items-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  <span>{isNewModalOpen ? 'Create Profession' : 'Save Changes'}</span>
                </button>
              </div>
            </div>

          </div>
        </div>,
        document.body
      )}

      {/* Delete Confirmation Modal */}
      {deletingId && createPortal(
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-[110] flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-6 max-w-md w-full shadow-2xl border border-slate-200 space-y-4 my-auto animate-in fade-in zoom-in-95">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h4 className="text-lg font-extrabold text-slate-900">Delete Profession Service?</h4>
              <p className="text-xs text-slate-500 leading-relaxed">
                Are you sure you want to delete this profession? This action will remove it from the super admin catalog.
              </p>
            </div>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setDeletingId(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteProfession(deletingId)}
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
